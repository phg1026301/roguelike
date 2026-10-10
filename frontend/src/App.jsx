import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { newGame, move, run, travelToStairs, wait, drinkPotion, score, chooseCard, CARDS, xpToNext, chestChoose, shopBuy, shopClose, fire, summon, CLASSES, CLASS_IDS, HIDDEN_CLASS_IDS, setDifficulty, DIFFICULTIES, DIFFICULTY_IDS } from './game/engine'
import { spriteUrl } from './game/sprites'
import { RARITY, SLOTS, describeItem, coinTotal, formatPrice } from './game/items'
import { itemIconUrl } from './game/itemSprites'
import { render, TILE, VIEW_W, VIEW_H, RENDER_SCALE } from './game/renderer'
import { api, loadAuth, saveAuth, clearAuth, savePendingRun, takePendingRun, runFromGame } from './api'
import { playSound, unlockSound, toggleMute, isMuted, startMusic, stopMusic, getVolume, setVolume } from './game/sound'
import { TitleScreen, SelectScreen } from './Hub'
import TowerGame from './tower/TowerGame'
import CardGame from './cards/CardGame'
import LaneGame from './lane/LaneGame'
import ShooterGame from './shooter/ShooterGame'
import StoryGame from './story/StoryGame'
import ActionGame from './action/ActionGame'

// 조작 명령: 키보드와 터치 버튼이 같은 동작을 하게 한다
const COMMANDS = {
  up: (g) => move(g, 0, -1),
  down: (g) => move(g, 0, 1),
  left: (g) => move(g, -1, 0),
  right: (g) => move(g, 1, 0),
  wait: (g) => wait(g),
  potion: (g) => drinkPotion(g),
  fire: (g) => fire(g),
  summon: (g) => summon(g),
  escape: (g) => pressEscape(g),
  restart: (g) => (g.over ? { ...g, picking: true } : g),
}
const KEY_COMMAND = {
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
  ' ': 'wait', '.': 'wait', q: 'potion', f: 'fire', e: 'summon', Escape: 'escape', r: 'restart',
}
const TURN_CMDS = new Set(['up', 'down', 'left', 'right', 'wait'])
// Shift + 방향키: 달리기 (적이 보일 때까지 한 번에 간다)
const RUN_DIRS = {
  ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
}

// 연출 값
const MOVE_MS = 120 // 칸 사이 이동 시간
const SHAKE_MS = 260 // 화면 흔들림 시간
const SHAKE_AMP = { hurt: 3, crit: 2.5, blast: 2.5, fire: 2, burst: 1.2 }
const FX_MS = 360 // 숫자 떠오르기, 번쩍임, 파티클 시간 // 흔들림 세기 (논리 픽셀)
const SOUND_PRIORITY = ['hurt', 'crit', 'blast', 'fire', 'magic', 'arrow', 'hit', 'coin', 'heal', 'warn']

// 발사체는 마법탄/화살 소리로 구분한다
function fxKind(f) {
  if (f.kind === 'strike') return 'blast' // 보스 공격은 폭발 소리와 흔들림
  if (f.kind !== 'shot') return f.kind
  return f.cls === 'mage' ? 'magic' : 'arrow'
}

// 상태가 바뀔 때 한 번 실행: 이동 준비, 효과음, 흔들림
function announce(prev, game, anim, shake, fxClock) {
  const now = performance.now()
  const sameFloor = prev.depth === game.depth && !prev.picking && !game.picking
  const moved = sameFloor && (prev.player.x !== game.player.x || prev.player.y !== game.player.y)
  // 같은 층에서만 칸 사이 이동을 보간한다 (층이 바뀌면 바로 놓는다)
  anim.current = sameFloor
    ? {
        start: now,
        fromPlayer: { x: prev.player.x, y: prev.player.y },
        fromMonsters: new Map(prev.monsters.map((m) => [m.id, { x: m.x, y: m.y }])),
      }
    : null

  if (game.turns !== prev.turns) {
    if (moved) playSound('step')
    const kinds = new Set((game.fx || []).map(fxKind))
    for (const name of SOUND_PRIORITY.filter((k) => kinds.has(k)).slice(0, 2)) playSound(name)
    let amp = 0
    for (const k of kinds) amp = Math.max(amp, SHAKE_AMP[k] || 0)
    if ((game.fx || []).some((f) => f.big)) amp = Math.max(amp, 3) // 보스를 맞히면 크게 흔든다
    if (game.bossKills > prev.bossKills) {
      playSound('boss')
      amp = Math.max(amp, 4)
    } else if (game.kills > prev.kills) {
      playSound('kill')
    }
    if (amp) shake.current = { start: now, amp }
    if ((game.fx || []).length) fxClock.current = { start: now }
  }
  if (game.over && !prev.over) {
    playSound('die')
    shake.current = { start: now, amp: 5 }
  }
  if (game.levelUp && !prev.levelUp) playSound('levelup')
  if (game.chest && !prev.chest) playSound('chest')
  if (game.shopOpen && !prev.shopOpen) playSound('shop')
  if (prev.picking && !game.picking) playSound('start')
}

// 지금 시각의 화면 위치와 흔들림 (그릴 때마다 계산한다)
function viewAt(now, game, anim, shake, fxClock) {
  const view = { player: null, monsters: null, shake: { x: 0, y: 0 } }
  let busy = false
  const a = anim.current
  if (a) {
    const t = Math.min(1, (now - a.start) / MOVE_MS)
    const e = 1 - (1 - t) ** 3 // 처음 빠르고 끝에서 느려지는 움직임
    const lerp = (from, to) =>
      Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1
        ? { x: to.x, y: to.y } // 한 칸을 넘는 점프는 보간하지 않는다
        : { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }
    if (a.fromPlayer) view.player = lerp(a.fromPlayer, game.player)
    view.monsters = new Map()
    for (const m of game.monsters) {
      const from = a.fromMonsters.get(m.id)
      view.monsters.set(m.id, from ? lerp(from, m) : { x: m.x, y: m.y })
    }
    if (t < 1) busy = true
    else anim.current = null
  }
  const s = shake.current
  if (s) {
    const t = (now - s.start) / SHAKE_MS
    if (t >= 1) {
      shake.current = null
    } else {
      const k = s.amp * (1 - t)
      view.shake = { x: Math.sin(now * 0.9) * k, y: Math.cos(now * 1.3) * k }
      busy = true
    }
  }
  const f = fxClock.current
  if (f) {
    const t = (now - f.start) / FX_MS
    if (t >= 1) fxClock.current = null
    else {
      view.fxT = Math.max(0, t)
      busy = true
    }
  }
  return { view, busy }
}

// 난이도 버튼 색 (CSS의 d-easy 등과 맞춘다)
const DIFF_CLASS = { 쉬움: 'easy', 보통: 'normal', 어려움: 'hard', 지옥: 'hell' }
// 랭킹 탭 (전체 + 난이도별)
const RANK_TABS = ['전체', ...DIFFICULTY_IDS]

// 숫자키: 지금 떠 있는 선택 창에 맞게 처리 (레벨업 > 상자 > 상점)
function pickClass(g, index, choices) {
  const cls = choices[index]
  return cls ? newGame(cls, { difficulty: g.difficulty }) : g
}

// 해금한 직업은 로컬 저장소에 보관한다 (브라우저마다 따로)
const UNLOCK_KEY = 'roguelike.unlocks'
function loadUnlocks() {
  try {
    return JSON.parse(localStorage.getItem(UNLOCK_KEY)) || []
  } catch {
    return []
  }
}
function saveUnlocks(list) {
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(list))
  } catch {
    // 저장이 막혀 있어도 게임은 계속된다
  }
}
const UNLOCK_RULES = { summoner: { depth: 20, text: '소환사' } }

// 지금 고를 수 있는 직업: 기본 3개 + 해금한 숨겨진 직업
function availableClasses() {
  return [...CLASS_IDS, ...HIDDEN_CLASS_IDS.filter((id) => loadUnlocks().includes(id))]
}

function pressNumber(g, index, choices) {
  if (g.picking) return pickClass(g, index, choices)
  if (g.levelUp) return chooseCard(g, index)
  if (g.chest) return chestChoose(g, index)
  if (g.shopOpen) return shopBuy(g, index)
  return g
}

function pressEscape(g) {
  if (g.levelUp) return g
  if (g.chest) return chestChoose(g, g.chest.stage === 'choose' ? 2 : 3)
  if (g.shopOpen) return shopClose(g)
  return g
}

// 사거리 격자: 가운데 캐릭터에서 몇 칸까지 닿는지
function RangeGrid({ range }) {
  const r = Math.max(range, 1)
  const size = r * 2 + 1
  const cells = []
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const center = x === 0 && y === 0
      const inRange = range ? Math.hypot(x, y) <= range + 0.01 : Math.abs(x) + Math.abs(y) === 1
      cells.push(<span key={`${x},${y}`} className={`rg-cell ${center ? 'me' : inRange ? 'on' : ''}`} />)
    }
  }
  return (
    <span className="range-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells}
    </span>
  )
}

function ClassCard({ id, index, onPick }) {
  const c = CLASSES[id]
  return (
    <button className="card class-card" style={{ '--cls': c.color }} onClick={onPick}>
      <span className="card-key">{index + 1}</span>
      <span className="class-portrait">
        <img className="pixel-icon" src={spriteUrl(c.sprite)} width={96} alt={c.name} />
      </span>
      <b className="class-name">{c.icon} {c.name}</b>
      <span className="class-summary">{c.summary}</span>
      <span className="class-stats">
        <span>❤️ HP <b>{c.hp}</b></span>
        <span>⚔️ 공격 <b>{c.atk}</b></span>
        <span>🛡️ 방어 <b>{c.def}</b></span>
      </span>
      <span className="class-section">
        <span className="class-label">공격 방식</span>
        {c.range ? (
          <span className="attack-guide ranged">
            <b>F키</b>를 누르면 사거리 안 <b>가장 가까운 적</b>에게 자동으로 {c.attackDesc}
            <span className="range-line">사거리 <b>{c.range}칸</b> · 붙어 있는 적은 방향키로 근접 공격(약함)</span>
          </span>
        ) : (
          <span className="attack-guide">
            <b>방향키</b>로 적에게 부딪혀 근접 공격
            <span className="range-line">사거리 <b>1칸</b> (바로 옆)</span>
          </span>
        )}
        <RangeGrid range={c.range} />
      </span>
      <span className="class-section">
        <span className="class-label">고유 특성 · {c.traitName}</span>
        <span className="trait-desc">{c.traitDesc}</span>
      </span>
    </button>
  )
}

function ItemIcon({ item, size = 32 }) {
  const url = itemIconUrl(item.key)
  if (!url) return <span style={{ fontSize: size * 0.8 }}>{item.icon}</span>
  return <img className="pixel-icon" src={url} width={size} height={size} alt={item.name} />
}

function RarityBadge({ rarity }) {
  return <span className={`rarity-badge rb-${rarity}`}>{RARITY[rarity].name}</span>
}

function ItemCard({ item, current, onClick, hotkey }) {
  return (
    <button className={`card item-card r-${item.rarity}`} onClick={onClick}>
      {hotkey && <span className="card-key">{hotkey}</span>}
      <span className="rarity-tag">{RARITY[item.rarity].name} {SLOTS[item.slot]}</span>
      <span className="item-icon-frame"><ItemIcon item={item} size={48} /></span>
      <b>{item.name}</b>
      <span className="card-desc">{describeItem(item)}</span>
      {current ? (
        <span className="current-box">
          <span className="current-equip">
            <span className="current-label">현재</span>
            <ItemIcon item={current} size={20} />
            <span className="current-name">{current.name}</span>
            <RarityBadge rarity={current.rarity} />
          </span>
          <span className="current-stats">
            능력치: {describeItem(current) || '없음'}
          </span>
        </span>
      ) : (
        <span className="current-equip empty">빈 칸에 장착</span>
      )}
    </button>
  )
}

// React 개발 모드에서 effect가 두 번 실행돼도 한 번만 처리되게
let kakaoCallbackHandled = false
const savedGames = new WeakSet()

// 로그라이크 게임 화면 (onExit: 게임 선택 화면으로 돌아간다)
function Roguelike({ onExit }) {
  const [game, setGame] = useState(() => newGame('mage', { picking: true }))
  const [server, setServer] = useState('확인 중')
  // 배경음악: 던전은 던전 테마, 10층 보스방에서는 보스 전용 테마
  const bossRoom = game.depth % 10 === 0 && (game.monsters || []).some((m) => m.boss)
  useEffect(() => {
    startMusic(bossRoom ? 'boss' : 'dungeon')
  }, [bossRoom])
  useEffect(() => () => stopMusic(), [])
  const [auth, setAuth] = useState(loadAuth)
  const [ranking, setRanking] = useState([])
  const [rankTab, setRankTab] = useState('전체')
  const rankTabRef = useRef('전체')
  const [rankFull, setRankFull] = useState(false) // false: TOP 10, true: 전체(최대 100위)
  const rankFullRef = useRef(false)
  const [saveResult, setSaveResult] = useState(null) // { game, rank } 또는 { game, error }
  const [notice, setNotice] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const canvasRef = useRef(null)
  const [muted, setMuted] = useState(isMuted)
  const [showVol, setShowVol] = useState(false)
  const [vol, setVol] = useState(getVolume)
  const changeVol = (kind, percent) => {
    setVolume(kind, Number(percent) / 100)
    setVol(getVolume())
  }
  const prevGameRef = useRef(game)
  const animRef = useRef(null)
  const shakeRef = useRef(null)
  const fxRef = useRef(null)

  // 랭킹 탭(전체/쉬움/보통/어려움/지옥): 현재 탭 기준으로 다시 불러온다
  const refreshRanking = useCallback(() => {
    api.ranking(rankTabRef.current, rankFullRef.current ? 100 : 10).then(setRanking).catch(() => {})
  }, [])
  const pickRankTab = (tab) => {
    rankTabRef.current = tab
    setRankTab(tab)
    refreshRanking()
  }
  const toggleRankFull = () => {
    rankFullRef.current = !rankFullRef.current
    setRankFull(rankFullRef.current)
    refreshRanking()
  }

  // 첫 접속: 서버 깨우기 + 랭킹 불러오기
  // Render 무료 서버는 잠들어 있으면 깨어나는 데 최대 1분 정도 걸려서, 연결될 때까지 5초마다 다시 시도한다
  useEffect(() => {
    let stopped = false
    let tries = 0
    function ping() {
      api.health()
        .then((text) => {
          if (stopped) return
          if (text === 'OK') {
            setServer('연결됨')
            refreshRanking()
          } else throw new Error()
        })
        .catch(() => {
          if (stopped) return
          tries += 1
          if (tries >= 24) setServer('연결 안 됨')
          else setTimeout(ping, 5000)
        })
    }
    ping()
    refreshRanking()
    return () => {
      stopped = true
    }
  }, [refreshRanking])

  // 카카오 로그인 후 돌아온 경우 (/oauth/kakao?code=...)
  useEffect(() => {
    if (window.location.pathname !== '/oauth/kakao' || kakaoCallbackHandled) return
    kakaoCallbackHandled = true
    const code = new URLSearchParams(window.location.search).get('code')
    window.history.replaceState({}, '', '/')
    if (!code) {
      takePendingRun()
      Promise.resolve().then(() => setNotice('카카오 로그인이 취소되었어요.'))
      return
    }
    api.kakaoLogin(code)
      .then(async (res) => {
        saveAuth(res)
        setAuth(res)
        const pending = takePendingRun()
        if (pending) {
          const saved = await api.saveRun(res.token, pending)
          setNotice(`${res.nickname}님, 지난 기록(${saved.score}점)이 랭킹 ${saved.rank}위로 등록됐어요!`)
          refreshRanking()
        } else {
          setNotice(`${res.nickname}님, 환영해요!`)
        }
      })
      .catch(() => setNotice('로그인에 실패했어요. 다시 시도해주세요.'))
  }, [refreshRanking])

  // 로그인한 상태로 게임 오버 → 자동으로 점수 저장
  useEffect(() => {
    if (!game.over || game.picking || !auth || savedGames.has(game)) return
    savedGames.add(game)
    api.saveRun(auth.token, runFromGame(game))
      .then((res) => {
        setSaveResult({ game, rank: res.rank })
        refreshRanking()
      })
      .catch((err) => {
        if (err.status === 401) {
          clearAuth()
          setAuth(null)
          setSaveResult({ game, error: '로그인이 만료됐어요. 다시 로그인해주세요.' })
        } else {
          setSaveResult({ game, error: '점수 저장에 실패했어요.' })
        }
      })
  }, [game, auth, refreshRanking])

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      unlockSound() // 브라우저는 첫 입력 뒤에야 소리를 허용한다
      if (key === 'm') {
        setMuted(toggleMute())
        return
      }
      if (/^[1-6]$/.test(key)) {
        setGame((g) => pressNumber(g, Number(key) - 1, availableClasses()))
        return
      }
      // Shift + 방향키: 달리기 · T: 발견한 계단까지 자동 이동
      if (e.shiftKey && RUN_DIRS[key]) {
        e.preventDefault()
        const [dx, dy] = RUN_DIRS[key]
        setGame((g) => run(g, dx, dy))
        return
      }
      if (key === 't') {
        setGame((g) => travelToStairs(g))
        return
      }
      const cmd = KEY_COMMAND[key]
      if (!cmd) return
      if (TURN_CMDS.has(cmd)) e.preventDefault()
      setGame(COMMANDS[cmd])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 게임 상태가 바뀔 때마다: 효과음 · 이동 보간 · 흔들림을 반영해 캔버스를 그린다
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = game
    if (prev !== game) announce(prev, game, animRef, shakeRef, fxRef)
    const ctx = canvasRef.current.getContext('2d')
    let raf = 0
    const step = (now) => {
      const { view, busy } = viewAt(now, game, animRef, shakeRef, fxRef)
      render(ctx, game, view)
      if (busy) raf = requestAnimationFrame(step)
    }
    step(performance.now())
    return () => cancelAnimationFrame(raf)
  }, [game])

  async function startKakaoLogin(saveCurrentRun) {
    if (saveCurrentRun) savePendingRun(runFromGame(game))
    setLoggingIn(true)
    try {
      const { url } = await api.loginUrl()
      window.location.href = url
    } catch {
      setLoggingIn(false)
      setNotice('서버가 깨어나는 중이에요. 잠시 후 다시 눌러주세요.')
    }
  }

  function logout() {
    clearAuth()
    setAuth(null)
    setNotice('로그아웃했어요.')
  }

  // 해금: 20층에 도달하면 로컬 저장소에 기록한다 (화면 상태는 바꾸지 않는다)
  useEffect(() => {
    const won = Object.keys(UNLOCK_RULES).filter((id) => game.depth >= UNLOCK_RULES[id].depth)
    if (won.length) saveUnlocks([...new Set([...loadUnlocks(), ...won])])
  }, [game.depth])

  const classChoices = availableClasses()

  const p = game.player
  const hpPercent = Math.round((p.hp / p.maxHp) * 100)
  const lowHp = hpPercent <= 30
  const result = saveResult && saveResult.game === game ? saveResult : null

  // 터치 버튼: 키보드와 같은 명령을 실행한다
  const press = (cmd) => (e) => {
    e.preventDefault()
    unlockSound()
    setGame(COMMANDS[cmd])
  }

  return (
    <div className="app">
      <header>
        <div className="tw-head-left">
          <button className="back-btn" onClick={onExit}>← 게임 선택</button>
          <h1>ROGUELIKE</h1>
        </div>
        <div className="header-right">
          <div className="vol-wrap">
            <button className="mute-btn" onClick={() => setShowVol((v) => !v)} title="음량 조절">🎚</button>
            {showVol && (
              <div className="vol-panel">
                <label>
                  <span>배경음악</span>
                  <input type="range" min="0" max="100" value={Math.round(vol.music * 100)} onChange={(e) => changeVol('music', e.target.value)} />
                  <b>{Math.round(vol.music * 100)}</b>
                </label>
                <label>
                  <span>효과음</span>
                  <input type="range" min="0" max="100" value={Math.round(vol.sfx * 100)} onChange={(e) => changeVol('sfx', e.target.value)} />
                  <b>{Math.round(vol.sfx * 100)}</b>
                </label>
              </div>
            )}
          </div>
          <button className="mute-btn" onClick={() => setMuted(toggleMute())} title="효과음 켜기/끄기 (M)">{muted ? '🔇' : '🔊'}</button>
          <span className={`server ${server === '연결됨' ? 'ok' : ''}`}>● 서버 {server}</span>
          {server === '확인 중' && (
            <span className="wake-hint" title="무료 서버라 한동안 접속이 없으면 잠들어요">
              ⏳ 서버가 깨어나는 중이에요 (최대 1분). <b>게임은 바로 시작할 수 있어요!</b> 로그인·랭킹은 연결 후 이용 가능
            </span>
          )}
          {server === '연결 안 됨' && (
            <span className="wake-hint err">서버에 연결하지 못했어요. 게임은 할 수 있지만 랭킹 등록은 새로고침 후 다시 시도해주세요</span>
          )}
          {auth ? (
            <span className="user">
              <b>{auth.nickname}</b>님
              <button className="link" onClick={logout}>로그아웃</button>
            </span>
          ) : (
            <button className="kakao" onClick={() => startKakaoLogin(false)} disabled={loggingIn}>
              {loggingIn ? '이동 중...' : '카카오 로그인'}
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="notice" onClick={() => setNotice('')}>
          {notice} <span>✕</span>
        </div>
      )}

      <main>
        <div className="play-col">
        <div className="board-wrap">
          <canvas ref={canvasRef} width={VIEW_W * TILE * RENDER_SCALE} height={VIEW_H * TILE * RENDER_SCALE} className="board" />
          <div className="touch-pad">
            <div className="dpad">
              <button className="pad up" onPointerDown={press('up')} aria-label="위로">▲</button>
              <button className="pad left" onPointerDown={press('left')} aria-label="왼쪽으로">◀</button>
              <button className="pad center" onPointerDown={press('wait')} aria-label="쉬기">쉬기</button>
              <button className="pad right" onPointerDown={press('right')} aria-label="오른쪽으로">▶</button>
              <button className="pad down" onPointerDown={press('down')} aria-label="아래로">▼</button>
            </div>
            <div className="pad-actions">
              {p.range > 0 && (
                <button className="pad act" onPointerDown={press('fire')}>F<small>원거리 공격</small></button>
              )}
              {p.cls === 'summoner' && (
                <button className="pad act" onPointerDown={press('summon')}>E<small>골렘 소환</small></button>
              )}
              <button className="pad act" onPointerDown={press('potion')}>Q<small>포션 {p.potions}개</small></button>
            </div>
          </div>

          <div className="floor-badge">지하 {game.depth}층</div>

          {game.shopOpen && game.npc && !game.over && (
            <div className="overlay shop">
              <h2>🛒 상점</h2>
              <p className="sub">
                보유 코인 <b className="gold">{formatPrice(coinTotal(p.coins))}</b> · 클릭 또는 숫자키로 구매 · <kbd>Esc</kbd> 닫기
              </p>
              <div className="shop-grid">
                {game.npc.stock.map((s, i) => {
                  const affordable = coinTotal(p.coins) >= s.price
                  return (
                    <button
                      key={s.idx}
                      className={`shop-item ${s.sold ? 'sold' : ''} ${s.item ? `r-${s.item.rarity}` : ''}`}
                      onClick={() => setGame((g) => shopBuy(g, i))}
                      disabled={s.sold}
                    >
                      <span className="card-key">{i + 1}</span>
                      <span className="shop-icon">{s.item ? <ItemIcon item={s.item} size={36} /> : s.icon}</span>
                      <span className="shop-text">
                        <b>{s.name}</b>
                        {s.item && <span className="rarity-tag">{RARITY[s.item.rarity].name} {SLOTS[s.item.slot]}</span>}
                        {s.item && p.equip[s.item.slot] && (
                          <span className="current-equip small">
                            <span className="current-label">현재</span>
                            <ItemIcon item={p.equip[s.item.slot]} size={16} />
                            <span className="current-name">{p.equip[s.item.slot].name}</span>
                            <RarityBadge rarity={p.equip[s.item.slot].rarity} />
                          </span>
                        )}
                        <span className="card-desc">{s.desc}</span>
                      </span>
                      <span className={`price ${affordable ? '' : 'poor'}`}>{s.sold ? '판매 완료' : formatPrice(s.price)}</span>
                    </button>
                  )
                })}
              </div>
              <button className="close-btn" onClick={() => setGame((g) => shopClose(g))}>나가기 (Esc)</button>
            </div>
          )}

          {game.chest && !game.over && (
            <div className="overlay chest">
              {game.chest.stage === 'choose' ? (
                <>
                  <h2>📦 보물상자</h2>
                  <p className="sub">어떻게 할까요? (클릭 또는 1/2/3)</p>
                  <div className="cards">
                    <button className="card" onClick={() => setGame((g) => chestChoose(g, 0))}>
                      <span className="card-key">1</span>
                      <span className="card-icon">🗝️</span>
                      <b>조심스럽게 연다</b>
                      <span className="card-desc">안전하게 연다. 평범한 장비가 나오기 쉬움</span>
                    </button>
                    <button className="card danger" onClick={() => setGame((g) => chestChoose(g, 1))}>
                      <span className="card-key">2</span>
                      <span className="card-icon">🔨</span>
                      <b>힘으로 부순다</b>
                      <span className="card-desc">좋은 장비·히든 장비 확률 ↑<br />30% 확률로 함정 피해</span>
                    </button>
                    <button className="card" onClick={() => setGame((g) => chestChoose(g, 2))}>
                      <span className="card-key">3</span>
                      <span className="card-icon">🚶</span>
                      <b>그냥 둔다</b>
                      <span className="card-desc">나중에 다시 밟으면 열 수 있어요</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>✨ 장비 획득</h2>
                  <p className="sub">하나를 골라 장착하세요 (클릭 또는 1/2/3) · 같은 부위는 교체돼요</p>
                  <div className="cards">
                    {game.chest.loot.map((item, i) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        current={p.equip[item.slot]}
                        hotkey={i + 1}
                        onClick={() => setGame((g) => chestChoose(g, i))}
                      />
                    ))}
                  </div>
                  <button className="close-btn" onClick={() => setGame((g) => chestChoose(g, 3))}>
                    가져가지 않기 (동화 5개 · 4 또는 Esc)
                  </button>
                </>
              )}
            </div>
          )}

          {game.levelUp && !game.over && (
            <div className="overlay levelup">
              <h2>LEVEL UP!</h2>
              <p className="sub">Lv.{p.level} — 보상을 하나 고르세요</p>
              <p className="levelup-guide">
                카드를 <b>클릭</b>하거나 키보드 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 으로 선택
                {game.pendingLevelUps > 1 && (
                  <span className="remaining">
                    한 번에 여러 레벨이 올랐어요! 이번 선택 후 <b>{game.pendingLevelUps - 1}번</b> 더 고를 수 있어요
                  </span>
                )}
              </p>
              <div className="cards">
                {game.levelUp.cards.map((id, i) => (
                  <button key={id} className="card" onClick={() => setGame((g) => chooseCard(g, i))}>
                    <span className="card-key">{i + 1}</span>
                    <span className="card-icon">{CARDS[id].icon}</span>
                    <b>{CARDS[id].name}</b>
                    <span className="card-desc">{CARDS[id].desc}</span>
                    {p.perks[id] ? <span className="card-owned">보유 x{p.perks[id]}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {game.picking && (
            <div className="overlay class-select">
              <h2>직업 선택</h2>
              <p className="sub">카드를 클릭하거나 키보드 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 으로 선택하세요</p>
              <div className="difficulty-row">
                <span>난이도</span>
                {DIFFICULTY_IDS.map((name) => (
                  <button
                    key={name}
                    className={`diff-btn d-${DIFF_CLASS[name]} ${game.difficulty === name ? 'on' : ''}`}
                    onClick={() => setGame((g) => setDifficulty(g, name))}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <p className="diff-desc">{DIFFICULTIES[game.difficulty].desc}</p>
              <div className="cards">
                {classChoices.map((id, i) => (
                  <ClassCard key={id} id={id} index={i} onPick={() => setGame((g) => pickClass(g, i, classChoices))} />
                ))}
                {HIDDEN_CLASS_IDS.filter((id) => !classChoices.includes(id)).map((id) => (
                  // 아직 해금하지 않은 숨겨진 직업: 물음표 카드 (클릭 불가)
                  <div key={id} className="card class-card locked" aria-label="잠긴 직업">
                    <span className="card-key">{classChoices.length + 1}</span>
                    <span className="class-portrait"><span className="mystery">?</span></span>
                    <b className="class-name">???</b>
                    <span className="class-summary">20층에 도달하면 열리는 숨겨진 직업</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {game.over && !game.picking && (
            <div className="overlay">
              <h2>GAME OVER</h2>
              <p>{CLASSES[p.cls]?.icon} {CLASSES[p.cls]?.name} · {game.deathCause}에게 쓰러졌다</p>
              <p className="final-score">{score(game)}</p>
              <p className="sub">
                지하 {game.depth}층 · 처치 {game.kills}
                {game.bossKills > 0 && ` · 👑 보스 ${game.bossKills}`} · {game.turns}턴
              </p>

              <div className="save-status">
                {auth && !result && <span>점수 저장 중...</span>}
                {result?.rank && <span className="ok">🏆 랭킹 {result.rank}위로 등록됐어요!</span>}
                {result?.error && <span className="err">{result.error}</span>}
                {!auth && (
                  <button className="kakao" onClick={() => startKakaoLogin(true)} disabled={loggingIn}>
                    {loggingIn ? '이동 중...' : '카카오 로그인하고 랭킹 등록'}
                  </button>
                )}
              </div>

              <button onClick={() => setGame((g) => ({ ...g, picking: true }))}>다시 하기 (R)</button>
            </div>
          )}
        </div>

        <section className="controls" aria-label="조작키">
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></div>
            <div className="ctrl-desc"><b>이동</b><span>한 칸씩 · 부딪히면 {p.range ? '근접 공격(약함)' : '공격'}</span></div>
          </div>
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>Shift</kbd><small>+방향</small></div>
            <div className="ctrl-desc"><b>달리기</b><span>적이 보이면 멈춤</span></div>
          </div>
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>T</kbd></div>
            <div className="ctrl-desc"><b>계단 자동 이동</b><span>발견한 계단까지 · 적이 보이면 멈춤</span></div>
          </div>
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>Space</kbd><kbd>.</kbd></div>
            <div className="ctrl-desc"><b>쉬기</b><span>한 턴 기다리기</span></div>
          </div>
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>Q</kbd></div>
            <div className="ctrl-desc"><b>포션</b><span>회복 물약 {p.potions}개</span></div>
          </div>
          {p.range > 0 && (
            <div className="ctrl accent">
              <div className="ctrl-keys"><kbd>F</kbd></div>
              <div className="ctrl-desc"><b>원거리 공격</b><span>사거리 {p.range}칸 · 노란 표시 적을 자동 조준</span></div>
            </div>
          )}
          {p.cls === 'summoner' && (
            <div className="ctrl accent">
              <div className="ctrl-keys"><kbd>E</kbd></div>
              <div className="ctrl-desc"><b>돌 골렘 소환</b><span>앞에서 적을 막는다 · 골렘 칸을 지나가거나 같이 설 수 있다</span></div>
            </div>
          )}
          <div className="ctrl">
            <div className="ctrl-keys"><kbd>M</kbd></div>
            <div className="ctrl-desc"><b>효과음</b><span>{muted ? '꺼짐' : '켜짐'} · 🎚 버튼에서 음량 조절</span></div>
          </div>
        </section>
        <div className="controls-hint">
          적 강함: 쥐 &lt; 고블린 &lt; 오크 · 5층마다 중간 보스 · 10층 보스방 · 6, 11층…에 상점 · 📦 상자는 밟으면 열기 · 🛒 상인은 부딪히면 거래
        </div>
        </div>

        <aside>
          <div className="orbs">
            <div className={`orb hp ${lowHp ? 'low' : ''}`}>
              <div className="fill" style={{ height: `${hpPercent}%` }} />
              <span>{p.hp}</span>
            </div>
            <div className="orb-side">
              <div className="slot" title="포션 (Q)">
                <span className="potion-icon" />
                <b>{p.potions}</b>
              </div>
              <div className="slot atk" title="공격력">
                <span>⚔</span>
                <b>{p.atk}</b>
              </div>
            </div>
          </div>
          <div className="hp-text">HP {p.hp} / {p.maxHp}</div>

          <div className="level">
            <span className="lv">Lv.{p.level}</span>
            <div className="xpbar">
              <div style={{ width: `${Math.round((p.xp / xpToNext(p.level)) * 100)}%` }} />
            </div>
            <span className="xp">{p.xp}/{xpToNext(p.level)}</span>
          </div>

          {Object.keys(p.perks).length > 0 && (
            <div className="perks">
              {Object.entries(p.perks).map(([id, n]) => (
                <span key={id} className="perk" title={`${CARDS[id].name}: ${CARDS[id].desc}`}>
                  {CARDS[id].icon}
                  {n > 1 && <small>x{n}</small>}
                </span>
              ))}
            </div>
          )}

          <div className="coins" title="동화 1 · 은화 10 · 금화 100">
            <span className="coin gold" /> <b>{p.coins.gold}</b>
            <span className="coin silver" /> <b>{p.coins.silver}</b>
            <span className="coin bronze" /> <b>{p.coins.bronze}</b>
          </div>

          <div className="equip">
            {Object.entries(SLOTS).map(([slot, label]) => {
              const it = p.equip[slot]
              return (
                <div
                  key={slot}
                  className={`equip-slot ${it ? `r-${it.rarity}` : 'empty'}`}
                  title={it ? `${it.name} (${RARITY[it.rarity].name})\n${describeItem(it)}` : `${label}: 비어 있음`}
                >
                  <span className="equip-icon">{it ? <ItemIcon item={it} size={30} /> : '·'}</span>
                  <span className="equip-label">{it ? it.name : label}</span>
                </div>
              )
            })}
          </div>

          <div className="panel stats">
            <div><span>층</span><b>지하 {game.depth}층</b></div>
            <div><span>난이도</span><b>{game.difficulty}</b></div>
            <div><span>처치</span><b>{game.kills}</b></div>
            <div><span>점수</span><b className="gold">{score(game)}</b></div>
          </div>

          <div className="panel log">
            {game.messages.map((m, i) => (
              <div key={i} className={i === game.messages.length - 1 ? 'latest' : ''}>{m}</div>
            ))}
          </div>

          <div className="panel ranking">
            <div className="panel-title">🏆 랭킹 {rankFull ? '전체' : 'TOP 10'}</div>
            <div className="rank-tabs">
              {RANK_TABS.map((tab) => (
                <button key={tab} className={`rank-tab ${rankTab === tab ? 'on' : ''}`} onClick={() => pickRankTab(tab)}>{tab}</button>
              ))}
            </div>
            <button className="rank-more" onClick={toggleRankFull}>{rankFull ? 'TOP 10만 보기' : '전체 랭킹 보기 (100위까지)'}</button>
            {ranking.length === 0 ? (
              <div className="empty">아직 기록이 없어요. 첫 번째 주인공이 되어보세요!</div>
            ) : (
              <ol className={rankFull ? 'full' : ''}>
                {ranking.map((r) => (
                  <li key={r.rank} className={auth && r.nickname === auth.nickname ? 'me' : ''}>
                    <span className={`rank r${r.rank}`}>{r.rank}</span>
                    <span className="name">
                      {CLASSES[r.cls] && <img className="pixel-icon rank-cls" src={spriteUrl(CLASSES[r.cls].sprite)} width={18} alt={CLASSES[r.cls].name} title={CLASSES[r.cls].name} />}
                      {r.nickname}
                    </span>
                    <span className="pts">{r.score}</span>
                    <span className="meta">지하 {r.depth}층{r.difficulty ? ` · ${r.difficulty}` : ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="panel class-info" style={{ '--cls': CLASSES[p.cls].color }}>
            <img className="pixel-icon" src={spriteUrl(CLASSES[p.cls].sprite)} width={36} alt="" />
            <span>
              <b>{CLASSES[p.cls].name}</b> · {CLASSES[p.cls].traitName}
              <small>{CLASSES[p.cls].traitDesc}</small>
            </span>
          </div>

        </aside>
      </main>
    </div>
  )
}

// 시작 화면 순서: 제목 → 게임 선택 → 게임
// 카카오 로그인 후 돌아오는 주소(/oauth/kakao)는 바로 로그라이크 화면으로 간다
function App() {
  const [screen, setScreen] = useState(() => (window.location.pathname === '/oauth/kakao' ? 'roguelike' : 'title'))
  const toSelect = useCallback(() => setScreen('select'), [])
  const toTitle = useCallback(() => setScreen('title'), [])
  const pick = useCallback((id) => setScreen(id), [])

  if (screen === 'title') return <TitleScreen onStart={toSelect} />
  if (screen === 'select') return <SelectScreen onPick={pick} onBack={toTitle} />
  if (screen === 'tower') return <TowerGame onExit={toSelect} />
  if (screen === 'cards') return <CardGame onExit={toSelect} />
  if (screen === 'lane') return <LaneGame onExit={toSelect} />
  if (screen === 'shooter') return <ShooterGame onExit={toSelect} />
  if (screen === 'story') return <StoryGame onExit={toSelect} />
  if (screen === 'action') return <ActionGame onExit={toSelect} />
  return <Roguelike onExit={toSelect} />
}

export default App

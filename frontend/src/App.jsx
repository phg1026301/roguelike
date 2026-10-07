import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { newGame, move, wait, drinkPotion, score, chooseCard, CARDS, xpToNext } from './game/engine'
import { render, TILE, VIEW_W, VIEW_H } from './game/renderer'
import { api, loadAuth, saveAuth, clearAuth, savePendingRun, takePendingRun, runFromGame } from './api'

const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

// React 개발 모드에서 effect가 두 번 실행돼도 한 번만 처리되게
let kakaoCallbackHandled = false
const savedGames = new WeakSet()

function App() {
  const [game, setGame] = useState(newGame)
  const [server, setServer] = useState('확인 중')
  const [auth, setAuth] = useState(loadAuth)
  const [ranking, setRanking] = useState([])
  const [saveResult, setSaveResult] = useState(null) // { game, rank } 또는 { game, error }
  const [notice, setNotice] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const canvasRef = useRef(null)

  const refreshRanking = useCallback(() => {
    api.ranking().then(setRanking).catch(() => {})
  }, [])

  // 첫 접속: 서버 깨우기 + 랭킹 불러오기
  useEffect(() => {
    api.health()
      .then((text) => setServer(text === 'OK' ? '연결됨' : String(text)))
      .catch(() => setServer('연결 안 됨'))
    refreshRanking()
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
    if (!game.over || !auth || savedGames.has(game)) return
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
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (KEY_DIRS[key]) {
        e.preventDefault()
        const [dx, dy] = KEY_DIRS[key]
        setGame((g) => move(g, dx, dy))
      } else if (key === ' ' || key === '.') {
        e.preventDefault()
        setGame((g) => wait(g))
      } else if (key === 'q') {
        setGame((g) => drinkPotion(g))
      } else if (key === '1' || key === '2' || key === '3') {
        setGame((g) => chooseCard(g, Number(key) - 1))
      } else if (key === 'r') {
        setGame((g) => (g.over ? newGame() : g))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 게임 상태가 바뀔 때마다 캔버스를 다시 그린다
  useEffect(() => {
    render(canvasRef.current.getContext('2d'), game)
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

  const p = game.player
  const hpPercent = Math.round((p.hp / p.maxHp) * 100)
  const lowHp = hpPercent <= 30
  const result = saveResult && saveResult.game === game ? saveResult : null

  return (
    <div className="app">
      <header>
        <h1>ROGUELIKE</h1>
        <div className="header-right">
          <span className={`server ${server === '연결됨' ? 'ok' : ''}`}>● 서버 {server}</span>
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
        <div className="board-wrap">
          <canvas ref={canvasRef} width={VIEW_W * TILE} height={VIEW_H * TILE} className="board" />

          <div className="floor-badge">B{game.depth}</div>

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

          {game.over && (
            <div className="overlay">
              <h2>GAME OVER</h2>
              <p>{game.deathCause}에게 쓰러졌다</p>
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

              <button onClick={() => setGame(newGame())}>다시 하기 (R)</button>
            </div>
          )}
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

          <div className="panel stats">
            <div><span>층</span><b>B{game.depth}</b></div>
            <div><span>처치</span><b>{game.kills}</b></div>
            <div><span>점수</span><b className="gold">{score(game)}</b></div>
          </div>

          <div className="panel log">
            {game.messages.map((m, i) => (
              <div key={i} className={i === game.messages.length - 1 ? 'latest' : ''}>{m}</div>
            ))}
          </div>

          <div className="panel ranking">
            <div className="panel-title">🏆 랭킹 TOP 10</div>
            {ranking.length === 0 ? (
              <div className="empty">아직 기록이 없어요. 첫 번째 주인공이 되어보세요!</div>
            ) : (
              <ol>
                {ranking.map((r) => (
                  <li key={r.rank} className={auth && r.nickname === auth.nickname ? 'me' : ''}>
                    <span className={`rank r${r.rank}`}>{r.rank}</span>
                    <span className="name">{r.nickname}</span>
                    <span className="pts">{r.score}</span>
                    <span className="meta">B{r.depth}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="help">
            <div><kbd>←↑↓→</kbd> <kbd>WASD</kbd> 이동 · 공격</div>
            <div><kbd>Space</kbd> 쉬기 <kbd>Q</kbd> 포션</div>
            <div className="hint">적 강함: 쥐 &lt; 고블린 &lt; 오크 · 계단을 밟으면 다음 층</div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App

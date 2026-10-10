import { useEffect, useState } from 'react'
import {
  newCardGame, playCard, selectMinion, attackMinion, attackHero, endTurn,
  START_HP, MAX_BOARD, DIFFICULTIES, DECK_SIZE, CARD_POOL, cardById, KEYWORDS,
  rewardChoices, recommendedDeck, fillDeck,
} from './cardEngine'
import { spriteUrl } from '../game/sprites'
import { unlockSound } from '../game/sound'
import './cards.css'

const MAX_DECK = 30

// 카드에 붙는 능력 이름 (돌진 · 도발 · 방패)
function kwNames(card) {
  return (card.kw || []).map((k) => KEYWORDS[k]).join(' · ')
}

// 덱 만들기: 카드 종류별 묶음과 탭
const GROUPS = [
  { type: 'minion', title: '🐾 소환 카드 · 하수인을 전장에 세워 싸워요' },
  { type: 'spell', title: '✨ 마법 카드 · 한 번 써서 효과를 발동해요' },
]
const TABS = [
  { key: 'all', label: '전체' },
  { key: 'minion', label: '소환 카드' },
  { key: 'spell', label: '마법 카드' },
]
function countType(ids, type) {
  return ids.filter((id) => cardById(id)?.type === type).length
}

// 카드 그림: 하수인은 캐릭터 그림, 마법은 큰 아이콘
function CardArt({ card }) {
  if (card.type === 'minion') {
    return <img className="pixel-icon cg-art-img" src={spriteUrl(card.sprite)} width={64} height={64} alt="" />
  }
  return <span className="cg-art-spell" aria-hidden="true">{card.icon}</span>
}

// 효과 숫자: 피해, 회복, 방패 막음, SLAM
function Floats({ events }) {
  return events.map((e, i) => {
    if (e.kind === 'dmg') return <span key={i} className="cg-float" style={{ fontSize: 12 + e.amount * 2 }}>-{e.amount}</span>
    if (e.kind === 'heal') return <span key={i} className="cg-float heal">+{e.amount}</span>
    if (e.kind === 'shield') return <span key={i} className="cg-float shield">🛡 막음</span>
    if (e.kind === 'slam') return <span key={i} className="cg-slam">💥 SLAM!</span>
    return null
  })
}

// 전장의 하수인 한 장
function Minion({ m, mine, selected, targetable, events, onClick }) {
  const hit = events.some((e) => e.kind === 'dmg')
  const cls = [
    'cg-minion',
    mine ? 'mine' : 'enemy',
    selected ? 'selected' : '',
    mine && m.canAttack ? 'ready' : '',
    targetable ? 'target' : '',
    hit ? 'cg-hit' : '',
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} onClick={onClick} aria-label={`${m.name} ${m.atk}/${m.hp}`}>
      <Floats events={events} />
      <img className="pixel-icon" src={spriteUrl(m.sprite)} width={44} height={44} alt="" />
      <span className="cg-minion-name">{m.name}</span>
      {kwNames(m) && <span className="cg-kw">{kwNames(m)}</span>}
      <span className="cg-stats">
        <b className="atk">⚔{m.atk}</b>
        <b className="hp">❤{m.hp}</b>
        {m.shield && <b className="shield">🛡</b>}
      </span>
    </button>
  )
}

// 영웅 (나 / 상대)
function Hero({ title, hp, max, meta, events, attackable, onClick }) {
  const hit = events.some((e) => e.kind === 'dmg')
  return (
    <div className={`cg-hero ${attackable ? 'attackable' : ''} ${hit ? 'cg-hit' : ''}`} onClick={onClick}>
      <Floats events={events} />
      <span className="cg-hero-name">{title}</span>
      <span className="cg-hp">❤ {hp} / {max}</span>
      <span className="cg-meta">{meta}</span>
    </div>
  )
}

// 손패 카드 한 장
function HandCard({ card, index, playable, onClick }) {
  return (
    <button className={`cg-card ${card.type} ${playable ? 'playable' : 'dim'}`} onClick={onClick} disabled={!playable}>
      <span className="cg-cost">{card.cost}</span>
      <span className="cg-card-art">
        {card.type === 'minion' ? (
          <img className="pixel-icon" src={spriteUrl(card.sprite)} width={40} height={40} alt="" />
        ) : (
          <span className="cg-icon">{card.icon}</span>
        )}
      </span>
      <b className="cg-card-name">{card.name}</b>
      {card.type === 'minion' ? (
        <>
          <span className="cg-card-text">⚔{card.atk} ❤{card.hp}</span>
          {kwNames(card) && <span className="cg-kw">{kwNames(card)}</span>}
        </>
      ) : (
        <span className="cg-card-text">{card.text}</span>
      )}
      <span className="cg-key">{index + 1}</span>
    </button>
  )
}

// 덱 만들기 화면에 나오는 카드 한 장
function PoolCard({ card, on, onClick }) {
  return (
    <button className={`cg-pool-card ${card.type} ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="cg-cost">{card.cost}</span>
      {on && <span className="cg-picked">✓</span>}
      <CardArt card={card} />
      <span className="cg-pool-name">{card.name}</span>
      <span className={`cg-kind ${card.type}`}>{card.type === 'minion' ? '하수인' : '마법'}</span>
      <span className="cg-card-text">
        {card.type === 'minion' ? `⚔${card.atk} ❤${card.hp}` : card.text}
      </span>
      {kwNames(card) && <span className="cg-kw">{kwNames(card)}</span>}
    </button>
  )
}

export default function CardGame({ onExit }) {
  const [phase, setPhase] = useState('build') // build: 덱 만들기 · play: 대결
  const [level, setLevel] = useState('보통')
  const [buildIds, setBuildIds] = useState(() => recommendedDeck())
  const [buildTab, setBuildTab] = useState('all') // all | minion | spell
  const [runIds, setRunIds] = useState([])
  const [streak, setStreak] = useState(0)
  const [rewards, setRewards] = useState(null)
  const [s, setS] = useState(null)

  const myTurn = !!s && s.active === 'player' && !s.over

  function startRun(ids, lv = level) {
    setRunIds(ids)
    setStreak(0)
    setRewards(null)
    setLevel(lv)
    setS(newCardGame({ level: lv, deckIds: ids }))
    setPhase('play')
  }

  function nextMatch(ids = runIds, lv = level) {
    setRewards(null)
    setS(newCardGame({ level: lv, deckIds: ids }))
  }

  // 행동 하나 처리: 끝나면 승리 시 보상 카드를 보여 준다
  function apply(fn, ...args) {
    if (!s) return
    unlockSound()
    const next = fn(s, ...args)
    if (next === s) return
    setS(next)
    if (next.over && next.winner === 'player') setRewards(rewardChoices(3))
  }

  function pickReward(id) {
    const ids = runIds.length < MAX_DECK ? [...runIds, id] : runIds
    setRunIds(ids)
    setStreak((x) => x + 1)
    nextMatch(ids)
  }

  function skipReward() {
    setStreak((x) => x + 1)
    nextMatch(runIds)
  }

  function toggleBuild(id) {
    setBuildIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id)
      return ids.length < DECK_SIZE ? [...ids, id] : ids
    })
  }

  // 키보드: 1~9 카드 내기 · E 턴 넘기기 · 보상 화면에서 1~3 · Esc 게임 선택 · R 다시 시작
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === 'Escape') {
        onExit()
        return
      }
      if (phase !== 'play' || !s) return
      if (rewards && s.over && s.winner === 'player') {
        if (/^[1-3]$/.test(key)) pickReward(rewards[Number(key) - 1])
        return
      }
      if (key === 'r' && s.over) {
        setStreak(0)
        nextMatch(runIds, level)
        return
      }
      if (key === 'e') {
        apply(endTurn)
        return
      }
      if (/^[1-9]$/.test(key)) apply(playCard, Number(key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // 키 처리는 매번 최신 상태를 쓰므로 상태가 바뀔 때마다 다시 등록한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, s, rewards, runIds, level, onExit])

  const fxFor = (side, uid) => (s ? s.fx.filter((e) => e.side === side && (uid ? e.uid === uid : e.hero)) : [])

  // ───────── 덱 만들기 화면 ─────────
  if (phase === 'build') {
    const ready = buildIds.length === DECK_SIZE
    return (
      <div className="app cg-app">
        <header>
          <div className="tw-head-left">
            <button className="back-btn" onClick={onExit}>← 게임 선택</button>
            <h1>CARDS</h1>
          </div>
          <div className="cg-levels">
            {Object.keys(DIFFICULTIES).map((lv) => (
              <button key={lv} className={`cg-level ${level === lv ? 'on' : ''}`} onClick={() => setLevel(lv)} title={DIFFICULTIES[lv].desc}>{lv}</button>
            ))}
          </div>
        </header>

        <main className="cg-build">
          <div className="panel cg-build-top">
            <div>
              <b className="cg-build-title">덱 만들기</b>
              <p className="cg-build-sub">카드 {buildIds.length} / {DECK_SIZE}장 (소환 {countType(buildIds, 'minion')} · 마법 {countType(buildIds, 'spell')}) · 카드를 눌러 넣고 빼세요 · 덱을 완성해야 시작할 수 있어요</p>
              <p className="cg-build-sub">난이도 {level}: {DIFFICULTIES[level].desc}</p>
            </div>
            <div className="cg-build-actions">
              <button onClick={() => setBuildIds(recommendedDeck())}>무작위 덱</button>
              <button className="cg-primary" disabled={!ready} onClick={() => startRun(buildIds)}>
                {ready ? '이 덱으로 시작' : `${DECK_SIZE - buildIds.length}장 더 고르세요`}
              </button>
            </div>
          </div>
          <div className="cg-tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`cg-tab ${buildTab === t.key ? 'on' : ''}`} onClick={() => setBuildTab(t.key)}>
                {t.label} <small>{t.key === 'all' ? buildIds.length : countType(buildIds, t.key)}</small>
              </button>
            ))}
          </div>

          <div className="cg-strip" aria-label="내 덱">
            {Array.from({ length: DECK_SIZE }, (_, i) => {
              const id = buildIds[i]
              const c = id ? cardById(id) : null
              return (
                <button
                  key={i}
                  className={`cg-slot ${c ? c.type : 'empty'}`}
                  disabled={!c}
                  title={c ? `${c.name} · 눌러서 빼기` : '빈 칸'}
                  onClick={() => c && toggleBuild(id)}
                >
                  {c && (c.type === 'minion'
                    ? <img className="pixel-icon" src={spriteUrl(c.sprite)} width={28} height={28} alt="" />
                    : <span aria-hidden="true">{c.icon}</span>)}
                </button>
              )
            })}
          </div>

          {GROUPS.filter((g) => buildTab === 'all' || buildTab === g.type).map((g) => (
            <section key={g.type} className="cg-group">
              <h3 className="cg-group-title">{g.title}</h3>
              <div className="cg-pool">
                {CARD_POOL.filter((c) => c.type === g.type).map((c) => (
                  <PoolCard key={c.id} card={c} on={buildIds.includes(c.id)} onClick={() => toggleBuild(c.id)} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    )
  }

  if (!s) return null

  const me = s.player
  const ai = s.ai
  const enemyMax = DIFFICULTIES[s.level]?.aiHp ?? START_HP

  // ───────── 대결 화면 ─────────
  return (
    <div className="app cg-app">
      <header>
        <div className="tw-head-left">
          <button className="back-btn" onClick={onExit}>← 게임 선택</button>
          <h1>CARDS</h1>
        </div>
        <div className="cg-head-right">
          <span className="cg-streak">🔥 연승 <b>{streak}</b></span>
          <div className="cg-levels">
            {Object.keys(DIFFICULTIES).map((lv) => (
              <button key={lv} className={`cg-level ${level === lv ? 'on' : ''}`} onClick={() => { setLevel(lv); nextMatch(runIds, lv); setStreak(0) }}>{lv}</button>
            ))}
          </div>
          <span className="cg-turn">{s.turn}턴 · {myTurn ? '내 차례' : '상대 차례'}</span>
        </div>
      </header>

      <main className="cg-main">
        <section key={s.fxId} className={`cg-table shake-${s.shake || 0}`} aria-label="전장">
          {s.shake === 3 && <div className="cg-flash" />}

          <Hero
            title="상대"
            hp={ai.hp}
            max={enemyMax}
            meta={`손패 ${ai.hand.length} · 덱 ${ai.deck.length} · 마나 ${ai.mana}/${ai.maxMana}`}
            events={fxFor('ai')}
            attackable={myTurn && !!s.selected}
            onClick={() => myTurn && s.selected && apply(attackHero)}
          />

          <div className="cg-lane">
            {ai.board.length === 0 && <span className="cg-empty">상대 하수인 없음</span>}
            {ai.board.map((m) => (
              <Minion
                key={`${s.fxId}-${m.uid}`}
                m={m}
                mine={false}
                targetable={myTurn && !!s.selected}
                events={fxFor('ai', m.uid)}
                onClick={() => myTurn && s.selected && apply(attackMinion, m.uid)}
              />
            ))}
          </div>

          <div className="cg-divider">⚔</div>

          <div className="cg-lane">
            {me.board.length === 0 && <span className="cg-empty">손패의 하수인 카드를 내 보세요</span>}
            {me.board.map((m) => (
              <Minion
                key={`${s.fxId}-${m.uid}`}
                m={m}
                mine
                selected={s.selected === m.uid}
                events={fxFor('player', m.uid)}
                onClick={() => myTurn && apply(selectMinion, m.uid)}
              />
            ))}
          </div>

          <Hero
            title="나"
            hp={me.hp}
            max={START_HP}
            meta={`덱 ${me.deck.length} · 마나 ${me.mana}/${me.maxMana}`}
            events={fxFor('player')}
          />

          <div className="cg-hand">
            {me.hand.map((c, i) => (
              <HandCard
                key={c.uid}
                card={c}
                index={i}
                playable={myTurn && c.cost <= me.mana && (c.type === 'spell' || me.board.length < MAX_BOARD)}
                onClick={() => apply(playCard, i)}
              />
            ))}
          </div>

          <div className="cg-actions">
            <button className="cg-end" onClick={() => apply(endTurn)} disabled={!myTurn}>턴 넘기기 (E)</button>
            <span className="cg-hint">
              {s.selected ? '상대 하수인이나 영웅을 클릭해 공격 (다시 누르면 취소)' : '초록 테두리 카드를 내거나, 공격 가능한 내 하수인을 클릭하세요'}
            </span>
          </div>

          {s.over && s.winner === 'player' && rewards && (
            <div className="cg-overlay">
              <h2>승리!</h2>
              <p>보상 카드를 하나 골라 덱에 넣으세요 · 연승 {streak + 1}</p>
              <div className="cg-reward-row">
                {rewards.map((id, i) => {
                  const c = cardById(id)
                  return (
                    <div key={id} className="cg-reward-wrap">
                      <span className="cg-key-badge">{i + 1}</span>
                      <PoolCard card={c} on={false} onClick={() => pickReward(id)} />
                    </div>
                  )
                })}
              </div>
              <button onClick={skipReward}>보상 없이 계속 (건너뛰기)</button>
            </div>
          )}

          {s.over && s.winner !== 'player' && (
            <div className="cg-overlay">
              <h2>패배…</h2>
              <p>연승 {streak}에서 끝났어요 · {s.turn}턴</p>
              <button className="cg-primary" onClick={() => { setStreak(0); nextMatch(runIds, level) }}>같은 덱으로 다시 (R)</button>
              <button onClick={() => { setBuildIds(fillDeck(runIds)); setPhase('build') }}>덱 고치기</button>
              <button onClick={onExit}>게임 선택 (Esc)</button>
            </div>
          )}
        </section>

        <aside className="cg-side">
          <div className="panel log">
            {s.log.map((m, i) => (
              <div key={i} className={i === s.log.length - 1 ? 'latest' : ''}>{m}</div>
            ))}
          </div>
          <div className="panel cg-rules">
            <div className="cg-rules-title">규칙</div>
            <p>영웅 체력 {START_HP}(난이도에 따라 다름)에서 시작해 상대 영웅을 먼저 쓰러뜨리면 이깁니다.</p>
            <p><b>돌진</b>: 낸 턴에도 공격 · <b>도발</b>: 상대가 이 하수인을 먼저 공격해야 함 · <b>방패</b>: 처음 받는 피해 한 번 무효</p>
            <p>이기면 보상 카드 3장 중 하나를 덱에 넣어 점점 강해집니다. 지면 연승이 끝나요.</p>
            <p>숫자 <kbd>1</kbd>~<kbd>9</kbd>로 카드를 내고, <kbd>E</kbd>로 턴을 넘깁니다.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

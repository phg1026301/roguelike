import { useCallback, useEffect, useState } from 'react'
import { newTowerRun, climb, canClimb, heightOf, TOWER_FLOORS, TOWER_COLS } from './towerEngine'
import { spriteUrl } from '../game/sprites'
import { playSound, unlockSound } from '../game/sound'
import './tower.css'

const BEST_KEY = 'tower.best'
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
function saveBest(height) {
  try {
    localStorage.setItem(BEST_KEY, String(height))
  } catch {
    // 저장이 막혀 있어도 게임은 계속된다
  }
}

const RESULT_SOUND = { win: 'kill', boost: 'heal', lose: 'die' }

// 한 칸 그리기: 적(전투력), 힘의 물약(+숫자), 주인공 위치
function Cell({ room, state, floor, col, onClick }) {
  const here = state.pos.floor === floor && state.pos.col === col
  const cleared = floor <= state.pos.floor // 이미 지나온 층
  const isNext = floor === state.pos.floor + 1
  const open = isNext && canClimb(state, col)
  const lastHit = state.last && state.last.floor === floor && state.last.col === col
  const cls = [
    'tw-cell',
    room.kind,
    cleared ? 'done' : '',
    open ? 'can' : '',
    isNext && !open ? 'blocked' : '',
    here ? 'here' : '',
    lastHit ? `hit-${state.last.result}` : '',
    room.boss ? 'boss' : '',
  ].join(' ')
  const label = room.kind === 'boost' ? `힘의 물약 +${room.power}` : room.boss ? `보스 전투력 ${room.power}` : `적 전투력 ${room.power}`
  const body = (
    <>
      {here && <img className="tw-hero" src={spriteUrl('warrior')} width={40} height={40} alt="주인공" />}
      {!here && <img className="tw-sprite" src={spriteUrl(room.sprite)} width={40} height={40} alt="" />}
      {here ? (
        <span className="tw-num total">⚔{state.power}</span>
      ) : (
        <span className={`tw-num ${room.kind}`}>{room.kind === 'boost' ? `+${room.power}` : room.power}</span>
      )}
    </>
  )
  if (open) {
    return (
      <button className={cls} onClick={onClick} aria-label={`${floor + 1}층 ${col + 1}번 칸 · ${label}`}>
        {body}
        <span className="tw-key">{col + 1}</span>
      </button>
    )
  }
  return (
    <div className={cls} aria-label={`${floor + 1}층 ${col + 1}번 칸 · ${label}`}>
      {body}
    </div>
  )
}

export default function TowerGame({ onExit }) {
  const [state, setState] = useState(newTowerRun)
  const [best, setBest] = useState(loadBest)

  // 한 번 움직인다: 효과음과 최고 기록을 함께 처리한다
  const go = useCallback((col) => {
    if (!canClimb(state, col)) return
    unlockSound()
    const next = climb(state, col)
    setState(next)
    const last = next.last
    if (next.status === 'won') playSound('boss')
    else if (last) playSound(RESULT_SOUND[last.result] || 'step')
    const h = heightOf(next)
    if (h > best) {
      saveBest(h)
      setBest(h)
    }
  }, [state, best])

  const restart = useCallback(() => setState(newTowerRun()), [])

  // 키보드: 1~3 = 열 선택, R = 다시 도전, Esc = 게임 선택
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === 'Escape') {
        onExit()
        return
      }
      if (key === 'r' && state.status !== 'playing') {
        restart()
        return
      }
      if (/^[1-3]$/.test(key)) go(Number(key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, go, restart, onExit])

  const rows = []
  for (let f = TOWER_FLOORS - 1; f >= 0; f--) rows.push(f)
  const over = state.status !== 'playing'
  const height = heightOf(state)

  return (
    <div className="app tower-app">
      <header>
        <div className="tw-head-left">
          <button className="back-btn" onClick={onExit}>← 게임 선택</button>
          <h1>TOWER</h1>
        </div>
        <span className="tw-best">최고 기록 <b>{best}층</b></span>
      </header>

      <main className="tower-main">
        <section className="tw-board" aria-label="탑">
          {rows.map((f) => (
            <div className="tw-row" key={f}>
              <span className="tw-floor">{f === TOWER_FLOORS - 1 ? '👑' : ''}{f + 1}F</span>
              {Array.from({ length: TOWER_COLS }, (_, c) => (
                <Cell key={c} room={state.floors[f][c]} state={state} floor={f} col={c} onClick={() => go(c)} />
              ))}
            </div>
          ))}
          <div className="tw-row ground">
            <span className="tw-floor">입구</span>
            {Array.from({ length: TOWER_COLS }, (_, c) => (
              <div key={c} className={`tw-cell ground ${state.pos.floor === -1 && state.pos.col === c ? 'here' : ''}`}>
                {state.pos.floor === -1 && state.pos.col === c && (
                  <img className="tw-hero" src={spriteUrl('warrior')} width={40} height={40} alt="주인공" />
                )}
              </div>
            ))}
          </div>

          {over && (
            <div className="tw-overlay">
              <h2>{state.status === 'won' ? '정상 정복!' : '쓰러졌다…'}</h2>
              <p>
                {state.status === 'won' ? `탑을 끝까지 올랐다 · 최종 전투력 ${state.power}` : `${height}층에서 멈췄다 · 전투력 ${state.power}`}
              </p>
              <button className="tw-primary" onClick={restart}>다시 도전 (R)</button>
              <button onClick={onExit}>게임 선택 (Esc)</button>
            </div>
          )}
        </section>

        <aside className="tw-side">
          <div className="panel tw-stats">
            <div><span>전투력</span><b className="tw-power">⚔ {state.power}</b></div>
            <div><span>현재 층</span><b>{height}층 / {TOWER_FLOORS}층</b></div>
          </div>

          <div className="panel tw-guide">
            <div className="tw-guide-title">규칙</div>
            <p>
              <b>숫자</b>는 적의 전투력이에요. 내 전투력 이상이면 이기고 적의 절반을 흡수합니다.
              <b className="tw-green"> +숫자</b>는 힘의 물약이에요.
            </p>
            <p>매 층 바로 위 칸 중 하나로 한 칸씩 오르고, 열은 한 칸씩만 옮길 수 있어요.</p>
            <p className="tw-tip">빛나는 칸만 고를 수 있어요. 키보드 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 으로도 선택할 수 있어요.</p>
          </div>

          <div className="panel log">
            {state.log.map((m, i) => (
              <div key={i} className={i === state.log.length - 1 ? 'latest' : ''}>{m}</div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}

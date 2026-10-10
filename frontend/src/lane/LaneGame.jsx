import { useEffect, useState } from 'react'
import {
  AIR_LANE,
  COLS,
  LANES,
  PLACE_COLS,
  TICK_MS,
  UNITS,
  UNIT_ORDER,
  castLightning,
  moveCursor,
  newLaneRun,
  nextStage,
  placeAt,
  selectUnit,
  tick,
  unlockedUnits,
  ENEMIES,
} from './laneEngine'
import { spriteUrl } from '../game/sprites'
import { playSound, unlockSound } from '../game/sound'
import './lane.css'

const BEST_KEY = 'lane.best'
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
function saveBest(stage) {
  try {
    localStorage.setItem(BEST_KEY, String(stage))
  } catch {
    // 저장이 막혀 있어도 게임은 계속된다
  }
}

const LANE_NAMES = ['1번 길', '2번 길', '하늘']

// 칸 하나: 기지, 우리 유닛, 적, 빈 배치 칸
function Cell({ s, lane, col, onClick }) {
  const isBase = col === 0
  const unit = s.units.find((u) => u.lane === lane && u.x === col)
  const enemy = s.enemies.find((e) => e.lane === lane && e.x === col)
  const here = s.cursor.lane === lane && s.cursor.col === col
  const placeable = PLACE_COLS.includes(col) && !unit && s.phase === 'playing'
  const flashed = (obj) => obj && obj.flash === s.tick
  const cls = [
    'ld-cell',
    isBase ? 'base' : '',
    placeable ? 'open' : '',
    here ? 'here' : '',
    unit && flashed(unit) ? 'hit' : '',
    enemy && flashed(enemy) ? 'hit' : '',
    enemy && enemy.boss ? 'boss' : '',
    isBase && flashed(s.base) ? 'hit' : '',
  ].join(' ')

  let body = null
  if (isBase) {
    body = (
      <>
        <span className="ld-base-icon">🏰</span>
        {lane === 1 && <span className="ld-base-hp">{s.base.hp}/{s.base.maxHp}</span>}
      </>
    )
  } else if (unit) {
    body = (
      <>
        <img src={spriteUrl(UNITS[unit.key].sprite)} width={40} height={40} alt={UNITS[unit.key].name} />
        <i className="ld-hp"><b style={{ width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%` }} /></i>
      </>
    )
  } else if (enemy) {
    body = (
      <>
        <img src={spriteUrl(ENEMIES[enemy.type].sprite)} width={enemy.boss ? 52 : 40} height={enemy.boss ? 52 : 40} alt={enemy.name} />
        <i className="ld-hp enemy"><b style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} /></i>
      </>
    )
  }
  return (
    <button className={cls} onClick={onClick} disabled={!placeable && !enemy && !unit} aria-label={`${LANE_NAMES[lane]} ${col}번 칸`}>
      {body}
    </button>
  )
}

export default function LaneGame({ onExit }) {
  const [state, setState] = useState(newLaneRun)
  const [best, setBest] = useState(loadBest)
  const unlocked = unlockedUnits(state.stage)

  // 시간 흐름: 진행 중일 때만 0.5초마다 한 틱
  useEffect(() => {
    if (state.phase !== 'playing') return
    const id = setInterval(() => setState((s) => tick(s)), TICK_MS)
    return () => clearInterval(id)
  }, [state.phase])

  // 기록 저장
  useEffect(() => {
    if (state.best > best) {
      setBest(state.best)
      saveBest(state.best)
    }
  }, [state.best, best])

  // 효과음: 엔진이 남긴 신호를 한 번만 재생
  useEffect(() => {
    if (state.snd) playSound(state.snd)
  }, [state.sndSeq]) // eslint-disable-line react-hooks/exhaustive-deps

  // 키보드 조작
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === 'Escape') {
        onExit()
        return
      }
      unlockSound()
      if (k === 'ArrowUp') { e.preventDefault(); setState((s) => moveCursor(s, -1, 0)) }
      else if (k === 'ArrowDown') { e.preventDefault(); setState((s) => moveCursor(s, 1, 0)) }
      else if (k === 'ArrowLeft') { e.preventDefault(); setState((s) => moveCursor(s, 0, -1)) }
      else if (k === 'ArrowRight') { e.preventDefault(); setState((s) => moveCursor(s, 0, 1)) }
      else if (k >= '1' && k <= '4') setState((s) => selectUnit(s, Number(k) - 1))
      else if (k === 'Enter' || k === ' ') {
        e.preventDefault()
        setState((s) => (s.phase === 'between' ? nextStage(s) : s.phase === 'playing' ? placeAt(s, s.cursor.lane, s.cursor.col) : s))
      } else if (k === 'x') setState((s) => castLightning(s, s.cursor.lane))
      else if (k === 'r') setState((s) => (s.phase === 'over' ? newLaneRun() : s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  const remaining = state.queue.length + state.enemies.length

  return (
    <div className="lane-app">
      <header className="ld-head">
        <button className="back-btn" onClick={onExit}>← 게임 선택</button>
        <h1>레인 디펜스</h1>
        <div className="ld-stats">
          <span>스테이지 <b>{state.stage}</b></span>
          <span>최고 <b>{best}</b></span>
          <span>처치 <b>{state.kills}</b></span>
        </div>
      </header>

      <div className="ld-main">
        <div className="ld-board-wrap">
          <div className="ld-board" style={{ '--cols': COLS }}>
            {Array.from({ length: LANES }, (_, lane) => (
              <div key={lane} className={`ld-lane ${lane === AIR_LANE ? 'air' : ''}`}>
                <span className="ld-lane-name">{LANE_NAMES[lane]}</span>
                {Array.from({ length: COLS }, (_, col) => (
                  <Cell key={col} s={state} lane={lane} col={col} onClick={() => {
                    unlockSound()
                    setState((s) => (PLACE_COLS.includes(col) ? placeAt(s, lane, col) : s))
                  }} />
                ))}
              </div>
            ))}
          </div>

          <div className="ld-mana">
            <span className="ld-mana-label">마나</span>
            <div className="ld-mana-bar"><b style={{ width: `${(state.mana / state.maxMana) * 100}%` }} /></div>
            <span className="ld-mana-num">{Math.floor(state.mana)} / {state.maxMana}</span>
            <span className="ld-wave">남은 적 {remaining}</span>
          </div>

          <div className="ld-units">
            {UNIT_ORDER.map((key, i) => {
              const u = UNITS[key]
              const locked = !unlocked.includes(key)
              const on = state.selected === key
              return (
                <button
                  key={key}
                  className={`ld-unit ${on ? 'on' : ''} ${locked ? 'locked' : ''}`}
                  disabled={locked}
                  onClick={() => { unlockSound(); setState((s) => selectUnit(s, i)) }}
                >
                  <span className="ld-key">{i + 1}</span>
                  <img src={spriteUrl(u.sprite)} width={36} height={36} alt="" />
                  <b>{u.name}</b>
                  <span className="ld-cost">{locked ? `스테이지 ${u.unlock}` : `마나 ${u.cost}`}</span>
                  <span className="ld-desc">{u.desc}</span>
                </button>
              )
            })}
            <button className="ld-unit lightning" onClick={() => { unlockSound(); setState((s) => castLightning(s, s.cursor.lane)) }}>
              <span className="ld-key">X</span>
              <span className="ld-bolt">⚡</span>
              <b>번개</b>
              <span className="ld-cost">마나 4</span>
              <span className="ld-desc">커서가 있는 길 전체에 4 피해</span>
            </button>
          </div>
        </div>

        <aside className="ld-side">
          <div className="ld-guide">
            <h2>조작</h2>
            <p><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> 칸 이동</p>
            <p><kbd>1</kbd>~<kbd>4</kbd> 유닛 고르기</p>
            <p><kbd>Enter</kbd> 유닛 세우기</p>
            <p><kbd>X</kbd> 번개 · <kbd>Esc</kbd> 게임 선택</p>
            <p className="ld-tip">칸을 직접 누르거나 유닛 카드를 눌러도 됩니다. 하늘 길은 궁수·마법사만 세울 수 있어요.</p>
          </div>
          <div className="ld-log">
            {state.log.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </aside>
      </div>

      {state.phase === 'between' && (
        <div className="ld-overlay">
          <div className="ld-panel">
            <h2>스테이지 {state.stage} 클리어!</h2>
            <p>기지 +3 회복 · 최대 마나 +1</p>
            {unlockedUnits(state.stage + 1).length > unlocked.length && (
              <p className="ld-new">다음 스테이지에서 새 유닛이 열립니다.</p>
            )}
            <button onClick={() => setState((s) => nextStage(s))}>다음 스테이지 (Enter)</button>
          </div>
        </div>
      )}
      {state.phase === 'over' && (
        <div className="ld-overlay">
          <div className="ld-panel">
            <h2>기지가 무너졌다</h2>
            <p>{state.stage} 스테이지까지 버텼어요. 처치 {state.kills}마리</p>
            <button onClick={() => setState(newLaneRun())}>다시 하기 (R)</button>
            <button className="ghost" onClick={onExit}>게임 선택 (Esc)</button>
          </div>
        </div>
      )}
    </div>
  )
}

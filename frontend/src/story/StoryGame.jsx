import { useEffect, useState } from 'react'
import { SCENES, START_SCENE, START_STATS, STAT_NAMES } from './storyData'
import { playSound, unlockSound } from '../game/sound'
import './story.css'

const SAVE_KEY = 'neon.save'
function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
  } catch {
    return null
  }
}
function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // 저장이 막혀 있어도 이야기는 계속된다
  }
}

function applyEffect(stats, flags, effect) {
  if (!effect) return { stats, flags }
  const nextStats = { ...stats }
  const nextFlags = { ...flags }
  for (const k of Object.keys(effect)) {
    if (k === 'set') nextFlags[effect.set] = true
    else nextStats[k] = (nextStats[k] || 0) + effect[k]
  }
  return { stats: nextStats, flags: nextFlags }
}

export default function StoryGame({ onExit }) {
  const [scene, setScene] = useState(START_SCENE)
  const [line, setLine] = useState(0)
  const [stats, setStats] = useState(START_STATS)
  const [flags, setFlags] = useState({})
  const [hasSave, setHasSave] = useState(() => !!loadSave())
  const [dice, setDice] = useState(null) // 해킹 판정 결과 메시지

  const cur = SCENES[scene]
  const lastLine = line >= cur.lines.length - 1

  // 이어하기 저장: 장면이 바뀔 때마다
  useEffect(() => {
    writeSave({ scene, stats, flags })
  }, [scene, stats, flags])

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        onExit()
        return
      }
      unlockSound()
      const visible = visibleChoices()
      if (!lastLine && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        setLine((l) => l + 1)
        return
      }
      if (lastLine && !cur.ending && visible.length === 0 && cur.next && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        goto(cur.next)
        return
      }
      if (lastLine && visible.length && e.key >= '1' && e.key <= String(visible.length)) {
        choose(visible[Number(e.key) - 1])
      }
      if (e.key === 'r' && cur.ending) restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function visibleChoices() {
    if (!cur.choices) return []
    return cur.choices.filter((c) => !c.req || Object.keys(c.req).every((k) => stats[k] >= c.req[k]))
  }

  // 장면으로 넘어갈 때 그 장면의 효과를 한 번만 적용한다
  function goto(id) {
    const target = SCENES[id]
    if (target.effect) {
      setStats((prev) => applyEffect(prev, {}, target.effect).stats)
    }
    setScene(id)
    setLine(0)
    setDice(null)
  }

  function choose(c) {
    if (c.effect) {
      setStats((prev) => applyEffect(prev, {}, c.effect).stats)
      setFlags((prev) => applyEffect({}, prev, c.effect).flags)
    }
    if (c.check) {
      const pass = stats[c.check.stat] >= c.check.min
      setDice(pass ? '해킹 판정 성공!' : '해킹 판정 실패…')
      playSound(pass ? 'coin' : 'warn')
      goto(pass ? c.check.pass : c.check.fail)
      return
    }
    goto(c.next)
  }

  function restart() {
    setScene(START_SCENE)
    setLine(0)
    setStats(START_STATS)
    setFlags({})
    setDice(null)
  }

  function resume() {
    const s = loadSave()
    if (!s) return
    setScene(s.scene)
    setStats(s.stats)
    setFlags(s.flags || {})
    setLine(0)
  }

  const choices = lastLine ? visibleChoices() : []
  const speaker = cur.lines[line]?.who
  const isEnding = !!cur.ending

  return (
    <div className={`story-app bg-${cur.bg}`}>
      <header className="st-head">
        <button className="back-btn" onClick={onExit}>← 게임 선택</button>
        <h1>네온 시티</h1>
        <div className="st-stats">
          {Object.keys(STAT_NAMES).map((k) => (
            <span key={k}>{STAT_NAMES[k]} <b>{stats[k]}</b></span>
          ))}
        </div>
      </header>

      <div className="st-stage">
        <div className="st-scene-tag">{isEnding ? `엔딩 · ${cur.ending}` : scene}</div>
        {dice && <div className="st-dice">{dice}</div>}

        <div className="st-box" onClick={() => { if (!lastLine) setLine((l) => l + 1) }}>
          {speaker && <div className="st-speaker">{speaker}</div>}
          <p className="st-text">{cur.lines[line]?.text}</p>
          {!lastLine && <span className="st-next">▼ 클릭 또는 Enter</span>}
        </div>

        {lastLine && !isEnding && choices.length > 0 && (
          <div className="st-choices">
            {choices.map((c, i) => (
              <button key={i} className="st-choice" onClick={() => choose(c)}>
                <kbd>{i + 1}</kbd> {c.text}
              </button>
            ))}
          </div>
        )}
        {lastLine && !isEnding && choices.length === 0 && cur.next && (
          <div className="st-choices">
            <button className="st-choice" onClick={() => goto(cur.next)}>
              <kbd>Enter</kbd> 계속
            </button>
          </div>
        )}
        {isEnding && (
          <div className="st-choices">
            <button className="st-choice" onClick={restart}>처음부터 다시 (R)</button>
          </div>
        )}
        {!lastLine && <div className="st-hint">대사를 넘기는 중</div>}
      </div>

      <div className="st-footer">
        {hasSave && !isEnding && (
          <button className="st-ghost" onClick={resume}>이어하기</button>
        )}
        <span>Enter 또는 클릭으로 진행 · 숫자키로 선택 · Esc 게임 선택</span>
      </div>
    </div>
  )
}

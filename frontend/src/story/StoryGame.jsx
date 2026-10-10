import { useEffect, useState } from 'react'
import { SCENES, START_SCENE, START_STATS, STAT_NAMES, CODEX, ORIGINS } from './storyData'
import { playSound, unlockSound, startMusic, stopMusic } from '../game/sound'
import StoryArt from './StoryArt'
import { PortraitSvg, PORTRAIT_SVG_NAMES } from './PortraitSvg'
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

// 효과 적용: 숫자는 스탯에 더하고, true 값이나 set 키는 플래그를 켠다
function applyEffect(stats, flags, effect) {
  if (!effect) return { stats, flags }
  const nextStats = { ...stats }
  const nextFlags = { ...flags }
  for (const k of Object.keys(effect)) {
    if (k === 'set') nextFlags[effect.set] = true
    else if (typeof effect[k] === 'boolean') nextFlags[k] = effect[k]
    else nextStats[k] = (nextStats[k] || 0) + effect[k]
  }
  return { stats: nextStats, flags: nextFlags }
}

// 조건 검사: 숫자는 스탯 이상, true는 플래그가 켜져 있어야 함
function meets(req, stats, flags) {
  if (!req) return true
  return Object.keys(req).every((k) => {
    const v = req[k]
    if (typeof v === 'boolean') return !!flags[k] === v
    return (stats[k] || 0) >= v
  })
}

// 장면 대사. 인트로에는 고른 출신에 맞는 한 줄을 끼워 넣는다
function sceneLines(id, flags) {
  const base = SCENES[id].lines
  if (id !== 'intro') return base
  const o = ORIGINS.find((x) => flags[x.flag])
  if (!o) return base
  return [base[0], base[1], { who: '리코', text: o.line }, ...base.slice(2)]
}

export default function StoryGame({ onExit }) {
  const [phase, setPhase] = useState('select') // 'select'(출신 고르기) | 'play'
  const [scene, setScene] = useState(START_SCENE)
  const [line, setLine] = useState(0)
  const [stats, setStats] = useState(START_STATS)
  const [flags, setFlags] = useState({})
  const [hasSave, setHasSave] = useState(() => !!loadSave())
  const [dice, setDice] = useState(null) // 해킹 판정 결과 메시지
  const [codex, setCodex] = useState(false) // 도감 열림 여부

  const lines = sceneLines(scene, flags)
  const cur = SCENES[scene]
  const lastLine = line >= lines.length - 1
  const visible = lastLine && cur.choices ? cur.choices.filter((c) => meets(c.req, stats, flags)) : []

  // 잔잔한 네온 시티 배경음악: 이 화면에 있는 동안만
  useEffect(() => {
    startMusic('neon')
    return () => stopMusic()
  }, [])

  // 이어하기 저장: 이야기를 시작한 뒤에만 쓴다 (처음 열 때 기존 저장을 덮어쓰지 않도록)
  useEffect(() => {
    if (phase === 'play') writeSave({ scene, stats, flags })
  }, [phase, scene, stats, flags])

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        if (codex) setCodex(false)
        else onExit()
        return
      }
      unlockSound()
      if (phase === 'select') {
        const n = Number(e.key)
        if (n >= 1 && n <= ORIGINS.length) startNew(ORIGINS[n - 1])
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        setCodex((v) => !v)
        return
      }
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

  // 출신을 고르고 처음부터 시작한다
  function startNew(o) {
    setStats({ ...START_STATS, ...mergeBonus(o.bonus) })
    setFlags({ [o.flag]: true })
    setScene(START_SCENE)
    setLine(0)
    setDice(null)
    setPhase('play')
  }

  function mergeBonus(bonus) {
    const out = {}
    for (const k of Object.keys(bonus)) out[k] = (START_STATS[k] || 0) + bonus[k]
    return out
  }

  // 장면으로 넘어갈 때 그 장면의 효과를 한 번만 적용한다
  function goto(id) {
    const target = SCENES[id]
    if (target.effect) {
      setStats((prev) => applyEffect(prev, {}, target.effect).stats)
      setFlags((prev) => applyEffect({}, prev, target.effect).flags)
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
      const pass = (stats[c.check.stat] || 0) >= c.check.min
      setDice(pass ? '해킹 판정 성공!' : '해킹 판정 실패…')
      playSound(pass ? 'coin' : 'warn')
      goto(pass ? c.check.pass : c.check.fail)
      return
    }
    goto(c.next)
  }

  function restart() {
    setPhase('select')
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
    setStats({ ...START_STATS, ...s.stats })
    setFlags(s.flags || {})
    setLine(0)
    setPhase('play')
  }

  const choices = visible
  const speaker = lines[line]?.who
  const isEnding = !!cur.ending
  const unlockedCodex = CODEX.filter((c) => flags[c.unlock])

  // 출신 고르기 화면
  if (phase === 'select') {
    return (
      <div className="story-app bg-rain">
        <header className="st-head">
          <button className="back-btn" onClick={onExit}>← 게임 선택</button>
          <h1>네온 시티</h1>
        </header>
        <div className="st-origin">
          <p className="st-origin-title">당신은 어디에서 왔나요?</p>
          <div className="st-origin-list">
            {ORIGINS.map((o, i) => (
              <button key={o.id} className="st-origin-card" onClick={() => startNew(o)}>
                <div className="st-origin-name"><kbd>{i + 1}</kbd> {o.name}</div>
                <div className="st-origin-sub">{o.sub}</div>
                <p>{o.desc}</p>
                <div className="st-origin-bonus">
                  {Object.keys(o.bonus).map((k) => `${STAT_NAMES[k]} +${o.bonus[k]}`).join(' · ')}
                </div>
              </button>
            ))}
          </div>
          {hasSave && (
            <button className="st-ghost" onClick={resume}>이어하기</button>
          )}
        </div>
        <div className="st-footer">
          <span>숫자키 또는 클릭으로 선택 · Esc 게임 선택</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`story-app bg-${cur.bg}`}>
      <header className="st-head">
        <button className="back-btn" onClick={onExit}>← 게임 선택</button>
        <h1>네온 시티</h1>
        <div className="st-stats">
          {Object.keys(STAT_NAMES).map((k) => (
            <span key={k}>{STAT_NAMES[k]} <b>{stats[k] || 0}</b></span>
          ))}
        </div>
      </header>

      <div className="st-stage">
        <div className="st-art-wrap">
          <StoryArt bg={cur.bg} />
        </div>
        <div className="st-scene-tag">{isEnding ? `엔딩 · ${cur.ending}` : scene}</div>
        {dice && <div className="st-dice">{dice}</div>}

        <div className="st-box" onClick={() => { if (!lastLine) setLine((l) => l + 1) }}>
          <div className="st-row">
            {PORTRAIT_SVG_NAMES.includes(speaker) && (
              <div className="st-portrait-wrap">
                <PortraitSvg name={speaker} />
              </div>
            )}
            <div className="st-main">
              {speaker && <div className="st-speaker">{speaker}</div>}
              <p className="st-text">{lines[line]?.text}</p>
            </div>
          </div>
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

        {codex && (
          <div className="st-codex">
            <div className="st-codex-head">
              <b>도감 · 떡밥 {unlockedCodex.length}/{CODEX.length}</b>
              <button className="st-ghost" onClick={() => setCodex(false)}>닫기 (C)</button>
            </div>
            {unlockedCodex.length === 0 && <p className="st-codex-empty">아직 아무것도 알아내지 못했다. 이야기를 더 따라가 보자.</p>}
            {unlockedCodex.map((c) => (
              <div key={c.id} className="st-codex-item">
                <div className="st-codex-title">{c.title}</div>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="st-footer">
        {hasSave && !isEnding && (
          <button className="st-ghost" onClick={resume}>이어하기</button>
        )}
        <button className="st-ghost" onClick={() => setCodex((v) => !v)}>도감 (C)</button>
        <span>Enter 또는 클릭으로 진행 · 숫자키로 선택 · C 도감 · Esc 게임 선택</span>
      </div>
    </div>
  )
}

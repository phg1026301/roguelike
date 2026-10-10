import { useEffect, useRef, useState } from 'react'
import { VIEW_W, VIEW_H, createWorld, update } from './actionEngine'
import { draw } from './actionRender'
import { unlockSound } from '../game/sound'
import './action.css'

export default function ActionGame({ onExit }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const worldRef = useRef(createWorld())
  // 키 상태: keys와 mouseHeld는 누르고 있는 동안 계속 true, 나머지는 한 번 누르면 다음 프레임에 한 번만 쓴다
  const input = useRef({ keys: new Set(), mouseHeld: false, attack: false, dodge: false, interact: false, potion: false, bag: false, choice: 0 })
  const [full, setFull] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // 화면 배율(고해상도 모니터)에 맞춰 캔버스를 키워 그린다. 그러면 글자와 그림이 흐려지지 않는다
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = VIEW_W * DPR
    canvas.height = VIEW_H * DPR
    let raf = 0
    let last = performance.now()

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const i = input.current
      const k = i.keys
      const dx = (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)
      const dy = (k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0)
      const attackHeld = k.has('j') || k.has('z') || i.mouseHeld
      const cmd = {
        dx, dy,
        attack: i.attack,
        attackHeld,
        dodge: i.dodge,
        interact: i.interact,
        potion: i.potion,
        bag: i.bag,
        choice: i.choice,
      }
      i.attack = false
      i.dodge = false
      i.interact = false
      i.potion = false
      i.bag = false
      i.choice = 0
      const w = update(worldRef.current, dt, cmd)
      worldRef.current = w
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      draw(ctx, w, now / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    function restart() {
      worldRef.current = createWorld()
    }

    // 키 이름을 소문자로 맞춘다 (Shift 같은 조합도 같은 키로 본다)
    const norm = (key) => (key.length === 1 ? key.toLowerCase() : key)

    function onDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        // 전체화면이면 브라우저가 먼저 빠져나가므로, 여기서는 게임 선택으로만 간다
        if (!document.fullscreenElement) onExit()
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      unlockSound()
      if (e.repeat) return
      const key = norm(e.key)
      const i = input.current
      i.keys.add(key)
      if (key === 'j' || key === 'z') i.attack = true
      if (key === ' ' || key === 'k') i.dodge = true
      if (key === 'e' || key === 'Enter') i.interact = true
      if (key === 'q') i.potion = true
      if (key === 'i') i.bag = true
      if (/^[1-9]$/.test(key)) i.choice = Number(key)
      if (key === 'r' && worldRef.current.over) restart()
      if (key === 'f') toggleFull()
    }
    function onUp(e) {
      input.current.keys.delete(norm(e.key))
    }
    function onMouseDown(e) {
      unlockSound()
      if (e.button === 0) {
        input.current.mouseHeld = true
        input.current.attack = true
      }
      if (e.button === 2) input.current.dodge = true
    }
    function onMouseUp(e) {
      if (e.button === 0) input.current.mouseHeld = false
    }
    function onContext(e) {
      e.preventDefault()
    }
    function onBlur() {
      input.current.keys.clear()
      input.current.mouseHeld = false
    }
    function onFs() {
      setFull(!!document.fullscreenElement)
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFs)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('contextmenu', onContext)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFs)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('contextmenu', onContext)
    }
  }, [onExit])

  function toggleFull() {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      el.requestFullscreen?.()?.catch?.(() => {})
    }
  }

  return (
    <div className="action-app">
      <header className="ac-head">
        <button className="back-btn" onClick={onExit}>← 게임 선택</button>
        <h1>검의 길 (프로토타입)</h1>
        <button className="ac-ghost" onClick={toggleFull}>{full ? '전체화면 끄기 (F)' : '전체화면 (F)'}</button>
      </header>
      <div className="ac-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="ac-canvas" />
      </div>
      <p className="ac-help">
        <kbd>WASD</kbd> 또는 방향키 이동 · <kbd>J</kbd>/<kbd>Z</kbd> 또는 왼쪽 클릭: 누르고 있으면 콤보가 계속 이어짐
        · <kbd>Space</kbd>/<kbd>K</kbd> 또는 오른쪽 클릭 회피 · <kbd>E</kbd>/<kbd>Enter</kbd> 대화 · <kbd>Q</kbd> 물약
        · <kbd>I</kbd> 가방·장비 · <kbd>F</kbd> 전체화면 · <kbd>R</kbd> 다시 시작 · <kbd>Esc</kbd> 게임 선택
      </p>
    </div>
  )
}

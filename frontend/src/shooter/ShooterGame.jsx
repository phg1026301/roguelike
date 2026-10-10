import { useEffect, useRef, useState } from 'react'
import { W, H, createWorld, update, switchWeapon } from './shooterEngine'
import { draw } from './shooterRender'
import { playSound, unlockSound } from '../game/sound'
import './shooter.css'

const BEST_KEY = 'shooter.best'
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
function saveBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    // 저장이 막혀 있어도 게임은 계속된다
  }
}

export default function ShooterGame({ onExit }) {
  const canvasRef = useRef(null)
  const worldRef = useRef(createWorld())
  const keys = useRef(new Set())
  const mouse = useRef({ x: 0, y: 0, down: false, lastMove: 0, active: false })
  const [best, setBest] = useState(loadBest)
  const [over, setOver] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = performance.now()
    let prevKills = 0
    let prevHp = worldRef.current.player.hp

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = keys.current
      const dx = (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)
      const dy = (k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0)
      const fire = k.has(' ') || mouse.current.down
      // 마우스를 최근에 움직였으면 마우스 방향으로 조준
      let aim = null
      if (mouse.current.active && now - mouse.current.lastMove < 2500) {
        const p = worldRef.current.player
        aim = Math.atan2(mouse.current.y - p.y, mouse.current.x - p.x)
      }
      const w = update(worldRef.current, dt, { dx, dy, fire, aim })
      worldRef.current = w

      // 효과음: 처치와 피격
      if (w.kills > prevKills) playSound('kill')
      if (w.player.hp < prevHp) playSound('hurt')
      prevKills = w.kills
      prevHp = w.player.hp

      draw(ctx, w, now / 1000)
      if (w.over) {
        setOver(true)
        setBest((b) => {
          const nb = Math.max(b, w.score)
          if (nb !== b) saveBest(nb)
          return nb
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    function reset() {
      worldRef.current = createWorld()
      prevKills = 0
      prevHp = worldRef.current.player.hp
      setOver(false)
    }

    function onDown(e) {
      if (e.key === 'Escape') {
        onExit()
        return
      }
      unlockSound()
      if (e.key === 'r' || e.key === 'R') {
        if (worldRef.current.over) reset()
        return
      }
      if (['1', '2', '3'].includes(e.key)) switchWeapon(worldRef.current, Number(e.key) - 1)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      keys.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    function onUp(e) {
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect()
      return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
    }
    function onMove(e) {
      const pt = toCanvas(e)
      mouse.current.x = pt.x
      mouse.current.y = pt.y
      mouse.current.lastMove = performance.now()
      mouse.current.active = true
    }
    function onMouseDown(e) {
      unlockSound()
      mouse.current.down = true
      onMove(e)
    }
    function onMouseUp() {
      mouse.current.down = false
    }
    function onBlur() {
      keys.current.clear()
      mouse.current.down = false
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onMouseDown)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onMouseDown)
    }
  }, [onExit])

  return (
    <div className="shooter-app">
      <header className="sh-head">
        <button className="back-btn" onClick={onExit}>← 게임 선택</button>
        <h1>탄환 소년</h1>
        <span className="sh-best">최고 점수 <b>{best}</b></span>
      </header>
      <div className="sh-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="sh-canvas" />
      </div>
      <p className="sh-help">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 또는 방향키로 이동 (두 키를 함께 누르면 대각선)
        · <kbd>Space</kbd> 또는 마우스 클릭으로 발사 · 마우스로 조준
        · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 무기 바꾸기 · <kbd>Esc</kbd> 게임 선택
        {over && <> · <b>R</b> 다시 시작</>}
      </p>
    </div>
  )
}

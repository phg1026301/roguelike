import { useEffect, useRef, useState } from 'react'
import './App.css'
import { newGame, move, wait, drinkPotion, score } from './game/engine'
import { render, TILE, VIEW_W, VIEW_H } from './game/renderer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

function App() {
  const [game, setGame] = useState(newGame)
  const [server, setServer] = useState('확인 중')
  const canvasRef = useRef(null)

  // 첫 접속 때 백엔드를 미리 깨워둔다 (Render 무료 플랜은 잠들어 있을 수 있음)
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.text())
      .then((text) => setServer(text === 'OK' ? '연결됨' : text))
      .catch(() => setServer('연결 안 됨'))
  }, [])

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
      } else if (key === 'r') {
        setGame((g) => (g.over ? newGame() : g))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 게임 상태가 바뀔 때마다 캔버스를 다시 그린다
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    render(ctx, game)
  }, [game])

  const p = game.player
  const hpPercent = Math.round((p.hp / p.maxHp) * 100)
  const lowHp = hpPercent <= 30

  return (
    <div className="app">
      <header>
        <h1>ROGUELIKE</h1>
        <span className={`server ${server === '연결됨' ? 'ok' : ''}`}>● 서버 {server}</span>
      </header>

      <main>
        <div className="board-wrap">
          <canvas ref={canvasRef} width={VIEW_W * TILE} height={VIEW_H * TILE} className="board" />

          <div className="floor-badge">B{game.depth}</div>

          {game.over && (
            <div className="overlay">
              <h2>GAME OVER</h2>
              <p>{game.deathCause}에게 쓰러졌다</p>
              <p className="final-score">{score(game)}</p>
              <p className="sub">지하 {game.depth}층 · 처치 {game.kills} · {game.turns}턴</p>
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

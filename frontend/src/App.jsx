import { useEffect, useState } from 'react'
import './App.css'
import { W, H } from './game/dungeon'
import { newGame, move, wait, drinkPotion, score } from './game/engine'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

const MONSTER_CLASS = { r: 'm-rat', g: 'm-goblin', O: 'm-orc' }

function Cell({ game, x, y }) {
  const seen = game.visible[y][x]
  const known = game.explored[y][x]
  if (!known) return <span className="cell" />

  const tile = game.tiles[y][x]
  let ch = tile === '#' ? '#' : tile === '>' ? '>' : '·'
  let cls = tile === '#' ? 'wall' : tile === '>' ? 'stairs' : 'floor'

  if (seen) {
    const p = game.player
    const monster = game.monsters.find((m) => m.x === x && m.y === y)
    const item = game.items.find((it) => it.x === x && it.y === y)
    if (p.x === x && p.y === y) {
      ch = '@'
      cls = 'player'
    } else if (monster) {
      ch = monster.ch
      cls = MONSTER_CLASS[monster.ch]
    } else if (item) {
      ch = '!'
      cls = 'potion'
    }
  }
  return <span className={`cell ${cls} ${seen ? '' : 'dim'}`}>{ch}</span>
}

function App() {
  const [game, setGame] = useState(newGame)
  const [server, setServer] = useState('확인 중...')

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

  const p = game.player
  const hpPercent = Math.round((p.hp / p.maxHp) * 100)

  return (
    <div className="app">
      <header>
        <h1>ROGUELIKE</h1>
        <span className="server">서버: {server}</span>
      </header>

      <main>
        <div className="board-wrap">
          <div className="board" style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
            {Array.from({ length: H }, (_, y) =>
              Array.from({ length: W }, (_, x) => <Cell key={`${x},${y}`} game={game} x={x} y={y} />),
            )}
          </div>

          {game.over && (
            <div className="overlay">
              <h2>GAME OVER</h2>
              <p>{game.deathCause}에게 쓰러졌다</p>
              <p className="final-score">점수 {score(game)}</p>
              <p>지하 {game.depth}층 · 처치 {game.kills} · {game.turns}턴</p>
              <button onClick={() => setGame(newGame())}>다시 하기 (R)</button>
            </div>
          )}
        </div>

        <aside>
          <div className="stat">
            <div className="label">HP {p.hp} / {p.maxHp}</div>
            <div className="hpbar"><div style={{ width: `${hpPercent}%` }} /></div>
          </div>
          <div className="stat-grid">
            <span>층</span><b>B{game.depth}</b>
            <span>공격력</span><b>{p.atk}</b>
            <span>포션</span><b>{p.potions}</b>
            <span>처치</span><b>{game.kills}</b>
            <span>점수</span><b>{score(game)}</b>
          </div>

          <div className="log">
            {game.messages.map((m, i) => (
              <div key={i} className={i === game.messages.length - 1 ? 'latest' : ''}>{m}</div>
            ))}
          </div>

          <div className="help">
            <div><kbd>방향키</kbd>/<kbd>WASD</kbd> 이동 · 공격</div>
            <div><kbd>Space</kbd> 한 턴 쉬기</div>
            <div><kbd>Q</kbd> 포션 마시기</div>
            <div className="legend">
              <span className="player">@</span> 나 <span className="m-rat">r</span> 쥐{' '}
              <span className="m-goblin">g</span> 고블린 <span className="m-orc">O</span> 오크{' '}
              <span className="potion">!</span> 포션 <span className="stairs">&gt;</span> 계단
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App

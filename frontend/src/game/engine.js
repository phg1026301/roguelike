// 게임 규칙: 턴 진행, 전투, 몬스터 AI, 시야, 점수
import { W, H, generateDungeon, randInt, center } from './dungeon'

const VIEW_RADIUS = 7
const POTION_HEAL = 8

const MONSTER_TYPES = [
  { name: '쥐', ch: 'r', hp: 3, atk: 1 },
  { name: '고블린', ch: 'g', hp: 6, atk: 2 },
  { name: '오크', ch: 'O', hp: 12, atk: 4 },
]

let nextId = 1

function randomFloorIn(room, taken) {
  for (let i = 0; i < 30; i++) {
    const x = randInt(room.x, room.x + room.w - 1)
    const y = randInt(room.y, room.y + room.h - 1)
    const key = `${x},${y}`
    if (!taken.has(key)) {
      taken.add(key)
      return { x, y }
    }
  }
  return null
}

function buildFloor(depth, player) {
  const { tiles, rooms } = generateDungeon()
  const start = center(rooms[0])
  const stairs = center(rooms[rooms.length - 1])
  tiles[stairs.y][stairs.x] = '>'

  const taken = new Set([`${start.x},${start.y}`, `${stairs.x},${stairs.y}`])
  const monsters = []
  const items = []
  // 깊이 내려갈수록 강한 몬스터가 나올 수 있다
  const maxType = Math.min(MONSTER_TYPES.length - 1, Math.floor((depth + 1) / 2))

  rooms.slice(1).forEach((room) => {
    const count = randInt(0, 1 + Math.floor(depth / 2))
    for (let i = 0; i < count; i++) {
      const pos = randomFloorIn(room, taken)
      if (!pos) continue
      const t = MONSTER_TYPES[randInt(0, maxType)]
      const hp = t.hp + (depth - 1)
      monsters.push({ id: nextId++, ...t, ...pos, hp, maxHp: hp, atk: t.atk + Math.floor((depth - 1) / 2) })
    }
    if (Math.random() < 0.4) {
      const pos = randomFloorIn(room, taken)
      if (pos) items.push({ id: nextId++, kind: 'potion', ...pos })
    }
  })

  const explored = Array.from({ length: H }, () => Array(W).fill(false))
  return { tiles, monsters, items, explored, player: { ...player, ...start } }
}

export function newGame() {
  const player = { x: 0, y: 0, hp: 20, maxHp: 20, atk: 3, potions: 1 }
  const state = {
    depth: 1,
    kills: 0,
    turns: 0,
    over: false,
    deathCause: null,
    fx: [],
    hurtTurn: -1,
    messages: ['던전에 들어왔다. 계단(>)을 찾아 내려가자!'],
    ...buildFloor(1, player),
  }
  return updateFov(state)
}

export function score(state) {
  return state.depth * 100 + state.kills * 10
}

function log(state, msg) {
  state.messages = [...state.messages, msg].slice(-6)
}

// 플레이어에서 (tx,ty)까지 직선 위에 벽이 없으면 보인다
function lineOfSight(tiles, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0)
  let dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && tiles[y][x] === '#') return false
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return true
}

function updateFov(state) {
  const { x: px, y: py } = state.player
  const visible = Array.from({ length: H }, () => Array(W).fill(false))
  const explored = state.explored.map((row) => [...row])
  for (let y = Math.max(0, py - VIEW_RADIUS); y <= Math.min(H - 1, py + VIEW_RADIUS); y++) {
    for (let x = Math.max(0, px - VIEW_RADIUS); x <= Math.min(W - 1, px + VIEW_RADIUS); x++) {
      if ((x - px) ** 2 + (y - py) ** 2 > VIEW_RADIUS ** 2) continue
      if (lineOfSight(state.tiles, px, py, x, y)) {
        visible[y][x] = true
        explored[y][x] = true
      }
    }
  }
  return { ...state, visible, explored }
}

function monsterAt(state, x, y) {
  return state.monsters.find((m) => m.x === x && m.y === y)
}

function monstersAct(state) {
  const p = state.player
  for (const m of state.monsters) {
    if (state.over) break
    const dx = p.x - m.x
    const dy = p.y - m.y
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      const dmg = randInt(Math.max(1, m.atk - 1), m.atk)
      p.hp -= dmg
      state.fx.push({ x: p.x, y: p.y, kind: 'hurt', text: `-${dmg}` })
      state.hurtTurn = state.turns + 1
      log(state, `${m.name}에게 ${dmg} 피해를 입었다.`)
      if (p.hp <= 0) {
        p.hp = 0
        state.over = true
        state.deathCause = m.name
        log(state, `${m.name}에게 쓰러졌다...`)
      }
      continue
    }
    // 플레이어가 보이는 몬스터만 쫓아온다
    if (!state.visible[m.y][m.x]) continue
    const tryMoves = Math.abs(dx) > Math.abs(dy)
      ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
      : [[0, Math.sign(dy)], [Math.sign(dx), 0]]
    for (const [mx, my] of tryMoves) {
      if (mx === 0 && my === 0) continue
      const nx = m.x + mx
      const ny = m.y + my
      if (state.tiles[ny][nx] === '#' || monsterAt(state, nx, ny)) continue
      if (nx === p.x && ny === p.y) continue
      m.x = nx
      m.y = ny
      break
    }
  }
}

function endTurn(state) {
  monstersAct(state)
  state.turns += 1
  return updateFov(state)
}

// 방향키 한 번 = 한 턴
export function move(prev, dx, dy) {
  if (prev.over) return prev
  const state = structuredClone(prev)
  state.fx = []
  const p = state.player
  const nx = p.x + dx
  const ny = p.y + dy

  const target = monsterAt(state, nx, ny)
  if (target) {
    const dmg = randInt(Math.max(1, p.atk - 1), p.atk + 1)
    target.hp -= dmg
    state.fx.push({ x: target.x, y: target.y, kind: 'hit', text: `${dmg}` })
    if (target.hp <= 0) {
      state.monsters = state.monsters.filter((m) => m.id !== target.id)
      state.kills += 1
      log(state, `${target.name}을(를) 처치했다!`)
    } else {
      log(state, `${target.name}에게 ${dmg} 피해를 주었다.`)
    }
    return endTurn(state)
  }

  if (state.tiles[ny][nx] === '#') return prev // 벽: 턴 소모 없음

  p.x = nx
  p.y = ny

  const item = state.items.find((it) => it.x === nx && it.y === ny)
  if (item) {
    state.items = state.items.filter((it) => it.id !== item.id)
    p.potions += 1
    log(state, '회복 포션을 주웠다. (Q로 마시기)')
  }

  if (state.tiles[ny][nx] === '>') {
    state.depth += 1
    p.maxHp += 2
    p.hp = Math.min(p.maxHp, p.hp + 4)
    if (state.depth % 2 === 1) p.atk += 1
    Object.assign(state, buildFloor(state.depth, p))
    log(state, `지하 ${state.depth}층으로 내려왔다. 조금 더 강해진 느낌이다.`)
    state.turns += 1
    return updateFov(state)
  }

  return endTurn(state)
}

export function wait(prev) {
  if (prev.over) return prev
  const state = structuredClone(prev)
  state.fx = []
  return endTurn(state)
}

export function drinkPotion(prev) {
  if (prev.over) return prev
  if (prev.player.potions <= 0) {
    const state = structuredClone(prev)
    log(state, '포션이 없다.')
    return state
  }
  const state = structuredClone(prev)
  state.fx = []
  const p = state.player
  const healed = Math.min(POTION_HEAL, p.maxHp - p.hp)
  p.hp += healed
  p.potions -= 1
  state.fx.push({ x: p.x, y: p.y, kind: 'heal', text: `+${healed}` })
  log(state, `포션을 마셨다. HP +${healed}`)
  return endTurn(state)
}

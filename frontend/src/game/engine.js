// 게임 규칙: 턴 진행, 전투, 몬스터 AI, 시야, 점수
import { W, H, generateDungeon, randInt, center } from './dungeon'

export const BASE_VIEW = 7
const POTION_HEAL = 8

// speed: 플레이어가 한 칸 움직일 때 따라올 확률 (1 = 매 턴)
const MONSTER_TYPES = [
  { name: '쥐', ch: 'r', hp: 3, atk: 1, speed: 1, xp: 3 },
  { name: '고블린', ch: 'g', hp: 6, atk: 2, speed: 0.75, xp: 6 },
  { name: '오크', ch: 'O', hp: 12, atk: 4, speed: 0.5, xp: 12 },
]

// ===== 레벨업 보상 카드 =====
// max: 이 값에 도달하면 더 이상 카드가 나오지 않음
export const CARDS = {
  hp: { icon: '❤️', name: '강인함', desc: '최대 HP +6', apply: (p) => { p.maxHp += 6; p.hp += 6 } },
  atk: { icon: '⚔️', name: '날카로운 칼날', desc: '공격력 +1', apply: (p) => { p.atk += 1 } },
  def: { icon: '🛡️', name: '단단한 피부', desc: '받는 피해 -1 (최소 1)', apply: (p) => { p.def += 1 }, maxed: (p) => p.def >= 3 },
  potion: { icon: '🧪', name: '연금술', desc: '포션 2개 획득', apply: (p) => { p.potions += 2 } },
  regen: { icon: '💚', name: '재생', desc: '5턴마다 HP +1 (중첩 가능)', apply: (p) => { p.regen += 1 }, maxed: (p) => p.regen >= 3 },
  lifesteal: { icon: '🩸', name: '흡혈', desc: '적을 처치하면 HP +2', apply: (p) => { p.lifesteal += 2 }, maxed: (p) => p.lifesteal >= 6 },
  crit: { icon: '💥', name: '치명타', desc: '20% 확률로 2배 피해', apply: (p) => { p.crit += 0.2 }, maxed: (p) => p.crit >= 0.59 },
  agility: { icon: '👟', name: '날쌘 발', desc: '도망칠 때 몬스터가 덜 따라옴', apply: (p) => { p.agility += 0.15 }, maxed: (p) => p.agility >= 0.44 },
  vision: { icon: '🔦', name: '넓은 시야', desc: '시야 +2칸', apply: (p) => { p.vision += 2 }, maxed: (p) => p.vision >= 4 },
}

export function xpToNext(level) {
  return 10 + 12 * (level - 1) + (level - 1) * (level - 2) // 10, 22, 36, 52 ...
}

function drawCards(p) {
  const pool = Object.keys(CARDS).filter((id) => !CARDS[id].maxed || !CARDS[id].maxed(p))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

function gainXp(state, amount) {
  const p = state.player
  p.xp += amount
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level)
    p.level += 1
    p.hp = Math.min(p.maxHp, p.hp + 3)
    state.pendingLevelUps += 1
    log(state, `레벨 업! Lv.${p.level} — 보상을 하나 고르자.`)
  }
  if (state.pendingLevelUps > 0 && !state.levelUp) state.levelUp = { cards: drawCards(p) }
}

// 레벨업 카드 선택 (index: 0~2)
export function chooseCard(prev, index) {
  if (!prev.levelUp || prev.over) return prev
  const id = prev.levelUp.cards[index]
  if (!id) return prev
  const state = structuredClone(prev)
  const p = state.player
  CARDS[id].apply(p)
  p.perks[id] = (p.perks[id] || 0) + 1
  log(state, `${CARDS[id].icon} ${CARDS[id].name}: ${CARDS[id].desc}`)
  state.pendingLevelUps -= 1
  state.levelUp = state.pendingLevelUps > 0 ? { cards: drawCards(p) } : null
  return updateFov(state)
}
const BOSS_EVERY = 5 // 몇 층마다 보스가 나오는지
const BOSS_SCORE = 500
const CHASE_MEMORY = 4 // 시야에서 놓친 뒤 몇 턴 더 쫓아오는지

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
      monsters.push({ id: nextId++, ...t, ...pos, hp, maxHp: hp, atk: t.atk + Math.floor((depth - 1) / 2), xp: t.xp + (depth - 1) })
    }
    if (Math.random() < 0.4) {
      const pos = randomFloorIn(room, taken)
      if (pos) items.push({ id: nextId++, kind: 'potion', ...pos })
    }
  })

  // 보스 층: 계단 바로 옆에서 계단을 지킨다
  if (depth % BOSS_EVERY === 0) {
    const spots = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dx, dy]) => ({ x: stairs.x + dx, y: stairs.y + dy }))
      .filter((pos) => tiles[pos.y][pos.x] !== '#')
    const pos = spots[0] || stairs
    const occupied = monsters.findIndex((m) => m.x === pos.x && m.y === pos.y)
    if (occupied >= 0) monsters.splice(occupied, 1)
    const hp = 34 + depth * 6
    monsters.push({
      id: nextId++, name: '오우거 군주', ch: 'B', boss: true, ...pos,
      hp, maxHp: hp, atk: 4 + Math.floor(depth / 2), speed: 0.6, xp: 40 + depth * 4,
      cooldown: 2, windup: false, summoned: false,
    })
  }

  const explored = Array.from({ length: H }, () => Array(W).fill(false))
  return { tiles, monsters, items, explored, player: { ...player, ...start } }
}

export function newGame() {
  const player = {
    x: 0, y: 0, hp: 20, maxHp: 20, atk: 3, potions: 1,
    level: 1, xp: 0, def: 0, regen: 0, lifesteal: 0, crit: 0, agility: 0, vision: 0, perks: {},
  }
  const state = {
    depth: 1,
    kills: 0,
    turns: 0,
    over: false,
    deathCause: null,
    fx: [],
    hurtTurn: -1,
    levelUp: null,
    bossKills: 0,
    pendingLevelUps: 0,
    messages: ['던전에 들어왔다. 계단(>)을 찾아 내려가자!'],
    ...buildFloor(1, player),
  }
  return updateFov(state)
}

export function score(state) {
  return state.depth * 100 + state.kills * 10 + (state.bossKills || 0) * BOSS_SCORE
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
  const VIEW_RADIUS = BASE_VIEW + (state.player.vision || 0)
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
    const adjacent = Math.abs(dx) + Math.abs(dy) === 1
    if (m.boss && m.windup) {
      // 준비한 내려치기 발동
      m.windup = false
      m.cooldown = 3
      if (adjacent) {
        const dmg = Math.max(2, m.atk * 2 - p.def)
        p.hp -= dmg
        state.fx.push({ x: p.x, y: p.y, kind: 'hurt', text: `-${dmg}` })
        state.hurtTurn = state.turns + 1
        log(state, `💥 ${m.name}의 내려치기! ${dmg} 피해!`)
        if (p.hp <= 0) {
          p.hp = 0
          state.over = true
          state.deathCause = m.name
          log(state, `${m.name}에게 쓰러졌다...`)
        }
      } else {
        log(state, `${m.name}의 내려치기가 빗나갔다!`)
      }
      continue
    }
    if (m.boss && adjacent && m.cooldown <= 0) {
      m.windup = true
      state.fx.push({ x: m.x, y: m.y, kind: 'warn', text: '!' })
      log(state, `⚠ ${m.name}가 내려치기를 준비한다! 피하자!`)
      continue
    }
    if (m.boss && m.cooldown > 0) m.cooldown -= 1
    if (adjacent) {
      const dmg = Math.max(1, randInt(Math.max(1, m.atk - 1), m.atk) - p.def)
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
    // 보이면 추적 시작, 놓치면 몇 턴 뒤 포기
    if (state.visible[m.y][m.x]) m.alert = CHASE_MEMORY
    else if (m.alert > 0) m.alert -= 1
    if (!m.alert) continue
    // 느린 몬스터는 가끔 따라오지 못한다
    if (Math.random() >= (m.speed ?? 1) * (1 - p.agility)) continue
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

// 보스가 HP 절반일 때 부하 2마리 소환
function summonMinions(state, boss) {
  const spots = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]
  let count = 0
  for (const [dx, dy] of spots) {
    if (count >= 2) break
    const x = boss.x + dx
    const y = boss.y + dy
    if (state.tiles[y][x] === '#' || monsterAt(state, x, y)) continue
    if (x === state.player.x && y === state.player.y) continue
    const t = MONSTER_TYPES[1]
    const hp = t.hp + state.depth - 1
    state.monsters.push({ id: nextId++, ...t, x, y, hp, maxHp: hp, atk: t.atk + Math.floor(state.depth / 3), xp: t.xp, alert: CHASE_MEMORY })
    count += 1
  }
  if (count > 0) log(state, `${boss.name}가 부하를 불렀다!`)
}

function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

function endTurn(prevState, fledFrom = []) {
  const state = updateFov(prevState) // 몬스터는 플레이어의 '현재' 위치 기준으로 판단
  const p = state.player
  monstersAct(state)
  if (!state.over) {
    for (const id of fledFrom) {
      const m = state.monsters.find((mm) => mm.id === id)
      if (m && !isAdjacent(m, state.player)) log(state, `${m.name}에게서 도망쳤다!`)
    }
  }
  state.turns += 1
  if (!state.over && p.regen > 0 && state.turns % 5 === 0 && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + p.regen)
  }
  return updateFov(state)
}

// 방향키 한 번 = 한 턴
export function move(prev, dx, dy) {
  if (prev.over || prev.levelUp) return prev
  const state = structuredClone(prev)
  state.fx = []
  const p = state.player
  const nx = p.x + dx
  const ny = p.y + dy

  const target = monsterAt(state, nx, ny)
  if (target) {
    const isCrit = Math.random() < p.crit
    const dmg = randInt(Math.max(1, p.atk - 1), p.atk + 1) * (isCrit ? 2 : 1)
    target.hp -= dmg
    state.fx.push({ x: target.x, y: target.y, kind: isCrit ? 'crit' : 'hit', text: `${dmg}` })
    if (isCrit) log(state, '💜 치명타!')
    if (target.boss && target.hp > 0 && !target.summoned && target.hp <= target.maxHp / 2) {
      target.summoned = true
      summonMinions(state, target)
    }
    if (target.hp <= 0) {
      state.monsters = state.monsters.filter((m) => m.id !== target.id)
      state.kills += 1
      log(state, `${target.name}을(를) 처치했다! (+${target.xp} XP)`)
      if (target.boss) {
        state.bossKills += 1
        p.hp = p.maxHp
        p.potions += 2
        state.fx.push({ x: p.x, y: p.y, kind: 'heal', text: 'FULL' })
        log(state, `👑 보스 처치! HP 전체 회복, 포션 +2, 점수 +${BOSS_SCORE}. 계단의 봉인이 풀렸다!`)
      }
      if (p.lifesteal > 0) {
        const healed = Math.min(p.lifesteal, p.maxHp - p.hp)
        if (healed > 0) {
          p.hp += healed
          state.fx.push({ x: p.x, y: p.y, kind: 'heal', text: `+${healed}` })
        }
      }
      gainXp(state, target.xp)
    } else {
      log(state, `${target.name}에게 ${dmg} 피해를 주었다.`)
    }
    return endTurn(state)
  }

  if (state.tiles[ny][nx] === '#') return prev // 벽: 턴 소모 없음

  const adjacentBefore = state.monsters.filter((m) => isAdjacent(m, p)).map((m) => m.id)
  p.x = nx
  p.y = ny

  const item = state.items.find((it) => it.x === nx && it.y === ny)
  if (item) {
    state.items = state.items.filter((it) => it.id !== item.id)
    p.potions += 1
    log(state, '회복 포션을 주웠다. (Q로 마시기)')
  }

  if (state.tiles[ny][nx] === '>' && state.monsters.some((m) => m.boss)) {
    log(state, '🔒 계단이 봉인되어 있다. 보스를 처치하자!')
  } else if (state.tiles[ny][nx] === '>') {
    state.depth += 1
    p.maxHp += 2
    p.hp = Math.min(p.maxHp, p.hp + 4)
    if (state.depth % 2 === 1) p.atk += 1
    Object.assign(state, buildFloor(state.depth, p))
    log(state, `지하 ${state.depth}층으로 내려왔다. 조금 더 강해진 느낌이다.`)
    if (state.depth % BOSS_EVERY === 0) log(state, '⚠ 강력한 보스의 기운이 느껴진다... 계단을 지키고 있다!')
    state.turns += 1
    return updateFov(state)
  }

  return endTurn(state, adjacentBefore)
}

export function wait(prev) {
  if (prev.over || prev.levelUp) return prev
  const state = structuredClone(prev)
  state.fx = []
  return endTurn(state)
}

export function drinkPotion(prev) {
  if (prev.over || prev.levelUp) return prev
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

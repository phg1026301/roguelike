// 게임 규칙: 턴 진행, 전투, 몬스터 AI, 시야, 점수, 레벨업, 장비, 코인, 상점
import { W, H, generateDungeon, randInt, center } from './dungeon'
import { rollItems, coinTotal, fromTotal, makeShopStock, RARITY, SLOTS } from './items'

export const BASE_VIEW = 7
const POTION_HEAL = 8
const BOSS_EVERY = 5 // 몇 층마다 보스가 나오는지
const BOSS_SCORE = 500
// 난이도: 몬스터와 보스의 체력, 공격력, 경험치 배율 (시작 화면에서 고른다)
export const DIFFICULTIES = {
  쉬움: { hp: 0.7, atk: 0.7, xp: 0.8, desc: '몬스터가 약하다. 처음이라면 여기서 시작하세요' },
  보통: { hp: 1, atk: 1, xp: 1, desc: '기본 난이도' },
  어려움: { hp: 1.3, atk: 1.3, xp: 1.2, desc: '몬스터가 강하다. 포션과 장비를 잘 챙기세요' },
  지옥: { hp: 1.7, atk: 1.6, xp: 1.5, desc: '살아남기 어렵다. 실력자용' },
}
export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES)
function diffOf(name) {
  return DIFFICULTIES[name] || DIFFICULTIES.보통
}
function scale(v, m) {
  return Math.max(1, Math.round(v * m))
}
const CHASE_MEMORY = 4 // 시야에서 놓친 뒤 몇 턴 더 쫓아오는지
const TRAP_CHANCE = 0.3 // 상자를 부술 때 함정 확률

// speed: 플레이어가 한 칸 움직일 때 따라올 확률 (1 = 매 턴)
const MONSTER_TYPES = [
  { name: '쥐', ch: 'r', hp: 3, atk: 1, speed: 1, xp: 3 },
  { name: '고블린', ch: 'g', hp: 6, atk: 2, speed: 0.75, xp: 6 },
  { name: '오크', ch: 'O', hp: 12, atk: 4, speed: 0.5, xp: 12 },
]

// 10층 이후에 나오는 몬스터 (그림은 sprites.js)
const SLIME = { name: '슬라임', ch: 's', sprite: 'slime', hp: 5, atk: 2, speed: 0.75, xp: 8 }
const SKELETON = { name: '해골 병사', ch: 'e', sprite: 'skeleton', hp: 9, atk: 3, speed: 1, xp: 12 }
const GOLEM = { name: '돌 골렘', ch: 'X', sprite: 'golem', hp: 18, atk: 5, speed: 0.4, xp: 20 }
const WRAITH = { name: '유령', ch: 'w', sprite: 'wraith', hp: 10, atk: 4, speed: 1, xp: 16 }

// 구간(10층 단위)별 몬스터: 1구간(10~19층), 2구간(20~29층), 3구간(30층 이후)
const TIER_MONSTERS = [
  [SLIME, SKELETON, MONSTER_TYPES[2]],
  [SKELETON, GOLEM, WRAITH],
  [GOLEM, WRAITH, MONSTER_TYPES[2]],
]

// 1~9층은 기존처럼 층이 깊어질수록 쥐 → 고블린 → 오크 순으로 나온다
function monsterPool(depth) {
  const tier = Math.floor((depth - 1) / 10)
  if (tier === 0) return MONSTER_TYPES.slice(0, Math.min(MONSTER_TYPES.length, Math.floor((depth + 1) / 2) + 1))
  return TIER_MONSTERS[Math.min(tier, TIER_MONSTERS.length) - 1]
}

// 10층 단위 보스 스테이지: 층이 깊어질수록 강한 보스
const BOSS_STAGE_NAMES = ['폭군 오우거', '심연의 군주', '잿빛 대마왕']
function bossStageStats(depth) {
  const tier = Math.floor(depth / 10) // 10층 → 1
  return {
    name: BOSS_STAGE_NAMES[Math.min(tier - 1, BOSS_STAGE_NAMES.length - 1)],
    hp: 50 + depth * 5,
    atk: 5 + Math.floor(depth / 4),
    xp: 60 + depth * 3,
  }
}

// ===== 직업 =====
// range 0 = 근접 전용, range > 0 = F키로 사거리 안 가장 가까운 적에게 자동 발사
export const CLASSES = {
  warrior: {
    name: '전사', icon: '⚔️', sprite: 'warrior', color: '#ff6b6b',
    hp: 28, atk: 4, def: 1, crit: 0, range: 0,
    attackDesc: '방향키로 적에게 부딪혀 근접 공격',
    traitName: '분노', traitDesc: 'HP가 절반 이하일 때 공격력 +2',
    summary: '튼튼한 몸과 방패로 버티는 근접 전투의 달인',
  },
  mage: {
    name: '마법사', icon: '🔮', sprite: 'player', color: '#b98aff',
    hp: 16, atk: 4, def: 0, crit: 0, range: 5,
    attackDesc: '마법탄 발사',
    traitName: '마나 폭발', traitDesc: '원거리 공격 5번째마다 맞은 적 주변에 폭발 피해',
    summary: '몸은 약하지만 멀리서 강력한 마법을 퍼붓는다',
  },
  archer: {
    name: '궁수', icon: '🏹', sprite: 'archer', color: '#7dd88f',
    hp: 20, atk: 3, def: 0, crit: 0.15, range: 6,
    attackDesc: '화살 발사',
    traitName: '선제 사격', traitDesc: '아직 다치지 않은 적을 맞히면 2배 피해 · 기본 치명타 15%',
    summary: '가장 먼 사거리와 날카로운 한 발로 적을 처리한다',
  },
}
export const CLASS_IDS = ['warrior', 'mage', 'archer']
const MELEE_PENALTY = 0.6 // 원거리 직업이 근접 공격하면 피해 60%

export function isShopFloor(depth) {
  return depth > 1 && depth % BOSS_EVERY === 1 // 보스를 잡은 다음 층: 6, 11, 16 ...
}

// ===== 레벨업 보상 카드 =====
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
  openLevelUpIfPending(state)
}

function openLevelUpIfPending(state) {
  if (state.pendingLevelUps > 0 && !state.levelUp) state.levelUp = { cards: drawCards(state.player) }
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

// ===== 장비 =====
function applyItem(p, item, sign) {
  p.atk += sign * (item.atk || 0)
  p.def += sign * (item.def || 0)
  p.maxHp += sign * (item.maxHp || 0)
  p.crit += sign * (item.crit || 0)
  p.agility += sign * (item.agility || 0)
}

function equip(state, item) {
  const p = state.player
  const old = p.equip[item.slot]
  if (old) applyItem(p, old, -1)
  applyItem(p, item, 1)
  if (item.maxHp) p.hp += item.maxHp
  p.hp = Math.max(1, Math.min(p.hp, p.maxHp))
  p.equip[item.slot] = item
  const tag = item.rarity === 'hidden' ? '✨ 히든 장비! ' : ''
  log(state, `${tag}[${RARITY[item.rarity].name}] ${item.name}(${SLOTS[item.slot]}) 장착${old ? ` — [${RARITY[old.rarity].name}] ${old.name} 교체` : ''}`)
}

function hasSpecial(p, special) {
  return Object.values(p.equip).some((it) => it && it.special === special)
}

// ===== 코인 =====
function dropCoins(state, m) {
  const p = state.player
  let coin
  if (m.boss) coin = { gold: randInt(5, 8) }
  else if (m.ch === 'O') coin = { gold: 1, silver: randInt(0, 4) }
  else if (m.ch === 'g') coin = { silver: randInt(1, 2) }
  else coin = { bronze: randInt(1, 3) + Math.floor(state.depth / 2) }
  const mult = hasSpecial(p, 'luck') ? 2 : 1
  const labels = []
  for (const [type, label] of [['gold', '금화'], ['silver', '은화'], ['bronze', '동화']]) {
    const n = (coin[type] || 0) * mult
    if (!n) continue
    p.coins[type] += n
    labels.push(`+${n} ${label}`)
  }
  if (labels.length) state.fx.push({ x: m.x, y: m.y, kind: 'coin', text: labels[0], coin: Object.keys(coin)[0] })
}

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

function inRoom(pos, r) {
  return pos.x >= r.x && pos.x < r.x + r.w && pos.y >= r.y && pos.y < r.y + r.h
}

function buildFloor(depth, player, difficulty = '보통') {
  const diff = diffOf(difficulty)
  if (depth % 10 === 0) return buildBossArena(depth, player, diff)
  const { tiles, rooms } = generateDungeon()
  const start = center(rooms[0])
  const stairs = center(rooms[rooms.length - 1])
  tiles[stairs.y][stairs.x] = '>'

  const taken = new Set([`${start.x},${start.y}`, `${stairs.x},${stairs.y}`])
  let monsters = []
  const items = []
  const pool = monsterPool(depth)

  rooms.slice(1).forEach((room) => {
    const count = randInt(0, 1 + Math.floor(depth / 2))
    for (let i = 0; i < count; i++) {
      const pos = randomFloorIn(room, taken)
      if (!pos) continue
      const t = pool[randInt(0, pool.length - 1)]
      const hp = scale(t.hp + (depth - 1), diff.hp)
      monsters.push({ id: nextId++, ...t, ...pos, hp, maxHp: hp, atk: scale(t.atk + Math.floor((depth - 1) / 2), diff.atk), xp: scale(t.xp + (depth - 1), diff.xp) })
    }
    if (Math.random() < 0.4) {
      const pos = randomFloorIn(room, taken)
      if (pos) items.push({ id: nextId++, kind: 'potion', ...pos })
    }
  })

  // 보물상자: 시작/계단 방을 뺀 방에 가끔, 층당 최대 2개
  let chests = 0
  for (const room of rooms.slice(1, -1)) {
    if (chests >= 2 || Math.random() >= 0.25) continue
    const pos = randomFloorIn(room, taken)
    if (pos) {
      items.push({ id: nextId++, kind: 'chest', ...pos })
      chests += 1
    }
  }

  // 상점 층: 상인이 있는 방은 몬스터가 없는 안전지대
  let npc = null
  if (isShopFloor(depth) && rooms.length > 2) {
    const room = rooms[1]
    const pos = center(room)
    monsters = monsters.filter((m) => !inRoom(m, room))
    const blocked = items.findIndex((it) => it.x === pos.x && it.y === pos.y)
    if (blocked >= 0) items.splice(blocked, 1)
    npc = { ...pos, stock: makeShopStock() }
  }

  // 보스 층 (5층마다): 계단 앞 보스방의 일반 몬스터를 치우고 중간 보스를 세운다
  if (depth % BOSS_EVERY === 0) {
    const bossRoom = rooms[rooms.length - 1]
    const spots = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dx, dy]) => ({ x: stairs.x + dx, y: stairs.y + dy }))
      .filter((pos) => tiles[pos.y][pos.x] !== '#')
    const pos = spots[0] || stairs
    monsters = monsters.filter((m) => !inRoom(m, bossRoom))
    monsters.push(makeBoss(pos, { name: '오우거 군주', hp: 34 + depth * 6, atk: 4 + Math.floor(depth / 2), xp: 40 + depth * 4 }, diff))
  }

  const explored = Array.from({ length: H }, () => Array(W).fill(false))
  return { tiles, monsters, items, npc, explored, player: { ...player, ...start } }
}

function makeBoss(pos, stats, diff) {
  const hp = scale(stats.hp, diff.hp)
  return {
    id: nextId++, ch: 'B', boss: true, ...pos, name: stats.name,
    hp, maxHp: hp, atk: scale(stats.atk, diff.atk), speed: 0.6, xp: scale(stats.xp, diff.xp),
    cooldown: 2, windup: false, summoned: false,
  }
}

// 보스 스테이지: 미로 없이 보스방 하나만 있다. 보스를 쓰러뜨려야 계단이 열린다
function buildBossArena(depth, player, diff) {
  const tiles = Array.from({ length: H }, () => Array(W).fill('#'))
  const room = { x: 3, y: 4, w: 34, h: 14 }
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) tiles[y][x] = '.'
  }
  const start = { x: room.x + 2, y: room.y + Math.floor(room.h / 2) }
  const stairs = { x: room.x + room.w - 2, y: room.y + Math.floor(room.h / 2) }
  tiles[stairs.y][stairs.x] = '>'
  const bossPos = { x: stairs.x - 1, y: stairs.y }
  const items = [{ id: nextId++, kind: 'potion', x: start.x + 4, y: start.y - 2 }]
  const monsters = [makeBoss(bossPos, bossStageStats(depth), diff)]
  const explored = Array.from({ length: H }, () => Array(W).fill(false))
  return { tiles, monsters, items, npc: null, explored, player: { ...player, ...start } }
}

export function newGame(cls = 'mage', { picking = false, difficulty = '보통' } = {}) {
  const c = CLASSES[cls] || CLASSES.mage
  const player = {
    x: 0, y: 0, hp: c.hp, maxHp: c.hp, atk: c.atk, potions: 1,
    cls, range: c.range, shots: 0,
    level: 1, xp: 0, def: c.def, regen: 0, lifesteal: 0, crit: c.crit, agility: 0, vision: 0, perks: {},
    equip: { weapon: null, armor: null, trinket: null },
    coins: { gold: 0, silver: 0, bronze: 0 },
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
    pendingLevelUps: 0,
    bossKills: 0,
    chest: null, // { stage: 'choose' | 'loot', itemId, loot }
    shopOpen: false,
    picking,
    difficulty: DIFFICULTIES[difficulty] ? difficulty : '보통',
    messages: [
      `${c.icon} ${c.name}(으)로 던전에 들어왔다. 계단(>)을 찾아 내려가자!`,
      ...(c.range ? [`F키: 사거리 ${c.range}칸 안의 가장 가까운 적에게 ${c.attackDesc}`] : []),
    ],
    ...buildFloor(1, player, difficulty),
  }
  return updateFov(state)
}

export function score(state) {
  return state.depth * 100 + state.kills * 10 + (state.bossKills || 0) * BOSS_SCORE
}

// 선택 창이 떠 있으면 턴이 진행되지 않는다
function blocked(state) {
  return state.over || state.levelUp || state.chest || state.shopOpen || state.picking
}

// 원거리 직업: 사거리 안에서 보이는 가장 가까운 적
export function aimTarget(state) {
  const p = state.player
  if (!p.range) return null
  let best = null
  let bestD = Infinity
  for (const m of state.monsters) {
    if (m.dead || !state.visible[m.y][m.x]) continue
    const d = Math.hypot(m.x - p.x, m.y - p.y)
    if (d <= p.range + 0.01 && d < bestD) {
      best = m
      bestD = d
    }
  }
  return best
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
  const radius = BASE_VIEW + (state.player.vision || 0)
  const visible = Array.from({ length: H }, () => Array(W).fill(false))
  const explored = state.explored.map((row) => [...row])
  for (let y = Math.max(0, py - radius); y <= Math.min(H - 1, py + radius); y++) {
    for (let x = Math.max(0, px - radius); x <= Math.min(W - 1, px + radius); x++) {
      if ((x - px) ** 2 + (y - py) ** 2 > radius ** 2) continue
      if (lineOfSight(state.tiles, px, py, x, y)) {
        visible[y][x] = true
        explored[y][x] = true
      }
    }
  }
  return { ...state, visible, explored }
}

function monsterAt(state, x, y) {
  return state.monsters.find((m) => m.x === x && m.y === y && !m.dead)
}

function npcAt(state, x, y) {
  return state.npc && state.npc.x === x && state.npc.y === y
}

function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

function hurtPlayer(state, m, dmg, text) {
  const p = state.player
  p.hp -= dmg
  state.fx.push({ x: p.x, y: p.y, kind: 'hurt', text: `-${dmg}` })
  state.hurtTurn = state.turns + 1
  log(state, text)
  if (p.hp <= 0) {
    p.hp = 0
    state.over = true
    state.deathCause = m.name
    log(state, `${m.name}에게 쓰러졌다...`)
    return
  }
  // 가시 갑옷: 반사 피해
  if (hasSpecial(p, 'thorns') && !m.dead) {
    m.hp -= 2
    state.fx.push({ x: m.x, y: m.y, kind: 'hit', text: '2' })
    if (m.hp <= 0) killMonster(state, m)
  }
}

// 몬스터 처치: 경험치, 코인, 보스 보상, 흡혈
function killMonster(state, m) {
  const p = state.player
  m.dead = true
  state.monsters = state.monsters.filter((mm) => mm.id !== m.id)
  state.kills += 1
  log(state, `${m.name}을(를) 처치했다! (+${m.xp} XP)`)
  dropCoins(state, m)
  if (m.boss) {
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
  gainXp(state, m.xp)
}

function monstersAct(state) {
  const p = state.player
  for (const m of [...state.monsters]) {
    if (state.over) break
    if (m.dead) continue
    const dx = p.x - m.x
    const dy = p.y - m.y
    const adjacent = Math.abs(dx) + Math.abs(dy) === 1
    if (m.boss && m.windup) {
      // 준비한 내려치기 발동
      m.windup = false
      m.cooldown = 3
      if (adjacent) {
        const dmg = Math.max(2, m.atk * 2 - p.def)
        hurtPlayer(state, m, dmg, `💥 ${m.name}의 내려치기! ${dmg} 피해!`)
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
      hurtPlayer(state, m, dmg, `${m.name}에게 ${dmg} 피해를 입었다.`)
      continue
    }
    // 보이면 추적 시작, 놓치면 몇 턴 뒤 포기
    if (state.visible[m.y][m.x]) m.alert = CHASE_MEMORY
    else if (m.alert > 0) m.alert -= 1
    if (!m.alert) continue
    // 느린 몬스터는 가끔 따라오지 못한다
    if (Math.random() >= (m.speed ?? 1) * (1 - Math.min(0.8, p.agility))) continue
    const tryMoves = Math.abs(dx) > Math.abs(dy)
      ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
      : [[0, Math.sign(dy)], [Math.sign(dx), 0]]
    for (const [mx, my] of tryMoves) {
      if (mx === 0 && my === 0) continue
      const nx = m.x + mx
      const ny = m.y + my
      if (state.tiles[ny][nx] === '#' || monsterAt(state, nx, ny) || npcAt(state, nx, ny)) continue
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
    if (state.tiles[y][x] === '#' || monsterAt(state, x, y) || npcAt(state, x, y)) continue
    if (x === state.player.x && y === state.player.y) continue
    const t = MONSTER_TYPES[1]
    const diff = diffOf(state.difficulty)
    const hp = scale(t.hp + state.depth - 1, diff.hp)
    state.monsters.push({ id: nextId++, ...t, x, y, hp, maxHp: hp, atk: scale(t.atk + Math.floor(state.depth / 3), diff.atk), xp: t.xp, alert: CHASE_MEMORY })
    count += 1
  }
  if (count > 0) log(state, `${boss.name}가 부하를 불렀다!`)
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

function attack(state, target, ranged = false) {
  const p = state.player
  let atk = p.atk
  if (p.cls === 'warrior' && p.hp <= p.maxHp / 2) atk += 2 // 분노
  let dmg = randInt(Math.max(1, atk - 1), atk + 1)
  if (p.range && !ranged) dmg = Math.max(1, Math.round(dmg * MELEE_PENALTY))
  if (p.cls === 'archer' && ranged && target.hp === target.maxHp) {
    dmg *= 2
    log(state, '🎯 선제 사격! 2배 피해')
  }
  const isCrit = Math.random() < p.crit
  if (isCrit) dmg *= 2
  target.hp -= dmg
  state.fx.push({ x: target.x, y: target.y, kind: isCrit ? 'crit' : 'hit', text: `${dmg}` })
  if (isCrit) log(state, '💜 치명타!')
  // 마법사 마나 폭발: 원거리 공격 5번째마다
  if (p.cls === 'mage' && ranged) {
    p.shots += 1
    if (p.shots % 5 === 0) {
      const blast = Math.ceil(p.atk / 2) + 1
      const around = state.monsters.filter((m) => m !== target && !m.dead && Math.abs(m.x - target.x) <= 1 && Math.abs(m.y - target.y) <= 1)
      state.fx.push({ x: target.x, y: target.y, kind: 'blast', text: '' })
      log(state, `💥 마나 폭발!${around.length ? ` 주변 적 ${around.length}마리에게 ${blast} 피해` : ''}`)
      for (const m of around) {
        m.hp -= blast
        state.fx.push({ x: m.x, y: m.y, kind: 'blast', text: `${blast}` })
        if (m.hp <= 0) killMonster(state, m)
      }
    }
  }
  if (hasSpecial(p, 'vamp') && p.hp < p.maxHp) p.hp += 1
  if (target.boss && target.hp > 0 && !target.summoned && target.hp <= target.maxHp / 2) {
    target.summoned = true
    summonMinions(state, target)
  }
  // 불꽃검: 대상 주변 적에게 화염 피해
  if (hasSpecial(p, 'fire') && Math.random() < 0.25) {
    const burn = Math.ceil(p.atk / 2) + 1
    const around = state.monsters.filter((m) => m !== target && !m.dead && Math.abs(m.x - target.x) <= 1 && Math.abs(m.y - target.y) <= 1)
    state.fx.push({ x: target.x, y: target.y, kind: 'fire', text: '' })
    log(state, `🔥 불꽃이 터졌다!${around.length ? ` 주변 적 ${around.length}마리에게 ${burn} 피해` : ''}`)
    for (const m of around) {
      m.hp -= burn
      state.fx.push({ x: m.x, y: m.y, kind: 'fire', text: `${burn}` })
      if (m.hp <= 0) killMonster(state, m)
    }
  }
  if (target.hp <= 0) killMonster(state, target)
  else log(state, `${target.name}에게 ${dmg} 피해를 주었다.`)
}

// 방향키 한 번 = 한 턴
export function move(prev, dx, dy) {
  if (blocked(prev)) return prev
  const p0 = prev.player
  const nx = p0.x + dx
  const ny = p0.y + dy

  // 상인에게 부딪히면 상점 열기 (턴 소모 없음)
  if (npcAt(prev, nx, ny)) {
    const state = structuredClone(prev)
    state.fx = []
    state.shopOpen = true
    return state
  }

  const state = structuredClone(prev)
  state.fx = []
  const p = state.player

  const target = monsterAt(state, nx, ny)
  if (target) {
    attack(state, target)
    return endTurn(state)
  }

  if (state.tiles[ny][nx] === '#') return prev // 벽: 턴 소모 없음

  const adjacentBefore = state.monsters.filter((m) => isAdjacent(m, p)).map((m) => m.id)
  p.x = nx
  p.y = ny

  const item = state.items.find((it) => it.x === nx && it.y === ny)
  if (item && item.kind === 'potion') {
    state.items = state.items.filter((it) => it.id !== item.id)
    p.potions += 1
    log(state, '회복 포션을 주웠다. (Q로 마시기)')
  } else if (item && item.kind === 'chest') {
    state.chest = { stage: 'choose', itemId: item.id, loot: [] }
    log(state, '📦 보물상자를 발견했다!')
    return updateFov(state)
  }

  if (state.tiles[ny][nx] === '>' && state.monsters.some((m) => m.boss)) {
    log(state, '🔒 계단이 봉인되어 있다. 보스를 처치하자!')
  } else if (state.tiles[ny][nx] === '>') {
    state.depth += 1
    p.maxHp += 2
    p.hp = Math.min(p.maxHp, p.hp + 4)
    if (state.depth % 2 === 1) p.atk += 1
    Object.assign(state, buildFloor(state.depth, p, state.difficulty))
    log(state, `지하 ${state.depth}층으로 내려왔다. 조금 더 강해진 느낌이다.`)
    if (state.depth % BOSS_EVERY === 0) log(state, '⚠ 강력한 보스의 기운이 느껴진다... 계단을 지키고 있다!')
    if (state.npc) log(state, '🛒 어딘가에서 상인의 목소리가 들린다. 상인에게 다가가면 거래할 수 있다.')
    state.turns += 1
    return updateFov(state)
  }

  return endTurn(state, adjacentBefore)
}

// F키: 원거리 공격
export function fire(prev) {
  if (blocked(prev)) return prev
  if (!prev.player.range) {
    const state = structuredClone(prev)
    log(state, '전사는 방향키로 적에게 부딪혀 공격한다.')
    return state
  }
  const state = structuredClone(prev)
  state.fx = []
  const target = aimTarget(state)
  if (!target) {
    log(state, `사거리 안에 적이 없다. (사거리 ${state.player.range}칸)`)
    return state
  }
  state.fx.push({ kind: 'shot', x: target.x, y: target.y, from: { x: state.player.x, y: state.player.y }, cls: state.player.cls })
  attack(state, target, true)
  return endTurn(state)
}

export function wait(prev) {
  if (blocked(prev)) return prev
  const state = structuredClone(prev)
  state.fx = []
  return endTurn(state)
}

export function drinkPotion(prev) {
  if (blocked(prev)) return prev
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

// ===== 보물상자 =====
// stage 'choose': 0 조심스럽게 연다 / 1 힘으로 부순다 / 2 그냥 둔다
// stage 'loot':   0~2 장비 선택 / 3 아무것도 가져가지 않음
export function chestChoose(prev, index) {
  if (!prev.chest || prev.over || prev.levelUp) return prev
  const state = structuredClone(prev)
  state.fx = []
  const p = state.player
  const chest = state.chest

  if (chest.stage === 'choose') {
    if (index === 2) {
      state.chest = null
      log(state, '상자를 그냥 두었다.')
      return state
    }
    if (index !== 0 && index !== 1) return prev
    state.items = state.items.filter((it) => it.id !== chest.itemId)
    if (index === 1 && Math.random() < TRAP_CHANCE) {
      const dmg = 2 + state.depth
      p.hp -= dmg
      state.fx.push({ x: p.x, y: p.y, kind: 'hurt', text: `-${dmg}` })
      state.hurtTurn = state.turns
      log(state, `💣 함정이었다! ${dmg} 피해!`)
      if (p.hp <= 0) {
        p.hp = 0
        state.over = true
        state.deathCause = '상자 함정'
        state.chest = null
        return state
      }
    }
    chest.loot = rollItems(3, index === 1 ? 'smash' : 'careful')
    chest.stage = 'loot'
    log(state, index === 1 ? '상자를 힘으로 부쉈다!' : '상자를 조심스럽게 열었다.')
    return state
  }

  if (chest.stage === 'loot') {
    if (index === 3) {
      p.coins.bronze += 5
      log(state, '장비 대신 동화 5개를 챙겼다.')
    } else {
      const item = chest.loot[index]
      if (!item) return prev
      equip(state, item)
    }
    state.chest = null
    return state
  }
  return prev
}

// ===== 상점 =====
export function shopBuy(prev, index) {
  if (!prev.shopOpen || !prev.npc || prev.over) return prev
  const entry = prev.npc.stock[index]
  if (!entry) return prev
  const state = structuredClone(prev)
  const p = state.player
  const stock = state.npc.stock[index]
  if (stock.sold) {
    log(state, '이미 판매된 물건이다.')
    return state
  }
  const total = coinTotal(p.coins)
  if (total < stock.price) {
    log(state, `코인이 부족하다. (${stock.name})`)
    return state
  }
  p.coins = fromTotal(total - stock.price)
  stock.sold = true
  if (stock.kind === 'potion') {
    p.potions += 1
    log(state, '🧪 회복 포션을 샀다.')
  } else if (stock.kind === 'maxhp') {
    p.maxHp += 5
    p.hp += 5
    log(state, '❤️ 생명의 정수를 마셨다. 최대 HP +5')
  } else if (stock.kind === 'card') {
    state.pendingLevelUps += 1
    openLevelUpIfPending(state)
    log(state, '🃏 수련서를 읽었다. 보상을 하나 고르자.')
  } else if (stock.kind === 'item') {
    equip(state, stock.item)
  }
  return state
}

export function shopClose(prev) {
  if (!prev.shopOpen) return prev
  return { ...prev, shopOpen: false }
}

// 난이도 고르기 (시작 화면에서만 바꿀 수 있다)
export function setDifficulty(prev, name) {
  if (!prev.picking || !DIFFICULTIES[name]) return prev
  return { ...prev, difficulty: name }
}

// 레인 디펜스 엔진 (화면과 무관한 순수 함수)
// 3개의 레인(0·1: 지상, 2: 하늘) × 10칸. 0번 칸은 기지이고,
// 우리 유닛은 1~4번 칸에 세우며, 적은 9번 칸에서 기지 쪽(왼쪽)으로 걸어온다.

export const TICK_MS = 500
export const COLS = 10
export const LANES = 3
export const AIR_LANE = 2
export const PLACE_COLS = [1, 2, 3, 4]
const BASE_MAX = 10
const START_MANA = 4
const MAX_MANA_CAP = 14
const LIGHTNING_COST = 4
const LIGHTNING_DMG = 4

export const UNITS = {
  shield: { name: '방패병', cost: 2, hp: 12, atk: 2, range: 1, interval: 2, unlock: 1, desc: '방패로 막고 검으로 벤다' },
  archer: { name: '숲 궁수', cost: 3, hp: 6, atk: 2, range: 4, interval: 2, unlock: 2, antiAir: true, desc: '멀리서 쏜다. 하늘 적도 맞힌다' },
  spear: { name: '창병', cost: 3, hp: 8, atk: 2, range: 2, interval: 2, unlock: 2, desc: '두 칸 앞까지 찌른다' },
  mage: { name: '마도사', cost: 4, hp: 5, atk: 3, range: 3, interval: 3, unlock: 3, antiAir: true, desc: '별빛 마법. 하늘 적도 맞힌다' },
  healer: { name: '치유사', cost: 3, hp: 6, atk: 0, heal: 2, range: 4, interval: 3, unlock: 3, desc: '같은 길의 가장 다친 아군을 회복한다' },
  golem: { name: '골렘', cost: 5, hp: 30, atk: 1, range: 1, interval: 3, unlock: 4, desc: '아주 단단해서 적을 오래 막는다' },
}
export const UNIT_ORDER = ['shield', 'archer', 'spear', 'mage', 'healer', 'golem']

export const ENEMIES = {
  rat: { name: '쥐', sprite: 'rat', hp: 4, atk: 1, speed: 2 },
  thief: { name: '도적', sprite: 'thief', hp: 3, atk: 1, speed: 1 },
  bomber: { name: '폭탄 고블린', sprite: 'bomber', hp: 6, atk: 2, speed: 3, kamikaze: true },
  wraith: { name: '유령', sprite: 'wraith', hp: 6, atk: 2, speed: 2, air: true },
  captain: { name: '오크 대장', sprite: 'captain', hp: 20, atk: 3, speed: 4 },
  ogre: { name: '오우거 보스', sprite: 'ogre', hp: 60, atk: 4, speed: 5, boss: true },
}

export function unlockedUnits(stage) {
  return UNIT_ORDER.filter((k) => UNITS[k].unlock <= stage)
}

function pickType(stage) {
  const r = Math.random()
  if (stage <= 1) return 'rat'
  if (stage === 2) return r < 0.5 ? 'rat' : r < 0.8 ? 'thief' : 'wraith'
  if (stage === 3) return r < 0.3 ? 'thief' : r < 0.6 ? 'bomber' : r < 0.8 ? 'wraith' : 'captain'
  return r < 0.25 ? 'captain' : r < 0.45 ? 'bomber' : r < 0.65 ? 'thief' : r < 0.85 ? 'wraith' : 'rat'
}

// 한 스테이지의 등장 목록. 3의 배수 스테이지 끝에는 보스가 나온다
function makeWave(stage) {
  const count = 6 + stage * 2
  const queue = []
  let t = 4
  for (let i = 0; i < count; i++) {
    const type = pickType(stage)
    const lane = ENEMIES[type].air ? AIR_LANE : Math.floor(Math.random() * 2)
    queue.push({ tick: t, type, lane })
    t += 2 + Math.floor(Math.random() * 3)
  }
  if (stage % 3 === 0) queue.push({ tick: t + 4, type: 'ogre', lane: Math.floor(Math.random() * 2) })
  return queue
}

function pushLog(s, msg) {
  s.log = [...s.log, msg].slice(-6)
}

// 소리는 상태에 신호로 남기고, 화면이 한 번만 재생한다
function sound(s, name) {
  s.snd = name
  s.sndSeq = (s.sndSeq || 0) + 1
}

export function newLaneRun() {
  const stage = 1
  return {
    phase: 'playing', // playing | between | over
    stage,
    tick: 0,
    mana: START_MANA,
    maxMana: 10,
    base: { hp: BASE_MAX, maxHp: BASE_MAX, flash: -1 },
    units: [],
    enemies: [],
    queue: makeWave(stage),
    selected: 'shield',
    cursor: { lane: 1, col: 1 },
    kills: 0,
    best: 0,
    log: ['스테이지 1 시작! 쥐가 몰려온다. 1~4로 유닛을 고르고 Enter로 세워라.'],
    snd: null,
    sndSeq: 0,
    nextId: 1,
  }
}

// 다음 스테이지: 기지 회복, 최대 마나 증가, 새 유닛 해금
export function nextStage(prev) {
  if (prev.phase !== 'between') return prev
  const s = structuredClone(prev)
  s.stage += 1
  s.phase = 'playing'
  s.tick = 0
  s.enemies = []
  s.queue = makeWave(s.stage)
  s.base.hp = Math.min(s.base.maxHp, s.base.hp + 3)
  s.maxMana = Math.min(MAX_MANA_CAP, s.maxMana + 1)
  s.mana = Math.min(s.maxMana, s.mana + 2)
  const before = unlockedUnits(s.stage - 1)
  const now = unlockedUnits(s.stage)
  const fresh = now.filter((k) => !before.includes(k))
  pushLog(s, `스테이지 ${s.stage} 시작!${fresh.length ? ` 새 유닛 해금: ${fresh.map((k) => UNITS[k].name).join(', ')}` : ''}`)
  if (!now.includes(s.selected)) s.selected = now[now.length - 1]
  sound(s, 'start')
  return s
}

export function selectUnit(prev, index) {
  const key = UNIT_ORDER[index]
  if (!key) return prev
  const s = structuredClone(prev)
  if (!unlockedUnits(prev.stage).includes(key)) {
    pushLog(s, `${UNITS[key].name}은(는) 아직 해금되지 않았다.`)
    return s
  }
  s.selected = key
  return s
}

export function moveCursor(prev, dLane, dCol) {
  const lane = Math.max(0, Math.min(LANES - 1, prev.cursor.lane + dLane))
  const idx = PLACE_COLS.indexOf(prev.cursor.col)
  const nIdx = Math.max(0, Math.min(PLACE_COLS.length - 1, (idx < 0 ? 0 : idx) + dCol))
  if (lane === prev.cursor.lane && PLACE_COLS[nIdx] === prev.cursor.col) return prev
  return { ...prev, cursor: { lane, col: PLACE_COLS[nIdx] } }
}

// 선택한 유닛을 (lane, col)에 세운다
export function placeAt(prev, lane, col) {
  if (prev.phase !== 'playing') return prev
  const key = prev.selected
  const u = UNITS[key]
  const s = structuredClone(prev)
  s.cursor = { lane, col }
  if (!PLACE_COLS.includes(col)) return s
  if (lane === AIR_LANE && !u.antiAir) {
    pushLog(s, '하늘 레인에는 하늘 적을 맞힐 수 있는 유닛만 세울 수 있다.')
    return s
  }
  if (s.units.some((x) => x.lane === lane && x.x === col)) {
    pushLog(s, '그 칸에는 이미 유닛이 있다.')
    return s
  }
  if (s.mana < u.cost) {
    pushLog(s, `마나가 부족하다 (${u.cost} 필요).`)
    return s
  }
  s.mana -= u.cost
  s.units.push({ id: s.nextId++, key, lane, x: col, hp: u.hp, maxHp: u.hp, atk: u.atk, heal: u.heal || 0, range: u.range, interval: u.interval, antiAir: !!u.antiAir, cd: 0, flash: -1 })
  sound(s, 'shop')
  return s
}

export function castLightning(prev, lane) {
  if (prev.phase !== 'playing') return prev
  const s = structuredClone(prev)
  if (s.mana < LIGHTNING_COST) {
    pushLog(s, `번개는 마나 ${LIGHTNING_COST}이 필요하다.`)
    return s
  }
  s.mana -= LIGHTNING_COST
  const hit = s.enemies.filter((e) => e.lane === lane)
  for (const e of hit) {
    e.hp -= LIGHTNING_DMG
    e.flash = s.tick
  }
  pushLog(s, `⚡ ${lane + 1}번 레인에 번개! ${hit.length}마리 피해`)
  s.cursor = { ...s.cursor, lane }
  sound(s, 'magic')
  // 번개로 쓰러진 적 처리
  for (const e of hit) if (e.hp <= 0) killEnemy(s, e)
  s.enemies = s.enemies.filter((e) => !e.dead)
  return s
}

function killEnemy(s, e) {
  if (e.dead) return
  e.dead = true
  s.kills += 1
  s.mana = Math.min(s.maxMana, s.mana + 1)
}

// 0.5초마다 한 번 호출된다
export function tick(prev) {
  if (prev.phase !== 'playing') return prev
  const s = structuredClone(prev)
  s.tick += 1
  s.mana = Math.min(s.maxMana, s.mana + 0.5)
  let event = null

  // 1) 적 등장 (입구가 막혀 있으면 한 틱 기다린다)
  while (s.queue.length && s.queue[0].tick <= s.tick) {
    const sp = s.queue[0]
    if (s.enemies.some((e) => e.lane === sp.lane && e.x >= COLS - 1)) {
      sp.tick += 1
      break
    }
    s.queue.shift()
    const t = ENEMIES[sp.type]
    const hp = t.boss ? 60 + s.stage * 10 : t.hp + Math.floor((s.stage - 1) / 2)
    s.enemies.push({ id: s.nextId++, type: sp.type, name: t.name, lane: sp.lane, x: COLS - 1, hp, maxHp: hp, atk: t.atk, speed: t.speed, air: !!t.air, boss: !!t.boss, kamikaze: !!t.kamikaze, mv: 0, cd: 0, flash: -1, dead: false })
  }

  // 2) 우리 유닛 공격 (가장 가까운 적)
  for (const u of s.units) {
    if (u.dead) continue
    if (u.cd > 0) {
      u.cd -= 1
      continue
    }
    if (u.heal > 0) {
      // 치유사: 같은 길에서 사거리 안의 가장 다친 아군을 회복
      let ally = null
      for (const a of s.units) {
        if (a.dead || a === u || a.lane !== u.lane || Math.abs(a.x - u.x) > u.range || a.hp >= a.maxHp) continue
        if (!ally || a.hp / a.maxHp < ally.hp / ally.maxHp) ally = a
      }
      if (ally) {
        ally.hp = Math.min(ally.maxHp, ally.hp + u.heal)
        ally.flash = s.tick
        u.cd = u.interval
      }
      continue
    }
    let target = null
    for (const e of s.enemies) {
      if (e.dead || e.lane !== u.lane || e.x <= u.x || e.x - u.x > u.range) continue
      if (e.air && !u.antiAir) continue
      if (!target || e.x < target.x) target = e
    }
    if (!target) continue
    target.hp -= u.atk
    target.flash = s.tick
    u.cd = u.interval
    if (target.hp <= 0) killEnemy(s, target)
  }

  // 3) 적 행동: 앞에 유닛이 있으면 공격, 없으면 한 칸 전진, 기지에 닿으면 기지 공격
  for (const e of s.enemies) {
    if (e.dead) continue
    if (e.cd > 0) e.cd -= 1
    const blocker = e.air ? null : s.units.find((u) => !u.dead && u.lane === e.lane && u.x === e.x - 1)
    if (blocker) {
      if (e.kamikaze) {
        // 폭탄 고블린: 막아선 유닛에 폭발하고 사라진다
        blocker.hp -= e.atk * 2
        blocker.flash = s.tick
        e.dead = true
        pushLog(s, '💣 폭탄 고블린이 터졌다!')
        if (blocker.hp <= 0) {
          blocker.dead = true
          pushLog(s, `${UNITS[blocker.key].name} 쓰러졌다.`)
        }
        event = event || 'hurt'
        continue
      }
      if (e.cd === 0) {
        blocker.hp -= e.atk
        blocker.flash = s.tick
        e.cd = 2
        if (blocker.hp <= 0) {
          blocker.dead = true
          pushLog(s, `${UNITS[blocker.key].name} 쓰러졌다.`)
          event = event || 'hurt'
        }
      }
      continue
    }
    e.mv += 1
    if (e.mv < e.speed) continue
    e.mv = 0
    if (e.x - 1 <= 0) {
      s.base.hp -= e.atk
      s.base.flash = s.tick
      e.dead = true
      pushLog(s, `${e.name} 도달! 기지 -${e.atk}`)
      event = 'hurt'
      continue
    }
    const occupied = s.enemies.some((o) => o !== e && !o.dead && o.lane === e.lane && o.x === e.x - 1)
    if (!occupied) e.x -= 1
  }

  s.units = s.units.filter((u) => !u.dead)
  s.enemies = s.enemies.filter((e) => !e.dead)

  // 4) 결과 판정
  if (s.base.hp <= 0) {
    s.base.hp = 0
    s.phase = 'over'
    s.best = Math.max(s.best, s.stage)
    pushLog(s, `기지가 무너졌다. ${s.stage} 스테이지까지 버텼다.`)
    sound(s, 'die')
    return s
  }
  if (s.queue.length === 0 && s.enemies.length === 0) {
    s.phase = 'between'
    s.best = Math.max(s.best, s.stage)
    pushLog(s, `스테이지 ${s.stage} 클리어! 기지 +3 회복, 최대 마나 +1`)
    sound(s, 'levelup')
    return s
  }
  if (event) sound(s, event)
  return s
}

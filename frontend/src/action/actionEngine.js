// 검의 길 엔진: 마을(NPC·상점·퀘스트·전직) → 들판(전투·퀘스트 몬스터) → 동굴(3단계 전투 + 보스)
// - 직업: 검사(근접 3단 콤보, 누르고 있으면 계속 이어짐), 마법사(원거리 투사체, 누르고 있으면 계속 발사)
// - 레벨업, 무기·갑옷 장착, 보스 보상, 마을 귀환 보상 연출
// 화면과 무관한 순수 시뮬레이션. dt(초) 단위로 움직인다.

export const VIEW_W = 960
export const VIEW_H = 540

export const ZONES = {
  town: { name: '마을 · 은빛 언덕', w: 960, h: 640 },
  field: { name: '들판 · 초록 평원', w: 1600, h: 1000 },
  dungeon: { name: '그늘진 동굴 · 석실', w: 960, h: 640 },
}

export const CLASSES = {
  knight: { name: '검사', hp: 100, desc: '근접 3단 콤보. J/Z를 누르고 있으면 콤보가 계속 이어진다.' },
  mage: { name: '마법사', hp: 75, desc: '원거리 마법 투사체. J/Z를 누르고 있으면 계속 쏜다.' },
}

const PLAYER_SPEED = 210
const ATTACK_MOVE = 0.35 // 공격 중에는 이동이 느려진다
const COMBO_RESET = 1.6 // 이 시간 동안 맞힌 적이 없으면 콤보 수가 0이 된다
const DODGE_DUR = 0.32
const DODGE_IFRAME = 0.26
const DODGE_CD = 0.7
const DODGE_SPEED = 640
const POTION_HEAL = 40
const MAGE_CD = 0.38
const SHOT_SPEED = 520
const SHOT_LIFE = 0.8
const SHOT_DMG = 11

// 검사 콤보 1~3단. from~to 구간에서만 타격이 들어간다
export const ATTACKS = [
  { dur: 0.3, from: 0.08, to: 0.2, range: 68, half: 0.95, dmg: 12, kb: 130, lunge: 50, hitstop: 0.04, shake: 5 },
  { dur: 0.32, from: 0.08, to: 0.22, range: 76, half: 1.0, dmg: 14, kb: 170, lunge: 60, hitstop: 0.05, shake: 6 },
  { dur: 0.5, from: 0.16, to: 0.34, range: 96, half: 1.3, dmg: 26, kb: 460, lunge: 110, hitstop: 0.12, shake: 14, finisher: true },
]

export const ENEMY_TYPES = {
  slime: { name: '슬라임', hp: 30, speed: 62, dmg: 8, r: 16, color: '#5fe0b0', windup: 0.7, range: 38, cool: 1.5, score: 10, gold: 2, xp: 5 },
  goblin: { name: '고블린', hp: 44, speed: 108, dmg: 11, r: 15, color: '#7ccc4a', windup: 0.45, range: 42, cool: 1.0, score: 20, gold: 4, xp: 10 },
  boss: { name: '오크 대장 그롬', hp: 320, speed: 70, dmg: 16, r: 42, color: '#9aa048', range: 110, score: 300, gold: 0, xp: 150, boss: true },
}

// 마을 건물과 분수 (막히는 사각형)
const TOWN_WALLS = [
  { x: 110, y: 110, w: 190, h: 130, roof: '#b5603a', name: '약방' },
  { x: 380, y: 60, w: 200, h: 110, roof: '#3a6ea5', name: '여관' },
  { x: 660, y: 120, w: 190, h: 130, roof: '#7a4aa8', name: '대장간' },
  { x: 446, y: 290, w: 68, h: 60, fountain: true },
]
const TOWN_NPCS = [
  { id: 'elder', name: '장로 아린', x: 260, y: 330, color: '#c9a25a', hair: '#e8e8e8' },
  { id: 'merchant', name: '상인 도루', x: 700, y: 330, color: '#8a5a3a', hair: '#3a2a1a' },
  { id: 'trainer', name: '교관 라나', x: 820, y: 440, color: '#4a6ad8', hair: '#ffb0d0' },
]
const DUNGEON_WALLS = [
  { x: 300, y: 200, w: 40, h: 40, pillar: true },
  { x: 620, y: 200, w: 40, h: 40, pillar: true },
  { x: 300, y: 400, w: 40, h: 40, pillar: true },
  { x: 620, y: 400, w: 40, h: 40, pillar: true },
]
// 동굴 3단계: 세 번째는 보스
const DUNGEON_STAGES = [
  { goblin: 3, slime: 3 },
  { goblin: 5, slime: 3 },
  { boss: true },
]

export const TOWN_PORTAL = { x: 480, y: 600, r: 34 }
export const FIELD_RETURN = { x: 40, y: 500, r: 40 }
export const CAVE = { x: 1540, y: 500, r: 40 }
export const DUNGEON_EXIT = { x: 480, y: 580, r: 34 }

const WEAPONS_LIST = [
  { name: '낡은 검', atk: 2, rarity: 'common' },
  { name: '강철 검', atk: 5, rarity: 'rare' },
  { name: '은빛 검', atk: 9, rarity: 'epic' },
]
const ARMOR_LIST = [
  { name: '가죽 갑옷', def: 1, hp: 10, rarity: 'common' },
  { name: '강철 갑옷', def: 3, hp: 25, rarity: 'rare' },
  { name: '미스릴 갑옷', def: 6, hp: 45, rarity: 'epic' },
]
export const RARITY_NAME = { common: '일반', rare: '희귀', epic: '영웅' }

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function angleDiff(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d)
}

export function worldSize(w) {
  return ZONES[w.zone]
}

// ---------- 능력치 ----------
export function maxHpOf(w) {
  return CLASSES[w.cls].hp + (w.level - 1) * 10 + (w.equip.armor?.hp || 0)
}
function atkMult(w) {
  return 1 + (w.level - 1) * 0.05
}
function weaponAtk(w) {
  return w.equip.weapon?.atk || 0
}
function defOf(w) {
  return w.equip.armor?.def || 0
}
function dmgFor(w, base) {
  return Math.max(1, Math.round((base + weaponAtk(w)) * atkMult(w)))
}
export function xpNeed(level) {
  return 40 + (level - 1) * 30
}

function randomItem(tier) {
  const pool = Math.random() < 0.5 ? WEAPONS_LIST : ARMOR_LIST
  const idx = clamp(tier + (Math.random() < 0.3 ? 1 : 0), 0, 2)
  const base = pool[idx]
  return { id: Math.random().toString(36).slice(2), slot: pool === WEAPONS_LIST ? 'weapon' : 'armor', ...base }
}

export function createWorld() {
  const fieldTrees = []
  for (let i = 0; i < 70; i++) {
    fieldTrees.push({ x: rand(40, ZONES.field.w - 40), y: rand(40, ZONES.field.h - 40), s: rand(0.8, 1.3) })
  }
  const cls = 'knight'
  return {
    zone: 'town',
    cls,
    fieldTrees,
    walls: TOWN_WALLS,
    npcs: TOWN_NPCS,
    t: 0,
    hitstop: 0,
    shake: 0,
    over: false,
    notice: '마을이다. E로 대화하고, 가운데 아래 빛나는 문으로 들판에 나갈 수 있다.',
    noticeT: 4,
    player: {
      x: 480, y: 460, r: 15, hp: 100, maxHp: 100,
      fx: 0, fy: -1,
      inv: 0, hurt: 0, moving: false, walk: 0,
      kx: 0, ky: 0,
      atk: null, // { step, t, hit: Set, queued, lunge }
      lastStep: 0, comboTimer: 0,
      dodge: null, dodgeCd: 0,
      fireCd: 0, castT: 0,
    },
    enemies: [],
    fx: [],
    shots: [],
    kills: 0,
    wave: 0,
    waveTimer: 1.2,
    dStage: 0,
    dTimer: 1,
    bossDead: false,
    combo: 0,
    bestCombo: 0,
    comboT: 0,
    score: 0,
    level: 1,
    xp: 0,
    gold: 0,
    potions: 3,
    equip: { weapon: null, armor: null },
    bag: [],
    quest: null, // { target, count, done, rewarded }
    dialog: null, // { name, lines, i, choices }
    reward: null, // { title, lines, t }
    panel: null, // 'bag' 또는 null
    fade: 0, // 구역 이동 때 화면이 어두워졌다 밝아지는 시간
  }
}

function notice(w, msg, t = 1.8) {
  w.notice = msg
  w.noticeT = t
}

// 원과 사각형이 겹치는지 (분수는 원으로 취급)
function hitsWall(w, x, y, r) {
  for (const b of w.walls) {
    if (b.fountain) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      if (Math.hypot(x - cx, y - cy) < r + Math.min(b.w, b.h) / 2) return true
      continue
    }
    const cx = clamp(x, b.x, b.x + b.w)
    const cy = clamp(y, b.y, b.y + b.h)
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true
  }
  return false
}

// 벽에 막히면 그 축만 멈춘다 (벽을 따라 미끄러진다)
function moveBody(w, o, dx, dy) {
  const Z = worldSize(w)
  const nx = clamp(o.x + dx, o.r, Z.w - o.r)
  if (!hitsWall(w, nx, o.y, o.r)) o.x = nx
  const ny = clamp(o.y + dy, o.r, Z.h - o.r)
  if (!hitsWall(w, o.x, ny, o.r)) o.y = ny
}

function nearestEnemy(w, x, y, maxD) {
  let best = null
  let bd = maxD * maxD
  for (const e of w.enemies) {
    if (e.dead || e.state === 'spawn') continue
    const d = (e.x - x) ** 2 + (e.y - y) ** 2
    if (d < bd) { bd = d; best = e }
  }
  return best
}

function fx(w, item) {
  w.fx.push({ life: 0.5, max: 0.5, vx: 0, vy: 0, ...item })
}

function burst(w, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 80 + Math.random() * 200
    fx(w, { type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.25, max: 0.6, color, size: 2 + Math.random() * 3 })
  }
}

function damageText(w, x, y, text, color) {
  fx(w, { type: 'text', x, y, vx: 0, vy: -50, life: 0.7, max: 0.7, text, color })
}

function registerHit(w, color) {
  w.combo += 1
  w.comboT = COMBO_RESET
  w.bestCombo = Math.max(w.bestCombo, w.combo)
  void color
}

function grantXp(w, amount) {
  w.xp += amount
  const p = w.player
  while (w.xp >= xpNeed(w.level)) {
    w.xp -= xpNeed(w.level)
    w.level += 1
    p.maxHp = maxHpOf(w)
    p.hp = Math.min(p.maxHp, p.hp + 10)
    notice(w, `레벨 업! Lv.${w.level}`, 2.5)
    burst(w, p.x, p.y, '#ffd447', 22)
  }
  p.maxHp = maxHpOf(w)
}

function startAttack(w, step) {
  const p = w.player
  // 가까운 적이 있으면 그쪽을 향한다 (키보드만으로도 맞히기 쉽게 하는 자동 조준)
  const target = nearestEnemy(w, p.x, p.y, 150)
  if (target) {
    const a = Math.atan2(target.y - p.y, target.x - p.x)
    p.fx = Math.cos(a)
    p.fy = Math.sin(a)
  }
  // 목표가 있을 때만 앞으로 밀고 들어간다 (빈 공간에서 연타해도 캐릭터가 떠밀리지 않게)
  p.atk = { step, t: 0, hit: new Set(), queued: false, lunge: target ? 1 : 0 }
  p.lastStep = step
}

function fireShot(w) {
  const p = w.player
  const target = nearestEnemy(w, p.x, p.y, 420)
  let dx = p.fx
  let dy = p.fy
  if (target) {
    const d = Math.hypot(target.x - p.x, target.y - p.y) || 1
    dx = (target.x - p.x) / d
    dy = (target.y - p.y) / d
    p.fx = dx
    p.fy = dy
  }
  w.shots.push({ x: p.x + dx * 20, y: p.y + dy * 20, vx: dx * SHOT_SPEED, vy: dy * SHOT_SPEED, life: SHOT_LIFE, dmg: dmgFor(w, SHOT_DMG), hit: new Set() })
  p.fireCd = MAGE_CD
  p.castT = 0.2
}

function updateShots(w, dt) {
  for (const s of w.shots) {
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.life -= dt
    if (hitsWall(w, s.x, s.y, 3)) {
      s.life = 0
      burst(w, s.x, s.y, '#b8e8ff', 4)
      continue
    }
    for (const e of w.enemies) {
      if (e.dead || e.state === 'spawn' || s.hit.has(e)) continue
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + 5) {
        s.hit.add(e)
        s.life = 0
        applyDamage(w, e, s.dmg, '#8fd8ff')
        break
      }
    }
  }
  w.shots = w.shots.filter((s) => s.life > 0)
}

// 적에게 피해를 준다 (검과 마법이 같이 쓴다)
function applyDamage(w, e, dmg, color) {
  e.hp -= dmg
  e.flash = 0.12
  burst(w, e.x, e.y, color || e.color, 8)
  damageText(w, e.x, e.y - e.r - 6, String(dmg), '#ffffff')
  registerHit(w, color)
  if (e.hp <= 0 && !e.dead) killEnemy(w, e)
}

function hitEnemy(w, e, A) {
  const p = w.player
  const d = Math.hypot(e.x - p.x, e.y - p.y) || 1
  const ux = (e.x - p.x) / d
  const uy = (e.y - p.y) / d
  const isBoss = !!e.boss
  const kbScale = isBoss ? 0.25 : 1
  e.flash = 0.12
  e.stagger = isBoss ? 0.05 : A.finisher ? 0.5 : 0.22 // 맞은 적은 잠깐 행동을 멈춘다
  if (!isBoss) e.state = 'chase'
  e.kx = ux * A.kb * kbScale
  e.ky = uy * A.kb * kbScale
  const dmg = dmgFor(w, A.dmg)
  e.hp -= dmg
  burst(w, e.x, e.y, e.color, A.finisher ? 16 : 8)
  damageText(w, e.x, e.y - e.r - 6, String(dmg), A.finisher ? '#ffd447' : '#ffffff')
  registerHit(w)
  w.hitstop = Math.max(w.hitstop, A.hitstop)
  w.shake = Math.max(w.shake, A.shake)
  if (e.hp <= 0 && !e.dead) killEnemy(w, e)
}

function killEnemy(w, e) {
  e.dead = true
  const spec = ENEMY_TYPES[e.type]
  w.kills += 1
  w.score += spec.score * Math.max(1, w.combo)
  w.gold += spec.gold
  burst(w, e.x, e.y, e.color, e.boss ? 60 : 18)
  damageText(w, e.x, e.y - 24, '처치!', '#5ee6ff')
  grantXp(w, spec.xp)
  if (e.type === 'slime' && w.zone === 'field' && w.quest && !w.quest.done) {
    w.quest.count += 1
    if (w.quest.count >= w.quest.target) {
      w.quest.done = true
      notice(w, '퀘스트 완료! 마을로 돌아가자.', 3)
    }
  }
  if (e.boss) {
    w.bossDead = true
    w.shake = 20
    grantReward(w, '오크 대장 그롬 격파!', { gold: 80, items: [randomItem(1), randomItem(2)] })
  }
}

function hurtPlayer(w, dmg, fromX, fromY) {
  const p = w.player
  if (w.over || p.inv > 0) return
  const real = Math.max(1, dmg - defOf(w))
  p.hp = Math.max(0, p.hp - real)
  p.inv = 0.6
  p.hurt = 0.25
  w.shake = Math.max(w.shake, 10)
  w.hitstop = Math.max(w.hitstop, 0.04)
  const d = Math.hypot(p.x - fromX, p.y - fromY) || 1
  p.kx = ((p.x - fromX) / d) * 180
  p.ky = ((p.y - fromY) / d) * 180
  if (p.atk) p.atk = null // 맞으면 공격이 끊긴다
  damageText(w, p.x, p.y - 26, `-${real}`, '#ff5a6a')
  burst(w, p.x, p.y, '#ff5a6a', 8)
  if (p.hp <= 0) {
    w.over = true
    notice(w, '쓰러졌다! R 키로 다시 시작', 99)
  }
}

// 들판 웨이브 (지금 있는 적을 다 잡으면 다음 웨이브)
function spawnFieldWave(w) {
  const p = w.player
  const n = 2 + Math.floor(w.wave * 1.5)
  const Z = ZONES.field
  for (let i = 0; i < n; i++) {
    let x = 0
    let y = 0
    for (let tries = 0; tries < 30; tries++) {
      x = rand(60, Z.w - 60)
      y = rand(60, Z.h - 60)
      if (Math.hypot(x - p.x, y - p.y) > 320) break
    }
    const type = w.wave >= 2 && Math.random() < 0.4 ? 'goblin' : 'slime'
    addEnemy(w, type, x, y, w.wave)
  }
}

function addEnemy(w, type, x, y, wave) {
  const spec = ENEMY_TYPES[type]
  const hp = spec.hp + Math.floor(wave / 2) * 4
  w.enemies.push({
    id: Math.random(), type, x, y, r: spec.r, hp, maxHp: hp, boss: !!spec.boss,
    color: spec.color, state: 'spawn', delay: 0.6 + Math.random() * 0.4, cd: 1.2, wt: 0, stagger: 0, flash: 0, kx: 0, ky: 0, dead: false,
    dirx: 0, diry: 0, hitDone: false,
  })
}

// 동굴 단계 시작: 적을 배치한다
function spawnDungeonStage(w, stage) {
  const p = w.player
  const Z = ZONES.dungeon
  if (stage.boss) {
    addEnemy(w, 'boss', Z.w / 2, 240, 0)
    notice(w, '보스 오크 대장 그롬이 나타났다!', 3)
    return
  }
  const list = []
  for (let i = 0; i < (stage.goblin || 0); i++) list.push('goblin')
  for (let i = 0; i < (stage.slime || 0); i++) list.push('slime')
  for (const type of list) {
    let x = 0
    let y = 0
    for (let tries = 0; tries < 30; tries++) {
      x = rand(60, Z.w - 60)
      y = rand(60, Z.h - 60)
      if (Math.hypot(x - p.x, y - p.y) > 260 && !hitsWall(w, x, y, 20)) break
    }
    addEnemy(w, type, x, y, 0)
  }
}

// ---------- 보상 ----------
function grantReward(w, title, rewards) {
  const lines = []
  if (rewards.gold) {
    w.gold += rewards.gold
    lines.push(`골드 +${rewards.gold}`)
  }
  if (rewards.potions) {
    w.potions += rewards.potions
    lines.push(`회복 물약 +${rewards.potions}`)
  }
  for (const item of rewards.items || []) {
    w.bag.push(item)
    lines.push(`${RARITY_NAME[item.rarity]} 장비: ${item.name}`)
  }
  w.reward = { title, lines, t: 0 }
}

function equipItem(w, index) {
  const item = w.bag[index]
  if (!item) return
  const old = w.equip[item.slot]
  w.equip[item.slot] = item
  w.bag.splice(index, 1)
  if (old) w.bag.push(old)
  const p = w.player
  p.maxHp = maxHpOf(w)
  p.hp = Math.min(p.hp, p.maxHp)
  notice(w, `${item.name} 장착`, 2)
}

function setClass(w, cls) {
  w.cls = cls
  const p = w.player
  p.maxHp = maxHpOf(w)
  p.hp = p.maxHp
  p.atk = null
  notice(w, `${CLASSES[cls].name}로 전직했다. ${CLASSES[cls].desc}`, 4)
}

// ---------- 구역 ----------
function spawnPoint(zone, from) {
  if (zone === 'town') return { x: 480, y: 460 }
  if (zone === 'field') return from === 'dungeon' ? { x: 1480, y: 500 } : { x: 120, y: 500 }
  return { x: 120, y: 320 }
}

function enterZone(w, zone, from) {
  w.zone = zone
  w.fade = 0.6
  const p = w.player
  p.atk = null
  p.dodge = null
  p.kx = 0
  p.ky = 0
  w.shots = []
  w.enemies = []
  const sp = spawnPoint(zone, from)
  p.x = sp.x
  p.y = sp.y
  if (zone === 'field') {
    w.walls = []
    w.npcs = []
    w.wave = 0
    w.waveTimer = 1.2
    notice(w, '들판이다. 슬라임이 몰려온다! 오른쪽 끝의 동굴 입구에서 던전에 들어갈 수 있다.', 3)
  } else if (zone === 'dungeon') {
    w.walls = DUNGEON_WALLS
    w.npcs = []
    w.dStage = 0
    w.dTimer = 1
    notice(w, '그늘진 동굴이다. 적을 모두 쓰러뜨리면 다음 무리가 나온다.', 3)
  } else {
    w.walls = TOWN_WALLS
    w.npcs = TOWN_NPCS
    notice(w, '마을로 돌아왔다.', 2)
    // 귀환 연출: 퀘스트를 완료했으면 보상을 보여 준다
    if (w.quest && w.quest.done && !w.quest.rewarded) {
      w.quest.rewarded = true
      grantReward(w, '퀘스트 보상: 장로 아린', { gold: 50, potions: 2 })
    }
  }
}

// ---------- 대화 ----------
function nearNpc(w) {
  const p = w.player
  for (const n of w.npcs) {
    if (Math.hypot(n.x - p.x, n.y - p.y) < 90) return n
  }
  return null
}

function acceptQuest(w) {
  w.quest = { target: 10, count: 0, done: false, rewarded: false }
  notice(w, '퀘스트 수락: 들판의 슬라임 10마리 처치', 3)
}

function buyPotion(w) {
  if (w.gold >= 10) {
    w.gold -= 10
    w.potions += 1
    notice(w, '회복 물약 +1 (10골드)', 2)
  } else {
    notice(w, '골드가 부족하다.', 2)
  }
}

function npcScript(w, npc) {
  if (npc.id === 'elder') {
    const q = w.quest
    if (!q) {
      return {
        lines: ['들판에 슬라임 떼가 번졌다네. 열 마리만 잡아 주겠나?', '들판 오른쪽 동굴에는 더 무서운 것이 산다네.'],
        choices: [{ label: '수락한다', act: acceptQuest }, { label: '다음에 하지', act: null }],
      }
    }
    if (q.done && !q.rewarded) {
      q.rewarded = true
      return { reward: { title: '퀘스트 보상: 장로 아린', gold: 50, potions: 2 } }
    }
    if (q.done) return { lines: ['고맙네. 자네 덕분에 마을이 한결 편해졌어.'], choices: null }
    return { lines: [`아직 ${q.count} / ${q.target} 마리다. 힘내게.`], choices: null }
  }
  if (npc.id === 'trainer') {
    return {
      lines: ['몸으로 익힐 길을 골라 보게.', `지금은 ${CLASSES[w.cls].name}이다. 전직하면 체력은 새로 맞춰진다.`],
      choices: [
        { label: '검사로 전직 (근접 콤보)', act: (g) => setClass(g, 'knight') },
        { label: '마법사로 전직 (원거리)', act: (g) => setClass(g, 'mage') },
        { label: '그만두기', act: null },
      ],
    }
  }
  return {
    lines: ['회복 물약을 팔고 있소. 한 병에 10골드요.', 'Q 키로 전투 중에도 마실 수 있소.'],
    choices: [{ label: '회복 물약 구매 (10골드)', act: buyPotion }, { label: '그만두기', act: null }],
  }
}

function openNpc(w, npc) {
  const s = npcScript(w, npc)
  if (s.reward) {
    grantReward(w, s.reward.title, s.reward)
    return
  }
  w.dialog = { name: npc.name, lines: s.lines, i: 0, choices: s.choices }
}

function advanceDialog(w) {
  const d = w.dialog
  if (d.i < d.lines.length - 1) {
    d.i += 1
    return
  }
  if (d.choices) return // 선택을 기다린다
  w.dialog = null
}

function chooseDialog(w, idx) {
  const d = w.dialog
  if (!d || !d.choices || d.i < d.lines.length - 1) return
  const c = d.choices[idx]
  if (!c) return
  w.dialog = null
  if (c.act) c.act(w)
}

function usePotion(w) {
  const p = w.player
  if (w.potions <= 0) return notice(w, '회복 물약이 없다.', 1.2)
  if (p.hp >= p.maxHp) return notice(w, '이미 체력이 가득하다.', 1.2)
  const before = p.hp
  p.hp = Math.min(p.maxHp, p.hp + POTION_HEAL)
  w.potions -= 1
  damageText(w, p.x, p.y - 26, `+${p.hp - before}`, '#7fff9e')
  burst(w, p.x, p.y, '#7fff9e', 10)
}

function updateFx(w, dt) {
  for (const f of w.fx) {
    f.life -= dt
    f.x += (f.vx || 0) * dt
    f.y += (f.vy || 0) * dt
    if (f.vx) f.vx *= 0.9
    if (f.vy && f.type === 'dot') f.vy *= 0.9
  }
  w.fx = w.fx.filter((f) => f.life > 0)
}

// ---------- 보스 ----------
// 상태: chase(추격) → slamWind(내려찍기 예고) 또는 chargeWind(돌진 예고) → 실행 → recover(휴식)
function updateBoss(w, e, dt) {
  const spec = ENEMY_TYPES.boss
  const p = w.player
  const dx = p.x - e.x
  const dy = p.y - e.y
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  switch (e.state) {
    case 'chase':
      moveBody(w, e, ux * spec.speed * dt, uy * spec.speed * dt)
      e.cd -= dt
      if (e.cd <= 0 && d < 420) {
        if (Math.random() < 0.5) {
          e.state = 'slamWind'
          e.wt = 1.0
        } else {
          e.state = 'chargeWind'
          e.wt = 0.7
        }
      }
      break
    case 'slamWind':
      e.wt -= dt
      if (e.wt <= 0) {
        e.state = 'recover'
        e.cd = 1.6
        if (Math.hypot(p.x - e.x, p.y - e.y) < spec.range + p.r) hurtPlayer(w, spec.dmg, e.x, e.y)
        w.shake = Math.max(w.shake, 14)
        fx(w, { type: 'ring', x: e.x, y: e.y, life: 0.35, max: 0.35, r: spec.range, color: '#ffd9a0' })
        burst(w, e.x, e.y + 20, '#c9b07a', 16)
      }
      break
    case 'chargeWind':
      e.dirx = ux
      e.diry = uy
      e.wt -= dt
      if (e.wt <= 0) {
        e.state = 'charge'
        e.wt = 0.55
        e.hitDone = false
      }
      break
    case 'charge':
      moveBody(w, e, e.dirx * 520 * dt, e.diry * 520 * dt)
      e.wt -= dt
      if (!e.hitDone && Math.hypot(p.x - e.x, p.y - e.y) < spec.r + p.r + 6) {
        e.hitDone = true
        hurtPlayer(w, spec.dmg + 4, e.x, e.y)
      }
      if (e.wt <= 0 || e.hitDone) {
        e.state = 'recover'
        e.cd = 1.2
      }
      break
    case 'recover':
      e.cd -= dt
      if (e.cd <= 0) {
        e.state = 'chase'
        e.cd = 0.9
      }
      break
    default:
      break
  }
}

// 입력:
// dx, dy: 이동 / attack: 이번 프레임에 누른 공격 / attackHeld: 공격 키를 누르고 있는지
// dodge: 회피 / interact: E·Enter / potion: Q / bag: I (가방) / choice: 1~9 (대화 선택 또는 장착)
export function update(w, dt, input) {
  if (w.over) return w
  if (w.noticeT > 0) w.noticeT -= dt
  if (w.fade > 0) w.fade -= dt
  updateFx(w, dt)
  if (w.hitstop > 0) {
    // 타격 순간: 시간을 잠깐 멈춘다 (묵직한 타격감)
    w.hitstop -= dt
    return w
  }
  if (w.reward) {
    // 보상 연출: 한 줄씩 나타나고, 다 보이면 E로 닫는다
    w.reward.t += dt
    const allShown = w.reward.t >= w.reward.lines.length * 0.35 + 0.3
    if (input.interact && allShown) w.reward = null
    return w
  }
  if (w.panel) {
    if (input.bag || input.interact) w.panel = null
    if (input.choice) equipItem(w, input.choice - 1)
    return w
  }
  if (input.bag) {
    w.panel = 'bag'
    return w
  }
  if (w.dialog) {
    if (input.interact) advanceDialog(w)
    if (input.choice) chooseDialog(w, input.choice - 1)
    return w
  }
  w.t += dt
  const p = w.player
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 40)
  if (p.inv > 0) p.inv -= dt
  if (p.hurt > 0) p.hurt -= dt
  if (p.dodgeCd > 0) p.dodgeCd -= dt
  if (p.comboTimer > 0) p.comboTimer -= dt
  if (p.fireCd > 0) p.fireCd -= dt
  if (p.castT > 0) p.castT -= dt
  if (w.comboT > 0) {
    w.comboT -= dt
    if (w.comboT <= 0) w.combo = 0
  }
  // 넉백
  if (p.kx || p.ky) {
    moveBody(w, p, p.kx * dt, p.ky * dt)
    const k = Math.exp(-dt * 10)
    p.kx *= k
    p.ky *= k
    if (Math.abs(p.kx) < 1 && Math.abs(p.ky) < 1) { p.kx = 0; p.ky = 0 }
  }

  // 상호작용: 대화, 물약
  if (input.interact) {
    const npc = nearNpc(w)
    if (npc) openNpc(w, npc)
  }
  if (input.potion) usePotion(w)

  // 1) 이동과 바라보는 방향
  let mx = input.dx || 0
  let my = input.dy || 0
  const len = Math.hypot(mx, my)
  p.moving = len > 0
  if (len > 0) {
    mx /= len
    my /= len
    if (!p.atk) { p.fx = mx; p.fy = my }
    p.walk += dt * 12
  }

  // 2) 회피
  if (input.dodge && !p.dodge && p.dodgeCd <= 0) {
    const dx = len > 0 ? mx : p.fx
    const dy = len > 0 ? my : p.fy
    p.dodge = { t: DODGE_DUR, dx, dy }
    p.dodgeCd = DODGE_CD
    p.inv = Math.max(p.inv, DODGE_IFRAME)
    p.atk = null
    burst(w, p.x, p.y, '#b6ff9e', 6)
  }
  if (p.dodge) {
    p.dodge.t -= dt
    moveBody(w, p, p.dodge.dx * DODGE_SPEED * dt, p.dodge.dy * DODGE_SPEED * dt)
    if (p.dodge.t <= 0) p.dodge = null
  } else if (p.moving) {
    const sp = PLAYER_SPEED * (p.atk ? ATTACK_MOVE : 1)
    moveBody(w, p, mx * sp * dt, my * sp * dt)
  }

  // 3) 공격
  const holding = !!input.attackHeld
  if (w.cls === 'mage') {
    if ((input.attack || holding) && !p.dodge && p.fireCd <= 0) fireShot(w)
  } else {
    if ((input.attack || holding) && !p.dodge && !p.atk) {
      const next = p.lastStep >= 3 || p.comboTimer <= 0 ? 1 : p.lastStep + 1
      startAttack(w, next)
    } else if (input.attack && p.atk && p.atk.step < 3) {
      p.atk.queued = true // 공격 중 누르면 다음 콤보를 예약한다
    }
  }

  // 4) 검 공격 진행과 타격 판정
  if (p.atk) {
    const A = ATTACKS[p.atk.step - 1]
    const prev = p.atk.t
    p.atk.t += dt
    if (p.atk.t >= A.from && p.atk.t <= A.to && p.atk.lunge) {
      const v = A.lunge / (A.to - A.from)
      moveBody(w, p, p.fx * v * dt, p.fy * v * dt)
    }
    if (prev < A.from && p.atk.t >= A.from) {
      fx(w, { type: 'slash', x: p.x, y: p.y, ang: Math.atan2(p.fy, p.fx), half: A.half, range: A.range, finisher: !!A.finisher, life: 0.22, max: 0.22 })
    }
    if (p.atk.t >= A.from && p.atk.t <= A.to && w.zone !== 'town') {
      const base = Math.atan2(p.fy, p.fx)
      for (const e of w.enemies) {
        if (e.dead || p.atk.hit.has(e) || e.state === 'spawn') continue
        const d = Math.hypot(e.x - p.x, e.y - p.y)
        if (d > A.range + e.r) continue
        const ang = Math.atan2(e.y - p.y, e.x - p.x)
        if (angleDiff(ang, base) > A.half) continue
        p.atk.hit.add(e)
        hitEnemy(w, e, A)
        if (w.hitstop > 0) break
      }
    }
    if (p.atk && p.atk.t >= A.dur) {
      const step = p.atk.step
      if ((p.atk.queued || holding) && !p.dodge) {
        const next = step >= 3 ? 1 : step + 1
        startAttack(w, next)
      } else {
        p.lastStep = step
        p.atk = null
        p.comboTimer = step >= 3 ? 0 : 0.45
      }
    }
  }

  // 5) 투사체
  updateShots(w, dt)

  // 6) 전투 구역: 적 행동
  if (w.zone === 'field' || w.zone === 'dungeon') {
    const Z = worldSize(w)
    for (const e of w.enemies) {
      if (e.dead) continue
      if (e.flash > 0) e.flash -= dt
      if (e.stagger > 0) e.stagger -= dt
      if (e.kx || e.ky) {
        moveBody(w, e, e.kx * dt, e.ky * dt)
        const k = Math.exp(-dt * 9)
        e.kx *= k
        e.ky *= k
      }
      if (e.state === 'spawn') {
        e.delay -= dt
        if (e.delay <= 0) e.state = 'chase'
        continue
      }
      if (e.boss) {
        updateBoss(w, e, dt)
        continue
      }
      const spec = ENEMY_TYPES[e.type]
      const dx = p.x - e.x
      const dy = p.y - e.y
      const d = Math.hypot(dx, dy) || 1
      if (e.state === 'windup') {
        if (e.stagger > 0) { e.state = 'chase'; e.wt = 0 } else {
          e.wt -= dt
          if (e.wt <= 0) {
            const hitD = Math.hypot(p.x - e.x, p.y - e.y)
            if (hitD < spec.range + p.r + e.r) hurtPlayer(w, spec.dmg, e.x, e.y)
            e.state = 'recover'
            e.cd = spec.cool
            fx(w, { type: 'ring', x: e.x, y: e.y, life: 0.25, max: 0.25, r: spec.range, color: '#ffffff' })
          }
        }
      } else if (e.state === 'recover') {
        e.cd -= dt
        if (e.cd <= 0) e.state = 'chase'
      } else if (e.stagger <= 0) {
        moveBody(w, e, (dx / d) * spec.speed * dt, (dy / d) * spec.speed * dt)
        e.x = clamp(e.x, e.r, Z.w - e.r)
        e.y = clamp(e.y, e.r, Z.h - e.r)
        if (d < spec.range + p.r + e.r) {
          e.state = 'windup'
          e.wt = spec.windup
        }
      }
    }
    // 적끼리는 겹치지 않게 살짝 밀어낸다
    for (let i = 0; i < w.enemies.length; i++) {
      const a = w.enemies[i]
      if (a.dead || a.state === 'spawn' || a.boss) continue
      for (let j = i + 1; j < w.enemies.length; j++) {
        const b = w.enemies[j]
        if (b.dead || b.state === 'spawn' || b.boss) continue
        const ddx = b.x - a.x
        const ddy = b.y - a.y
        const dd = Math.hypot(ddx, ddy) || 1
        const min = a.r + b.r
        if (dd < min) {
          const push = (min - dd) / 2
          a.x -= (ddx / dd) * push
          a.y -= (ddy / dd) * push
          b.x += (ddx / dd) * push
          b.y += (ddy / dd) * push
        }
      }
    }
    w.enemies = w.enemies.filter((e) => !e.dead)

    // 웨이브 / 동굴 단계 진행
    if (w.zone === 'field' && w.enemies.length === 0) {
      w.waveTimer -= dt
      if (w.waveTimer <= 0) {
        w.wave += 1
        spawnFieldWave(w)
        w.waveTimer = 1.5
        notice(w, `웨이브 ${w.wave}`)
      }
    }
    if (w.zone === 'dungeon' && !w.bossDead && w.enemies.length === 0) {
      w.dTimer -= dt
      if (w.dTimer <= 0 && w.dStage < DUNGEON_STAGES.length) {
        spawnDungeonStage(w, DUNGEON_STAGES[w.dStage])
        w.dStage += 1
        w.dTimer = 1.5
      }
    }
  }

  // 7) 문(포탈)
  const portals = w.zone === 'town' ? [[TOWN_PORTAL, 'field']]
    : w.zone === 'field' ? [[FIELD_RETURN, 'town'], [CAVE, 'dungeon']]
      : w.bossDead ? [[DUNGEON_EXIT, 'field']] : []
  for (const [pt, dest] of portals) {
    if (Math.hypot(p.x - pt.x, p.y - pt.y) < pt.r) {
      enterZone(w, dest, w.zone)
      break
    }
  }
  return w
}

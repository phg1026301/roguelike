// 탄환 소년: 위에서 내려다보는 실시간 8방향 슈터 (화면과 무관한 시뮬레이션)
// dt(초) 단위로 움직여서 프레임 속도와 상관없이 같은 속도로 움직인다

export const W = 960
export const H = 540
const PLAYER_SPEED = 230

// 장애물 (사각형). 캐릭터는 벽을 통과할 수 없다
// 장애물은 최소로: 넓게 트인 전장에 작은 기둥 두 개만 둔다
const WALLS = [
  { x: 250, y: 300, w: 60, h: 26 },
  { x: 650, y: 210, w: 60, h: 26 },
]
export const WALL_LIST = WALLS

export const WEAPONS = {
  pistol: { name: '권총', key: '1', cd: 0.26, speed: 640, dmg: 1, pellets: 1, spread: 0, life: 0.85, color: '#ffd447' },
  shotgun: { name: '산탄총', key: '2', cd: 0.8, speed: 580, dmg: 1, pellets: 5, spread: 0.36, life: 0.42, color: '#ff8a3b' },
  rifle: { name: '기관총', key: '3', cd: 0.1, speed: 820, dmg: 1, pellets: 1, spread: 0.1, life: 0.7, color: '#7fe0ff' },
}
export const WEAPON_ORDER = ['pistol', 'shotgun', 'rifle']

export const ENEMIES = {
  slime: { name: '슬라임', r: 17, hp: 2, speed: 62, dmg: 1, color: '#5fe0b0', coin: 1 },
  goblin: { name: '고블린', r: 18, hp: 4, speed: 100, dmg: 1, color: '#6cc84a', coin: 2 },
  bat: { name: '박쥐', r: 13, hp: 2, speed: 160, dmg: 1, color: '#9a7fe6', coin: 2, erratic: true },
  orc: { name: '오크', r: 25, hp: 12, speed: 58, dmg: 2, color: '#b8a040', coin: 5 },
}

function waveSpec(wave) {
  const list = []
  const count = 8 + wave * 4
  for (let i = 0; i < count; i++) {
    const r = Math.random()
    let type = r < 0.6 ? 'slime' : 'goblin'
    if (wave >= 2 && r > 0.8) type = 'bat'
    if (wave >= 3 && r > 0.9) type = 'orc'
    list.push(type)
  }
  return list
}

// 적은 화면 바깥 가장자리에서 등장한다
function spawnPos() {
  // 벽 안쪽 가장자리에서 등장 (바깥에 있으면 벽 검사에 막히므로)
  const m = 26
  const side = Math.floor(Math.random() * 4)
  if (side === 0) return { x: m + Math.random() * (W - 2 * m), y: m }
  if (side === 1) return { x: W - m, y: m + Math.random() * (H - 2 * m) }
  if (side === 2) return { x: m + Math.random() * (W - 2 * m), y: H - m }
  return { x: m, y: m + Math.random() * (H - 2 * m) }
}

export function createWorld() {
  return {
    t: 0,
    player: { x: W / 2, y: 470, r: 16, hp: 5, maxHp: 5, face: { x: 1, y: 0 }, inv: 0, weapon: 'pistol', cd: 0, moving: false, walk: 0, squash: 0 },
    bullets: [],
    enemies: [],
    coins: [],
    particles: [],
    queue: [],
    wave: 0,
    waveTimer: 1.2,
    score: 0,
    coinsGot: 0,
    kills: 0,
    shake: 0,
    over: false,
    notice: '',
    noticeT: 0,
  }
}

function notice(w, msg) {
  w.notice = msg
  w.noticeT = 1.8
}

function blockedAt(x, y, r) {
  if (x < r || x > W - r || y < r || y > H - r) return true
  for (const b of WALLS) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w))
    const cy = Math.max(b.y, Math.min(y, b.y + b.h))
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true
  }
  return false
}

// 벽에 막히면 그 축만 멈춘다 (벽을 따라 미끄러진다)
function moveBody(o, dx, dy) {
  if (!blockedAt(o.x + dx, o.y, o.r)) o.x += dx
  if (!blockedAt(o.x, o.y + dy, o.r)) o.y += dy
}

// 적은 막히면 좌우로 돌아서 길을 찾는다 (장애물 뒤에 붙어 서 있지 않도록)
function steer(o, ux, uy, dist) {
  const base = Math.atan2(uy, ux)
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const a = base + off
    const dx = Math.cos(a) * dist
    const dy = Math.sin(a) * dist
    if (!blockedAt(o.x + dx, o.y + dy, o.r)) {
      o.x += dx
      o.y += dy
      return
    }
  }
}

// 입력: { dx, dy } 이동 방향(-1~1), fire(발사 중), aim(조준 각도 또는 null)
export function update(w, dt, input) {
  if (w.over) return w
  w.t += dt
  const p = w.player
  if (w.noticeT > 0) w.noticeT -= dt
  if (p.cd > 0) p.cd -= dt
  if (p.inv > 0) p.inv -= dt
  if (p.squash > 0) p.squash -= dt
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 40)

  // 1) 플레이어 이동 (대각선도 같은 속도가 되도록 길이를 맞춘다)
  let mx = input.dx || 0
  let my = input.dy || 0
  const len = Math.hypot(mx, my)
  p.moving = len > 0
  if (len > 0) {
    mx /= len
    my /= len
    moveBody(p, mx * PLAYER_SPEED * dt, my * PLAYER_SPEED * dt)
    p.face = { x: mx, y: my }
    p.walk += dt * 14
  }
  // 조준: 마우스 각도가 있으면 그쪽, 없으면 마지막 이동 방향
  if (input.aim != null) p.face = { x: Math.cos(input.aim), y: Math.sin(input.aim) }

  // 2) 발사
  if (input.fire && p.cd <= 0) {
    const wp = WEAPONS[p.weapon]
    const base = Math.atan2(p.face.y, p.face.x)
    for (let i = 0; i < wp.pellets; i++) {
      const a = base + (wp.pellets === 1 ? 0 : (i / (wp.pellets - 1) - 0.5) * 2 * wp.spread) + (Math.random() - 0.5) * wp.spread * 0.3
      w.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * wp.speed, vy: Math.sin(a) * wp.speed, life: wp.life, dmg: wp.dmg, color: wp.color, hit: new Set() })
    }
    p.cd = wp.cd
    w.shake = Math.max(w.shake, 2)
  }

  // 3) 총알 이동과 충돌
  for (const b of w.bullets) {
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.life -= dt
    if (blockedAt(b.x, b.y, 2)) {
      b.life = 0
      burst(w, b.x, b.y, '#c8c8d0', 4)
    }
    for (const e of w.enemies) {
      if (b.hit.has(e) || e.dead) continue
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 3) ** 2) {
        b.hit.add(e)
        e.hp -= b.dmg
        e.flash = 0.12
        e.kx = b.vx * 0.03
        e.ky = b.vy * 0.03
        burst(w, b.x, b.y, b.color, 5)
        if (e.hp <= 0) killEnemy(w, e)
        b.life = 0 // 한 발은 한 적에게만 맞는다 (산탄은 알갱이마다 따로 나간다)
      }
    }
  }
  w.bullets = w.bullets.filter((b) => b.life > 0)
  w.enemies = w.enemies.filter((e) => !e.dead)

  // 4) 적 행동: 플레이어를 쫓는다 (박쥐는 좌우로 흔들린다)
  for (const e of w.enemies) {
    if (e.flash > 0) e.flash -= dt
    e.walk += dt * 10
    const dx = p.x - e.x
    const dy = p.y - e.y
    const d = Math.hypot(dx, dy) || 1
    let ux = dx / d
    let uy = dy / d
    if (e.erratic) {
      // 방향을 좌우로 살짝 돌려서 흔들리며 다가온다
      const a = Math.sin(w.t * 7 + e.id) * 0.9
      const cx = ux * Math.cos(a) - uy * Math.sin(a)
      const cy = ux * Math.sin(a) + uy * Math.cos(a)
      ux = cx
      uy = cy
    }
    // 넉백은 점점 줄어든다
    e.x += e.kx || 0
    e.y += e.ky || 0
    e.kx = (e.kx || 0) * 0.85
    e.ky = (e.ky || 0) * 0.85
    steer(e, ux, uy, e.speed * dt)
    if (d < e.r + p.r && p.inv <= 0) {
      p.hp -= e.dmg
      p.inv = 1
      w.shake = 12
      burst(w, p.x, p.y, '#ff5a8a', 10)
      if (p.hp <= 0) {
        p.hp = 0
        w.over = true
        notice(w, '쓰러졌다! R 키로 다시 시작')
        return w
      }
    }
  }

  // 5) 코인: 가까이 가면 빨려 들어온다
  for (const c of w.coins) {
    c.life -= dt
    const dx = p.x - c.x
    const dy = p.y - c.y
    const d = Math.hypot(dx, dy)
    if (d < 90) {
      c.x += (dx / d) * 380 * dt
      c.y += (dy / d) * 380 * dt
    }
    if (d < 20) {
      c.dead = true
      w.coinsGot += c.v
      w.score += c.v * 10
    }
  }
  w.coins = w.coins.filter((c) => !c.dead && c.life > 0)

  // 6) 파티클
  for (const q of w.particles) {
    q.x += q.vx * dt
    q.y += q.vy * dt
    q.vx *= 0.9
    q.vy *= 0.9
    q.life -= dt
  }
  w.particles = w.particles.filter((q) => q.life > 0)

  // 7) 웨이브: 적을 다 잡으면 잠시 뒤 다음 웨이브
  if (w.queue.length === 0 && w.enemies.length === 0) {
    w.waveTimer -= dt
    if (w.waveTimer <= 0) {
      w.wave += 1
      w.queue = waveSpec(w.wave)
      w.waveTimer = 0.5
      notice(w, `웨이브 ${w.wave}!`)
      if (w.wave === 2) notice(w, '웨이브 2: 박쥐가 나온다!')
      if (w.wave === 3) notice(w, '웨이브 3: 오크가 나온다!')
    }
  } else if (w.queue.length > 0) {
    w.waveTimer -= dt
    if (w.waveTimer <= 0) {
      const type = w.queue.shift()
      const pos = spawnPos()
      const spec = ENEMIES[type]
      w.enemies.push({ id: Math.random(), type, name: spec.name, x: pos.x, y: pos.y, r: spec.r, hp: spec.hp + Math.floor(w.wave / 4), maxHp: spec.hp, speed: spec.speed, dmg: spec.dmg, color: spec.color, coin: spec.coin, erratic: !!spec.erratic, walk: 0, flash: 0, kx: 0, ky: 0, dead: false })
      w.waveTimer = Math.max(0.2, 0.7 - w.wave * 0.04)
    }
  }
  return w
}

function killEnemy(w, e) {
  e.dead = true
  w.kills += 1
  w.score += e.coin * 10
  burst(w, e.x, e.y, e.color, 14)
  for (let i = 0; i < e.coin; i++) {
    w.coins.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 30, v: 1, life: 8 })
  }
}

function burst(w, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 60 + Math.random() * 180
    w.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, max: 0.7, color, size: 3 + Math.random() * 4 })
  }
}

export function switchWeapon(w, key) {
  const name = WEAPON_ORDER[key]
  if (name) {
    w.player.weapon = name
    notice(w, `무기: ${WEAPONS[name].name}`)
  }
}

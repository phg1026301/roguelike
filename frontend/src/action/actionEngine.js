// 액션 RPG 프로토타입 엔진 (엘소드 느낌의 전투 기본기)
// - 실시간 이동, 3단 콤보 공격(끝 공격은 큰 넉백), 회피 구르기(무적 시간)
// - 적은 예고(빨간 원)를 보여 준 뒤 공격한다
// - 타격 순간 히트스톱, 넉백, 화면 흔들림으로 타격감을 준다
// 화면과 무관한 순수 시뮬레이션. dt(초) 단위로 움직인다.

export const WORLD_W = 1600
export const WORLD_H = 1000
export const VIEW_W = 960
export const VIEW_H = 540

const PLAYER_SPEED = 210
const ATTACK_MOVE = 0.35 // 공격 중에는 이동이 느려진다
const COMBO_WINDOW = 0.45 // 공격이 끝난 뒤 이 시간 안에 누르면 다음 콤보로 이어진다
const COMBO_RESET = 1.6 // 이 시간 동안 맞힌 적이 없으면 콤보 수가 0이 된다
const DODGE_DUR = 0.32
const DODGE_IFRAME = 0.26
const DODGE_CD = 0.7
const DODGE_SPEED = 640

// 콤보 1~3단. from~to 구간에서만 타격이 들어간다
export const ATTACKS = [
  { dur: 0.3, from: 0.08, to: 0.2, range: 68, half: 0.95, dmg: 12, kb: 130, lunge: 50, hitstop: 0.04, shake: 5 },
  { dur: 0.32, from: 0.08, to: 0.22, range: 76, half: 1.0, dmg: 14, kb: 170, lunge: 60, hitstop: 0.05, shake: 6 },
  { dur: 0.5, from: 0.16, to: 0.34, range: 96, half: 1.3, dmg: 26, kb: 460, lunge: 110, hitstop: 0.12, shake: 14, finisher: true },
]

export const ENEMY_TYPES = {
  slime: { name: '슬라임', hp: 30, speed: 62, dmg: 8, r: 16, color: '#5fe0b0', windup: 0.7, range: 38, cool: 1.5, score: 10 },
  goblin: { name: '고블린', hp: 44, speed: 108, dmg: 11, r: 15, color: '#7ccc4a', windup: 0.45, range: 42, cool: 1.0, score: 20 },
}

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function angleDiff(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d)
}

export function createWorld() {
  const trees = []
  for (let i = 0; i < 70; i++) {
    trees.push({ x: rand(40, WORLD_W - 40), y: rand(40, WORLD_H - 40), s: rand(0.8, 1.3) })
  }
  return {
    t: 0,
    hitstop: 0,
    shake: 0,
    over: false,
    notice: '',
    noticeT: 0,
    player: {
      x: WORLD_W / 2, y: WORLD_H / 2, r: 15, hp: 100, maxHp: 100,
      fx: 1, fy: 0, // 바라보는 방향
      inv: 0, hurt: 0, moving: false, walk: 0,
      kx: 0, ky: 0,
      atk: null, // { step, t, hit: Set, queued }
      lastStep: 0, comboTimer: 0,
      dodge: null, dodgeCd: 0,
    },
    enemies: [],
    fx: [],
    trees,
    kills: 0,
    wave: 0,
    waveTimer: 1.2,
    combo: 0,
    bestCombo: 0,
    comboT: 0,
    score: 0,
  }
}

function notice(w, msg) {
  w.notice = msg
  w.noticeT = 1.8
}

function moveBody(o, dx, dy) {
  o.x = clamp(o.x + dx, o.r, WORLD_W - o.r)
  o.y = clamp(o.y + dy, o.r, WORLD_H - o.r)
}

function nearestEnemy(w, x, y, maxD) {
  let best = null
  let bd = maxD * maxD
  for (const e of w.enemies) {
    if (e.dead) continue
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

function hitEnemy(w, e, A, step) {
  const p = w.player
  const d = Math.hypot(e.x - p.x, e.y - p.y) || 1
  const ux = (e.x - p.x) / d
  const uy = (e.y - p.y) / d
  e.hp -= A.dmg
  e.flash = 0.12
  e.stagger = A.finisher ? 0.5 : 0.22 // 맞은 적은 잠깐 행동을 멈춘다 (예고 공격도 취소)
  e.state = 'chase'
  e.kx = ux * A.kb
  e.ky = uy * A.kb
  burst(w, e.x, e.y, e.color, A.finisher ? 16 : 8)
  damageText(w, e.x, e.y - e.r - 6, String(A.dmg), A.finisher ? '#ffd447' : '#ffffff')
  p.comboTimer = COMBO_WINDOW
  w.combo += 1
  w.comboT = COMBO_RESET
  w.bestCombo = Math.max(w.bestCombo, w.combo)
  w.hitstop = Math.max(w.hitstop, A.hitstop)
  w.shake = Math.max(w.shake, A.shake)
  if (e.hp <= 0 && !e.dead) killEnemy(w, e)
  void step
}

function killEnemy(w, e) {
  e.dead = true
  w.kills += 1
  w.score += ENEMY_TYPES[e.type].score * Math.max(1, w.combo)
  burst(w, e.x, e.y, e.color, 18)
  damageText(w, e.x, e.y - 24, '처치!', '#5ee6ff')
}

function hurtPlayer(w, dmg, fromX, fromY) {
  const p = w.player
  if (w.over || p.inv > 0) return
  p.hp = Math.max(0, p.hp - dmg)
  p.inv = 0.6
  p.hurt = 0.25
  w.shake = Math.max(w.shake, 10)
  w.hitstop = Math.max(w.hitstop, 0.04)
  const d = Math.hypot(p.x - fromX, p.y - fromY) || 1
  p.kx = ((p.x - fromX) / d) * 180
  p.ky = ((p.y - fromY) / d) * 180
  if (p.atk) p.atk = null // 맞으면 공격이 끊긴다
  damageText(w, p.x, p.y - 26, `-${dmg}`, '#ff5a6a')
  burst(w, p.x, p.y, '#ff5a6a', 8)
  if (p.hp <= 0) {
    w.over = true
    notice(w, '쓰러졌다! R 키로 다시 시작')
  }
}

function spawnWave(w) {
  const p = w.player
  const n = 2 + Math.floor(w.wave * 1.5)
  for (let i = 0; i < n; i++) {
    let x = 0
    let y = 0
    for (let tries = 0; tries < 30; tries++) {
      x = rand(60, WORLD_W - 60)
      y = rand(60, WORLD_H - 60)
      if (Math.hypot(x - p.x, y - p.y) > 320) break
    }
    const type = w.wave >= 2 && Math.random() < 0.4 ? 'goblin' : 'slime'
    const spec = ENEMY_TYPES[type]
    w.enemies.push({
      id: Math.random(), type, x, y, r: spec.r, hp: spec.hp + Math.floor(w.wave / 2) * 4, maxHp: spec.hp + Math.floor(w.wave / 2) * 4,
      color: spec.color, state: 'spawn', delay: 0.6 + i * 0.12, cd: 0, wt: 0, stagger: 0, flash: 0, kx: 0, ky: 0, dead: false,
    })
  }
}

// 입력: { dx, dy } 이동 방향, attack/dodge 는 이번 프레임에 누른 것만 true
export function update(w, dt, input) {
  if (w.over) return w
  if (w.noticeT > 0) w.noticeT -= dt
  if (w.hitstop > 0) {
    // 타격 순간: 시간을 잠깐 멈춘다 (엘소드 같은 묵직한 타격감)
    w.hitstop -= dt
    return w
  }
  w.t += dt
  const p = w.player
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 40)
  if (p.inv > 0) p.inv -= dt
  if (p.hurt > 0) p.hurt -= dt
  if (p.dodgeCd > 0) p.dodgeCd -= dt
  if (p.comboTimer > 0) p.comboTimer -= dt
  if (w.comboT > 0) {
    w.comboT -= dt
    if (w.comboT <= 0) w.combo = 0
  }
  // 넉백 (맞았을 때 밀려난다)
  if (p.kx || p.ky) {
    moveBody(p, p.kx * dt, p.ky * dt)
    const k = Math.exp(-dt * 10)
    p.kx *= k
    p.ky *= k
    if (Math.abs(p.kx) < 1 && Math.abs(p.ky) < 1) { p.kx = 0; p.ky = 0 }
  }

  // 1) 이동 방향과 바라보는 방향
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

  // 2) 회피: 누른 순간 구르기 시작, 짧은 무적 시간
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
    moveBody(p, p.dodge.dx * DODGE_SPEED * dt, p.dodge.dy * DODGE_SPEED * dt)
    if (p.dodge.t <= 0) p.dodge = null
  } else if (p.moving) {
    const sp = PLAYER_SPEED * (p.atk ? ATTACK_MOVE : 1)
    moveBody(p, mx * sp * dt, my * sp * dt)
  }

  // 3) 공격 입력: 공격 중에 누르면 다음 콤보를 예약한다
  if (input.attack && !p.dodge) {
    if (!p.atk) {
      const next = p.lastStep >= 3 || p.comboTimer <= 0 ? 1 : p.lastStep + 1
      startAttack(w, next)
    } else if (p.atk.step < 3) {
      p.atk.queued = true
    }
  }

  // 4) 공격 진행과 타격 판정
  if (p.atk) {
    const A = ATTACKS[p.atk.step - 1]
    const prev = p.atk.t
    p.atk.t += dt
    if (p.atk.t >= A.from && p.atk.t <= A.to && p.atk.lunge) {
      // 목표를 향해 찌르듯 앞으로 조금 밀린다
      const v = A.lunge / (A.to - A.from)
      moveBody(p, p.fx * v * dt, p.fy * v * dt)
    }
    // 타격 구간에 들어왔을 때 한 번만 베기 연출
    if (prev < A.from && p.atk.t >= A.from) {
      fx(w, { type: 'slash', x: p.x, y: p.y, ang: Math.atan2(p.fy, p.fx), half: A.half, range: A.range, finisher: !!A.finisher, life: 0.22, max: 0.22 })
    }
    if (p.atk.t >= A.from && p.atk.t <= A.to) {
      const base = Math.atan2(p.fy, p.fx)
      for (const e of w.enemies) {
        if (e.dead || p.atk.hit.has(e)) continue
        const d = Math.hypot(e.x - p.x, e.y - p.y)
        if (d > A.range + e.r) continue
        const ang = Math.atan2(e.y - p.y, e.x - p.x)
        if (angleDiff(ang, base) > A.half) continue
        p.atk.hit.add(e)
        hitEnemy(w, e, A, p.atk.step)
        if (w.hitstop > 0) break // 한 프레임에 여러 적을 맞혀도 멈춤은 한 번만
      }
    }
    if (p.atk && p.atk.t >= A.dur) {
      if (p.atk.queued && p.atk.step < 3) {
        startAttack(w, p.atk.step + 1)
      } else {
        p.lastStep = p.atk.step
        p.atk = null
        if (p.lastStep >= 3) p.comboTimer = 0
        else p.comboTimer = COMBO_WINDOW
      }
    }
  }

  // 5) 적 행동
  for (const e of w.enemies) {
    if (e.dead) continue
    if (e.flash > 0) e.flash -= dt
    if (e.stagger > 0) e.stagger -= dt
    if (e.kx || e.ky) {
      moveBody(e, e.kx * dt, e.ky * dt)
      const k = Math.exp(-dt * 9)
      e.kx *= k
      e.ky *= k
    }
    if (e.state === 'spawn') {
      e.delay -= dt
      if (e.delay <= 0) e.state = 'chase'
      continue
    }
    const spec = ENEMY_TYPES[e.type]
    const dx = p.x - e.x
    const dy = p.y - e.y
    const d = Math.hypot(dx, dy) || 1
    if (e.state === 'windup') {
      // 예고 중이다. 맞으면 취소되고, 끝나면 공격한다
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
      // 추격
      e.x += (dx / d) * spec.speed * dt
      e.y += (dy / d) * spec.speed * dt
      e.x = clamp(e.x, e.r, WORLD_W - e.r)
      e.y = clamp(e.y, e.r, WORLD_H - e.r)
      if (d < spec.range + p.r + e.r) {
        e.state = 'windup'
        e.wt = spec.windup
      }
    }
  }
  // 적끼리는 겹치지 않게 살짝 밀어낸다
  for (let i = 0; i < w.enemies.length; i++) {
    const a = w.enemies[i]
    if (a.dead || a.state === 'spawn') continue
    for (let j = i + 1; j < w.enemies.length; j++) {
      const b = w.enemies[j]
      if (b.dead || b.state === 'spawn') continue
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

  // 6) 죽은 적 정리, 웨이브
  w.enemies = w.enemies.filter((e) => !e.dead)
  if (w.enemies.length === 0) {
    w.waveTimer -= dt
    if (w.waveTimer <= 0) {
      w.wave += 1
      spawnWave(w)
      w.waveTimer = 1.5
      notice(w, `웨이브 ${w.wave}`)
      if (w.wave === 2) notice(w, '웨이브 2: 고블린이 나타났다!')
    }
  }

  // 7) 효과 (파티클, 텍스트, 베기 자국, 범위 표시)
  for (const f of w.fx) {
    f.life -= dt
    f.x += (f.vx || 0) * dt
    f.y += (f.vy || 0) * dt
    if (f.vx) f.vx *= 0.9
    if (f.vy && f.type === 'dot') f.vy *= 0.9
  }
  w.fx = w.fx.filter((f) => f.life > 0)
  return w
}

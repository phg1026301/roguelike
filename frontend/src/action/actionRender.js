// 검의 길: 그림 담당.
// - 스프라이트 시트(public/action/sprites/*.png)가 있으면 그림을 쓰고, 없으면 도형으로 그린 기본 그림을 쓴다
// - 배경은 한 번만 미리 그려 두고(캐시), 캐릭터와 적은 그라디언트·하이라이트·그림자로 입체감을 준다
import {
  VIEW_W, VIEW_H, ZONES, ATTACKS, ENEMY_TYPES, CLASSES, RARITY_NAME,
  TOWN_PORTAL, FIELD_RETURN, CAVE, DUNGEON_EXIT, worldSize, xpNeed, maxHpOf,
} from './actionEngine'

const OUT = '#14201a' // 외곽선 색 (완전한 검정보다 부드럽게)

// 결정적 난수 (배경 무늬가 매번 같게)
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// 색을 조금 밝게 (#rrggbb 입력)
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) + 255 * amt)
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt)
  const b = Math.min(255, (n & 255) + 255 * amt)
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

function ellipseShadow(ctx, x, y, rx, ry, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx)
  g.addColorStop(0, `rgba(10,30,15,${alpha})`)
  g.addColorStop(1, 'rgba(10,30,15,0)')
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  ctx.translate(-x, -y)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------- 스프라이트 시트 ----------
// 파일 규칙: public/action/sprites/<이름>.png
// 가로 4칸(프레임) × 세로 행. 행: 0 기본, 1 걷기(적은 예고 동작), 2 공격(적은 피격), 3 회피·피격
// 한 칸은 정사각형이어야 한다 (예: 256×256 이면 한 칸 64×64, 행은 4개)
// 파일이 없으면 자동으로 도형 그림을 쓴다.
const SPRITE_BASE = ((import.meta.env && import.meta.env.BASE_URL) || '/') + 'action/sprites/'
const sheets = {}

function sheetOf(name) {
  let rec = sheets[name]
  if (!rec) {
    const img = new Image()
    rec = { img, ok: false }
    img.onload = () => { rec.ok = img.naturalWidth > 0 }
    img.onerror = () => { rec.ok = false }
    img.src = SPRITE_BASE + name + '.png'
    sheets[name] = rec
  }
  return rec
}

// 발끝이 (x, y)에 오도록 그린다. 그릴 수 있었으면 true
function drawSheet(ctx, name, row, x, y, size, t, facingLeft) {
  const rec = sheetOf(name)
  if (!rec.ok) return false
  const img = rec.img
  const cols = 4
  const fw = img.width / cols
  const fh = fw
  const rows = Math.max(1, Math.floor(img.height / fh))
  const r = Math.min(row, rows - 1)
  const frame = Math.floor(t * 8) % cols
  ctx.save()
  ctx.translate(x, y)
  if (facingLeft) ctx.scale(-1, 1)
  ctx.drawImage(img, frame * fw, r * fh, fw, fh, -size / 2, -size, size, size)
  ctx.restore()
  return true
}

// ---------- 배경 캐시 ----------
const bgCache = {}
// 배경 그림도 화면 배율에 맞춰 미리 크게 그린다 (최대 2배)
const BG_S = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)

function buildFieldBg() {
  const { w, h } = ZONES.field
  const c = document.createElement('canvas')
  c.width = w * BG_S
  c.height = h * BG_S
  const ctx = c.getContext('2d')
  ctx.scale(BG_S, BG_S)
  const rnd = seeded(7)
  // 기본 풀밭: 위에서 아래로 밝기가 달라진다
  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#9be070')
  base.addColorStop(0.5, '#86cc5c')
  base.addColorStop(1, '#6eb24a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  // 짙은 풀 얼룩과 밝은 얼룩 (입체감)
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = 60 + rnd() * 140
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const dark = rnd() < 0.5
    g.addColorStop(0, dark ? 'rgba(40,110,40,0.16)' : 'rgba(230,255,160,0.14)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 흙길 (마을 입구에서 가운데를 지나 동굴까지)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(160,120,70,0.55)'
  ctx.lineWidth = 90
  ctx.beginPath()
  ctx.moveTo(0, 500)
  ctx.bezierCurveTo(400, 480, 600, 540, 900, 500)
  ctx.bezierCurveTo(1200, 460, 1400, 520, 1540, 500)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(190,150,95,0.5)'
  ctx.lineWidth = 60
  ctx.stroke()
  ctx.restore()
  // 풀 잎 표현 (짧은 획을 흩뿌린다)
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const dark = rnd() < 0.6
    ctx.strokeStyle = dark ? 'rgba(45,105,40,0.55)' : 'rgba(210,255,150,0.55)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    const L = 5 + rnd() * 6
    const lean = (rnd() - 0.5) * 4
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + lean, y - L * 0.5, x + lean * 1.6, y - L)
    ctx.stroke()
  }
  // 꽃
  const flowers = ['#ffffff', '#ffd9f0', '#ffe066', '#c7b5ff']
  for (let i = 0; i < 160; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const col = flowers[Math.floor(rnd() * flowers.length)]
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ffb020'
    ctx.beginPath()
    ctx.arc(x, y, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // 바위
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = 8 + rnd() * 10
    ellipseShadow(ctx, x + 3, y + r * 0.6, r * 1.2, r * 0.5, 0.3)
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r)
    g.addColorStop(0, '#d8dde0')
    g.addColorStop(1, '#7d878d')
    ctx.fillStyle = g
    ctx.strokeStyle = OUT
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  return c
}

function buildTownBg() {
  const { w, h } = ZONES.town
  const c = document.createElement('canvas')
  c.width = w * BG_S
  c.height = h * BG_S
  const ctx = c.getContext('2d')
  ctx.scale(BG_S, BG_S)
  const rnd = seeded(11)
  // 풀밭 테두리
  const grass = ctx.createLinearGradient(0, 0, 0, h)
  grass.addColorStop(0, '#9be070')
  grass.addColorStop(1, '#6eb24a')
  ctx.fillStyle = grass
  ctx.fillRect(0, 0, w, h)
  // 중앙 광장: 돌 타일
  ctx.fillStyle = '#d9cdb4'
  ctx.beginPath()
  ctx.roundRect(60, 200, 840, 380, 24)
  ctx.fill()
  for (let gx = 60; gx < 900; gx += 56) {
    for (let gy = 200; gy < 580; gy += 40) {
      const off = ((gx / 56 + gy / 40) % 2) * 20
      const shade = 0.92 + rnd() * 0.12
      ctx.fillStyle = `rgba(${Math.floor(230 * shade)},${Math.floor(218 * shade)},${Math.floor(190 * shade)},1)`
      ctx.strokeStyle = 'rgba(120,100,70,0.45)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.roundRect(gx + off - 20, gy, 54, 36, 5)
      ctx.fill()
      ctx.stroke()
    }
  }
  // 광장 가장자리 그림자
  const edge = ctx.createLinearGradient(0, 180, 0, 210)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = edge
  ctx.fillRect(60, 180, 840, 30)
  // 풀 잎
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w
    const y = rnd() * h
    if (x > 60 && x < 900 && y > 200 && y < 580) continue
    ctx.strokeStyle = rnd() < 0.6 ? 'rgba(45,105,40,0.55)' : 'rgba(210,255,150,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const L = 5 + rnd() * 6
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + 1, y - L * 0.5, x + 2, y - L)
    ctx.stroke()
  }
  return c
}

function buildDungeonBg() {
  const { w, h } = ZONES.dungeon
  const c = document.createElement('canvas')
  c.width = w * BG_S
  c.height = h * BG_S
  const ctx = c.getContext('2d')
  ctx.scale(BG_S, BG_S)
  const rnd = seeded(23)
  ctx.fillStyle = '#2a2a33'
  ctx.fillRect(0, 0, w, h)
  // 석판 바닥
  for (let gx = 0; gx < w; gx += 64) {
    for (let gy = 0; gy < h; gy += 64) {
      const shade = 0.85 + rnd() * 0.22
      ctx.fillStyle = `rgb(${Math.floor(62 * shade)},${Math.floor(62 * shade)},${Math.floor(74 * shade)})`
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(gx + 2, gy + 2, 60, 60, 4)
      ctx.fill()
      ctx.stroke()
    }
  }
  // 가운데 붉은 카펫
  const carpet = ctx.createLinearGradient(w / 2 - 70, 0, w / 2 + 70, 0)
  carpet.addColorStop(0, '#5a1420')
  carpet.addColorStop(0.5, '#8a2233')
  carpet.addColorStop(1, '#5a1420')
  ctx.fillStyle = carpet
  ctx.fillRect(w / 2 - 70, 0, 140, h)
  ctx.strokeStyle = 'rgba(230,180,80,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(w / 2 - 62, 8, 124, h - 16)
  // 균열과 이끼
  for (let i = 0; i < 80; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const g = ctx.createRadialGradient(x, y, 0, x, y, 50 + rnd() * 60)
    g.addColorStop(0, 'rgba(30,70,40,0.25)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 110, y - 110, 220, 220)
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 30; i++) {
    let x = rnd() * w
    let y = rnd() * h
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 30
      y += (rnd() - 0.5) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // 횃불 빛 (모서리)
  for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 220)
    g.addColorStop(0, 'rgba(255,170,80,0.35)')
    g.addColorStop(1, 'rgba(255,170,80,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  // 가장자리 어둠
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)
  return c
}

function getBg(zone) {
  if (!bgCache[zone]) {
    bgCache[zone] = zone === 'field' ? buildFieldBg() : zone === 'dungeon' ? buildDungeonBg() : buildTownBg()
  }
  return bgCache[zone]
}

// ---------- 나무 ----------
function drawTree(ctx, t) {
  const s = t.s
  ellipseShadow(ctx, t.x + 6 * s, t.y + 16 * s, 30 * s, 10 * s, 0.4)
  // 줄기
  const tg = ctx.createLinearGradient(t.x - 6 * s, 0, t.x + 6 * s, 0)
  tg.addColorStop(0, '#5a3a20')
  tg.addColorStop(0.5, '#8a5e36')
  tg.addColorStop(1, '#4a2e18')
  ctx.fillStyle = tg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.roundRect(t.x - 6 * s, t.y - 2 * s, 12 * s, 22 * s, 3)
  ctx.fill()
  ctx.stroke()
  // 나뭇잎 덩어리: 어두운 뒤쪽 → 밝은 앞쪽 순으로 겹친다
  const blobs = [
    [-14, -18, 17, '#2f7a3a'], [14, -16, 16, '#2f7a3a'], [0, -30, 18, '#3c9448'],
    [-8, -10, 16, '#46a052'], [10, -8, 15, '#46a052'], [0, -22, 15, '#58b662'],
  ]
  for (const [bx, by, br, col] of blobs) {
    const x = t.x + bx * s
    const y = t.y + by * s
    const r = br * s
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
    g.addColorStop(0, lighten(col, 0.28))
    g.addColorStop(1, col)
    ctx.fillStyle = g
    ctx.strokeStyle = OUT
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  // 햇빛 하이라이트
  ctx.fillStyle = 'rgba(230,255,190,0.35)'
  ctx.beginPath()
  ctx.arc(t.x - 8 * s, t.y - 30 * s, 5 * s, 0, Math.PI * 2)
  ctx.fill()
}

// ---------- 적 ----------
function drawWarning(ctx, e, spec) {
  // 예고: 공격 범위가 차오른다
  const k = 1 - e.wt / spec.windup
  const g = ctx.createRadialGradient(e.x, e.y, spec.range * 0.2, e.x, e.y, spec.range + e.r)
  g.addColorStop(0, `rgba(255,70,80,${0.05 + k * 0.1})`)
  g.addColorStop(1, `rgba(255,70,80,${0.22 + k * 0.25})`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(e.x, e.y, spec.range + e.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(255,90,90,${0.5 + k * 0.5})`
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -k * 40
  ctx.stroke()
  ctx.setLineDash([])
}

// 보스 돌진 예고: 방향으로 뻗는 띠
function drawChargeLine(ctx, e, alpha) {
  const len = 320
  const ex = e.x + e.dirx * len
  const ey = e.y + e.diry * len
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = 'rgba(255,90,70,0.8)'
  ctx.lineWidth = e.r * 1.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(e.x, e.y)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.restore()
}

function drawSlime(ctx, e, t, flash) {
  const r = e.r
  const wob = Math.sin(t * 6 + e.id * 9)
  const sx = 1 + wob * 0.06
  const sy = 1 - wob * 0.06
  const body = flash ? '#ffffff' : '#5fe0b0'
  const deep = flash ? '#ffffff' : '#2aa37a'
  ellipseShadow(ctx, e.x, e.y + r * 0.85, r * 1.2, r * 0.45, 0.35)
  ctx.save()
  ctx.translate(e.x, e.y + r * 0.2)
  ctx.scale(sx, sy)
  // 젤리 몸: 가장자리 진하고 가운데 밝은 방사형 그라디언트
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.3)
  g.addColorStop(0, lighten(body, 0.35))
  g.addColorStop(0.55, body)
  g.addColorStop(1, deep)
  ctx.fillStyle = g
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-r * 1.2, r * 0.2)
  ctx.bezierCurveTo(-r * 1.3, -r * 1.2, r * 1.3, -r * 1.2, r * 1.2, r * 0.2)
  ctx.bezierCurveTo(r * 1.1, r * 0.9, -r * 1.1, r * 0.9, -r * 1.2, r * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 속에 떠 있는 핵
  ctx.fillStyle = flash ? '#ffffff' : 'rgba(180,255,230,0.55)'
  ctx.beginPath()
  ctx.arc(r * 0.25, r * 0.05, r * 0.28, 0, Math.PI * 2)
  ctx.fill()
  // 윤기 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.5, -r * 0.55, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  eyes(ctx, e.x, e.y - r * 0.05, r * 0.42, e, 3.2, flash)
}

function drawGoblin(ctx, e, t, flash) {
  const r = e.r
  const bob = Math.sin(t * 9 + e.id * 5) * 1.5
  const cy = e.y + bob
  ellipseShadow(ctx, e.x, e.y + r * 1.0, r * 1.1, r * 0.4, 0.35)
  const skin = flash ? '#ffffff' : '#7ccc4a'
  const skinDark = flash ? '#ffffff' : '#4f9a2c'
  // 귀
  ctx.fillStyle = skin
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(e.x + s * r * 0.8, cy - r * 0.1)
    ctx.quadraticCurveTo(e.x + s * r * 1.9, cy - r * 0.9, e.x + s * r * 1.6, cy - r * 0.2)
    ctx.quadraticCurveTo(e.x + s * r * 1.1, cy + r * 0.1, e.x + s * r * 0.8, cy + r * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  // 몸 (누더기 옷)
  ctx.fillStyle = flash ? '#ffffff' : '#7a5230'
  ctx.beginPath()
  ctx.moveTo(e.x - r * 0.8, cy + r * 0.5)
  ctx.lineTo(e.x + r * 0.8, cy + r * 0.5)
  ctx.lineTo(e.x + r * 0.9, cy + r * 1.25)
  ctx.lineTo(e.x - r * 0.9, cy + r * 1.25)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 머리
  const g = ctx.createRadialGradient(e.x - r * 0.3, cy - r * 0.4, 2, e.x, cy, r * 1.2)
  g.addColorStop(0, lighten(skin, 0.2))
  g.addColorStop(1, skinDark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(e.x, cy, r * 0.95, r * 0.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 이빨과 넓은 입
  ctx.fillStyle = flash ? '#ffffff' : '#e8e3c8'
  ctx.beginPath()
  ctx.moveTo(e.x - r * 0.45, cy + r * 0.45)
  ctx.lineTo(e.x - r * 0.25, cy + r * 0.7)
  ctx.lineTo(e.x - r * 0.1, cy + r * 0.45)
  ctx.moveTo(e.x + r * 0.1, cy + r * 0.45)
  ctx.lineTo(e.x + r * 0.25, cy + r * 0.7)
  ctx.lineTo(e.x + r * 0.45, cy + r * 0.45)
  ctx.fill()
  ctx.fillStyle = '#3a1a10'
  ctx.beginPath()
  ctx.ellipse(e.x, cy + r * 0.42, r * 0.5, r * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  // 단검
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.fillStyle = '#dfe6ee'
  ctx.beginPath()
  ctx.moveTo(e.x + r * 1.05, cy + r * 0.2)
  ctx.lineTo(e.x + r * 1.7, cy - r * 0.2)
  ctx.lineTo(e.x + r * 1.05, cy + r * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  eyes(ctx, e.x, cy - r * 0.2, r * 0.36, e, 2.6, flash, true)
}

// 보스 그롬: 큰 몸, 뿔, 도끼. 눈 색이 체력에 따라 변한다
function drawBossBody(ctx, e, t, flash) {
  const r = e.r
  const cy = e.y + Math.sin(t * 3) * 3
  const ratio = e.hp / e.maxHp
  const eyeCol = ratio > 0.66 ? '#ffd447' : ratio > 0.33 ? '#ff8a2a' : '#ff3a3a'
  ellipseShadow(ctx, e.x, e.y + r * 1.0, r * 1.3, r * 0.45, 0.4)
  const skin = flash ? '#ffffff' : '#9aa048'
  const skinDark = flash ? '#ffffff' : '#5d6a22'
  // 뿔
  ctx.fillStyle = flash ? '#ffffff' : '#efe6c8'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(e.x + s * r * 0.55, cy - r * 0.6)
    ctx.quadraticCurveTo(e.x + s * r * 1.45, cy - r * 1.2, e.x + s * r * 1.15, cy - r * 1.9)
    ctx.quadraticCurveTo(e.x + s * r * 1.0, cy - r * 1.1, e.x + s * r * 0.85, cy - r * 0.45)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  // 몸: 가죽 갑옷
  const bg = ctx.createLinearGradient(e.x - r, cy, e.x + r, cy + r * 1.6)
  bg.addColorStop(0, flash ? '#ffffff' : '#6a5a48')
  bg.addColorStop(0.5, flash ? '#ffffff' : '#4a3c30')
  bg.addColorStop(1, flash ? '#ffffff' : '#2a2018')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(e.x - r * 1.05, cy + r * 0.25, r * 2.1, r * 1.35, r * 0.45)
  ctx.fill()
  ctx.stroke()
  // 가슴 장식 (금속 판)
  ctx.fillStyle = flash ? '#ffffff' : '#8a8f9c'
  ctx.beginPath()
  ctx.roundRect(e.x - r * 0.45, cy + r * 0.4, r * 0.9, r * 0.5, 4)
  ctx.fill()
  ctx.stroke()
  // 머리
  const g = ctx.createRadialGradient(e.x - r * 0.3, cy - r * 0.4, 3, e.x, cy - r * 0.2, r * 1.2)
  g.addColorStop(0, lighten(skin, 0.18))
  g.addColorStop(1, skinDark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(e.x, cy - r * 0.2, r * 0.95, r * 0.85, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 눈: 체력에 따라 붉게 변한다
  for (const s of [-1, 1]) {
    const ex = e.x + s * r * 0.38
    const ey = cy - r * 0.35
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.22, r * 0.17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = flash ? '#ffffff' : eyeCol
    ctx.beginPath()
    ctx.arc(ex + (e.x - e.x) * 0, ey, r * 0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = OUT
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(ex - s * r * 0.3, ey - r * 0.32)
    ctx.lineTo(ex + s * r * 0.2, ey - r * 0.12)
    ctx.stroke()
  }
  // 입과 송곳니
  ctx.fillStyle = '#2a120a'
  ctx.beginPath()
  ctx.ellipse(e.x, cy + r * 0.35, r * 0.5, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = flash ? '#ffffff' : '#f2ecd6'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(e.x + s * r * 0.28, cy + r * 0.22)
    ctx.lineTo(e.x + s * r * 0.36, cy + r * 0.52)
    ctx.lineTo(e.x + s * r * 0.44, cy + r * 0.24)
    ctx.closePath()
    ctx.fill()
  }
  // 도끼 (오른쪽)
  const ax = e.x + r * 1.25
  const ay = cy + r * 0.2
  ctx.strokeStyle = '#6a4220'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(ax, ay + r * 0.9)
  ctx.lineTo(ax + r * 0.2, ay - r * 0.9)
  ctx.stroke()
  ctx.fillStyle = flash ? '#ffffff' : '#c8d2dc'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(ax + r * 0.2, ay - r * 0.9)
  ctx.quadraticCurveTo(ax + r * 0.95, ay - r * 0.85, ax + r * 0.75, ay - r * 0.35)
  ctx.lineTo(ax + r * 0.2, ay - r * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawBossEnemy(ctx, e, t, flash) {
  const row = flash ? 2 : e.state === 'slamWind' || e.state === 'chargeWind' ? 1 : e.state === 'recover' ? 3 : 0
  if (drawSheet(ctx, 'boss', row, e.x, e.y + e.r * 1.1, e.r * 3.2, t, e.dirx < 0)) return
  drawBossBody(ctx, e, t, flash)
}

// 눈: 플레이어를 바라본다. 큰 눈에 하이라이트
function eyes(ctx, x, y, gap, e, size, flash, angry = false) {
  const p = eyesTarget
  const ang = p ? Math.atan2(p.y - e.y, p.x - e.x) : 0
  const ex = Math.cos(ang) * size * 0.35
  const ey = Math.sin(ang) * size * 0.35
  for (const s of [-1, 1]) {
    const cx = x + s * gap
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = OUT
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.ellipse(cx, y, size * 0.85, size, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = flash ? '#ffffff' : '#1a1020'
    ctx.beginPath()
    ctx.arc(cx + ex, y + ey, size * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx + ex - size * 0.18, y + ey - size * 0.25, size * 0.18, 0, Math.PI * 2)
    ctx.fill()
    if (angry) {
      ctx.strokeStyle = OUT
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(cx - s * size * 1.1, y - size * 1.3)
      ctx.lineTo(cx + s * size * 0.9, y - size * 0.5)
      ctx.stroke()
    }
  }
}
let eyesTarget = null

// 적 한 마리 그리기 (상태에 따라 예고·등장 표시)
function drawEnemy(ctx, e, t, w) {
  const flash = e.flash > 0
  if (e.state === 'spawn') {
    // 등장: 땅에서 원이 번지며 나타난다
    const k = 1 - Math.max(0, e.delay) / 0.9
    ctx.save()
    ctx.globalAlpha = 0.6 * (1 - k * 0.5)
    ctx.strokeStyle = '#ff9a9a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(e.x, e.y, e.r * (0.6 + k), e.r * (0.3 + k * 0.5), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    return
  }
  if (e.boss) {
    if (e.state === 'slamWind') drawWarning(ctx, e, { windup: 1.0, range: ENEMY_TYPES.boss.range })
    if (e.state === 'chargeWind') drawChargeLine(ctx, e, 0.35 + 0.4 * (1 - e.wt / 0.7))
    if (e.state === 'charge') drawChargeLine(ctx, e, 0.6)
    return drawBossEnemy(ctx, e, t, flash)
  }
  if (e.state === 'windup') drawWarning(ctx, e, ENEMY_TYPES[e.type])
  const row = flash ? 2 : e.state === 'windup' ? 1 : 0
  const facingLeft = w.player.x < e.x
  if (drawSheet(ctx, e.type, row, e.x, e.y + e.r * 0.9, e.r * 3.2, t, facingLeft)) return
  if (e.type === 'slime') drawSlime(ctx, e, t, flash)
  else drawGoblin(ctx, e, t, flash)
}

function drawShot(ctx, s) {
  const a = Math.atan2(s.vy, s.vx)
  ctx.save()
  // 꼬리
  ctx.strokeStyle = 'rgba(120,200,255,0.45)'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(s.x - Math.cos(a) * 20, s.y - Math.sin(a) * 20)
  ctx.lineTo(s.x, s.y)
  ctx.stroke()
  // 구체: 바깥 빛 + 밝은 속
  const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 13)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(160,230,255,0.9)')
  g.addColorStop(1, 'rgba(90,160,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(s.x, s.y, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------- 플레이어 ----------
const ARMOR_COLORS = {
  none: ['#5fa8e8', '#3a7bc4', '#23508a'],
  common: ['#b08a5a', '#8a6236', '#5a3a1e'],
  rare: ['#8ad8ff', '#3a8fd0', '#1f5a94'],
  epic: ['#ffe27a', '#d9a33a', '#8a5a1a'],
}
const BLADE_COLORS = {
  none: ['#ffffff', '#b8d4e8', '#6f8aa6'],
  common: ['#ffffff', '#b8d4e8', '#6f8aa6'],
  rare: ['#ffffff', '#7fd0ff', '#2a7ac0'],
  epic: ['#fffbe0', '#ffd447', '#b07a1a'],
}

// 머리와 얼굴 (은발, 큰 눈)
function drawHead(ctx, p, y) {
  const hg = ctx.createRadialGradient(p.x - 3, y - 16, 2, p.x, y - 12, 14)
  hg.addColorStop(0, '#ffe6cc')
  hg.addColorStop(1, '#e0a878')
  ctx.fillStyle = hg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(p.x, y - 13, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  const hair = ctx.createLinearGradient(p.x, y - 26, p.x, y - 12)
  hair.addColorStop(0, '#f2f6ff')
  hair.addColorStop(1, '#9aa8c0')
  ctx.fillStyle = hair
  ctx.beginPath()
  ctx.arc(p.x, y - 15, 12, Math.PI * 1.05, Math.PI * 1.95)
  ctx.quadraticCurveTo(p.x + 12, y - 6, p.x + 9, y - 2)
  ctx.quadraticCurveTo(p.x + 6, y - 14, p.x - 1, y - 16)
  ctx.quadraticCurveTo(p.x - 8, y - 12, p.x - 12, y - 3)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  const ox = p.fx * 1.8
  const oy = p.fy * 1.2
  for (const s of [-1, 1]) {
    const cx = p.x + s * 4.2 + ox
    const cy = y - 12 + oy
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = OUT
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(cx, cy, 3, 3.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#2a5fd0'
    ctx.beginPath()
    ctx.arc(cx + ox * 0.3, cy + 0.5, 2.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx + ox * 0.3 - 0.8, cy - 1, 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,120,130,0.35)'
  ctx.beginPath()
  ctx.ellipse(p.x - 7, y - 8, 2.4, 1.6, 0, 0, Math.PI * 2)
  ctx.ellipse(p.x + 7, y - 8, 2.4, 1.6, 0, 0, Math.PI * 2)
  ctx.fill()
}

// 검사: 망토, 갑옷(장비 등급에 따라 색), 검
function drawKnight(ctx, p, t, y, w) {
  const sway = Math.sin(t * 5) * 3 + (p.moving ? Math.sin(p.walk) * 4 : 0)
  const cg = ctx.createLinearGradient(p.x, y - 8, p.x, y + 26)
  cg.addColorStop(0, '#8a3ec8')
  cg.addColorStop(1, '#4a1f7a')
  ctx.fillStyle = cg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(p.x - 9, y - 4)
  ctx.quadraticCurveTo(p.x - 20 + sway, y + 10, p.x - 14 + sway, y + 28)
  ctx.lineTo(p.x + 14 + sway * 0.4, y + 26)
  ctx.quadraticCurveTo(p.x + 9, y + 10, p.x + 9, y - 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  const stride = p.moving && !p.dodge ? Math.sin(p.walk) * 4 : 0
  ctx.fillStyle = '#2b2233'
  ctx.beginPath()
  ctx.ellipse(p.x - 5 + stride, y + 17, 5, 4, 0, 0, Math.PI * 2)
  ctx.ellipse(p.x + 5 - stride, y + 17, 5, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  const cols = p.hurt > 0 ? ['#ffb0b8', '#ff8a9a', '#c85a6a'] : ARMOR_COLORS[w.equip.armor?.rarity || 'none']
  const bg = ctx.createLinearGradient(p.x - 12, y, p.x + 12, y + 16)
  bg.addColorStop(0, cols[0])
  bg.addColorStop(0.5, cols[1])
  bg.addColorStop(1, cols[2])
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(p.x - 12, y - 4, 24, 22, 7)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.ellipse(p.x - 4, y + 2, 4, 6, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e3b44f'
  ctx.fillRect(p.x - 12, y + 12, 24, 4)
  ctx.strokeRect(p.x - 12, y + 12, 24, 4)

  drawHead(ctx, p, y)

  // 검: 금속 날 + 광택. 공격 중에는 휘두른다
  let sword = Math.atan2(p.fy, p.fx)
  let reach = 0
  if (p.atk) {
    const A = ATTACKS[p.atk.step - 1]
    const k = Math.min(1, Math.max(0, (p.atk.t - A.from) / (A.to - A.from)))
    sword += -A.half + k * A.half * 2
    reach = A.finisher ? 8 : 2
  }
  const hx = p.x + Math.cos(sword) * 9
  const hy = y + Math.sin(sword) * 9
  const tx = hx + Math.cos(sword) * (30 + reach)
  const ty = hy + Math.sin(sword) * (30 + reach)
  ctx.strokeStyle = OUT
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.moveTo(hx - Math.cos(sword) * 3, hy - Math.sin(sword) * 3); ctx.lineTo(hx + Math.cos(sword) * 2, hy + Math.sin(sword) * 2); ctx.stroke()
  ctx.strokeStyle = '#7a4a22'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(hx - Math.cos(sword) * 3, hy - Math.sin(sword) * 3); ctx.lineTo(hx + Math.cos(sword) * 2, hy + Math.sin(sword) * 2); ctx.stroke()
  const nx = -Math.sin(sword) * 2.6
  const ny = Math.cos(sword) * 2.6
  const bc = BLADE_COLORS[w.equip.weapon?.rarity || 'none']
  const bladeG = ctx.createLinearGradient(hx + nx, hy + ny, hx - nx, hy - ny)
  bladeG.addColorStop(0, bc[0])
  bladeG.addColorStop(0.5, bc[1])
  bladeG.addColorStop(1, bc[2])
  ctx.fillStyle = bladeG
  ctx.strokeStyle = OUT
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(hx + nx, hy + ny)
  ctx.lineTo(tx + nx * 0.2, ty + ny * 0.2)
  ctx.lineTo(tx + Math.cos(sword) * 6, ty + Math.sin(sword) * 6)
  ctx.lineTo(tx - nx * 0.2, ty - ny * 0.2)
  ctx.lineTo(hx - nx, hy - ny)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(hx + nx * 0.4, hy + ny * 0.4)
  ctx.lineTo(tx + nx * 0.1, ty + ny * 0.1)
  ctx.stroke()
  ctx.fillStyle = '#e3b44f'
  ctx.strokeStyle = OUT
  ctx.beginPath()
  ctx.ellipse(hx, hy, 4, 6, sword + Math.PI / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

// 마법사: 긴 로브, 뾰족 모자, 빛나는 지팡이
function drawMage(ctx, p, t, y, w) {
  const sway = Math.sin(t * 4) * 2 + (p.moving ? Math.sin(p.walk) * 3 : 0)
  const rg = ctx.createLinearGradient(p.x, y - 6, p.x, y + 28)
  rg.addColorStop(0, '#7a4ad8')
  rg.addColorStop(1, '#2e1a66')
  ctx.fillStyle = p.hurt > 0 ? '#c85a6a' : rg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  // 로브 (발끝까지 내려온다)
  ctx.beginPath()
  ctx.moveTo(p.x - 9, y - 4)
  ctx.quadraticCurveTo(p.x - 17 + sway, y + 14, p.x - 15 + sway, y + 27)
  ctx.lineTo(p.x + 15 + sway * 0.4, y + 27)
  ctx.quadraticCurveTo(p.x + 17, y + 14, p.x + 9, y - 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 허리띠 (금빛)
  ctx.fillStyle = '#e3b44f'
  ctx.fillRect(p.x - 10, y + 8, 20, 3)
  ctx.strokeRect(p.x - 10, y + 8, 20, 3)
  // 로브 앞단 장식
  ctx.strokeStyle = 'rgba(255,230,160,0.6)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(p.x, y + 11)
  ctx.lineTo(p.x, y + 26)
  ctx.stroke()

  drawHead(ctx, p, y)

  // 모자: 뾰족한 원뿔과 챙, 별 장식
  ctx.fillStyle = '#3a2a7a'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(p.x, y - 20, 14, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(p.x - 11, y - 21)
  ctx.quadraticCurveTo(p.x + 2 + p.fx * 3, y - 32, p.x + 8 + sway * 0.4, y - 48)
  ctx.quadraticCurveTo(p.x + 9, y - 28, p.x + 11, y - 21)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffd447'
  ctx.beginPath()
  ctx.arc(p.x - 1, y - 30, 2.2, 0, Math.PI * 2)
  ctx.fill()

  // 지팡이: 오른손에 들고, 끝의 구슬이 빛난다 (시전 중에는 크게)
  const sx = p.x + 13
  const sy = y + 12
  const top = { x: sx + p.fx * 3, y: sy - 34 }
  ctx.strokeStyle = OUT
  ctx.lineWidth = 4.5
  ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(top.x, top.y); ctx.stroke()
  ctx.strokeStyle = '#8a5a30'
  ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(top.x, top.y); ctx.stroke()
  const pulse = 0.85 + Math.sin(t * 6) * 0.15
  const orbR = p.castT > 0 ? 9 : 6
  const og = ctx.createRadialGradient(top.x, top.y, 1, top.x, top.y, orbR * 2.4)
  og.addColorStop(0, 'rgba(255,255,255,1)')
  og.addColorStop(0.4, `rgba(140,220,255,${0.9 * pulse})`)
  og.addColorStop(1, 'rgba(90,160,255,0)')
  ctx.fillStyle = og
  ctx.beginPath()
  ctx.arc(top.x, top.y, orbR * 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8f8ff'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(top.x, top.y, orbR * 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  void w
}

function drawPlayer(ctx, p, t, w) {
  const blink = p.inv > 0 && !p.dodge && Math.floor(t * 20) % 2 === 0
  ctx.save()
  if (p.dodge) ctx.globalAlpha = 0.5
  else if (blink) ctx.globalAlpha = 0.35
  ellipseShadow(ctx, p.x, p.y + 16, 18, 6, 0.4)
  const bob = p.moving && !p.dodge ? Math.sin(p.walk) * 2 : 0
  const y = p.y + bob
  const facingLeft = p.fx < -0.2
  const row = p.dodge || p.hurt > 0 ? 3 : p.atk ? 2 : p.moving ? 1 : 0
  const sheet = w.cls === 'mage' ? 'mage' : 'knight'
  if (drawSheet(ctx, sheet, row, p.x, p.y + 16, 72, t, facingLeft)) {
    ctx.restore()
    return
  }
  if (w.cls === 'mage') drawMage(ctx, p, t, y, w)
  else drawKnight(ctx, p, t, y, w)
  ctx.restore()
}

// ---------- 마을 건물, NPC, 분수, 포탈 ----------
function drawHouse(ctx, b) {
  if (b.fountain) return drawFountain(ctx, b)
  ellipseShadow(ctx, b.x + b.w / 2, b.y + b.h + 8, b.w * 0.6, 12, 0.4)
  // 벽: 세로 그라디언트
  const wg = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y)
  wg.addColorStop(0, '#f3e6c8')
  wg.addColorStop(1, '#d6c39a')
  ctx.fillStyle = wg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.fillRect(b.x, b.y + 30, b.w, b.h - 30)
  ctx.strokeRect(b.x, b.y + 30, b.w, b.h - 30)
  // 목재 기둥 무늬
  ctx.strokeStyle = 'rgba(110,80,50,0.4)'
  ctx.lineWidth = 2
  for (let x = b.x + 22; x < b.x + b.w; x += 26) {
    ctx.beginPath()
    ctx.moveTo(x, b.y + 32)
    ctx.lineTo(x, b.y + b.h)
    ctx.stroke()
  }
  // 지붕: 삼각형 + 그라디언트
  const rg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 36)
  rg.addColorStop(0, lighten(b.roof, 0.2))
  rg.addColorStop(1, b.roof)
  ctx.fillStyle = rg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(b.x - 12, b.y + 34)
  ctx.lineTo(b.x + b.w / 2, b.y - 4)
  ctx.lineTo(b.x + b.w + 12, b.y + 34)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 간판
  ctx.fillStyle = '#2a1c12'
  ctx.beginPath()
  ctx.roundRect(b.x + b.w / 2 - 44, b.y + 40, 88, 22, 6)
  ctx.fill()
  ctx.fillStyle = '#ffe9b0'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(b.name, b.x + b.w / 2, b.y + 56)
  // 문과 창문 (불빛)
  const dg = ctx.createLinearGradient(0, b.y + b.h - 40, 0, b.y + b.h)
  dg.addColorStop(0, '#8a5a30')
  dg.addColorStop(1, '#5a3a1e')
  ctx.fillStyle = dg
  ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h - 40, 24, 40)
  ctx.strokeRect(b.x + b.w / 2 - 12, b.y + b.h - 40, 24, 40)
  for (const wx of [b.x + 26, b.x + b.w - 52]) {
    const wgl = ctx.createRadialGradient(wx + 10, b.y + 80, 2, wx + 10, b.y + 80, 22)
    wgl.addColorStop(0, '#fff3b0')
    wgl.addColorStop(1, '#e89a3a')
    ctx.fillStyle = wgl
    ctx.fillRect(wx, b.y + 66, 20, 22)
    ctx.strokeRect(wx, b.y + 66, 20, 22)
  }
}

function drawFountain(ctx, b) {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const r = Math.min(b.w, b.h) / 2
  ellipseShadow(ctx, cx, cy + 6, r * 1.3, r * 0.6, 0.35)
  const g = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy, r)
  g.addColorStop(0, '#f7f2e6')
  g.addColorStop(1, '#a89a80')
  ctx.fillStyle = g
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  const wat = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 0.8)
  wat.addColorStop(0, '#9fe8ff')
  wat.addColorStop(1, '#2a8ac8')
  ctx.fillStyle = wat
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.8, r * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()
  const tt = performance.now() / 300
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  for (let i = 0; i < 4; i++) {
    const a = tt + i * 1.6
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a * 1.3) * r * 0.2, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPortal(ctx, pt, t, label) {
  const pulse = 0.85 + Math.sin(t * 3) * 0.15
  const g = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, pt.r * 2.2)
  g.addColorStop(0, `rgba(160,255,220,${0.55 * pulse})`)
  g.addColorStop(1, 'rgba(160,255,220,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(pt.x, pt.y, pt.r * 2.2, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i === 0 ? '#b6ffe0' : i === 1 ? '#7fe0ff' : '#e0b6ff'
    ctx.lineWidth = 3 - i * 0.5
    ctx.globalAlpha = 0.9 - i * 0.2
    ctx.beginPath()
    ctx.ellipse(pt.x, pt.y, pt.r * (0.9 + i * 0.25), pt.r * (0.5 + i * 0.12), t * (1.2 + i * 0.5), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, pt.x, pt.y + pt.r + 18)
}

// 동굴 입구: 바위 아치와 어두운 입구, 안쪽에서 붉은 빛
function drawCave(ctx, pt, t) {
  ellipseShadow(ctx, pt.x, pt.y + pt.r * 0.9, pt.r * 1.7, pt.r * 0.5, 0.45)
  const rg = ctx.createRadialGradient(pt.x, pt.y - pt.r * 0.4, 6, pt.x, pt.y, pt.r * 1.5)
  rg.addColorStop(0, '#9aa0ac')
  rg.addColorStop(1, '#3a3f4a')
  ctx.fillStyle = rg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(pt.x - pt.r * 1.5, pt.y + pt.r * 0.6)
  ctx.quadraticCurveTo(pt.x - pt.r * 1.6, pt.y - pt.r * 1.3, pt.x, pt.y - pt.r * 1.35)
  ctx.quadraticCurveTo(pt.x + pt.r * 1.6, pt.y - pt.r * 1.3, pt.x + pt.r * 1.5, pt.y + pt.r * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // 입구 (어둠)
  ctx.fillStyle = '#07060c'
  ctx.beginPath()
  ctx.ellipse(pt.x, pt.y + pt.r * 0.3, pt.r * 0.8, pt.r * 0.95, 0, Math.PI, 0)
  ctx.fill()
  // 안쪽 붉은 빛
  const pulse = 0.6 + Math.sin(t * 4) * 0.4
  const ig = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, pt.r * 0.8)
  ig.addColorStop(0, `rgba(255,140,70,${0.8 * pulse})`)
  ig.addColorStop(1, 'rgba(255,140,70,0)')
  ctx.fillStyle = ig
  ctx.beginPath()
  ctx.arc(pt.x, pt.y, pt.r * 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('동굴 ▶', pt.x, pt.y - pt.r * 1.6)
}

// 던전 기둥
function drawPillar(ctx, b) {
  ellipseShadow(ctx, b.x + b.w / 2, b.y + b.h, b.w * 0.7, 8, 0.45)
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0)
  g.addColorStop(0, '#6f7480')
  g.addColorStop(0.5, '#9aa0ac')
  g.addColorStop(1, '#4d5260')
  ctx.fillStyle = g
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(b.x + 4, b.y, b.w - 8, b.h, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#b8bdc8'
  ctx.beginPath()
  ctx.roundRect(b.x - 2, b.y - 8, b.w + 4, 12, 3)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(b.x + b.w * 0.4, b.y + 14)
  ctx.lineTo(b.x + b.w * 0.6, b.y + 26)
  ctx.stroke()
}

// NPC: 로브(긴 옷)를 입은 사람 모습
function drawNpc(ctx, n, t, near) {
  const bob = Math.sin(t * 2 + n.x) * 1.2
  const y = n.y + bob
  ellipseShadow(ctx, n.x, n.y + 18, 16, 6, 0.4)
  const rg = ctx.createLinearGradient(n.x - 14, y, n.x + 14, y + 28)
  rg.addColorStop(0, lighten(n.color, 0.15))
  rg.addColorStop(1, n.color)
  ctx.fillStyle = rg
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(n.x - 8, y - 2)
  ctx.lineTo(n.x + 8, y - 2)
  ctx.lineTo(n.x + 15, y + 24)
  ctx.lineTo(n.x - 15, y + 24)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  const hg = ctx.createRadialGradient(n.x - 3, y - 14, 2, n.x, y - 12, 12)
  hg.addColorStop(0, '#ffe6cc')
  hg.addColorStop(1, '#dca072')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.arc(n.x, y - 12, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = n.hair
  ctx.beginPath()
  ctx.arc(n.x, y - 14, 11, Math.PI, 0)
  ctx.quadraticCurveTo(n.x + 6, y - 10, n.x + 9, y - 3)
  ctx.quadraticCurveTo(n.x, y - 14, n.x - 9, y - 3)
  ctx.quadraticCurveTo(n.x - 6, y - 10, n.x - 11, y - 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(n.x + s * 3.5, y - 11, 2.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a1020'
    ctx.beginPath()
    ctx.arc(n.x + s * 3.5 + 0.5, y - 10.5, 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  const label = n.name
  const tw = ctx.measureText(label).width + 14
  ctx.fillStyle = 'rgba(20,20,30,0.7)'
  ctx.beginPath()
  ctx.roundRect(n.x - tw / 2, y - 42, tw, 20, 8)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, n.x, y - 28)
  if (near) {
    const pulse = 0.8 + Math.sin(t * 6) * 0.2
    ctx.fillStyle = `rgba(255,220,90,${pulse})`
    ctx.beginPath()
    ctx.arc(n.x, y - 60, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2a1c12'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText('E', n.x, y - 55)
  }
}

// ---------- 효과 ----------
function drawFx(ctx, f) {
  ctx.save()
  const k = Math.max(0, f.life / f.max)
  if (f.type === 'slash') {
    const col = f.finisher ? '255,212,71' : '232,246,255'
    const g = ctx.createRadialGradient(f.x, f.y, f.range * 0.2, f.x, f.y, f.range)
    g.addColorStop(0, `rgba(${col},0)`)
    g.addColorStop(0.7, `rgba(${col},${0.45 * k})`)
    g.addColorStop(1, `rgba(${col},${0.05 * k})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(f.x, f.y)
    ctx.arc(f.x, f.y, f.range, f.ang - f.half, f.ang + f.half)
    ctx.closePath()
    ctx.fill()
    ctx.shadowColor = `rgb(${col})`
    ctx.shadowBlur = 14
    ctx.strokeStyle = `rgba(${col},${k})`
    ctx.lineWidth = f.finisher ? 6 : 3.5
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.range * 0.96, f.ang - f.half, f.ang + f.half)
    ctx.stroke()
  } else if (f.type === 'ring') {
    ctx.globalAlpha = k * 0.7
    ctx.strokeStyle = f.color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r * (1.3 - k * 0.3), 0, Math.PI * 2)
    ctx.stroke()
  } else if (f.type === 'dot') {
    ctx.globalAlpha = k
    ctx.fillStyle = f.color
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
    ctx.fill()
  } else if (f.type === 'text') {
    ctx.globalAlpha = Math.min(1, k * 2)
    ctx.font = 'bold 19px sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4.5
    ctx.strokeStyle = OUT
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.restore()
}

// ---------- HUD ----------
function panel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, 'rgba(18,28,24,0.82)')
  g.addColorStop(1, 'rgba(8,14,12,0.7)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(190,255,200,0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function bar(ctx, x, y, w, h, ratio, c1, c2) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  const fw = Math.max(0, Math.min(1, ratio)) * w
  if (fw > 0) {
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x, y, fw, h, h / 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.roundRect(x + 2, y + 2, Math.max(0, fw - 4), h * 0.35, h / 4)
    ctx.fill()
  }
}

function drawHud(ctx, w, t) {
  const p = w.player
  // 왼쪽 위: 체력, 물약, 골드
  panel(ctx, 14, 14, 262, 96)
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('HP', 26, 36)
  bar(ctx, 52, 24, 210, 16, p.hp / p.maxHp, '#ff7a8a', '#c93a4e')
  ctx.fillText(`${p.hp}/${p.maxHp}`, 170, 37)
  ctx.fillStyle = '#ff6a8a'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(24, 54, 14, 16, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`물약 x${w.potions}  (Q)`, 46, 67)
  const cg = ctx.createRadialGradient(30, 88, 2, 30, 90, 9)
  cg.addColorStop(0, '#fff3b0')
  cg.addColorStop(1, '#e0a020')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(30, 90, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffd447'
  ctx.fillText(`${w.gold} 골드`, 46, 95)

  // 오른쪽 위: 구역, 처치, 점수
  ctx.textAlign = 'right'
  panel(ctx, VIEW_W - 290, 14, 276, 60)
  ctx.fillStyle = '#b6ff9e'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText(ZONES[w.zone].name, VIEW_W - 26, 36)
  ctx.fillStyle = '#ffffff'
  ctx.font = '13px sans-serif'
  const info = w.zone === 'field'
    ? `웨이브 ${w.wave} · 처치 ${w.kills} · 점수 ${w.score}`
    : w.zone === 'dungeon'
      ? `${Math.min(w.dStage, 3)}/3 단계 · 처치 ${w.kills} · 점수 ${w.score}`
      : `처치 ${w.kills} · 점수 ${w.score}`
  ctx.fillText(info, VIEW_W - 26, 58)

  // 퀘스트
  if (w.quest) {
    panel(ctx, VIEW_W - 290, 82, 276, 44)
    ctx.textAlign = 'left'
    ctx.fillStyle = w.quest.done ? '#b6ff9e' : '#ffffff'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(w.quest.done ? '퀘스트 완료 · 마을로 귀환' : '슬라임 처치', VIEW_W - 278, 102)
    bar(ctx, VIEW_W - 278, 110, 252, 8, w.quest.count / w.quest.target, '#b6ff9e', '#5ec08a')
  }

  // 레벨과 경험치
  panel(ctx, VIEW_W - 290, 132, 276, 44)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText(`Lv.${w.level}  ${CLASSES[w.cls].name}`, VIEW_W - 278, 152)
  bar(ctx, VIEW_W - 278, 160, 252, 8, w.xp / xpNeed(w.level), '#ffe27a', '#d9a33a')

  // 보스 체력바 (색이 체력 3구간마다 바뀐다)
  const boss = w.enemies.find((e) => e.boss && !e.dead)
  if (boss) {
    const bw = 360
    const x0 = VIEW_W / 2 - bw / 2
    panel(ctx, x0 - 10, 12, bw + 20, 52)
    ctx.textAlign = 'center'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(ENEMY_TYPES.boss.name, VIEW_W / 2, 32)
    const ratio = boss.hp / boss.maxHp
    const cols = ratio > 0.66 ? ['#9dff7a', '#3fb04a'] : ratio > 0.33 ? ['#ffd66a', '#e0801a'] : ['#ff7a7a', '#b02030']
    bar(ctx, x0, 40, bw, 14, ratio, cols[0], cols[1])
    for (const f of [1 / 3, 2 / 3]) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x0 + bw * f - 1, 40, 2, 14)
    }
  }

  // 콤보
  if (w.combo >= 2) {
    const pop = 1 + Math.max(0, 0.25 - (performance.now() % 1000) / 4000)
    ctx.save()
    ctx.textAlign = 'center'
    ctx.translate(VIEW_W / 2, 120)
    ctx.scale(pop, pop)
    ctx.font = 'bold 34px sans-serif'
    ctx.lineWidth = 6
    ctx.strokeStyle = OUT
    ctx.strokeText(`${w.combo} COMBO`, 0, 0)
    ctx.fillStyle = w.combo >= 10 ? '#ffd447' : '#7fe8ff'
    ctx.fillText(`${w.combo} COMBO`, 0, 0)
    ctx.restore()
  }

  // 하단 왼쪽: 회피 쿨다운
  const cd = p.dodgeCd > 0 ? 1 - p.dodgeCd / 0.7 : 1
  panel(ctx, 14, VIEW_H - 46, 170, 34)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText('회피 (Space)', 26, VIEW_H - 25)
  bar(ctx, 100, VIEW_H - 34, 74, 10, cd, cd >= 1 ? '#b6ff9e' : '#7fa8c0', cd >= 1 ? '#5ec08a' : '#4a6a80')

  // 하단 오른쪽: 가방 안내
  panel(ctx, VIEW_W - 186, VIEW_H - 46, 172, 34)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('가방 · 장비 (I)', VIEW_W - 172, VIEW_H - 25)

  // 알림 배너
  if (w.noticeT > 0 && w.notice) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 17px sans-serif'
    const tw = ctx.measureText(w.notice).width + 40
    const a = Math.min(1, w.noticeT * 2)
    ctx.globalAlpha = a
    panel(ctx, VIEW_W / 2 - tw / 2, VIEW_H - 150, tw, 36)
    ctx.fillStyle = '#ffd447'
    ctx.fillText(w.notice, VIEW_W / 2, VIEW_H - 126)
    ctx.globalAlpha = 1
  }

  if (w.dialog) drawDialog(ctx, w.dialog, t)

  if (w.over) {
    const og = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 40, VIEW_W / 2, VIEW_H / 2, 520)
    og.addColorStop(0, 'rgba(0,0,0,0.3)')
    og.addColorStop(1, 'rgba(60,0,10,0.85)')
    ctx.fillStyle = og
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    ctx.textAlign = 'center'
    ctx.font = 'bold 34px sans-serif'
    ctx.lineWidth = 6
    ctx.strokeStyle = OUT
    ctx.strokeText('쓰러졌다', VIEW_W / 2, VIEW_H / 2 - 8)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('쓰러졌다', VIEW_W / 2, VIEW_H / 2 - 8)
    ctx.font = '16px sans-serif'
    ctx.fillText('R 키로 마을에서 다시 시작', VIEW_W / 2, VIEW_H / 2 + 24)
  }
}

function drawDialog(ctx, d, t) {
  void t
  const x = 60
  const y = VIEW_H - 170
  const w = VIEW_W - 120
  const h = 140
  panel(ctx, x, y, w, h)
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'left'
  const nw = ctx.measureText(d.name).width + 24
  const ng = ctx.createLinearGradient(x + 16, y - 14, x + 16, y + 8)
  ng.addColorStop(0, '#ffe08a')
  ng.addColorStop(1, '#d9a33a')
  ctx.fillStyle = ng
  ctx.beginPath()
  ctx.roundRect(x + 16, y - 14, nw, 24, 8)
  ctx.fill()
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#2a1c12'
  ctx.fillText(d.name, x + 28, y + 3)
  // 대사 (글자가 차례로 나온다)
  const full = d.lines[d.i]
  if (d.shownAt == null || d.lastI !== d.i) {
    d.shownAt = performance.now()
    d.lastI = d.i
  }
  const shown = Math.min(full.length, Math.floor((performance.now() - d.shownAt) / 28))
  ctx.fillStyle = '#ffffff'
  ctx.font = '17px sans-serif'
  ctx.fillText(full.slice(0, shown), x + 24, y + 42)
  const last = d.i >= d.lines.length - 1
  if (last && d.choices) {
    d.choices.forEach((c, i) => {
      const cy = y + 62 + i * 30
      ctx.fillStyle = 'rgba(190,255,200,0.14)'
      ctx.beginPath()
      ctx.roundRect(x + 24, cy - 18, 420, 26, 8)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`${i + 1}. ${c.label}`, x + 34, cy)
    })
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(last ? 'E · Enter 닫기' : 'E · Enter 다음', x + w - 18, y + h - 14)
  }
}

// 가방: 장착 중인 장비와 가방 안의 장비 목록. 숫자 키로 장착한다
function drawBag(ctx, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  const x = 170
  const y = 56
  const pw = VIEW_W - 340
  const ph = VIEW_H - 112
  // 뒤 배경이 비치지 않게 한 겹 더 어둡게
  ctx.fillStyle = 'rgba(10,18,14,0.9)'
  ctx.beginPath()
  ctx.roundRect(x, y, pw, ph, 12)
  ctx.fill()
  panel(ctx, x, y, pw, ph)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffe27a'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText('가방 · 장비', x + 24, y + 38)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffffff'
  ctx.font = '14px sans-serif'
  ctx.fillText(`Lv.${w.level} · HP ${maxHpOf(w)} · 공격 +${w.equip.weapon?.atk || 0} · 방어 ${w.equip.armor?.def || 0}`, x + pw - 24, y + 36)
  bar(ctx, x + 24, y + 48, pw - 48, 8, w.xp / xpNeed(w.level), '#ffe27a', '#d9a33a')

  ctx.textAlign = 'left'
  ctx.font = 'bold 15px sans-serif'
  const rowCol = (it) => (it ? (it.rarity === 'epic' ? '#d9a8ff' : it.rarity === 'rare' ? '#7ec8ff' : '#e8e8e8') : '#888')
  const eq = [['무기', w.equip.weapon], ['갑옷', w.equip.armor]]
  eq.forEach(([label, it], i) => {
    const yy = y + 92 + i * 30
    ctx.fillStyle = '#b6ff9e'
    ctx.fillText(`${label}`, x + 24, yy)
    ctx.fillStyle = rowCol(it)
    ctx.fillText(it ? `${it.name} [${RARITY_NAME[it.rarity]}]` : '없음', x + 90, yy)
  })

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x + 24, y + 160, pw - 48, 1)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText('가방 (숫자 키로 장착)', x + 24, y + 186)
  if (w.bag.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '14px sans-serif'
    ctx.fillText('가방이 비었다. 보스와 퀘스트에서 장비를 얻을 수 있다.', x + 24, y + 214)
  }
  w.bag.slice(0, 9).forEach((it, i) => {
    const yy = y + 212 + i * 28
    ctx.fillStyle = 'rgba(190,255,200,0.12)'
    ctx.beginPath()
    ctx.roundRect(x + 24, yy - 19, pw - 48, 24, 7)
    ctx.fill()
    ctx.fillStyle = rowCol(it)
    ctx.font = 'bold 14px sans-serif'
    const stat = it.slot === 'weapon' ? `공격 +${it.atk}` : `방어 +${it.def} · HP +${it.hp}`
    ctx.fillText(`${i + 1}. [${RARITY_NAME[it.rarity]}] ${it.name}`, x + 36, yy)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#cfe8d4'
    ctx.fillText(stat, x + pw - 36, yy)
    ctx.textAlign = 'left'
  })
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '13px sans-serif'
  ctx.fillText('I 또는 E 로 닫기', x + pw / 2, y + ph - 16)
}

// 보상 연출: 어둡게 한 뒤 제목이 커지고, 보상 줄이 하나씩 나타난다
function drawReward(ctx, rw) {
  const k = Math.min(1, rw.t / 0.4)
  ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  const pw = 600
  const ph = 130 + rw.lines.length * 34
  const px = VIEW_W / 2 - pw / 2
  const py = VIEW_H / 2 - ph / 2 - 20
  const ease = 1 - Math.pow(1 - k, 3)
  ctx.save()
  ctx.globalAlpha = k
  ctx.translate(VIEW_W / 2, py)
  ctx.scale(0.85 + ease * 0.15, 0.85 + ease * 0.15)
  ctx.translate(-VIEW_W / 2, -py)
  panel(ctx, px, py, pw, ph)
  ctx.restore()
  // 반짝임 (제목 주변을 돈다)
  for (let i = 0; i < 8; i++) {
    const a = rw.t * 1.5 + (i / 8) * Math.PI * 2
    const sx = VIEW_W / 2 + Math.cos(a) * (pw / 2 + 14)
    const sy = py + 36 + Math.sin(a) * 26
    ctx.globalAlpha = 0.5 + Math.sin(rw.t * 6 + i) * 0.4
    ctx.fillStyle = '#ffe27a'
    ctx.beginPath()
    ctx.arc(sx, sy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = k
  ctx.textAlign = 'center'
  ctx.font = 'bold 26px sans-serif'
  ctx.lineWidth = 6
  ctx.strokeStyle = OUT
  ctx.strokeText(rw.title, VIEW_W / 2, py + 52)
  ctx.fillStyle = '#ffe27a'
  ctx.fillText(rw.title, VIEW_W / 2, py + 52)
  ctx.font = 'bold 18px sans-serif'
  rw.lines.forEach((ln, i) => {
    const a = Math.max(0, Math.min(1, (rw.t - 0.3 - i * 0.35) / 0.3))
    ctx.globalAlpha = a
    ctx.fillStyle = ln.startsWith('골드') ? '#ffd447' : ln.includes('장비') ? '#b6ffd8' : '#b6ff9e'
    ctx.fillText(ln, VIEW_W / 2, py + 96 + i * 34)
  })
  const allShown = rw.t >= rw.lines.length * 0.35 + 0.3
  if (allShown) {
    ctx.globalAlpha = 0.6 + Math.sin(rw.t * 5) * 0.4
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px sans-serif'
    ctx.fillText('E · Enter 닫기', VIEW_W / 2, py + ph - 16)
  }
  ctx.globalAlpha = 1
}

// ---------- 카메라와 장면 ----------
export function cameraOf(w) {
  const W = worldSize(w)
  return {
    x: Math.max(0, Math.min(W.w - VIEW_W, w.player.x - VIEW_W / 2)),
    y: Math.max(0, Math.min(W.h - VIEW_H, w.player.y - VIEW_H / 2)),
  }
}

export function draw(ctx, w, t) {
  const p = w.player
  const cam = cameraOf(w)
  const W = worldSize(w)
  const sx = (Math.random() - 0.5) * w.shake
  const sy = (Math.random() - 0.5) * w.shake
  eyesTarget = p

  ctx.save()
  ctx.fillStyle = '#1d3a22'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.translate(-cam.x + sx, -cam.y + sy)
  ctx.drawImage(getBg(w.zone), 0, 0, W.w, W.h)
  ctx.strokeStyle = w.zone === 'dungeon' ? 'rgba(0,0,0,0.6)' : 'rgba(10,26,20,0.5)'
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, W.w, W.h)

  const things = []
  if (w.zone === 'field') {
    for (const tr of w.fieldTrees) {
      if (tr.x < cam.x - 80 || tr.x > cam.x + VIEW_W + 80 || tr.y < cam.y - 80 || tr.y > cam.y + VIEW_H + 80) continue
      things.push({ y: tr.y, fn: () => drawTree(ctx, tr) })
    }
    for (const e of w.enemies) things.push({ y: e.y, fn: () => drawEnemy(ctx, e, t, w) })
    drawCave(ctx, CAVE, t)
    drawPortal(ctx, FIELD_RETURN, t, '마을 ◀')
  } else if (w.zone === 'town') {
    for (const b of w.walls) {
      if (b.fountain) { things.push({ y: b.y + b.h, fn: () => drawFountain(ctx, b) }); continue }
      things.push({ y: b.y + b.h, fn: () => drawHouse(ctx, b) })
    }
    for (const n of w.npcs) {
      things.push({ y: n.y, fn: () => drawNpc(ctx, n, t, !w.dialog && nearNpcFor(w, n)) })
    }
    drawPortal(ctx, TOWN_PORTAL, t, '들판 ▶')
  } else {
    for (const b of w.walls) things.push({ y: b.y + b.h, fn: () => drawPillar(ctx, b) })
    for (const e of w.enemies) things.push({ y: e.y, fn: () => drawEnemy(ctx, e, t, w) })
    if (w.bossDead) drawPortal(ctx, DUNGEON_EXIT, t, '밖으로 ◀')
  }
  things.push({ y: p.y, fn: () => drawPlayer(ctx, p, t, w) })
  things.sort((a, b) => a.y - b.y)
  for (const th of things) th.fn()
  for (const s of w.shots) drawShot(ctx, s)
  for (const f of w.fx) drawFx(ctx, f)
  ctx.restore()

  // 분위기: 가장자리를 살짝 어둡게 (비네팅)
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  // 구역 이동 페이드
  if (w.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, w.fade / 0.6)})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  drawHud(ctx, w, t)
  if (w.panel === 'bag') drawBag(ctx, w)
  if (w.reward) drawReward(ctx, w.reward)
}

function nearNpcFor(w, n) {
  return Math.hypot(n.x - w.player.x, n.y - w.player.y) < 90
}

// 캔버스에 던전을 픽셀아트로 그린다
import { W, H } from './dungeon'
import { getSprite, getFlashSprite } from './sprites'
import { BASE_VIEW, CLASSES, aimTarget } from './engine'

export const TILE = 16
export const VIEW_W = 21 // 화면에 보이는 가로 칸 수 (카메라)
export const VIEW_H = 13
// 캔버스를 3배 해상도로 그려서 글자가 흐릿하지 않게 한다 (도트 그림은 그대로 선명)
export const RENDER_SCALE = 3

const MONSTER_SPRITE = { r: 'rat', g: 'goblin', O: 'orc', B: 'boss' }

// 10층 구간마다 몬스터와 보스의 색 톤이 바뀐다 (1구간 흙빛, 2구간 얼음빛, 3구간 보랏빛, 반복)
const MONSTER_TINTS = ['#9a5cff', '#c98a4a', '#8fd8ff']
// 10층 폭군 오우거, 20층 심연의 군주, 30층 이후 잿빛 대마왕 (각자 다른 그림)
const BOSS_SPRITES = ['ogre', 'abyss', 'ashdemon']
function tierOf(depth) {
  return Math.floor((depth - 1) / 10)
}
function monsterTint(depth) {
  const tier = tierOf(depth)
  return tier === 0 ? null : MONSTER_TINTS[tier % MONSTER_TINTS.length]
}
function bossSpriteName(depth) {
  const tier = tierOf(depth)
  return tier === 0 ? 'boss' : BOSS_SPRITES[Math.min(tier, BOSS_SPRITES.length) - 1]
}

// 10층마다 맵 테마가 바뀐다: 던전 → 동굴 → 얼음 성 → (반복)
const THEMES = [
  {
    grass: true, floor: '#363a31', floorA: '#535947', floorB: '#4c5141', floorC: '#585e4c', floorHi: '#646b56', floorLo: '#42463a',
    wallFace: '#26232e', brickA: '#46404f', brickB: '#3e3947', brickHi: '#544d5e', wallLip: '#5d566c', wallLo: '#141218',
    wallTop: '#17151d', wallEdge: '#3a3546',
  },
  {
    grass: false, floor: '#2d2f36', floorA: '#41444d', floorB: '#3a3d46', floorC: '#474a54', floorHi: '#565a64', floorLo: '#2b2d34',
    wallFace: '#1d262a', brickA: '#2f4147', brickB: '#27373c', brickHi: '#41585f', wallLip: '#4f6a70', wallLo: '#0e1416',
    wallTop: '#121a1c', wallEdge: '#2a3a3e',
  },
  {
    grass: false, floor: '#34424f', floorA: '#56707f', floorB: '#4d6777', floorC: '#5f7d8d', floorHi: '#83a2b3', floorLo: '#43566a',
    wallFace: '#22334a', brickA: '#37516b', brickB: '#2d4660', brickHi: '#4f6f8a', wallLip: '#8fb5cc', wallLo: '#0f1a28',
    wallTop: '#15233a', wallEdge: '#4a6a88',
  },
]
let PAL = THEMES[0]
function themeFor(depth) {
  return THEMES[Math.floor((depth - 1) / 10) % THEMES.length]
}

function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function isWall(tiles, x, y) {
  return x < 0 || y < 0 || x >= W || y >= H || tiles[y][x] === '#'
}

function drawFloor(ctx, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  px(ctx, X, Y, 16, 16, PAL.floor)
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const v = hash(tx * 2 + i, ty * 2 + j)
      const base = v < 0.33 ? PAL.floorA : v < 0.66 ? PAL.floorB : PAL.floorC
      const sx = X + i * 8
      const sy = Y + j * 8
      px(ctx, sx + 1, sy + 1, 7, 7, base)
      px(ctx, sx + 1, sy + 1, 7, 1, PAL.floorHi)
      px(ctx, sx + 1, sy + 7, 7, 1, PAL.floorLo)
    }
  }
  const d = hash(tx, ty, 7)
  const ox = X + 2 + Math.floor(hash(tx, ty, 3) * 10)
  const oy = Y + 2 + Math.floor(hash(tx, ty, 5) * 9)
  if (PAL.grass && d < 0.12) {
    // 풀
    px(ctx, ox, oy + 2, 1, 3, '#4f8a3a')
    px(ctx, ox + 1, oy, 1, 5, '#68ad4a')
    px(ctx, ox + 2, oy + 1, 1, 4, '#4f8a3a')
  } else if (PAL.grass && d < 0.17) {
    // 꽃
    const petal = hash(tx, ty, 9) < 0.5 ? '#f4efe0' : '#e07aa0'
    px(ctx, ox + 1, oy, 1, 1, petal)
    px(ctx, ox, oy + 1, 1, 1, petal)
    px(ctx, ox + 2, oy + 1, 1, 1, petal)
    px(ctx, ox + 1, oy + 2, 1, 1, petal)
    px(ctx, ox + 1, oy + 1, 1, 1, '#f0c060')
    px(ctx, ox + 1, oy + 3, 1, 2, '#4f8a3a')
  }
}

function drawWall(ctx, tiles, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  const floorBelow = !isWall(tiles, tx, ty + 1)
  if (floorBelow) {
    // 바닥 쪽을 향한 벽 앞면: 벽돌
    px(ctx, X, Y, 16, 16, PAL.wallFace)
    for (let r = 0; r < 4; r++) {
      const offset = r % 2 ? 4 : 0
      for (let bx = -offset; bx < 16; bx += 8) {
        const x0 = Math.max(bx + 1, 0)
        const x1 = Math.min(bx + 8, 16)
        if (x1 <= x0) continue
        const shade = hash(tx * 4 + bx, ty * 4 + r) < 0.5 ? PAL.brickA : PAL.brickB
        px(ctx, X + x0, Y + r * 4 + 1, x1 - x0, 3, shade)
        px(ctx, X + x0, Y + r * 4 + 1, x1 - x0, 1, PAL.brickHi)
      }
    }
    px(ctx, X, Y, 16, 2, PAL.wallLip)
    px(ctx, X, Y + 15, 16, 1, PAL.wallLo)
  } else {
    // 벽 윗면
    px(ctx, X, Y, 16, 16, PAL.wallTop)
    if (!isWall(tiles, tx - 1, ty)) px(ctx, X, Y, 2, 16, PAL.wallEdge)
    if (!isWall(tiles, tx + 1, ty)) px(ctx, X + 14, Y, 2, 16, PAL.wallEdge)
    if (!isWall(tiles, tx, ty - 1)) px(ctx, X, Y, 16, 2, PAL.wallEdge)
  }
}

function drawSeal(ctx, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  px(ctx, X + 1, Y + 1, 14, 14, 'rgba(160,20,40,0.45)')
  ctx.strokeStyle = '#ff4a5a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X + 3, Y + 3)
  ctx.lineTo(X + 13, Y + 13)
  ctx.moveTo(X + 13, Y + 3)
  ctx.lineTo(X + 3, Y + 13)
  ctx.stroke()
}

function drawBoss(ctx, tx, ty, depth) {
  const X = tx * TILE
  const Y = ty * TILE
  const sprite = getSprite(bossSpriteName(depth))
  const scale = 1.5
  const w = sprite.width * scale
  const h = sprite.height * scale
  // 붉은 기운
  const aura = ctx.createRadialGradient(X + 8, Y + 8, 2, X + 8, Y + 8, 18)
  aura.addColorStop(0, 'rgba(255,40,60,0.35)')
  aura.addColorStop(1, 'rgba(255,40,60,0)')
  ctx.fillStyle = aura
  ctx.fillRect(X - 12, Y - 12, 40, 40)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.beginPath()
  ctx.ellipse(X + 8, Y + 15, 8, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(sprite, X + 8 - w / 2, Y + 16 - h, w, h)
}

// 맞은 순간 번쩍임: 같은 모양을 흰색으로 겹쳐 그리고 점점 흐리게
function drawFlash(ctx, name, tx, ty, scale, alpha) {
  const sprite = getFlashSprite(name)
  const w = sprite.width * scale
  const h = sprite.height * scale
  ctx.globalAlpha = alpha
  if (scale === 1) ctx.drawImage(sprite, tx * TILE, ty * TILE + 15 - sprite.height, w, h)
  else ctx.drawImage(sprite, tx * TILE + 8 - w / 2, ty * TILE + 16 - h, w, h)
  ctx.globalAlpha = 1
}

function drawStairs(ctx, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  drawFloor(ctx, tx, ty)
  px(ctx, X + 1, Y + 1, 14, 14, '#0c0b10')
  const steps = ['#7a7288', '#5f5874', '#47415a', '#302b40']
  steps.forEach((c, i) => px(ctx, X + 2 + i, Y + 3 + i * 3, 12 - i * 2, 2, c))
  ctx.strokeStyle = 'rgba(240,192,96,0.8)'
  ctx.lineWidth = 1
  ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15)
}

function drawEntity(ctx, name, tx, ty, tint) {
  const X = tx * TILE
  const Y = ty * TILE
  const sprite = getSprite(name, tint)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(X + 8, Y + 14.5, 5, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(sprite, X, Y + 15 - sprite.height)
}

function drawText(ctx, text, x, y, color, size = 11) {
  ctx.font = `900 ${size}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  ctx.lineJoin = 'round'
  ctx.textAlign = 'center'
  ctx.lineWidth = Math.max(2.5, size / 4)
  ctx.strokeStyle = '#000'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

const LABEL_FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

// 글자 묶음들을 서로 겹치지 않게 위로 밀어 올리며 그린다
function drawLabels(ctx, labels) {
  labels.sort((a, b) => a.priority - b.priority)
  const placed = []
  for (const label of labels) {
    let w = 0
    let h = 0
    for (const line of label.lines) {
      ctx.font = `900 ${line.size}px ${LABEL_FONT}`
      w = Math.max(w, ctx.measureText(line.text).width)
      h += line.size + 1
    }
    const box = { x1: label.x - w / 2 - 2, x2: label.x + w / 2 + 2, y2: label.y, y1: label.y - h - 2 }
    // 이미 놓인 글자와 겹치면 그 위로 올린다
    for (let moved = true, guard = 0; moved && guard < 20; guard++) {
      moved = false
      for (const o of placed) {
        if (box.x1 < o.x2 && box.x2 > o.x1 && box.y1 < o.y2 && box.y2 > o.y1) {
          const lift = box.y2 - o.y1 + 1
          box.y1 -= lift
          box.y2 -= lift
          moved = true
        }
      }
    }
    placed.push(box)
    // 읽기 쉽게 반투명 배경
    ctx.fillStyle = 'rgba(8,4,14,0.55)'
    ctx.beginPath()
    ctx.roundRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1, 3)
    ctx.fill()
    let y = box.y1 + 1
    for (const line of label.lines) {
      y += line.size
      drawText(ctx, line.text, label.x, y - 1, line.color, line.size)
      y += 1
    }
  }
}

function drawMinimap(ctx, game) {
  const s = 2
  const mw = W * s
  const mh = H * s
  const ox = VIEW_W * TILE - mw - 4
  const oy = 4
  px(ctx, ox - 2, oy - 2, mw + 4, mh + 4, 'rgba(10,6,16,0.75)')
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!game.explored[y][x]) continue
      const t = game.tiles[y][x]
      if (t === '#') continue
      px(ctx, ox + x * s, oy + y * s, s, s, t === '>' ? '#f0c060' : game.visible[y][x] ? '#7b8a66' : '#4a5240')
    }
  }
  // 한 번이라도 본 곳의 포션(분홍), 상자(갈색), 상인(청록)
  for (const it of game.items) {
    if (game.explored[it.y][it.x]) px(ctx, ox + it.x * s, oy + it.y * s, s, s, it.kind === 'chest' ? '#e0a040' : '#ff7ad0')
  }
  if (game.npc && game.explored[game.npc.y][game.npc.x]) px(ctx, ox + game.npc.x * s - 1, oy + game.npc.y * s - 1, s + 2, s + 2, '#5ff0dc')
  for (const m of game.monsters) {
    if (game.visible[m.y][m.x]) px(ctx, ox + m.x * s, oy + m.y * s, s, s, '#ff4a4a')
  }
  px(ctx, ox + game.player.x * s - 1, oy + game.player.y * s - 1, s + 2, s + 2, '#ffffff')
}

export function render(ctx, game, view = {}) {
  PAL = themeFor(game.depth)
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0)
  ctx.imageSmoothingEnabled = false
  px(ctx, 0, 0, VIEW_W * TILE, VIEW_H * TILE, '#07060a')
  const { tiles, visible, explored, player } = game
  const boss = game.monsters.find((m) => m.boss)
  const bossAlive = Boolean(boss)

  // 카메라: 플레이어를 화면 가운데에 두되 맵 밖은 안 보이게
  // 이동 중이면 칸 사이 보간 위치(view.player)를 따라가고, 흔들림(view.shake)을 더한다
  const vp = view.player || player
  const shake = view.shake || { x: 0, y: 0 }
  const ft = view.fxT ?? 1 // 타격 연출 진행도 (0 → 1, 끝나면 1)
  const camX = Math.max(0, Math.min(W - VIEW_W, vp.x - Math.floor(VIEW_W / 2)))
  const camY = Math.max(0, Math.min(H - VIEW_H, vp.y - Math.floor(VIEW_H / 2)))
  ctx.save()
  ctx.translate(-camX * TILE + shake.x, -camY * TILE + shake.y)

  // 1) 지형
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!explored[y][x]) continue
      const t = tiles[y][x]
      if (t === '#') drawWall(ctx, tiles, x, y)
      else if (t === '>') {
        drawStairs(ctx, x, y)
        if (bossAlive) drawSeal(ctx, x, y)
      }
      else drawFloor(ctx, x, y)
    }
  }

  // 2) 조명: 멀수록 어둡게, 기억만 하는 곳은 더 어둡게
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!explored[y][x]) continue
      let a = 0.72
      if (visible[y][x]) {
        const dist = Math.hypot(x - player.x, y - player.y)
        a = Math.min(0.5, (dist / (BASE_VIEW + (player.vision || 0) + 1)) ** 2 * 0.5)
      }
      if (a > 0.01) px(ctx, x * TILE, y * TILE, TILE, TILE, `rgba(6,5,12,${a})`)
    }
  }

  // 3) 아이템, 몬스터, 플레이어
  for (const it of game.items) {
    if (visible[it.y][it.x]) drawEntity(ctx, it.kind === 'chest' ? 'chest' : 'potion', it.x, it.y)
  }
  if (game.npc && visible[game.npc.y][game.npc.x]) {
    drawEntity(ctx, 'merchant', game.npc.x, game.npc.y)
    drawText(ctx, '상점', game.npc.x * TILE + 8, game.npc.y * TILE - 2, '#5ff0dc', 9)
  }
  for (const m of game.monsters) {
    if (!visible[m.y][m.x]) continue
    // 몬스터도 이전 칸에서 미끄러져 온다
    const mv = (view.monsters && view.monsters.get(m.id)) || m
    const name = m.boss ? bossSpriteName(game.depth) : (m.sprite || MONSTER_SPRITE[m.ch])
    if (m.boss) drawBoss(ctx, mv.x, mv.y, game.depth)
    else drawEntity(ctx, name, mv.x, mv.y, monsterTint(game.depth))
    if (ft < 0.5 && (game.fx || []).some((f) => (f.kind === 'hit' || f.kind === 'crit') && f.x === m.x && f.y === m.y)) {
      drawFlash(ctx, name, mv.x, mv.y, m.boss ? 1.5 : 1, 0.85 * (1 - ft * 2))
    }
    if (!m.boss && m.hp < m.maxHp) {
      px(ctx, mv.x * TILE + 2, mv.y * TILE - 1, 12, 2, '#3a0d0d')
      px(ctx, mv.x * TILE + 2, mv.y * TILE - 1, Math.max(1, Math.round((12 * m.hp) / m.maxHp)), 2, '#e83b3b')
    }
  }
  // 보스가 예고한 공격 칸: 빨간 테두리로 표시
  for (const m of game.monsters) {
    if (!m.boss || !m.telegraph) continue
    for (const c of m.telegraph.cells) {
      if (!visible[c.y][c.x]) continue
      px(ctx, c.x * TILE + 1, c.y * TILE + 1, 14, 14, 'rgba(255,60,60,0.28)')
      ctx.strokeStyle = 'rgba(255,90,90,0.95)'
      ctx.lineWidth = 1
      ctx.strokeRect(c.x * TILE + 1.5, c.y * TILE + 1.5, 13, 13)
    }
  }
  // 돌 골렘 (소환사): 파란빛을 띤 골렘, 아래에 초록 체력바
  if (game.pet && visible[game.pet.y][game.pet.x]) {
    const pet = game.pet
    drawEntity(ctx, 'golem', pet.x, pet.y, '#7fd3ff')
    px(ctx, pet.x * TILE + 2, pet.y * TILE - 1, 12, 2, '#0d2a1a')
    px(ctx, pet.x * TILE + 2, pet.y * TILE - 1, Math.max(1, Math.round((12 * pet.hp) / pet.maxHp)), 2, '#5fe0b0')
  }
  // 원거리 직업: 사거리 안 가장 가까운 적 발밑에 조준 표시
  const aim = !game.over && aimTarget(game)
  if (aim) {
    const ax = aim.x * TILE
    const ay = aim.y * TILE
    ctx.strokeStyle = 'rgba(255,230,120,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(ax + 8, ay + 14, 7, 3, 0, 0, Math.PI * 2)
    ctx.stroke()
    for (const [dx, dy] of [[0, 0], [12, 0], [0, 12], [12, 12]]) {
      px(ctx, ax + dx + (dx ? 2 : 0), ay + dy + (dy ? 2 : 0), 2, 1, '#ffe678')
      px(ctx, ax + dx + (dx ? 3 : 0), ay + dy + (dy ? 1 : 0), 1, 2, '#ffe678')
    }
  }
  drawEntity(ctx, (CLASSES[player.cls] || CLASSES.mage).sprite, vp.x, vp.y)

  // 4) 플레이어 주변 따뜻한 빛
  const cx = vp.x * TILE + 8
  const cy = vp.y * TILE + 8
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 4)
  glow.addColorStop(0, 'rgba(255,200,120,0.16)')
  glow.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(cx - TILE * 4, cy - TILE * 4, TILE * 8, TILE * 8)

  // 5) 타격 효과(그림)를 먼저 그리고, 글자는 모아서 겹치지 않게 배치한다
  const labels = []
  // 숫자는 맞는 순간 위로 떠오른다 (floats)
  const rise = 8 * (1 - (1 - ft) ** 2)
  const addLabel = (fx, lines, priority, floats = false) => labels.push({ x: fx.x * TILE + 8, y: fx.y * TILE - 1 - (floats ? rise : 0), lines, priority })
  for (const fx of game.fx || []) {
    const X = fx.x * TILE + 8
    const Y = fx.y * TILE
    if (fx.kind === 'shot') {
      // 발사체 궤적: 마법탄(보라 빛) / 화살(갈색 + 화살촉)
      const sx = fx.from.x * TILE + 8
      const sy = fx.from.y * TILE + 8
      const tx = X
      const ty = Y + 8
      const steps = Math.max(4, Math.round(Math.hypot(tx - sx, ty - sy) / 3))
      for (let i = 1; i < steps; i++) {
        const t = i / steps
        const cx = sx + (tx - sx) * t
        const cy = sy + (ty - sy) * t
        if (fx.cls === 'mage') {
          ctx.fillStyle = `rgba(185,138,255,${0.25 + 0.6 * t})`
          ctx.beginPath()
          ctx.arc(cx, cy, 0.8 + 1.4 * t, 0, Math.PI * 2)
          ctx.fill()
        } else {
          px(ctx, cx - 0.5, cy - 0.5, 1, 1, '#c9a87a')
        }
      }
      if (fx.cls === 'mage') {
        const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 6)
        g.addColorStop(0, 'rgba(255,240,255,0.95)')
        g.addColorStop(1, 'rgba(185,138,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(tx - 6, ty - 6, 12, 12)
      } else {
        const ang = Math.atan2(ty - sy, tx - sx)
        ctx.fillStyle = '#eef2f8'
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - Math.cos(ang - 0.5) * 4, ty - Math.sin(ang - 0.5) * 4)
        ctx.lineTo(tx - Math.cos(ang + 0.5) * 4, ty - Math.sin(ang + 0.5) * 4)
        ctx.fill()
      }
    } else if (fx.kind === 'blast') {
      const g = ctx.createRadialGradient(X, Y + 8, 1, X, Y + 8, 14)
      g.addColorStop(0, 'rgba(240,220,255,0.9)')
      g.addColorStop(0.5, 'rgba(160,100,255,0.55)')
      g.addColorStop(1, 'rgba(120,60,220,0)')
      ctx.fillStyle = g
      ctx.fillRect(X - 14, Y - 6, 28, 28)
      if (fx.text) addLabel(fx, [{ text: fx.text, color: '#d9b8ff', size: 12 }], 3)
    } else if (fx.kind === 'hit') {
      px(ctx, X - 4, Y + 4, 8, 1, '#fff6c0')
      px(ctx, X - 1, Y + 1, 1, 8, '#fff6c0')
      addLabel(fx, [{ text: fx.text, color: '#fff6c0', size: 12 }], 2, true)
    } else if (fx.kind === 'hurt') {
      px(ctx, fx.x * TILE, Y, TILE, TILE, 'rgba(255,40,40,0.25)')
      addLabel(fx, [{ text: fx.text, color: '#ff6b6b', size: 12 }], 1)
    } else if (fx.kind === 'crit') {
      // 치명타: 연보라색 큰 숫자 + 반짝임
      px(ctx, X - 6, Y + 4, 12, 1, '#e3c8ff')
      px(ctx, X - 1, Y - 1, 1, 12, '#e3c8ff')
      px(ctx, X - 4, Y + 1, 1, 1, '#ffffff')
      px(ctx, X + 4, Y + 8, 1, 1, '#ffffff')
      px(ctx, X + 5, Y + 1, 1, 1, '#c9a0ff')
      addLabel(fx, [
        { text: 'CRIT', color: '#e8d4ff', size: 8 },
        { text: fx.text, color: '#c9a0ff', size: 17 },
      ], 0, true)
    } else if (fx.kind === 'strike') {
      // 보스 공격이 떨어지는 칸: 붉은 폭발이 번쩍이고 사선이 그어진 뒤 사라진다
      if (view.fxT === undefined) continue
      const cx0 = fx.x * TILE
      const cy0 = fx.y * TILE
      const a = 1 - ft
      px(ctx, cx0, cy0, TILE, TILE, `rgba(255,70,40,${0.75 * a})`)
      if (ft < 0.35) px(ctx, cx0 + 2, cy0 + 2, 12, 12, `rgba(255,240,200,${0.9 * (1 - ft / 0.35)})`)
      const g = ctx.createRadialGradient(X, Y + 8, 1, X, Y + 8, 14)
      g.addColorStop(0, `rgba(255,200,120,${0.7 * a})`)
      g.addColorStop(1, 'rgba(255,60,30,0)')
      ctx.fillStyle = g
      ctx.fillRect(X - 14, Y - 6, 28, 28)
      ctx.strokeStyle = `rgba(255,230,190,${a})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx0 + 1, cy0 + 1)
      ctx.lineTo(cx0 + 15, cy0 + 15)
      ctx.moveTo(cx0 + 15, cy0 + 1)
      ctx.lineTo(cx0 + 1, cy0 + 15)
      ctx.stroke()
    } else if (fx.kind === 'summon') {
      // 소환 빛: 원이 퍼지며 사라진다 (연출 중에만)
      if (view.fxT === undefined) continue
      ctx.strokeStyle = `rgba(127,211,255,${1 - ft})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(X, Y + 10, 3 + 9 * ft, 2 + 4 * ft, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (fx.kind === 'burst') {
      // 처치: 픽셀 조각이 사방으로 흩어진다 (연출 중에만)
      if (view.fxT === undefined) continue
      const colors = ['#ffe27a', '#ff6b6b', '#ffffff']
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3
        const d = 2 + 13 * ft
        const size = 1 + (1 - ft) * 2.5
        px(ctx, X + Math.cos(a) * d - size / 2, Y + 8 + Math.sin(a) * d - size / 2, size, size, colors[i % 3])
      }
    } else if (fx.kind === 'coin') {
      const color = fx.coin === 'gold' ? '#ffd23c' : fx.coin === 'silver' ? '#e4e8f0' : '#d08a50'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(X, Y + 8, 3, 0, Math.PI * 2)
      ctx.fill()
      addLabel(fx, [{ text: fx.text, color, size: 10 }], 4)
    } else if (fx.kind === 'fire') {
      const g = ctx.createRadialGradient(X, Y + 8, 1, X, Y + 8, 10)
      g.addColorStop(0, 'rgba(255,220,120,0.9)')
      g.addColorStop(0.5, 'rgba(255,120,40,0.6)')
      g.addColorStop(1, 'rgba(255,60,20,0)')
      ctx.fillStyle = g
      ctx.fillRect(X - 10, Y - 2, 20, 20)
      if (fx.text) addLabel(fx, [{ text: fx.text, color: '#ffb35c', size: 12 }], 3)
    } else if (fx.kind === 'warn') {
      addLabel(fx, [{ text: '!', color: '#ff3b3b', size: 18 }], 0)
    } else if (fx.kind === 'heal') {
      addLabel(fx, [{ text: fx.text, color: '#7dff9a', size: 12 }], 1)
    }
  }
  drawLabels(ctx, labels)

  ctx.restore()
  drawMinimap(ctx, game)

  // 보스 HP바 (보스가 보일 때)
  if (boss && visible[boss.y][boss.x]) {
    const bw = 180
    const bx = (VIEW_W * TILE - bw) / 2
    const by = VIEW_H * TILE - 16
    px(ctx, bx - 2, by - 2, bw + 4, 10, 'rgba(10,4,14,0.85)')
    px(ctx, bx, by, bw, 6, '#3a0d14')
    px(ctx, bx, by, Math.max(1, Math.round((bw * boss.hp) / boss.maxHp)), 6, boss.windup ? '#ff9a3b' : boss.phase === 2 ? '#ff5a2a' : '#e0263f')
    px(ctx, bx + bw / 2, by - 1, 1, 8, 'rgba(255,255,255,0.85)') // 2페이즈 기준선 (체력 절반)
    drawText(ctx, `👑 ${boss.name}  ${boss.hp}/${boss.maxHp}${boss.phase === 2 ? ' · 2페이즈' : ''}`, VIEW_W * TILE / 2, by - 5, '#ffd6dc', 9)
  }

  // 6) 맞은 턴엔 화면 가장자리를 붉게
  if (game.hurtTurn === game.turns) {
    const w = VIEW_W * TILE
    const h = VIEW_H * TILE
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.6)
    v.addColorStop(0, 'rgba(200,0,0,0)')
    v.addColorStop(1, 'rgba(200,0,0,0.35)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
  }
}

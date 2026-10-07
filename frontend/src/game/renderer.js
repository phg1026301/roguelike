// 캔버스에 던전을 픽셀아트로 그린다
import { W, H } from './dungeon'
import { getSprite } from './sprites'
import { BASE_VIEW } from './engine'

export const TILE = 16
export const VIEW_W = 21 // 화면에 보이는 가로 칸 수 (카메라)
export const VIEW_H = 13

const MONSTER_SPRITE = { r: 'rat', g: 'goblin', O: 'orc', B: 'boss' }

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
  px(ctx, X, Y, 16, 16, '#363a31')
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const v = hash(tx * 2 + i, ty * 2 + j)
      const base = v < 0.33 ? '#535947' : v < 0.66 ? '#4c5141' : '#585e4c'
      const sx = X + i * 8
      const sy = Y + j * 8
      px(ctx, sx + 1, sy + 1, 7, 7, base)
      px(ctx, sx + 1, sy + 1, 7, 1, '#646b56')
      px(ctx, sx + 1, sy + 7, 7, 1, '#42463a')
    }
  }
  const d = hash(tx, ty, 7)
  const ox = X + 2 + Math.floor(hash(tx, ty, 3) * 10)
  const oy = Y + 2 + Math.floor(hash(tx, ty, 5) * 9)
  if (d < 0.12) {
    // 풀
    px(ctx, ox, oy + 2, 1, 3, '#4f8a3a')
    px(ctx, ox + 1, oy, 1, 5, '#68ad4a')
    px(ctx, ox + 2, oy + 1, 1, 4, '#4f8a3a')
  } else if (d < 0.17) {
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
    px(ctx, X, Y, 16, 16, '#26232e')
    for (let r = 0; r < 4; r++) {
      const offset = r % 2 ? 4 : 0
      for (let bx = -offset; bx < 16; bx += 8) {
        const x0 = Math.max(bx + 1, 0)
        const x1 = Math.min(bx + 8, 16)
        if (x1 <= x0) continue
        const shade = hash(tx * 4 + bx, ty * 4 + r) < 0.5 ? '#46404f' : '#3e3947'
        px(ctx, X + x0, Y + r * 4 + 1, x1 - x0, 3, shade)
        px(ctx, X + x0, Y + r * 4 + 1, x1 - x0, 1, '#544d5e')
      }
    }
    px(ctx, X, Y, 16, 2, '#5d566c')
    px(ctx, X, Y + 15, 16, 1, '#141218')
  } else {
    // 벽 윗면
    px(ctx, X, Y, 16, 16, '#17151d')
    if (!isWall(tiles, tx - 1, ty)) px(ctx, X, Y, 2, 16, '#3a3546')
    if (!isWall(tiles, tx + 1, ty)) px(ctx, X + 14, Y, 2, 16, '#3a3546')
    if (!isWall(tiles, tx, ty - 1)) px(ctx, X, Y, 16, 2, '#3a3546')
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

function drawBoss(ctx, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  const sprite = getSprite('boss')
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

function drawEntity(ctx, name, tx, ty) {
  const X = tx * TILE
  const Y = ty * TILE
  const sprite = getSprite(name)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(X + 8, Y + 14.5, 5, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(sprite, X, Y + 15 - sprite.height)
}

function drawText(ctx, text, x, y, color, size = 8) {
  ctx.font = `bold ${size}px monospace`
  ctx.textAlign = 'center'
  ctx.lineWidth = 2
  ctx.strokeStyle = '#000'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
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
  // 한 번이라도 본 곳의 포션
  for (const it of game.items) {
    if (game.explored[it.y][it.x]) px(ctx, ox + it.x * s, oy + it.y * s, s, s, '#ff7ad0')
  }
  for (const m of game.monsters) {
    if (game.visible[m.y][m.x]) px(ctx, ox + m.x * s, oy + m.y * s, s, s, '#ff4a4a')
  }
  px(ctx, ox + game.player.x * s - 1, oy + game.player.y * s - 1, s + 2, s + 2, '#ffffff')
}

export function render(ctx, game) {
  ctx.imageSmoothingEnabled = false
  px(ctx, 0, 0, VIEW_W * TILE, VIEW_H * TILE, '#07060a')
  const { tiles, visible, explored, player } = game
  const boss = game.monsters.find((m) => m.boss)
  const bossAlive = Boolean(boss)

  // 카메라: 플레이어를 화면 가운데에 두되 맵 밖은 안 보이게
  const camX = Math.max(0, Math.min(W - VIEW_W, player.x - Math.floor(VIEW_W / 2)))
  const camY = Math.max(0, Math.min(H - VIEW_H, player.y - Math.floor(VIEW_H / 2)))
  ctx.save()
  ctx.translate(-camX * TILE, -camY * TILE)

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
    if (visible[it.y][it.x]) drawEntity(ctx, 'potion', it.x, it.y)
  }
  for (const m of game.monsters) {
    if (!visible[m.y][m.x]) continue
    if (m.boss) drawBoss(ctx, m.x, m.y)
    else drawEntity(ctx, MONSTER_SPRITE[m.ch], m.x, m.y)
    if (!m.boss && m.hp < m.maxHp) {
      px(ctx, m.x * TILE + 2, m.y * TILE - 1, 12, 2, '#3a0d0d')
      px(ctx, m.x * TILE + 2, m.y * TILE - 1, Math.max(1, Math.round((12 * m.hp) / m.maxHp)), 2, '#e83b3b')
    }
  }
  drawEntity(ctx, 'player', player.x, player.y)

  // 4) 플레이어 주변 따뜻한 빛
  const cx = player.x * TILE + 8
  const cy = player.y * TILE + 8
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 4)
  glow.addColorStop(0, 'rgba(255,200,120,0.16)')
  glow.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(cx - TILE * 4, cy - TILE * 4, TILE * 8, TILE * 8)

  // 5) 타격 효과와 데미지 숫자
  const stack = {}
  for (const fx of game.fx || []) {
    const key = `${fx.x},${fx.y}`
    const n = (stack[key] = (stack[key] || 0) + 1) - 1
    const X = fx.x * TILE + 8
    const Y = fx.y * TILE
    if (fx.kind === 'hit') {
      px(ctx, X - 4, Y + 4, 8, 1, '#fff6c0')
      px(ctx, X - 1, Y + 1, 1, 8, '#fff6c0')
      drawText(ctx, fx.text, X, Y - 2 - n * 8, '#fff6c0')
    } else if (fx.kind === 'hurt') {
      px(ctx, fx.x * TILE, Y, TILE, TILE, 'rgba(255,40,40,0.25)')
      drawText(ctx, fx.text, X, Y - 2 - n * 8, '#ff6b6b')
    } else if (fx.kind === 'crit') {
      // 치명타: 연보라색 큰 숫자 + 반짝임
      px(ctx, X - 6, Y + 4, 12, 1, '#e3c8ff')
      px(ctx, X - 1, Y - 1, 1, 12, '#e3c8ff')
      px(ctx, X - 4, Y + 1, 1, 1, '#ffffff')
      px(ctx, X + 4, Y + 8, 1, 1, '#ffffff')
      px(ctx, X + 5, Y + 1, 1, 1, '#c9a0ff')
      drawText(ctx, 'CRIT', X, Y - 15 - n * 14, '#d9b8ff', 6)
      drawText(ctx, fx.text, X, Y - 4 - n * 14, '#c9a0ff', 13)
    } else if (fx.kind === 'warn') {
      drawText(ctx, '!', X, Y - 8, '#ff3b3b', 14)
    } else if (fx.kind === 'heal') {
      drawText(ctx, fx.text, X, Y - 2 - n * 8, '#7dff9a')
    }
  }

  ctx.restore()
  drawMinimap(ctx, game)

  // 보스 HP바 (보스가 보일 때)
  if (boss && visible[boss.y][boss.x]) {
    const bw = 180
    const bx = (VIEW_W * TILE - bw) / 2
    const by = VIEW_H * TILE - 16
    px(ctx, bx - 2, by - 2, bw + 4, 10, 'rgba(10,4,14,0.85)')
    px(ctx, bx, by, bw, 6, '#3a0d14')
    px(ctx, bx, by, Math.max(1, Math.round((bw * boss.hp) / boss.maxHp)), 6, boss.windup ? '#ff9a3b' : '#e0263f')
    drawText(ctx, `👑 ${boss.name}  ${boss.hp}/${boss.maxHp}`, VIEW_W * TILE / 2, by - 5, '#ffd6dc', 7)
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

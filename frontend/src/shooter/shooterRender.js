// 탄환 소년의 화면 그리기: 굵은 외곽선, 밝은 색, 찌그러지는 움직임 (카툰 스타일)
import { W, H, WALL_LIST, WEAPONS } from './shooterEngine'

const LINE = '#2a1d17'
const GRASS_A = '#9ad86f'
const GRASS_B = '#8bcb60'

function outlined(ctx, fill, line = LINE, width = 4) {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = width
  ctx.strokeStyle = line
  ctx.stroke()
}

function eyes(ctx, x, y, gap, size, lookX, lookY) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * gap
    ctx.beginPath()
    ctx.arc(ex, y, size, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = LINE
    ctx.stroke()
    const d = Math.hypot(lookX, lookY) || 1
    ctx.beginPath()
    ctx.arc(ex + (lookX / d) * size * 0.45, y + (lookY / d) * size * 0.45, size * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = LINE
    ctx.fill()
  }
}

function drawBackground(ctx, t) {
  const tile = 48
  for (let y = 0; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? GRASS_A : GRASS_B
      ctx.fillRect(x, y, tile, tile)
    }
  }
  // 풀 장식 (살짝 흔들린다)
  ctx.strokeStyle = '#6fb04a'
  ctx.lineWidth = 3
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % W
    const y = (i * 151) % H
    const sway = Math.sin(t * 1.5 + i) * 3
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 4 + sway, y - 8)
    ctx.moveTo(x, y)
    ctx.lineTo(x + 4 + sway, y - 9)
    ctx.stroke()
  }
  // 바깥 테두리 (울타리 느낌)
  ctx.lineWidth = 10
  ctx.strokeStyle = '#6b4a2b'
  ctx.strokeRect(5, 5, W - 10, H - 10)
}

function drawWalls(ctx) {
  for (const b of WALL_LIST) {
    ctx.beginPath()
    ctx.roundRect(b.x, b.y, b.w, b.h, 10)
    outlined(ctx, '#c9a06a', LINE, 4)
    // 윗면 하이라이트
    ctx.fillStyle = '#e8c894'
    ctx.fillRect(b.x + 6, b.y + 5, b.w - 12, Math.max(6, b.h * 0.3))
  }
}

function drawCoin(ctx, c, t) {
  const bob = Math.sin(t * 6 + c.x) * 2
  ctx.beginPath()
  ctx.ellipse(c.x, c.y + 10 + bob * 0.2, 7, 2.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c.x, c.y + bob, 8, 0, Math.PI * 2)
  outlined(ctx, '#ffd447', LINE, 3)
  ctx.beginPath()
  ctx.arc(c.x - 2, c.y - 2 + bob, 2.2, 0, Math.PI * 2)
  ctx.fillStyle = '#fff6c0'
  ctx.fill()
}

function drawEnemy(ctx, e, t) {
  const squash = 1 + Math.sin(e.walk) * 0.08
  const flash = e.flash > 0
  const body = flash ? '#ffffff' : e.color
  const toP = { x: 0, y: 0 }
  ctx.save()
  ctx.translate(e.x, e.y)
  // 그림자
  ctx.beginPath()
  ctx.ellipse(0, e.r * 0.9, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fill()
  ctx.scale(1 / squash, squash)
  if (e.type === 'slime') {
    ctx.beginPath()
    ctx.ellipse(0, 2, e.r, e.r * 0.85, 0, Math.PI, 0)
    ctx.lineTo(e.r, e.r * 0.6)
    ctx.quadraticCurveTo(0, e.r * 1.2, -e.r, e.r * 0.6)
    ctx.closePath()
    outlined(ctx, body, LINE, 4)
    eyes(ctx, 0, -2, e.r * 0.4, 4, toP.x, toP.y)
  } else if (e.type === 'goblin') {
    // 뾰족한 귀
    ctx.beginPath()
    ctx.moveTo(-e.r * 0.8, -e.r * 0.2); ctx.lineTo(-e.r * 1.4, -e.r * 0.6); ctx.lineTo(-e.r * 0.7, -e.r * 0.7)
    ctx.moveTo(e.r * 0.8, -e.r * 0.2); ctx.lineTo(e.r * 1.4, -e.r * 0.6); ctx.lineTo(e.r * 0.7, -e.r * 0.7)
    outlined(ctx, body, LINE, 4)
    ctx.beginPath()
    ctx.arc(0, 0, e.r, 0, Math.PI * 2)
    outlined(ctx, body, LINE, 4)
    eyes(ctx, 0, -3, e.r * 0.42, 5, 0, 1)
    ctx.beginPath()
    ctx.arc(0, e.r * 0.4, e.r * 0.3, 0.1, Math.PI - 0.1)
    ctx.strokeStyle = LINE
    ctx.lineWidth = 2.5
    ctx.stroke()
  } else if (e.type === 'bat') {
    const wing = Math.sin(t * 16 + e.id) * 0.5
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(sx * e.r * 1.6, -e.r * (1 + wing), sx * e.r * 1.8, e.r * 0.2)
      ctx.quadraticCurveTo(sx * e.r, e.r * 0.4, 0, e.r * 0.2)
      outlined(ctx, flash ? '#fff' : '#7d62cc', LINE, 3)
    }
    ctx.beginPath()
    ctx.arc(0, 0, e.r * 0.8, 0, Math.PI * 2)
    outlined(ctx, body, LINE, 4)
    eyes(ctx, 0, -2, e.r * 0.35, 4, 0, 1)
  } else {
    // 오크: 큰 몸, 뿔
    ctx.beginPath()
    ctx.arc(0, 0, e.r, 0, Math.PI * 2)
    outlined(ctx, body, LINE, 5)
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sx * e.r * 0.5, -e.r * 0.6)
      ctx.lineTo(sx * e.r * 0.9, -e.r * 1.25)
      ctx.lineTo(sx * e.r * 0.2, -e.r * 0.9)
      outlined(ctx, '#f5ecd0', LINE, 3)
    }
    eyes(ctx, 0, -4, e.r * 0.4, 5, 0, 1)
    ctx.beginPath()
    ctx.arc(0, e.r * 0.35, e.r * 0.38, 0.15, Math.PI - 0.15)
    ctx.strokeStyle = LINE
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.restore()
}

function drawPlayer(ctx, p, t) {
  const bob = p.moving ? Math.abs(Math.sin(p.walk)) * 3 : Math.sin(t * 3) * 1
  const squash = p.moving ? 1 + Math.sin(p.walk * 2) * 0.06 : 1
  ctx.save()
  // 무적 중에는 깜빡인다
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) ctx.globalAlpha = 0.45
  ctx.beginPath()
  ctx.ellipse(p.x, p.y + p.r * 0.95, p.r * 0.9, p.r * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fill()
  ctx.translate(p.x, p.y - bob)
  ctx.scale(1 / squash, squash)
  // 총: 조준 방향으로
  const ang = Math.atan2(p.face.y, p.face.x)
  ctx.save()
  ctx.rotate(ang)
  ctx.beginPath()
  ctx.roundRect(8, -5, 22, 10, 4)
  outlined(ctx, '#5a5a6a', LINE, 3)
  ctx.beginPath()
  ctx.roundRect(22, -4, 6, 8, 2)
  outlined(ctx, WEAPONS[p.weapon].color, LINE, 2)
  ctx.restore()
  // 몸
  ctx.beginPath()
  ctx.arc(0, 0, p.r, 0, Math.PI * 2)
  outlined(ctx, '#ff6b5b', LINE, 4)
  // 모자
  ctx.beginPath()
  ctx.arc(0, -3, p.r * 0.85, Math.PI, 0)
  ctx.lineTo(p.r * 0.85, -3)
  ctx.closePath()
  outlined(ctx, '#3a6fd8', LINE, 3)
  // 얼굴 (눈은 조준 방향을 본다)
  eyes(ctx, 0, 2, 5, 3.5, p.face.x * 3, p.face.y * 3)
  ctx.restore()
}

function drawBullet(ctx, b) {
  const a = Math.atan2(b.vy, b.vx)
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.rotate(a)
  ctx.beginPath()
  ctx.roundRect(-7, -3.5, 14, 7, 3.5)
  outlined(ctx, b.color, LINE, 2)
  ctx.restore()
}

function drawParticles(ctx, parts) {
  for (const q of parts) {
    const k = Math.max(0, q.life / q.max)
    ctx.beginPath()
    ctx.arc(q.x, q.y, q.size * k + 1, 0, Math.PI * 2)
    ctx.fillStyle = q.color
    ctx.globalAlpha = k
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function drawHud(ctx, w) {
  const p = w.player
  // 하트
  for (let i = 0; i < p.maxHp; i++) {
    const x = 34 + i * 30
    const y = 34
    ctx.beginPath()
    ctx.arc(x - 6, y - 2, 8, 0, Math.PI * 2)
    ctx.arc(x + 6, y - 2, 8, 0, Math.PI * 2)
    ctx.moveTo(x - 14, y + 1)
    ctx.lineTo(x, y + 16)
    ctx.lineTo(x + 14, y + 1)
    outlined(ctx, i < p.hp ? '#ff4d6d' : '#5a4a5a', LINE, 3)
  }
  // 웨이브, 점수
  ctx.textBaseline = 'top'
  ctx.fillStyle = LINE
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText(`웨이브 ${w.wave}`, W - 170, 22)
  ctx.fillText(`점수 ${w.score}`, W - 170, 48)
  ctx.fillText(`처치 ${w.kills}`, W - 170, 74)
  // 무기 상자
  const wp = WEAPONS[p.weapon]
  ctx.beginPath()
  ctx.roundRect(22, H - 66, 210, 44, 12)
  outlined(ctx, '#fff8e6', LINE, 3)
  ctx.fillStyle = wp.color
  ctx.beginPath()
  ctx.arc(46, H - 44, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = LINE
  ctx.stroke()
  ctx.fillStyle = LINE
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText(`${wp.key}  ${wp.name}`, 68, H - 56)
  // 알림
  if (w.noticeT > 0) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px sans-serif'
    ctx.lineWidth = 6
    ctx.strokeStyle = '#fff8e6'
    ctx.strokeText(w.notice, W / 2, 70)
    ctx.fillStyle = LINE
    ctx.fillText(w.notice, W / 2, 70)
    ctx.textAlign = 'left'
  }
}

export function draw(ctx, w, t) {
  ctx.save()
  if (w.shake > 0) ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake)
  drawBackground(ctx, t)
  drawWalls(ctx)
  for (const c of w.coins) drawCoin(ctx, c, t)
  const items = [
    ...w.enemies.map((e) => ({ y: e.y, f: () => drawEnemy(ctx, e, t) })),
    { y: w.player.y, f: () => drawPlayer(ctx, w.player, t) },
  ].sort((a, b) => a.y - b.y)
  for (const it of items) it.f()
  for (const b of w.bullets) drawBullet(ctx, b)
  drawParticles(ctx, w.particles)
  ctx.restore()
  drawHud(ctx, w)
  if (w.over) {
    ctx.fillStyle = 'rgba(20,12,18,0.55)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.font = 'bold 48px sans-serif'
    ctx.lineWidth = 8
    ctx.strokeStyle = LINE
    ctx.strokeText('쓰러졌다!', W / 2, H / 2 - 40)
    ctx.fillStyle = '#ffd447'
    ctx.fillText('쓰러졌다!', W / 2, H / 2 - 40)
    ctx.font = 'bold 22px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`웨이브 ${w.wave} · 점수 ${w.score} · R 키로 다시 시작`, W / 2, H / 2 + 20)
    ctx.textAlign = 'left'
  }
}

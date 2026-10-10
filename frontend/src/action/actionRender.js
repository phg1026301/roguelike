// 액션 RPG 프로토타입 그리기: 굵은 외곽선 + 평면 음영 (지금까지 게임들과 같은 톤)
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, ATTACKS, ENEMY_TYPES } from './actionEngine'

const OUT = '#0a1a14'

function ellipse(ctx, x, y, rx, ry, fill, stroke = OUT, lw = 3) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

function drawGround(ctx, cx, cy) {
  // 잔디 체크 무늬: 보이는 부분만 그린다
  const T = 80
  const x0 = Math.floor(cx / T) * T
  const y0 = Math.floor(cy / T) * T
  for (let x = x0; x < cx + VIEW_W + T; x += T) {
    for (let y = y0; y < cy + VIEW_H + T; y += T) {
      const k = ((x / T) + (y / T)) % 2 === 0
      ctx.fillStyle = k ? '#7ccc5c' : '#72bf54'
      ctx.fillRect(x, y, T, T)
    }
  }
  // 작은 풀 무늬
  ctx.strokeStyle = 'rgba(40,110,40,0.35)'
  ctx.lineWidth = 2
  for (let x = x0; x < cx + VIEW_W; x += 40) {
    for (let y = y0; y < cy + VIEW_H; y += 40) {
      const s = (x * 13 + y * 7) % 11
      if (s < 3) {
        ctx.beginPath()
        ctx.moveTo(x + 6, y + 14)
        ctx.lineTo(x + 8, y + 6)
        ctx.lineTo(x + 10, y + 14)
        ctx.stroke()
      }
    }
  }
}

function drawTree(ctx, t) {
  ellipse(ctx, t.x, t.y + 18 * t.s, 22 * t.s, 8 * t.s, 'rgba(0,30,10,0.3)', null)
  ctx.fillStyle = '#7a4e2a'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.fillRect(t.x - 5 * t.s, t.y, 10 * t.s, 20 * t.s)
  ctx.strokeRect(t.x - 5 * t.s, t.y, 10 * t.s, 20 * t.s)
  ellipse(ctx, t.x, t.y - 6 * t.s, 26 * t.s, 24 * t.s, '#3f9a4a')
  ellipse(ctx, t.x - 6 * t.s, t.y - 12 * t.s, 10 * t.s, 8 * t.s, '#5cb868', null)
}

function drawWarning(ctx, e, spec) {
  // 예고: 공격 범위를 빨간 원으로 보여 준다. 차오르는 정도로 시간을 알린다
  const k = 1 - e.wt / spec.windup
  ctx.beginPath()
  ctx.arc(e.x, e.y, spec.range + e.r, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,70,80,${0.08 + k * 0.2})`
  ctx.fill()
  ctx.strokeStyle = `rgba(255,70,80,${0.4 + k * 0.5})`
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawEnemy(ctx, e, p, t) {
  const spec = ENEMY_TYPES[e.type]
  const wob = Math.sin(t * 10 + e.id * 10)
  const squash = e.state === 'chase' ? 1 + wob * 0.05 : 1
  const r = e.r
  ctx.save()
  if (e.state === 'spawn') ctx.globalAlpha = 0.4 + (1 - Math.max(0, e.delay) / 0.6) * 0.6
  // 그림자
  ellipse(ctx, e.x, e.y + r * 0.8, r * 1.1, r * 0.4, 'rgba(0,30,10,0.3)', null)
  if (e.type === 'slime') {
    ellipse(ctx, e.x, e.y, r * 1.2 * squash, r * 0.9 / squash, e.flash > 0 ? '#ffffff' : spec.color)
    ellipse(ctx, e.x - r * 0.35, e.y - r * 0.35, r * 0.3, r * 0.2, 'rgba(255,255,255,0.5)', null)
  } else {
    // 고블린: 뾰족한 귀와 날카로운 눈
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : spec.color
    ctx.strokeStyle = OUT
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(e.x - r, e.y - r * 0.2)
    ctx.lineTo(e.x - r * 1.6, e.y - r * 0.6)
    ctx.lineTo(e.x - r * 0.7, e.y - r * 0.8)
    ctx.moveTo(e.x + r, e.y - r * 0.2)
    ctx.lineTo(e.x + r * 1.6, e.y - r * 0.6)
    ctx.lineTo(e.x + r * 0.7, e.y - r * 0.8)
    ctx.fill()
    ctx.stroke()
    ellipse(ctx, e.x, e.y, r, r * 1.05, e.flash > 0 ? '#ffffff' : spec.color)
  }
  // 눈 (플레이어를 바라본다)
  const ang = Math.atan2(p.y - e.y, p.x - e.x)
  const ex = Math.cos(ang) * 3
  const ey = Math.sin(ang) * 3
  ellipse(ctx, e.x - r * 0.4, e.y - r * 0.1, 4, 5, '#ffffff', OUT, 2)
  ellipse(ctx, e.x + r * 0.4, e.y - r * 0.1, 4, 5, '#ffffff', OUT, 2)
  ctx.fillStyle = OUT
  ctx.beginPath()
  ctx.arc(e.x - r * 0.4 + ex * 0.5, e.y - r * 0.1 + ey * 0.5, 2, 0, Math.PI * 2)
  ctx.arc(e.x + r * 0.4 + ex * 0.5, e.y - r * 0.1 + ey * 0.5, 2, 0, Math.PI * 2)
  ctx.fill()
  // 체력바 (피해를 입었을 때만)
  if (e.hp < e.maxHp) {
    const bw = 34
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(e.x - bw / 2, e.y - r - 14, bw, 5)
    ctx.fillStyle = '#ff5a6a'
    ctx.fillRect(e.x - bw / 2, e.y - r - 14, bw * Math.max(0, e.hp / e.maxHp), 5)
  }
  ctx.restore()
}

function drawPlayer(ctx, p, w, t) {
  ctx.save()
  const blink = p.inv > 0 && !p.dodge && Math.floor(t * 20) % 2 === 0
  if (p.dodge) ctx.globalAlpha = 0.55
  else if (blink) ctx.globalAlpha = 0.35
  ellipse(ctx, p.x, p.y + 14, 16, 6, 'rgba(0,30,10,0.35)', null)
  // 몸 (파란 옷, 뒤로 흩날리는 망토)
  const bob = p.moving && !p.dodge ? Math.sin(p.walk) * 2 : 0
  const back = Math.atan2(-p.fy, -p.fx)
  ctx.fillStyle = '#7a3aa8'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(p.x + Math.cos(back) * 6, p.y + Math.sin(back) * 6 - 4)
  ctx.lineTo(p.x + Math.cos(back) * 20 + Math.sin(back) * 4, p.y + Math.sin(back) * 20 + 6)
  ctx.lineTo(p.x + Math.cos(back) * 18 - Math.sin(back) * 8, p.y + Math.sin(back) * 18 - 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  const hurtTint = p.hurt > 0
  ellipse(ctx, p.x, p.y + bob, 14, 15, hurtTint ? '#ff8a9a' : '#3a6ea5')
  // 머리
  ellipse(ctx, p.x, p.y - 14 + bob, 11, 11, '#f8dcc0')
  ctx.fillStyle = '#2a1f3a'
  ctx.beginPath()
  ctx.arc(p.x, p.y - 17 + bob, 11, Math.PI, 0)
  ctx.fill()
  // 눈
  ctx.fillStyle = OUT
  const ex = p.fx * 2
  const ey = p.fy * 2
  ctx.beginPath()
  ctx.arc(p.x - 4 + ex, p.y - 13 + bob + ey, 1.8, 0, Math.PI * 2)
  ctx.arc(p.x + 4 + ex, p.y - 13 + bob + ey, 1.8, 0, Math.PI * 2)
  ctx.fill()
  // 검: 공격 중에는 휘두른다
  let sword = Math.atan2(p.fy, p.fx)
  let lengthBoost = 0
  if (p.atk) {
    const A = ATTACKS[p.atk.step - 1]
    const k = Math.min(1, Math.max(0, (p.atk.t - A.from) / (A.to - A.from)))
    sword += -A.half + k * A.half * 2
    lengthBoost = A.finisher ? 8 : 0
  }
  const hx = p.x + Math.cos(sword) * 10
  const hy = p.y + Math.sin(sword) * 10 + bob
  const tx = hx + Math.cos(sword) * (26 + lengthBoost)
  const ty = hy + Math.sin(sword) * (26 + lengthBoost)
  ctx.strokeStyle = OUT
  ctx.lineWidth = 7
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke()
  ctx.strokeStyle = '#dfe9f2'
  ctx.lineWidth = 3.5
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke()
  ctx.restore()
}

function drawFx(ctx, f) {
  ctx.save()
  const k = Math.max(0, f.life / f.max)
  if (f.type === 'slash') {
    ctx.globalAlpha = k
    ctx.strokeStyle = f.finisher ? '#ffd447' : '#e8f6ff'
    ctx.lineWidth = f.finisher ? 9 : 5
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.range, f.ang - f.half, f.ang + f.half)
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
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = OUT
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.restore()
}

function drawHud(ctx, w) {
  const p = w.player
  // 체력
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(16, 16, 240, 22)
  ctx.fillStyle = '#ff5a6a'
  ctx.fillRect(16, 16, 240 * (p.hp / p.maxHp), 22)
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2
  ctx.strokeRect(16, 16, 240, 22)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`HP ${p.hp} / ${p.maxHp}`, 22, 32)
  // 회피 쿨다운
  const cdK = p.dodgeCd > 0 ? 1 - p.dodgeCd / 0.7 : 1
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(16, 46, 110, 14)
  ctx.fillStyle = cdK >= 1 ? '#b6ff9e' : '#6fa8c0'
  ctx.fillRect(16, 46, 110 * cdK, 14)
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px sans-serif'
  ctx.fillText('회피 (Space / K)', 22, 57)
  // 웨이브와 처치
  ctx.textAlign = 'right'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`웨이브 ${w.wave}  ·  처치 ${w.kills}  ·  점수 ${w.score}`, VIEW_W - 16, 32)
  // 콤보
  if (w.combo >= 2) {
    ctx.textAlign = 'right'
    ctx.font = 'bold 28px sans-serif'
    ctx.lineWidth = 5
    ctx.strokeStyle = OUT
    ctx.strokeText(`${w.combo} 콤보`, VIEW_W - 16, 70)
    ctx.fillStyle = w.combo >= 10 ? '#ffd447' : '#5ee6ff'
    ctx.fillText(`${w.combo} 콤보`, VIEW_W - 16, 70)
  }
  // 알림
  if (w.noticeT > 0 && w.notice) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 22px sans-serif'
    ctx.lineWidth = 5
    ctx.strokeStyle = OUT
    ctx.strokeText(w.notice, VIEW_W / 2, 90)
    ctx.fillStyle = '#ffd447'
    ctx.fillText(w.notice, VIEW_W / 2, 90)
  }
  if (w.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    ctx.textAlign = 'center'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('쓰러졌다', VIEW_W / 2, VIEW_H / 2 - 10)
    ctx.font = '16px sans-serif'
    ctx.fillText('R 키로 다시 시작', VIEW_W / 2, VIEW_H / 2 + 20)
  }
}

// 카메라는 플레이어를 따라가고 세계의 가장자리를 넘지 않는다
export function cameraOf(w) {
  return {
    x: Math.max(0, Math.min(WORLD_W - VIEW_W, w.player.x - VIEW_W / 2)),
    y: Math.max(0, Math.min(WORLD_H - VIEW_H, w.player.y - VIEW_H / 2)),
  }
}

export function draw(ctx, w, t) {
  const p = w.player
  const cam = cameraOf(w)
  const sx = (Math.random() - 0.5) * w.shake
  const sy = (Math.random() - 0.5) * w.shake
  ctx.save()
  ctx.fillStyle = '#1d3a22'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.translate(-cam.x + sx, -cam.y + sy)
  drawGround(ctx, cam.x, cam.y)
  // 세계 가장자리 표시
  ctx.strokeStyle = 'rgba(10,26,20,0.6)'
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H)
  // 나무는 앞뒤 순서대로 (y가 큰 것이 앞)
  const trees = w.trees.filter((tr) => tr.x > cam.x - 60 && tr.x < cam.x + VIEW_W + 60 && tr.y > cam.y - 60 && tr.y < cam.y + VIEW_H + 60)
  const things = []
  for (const tr of trees) things.push({ y: tr.y, fn: () => drawTree(ctx, tr) })
  for (const e of w.enemies) things.push({ y: e.y, fn: () => drawEnemy(ctx, e, p, t) })
  things.push({ y: p.y, fn: () => drawPlayer(ctx, p, w, t) })
  for (const e of w.enemies) {
    if (e.state === 'windup') {
      const spec = ENEMY_TYPES[e.type]
      drawWarning(ctx, e, spec)
    }
  }
  things.sort((a, b) => a.y - b.y)
  for (const th of things) th.fn()
  for (const f of w.fx) drawFx(ctx, f)
  ctx.restore()
  drawHud(ctx, w)
}

import { useEffect, useRef } from 'react'

// 네온 시티 장면 그림: 장면 분위기(bg)마다 다른 도시 풍경을 캔버스에 그린다
// 굵은 외곽선, 평면 음영, 청록-연두 네온 빛으로 애니메이션풍 포스터 느낌을 낸다
const W = 960
const H = 300
const LINE = '#05080c'

function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
}

// 건물 한 채: 외곽선 + 옆면 그림자 + 창문
function building(ctx, x, y, w, h, body, shade, winColor, seed = 0) {
  ctx.fillStyle = body
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = shade
  ctx.fillRect(x + w - 10, y, 10, h)
  ctx.strokeStyle = LINE
  ctx.lineWidth = 3
  ctx.strokeRect(x, y, w, h)
  windows(ctx, x, y, w, h, seed, winColor)
}

// 창문 격자 (일부는 불이 켜져 있다)
function windows(ctx, x, y, w, h, seed, color) {
  const cols = Math.max(1, Math.floor((w - 16) / 14))
  const rows = Math.max(1, Math.floor((h - 16) / 16))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = ((r * 7 + c * 13 + seed) % 5) < 2
      if (on) rect(ctx, x + 8 + c * 14, y + 10 + r * 16, 6, 8, color)
    }
  }
}

// 네온 간판 (글로우 + 흰 속심)
function neonText(ctx, text, x, y, color, size = 26, flicker = 1) {
  ctx.save()
  ctx.globalAlpha = flicker
  ctx.font = `bold ${size}px sans-serif`
  ctx.textAlign = 'center'
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = flicker * 0.7
  ctx.fillText(text, x, y)
  ctx.restore()
}

// 바닥의 젖은 반사
function wetFloor(ctx, y, c1, c2) {
  const rg = ctx.createLinearGradient(0, y, 0, H)
  rg.addColorStop(0, c1)
  rg.addColorStop(1, c2)
  rect(ctx, 0, y, W, H - y, rg)
}

function rain(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#04201e')
  g.addColorStop(0.6, '#0b3a34')
  g.addColorStop(1, '#1d5a3a')
  rect(ctx, 0, 0, W, H, g)
  // 뒤쪽 건물 (안개 같은 청록)
  const far = [[30, 160, 130], [190, 120, 150], [370, 180, 120], [560, 130, 170], [760, 170, 140], [900, 110, 90]]
  for (const [x, h, w] of far) building(ctx, x, H - h, w, h, '#0f4a44', '#0a3530', '#7ff5d0', x)
  // 앞쪽 건물
  building(ctx, 0, H - 90, W, 90, '#06201e', '#041614', '#2ad4a6', 3)
  // 네온 간판 (연두, 청록)
  neonText(ctx, 'NEON', 220, 96, '#b6ff3b', 32, 0.85 + Math.sin(t * 9) * 0.15)
  neonText(ctx, '배달 · 24H', 700, 130, '#5ee6ff', 20, Math.random() > 0.97 ? 0.3 : 1)
  wetFloor(ctx, H - 40, 'rgba(182,255,59,0.12)', 'rgba(94,230,255,0.28)')
  // 비 (가는 빗금)
  ctx.strokeStyle = 'rgba(190,255,230,0.5)'
  ctx.lineWidth = 1.6
  for (let i = 0; i < 90; i++) {
    const x = ((i * 113 + t * 300) % (W + 60)) - 30
    const y = ((i * 71 + t * 620) % H)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 6, y + 14)
    ctx.stroke()
  }
}

function tower(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#031c20')
  g.addColorStop(1, '#0b3a40')
  rect(ctx, 0, 0, W, H, g)
  // 옆 건물
  building(ctx, 60, 110, 170, H - 110, '#0c3a40', '#082a30', '#5ee6ff', 9)
  building(ctx, 720, 80, 190, H - 80, '#0c3a40', '#082a30', '#5ee6ff', 5)
  // 중앙 오르빗 타워 (가장 크고 밝다)
  building(ctx, 360, 14, 240, H - 14, '#144f54', '#0d3a40', '#b6ff3b', 3)
  rect(ctx, 360, 14, 240, 8, '#b6ff3b')
  // 타워 꼭대기 안테나
  ctx.strokeStyle = LINE
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(480, 14); ctx.lineTo(480, -8); ctx.stroke()
  // 타워 로고
  neonText(ctx, 'ORBIT', 480, 72, '#b6ff3b', 30, 0.9 + Math.sin(t * 3) * 0.1)
  // 드론 (천천히 위아래로)
  for (let i = 0; i < 3; i++) {
    const x = 180 + i * 300
    const y = 50 + Math.sin(t * 1.4 + i * 2) * 14
    ctx.fillStyle = '#d6fff0'
    ctx.strokeStyle = LINE
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(x - 14, y - 6, 28, 12, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ff4f6a'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function alarm(ctx, t) {
  const pulse = Math.sin(t * 8) > 0 ? 1 : 0
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1a0408')
  g.addColorStop(1, '#3a0a10')
  rect(ctx, 0, 0, W, H, g)
  // 복도 원근
  ctx.fillStyle = '#2a0a10'
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W - 240, 90); ctx.lineTo(240, 90); ctx.closePath()
  ctx.fill()
  rect(ctx, 240, 90, 480, 210, '#220a0e')
  rect(ctx, 0, 240, 240, 60, '#120406')
  rect(ctx, W - 240, 240, 240, 60, '#120406')
  // 천장 경보등
  for (const x of [200, 480, 760]) {
    ctx.fillStyle = pulse ? '#ff3030' : '#4a0c0c'
    ctx.shadowColor = '#ff3030'
    ctx.shadowBlur = pulse ? 30 : 0
    ctx.beginPath()
    ctx.arc(x, 20, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  neonText(ctx, '경보', 480, 170, pulse ? '#ff3030' : '#8a1a1a', 38)
}

function alley(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#06100e')
  g.addColorStop(1, '#162c24')
  rect(ctx, 0, 0, W, H, g)
  // 골목 양쪽 벽 (외곽선 있는 사선)
  ctx.fillStyle = '#0c1a16'
  ctx.strokeStyle = LINE
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(280, 90); ctx.lineTo(280, 260); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 280, 90); ctx.lineTo(W - 280, 260); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.stroke()
  rect(ctx, 280, 90, W - 560, 170, '#1a3a30')
  // 벽 낙서 네온
  neonText(ctx, '오늘도 잊지 마', 140, 150, '#b6ff3b', 18, 0.85)
  // 쓰레기통과 김
  rect(ctx, 600, 200, 46, 60, '#2f4a42')
  ctx.strokeStyle = LINE
  ctx.strokeRect(600, 200, 46, 60)
  for (let i = 0; i < 3; i++) {
    const y = 180 - ((t * 40 + i * 30) % 90)
    ctx.fillStyle = 'rgba(200,255,230,0.18)'
    ctx.beginPath()
    ctx.arc(620 + Math.sin(t + i) * 8, y, 14 + i * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  // 골목 끝 빛
  const glow = ctx.createRadialGradient(480, 150, 10, 480, 150, 200)
  glow.addColorStop(0, 'rgba(94,230,255,0.28)')
  glow.addColorStop(1, 'rgba(94,230,255,0)')
  rect(ctx, 0, 0, W, H, glow)
}

function vault(ctx, t) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 560)
  g.addColorStop(0, '#0c5a4a')
  g.addColorStop(1, '#02120e')
  rect(ctx, 0, 0, W, H, g)
  // 유리 상자 줄
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 90 + col * 115
      const y = 70 + row * 110
      ctx.fillStyle = 'rgba(182,255,59,0.1)'
      ctx.strokeStyle = 'rgba(182,255,59,0.7)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(x, y, 80, 80, 8)
      ctx.fill()
      ctx.stroke()
      // 기억 칩 (반짝인다)
      const k = 0.6 + Math.sin(t * 3 + col + row * 2) * 0.4
      ctx.shadowColor = '#b6ff3b'
      ctx.shadowBlur = 14 * k
      ctx.fillStyle = `rgba(214,255,160,${0.5 + k * 0.5})`
      ctx.beginPath()
      ctx.roundRect(x + 24, y + 26, 32, 28, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }
  neonText(ctx, 'VAULT', 480, 42, '#b6ff3b', 22, 0.9)
}

// 항만: 컨테이너와 크레인, 노바의 주황 불빛
function port(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#051a1c')
  g.addColorStop(1, '#0d3030')
  rect(ctx, 0, 0, W, H, g)
  // 먼 크레인 실루엣
  ctx.strokeStyle = LINE
  ctx.fillStyle = '#0a2224'
  ctx.lineWidth = 4
  for (const x of [120, 560, 860]) {
    ctx.beginPath(); ctx.moveTo(x, H - 150); ctx.lineTo(x, 40); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - 80, 40); ctx.lineTo(x + 120, 40); ctx.stroke()
  }
  // 컨테이너 줄 (외곽선 + 주황/청록 색)
  const boxes = [[20, 130, 110, '#c26a1f'], [140, 130, 110, '#1d8f8a'], [260, 130, 110, '#c26a1f'], [640, 120, 110, '#1d8f8a'], [760, 120, 110, '#c26a1f'], [880, 120, 90, '#1d8f8a']]
  for (const [x, y, w, c] of boxes) {
    rect(ctx, x, H - y - 30, w, 60, c)
    ctx.strokeStyle = LINE
    ctx.lineWidth = 3
    ctx.strokeRect(x, H - y - 30, w, 60)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    for (let i = 1; i < 4; i++) rect(ctx, x + i * (w / 4), H - y - 30, 2, 60)
  }
  // 노바 로고 간판
  neonText(ctx, 'NOVA', 480, 88, '#ffb347', 32, 0.9 + Math.sin(t * 4) * 0.1)
  // 출렁이는 바다 반사
  wetFloor(ctx, H - 26, 'rgba(255,179,71,0.08)', 'rgba(94,230,255,0.22)')
}

// 백색 구역: 세라프의 흰 연구소, 깨끗하지만 어딘가 차갑다
function seraph(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#dffcf4')
  g.addColorStop(1, '#8fd9c4')
  rect(ctx, 0, 0, W, H, g)
  // 흰 기둥과 아치
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 160
    rect(ctx, x, 60, 36, H - 60, '#f4fffb')
    ctx.strokeStyle = LINE
    ctx.lineWidth = 3
    ctx.strokeRect(x, 60, 36, H - 60)
  }
  ctx.strokeStyle = LINE
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(480, 200, 130, Math.PI, 0); ctx.stroke()
  // 중앙 세라프 마크 (빛나는 링)
  ctx.save()
  ctx.shadowColor = '#2ad4a6'
  ctx.shadowBlur = 20 + Math.sin(t * 2) * 4
  ctx.strokeStyle = '#2ad4a6'
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(480, 150, 54, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  neonText(ctx, 'SERAPH', 480, 258, '#0b6b58', 26, 0.95)
  wetFloor(ctx, H - 28, 'rgba(255,255,255,0.4)', 'rgba(42,212,166,0.25)')
}

function neon(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#04161a')
  g.addColorStop(1, '#0e3a2e')
  rect(ctx, 0, 0, W, H, g)
  // 스카이라인 (외곽선 + 창)
  const skyline = [[0, 180, 90], [90, 130, 70], [160, 200, 100], [260, 150, 80], [700, 170, 90], [790, 210, 80], [870, 140, 90]]
  for (const [x, h, w] of skyline) building(ctx, x, H - h, w, h, '#0a2a26', '#06201c', '#b6ff3b', x * 3)
  // 큰 네온 링 (연두 + 청록)
  ctx.save()
  ctx.strokeStyle = '#b6ff3b'
  ctx.shadowColor = '#b6ff3b'
  ctx.shadowBlur = 24
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(W / 2, 130, 84 + Math.sin(t * 2) * 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#5ee6ff'
  ctx.shadowColor = '#5ee6ff'
  ctx.beginPath()
  ctx.arc(W / 2, 130, 66, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  neonText(ctx, '네온 시티', W / 2, 146, '#ffffff', 26, 0.95)
}

const PAINT = { rain, tower, alarm, alley, vault, port, seraph, neon }

export default function StoryArt({ bg }) {
  const ref = useRef(null)
  const bgRef = useRef(bg)
  bgRef.current = bg

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf = 0
    const start = performance.now()
    function frame(now) {
      const t = (now - start) / 1000
      ctx.save()
      ctx.clearRect(0, 0, W, H)
      ;(PAINT[bgRef.current] || rain)(ctx, t)
      ctx.restore()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} width={W} height={H} className="st-art" aria-hidden="true" />
}

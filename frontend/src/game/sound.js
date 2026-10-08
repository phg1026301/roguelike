// 효과음: 음원 파일 없이 Web Audio로 바로 만드는 8비트풍 소리
const MUTE_KEY = 'roguelike.muted'
let ctx = null
let master = null
let muted = false
try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  muted = false
}

// 브라우저는 사용자 입력 뒤에야 소리를 허용하므로, 첫 입력 때 깨운다
function audio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function unlockSound() {
  audio()
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  muted = !muted
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // 저장이 막혀 있어도 이번 접속에서는 동작한다
  }
  return muted
}

// 주파수가 from에서 to로 미끄러지는 음
function tone(c, { type = 'square', from, to, t0 = 0, dur = 0.1, vol = 0.2 }) {
  const osc = c.createOscillator()
  const g = c.createGain()
  const start = c.currentTime + t0
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to ?? from), start + dur)
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// 짧은 잡음 (타격 같은 거친 소리)
function noise(c, { t0 = 0, dur = 0.1, vol = 0.2, filter = 'lowpass', freq = 1200 }) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(c.currentTime + t0)
}

const SOUNDS = {
  hit: (c) => {
    tone(c, { type: 'square', from: 220, to: 90, dur: 0.09, vol: 0.18 })
    noise(c, { dur: 0.06, vol: 0.25, freq: 1500 })
  },
  crit: (c) => {
    tone(c, { type: 'square', from: 880, to: 330, dur: 0.14, vol: 0.2 })
    noise(c, { dur: 0.1, vol: 0.3, filter: 'highpass', freq: 3000 })
  },
  hurt: (c) => {
    tone(c, { type: 'sawtooth', from: 260, to: 70, dur: 0.22, vol: 0.22 })
    noise(c, { dur: 0.15, vol: 0.3, freq: 700 })
  },
  coin: (c) => {
    tone(c, { type: 'square', from: 988, dur: 0.06, vol: 0.14 })
    tone(c, { type: 'square', from: 1319, t0: 0.06, dur: 0.2, vol: 0.14 })
  },
  magic: (c) => tone(c, { type: 'sine', from: 500, to: 1500, dur: 0.2, vol: 0.2 }),
  arrow: (c) => {
    noise(c, { dur: 0.08, vol: 0.18, filter: 'bandpass', freq: 3500 })
    tone(c, { type: 'triangle', from: 700, to: 300, dur: 0.1, vol: 0.12 })
  },
  blast: (c) => {
    noise(c, { dur: 0.35, vol: 0.45, freq: 500 })
    tone(c, { type: 'sine', from: 140, to: 40, dur: 0.35, vol: 0.4 })
  },
  fire: (c) => {
    noise(c, { dur: 0.25, vol: 0.25, filter: 'bandpass', freq: 900 })
    tone(c, { type: 'sawtooth', from: 200, to: 90, dur: 0.25, vol: 0.12 })
  },
  heal: (c) => {
    ;[523, 659, 784].forEach((f, i) => tone(c, { type: 'triangle', from: f, t0: i * 0.07, dur: 0.12, vol: 0.18 }))
  },
  warn: (c) => {
    tone(c, { type: 'sine', from: 900, dur: 0.08, vol: 0.15 })
    tone(c, { type: 'sine', from: 900, t0: 0.14, dur: 0.08, vol: 0.15 })
  },
  step: (c) => noise(c, { dur: 0.03, vol: 0.05, freq: 500 }),
  kill: (c) => tone(c, { type: 'square', from: 330, to: 660, dur: 0.12, vol: 0.16 }),
  levelup: (c) => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(c, { type: 'square', from: f, t0: i * 0.09, dur: 0.14, vol: 0.14 }))
  },
  chest: (c) => {
    tone(c, { type: 'triangle', from: 300, to: 700, dur: 0.18, vol: 0.2 })
    ;[988, 1319, 1568].forEach((f, i) => tone(c, { type: 'square', from: f, t0: 0.18 + i * 0.06, dur: 0.12, vol: 0.12 }))
  },
  shop: (c) => tone(c, { type: 'square', from: 1200, dur: 0.04, vol: 0.1 }),
  start: (c) => {
    ;[392, 523, 659].forEach((f, i) => tone(c, { type: 'square', from: f, t0: i * 0.1, dur: 0.14, vol: 0.13 }))
  },
  boss: (c) => {
    ;[196, 262, 330, 392].forEach((f, i) => tone(c, { type: 'sawtooth', from: f, t0: i * 0.15, dur: 0.3, vol: 0.14 }))
  },
  die: (c) => {
    tone(c, { type: 'sawtooth', from: 300, to: 40, dur: 0.9, vol: 0.25 })
    noise(c, { dur: 0.5, vol: 0.2, freq: 400 })
  },
}

export function playSound(name) {
  if (muted || !SOUNDS[name]) return
  const c = audio()
  if (!c) return
  try {
    SOUNDS[name](c)
  } catch {
    // 소리가 안 나도 게임은 계속된다
  }
}

// 효과음: 음원 파일 없이 Web Audio로 바로 만드는 8비트풍 소리
const MUTE_KEY = 'roguelike.muted'
const VOL_KEY = 'roguelike.volume' // { music, sfx } 0~1
let ctx = null
let master = null
let sfxBus = null // 효과음 음량
let musicBus = null // 배경음악 음량
let muted = false
try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  muted = false
}
const DEFAULT_VOL = { music: 0.7, sfx: 0.8 }
let volume = { ...DEFAULT_VOL }
try {
  const saved = JSON.parse(localStorage.getItem(VOL_KEY) || 'null')
  if (saved && typeof saved.music === 'number') volume.music = saved.music
  if (saved && typeof saved.sfx === 'number') volume.sfx = saved.sfx
} catch {
  volume = { ...DEFAULT_VOL }
}
// 배경음악은 원래 작게 만들어져 있어서 2배로 키워 쓴다
const musicGain = () => volume.music * 2

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
      sfxBus = ctx.createGain()
      sfxBus.gain.value = volume.sfx
      sfxBus.connect(master)
      musicBus = ctx.createGain()
      musicBus.gain.value = musicGain()
      musicBus.connect(master)
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
function tone(c, { type = 'square', from, to, t0 = 0, dur = 0.1, vol = 0.2, out = null }) {
  const osc = c.createOscillator()
  const g = c.createGain()
  const start = c.currentTime + t0
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to ?? from), start + dur)
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(out || sfxBus || master)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// 짧은 잡음 (타격 같은 거친 소리)
function noise(c, { t0 = 0, dur = 0.1, vol = 0.2, filter = 'lowpass', freq = 1200, out = null }) {
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
  g.connect(out || sfxBus || master)
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

// ---- 배경음악: 음원 파일 없이 8비트 루프를 바로 만든다 ----
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function noteFreq(n) {
  if (!n) return 0
  const m = /^([A-G])(#?)(\d)$/.exec(n)
  const midi = (Number(m[3]) + 1) * 12 + NOTE_BASE[m[1]] + (m[2] ? 1 : 0)
  return 440 * Math.pow(2, (midi - 69) / 12)
}
const rep = (pattern, times) => Array.from({ length: times }, () => pattern).flat()
// 4칸마다 한 음만 내는 느린 베이스
const quarter = (notes) => notes.flatMap((n) => [n, null, null, null])

// 던전: A단조 모험 테마 (느긋한 행진). 보스방: 빠르고 긴장감 있는 테마
const TRACKS = {
  dungeon: {
    bpm: 116,
    lead: [
      'A4', null, 'C5', null, 'E5', null, 'D5', 'C5', 'A4', null, 'G4', null, 'A4', null, null, null,
      'F4', null, 'A4', null, 'C5', null, 'B4', 'A4', 'G4', null, 'E4', null, null, null, null, null,
    ],
    bass: quarter(['A2', 'F2', 'C3', 'E2', 'A2', 'F2', 'G2', 'E2']),
    leadType: 'square', leadVol: 0.045, bassVol: 0.09, kick: false, hat: true,
  },
  boss: {
    bpm: 150,
    lead: [
      'E4', 'E4', null, 'E4', 'G4', null, 'F4', 'E4', 'D4', null, 'D4', null, 'B3', null, 'C4', 'D4',
      'E4', 'E4', null, 'E4', 'G4', null, 'B4', 'A4', 'G#4', null, 'A4', null, 'E4', null, null, null,
    ],
    bass: rep(['E2', null, 'E2', 'E3', 'E2', null, 'D2', 'D3'], 4),
    leadType: 'sawtooth', leadVol: 0.035, bassVol: 0.08, kick: true, hat: true,
  },
}

let music = null // { name, step, next, timer }

function playMusicStep(c, t, i, when, dur) {
  const out = musicBus
  const lead = t.lead[i]
  if (lead) tone(c, { type: t.leadType, from: noteFreq(lead), t0: when, dur: dur * 0.9, vol: t.leadVol, out })
  const bass = t.bass[i]
  if (bass) tone(c, { type: 'triangle', from: noteFreq(bass), t0: when, dur: dur * 0.95, vol: t.bassVol, out })
  if (t.kick && i % 8 === 0) tone(c, { type: 'sine', from: 120, to: 40, t0: when, dur: 0.15, vol: 0.2, out })
  if (t.hat && i % 2 === 1) noise(c, { t0: when, dur: 0.03, vol: 0.05, filter: 'highpass', freq: 6000, out })
}

// 앞으로 0.3초 분량을 미리 예약한다 (타이머가 조금 늦어도 끊기지 않게)
function pumpMusic(c, st) {
  const t = TRACKS[st.name]
  const dur = 60 / t.bpm / 2 // 8분음표 길이
  while (st.next < c.currentTime + 0.3) {
    if (!muted) playMusicStep(c, t, st.step % t.lead.length, st.next - c.currentTime, dur)
    st.step += 1
    st.next += dur
  }
}

// 'dungeon' 또는 'boss' 테마를 튼다. 같은 테마가 이미 돌고 있으면 그대로 둔다
export function startMusic(name) {
  if (!TRACKS[name]) return
  if (music && music.name === name) return
  stopMusic()
  const c = audio()
  if (!c) return
  const st = { name, step: 0, next: c.currentTime + 0.05, timer: null }
  music = st
  pumpMusic(c, st)
  st.timer = setInterval(() => {
    if (music === st) pumpMusic(c, st)
  }, 60)
}

export function stopMusic() {
  if (music) clearInterval(music.timer)
  music = null
}

// 음량 조절: kind는 'music' 또는 'sfx', value는 0~1
export function getVolume() {
  return { ...volume }
}

export function setVolume(kind, value) {
  if (kind !== 'music' && kind !== 'sfx') return
  volume = { ...volume, [kind]: Math.max(0, Math.min(1, value)) }
  try {
    localStorage.setItem(VOL_KEY, JSON.stringify(volume))
  } catch {
    // 저장이 막혀 있어도 이번 접속에서는 동작한다
  }
  if (sfxBus) sfxBus.gain.value = volume.sfx
  if (musicBus) musicBus.gain.value = musicGain()
}

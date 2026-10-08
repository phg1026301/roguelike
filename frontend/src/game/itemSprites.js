// 장비 픽셀 아이콘 (16x16). 테두리는 자동으로 그린다.
const OUTLINE = '#1a1420'

function grid() {
  return Array.from({ length: 16 }, () => Array(16).fill(null))
}

function set(g, x, y, c) {
  if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c
}

function fromRows(rows, pal) {
  const g = grid()
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) if (pal[row[x]]) g[y][x] = pal[row[x]]
  })
  return g
}

function outline(g) {
  const o = g.map((r) => [...r])
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (g[y][x]) continue
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])
      if (near) o[y][x] = OUTLINE
    }
  }
  return o
}

// 대각선 검: tip에서 왼쪽 아래로 칼날 → 가드 → 손잡이 → 폼멜
function sword({ tip = [13, 2], len = 7, blade = ['#eef2f8', '#9aa3b0'], guard = '#ffd23c', handle = '#7a4f28', pommel = '#ffd23c', wide = 1 }) {
  const g = grid()
  const [x, y] = tip
  for (let t = 0; t <= len; t++) {
    set(g, x - t, y + t, blade[0])
    set(g, x - t, y + t + 1, blade[1])
  }
  const ex = x - len - 1
  const ey = y + len + 1
  for (let i = -wide - 1; i <= wide + 1; i++) set(g, ex + i, ey + i, guard)
  set(g, ex - 1, ey + 1, handle)
  set(g, ex - 2, ey + 2, handle)
  set(g, ex - 3, ey + 3, pommel)
  return g
}

const TORSO = [
  '................',
  '................',
  '....AA....AA....',
  '...AAAa..aAAA...',
  '..AAAAAaaAAAAA..',
  '..AAAAAAAAAAAA..',
  '..AaAAAAAAAAaA..',
  '...AAAAAAAAAA...',
  '...AAAAaaAAAA...',
  '...AAAAAAAAAA...',
  '...CCCCDDCCCC...',
  '...AAAAAAAAAA...',
  '...AAAAaaAAAA...',
  '....AAAAAAAA....',
  '................',
  '................',
]

const RING = [
  '................',
  '................',
  '......GGGG......',
  '.....GeGGGG.....',
  '......GGGG......',
  '.....AAAAAA.....',
  '....AAa..aAA....',
  '...AAa....aAA...',
  '...AA......AA...',
  '...AA......AA...',
  '...aAA....AAa...',
  '....aAA..AAa....',
  '.....aAAAAa.....',
  '................',
  '................',
  '................',
]

const BUILDERS = {
  // ===== 무기 =====
  dagger: () => {
    const g = sword({ tip: [12, 3], len: 4, blade: ['#cbb9a6', '#8a6a5a'], guard: '#7d7d88', handle: '#5a3b20', pommel: '#7d7d88', wide: 0 })
    set(g, 10, 5, '#a0522d')
    set(g, 11, 5, '#a0522d')
    return g
  },
  club: () => {
    const g = grid()
    for (let t = 0; t <= 9; t++) {
      const x = 3 + t
      const y = 13 - t
      set(g, x, y, '#7a4f28')
      if (t > 2) set(g, x + 1, y, '#b07a45')
      if (t > 5) {
        set(g, x, y - 1, '#b07a45')
        set(g, x + 1, y - 1, '#c98e55')
      }
    }
    set(g, 11, 4, '#c9ced8')
    set(g, 10, 7, '#c9ced8')
    set(g, 13, 5, '#c9ced8')
    return g
  },
  steel: () => sword({}),
  axe: () => {
    const g = grid()
    for (let t = 0; t <= 8; t++) set(g, 3 + t, 13 - t, t % 3 === 0 ? '#5a3b20' : '#8a5a2b')
    const head = { 1: [11, 12], 2: [10, 13], 3: [9, 14], 4: [9, 14], 5: [10, 14], 6: [11, 13] }
    for (const [yy, [a, b]] of Object.entries(head)) {
      for (let xx = a; xx <= b; xx++) set(g, xx, Number(yy), xx === b ? '#eef2f8' : xx <= a + 1 ? '#5d6572' : '#9aa3b0')
    }
    return g
  },
  rune: () => {
    const g = sword({ len: 8, blade: ['#c8b8ff', '#6a4ad0'], guard: '#5ff0dc', handle: '#2a1d42', pommel: '#5ff0dc', wide: 1 })
    for (const t of [1, 3, 5, 7]) set(g, 13 - t, 2 + t, '#5ff0dc')
    return g
  },
  flame: () => {
    const g = sword({ len: 8, blade: ['#ffe066', '#ff6a2a'], guard: '#ffd23c', handle: '#3a1a10', pommel: '#ff3b3b', wide: 1 })
    for (const t of [0, 2, 4, 6]) {
      set(g, 14 - t, 1 + t, '#ff8a2a')
      set(g, 15 - t, 1 + t, '#ff3b3b')
    }
    set(g, 14, 0, '#ffe066')
    set(g, 13, 1, '#fff6c0')
    return g
  },

  // ===== 방어구 =====
  leather: () => fromRows(TORSO, { A: '#a0683a', a: '#6a4224', C: '#3a2a1a', D: '#ffd23c' }),
  robe: () => fromRows([
    '................',
    '......AAAA......',
    '.....AaaaaA.....',
    '....AAaaaaAA....',
    '...AAAAAAAAAA...',
    '..AAAAACCAAAAA..',
    '..AA.AACCAA.AA..',
    '..Aa.AACCAA.aA..',
    '.....AACCAA.....',
    '.....AADDAA.....',
    '....AAACCAAA....',
    '....AAACCAAA....',
    '...AAAACCAAAA...',
    '...CCCCCCCCCC...',
    '................',
    '................',
  ], { A: '#3b4a9c', a: '#252f6a', C: '#f0c060', D: '#fff6c0' }),
  chain: () => {
    const g = fromRows(TORSO, { A: '#c9ced8', a: '#c9ced8', C: '#5d6572', D: '#9aa3b0' })
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) if (g[y][x] === '#c9ced8' && (x + y) % 2) g[y][x] = '#8a92a0'
    }
    return g
  },
  plate: () => fromRows([
    '................',
    '..AAA......AAA..',
    '.AAAAA....AAAAA.',
    '.AaaAAAAAAAAaaA.',
    '..AAAAAAAAAAAA..',
    '..AAAAACCAAAAA..',
    '...AAAACCAAAA...',
    '...AAAADDAAAA...',
    '...AAAACCAAAA...',
    '...aAAAAAAAAa...',
    '...CCCCCCCCCC...',
    '...AAAAaaAAAA...',
    '...AAAA..AAAA...',
    '...aaa....aaa...',
    '................',
    '................',
  ], { A: '#dfe4ec', a: '#9aa3b0', C: '#ffd23c', D: '#5aa8ff' }),
  thorn: () => fromRows([
    '..T..........T..',
    '..AT.T....T.TA..',
    '.AAAAA....AAAAA.',
    'TAaaAAAAAAAAaaAT',
    '..AAAATAATAAAA..',
    '..AAAAACCAAAAA..',
    '.TAAAAACCAAAAAT.',
    '...AAAADDAAAA...',
    '..TAAAACCAAAAT..',
    '...aAAAAAAAAa...',
    '...CCCCCCCCCC...',
    '..TAAAAaaAAAAT..',
    '...AAAA..AAAA...',
    '...aaa....aaa...',
    '................',
    '................',
  ], { A: '#3f7a3a', a: '#24501f', C: '#8a5a2b', D: '#ff3b3b', T: '#e8f0c8' }),

  // ===== 장신구 =====
  ring: () => fromRows(RING, { A: '#d08a50', a: '#8a5228', G: '#5aa8ff', e: '#ffffff' }),
  feather: () => fromRows([
    '............AA..',
    '..........AAAA..',
    '.........AAaAA..',
    '........AAaAAC..',
    '.......AAaAAC...',
    '......AAaAAC....',
    '.....AAaAAC.....',
    '....AAaAAC......',
    '...AAaAAC.......',
    '...AaAAC........',
    '..AaAC..........',
    '..aC............',
    '.s..............',
    's...............',
    '................',
    '................',
  ], { A: '#f2f6ff', a: '#a8c8ff', C: '#5ff0dc', s: '#c9a87a' }),
  eye: () => fromRows([
    '....c......c....',
    '.....c....c.....',
    '......c..c......',
    '.......cc.......',
    '.....AAAAAA.....',
    '....AWWWWWWA....',
    '...AWWBBBBWWA...',
    '...AWBBkkBBWA...',
    '...AWBBkkBBWA...',
    '...AWWBBBBWWA...',
    '....AWWWWWWA....',
    '.....AAAAAA.....',
    '................',
    '................',
    '................',
    '................',
  ], { c: '#c9a87a', A: '#ffd23c', W: '#f2f6ff', B: '#3a7bd5', k: '#101018' }),
  blood: () => fromRows([
    '...c........c...',
    '....c......c....',
    '.....c....c.....',
    '......c..c......',
    '.......cc.......',
    '......SSSS......',
    '.....RRRRRR.....',
    '....RReRRRRR....',
    '....RRRRRRRR....',
    '....RRRRRRrR....',
    '.....RRRRrr.....',
    '......RRrr......',
    '.......rr.......',
    '................',
    '................',
    '................',
  ], { c: '#c9ced8', S: '#9aa3b0', R: '#e0303a', r: '#8a1424', e: '#ffd0d0' }),
  luck: () => {
    const g = fromRows(RING, { A: '#ffd23c', a: '#c99a1a', G: '#4fd65a', e: '#ffffff' })
    set(g, 1, 3, '#fff6c0')
    set(g, 14, 9, '#fff6c0')
    set(g, 13, 2, '#ffffff')
    return g
  },
}

const cache = {}

// 장비 key → 이미지 주소(data URL). 화면에서 <img>로 쓴다.
export function itemIconUrl(key) {
  if (cache[key]) return cache[key]
  const build = BUILDERS[key]
  if (!build) return null
  const g = outline(build())
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  g.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return
    ctx.fillStyle = c
    ctx.fillRect(x, y, 1, 1)
  }))
  cache[key] = canvas.toDataURL()
  return cache[key]
}

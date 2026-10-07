// 픽셀아트 스프라이트 (16x16). 글자 하나 = 픽셀 하나, '.'은 투명
const PALETTE = {
  // 마법사(플레이어)
  H: '#3b4a9c', h: '#f0c060', S: '#f2c79a', e: '#1a1a22', W: '#ececec', B: '#5b4a8a', b: '#463868', s: '#8a5a2b', c: '#7fd3ff', k: '#2a2230',
  // 쥐
  p: '#8a7a6a', q: '#6f6152', R: '#ff4040', n: '#e090a0', t: '#c09090',
  // 고블린
  g: '#3f8f3f', G: '#5cc05c', Y: '#ffdd00', m: '#234023', L: '#7a5230', l: '#5a3b20', d: '#c8c8d0',
  // 오크
  O: '#7f9a43', o: '#5f7630', r: '#ff3030', T: '#fffbe8', M: '#2a1a10', A: '#8a3030', a: '#6a2222', K: '#4a3a2a',
  // 포션
  w: '#d8e4f0', P: '#e04a8a', i: '#ff9cc8', C: '#8a5a2b',
}

const SPRITE_DATA = {
  player: [
    '.......HH.......',
    '......HHHH......',
    '.....HHHHHH.....',
    '....HHHhhHHH....',
    '..HHHHHHHHHHHH..',
    '.....SSSSSS..c..',
    '.....SeSSeS..s..',
    '.....WWWWWW..s..',
    '....bWWWWWWb.s..',
    '...BBBWWWWBBBs..',
    '...BBBBWWBBBBs..',
    '....BBBBBBBB.s..',
    '....BBBBBBBB.s..',
    '....bBBBBBBb....',
    '.....kk..kk.....',
  ],
  rat: [
    '.....q....q.....',
    '....qpq..qpq....',
    '....pppppppp....',
    '...ppRppppRpp...',
    '...pppppppppp...',
    '....ppnnnnpp....',
    '...pppppppppp...',
    '..pppppppppppp..',
    '..pppppppppppp.t',
    '...pppppppppp.t.',
    '....q.q..q.q.t..',
  ],
  goblin: [
    '..g..........g..',
    '..gg.GGGGGG.gg..',
    '...gGGGGGGGGg...',
    '....GYGGGGYG....',
    '....GGGGGGGG....',
    '.....GGmmGG.....',
    '....LLLLLLLL....',
    '...GLLLLLLLLG.d.',
    '...G.LLllLL.G.d.',
    '.....LLLLLL...d.',
    '.....LL..LL...l.',
    '.....ll..ll.....',
  ],
  orc: [
    '....oOOOOOOo....',
    '...OOOOOOOOOO...',
    '...OrrOOOOrrO...',
    '...OOOOOOOOOO...',
    '...OTOMMMMOTO...',
    '....OOOOOOOO....',
    '..AAAAAAAAAAAA..',
    '.OAAAaAAAAaAAAO.',
    '.OAAAAAAAAAAAAO.',
    '.OOAAAAAAAAAAOO.',
    '.O.AAAAAAAAAA.O.',
    '...KKKK..KKKK...',
    '...KKKK..KKKK...',
    '...MMMM..MMMM...',
  ],
  potion: [
    '.......CC.......',
    '.......ww.......',
    '......wwww......',
    '.....wPPPPw.....',
    '....wPiPPPPw....',
    '....wPPPPPPw....',
    '....wPPPPPPw....',
    '.....wPPPPw.....',
    '......wwww......',
  ],
}

const cache = {}

// 스프라이트를 작은 캔버스에 미리 그려두고 재사용
export function getSprite(name) {
  if (cache[name]) return cache[name]
  const rows = SPRITE_DATA[name]
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = rows.length
  const ctx = canvas.getContext('2d')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    }
  })
  cache[name] = canvas
  return canvas
}

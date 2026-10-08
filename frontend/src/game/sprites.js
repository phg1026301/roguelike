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
  // 보스
  Z: '#4a3470', z: '#2e2048', X: '#a3a85a', x: '#7d8240', E: '#ffe14a', F: '#ff2d2d',
  // 전사 / 궁수
  Q: '#c8323c', U: '#c9ced8', u: '#5d6572', I: '#3b5bb5', J: '#eef2f8', j: '#7a4f28',
  // 상인
  N: '#2f9e8f', V: '#1f6e64',
  // 포션
  w: '#d8e4f0', P: '#e04a8a', i: '#ff9cc8', C: '#8a5a2b',
  // 신규 몬스터: 슬라임(y 몸, v 그림자, f 반짝임), 해골(D 뼈), 골렘(& 돌, $ 어두운 돌, ^ 이끼), 유령(@ 몸)
  y: '#5fe0b0', v: '#2a9a78', f: '#c8fff0', D: '#ece4cc',
  '&': '#6b6878', '$': '#3e3b4a', '^': '#5f8a4a', '@': '#9fb8ff',
  '!': '#5a6aa8', '+': '#15121c', '[': '#8a2a3a', ']': '#b23a4a', '{': '#4a1020',
  // 보스 그림: 오우거(O 살갗, K 천, M 신발), 심연의 군주(z 망토, Z 장식, = 후드, ~ 빛), 잿빛 대마왕(* 잿빛, $ 어두운 잿빛, & 날개, | 뿔)
  '|': '#c4c8d4', '*': '#8a8f9c', '=': '#1a1028', '~': '#c9a0ff',
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
  warrior: [
    '......QQ........',
    '.....uUUu.......',
    '....uUUUUu......',
    '....UueeuU....J.',
    '....UUUUUU....J.',
    '.....USSU.....J.',
    '...QQUUUUQQ...J.',
    '..IIQUUUUQQ..JJ.',
    '.IIIIUUUUUQQUJ..',
    '.IIhIUUUUUQQ.j..',
    '.IIIIUUUUUU.....',
    '..IIQQQQQQQ.....',
    '....UUU.UUU.....',
    '....kkk.kkk.....',
  ],
  archer: [
    '.......gg.......',
    '......gggg...C..',
    '.....gggggg.C.w.',
    '.....gSSSSg.C..w',
    '.....SeSSeS.C..w',
    '......SSSS..C..w',
    '....gggggggggC.w',
    '...ggGgggGgg.C.w',
    '...gGggLLggGgC.w',
    '...g.ggLLgg..C.w',
    '.....gggggg.C.w.',
    '.....Gg..gG..C..',
    '.....LL..LL.....',
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
  boss: [
    '.D.EEEEEEEEEE.D.',
    'DD.EEEEEEEEEE.DD',
    'DD..[[[[[[[[..DD',
    '..[[[[[[[[[[[[..',
    '..[[FF[[[[FF[[..',
    '..[[[[[TTTT[[[..',
    '.]]]]]]]]]]]]]].',
    'D]]]]]]]]]]]]]]D',
    '{{]]]]]]]]]]]]{{',
    '{{{]]]]]]]]]]{{{',
    '{{{{]]]]]]]]{{{{',
    '{{{{{{{{{{{{{{{{',
    '...MMMM..MMMM...',
    '...MMMM..MMMM...',
    '..MMMMM..MMMMM..',
  ],
  ogre: [
    '................',
    '....oooooooo....',
    '..oOOOOOOOOOOo..',
    '.OOOOOOOOOOOOOO.',
    '.OOrrOOOOOOrrOO.',
    '.OOOOOOOOOOOOOO.',
    '.OTOMMMMMMMMOTO.',
    '..OOOOOOOOOOOO..',
    'OOOOOOOOOOOOOOOO',
    'OOoOOOOOOOOOOoOO',
    '.OOKKKKKKKKKKOO.',
    '..OKKKKKKKKKKO..',
    '..OO.KKKKKK.OO..',
    '..MMMM....MMMM..',
    '..MMMM....MMMM..',
    '.MMMM......MMMM.',
  ],
  abyss: [
    '................',
    '...==========...',
    '..============..',
    '..==~~====~~==..',
    '.==============.',
    '.=ZZZZZZZZZZZZ=.',
    '=~zzzzzzzzzzzz~=',
    '.=zzzzzzzzzzzz=.',
    '..zzzzzzzzzzzz..',
    '.zZzzzzzzzzzzZz.',
    '~zzzzzzzzzzzzzz~',
    'zzzzzzzzzzzzzzzz',
    'zz.zzzzzzzzzz.zz',
    'z..zz..zz..zz..z',
    'z...z..zz..z...z',
    '.z....z..z....z.',
  ],
  ashdemon: [
    '................',
    '|.....****.....|',
    '||....****....||',
    '.||...****...||.',
    '...**FF**FF**...',
    '...**********...',
    '..*$$$$$$$$$$*..',
    '.*$$$$$$$$$$$$*.',
    '&&**$$$$$$$$**&&',
    '&&&*$$$$$$$$*&&&',
    '.&&&$$$$$$$$&&&.',
    '..&&$$$$$$$$&&..',
    '...$$$$$$$$$$...',
    '...$$$....$$$...',
    '...$$$....$$$...',
    '..MMMM....MMMM..',
  ],
  slime: [
    '................',
    '......vvvv......',
    '....vvyyyyvv....',
    '...vyyffyyyyv...',
    '..vyyfyyyyyyyv..',
    '..vy++yyyy++yv..',
    '.vyyyyyyyyyyyyv.',
    '.vyyyyyyyyyyyyv.',
    'vyyyyyyyyyyyyyyv',
    'vvvvvvvvvvvvvvvv',
  ],
  skeleton: [
    '....DDDDDDDD....',
    '...DDDDDDDDDD...',
    '..DDkkDDDDkkDD..',
    '..DDkkDDDDkkDD..',
    '....DDD%%DDD....',
    '....DDDDDDDD....',
    '.....D.DD.D.....',
    '.....DDDDDD.....',
    '..DDDDDDDDDDDD..',
    '..D.D.DDDD.D.D..',
    '...D.D.DD.D.D...',
    '.....DD..DD.....',
    '....D.D..D.D....',
    '....D.D..D.D....',
    '...DD.D....DD...',
  ],
  golem: [
    '....&&&&&&&&....',
    '..&&^^&&&&^^&&..',
    '..&&&&&&&&&&&&..',
    '..&&&FF&&FF&&&..',
    '..&&&&&&&&&&&&..',
    '.&&&&&$$$$&&&&&.',
    '.&&&$&&&&&&$&&&.',
    '.&&&&&&&^^&&&&&.',
    '..&&&&&&&&&&&&..',
    '..&&$&&^^&&$&&..',
    '.&&&&&&&&&&&&&&.',
    '.&&&&&$$$&&&&&&.',
    '..&&&&&&&&&&&&..',
    '...&&&&..&&&&...',
    '...&&&$..$&&&...',
    '...$$$....$$$...',
  ],
  wraith: [
    '.....@@@@@@.....',
    '....@@@@@@@@....',
    '...@@@@@@@@@@...',
    '...@@kk@@kk@@...',
    '...@@@@@@@@@@...',
    '..@@@@@@@@@@@@..',
    '..@@@@@@@@@@@@..',
    '.@@@@!@@@@!@@@@.',
    '.@@@@@@@@@@@@@@.',
    '.@@@@@@@@@@@@@@.',
    '@@@@@@@@@@@@@@@@',
    '@@.@@@.@@.@@@.@@',
    '@@...@@..@@...@@',
    '@....@.....@....',
  ],
  chest: [
    '..KKKKKKKKKKKK..',
    '.KLLLLLLLLLLLLK.',
    '.KLllllllllllLK.',
    '.KKKKKKEEKKKKKK.',
    '.KLLLLLEELLLLLK.',
    '.KLLLLLLLLLLLLK.',
    '.KLllllllllllLK.',
    '.KKKKKKKKKKKKKK.',
  ],
  merchant: [
    '......NNNN......',
    '.....NNNNNN.....',
    '....NNSSSSNN....',
    '....NSeSSeSN....',
    '....NSSSSSSN....',
    '...LNNNNNNNNL...',
    '..LLNNNYYNNNLL..',
    '..LLNNNNNNNNLL..',
    '..LLVNNNNNNVLL..',
    '....NNNNNNNN....',
    '....VNNNNNNV....',
    '....kk....kk....',
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
// 색 입히기: 그림의 밝기는 살리고 색 톤만 바꾼다 (구간마다 몬스터 색이 달라지게)
function applyTint(canvas, hex, amount) {
  const ctx = canvas.getContext('2d')
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  const tr = parseInt(hex.slice(1, 3), 16)
  const tg = parseInt(hex.slice(3, 5), 16)
  const tb = parseInt(hex.slice(5, 7), 16)
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255
    d[i] = Math.min(255, Math.round(d[i] * (1 - amount) + tr * lum * 1.6 * amount))
    d[i + 1] = Math.min(255, Math.round(d[i + 1] * (1 - amount) + tg * lum * 1.6 * amount))
    d[i + 2] = Math.min(255, Math.round(d[i + 2] * (1 - amount) + tb * lum * 1.6 * amount))
  }
  ctx.putImageData(img, 0, 0)
}

// tint(색 톤)가 있으면 입힌 그림을 따로 만들어 캐시한다
export function getSprite(name, tint) {
  const key = tint ? name + '@' + tint : name
  if (cache[key]) return cache[key]
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
  if (tint) applyTint(canvas, tint, 0.5)
  cache[key] = canvas
  return canvas
}

// 스프라이트를 이미지 주소로 (직업 선택 카드 초상화 등에 사용)
const urlCache = {}
export function spriteUrl(name) {
  if (!urlCache[name]) urlCache[name] = getSprite(name).toDataURL()
  return urlCache[name]
}

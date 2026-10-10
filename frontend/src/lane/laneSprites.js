// 레인 디펜스 전용 캐릭터 그림 (16×16). 직사각형을 쌓아 그리고, 바깥 테두리는 자동으로 어둡게 입힌다
import { spriteUrl } from '../game/sprites'

const OUT = '#1b1622'
const SKIN = '#f2c79a'
const cache = {}

function outline(ctx) {
  const d = ctx.getImageData(0, 0, 16, 16).data
  const solid = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && d[(y * 16 + x) * 4 + 3] > 0
  const edge = []
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (solid(x, y)) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) edge.push([x, y])
    }
  }
  ctx.fillStyle = OUT
  for (const [x, y] of edge) ctx.fillRect(x, y, 1, 1)
}

function paint(draw) {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  const ctx = c.getContext('2d')
  const g = {
    r(x, y, w, h, col) {
      ctx.fillStyle = col
      ctx.fillRect(x, y, w, h)
    },
    p(x, y, col) {
      ctx.fillStyle = col
      ctx.fillRect(x, y, 1, 1)
    },
  }
  draw(g)
  outline(ctx)
  return c
}

const DRAW = {
  // 방패병: 은색 갑옷, 파란 방패, 붉은 깃털 투구
  shield(g) {
    g.r(5, 11, 2, 4, '#3a3a4a'); g.r(9, 11, 2, 4, '#3a3a4a')
    g.r(4, 6, 8, 6, '#c0c6d2'); g.r(4, 10, 8, 1, '#7d8594')
    g.r(5, 2, 6, 4, SKIN)
    g.r(4, 1, 8, 2, '#a8b0c0'); g.r(5, 0, 6, 1, '#a8b0c0')
    g.r(7, 0, 2, 1, '#ff4040')
    g.r(5, 3, 6, 1, '#3a3f4c')
    g.r(0, 4, 4, 9, '#3a6fd8'); g.r(0, 4, 4, 1, '#1f3f8a'); g.r(1, 7, 2, 4, '#ffd447')
  },
  // 숲 궁수: 초록 망토와 후드, 긴 활
  archer(g) {
    g.r(6, 13, 2, 2, '#4a3a2a'); g.r(9, 13, 2, 2, '#4a3a2a')
    g.r(5, 5, 6, 8, '#4caf50'); g.r(5, 10, 6, 3, '#2e6b35')
    g.r(4, 1, 8, 5, '#2e6b35'); g.r(5, 0, 6, 1, '#2e6b35')
    g.r(6, 3, 4, 3, SKIN); g.p(7, 4, OUT); g.p(9, 4, OUT)
    g.r(14, 2, 1, 12, '#8a5a2b')
    g.r(13, 3, 1, 10, '#e8e0c8')
  },
  // 창병: 금색 갑옷, 붉은 띠, 긴 창
  spear(g) {
    g.r(6, 13, 2, 2, '#3a3a4a'); g.r(9, 13, 2, 2, '#3a3a4a')
    g.r(5, 6, 6, 7, '#d9a441'); g.r(5, 8, 6, 2, '#b23a4a')
    g.r(5, 2, 6, 4, SKIN)
    g.r(5, 1, 6, 2, '#d9a441'); g.r(7, 0, 2, 1, '#b23a4a')
    g.p(7, 3, OUT); g.p(9, 3, OUT)
    g.r(14, 0, 1, 14, '#8a5a2b')
    g.r(13, 0, 3, 1, '#dfe6ee'); g.p(14, 1, '#dfe6ee')
  },
  // 마도사: 보라 로브, 별 장식 뾰족 모자, 파란 구슬 지팡이
  mage(g) {
    g.r(6, 13, 2, 2, '#2a2230'); g.r(9, 13, 2, 2, '#2a2230')
    g.r(4, 9, 8, 5, '#9b59d6'); g.r(4, 12, 8, 2, '#5e2f8f')
    g.r(6, 6, 4, 3, SKIN); g.r(6, 8, 4, 1, '#eeeeee')
    g.p(7, 7, OUT); g.p(9, 7, OUT)
    g.r(7, 0, 2, 1, '#5e2f8f'); g.r(6, 1, 4, 1, '#5e2f8f'); g.r(5, 2, 6, 1, '#5e2f8f')
    g.r(4, 3, 8, 2, '#5e2f8f'); g.r(2, 5, 12, 1, '#5e2f8f')
    g.p(8, 2, '#ffd447'); g.p(6, 4, '#ffd447')
    g.r(13, 5, 1, 10, '#8a5a2b')
    g.r(12, 2, 3, 3, '#7fe0ff'); g.p(13, 3, '#ffffff')
  },
  // 치유사: 분홍 머리, 흰 드레스, 초록 보석 지팡이
  healer(g) {
    g.r(6, 13, 2, 2, '#f4f1e8'); g.r(9, 13, 2, 2, '#f4f1e8')
    g.r(4, 1, 8, 3, '#ff8fb1')
    g.r(5, 3, 6, 4, SKIN); g.r(5, 3, 6, 1, '#ff8fb1')
    g.p(6, 5, OUT); g.p(9, 5, OUT)
    g.r(4, 7, 8, 6, '#f4f1e8'); g.r(4, 12, 8, 1, '#7fe0c0')
    g.p(7, 9, '#ff5a8a'); g.p(8, 9, '#ff5a8a'); g.p(7, 8, '#ff5a8a'); g.p(8, 8, '#ff5a8a')
    g.r(13, 4, 1, 10, '#c8e6a0')
    g.r(12, 2, 3, 3, '#4caf50'); g.p(13, 3, '#b8ffd8')
  },
  // 골렘: 회색 돌 몸, 노란 눈, 이끼
  golem(g) {
    g.r(5, 12, 3, 4, '#5a5664'); g.r(9, 12, 3, 4, '#5a5664')
    g.r(3, 3, 10, 9, '#8a8f9c')
    g.r(4, 0, 8, 4, '#8a8f9c')
    g.r(0, 4, 3, 8, '#6e6a74'); g.r(13, 4, 3, 8, '#6e6a74')
    g.r(5, 1, 2, 1, '#ffd447'); g.r(9, 1, 2, 1, '#ffd447')
    g.r(4, 10, 8, 1, '#5a5664')
    g.p(5, 6, '#6b8e3c'); g.r(9, 7, 2, 1, '#6b8e3c'); g.p(6, 9, '#6b8e3c'); g.r(11, 5, 1, 2, '#6b8e3c')
  },
  // 쥐: 회색 몸, 분홍 귀, 긴 꼬리
  rat(g) {
    g.r(0, 9, 3, 1, '#c09090'); g.p(0, 10, '#c09090')
    g.r(3, 7, 8, 6, '#9a8f84')
    g.r(9, 5, 5, 5, '#9a8f84')
    g.r(10, 3, 2, 2, '#e8a0a8'); g.r(13, 3, 2, 2, '#e8a0a8')
    g.p(12, 7, OUT); g.p(14, 8, '#ff4040')
    g.r(4, 13, 2, 2, '#7a6e62'); g.r(8, 13, 2, 2, '#7a6e62')
  },
  // 도적: 검은 후드, 붉은 눈, 단검
  thief(g) {
    g.r(5, 12, 2, 3, '#2a2230'); g.r(9, 12, 2, 3, '#2a2230')
    g.r(5, 6, 6, 6, '#3a3050'); g.r(5, 8, 6, 1, '#5a4a7a')
    g.r(4, 1, 8, 6, '#3a3050')
    g.r(5, 3, 6, 3, OUT)
    g.p(6, 4, '#ff4040'); g.p(9, 4, '#ff4040')
    g.r(12, 6, 1, 5, '#dfe6ee'); g.p(12, 11, '#8a5a2b')
  },
  // 폭탄 고블린: 초록 피부, 검은 폭탄과 타는 심지
  bomber(g) {
    g.r(5, 11, 2, 3, '#3f7f3f'); g.r(9, 11, 2, 3, '#3f7f3f')
    g.r(4, 6, 8, 6, '#4caf50')
    g.r(4, 1, 8, 5, '#4caf50')
    g.r(2, 2, 2, 2, '#4caf50'); g.r(12, 2, 2, 2, '#4caf50')
    g.p(6, 3, '#ffd447'); g.p(9, 3, '#ffd447')
    g.r(5, 5, 6, 1, '#2e6b35')
    g.r(11, 8, 4, 4, '#2a2a33'); g.p(12, 9, '#5a5a66')
    g.p(13, 7, '#ffd447'); g.p(14, 6, '#ff8a3b')
  },
  // 유령: 반투명한 파란 몸, 물결 자락
  wraith(g) {
    g.r(4, 2, 8, 9, '#bcd0ff'); g.r(5, 1, 6, 1, '#bcd0ff'); g.r(6, 0, 4, 1, '#bcd0ff')
    g.r(4, 11, 2, 2, '#bcd0ff'); g.r(7, 11, 2, 3, '#bcd0ff'); g.r(11, 11, 1, 2, '#bcd0ff')
    g.p(6, 5, OUT); g.p(9, 5, OUT)
    g.r(7, 7, 2, 1, '#7a8ad0')
  },
  // 오크 대장: 큰 몸, 뿔 투구, 도끼
  captain(g) {
    g.r(4, 12, 3, 3, '#4a3a2a'); g.r(9, 12, 3, 3, '#4a3a2a')
    g.r(3, 6, 10, 7, '#7f9a43'); g.r(3, 10, 10, 1, '#4a3a2a')
    g.r(4, 1, 8, 6, '#7f9a43')
    g.r(3, 0, 2, 3, '#f2e6c9'); g.r(11, 0, 2, 3, '#f2e6c9')
    g.p(6, 3, '#ff3030'); g.p(9, 3, '#ff3030')
    g.p(6, 5, '#fffbe8'); g.p(9, 5, '#fffbe8')
    g.r(13, 4, 1, 9, '#8a5a2b'); g.r(11, 3, 3, 4, '#c0c6d2')
  },
}

// 이름에 맞는 그림의 주소. 그림이 없는 이름(보스 오우거 등)은 기존 스프라이트를 쓴다
export function laneSpriteUrl(name) {
  if (!DRAW[name]) return spriteUrl(name)
  if (!cache[name]) cache[name] = paint(DRAW[name]).toDataURL()
  return cache[name]
}

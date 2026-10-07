// 던전(맵) 생성: 방을 랜덤으로 놓고 복도로 이어 붙인다.
export const W = 40
export const H = 22

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function center(room) {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }
}

function overlaps(a, b) {
  // 방 사이에 최소 한 칸은 벽이 남도록 여유를 둔다
  return a.x - 1 <= b.x + b.w && a.x + a.w + 1 >= b.x && a.y - 1 <= b.y + b.h && a.y + a.h + 1 >= b.y
}

function carveRoom(tiles, r) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) tiles[y][x] = '.'
  }
}

function carveH(tiles, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) tiles[y][x] = '.'
}

function carveV(tiles, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) tiles[y][x] = '.'
}

export function generateDungeon() {
  const tiles = Array.from({ length: H }, () => Array(W).fill('#'))
  const rooms = []

  for (let tries = 0; tries < 80 && rooms.length < 9; tries++) {
    const w = randInt(4, 9)
    const h = randInt(3, 6)
    const room = { x: randInt(1, W - w - 2), y: randInt(1, H - h - 2), w, h }
    if (rooms.some((r) => overlaps(room, r))) continue

    carveRoom(tiles, room)
    if (rooms.length > 0) {
      const a = center(rooms[rooms.length - 1])
      const b = center(room)
      if (Math.random() < 0.5) {
        carveH(tiles, a.x, b.x, a.y)
        carveV(tiles, a.y, b.y, b.x)
      } else {
        carveV(tiles, a.y, b.y, a.x)
        carveH(tiles, a.x, b.x, b.y)
      }
    }
    rooms.push(room)
  }
  return { tiles, rooms }
}

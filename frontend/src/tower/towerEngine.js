// 탑 등반 게임 로직 (순수 함수: 상태를 바꾸지 않고 새 상태를 돌려준다)
//
// 규칙
// - 탑은 3열 × 10층이다. 주인공은 시작 전 맨 아래(입구)의 가운데 열에 서 있다.
// - 한 번에 바로 위 층으로 한 칸 오른다. 열은 한 칸씩만 옮길 수 있다 (대각선 포함).
// - 칸은 두 종류다.
//   · 적: 숫자는 적의 전투력. 내 전투력 이상이면 이기고, 이긴 뒤 적 전투력의 절반을 흡수한다. 낮으면 쓰러진다.
//   · 힘의 물약: 숫자만큼 내 전투력이 오른다.
// - 맨 위 10층은 보스층이다. 살아서 도달하면 탑을 정복한다.

export const TOWER_FLOORS = 10
export const TOWER_COLS = 3
const START_POWER = 10
const START_COL = 1

// 층별로 나오는 적 그림 (아래층일수록 약한 그림)
function enemySprites(floor) {
  if (floor < 3) return ['rat', 'slime']
  if (floor < 6) return ['goblin', 'skeleton']
  return ['orc', 'wraith']
}

function makeRoom(floor) {
  const isTop = floor === TOWER_FLOORS - 1
  if (!isTop && Math.random() < 0.35) {
    const base = 3 + floor * 1.5
    return { kind: 'boost', power: Math.max(2, Math.round(base * (0.7 + Math.random() * 0.7))), sprite: 'potion' }
  }
  const base = (7 + floor * 6) * (isTop ? 2.5 : 1)
  const power = Math.max(3, Math.round(base * (0.6 + Math.random() * 0.9)))
  const pool = isTop ? ['ogre'] : enemySprites(floor)
  return { kind: 'enemy', power, sprite: pool[Math.floor(Math.random() * pool.length)], boss: isTop }
}

// 칸 하나를 지나갈 때 결과: 살아남으면 새 전투력, 쓰러지면 ok = false
export function resolve(power, room) {
  if (room.kind === 'boost') return { ok: true, power: power + room.power }
  if (power >= room.power) return { ok: true, power: power + Math.round(room.power / 2), absorb: Math.round(room.power / 2) }
  return { ok: false, power }
}

// 이 탑에서 꼭대기까지 가는 길이 있는지 검사한다.
// 전투력은 높을수록 유리하므로, 칸마다 도달 가능한 가장 높은 전투력만 기억하면 정확하다.
export function isClimbable(floors) {
  let prev = [-1, -1, -1]
  prev[START_COL] = START_POWER
  for (const row of floors) {
    const cur = [-1, -1, -1]
    for (let c = 0; c < TOWER_COLS; c++) {
      let best = -1
      for (let pc = 0; pc < TOWER_COLS; pc++) {
        if (prev[pc] < 0 || Math.abs(pc - c) > 1) continue
        const r = resolve(prev[pc], row[c])
        if (r.ok && r.power > best) best = r.power
      }
      cur[c] = best
    }
    prev = cur
  }
  return prev.some((p) => p >= 0)
}

export function makeTower() {
  let floors = null
  for (let tries = 0; tries < 500; tries++) {
    floors = Array.from({ length: TOWER_FLOORS }, (_, f) =>
      Array.from({ length: TOWER_COLS }, () => makeRoom(f)),
    )
    if (isClimbable(floors)) break
  }
  return floors
}

export function newTowerRun() {
  return {
    floors: makeTower(),
    pos: { floor: -1, col: START_COL }, // -1 = 입구(아직 탑 밖)
    power: START_POWER,
    status: 'playing', // 'playing' | 'won' | 'dead'
    log: ['탑의 입구에 섰다. 전투력 ' + START_POWER + '으로 오르기 시작!'],
    last: null, // { floor, col, result } 방금 움직인 칸 (연출용)
    turn: 0,
  }
}

// 바로 위 층의 어느 열로 갈 수 있는지
export function canClimb(state, col) {
  if (state.status !== 'playing') return false
  if (state.pos.floor + 1 >= TOWER_FLOORS) return false
  return col >= 0 && col < TOWER_COLS && Math.abs(col - state.pos.col) <= 1
}

export function climb(state, col) {
  if (!canClimb(state, col)) return state
  const floor = state.pos.floor + 1
  const room = state.floors[floor][col]
  const r = resolve(state.power, room)
  const label = `${floor + 1}층`
  let msg
  let status = 'playing'
  let result
  if (!r.ok) {
    result = 'lose'
    status = 'dead'
    msg = `${label}: 전투력 ${state.power}로는 ${room.power}을 이길 수 없었다. 쓰러졌다…`
  } else if (room.kind === 'boost') {
    result = 'boost'
    msg = `${label}: 힘의 물약 +${room.power} → 전투력 ${r.power}`
  } else {
    result = 'win'
    msg = `${label}: 적(${room.power})을 쓰러뜨리고 전투력 +${r.absorb} → ${r.power}`
  }
  if (r.ok && floor === TOWER_FLOORS - 1) {
    status = 'won'
    msg = `${label}: 보스를 쓰러뜨리고 정상에 올랐다! 탑 정복`
  }
  return {
    ...state,
    pos: { floor, col },
    power: r.ok ? r.power : state.power,
    status,
    log: [...state.log, msg].slice(-40),
    last: { floor, col, result },
    turn: state.turn + 1,
  }
}

// 지금까지 오른 층 수 (점수 대신 쓰는 기록)
export function heightOf(state) {
  return Math.max(0, state.pos.floor + 1)
}

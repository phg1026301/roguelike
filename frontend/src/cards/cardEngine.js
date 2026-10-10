// 카드 전투 로직 (순수 함수: 매번 새 상태를 돌려준다)
//
// 규칙
// - 영웅 체력 30으로 시작한다(난이도에 따라 다름). 나는 선공이다. 상대 영웅 체력이 0이 되면 승리.
// - 매 턴 카드 1장을 뽑고, 마나는 턴 수만큼(최대 10) 찬다.
// - 하수인은 마나를 내고 전장에 놓는다 (최대 5장). 기본적으로 낸 턴에는 공격할 수 없다.
// - 하수인끼리 맞붙으면 서로 공격력만큼 체력이 줄어든다.
// - 특수 능력
//   · 돌진: 낸 턴에도 공격할 수 있다
//   · 도발: 상대는 도발 하수인을 먼저 공격해야 한다
//   · 방패: 처음 받는 피해 1번을 무효로 한다
// - 덱이 비면 피로 피해가 점점 커진다.

export const START_HP = 30
export const MAX_BOARD = 5
export const MAX_HAND = 7
export const DECK_SIZE = 20
const PLAYER = 'player'
const AI = 'ai'
export const SIDE = { PLAYER, AI }

// 난이도: 상대 영웅 체력, 상대 마나 보정
export const DIFFICULTIES = {
  쉬움: { label: '쉬움', aiHp: 20, manaBonus: -1, desc: '상대 영웅 체력 20 · 상대 마나 1 적음' },
  보통: { label: '보통', aiHp: 30, manaBonus: 0, desc: '영웅 체력 30 대 30 · 기본 규칙' },
  어려움: { label: '어려움', aiHp: 40, manaBonus: 1, desc: '상대 영웅 체력 40 · 상대 마나 1 많음' },
}

export const KEYWORDS = { charge: '돌진', taunt: '도발', shield: '방패' }

// 카드 27장 (하수인 18 + 마법 9)
export const CARD_POOL = [
  { id: 'rat', name: '쥐 떼', cost: 1, type: 'minion', atk: 1, hp: 2, sprite: 'rat' },
  { id: 'slime', name: '슬라임', cost: 1, type: 'minion', atk: 1, hp: 3, sprite: 'slime' },
  { id: 'goblin', name: '고블린', cost: 2, type: 'minion', atk: 3, hp: 1, sprite: 'goblin' },
  { id: 'skeleton', name: '해골 병사', cost: 2, type: 'minion', atk: 2, hp: 2, sprite: 'skeleton' },
  { id: 'archer', name: '궁수', cost: 2, type: 'minion', atk: 2, hp: 3, sprite: 'archer' },
  { id: 'charger', name: '돌격병', cost: 2, type: 'minion', atk: 3, hp: 2, sprite: 'goblin', kw: ['charge'] },
  { id: 'guard', name: '방패병', cost: 3, type: 'minion', atk: 1, hp: 4, sprite: 'golem', kw: ['taunt'] },
  { id: 'warrior', name: '전사', cost: 3, type: 'minion', atk: 3, hp: 4, sprite: 'warrior' },
  { id: 'wraith', name: '유령', cost: 3, type: 'minion', atk: 2, hp: 4, sprite: 'wraith' },
  { id: 'orc', name: '오크', cost: 3, type: 'minion', atk: 4, hp: 3, sprite: 'orc' },
  { id: 'summoner', name: '소환사', cost: 3, type: 'minion', atk: 2, hp: 3, sprite: 'summoner' },
  { id: 'knight', name: '수호 기사', cost: 4, type: 'minion', atk: 3, hp: 5, sprite: 'warrior', kw: ['shield'] },
  { id: 'golem', name: '돌 골렘', cost: 4, type: 'minion', atk: 3, hp: 6, sprite: 'golem' },
  { id: 'assassin', name: '그림자 암살자', cost: 5, type: 'minion', atk: 5, hp: 3, sprite: 'wraith', kw: ['charge'] },
  { id: 'ogre', name: '오우거', cost: 6, type: 'minion', atk: 6, hp: 6, sprite: 'ogre' },
  { id: 'boss', name: '폭군 대장', cost: 7, type: 'minion', atk: 6, hp: 7, sprite: 'boss', kw: ['taunt'] },
  { id: 'abyss', name: '심연의 군주', cost: 8, type: 'minion', atk: 8, hp: 8, sprite: 'abyss', kw: ['charge'] },
  { id: 'ashdemon', name: '잿빛 대마왕', cost: 10, type: 'minion', atk: 10, hp: 10, sprite: 'ashdemon', kw: ['shield'] },
  { id: 'potion', name: '회복 물약', cost: 1, type: 'spell', icon: '🧪', effect: 'heal', amount: 4, text: '내 영웅 체력 +4' },
  { id: 'bandage', name: '응급 처치', cost: 1, type: 'spell', icon: '🩹', effect: 'heal', amount: 2, text: '내 영웅 체력 +2' },
  { id: 'ambush', name: '기습', cost: 2, type: 'spell', icon: '🗡️', effect: 'burn', amount: 3, text: '상대 영웅에게 3 피해' },
  { id: 'loot', name: '약탈', cost: 2, type: 'spell', icon: '🎒', effect: 'draw', amount: 2, text: '카드 2장 뽑기' },
  { id: 'chest', name: '보물 상자', cost: 3, type: 'spell', icon: '🧰', effect: 'draw', amount: 3, text: '카드 3장 뽑기' },
  { id: 'fort', name: '방어진', cost: 3, type: 'spell', icon: '🛡️', effect: 'armor', amount: 1, text: '내 하수인 체력 +1' },
  { id: 'firebomb', name: '화염 폭발', cost: 4, type: 'spell', icon: '🔥', effect: 'fire', amount: 2, text: '상대 하수인 전부 2 피해' },
  { id: 'warcry', name: '전장의 함성', cost: 5, type: 'spell', icon: '📯', effect: 'buff', amount: 1, text: '내 하수인 공격력 +1' },
  { id: 'whirl', name: '회오리', cost: 5, type: 'spell', icon: '🌪️', effect: 'fireAll', amount: 2, text: '모든 하수인 2 피해' },
]

const BY_ID = Object.fromEntries(CARD_POOL.map((c) => [c.id, c]))
export function cardById(id) {
  return BY_ID[id]
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 무작위 덱 (서로 다른 카드 20장)
export function recommendedDeck() {
  return shuffle(CARD_POOL).slice(0, DECK_SIZE).map((c) => c.id)
}

// 고른 카드가 모자라면 무작위로 채워 20장을 맞춘다 (중복 없음)
export function fillDeck(ids, n = DECK_SIZE) {
  const out = [...new Set(ids)].slice(0, n)
  for (const c of shuffle(CARD_POOL)) {
    if (out.length >= n) break
    if (!out.includes(c.id)) out.push(c.id)
  }
  return out
}

// 승리 보상으로 보여 줄 카드 n장 (서로 다름)
export function rewardChoices(n = 3) {
  return shuffle(CARD_POOL).slice(0, n).map((c) => c.id)
}

function hasKw(m, k) {
  return Array.isArray(m.kw) && m.kw.includes(k)
}

function makeSide(state, label, hp, ids) {
  const deck = shuffle(ids.map((id) => cardById(id))).map((c) => ({ ...c, uid: state.nextUid++ }))
  return { label, hp, mana: 0, maxMana: 0, deck, hand: [], board: [], fatigue: 0 }
}

// deckIds: 내 덱 (카드 id 배열). 없으면 무작위 덱
export function newCardGame({ level = '보통', deckIds = null } = {}) {
  const diff = DIFFICULTIES[level] || DIFFICULTIES['보통']
  const state = {
    nextUid: 1,
    fxId: 0,
    fx: [],
    shake: 0,
    turn: 1,
    active: PLAYER,
    over: false,
    winner: null,
    selected: null,
    level: diff.label,
    diff,
    log: [`카드 전투 시작! (난이도 ${diff.label}) 먼저 공격합니다.`],
  }
  state[PLAYER] = makeSide(state, '나', START_HP, deckIds && deckIds.length ? deckIds : recommendedDeck())
  state[AI] = makeSide(state, '상대', diff.aiHp, recommendedDeck())
  for (const key of [PLAYER, AI]) draw(state, key, 3, { silent: true })
  return finish(startTurn(state, PLAYER))
}

// 연출 준비: 이전 행동의 효과를 지우고 새 행동 번호를 준다
function begin(state) {
  const s = structuredClone(state)
  s.fx = []
  s.fxId = (state.fxId || 0) + 1
  return s
}

// 효과 기록 (화면이 이 기록을 보고 숫자와 흔들림을 그린다)
function fxPush(s, ev) {
  s.fx.push(ev)
}

// 이번 행동에서 화면을 얼마나 강하게 흔들지 계산 (0 없음 ~ 3 아주 강함)
function finish(s) {
  let level = 0
  for (const e of s.fx) {
    if (e.kind === 'slam') level = Math.max(level, 3)
    else if (e.kind === 'dmg') level = Math.max(level, e.amount >= 6 ? 3 : e.amount >= 3 ? 2 : 1)
    else if (e.kind === 'shield') level = Math.max(level, 1)
  }
  s.shake = level
  return s
}

// 카드 1장 뽑기 (덱이 비면 피로 피해)
function draw(s, key, n = 1, opts = {}) {
  const side = s[key]
  for (let i = 0; i < n; i++) {
    if (!side.deck.length) {
      side.fatigue += 1
      side.hp -= side.fatigue
      if (!opts.silent) s.log.push(`${side.label}: 덱이 비었다! 피로 피해 ${side.fatigue}`)
      fxPush(s, { kind: 'dmg', side: key, hero: true, amount: side.fatigue })
      checkOver(s)
      if (s.over) return
      continue
    }
    const card = side.deck.shift()
    if (side.hand.length >= MAX_HAND) {
      if (!opts.silent) s.log.push(`${side.label}: 손이 가득 차 ${card.name}을(를) 버렸다`)
    } else {
      side.hand.push(card)
    }
  }
}

function startTurn(s, key) {
  const side = s[key]
  s.active = key
  s.selected = null
  const bonus = key === AI ? s.diff.manaBonus : 0
  side.maxMana = Math.max(0, Math.min(10, Math.min(s.turn, 10) + bonus))
  side.mana = side.maxMana
  side.board.forEach((m) => (m.canAttack = true))
  draw(s, key, 1)
  return s
}

function checkOver(s) {
  if (s.over) return
  if (s[PLAYER].hp <= 0) {
    s.over = true
    s.winner = AI
    s.log.push('나의 영웅이 쓰러졌다… 패배')
  } else if (s[AI].hp <= 0) {
    s.over = true
    s.winner = PLAYER
    s.log.push('상대 영웅을 쓰러뜨렸다! 승리')
  }
  if (s.over) s.active = null
}

// 하수인에게 피해 (방패가 있으면 한 번 막는다)
function hitMinion(s, m, amount, sideKey) {
  if (m.shield) {
    m.shield = false
    s.log.push(`${m.name}의 방패가 공격을 막았다`)
    fxPush(s, { kind: 'shield', side: sideKey, uid: m.uid })
    return
  }
  m.hp -= amount
  fxPush(s, { kind: 'dmg', side: sideKey, uid: m.uid, amount })
}

// 영웅에게 피해
function hitHero(s, key, amount) {
  s[key].hp -= amount
  fxPush(s, { kind: 'dmg', side: key, hero: true, amount })
  checkOver(s)
}

// 죽은 하수인 치우기
function cleanup(s) {
  for (const key of [PLAYER, AI]) {
    const side = s[key]
    const dead = side.board.filter((m) => m.hp <= 0)
    for (const m of dead) s.log.push(`${side.label}의 ${m.name} 쓰러짐`)
    side.board = side.board.filter((m) => m.hp > 0)
  }
  if (s.selected && !s[PLAYER].board.some((m) => m.uid === s.selected)) s.selected = null
  checkOver(s)
}

// 도발 하수인 목록
function tauntsOf(side) {
  return side.board.filter((m) => hasKw(m, 'taunt'))
}

function applyCard(s, key, card) {
  const side = s[key]
  const enemyKey = key === PLAYER ? AI : PLAYER
  const enemy = s[enemyKey]
  if (card.type === 'minion') {
    const minion = { ...card, hp: card.hp, canAttack: hasKw(card, 'charge'), shield: hasKw(card, 'shield') }
    side.board.push(minion)
    const kwNames = (card.kw || []).map((k) => KEYWORDS[k]).join(', ')
    s.log.push(`${side.label}: ${card.name} 소환 (${card.atk}/${card.hp})${kwNames ? ` · ${kwNames}` : ''}`)
    if (card.cost >= 6) {
      fxPush(s, { kind: 'slam', side: key, uid: minion.uid })
      s.log.push(`💥 ${card.name}이(가) 강하게 등장했다!`)
    }
    return
  }
  switch (card.effect) {
    case 'heal':
      side.hp = Math.min(START_HP, side.hp + card.amount)
      fxPush(s, { kind: 'heal', side: key, hero: true, amount: card.amount })
      s.log.push(`${side.label}: ${card.name} → 체력 +${card.amount}`)
      break
    case 'burn':
      s.log.push(`${side.label}: ${card.name} → 상대 영웅 -${card.amount}`)
      hitHero(s, enemyKey, card.amount)
      break
    case 'fire':
      s.log.push(`${side.label}: ${card.name} → 상대 하수인 전부 -${card.amount}`)
      for (const m of [...enemy.board]) hitMinion(s, m, card.amount, enemyKey)
      cleanup(s)
      break
    case 'fireAll':
      s.log.push(`${side.label}: ${card.name} → 모든 하수인 -${card.amount}`)
      for (const m of [...enemy.board]) hitMinion(s, m, card.amount, enemyKey)
      for (const m of [...side.board]) hitMinion(s, m, card.amount, key)
      cleanup(s)
      break
    case 'draw':
      s.log.push(`${side.label}: ${card.name} → 카드 ${card.amount}장 뽑기`)
      draw(s, key, card.amount)
      break
    case 'armor':
      for (const m of side.board) m.hp += card.amount
      s.log.push(`${side.label}: ${card.name} → 하수인 체력 +${card.amount}`)
      break
    case 'buff':
      for (const m of side.board) m.atk += card.amount
      s.log.push(`${side.label}: ${card.name} → 하수인 공격력 +${card.amount}`)
      break
    default:
      break
  }
}

// 내 손패 카드 내기
export function playCard(state, index) {
  if (state.over || state.active !== PLAYER) return state
  const card = state[PLAYER].hand[index]
  if (!card) return state
  const s = begin(state)
  const side = s[PLAYER]
  if (card.cost > side.mana) {
    s.log.push(`마나가 부족하다 (${card.name}: 마나 ${card.cost} 필요)`)
    return finish(s)
  }
  if (card.type === 'minion' && side.board.length >= MAX_BOARD) {
    s.log.push('전장이 가득 찼다 (하수인 최대 5장)')
    return finish(s)
  }
  side.mana -= card.cost
  side.hand.splice(index, 1)
  applyCard(s, PLAYER, card)
  return finish(s)
}

// 공격할 하수인 고르기 (다시 누르면 취소)
export function selectMinion(state, uid) {
  if (state.over || state.active !== PLAYER) return state
  const m = state[PLAYER].board.find((x) => x.uid === uid)
  if (!m || !m.canAttack) return state
  const s = begin(state)
  s.selected = s.selected === uid ? null : uid
  return s
}

// 선택한 하수인으로 상대 하수인을 공격 (서로 맞붙는다)
export function attackMinion(state, targetUid) {
  if (state.over || state.active !== PLAYER || !state.selected) return state
  const s = begin(state)
  const attacker = s[PLAYER].board.find((x) => x.uid === s.selected)
  const target = s[AI].board.find((x) => x.uid === targetUid)
  if (!attacker || !target) return state
  if (tauntsOf(s[AI]).length && !hasKw(target, 'taunt')) {
    s.log.push('도발 하수인을 먼저 공격해야 한다')
    return finish(s)
  }
  hitMinion(s, target, attacker.atk, AI)
  hitMinion(s, attacker, target.atk, PLAYER)
  attacker.canAttack = false
  s.log.push(`${attacker.name} → ${target.name}: ${attacker.atk} 피해 (내 ${attacker.name} 체력 -${target.atk})`)
  s.selected = null
  cleanup(s)
  return finish(s)
}

// 선택한 하수인으로 상대 영웅을 공격
export function attackHero(state) {
  if (state.over || state.active !== PLAYER || !state.selected) return state
  const s = begin(state)
  const attacker = s[PLAYER].board.find((x) => x.uid === s.selected)
  if (!attacker) return state
  if (tauntsOf(s[AI]).length) {
    s.log.push('도발 하수인이 길을 막고 있다')
    return finish(s)
  }
  attacker.canAttack = false
  s.log.push(`${attacker.name} → 상대 영웅: ${attacker.atk} 피해`)
  s.selected = null
  hitHero(s, AI, attacker.atk)
  return finish(s)
}

// 컴퓨터 턴: 마나 안에서 비싼 카드부터 내고, 하수인으로 공격한다
function aiTurn(s) {
  const ai = s[AI]
  while (!s.over) {
    const options = ai.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.cost <= ai.mana && (c.type === 'spell' || ai.board.length < MAX_BOARD))
    if (!options.length) break
    options.sort((a, b) => b.c.cost - a.c.cost)
    const { c, i } = options[0]
    ai.mana -= c.cost
    ai.hand.splice(i, 1)
    applyCard(s, AI, c)
  }
  for (const m of [...ai.board]) {
    if (s.over) return
    if (!m.canAttack || !ai.board.includes(m)) continue
    const player = s[PLAYER]
    const taunts = tauntsOf(player)
    const candidates = taunts.length ? taunts : player.board
    if (candidates.length) {
      // 도발이 있으면 도발 하수인 중 체력이 가장 낮은 것을 공격한다
      const target = candidates.reduce((a, b) => (b.hp < a.hp ? b : a))
      hitMinion(s, target, m.atk, PLAYER)
      hitMinion(s, m, target.atk, AI)
      m.canAttack = false
      s.log.push(`상대 ${m.name} → 내 ${target.name}: ${m.atk} 피해`)
      cleanup(s)
    } else {
      m.canAttack = false
      s.log.push(`상대 ${m.name} → 내 영웅: ${m.atk} 피해`)
      hitHero(s, PLAYER, m.atk)
    }
  }
}

// 턴 넘기기: 컴퓨터가 한 턴을 진행한 뒤 다음 라운드의 내 턴이 된다
export function endTurn(state) {
  if (state.over || state.active !== PLAYER) return state
  const s = begin(state)
  s.selected = null
  startTurn(s, AI)
  s.log.push(`--- 상대 턴 (${s.turn}턴) ---`)
  aiTurn(s)
  if (s.over) return finish(s)
  s.turn += 1
  s.log.push(`--- ${s.turn}턴 시작 ---`)
  startTurn(s, PLAYER)
  return finish(s)
}

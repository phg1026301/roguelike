// 장비, 코인, 상점 데이터
import { randInt } from './dungeon'

export const RARITY = {
  common: { name: '일반', color: '#d8d8d8' },
  rare: { name: '희귀', color: '#5aa8ff' },
  epic: { name: '영웅', color: '#c27bff' },
  hidden: { name: '히든', color: '#ffc93c' },
}

export const SLOTS = { weapon: '무기', armor: '방어구', trinket: '장신구' }

const TEMPLATES = [
  // 무기
  { key: 'dagger', slot: 'weapon', rarity: 'common', icon: '🗡️', name: '녹슨 단검', atk: 1 },
  { key: 'club', slot: 'weapon', rarity: 'common', icon: '🏏', name: '나무 몽둥이', atk: 1, crit: 0.05 },
  { key: 'steel', slot: 'weapon', rarity: 'rare', icon: '⚔️', name: '강철 검', atk: 2 },
  { key: 'axe', slot: 'weapon', rarity: 'rare', icon: '🪓', name: '전투 도끼', atk: 3, def: -1 },
  { key: 'rune', slot: 'weapon', rarity: 'epic', icon: '🔮', name: '룬 블레이드', atk: 3, crit: 0.1 },
  { key: 'flame', slot: 'weapon', rarity: 'hidden', icon: '🔥', name: '불꽃검 이그니스', atk: 4, special: 'fire' },
  // 방어구
  { key: 'leather', slot: 'armor', rarity: 'common', icon: '🥋', name: '가죽 갑옷', def: 1 },
  { key: 'robe', slot: 'armor', rarity: 'common', icon: '👘', name: '견습 마법사 로브', maxHp: 6 },
  { key: 'chain', slot: 'armor', rarity: 'rare', icon: '🦺', name: '사슬 갑옷', def: 1, maxHp: 5 },
  { key: 'plate', slot: 'armor', rarity: 'epic', icon: '🛡️', name: '기사의 판금', def: 2, maxHp: 8 },
  { key: 'thorn', slot: 'armor', rarity: 'hidden', icon: '🌵', name: '가시 갑옷', def: 2, maxHp: 6, special: 'thorns' },
  // 장신구
  { key: 'ring', slot: 'trinket', rarity: 'common', icon: '💍', name: '구리 반지', maxHp: 4 },
  { key: 'feather', slot: 'trinket', rarity: 'rare', icon: '🪶', name: '바람의 깃털', agility: 0.2 },
  { key: 'eye', slot: 'trinket', rarity: 'rare', icon: '👁️', name: '매의 눈 부적', crit: 0.12 },
  { key: 'blood', slot: 'trinket', rarity: 'epic', icon: '🩸', name: '피의 펜던트', maxHp: 4, special: 'vamp' },
  { key: 'luck', slot: 'trinket', rarity: 'hidden', icon: '🍀', name: '황금 행운 반지', crit: 0.1, special: 'luck' },
]

export const SPECIAL_DESC = {
  fire: '공격 시 25% 확률로 주변 적에게 화염 피해',
  thorns: '맞으면 때린 적에게 2 피해 반사',
  vamp: '공격할 때마다 HP +1',
  luck: '코인 획득 2배',
}

export function describeItem(item) {
  const parts = []
  if (item.atk) parts.push(`공격력 ${item.atk > 0 ? '+' : ''}${item.atk}`)
  if (item.def) parts.push(`방어 ${item.def > 0 ? '+' : ''}${item.def}`)
  if (item.maxHp) parts.push(`최대 HP +${item.maxHp}`)
  if (item.crit) parts.push(`치명타 +${Math.round(item.crit * 100)}%`)
  if (item.agility) parts.push('도망 성공률 증가')
  if (item.special) parts.push(SPECIAL_DESC[item.special])
  return parts.join(' · ')
}

const WEIGHTS = {
  careful: { common: 58, rare: 30, epic: 10, hidden: 2 },
  smash: { common: 25, rare: 40, epic: 25, hidden: 10 },
  shop: { common: 0, rare: 60, epic: 32, hidden: 8 },
}

function rollRarity(mode) {
  const w = WEIGHTS[mode]
  let r = randInt(1, Object.values(w).reduce((a, b) => a + b, 0))
  for (const [rarity, weight] of Object.entries(w)) {
    r -= weight
    if (r <= 0) return rarity
  }
  return 'common'
}

let itemSeq = 1

// 서로 다른 장비 n개
export function rollItems(n, mode) {
  const result = []
  for (let tries = 0; result.length < n && tries < 50; tries++) {
    const rarity = rollRarity(mode)
    const pool = TEMPLATES.filter((t) => t.rarity === rarity && !result.some((r) => r.key === t.key))
    if (pool.length === 0) continue
    const t = pool[randInt(0, pool.length - 1)]
    result.push({ ...t, id: `${t.key}-${itemSeq++}` })
  }
  return result
}

// ===== 코인: 동화 1, 은화 10, 금화 100 =====
export const COIN_INFO = {
  bronze: { name: '동화', value: 1 },
  silver: { name: '은화', value: 10 },
  gold: { name: '금화', value: 100 },
}

export function coinTotal(c) {
  return c.bronze + c.silver * 10 + c.gold * 100
}

export function fromTotal(total) {
  return { gold: Math.floor(total / 100), silver: Math.floor((total % 100) / 10), bronze: total % 10 }
}

export function formatPrice(total) {
  const c = fromTotal(total)
  const parts = []
  if (c.gold) parts.push(`${c.gold}금`)
  if (c.silver) parts.push(`${c.silver}은`)
  if (c.bronze || parts.length === 0) parts.push(`${c.bronze}동`)
  return parts.join(' ')
}

const ITEM_PRICE = { common: 80, rare: 200, epic: 400, hidden: 900 }

export function makeShopStock() {
  const stock = [
    { kind: 'potion', icon: '🧪', name: '회복 포션', desc: 'HP 8 회복 (Q로 사용)', price: 50 },
    { kind: 'potion', icon: '🧪', name: '회복 포션', desc: 'HP 8 회복 (Q로 사용)', price: 50 },
    { kind: 'maxhp', icon: '❤️', name: '생명의 정수', desc: '최대 HP +5', price: 150 },
    { kind: 'card', icon: '🃏', name: '수련서', desc: '레벨업 보상 카드 1장 선택', price: 250 },
  ]
  for (const item of rollItems(2, 'shop')) {
    stock.push({ kind: 'item', icon: item.icon, name: item.name, desc: describeItem(item), price: ITEM_PRICE[item.rarity], item })
  }
  return stock.map((s, i) => ({ ...s, idx: i, sold: false }))
}

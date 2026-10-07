// 백엔드 API 호출과 로그인 정보 보관
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
export const REDIRECT_URI = `${window.location.origin}/oauth/kakao`

const AUTH_KEY = 'roguelike.auth'
const PENDING_KEY = 'roguelike.pendingRun'

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

export const loadAuth = () => readJson(AUTH_KEY)
export const saveAuth = (auth) => localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
export const clearAuth = () => localStorage.removeItem(AUTH_KEY)

// 로그인하러 카카오로 넘어가는 동안 방금 끝난 게임 기록을 잠깐 보관
export const savePendingRun = (run) => localStorage.setItem(PENDING_KEY, JSON.stringify(run))
export function takePendingRun() {
  const run = readJson(PENDING_KEY)
  localStorage.removeItem(PENDING_KEY)
  return run
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const err = new Error(`요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const api = {
  health: () => request('/api/health'),
  ranking: () => request('/api/ranking'),
  loginUrl: () => request(`/api/auth/kakao/login-url?redirectUri=${encodeURIComponent(REDIRECT_URI)}`),
  kakaoLogin: (code) => request('/api/auth/kakao', { method: 'POST', body: { code, redirectUri: REDIRECT_URI } }),
  saveRun: (token, run) => request('/api/runs', { method: 'POST', body: run, token }),
}

export function runFromGame(game) {
  return { depth: game.depth, kills: game.kills, turns: game.turns, deathCause: game.deathCause }
}

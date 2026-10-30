// Amplitude 이벤트 전송 (HTTP API, 별도 설치 불필요)
const KEY = import.meta.env.VITE_AMPLITUDE_API_KEY
const URL = 'https://api2.amplitude.com/2/httpapi'

function id(name, make) {
  try {
    let v = localStorage.getItem(name)
    if (!v) { v = make(); localStorage.setItem(name, v) }
    return v
  } catch { return make() }
}
const deviceId = id('amp_device_id', () => crypto.randomUUID())
const sessionId = Date.now()

export function track(event, props = {}) {
  if (!KEY) { console.warn('[amplitude] VITE_AMPLITUDE_API_KEY 없음'); return }
  const q = new URLSearchParams(location.search)
  const utm = {}
  ;['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => q.get(k) && (utm[k] = q.get(k)))
  fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: KEY,
      events: [{
        user_id: 'guest_' + deviceId.slice(0, 8),
        device_id: deviceId,
        session_id: sessionId,
        time: Date.now(),
        event_type: event,
        platform: 'Web',
        event_properties: { page_path: location.pathname, referrer: document.referrer, user_status: 'guest', ...utm, ...props },
      }],
    }),
    keepalive: true,
  }).catch(() => {})
}

// 숲의 여정: 독립 HTML 게임을 화면 안에 넣어 보여준다 (public/games/forest-quest/index.html)
export default function ForestQuest({ onExit }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0b1e' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#161634' }}>
        <button
          onClick={onExit}
          style={{ padding: '6px 12px', border: '1px solid #3a3a7a', borderRadius: 6, background: '#2a2a5a', color: '#eef', cursor: 'pointer' }}
        >
          ← 게임 선택
        </button>
        <span style={{ color: '#eef', fontWeight: 700 }}>숲의 여정</span>
      </header>
      <iframe
        src="/games/forest-quest/index.html"
        title="숲의 여정"
        style={{ flex: 1, width: '100%', border: 0, background: '#000' }}
      />
    </div>
  )
}

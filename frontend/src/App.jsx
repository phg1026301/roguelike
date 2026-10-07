import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.text())
      .then((text) => setStatus(text === 'OK' ? 'Server connected' : text))
      .catch(() => setStatus('Server not connected'))
  }, [])

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Roguelike v2</h1>
      <p>Backend: {status}</p>
    </div>
  )
}

export default App

import { useEffect } from 'react'
import { spriteUrl } from './game/sprites'
import { unlockSound } from './game/sound'
import './hub.css'

// 시리즈 제목 (바꾸려면 이 한 줄만 고치면 된다)
const SERIES_TITLE = '일단 해보자 게임 시리즈'

// 선택 화면에 나오는 게임 목록
const GAMES = [
  {
    id: 'roguelike',
    no: 1,
    name: '지하 던전',
    genre: '로그라이크 · 턴제',
    desc: '직업을 고르고 지하 깊이 내려가요. 5층마다 보스, 숨겨진 직업도 있어요.',
    sprite: 'warrior',
    color: '#f0c060',
  },
  {
    id: 'tower',
    no: 2,
    name: '탑 등반',
    genre: '퍼즐 · 전투력 비교',
    desc: '전투력보다 약한 적만 이길 수 있어요. 숫자를 보고 길을 골라 10층 꼭대기까지 올라가요.',
    sprite: 'ogre',
    color: '#7fd3ff',
  },
]

// 1단계: 제목 화면. 아무 키나 누르면 게임 선택으로 넘어간다
export function TitleScreen({ onStart }) {
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      unlockSound()
      onStart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <div className="hub title" role="button" tabIndex={0} onClick={() => { unlockSound(); onStart() }}>
      <div className="title-inner">
        <p className="title-kicker">GAME SERIES</p>
        <h1 className="series-title">{SERIES_TITLE}</h1>
        <p className="press-any">아무 키나 누르세요</p>
      </div>
    </div>
  )
}

// 2단계: 게임 선택 화면
export function SelectScreen({ onPick, onBack }) {
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === 'Escape') {
        onBack()
        return
      }
      const idx = Number(key) - 1
      if (idx >= 0 && idx < GAMES.length) onPick(GAMES[idx].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPick, onBack])

  return (
    <div className="hub select">
      <header className="hub-head">
        <button className="back-btn" onClick={onBack}>← 처음으로</button>
        <span className="hub-series">{SERIES_TITLE}</span>
      </header>
      <h2 className="select-title">게임을 고르세요</h2>
      <p className="select-sub">카드를 클릭하거나 키보드 <kbd>1</kbd> <kbd>2</kbd> 로 선택</p>
      <div className="game-cards">
        {GAMES.map((g) => (
          <button key={g.id} className="game-card" style={{ '--game': g.color }} onClick={() => onPick(g.id)}>
            <span className="game-no">{g.no}</span>
            <span className="game-art">
              <img className="pixel-icon" src={spriteUrl(g.sprite)} width={96} height={96} alt="" />
            </span>
            <b className="game-name">{g.name}</b>
            <span className="game-genre">{g.genre}</span>
            <span className="game-desc">{g.desc}</span>
            <span className="game-play">플레이 ▶</span>
          </button>
        ))}
      </div>
    </div>
  )
}

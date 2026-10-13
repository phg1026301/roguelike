import { useEffect, useState } from 'react'
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
    folder: 'turn',
    genre: '로그라이크 · 턴제',
    desc: '직업을 고르고 지하 깊이 내려가요. 5층마다 보스, 숨겨진 직업도 있어요.',
    sprite: 'warrior',
    color: '#f0c060',
  },
  {
    id: 'tower',
    no: 2,
    name: '탑 등반',
    folder: 'turn',
    genre: '퍼즐 · 전투력 비교',
    desc: '전투력보다 약한 적만 이길 수 있어요. 숫자를 보고 길을 골라 10층 꼭대기까지 올라가요.',
    sprite: 'ogre',
    color: '#7fd3ff',
  },
  {
    id: 'cards',
    no: 3,
    name: '카드 전투',
    folder: 'turn',
    genre: '카드 · 턴제 대결',
    desc: '카드를 내서 하수인을 세우고 상대 영웅을 먼저 쓰러뜨려요. 컴퓨터와 대결합니다.',
    sprite: 'summoner',
    color: '#c58bff',
  },
  {
    id: 'lane',
    no: 4,
    name: '레인 디펜스',
    folder: 'action',
    genre: '실시간 · 디펜스',
    desc: '마나로 6종의 개성 있는 유닛을 세워 3개의 길을 막아요. 3스테이지마다 보스가 나와요.',
    sprite: 'golem',
    color: '#7fe0a0',
  },
  {
    id: 'shooter',
    no: 5,
    name: '탄환 소년',
    folder: 'action',
    genre: '실시간 · 8방향 슈팅',
    desc: '방향키를 누르고 있으면 계속 움직여요. 무기를 바꿔 몰려오는 적을 쓸어버리세요.',
    sprite: 'archer',
    color: '#ff8a6b',
  },
  {
    id: 'story',
    no: 6,
    name: '네온 시티',
    folder: 'story',
    genre: '스토리 · 선택형',
    desc: '사이버펑크 도시에서 선택에 따라 달라지는 이야기를 따라가요.',
    sprite: 'merchant',
    color: '#5ee6ff',
  },
  {
    id: 'arke',
    no: 8,
    name: '아르케 넷 0417',
    folder: 'story',
    genre: '스토리 · 선택형 (미스터리)',
    desc: '로그아웃이 막힌 가상현실 MMO에서 10년 전 사고의 진실을 파헤쳐요. 선택에 따라 4가지 엔딩이 갈려요.',
    sprite: 'merchant',
    color: '#c9b8ff',
  },
  {
    id: 'road',
    no: 9,
    name: '항로 0417',
    folder: 'story',
    genre: '스토리 · 우주 항로 (시즌 1)',
    desc: '변방 정거장에서 시작해 중앙 항성과 지워진 행성까지. 우주 항로의 기억 공백을 파헤쳐요.',
    sprite: 'merchant',
    color: '#7fb8ff',
  },
  {
    id: 'forest',
    no: 10,
    name: '숲의 여정',
    folder: 'action',
    genre: '횡스크롤 · 액션 RPG (프로토타입)',
    desc: '마을에서 출발해 숲의 버섯과 박쥐를 잡아 레벨을 올리고, 숲의 보스를 쓰러뜨려요.',
    sprite: 'warrior',
    color: '#8fe39a',
  },
  {
    id: 'gostop',
    no: 11,
    name: '고스톱',
    folder: 'turn',
    genre: '카드 · 화투 (컴퓨터와 대결)',
    desc: '화투 48장으로 같은 달 카드를 맞춰 점수를 모아요. 7점 이상이면 고 또는 스톱을 고를 수 있어요.',
    sprite: 'merchant',
    color: '#f5a6c8',
  },
  {
    id: 'action',
    no: 7,
    name: '검의 길',
    folder: 'action',
    genre: '실시간 · 액션 RPG (프로토타입)',
    desc: '검사(콤보)나 마법사(원거리) 중 직업을 고르고, 들판의 적을 베어 동굴의 보스 그롬을 쓰러뜨려요.',
    sprite: 'warrior',
    color: '#b6ff9e',
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

// 장르 폴더: 게임은 folder 값으로 이 중 하나에 속한다
const FOLDERS = [
  { id: 'turn', name: '턴제 · 퍼즐', desc: '천천히 생각하며 즐기는 게임', color: '#f5c86b' },
  { id: 'action', name: '실시간 액션', desc: '손이 바쁘게 움직이는 게임', color: '#ff8a6b' },
  { id: 'story', name: '스토리', desc: '글로 읽고 선택하는 이야기', color: '#9ef0ff' },
]

// 2단계: 게임 선택 화면 (장르 폴더 → 그 안의 게임 카드)
export function SelectScreen({ onPick, onBack }) {
  const [folder, setFolder] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === 'Escape') {
        if (folder) setFolder(null)
        else onBack()
        return
      }
      const idx = Number(key) - 1
      if (!folder) {
        if (idx >= 0 && idx < FOLDERS.length) setFolder(FOLDERS[idx].id)
        return
      }
      const list = GAMES.filter((g) => g.folder === folder)
      if (idx >= 0 && idx < list.length) onPick(list[idx].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [folder, onPick, onBack])

  const current = FOLDERS.find((f) => f.id === folder)

  return (
    <div className="hub select">
      <header className="hub-head">
        <button className="back-btn" onClick={folder ? () => setFolder(null) : onBack}>
          {folder ? '← 폴더로' : '← 처음으로'}
        </button>
        <span className="hub-series">{SERIES_TITLE}</span>
      </header>

      {!current && (
        <>
          <h2 className="select-title">장르 폴더를 고르세요</h2>
          <p className="select-sub">폴더를 클릭하거나 키보드 <kbd>1</kbd>~<kbd>{FOLDERS.length}</kbd></p>
          <div className="folder-cards">
            {FOLDERS.map((f, i) => (
              <button key={f.id} className="folder-card" style={{ '--game': f.color }} onClick={() => setFolder(f.id)}>
                <span className="folder-no">{i + 1}</span>
                <span className="folder-icon" aria-hidden="true">📁</span>
                <b className="folder-name">{f.name}</b>
                <span className="folder-desc">{f.desc}</span>
                <span className="folder-count">{GAMES.filter((g) => g.folder === f.id).length}개 게임</span>
              </button>
            ))}
          </div>
        </>
      )}

      {current && (
        <>
          <h2 className="select-title">{current.name}</h2>
          <p className="select-sub">카드를 클릭하거나 숫자키로 고르세요 · Esc 폴더로</p>
          <div className="game-cards">
            {GAMES.filter((g) => g.folder === current.id).map((g, i) => (
              <button key={g.id} className="game-card" style={{ '--game': g.color }} onClick={() => onPick(g.id)}>
                <span className="game-no">{i + 1}</span>
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
        </>
      )}
    </div>
  )
}

// 네온 시티 등장인물 일러스트 (SVG 벡터)
// 굵은 외곽선 + 2단 셀 음영 + 네온 림라이트. 애니메이션풍 포스터 느낌을 목표로 하되 캐릭터는 모두 새로 그렸다.

const OUT = '#0a0a14' // 외곽선 색
const OW = 3.5 // 외곽선 두께

const GLOW = (
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.6" result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
)

// 배경 + 공통 정의. accent는 림라이트 색, bgTop/bgBot은 배경 그라디언트 색
function Frame({ id, accent, bgTop = '#0f3b3a', bgBot = '#04100f', children }) {
  return (
    <svg viewBox="0 0 200 200" className="st-portrait-svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bgTop} />
          <stop offset="100%" stopColor={bgBot} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f8dcc0" />
          <stop offset="100%" stopColor="#d89a72" />
        </linearGradient>
        {GLOW}
      </defs>
      <rect width="200" height="200" fill={`url(#${id}-bg)`} />
      {/* 포스터처럼 뒤에서 치는 빛의 원 */}
      <circle cx="100" cy="88" r="78" fill={`url(#${id}-halo)`} />
      {/* 배경의 가는 스캔 줄 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1="0" x2="200" y1={i * 22 + 8} y2={i * 22 + 8} stroke={accent} strokeOpacity="0.06" strokeWidth="1" />
      ))}
      {children}
    </svg>
  )
}

// 공통 얼굴 그림: 외곽선 + 턱 그림자 + 눈동자/입 기본형
function Face({ id, d, shade }) {
  return (
    <>
      <path d={d} fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      {shade && <path d={shade} fill="#b8704f" opacity="0.5" />}
    </>
  )
}

function Rico() {
  const id = 'rico'
  return (
    <Frame id={id} accent="#5ee6ff" bgTop="#0c3a3e" bgBot="#031214">
      {/* 재킷 (청록) */}
      <path d="M26 200 L32 160 Q42 134 80 128 L100 146 L120 128 Q158 134 168 160 L174 200 Z" fill="#1d8f8a" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M100 146 L120 128 Q158 134 168 160 L168 200 L120 200 Z" fill="#136360" />
      <path d="M80 128 L100 152 L120 128" fill="none" stroke="#0a2a2c" strokeWidth="5" />
      <path d="M32 160 L32 200" stroke="#5ee6ff" strokeWidth="2" filter="url(#glow)" />
      {/* 목 */}
      <path d="M88 116 L112 116 L115 150 L85 150 Z" fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth="2.5" />
      {/* 얼굴 */}
      <Face id={id} d="M68 84 Q68 46 100 44 Q132 46 132 84 Q132 114 117 128 Q100 140 83 128 Q68 114 68 84 Z" shade="M118 90 Q130 108 116 126 Q124 110 118 90 Z" />
      {/* 머리: 헝클어진 검은 머리 + 분홍 한 줄 */}
      <path d="M60 96 Q48 40 100 30 Q152 40 140 96 Q134 66 122 58 Q108 74 88 60 Q70 70 60 96 Z" fill="#17121f" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M120 38 Q138 58 130 88 Q126 64 112 50 Z" fill="#ff4fc0" filter="url(#glow)" />
      {/* 고글 */}
      <path d="M70 72 Q100 60 130 72" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
      <rect x="76" y="70" width="20" height="14" rx="7" fill="#5ee6ff" stroke={OUT} strokeWidth="2.5" filter="url(#glow)" />
      <rect x="104" y="70" width="20" height="14" rx="7" fill="#5ee6ff" stroke={OUT} strokeWidth="2.5" filter="url(#glow)" />
      <circle cx="86" cy="76" r="2.4" fill="#ffffff" />
      <circle cx="114" cy="76" r="2.4" fill="#ffffff" />
      {/* 입, 귀걸이 */}
      <path d="M92 112 Q100 117 108 112" fill="none" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="68" cy="100" r="3.5" fill="#5ee6ff" filter="url(#glow)" />
    </Frame>
  )
}

function Mira() {
  const id = 'mira'
  return (
    <Frame id={id} accent="#ff4fc0" bgTop="#2a1046" bgBot="#0a0414">
      {/* 뒤로 흐르는 보라 머리 */}
      <path d="M52 198 Q38 110 62 66 Q100 22 140 66 Q164 110 148 198 Z" fill="#4b2290" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M62 190 Q56 118 72 84 Q100 40 128 84 Q144 118 138 190 Z" fill="#7034c0" />
      {/* 검은 하이넥 코트 */}
      <path d="M30 200 L38 156 Q52 130 84 126 L100 140 L116 126 Q148 130 162 156 L170 200 Z" fill="#1e1b2a" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M84 126 L66 160 L94 150 Z" fill="#34304a" />
      <path d="M116 126 L134 160 L106 150 Z" fill="#34304a" />
      <path d="M100 142 L100 200" stroke="#ff4fc0" strokeWidth="2" filter="url(#glow)" />
      {/* 목 */}
      <path d="M88 116 L112 116 L114 150 L86 150 Z" fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth="2.5" />
      {/* 얼굴 (날카로운 턱) */}
      <Face id={id} d="M72 82 Q72 50 100 48 Q128 50 128 82 Q128 108 110 126 Q100 132 90 126 Q72 108 72 82 Z" shade="M118 96 Q126 110 110 124 Q118 112 118 96 Z" />
      {/* 앞머리 */}
      <path d="M66 88 Q70 48 102 50 Q130 52 134 88 Q120 66 100 68 Q82 68 66 88 Z" fill="#7034c0" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 86 Q74 66 92 62" fill="none" stroke="#c9a2ff" strokeWidth="2" opacity="0.7" />
      {/* 왼눈: 자연 눈 */}
      <path d="M76 94 Q86 86 96 94 Q86 99 76 94 Z" fill="#14101c" stroke={OUT} strokeWidth="1.5" />
      <path d="M74 91 L70 89" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      {/* 오른눈: 분홍 사이버 임플란트 */}
      <ellipse cx="118" cy="95" rx="12" ry="9" fill="#0a0810" stroke={OUT} strokeWidth="2" />
      <circle cx="118" cy="95" r="6" fill="#ff4fc0" filter="url(#glow)" />
      <circle cx="118" cy="95" r="2.2" fill="#ffffff" />
      <path d="M106 95 L130 95" stroke="#ff4fc0" strokeWidth="1" opacity="0.6" />
      {/* 볼 회로 선 */}
      <path d="M74 106 L86 110 L92 120" fill="none" stroke="#5ee6ff" strokeWidth="1.8" filter="url(#glow)" />
      {/* 입 */}
      <path d="M90 116 Q100 120 110 116 Q104 124 100 124 Q96 124 90 116 Z" fill="#b84a6e" stroke={OUT} strokeWidth="1.5" />
    </Frame>
  )
}

function Kai() {
  const id = 'kai'
  return (
    <Frame id={id} accent="#7fb0ff" bgTop="#14204a" bgBot="#050914">
      {/* 짙은 파란 코트 */}
      <path d="M28 200 L36 160 Q50 132 84 126 L100 146 L116 126 Q150 132 164 160 L172 200 Z" fill="#23335e" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M100 146 L116 126 Q150 132 164 160 L172 200 L116 200 Z" fill="#182546" />
      <path d="M100 146 L100 200" stroke="#5a7fc8" strokeWidth="2" />
      {/* 금속 팔 (왼쪽, 관절 표시) */}
      <path d="M22 200 L22 160 Q24 134 46 128 L60 148 L48 178 L42 200 Z" fill="#9aa6bc" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M30 150 L44 146 M30 170 L44 168" stroke="#4a5264" strokeWidth="2" />
      <circle cx="50" cy="140" r="5.5" fill="#2a2e3c" stroke={OUT} strokeWidth="2" />
      <circle cx="50" cy="140" r="2" fill="#7fb0ff" filter="url(#glow)" />
      {/* 목 */}
      <path d="M88 116 L112 116 L115 150 L85 150 Z" fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth="2.5" />
      {/* 얼굴: 각진 턱 */}
      <Face id={id} d="M70 84 Q70 48 100 46 Q130 48 130 84 Q132 114 116 132 Q100 142 84 132 Q68 114 70 84 Z" shade="M118 100 Q128 116 116 130 Q122 118 118 100 Z" />
      {/* 짧은 머리 (바리캉) */}
      <path d="M68 80 Q66 42 100 40 Q134 42 132 80 Q126 60 100 58 Q74 60 68 80 Z" fill="#2e2e3a" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
      {/* 눈썹, 눈 */}
      <path d="M80 78 L96 83" stroke={OUT} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M104 83 L120 78" stroke={OUT} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M80 92 Q88 88 96 92" fill="none" stroke={OUT} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M104 92 Q112 88 120 92" fill="none" stroke={OUT} strokeWidth="2.8" strokeLinecap="round" />
      {/* 흉터 */}
      <path d="M122 84 L128 108" stroke="#8a3a3a" strokeWidth="2.2" strokeLinecap="round" />
      {/* 입 */}
      <path d="M92 118 L108 118" stroke={OUT} strokeWidth="2.8" strokeLinecap="round" />
      {/* 어깨 표식등 (주황) */}
      <circle cx="158" cy="150" r="4.5" fill="#ff8a3b" stroke={OUT} strokeWidth="1.5" filter="url(#glow)" />
    </Frame>
  )
}

function Ada() {
  const id = 'ada'
  return (
    <Frame id={id} accent="#8dffd9" bgTop="#0c3a30" bgBot="#021410">
      {/* 흰 롱코트 */}
      <path d="M24 200 L30 152 Q42 128 84 124 L100 140 L116 124 Q158 128 170 152 L176 200 Z" fill="#e8f4f1" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 124 Q158 128 170 152 L176 200 L120 200 Z" fill="#b8d4cc" />
      {/* 세라프 마크 (목 칼라) */}
      <path d="M86 128 L100 146 L114 128" fill="none" stroke="#2ad4a6" strokeWidth="3" filter="url(#glow)" />
      {/* 목 */}
      <path d="M88 114 L112 114 L114 148 L86 148 Z" fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth="2.5" />
      {/* 뒤 머리 (은빛 단발) */}
      <path d="M58 100 Q50 46 100 36 Q150 46 142 100 Q140 120 132 126 L126 96 Q108 70 74 96 L68 126 Q60 120 58 100 Z" fill="#cfe9e2" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      {/* 얼굴 */}
      <Face id={id} d="M72 84 Q72 48 100 46 Q128 48 128 84 Q128 110 112 126 Q100 132 88 126 Q72 110 72 84 Z" shade="M116 98 Q126 110 112 124 Q120 112 116 98 Z" />
      {/* 앞머리 */}
      <path d="M68 90 Q70 50 102 50 Q132 52 132 90 Q118 68 96 74 Q80 74 68 90 Z" fill="#cfe9e2" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M72 84 Q80 66 96 62" fill="none" stroke="#8dffd9" strokeWidth="1.8" opacity="0.8" />
      {/* 왼눈 */}
      <path d="M78 94 Q88 88 98 94 Q88 99 78 94 Z" fill="#0e2a24" stroke={OUT} strokeWidth="1.5" />
      <circle cx="88" cy="94" r="2" fill="#8dffd9" />
      {/* 오른눈: 녹색 홍채 디스플레이 */}
      <ellipse cx="120" cy="94" rx="11" ry="8" fill="#06120f" stroke={OUT} strokeWidth="2" />
      <circle cx="120" cy="94" r="5.5" fill="none" stroke="#8dffd9" strokeWidth="2" filter="url(#glow)" />
      <circle cx="120" cy="94" r="2" fill="#8dffd9" filter="url(#glow)" />
      {/* 입 (차분한 미소) */}
      <path d="M94 116 Q102 120 110 116" fill="none" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      {/* 귀 옆 헤일로 링 */}
      <ellipse cx="100" cy="30" rx="34" ry="6" fill="none" stroke="#8dffd9" strokeWidth="2.5" opacity="0.8" filter="url(#glow)" />
    </Frame>
  )
}

function Vex() {
  const id = 'vex'
  return (
    <Frame id={id} accent="#ffb347" bgTop="#2a2a10" bgBot="#0a0a04">
      {/* 주황 항만 재킷 + 화물 끈 */}
      <path d="M22 200 L28 158 Q40 130 84 124 L100 140 L116 124 Q160 130 172 158 L178 200 Z" fill="#c26a1f" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 124 Q160 130 172 158 L178 200 L120 200 Z" fill="#8f4a14" />
      <path d="M60 150 L140 186" stroke="#ffb347" strokeWidth="5" opacity="0.9" />
      <path d="M60 150 L140 186" stroke={OUT} strokeWidth="1.5" opacity="0.6" />
      {/* 목 */}
      <path d="M88 116 L112 116 L114 150 L86 150 Z" fill={`url(#${id}-skin)`} stroke={OUT} strokeWidth="2.5" />
      {/* 얼굴 */}
      <Face id={id} d="M70 84 Q70 48 100 46 Q130 48 130 84 Q130 112 116 128 Q100 138 84 128 Q70 112 70 84 Z" shade="M118 98 Q128 112 116 126 Q122 114 118 98 Z" />
      {/* 짧게 민 옆머리 + 갈색 윗머리 */}
      <path d="M68 82 Q64 44 100 40 Q136 44 132 82 Q128 60 100 58 Q72 60 68 82 Z" fill="#5a3418" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M72 62 Q100 50 128 62" fill="none" stroke="#8a5a2a" strokeWidth="2" opacity="0.7" />
      {/* 바이저 (어두운 유리 + 주황 반사) */}
      <path d="M72 80 Q100 70 128 80 L126 96 Q100 102 74 96 Z" fill="#0c0c12" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M80 84 L100 80" stroke="#ffb347" strokeWidth="2" opacity="0.9" filter="url(#glow)" />
      <path d="M104 84 L122 82" stroke="#ffb347" strokeWidth="1.5" opacity="0.6" />
      {/* 입: 비스듬한 웃음 */}
      <path d="M92 118 Q104 122 114 114" fill="none" stroke={OUT} strokeWidth="2.8" strokeLinecap="round" />
      {/* 턱의 흉터와 귀걸이 */}
      <path d="M78 112 L84 122" stroke="#8a3a3a" strokeWidth="2" strokeLinecap="round" />
      <rect x="66" y="96" width="5" height="9" rx="2" fill="#ffb347" stroke={OUT} strokeWidth="1.5" filter="url(#glow)" />
    </Frame>
  )
}

const COMPONENTS = { 리코: Rico, 미라: Mira, 카이: Kai, 에이다: Ada, 벡스: Vex }
export const PORTRAIT_SVG_NAMES = Object.keys(COMPONENTS)

// 말하는 인물의 초상화 (없는 인물이면 아무것도 그리지 않는다)
export function PortraitSvg({ name }) {
  const C = COMPONENTS[name]
  return C ? <C /> : null
}

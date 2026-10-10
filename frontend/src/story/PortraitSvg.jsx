import { useState } from 'react'
import { STORY_PORTRAIT_IMAGES } from './storyImages'

// 네온 시티 등장인물 일러스트 (SVG 벡터)
// 검은 바탕 + 굵은 어두운 외곽선 + 단색 셀 음영 + 마젠타·시안 네온 포인트.
// 사이버 포스터의 화풍만 참고해 다섯 인물을 새로 그렸다. 특정 작품의 그림은 따라 그리지 않았다.

const OUT = '#07031a' // 외곽선 색 (거의 검정에 가까운 남색)
const OW = 4 // 외곽선 두께
const SKIN = '#f2c6a2' // 기본 피부색
const SKIN_SHADE = '#c98665' // 피부 그림자 (단색 셀 음영)

const GLOW = (
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.4" result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
)

// 배경 + 공통 장식. accent는 네온 포인트 색, bgTop/bgBot은 배경 그라디언트 색
function Frame({ id, accent, bgTop = '#1a0630', bgBot = '#05020c', children }) {
  return (
    <svg viewBox="0 0 200 200" className="st-portrait-svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bgTop} />
          <stop offset="100%" stopColor={bgBot} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        {GLOW}
      </defs>
      <rect width="200" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="100" cy="92" r="82" fill={`url(#${id}-halo)`} />
      {/* 뒤에 깔린 큰 삼각형 틀 (사이버 포스터 장식) */}
      <path d="M-6 206 L100 -8 L206 206" fill="none" stroke={accent} strokeWidth="3" opacity="0.75" filter="url(#glow)" />
      <path d="M16 206 L100 34 L184 206" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.22" />
      {/* 바닥의 가로 눈금 */}
      {[170, 184, 198].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke={accent} strokeOpacity="0.14" strokeWidth="1" />
      ))}
      {children}
    </svg>
  )
}

// 얼굴: 외곽선 + 단색 그림자 한 덩어리
function Face({ d, shade }) {
  return (
    <>
      <path d={d} fill={SKIN} stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      {shade && <path d={shade} fill={SKIN_SHADE} />}
    </>
  )
}

// 목 (그림자 있는 단색)
function Neck({ d = 'M88 116 L112 116 L115 150 L85 150 Z' }) {
  return <path d={d} fill={SKIN_SHADE} stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
}

function Rico() {
  const id = 'rico'
  return (
    <Frame id={id} accent="#3ff0ff" bgTop="#0a2a36" bgBot="#02080c">
      {/* 검정 재킷 + 시안 칼라 */}
      <path d="M24 200 L30 160 Q42 134 80 128 L100 148 L120 128 Q158 134 170 160 L176 200 Z" fill="#1b1638" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M100 148 L120 128 Q158 134 170 160 L176 200 L110 200 Z" fill="#110d26" />
      <path d="M80 128 L100 152 L120 128" fill="none" stroke="#3ff0ff" strokeWidth="3.5" filter="url(#glow)" />
      <path d="M34 160 L34 200" stroke="#ff3fb4" strokeWidth="2.5" filter="url(#glow)" />
      <Neck />
      <Face d="M68 84 Q68 46 100 44 Q132 46 132 84 Q132 114 117 128 Q100 140 83 128 Q68 114 68 84 Z" shade="M116 92 Q130 108 117 128 Q124 112 116 92 Z" />
      {/* 뒤 머리 (검정) + 시안 스트릭 */}
      <path d="M58 98 Q46 38 100 28 Q154 38 142 98 Q140 70 124 60 Q100 72 78 60 Q60 70 58 98 Z" fill="#0d0a18" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 36 Q136 56 130 92 Q126 64 112 48 Z" fill="#3ff0ff" filter="url(#glow)" />
      {/* 앞머리 */}
      <path d="M66 80 Q76 54 102 52 Q126 54 134 80 Q118 66 100 66 Q82 66 66 80 Z" fill="#0d0a18" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      {/* 고글 밴드 + 시안 렌즈 */}
      <path d="M68 72 Q100 60 132 72" fill="none" stroke={OUT} strokeWidth="8" strokeLinecap="round" />
      <rect x="74" y="68" width="22" height="14" rx="5" fill="#3ff0ff" stroke={OUT} strokeWidth="3" filter="url(#glow)" />
      <rect x="104" y="68" width="22" height="14" rx="5" fill="#3ff0ff" stroke={OUT} strokeWidth="3" filter="url(#glow)" />
      <path d="M79 72 L86 72 M109 72 L116 72" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      {/* 뺨 표식, 입 */}
      <path d="M68 100 L80 104" stroke="#3ff0ff" strokeWidth="2" filter="url(#glow)" />
      <path d="M92 112 Q100 117 108 112" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="68" cy="112" r="3.5" fill="#ff3fb4" stroke={OUT} strokeWidth="1.5" filter="url(#glow)" />
    </Frame>
  )
}

function Mira() {
  const id = 'mira'
  return (
    <Frame id={id} accent="#ff3fb4" bgTop="#2a0a3a" bgBot="#07020d">
      {/* 뒤로 흐르는 긴 보라 머리 */}
      <path d="M50 200 Q36 110 60 64 Q100 18 140 64 Q164 110 150 200 Z" fill="#3a1666" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M62 196 Q56 118 74 84 Q100 40 126 84 Q144 118 138 196 Z" fill="#5b2a9a" />
      {/* 검정 하이넥 코트 */}
      <path d="M30 200 L38 156 Q52 130 84 126 L100 140 L116 126 Q148 130 162 156 L170 200 Z" fill="#15121f" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 126 Q148 130 162 156 L170 200 L110 200 L100 140 Z" fill="#0a0912" />
      <path d="M84 126 L66 160 L94 150 Z" fill="#2c2842" />
      <path d="M100 142 L100 200" stroke="#ff3fb4" strokeWidth="2.5" filter="url(#glow)" />
      <Neck d="M88 116 L112 116 L114 150 L86 150 Z" />
      <Face d="M72 82 Q72 50 100 48 Q128 50 128 82 Q128 108 110 126 Q100 132 90 126 Q72 108 72 82 Z" shade="M116 96 Q126 110 110 124 Q118 112 116 96 Z" />
      {/* 앞머리 */}
      <path d="M66 88 Q70 48 102 50 Q130 52 134 88 Q120 66 100 68 Q82 68 66 88 Z" fill="#5b2a9a" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M68 86 Q74 66 92 62" fill="none" stroke="#d7b8ff" strokeWidth="2" />
      {/* 왼눈: 자연 눈 */}
      <path d="M76 94 Q86 86 96 94 Q86 99 76 94 Z" fill="#120a1a" stroke={OUT} strokeWidth="1.8" />
      <path d="M74 91 L70 89" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      {/* 오른눈: 마젠타 사이버 임플란트 */}
      <ellipse cx="118" cy="95" rx="12" ry="9" fill="#070409" stroke={OUT} strokeWidth="2.5" />
      <circle cx="118" cy="95" r="6" fill="#ff3fb4" filter="url(#glow)" />
      <circle cx="118" cy="95" r="2.2" fill="#ffffff" />
      {/* 볼 회로 선, 입 */}
      <path d="M74 106 L86 110 L92 120" fill="none" stroke="#3ff0ff" strokeWidth="2" filter="url(#glow)" />
      <path d="M90 116 Q100 120 110 116 Q104 124 100 124 Q96 124 90 116 Z" fill="#8a2a58" stroke={OUT} strokeWidth="1.8" />
    </Frame>
  )
}

function Kai() {
  const id = 'kai'
  return (
    <Frame id={id} accent="#4f8cff" bgTop="#0c1838" bgBot="#03060f">
      {/* 짙은 남색 코트 */}
      <path d="M28 200 L36 160 Q50 132 84 126 L100 146 L116 126 Q150 132 164 160 L172 200 Z" fill="#1d2a4d" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M100 146 L116 126 Q150 132 164 160 L172 200 L110 200 Z" fill="#121b33" />
      <path d="M100 146 L100 200" stroke="#4f8cff" strokeWidth="2.5" filter="url(#glow)" />
      {/* 금속 팔 (왼쪽, 관절 표시) */}
      <path d="M22 200 L22 160 Q24 134 46 128 L60 148 L48 178 L42 200 Z" fill="#8f9bb5" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M34 200 L40 176 L56 150 L60 148 L48 178 L42 200 Z" fill="#5d6a85" />
      <path d="M30 152 L44 148 M30 172 L44 170" stroke="#3a4256" strokeWidth="2.5" />
      <circle cx="50" cy="140" r="6" fill="#2a2e3c" stroke={OUT} strokeWidth="2.5" />
      <circle cx="50" cy="140" r="2.4" fill="#4f8cff" filter="url(#glow)" />
      <Neck d="M88 116 L112 116 L115 150 L85 150 Z" />
      {/* 각진 얼굴 */}
      <Face d="M70 84 Q70 48 100 46 Q130 48 130 84 Q132 114 116 132 Q100 142 84 132 Q68 114 70 84 Z" shade="M118 100 Q128 116 116 130 Q122 118 118 100 Z" />
      {/* 짧은 머리 */}
      <path d="M68 80 Q66 42 100 40 Q134 42 132 80 Q126 60 100 58 Q74 60 68 80 Z" fill="#1b1d28" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      {/* 눈썹, 눈 */}
      <path d="M80 78 L96 83" stroke={OUT} strokeWidth="4" strokeLinecap="round" />
      <path d="M104 83 L120 78" stroke={OUT} strokeWidth="4" strokeLinecap="round" />
      <path d="M80 92 Q88 88 96 92" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      <path d="M104 92 Q112 88 120 92" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      {/* 흉터, 입 */}
      <path d="M122 84 L128 108" stroke="#7a2a2a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M92 118 L108 118" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      {/* 어깨 표식등 */}
      <circle cx="158" cy="150" r="5" fill="#ff8a3b" stroke={OUT} strokeWidth="2" filter="url(#glow)" />
    </Frame>
  )
}

function Ada() {
  const id = 'ada'
  return (
    <Frame id={id} accent="#b68cff" bgTop="#1a0a3a" bgBot="#05020f">
      {/* 흰 롱코트 + 보라 음영 */}
      <path d="M24 200 L30 152 Q42 128 84 124 L100 140 L116 124 Q158 128 170 152 L176 200 Z" fill="#ece6ff" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 124 Q158 128 170 152 L176 200 L110 200 L100 140 Z" fill="#b9a6f0" />
      {/* 세라프 칼라 */}
      <path d="M86 128 L100 146 L114 128" fill="none" stroke="#9b5cff" strokeWidth="3.5" filter="url(#glow)" />
      <Neck d="M88 114 L112 114 L114 148 L86 148 Z" />
      {/* 뒤 머리 (은빛 단발) */}
      <path d="M58 100 Q50 46 100 36 Q150 46 142 100 Q140 120 132 126 L126 96 Q108 70 74 96 L68 126 Q60 120 58 100 Z" fill="#d8ccff" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <Face d="M72 84 Q72 48 100 46 Q128 48 128 84 Q128 110 112 126 Q100 132 88 126 Q72 110 72 84 Z" shade="M116 98 Q126 110 112 124 Q120 112 116 98 Z" />
      {/* 앞머리 */}
      <path d="M68 90 Q70 50 102 50 Q132 52 132 90 Q118 68 96 74 Q80 74 68 90 Z" fill="#f2eeff" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 84 Q80 66 96 62" fill="none" stroke="#b68cff" strokeWidth="2" />
      {/* 왼눈 */}
      <path d="M78 94 Q88 88 98 94 Q88 99 78 94 Z" fill="#0e2a24" stroke={OUT} strokeWidth="1.8" />
      <circle cx="88" cy="94" r="2" fill="#b68cff" />
      {/* 오른눈: 디스플레이 홍채 */}
      <ellipse cx="120" cy="94" rx="11" ry="8" fill="#06120f" stroke={OUT} strokeWidth="2.5" />
      <circle cx="120" cy="94" r="5.5" fill="none" stroke="#b68cff" strokeWidth="2.2" filter="url(#glow)" />
      <circle cx="120" cy="94" r="2" fill="#b68cff" filter="url(#glow)" />
      {/* 입 (차분한 미소) */}
      <path d="M94 116 Q102 120 110 116" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      {/* 머리 위 헤일로 링 */}
      <ellipse cx="100" cy="30" rx="34" ry="6" fill="none" stroke="#b68cff" strokeWidth="3" filter="url(#glow)" />
    </Frame>
  )
}

function Vex() {
  const id = 'vex'
  return (
    <Frame id={id} accent="#ffa93b" bgTop="#2a1a06" bgBot="#080502">
      {/* 주황 항만 재킷 + 화물 끈 */}
      <path d="M22 200 L28 158 Q40 130 84 124 L100 140 L116 124 Q160 130 172 158 L178 200 Z" fill="#d9772a" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M116 124 Q160 130 172 158 L178 200 L110 200 L100 140 Z" fill="#8a4413" />
      <path d="M60 150 L140 186" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
      <path d="M60 150 L140 186" stroke="#ffa93b" strokeWidth="3" strokeLinecap="round" />
      <Neck d="M88 116 L112 116 L114 150 L86 150 Z" />
      <Face d="M70 84 Q70 48 100 46 Q130 48 130 84 Q130 112 116 128 Q100 138 84 128 Q70 112 70 84 Z" shade="M118 98 Q128 112 116 126 Q122 114 118 98 Z" />
      {/* 짧게 민 옆머리 + 갈색 윗머리 */}
      <path d="M68 82 Q64 44 100 40 Q136 44 132 82 Q128 60 100 58 Q72 60 68 82 Z" fill="#5a3418" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 62 Q100 50 128 62" fill="none" stroke="#8a5a2a" strokeWidth="2" />
      {/* 바이저 (어두운 유리 + 주황 반사) */}
      <path d="M70 80 Q100 70 130 80 L128 96 Q100 102 72 96 Z" fill="#08070d" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M80 84 L100 80" stroke="#ffa93b" strokeWidth="2.5" filter="url(#glow)" />
      <path d="M104 86 L122 84" stroke="#ffa93b" strokeWidth="1.5" opacity="0.7" />
      {/* 입: 비스듬한 웃음, 흉터 */}
      <path d="M92 118 Q104 122 114 114" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      <path d="M78 112 L84 122" stroke="#7a2a2a" strokeWidth="2.5" strokeLinecap="round" />
      {/* 귀걸이 */}
      <rect x="66" y="96" width="5" height="9" rx="2" fill="#ffa93b" stroke={OUT} strokeWidth="2" filter="url(#glow)" />
    </Frame>
  )
}

const COMPONENTS = { 리코: Rico, 미라: Mira, 카이: Kai, 에이다: Ada, 벡스: Vex }
export const PORTRAIT_SVG_NAMES = Object.keys(COMPONENTS)

// 말하는 인물의 초상화 (없는 인물이면 아무것도 그리지 않는다)
export function PortraitSvg({ name }) {
  // 초상화 그림 파일이 있으면 그 그림을 쓰고, 없거나 불러오지 못하면 아래 SVG 그림을 쓴다
  const [failedSrc, setFailedSrc] = useState(null)
  const src = STORY_PORTRAIT_IMAGES[name]
  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  const C = COMPONENTS[name]
  return C ? <C /> : null
}

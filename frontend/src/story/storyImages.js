// 네온 시티 그림 연결표
// 그림 파일을 frontend/public/story/ 아래 폴더에 넣고, 아래 경로와 파일 이름을 맞추면 그림으로 바뀐다.
// 파일이 없거나 불러오지 못하면 지금의 코드 그림을 그대로 쓴다. 전부 비워 두어도 게임은 정상 동작한다.
//
// 배경 그림 규격: 가로 960 × 세로 300 권장 (PNG 또는 JPG). 화면에 꽉 차게 맞춰 잘려서 보인다.
// 초상화 규격: 세로로 긴 그림 (예: 400 × 600). 초상화 칸에 맞춰 잘려서 보인다.

// 장면 분위기 키(bg)별 배경 그림
export const STORY_BG_IMAGES = {
  rain: '/story/bg/rain.png', // 비 내리는 도시 (시작)
  tower: '/story/bg/tower.png', // 오르빗 타워
  alarm: '/story/bg/alarm.png', // 경보
  alley: '/story/bg/alley.png', // 뒷골목
  vault: '/story/bg/vault.png', // 지하 금고·데이터 센터
  port: '/story/bg/port.png', // 항만
  seraph: '/story/bg/seraph.png', // 세라프 연구소
  neon: '/story/bg/neon.png', // 네온 거리 (엔딩)
}

// 등장인물 이름별 초상화
export const STORY_PORTRAIT_IMAGES = {
  리코: '/story/portraits/riko.png',
  미라: '/story/portraits/mira.png',
  카이: '/story/portraits/kai.png',
  에이다: '/story/portraits/ada.png',
  벡스: '/story/portraits/vex.png',
}

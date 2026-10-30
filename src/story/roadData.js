// 항로 0417 · 시즌 1: 변방 항로 → 중앙 항성 카르타 → 금지된 행성
// 장면 형식은 아르케 넷과 같다. 장면 = { bg, lines, choices?, next?, effect?, ending? }
// 선택지 = { text, next, effect?, req?, check? }
//   effect: 숫자는 스탯에 더하고, set 키는 플래그를 켠다
//   req:    숫자면 "그 스탯 이상", true면 "그 플래그가 켜져 있어야 함"
//   check:  스탯 판정 { stat, min, pass, fail }

const START_STATS = { bond: 0, rank: 0, intel: 0, nerve: 1 }
const STAT_NAMES = { bond: '정비사 유대', rank: '함대 신임', intel: '정보력', nerve: '침착함' }

const CODEX = [
  { id: 'route', title: '항로 0417', unlock: 'heard_0417', text: '지도에 없는 항로 번호. 신호는 같은 문장을 반복한다. "기억을 돌려줘."' },
  { id: 'gap', title: '기억 공백', unlock: 'log_gap', text: '승무원들의 기억이 몇 시간씩 빠진다. 정거장 기록에도 같은 시간대가 통째로 비어 있다.' },
  { id: 'nova', title: '노을의 정보', unlock: 'nova_info', text: '밀수업자 노을이 넘긴 정보. 지워진 행성의 좌표 일부가 들어 있다.' },
  { id: 'harin', title: '백하린의 실험', unlock: 'harin_past', text: '백하린은 0417 실험의 보조 연구원이었다. 실험은 기억을 옮겨 보관하는 것이었다.' },
  { id: 'self', title: '실험 명단', unlock: 'self_in_lab', text: '연구실 명단에 주인공의 이름이 있다. 보관된 기억의 주인으로 적혀 있다.' },
  { id: 'seal', title: '봉인 코드', unlock: 'seal_code', text: '카르타 본부 금고를 여는 코드. 봉인된 항로 정보가 들어 있다.' },
  { id: 'orders', title: '함장의 명령', unlock: 'captain_doubt', text: '오정욱 함장은 본부의 명령을 받고 있다. 명령서에는 "0417은 봉인, 캐는 자는 제거"라고 적혀 있다.' },
  { id: 'lost', title: '사라진 기억', unlock: 'lost_memory', text: '보관소에서 기억 일부가 지워졌다. 무엇이었는지는 떠오르지 않는다.' },
  { id: 'archive', title: '지워진 행성의 기억', unlock: 'archive_truth', text: '행성 보관소는 모든 주민의 기억을 저장하고 있었다. 누군가 이 기억을 계속 옮기고 있다.' },
  { id: 'chip', title: '신호 칩', unlock: 'chip_signal', text: '행성 표면에서 잡힌 신호. 칩 하나가 한 사람의 기억 수백 시간을 담는다.' },
]

const SCENES = {
  // ───────── 1장: 변방 항로 (정거장 새벽 7호) ─────────
  intro: {
    bg: 'station',
    lines: [
      { who: '', text: '항로 관리 정거장 「새벽 7호」. 밤 교대가 끝나갈 무렵, 관제 화면에 지도에 없는 번호가 떴다.' },
      { who: '시스템', text: '[수신] 항로 0417 · 신호 강도 불명 · 반복 송출 중' },
      { who: '나', text: '항로 번호는 1부터 999까지인데. 0417은 어디서 온 거지.' },
    ],
    next: 'bridge',
  },
  bridge: {
    bg: 'station',
    lines: [
      { who: '도하', text: '신호가 같은 문장을 되풀이해. "기억을 돌려줘."' },
      { who: '도하', text: '단순한 오류일 수도 있고, 누가 장난치는 걸 수도 있어. 어떻게 할래?' },
    ],
    choices: [
      { text: '신호를 직접 분석해 본다', next: 'station_check', effect: { intel: 1, set: 'heard_0417' } },
      { text: '함장에게 바로 보고한다', next: 'station_check', effect: { rank: 1, set: 'captain_ordered' } },
      { text: '일단 무시하고 교대를 마친다', next: 'station_check', effect: { bond: 1, set: 'dohas_secret' } },
    ],
  },
  station_check: {
    bg: 'station',
    lines: [
      { who: '', text: '정거장 정비 구역에서 경고음이 울린다. 승무원 선우가 조종석 앞에 멍하니 앉아 있다.' },
      { who: '선우', text: '...내가 왜 여기 있지? 아까 교대 인수인계는 분명히 했는데, 그 뒤가 기억이 안 나.' },
    ],
    effect: { nerve: 1 },
    next: 'dohas_talk',
  },
  dohas_talk: {
    bg: 'station',
    lines: [
      { who: '도하', text: '나 엔진실에서 자랐어. 기계가 멈추는 소리는 들으면 안다. 근데 선우 쪽은 기계가 아니라 사람이 멈춘 것 같아.' },
      { who: '도하', text: '내가 같이 있을게. 혼자 두면 위험해.' },
    ],
    effect: { bond: 1 },
    next: 'crew_gap',
  },
  crew_gap: {
    bg: 'station',
    lines: [
      { who: '', text: '선우의 빠진 세 시간이 정거장 기록에서도 비어 있다. 같은 시간대에 다른 승무원 둘도 기록이 없다.' },
    ],
    choices: [
      { text: '정거장 기록실로 가서 로그를 확인한다', next: 'archive', effect: { intel: 1 } },
      { text: '항구로 가서 밀수선 정보를 알아본다', next: 'docking' },
    ],
  },
  archive: {
    bg: 'station',
    lines: [
      { who: '', text: '기록실 단말기에 빈칸이 줄줄이 이어진다. 빈칸 사이에 단 한 줄의 주석이 남아 있다.' },
      { who: '주석', text: '"기억은 잠깐 빌려 갈 뿐이다. 0417에 돌려준다."' },
    ],
    effect: { set: 'log_gap' },
    next: 'ch1_end',
  },
  docking: {
    bg: 'space',
    lines: [
      { who: '노을', text: '밀수선 「사흘」의 선장 노을이야. 항로 0417 얘기를 꺼내는 사람은 드물지.' },
      { who: '노을', text: '지워진 행성의 좌표 일부가 있어. 값은 비싸. 그래도 살래?' },
    ],
    choices: [
      { text: '좌표 일부를 산다', next: 'ch1_end', effect: { intel: 1, set: 'nova_info' } },
      { text: '거절하고 정거장으로 돌아간다', next: 'ch1_end' },
    ],
  },
  ch1_end: {
    bg: 'station',
    lines: [
      { who: '', text: '[1장 · 변방 항로] 선우는 기억을 조금씩 되찾았지만, 빈 시간의 끝에 누군가 남긴 좌표가 있었다.' },
      { who: '오정욱', text: '본부에서 호출이 왔다. 중앙 항성 카르타로 간다. 항로 0417은 입 밖에 내지 마.' },
    ],
    next: 'ch2_start',
  },

  // ───────── 2장: 중앙 항성 카르타 ─────────
  ch2_start: {
    bg: 'city',
    lines: [
      { who: '', text: '[2장 · 중앙 항성 카르타] 빛나는 고층 도시. 시민들은 기억 보험을 광고하는 전광판 아래를 웃으며 지나간다.' },
      { who: '나', text: '여긴 기억을 파는 것도 합법이라더니, 사람들 얼굴이 다 똑같이 평온하네.' },
    ],
    choices: [
      { text: '연구원 백하린을 찾아간다', next: 'harin_talk' },
      { text: '도시 구역을 둘러본다', next: 'district_tour' },
      { text: '함장 오정욱의 집무실로 간다', next: 'captain_office' },
    ],
  },
  district_tour: {
    bg: 'city',
    lines: [
      { who: '도하', text: '저 광고 봐. "오늘의 기억을 내일로 넘기세요." 기억을 저장해서 파는 거야.' },
      { who: '', text: '골목 끝에서 노을이 손을 흔든다. 시장 쪽이다.' },
    ],
    next: 'city_market',
  },
  harin_talk: {
    bg: 'city',
    lines: [
      { who: '백하린', text: '항로 0417? 그 이름을 여기서 꺼내면 안 돼요. 도청 장치가 깔려 있거든요.' },
      { who: '백하린', text: '저는 예전에 기억 보관 실험에 참여했어요. 지금은 그게 사고였다고 말하지만요.' },
    ],
    choices: [
      { text: '실험의 내용을 더 캐묻는다', next: 'lab_reveal', effect: { intel: 1, set: 'harin_past' } },
      { text: '그녀의 말이 거짓말 같다고 몰아붙인다', next: 'city_market', effect: { set: 'harin_lie', bond: -1 } },
    ],
  },
  lab_reveal: {
    bg: 'city',
    lines: [
      { who: '', text: '백하린이 건네준 낡은 파일에 실험 피험자 명단이 있다. 한 줄에 주인공의 이름이 적혀 있다.' },
      { who: '백하린', text: '당신도 보관된 기억의 주인이에요. 그래서 0417 신호가 당신을 부르는 거예요.' },
    ],
    effect: { intel: 1, set: 'self_in_lab' },
    next: 'vault_plan',
  },
  city_market: {
    bg: 'city',
    lines: [
      { who: '노을', text: '카르타 본부 금고 봉인 코드가 있어. 여기 시장 말고는 어디서도 못 구해.' },
    ],
    choices: [
      { text: '코드를 산다', next: 'vault_plan', effect: { intel: 1, set: 'seal_code' } },
      { text: '값이 너무 비싸서 그냥 간다', next: 'vault_plan' },
    ],
  },
  captain_office: {
    bg: 'city',
    lines: [
      { who: '오정욱', text: '본부 명령이다. 0417은 봉인이고, 캐는 자는 제거 대상이다.' },
      { who: '오정욱', text: '하지만 나도 승무원을 잃고 싶지 않아. 그러니 이건 충고다.' },
    ],
    choices: [
      { text: '명령에 따른다', next: 'vault_plan', effect: { rank: 2, set: 'captain_loyal' } },
      { text: '명령서의 진짜 의도를 묻는다', next: 'captain_reveal', effect: { set: 'captain_doubt' } },
    ],
  },
  captain_reveal: {
    bg: 'city',
    lines: [
      { who: '오정욱', text: '의도? 본부는 기억을 팔아 돈을 벌고, 우리는 그걸 지키는 보초일 뿐이야.' },
      { who: '오정욱', text: '금고에 있는 게 0417의 원본 좌표다. 그걸 가져오면 너도 나도 끝이다.' },
    ],
    next: 'vault_plan',
  },
  vault_plan: {
    bg: 'city',
    lines: [
      { who: '도하', text: '금고는 셋 중 하나로 열어야 해. 해킹, 강행, 아니면 함장의 출입 권한.' },
    ],
    choices: [
      { text: '조용히 해킹으로 들어간다 (정보력 필요)', check: { stat: 'intel', min: 2, pass: 'vault_in', fail: 'vault_alarm' } },
      { text: '정면으로 강행한다', next: 'vault_alarm', effect: { nerve: -1 } },
      { text: '함장의 출입 권한을 쓴다 (함대 신임 필요)', next: 'vault_in', req: { captain_loyal: true } },
    ],
  },
  vault_alarm: {
    bg: 'city',
    lines: [
      { who: '', text: '금고 경보가 울리고 본부 경비병이 쏟아진다. 도하가 몸으로 문을 막아 나를 빼냈다.' },
      { who: '도하', text: '괜찮아? 다음부터는 같이 들어가자. 혼자 가면 너까지 잃어.' },
    ],
    effect: { bond: 2, set: 'dohas_saved' },
    next: 'city_escape',
  },
  vault_in: {
    bg: 'city',
    lines: [
      { who: '', text: '금고 안에는 0417 항로의 원본 명령서가 있다. 명령서 끝에는 손으로 쓴 글씨가 있다. "나는 기억을 옮긴다. 돌려주기 위해."' },
    ],
    effect: { intel: 1, set: 'route_0417' },
    next: 'city_escape',
  },
  city_escape: {
    bg: 'city',
    lines: [
      { who: '', text: '경보를 피해 항구까지 달려갔다. 뒤에서 본부 추격선이 신호를 쏜다.' },
      { who: '노을', text: '여기서 빠져야 해. 우리 밀수선 「사흘」이 대기 중이야.' },
    ],
    next: 'ch2_end',
  },
  ch2_end: {
    bg: 'city',
    lines: [
      { who: '', text: '[2장 · 중앙 항성 카르타] 본부는 우리를 쫓고 있다. 금지된 행성 좌표가 손에 쥐어졌다.' },
    ],
    next: 'ch3_start',
  },

  // ───────── 3장: 금지된 행성 (0417) ─────────
  ch3_start: {
    bg: 'space',
    lines: [
      { who: '', text: '[3장 · 금지된 행성] 지도에서 지워진 행성 「에르고」. 궤도에 올라서자 행성 표면에 무너진 도시가 보인다.' },
      { who: '노을', text: '에르고 착륙은 본부 기록에도 없어. 여기서 죽으면 아무도 몰라.' },
    ],
    choices: [
      { text: '표면을 먼저 스캔한다', next: 'scan' },
      { text: '바로 폐허로 내려간다', next: 'ruin_walk' },
    ],
  },
  scan: {
    bg: 'space',
    lines: [
      { who: '', text: '스캔 결과 표면 아래에 신호 칩 수백 개가 줄지어 있다. 칩마다 이름이 달려 있다.' },
    ],
    effect: { intel: 1, set: 'chip_signal' },
    next: 'ruin_walk',
  },
  ruin_walk: {
    bg: 'ruins',
    lines: [
      { who: '도하', text: '건물들이 한꺼번에 멈춘 것 같아. 식탁에 음식이 그대로 있어. 사람만 사라졌어.' },
      { who: '선우', text: '...여기, 여기 본 적 있어. 내가 잃은 세 시간이 이 도시 안에 있는 것 같아.' },
    ],
    next: 'ruins',
  },
  ruins: {
    bg: 'ruins',
    lines: [
      { who: '', text: '도시 중심 탑 입구에 기억 보관소 문이 있다. 문 옆 패널이 주인공의 손바닥을 기다린다.' },
    ],
    choices: [
      { text: '보관소 문을 연다 (침착함 필요)', check: { stat: 'nerve', min: 2, pass: 'archive_open', fail: 'archive_fail' } },
      { text: '신호를 따라 지하로 내려간다', next: 'signal_core' },
    ],
  },
  archive_open: {
    bg: 'ruins',
    lines: [
      { who: '', text: '보관소 안에 사람들의 기억이 유리관마다 담겨 있다. 가장 큰 관에 적힌 이름은 주인공의 것이다.' },
      { who: '', text: '관 옆 기록에는 이렇게 적혀 있다. "이 기억은 일시 보관. 원래 주인에게 되돌려질 것."' },
    ],
    effect: { intel: 2, set: 'archive_truth' },
    next: 'echo_lab',
  },
  archive_fail: {
    bg: 'ruins',
    lines: [
      { who: '', text: '문이 열리는 순간 머리 안에서 빛이 터졌다. 기억 한 조각이 빠져나가는 느낌만 남는다.' },
      { who: '도하', text: '괜찮아? 뭐가 사라졌는지 기억나?' },
    ],
    effect: { nerve: -1, set: 'lost_memory' },
    next: 'signal_core',
  },
  echo_lab: {
    bg: 'ruins',
    lines: [
      { who: '백하린', text: '(통신 잡음 속에서) 그 보관소는 실험의 원본이에요. 기억을 옮기는 도중에 주인이 사라지면, 그 기억은 여기서 떠돌아요.' },
    ],
    next: 'signal_core',
  },
  signal_core: {
    bg: 'space',
    lines: [
      { who: '', text: '지하 깊숙한 곳에 신호의 심장이 있다. 빛이 맥박처럼 뛰고, 그 빛 안에서 수많은 목소리가 들린다.' },
      { who: '', text: '「기억을 돌려줘.」' },
    ],
    choices: [
      { text: '심장을 파괴해서 신호를 끊는다', next: 'end_seal' },
      { text: '기억을 본부로 올려 보낸다 (함대 신임 필요)', next: 'upload_scene' },
      { text: '심장에 귀를 기울여 진실을 듣는다 (정보력 필요)', check: { stat: 'intel', min: 4, pass: 'core_truth', fail: 'core_partial' } },
    ],
  },
  upload_scene: {
    bg: 'space',
    lines: [
      { who: '오정욱', text: '기억을 본부로 올리면 기억을 팔 수 있다. 돈도, 권력도 손에 들어와.' },
    ],
    choices: [
      { text: '기억을 올려 보내고 본부와 거래한다', next: 'end_trade', req: { rank: 2 } },
      { text: '올리지 않고 신호를 그대로 둔다', next: 'end_hold' },
    ],
  },
  core_truth: {
    bg: 'space',
    lines: [
      { who: '', text: '목소리가 하나로 모인다. 항로 0417은 기억을 잠시 빌려 보관하는 장치였고, 주인이 돌아오지 않는 기억만 여기 남았다.' },
      { who: '', text: '그리고 마지막 목소리가 말한다. "돌려줄 주인은 당신이다."' },
    ],
    next: 'end_truth',
  },
  core_partial: {
    bg: 'space',
    lines: [
      { who: '', text: '목소리는 흐리게 흩어진다. 뭔가 중요한 말이 들린 것 같은데, 이해하기엔 아직 정보가 부족하다.' },
    ],
    next: 'end_hold',
  },
  end_seal: {
    bg: 'space',
    ending: '봉인 · 0417은 잠들다',
    lines: [
      { who: '', text: '심장이 부서지자 신호가 끊기고, 행성의 빛이 꺼졌다. 기억 공백도 더 이상 생기지 않는다.' },
      { who: '도하', text: '끝난 거야? 이제 집에 가자.' },
      { who: '', text: '새벽 7호로 돌아가는 길, 나는 아직 돌려받지 못한 기억 하나가 궁금하다.' },
    ],
  },
  end_trade: {
    bg: 'space',
    ending: '거래 · 팔린 항로',
    lines: [
      { who: '오정욱', text: '좋아. 기억은 본부가 맡지. 이제 너는 항로의 주인이다.' },
      { who: '', text: '보상은 많았다. 하지만 정거장 기록에서 몇몇 승무원의 이름이 조금씩 지워지고 있다.' },
      { who: '도하', text: '...너, 우리를 팔았구나.' },
    ],
  },
  end_truth: {
    bg: 'space',
    ending: '진실 · 항로의 끝',
    lines: [
      { who: '', text: '기억 하나하나가 주인에게 돌아간다. 정거장에서 선우가 눈을 뜨고, 도하가 웃는다.' },
      { who: '선우', text: '꿈에서 본 빛이 있었어. 누군가 나를 기다리고 있었나 봐.' },
      { who: '', text: '그날 밤, 관제 화면에 0417이 떴다. 이번에는 "고마워"라고 쓰여 있었다.' },
    ],
  },
  end_hold: {
    bg: 'space',
    ending: '미완 · 다음 항로',
    lines: [
      { who: '', text: '신호는 살아 있고, 기억은 그대로 떠돈다. 진실의 일부만 손에 쥔 채 우리는 정거장으로 돌아간다.' },
      { who: '오정욱', text: '본부가 곧 다른 항로를 열 거다. 다음 시즌에서 보자.' },
      { who: '', text: '[미완] 항로 0417은 시즌 2에서 이어진다.' },
    ],
  },
}

// 항로 0417 설정: StoryGame의 game prop으로 넘긴다. 그림 없이 글자와 배경 색으로만 진행
export const ROAD_GAME = {
  title: '항로 0417',
  saveKey: 'road.save',
  music: 'neon',
  start: 'intro',
  startStats: START_STATS,
  statNames: STAT_NAMES,
  scenes: SCENES,
  codex: CODEX,
  origins: [],
  images: {},
  portraits: null,
  art: false,
  theme: 'road-theme',
}

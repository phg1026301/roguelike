// 아르케 넷 0417: 가상현실 MMO에 갇힌 플레이어들의 미스터리 선택형 이야기 (전체 6장, 엔딩 4종)
// 네온 시티와 같은 장면 형식을 쓴다. 장면 = { bg, lines, choices?, next?, effect?, ending? }
// 선택지 = { text, next, effect?, req?, check? }
//   effect: 숫자는 스탯에 더하고, set 키는 플래그를 켠다
//   req:    숫자면 "그 스탯 이상", true면 "그 플래그가 켜져 있어야 함"
//   check:  스탯 판정으로 갈리는 분기 { stat, min, pass, fail }

const START_STATS = { trust: 0, ops: 0, players: 0, insight: 0, skill: 1 }
const STAT_NAMES = { trust: '세라 신뢰', ops: '운영사 호감', players: '플레이어 연합', insight: '진실 통찰', skill: '전투 실력' }

const CODEX = [
  { id: 'date', title: '0417이라는 날짜', unlock: 'heard_0417', text: '점검이 시작된 날이자, 10년 전 봉인이 있었던 날. 이 세계에서 0417은 숫자가 아니라 경고다.' },
  { id: 'session', title: '세션 0417-A', unlock: 'saw_session_log', text: '모든 플레이어가 하나의 세션에 묶여 있다. 종료 불가 상태에서는 복구 기록도 남지 않는다.' },
  { id: 'gray', title: '회색 구역', unlock: 'known_gray', text: '10년 전 봉인된 지역. 들어간 사람은 이름을 잃는다. 그곳 단말기에는 보존 대상 목록이 남아 있다.' },
  { id: 'voice', title: '정체 모를 목소리', unlock: 'heard_voice', text: '쓰러졌을 때 들린 「0417은 아직 끝나지 않았어」라는 목소리. 주인은 아직 확인되지 않았다.' },
  { id: 'origin', title: '원본과 복제', unlock: 'self_original', text: '이 세계에는 원본 의식과 복제본이 함께 존재한다. 원본이 로그아웃하면 복제본은 소멸한다.' },
  { id: 'sera', title: '세라의 정체', unlock: 'sera_copy', text: '세라는 원본 의식의 활성 복제본이다. 그녀가 웃고 싸운 기억은 가짜가 아니지만, 그녀는 원본이 아니다.' },
  { id: 'ops', title: '루멘 인터랙티브', unlock: 'yuna_info', text: '운영사. 설계자는 따로 있고, 운영팀은 장비만 맡은 외주로 드러났다.' },
  { id: 'mother', title: '서연 박사', unlock: 'mother_known', text: '프로젝트 0417의 설계자. 의식을 지키려 했던 어머니이자, 10년 전 사고의 원인으로 지목된다.' },
  { id: 'mother_log', title: '마지막 음성 로그', unlock: 'mother_log', text: '「너를 두 번 잃고 싶지 않았어.」 그녀가 남긴 마지막 말이다.' },
  { id: 'key', title: '0417 키', unlock: 'key_in_memory', text: '키는 원본 기억의 가장 깊은 층에 봉인되어 있다. 해석하려면 충분한 통찰이 필요하다.' },
]

const SCENES = {
  // ───────── 1장: 로그아웃 불가 ─────────
  intro: {
    bg: 'town',
    lines: [
      { who: '', text: '2061년 4월 17일 00:00. 가상현실 MMO 「아르케 넷」에 긴급 점검 공지가 떴다.' },
      { who: '시스템', text: '[공지] 서버 안정화 작업으로 로그아웃 기능이 일시 중지됩니다. 작업 완료 시 자동 복귀됩니다.' },
      { who: '', text: '메뉴를 열어 보지만 「로그아웃」 버튼은 회색으로 잠겨 있다. 그날 밤, 수천 명의 플레이어가 함께 갇혔다.' },
    ],
    next: 'town_square',
  },
  town_square: {
    bg: 'town',
    lines: [
      { who: '', text: '아틀라 마을 광장. NPC들은 평소처럼 웃고 떠들지만, 다들 같은 말을 되풀이한다.' },
      { who: '세라', text: '너도 못 나갔구나. 난 길드 전사 세라. 이 마을에서 제일 먼저 깬 사람이야.' },
      { who: '세라', text: '근데 이상한 건, 어떤 NPC가 "0417이 돌아왔다"고 중얼거렸어.' },
    ],
    choices: [
      { text: '무슨 일인지 세라에게 자세히 묻는다', next: 'sera_talk', effect: { trust: 1 } },
      { text: '점검 공지와 시스템 메뉴를 다시 살펴본다', next: 'system_log', effect: { insight: 1, set: 'heard_0417' } },
      { text: '일단 사냥터로 가서 몸을 푼다', next: 'field_start', effect: { skill: 1 } },
    ],
  },
  sera_talk: {
    bg: 'town',
    lines: [
      { who: '세라', text: '나도 전부 아는 건 아니야. 점검 날 밤 로그를 보니 우리 접속 기록이 "세션 0417-A"로 묶여 있었어.' },
      { who: '세라', text: '다른 사람 기록은 아무도 못 봐. 장로 바르도라면 뭔가 알지도 몰라.' },
    ],
    next: 'elder_hint',
  },
  system_log: {
    bg: 'town',
    lines: [
      { who: '시스템', text: '[접속 로그] 세션 ID 0417-A · 상태: 종료 불가 · 복구 가능 기록: 없음' },
      { who: '', text: '기록 아래 누군가 남긴 짧은 주석이 보인다. "다시는 같은 날짜를 쓰지 말 것."' },
    ],
    effect: { set: 'saw_session_log', insight: 1 },
    next: 'elder_hint',
  },
  elder_hint: {
    bg: 'town',
    lines: [
      { who: '바르도', text: '0417이라... 그 날짜를 입에 올리는 건 오랜만이군.' },
      { who: '바르도', text: '이 마을을 세운 건 10년 전이야. 그때도 한 번 봉쇄된 날이 있었지.' },
    ],
    choices: [
      { text: '10년 전에 무슨 일이 있었는지 묻는다', next: 'elder_past', effect: { insight: 1, set: 'heard_10y' } },
      { text: '그냥 사냥터 길만 알려 달라고 한다', next: 'field_start' },
    ],
  },
  elder_past: {
    bg: 'town',
    lines: [
      { who: '바르도', text: '그땐 한 구역을 통째로 봉인했어. 지도에서 지운 자리야. 회색 구역이라 부르지.' },
      { who: '바르도', text: '거기 들어갔다 돌아온 사람은 자기 이름을 잊었다더군. 그 뒤로 아무도 가지 않아.' },
    ],
    effect: { set: 'known_gray' },
    next: 'field_start',
  },
  field_start: {
    bg: 'field',
    lines: [
      { who: '', text: '초원에는 슬라임이 흩어져 있고, 저 멀리 지도에 없는 회색 표지판이 서 있다.' },
      { who: '세라', text: '저 표지판은 몇 주 전부터 있었어. 아무도 가까이 안 가지.' },
    ],
    choices: [
      { text: '가까운 슬라임 무리를 상대한다', check: { stat: 'skill', min: 2, pass: 'field_win', fail: 'field_lose' } },
      { text: '회색 표지판 쪽으로 가 본다', next: 'gray_enter', effect: { insight: 1 } },
      { text: '마을로 돌아가 세라와 상의한다', next: 'town_square' },
    ],
  },
  field_win: {
    bg: 'field',
    lines: [
      { who: '', text: '검을 휘두르자 슬라임들이 튀어 흩어진다. 세라가 웃으며 손뼉을 친다.' },
      { who: '세라', text: '좋아, 실력은 충분해. 동료로 인정할게.' },
    ],
    effect: { skill: 1, players: 1 },
    next: 'field_mid',
  },
  field_lose: {
    bg: 'field',
    lines: [
      { who: '', text: '슬라임 무리에 밀려 쓰러졌다. 화면이 암전되고, 어디선가 낯선 목소리가 들린다.' },
      { who: '???', text: '0417은 아직 끝나지 않았어.' },
      { who: '세라', text: '정신 차려! 여기서는 죽어도 다시 일어나. 대신 이상한 기억이 남지.' },
    ],
    effect: { trust: 1, insight: 1, set: 'heard_voice' },
    next: 'field_mid',
  },
  field_mid: {
    bg: 'field',
    lines: [
      { who: '세라', text: '이 필드엔 다른 플레이어들도 있어. 다들 로그아웃 방법을 찾고 있지.' },
      { who: '세라', text: '운영사 게시판에도, 플레이어 모임에도 정보가 있을 거야. 어디로 가 볼래?' },
    ],
    choices: [
      { text: '운영사 공지 게시판을 본다', next: 'ch1_end', effect: { ops: 1 } },
      { text: '플레이어 모임에 참가한다', next: 'ch1_end', effect: { players: 2 } },
      { text: '로그를 직접 파헤친다', next: 'ch1_end', effect: { insight: 2 } },
    ],
  },
  ch1_end: {
    bg: 'town',
    lines: [
      { who: '', text: '[1장 · 로그아웃 불가] 점검은 끝나지 않았다. 공지에는 "작업 중"이라는 문구만 그대로다.' },
      { who: '세라', text: '마을에서 제일 가까운 회색 구역에 답이 있을지도 몰라.' },
    ],
    next: 'gray_enter',
  },

  // ───────── 2장: 회색 구역 ─────────
  gray_enter: {
    bg: 'cave',
    lines: [
      { who: '', text: '회색 표지판을 지나자 색이 빠진 세계가 펼쳐진다. 나무도 바위도 윤곽만 남아 있다.' },
      { who: '세라', text: '여긴 로드에 실패한 지역이야. 들어가면 이름이 흐려진다는 소문, 진짜일까.' },
    ],
    choices: [
      { text: '안으로 들어간다', next: 'gray_inside' },
      { text: '세라를 설득해 입구에서 멈춘다', next: 'sera_stop', effect: { trust: 1 } },
    ],
  },
  sera_stop: {
    bg: 'cave',
    lines: [
      { who: '세라', text: '가지 마. 내 이름이 자꾸 흐려지는 게 느껴져. 여기 있으면 나도 사라질지 몰라.' },
      { who: '', text: '세라의 손끝이 희미하게 떨린다. 윤곽이 잠깐 깜박였다.' },
    ],
    choices: [
      { text: '알겠어. 조심해서 확인만 할게', next: 'gray_inside', effect: { trust: 1 } },
      { text: '그래도 들어가야 해. 내가 확인할게', next: 'gray_inside', effect: { trust: -1 } },
    ],
  },
  gray_inside: {
    bg: 'cave',
    lines: [
      { who: '', text: '회색 구역 깊은 곳. 금 간 석벽 사이로 푸른 빛이 맥박처럼 흐른다.' },
      { who: '시스템', text: '[경고] 관리 골렘 #7이 구역 침입자를 감지했습니다.' },
      { who: '', text: '바위 덩어리가 일어나 골렘의 형체를 이룬다. 가슴 중앙의 푸른 핵이 빛난다.' },
    ],
    choices: [
      { text: '관리 골렘에 맞서 싸운다', check: { stat: 'skill', min: 3, pass: 'boss_win', fail: 'boss_lose' } },
      { text: '몰래 지나가 본다 (통찰 필요)', check: { stat: 'insight', min: 2, pass: 'archive', fail: 'boss_lose' } },
    ],
  },
  boss_win: {
    bg: 'cave',
    lines: [
      { who: '', text: '검이 핵을 가르자 골렘이 흙더미로 무너진다. 무너진 자리에 낡은 단말기가 남아 있다.' },
      { who: '세라', text: '해냈어! 그런데... 저 단말기에 우리 이름이 떠 있는데?' },
    ],
    effect: { skill: 1, insight: 1, set: 'defeated_guard' },
    next: 'archive',
  },
  boss_lose: {
    bg: 'cave',
    lines: [
      { who: '', text: '골렘의 주먹이 쏟아진다. 세라가 몸을 던져 대신 맞았다. 그녀의 윤곽이 크게 흐려진다.' },
      { who: '세라', text: '괜찮아... 기록은 볼 수 있을 거야. 어서.' },
    ],
    effect: { trust: 2, set: 'sera_hurt' },
    next: 'archive',
  },
  archive: {
    bg: 'cave',
    lines: [
      { who: '', text: '구역 중심의 단말기에 오래된 보존 목록이 떠 있다. 「보존 대상」. 수천 개의 이름, 대부분은 회색이다.' },
      { who: '', text: '그중 두 개의 이름만 또렷하다.' },
    ],
    choices: [
      { text: '내 이름이 있는지 찾아본다', next: 'self_find', effect: { insight: 1 } },
      { text: '세라의 이름부터 찾아본다', next: 'sera_find', effect: { insight: 1 } },
      { text: '목록을 닫고 밖으로 나간다', next: 'ch2_end' },
    ],
  },
  self_find: {
    bg: 'cave',
    lines: [
      { who: '', text: '내 이름: 「보존 대상 #0417-원본」. 상태: 원본 신체와 연결 중. 의식 복제본 1개 활성.' },
      { who: '', text: '나는 분명 여기 있는데, 원본은 어디에 있는 걸까.' },
    ],
    effect: { set: 'self_original', insight: 1 },
    next: 'sera_find',
  },
  sera_find: {
    bg: 'cave',
    lines: [
      { who: '', text: '세라의 이름: 「보존 대상 #0417-복제 (활성)」. 원본 의식의 복제본. 원본이 종료되면 함께 소멸.' },
      { who: '세라', text: '...그래. 알고 있었어. 가끔 내가 누군지 모르겠었거든.' },
    ],
    effect: { set: 'sera_copy', insight: 1 },
    next: 'ch2_end',
  },
  ch2_end: {
    bg: 'cave',
    lines: [
      { who: '', text: '[2장 · 회색 구역] 밖으로 나오자 세계에 색이 조금 돌아왔다. 하지만 세라의 얼굴은 여전히 어둡다.' },
      { who: '세라', text: '원본이 누군지, 복제가 누군지보다 중요한 건, 이걸 누가 어떻게 만들었느냐야.' },
    ],
    next: 'ch3_start',
  },

  // ───────── 3장: 운영사 루멘 ─────────
  ch3_start: {
    bg: 'tower',
    lines: [
      { who: '', text: '[3장 · 운영사 루멘] 마을 북쪽 타워가 구름 위로 솟아 있다. 꼭대기에 「아르케 넷」 운영 본부가 있다.' },
      { who: '시온', text: '어서 와요. 루멘 인터랙티브 운영팀 시온입니다. 로그아웃 복구를 도우러 왔어요.' },
      { who: '시온', text: '다만 조건이 하나 있어요. 0417 키를 찾아야 복구가 가능합니다.' },
    ],
    choices: [
      { text: '운영사와 손잡고 키를 찾는다', next: 'ops_deal', effect: { ops: 1 } },
      { text: '플레이어 연합과 함께 움직인다', next: 'players_plan', effect: { players: 1 } },
      { text: '타워 로그에 직접 잠입한다 (통찰 필요)', check: { stat: 'insight', min: 2, pass: 'hack_tower', fail: 'hack_fail' } },
    ],
  },
  ops_deal: {
    bg: 'tower',
    lines: [
      { who: '시온', text: '좋아요. 대신 당신의 기억 한 조각을 저희에게 맡겨 주세요. 키는 그 안에 있으니까요.' },
      { who: '시온', text: '맡긴 기억은 복구 후 돌려 드립니다. 아마도요.' },
    ],
    choices: [
      { text: '기억을 맡긴다', next: 'ch3_mid', effect: { ops: 2, trust: -1, set: 'gave_memory' } },
      { text: '거절하고 연합에 합류한다', next: 'players_plan', effect: { players: 1 } },
    ],
  },
  players_plan: {
    bg: 'tower',
    lines: [
      { who: '미르', text: '플레이어 연합의 미르예요. 운영사가 우릴 가둔 쪽이에요. 같이 타워 데이터를 까발리죠.' },
      { who: '세라', text: '좋아. 그런데 타워 안으로는 우리가 들어가야 해. 누가 길을 열어 줘야지.' },
    ],
    choices: [
      { text: '연합의 작전에 따른다', next: 'ch3_mid', effect: { players: 2 } },
      { text: '혼자 움직이겠다', next: 'ch3_mid', effect: { insight: 1 } },
    ],
  },
  hack_tower: {
    bg: 'tower',
    lines: [
      { who: '', text: '로그 파편을 해독하자 화면에 짧은 문장이 떠오른다.' },
      { who: '', text: '「0417 키: 원본 기억의 가장 깊은 층에 봉인됨」' },
    ],
    effect: { insight: 2, set: 'key_in_memory' },
    next: 'ch3_mid',
  },
  hack_fail: {
    bg: 'tower',
    lines: [
      { who: '', text: '경보가 울리고 보안 드론이 쏟아진다. 세라가 엄호하며 간신히 빠져나왔다.' },
    ],
    effect: { players: -1, trust: 1 },
    next: 'ch3_mid',
  },
  ch3_mid: {
    bg: 'tower',
    lines: [
      { who: '유나', text: '어머, 여기까지 오셨네요. 저는 상인 유나예요. 타워 내부 지도와 운영팀 메모를 팔아요.' },
      { who: '유나', text: '공짜는 아니에요. 지금 필요한 정보일 거예요.' },
    ],
    choices: [
      { text: '정보를 산다', next: 'yuna_info', effect: { insight: 1 } },
      { text: '필요 없다. 그냥 간다', next: 'ch3_end' },
    ],
  },
  yuna_info: {
    bg: 'tower',
    lines: [
      { who: '유나', text: '운영팀 메모예요. "프로젝트 0417, 설계자 서연. 운영사는 간판일 뿐. 장비 관리는 외주."' },
      { who: '유나', text: '서연... 이름만 적혀 있어요. 아는 사람이라면 얼굴이 굳을걸요?' },
    ],
    effect: { set: 'yuna_info' },
    next: 'ch3_end',
  },
  ch3_end: {
    bg: 'tower',
    lines: [
      { who: '시온', text: '키를 찾을 때까지 한 가지만 기억해 두세요. 기억은 가장 깊은 곳에 있어요.' },
      { who: '', text: '시온이 돌아서는 순간, 그녀의 눈이 잠깐 분홍색으로 번쩍였다.' },
    ],
    next: 'ch4_start',
  },

  // ───────── 4장: 흑막 ─────────
  ch4_start: {
    bg: 'tower',
    lines: [
      { who: '', text: '[4장 · 흑막] 타워 지하 연구실. 유리관마다 누군가의 기억 칩이 잠들어 있다.' },
      { who: '에이든', text: '오래 기다렸어. 나는 에이든. 10년 전 프로젝트 0417의 연구원이야.' },
      { who: '에이든', text: '네 어머니가 만든 백업 시스템이 이 세계를 가두고 있어.' },
    ],
    choices: [
      { text: '어머니라니, 무슨 소리야?', next: 'mother_truth', effect: { insight: 1, set: 'mother_known' } },
      { text: '지금 당장 키를 찾겠다', next: 'ch4_mid' },
    ],
  },
  mother_truth: {
    bg: 'tower',
    lines: [
      { who: '에이든', text: '서연 박사. 그녀는 사람의 의식을 잃지 않으려고 이 실험을 시작했어. 그리고 10년 전 0417에 사고를 냈지.' },
      { who: '에이든', text: '사고 뒤 구역을 봉인하고 기록은 운영사가 덮었어. 지금의 로그아웃 불가도 같은 설계야.' },
    ],
    effect: { set: 'mother_culprit' },
    next: 'ch4_mid',
  },
  ch4_mid: {
    bg: 'tower',
    lines: [
      { who: '', text: '누구의 말을 믿고 움직일지 정해야 한다. 이 세계의 진실을 쥔 자는 셋이다.' },
    ],
    choices: [
      { text: '운영사 사장 백도윤을 찾아간다', next: 'ceo_reveal' },
      { text: '서연 박사의 흔적을 따라간다', next: 'mother_reveal' },
      { text: '플레이어 연합과 진상을 공개한다 (연합 신뢰 필요)', next: 'players_expose', req: { players: 2 } },
    ],
  },
  ceo_reveal: {
    bg: 'tower',
    lines: [
      { who: '백도윤', text: '운영은 우리가 맡았지. 하지만 설계는 서연 박사의 몫이었어. 우린 돈을 받고 간판을 세웠을 뿐이야.' },
      { who: '백도윤', text: '누구 탓을 하려면 설계자를 찾게. 나는 그저 월급쟁이니까.' },
    ],
    effect: { set: 'ops_is_front', ops: -1 },
    next: 'ch5_start',
  },
  mother_reveal: {
    bg: 'tower',
    lines: [
      { who: '', text: '연구실 깊은 곳, 낡은 음성 로그가 재생된다.' },
      { who: '서연(음성)', text: '미안해, 0417. 너를 두 번 잃고 싶지 않았어. 그래서 네 기억을 우리가 지킬게.' },
    ],
    effect: { set: 'mother_log', insight: 2 },
    next: 'ch5_start',
  },
  players_expose: {
    bg: 'tower',
    lines: [
      { who: '미르', text: '방송 켰어요. 지금 이 서버 플레이어들이 전부 보고 있어요.' },
      { who: '', text: '운영사 로그가 화면에 쏟아진다. 수천 개의 채팅창이 한꺼번에 들끓는다.' },
    ],
    effect: { players: 2, set: 'exposed' },
    next: 'ch5_start',
  },

  // ───────── 5장: 복제와 원본 ─────────
  ch5_start: {
    bg: 'cave',
    lines: [
      { who: '', text: '[5장 · 복제와 원본] 다시 회색 구역의 중심. 세라가 말없이 기다리고 있었다.' },
      { who: '세라', text: '나한테 할 말이 있는 얼굴이네.' },
    ],
    choices: [
      { text: '네가 복제본이란 걸 알고 있어', next: 'sera_confess', req: { sera_copy: true }, effect: { trust: 1 } },
      { text: '넌 진짜 세라야. 그렇게 믿을게', next: 'sera_denial', effect: { trust: 2 } },
      { text: '지금 바로 코어를 열어 본다', next: 'core_open', effect: { insight: 1 } },
    ],
  },
  sera_confess: {
    bg: 'cave',
    lines: [
      { who: '세라', text: '...맞아. 난 살고 싶어. 원본이 로그아웃하면 나는 사라져. 그래도 이 세계에서 웃고 싸운 기억은 진짜야.' },
    ],
    choices: [
      { text: '같이 살 방법을 찾자', next: 'core_open', effect: { set: 'sera_pact', trust: 1 } },
      { text: '너를 지우는 게 맞다', next: 'core_open', effect: { set: 'sera_erase', trust: -2 } },
    ],
  },
  sera_denial: {
    bg: 'cave',
    lines: [
      { who: '세라', text: '고마워. 그 말이 지금 제일 필요했어.' },
    ],
    next: 'core_open',
  },
  core_open: {
    bg: 'cave',
    lines: [
      { who: '', text: '회색 구역의 코어가 열린다. 그 안에는 「0417 키」가 떠 있다. 원본 기억의 가장 깊은 층과 이어진 열쇠.' },
      { who: '', text: '키를 해석하려면 충분한 통찰이 필요하다.' },
    ],
    choices: [
      { text: '키를 해석한다 (통찰 4 이상 필요)', check: { stat: 'insight', min: 4, pass: 'core_full', fail: 'core_partial' } },
      { text: '일부만 읽고 멈춘다', next: 'core_partial' },
    ],
  },
  core_full: {
    bg: 'cave',
    lines: [
      { who: '', text: '키가 풀리자 진실이 흘러든다. 0417 사고의 기록, 서연 박사의 마지막 실험, 그리고 「원본 플레이어」라는 한 줄.' },
      { who: '', text: '진실을 모두 알았다. 이제 선택은 당신의 몫이다.' },
    ],
    effect: { set: 'truth_full' },
    next: 'ch6_start',
  },
  core_partial: {
    bg: 'cave',
    lines: [
      { who: '', text: '키는 반쯤만 열린다. 무엇을 해야 하는지는 보이지만, 왜 그래야 하는지는 흐릿하다.' },
    ],
    effect: { set: 'truth_partial' },
    next: 'ch6_start',
  },

  // ───────── 6장: 선택 ─────────
  ch6_start: {
    bg: 'tower',
    lines: [
      { who: '', text: '[6장 · 선택] 타워 꼭대기. 아르케 넷의 서버 전원이 한눈에 내려다보인다. 여기서 결정이 끝난다.' },
      { who: '세라', text: '너는 이제 어떻게 할래?' },
    ],
    choices: [
      { text: '0417 키로 모두를 로그아웃시킨다', next: 'end_truth', req: { truth_full: true } },
      { text: '세라와 함께 접속을 연결 상태로 남긴다', next: 'end_sera', req: { sera_pact: true } },
      { text: '운영사의 거래를 받아들여 내 기억을 판다', next: 'end_betray', req: { gave_memory: true } },
      { text: '아무 선택도 하지 않고 회색 구역에 남는다', next: 'end_gray' },
    ],
  },

  // ───────── 엔딩 ─────────
  end_truth: {
    bg: 'town',
    ending: '진실 · 0417의 귀환',
    lines: [
      { who: '', text: '0417 키가 전원에 울려 퍼진다. 수천 개의 로그아웃 창이 동시에 떠오른다.' },
      { who: '세라', text: '잘 가. 난 여기 남을게. 너랑 웃었던 기억은 같이 가져가.' },
      { who: '', text: '정신을 차리자 침대 위다. 창밖으로 새벽빛이 흐르고, 화면에는 「접속 종료」가 떠 있다. 0417은 이제 기록으로만 남았다.' },
    ],
  },
  end_sera: {
    bg: 'cave',
    ending: '공존 · 두 번째 세션',
    lines: [
      { who: '세라', text: '원본과 복제, 둘 다 살려 낼 방법은 이것뿐이래. 접속을 끊지 않고, 이 세계를 우리의 두 번째 세션으로 만드는 거야.' },
      { who: '', text: '0417 키가 세계에 새 서버 주소를 쓴다. 회색 구역이 색을 되찾고, 세라가 웃으며 손을 흔든다.' },
      { who: '세라', text: '다음엔 같은 날짜를 쓰지 말자.' },
    ],
  },
  end_betray: {
    bg: 'tower',
    ending: '거래 · 떨어진 기억',
    lines: [
      { who: '시온', text: '거래 감사합니다. 당신의 기억 한 조각은 저희가 잘 보관할게요.' },
      { who: '', text: '로그아웃 창이 떠오르고, 당신은 현실로 돌아온다. 하지만 자신이 누구였는지 떠오르지 않는다. 가장 소중했던 기억이 없다.' },
      { who: '', text: '게임 로그 말미에 남은 메시지. "나를 잊었구나. 괜찮아. 세라는 여기서 계속 기다릴게."' },
    ],
  },
  end_gray: {
    bg: 'cave',
    ending: '미완 · 회색 구역',
    lines: [
      { who: '', text: '당신은 키를 쥔 채 회색 구역에 남기로 한다. 세상은 조용히 계속된다. 점검 공지는 여전히 "작업 중"이다.' },
      { who: '세라', text: '언젠가 누군가 진실을 완성할 거야. 그때까지 우리 둘이 지켜보자.' },
      { who: '', text: '[미완] 0417은 끝나지 않았다.' },
    ],
  },
}

// 아르케 넷 0417 설정: StoryGame의 game prop으로 넘긴다
export const ARKE_GAME = {
  title: '아르케 넷 0417',
  saveKey: 'arke.save',
  music: 'neon',
  start: 'intro',
  startStats: START_STATS,
  statNames: STAT_NAMES,
  scenes: SCENES,
  codex: CODEX,
  origins: [], // 출신 선택 없이 바로 시작
  images: {
    town: '/arke/bg/town.jpg',
    field: '/arke/bg/field.jpg',
    cave: '/arke/bg/cave.jpg',
    tower: '/arke/bg/tower.jpg',
  },
  portraits: {
    세라: '/arke/portraits/sera.png',
    바르도: '/arke/portraits/elder.jpg',
    유나: '/arke/portraits/yuna.jpg',
    에이든: '/arke/portraits/aiden.png',
  },
  theme: 'arke-theme',
}

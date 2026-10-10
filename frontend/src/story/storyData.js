// 네온 시티: 사이버펑크 선택형 이야기 (대본 데이터)
// 장면 하나 = { bg, lines: [{ who, text }], choices?: [...] } 또는 { ending: '제목' }
// 선택지: { text, next, effect?, req?, check? }
//   effect: 스탯 변화 { credits, trust, rep, hack } 또는 플래그 { set: '이름' }
//   req:    이 선택지가 보이려면 필요한 조건 { stat: 최소값 }
//   check:  주사위(해킹 능력)로 갈라지는 분기 { stat, min, pass, fail }

export const START_STATS = { credits: 100, trust: 0, rep: 0, hack: 1 }
export const STAT_NAMES = { credits: '크레딧 ₡', trust: '미라 신뢰', rep: '거리 평판', hack: '해킹' }

export const SCENES = {
  intro: {
    bg: 'rain',
    lines: [
      { who: '', text: '네온 시티의 밤. 비는 그치지 않고, 하늘은 광고판 빛으로 붉다.' },
      { who: '리코', text: '배달은 하늘 위로 올라가지 않아. 우린 늘 바닥에서 밀려 다니지.' },
      { who: '리코', text: '그런데 오늘따라 내 단말기가 이상하게 조용하다. 불길한 조용함.' },
    ],
    next: 'fixer',
  },
  fixer: {
    bg: 'rain',
    lines: [
      { who: '단말기', text: '[발신: 미라] 오늘 밤, 오르빗 타워에 들어갈 사람이 필요해. 돈은 많이 줄게.' },
      { who: '리코', text: '미라는 늘 큰 일을 작은 목소리로 말하지.' },
    ],
    choices: [
      { text: '좋아, 일 얘기부터 해', next: 'job', effect: { trust: 1 } },
      { text: '돈부터 보여줘. 선금이 있어야 움직인다', next: 'job', effect: { credits: 30, trust: -1, rep: 1 } },
    ],
  },
  job: {
    bg: 'tower',
    lines: [
      { who: '미라', text: '목표는 오르빗 타워 지하 금고의 기억 칩이야. 시민 수백만 명의 기억이 저장되어 있지.' },
      { who: '미라', text: '오르빗은 그걸 지우고 되팔아. 잊은 사람은 빚도 잊으니까, 잘 팔리지.' },
      { who: '리코', text: '그럼 들어가는 방법은?' },
    ],
    choices: [
      { text: '정면으로 밀고 들어간다', next: 'front', effect: { rep: 1 } },
      { text: '건물 시스템에 몰래 잠입한다 (해킹 실력 필요)', check: { stat: 'hack', min: 2, pass: 'hack_ok', fail: 'hack_fail' } },
      { text: '건물 안의 내부자를 찾는다', next: 'insider' },
    ],
  },
  front: {
    bg: 'tower',
    lines: [
      { who: '', text: '경비 드론이 쏟아지고, 리코는 바닥을 구르며 가까스로 로비를 뚫었다.' },
      { who: '리코', text: '맞고도 들어왔으니 됐어. 이제 금고만 남았다.' },
    ],
    next: 'vault',
  },
  hack_ok: {
    bg: 'tower',
    lines: [
      { who: '', text: '단말기에서 초록 줄이 흐르고, 타워의 보안이 하나씩 꺼졌다.' },
      { who: '리코', text: '이건 그냥 문 열쇠가 아니야. 건물 전체의 신경을 잡았어.' },
    ],
    effect: { hack: 1 },
    next: 'vault',
  },
  hack_fail: {
    bg: 'alarm',
    lines: [
      { who: '', text: '단말기가 뜨거워지더니 경보가 울렸다. 빨간 불빛이 복도를 훑는다.' },
      { who: '리코', text: '젠장, 방화벽이 생각보다 두꺼워. 간신히 뒷문으로 빠져나왔다.' },
    ],
    effect: { credits: -20, rep: 1 },
    next: 'vault',
  },
  insider: {
    bg: 'alley',
    lines: [
      { who: '', text: '뒷골목에서 기계팔을 단 남자가 담배 연기를 뿜었다. 이름은 카이, 전직 경찰이다.' },
      { who: '카이', text: '오르빗이 나를 쫓아냈어. 내 기억 칩도 이미 팔렸지. 그래서 난 그 칩을 되찾고 싶어.' },
    ],
    choices: [
      { text: '그 말을 믿고 손을 잡는다', next: 'insider_trust', effect: { set: 'kai_ally' } },
      { text: '아직은 의심스럽다. 감시하며 따라간다', next: 'insider_doubt' },
    ],
  },
  insider_trust: {
    bg: 'tower',
    lines: [
      { who: '카이', text: '좋아. 지하 통로는 내가 알아. 기계팔이면 잠금 장치쯤은 힘으로 열지.' },
      { who: '', text: '둘은 어깨를 나란히 하고 타워 지하로 내려갔다.' },
    ],
    effect: { trust: 1 },
    next: 'vault',
  },
  insider_doubt: {
    bg: 'tower',
    lines: [
      { who: '카이', text: '날 의심하는 눈이군. 좋아, 그렇게 따라와. 어차피 금고 앞에서 드러날 거야.' },
    ],
    next: 'vault',
  },
  vault: {
    bg: 'vault',
    lines: [
      { who: '', text: '금고 문이 열리자 차가운 빛이 쏟아졌다. 수백 개의 작은 칩이 유리 상자 안에서 빛나고 있다.' },
      { who: '리코', text: '이게 사람들의 기억이란 말이지. 가격표가 붙은 기억.' },
      { who: '미라', text: '[통신] 하나만 챙겨. 그걸로 충분해. 나머지는 손대지 마.' },
    ],
    choices: [
      { text: '칩을 가져가 세상에 폭로한다', next: 'ending_expose', req: { rep: 2 } },
      { text: '미라에게 넘기고 대가를 받는다', next: 'ending_sell' },
      { text: '칩을 부수고 조용히 사라진다', next: 'ending_run' },
    ],
  },
  ending_expose: {
    bg: 'neon',
    lines: [
      { who: '', text: '칩의 내용은 도시 전체 방송망으로 흘러갔다. 잊혔던 이름과 빚이 한꺼번에 떠올랐다.' },
      { who: '리코', text: '거리가 시끄러워지고 있어. 누군가는 울고, 누군가는 화를 낸다.' },
    ],
    ending: '진실의 방송',
  },
  ending_sell: {
    bg: 'neon',
    lines: [
      { who: '미라', text: '좋아, 이 정도면 한동안 배달 없이 살 수 있겠네. 넌 훌륭했어.' },
      { who: '', text: '리코의 계좌에 돈이 들어왔다. 하지만 밤마다 누군가의 잊힌 얼굴이 꿈에 나왔다.' },
    ],
    ending: '잿빛 거래',
  },
  ending_run: {
    bg: 'rain',
    lines: [
      { who: '', text: '리코는 칩을 망치로 내리쳤다. 불꽃이 튀고, 기억들이 한순간에 꺼졌다.' },
      { who: '리코', text: '누구도 가질 수 없는 물건이라면, 차라리 없는 게 낫지.' },
      { who: '', text: '다음 날 아침, 배달부 리코는 도시 어디에도 없었다.' },
    ],
    ending: '사라진 배달부',
  },
}

export const START_SCENE = 'intro'

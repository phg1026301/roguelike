// 네온 시티: 기억 칩 (4장 구성, 엔딩 여러 개, 떡밥 포함)
// 장면 = { bg, lines: [{ who, text }], choices?, next?, effect?, ending? }
// 선택지 = { text, next, effect?, req?, check? }
//   effect: 스탯 변화 { credits, trust, rep, hack, intel } 또는 플래그 { set: '이름' }
//   req:    보이기 위한 조건. 숫자면 "그 스탯 이상", true면 "그 플래그가 켜져 있어야 함"
//   check:  해킹 판정으로 갈리는 분기 { stat, min, pass, fail }

export const START_STATS = { credits: 100, trust: 0, rep: 0, hack: 1, intel: 0 }

// 출신 선택: 시작 스탯과 시작 대사, 전용 선택지가 달라진다
export const ORIGINS = [
  {
    id: 'corpo', flag: 'origin_corp', name: '기업가', sub: '전직 오르빗 말단 임원',
    desc: '월급과 출입증을 잃었다. 아직 회사 사람들의 얼굴과 내부 규칙을 기억한다. 돈은 있지만 신뢰는 없다.',
    bonus: { credits: 250, intel: 1 },
    line: '출입증은 해지됐지만, 엘리베이터 비밀번호는 아직 외우고 있어. 회사 사람 얼굴도.',
  },
  {
    id: 'nomad', flag: 'origin_nomad', name: '노마드', sub: '떠돌이 해커',
    desc: '도시 밖 임시 거처를 옮겨 다니며 기계를 고쳐 왔다. 가진 것은 적지만 손끝이 빠르다.',
    bonus: { credits: 60, hack: 2 },
    line: '난 한곳에 오래 머무른 적이 없어. 대신 어떤 망에든 몇 분이면 들어갈 수 있지.',
  },
  {
    id: 'street', flag: 'origin_street', name: '방랑자', sub: '거리 출신 배달부',
    desc: '이 도시의 골목에서 자랐다. 대기업은 몰라도 골목 사람들은 안다. 명성은 얇지만 의리는 두껍다.',
    bonus: { rep: 2, trust: 1 },
    line: '골목에서 자랐으니까 누가 거짓말하는지는 눈으로 보면 알아. 여기서는 그게 밥줄이야.',
  },
]
export const STAT_NAMES = { credits: '크레딧 ₡', trust: '미라 신뢰', rep: '거리 평판', hack: '해킹', intel: '정보력' }

// 도감: 떡밥과 세계관 기록. 해당 플래그가 켜지면 열린다 (C 키로 본다)
export const CODEX = [
  { id: 'orbit', title: '오르빗 코퍼레이션', unlock: 'known_orbit', text: '기억 소매의 절반을 쥐고 있는 기업. 빚을 지운 기억을 "새 출발 패키지"로 팔아 왔다. 본사는 타워 꼭대기, 시민 눈에는 보이지 않는 층이다.' },
  { id: 'seraph', title: '세라프 생명과학', unlock: 'known_seraph', text: '의료와 신경 임플란트를 독점하는 기업. 정부 기억 치료 사업의 실질 설계자다. 연구소는 도시 북쪽 백색 구역에 있고, 출입증 없이는 들어갈 수 없다.' },
  { id: 'nova', title: '노바 로지스틱스', unlock: 'known_nova', text: '항만과 지하 화물망을 장악한 물류 기업. 금지된 물건도 컨테이너 한 칸에 실어 나른다. "배송은 묻지 않는다"가 사훈이다.' },
  { id: 'arc7', title: 'ARC-7 계획', unlock: 'saw_arc7', text: '기억을 "지우는" 것이 아니라 칩으로 옮겨 보관하는 계획. 보관된 기억은 언제든 다시 꺼낼 수 있다. 누가 그 기억을 꺼내 쓰는지는 문서에 적혀 있지 않다.' },
  { id: 'chip', title: '기억 칩의 정체', unlock: 'chip_copy', text: '칩 한 장에는 한 사람의 기억 수백 시간이 들어간다. 복제하면 원본은 흐려지고, 복제본의 주인은 두 명이 된다는 보고가 있다.' },
  { id: 'vault_shadow', title: '금고 아래의 빈 층', unlock: 'heard_basement', text: '타워 지하에는 설계도에 없는 층이 있다는 소문. 엘리베이터 버튼에 "B0"만 있고, 그 아래로는 아무도 내려간 기록이 없다.' },
  { id: 'kai_past', title: '카이의 과거', unlock: 'kai_ally', text: '전직 경찰 카이는 기억 칩 수사 중 파면됐다. 그의 기계팔은 사건 증거를 지키다 잃은 팔을 대신한 것이라는 소문이 있다.' },
  { id: 'mira_name', title: '"미라"라는 이름', unlock: 'mira_secret', text: '의뢰인 미라는 본명이 아닐 가능성이 높다. 그녀의 눈에 박힌 분홍 임플란트는 오르빗 연구소의 시제품 모델과 같다.' },
]

export const SCENES = {
  // ───────── 1장: 배달부 ─────────
  intro: {
    bg: 'rain',
    lines: [
      { who: '', text: '네온 시티의 밤. 비는 그치지 않고, 하늘은 광고판 빛으로 붉다.' },
      { who: '리코', text: '배달은 하늘 위로 올라가지 않아. 우린 늘 바닥에서 밀려 다니지.' },
      { who: '리코', text: '그런데 오늘따라 단말기가 이상하게 조용하다. 불길한 조용함.' },
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
      { text: '[기업가] 옛 동료의 출입증 기록으로 정문을 통과한다', next: 'lobby', req: { origin_corp: true }, effect: { intel: 1, known_orbit: true } },
      { text: '[노마드] 떠돌며 익힌 기술로 타워 망에 직접 파고든다', next: 'hack_ok', req: { origin_nomad: true }, effect: { hack: 1 } },
      { text: '[방랑자] 골목 사람들을 불러 모아 길을 튼다', next: 'front', req: { origin_street: true }, effect: { rep: 1, trust: 1 } },
      { text: '정면으로 밀고 들어간다', next: 'front', effect: { rep: 1 } },
      { text: '건물 시스템에 몰래 잠입한다 (해킹 실력 필요)', check: { stat: 'hack', min: 2, pass: 'hack_ok', fail: 'hack_fail' } },
      { text: '건물 안의 내부자를 찾는다', next: 'insider' },
      { text: '먼저 정보부터 모은다', next: 'gather' },
    ],
  },
  gather: {
    bg: 'alley',
    lines: [
      { who: '', text: '골목의 정보 게시판에는 누군가 붙여 놓은 쪽지가 빼곡하다. 대부분은 장난이지만, 몇 개는 진짜다.' },
      { who: '리코', text: '"B0 층 엘리베이터는 아무도 안 탄다." "ARC-7 기록을 본 사람은 다음 날 기억이 없다."' },
      { who: '리코', text: 'ARC-7? 처음 듣는 이름인데, 쪽지를 붙인 손이 떨린 것 같아.' },
    ],
    effect: { intel: 1, set: 'heard_basement' },
    next: 'job2',
  },
  job2: {
    bg: 'tower',
    lines: [
      { who: '리코', text: '정보는 모았다. 이제 어떻게 들어갈지 정하자.' },
    ],
    choices: [
      { text: '정면으로 밀고 들어간다', next: 'front', effect: { rep: 1 } },
      { text: '해킹으로 잠입한다 (해킹 실력 필요)', check: { stat: 'hack', min: 2, pass: 'hack_ok', fail: 'hack_fail' } },
      { text: '내부자를 찾는다', next: 'insider' },
    ],
  },
  front: {
    bg: 'tower',
    lines: [
      { who: '', text: '경비 드론이 쏟아지고, 리코는 바닥을 구르며 가까스로 로비를 뚫었다.' },
      { who: '리코', text: '맞고도 들어왔으니 됐어. 이제 로비만 넘기면 된다.' },
    ],
    next: 'lobby',
  },
  hack_ok: {
    bg: 'tower',
    lines: [
      { who: '', text: '단말기에서 초록 줄이 흐르고, 타워의 보안이 하나씩 꺼졌다.' },
      { who: '리코', text: '이건 문 열쇠가 아니야. 건물 전체의 신경을 잡았어.' },
    ],
    effect: { hack: 1, known_orbit: true },
    next: 'lobby',
  },
  hack_fail: {
    bg: 'alarm',
    lines: [
      { who: '', text: '단말기가 뜨거워지더니 경보가 울렸다. 빨간 불빛이 복도를 훑는다.' },
      { who: '리코', text: '젠장, 방화벽이 생각보다 두꺼워. 간신히 뒷문으로 빠져나왔다.' },
    ],
    effect: { credits: -20, rep: 1 },
    next: 'lobby',
  },
  insider: {
    bg: 'alley',
    lines: [
      { who: '', text: '뒷골목에서 기계팔을 단 남자가 담배 연기를 뿜었다. 이름은 카이, 전직 경찰이다.' },
      { who: '카이', text: '오르빗이 나를 쫓아냈어. 내 기억 칩도 이미 팔렸지. 그래서 그 칩을 되찾고 싶어.' },
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
      { who: '', text: '둘은 어깨를 나란히 하고 타워 로비로 올라갔다.' },
    ],
    effect: { trust: 1 },
    next: 'lobby',
  },
  insider_doubt: {
    bg: 'tower',
    lines: [
      { who: '카이', text: '날 의심하는 눈이군. 좋아, 그렇게 따라와. 어차피 금고 앞에서 드러날 거야.' },
    ],
    next: 'lobby',
  },

  // ───────── 2장: 오르빗 타워 ─────────
  lobby: {
    bg: 'tower',
    lines: [
      { who: '', text: '로비는 대리석과 흰 조명뿐이다. 벽에 걸린 대형 화면이 웃는 가족을 보여 준다. "잊으면 가벼워집니다."' },
      { who: '에이다', text: '벌레가 들어왔네요. 아니, 그냥 배달부인가. 설명이 조금 필요해 보여요.' },
    ],
    next: 'ada_offer',
  },
  ada_offer: {
    bg: 'tower',
    lines: [
      { who: '에이다', text: '저는 세라프 생명의 에이다 하예요. 오르빗과는 조금 다른 식구죠. 서로 경쟁하면서 같은 정부와 일하는.' },
      { who: '에이다', text: '그 칩, 오르빗만 원하는 물건이 아니에요. 우리도 필요해요. 대신 제 명함을 받아 두면 나중에 쓸모가 있을 거예요.' },
    ],
    choices: [
      { text: '명함을 받는다 (거래 가능성을 남긴다)', next: 'ada_taken', effect: { set: 'seraph_contact', credits: 50 } },
      { text: '명함은 필요 없다. 그냥 지나간다', next: 'ch2_floor' },
    ],
  },
  ada_taken: {
    bg: 'tower',
    lines: [
      { who: '리코', text: '50 크레딧이 명함과 같이 들어왔다. 공짜 점심은 없다는 뜻이겠지.' },
    ],
    next: 'ch2_floor',
  },
  ch2_floor: {
    bg: 'tower',
    lines: [
      { who: '', text: '32층 자료실. 누군가 서둘러 파쇄한 서류 더미 사이에서 표지가 찢어진 문서 하나가 보인다.' },
      { who: '카이', text: '"ARC-7 — 최종 검토본". 이건 경찰 내부 보고서에서도 본 적 없는 이름이야.' },
    ],
    choices: [
      { text: '문서를 끝까지 읽는다 (정보력 필요)', next: 'arc_file', check: { stat: 'intel', min: 1, pass: 'arc_file', fail: 'arc_partial' }, effect: { set: 'saw_arc7' } },
      { text: '문서는 그냥 두고 금고로 간다', next: 'vault_path' },
    ],
  },
  arc_partial: {
    bg: 'tower',
    lines: [
      { who: '카이', text: '대부분 찢겨 나갔어. 남은 줄은 하나뿐이네. "기억은 지워지지 않는다. 보관될 뿐이다."' },
    ],
    effect: { set: 'saw_arc7' },
    next: 'vault_path',
  },
  arc_file: {
    bg: 'tower',
    lines: [
      { who: '', text: '문서는 말한다. 기억은 삭제되지 않는다. 칩으로 옮겨 보관되고, 필요한 사람이 언제든 꺼내 쓸 수 있다.' },
      { who: '카이', text: '"사용 목적: 의뢰인 재가동." 누가 의뢰인인지는 지워져 있어. 누군가 아주 신중하게 지운 거야.' },
      { who: '리코', text: '그럼 빚을 잊은 사람들의 기억은... 지금 누군가 쓰고 있는 거야?' },
    ],
    effect: { intel: 1, known_seraph: true },
    next: 'vault_path',
  },
  vault_path: {
    bg: 'vault',
    effect: { set: 'mira_secret' },
    lines: [
      { who: '미라', text: '[통신] 여기까지 왔으면 됐어. 금고에서 칩 하나만 챙겨. 나머지는 손대지 마.' },
      { who: '미라', text: '…그리고 지하 엘리베이터는 타지 마. 거긴 내 쪽 정보에도 없어.' },
    ],
    next: 'vault',
  },

  // ───────── 3장: 노바의 항만과 세라프의 연구소 ─────────
  vault: {
    bg: 'vault',
    lines: [
      { who: '', text: '금고 문이 열리자 차가운 빛이 쏟아졌다. 수백 개의 작은 칩이 유리 상자 안에서 빛나고 있다.' },
      { who: '리코', text: '사람들의 기억이 가격표를 달고 있다. 이건 도둑질이 아니라 장례식이야.' },
      { who: '', text: '그때, 금고 뒤쪽 벽이 소리 없이 열렸다. 아래로 이어지는 엘리베이터 문이 보인다. 버튼에는 "B0".' },
    ],
    choices: [
      { text: '칩 하나를 챙기고 바로 나간다', next: 'vault_exit' },
      { text: 'B0 엘리베이터를 탄다', next: 'basement', req: { heard_basement: true } },
      { text: '노바 물류에 칩을 넘길 계약이 있다', next: 'nova_meet', req: { nova_debt: true } },
    ],
  },
  vault_exit: {
    bg: 'port',
    lines: [
      { who: '', text: '칩을 챙겨 나오자, 항만 쪽에서 화물 트럭 행렬이 불을 켰다. 노바 로지스틱스의 로고가 번쩍인다.' },
      { who: '벡스', text: '안녕하세요, 배달부님. 노바는 칩을 "배송"해요. 가져갈 곳은 우리가 정하죠.' },
    ],
    choices: [
      { text: '계약한다 (선금 80 크레딧)', next: 'nova_meet', effect: { set: 'nova_debt', credits: 80, known_nova: true } },
      { text: '거절하고 몰래 빠져나간다 (정보력 필요)', next: 'nova_avoid', check: { stat: 'intel', min: 1, pass: 'nova_avoid', fail: 'nova_chase' } },
    ],
  },
  nova_chase: {
    bg: 'port',
    lines: [
      { who: '벡스', text: '도망칠 필요 없어요. 화물칸은 이미 막혔어요. 칩을 두고 가든지, 같이 가든지.' },
      { who: '', text: '컨테이너 사이에서 사격이 시작됐다. 리코는 칩을 가슴에 품고 달렸다.' },
    ],
    effect: { rep: 1, credits: -10 },
    next: 'nova_meet',
  },
  nova_avoid: {
    bg: 'port',
    lines: [
      { who: '', text: '정보원의 경로를 따라, 리코는 냉동 컨테이너 틈으로 항만을 빠져나갔다.' },
    ],
    effect: { intel: 1 },
    next: 'seraph_hunt',
  },
  nova_meet: {
    bg: 'port',
    lines: [
      { who: '벡스', text: '계약은 계약이죠. 칩은 노바 배송망을 타고 북쪽 백색 구역으로 갈 거예요. 거기 주소가 누군지는 물을 필요 없어요.' },
    ],
    choices: [
      { text: '북쪽 백색 구역은 세라프의 영역이다. 확인하러 간다', next: 'seraph_hunt', effect: { set: 'known_seraph' } },
      { text: '계약을 깨고 칩을 직접 부순다', next: 'ending_run' },
    ],
  },
  seraph_hunt: {
    bg: 'seraph',
    lines: [
      { who: '', text: '북쪽 백색 구역. 흰 벽, 흰 복도, 흰 옷의 사람들. 여기서는 모든 것이 잘 정돈되어 있다.' },
      { who: '에이다', text: '찾으셨네요. 역시 배달부는 길을 잘 찾아요. 여기가 세라프 생명의 기억 치료 연구소예요.' },
      { who: '에이다', text: '그 칩 안에는 누군가의 "마지막 기억"이 들어 있어요. 저희가 보관하고 있던 것이죠.' },
    ],
    choices: [
      { text: '무슨 뜻인지 설명해 달라고 한다', next: 'seraph_truth' },
      { text: '칩을 쥐고 뒤로 물러난다', next: 'seraph_defy', effect: { rep: 1 } },
    ],
  },
  seraph_truth: {
    bg: 'seraph',
    lines: [
      { who: '에이다', text: '저희는 기억을 지우지 않아요. 아픈 기억만 떼어 보관하죠. 치료라고 불러요. 그런데 떼어낸 기억을 다른 누군가가 쓰기도 해요.' },
      { who: '에이다', text: '오르빗이 빚을 지우면, 세라프가 그 기억을 다시 팔죠. 그러니까 우린 같은 시장에 있는 거예요.' },
      { who: '카이', text: '…그럼 이 도시 전체가 누군가의 기억을 돌려쓰는 공장이라는 거야?' },
    ],
    effect: { intel: 1, set: 'heard_basement' },
    next: 'ch4_choice',
  },
  seraph_defy: {
    bg: 'seraph',
    lines: [
      { who: '에이다', text: '좋아요. 그럼 칩을 가져가세요. 대신 연구소 경비가 밖에서 기다리고 있다는 것만 기억하세요.' },
      { who: '', text: '출구 쪽에서 문이 열리고, 검은 옷의 경비대가 천천히 걸어 들어왔다.' },
    ],
    next: 'ch4_choice',
  },

  // ───────── 4장: 선택 ─────────
  ch4_choice: {
    bg: 'vault',
    lines: [
      { who: '', text: '칩 하나가 리코의 손안에 있다. 이제 이 기억을 어디에 쓸지 정해야 한다.' },
    ],
    choices: [
      { text: '칩을 가져가 도시 전체 방송망으로 폭로한다 (평판 필요)', next: 'ending_expose', req: { rep: 2 } },
      { text: '미라에게 넘기고 대가를 받는다', next: 'ending_sell' },
      { text: '칩을 부수고 조용히 사라진다', next: 'ending_run' },
      { text: '칩 속 ARC-7 기록을 직접 재생한다 (카이와 함께, 문서를 읽었어야 함)', next: 'ending_arc', req: { saw_arc7: true, kai_ally: true } },
      { text: '노바와의 계약대로 칩을 북쪽 배송 주소로 보낸다', next: 'ending_nova', req: { nova_debt: true } },
    ],
  },
  basement: {
    bg: 'vault',
    lines: [
      { who: '', text: '엘리베이터가 한참 내려간다. 문이 열리자, 설계도에 없던 층이 나타났다. 흰 빛으로 가득한 긴 홀, 그 끝에 수천 개의 칩이 달린 서버 벽.' },
      { who: '리코', text: '여긴… 기억을 보관하는 게 아니라, 돌려쓰는 곳이야.' },
      { who: '', text: '서버 벽 한가운데, 리코 자신의 이름이 적힌 칩이 깜빡이고 있다.' },
    ],
    choices: [
      { text: '내 칩을 꺼낸다', next: 'basement_self', effect: { set: 'chip_copy', intel: 1 } },
      { text: '그냥 돌아간다. 이건 내 손에 넘칠 물건이다', next: 'ch4_choice', effect: { intel: 1 } },
    ],
  },
  basement_self: {
    bg: 'vault',
    lines: [
      { who: '리코', text: '칩 속에 내 기억이 있다. 어릴 적 배달을 처음 한 날, 비 오던 골목. 난 이걸 잊은 적이 없는데, 왜 여기 있지?' },
      { who: '시스템', text: '[ARC-7] 의뢰인 재가동 대기 중: 리코. 기억 사용 권한: 오르빗 · 세라프 · 노바.' },
    ],
    effect: { known_orbit: true },
    next: 'ch4_choice',
  },

  // ───────── 엔딩 ─────────
  ending_expose: {
    bg: 'neon',
    lines: [
      { who: '', text: '칩의 내용은 도시 전체 방송망으로 흘러갔다. 잊혔던 이름과 빚이 한꺼번에 떠올랐다.' },
      { who: '리코', text: '거리가 시끄러워지고 있어. 누군가는 울고, 누군가는 화를 낸다. 그리고 세 기업 본사가 동시에 조용해졌어.' },
    ],
    ending: '진실의 방송',
  },
  ending_sell: {
    bg: 'neon',
    lines: [
      { who: '미라', text: '좋아, 이 정도면 한동안 배달 없이 살 수 있겠네. 넌 훌륭했어. 그런데 네 눈 속 빛이 조금 낯익네.' },
      { who: '', text: '리코의 계좌에 돈이 들어왔다. 하지만 밤마다 누군가의 잊힌 얼굴이 꿈에 나왔다.' },
    ],
    ending: '잿빛 거래',
  },
  ending_run: {
    bg: 'rain',
    lines: [
      { who: '', text: '리코는 칩을 망치로 내리쳤다. 불꽃이 튀고, 기억들이 한순간에 꺼졌다.' },
      { who: '리코', text: '누구도 가질 수 없는 물건이라면, 차라리 없는 게 낫지.' },
      { who: '', text: '다음 날 아침, 배달부 리코는 도시 어디에도 없었다. 다만 어떤 골목 게시판에 새 쪽지가 붙었다. "B0은 아직 비어 있다."' },
    ],
    ending: '사라진 배달부',
  },
  ending_arc: {
    bg: 'neon',
    lines: [
      { who: '카이', text: '재생 버튼을 누른다. 도시가 한 박자 멈췄다가, 수백만 명의 기억이 동시에 흘러들어온다.' },
      { who: '리코', text: '…이건 내 기억이 아니야. 그런데 내가 여기 있었다. 다른 날, 다른 골목에서. 누군가가 나를 연기하고 있었어.' },
      { who: '시스템', text: '[ARC-7] 재가동 완료. 다음 의뢰인을 기다리는 중입니다.' },
    ],
    ending: '잠든 자들의 도시',
  },
  ending_nova: {
    bg: 'port',
    lines: [
      { who: '벡스', text: '배송 완료. 주소는 백색 구역 최상층이에요. 계약은 여기서 끝나고, 다음 계약이 시작되죠.' },
      { who: '', text: '컨테이너 문이 닫히고, 칩은 조용히 북쪽으로 떠났다. 리코의 빚은 사라졌지만, 리코가 무엇을 팔았는지는 아무도 말해 주지 않는다.' },
    ],
    ending: '화물칸의 기억',
  },
}

export const START_SCENE = 'intro'

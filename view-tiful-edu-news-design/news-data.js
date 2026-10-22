'use strict';
// 분야별 기사 목록과 뉴스 페이지가 같은 데이터를 사용합니다.
// 기사 배열: [제목, 요약, 이미지 이름, 고유 ID]. ID는 발행 후 바꾸지 않습니다.
window.CATEGORY_NEWS = {
  "admissions": {
    "title": "입시•수능",
    "description": "전형을 이해하고, 나의 방향을 찾아봅니다.",
    "articles": [
      [
        "최근 10년 수능 만점자 69명…학교 순위보다 봐야 할 세 가지",
        "2017~2026학년도 수능 만점자 공개정보 분석을 통해 의대 쏠림, 재학생·N수생 비중, 데이터 해석의 한계를 함께 살펴본다.",
        "admission",
        "admissions-perfect-scorers-20261022"
      ],
      [
        "직장 경력이 대학 학점이 된다, 전문대 제도 얼마나 달라지나",
        "산업체 경력 등의 학점 인정 범위를 졸업 필요학점의 최대 절반까지 확대하는 개정안이 입법예고됐다.",
        "admission",
        "admissions-career-credit-20261016"
      ],
      [
        "대입 준비의 시작, 전형보다 나를 먼저 살피기",
        "관심 분야와 학습 기록을 연결하는 진로 탐색",
        "feedback",
        "lead-2"
      ],
      [
        "모집요강의 작은 차이, 지원 전 꼭 확인할 항목은",
        "전형을 이해하고, 나의 방향 찾기",
        "admission",
        "admissions-93413844ff"
      ],
      ["수시 모집요강, 어떤 항목부터 읽을까", "", "admission", "admissions-f9c2f9ab4a"],
      ["진로가 바뀌었다면 학습 기록부터 점검", "", "admission", "admissions-5b4ff5cd3a"],
      ["면접 준비, 외운 답보다 경험의 맥락", "", "admission", "admissions-04f3128539"],
      ["과목 선택과 진로를 연결하는 방법", "", "admission", "admissions-af7d1ffcfe"],
      ["입시 일정표에 함께 적어둘 준비 과정", "", "admission", "admissions-c885a1f1af"]
    ]
  },
  "gifted": {
    "title": "영재•특목",
    "description": "영재교육과 특목고 관련 교육뉴스를 모아봅니다.",
    "articles": [
      [
        "특목고 고1 이탈 5년 최저, 그런데 지역자사고는 반대로 움직였다",
        "영재·특목·전국자사고 73개교의 2025년 고1 학업중단자는 189명으로 최근 5년 최저였지만 지역자사고는 증가했다.",
        "school",
        "gifted-dropout-20261015"
      ]
    ]
  },
  "digital": {
    "title": "AI•디지털교육",
    "description": "새로운 기술을 넘어, 배움과 생각하는 힘을 살펴봅니다.",
    "articles": [
      [
        "한국이 AI 선도국 그룹에 들어갔다…교육뉴스로 볼 때 주의할 점",
        "BCG는 한국을 2026년 최상위 AI Pioneers 그룹에 새로 분류했다. 국가 AI 경쟁력과 학교 AI교육 성과는 구분해서 읽을 필요가 있다.",
        "ai",
        "digital-bcg-ai-pioneers-20261022"
      ],
      [
        "교육부, AI 중점학교 1,141개교 본격 운영",
        "2026년 1,141개교를 시작으로 AI 수업 확대와 특별교부금 지원, 2028년 2,000개교까지의 확대 계획을 살펴본다.",
        "ai",
        "digital-ai-focus-schools-2026"
      ],
      [
        "AI학과 학생만 AI를 배우는 시대 끝날까, 경북 ‘AI 인재 혁신대학’ 구상",
        "전공 불문 AI 기초교육과 기업 프로젝트를 연결하는 대학 모델 연구가 시작됐다. 아직 정책 연구 단계다.",
        "ai",
        "digital-ai-innovation-university-20261015"
      ],
      [
        "AI가 들어온 교실, 질문하는 힘은 더 중요해졌다",
        "정답을 빠르게 찾는 것만으로는 충분하지 않다. AI의 답을 비교하고 근거를 묻는 수업, 학생의 생각을 넓히는 도구로 활용하려면 무엇이 필요할까.",
        "classroom",
        "lead-1"
      ],
      ["그럴듯한 AI 답변, 사실과 의견을 나누어 읽기", "기술을 넘어, 생각하는 힘으로", "ai", "digital-a9cef38658"],
      ["학습 앱을 고르기 전, 먼저 물어야 할 세 가지", "기능이 많다고 좋은 도구일까, 학습 목적과 접근성, 개인정보 기준을 함께 점검한다.", "tablet", "digital-3d15aeb016"],
      ["생성형 AI와 함께 쓰는 탐구 질문", "", "ai", "digital-0ef4a7eae3"],
      ["AI 활용 과제, 과정 기록이 중요한 이유", "", "ai", "digital-a898af1345"],
      ["교실에서 함께 정하는 AI 사용 약속", "", "ai", "digital-65b1609011"],
      ["학습 앱 선택 전, 데이터 권한 확인", "", "tablet", "digital-2a3a864206"],
      ["교사의 피드백을 돕는 디지털 도구", "", "tablet", "digital-fc2a6e0a10"],
      ["AI 답변의 출처를 확인하는 수업", "", "ai", "digital-e71be78a38"],
      ["과제 속 AI 활용, 어디까지 허용할까", "", "ai", "digital-22a7d4ec76"]
    ]
  },
  "school-policy": {
    "title": "학교•교육정책",
    "description": "정책의 변화와 학교 현장의 배움을 함께 읽습니다.",
    "articles": [
      [
        "2027학번부터 ‘등록금 0원’…지방국립대 재학생은 왜 다를까",
        "2027학년도 지방국립대 신입생부터 등록금 전액 지원이 추진된다. 기존 재학생과의 형평성과 세부 적용 기준을 함께 살펴본다.",
        "policy",
        "school-policy-free-tuition-20261022"
      ],
      [
        "‘서울대 10개’의 선택과 집중, 거점국립대 격차도 커질까",
        "부산대·전남대·충남대에 거점국립대 주요 재정지원의 49.1%가 집중됐다는 분석을 바탕으로 정책의 의미와 한계를 살펴본다.",
        "policy",
        "school-policy-national-university-funding-20261022"
      ],
      ["돌봄과 배움 사이, 방과 후 시간의 새로운 질문", "프로그램 수보다 중요한 것은 아이의 하루. 학교와 지역이 함께 만드는 연결을 살펴본다.", "after-school", "school-policy-19970d436a"],
      ["틀려도 괜찮은 교실, 피드백이 배움이 되는 순간", "점수보다 과정에 주목하는 수업의 풍경. 다시 도전할 수 있는 말과 기록을 찾아본다.", "feedback", "school-policy-c214e106fd"],
      ["교육 지원을 알아볼 때, 우리 학교 안내부터 확인하기", "제도 변화의 맥락을 읽습니다", "policy", "school-policy-ade8c6ee91"],
      ["학생의 제안으로 바뀌는 학교의 작은 공간들", "배움이 일어나는 현장의 목소리", "school", "school-policy-9d343fa5af"],
      ["디지털 교육, 기기보다 지원 체계가 먼저", "", "policy", "school-policy-02bd8df9bb"],
      ["학교별 안내를 함께 살펴야 하는 이유", "", "policy", "school-policy-e74dc62c81"],
      ["정책 용어 쉽게 읽기: 교육과정이란", "", "policy", "school-policy-46a8ccec0e"],
      ["학교와 지역의 협력, 무엇이 달라질까", "", "policy", "school-policy-74f1bbc11f"],
      ["교육 소식 속 시행 시기 구분하는 법", "", "policy", "school-policy-f853453768"],
      ["친구의 생각을 듣는 토론 수업의 시작", "", "school", "school-policy-ddfcfcdddd"],
      ["아침 독서, 짧아도 깊어지는 시간", "", "school", "school-policy-379209dffc"],
      ["지역의 일상을 교과서로 삼는 수업", "", "school", "school-policy-9d54c2a0c8"],
      ["짧은 대화로 시작하는 아침 교실", "", "school", "school-policy-56b4235ed4"],
      ["학생이 직접 제안하는 학교 공간", "", "school", "school-policy-3c17873e10"]
    ]
  }
};
window.ARCHIVE_ARTICLES = Object.entries(window.CATEGORY_NEWS).flatMap(([key, group]) =>
  group.articles.map(([title, description, image, id]) => ({
    id, navCategory: key, category: group.title, title, image,
    alt: group.title + ' 기사 연출 이미지', description,
    readingLabel: '교육뉴스', summary: description ? [description] : []
  }))
);

const aiFocusStory = window.ARCHIVE_ARTICLES.find(item => item.id === 'digital-ai-focus-schools-2026');
if (aiFocusStory) {
  aiFocusStory.alt = 'AI 중점학교 운영과 인공지능 교육을 상징하는 이미지';
  aiFocusStory.readingLabel = 'AI교육 · 데이터 읽기 · 5분 읽기';
  aiFocusStory.summary = [
    '교육부는 초·중등 인공지능 교육 확대를 위해 2026년 AI 중점학교 1,141개교를 선정해 3월부터 운영하고 있습니다.',
    '초등·중등의 관련 수업 시간을 늘리고 고등학교는 매 학기 관련 수업을 편성하며, 교과 융합수업과 AI 윤리교육도 함께 강화합니다.',
    '2026년 특별교부금 385억 원을 지원하고, 2027년 1,500개교·2028년 2,000개교까지 확대할 계획입니다.'
  ];
}

const publishedStoryDetails = {
  'admissions-perfect-scorers-20261022': {
    readingLabel: '입시 데이터 · 4분 읽기',
    summary: [
      '베리타스알파가 공개정보를 바탕으로 2017~2026학년도 수능 만점자 69명의 출신고와 진학 흐름을 분석했습니다.',
      '10년 전체에서는 재학생 만점자가 39명으로 N수생 30명보다 많았지만, 최근 3년만 보면 N수생 9명·재학생 8명으로 양상이 달라졌습니다.',
      '학교별·진학처별 집계는 한국교육과정평가원의 공식 통계가 아니라 언론사의 자체 분석이므로 학교 교육력의 순위로 해석해서는 안 됩니다.'
    ]
  },
  'digital-bcg-ai-pioneers-20261022': {
    readingLabel: 'AI 트렌드 · 4분 읽기',
    summary: [
      'BCG의 ‘AI Maturity Matrix 2026’에서 한국과 일본이 최상위 ‘AI Pioneers’ 그룹에 새로 진입했습니다.',
      'BCG는 한국의 국내 AI 모델 개발과 컴퓨팅 인프라·AI 생태계 투자를 주요 배경으로 평가했습니다.',
      '이 평가는 국가 AI 준비도에 관한 것으로 학교 AI교육의 성과를 직접 평가한 지표는 아닙니다.'
    ]
  },
  'school-policy-free-tuition-20261022': {
    readingLabel: '정책 읽기 · 4분 읽기',
    summary: [
      '2027학년도 지방국립대 신입생부터 등록금 전액 지원이 추진되면서 2026학번 등 기존 재학생과의 형평성 문제가 쟁점으로 떠올랐습니다.',
      '정책은 신입생부터 시작해 2030년 전 학년으로 단계적으로 확대하는 방향이며, 세부 적용 기준은 최종 시행지침을 확인해야 합니다.',
      '반수·재입학 증가 가능성은 현재 국정감사에서 제기된 우려이며 실제 행동 변화로 확인된 사실은 아닙니다.'
    ]
  },
  'school-policy-national-university-funding-20261022': {
    readingLabel: '정책·데이터 · 5분 읽기',
    summary: [
      '부산대·전남대·충남대의 2026년 주요 대학재정지원사업 지원액이 합계 3,839억 원, 9개 거점국립대 전체의 49.1%라는 분석이 나왔습니다.',
      '세 대학이 ‘서울대 10개 만들기’ 패키지 지원대학으로 선정돼 대학당 약 700억 원을 지원받는 정책 사실은 교육부 자료로 확인됩니다.',
      '3,839억 원·49.1% 등 세부 수치는 국회의원실이 교육부 제출자료를 분석한 값이므로 패키지 사업의 직접 효과와는 구분해 읽어야 합니다.'
    ]
  }
};

for (const story of window.ARCHIVE_ARTICLES) {
  const detail = publishedStoryDetails[story.id];
  if (!detail) continue;
  story.readingLabel = detail.readingLabel;
  story.summary = detail.summary;
}

window.ARTICLE_CONTENTS = window.ARTICLE_CONTENTS || {};
window.ARTICLE_CONTENTS['digital-ai-focus-schools-2026'] = {
  sections: [
    {
      paragraphs: [
        '교육부가 초·중등학교에서 인공지능 교육을 체계적으로 확대하기 위해 전국 1,141개 학교를 ‘인공지능(AI) 중점학교’로 선정하고 운영에 들어갔다. 선정 학교는 2026년 3월부터 3년간 운영되며, 전국 17개 시도교육청이 지역 여건과 학교 특성을 고려해 학교를 선정했다.',
        'AI 중점학교는 갑자기 등장한 새로운 사업이라기보다 학교 현장의 AI 교육을 확대해 온 정책의 연장선에 있다. 교육부는 2025년 7월부터 2026년 2월까지 AI·정보교육 중심학교 730개교를 운영했고, 2026년부터 이를 AI 중점학교로 개편·확대했다. 일부 학교의 체험형 프로그램에 머무르기보다 학교 교육과정 안에서 AI 교육을 보다 체계적으로 운영하는 방향으로 사업의 범위가 넓어진 셈이다.',
        '가장 눈에 띄는 변화는 수업 시간이다. 초등학교의 AI 관련 교육은 기존 34시간에서 68시간 이상으로 늘어나고, 중학교는 68시간에서 102시간 이상으로 확대된다. 고등학교는 학교가 자율적으로 선택하던 방식에서 한 단계 더 나아가 매 학기 AI 관련 교육을 편성하도록 했다. 교육부는 국어·수학·과학·사회 등 기존 교과와 AI를 연결한 융합 교육과정을 운영하고, 학생들이 AI를 안전하고 책임 있게 활용할 수 있도록 윤리교육도 강화할 계획이다.',
        '변화가 정규 수업에만 머무는 것은 아니다. 선정된 학교들은 AI 교육과정 운영과 함께 교원 전문성 강화, 학생 동아리와 체험 활동, 지역사회 연계 프로그램 등을 추진한다. 학교에서 축적한 수업 사례와 운영 경험을 주변 학교와 공유하는 지역 내 AI 교육 거점 역할도 맡는다. 따라서 학생들이 AI를 접하는 방식도 특정 정보 교과 수업에만 한정되기보다 일반 교과 수업과 동아리·체험 활동 등으로 넓어질 것으로 전망된다.',
        '이 같은 운영 방향은 AI 교육의 목표가 단순히 생성형 AI나 특정 프로그램의 사용법을 익히는 데 있지 않다는 점에서도 의미가 있다. 교육부의 2026년 업무계획에는 학생들이 AI를 주도적·비판적으로 활용할 수 있도록 질문 중심 수업과 서·논술형 평가를 확대하고, 올바른 AI 활용을 위한 교과 연계형 AI 윤리 콘텐츠를 개발한다는 내용이 포함돼 있다. AI를 ‘답을 얻는 도구’로 사용하는 것을 넘어 학습 과정에서 질문하고 판단하는 능력까지 함께 기르겠다는 방향이다.',
        '사업 규모도 빠르게 확대된다. 교육부는 2026년 AI 중점학교 운영을 위해 특별교부금 총 385억 원을 지원한다. 지원액은 학교급과 운영 유형에 따라 달라지며, 교육과정 운영과 교육환경 개선 등에 활용될 예정이다. 현재 1,141개교인 AI 중점학교는 2027년 1,500개교, 2028년 2,000개교까지 늘릴 계획이다.',
        '학교 수가 늘어나는 만큼 앞으로는 ‘몇 개 학교가 AI 중점학교로 지정됐는가’뿐 아니라 각 학교에서 AI 교육이 실제로 어떻게 운영되는가가 더 중요해질 것으로 보인다. 같은 AI 중점학교라 하더라도 지역의 교육 여건, 학교급, 교원 구성과 학교가 선택한 프로그램에 따라 학생들이 경험하는 수업의 모습에는 차이가 나타날 수 있기 때문이다.',
        '실제로 사업이 시작되기 전부터 지역별 운영 여건과 교원 역량 등에 대한 우려가 제기됐다. 이에 대해 교육부는 2026년 1월 설명자료에서 AI 중점학교 운영계획을 시도교육청에 안내했으며, 정보 교원 채용 확대와 AI 교육 담당교원 역량강화 연수 등을 통해 안정적인 운영을 지원하겠다고 밝혔다. 사업의 성과를 판단할 때 학교 수의 증가와 함께 교원 지원, 교육과정의 실제 운영, 지역별 격차가 어떻게 나타나는지도 함께 살펴볼 필요가 있다.',
        '학생 입장에서는 앞으로 학교 수업 안에서 AI를 접하는 빈도가 지금보다 높아질 가능성이 크다. 특히 수학·과학뿐 아니라 국어·사회 등 여러 교과에서 AI를 활용한 수업이 시도되고, 동아리와 체험 활동까지 연계될 경우 AI를 사용하는 경험 자체는 더욱 다양해질 것으로 전망된다. 동시에 AI가 제시한 답을 그대로 받아들이기보다 결과를 검토하고, 출처와 오류를 확인하며, 개인정보와 저작권·윤리 문제를 함께 판단하는 능력도 학교 교육에서 점차 중요한 비중을 차지할 것으로 보인다.',
        'AI 중점학교 1,141개교의 출범은 학교 AI 교육의 ‘확대’가 실제 현장 운영 단계로 넘어가기 시작했다는 점에서 주목할 만하다. 앞으로 확인해야 할 것은 학교 수의 증가 자체보다 학생들이 실제 수업에서 어떤 AI 교육을 경험하게 되는지, 그리고 학교와 지역에 따른 교육 기회의 차이를 얼마나 줄일 수 있는지다. 2026년은 AI 중점학교 사업의 규모뿐 아니라 학교 현장에서의 실제 운영 모습을 함께 살펴봐야 하는 첫해가 될 것으로 보인다.'
      ]
    },
    {
      heading: '핵심 수치 한눈에 보기',
      chart: {
        caption: '연도별 AI 중점학교 운영·확대 계획',
        unit: '개교',
        rows: [
          { label: '2026', value: 1141 },
          { label: '2027', value: 1500 },
          { label: '2028', value: 2000 }
        ],
        note: '2026년은 운영 시작 규모이며, 2027년과 2028년 수치는 교육부가 제시한 확대 계획입니다.'
      }
    },
    {
      chart: {
        caption: '시도별 AI 중점학교 운영 비율',
        wideValues: true,
        unit: '%',
        rows: [
          { label: '세종', value: 39.3, displayValue: '39.3% · 42 / 107교' },
          { label: '인천', value: 19.0, displayValue: '19.0% · 107 / 562교' },
          { label: '충남', value: 15.5, displayValue: '15.5% · 115 / 741교' },
          { label: '서울', value: 13.5, displayValue: '13.5% · 182 / 1,350교' },
          { label: '전북', value: 10.6, displayValue: '10.6% · 81 / 761교' },
          { label: '대구', value: 10.5, displayValue: '10.5% · 50 / 477교' },
          { label: '울산', value: 10.4, displayValue: '10.4% · 26 / 249교' },
          { label: '경북', value: 9.0, displayValue: '9.0% · 85 / 947교' },
          { label: '광주', value: 8.4, displayValue: '8.4% · 27 / 323교' },
          { label: '충북', value: 8.1, displayValue: '8.1% · 40 / 495교' },
          { label: '대전', value: 7.7, displayValue: '7.7% · 24 / 313교' },
          { label: '경기', value: 7.6, displayValue: '7.6% · 200 / 2,618교' },
          { label: '부산', value: 6.9, displayValue: '6.9% · 44 / 634교' },
          { label: '전남', value: 6.1, displayValue: '6.1% · 53 / 867교' },
          { label: '제주', value: 5.6, displayValue: '5.6% · 11 / 198교' },
          { label: '경남', value: 4.9, displayValue: '4.9% · 49 / 1,006교' },
          { label: '강원', value: 4.2, displayValue: '4.2% · 27 / 642교' }
        ],
        note: '비율 = AI 중점학교 수 ÷ 시도별 초·중·고·특수학교 수. 분모는 2026년 교육기본통계 학교 주소록(2026.4.1 기준), 지역별 AI 중점학교 수는 연구지원센터 공개 현황(2026.10.7 열람, 총 1,163교 기준)입니다. 이 지역별 현황은 교육부가 3월 발표한 1,141교와 차이가 있으며, 공개자료만으로 차이의 원인은 확인되지 않았습니다.'
      }
    }
  ],
  sources: [
    { name: '교육부 보도자료 원문', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105557&lev=0&m=020402&opType=N&page=1&s=moe&statusYN=W' },
    { name: '교육부 2026년 업무계획', url: 'https://www.moe.go.kr/upload/filedown/2026_business_plan_press_release.pdf' },
    { name: '교육부 AI 중점학교 설명자료', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=295&boardSeq=105249&lev=0&m=020401&opType=N&page=1&s=moe&searchType=null&statusYN=W' },
    { name: '대한민국 정책브리핑', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148960798' },
    { name: '연합뉴스 관련 보도', url: 'https://www.yna.co.kr/view/AKR20260309049000530' },
    { name: 'AI 중점학교 연구지원센터 선정현황', url: 'https://aischool-center.kr/about/schools' }
  ]
};

window.ARTICLE_CONTENTS['school-policy-national-university-funding-20261022'] = {
  sections: [
    {
      paragraphs: [
        '정부는 2026년 부산대·전남대·충남대를 ‘서울대 10개 만들기’ 첫 패키지 지원대학으로 선정했다. 교육부 공식 계획에 따르면 이들 대학에는 대학당 약 700억 원이 지원되며, 지원은 2030년까지 이어질 예정이다.',
        '국회 교육위원회 이주영 의원실이 교육부 자료를 분석해 공개한 수치에서는 세 대학의 주요 재정지원액이 전년보다 51.4% 늘어난 3,839억 원으로 집계됐다. 9개 거점국립대 전체 지원액의 49.1%다. 반대로 비선정 6개 대학의 지원액은 감소한 것으로 나타나면서 거점국립대 내부의 격차가 커질 수 있다는 지적이 제기됐다.',
        '다만 ‘재정 집중=정책으로 인한 서열화’라고 바로 결론 내리기는 어렵다. 여러 재정지원사업은 선정 기준과 사업 기간이 서로 다르고, BK21처럼 패키지 사업과 직접 연결되지 않은 사업도 포함되기 때문이다. 현재 확인되는 것은 재정지원의 집중 현상이고, 그 원인과 결과는 별도로 검증해야 한다.',
        '앞으로 봐야 할 것은 세 가지다. 추가 지원대학이 확대되는지, 비선정 대학의 교육·연구 여건이 실제로 약화되는지, 그리고 집중된 예산이 학생 교육과 지역 산업의 성과로 연결되는지다. View-tiful Edu는 이 정책을 단발성 기사보다 장기 추적 이슈로 볼 필요가 있다.'
      ]
    },
    {
      heading: '핵심 수치 한눈에 보기',
      table: {
        headers: ['항목', '수치'],
        rows: [
          ['패키지 지원대학', '부산대·전남대·충남대'],
          ['2026년 주요 재정지원액', '3,839억 원'],
          ['9개 거점국립대 중 비중', '49.1%'],
          ['전년 대비 증가율', '51.4%'],
          ['패키지 지원 계획', '대학당 약 700억 원·2030년까지']
        ]
      }
    }
  ],
  sources: [
    { name: '아시아투데이 원문', url: 'https://ww3.asiatoday.co.kr/kn/view.php?key=20261020010006593' },
    { name: '교육부 국가대표 거점국립대학 선정 결과', url: 'https://www.moe.go.kr/upload/synap/202610/29ba828dc8d3392bbd7f47a885532d60.view.xhtml' },
    { name: '한겨레 관련 보도', url: 'https://www.hani.co.kr/arti/society/schooling/1275720.html' },
    { name: 'MBC 관련 보도', url: 'https://imnews.imbc.com/news/2026/society/article/6848886_36918.html' }
  ]
};

window.ARTICLE_CONTENTS['school-policy-free-tuition-20261022'] = {
  sections: [
    {
      paragraphs: [
        '교육부는 지역 균형 발전 장학금을 통해 2027학년도 지방국립대 신입생부터 등록금 전액 지원을 추진하고, 이후 지원 범위를 단계적으로 넓힐 계획이다. 정책이 정착되면 지방대학을 선택하는 학생의 비용 부담을 크게 낮출 수 있다는 점에서 학생·학부모에게 직접적인 변화다.',
        '그러나 단계 적용 과정에서는 학번에 따른 차이가 생긴다. 10월 21일 국정감사에서는 같은 대학에 다니는 2026학번과 2027학번의 등록금 부담이 달라지는 문제, 자퇴 뒤 다시 입학할 경우의 지원 여부, 지방국립대와 지방사립대 사이 장학금 구조 차이가 쟁점이 됐다.',
        '여기서 중요한 것은 ‘반수가 늘어난다’는 식으로 결과를 미리 단정하지 않는 것이다. 현재 확인되는 것은 제도 설계가 그런 선택을 유인할 수 있다는 문제제기다. 실제 영향은 2027학년도 입학과 장학금 집행 이후 데이터를 통해 확인해야 한다.',
        '학생과 학부모는 최종 시행지침이 나오면 지원 대상 대학·학과와 국가장학금 신청 조건, 재입학·학적변동 기준을 반드시 확인할 필요가 있다. 이 정책은 단순한 등록금 지원을 넘어 지방대학 선택에 어떤 변화를 만드는지까지 추적할 가치가 있다.'
      ]
    },
    {
      heading: '확인해야 할 적용 기준',
      table: {
        headers: ['구분', '현재 확인된 내용'],
        rows: [
          ['시작 시점', '2027학년도 신입생부터 추진'],
          ['대상 대학', '지방국립대 30개교'],
          ['확대 계획', '2030년 전 학년까지 단계 확대'],
          ['추가 확인', '제외 계열·성적·학적변동·재입학 세부 기준']
        ]
      }
    }
  ],
  sources: [
    { name: '매일신문 원문', url: 'https://www.imaeil.com/page/view/2026102113403074389' },
    { name: '교육부 2027년 예산안 자료', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=340&boardSeq=107363&lev=0&m=040401&opType=N&page=1&s=moe' },
    { name: '연합뉴스 관련 보도', url: 'https://www.yna.co.kr/view/AKR20260827168900530' },
    { name: '오마이뉴스 관련 보도', url: 'https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0003277419' }
  ]
};

window.ARTICLE_CONTENTS['admissions-perfect-scorers-20261022'] = {
  sections: [
    {
      paragraphs: [
        '베리타스알파가 공개정보를 바탕으로 2017~2026학년도 수능 만점자 69명을 분석한 결과 외대부고가 6명으로 가장 많았고, 서울과고와 중동고가 각각 4명, 민사고가 3명으로 집계됐다. 다만 이 학교별 집계는 한국교육과정평가원이 발표한 공식 학교별 통계가 아니라 언론사가 공개된 개인 정보를 모아 분석한 결과다.',
        '진학 흐름에서는 자연계 만점자의 의대 선호가 두드러졌다. 기사 분석에 따르면 자연계 만점자 37명 중 신원이 공개되지 않은 1명을 제외한 36명 가운데 33명이 의대로 진학했다. 서울대 의예 진학자가 19명으로 가장 많았다고 정리됐다.',
        '재학생과 N수생의 비중은 기간을 어떻게 잡느냐에 따라 다른 모습이 나타난다. 최근 10년 전체에서는 재학생 만점자가 39명으로 N수생 30명보다 많았지만, 최근 3년만 보면 N수생 9명과 재학생 8명으로 N수생이 근소하게 앞섰다. 한 해의 결과만으로 장기 추세를 판단하기 어려운 이유다.',
        '이 자료에서 가장 주의할 점은 만점자 수를 학교의 교육력 순위로 읽지 않는 것이다. 만점자는 전체 수험생 가운데 극소수이고, 학생 선발 특성, 개인 학습환경, 사교육, 졸업 후 N수 여부 등이 함께 작용한다. 특정 학교가 몇 명의 만점자를 냈다는 사실만으로 학교 전체의 교육성과를 평가할 수는 없다.',
        '따라서 이 자료의 가치는 순위보다 장기 흐름에 있다. 최상위권 학생의 진학 선택이 의대로 얼마나 집중되는지, 재학생과 N수생의 비중이 어떻게 변하는지, 앞으로 AI·반도체 등 이공계 선택이 실제로 확대되는지를 연도별로 추적할 때 더 의미 있는 데이터가 될 수 있다.'
      ]
    },
    {
      heading: '기사에서 집계한 주요 수치',
      table: {
        headers: ['항목', '수치'],
        rows: [
          ['2017~2026학년도 수능 만점자', '69명'],
          ['재학생 / N수생', '39명 / 30명'],
          ['외대부고', '6명'],
          ['서울과고·중동고', '각 4명'],
          ['민사고', '3명']
        ]
      }
    }
  ],
  sources: [
    { name: '베리타스알파 원문', url: 'https://www.veritas-a.com/news/articleView.html?idxno=632616' },
    { name: '교육부·평가원 2026학년도 수능 채점 결과', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104758&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W' },
    { name: '정책브리핑 채점 결과 브리핑', url: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156733254' }
  ]
};

window.ARTICLE_CONTENTS['digital-bcg-ai-pioneers-20261022'] = {
  sections: [
    {
      paragraphs: [
        '보스턴컨설팅그룹(BCG)이 발표한 ‘AI Maturity Matrix 2026’에서 한국이 일본과 함께 최상위 ‘AI Pioneers’ 그룹에 새로 진입했다. 기존 선도 그룹에는 미국, 중국 본토, 영국, 싱가포르, 캐나다가 포함돼 있었다.',
        'BCG는 한국이 국내 AI 모델 개발에서 성과를 보였고 컴퓨팅 인프라와 AI 생태계 구축을 위한 투자를 확대해 왔다는 점을 평가했다. 이번 매트릭스는 AI가 산업과 일자리에 미칠 잠재적 영향과 이를 활용할 국가의 준비도를 함께 살펴보는 방식이다.',
        '교육 관점에서는 한 단계 구분이 필요하다. 한국의 국가 AI 준비도가 높아졌다는 사실이 곧 학교 AI교육의 성과를 의미하지는 않는다. 보고서의 핵심은 산업·정책·인프라·생태계를 포함한 국가 차원의 실행력이다.',
        '다만 AI 활용이 산업 전반으로 확산될수록 학생에게 필요한 기본 AI 리터러시, 대학의 고급 AI 인재 양성, 교사의 AI 활용 역량이 더 중요해질 가능성은 있다. 이 결과는 “한국이 AI 선도국이 됐다”는 순위 기사보다 국가 AI 경쟁력 상승이 실제 교육정책과 학교 현장에서 어떤 변화로 이어지는지 질문하는 출발점으로 보는 것이 적절하다.'
      ]
    }
  ],
  sources: [
    { name: '아시아경제 원문', url: 'https://view.asiae.co.kr/article/2026102014324418505' },
    { name: 'BCG 공식 보고서', url: 'https://www.bcg.com/publications/2026/countries-most-ready-for-ai' },
    { name: 'BCG 공식 보도자료', url: 'https://www.bcg.com/press/20october2026-execution-not-ambition-separates-ai-economies' },
    { name: 'BCG 보고서 PDF', url: 'https://web-assets.bcg.com/1b/2d/af9b81e3401e9e1838b9256754c3/ai-maturity-matrix-2026-oct-2026-web.pdf' }
  ]
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addAiFocusSchoolToHome, { once: true });
} else {
  addAiFocusSchoolToHome();
}

function addAiFocusSchoolToHome() {
  const categoryLink = document.querySelector('.side-category[href="category.html?type=digital"]');
  const item = categoryLink?.closest('.side-item');
  if (!item || item.querySelector('a[href="article.html?id=digital-ai-focus-schools-2026"]')) return;

  const link = document.createElement('a');
  link.className = 'side-story';
  link.href = 'article.html?id=digital-ai-focus-schools-2026';
  link.textContent = '교육부, AI 중점학교 1,141개교 본격 운영';
  categoryLink.insertAdjacentElement('afterend', link);
}
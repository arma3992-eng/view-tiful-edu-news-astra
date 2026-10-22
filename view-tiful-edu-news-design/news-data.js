'use strict';
// 분야별 기사 목록과 뉴스 페이지가 같은 데이터를 사용합니다.
// 기사 배열: [제목, 요약, 이미지 이름, 고유 ID]. ID는 발행 후 바꾸지 않습니다.
window.CATEGORY_NEWS = {
  "admissions": {
    "title": "입시•수능",
    "description": "전형을 이해하고, 나의 방향을 찾아봅니다.",
    "articles": [
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
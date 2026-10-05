'use strict';
// 분야별 기사 목록과 뉴스 페이지가 같은 데이터를 사용합니다.
// 기사 배열: [제목, 요약, 이미지 이름, 고유 ID]. ID는 발행 후 바꾸지 않습니다.
// 실제 기사 본문이 아직 없는 항목은 제목과 준비 안내를 표시합니다.
window.CATEGORY_NEWS = {
  "admissions": {
    "title": "입시•수능",
    "description": "전형을 이해하고, 나의 방향을 찾아봅니다.",
    "articles": [
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
      [
        "수시 모집요강, 어떤 항목부터 읽을까",
        "",
        "admission",
        "admissions-f9c2f9ab4a"
      ],
      [
        "진로가 바뀌었다면 학습 기록부터 점검",
        "",
        "admission",
        "admissions-5b4ff5cd3a"
      ],
      [
        "면접 준비, 외운 답보다 경험의 맥락",
        "",
        "admission",
        "admissions-04f3128539"
      ],
      [
        "과목 선택과 진로를 연결하는 방법",
        "",
        "admission",
        "admissions-af7d1ffcfe"
      ],
      [
        "입시 일정표에 함께 적어둘 준비 과정",
        "",
        "admission",
        "admissions-c885a1f1af"
      ]
    ]
  },
  "gifted": {
    "title": "영재•특목",
    "description": "영재교육과 특목고 관련 교육뉴스를 모아봅니다.",
    "articles": []
  },
  "digital": {
    "title": "AI•디지털교육",
    "description": "새로운 기술을 넘어, 배움과 생각하는 힘을 살펴봅니다.",
    "articles": [
      [
        "AI가 들어온 교실, 질문하는 힘은 더 중요해졌다",
        "정답을 빠르게 찾는 것만으로는 충분하지 않다. AI의 답을 비교하고 근거를 묻는 수업, 학생의 생각을 넓히는 도구로 활용하려면 무엇이 필요할까.",
        "classroom",
        "lead-1"
      ],
      [
        "그럴듯한 AI 답변, 사실과 의견을 나누어 읽기",
        "기술을 넘어, 생각하는 힘으로",
        "ai",
        "digital-a9cef38658"
      ],
      [
        "학습 앱을 고르기 전, 먼저 물어야 할 세 가지",
        "기능이 많다고 좋은 도구일까, 학습 목적과 접근성, 개인정보 기준을 함께 점검한다.",
        "tablet",
        "digital-3d15aeb016"
      ],
      [
        "생성형 AI와 함께 쓰는 탐구 질문",
        "",
        "ai",
        "digital-0ef4a7eae3"
      ],
      [
        "AI 활용 과제, 과정 기록이 중요한 이유",
        "",
        "ai",
        "digital-a898af1345"
      ],
      [
        "교실에서 함께 정하는 AI 사용 약속",
        "",
        "ai",
        "digital-65b1609011"
      ],
      [
        "학습 앱 선택 전, 데이터 권한 확인",
        "",
        "tablet",
        "digital-2a3a864206"
      ],
      [
        "교사의 피드백을 돕는 디지털 도구",
        "",
        "tablet",
        "digital-fc2a6e0a10"
      ],
      [
        "AI 답변의 출처를 확인하는 수업",
        "",
        "ai",
        "digital-e71be78a38"
      ],
      [
        "과제 속 AI 활용, 어디까지 허용할까",
        "",
        "ai",
        "digital-22a7d4ec76"
      ]
    ]
  },
  "school-policy": {
    "title": "학교•교육정책",
    "description": "정책의 변화와 학교 현장의 배움을 함께 읽습니다.",
    "articles": [
      [
        "돌봄과 배움 사이, 방과 후 시간의 새로운 질문",
        "프로그램 수보다 중요한 것은 아이의 하루. 학교와 지역이 함께 만드는 연결을 살펴본다.",
        "after-school",
        "school-policy-19970d436a"
      ],
      [
        "틀려도 괜찮은 교실, 피드백이 배움이 되는 순간",
        "점수보다 과정에 주목하는 수업의 풍경. 다시 도전할 수 있는 말과 기록을 찾아본다.",
        "feedback",
        "school-policy-c214e106fd"
      ],
      [
        "교육 지원을 알아볼 때, 우리 학교 안내부터 확인하기",
        "제도 변화의 맥락을 읽습니다",
        "policy",
        "school-policy-ade8c6ee91"
      ],
      [
        "학생의 제안으로 바뀌는 학교의 작은 공간들",
        "배움이 일어나는 현장의 목소리",
        "school",
        "school-policy-9d343fa5af"
      ],
      [
        "디지털 교육, 기기보다 지원 체계가 먼저",
        "",
        "policy",
        "school-policy-02bd8df9bb"
      ],
      [
        "학교별 안내를 함께 살펴야 하는 이유",
        "",
        "policy",
        "school-policy-e74dc62c81"
      ],
      [
        "정책 용어 쉽게 읽기: 교육과정이란",
        "",
        "policy",
        "school-policy-46a8ccec0e"
      ],
      [
        "학교와 지역의 협력, 무엇이 달라질까",
        "",
        "policy",
        "school-policy-74f1bbc11f"
      ],
      [
        "교육 소식 속 시행 시기 구분하는 법",
        "",
        "policy",
        "school-policy-f853453768"
      ],
      [
        "친구의 생각을 듣는 토론 수업의 시작",
        "",
        "school",
        "school-policy-ddfcfcdddd"
      ],
      [
        "아침 독서, 짧아도 깊어지는 시간",
        "",
        "school",
        "school-policy-379209dffc"
      ],
      [
        "지역의 일상을 교과서로 삼는 수업",
        "",
        "school",
        "school-policy-9d54c2a0c8"
      ],
      [
        "짧은 대화로 시작하는 아침 교실",
        "",
        "school",
        "school-policy-56b4235ed4"
      ],
      [
        "학생이 직접 제안하는 학교 공간",
        "",
        "school",
        "school-policy-3c17873e10"
      ]
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

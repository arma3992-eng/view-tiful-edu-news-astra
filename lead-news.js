'use strict';
// 당일 대표뉴스 3개를 이곳에서 수정합니다. 캐러셀과 기사 요약이 함께 바뀝니다.
// image: assets 폴더의 이미지 이름(확장자 제외)
// video: 메인에서 재생할 영상 경로. 예: 'assets/news-1-preview.mp4'
// fullVideo: 확대해서 볼 전체 영상 경로. 비워두면 video와 같은 영상을 재생합니다.
// 영상 경로를 비워두면 image 사진을 표시합니다.
window.LEAD_NEWS = [
  {
    id: 'lead-1', navCategory: 'digital',
    category: 'AI교육 · 교육의 변화', tabCategory: 'AI교육', teaser: '답을 찾는 도구를 넘어, 생각을 넓히는 수업으로',
    title: 'AI가 들어온 교실,<br>질문하는 힘은 더 중요해졌다',
    image: 'classroom', video: '', fullVideo: '',
    alt: '교실에서 함께 공부하는 학생과 교사',
    description: '정답을 빠르게 찾는 것만으로는 충분하지 않다. AI의 답을 비교하고 근거를 묻는 수업,<br>학생의 생각을 넓히는 도구로 활용하려면 무엇이 필요할까.',
    readingLabel: '기획 기사 • 2분 읽기',
    summary: ['정답을 빠르게 찾는 것만으로는 충분하지 않습니다.', 'AI의 답을 비교하고 근거를 묻는 수업을 생각해봅니다.', 'AI를 학생의 생각을 넓히는 도구로 활용하려면 무엇이 필요한지 살펴봅니다.']
  },
  {
    id: 'lead-2', navCategory: 'admissions',
    category: '입시 · 진로 탐색', tabCategory: '입시', teaser: '관심 분야와 학습 기록을 연결하는 진로 탐색',
    title: '대입 준비의 시작,<br>전형보다 나를 먼저 살피기',
    image: 'feedback', video: '', fullVideo: '',
    alt: '교사와 학생이 함께 학습 기록을 살피는 모습',
    description: '관심 분야와 학습 기록을 연결하는 진로 탐색.<br>내가 좋아하는 것과 배워온 과정에서 다음 선택의 실마리를 찾아봅니다.',
    readingLabel: '기획 기사 • 2분 읽기',
    summary: ['관심 분야와 학습 기록을 연결해봅니다.', '내가 좋아하는 것과 배워온 과정을 함께 살펴봅니다.', '그 과정에서 다음 선택의 실마리를 찾아봅니다.']
  },
  {
    id: 'lead-3', navCategory: 'school-policy',
    category: '학교 · 교육현장', tabCategory: '학교 · 교육현장', teaser: '조용한 열람실에서 대화가 있는 배움의 공간으로',
    title: '함께 읽고 서로 묻는 시간,<br>학교 도서관의 새로운 역할',
    image: 'after-school', video: '', fullVideo: '',
    alt: '함께 활동하며 배우는 학생들',
    description: '조용한 열람실에서 대화가 있는 배움의 공간으로.<br>함께 읽고 생각을 나누는 시간이 학교의 일상을 바꿉니다.',
    readingLabel: '기획 기사 • 2분 읽기',
    summary: ['학교 도서관을 대화가 있는 배움의 공간으로 바라봅니다.', '함께 읽고 생각을 나누는 시간에 주목합니다.', '학교의 일상과 배움의 공간을 연결해봅니다.']
  }
];

'use strict';
// 2026-11-05 교차검증 완료. 종로학원 집계임을 명시하고 자체 재집계로 표시하지 않습니다.
(() => {
 const story = {"id":"admissions-math-score-20261102","navCategory":"admissions","category":"입시·수능","title":"고1 수학 평균 66.3점…5등급제에서도 주요 교과 3년 연속 최저","description":"종로학원이 학교알리미 공시자료를 분석한 결과, 2026년 전국 일반고 1,679개교 고1 수학 평균은 66.3점으로 주요 5개 교과 가운데 가장 낮았다. 원자료는 독립 재집계하지 않았다.","image":"admissions-math-score-20261102","alt":"고등학교 학생들이 수학 성적과 학습을 살피는 모습을 표현한 AI 생성 연출 이미지","readingLabel":"입시·수능 · 데이터 분석 · 4분 읽기","publishedAt":"2026-11-05T17:32:15+09:00","updatedAt":"2026-11-05T17:32:15+09:00","summary":["종로학원이 학교알리미 공시자료를 분석한 결과, 2026년 일반고 1,679개교 고1 수학 평균은 66.3점으로 주요 5개 교과 중 가장 낮았습니다.","수학 A등급(성취도 90점 이상) 비율도 20.2%로 가장 낮았으며, 평균점수와 A등급 비율은 2024~2026년 모두 주요 교과 중 최저였습니다.","내신 등급제 전환 때문에 수학이 더 어려워졌다고 단정할 수 없으며, View-tiful Edu가 학교별 원자료를 독립 재집계한 결과는 아닙니다."]};
 const sections = [{"paragraphs":["2026년 고등학교 1학년의 1학기 수학 평균점수가 주요 교과 가운데 가장 낮은 것으로 나타났다. 이는 종로학원이 학교알리미에 공시된 전국 일반고 1,679개교의 자료를 분석한 결과로, View-tiful Edu가 개별 학교 자료를 새로 집계한 통계는 아니다.","종로학원 분석에 따르면 올해 고1 수학 평균은 66.3점이다. 국어 71.3점, 사회 71.2점, 과학 68.9점, 영어 67.2점보다 낮다. 수학은 2024년 63.6점, 2025년 67.3점에 이어 올해까지 3년 연속 주요 5개 교과 중 최저 평균을 기록했다.","원점수 90점 이상인 성취도 A등급 비율도 수학이 20.2%로 가장 낮았다. 사회는 23.2%, 영어는 22.4%, 과학은 21.3%, 국어는 21.1%였다. 수학 A등급 비율은 2024년 17.6%, 2025년 21.5%, 2026년 20.2%로 나타났다.","이 숫자만으로 '내신 5등급제 때문에 수학이 더 어려워졌다'고 단정해서는 안 된다. 원점수 평균과 내신 상대등급은 서로 다른 지표이며 학교별 시험 난도와 학생 구성도 다르다. 실제 수학 평균은 9등급제였던 2024년보다 2025년과 2026년에 더 높았다.","현재 고1이 응시할 2029학년도 수능은 2028학년도부터 도입되는 통합형 체제를 적용한다. 수학 선택과목이 폐지되는 점은 공식적으로 확인되지만, 이를 근거로 특정 과목의 변별력이나 대학별 반영 방식이 확정됐다고 해석할 수는 없다. 분석 대상 학교와 점수의 독립 재집계는 아직 수행하지 못했다."]},{"heading":"종로학원 분석 주요 수치","table":{"headers":["지표","2026년 고1 1학기"],"rows":[["분석 대상","전국 일반고 1,679개교"],["국어 평균","71.3점"],["수학 평균","66.3점"],["영어 평균","67.2점"],["사회 평균","71.2점"],["과학 평균","68.9점"],["수학 A등급 비율","20.2%"]]}}];
 const sources = [{"name":"연합뉴스 | 종로학원의 학교알리미 분석 보도","url":"https://www.yna.co.kr/view/AKR20261101016300530"},{"name":"뉴시스 | 고1 수학 성취도 교차보도","url":"https://www.newsis.com/view/?id=NISX20261030_0003848137"},{"name":"교육부 | 2028학년도 대입 개편 안내","url":"https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=72722&boardSeq=103144&lev=0"},{"name":"학교알리미 | 학교별 공시 원자료","url":"https://www.schoolinfo.go.kr/"}];
 const guide = {"enabled":true,"audiences":[{"label":"고1 학생","title":"등급과 성취도를 따로 점검하세요","sections":[{"type":"check","items":[{"text":"자신의 수학 원점수·성취도·학교별 평가기준을 확인하고, 전국 평균을 자신의 성적과 바로 비교하지 마세요."}]}]},{"label":"학부모","title":"평균점수만으로 시험 난도를 단정하지 마세요","sections":[{"type":"think","items":[{"text":"종로학원 분석은 전국 단위 경향을 보여주며 학교별 시험 난도나 특정 학생의 학습 수준을 직접 설명하지 않습니다."}]}]}]};
 const group = window.CATEGORY_NEWS?.[story.navCategory];
 if (!group) return;
 if (!group.articles.some(item => item[3] === story.id)) group.articles.unshift([story.title,story.description,story.image,story.id,story.category]);
 window.ARCHIVE_ARTICLES = window.ARCHIVE_ARTICLES || [];
 if (!window.ARCHIVE_ARTICLES.some(item => item.id === story.id)) window.ARCHIVE_ARTICLES.unshift(story);
 window.ARTICLE_CONTENTS = window.ARTICLE_CONTENTS || {};
 window.ARTICLE_CONTENTS[story.id] = {sections,sources};
 window.READER_GUIDE_ADDITIONS = window.READER_GUIDE_ADDITIONS || {};
 window.READER_GUIDE_ADDITIONS[story.id] = {approval_id:'user-approved-20261105',article_title:story.title,reader_guide:guide,sources};
})();

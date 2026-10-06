'use strict';
// 대표뉴스는 lead-news.js에서 관리합니다.
const slides = window.LEAD_NEWS;
const guides = [
 {title:'AI가 들어온 교실, 질문하는 힘은 더 중요해졌다',roles:[[['과제에서 AI를 사용해도 되는 범위','AI 답변의 출처와 사실 여부'],['내가 쓴 질문과 답을 비교한 과정을 기록해요.','AI의 설명을 내 말로 다시 정리하고, 궁금한 점을 하나 더 찾아요.']],[['학교의 AI 활용 안내와 계정 사용 기준','서비스의 연령 조건과 개인정보 설정'],['“어떤 답을 받았니?”보다 “왜 그렇게 생각했니?”라고 물어보세요.','사용 시간과 입력하면 안 되는 정보를 자녀와 함께 정해주세요.']],[['수업 목표에 맞는 AI 활용 범위','평가 기준과 학생 간 접근성의 차이'],['허용되는 활용 예시와 출처 표기 방식을 과제 안내에 담아주세요.','최종 결과뿐 아니라 질문 · 검증 · 수정 과정을 볼 수 있는 기록을 설계하세요.']]]},
 {title:'돌봄과 배움 사이, 방과 후 시간의 새로운 질문',roles:[[['참여하고 싶은 활동과 운영 시간','귀가 방법과 쉬는 시간'],['나에게 필요한 활동과 휴식 시간을 생각해요.','활동 중 궁금하거나 불편한 점을 선생님께 이야기해요.']],[['학교의 신청 일정과 운영 안내','비용, 귀가 지원과 안전 관리'],['자녀의 관심과 하루 일정을 함께 살펴보세요.','세부 조건은 학교의 공식 안내에서 확인하세요.']],[['학생의 참여 여건과 지원 필요','학교와 지역 프로그램의 연결'],['학생 의견을 듣고 활동과 휴식의 균형을 점검하세요.','보호자가 확인할 운영 기준을 명확히 안내하세요.']]]},
 {title:'학습 앱을 고르기 전, 먼저 물어야 할 세 가지',roles:[[['앱이 내가 배우려는 내용에 맞는지','가입할 때 요구하는 정보'],['앱을 쓸 목표와 시간을 정해요.','학습 결과를 내 말로 설명할 수 있는지 확인해요.']],[['서비스의 연령 기준과 결제 조건','수집하는 개인정보와 삭제 방법'],['자녀와 필요한 기능부터 비교해보세요.','알림과 결제 설정을 함께 점검하세요.']],[['수업 목표와 기능의 연관성','접근성과 학습 데이터 처리 기준'],['학생의 기기 여건을 확인하고 대체 활동을 준비하세요.','도입 전 학교의 관련 기준과 서비스 약관을 확인하세요.']]]}
];
const $ = s => document.querySelector(s);
const dialog = $('#detail-dialog');
function openDialog(title, text){stopDialogMedia();const content=$('#dialog-content');content.replaceChildren();const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=text;content.append(h);if(text)content.append(p);if(!dialog.open)dialog.showModal();resetAutoAdvance();}
function article(title){openDialog(title,'메인페이지 디자인 확인용 예시 기사입니다. 실제 기사 본문과 출처는 콘텐츠 확정 후 연결할 예정입니다.');}
let current = 0;
const hero = $('.hero');
const previewVideo = $('#hero-video');
const slideTabs = [...document.querySelectorAll('[data-slide]')];
const slideTabGroup = $('.slide-tabs');
const autoButton = $('#carousel-toggle');
const AUTO_ADVANCE_MS = 8000; // 자동 전환 간격: 8초
let autoTimer = null;
let hoverPaused = false;
let focusPaused = false;
let userPaused = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

function resetAutoAdvance() {
  window.clearTimeout(autoTimer);
  autoTimer = null;
  if (userPaused || hoverPaused || focusPaused || document.hidden || dialog.open) return;
  autoTimer = window.setTimeout(() => { showSlide(current + 1); resetAutoAdvance(); }, AUTO_ADVANCE_MS);
}
function updateAutoButton() {
  autoButton.textContent = userPaused ? '▶' : 'Ⅱ';
  autoButton.setAttribute('aria-pressed', String(userPaused));
  autoButton.setAttribute('aria-label', userPaused ? '대표뉴스 자동 넘김 재생' : '대표뉴스 자동 넘김 일시정지');
  autoButton.title = autoButton.getAttribute('aria-label');
}
function stopPreviewVideo() {
  if (!previewVideo.getAttribute('src')) return;
  previewVideo.pause();
  previewVideo.removeAttribute('src');
  previewVideo.load();
}
function showImageMedia() {
  $('#image-open').hidden = false;
  previewVideo.hidden = true;
  $('#video-open').hidden = true;
}
function renderMedia(story) {
  stopPreviewVideo();
  const poster = `assets/${story.image}.jpg`;
  $('#hero-image').src = poster;
  $('#hero-image').alt = story.alt;
  $('#image-open').setAttribute('aria-label', story.title.replace('<br>', ' ') + ' 이미지 크게 보기');
  showImageMedia();
  if (!story.video) return;
  previewVideo.poster = poster;
  previewVideo.src = story.video;
  previewVideo.hidden = false;
  $('#image-open').hidden = true;
  $('#video-open').hidden = false;
  $('#video-open').setAttribute('aria-label', story.title.replace('<br>', ' ') + ' 전체 영상 보기');
  previewVideo.play()?.catch(() => {});
}
previewVideo.addEventListener('error', () => { previewVideo.pause(); showImageMedia(); });

function showSlide(index, announce = false) {
  current = (index + slides.length) % slides.length;
  const story = slides[current];
  renderMedia(story);
  $('#hero-category').textContent = story.category;
  $('#hero-title').innerHTML = story.title;
  $('#hero-description').innerHTML = story.description;
  $('#slide-number').textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  $('#hero-summary-link').textContent = story.readingLabel;
  $('#hero-summary-link').href = `article.html?id=${encodeURIComponent(story.id)}#summary`;
  slideTabGroup.dataset.activeSlide = String(current);
  slideTabs.forEach((button, i) => {
    button.setAttribute('aria-selected', String(i === current));
    button.tabIndex = i === current ? 0 : -1;
    button.setAttribute('aria-controls', 'hero-story');
    // 하단 기사 제목도 같은 데이터에서 가져옵니다.
    button.querySelector('small').textContent = `${String(i + 1).padStart(2, '0')}　${slides[i].tabCategory}`;
    button.querySelector('strong').innerHTML = slides[i].title;
    button.querySelector('span').textContent = slides[i].teaser;
  });
  $('#hero-story').setAttribute('aria-labelledby', slideTabs[current].id);
  if (announce) $('#status').textContent = `${current + 1}번째 대표뉴스: ${story.title.replace('<br>', ' ')}`;
}
function selectSlide(index) { showSlide(index, true); resetAutoAdvance(); }
$('#previous').addEventListener('click', () => selectSlide(current - 1));
$('#next').addEventListener('click', () => selectSlide(current + 1));
slideTabs.forEach(button => button.addEventListener('click', () => selectSlide(Number(button.dataset.slide))));
autoButton.addEventListener('click', () => { userPaused = !userPaused; updateAutoButton(); resetAutoAdvance(); });
hero.addEventListener('mouseenter', () => { hoverPaused = true; resetAutoAdvance(); });
hero.addEventListener('mouseleave', () => { hoverPaused = false; resetAutoAdvance(); });
hero.addEventListener('focusin', () => { focusPaused = true; resetAutoAdvance(); });
hero.addEventListener('focusout', event => { focusPaused = hero.contains(event.relatedTarget); resetAutoAdvance(); });
document.addEventListener('visibilitychange', resetAutoAdvance);

function stopDialogMedia() { dialog.querySelector('video')?.pause(); }
function openMedia() {
  const story = slides[current];
  const isVideo = !previewVideo.hidden && Boolean(story.video);
  openDialog(story.title.replace('<br>', ' '), '');
  if (isVideo) {
    previewVideo.pause();
    const video = document.createElement('video');
    video.className = 'full-story-video';
    video.controls = true;
    video.playsInline = true;
    video.poster = `assets/${story.image}.jpg`;
    video.src = story.fullVideo || story.video;
    $('#dialog-content').append(video);
    video.play()?.catch(() => {});
  } else {
    const image = document.createElement('img');
    image.src = `assets/${story.image}.jpg`;
    image.alt = story.alt;
    $('#dialog-content').append(image);
  }
}
$('#image-open').addEventListener('click', openMedia);
$('#video-open').addEventListener('click', openMedia);
dialog.addEventListener('close', () => {
  stopDialogMedia();
  if (!previewVideo.hidden && previewVideo.getAttribute('src')) previewVideo.play()?.catch(() => {});
  resetAutoAdvance();
});
showSlide(0);
updateAutoButton();
resetAutoAdvance();

const icons=['<path d="m2 9 10-5 10 5-10 5zM6 11v6q6 5 12 0v-6M22 9v9"/>','<circle cx="9" cy="7" r="3"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M16 4a3 3 0 0 1 0 6M18 13q5 0 5 7"/>','<path d="M3 4h18v12H3zM12 16v5M7 23l5-5 5 5"/>'];
const roleNames=['학생','학부모','교사'],roleDescriptions=['내 생각을 넓히는 연습','결과보다 과정을 함께 보기','수업의 목표부터 분명하게'];let guideIndex=0;
function showGuide(index){guideIndex=index;const g=guides[index];$('#guide-title').textContent=g.title;document.querySelectorAll('[data-guide]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.querySelector('i').textContent=i===index?'✓':'›';});$('#role-grid').innerHTML=g.roles.map((r,i)=>`<article class="role"><div class="role-heading"><span class="role-icon"><svg viewBox="0 0 26 26" aria-hidden="true">${icons[i]}</svg></span><div><h3>${roleNames[i]}</h3><p>${roleDescriptions[i]}</p></div></div><h4>먼저 확인하세요</h4><ul>${r[0].map(t=>`<li>${t}</li>`).join('')}</ul><div class="role-prep"><h4>이렇게 준비해보세요</h4><ul>${r[1].map(t=>`<li>${t}</li>`).join('')}</ul></div></article>`).join('');}
document.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>showGuide(Number(b.dataset.guide))));showGuide(0);$('#guide-read').addEventListener('click',()=>article(guides[guideIndex].title));
document.querySelectorAll('[data-article]').forEach(b=>b.addEventListener('click',()=>article(b.dataset.article)));
const info={about:['매체 소개','학생·학부모·교사가 중요한 교육 이슈를 빠르게 이해하도록 돕는 교육뉴스 큐레이션·해설 서비스의 디자인 시안입니다.'],editorial:['편집 원칙','공식 자료와 신뢰할 수 있는 출처를 확인하고, 무슨 일인가 → 왜 중요한가 → 무엇을 알아야 하는가의 흐름으로 설명합니다.'],contact:['제보 · 문의','문의 채널은 서비스 운영 준비 후 연결할 예정입니다.'],privacy:['개인정보처리방침','현재는 디자인 확인용 정적 페이지입니다. 검색어는 서버로 전송하거나 저장하지 않습니다. 정식 서비스의 처리방침은 운영 범위 확정 후 작성합니다.'],guide:['독자를 위한 뉴스 가이드','기사를 선택하고 학생·학부모·교사별 확인사항과 준비사항을 살펴보세요. 모든 내용은 디자인 확인용 예시이며 실제 기준은 공식 안내에서 확인해야 합니다.']};
document.querySelectorAll('[data-info]').forEach(b=>b.addEventListener('click',()=>openDialog(...info[b.dataset.info])));
$('.close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('.search').addEventListener('submit',e=>{e.preventDefault();const query=$('.search input').value.trim();if(!query){$('.search input').focus();return;}const titles=[...new Set([...document.querySelectorAll('[data-article],.side-story')].map(b=>b.dataset.article||b.textContent).concat(slides.map(s=>s.title.replace('<br>',' '))))];const results=titles.filter(t=>t.toLocaleLowerCase().includes(query.toLocaleLowerCase()));openDialog('검색 결과',results.length?`“${query}” 관련 예시 기사 ${results.length}건`:`“${query}”에 해당하는 예시 기사가 없습니다.`);const ul=document.createElement('ul');results.forEach(t=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=t;b.addEventListener('click',()=>article(t));li.append(b);ul.append(li);});$('#dialog-content').append(ul);});
// 키보드 좌우 화살표로 탭 전환
for(const [selector,show,attribute] of [['[data-slide]',selectSlide,'slide'],['[data-guide]',showGuide,'guide']]){const tabs=[...document.querySelectorAll(selector)];tabs.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();show(Number(tabs[next].dataset[attribute]));}));}

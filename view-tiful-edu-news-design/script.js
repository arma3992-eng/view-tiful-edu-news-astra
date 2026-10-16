'use strict';
// 대표뉴스는 lead-news.js에서 관리합니다.
const slides = window.LEAD_NEWS;
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

window.ReaderGuide.home();

document.querySelectorAll('[data-article]').forEach(b=>b.addEventListener('click',()=>article(b.dataset.article)));
const info={about:['매체 소개','학생·학부모·교사가 중요한 교육 이슈를 빠르게 이해하도록 돕는 교육뉴스 큐레이션·해설 서비스의 디자인 시안입니다.'],editorial:['편집 원칙','공식 자료와 신뢰할 수 있는 출처를 확인하고, 무슨 일인가 → 왜 중요한가 → 무엇을 알아야 하는가의 흐름으로 설명합니다.'],contact:['제보 · 문의','문의 채널은 서비스 운영 준비 후 연결할 예정입니다.'],privacy:['개인정보처리방침','현재는 디자인 확인용 정적 페이지입니다. 검색어는 서버로 전송하거나 저장하지 않습니다. 정식 서비스의 처리방침은 운영 범위 확정 후 작성합니다.'],guide:['독자를 위한 뉴스 가이드','기사를 선택하면 편집자가 승인한 독자별 영향·확인사항·준비사항·행동·생각거리를 볼 수 있습니다. 기사마다 대상과 항목이 다르며 실제 기준은 연결한 공식 근거를 확인하세요.']};
document.querySelectorAll('[data-info]').forEach(b=>b.addEventListener('click',()=>openDialog(...info[b.dataset.info])));
$('.close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('.search').addEventListener('submit',e=>{e.preventDefault();const query=$('.search input').value.trim();if(!query){$('.search input').focus();return;}const titles=[...new Set([...document.querySelectorAll('[data-article],.side-story')].map(b=>b.dataset.article||b.textContent).concat(slides.map(s=>s.title.replace('<br>',' '))))];const results=titles.filter(t=>t.toLocaleLowerCase().includes(query.toLocaleLowerCase()));openDialog('검색 결과',results.length?`“${query}” 관련 예시 기사 ${results.length}건`:`“${query}”에 해당하는 예시 기사가 없습니다.`);const ul=document.createElement('ul');results.forEach(t=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=t;b.addEventListener('click',()=>article(t));li.append(b);ul.append(li);});$('#dialog-content').append(ul);});
// 키보드 좌우 화살표로 탭 전환
for(const [selector,show,attribute] of [['[data-slide]',selectSlide,'slide']]){const tabs=[...document.querySelectorAll(selector)];tabs.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();show(Number(tabs[next].dataset[attribute]));}));}

'use strict';
// 분야별 기사 데이터는 news-data.js에서 관리합니다.
const categoryPages = window.CATEGORY_NEWS;

const pageKind = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const requestedType = params.get('type') || 'all';
const type = Object.hasOwn(categoryPages, requestedType) ? requestedType : 'all';
const currentPage = type === 'all' ? {
  title: '교육뉴스', description: '관심 있는 교육 소식을 찾아보세요.',
  articles: Object.values(categoryPages).flatMap(group => group.articles.map(a => [...a, group.title]))
} : categoryPages[type];

// 현재 열린 분야에만 선택 표시를 적용합니다.
const activeKey = pageKind === 'about' ? 'about' : (document.body.dataset.navCategory || type);
document.querySelectorAll('[data-nav]').forEach(link => {
  if (link.dataset.nav === activeKey) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }
});

const dialog = document.querySelector('#detail-dialog');
function showInfo(title, paragraphs) {
  const content = document.querySelector('#dialog-content');
  content.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = title;
  content.append(heading);
  paragraphs.filter(Boolean).forEach(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    content.append(paragraph);
  });
  if (!dialog.open) dialog.showModal();
}
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
const footerInfo = {
  editorial: ['편집 원칙', ['공식 자료와 신뢰할 수 있는 출처를 확인하고, 무슨 일인가 → 왜 중요한가 → 무엇을 알아야 하는가의 흐름으로 설명합니다.']],
  contact: ['제보 · 문의', ['문의 채널은 서비스 운영 준비 후 연결할 예정입니다.']],
  privacy: ['개인정보처리방침', ['현재는 디자인 확인용 정적 페이지입니다. 검색어는 서버로 전송하거나 저장하지 않습니다. 정식 서비스의 처리방침은 운영 범위 확정 후 작성합니다.']]
};
document.querySelectorAll('[data-info]').forEach(button => {
  button.addEventListener('click', () => showInfo(...footerInfo[button.dataset.info]));
});

function renderArticles(query = '') {
  const list = document.querySelector('#article-list');
  const matches = currentPage.articles.filter(a => (a[0] + ' ' + a[1]).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  list.replaceChildren();
  const template = document.querySelector('#article-template');
  matches.forEach(([title, summary, image, id, category]) => {
    const card = template.content.cloneNode(true);
    card.querySelector('img').src = `assets/${image}.jpg`;
    card.querySelector('.category').textContent = category || currentPage.title;
    card.querySelector('.listing-story-title').textContent = title;
    card.querySelector('.listing-summary').textContent = summary;
    if (!summary) card.querySelector('.listing-summary').hidden = true;
    card.querySelector('.listing-cover').setAttribute('aria-label', title + ' 기사 보기');
    card.querySelectorAll('a').forEach(link => {
      link.href = `article.html?id=${encodeURIComponent(id)}`;
    });
    list.append(card);
  });
  document.querySelector('#listing-count').textContent = query ? `“${query}” 검색 결과 ${matches.length}건` : `기사 ${matches.length}건`;
  document.querySelector('#clear-search').hidden = !query;
  document.querySelector('#empty-list').hidden = matches.length > 0;
  document.querySelector('#empty-title').textContent = query ? '검색 결과가 없습니다' : '등록된 기사가 없습니다';
  document.querySelector('#empty-description').textContent = query ? '다른 검색어로 다시 찾아보세요.' : '새로운 기사가 등록되면 이곳에서 확인할 수 있습니다.';
}

if (pageKind === 'category') {
  document.title = `${currentPage.title} | 뷰티풀 에듀`;
  document.querySelector('#listing-title').textContent = currentPage.title;
  document.querySelector('#listing-description').textContent = currentPage.description;
  renderArticles((params.get('q') || '').trim());
  document.querySelector('#clear-search').addEventListener('click', () => {
    document.querySelector('.search input').value = '';
    params.delete('q');
    history.replaceState(null, '', `category.html?${params.toString()}`);
    renderArticles();
  });
}
const search = document.querySelector('.search');
search.querySelector('input').value = params.get('q') || '';
search.addEventListener('submit', event => {
  event.preventDefault();
  const query = search.querySelector('input').value.trim();
  if (pageKind === 'category') {
    if (query) params.set('q', query); else params.delete('q');
    history.replaceState(null, '', `category.html?${params.toString()}`);
    renderArticles(query);
  } else if (query) {
    const queryParams = new URLSearchParams({ type: 'all', q: query });
    location.href = `category.html?${queryParams}`;
  } else {
    search.querySelector('input').focus();
  }
});

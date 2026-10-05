'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const leadStory = window.LEAD_NEWS.find(item => item.id === id);
  const story = leadStory || window.ARCHIVE_ARTICLES.find(item => item.id === id);
  if (!story) {
    document.querySelector('#article-shell').hidden = true;
    document.querySelector('#article-not-found').hidden = false;
    document.title = '기사를 찾을 수 없습니다 | 뷰티풀 에듀';
    return;
  }
  document.body.dataset.navCategory = story.navCategory;
  document.title = story.title.replace('<br>', ' ') + ' | 뷰티풀 에듀';
  document.querySelector('#article-category').textContent = story.category;
  document.querySelector('#article-title').innerHTML = story.title;
  document.querySelector('#article-meta').textContent = story.readingLabel;
  const image = document.querySelector('#article-image');
  image.src = `assets/${story.image}.jpg`;
  image.alt = story.alt;
  document.querySelector('#article-intro').textContent = story.description ? story.description.replace('<br>', ' ') : '기사 본문을 준비하고 있습니다.';
  document.querySelector('#summary-label').textContent = leadStory ? '2분 읽기' : '기사 요약';
  document.querySelector('#article-summary-empty').hidden = story.summary.length > 0;
  if (!leadStory) {
    const backLink = document.querySelector('#article-back-link');
    backLink.href = `category.html?type=${encodeURIComponent(story.navCategory)}`;
    backLink.textContent = `${story.category} 기사 목록으로 돌아가기 →`;
  }
  const list = document.querySelector('#article-summary-list');
  story.summary.forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  });
  if (location.hash === '#summary') {
    requestAnimationFrame(() => document.querySelector('#summary').scrollIntoView({block: 'start'}));
  }
})();

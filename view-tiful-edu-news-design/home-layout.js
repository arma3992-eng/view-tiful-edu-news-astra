'use strict';

(function () {
  const articleHref = id => `article.html?id=${encodeURIComponent(id)}`;
  const categoryHref = key => `category.html?type=${encodeURIComponent(key)}`;
  const node = (tag, text = '', cls = '') => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const allStories = () => {
    const map = new Map();
    for (const story of [...(window.LEAD_NEWS || []), ...(window.ARCHIVE_ARTICLES || [])]) {
      if (!map.has(story.id)) map.set(story.id, story);
    }
    return map;
  };

  function buildFeatureIndex() {
    const notable = document.getElementById('notable');
    if (!notable) return;
    const deepLink = notable.querySelector('.section-heading > a');
    if (deepLink) {
      deepLink.href = '#features';
      deepLink.textContent = '기획·분석 전체 보기 →';
    }
    if (document.getElementById('features')) return;

    const stories = allStories();
    const picks = [
      ['gifted-dropout-20261015', '데이터 분석'],
      ['admissions-career-credit-20261016', '정책 해설'],
      ['digital-ai-innovation-university-20261015', '정책 추적']
    ];
    const section = node('section', '', 'features-index wrap');
    section.id = 'features';
    const heading = node('div', '', 'section-heading');
    const group = node('div', '', 'heading-group');
    group.append(node('h2', '기획·분석'), node('p', '숫자와 제도의 맥락까지 한 번 더 살펴봅니다'));
    const archive = node('a', '전체 뉴스 아카이브 →');archive.href = 'news.html';
    heading.append(group, archive);
    const list = node('div', '', 'feature-index-list');

    for (const [id, label] of picks) {
      const story = stories.get(id); if (!story) continue;
      const row = node('a', '', 'feature-index-item');row.href = articleHref(id);
      const meta = node('div', '', 'feature-index-meta');meta.append(node('span', label), node('small', story.category || '교육뉴스'));
      const body = node('div', '', 'feature-index-body');
      body.append(node('h3', story.title.replace(/<br\s*\/?\s*>/gi, ' ')), node('p', story.description || story.summary?.[0] || ''));
      const arrow = node('span', '기사 읽기 →', 'feature-index-arrow');
      row.append(meta, body, arrow);list.append(row);
    }
    section.append(heading, list);
    notable.after(section);
  }

  function remodelInterests() {
    const section = document.querySelector('.interests');
    if (!section || !window.CATEGORY_NEWS) return;
    const heading = section.querySelector('.section-heading');
    heading.querySelector('.heading-group h2').textContent = '관심 분야로 읽는 교육뉴스';
    heading.querySelector('.heading-group p').textContent = '네 가지 핵심 분야의 최신 기사와 흐름을 한눈에';
    const allLink = heading.querySelector('a');allLink.href = 'news.html';allLink.textContent = '분야 전체 보기 →';

    const grid = section.querySelector('.category-grid');
    grid.replaceChildren();
    const keys = ['admissions', 'gifted', 'digital', 'school-policy'];
    for (const key of keys) {
      const group = window.CATEGORY_NEWS[key]; if (!group) continue;
      const article = node('article', '', 'topic topic-four');
      article.id = `home-category-${key}`;
      const arrow = node('a', '↗', 'topic-arrow');arrow.href = categoryHref(key);arrow.setAttribute('aria-label', `${group.title} 전체 보기`);
      article.append(arrow, node('h3', group.title), node('p', group.description || ''));
      const [first, ...rest] = group.articles;
      if (first) {
        const [title, description, image, id] = first;
        const feature = node('a', '', 'topic-feature');feature.href = articleHref(id);
        const img = document.createElement('img');img.src = `assets/${image}.jpg`;img.alt = '';
        const text = node('div', '', 'topic-feature-text');text.append(node('strong', title));
        if (description) text.append(node('small', description));
        feature.append(img, text);article.append(feature);
      }
      const list = document.createElement('ul');
      rest.slice(0, 3).forEach(([title, , , id]) => {
        const li = document.createElement('li'), link = node('a', title);link.href = articleHref(id);li.append(link);list.append(li);
      });
      if (list.children.length) article.append(list);
      grid.append(article);
    }
  }

  function init() {
    buildFeatureIndex();
    remodelInterests();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(init, 0), {once: true});
  } else {
    window.setTimeout(init, 0);
  }
})();

'use strict';

(function () {
  if (window.__VIEWTIFUL_HOME_LAYOUT_READY__) return;
  window.__VIEWTIFUL_HOME_LAYOUT_READY__ = true;

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

  function loadLatestNews() {
    if (window.__VIEWTIFUL_NEWS_20261030__) return Promise.resolve();
    return new Promise(resolve => {
      const existing = document.querySelector('script[data-news-20261030]');
      if (existing) {
        if (window.__VIEWTIFUL_NEWS_20261030__) resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', resolve, { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = 'news-20261030.js?v=20261030-1';
      script.async = false;
      script.dataset.news20261030 = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', resolve, { once: true });
      document.head.append(script);
    });
  }

  function refreshSidebar() {
    const categoryOrder = ['admissions', 'gifted', 'digital', 'school-policy'];
    document.querySelectorAll('.sidebar .side-item').forEach((container, index) => {
      const group = window.CATEGORY_NEWS?.[categoryOrder[index]];
      if (!group) return;
      container.querySelectorAll('.side-story, .side-empty').forEach(item => item.remove());
      const articles = group.articles.slice(0, 4);
      if (!articles.length) {
        const empty = node('p', '등록된 기사가 없습니다.', 'side-empty');
        container.append(empty);
        return;
      }
      articles.forEach(([title, , , id]) => {
        const link = node('a', title, 'side-story');
        link.href = articleHref(id);
        container.append(link);
      });
    });
  }

  function ensureFeatureNav() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || navLinks.querySelector('[data-nav="features"]')) return;
    const about = navLinks.querySelector('[data-nav="about"]');
    if (!about) return;
    const featureLink = node('a', '기획·분석');
    featureLink.href = '#features';
    featureLink.dataset.nav = 'features';
    about.before(featureLink);
  }

  function buildFeatureIndex() {
    const notable = document.getElementById('notable');
    if (!notable) return false;
    const deepLink = notable.querySelector('.section-heading > a');
    if (deepLink) {
      deepLink.href = '#features';
      deepLink.textContent = '기획·분석 전체 보기 →';
    }
    if (document.getElementById('features')) return true;

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
    const archive = node('a', '전체 뉴스 아카이브 →');
    archive.href = 'news.html';
    heading.append(group, archive);
    const list = node('div', '', 'feature-index-list');

    for (const [id, label] of picks) {
      const story = stories.get(id);
      if (!story) continue;
      const row = node('a', '', 'feature-index-item');
      row.href = articleHref(id);
      const meta = node('div', '', 'feature-index-meta');
      meta.append(node('span', label), node('small', story.category || '교육뉴스'));
      const body = node('div', '', 'feature-index-body');
      body.append(
        node('h3', story.title.replace(/<br\s*\/?\s*>/gi, ' ')),
        node('p', story.description || story.summary?.[0] || '')
      );
      const arrow = node('span', '기사 읽기 →', 'feature-index-arrow');
      row.append(meta, body, arrow);
      list.append(row);
    }

    section.append(heading, list);
    notable.insertAdjacentElement('afterend', section);
    return true;
  }

  function remodelInterests() {
    const section = document.querySelector('.interests');
    if (!section || !window.CATEGORY_NEWS) return false;
    const heading = section.querySelector('.section-heading');
    const grid = section.querySelector('.category-grid');
    if (!heading || !grid) return false;

    const title = heading.querySelector('.heading-group h2');
    const subtitle = heading.querySelector('.heading-group p');
    const allLink = heading.querySelector('a');
    if (title) title.textContent = '관심 분야로 읽는 교육뉴스';
    if (subtitle) subtitle.textContent = '네 가지 핵심 분야의 최신 기사와 흐름을 한눈에';
    if (allLink) {
      allLink.href = 'news.html';
      allLink.textContent = '분야 전체 보기 →';
    }

    grid.replaceChildren();
    const keys = ['admissions', 'gifted', 'digital', 'school-policy'];
    for (const key of keys) {
      const group = window.CATEGORY_NEWS[key];
      if (!group) continue;
      const article = node('article', '', 'topic topic-four');
      article.id = `home-category-${key}`;
      const arrow = node('a', '↗', 'topic-arrow');
      arrow.href = categoryHref(key);
      arrow.setAttribute('aria-label', `${group.title} 전체 보기`);
      article.append(arrow, node('h3', group.title), node('p', group.description || ''));

      const [first, ...rest] = group.articles;
      if (first) {
        const [articleTitle, description, image, id] = first;
        const feature = node('a', '', 'topic-feature');
        feature.href = articleHref(id);
        if (image) {
          const img = document.createElement('img');
          img.src = `assets/${image}.jpg`;
          img.alt = '';
          feature.append(img);
        }
        const text = node('div', '', 'topic-feature-text');
        text.append(node('strong', articleTitle));
        if (description) text.append(node('small', description));
        feature.append(text);
        article.append(feature);
      }

      const list = document.createElement('ul');
      rest.slice(0, 3).forEach(([articleTitle, , , id]) => {
        const li = document.createElement('li');
        const link = node('a', articleTitle);
        link.href = articleHref(id);
        li.append(link);
        list.append(li);
      });
      if (list.children.length) article.append(list);
      grid.append(article);
    }
    return true;
  }

  function init(attempt = 0) {
    const dataReady = Array.isArray(window.ARCHIVE_ARTICLES) && window.CATEGORY_NEWS;
    const domReady = document.getElementById('notable') && document.querySelector('.interests');
    if ((!dataReady || !domReady) && attempt < 20) {
      window.setTimeout(() => init(attempt + 1), 100);
      return;
    }
    refreshSidebar();
    ensureFeatureNav();
    buildFeatureIndex();
    remodelInterests();
  }

  function start() {
    loadLatestNews().finally(() => init());
  }

  // 메인 기본 스크립트와 이미지/스타일 로딩까지 끝난 뒤 최신 기사 데이터를 연결합니다.
  if (document.readyState === 'complete') {
    window.setTimeout(start, 0);
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();

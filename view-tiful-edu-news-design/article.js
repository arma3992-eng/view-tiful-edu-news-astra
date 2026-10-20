'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const leadStory = (window.LEAD_NEWS || []).find(item => item.id === id);
  const story = leadStory || (window.ARCHIVE_ARTICLES || []).find(item => item.id === id);
  if (!story) {
    document.querySelector('#article-shell').hidden = true;
    document.querySelector('#article-not-found').hidden = false;
    document.title = '기사를 찾을 수 없습니다 | 뷰티풀 에듀';
    return;
  }

  document.body.dataset.navCategory = story.navCategory;
  document.title = story.title.replace(/<br\s*\/?\s*>/gi, ' ') + ' | 뷰티풀 에듀';
  document.querySelector('#article-category').textContent = story.category;
  document.querySelector('#article-title').innerHTML = story.title;
  document.querySelector('#article-meta').textContent = story.readingLabel;

  const image = document.querySelector('#article-image');
  image.src = `assets/${story.image}.jpg`;
  image.alt = story.alt;

  document.querySelector('#article-intro').textContent = story.description
    ? story.description.replace(/<br\s*\/?\s*>/gi, ' ')
    : '기사 본문을 준비하고 있습니다.';

  document.querySelector('#summary-label').textContent = leadStory ? '핵심 요약' : '기사 요약';
  const summary = Array.isArray(story.summary) ? story.summary : [];
  document.querySelector('#article-summary-empty').hidden = summary.length > 0;
  const list = document.querySelector('#article-summary-list');
  summary.forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  });

  const content = window.ARTICLE_CONTENTS?.[story.id];
  if (content) {
    document.querySelector('#article-example-note').hidden = true;
    renderFullArticle(content);
  }

  const backLink = document.querySelector('#article-back-link');
  backLink.href = `category.html?type=${encodeURIComponent(story.navCategory)}`;
  backLink.textContent = `${story.category} 기사 목록으로 돌아가기 →`;

  window.ReaderGuide.article(story);

  if (location.hash === '#summary') {
    requestAnimationFrame(() => document.querySelector('#summary').scrollIntoView({ block: 'start' }));
  }

  function renderFullArticle(content) {
    const body = document.querySelector('#article-body');
    body.replaceChildren();

    for (const section of content.sections || []) {
      const wrapper = document.createElement('section');
      wrapper.className = 'article-section';

      const heading = document.createElement('h2');
      heading.textContent = section.heading;
      wrapper.append(heading);

      for (const text of section.paragraphs || []) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        wrapper.append(paragraph);
      }

      if (section.table) {
        wrapper.append(buildTable(section.table));
      }

      body.append(wrapper);
    }

    body.hidden = false;

    const sources = document.querySelector('#article-sources');
    const links = document.querySelector('#article-source-links');
    links.replaceChildren();
    for (const source of content.sources || []) {
      try {
        const url = new URL(source.url);
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        const anchor = document.createElement('a');
        anchor.href = url.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = source.name || '근거 자료';
        links.append(anchor);
      } catch {}
    }
    sources.hidden = !links.children.length;
  }

  function buildTable(spec) {
    const wrapper = document.createElement('div');
    wrapper.className = 'article-table-wrap';
    const table = document.createElement('table');

    const headRow = table.createTHead().insertRow();
    (spec.headers || []).forEach(label => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.append(th);
    });

    const tbody = table.createTBody();
    for (const values of spec.rows || []) {
      const row = tbody.insertRow();
      values.forEach(value => {
        const cell = row.insertCell();
        cell.textContent = value;
      });
    }

    wrapper.append(table);
    return wrapper;
  }
})();

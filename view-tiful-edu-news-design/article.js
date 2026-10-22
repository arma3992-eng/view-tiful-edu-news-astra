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
    if (story.id === 'digital-ai-focus-schools-2026') {
      document.querySelector('#article-intro').hidden = true;
      document.querySelector('#summary').classList.add('article-summary-plain');
    }
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

      if (section.heading) {
        const heading = document.createElement('h2');
        heading.textContent = section.heading;
        wrapper.append(heading);
      }

      for (const text of section.paragraphs || []) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        wrapper.append(paragraph);
      }

      if (section.table) {
        wrapper.append(buildTable(section.table));
      }

      if (section.chart) {
        wrapper.append(buildBarChart(section.chart));
      }

      body.append(wrapper);
    }

    body.hidden = false;

    const sources = document.querySelector('#article-sources');
    const links = document.querySelector('#article-source-links');
    links.replaceChildren();
    for (const source of content.sources || []) {
      try {
        const url = new URL(source.url, location.href);
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

  function buildBarChart(spec) {
    const rows = Array.isArray(spec.rows) ? spec.rows.filter(row => Number.isFinite(Number(row.value))) : [];
    const figure = document.createElement('figure');
    figure.className = 'article-chart';
    if (spec.wideValues) figure.classList.add('article-chart-wide-values');

    if (spec.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = spec.caption;
      figure.append(caption);
    }

    if (!rows.length) return figure;

    const max = Math.max(...rows.map(row => Number(row.value)), 1);
    const grid = document.createElement('div');
    grid.className = 'article-chart-rows';

    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'article-chart-row';

      const label = document.createElement('span');
      label.className = 'article-chart-label';
      label.textContent = row.label;

      const track = document.createElement('span');
      track.className = 'article-chart-track';
      const bar = document.createElement('span');
      bar.className = 'article-chart-bar';
      bar.style.width = `${Math.max(2, Number(row.value) / max * 100)}%`;
      track.append(bar);

      const value = document.createElement('strong');
      value.className = 'article-chart-value';
      value.textContent = row.displayValue || `${Number(row.value).toLocaleString('ko-KR')}${spec.unit || ''}`;

      line.append(label, track, value);
      grid.append(line);
    }

    figure.append(grid);

    if (spec.note) {
      const note = document.createElement('p');
      note.className = 'article-chart-note';
      note.textContent = spec.note;
      figure.append(note);
    }

    return figure;
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
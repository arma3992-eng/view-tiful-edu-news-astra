'use strict';
(() => {
  if (!window.ReaderGuide) return;
  const originalArticle = window.ReaderGuide.article;

  window.ReaderGuide.article = async story => {
    await originalArticle(story);

    const record = window.READER_GUIDE_ADDITIONS?.[story.id];
    if (!record?.approval_id || !window.ReaderGuide.audiences(record.reader_guide).length) return;

    const root = document.getElementById('article-reader-guide');
    if (!root) return;

    window.ReaderGuide.render(root.querySelector('.role-grid'), record.reader_guide);

    const sources = root.querySelector('.guide-sources');
    sources.replaceChildren();
    for (const source of record.sources || []) {
      try {
        const url = new URL(source.url);
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        const anchor = document.createElement('a');
        anchor.href = url.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = source.name || '근거 자료';
        sources.append(anchor);
      } catch {}
    }

    root.hidden = false;
    if (location.hash === '#article-reader-guide') root.scrollIntoView({ block: 'start' });
  };
})();

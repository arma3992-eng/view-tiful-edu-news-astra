'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const story = (window.LEAD_NEWS || []).find(item => item.id === id)
    || (window.ARCHIVE_ARTICLES || []).find(item => item.id === id);
  if (!story) return;

  const figure = document.querySelector('.article-visual');
  const image = document.getElementById('article-image');
  const caption = figure?.querySelector(':scope > figcaption');
  if (!figure || !image || !caption) return;

  if (story.imageCaption) caption.textContent = story.imageCaption;
  if (!Array.isArray(story.heroImages) || !story.heroImages.length) return;

  image.hidden = true;
  const grid = document.createElement('div');
  grid.className = 'article-hero-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;';

  for (const item of story.heroImages.slice(0, 4)) {
    try {
      const url = new URL(item.url, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) continue;

      const card = document.createElement('figure');
      card.className = 'article-hero-item';
      card.style.cssText = 'margin:0;border:1px solid #dce3ec;background:#fff;overflow:hidden;border-radius:4px;';

      const img = document.createElement('img');
      img.src = url.href;
      img.alt = item.label || '비교 이미지';
      img.loading = 'eager';
      img.referrerPolicy = 'no-referrer';
      img.style.cssText = 'display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:#f5f7fa;';

      const label = document.createElement('figcaption');
      label.textContent = item.label || '';
      label.style.cssText = 'padding:8px 10px;font-size:12px;line-height:1.5;color:#536077;background:#fff;';

      card.append(img, label);
      grid.append(card);
    } catch {}
  }

  if (grid.children.length) image.after(grid);
})();

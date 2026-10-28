'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const story = (window.LEAD_NEWS || []).find(item => item.id === id)
    || (window.ARCHIVE_ARTICLES || []).find(item => item.id === id);
  if (!story?.video) return;

  const figure = document.querySelector('.article-visual');
  const image = document.getElementById('article-image');
  const caption = figure?.querySelector(':scope > figcaption');
  if (!figure || !image) return;

  const video = document.createElement('video');
  video.src = story.video;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', story.alt || '기사 브리핑 영상');
  video.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#111;border-radius:4px;';

  image.replaceWith(video);
  if (caption) caption.textContent = story.videoCaption || '기사 브리핑 영상';
})();
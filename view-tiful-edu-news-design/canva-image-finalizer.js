'use strict';
(() => {
  function storyById(id) {
    return (window.ARCHIVE_ARTICLES || []).find(story => story.id === id);
  }

  function applyImage(img, story) {
    if (!img || !story?.canvaImage) return;
    const fallback = `assets/${story.image}.jpg`;
    img.src = story.canvaImage;
    if (story.alt) img.alt = story.alt;
    img.addEventListener('error', () => {
      img.src = fallback;
    }, { once: true });
  }

  function applyAll() {
    const currentId = new URLSearchParams(location.search).get('id');
    if (currentId) applyImage(document.querySelector('#article-image'), storyById(currentId));

    document.querySelectorAll('a[href*="article.html?id="]').forEach(link => {
      try {
        const id = new URL(link.href, location.href).searchParams.get('id');
        const story = storyById(id);
        if (!story?.canvaImage) return;
        const card = link.closest('article');
        const img = link.querySelector('img') || card?.querySelector('img');
        applyImage(img, story);
      } catch {}
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyAll();
    requestAnimationFrame(applyAll);
  });
})();

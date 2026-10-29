'use strict';
(() => {
  const CANVA_IMAGES = {
    'school-policy-rural-good-schools-20261029': 'assets/canva-rural.jpg',
    'school-policy-tuition-review-transparency-20261028': 'assets/canva-tuition.jpg',
    'admissions-2028-reform-competition-20261027': 'assets/canva-admissions.jpg',
    'school-policy-seoul-org-reform-20261027': 'assets/canva-seoul.jpg',
    'admissions-ai-glasses-followup-20261027': 'assets/canva-smartglasses.jpg'
  };

  for (const story of window.ARCHIVE_ARTICLES || []) {
    const image = CANVA_IMAGES[story.id];
    if (image) story.canvaImage = image;

    if (story.id === 'school-policy-tuition-review-transparency-20261028') {
      story.category = window.CATEGORY_NEWS?.['school-policy']?.title || '학교·교육정책';
      story.readingLabel = '학교·교육정책 · 4분 읽기';
    }
  }
})();

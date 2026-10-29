'use strict';
(() => {
  const proxyBySource = {
    'https://design.canva.ai/sfhTo9zgBnAG4zr': 'rural',
    'https://design.canva.ai/lDvz84lyEdGmLJt': 'tuition',
    'https://design.canva.ai/WW0Ffa8iBAKaklX': 'admissions',
    'https://design.canva.ai/xbg9tjBclYawkEB': 'seoul',
    'https://design.canva.ai/f5W-WjPb_WiSW5-': 'smartglasses'
  };

  for (const story of window.ARCHIVE_ARTICLES || []) {
    const key = proxyBySource[story.canvaImage];
    if (key) story.canvaImage = `/api/canva-image?key=${encodeURIComponent(key)}`;

    if (story.id === 'school-policy-tuition-review-transparency-20261028') {
      story.category = window.CATEGORY_NEWS?.['school-policy']?.title || '학교·교육정책';
      story.readingLabel = '학교·교육정책 · 4분 읽기';
    }
  }
})();

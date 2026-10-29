'use strict';
(() => {
  const HIGGSFIELD_IMAGES = {
    'school-policy-rural-good-schools-20261029': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084522_022bf5cc-2dc5-4b71-af4f-5d26ed74cefb.png',
    'school-policy-tuition-review-transparency-20261028': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084522_f59fea0a-7b83-477e-8954-de2ae4f461d4.png',
    'admissions-2028-reform-competition-20261027': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084522_18c307db-f287-440a-9e0f-6d3885c84382.png',
    'school-policy-seoul-org-reform-20261027': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084557_d44c0183-91af-4060-8a08-d66972ee5d83.png',
    'admissions-ai-glasses-followup-20261027': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084726_4fd13521-a53d-4bc6-9730-6e50f37d9669.png',
    'admissions-medical-additional-admissions-20261027': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084557_c404d184-8d70-4fb6-8716-a6de40622e92.png',
    'digital-ai-essay-evaluation-effect-20261025': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084624_6c8510c8-e5b3-4ced-bae8-b2e45db2e80a.png',
    'admissions-naver-education-search-20261024': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084624_e57c8a6f-af13-4acf-a055-4190a8b96f70.png',
    'admissions-regular-application-system-20261023': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084650_01307347-66ce-46ef-895d-181f62b27b22.png',
    'digital-gyeongnam-career-ai-20261023': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084747_644e6c82-d982-4057-8529-662c7879ad36.png',
    'digital-seoul-elementary-ai-grading-20261023': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084822_cbc8803f-edc2-4cc0-b4de-1ab0d62c277a.png',
    'admissions-foreign-student-management-20261023': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084902_7c6bbcc6-f86c-4d1c-8d90-dc8072a44614.png',
    'digital-school-google-account-security-20261023': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_084926_d9044c13-4472-4d4f-af68-4c76393134df.png',
    'digital-ai-essay-joint-operation-20261022': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_085001_2ce10cc9-6ea6-42c6-8b32-ff6a04e244f1.png',
    'school-policy-education-innovation-forum-20261022': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_085022_8617f6ea-24d3-484b-b2a3-da9e2c723584.png',
    'school-policy-kindergarten-portal-20261021': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_085049_1dab8bb7-dc1e-413a-b152-870b09ca0d09.png',
    'school-policy-school-complaint-procedure-20261020': 'https://d8j0ntlcm91z4.cloudfront.net/user_3LMTOHbGD7mnmCVVk0yMzzEZXzd/hf_20261029_085121_4185d89f-91a5-45d0-ae01-90483b5eb4ac.png'
  };

  const storyById = new Map((window.ARCHIVE_ARTICLES || []).map(story => [story.id, story]));

  for (const [id, url] of Object.entries(HIGGSFIELD_IMAGES)) {
    const story = storyById.get(id);
    if (story) {
      story.higgsfieldImage = url;
      story.canvaImage = url;
    }
  }

  const setArticleImage = (img, id) => {
    const url = HIGGSFIELD_IMAGES[id];
    if (!img || !url || img.dataset.higgsfieldImage === url) return;

    const story = storyById.get(id);
    const fallback = story?.image ? `assets/${story.image}.jpg` : '';
    img.dataset.higgsfieldImage = url;
    img.src = url;
    if (story?.alt) img.alt = story.alt;

    img.addEventListener('error', () => {
      if (fallback && img.src !== new URL(fallback, location.href).href) {
        img.src = fallback;
      }
    }, { once: true });
  };

  const applyImages = () => {
    const currentId = new URLSearchParams(location.search).get('id');
    if (currentId) setArticleImage(document.querySelector('#article-image'), currentId);

    document.querySelectorAll('a[href*="article.html?id="]').forEach(link => {
      try {
        const id = new URL(link.href, location.href).searchParams.get('id');
        if (!id || !HIGGSFIELD_IMAGES[id]) return;
        const img = link.querySelector('img') || link.closest('article')?.querySelector('img');
        setArticleImage(img, id);
      } catch (_) {}
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(applyImages);

    const roots = [document.querySelector('#article-list'), document.querySelector('#archive-grid')].filter(Boolean);
    roots.forEach(root => {
      new MutationObserver(() => requestAnimationFrame(applyImages)).observe(root, {
        childList: true,
        subtree: true
      });
    });
  });
})();

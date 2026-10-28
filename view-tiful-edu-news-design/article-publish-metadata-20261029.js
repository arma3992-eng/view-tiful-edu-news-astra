'use strict';
(() => {
  const publishedAt = '2026-10-29T02:59:09+09:00';
  const ids = new Set([
    'admissions-csat-support-measures-20261020',
    'school-policy-accessible-textbook-files-20261020',
    'digital-apec-school-leadership-ai-20261020',
    'admissions-oecd-higher-education-20261020',
    'admissions-susi-stage1-interview-timetable-20261021',
    'admissions-smart-glasses-cheating-20261021',
    'digital-keli-alliance-ai-education-20261021'
  ]);
  for (const story of window.ARCHIVE_ARTICLES || []) {
    if (!ids.has(story.id)) continue;
    story.publishedAt = publishedAt;
    story.updatedAt = publishedAt;
  }
})();

'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const record = window.READER_GUIDE_ADDITIONS?.[id];
  if (record?.approval_id !== 'user-approved-20261029') return;
  const note = document.getElementById('article-example-note');
  if (note) note.hidden = true;
})();

'use strict';
// 분야별 기사 데이터는 news-data.js에서 관리합니다.
const categoryPages = window.CATEGORY_NEWS;

const pageKind = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const requestedType = params.get('type') || 'all';
const type = Object.hasOwn(categoryPages, requestedType) ? requestedType : 'all';
const currentPage = type === 'all' ? {
  title: '교육뉴스', description: '관심 있는 교육 소식을 찾아보세요.',
  articles: Object.values(categoryPages).flatMap(group => group.articles.map(a => [...a, group.title]))
} : categoryPages[type];

// 현재 열린 분야에만 선택 표시를 적용합니다.
const activeKey = pageKind === 'about' ? 'about' : (document.body.dataset.navCategory || type);
document.querySelectorAll('[data-nav]').forEach(link => {
  if (link.dataset.nav === activeKey) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }
});

const dialog = document.querySelector('#detail-dialog');
function showInfo(title, paragraphs) {
  const content = document.querySelector('#dialog-content');
  content.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = title;
  content.append(heading);
  paragraphs.filter(Boolean).forEach(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    content.append(paragraph);
  });
  if (!dialog.open) dialog.showModal();
}
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
const footerInfo = {
  editorial: ['편집 원칙', ['공식 자료와 신뢰할 수 있는 출처를 확인하고, 무슨 일인가 → 왜 중요한가 → 무엇을 알아야 하는가의 흐름으로 설명합니다.']],
  contact: ['제보 · 문의', ['문의 채널은 서비스 운영 준비 후 연결할 예정입니다.']],
  privacy: ['개인정보처리방침', ['현재는 디자인 확인용 정적 페이지입니다. 검색어는 서버로 전송하거나 저장하지 않습니다. 정식 서비스의 처리방침은 운영 범위 확정 후 작성합니다.']]
};
document.querySelectorAll('[data-info]').forEach(button => {
  button.addEventListener('click', () => showInfo(...footerInfo[button.dataset.info]));
});

function renderArticles(query = '') {
  const list = document.querySelector('#article-list');
  const matches = currentPage.articles.filter(a => (a[0] + ' ' + a[1]).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  list.replaceChildren();
  const template = document.querySelector('#article-template');
  matches.forEach(([title, summary, image, id, category]) => {
    const card = template.content.cloneNode(true);
    card.querySelector('img').src = `assets/${image}.jpg`;
    card.querySelector('.category').textContent = category || currentPage.title;
    card.querySelector('.listing-story-title').textContent = title;
    card.querySelector('.listing-summary').textContent = summary;
    if (!summary) card.querySelector('.listing-summary').hidden = true;
    card.querySelector('.listing-cover').setAttribute('aria-label', title + ' 기사 보기');
    card.querySelectorAll('a').forEach(link => {
      link.href = `article.html?id=${encodeURIComponent(id)}`;
    });
    list.append(card);
  });
  document.querySelector('#listing-count').textContent = query ? `“${query}” 검색 결과 ${matches.length}건` : `기사 ${matches.length}건`;
  document.querySelector('#clear-search').hidden = !query;
  document.querySelector('#empty-list').hidden = matches.length > 0;
  document.querySelector('#empty-title').textContent = query ? '검색 결과가 없습니다' : '등록된 기사가 없습니다';
  document.querySelector('#empty-description').textContent = query ? '다른 검색어로 다시 찾아보세요.' : '새로운 기사가 등록되면 이곳에서 확인할 수 있습니다.';
}

if (pageKind === 'category') {
    const schoolStats = document.querySelector('#ai-school-stats');
  if (schoolStats) schoolStats.hidden = type !== 'digital';
  document.title = `${currentPage.title} | 뷰티풀 에듀`;
  document.querySelector('#listing-title').textContent = currentPage.title;
  document.querySelector('#listing-description').textContent = currentPage.description;
  renderArticles((params.get('q') || '').trim());
  document.querySelector('#clear-search').addEventListener('click', () => {
    document.querySelector('.search input').value = '';
    params.delete('q');
    history.replaceState(null, '', `category.html?${params.toString()}`);
    renderArticles();
  });
}
const search = document.querySelector('.search');
search.querySelector('input').value = params.get('q') || '';
search.addEventListener('submit', event => {
  event.preventDefault();
  const query = search.querySelector('input').value.trim();
  if (pageKind === 'category') {
    if (query) params.set('q', query); else params.delete('q');
    history.replaceState(null, '', `category.html?${params.toString()}`);
    renderArticles(query);
  } else if (query) {
    const queryParams = new URLSearchParams({ type: 'all', q: query });
    location.href = `category.html?${queryParams}`;
  } else {
    search.querySelector('input').focus();
  }
});
// AI·디지털교육 페이지의 학교 통계
let schoolStatsRequest = 0;

async function showSchoolList(year, region, level, total) {
  const title = `${year}년 ${region} · ${level || '전체 학교급'}`;
  showInfo(title, []);

  const content = document.querySelector('#dialog-content');
  const message = document.createElement('p');
  message.textContent = '학교 목록을 불러오는 중입니다.';
  content.append(message);

  // 팝업을 닫거나 다른 내용을 열면 이전 응답을 표시하지 않습니다.
  const isCurrent = () => dialog.open && content.contains(message);

  try {
    const query = new URLSearchParams({
      year: String(year), region, level
    });
    const response = await fetch(`/api/schools?${query}`);
    if (!response.ok) throw new Error('학교 목록 조회 실패');

    const data = await response.json();
    if (!isCurrent()) return;

    message.textContent =
      `통계: ${total}개교 · 등록된 학교 목록: ${data.count}개교`;

    if (!data.items.length) {
      const notice = document.createElement('p');
      notice.textContent =
        '이 조건에 해당하는 학교 목록이 아직 등록되어 있지 않습니다. 학교가 0개라는 뜻은 아닙니다.';
      content.append(notice);
      return;
    }

    if (data.count !== total) {
      const notice = document.createElement('p');
      notice.textContent =
        '통계 수와 등록된 목록 수가 다릅니다. 목록의 누락·중복 및 집계 기준을 확인해야 합니다.';
      content.append(notice);
    }

    const list = document.createElement('ol');
    list.style.cssText = 'padding-left:24px; line-height:1.9;';

    data.items.forEach(school => {
      const item = document.createElement('li');
      const details = [school.school_level, school.district]
        .filter(Boolean).join(' · ');
      item.textContent = `${school.school_name} (${details})`;
      list.append(item);
    });

    content.append(list);
  } catch (error) {
    if (isCurrent()) {
      message.textContent =
        '학교 목록을 불러오지 못했습니다. 잠시 후 다시 클릭해주세요.';
    }
    console.error(error);
  }
}

async function loadSchoolStats(year = '2026') {
  const section = document.querySelector('#ai-school-stats');
  const status = document.querySelector('#ai-school-status');
  if (!section || !status) return;

  const requestId = ++schoolStatsRequest;
  section.querySelector('#ai-school-table')?.remove();
  status.textContent = `${year}년 학교 통계를 불러오는 중입니다.`;

  try {
    const query = new URLSearchParams({ year: String(year) });
    const response = await fetch(`/api/school-stats?${query}`);
    if (!response.ok) throw new Error('통계 조회 실패');

    const data = await response.json();
    if (requestId !== schoolStatsRequest) return;

    if (!data.items.length) {
      status.textContent = `${year}년에 등록된 통계가 없습니다.`;
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-school-table';
    wrapper.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.style.cssText =
      'width:100%; border-collapse:collapse; margin:16px 0 24px;';

    const caption = table.createCaption();
    caption.textContent =
      `${data.year}년 지역별 학교 현황 (단위: 개교)`;

    const head = table.createTHead().insertRow();
    ['지역', '초등', '중등', '고등', '특수', '합계', '자료 확인 상태']
      .forEach(label => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = label;
        th.style.cssText =
          'padding:10px; border-bottom:2px solid #ccc; text-align:left; white-space:nowrap;';
        head.append(th);
      });

    const columns = [
      ['elementary_count', '초등학교'],
      ['middle_count', '중학교'],
      ['high_count', '고등학교'],
      ['special_count', '특수학교'],
      ['total_count', '']
    ];

    const cellStyle =
      'padding:10px; border-bottom:1px solid #ddd; text-align:left;';

    const body = table.createTBody();

    data.items.forEach(item => {
      const row = body.insertRow();
      const regionCell = document.createElement('th');
      regionCell.scope = 'row';
      regionCell.textContent = item.region_name;
      regionCell.style.cssText = cellStyle + 'font-weight:normal;';
      row.append(regionCell);

      columns.forEach(([key, level]) => {
        const cell = row.insertCell();
        cell.style.cssText = cellStyle;
        const value = item[key];

        if (value == null) {
          cell.textContent = '미확인';
        } else if (value === 0) {
          cell.textContent = '0';
        } else {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = String(value);
          button.style.cssText =
            'background:none; border:0; padding:4px; color:inherit; font:inherit; text-decoration:underline; cursor:pointer;';
          button.setAttribute(
            'aria-label',
            `${data.year}년 ${item.region_name} ${level || '전체'} ${value}개교 학교 목록 보기`
          );
          button.addEventListener('click', () => {
            showSchoolList(
              data.year, item.region_name, level, value
            );
          });
          cell.append(button);
        }
      });

      const stateCell = row.insertCell();
      stateCell.style.cssText = cellStyle;
      stateCell.textContent =
        `${item.data_status || '상태 미확인'} · ` +
        (item.validation_status || '미검증').replaceAll('_', ' · ');
    });

    wrapper.append(table);
    section.append(wrapper);

    const programs = [
      ...new Set(data.items.map(item => item.program_name))
    ];
    status.textContent =
      `${data.year}년 ${programs.join(' / ')} · ${data.count}개 지역. ` +
      '밑줄 친 숫자를 누르면 등록된 학교 목록을 확인할 수 있습니다. ' +
      '미확인은 0개를 뜻하지 않으며, 연도별 사업과 집계 기준은 다를 수 있습니다.';
  } catch (error) {
    if (requestId !== schoolStatsRequest) return;
    status.textContent =
      `${year}년 통계를 불러오지 못했습니다. API 서버 실행 상태를 확인해주세요.`;
    console.error(error);
  }
}

if (pageKind === 'category' && type === 'digital') {
  const yearSelect = document.querySelector('#ai-school-year');
  yearSelect.addEventListener('change', () => {
    loadSchoolStats(yearSelect.value);
  });
  loadSchoolStats(yearSelect.value);
}

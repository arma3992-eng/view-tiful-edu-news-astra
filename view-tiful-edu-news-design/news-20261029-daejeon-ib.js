'use strict';
(() => {
  const publishedAt = '2026-10-29T04:26:43+09:00';
  const story = {
    navCategory: 'school-policy',
    id: 'school-policy-daejeon-ib-district-20261021',
    image: 'policy',
    video: 'https://resource2.heygen.ai/aws_pacific/avatar_tmp/e3fe6261554445dab3af098a821e0911/v9787120acef1403ca90da60986395c3f/caption_9dcedd42876d4a05932b48eee95fdbf6.mp4',
    videoCaption: 'VTN 브리핑 | AI 아바타·생성형 보조 영상 사용',
    title: '대전 IB 교육지구, 2027년 동부권부터…‘인증학교 확대’보다 수업·평가 협력에 초점',
    description: '대전교육청이 2027년 동구·중구·대덕구를 시작으로 IB 교육지구를 추진하고 2028년 서부권으로 확대할 계획이다. 운영학교 확대 로드맵과 함께 수업·평가 공동연구 체계를 지역 단위로 묶는 것이 핵심이다.',
    alt: '대전 IB 교육지구 추진 내용을 설명하는 VTN 브리핑 영상',
    readingLabel: '학교·교육정책 · 5분 읽기',
    publishedAt,
    updatedAt: publishedAt,
    summary: [
      '대전교육청은 2027년 동구·중구·대덕구 등 동부권에서 IB 교육지구를 시작하고, 2028년 서구·유성구 등 서부권으로 확대할 계획입니다.',
      '2026년 현재 탐색학교 5곳·관심학교 9곳·후보학교 6곳 등 20개교가 단계별 과정을 밟고 있으며, 2030년 60개교까지 확대하는 로드맵이 제시됐습니다. 이 학교들이 모두 IBO 인증학교라는 뜻은 아닙니다.',
      '정책의 핵심은 학교 수 확대보다 수업·평가 공동연구, 교사 네트워크, 루브릭·공동채점 등 협력체계에 있으며 실제 참여학교·예산·교원 연수 세부안은 추가 확인이 필요합니다.'
    ]
  };

  const group = window.CATEGORY_NEWS?.[story.navCategory];
  if (group && !group.articles.some(([, , , id]) => id === story.id)) {
    group.articles.unshift([story.title, story.description, story.image, story.id, '학교•교육정책']);
  }

  window.ARCHIVE_ARTICLES = window.ARCHIVE_ARTICLES || [];
  if (!window.ARCHIVE_ARTICLES.some(item => item.id === story.id)) {
    window.ARCHIVE_ARTICLES.unshift({ ...story, category: '학교•교육정책' });
  }

  window.ARTICLE_CONTENTS = window.ARTICLE_CONTENTS || {};
  window.ARTICLE_CONTENTS[story.id] = {
    sections: [
      {
        heading: '2027년 동부권에서 시작해 2028년 서부권으로',
        paragraphs: [
          '대전시교육청은 2027년 동구·중구·대덕구 등 동부권을 중심으로 ‘대전 IB 교육지구’를 운영하고, 2028년에는 서구·유성구 등 서부권으로 확대할 계획이다. 개별 학교가 각각 IB를 운영하는 데서 더 나아가 학교 간·학교급 간 협력체계를 지역 단위로 묶겠다는 구상이다.',
          '교육지구에서는 같은 학교급 학교들이 수업·평가 사례와 운영 경험을 공유하고, 초·중·고 클러스터를 통해 학생의 탐구와 학습 경험이 학교급이 바뀌어도 이어질 수 있도록 지원하는 방향이 제시됐다.'
        ]
      },
      {
        heading: '20개교에서 2030년 60개교까지…숫자를 볼 때 주의할 점',
        paragraphs: [
          '대전은 2025년 탐색·관심학교 15개교에서 시작해 2026년에는 탐색학교 5개교, 관심학교 9개교, 후보학교 6개교 등 모두 20개교가 단계별 과정을 밟고 있다. 교육청이 제시한 확대 로드맵은 2027년 40개교, 2028년 50개교, 2029년 57개교, 2030년 60개교다.',
          '다만 탐색학교·관심학교·후보학교는 IB 도입과 인증을 준비하는 서로 다른 단계다. 따라서 현재 20개교나 향후 확대 목표를 모두 IBO가 인증한 학교 수로 해석해서는 안 된다.'
        ],
        table: {
          headers: ['연도', '운영·확대 계획'],
          rows: [
            ['2026년', '20개교 — 탐색 5·관심 9·후보 6'],
            ['2027년', '40개교 목표 · 동부권 교육지구 추진'],
            ['2028년', '50개교 목표 · 서부권 확대 계획'],
            ['2029년', '57개교 목표'],
            ['2030년', '60개교 목표']
          ]
        }
      },
      {
        heading: '학교 수보다 수업·평가를 함께 연구하는 구조가 핵심',
        paragraphs: [
          '교육청은 IB 교육지구의 성과를 인증학교 수 자체로만 보지 않겠다는 방향을 제시했다. 교사들이 전문적 학습공동체와 학교급 네트워크를 통해 수업과 평가를 공동 연구·설계하고, 국가교육과정 성취기준과 IB 평가 원리를 바탕으로 평가기준과 채점기준표인 루브릭을 개발하는 방식이다.',
          '교사 간 공동채점과 조정을 통해 서·논술형 평가의 신뢰도를 높이고, 2027년부터 초·중·고를 아우르는 연구학교 4곳에서 대전형 수업모델을 개발해 일반학교로 확산한다는 계획도 제시됐다.'
        ]
      },
      {
        heading: '현장 우려도 함께 봐야 한다',
        paragraphs: [
          '대전시의회 토론회에서는 2022 개정 교육과정과의 중복 가능성, 교원 업무 부담과 전문성 유지, 학교 간 지원 격차, 사교육과 교육격차 우려, IBO 관련 재정 부담 등이 과제로 제기됐다. 고등학교 단계에서는 IB DP와 현행 내신·수능 중심 대입 체제의 정합성을 어떻게 풀지에 대한 고민도 나왔다.',
          '교육청은 설명회와 공청회 등에서 현장 의견을 수렴해 계획에 반영하겠다는 입장이다. 따라서 2027년 교육지구의 실제 참여학교, 학교별 운영 단계, 예산 규모, 교원 연수와 행정업무 경감 방안은 최종 기본계획과 후속 발표에서 다시 확인할 필요가 있다.'
        ]
      }
    ],
    sources: [
      { name: '뉴스핌 | 대전교육청, 내년 동부권부터 ‘IB 교육지구’ 추진', url: 'https://www.newspim.com/news/view/20261008000376' },
      { name: '아이뉴스24 | 대전교육청, 2027년 IB 교육지구 추진 방향 논의', url: 'https://www.inews24.com/view/mp/2017278' },
      { name: '연합뉴스 | 대전 IB 운영학교 확대 관련 현장 우려 토론회', url: 'https://www.yna.co.kr/view/AKR20261020127300063' }
    ]
  };

  window.READER_GUIDE_ADDITIONS = window.READER_GUIDE_ADDITIONS || {};
  window.READER_GUIDE_ADDITIONS[story.id] = {
    approval_id: 'user-approved-20261029',
    article_title: story.title,
    reader_guide: {
      enabled: true,
      audiences: [
        {
          label: '학생·학부모',
          title: '우리 학교의 ‘IB 단계’를 먼저 확인하기',
          sections: [
            { type: 'check', items: [{ text: '탐색·관심·후보·인증 단계는 의미가 다릅니다. 학교가 실제 어떤 단계에 있는지 학교와 교육청 안내에서 확인하세요.' }] }
          ]
        },
        {
          label: '교사',
          title: '수업·평가 협력과 업무 부담을 함께 확인하기',
          sections: [
            { type: 'prepare', items: [{ text: '교원 연수, 공동연구 시간, 루브릭 개발·공동채점 지원, 행정업무 경감 방안이 학교 단위에서 어떻게 운영되는지 확인할 필요가 있습니다.' }] }
          ]
        },
        {
          label: '학교 관계자',
          title: '2027년 참여 조건과 지원 규모 확인하기',
          sections: [
            { type: 'action', items: [{ text: '교육지구 참여학교 선정 기준, 예산, IBO 인증 관련 비용, 연구학교 운영계획과 학교급 연계 방식의 최종안을 확인하세요.' }] }
          ]
        }
      ]
    },
    sources: window.ARTICLE_CONTENTS[story.id].sources
  };
})();
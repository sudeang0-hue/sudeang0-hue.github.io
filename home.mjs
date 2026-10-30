import { escapeHtml } from './security.mjs';

// 상세 페이지에 공개된 작업물만 사용합니다. 공공 캐릭터·공동 부스의 기여 범위도 유지합니다.
export const homeChapters = [
  {
    title: '용사때문에 레벨업', label: 'GAME UI · 2026', href: 'gamelab.html', keyword: 0,
    role: 'UI 설계·리디자인 · Unity 적용 · 결과 연출',
    scenes: [{ image: 'gamelab-background-poster.jpg', video: 'gamelab-background-720p.mp4', mobile: 'gamelab-background-540p.mp4', position: '50% 50%', duration: 10000 }],
  },
  {
    title: 'TaskTown', label: 'UNITY CLIENT · 2026', href: 'tasktown.html', keyword: 1,
    role: '씬 전환 · 튜토리얼 · 사운드 · 팀 기능 통합',
    scenes: [{ image: 'tasktown-background-poster.jpg', video: 'tasktown-background-720p.mp4', mobile: 'tasktown-background-540p.mp4', position: '50% 50%', duration: 10000 }],
  },
  {
    title: '디자인·홍보·일러스트', label: 'DESIGN · COMMUNICATION', href: 'design.html', keyword: 2,
    role: '공공홍보 콘텐츠 · 개인 일러스트 · UI·편집 디자인',
    scenes: [
      { image: 'public-gj-2022-chuseok-illustration.png', position: '50% 65%', duration: 2000 },
      { image: 'public-gj-2022-summer-wallpaper-watermelon.jpg', position: '50% 75%', duration: 2000 },
      { image: 'illustration-memory.jpg', position: '50% 52%', duration: 2000 },
      { image: 'design-cashplaner-screens.webp', position: '50% 50%', duration: 2000 },
      { image: 'design-huge-a-case.webp', position: '50% 53%', duration: 2000 },
    ],
  },
  {
    title: '봉래제 · 일러스트 굿즈', label: 'ILLUSTRATION · GOODS', href: 'planning.html', keyword: 2,
    role: '동방 프로젝트 팬 창작 · 제작 발주 · 공동 부스 판매',
    scenes: [
      { image: 'goods-background-07.webp', position: '50% 60%', duration: 2000 },
      { image: 'goods-background-06.webp', position: '50% 62%', duration: 2000 },
      { image: 'goods-background-08.webp', position: '50% 62%', duration: 2000 },
      { image: 'hourai-keyrings.jpg', position: '50% 40%', duration: 2000 },
      { image: 'goods-i006.jpg', position: '50% 55%', duration: 2000 },
    ],
  },
];

function media(chapters, hero = false) {
  const image = chapters[0].scenes[0];
  return `<div class="home-media" data-home-media data-chapters="${escapeHtml(JSON.stringify(chapters))}" aria-hidden="true">
    <div class="home-media-layer is-visible" data-layer><img src="assets/${image.image}" alt="" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${image.position}"><video muted loop playsinline preload="none" tabindex="-1"></video></div>
    <div class="home-media-layer" data-layer><img alt="" decoding="async"><video muted loop playsinline preload="none" tabindex="-1"></video></div>
  </div>`;
}

const cards = [
  { id: 'game', label: '01 / GAME DEVELOPMENT', title: '화면을 설계하고,<br>플레이로 연결합니다.', description: '게임랩 · TaskTown', detail: 'UI 설계·구현부터 팀 기능 통합까지.', href: 'development.html', link: '게임 개발 작업 보기', chapters: homeChapters.slice(0, 2) },
  { id: 'design', label: '02 / DESIGN & COMMUNICATION', title: '정보를 이야기로<br>전합니다.', description: '디자인 · 홍보 · 일러스트', detail: '공공홍보 콘텐츠와 개인 시각 작업.', href: 'design.html', link: '디자인·홍보 작업 보기', chapters: [homeChapters[2]] },
  { id: 'goods', label: '03 / ILLUSTRATION & GOODS', title: '그림을 실물로<br>이어갑니다.', description: '굿즈 기획 · 제작', detail: '본인 일러스트에서 공동 부스 판매까지.', href: 'planning.html', link: '굿즈 기획·제작 보기', chapters: [homeChapters[3]] },
];

export function renderHome() {
  return `<div class="home-cinematic" data-home>
    <section class="home-hero" aria-labelledby="home-title" data-home-hero>
      <div class="home-hero-backdrop">${media(homeChapters, true)}<div class="home-hero-shade"></div></div>
      <div class="wrap home-hero-content">
        <div class="home-intro" data-home-intro>
          <p class="home-eyebrow">CHOI HEESU · DESIGN & DEVELOPMENT</p>
          <h1 id="home-title" aria-label="디자인과 개발 사이, 경험을 잇습니다.">
            <span class="home-title-space" aria-hidden="true"><span>디자인과 개발 사이,</span><em>경험을 잇습니다.</em></span>
            <span class="home-title-typed" aria-hidden="true"><span data-type-line>디자인과 개발 사이,</span><em data-type-line>경험을 잇습니다.</em></span>
          </h1>
          <div class="home-intro-follow">
            <p class="home-description">Unity 개발과 디자인을 연결하는 최희수입니다.<br>화면의 정보와 플레이의 흐름을 함께 다듬습니다.</p>
            <ul class="home-keywords" aria-label="대표 역량"><li class="is-current">UI 설계</li><li>Unity 구현</li><li>시각적 전달</li></ul>
            <div class="home-actions"><a class="home-primary" href="#selected-work">대표 작업 살펴보기 <span aria-hidden="true">↓</span></a><a class="home-resume-link" href="resume.html">이력서 보기 <span aria-hidden="true">↗</span></a></div>
          </div>
        </div>
        <div class="home-reel">
          <div class="home-reel-caption"><p class="home-reel-label" data-chapter-label>${homeChapters[0].label}</p><a href="gamelab.html" data-chapter-link><strong data-chapter-title>${homeChapters[0].title}</strong><span aria-hidden="true">↗</span></a><p data-chapter-role>${homeChapters[0].role}</p></div>
          <div class="home-reel-navigation" role="group" aria-label="대표 배경 선택">
            <div class="home-reel-controls"><span class="home-reel-count" data-chapter-count>01 / 04</span><button type="button" data-chapter-prev aria-label="이전 대표 배경">←</button><button type="button" data-chapter-next aria-label="다음 대표 배경">→</button></div>
            <div class="home-reel-progress" aria-hidden="true"><span data-chapter-progress></span></div>
          </div>
        </div>
      </div>
    </section>
    <section class="home-selected wrap" id="selected-work" aria-labelledby="selected-work-title">
      <header class="home-section-heading"><div><p class="home-eyebrow">SELECTED WORK</p><h2 id="selected-work-title">서로 다른 작업,<br class="home-mobile-break"> 하나로 이어지는 경험.</h2></div><p>관심 있는 분야에서<br>만드는 과정까지 살펴보세요.</p></header>
      <div class="home-work-cards" data-work-cards>
        ${cards.map(card => `<article class="home-work-card" data-work-card="${card.id}"><div class="home-work-visual">${media(card.chapters)}<div class="home-card-shade"></div><a class="home-card-link" href="${card.href}"><span class="home-card-category">${card.label}</span><div class="home-card-copy"><h3>${card.title}</h3><p class="home-card-description">${card.description}</p><p class="home-card-detail">${card.detail}</p><span class="home-card-cta">${card.link}<span aria-hidden="true">↗</span></span></div></a></div></article>`).join('')}
      </div>
      <div class="home-project-shortcuts"><span>게임 프로젝트 바로가기</span><a href="gamelab.html">용사때문에 레벨업 <span aria-hidden="true">↗</span></a><a href="tasktown.html">TaskTown <span aria-hidden="true">↗</span></a></div>
    </section>
    <section class="home-practice wrap" aria-labelledby="related-practice-title">
      <div><p class="home-eyebrow">HOW I WORK</p><h2 id="related-practice-title">보여주는 방식과<br>동작하는 흐름을 함께.</h2><a class="text-link" href="history.html">활동·경력 연혁 보기 <span aria-hidden="true">↗</span></a></div>
      <ol><li><span>01</span><div><h3>읽는 순서를 설계합니다.</h3><p>정보의 우선순위와 화면 이동을 정리하고, 피드백을 반영해 UI를 다듬습니다.</p></div></li><li><span>02</span><div><h3>기능의 연결을 확인합니다.</h3><p>화면과 게임 데이터를 연결하고, 입력·표시·복귀 동작을 실제 화면에서 살핍니다.</p></div></li><li><span>03</span><div><h3>작업의 기준을 공유합니다.</h3><p>본인과 팀의 작업 범위를 구분하고, 수정할 부분과 확인할 항목을 기록합니다.</p></div></li></ol>
    </section>
  </div>`;
}

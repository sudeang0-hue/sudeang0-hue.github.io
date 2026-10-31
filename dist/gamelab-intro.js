(() => {
  'use strict';
  const page = document.querySelector('[data-gamelab-background-page]');
  const items = [...document.querySelectorAll('[data-gamelab-reveal]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!page || !items.length || motion.matches || !('IntersectionObserver' in window)) return;

  // 문서는 기본적으로 보이며, 지원 환경에서만 한 번 등장하는 연출을 덧붙입니다.
  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
  items.forEach(item => {
    if (item.getBoundingClientRect().bottom > headerBottom) item.classList.add('is-reveal-pending');
  });
  page.classList.add('gamelab-reveal-ready');

  function reveal(item, delay = 0, immediate = false) {
    if (!immediate && !item.classList.contains('is-reveal-pending')) return;
    item.style.setProperty('--gamelab-reveal-delay', `${delay}ms`);
    if (immediate) item.classList.add('is-reveal-immediate');
    // 첫 화면에서 숨김·표시가 같은 프레임에 처리되어도 시작 상태부터 재생합니다.
    else item.classList.add('is-revealed');
    item.classList.remove('is-reveal-pending');
    observer.unobserve(item);
  }

  const observer = new IntersectionObserver(entries => {
    // 같은 화면에 들어온 항목은 문서 순서로 이어서 보여줍니다.
    const visible = new Set(entries.filter(entry => entry.isIntersecting).map(entry => entry.target));
    let order = 0;
    items.forEach(item => {
      if (visible.has(item) && item.classList.contains('is-reveal-pending')) reveal(item, order++ * 140);
    });
  }, {threshold: .12, rootMargin: '0px 0px -6% 0px'});
  items.filter(item => item.classList.contains('is-reveal-pending')).forEach(item => observer.observe(item));

  page.addEventListener('focusin', event => {
    const target = event.target.closest('[data-gamelab-reveal]');
    if (!target) return;
    // 키보드로 바로 이동한 링크는 연출 대기 없이 보여줍니다.
    items.slice(0, items.indexOf(target) + 1).forEach(item => reveal(item, 0, true));
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    items.forEach(item => reveal(item, 0, true));
    observer.disconnect();
    page.classList.remove('gamelab-reveal-ready');
  });
})();

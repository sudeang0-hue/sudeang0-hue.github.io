// 접힌 작품의 직접 링크와 상세 페이지에서 돌아오는 위치를 함께 유지합니다.
(() => {
  const more = document.querySelector('[data-public-more]');
  const moreToggle = more?.querySelector('summary');
  const collapseControl = more?.querySelector('[data-public-collapse]');
  const works = [...document.querySelectorAll('[data-public-work]')];
  if (!works.length) return;

  function revealRequestedWork() {
    const requested = works.find(work => work.id === location.hash.slice(1));
    if (requested && more?.contains(requested) && !more.open) {
      more.open = true;
      // 접힌 상태에서 계산된 앵커 위치를 펼친 뒤의 실제 작품 위치로 맞춥니다.
      requestAnimationFrame(() => {
        if (more.open) requested.scrollIntoView({block: 'start', behavior: 'instant'});
      });
    }
  }

  function collapseWorks() {
    if (!more?.open || !moreToggle) return;
    more.open = false;
    // 접힌 작품 주소가 남아 새로고침 때 다시 펼쳐지는 것을 방지합니다.
    const requested = works.find(work => work.id === location.hash.slice(1));
    if (requested && more.contains(requested)) {
      history.replaceState(history.state, '', '#' + moreToggle.id);
    }
    moreToggle.focus({preventScroll: true});
    requestAnimationFrame(() => {
      if (!more.open) moreToggle.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
  }

  if (collapseControl) {
    collapseControl.hidden = false;
    collapseControl.addEventListener('click', collapseWorks);
  }
  moreToggle?.addEventListener('click', event => {
    if (!more.open) return;
    event.preventDefault();
    collapseWorks();
  });

  works.forEach(work => work.querySelector('.public-reader-link')?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // 이력을 추가하거나 화면을 움직이지 않고 돌아올 카드의 주소만 남깁니다.
    history.replaceState(history.state, '', '#'+work.id);
  }));
  window.addEventListener('hashchange', revealRequestedWork);
  window.addEventListener('pageshow', revealRequestedWork);
  revealRequestedWork();
})();

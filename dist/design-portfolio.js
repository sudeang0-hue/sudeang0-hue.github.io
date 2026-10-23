// 작품을 읽고 돌아와도 선택한 연도와 목록 위치를 유지합니다.
const publicFilters = document.querySelector('[data-public-filters]');
if (publicFilters) {
  const buttons = [...publicFilters.querySelectorAll('[data-public-filter]')];
  const works = [...document.querySelectorAll('[data-public-work]')];
  const result = publicFilters.querySelector('[data-public-result]');
  const allowedYears = new Set(buttons.map(button => button.dataset.publicFilter));
  const storageKey = 'public-work-filter';
  let initialYear = 'all';
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (allowedYears.has(saved)) initialYear = saved;
  } catch { /* 저장을 제한한 브라우저에서는 전체 목록으로 시작합니다. */ }
  const requestedWork = works.find(work => work.id === location.hash.slice(1));
  if (requestedWork && initialYear !== 'all' && initialYear !== requestedWork.dataset.year) initialYear = 'all';

  function selectYear(year) {
    if (!allowedYears.has(year)) year = 'all';
    let shown = 0;
    works.forEach(work => {
      work.hidden = year !== 'all' && work.dataset.year !== year;
      if (!work.hidden) shown++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.publicFilter === year)));
    result.textContent = `${shown}개 작업`;
    try { sessionStorage.setItem(storageKey, year); } catch { /* 필터 동작은 저장 가능 여부와 분리합니다. */ }
  }
  buttons.forEach(button => button.addEventListener('click', () => selectYear(button.dataset.publicFilter)));
  works.forEach(work => work.querySelector('.public-reader-link')?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // 이력을 추가하거나 화면을 움직이지 않고 돌아올 카드의 주소만 남깁니다.
    history.replaceState(history.state, '', '#'+work.id);
  }));
  publicFilters.hidden = false;
  selectYear(initialYear);
}

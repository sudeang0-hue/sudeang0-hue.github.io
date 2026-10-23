// 작품을 다시 만들지 않고 기존 이미지 확대·공식 링크 연결을 유지합니다.
const publicFilters = document.querySelector('[data-public-filters]');
if (publicFilters) {
  const buttons = [...publicFilters.querySelectorAll('[data-public-filter]')];
  const works = [...document.querySelectorAll('[data-public-work]')];
  const result = publicFilters.querySelector('[data-public-result]');
  function selectYear(year) {
    let shown = 0;
    works.forEach(work => {
      work.hidden = year !== 'all' && work.dataset.year !== year;
      if (!work.hidden) shown++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.publicFilter === year)));
    result.textContent = `${shown}개 작업`;
  }
  buttons.forEach(button => button.addEventListener('click', () => selectYear(button.dataset.publicFilter)));
  publicFilters.hidden = false;
  selectYear('all');
}

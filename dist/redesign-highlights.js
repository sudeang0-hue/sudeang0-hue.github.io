// 비교 슬라이더의 선택 상태를 따라가되, 기존 넘김·원본 확대 동작은 유지합니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root => {
  const toggle = root.querySelector('[data-change-toggle]');
  const maps = [...root.querySelectorAll('.redesign-change-map')];
  if (!toggle || !maps.length || !root.hasAttribute('data-ready')) return;
  let enabled = false;

  function fitMarkers() {
    maps.forEach(map => {
      const frame = map.parentElement;
      const image = frame.querySelector('img');
      if (!image || !frame.clientWidth || !frame.clientHeight) return;
      // 화면 높이 제한으로 생긴 여백을 제외하고 실제 contain 이미지에 맞춥니다.
      const width = image.naturalWidth || Number(image.getAttribute('width'));
      const height = image.naturalHeight || Number(image.getAttribute('height'));
      if (!width || !height) return;
      const scale = Math.min(frame.clientWidth / width, frame.clientHeight / height);
      map.style.width = `${width * scale}px`;
      map.style.height = `${height * scale}px`;
    });
  }

  function sync() {
    fitMarkers();
    root.classList.toggle('is-showing-changes', enabled && root.dataset.comparisonAnimating !== 'true');
  }

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '변경점 숨기기' : '변경점 보기';
    sync();
  });
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ['data-comparison-index', 'data-comparison-position', 'data-comparison-visible', 'data-comparison-animating'],
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(fitMarkers);
    maps.forEach(map => observer.observe(map.parentElement));
  } else {
    window.addEventListener('resize', fitMarkers);
  }
  maps.forEach(map => map.parentElement.querySelector('img')?.addEventListener('load', fitMarkers));
  toggle.hidden = false;
  sync();
});

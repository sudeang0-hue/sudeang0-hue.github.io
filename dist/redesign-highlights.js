// 비교 슬라이더의 선택 상태를 따라가되, 기존 넘김·원본 확대 동작은 유지합니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root => {
  const toggle = root.querySelector('[data-change-toggle]');
  const maps = [...root.querySelectorAll('.redesign-change-map')];
  if (!toggle || !maps.length || !root.hasAttribute('data-ready')) return;
  let enabled = false;

  function fitCallouts(map, width, height) {
    // CSS의 모바일 주석 공간(28px)에 22px 번호를 놓고, 가까운 번호는 세로로 분리합니다.
    const badgeSize = 22, spacing = 30, entranceOffset = 6, border = 2;
    const half = badgeSize / 2;
    const points = [...map.querySelectorAll('.redesign-change-mark')].map(mark => {
      const x = parseFloat(mark.style.left) * width / 100;
      const y = parseFloat(mark.style.top) * height / 100;
      const targetY = y + parseFloat(mark.style.height) * height / 200;
      return { mark, x, y, targetY, center: Math.max(half, Math.min(height - half - entranceOffset, targetY)) };
    }).sort((a, b) => a.center - b.center);
    points.forEach((point, index) => {
      if (index) point.center = Math.max(point.center, points[index - 1].center + spacing);
    });
    // 아래 끝에 몰리면 앞 번호까지 함께 올려 이미지 높이 안에 모든 번호를 유지합니다.
    for (let index = points.length - 1; index >= 0; index--) {
      points[index].center = Math.min(points[index].center,
        index === points.length - 1 ? height - half - entranceOffset : points[index + 1].center - spacing);
    }
    points.forEach(({ mark, x, y, targetY, center }) => {
      const dx = x + 1, dy = targetY - center;
      mark.style.setProperty('--callout-left', `${-23 - x - border}px`);
      mark.style.setProperty('--callout-top', `${center - half - y - border}px`);
      mark.style.setProperty('--leader-left', `${-1 - x - border}px`);
      mark.style.setProperty('--leader-top', `${center - y - border}px`);
      mark.style.setProperty('--leader-width', `${Math.hypot(dx, dy)}px`);
      mark.style.setProperty('--leader-angle', `${Math.atan2(dy, dx)}rad`);
    });
  }

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
      fitCallouts(map, width * scale, height * scale);
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

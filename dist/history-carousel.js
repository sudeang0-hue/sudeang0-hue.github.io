(() => {
  const root = document.querySelector('[data-history-carousel]');
  if (!root) return;
  const viewport = root.querySelector('.history-viewport');
  const track = root.querySelector('.history-track');
  const toolbar = root.querySelector('.history-controls');
  const siteHeader = document.querySelector('.site-header');
  const panels = [...track.children];
  const controls = [...root.querySelectorAll('[data-history-select]')];
  const status = root.querySelector('[data-history-status]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let motion = null;
  let pointer = null;
  let pending = null;
  let timer = null;
  let suppressClickUntil = 0;
  const count = panels.length;
  const wrap = index => (index + count) % count;
  const visibleCount = () => Number(getComputedStyle(viewport).getPropertyValue('--history-columns')) || 1;
  const step = () => panels[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
  const offset = x => { track.style.transform = `translateX(${x}px)`; };

  function measureHeader() {
    root.style.setProperty('--history-header-height', `${Math.ceil(siteHeader?.getBoundingClientRect().height || 0)}px`);
  }

  function revealPanelStart() {
    const top = viewport.getBoundingClientRect().top;
    const clearance = (siteHeader?.getBoundingClientRect().height || 0) + toolbar.getBoundingClientRect().height + 24;
    if (top < clearance - 1) {
      window.scrollTo({top: Math.max(0, window.scrollY + top - clearance), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }
  }

  function resizeHeight() {
    if (motion) return;
    const visible = [...track.children].slice(0, visibleCount());
    viewport.style.height = `${Math.ceil(Math.max(...visible.map(panel => panel.getBoundingClientRect().height)))}px`;
  }

  function sync(announce = false) {
    const visible = new Set([...track.children].slice(0, visibleCount()));
    for (const panel of panels) {
      const hidden = !visible.has(panel);
      if (hidden && panel.contains(document.activeElement)) viewport.focus({preventScroll: true});
      panel.inert = hidden;
      panel.setAttribute('aria-hidden', String(hidden));
    }
    controls.forEach((button, index) => button.setAttribute('aria-pressed', String(index === current)));
    root.dataset.current = panels[current].id;
    resizeHeight();
    if (announce) status.textContent = [...visible].map(panel => panel.querySelector('h2').textContent).join(', ') + ' 항목 표시';
  }

  function finish(index, updateHash = true) {
    clearTimeout(timer);
    track.classList.remove('is-animating');
    while (track.firstElementChild !== panels[index]) track.append(track.firstElementChild);
    offset(0);
    current = index;
    motion = null;
    sync(true);
    if (updateHash) {
      history.replaceState(null, '', `#${panels[current].id}`);
      revealPanelStart();
    }
    if (pending !== null) {
      const next = pending;
      pending = null;
      select(next);
    }
  }

  function prepare(direction) {
    motion = {from: current, to: wrap(current + direction), direction};
    track.classList.remove('is-animating');
    if (direction < 0) track.prepend(track.lastElementChild);
    offset(direction < 0 ? -step() : 0);
  }

  function animate(commit) {
    const targetIndex = commit ? motion.to : motion.from;
    const targetX = motion.direction > 0 ? (commit ? -step() : 0) : (commit ? 0 : -step());
    if (reducedMotion.matches) { finish(targetIndex, commit); return; }
    // 시작 위치를 확정하고 이동하며, 연속 클릭은 마지막 선택을 유지합니다.
    track.getBoundingClientRect();
    track.classList.add('is-animating');
    offset(targetX);
    const complete = () => finish(targetIndex, commit);
    motion.complete = complete;
    timer = setTimeout(complete, 360);
  }

  function select(index) {
    if (motion || pointer) { pending = index; return; }
    if (index === current) { revealPanelStart(); return; }
    prepare(wrap(index - current) === 1 ? 1 : -1);
    animate(true);
  }

  controls.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let target;
      if (event.key === 'ArrowRight') target = wrap(index + 1);
      else if (event.key === 'ArrowLeft') target = wrap(index - 1);
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = count - 1;
      else return;
      event.preventDefault();
      controls[target].focus();
      select(target);
    });
  });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = event.key === 'ArrowRight' ? wrap(current + 1) : event.key === 'ArrowLeft' ? wrap(current - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
    if (index === null) return;
    event.preventDefault();
    select(index);
  });

  viewport.addEventListener('pointerdown', event => {
    if (motion || pointer || !event.isPrimary || event.button !== 0 || event.target.closest('button,input,textarea,select')) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), dx: 0, active: false};
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.active) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      pointer.active = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      window.getSelection()?.removeAllRanges();
      prepare(dx < 0 ? 1 : -1);
    }
    event.preventDefault();
    // 드래그 방향이 바뀌면 시작 항목은 유지하고 반대쪽 이웃을 준비합니다.
    const direction = dx < 0 ? 1 : -1;
    if (dx !== 0 && direction !== motion.direction) {
      while (track.firstElementChild !== panels[current]) track.append(track.firstElementChild);
      prepare(direction);
    }
    pointer.dx = dx;
    const distance = Math.min(Math.abs(dx), step());
    offset(motion.direction > 0 ? -distance : -step() + distance);
  });

  function release(event, cancelled = false) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer;
    pointer = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (!gesture.active) {
      if (pending !== null) { const next = pending; pending = null; select(next); }
      return;
    }
    suppressClickUntil = performance.now() + 300;
    const distance = Math.abs(gesture.dx);
    const fast = distance > 24 && distance / Math.max(1, performance.now() - gesture.time) > .4;
    animate(!cancelled && (distance >= Math.max(48, step() * .18) || fast));
  }
  // 드래그 판정 전에 영역을 벗어나도 누름 상태를 반드시 해제합니다.
  window.addEventListener('pointerup', event => release(event));
  window.addEventListener('pointercancel', event => release(event, true));
  viewport.addEventListener('lostpointercapture', event => release(event, true));
  window.addEventListener('blur', () => { if (pointer) release({pointerId: pointer.id}, true); });
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform') motion?.complete?.();
  });
  window.addEventListener('resize', () => {
    measureHeader();
    if (pointer) {
      const capturedId = pointer.id;
      pointer = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(capturedId)) viewport.releasePointerCapture(capturedId);
    }
    if (motion) finish(motion.from, false);
    sync();
  });
  const fromHash = () => panels.findIndex(panel => panel.id === location.hash.slice(1) || panel.contains(document.getElementById(location.hash.slice(1))));
  window.addEventListener('hashchange', () => { const index = fromHash(); if (index >= 0) select(index); });
  // 인쇄에서는 화면 밖 항목도 원래 순서로 모두 출력합니다.
  window.addEventListener('beforeprint', () => {
    if (motion) finish(motion.from, false);
    panels.forEach(panel => { track.append(panel); panel.inert = false; panel.removeAttribute('aria-hidden'); });
  });
  window.addEventListener('afterprint', () => { while (track.firstElementChild !== panels[current]) track.append(track.firstElementChild); sync(); });
  measureHeader();
  const headerObserver = new ResizeObserver(measureHeader);
  if (siteHeader) headerObserver.observe(siteHeader);
  root.dataset.ready = 'true';
  const initial = fromHash();
  if (initial > 0) { while (track.firstElementChild !== panels[initial]) track.append(track.firstElementChild); current = initial; }
  sync();
  const observer = new ResizeObserver(resizeHeight);
  panels.forEach(panel => observer.observe(panel));
  document.fonts?.ready.then(resizeHeight);
})();

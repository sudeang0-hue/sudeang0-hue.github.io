(() => {
  'use strict';
  const group = document.querySelector('[data-development-work]');
  if (!group) return;

  const mobile = matchMedia('(max-width: 760px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const items = [...group.querySelectorAll('[data-project-preview]')].map(card => ({
    card, video: card.querySelector('[data-preview-video]'), visible: true, running: false, attempt: 0,
  })).filter(item => item.video);
  if (!items.length) return;

  let pageActive = true;
  let hovered = null;
  let focused = null;
  let scrolled = null;
  let latestInput = 'pointer';
  let keyboardFocusAllowed = false;
  let scrollFrame = 0;
  const selectedCard = () => mobile.matches ? scrolled
    : latestInput === 'pointer' ? hovered || focused : focused || hovered;
  const canPlay = item => item.card === selectedCard() && item.visible && pageActive
    && !document.hidden && !reducedMotion.matches && !connection?.saveData;

  function resetVideo(item) {
    item.card.classList.remove('is-playing');
    item.video.pause();
    try { item.video.currentTime = 0; } catch { /* 메타데이터를 받기 전에는 재생 위치 설정이 제한될 수 있습니다. */ }
  }
  function syncVideo(item) {
    const running = canPlay(item);
    if (running === item.running) return;
    item.running = running;
    const attempt = ++item.attempt;
    if (!running) { resetVideo(item); return; }

    // 선택한 영상만 내려받고, 실제 playing 이벤트가 온 뒤 썸네일 위에 표시합니다.
    const source = mobile.matches && item.video.dataset.mobileSource
      ? item.video.dataset.mobileSource : item.video.dataset.source;
    if (!source) return;
    if (item.video.getAttribute('src') !== source) item.video.src = source;
    item.video.muted = true;
    try {
      item.video.play()?.catch(() => {
        if (item.attempt === attempt) { item.running = false; resetVideo(item); }
      });
    } catch { item.running = false; resetVideo(item); }
  }
  function syncCards() {
    const active = selectedCard();
    group.classList.toggle('has-active', Boolean(active));
    items.forEach(item => {
      item.card.classList.toggle('is-active', item.card === active);
      syncVideo(item);
    });
  }

  items.forEach(item => {
    const { card, video } = item;
    video.addEventListener('playing', () => {
      if (item.running && canPlay(item)) card.classList.add('is-playing');
      else resetVideo(item);
    });
    video.addEventListener('error', () => { item.running = false; resetVideo(item); });
    card.addEventListener('pointerenter', event => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      latestInput = 'pointer';
      hovered = card;
      syncCards();
    });
    card.addEventListener('pointerleave', () => {
      if (hovered === card) hovered = null;
      syncCards();
    });
    card.addEventListener('focusin', event => {
      if (!keyboardFocusAllowed || !event.target.matches?.(':focus-visible')) return;
      latestInput = 'keyboard';
      focused = card;
      syncCards();
    });
    card.addEventListener('focusout', event => {
      if (!card.contains(event.relatedTarget)) { focused = null; syncCards(); }
    });
  });

  function usePointerInput() {
    // 클릭·드래그 후 :focus-visible이 남아도 키보드 선택으로 재인식하지 않습니다.
    keyboardFocusAllowed = false;
    latestInput = 'pointer';
    focused = null;
    syncCards();
  }
  document.addEventListener('pointerdown', usePointerInput, true);
  document.addEventListener('mousedown', usePointerInput, true);
  document.addEventListener('keydown', () => { keyboardFocusAllowed = true; }, true);

  function updateScrollCard() {
    scrollFrame = 0;
    let next = null;
    if (mobile.matches) {
      // 내부 화면의 확대와 무관한 바깥 영역을 고정 기준선과 비교합니다.
      const viewport = window.visualViewport;
      const line = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) * .55;
      const bounds = items.map(item => item.card.getBoundingClientRect());
      next = items.find((item, index) => {
        const top = index ? (bounds[index - 1].bottom + bounds[index].top) / 2 : bounds[index].top;
        const bottom = index < items.length - 1 ? (bounds[index].bottom + bounds[index + 1].top) / 2 : bounds[index].bottom;
        return top <= line && line < bottom;
      })?.card || null;
    }
    if (next !== scrolled) { scrolled = next; syncCards(); }
  }
  function queueScrollCard() {
    if (mobile.matches && pageActive && !document.hidden && !scrollFrame) {
      scrollFrame = requestAnimationFrame(updateScrollCard);
    }
  }
  function syncMode() {
    cancelAnimationFrame(scrollFrame);
    hovered = null;
    group.classList.toggle('is-scroll-preview', mobile.matches);
    // 화면 폭 변경 시 기존 소스로 재생 중인 요청도 정지하고 새 조건으로 시작합니다.
    items.forEach(item => { item.running = false; item.attempt++; resetVideo(item); });
    updateScrollCard();
    syncCards();
  }
  function syncPage() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    if (pageActive && !document.hidden && mobile.matches) updateScrollCard();
    syncCards();
  }
  window.addEventListener('scroll', queueScrollCard, { passive: true });
  window.addEventListener('resize', queueScrollCard);
  window.addEventListener('load', queueScrollCard);
  window.visualViewport?.addEventListener('resize', queueScrollCard);
  window.visualViewport?.addEventListener('scroll', queueScrollCard, { passive: true });
  document.fonts?.ready.then(queueScrollCard);
  document.addEventListener('visibilitychange', syncPage);
  window.addEventListener('pagehide', () => { pageActive = false; syncPage(); });
  window.addEventListener('pageshow', () => { pageActive = true; syncPage(); });
  reducedMotion.addEventListener('change', syncCards);
  connection?.addEventListener('change', syncCards);
  mobile.addEventListener('change', syncMode);
  finePointer.addEventListener('change', () => { hovered = null; syncCards(); });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = items.find(candidate => candidate.video.parentElement === entry.target);
        if (item) { item.visible = entry.isIntersecting; syncVideo(item); }
      });
    }, { threshold: 0 });
    // 설명만 남아 보이는 동안에는 화면 밖 영상의 재생도 멈춥니다.
    items.forEach(item => observer.observe(item.video.parentElement));
  }
  syncMode();
})();

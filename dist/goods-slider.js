// 굿즈 사진에만 적용하며 연혁 캐러셀과 상태를 공유하지 않습니다.
document.querySelectorAll('[data-goods-slider]').forEach(root => {
  const viewport = root.querySelector('.goods-slider-window');
  const track = root.querySelector('.goods-slider-track');
  const slides = [...root.querySelectorAll('.goods-slide')];
  const controls = root.querySelector('.goods-slider-controls');
  const count = root.querySelector('[data-slide-count]');
  const status = root.querySelector('[data-slide-status]');
  const play = root.querySelector('[data-slide-play]');
  const dialog = document.querySelector('#image-dialog');
  if (!viewport || !track || !controls || !count || !status || slides.length < 2) return;

  const interval = Number(root.dataset.interval) === 2000 ? 2000 : 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let wantsAuto = interval > 0 && !reducedMotion.matches;
  let inView = false;
  let hovered = false;
  let timer = 0;
  let drag = null;
  let suppressClickUntil = 0;

  function syncAuto() {
    clearTimeout(timer);
    timer = 0;
    root.dataset.autoplay = String(wantsAuto);
    if (play) {
      play.setAttribute('aria-pressed', String(wantsAuto));
      play.setAttribute('aria-label', wantsAuto ? '자동 넘김 일시정지' : '자동 넘김 재생');
      play.querySelector('[data-play-icon]').textContent = wantsAuto ? 'Ⅱ' : '▶';
    }
    if (!wantsAuto || !inView || document.hidden || hovered || drag || (root.matches(':focus-within') && document.activeElement !== play) || dialog?.open) return;
    timer = setTimeout(() => show(index + 1, false), interval);
  }

  function preload(position) {
    const image = slides[(position + slides.length) % slides.length].querySelector('img');
    if (image) image.loading = 'eager';
  }

  function show(position, manual = true) {
    const next = (position + slides.length) % slides.length;
    const wrapped = Math.abs(next - index) > 1;
    // 끝에서 처음으로 갈 때 모든 중간 사진을 역방향으로 지나가지 않습니다.
    track.style.transitionDuration = wrapped ? '0s' : '';
    index = next;
    root.dataset.slideIndex = String(index);
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.setAttribute('aria-hidden', String(i !== index));
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', '사진');
      slide.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
    });
    count.textContent = `${index + 1} / ${slides.length}`;
    if (manual) status.textContent = `${index + 1} / ${slides.length} · ${slides[index].querySelector('img').alt}`;
    preload(index);
    preload(index + 1);
    syncAuto();
  }

  root.querySelector('[data-slide-prev]').addEventListener('click', () => show(index - 1));
  root.querySelector('[data-slide-next]').addEventListener('click', () => show(index + 1));
  play?.addEventListener('click', () => {
    wantsAuto = !wantsAuto;
    syncAuto();
  });
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.target !== viewport) viewport.focus({preventScroll: true});
    show(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
  });

  // 가로 제스처가 확인된 경우만 잡아 모바일 세로 스크롤을 유지합니다.
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('figcaption')) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, captured: false};
    syncAuto();
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.captured && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      drag.captured = true;
      viewport.setPointerCapture(event.pointerId);
    }
  }, {passive: true});
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    drag = null;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (viewport.hasPointerCapture(current.id)) viewport.releasePointerCapture(current.id);
    const threshold = Math.max(32, Math.min(60, viewport.clientWidth * .12));
    const swiped = event.type !== 'pointercancel' && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.25;
    if (current.captured || swiped) suppressClickUntil = performance.now() + 350;
    if (swiped) show(index + (dx < 0 ? 1 : -1));
    else syncAuto();
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('click', event => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; syncAuto(); }
  });
  viewport.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; syncAuto(); }
  });
  root.addEventListener('focusin', syncAuto);
  root.addEventListener('focusout', () => queueMicrotask(syncAuto));
  document.addEventListener('visibilitychange', syncAuto);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', syncAuto);
  if (dialog) new MutationObserver(syncAuto).observe(dialog, {attributes: true, attributeFilter: ['open']});
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) wantsAuto = false;
    syncAuto();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncAuto();
    }, {threshold: .2}).observe(root);
  } else inView = true;
  controls.hidden = false;
  root.dataset.ready = '';
  show(0, false);
});

document.querySelector('[data-goods-top]')?.addEventListener('click', event => {
  const top = document.querySelector('#goods-top');
  if (!top) return;
  event.preventDefault();
  history.replaceState(null, '', '#goods-top');
  top.focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
});

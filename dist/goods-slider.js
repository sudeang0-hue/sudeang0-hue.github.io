// 굿즈 사진의 논리 번호와 복사본 위치를 나눠 양방향 경계도 한 장씩 넘깁니다.
document.querySelectorAll('[data-goods-slider]').forEach(root => {
  const viewport = root.querySelector('.goods-slider-window');
  const track = root.querySelector('.goods-slider-track');
  const slides = track ? [...track.children] : [];
  const originals = slides.filter(slide => !slide.hasAttribute('data-goods-copy'));
  const length = originals.length;
  const prefix = slides.findIndex(slide => !slide.hasAttribute('data-goods-copy'));
  const controls = root.querySelector('.goods-slider-controls');
  const count = root.querySelector('[data-slide-count]');
  const status = root.querySelector('[data-slide-status]');
  const play = root.querySelector('[data-slide-play]');
  const dialog = document.querySelector('#image-dialog');
  if (!viewport || !track || !controls || !count || !status || length < 2) return;

  // 정적 복사본도 app.js의 원본 확대 이벤트를 그대로 사용합니다.
  slides.forEach(slide => { if (slide.hasAttribute('data-goods-copy')) slide.hidden = false; });
  const interval = Number(root.dataset.interval) === 2000 ? 2000 : 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const FINISH_FALLBACK_MS = 550;
  const wrap = value => (value % length + length) % length;
  let index = 0;
  let position = prefix;
  let moving = false;
  let pendingSteps = 0;
  let announcePending = false;
  let finishTimer = 0;
  let generation = 0;
  let startedAt = 0;
  let resizeFrame = 0;
  let wantsAuto = interval > 0 && !reducedMotion.matches;
  let inView = false;
  let hovered = false;
  let pageActive = true;
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
    if (!wantsAuto || !inView || !pageActive || document.hidden || hovered || moving || pendingSteps || drag || (root.matches(':focus-within') && document.activeElement !== play) || dialog?.open) return;
    // 이동을 마친 사진을 2초 보여준 뒤 다음 사진으로 넘깁니다.
    timer = setTimeout(() => move(1, false), interval);
  }

  function render(announce = false, instant = false) {
    const focused = slides.find(slide => slide.contains(document.activeElement));
    root.dataset.slideIndex = String(index);
    root.dataset.slidePosition = String(position);
    root.dataset.slideAnimating = String(moving);
    track.style.transitionDuration = instant ? '0s' : '';
    const offset = slides[position].offsetLeft - slides[0].offsetLeft;
    track.style.transform = `translateX(${-offset}px)`;
    slides.forEach((slide, i) => {
      const shown = i === position;
      const source = Number(slide.dataset.goodsSource);
      slide.inert = !shown;
      slide.setAttribute('aria-hidden', String(!shown));
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', '사진');
      slide.setAttribute('aria-label', `${source + 1} / ${length}`);
      if (Math.abs(i - position) <= 1 || source === wrap(index + 1) || source === wrap(index - 1)) {
        const image = slide.querySelector('img');
        if (image) image.loading = 'eager';
      }
    });
    if (focused?.inert) {
      const equivalent = slides.find(slide => !slide.inert && slide.dataset.goodsSource === focused.dataset.goodsSource);
      (equivalent?.querySelector('button') ?? viewport).focus({preventScroll: true});
    }
    count.textContent = `${index + 1} / ${length}`;
    if (announce) status.textContent = `${index + 1} / ${length} · ${originals[index].querySelector('img').alt}`;
  }

  function clearFinish() {
    clearTimeout(finishTimer);
    finishTimer = 0;
  }

  function finish(token) {
    if (!moving || token !== generation) return;
    clearFinish();
    moving = false;
    // 복사본까지 이동을 끝낸 뒤 같은 사진의 원본 위치로만 정렬합니다.
    position = prefix + index;
    render(false, true);
    void track.offsetWidth;
    pump();
    syncAuto();
  }

  function pump() {
    while (!moving && pendingSteps) {
      const direction = Math.sign(pendingSteps);
      pendingSteps -= direction;
      index = wrap(index + direction);
      const announce = announcePending;
      if (!pendingSteps) announcePending = false;
      if (reducedMotion.matches) {
        position = prefix + index;
        render(announce, true);
        continue;
      }
      position += direction;
      moving = true;
      const token = ++generation;
      startedAt = performance.now();
      render(announce, false);
      finishTimer = setTimeout(() => finish(token), FINISH_FALLBACK_MS);
    }
  }

  function move(direction, manual = true) {
    pendingSteps += direction;
    announcePending ||= manual;
    pump();
    if (!pendingSteps) announcePending = false;
    syncAuto();
  }

  function jump(value, announce = true) {
    generation++;
    clearFinish();
    moving = false;
    pendingSteps = 0;
    announcePending = false;
    index = wrap(value);
    position = prefix + index;
    render(announce, true);
    void track.offsetWidth;
    syncAuto();
  }

  track.addEventListener('transitionend', event => {
    if (event.target !== track || event.propertyName !== 'transform' || event.timeStamp < startedAt) return;
    finish(generation);
  });
  root.querySelector('[data-slide-prev]').addEventListener('click', () => move(-1));
  root.querySelector('[data-slide-next]').addEventListener('click', () => move(1));
  play?.addEventListener('click', () => {
    wantsAuto = !wantsAuto;
    syncAuto();
  });
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (event.target !== viewport) viewport.focus({preventScroll: true});
    if (event.key === 'Home' || event.key === 'End') jump(event.key === 'Home' ? 0 : length - 1);
    else move(event.key === 'ArrowRight' ? 1 : -1);
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
    if (!drag.captured && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      drag = null;
      syncAuto();
      return;
    }
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
    if (swiped) move(dx < 0 ? 1 : -1);
    else syncAuto();
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('click', event => {
    if (!moving && performance.now() >= suppressClickUntil) return;
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
  window.addEventListener('pagehide', () => {
    pageActive = false;
    jump(index + pendingSteps, false);
  });
  window.addEventListener('pageshow', () => { pageActive = true; syncAuto(); });
  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      jump(index + pendingSteps, false);
    });
  });
  if (dialog) new MutationObserver(syncAuto).observe(dialog, {attributes: true, attributeFilter: ['open']});
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) wantsAuto = false;
    jump(index + pendingSteps, false);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncAuto();
    }, {threshold: .2}).observe(root);
  } else inView = true;
  controls.hidden = false;
  root.dataset.ready = '';
  jump(0, false);
});

document.querySelector('[data-goods-top]')?.addEventListener('click', event => {
  const top = document.querySelector('#goods-top');
  if (!top) return;
  event.preventDefault();
  history.replaceState(null, '', '#goods-top');
  top.focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
});

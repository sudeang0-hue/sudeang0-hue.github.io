(() => {
  'use strict';
  const background = document.querySelector('[data-goods-background]');
  const intro = document.querySelector('[data-goods-background-intro]');
  const control = document.querySelector('[data-goods-background-toggle]');
  const icon = document.querySelector('[data-goods-background-icon]');
  const header = document.querySelector('.site-header');
  const layers = background ? [...background.querySelectorAll('[data-goods-background-layer]')] : [];
  if (!background || !intro || !control || !header || layers.length !== 2) return;

  let photos;
  try { photos = JSON.parse(background.dataset.photos); } catch { return; }
  const interval = Number(background.dataset.intervalMs);
  const fadeDuration = Number(background.dataset.fadeMs);
  if (!Array.isArray(photos) || photos.length < 2 || !Number.isFinite(interval) || !Number.isFinite(fadeDuration)) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const failed = new Set();
  let index = 0;
  let layerIndex = 0;
  let nextIndex = -1;
  let phase = 'hold';
  let remaining = interval;
  let holdStartedAt = 0;
  let timer = 0;
  let animation = null;
  let frame = 0;
  let inIntro = false;
  let suspended = false;
  let userPaused = false;
  let userAllowedMotion = false;
  let blocked = false;

  const prefersStill = () => motion.matches || Boolean(connection?.saveData);
  const shouldPlay = () => inIntro && !document.hidden && !suspended && !userPaused && !blocked
    && (!prefersStill() || userAllowedMotion);

  function updateControl() {
    control.hidden = !inIntro;
    const active = shouldPlay();
    const label = active ? '배경 사진 자동 넘김 일시정지' : '배경 사진 자동 넘김 재생';
    control.setAttribute('aria-label', label);
    control.title = label;
    if (icon) icon.textContent = active ? 'Ⅱ' : '▶';
    background.dataset.phase = phase;
    background.dataset.playing = String(active);
    background.dataset.photoIndex = String(index);
  }

  function pause() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      remaining = Math.max(0, remaining - (performance.now() - holdStartedAt));
    }
    animation?.pause();
    updateControl();
  }

  function finishFade() {
    if (phase !== 'fade') return;
    const incoming = layers[1 - layerIndex];
    incoming.style.opacity = '1';
    layers[layerIndex].style.opacity = '0';
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    }
    layerIndex = 1 - layerIndex;
    index = nextIndex;
    nextIndex = -1;
    phase = 'hold';
    remaining = interval;
    sync();
  }

  function beginFade() {
    if (!shouldPlay() || phase !== 'ready') return;
    const outgoing = layers[layerIndex];
    const incoming = layers[1 - layerIndex];
    outgoing.style.zIndex = '0';
    outgoing.style.opacity = '1';
    incoming.style.zIndex = '1';
    incoming.style.opacity = '0';
    phase = 'fade';
    // 아래 사진은 불투명하게 유지해 전환 중 밝기가 꺼지는 현상을 피합니다.
    if (typeof incoming.animate !== 'function') {
      finishFade();
      return;
    }
    animation = incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: fadeDuration, easing: 'ease-in-out', fill: 'forwards',
    });
    animation.onfinish = finishFade;
    updateControl();
  }

  async function loadNext() {
    if (!shouldPlay() || !['hold', 'retry'].includes(phase)) return;
    phase = 'loading';
    updateControl();
    const incoming = layers[1 - layerIndex];
    // 실패한 파일은 수동 재생으로 재시도하기 전까지 건너뛰며, 보이지 않을 때 추가 요청하지 않습니다.
    for (let step = 1; step < photos.length; step += 1) {
      const candidate = (index + step) % photos.length;
      if (failed.has(candidate)) continue;
      if (!shouldPlay()) { phase = 'retry'; updateControl(); return; }
      incoming.style.opacity = '0';
      incoming.style.objectPosition = photos[candidate].position;
      incoming.width = photos[candidate].width;
      incoming.height = photos[candidate].height;
      incoming.src = photos[candidate].src;
      try {
        if (typeof incoming.decode === 'function') await incoming.decode();
        else await new Promise((resolve, reject) => {
          if (incoming.complete) { incoming.naturalWidth ? resolve() : reject(); return; }
          incoming.onload = () => { incoming.onload = incoming.onerror = null; resolve(); };
          incoming.onerror = () => { incoming.onload = incoming.onerror = null; reject(); };
        });
        nextIndex = candidate;
        phase = 'ready';
        sync();
        return;
      } catch {
        failed.add(candidate);
      }
    }
    blocked = true;
    phase = 'hold';
    remaining = interval;
    updateControl();
  }

  function sync() {
    const bounds = intro.getBoundingClientRect();
    inIntro = bounds.bottom > header.getBoundingClientRect().bottom && bounds.top < window.innerHeight;
    if (!shouldPlay()) { pause(); return; }
    if (phase === 'fade') animation?.play();
    else if (phase === 'ready') beginFade();
    else if (phase === 'retry') loadNext();
    else if (phase === 'hold' && !timer) {
      holdStartedAt = performance.now();
      timer = setTimeout(() => {
        timer = 0;
        remaining = 0;
        loadNext();
      }, remaining);
    }
    updateControl();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; sync(); });
  }

  control.addEventListener('click', () => {
    if (shouldPlay()) {
      userPaused = true;
      pause();
    } else {
      userPaused = false;
      userAllowedMotion = true;
      blocked = false;
      failed.clear();
      sync();
    }
  });
  function applyPreference() { userAllowedMotion = false; sync(); }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { suspended = true; pause(); });
  window.addEventListener('pageshow', () => { suspended = false; sync(); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', applyPreference);
  connection?.addEventListener('change', applyPreference);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    observer.observe(intro);
  }
  sync();
})();

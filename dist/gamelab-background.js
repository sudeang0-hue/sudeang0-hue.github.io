(() => {
  'use strict';
  const background = document.querySelector('[data-gamelab-background]');
  const video = document.querySelector('[data-gamelab-background-video]');
  const control = document.querySelector('[data-gamelab-background-toggle]');
  const icon = document.querySelector('[data-gamelab-background-icon]');
  const intro = document.querySelector('[data-gamelab-intro]');
  const header = document.querySelector('.site-header');
  if (!background || !video || !control || !intro || !header) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 768px)');
  const connection = navigator.connection;
  let userPaused = false;
  let userAllowedMotion = false;
  let autoplayBlocked = false;
  let suspended = false;
  let inIntro = false;
  let loading = false;
  let attempt = 0;
  let frame = 0;
  video.muted = true;
  video.defaultMuted = true;

  const prefersStill = () => motion.matches || Boolean(connection?.saveData);
  const shouldPlay = () => inIntro && !document.hidden && !suspended
    && !userPaused && !autoplayBlocked && (!prefersStill() || userAllowedMotion);

  function updateControl() {
    control.hidden = !inIntro;
    const active = loading || !video.paused;
    const label = active ? '배경 영상 일시정지' : '배경 영상 재생';
    control.setAttribute('aria-label', label);
    control.title = label;
    if (icon) icon.textContent = active ? 'Ⅱ' : '▶';
  }

  function pause() {
    attempt += 1;
    loading = false;
    video.pause();
    updateControl();
  }

  async function sync() {
    // 실제 영상 영역이 헤더 뒤로 지나가면 정지하며 마지막 프레임은 유지합니다.
    const bounds = background.getBoundingClientRect();
    inIntro = bounds.bottom > header.getBoundingClientRect().bottom
      && bounds.top < window.innerHeight;
    if (!shouldPlay()) {
      pause();
      return;
    }
    updateControl();
    if (loading || !video.paused) return;
    // 소스를 한 번만 지정하여 화면 크기 변화에 따른 중복 다운로드를 피합니다.
    if (!video.hasAttribute('src')) {
      video.src = mobile.matches ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    }
    const currentAttempt = ++attempt;
    loading = true;
    updateControl();
    try {
      await video.play();
    } catch {
      if (currentAttempt !== attempt) return;
      autoplayBlocked = true;
      background.classList.remove('is-playing');
      video.pause();
    } finally {
      if (currentAttempt === attempt) {
        loading = false;
        updateControl();
      }
    }
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  }

  video.addEventListener('playing', () => {
    if (!shouldPlay()) { pause(); return; }
    loading = false;
    background.classList.add('is-playing');
    updateControl();
  });
  video.addEventListener('pause', updateControl);
  video.addEventListener('error', () => {
    if (!video.hasAttribute('src')) return;
    autoplayBlocked = true;
    background.classList.remove('is-playing');
    pause();
  });
  control.addEventListener('click', () => {
    if (loading || !video.paused) {
      userPaused = true;
      pause();
    } else {
      userPaused = false;
      userAllowedMotion = true;
      autoplayBlocked = false;
      sync();
    }
  });

  function applyPreference() {
    userAllowedMotion = false;
    if (prefersStill()) {
      pause();
      background.classList.remove('is-playing');
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
    }
    sync();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else sync();
  });
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

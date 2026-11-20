(() => {
  'use strict';
  const player = document.querySelector('[data-gamelab-trailer]');
  if (!player) return;
  const video = player.querySelector('video');
  const controls = player.querySelector('.trailer-controls');
  const play = player.querySelector('[data-trailer-play]');
  const mute = player.querySelector('[data-trailer-mute]');
  const fullscreen = player.querySelector('[data-trailer-fullscreen]');
  if (!video || !controls || !play || !mute || !fullscreen) return;
  let hideTimer;
  let keyboardFocus = false;
  let expanded = false;
  const syncFullscreen = () => {
    fullscreen.setAttribute('aria-label', expanded || document.fullscreenElement === player ? '트레일러 전체 화면 종료' : '트레일러 전체 화면');
    showControls();
  };
  const setExpanded = value => {
    expanded = value;
    player.classList.toggle('is-expanded', value);
    document.body.classList.toggle('has-trailer-fullscreen', value);
    syncFullscreen();
    if (!value) fullscreen.focus({ preventScroll: true });
  };
  const showControls = () => {
    clearTimeout(hideTimer);
    player.classList.add('show-controls');
    if (!video.paused && !keyboardFocus) {
      hideTimer = setTimeout(() => player.classList.remove('show-controls'), 2200);
    }
  };
  const sync = () => {
    player.classList.toggle('is-playing', !video.paused && !video.ended);
    player.classList.toggle('is-muted', video.muted);
    play.setAttribute('aria-label', video.paused || video.ended ? '트레일러 재생' : '트레일러 일시 정지');
    mute.setAttribute('aria-label', video.muted ? '트레일러 소리 켜기' : '트레일러 소리 끄기');
    mute.setAttribute('aria-pressed', String(video.muted));
    showControls();
  };
  const nativeFallback = () => {
    clearTimeout(hideTimer);
    controls.hidden = true;
    video.controls = true;
  };
  const togglePlayback = async () => {
    if (video.controls) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    try { await video.play(); } catch (error) {
      // 로딩 중 정상 일시정지로 취소된 재생 요청은 오류로 처리하지 않습니다.
      if (error.name === 'AbortError') sync();
      else nativeFallback();
    }
  };
  play.addEventListener('click', togglePlayback);
  video.addEventListener('click', togglePlayback);
  mute.addEventListener('click', () => { video.muted = !video.muted; });
  ['play', 'pause', 'ended', 'volumechange'].forEach(type => video.addEventListener(type, sync));
  video.addEventListener('error', nativeFallback);
  player.addEventListener('pointermove', showControls);
  controls.addEventListener('focusin', event => {
    keyboardFocus = event.target.matches(':focus-visible');
    showControls();
  });
  controls.addEventListener('focusout', () => {
    keyboardFocus = false;
    showControls();
  });
  fullscreen.hidden = false;
  fullscreen.addEventListener('click', async () => {
    if (expanded) { setExpanded(false); return; }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player.requestFullscreen) await player.requestFullscreen();
      else setExpanded(true);
    } catch {
      // 전체 화면 API를 제한하는 모바일·앱 브라우저에서는 화면 안에서 확장합니다.
      setExpanded(true);
    }
  });
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', event => {
    if (expanded && event.key === 'Escape') setExpanded(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
  });
  window.addEventListener('pagehide', () => {
    video.pause();
    if (expanded) setExpanded(false);
    clearTimeout(hideTimer);
  });
  // 스크립트 초기화가 끝난 뒤에만 기본 조작부를 간결한 버튼으로 바꿉니다.
  sync();
  video.controls = false;
  controls.hidden = false;
})();

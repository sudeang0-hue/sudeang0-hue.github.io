(() => {
  'use strict';
  const player = document.querySelector('[data-gamelab-trailer]');
  if (!player) return;
  const video = player.querySelector('video');
  const controls = player.querySelector('.trailer-controls');
  const play = player.querySelector('[data-trailer-play]');
  const mute = player.querySelector('[data-trailer-mute]');
  const volumeGroup = player.querySelector('[data-trailer-volume-group]');
  const volumePanel = player.querySelector('.trailer-volume-panel');
  const volume = player.querySelector('[data-trailer-volume]');
  const volumeMessage = player.querySelector('[data-trailer-volume-message]');
  const fullscreen = player.querySelector('[data-trailer-fullscreen]');
  if (!video || !controls || !play || !mute || !fullscreen || !volumeGroup || !volumePanel || !volume || !volumeMessage) return;
  let hideTimer;
  let keyboardFocus = false;
  let expanded = false;
  let volumeOpen = false;
  let volumeHover = false;
  let volumeAdjusting = false;
  let audioContext, gain, audioReady;
  let volumeLevel = video.volume;
  let requestedVolume = volumeLevel;
  let lastAudibleVolume = volumeLevel || 1;
  const setVolumeOpen = value => {
    volumeOpen = value;
    volumeGroup.classList.toggle('is-open', value);
    volumePanel.setAttribute('aria-hidden', String(!value));
    volume.tabIndex = value ? 0 : -1;
    mute.setAttribute('aria-expanded', String(value));
    if (!value) volumeMessage.hidden = true;
  };
  const syncVolume = () => {
    if (!gain) volumeLevel = video.volume;
    const silent = video.muted || volumeLevel === 0;
    const percent = Math.round((silent ? 0 : volumeLevel) * 100);
    volume.value = String(percent);
    volume.setAttribute('aria-valuetext', silent ? '0% · 음소거' : percent + '%');
    player.classList.toggle('is-muted', silent);
    mute.setAttribute('aria-label', silent ? '트레일러 소리 켜기' : '트레일러 소리 끄기');
    mute.setAttribute('aria-pressed', String(silent));
    if (!silent) lastAudibleVolume = volumeLevel;
  };
  const audioFailure = () => {
    volumeMessage.textContent = '이 기기에서는 기기 음량 버튼으로 조절해 주세요.';
    volumeMessage.hidden = false;
    syncVolume();
  };
  const resumeAudio = () => {
    if (gain && audioContext.state !== 'running') prepareAudio().catch(audioFailure);
  };
  const prepareAudio = () => {
    if (gain && audioContext.state === 'running') return Promise.resolve();
    if (audioReady) return audioReady;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return Promise.reject(new Error('Web Audio unavailable'));
    // iPhone의 video.volume 제한을 피합니다. 사용자 입력 후에만 오디오를 연결합니다.
    if (!audioContext) audioContext = new Context();
    audioReady = (async () => {
      let timeout;
      try {
        await Promise.race([
          audioContext.resume(),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio start timed out')), 3000); }),
        ]);
        if (audioContext.state !== 'running') throw new Error('Audio start blocked');
        if (gain) return;
        const nextGain = audioContext.createGain();
        nextGain.gain.value = requestedVolume;
        nextGain.connect(audioContext.destination);
        // resume 성공 전에는 원래 영상의 음성 경로를 바꾸지 않습니다.
        audioContext.createMediaElementSource(video).connect(nextGain);
        gain = nextGain;
      } finally { clearTimeout(timeout); }
    })().finally(() => { audioReady = null; });
    return audioReady;
  };
  const applyVolume = async () => {
    requestedVolume = Math.max(0, Math.min(1, Number(volume.value) / 100));
    setVolumeOpen(true);
    showControls();
    if (!requestedVolume) video.muted = true;
    try {
      await prepareAudio();
      volumeLevel = requestedVolume;
      gain.gain.setTargetAtTime(volumeLevel, audioContext.currentTime, .015);
      video.muted = volumeLevel === 0;
      volumeMessage.hidden = true;
      syncVolume();
    } catch { audioFailure(); }
    showControls();
  };
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
    if (!video.paused && !keyboardFocus && !volumeHover && !volumeAdjusting) {
      hideTimer = setTimeout(() => {
        setVolumeOpen(false);
        player.classList.remove('show-controls');
      }, volumeOpen ? 5000 : 2200);
    }
  };
  const sync = () => {
    player.classList.toggle('is-playing', !video.paused && !video.ended);
    play.setAttribute('aria-label', video.paused || video.ended ? '트레일러 재생' : '트레일러 일시 정지');
    syncVolume();
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
    resumeAudio();
    try { await video.play(); } catch (error) {
      // 로딩 중 정상 일시정지로 취소된 재생 요청은 오류로 처리하지 않습니다.
      if (error.name === 'AbortError') sync();
      else nativeFallback();
    }
  };
  play.addEventListener('click', togglePlayback);
  video.addEventListener('click', togglePlayback);
  mute.addEventListener('click', () => {
    if (video.muted || volumeLevel === 0) {
      if (volumeLevel === 0) {
        volumeLevel = lastAudibleVolume;
        if (gain) gain.gain.setTargetAtTime(volumeLevel, audioContext.currentTime, .015);
        else video.volume = volumeLevel;
      }
      requestedVolume = volumeLevel;
      resumeAudio();
      video.muted = false;
    } else {
      requestedVolume = 0;
      video.muted = true;
    }
    setVolumeOpen(true);
    syncVolume();
    showControls();
  });
  volume.addEventListener('input', applyVolume);
  volumeGroup.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    volumeHover = true;
    setVolumeOpen(true);
    showControls();
  });
  volumeGroup.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    volumeHover = false;
    if (!keyboardFocus && !volumeAdjusting) setVolumeOpen(false);
    showControls();
  });
  volumeGroup.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' || gain) return;
    // 터치가 끝나는 사용자 입력 시점에 오디오를 먼저 허용하고, 소스 연결은 미룹니다.
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!audioContext && Context) audioContext = new Context();
      audioContext?.resume().catch(() => {});
    } catch { /* 준비 실패 시에도 원래 영상의 음소거와 재생은 유지합니다. */ }
  });
  volume.addEventListener('pointerdown', () => { volumeAdjusting = true; showControls(); });
  const stopVolumeAdjustment = () => { volumeAdjusting = false; showControls(); };
  window.addEventListener('pointerup', stopVolumeAdjustment);
  window.addEventListener('pointercancel', stopVolumeAdjustment);
  ['play', 'pause', 'ended', 'volumechange'].forEach(type => video.addEventListener(type, sync));
  video.addEventListener('error', nativeFallback);
  player.addEventListener('pointermove', showControls);
  controls.addEventListener('focusin', event => {
    keyboardFocus = event.target.matches(':focus-visible');
    if (keyboardFocus && volumeGroup.contains(event.target)) setVolumeOpen(true);
    showControls();
  });
  controls.addEventListener('focusout', event => {
    keyboardFocus = false;
    if (!volumeHover && !volumeGroup.contains(event.relatedTarget)) setVolumeOpen(false);
    showControls();
  });
  controls.addEventListener('keydown', event => {
    keyboardFocus = true;
    if (volumeGroup.contains(event.target)) setVolumeOpen(true);
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
    volumeAdjusting = false;
    volumeHover = false;
    setVolumeOpen(false);
  });
  // 스크립트 초기화가 끝난 뒤에만 기본 조작부를 간결한 버튼으로 바꿉니다.
  sync();
  video.controls = false;
  controls.hidden = false;
})();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 실제 플레이어 스크립트에 입력과 미디어 이벤트를 전달합니다. 화면 비율은 브라우저에서 확인합니다.
const source = fs.readFileSync(new URL('./dist/gamelab-trailer.js', import.meta.url), 'utf8');
class Element {
  constructor() {
    this.handlers = new Map();
    this.classes = new Set();
    this.attrs = new Map();
    this.children = new Map();
    this.hidden = false;
    this.focusCalls = 0;
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, event = {}) {
    return Promise.all((this.handlers.get(type) || []).map(callback => callback({target: this, ...event})));
  }
  querySelector(selector) { return this.children.get(selector) || null; }
  contains(target) { return this === target || [...this.children.values()].some(child => child.contains(target)); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  matches(selector) { return selector === ':focus-visible' && Boolean(this.focusVisible); }
  focus() { this.focusCalls++; }
}

function setup({playMode = 'success', fullscreenMode = 'success', audioMode = 'success', present = true, missing = null} = {}) {
  const player = new Element(), video = new Element(), controls = new Element();
  const play = new Element(), mute = new Element(), fullscreen = new Element();
  const volumeGroup = new Element(), volumePanel = new Element(), volume = new Element(), volumeMessage = new Element();
  const document = new Element(), window = new Element();
  document.body = new Element();
  window.scrollY = 0;
  window.scrollTo = ({top}) => { window.scrollY = top; };
  document.fullscreenElement = null;
  controls.hidden = true;
  video.controls = true;
  video.paused = true;
  video.ended = false;
  video.playCalls = 0;
  volume.value = '100';
  volumeMessage.hidden = true;
  volumePanel.children = new Map([['volume', volume], ['message', volumeMessage]]);
  volumeGroup.children = new Map([['panel', volumePanel], ['mute', mute]]);
  let muted = false;
  Object.defineProperty(video, 'muted', {
    get: () => muted,
    set: value => { muted = value; video.emit('volumechange'); },
  });
  let nativeVolume = 1;
  Object.defineProperty(video, 'volume', {
    get: () => nativeVolume,
    set: value => { nativeVolume = value; video.emit('volumechange'); },
  });
  let pendingPlay;
  video.play = () => {
    video.playCalls++;
    if (playMode === 'reject') return Promise.reject(Object.assign(new Error('Unsupported media'), {name: 'NotSupportedError'}));
    video.paused = false;
    video.ended = false;
    video.emit('play');
    if (playMode === 'pending') {
      return new Promise((resolve, reject) => { pendingPlay = {resolve, reject}; });
    }
    return Promise.resolve();
  };
  video.pause = () => {
    if (video.paused) return;
    video.paused = true;
    video.emit('pause');
    if (pendingPlay) {
      pendingPlay.reject(Object.assign(new Error('Playback interrupted by pause'), {name: 'AbortError'}));
      pendingPlay = null;
    }
  };
  player.children = new Map([
    ['video', video], ['.trailer-controls', controls], ['[data-trailer-play]', play],
    ['[data-trailer-mute]', mute], ['[data-trailer-fullscreen]', fullscreen],
    ['[data-trailer-volume-group]', volumeGroup], ['.trailer-volume-panel', volumePanel],
    ['[data-trailer-volume]', volume], ['[data-trailer-volume-message]', volumeMessage],
  ]);
  if (missing) player.children.delete(missing);
  if (present) document.children.set('[data-gamelab-trailer]', player);
  if (fullscreenMode !== 'absent') {
    player.requestFullscreen = async () => {
      if (fullscreenMode === 'reject') throw new Error('Fullscreen denied');
      document.fullscreenElement = player;
      await document.emit('fullscreenchange');
    };
  }
  document.exitFullscreen = async () => {
    document.fullscreenElement = null;
    await document.emit('fullscreenchange');
  };
  const timers = new Map();
  let now = 0, timerId = 0;
  const audioContexts = [];
  if (audioMode !== 'absent') {
    window.AudioContext = class {
      constructor() {
        this.state = 'suspended';
        this.currentTime = 1;
        this.destination = {};
        this.resumeCalls = 0;
        this.sourceCalls = 0;
        this.gainCalls = [];
        this.mode = audioMode;
        audioContexts.push(this);
      }
      resume() {
        this.resumeCalls++;
        if (this.mode === 'reject') return Promise.reject(new Error('Audio permission rejected'));
        if (this.mode === 'pending') return new Promise(resolve => {
          this.complete = () => { this.state = 'running'; resolve(); };
        });
        this.state = 'running';
        return Promise.resolve();
      }
      createGain() {
        const gain = {value: 1, setTargetAtTime: value => { gain.value = value; this.gainCalls.push(value); }};
        return this.gainNode = {gain, connect: () => { this.gainConnected = true; }};
      }
      createMediaElementSource() {
        this.sourceCalls++;
        return {connect: () => { this.sourceConnected = true; }};
      }
    };
  }
  vm.runInNewContext(source, {
    document, window,
    setTimeout: (callback, delay) => { timers.set(++timerId, {callback, due: now + delay}); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    player, video, controls, play, mute, fullscreen, volumeGroup, volumePanel, volume, volumeMessage,
    document, window, timers, audioContexts,
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of [...timers]) {
        if (timer.due <= now) { timers.delete(id); timer.callback(); }
      }
    },
  };
}

let passed = 0;
async function test(name, action) {
  try { await action(); passed++; }
  catch (error) { throw new Error(`${name}: ${error.message}`, {cause: error}); }
}

await test('대상이나 필수 버튼이 없으면 기본 컨트롤을 유지함', () => {
  for (const options of [{present: false}, {missing: '[data-trailer-play]'}]) {
    const state = setup(options);
    assert.equal(state.video.controls, true);
    assert.equal(state.controls.hidden, true);
  }
});

await test('수동 재생·일시정지와 음소거가 실제 상태 및 접근성 이름에 반영됨', async () => {
  const state = setup();
  assert.equal(state.video.playCalls, 0, '자동 재생하지 않아야 함');
  assert.equal(state.video.controls, false);
  assert.equal(state.controls.hidden, false);
  await state.play.emit('click');
  assert.equal(state.video.paused, false);
  assert.equal(state.player.classes.has('is-playing'), true);
  assert.equal(state.play.attrs.get('aria-label'), '트레일러 일시 정지');
  await state.mute.emit('click');
  assert.equal(state.video.muted, true);
  assert.equal(state.mute.attrs.get('aria-pressed'), 'true');
  assert.equal(state.mute.attrs.get('aria-label'), '트레일러 소리 켜기');
  await state.mute.emit('click');
  assert.equal(state.video.muted, false);
  await state.video.emit('click');
  assert.equal(state.video.paused, true);
  assert.equal(state.play.attrs.get('aria-label'), '트레일러 재생');
  assert.equal(state.player.classes.has('is-playing'), false);
});

await test('버튼은 2.2초 뒤 숨고 포인터·키보드 초점·재생 종료 시 다시 표시됨', async () => {
  const state = setup();
  await state.play.emit('click');
  state.advance(2199);
  assert.equal(state.player.classes.has('show-controls'), true);
  state.advance(1);
  assert.equal(state.player.classes.has('show-controls'), false);
  await state.player.emit('pointermove');
  assert.equal(state.player.classes.has('show-controls'), true);
  state.play.focusVisible = true;
  await state.controls.emit('focusin', {target: state.play});
  state.advance(3000);
  assert.equal(state.player.classes.has('show-controls'), true, '키보드 조작 중에는 버튼이 숨지 않아야 함');
  await state.controls.emit('focusout');
  state.advance(2200);
  assert.equal(state.player.classes.has('show-controls'), false);
  state.video.paused = true;
  state.video.ended = true;
  await state.video.emit('ended');
  assert.equal(state.player.classes.has('show-controls'), true);
  assert.equal(state.player.classes.has('is-playing'), false);
  assert.equal(state.play.attrs.get('aria-label'), '트레일러 재생');
});

await test('로딩 중 일시정지로 취소된 play 요청은 사용자 버튼을 유지함', async () => {
  const state = setup({playMode: 'pending'});
  const pending = state.play.emit('click');
  await state.play.emit('click');
  await pending;
  assert.equal(state.video.paused, true);
  assert.equal(state.video.controls, false);
  assert.equal(state.controls.hidden, false);
  assert.equal(state.play.attrs.get('aria-label'), '트레일러 재생');
  assert.equal(state.timers.size, 0);
});

await test('실제 재생 실패나 미디어 오류에서는 기본 컨트롤로 복구함', async () => {
  for (const failure of ['play', 'media']) {
    const state = setup({playMode: failure === 'play' ? 'reject' : 'success'});
    await state.play.emit('click');
    if (failure === 'media') await state.video.emit('error');
    assert.equal(state.video.controls, true);
    assert.equal(state.controls.hidden, true);
    assert.equal(state.timers.size, 0);
    const calls = state.video.playCalls;
    await state.video.emit('click');
    assert.equal(state.video.playCalls, calls, '기본 컨트롤과 사용자 재생 핸들러가 중복 동작하면 안 됨');
  }
});

await test('지원하는 환경에서는 기본 전체화면에 진입하고 종료함', async () => {
  const state = setup();
  await state.fullscreen.emit('click');
  assert.equal(state.document.fullscreenElement, state.player);
  assert.equal(state.player.classes.has('is-expanded'), false);
  assert.equal(state.fullscreen.attrs.get('aria-label'), '트레일러 전체 화면 종료');
  await state.fullscreen.emit('click');
  assert.equal(state.document.fullscreenElement, null);
  assert.equal(state.fullscreen.attrs.get('aria-label'), '트레일러 전체 화면');
});

await test('전체화면 거절·미지원 시 화면 안에서 확장하고 버튼·Escape로 닫음', async () => {
  for (const fullscreenMode of ['reject', 'absent']) {
    const state = setup({fullscreenMode});
    await state.fullscreen.emit('click');
    assert.equal(state.player.classes.has('is-expanded'), true);
    assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), true);
    assert.equal(state.fullscreen.attrs.get('aria-label'), '트레일러 전체 화면 종료');
    await state.fullscreen.emit('click');
    assert.equal(state.player.classes.has('is-expanded'), false);
    assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), false);
    assert.equal(state.fullscreen.focusCalls, 1);
    await state.fullscreen.emit('click');
    await state.document.emit('keydown', {key: 'Escape'});
    assert.equal(state.player.classes.has('is-expanded'), false);
    assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), false);
    assert.equal(state.fullscreen.attrs.get('aria-label'), '트레일러 전체 화면');
    assert.equal(state.fullscreen.focusCalls, 2);
  }
});

await test('확대 중 재생·미디어 오류가 나면 본문으로 복귀하고 기본 영상에 초점을 돌림', async () => {
  for (const fullscreenMode of ['success', 'reject', 'absent']) {
    for (const failure of ['play', 'media']) {
      const state = setup({fullscreenMode, playMode: 'reject'});
      await state.fullscreen.emit('click');
      if (failure === 'media') await state.video.emit('error');
      else await state.play.emit('click');
      assert.equal(state.document.fullscreenElement, null);
      assert.equal(state.player.classes.has('is-expanded'), false);
      assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), false);
      assert.equal(state.video.controls, true);
      assert.equal(state.controls.hidden, true);
      assert.equal(state.video.focusCalls, 1);
    }
  }
});

await test('대체 전체화면 오류·닫기 버튼·Escape 후 확대 직전의 스크롤 위치를 복원함', async () => {
  const state = setup({fullscreenMode: 'absent'});
  for (const [index, close] of ['button', 'escape', 'error'].entries()) {
    const originalTop = 740 + index * 140;
    state.window.scrollY = originalTop;
    await state.fullscreen.emit('click');
    state.window.scrollY -= 118;
    if (close === 'button') await state.fullscreen.emit('click');
    if (close === 'escape') await state.document.emit('keydown', {key: 'Escape'});
    if (close === 'error') await state.video.emit('error');
    assert.equal(state.window.scrollY, originalTop);
  }
});

await test('오류 후 기본 전체화면 종료가 거절되어도 닫기 버튼으로 다시 나갈 수 있음', async () => {
  const state = setup();
  await state.fullscreen.emit('click');
  const exit = state.document.exitFullscreen;
  state.document.exitFullscreen = async () => { throw new Error('Exit denied'); };
  await state.video.emit('error');
  assert.equal(state.document.fullscreenElement, state.player);
  assert.equal(state.controls.hidden, false);
  assert.equal(state.fullscreen.hidden, false);
  assert.equal(state.play.hidden, true);
  assert.equal(state.mute.hidden, true);
  assert.equal(state.fullscreen.attrs.get('aria-label'), '트레일러 전체 화면 종료');
  state.document.exitFullscreen = exit;
  await state.fullscreen.emit('click');
  assert.equal(state.document.fullscreenElement, null);
  assert.equal(state.controls.hidden, true);
  assert.equal(state.video.focusCalls, 1);
});

await test('전체화면 진입 대기 중 미디어 오류가 나면 늦은 응답으로 다시 확대하지 않음', async () => {
  for (const accepted of [true, false]) {
    const state = setup();
    let finishRequest;
    state.player.requestFullscreen = () => new Promise((resolve, reject) => {
      finishRequest = async () => {
        if (!accepted) { reject(new Error('Fullscreen denied')); return; }
        state.document.fullscreenElement = state.player;
        await state.document.emit('fullscreenchange');
        resolve();
      };
    });
    const pending = state.fullscreen.emit('click');
    await state.video.emit('error');
    await finishRequest();
    await pending;
    assert.equal(state.video.controls, true);
    assert.equal(state.controls.hidden, true);
    assert.equal(state.document.fullscreenElement, null);
    assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), false);
  }
});

await test('탭을 숨기면 대기 중인 재생도 멈추고 복귀 시 자동 재생하지 않음', async () => {
  const state = setup({playMode: 'pending'});
  const pending = state.play.emit('click');
  state.document.hidden = true;
  await state.document.emit('visibilitychange');
  await pending;
  assert.equal(state.video.paused, true);
  assert.equal(state.video.controls, false);
  assert.equal(state.controls.hidden, false);
  state.document.hidden = false;
  await state.document.emit('visibilitychange');
  assert.equal(state.video.playCalls, 1);
  assert.equal(state.video.paused, true);
});

await test('페이지 이탈 시 재생·확장·버튼 숨김 타이머를 정리함', async () => {
  const state = setup({fullscreenMode: 'reject'});
  await state.play.emit('click');
  await state.fullscreen.emit('click');
  assert.equal(state.timers.size, 1);
  await state.window.emit('pagehide');
  assert.equal(state.video.paused, true);
  assert.equal(state.player.classes.has('is-expanded'), false);
  assert.equal(state.document.body.classes.has('has-trailer-fullscreen'), false);
  assert.equal(state.timers.size, 0);
});

await test('마우스 호버는 음량 바를 열되 음소거하지 않고 조작부를 유지함', async () => {
  const state = setup();
  await state.play.emit('click');
  await state.volumeGroup.emit('pointerenter', {pointerType: 'touch'});
  assert.equal(state.volumeGroup.classes.has('is-open'), false, '터치 진입만으로 열리면 안 됨');
  await state.volumeGroup.emit('pointerenter', {pointerType: 'mouse'});
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  assert.equal(state.volume.tabIndex, 0);
  assert.equal(state.volumePanel.attrs.get('aria-hidden'), 'false');
  assert.equal(state.video.muted, false);
  state.advance(6000);
  assert.equal(state.player.classes.has('show-controls'), true);
  await state.volumeGroup.emit('pointerleave', {pointerType: 'mouse'});
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
  state.advance(2200);
  assert.equal(state.player.classes.has('show-controls'), false);
});

await test('음량 아이콘을 누르면 음소거와 바 열기를 함께 처리하고 5초 뒤 닫음', async () => {
  const state = setup();
  await state.play.emit('click');
  await state.mute.emit('click');
  assert.equal(state.video.muted, true);
  assert.equal(state.volume.value, '0');
  assert.equal(state.volume.attrs.get('aria-valuetext'), '0% · 음소거');
  assert.equal(state.mute.attrs.get('aria-expanded'), 'true');
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  state.advance(4999);
  assert.equal(state.player.classes.has('show-controls'), true);
  state.advance(1);
  assert.equal(state.player.classes.has('show-controls'), false);
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
  assert.equal(state.volume.tabIndex, -1);
});

await test('터치 탭 직후 발생하는 pointerleave가 음량 바를 즉시 닫지 않음', async () => {
  const state = setup();
  await state.play.emit('click');
  await state.volumeGroup.emit('pointerenter', {pointerType: 'touch'});
  await state.mute.emit('click');
  await state.volumeGroup.emit('pointerleave', {pointerType: 'touch'});
  assert.equal(state.video.muted, true);
  assert.equal(state.volume.value, '0');
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  assert.equal(state.volumePanel.attrs.get('aria-hidden'), 'false');
  assert.equal(state.volume.tabIndex, 0);
  state.advance(4999);
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  assert.equal(state.player.classes.has('show-controls'), true);
  state.advance(1);
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
  assert.equal(state.player.classes.has('show-controls'), false);
  assert.equal(state.video.muted, true);
});

await test('첫 터치에서는 오디오 허용만 준비하고 실제 음량 입력 때 같은 컨텍스트에 소스를 연결함', async () => {
  const state = setup();
  await state.volumeGroup.emit('pointerup', {pointerType: 'mouse'});
  assert.equal(state.audioContexts.length, 0);
  await state.volumeGroup.emit('pointerup', {pointerType: 'touch'});
  const audio = state.audioContexts[0];
  assert.equal(state.audioContexts.length, 1);
  assert.equal(audio.state, 'running');
  assert.equal(audio.resumeCalls, 1);
  assert.equal(audio.sourceCalls, 0, '터치 허용 준비만으로 원음 경로를 바꾸면 안 됨');
  assert.equal(state.video.muted, false);
  assert.equal(state.video.volume, 1);
  await state.mute.emit('click');
  assert.equal(state.video.muted, true);
  state.volume.value = '38';
  await state.volume.emit('input');
  assert.equal(state.audioContexts.length, 1);
  assert.equal(audio.sourceCalls, 1);
  assert.equal(audio.gainNode.gain.value, .38);
  assert.equal(state.video.muted, false);
  const resumeCalls = audio.resumeCalls;
  await state.volumeGroup.emit('pointerup', {pointerType: 'touch'});
  assert.equal(audio.resumeCalls, resumeCalls, '이미 연결된 상태에서 터치 준비를 반복하면 안 됨');
  assert.equal(audio.sourceCalls, 1);
});

await test('음량 입력은 처음에만 오디오를 연결하고 양수 입력으로 음소거를 해제함', async () => {
  const state = setup();
  assert.equal(state.audioContexts.length, 0, '사용자 입력 전에 원음 경로를 바꾸지 않아야 함');
  await state.mute.emit('click');
  state.volume.value = '35';
  await state.volume.emit('input');
  const audio = state.audioContexts[0];
  assert.equal(state.audioContexts.length, 1);
  assert.equal(audio.resumeCalls, 1);
  assert.equal(audio.sourceCalls, 1);
  assert.equal(audio.sourceConnected, true);
  assert.equal(audio.gainNode.gain.value, .35);
  assert.equal(state.video.volume, 1, 'iPhone이 무시할 수 있는 video.volume에 의존하지 않아야 함');
  assert.equal(state.video.muted, false);
  assert.equal(state.volume.value, '35');
  assert.equal(state.volume.attrs.get('aria-valuetext'), '35%');
  assert.equal(state.mute.attrs.get('aria-pressed'), 'false');
  state.volume.value = '64';
  await state.volume.emit('input');
  assert.equal(audio.sourceCalls, 1, '같은 영상의 오디오 소스를 중복 생성하면 안 됨');
  assert.equal(audio.gainNode.gain.value, .64);
});

await test('0으로 내리면 음소거되고 아이콘을 다시 누르면 직전 양수 음량으로 복원함', async () => {
  const state = setup();
  state.volume.value = '46';
  await state.volume.emit('input');
  state.volume.value = '0';
  await state.volume.emit('input');
  assert.equal(state.video.muted, true);
  assert.equal(state.audioContexts[0].gainNode.gain.value, 0);
  await state.mute.emit('click');
  assert.equal(state.video.muted, false);
  assert.equal(state.audioContexts[0].gainNode.gain.value, .46);
  assert.equal(state.volume.value, '46');
});

await test('기본 미디어 음량 변경과 음소거 상태가 바 및 접근성 설명에 동기화됨', async () => {
  const state = setup();
  state.video.volume = .72;
  assert.equal(state.volume.value, '72');
  assert.equal(state.volume.attrs.get('aria-valuetext'), '72%');
  state.video.muted = true;
  assert.equal(state.volume.value, '0');
  state.video.muted = false;
  assert.equal(state.volume.value, '72');
  assert.equal(state.audioContexts.length, 0);
});

await test('슬라이더 드래그·키보드 조절 중에는 바를 숨기지 않음', async () => {
  const state = setup();
  await state.play.emit('click');
  await state.mute.emit('click');
  await state.volume.emit('pointerdown');
  await state.volumeGroup.emit('pointerleave', {pointerType: 'mouse'});
  state.advance(6000);
  assert.equal(state.player.classes.has('show-controls'), true);
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  await state.window.emit('pointerup');
  state.advance(5000);
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
  state.volume.focusVisible = true;
  await state.controls.emit('focusin', {target: state.volume});
  state.advance(6000);
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  assert.equal(state.player.classes.has('show-controls'), true);
  await state.controls.emit('focusout', {relatedTarget: null});
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
});

await test('포인터로 초점을 얻은 뒤 키보드 조절로 전환해도 음량 바가 닫히지 않음', async () => {
  const state = setup();
  await state.play.emit('click');
  await state.volumeGroup.emit('pointerenter', {pointerType: 'mouse'});
  state.volume.focusVisible = false;
  await state.controls.emit('focusin', {target: state.volume});
  await state.controls.emit('keydown', {target: state.volume, key: 'ArrowRight'});
  await state.volumeGroup.emit('pointerleave', {pointerType: 'mouse'});
  state.advance(6000);
  assert.equal(state.volumeGroup.classes.has('is-open'), true);
  assert.equal(state.volume.tabIndex, 0);
  assert.equal(state.volumePanel.attrs.get('aria-hidden'), 'false');
  assert.equal(state.player.classes.has('show-controls'), true);
  await state.controls.emit('focusout', {relatedTarget: null});
  state.advance(2200);
  assert.equal(state.volumeGroup.classes.has('is-open'), false);
  assert.equal(state.player.classes.has('show-controls'), false);
});

await test('Web Audio가 없거나 시작을 거절하면 원음 경로를 보존하고 실제 상태를 표시함', async () => {
  for (const audioMode of ['absent', 'reject']) {
    const state = setup({audioMode});
    state.volume.value = '55';
    await state.volume.emit('input');
    assert.equal(state.video.volume, 1);
    assert.equal(state.video.muted, false);
    assert.equal(state.volume.value, '100', '적용되지 않은 음량을 적용한 것처럼 표시하면 안 됨');
    assert.equal(state.volumeMessage.hidden, false);
    assert.match(state.volumeMessage.textContent, /기기 음량 버튼/);
    assert.equal(state.audioContexts[0]?.sourceCalls || 0, 0, '시작 실패 시 원음 경로를 바꾸면 안 됨');
    await state.play.emit('click');
    assert.equal(state.video.paused, false);
  }
});

await test('오디오 시작 대기 중 연속 입력은 소스 하나와 마지막 요청 음량을 사용함', async () => {
  const state = setup({audioMode: 'pending'});
  state.volume.value = '25';
  const first = state.volume.emit('input');
  state.volume.value = '65';
  const second = state.volume.emit('input');
  const audio = state.audioContexts[0];
  assert.equal(state.audioContexts.length, 1);
  assert.equal(audio.resumeCalls, 1);
  assert.equal(audio.sourceCalls, 0);
  audio.complete();
  await Promise.all([first, second]);
  assert.equal(audio.sourceCalls, 1);
  assert.equal(audio.gainNode.gain.value, .65);
  assert.equal(state.volume.value, '65');
  assert.equal(state.video.muted, false);
  assert.equal(state.timers.size, 0);
});

await test('오디오 시작 거절·시간 초과 후에는 원음 경로를 유지하고 같은 컨텍스트로 재시도함', async () => {
  for (const audioMode of ['reject', 'pending']) {
    const state = setup({audioMode});
    state.volume.value = '40';
    const first = state.volume.emit('input');
    const audio = state.audioContexts[0];
    if (audioMode === 'pending') state.advance(3000);
    await first;
    assert.equal(audio.sourceCalls, 0);
    assert.equal(state.volumeMessage.hidden, false);
    assert.equal(state.volume.value, '100');
    assert.equal(state.video.volume, 1);
    assert.equal(state.timers.size, 0);
    audio.mode = 'success';
    state.volume.value = '60';
    await state.volume.emit('input');
    assert.equal(state.audioContexts.length, 1, '실패할 때마다 새 AudioContext를 누적하면 안 됨');
    assert.equal(audio.resumeCalls, 2);
    assert.equal(audio.sourceCalls, 1);
    assert.equal(audio.gainNode.gain.value, .6);
    assert.equal(state.volume.value, '60');
    assert.equal(state.volumeMessage.hidden, true);
  }
});

await test('오디오가 중단된 뒤 음량을 조절하면 기존 소스를 재개하고 실패 시 이전 값을 유지함', async () => {
  for (const interruptedState of ['suspended', 'interrupted']) {
    const state = setup();
    state.volume.value = '40';
    await state.volume.emit('input');
    const audio = state.audioContexts[0];
    audio.state = interruptedState;
    state.volume.value = '65';
    await state.volume.emit('input');
    assert.equal(audio.resumeCalls, 2, '완료된 이전 Promise 대신 중단된 컨텍스트를 재개해야 함');
    assert.equal(audio.state, 'running');
    assert.equal(audio.sourceCalls, 1);
    assert.equal(audio.gainNode.gain.value, .65);
    audio.state = interruptedState;
    audio.mode = 'reject';
    state.volume.value = '25';
    await state.volume.emit('input');
    assert.equal(audio.resumeCalls, 3);
    assert.equal(audio.sourceCalls, 1);
    assert.equal(audio.gainNode.gain.value, .65);
    assert.equal(state.volume.value, '65');
    assert.equal(state.volume.attrs.get('aria-valuetext'), '65%');
    assert.equal(state.volumeMessage.hidden, false);
    assert.match(state.volumeMessage.textContent, /기기 음량 버튼/);
    audio.mode = 'success';
    state.volume.value = '30';
    await state.volume.emit('input');
    assert.equal(audio.resumeCalls, 4);
    assert.equal(state.audioContexts.length, 1);
    assert.equal(audio.sourceCalls, 1);
    assert.equal(audio.gainNode.gain.value, .3);
    assert.equal(state.volume.value, '30');
    assert.equal(state.volumeMessage.hidden, true);
  }
});

console.log(`게임랩 트레일러 회귀 검사 ${passed}건 통과`);

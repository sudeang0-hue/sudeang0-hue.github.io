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
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  matches(selector) { return selector === ':focus-visible' && Boolean(this.focusVisible); }
  focus() { this.focusCalls++; }
}

function setup({playMode = 'success', fullscreenMode = 'success', present = true, missing = null} = {}) {
  const player = new Element(), video = new Element(), controls = new Element();
  const play = new Element(), mute = new Element(), fullscreen = new Element();
  const document = new Element(), window = new Element();
  document.body = new Element();
  document.fullscreenElement = null;
  controls.hidden = true;
  video.controls = true;
  video.paused = true;
  video.ended = false;
  video.playCalls = 0;
  let muted = false;
  Object.defineProperty(video, 'muted', {
    get: () => muted,
    set: value => { muted = value; video.emit('volumechange'); },
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
  vm.runInNewContext(source, {
    document, window,
    setTimeout: (callback, delay) => { timers.set(++timerId, {callback, due: now + delay}); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    player, video, controls, play, mute, fullscreen, document, window, timers,
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

console.log(`게임랩 트레일러 회귀 검사 ${passed}건 통과`);

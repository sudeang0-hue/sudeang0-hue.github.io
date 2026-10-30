import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 실제 슬라이더 스크립트에 입력과 시간을 전달합니다. 이미지 배치는 브라우저에서 확인합니다.
const source = fs.readFileSync(new URL('./dist/goods-slider.js', import.meta.url), 'utf8');

class Element {
  constructor() {
    this.handlers = new Map();
    this.map = {};
    this.arrays = {};
    this.attrs = {};
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.textContent = '';
    this.offsetWidth = 400;
    this.clientWidth = 400;
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, event = {}) {
    for (const callback of this.handlers.get(type) || []) callback({target: this, ...event});
  }
  querySelector(selector) { return this.map[selector] || null; }
  querySelectorAll(selector) { return this.arrays[selector] || []; }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  focus() { this.document.activeElement = this; }
  matches(selector) { return selector === ':focus-within' && this.contains(this.document.activeElement); }
}

function setup({interval = 1500, mode = 'cycle', reduced = false, visible = true} = {}) {
  const root = new Element(), viewport = new Element(), track = new Element(), controls = new Element();
  const count = new Element(), status = new Element(), prev = new Element(), next = new Element();
  const play = new Element(), playIcon = new Element(), dialog = new Element();
  const document = new Element(), window = new Element(), motion = new Element();
  root.dataset = {interval: String(interval), intervalMode: mode};
  root.children = [viewport, controls, status];
  viewport.children = [track];
  controls.children = [prev, next, play, count];
  play.children = [playIcon];
  play.map['[data-play-icon]'] = playIcon;
  root.map = {
    '.goods-slider-window': viewport, '.goods-slider-track': track,
    '.goods-slider-controls': controls, '[data-slide-count]': count,
    '[data-slide-status]': status, '[data-slide-play]': play,
    '[data-slide-prev]': prev, '[data-slide-next]': next,
  };
  const slides = [2, 0, 1, 2, 0].map((number, position) => {
    const slide = new Element(), button = new Element(), image = new Element();
    slide.dataset.goodsSource = String(number);
    slide.offsetLeft = position * 400;
    slide.children = [button];
    button.children = [image];
    slide.map = {img: image, button};
    image.alt = `상점 화면 ${number + 1}`;
    image.loading = 'lazy';
    if (position === 0 || position === 4) {
      slide.attrs['data-goods-copy'] = '';
      slide.hidden = true;
    }
    return slide;
  });
  track.children = slides;
  const assignDocument = element => { element.document = document; element.children.forEach(assignDocument); };
  assignDocument(root);
  document.arrays['[data-goods-slider]'] = [root];
  document.map['#image-dialog'] = dialog;
  document.hidden = false;
  document.activeElement = null;
  motion.matches = reduced;
  const timers = new Map(), frames = new Map(), observers = [], mutations = [];
  let now = 0, nextId = 0;
  const flushMicrotasks = [];
  vm.runInNewContext(source, {
    document, window, matchMedia: () => motion,
    performance: {now: () => now},
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, {callback, due: now + delay}); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    queueMicrotask: callback => flushMicrotasks.push(callback),
    IntersectionObserver: window.IntersectionObserver = class {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() {}
    },
    MutationObserver: class {
      constructor(callback) { mutations.push(callback); }
      observe() {}
    },
  });
  const flush = () => { while (flushMicrotasks.length) flushMicrotasks.shift()(); };
  const view = value => {
    observers.filter(observer => observer.target === root).forEach(observer => observer.callback([{isIntersecting: value}]));
  };
  observers.filter(observer => observer.target === viewport).forEach(observer => observer.callback([{isIntersecting: visible}]));
  view(visible);
  const advance = duration => {
    const target = now + duration;
    let iterations = 0;
    while (true) {
      const pending = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!pending) break;
      assert.ok(++iterations < 1000, '타이머가 같은 시각에 반복 실행되고 있습니다.');
      const [id, timer] = pending;
      timers.delete(id);
      now = Math.max(now, timer.due);
      timer.callback();
      flush();
    }
    now = target;
  };
  const finish = (duration = 320) => {
    advance(duration);
    track.emit('transitionend', {propertyName: 'transform', timeStamp: now});
    flush();
  };
  return {
    root, viewport, track, controls, slides, document, window, motion, count, status, play, timers,
    advance, finish, view, flush,
    index: () => Number(root.dataset.slideIndex),
    moving: () => root.dataset.slideAnimating === 'true',
    auto: () => root.dataset.autoplay === 'true',
    next: () => next.emit('click'), prev: () => prev.emit('click'),
    hover: value => viewport.emit(value ? 'pointerenter' : 'pointerleave', {pointerType: 'mouse'}),
    focus: value => {
      document.activeElement = value ? viewport : null;
      root.emit(value ? 'focusin' : 'focusout');
      flush();
    },
    hidden: value => { document.hidden = value; document.emit('visibilitychange'); },
    modal: value => { dialog.open = value; mutations.forEach(callback => callback()); },
    reduced: value => { motion.matches = value; motion.emit('change'); },
    pause: () => { document.activeElement = play; play.emit('click'); },
    stall: duration => { now += duration; advance(0); },
  };
}

let passed = 0;
function test(name, action) {
  try { action(); passed++; }
  catch (error) { throw new Error(`${name}: ${error.message}`, {cause: error}); }
}
const singleTimer = state => assert.equal(state.timers.size, 1, '예약은 하나만 남아야 합니다.');

test('cycle 1.5초에는 320ms 이동 시간도 포함', () => {
  const state = setup();
  state.advance(1499); assert.equal(state.index(), 0);
  state.advance(1); assert.equal(state.index(), 1);
  state.finish(); singleTimer(state);
  state.advance(1179); assert.equal(state.index(), 1);
  state.advance(1); assert.equal(state.index(), 2);
});

test('기존 기본 모드의 2초 표시 시간 유지', () => {
  const state = setup({interval: 2000, mode: ''});
  state.advance(2000); assert.equal(state.index(), 1);
  state.finish();
  state.advance(1999); assert.equal(state.index(), 1);
  state.advance(1); assert.equal(state.index(), 2);
});

test('1.5초도 기본 모드에서는 전환 완료 이후 대기', () => {
  const state = setup({mode: ''});
  state.advance(1500); state.finish();
  state.advance(1499); assert.equal(state.index(), 1);
  state.advance(1); assert.equal(state.index(), 2);
});

test('0 또는 허용하지 않은 간격은 수동 전용', () => {
  for (const interval of [0, 999]) {
    const state = setup({interval});
    assert.equal(state.auto(), false);
    state.advance(10000); assert.equal(state.index(), 0);
    state.next(); assert.equal(state.index(), 1);
    state.finish(); assert.equal(state.timers.size, 0);
  }
});

test('중복 관찰 이벤트가 타이머를 늘리거나 cycle 시작 시각을 바꾸지 않음', () => {
  const state = setup();
  state.advance(1500); state.finish();
  for (let i = 0; i < 8; i++) { state.view(true); state.document.emit('visibilitychange'); }
  singleTimer(state);
  state.advance(1180); assert.equal(state.index(), 2);
  singleTimer(state);
});

test('일시정지 후에는 새 주기를 기다린 뒤 재생', () => {
  const state = setup();
  state.advance(1000); state.pause();
  assert.equal(state.auto(), false);
  state.advance(10000); assert.equal(state.index(), 0);
  state.pause(); assert.equal(state.auto(), true);
  state.advance(1499); assert.equal(state.index(), 0);
  state.advance(1); assert.equal(state.index(), 1);
});

for (const [label, suspend] of [
  ['마우스 호버', (state, active) => state.hover(active)],
  ['키보드 초점', (state, active) => state.focus(active)],
  ['숨긴 탭', (state, active) => state.hidden(active)],
  ['화면 밖', (state, active) => state.view(!active)],
  ['확대 이미지', (state, active) => state.modal(active)],
]) {
  test(`${label}에서 멈추고 복귀 시 밀린 전환 없이 1.5초 대기`, () => {
    const state = setup();
    state.advance(1500); state.finish(); state.advance(200);
    suspend(state, true);
    assert.equal(state.timers.size, 0);
    state.advance(10000); assert.equal(state.index(), 1);
    suspend(state, false); singleTimer(state);
    state.advance(1499); assert.equal(state.index(), 1);
    state.advance(1); assert.equal(state.index(), 2);
  });
}

test('페이지 이탈 중 전환을 정리하고 복귀부터 새 주기 시작', () => {
  const state = setup();
  state.advance(1500);
  state.window.emit('pagehide');
  assert.equal(state.moving(), false); assert.equal(state.timers.size, 0);
  state.advance(10000); assert.equal(state.index(), 1);
  state.window.emit('pageshow');
  state.advance(1499); assert.equal(state.index(), 1);
  state.advance(1); assert.equal(state.index(), 2);
});

test('모션 감소는 자동 넘김을 멈추고 수동 전환은 즉시 처리', () => {
  const state = setup({reduced: true});
  assert.equal(state.auto(), false);
  state.advance(10000); assert.equal(state.index(), 0);
  state.prev(); assert.equal(state.index(), 2); assert.equal(state.moving(), false);
  const running = setup();
  running.advance(1500); running.reduced(true);
  assert.equal(running.moving(), false); assert.equal(running.timers.size, 0);
  running.advance(10000); assert.equal(running.index(), 1);
});

test('수동 이전·다음은 양쪽 끝을 순환하고 복사본 대신 원본으로 정렬', () => {
  const state = setup({interval: 0});
  state.prev(); assert.equal(state.index(), 2);
  state.finish(); assert.equal(Number(state.root.dataset.slidePosition), 3);
  state.next(); assert.equal(state.index(), 0);
  state.finish(); assert.equal(Number(state.root.dataset.slidePosition), 1);
  assert.equal(state.slides.filter(slide => !slide.inert).length, 1);
  assert.equal(state.count.textContent, '1 / 3');
  assert.match(state.status.textContent, /상점 화면 1/);
});

test('전환 완료 이벤트가 없거나 늦어도 밀린 자동 넘김을 몰아서 실행하지 않음', () => {
  const state = setup();
  state.advance(1500);
  state.stall(5000);
  assert.equal(state.index(), 1); assert.equal(state.moving(), false); singleTimer(state);
  state.advance(1499); assert.equal(state.index(), 1);
  state.advance(1); assert.equal(state.index(), 2);
});

console.log(`이미지 슬라이더 주기·일시정지·순환·페이지 상태 회귀 검사 통과: ${passed}개`);

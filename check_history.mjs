import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { renderHistory } from './history.mjs';

// 실제 공개 스크립트에 이벤트를 전달합니다. 브라우저의 배치·픽셀 검사는 별도로 수행합니다.
const source = fs.readFileSync(new URL('./dist/history-carousel.js', import.meta.url), 'utf8');

class Element {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.handlers = new Map();
    this.dataset = {};
    this.attrs = {};
    this.captured = new Set();
    this.classes = new Set();
    this.style = { setProperty() {} };
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, input = {}) {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...input };
    for (const callback of this.handlers.get(type) || []) callback(event);
    return event;
  }
  querySelector(selector) { return this.map?.[selector] || null; }
  querySelectorAll(selector) { return this.arrays?.[selector] || []; }
  closest() { return null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  getBoundingClientRect() { return { width: 400, height: 500, top: 200, bottom: 700 }; }
  get firstElementChild() { return this.children[0]; }
  get lastElementChild() { return this.children.at(-1); }
  append(child) { this.move(child); this.children.push(child); }
  prepend(child) { this.move(child); this.children.unshift(child); }
  move(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
  }
  focus() { this.document.activeElement = this; }
  hasPointerCapture(id) { return this.captured.has(id); }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) {
    if (this.captured.delete(id)) this.emit('lostpointercapture', { pointerId: id });
  }
}

function setup(reducedMotion = false) {
  const root = new Element(), viewport = new Element(), track = new Element();
  const toolbar = new Element(), header = new Element(), status = new Element();
  const controls = [0, 1, 2].map(() => new Element());
  const panels = ['education', 'activities', 'work'].map(id => {
    const panel = new Element(id);
    panel.map = { h2: { textContent: id } };
    track.append(panel);
    return panel;
  });
  root.map = { '.history-viewport': viewport, '.history-track': track, '.history-controls': toolbar, '[data-history-status]': status };
  root.arrays = { '[data-history-select]': controls };
  const document = { querySelector: selector => selector === '[data-history-carousel]' ? root : header, activeElement: null, getElementById: id => panels.find(panel => panel.id === id) || null };
  [root, viewport, track, ...controls, ...panels].forEach(element => { element.document = document; });
  const window = new Element();
  window.matchMedia = () => ({ matches: reducedMotion });
  window.scrollTo = () => {};
  window.scrollY = 0;
  window.getSelection = () => ({ removeAllRanges() {} });
  let now = 100, nextTimer = 0;
  const timers = new Map();
  vm.runInNewContext(source, {
    document, window, location: { hash: '' }, history: { replaceState() {} },
    performance: { now: () => now }, ResizeObserver: class { observe() {} },
    getComputedStyle: () => ({ gap: '0', getPropertyValue: () => '2' }),
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  const flush = () => {
    for (let count = 0; timers.size && count < 20; count++) {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(callback => callback());
    }
    assert.equal(timers.size, 0, '전환이 끝나야 합니다.');
  };
  const pointer = { pointerId: 1, isPrimary: true, button: 0, clientX: 399, clientY: 250 };
  return { root, viewport, track, controls, window, flush,
    down: () => viewport.emit('pointerdown', pointer),
    move: (dx, dy = 0) => { now += 500; viewport.emit('pointermove', { ...pointer, clientX: 399 + dx, clientY: 250 + dy }); },
    up: (type = 'pointerup', id = 1) => window.emit(type, { ...pointer, pointerId: id, clientX: 405 }),
    check: expected => {
      flush();
      assert.equal(root.dataset.current, expected);
      assert.equal(controls.filter(control => control.attrs['aria-pressed'] === 'true').length, 1);
      assert.equal(viewport.classes.has('is-dragging'), false);
    },
  };
}

let passed = 0;
function test(name, action) {
  try { action(); passed++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}

test('일반 버튼·빠른 연속 선택', () => {
  const state = setup();
  state.controls[1].emit('click');
  state.controls[2].emit('click');
  state.check('work');
});
test('키보드 방향키·Home·End', () => {
  const state = setup();
  state.controls[0].emit('keydown', { key: 'ArrowRight' });
  state.check('activities');
  state.viewport.emit('keydown', { key: 'End' });
  state.check('work');
  state.viewport.emit('keydown', { key: 'Home' });
  state.check('education');
});
for (const type of ['pointerup', 'pointercancel']) {
  test(`capture 이전 영역 밖 ${type} 이후 버튼 선택`, () => {
    const state = setup();
    state.down();
    state.up(type);
    state.controls[1].emit('click');
    state.check('activities');
  });
}
test('다른 포인터의 종료는 현재 누름을 해제하지 않음', () => {
  const state = setup();
  state.down();
  state.up('pointerup', 2);
  state.controls[1].emit('click');
  state.check('education');
  state.up();
  state.check('activities');
});
test('정상 드래그와 중복 lostpointercapture', () => {
  const state = setup();
  state.down();
  state.move(-120);
  state.up();
  state.check('activities');
  assert.equal(state.viewport.emit('click').defaultPrevented, true, '드래그 직후 링크 클릭을 막아야 합니다.');
});
test('작은 이동은 원래 항목으로 복귀', () => {
  const state = setup();
  state.down();
  state.move(-20);
  state.up();
  state.check('education');
});
test('수직 스크롤은 항목을 바꾸지 않음', () => {
  const state = setup();
  state.down();
  state.move(0, 30);
  state.up();
  state.check('education');
  state.controls[1].emit('click');
  state.check('activities');
});
for (const active of [false, true]) {
  for (const type of ['pointercancel', 'blur', 'lostpointercapture']) {
    test(`${active ? '드래그 중' : '누름 직후'} ${type} 처리`, () => {
      const state = setup();
      state.down();
      if (active) state.move(-120);
      if (type === 'blur') state.window.emit('blur');
      else if (type === 'lostpointercapture') state.viewport.emit(type, { pointerId: 1 });
      else state.up(type);
      state.check('education');
      state.controls[2].emit('click');
      state.check('work');
    });
  }
}
test('동작 줄이기에서도 영역 밖 종료 후 선택 가능', () => {
  const state = setup(true);
  state.down();
  state.up();
  state.controls[1].emit('click');
  state.check('activities');
});
test('일반 클릭은 링크 동작을 막지 않음', () => {
  const state = setup();
  state.down();
  state.up();
  assert.equal(state.viewport.emit('click').defaultPrevented, false);
});
test('개발 프로젝트 링크의 목적지', () => {
  const data = JSON.parse(fs.readFileSync(new URL('./history-content.json', import.meta.url), 'utf8'));
  assert.match(renderHistory(data), /href="development\.html">게임개발 프로젝트 보기/);
});

test('연혁 스크립트의 캐시 버전 연결', () => {
  const data = JSON.parse(fs.readFileSync(new URL('./history-content.json', import.meta.url), 'utf8'));
  assert.ok(renderHistory(data, file => file + '?v=test').includes('src="history-carousel.js?v=test"'));
});

console.log(`연혁 입력 종료·드래그·키보드·링크 회귀 검사 통과: ${passed}개`);

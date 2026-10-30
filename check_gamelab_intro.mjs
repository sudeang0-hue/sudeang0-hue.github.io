import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 실제 소개 연출을 관찰·초점·설정 변경으로 검증합니다. 위치와 색은 브라우저에서 확인합니다.
const source = fs.readFileSync(new URL('./dist/gamelab-intro.js', import.meta.url), 'utf8');
class Element {
  constructor() {
    this.handlers = new Map();
    this.classes = new Set();
    this.properties = new Map();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
    };
    this.style = {setProperty: (name, value) => this.properties.set(name, value)};
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, event = {}) {
    for (const callback of this.handlers.get(type) || []) callback({target: this, ...event});
  }
  getBoundingClientRect() { return this.bounds; }
  closest() { return this.revealParent || null; }
}

function setup({reduced = false, supported = true, pagePresent = true, length = 8, passedHeader = 0} = {}) {
  const page = new Element(), header = new Element(), motion = new Element();
  header.bounds = {bottom: 150};
  motion.matches = reduced;
  const items = Array.from({length}, (_, index) => {
    const item = new Element();
    item.bounds = {bottom: index < passedHeader ? 100 : 400 + index * 100};
    return item;
  });
  const observers = [];
  const Observer = class {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(item) { this.observed.add(item); }
    unobserve(item) { this.observed.delete(item); }
    disconnect() { this.observed.clear(); this.disconnected = true; }
  };
  const window = supported ? {IntersectionObserver: Observer} : {};
  vm.runInNewContext(source, {
    document: {
      querySelector: selector => selector === '[data-gamelab-background-page]' ? (pagePresent ? page : null) : header,
      querySelectorAll: () => items,
    },
    window, IntersectionObserver: Observer, matchMedia: () => motion,
  });
  return {
    page, items, observers,
    ready: () => page.classes.has('gamelab-reveal-ready'),
    pending: () => items.flatMap((item, index) => item.classes.has('is-reveal-pending') ? [index] : []),
    delay: index => items[index].properties.get('--gamelab-reveal-delay'),
    visible: entries => observers[0].callback(entries.map(([index, isIntersecting = true]) => ({target: items[index], isIntersecting}))),
    focus: index => {
      const link = new Element();
      link.revealParent = index === null ? null : items[index];
      page.emit('focusin', {target: link});
    },
    reduced: value => { motion.matches = value; motion.emit('change'); },
  };
}

let passed = 0;
function test(name, action) {
  try { action(); passed++; }
  catch (error) { throw new Error(`${name}: ${error.message}`, {cause: error}); }
}

test('대상 페이지나 소개 항목이 없으면 다른 문서에 영향을 주지 않음', () => {
  for (const options of [{pagePresent: false}, {length: 0}]) {
    const state = setup(options);
    assert.equal(state.ready(), false);
    assert.deepEqual(state.pending(), []);
    assert.equal(state.observers.length, 0);
  }
});

test('초기 모션 감소 설정에서는 문서를 숨기지 않음', () => {
  const state = setup({reduced: true});
  assert.equal(state.ready(), false);
  assert.deepEqual(state.pending(), []);
  assert.equal(state.observers.length, 0);
});

test('IntersectionObserver 미지원 환경에서는 기본 표시를 유지', () => {
  const state = setup({supported: false});
  assert.equal(state.ready(), false);
  assert.deepEqual(state.pending(), []);
  assert.equal(state.observers.length, 0);
});

test('복원된 스크롤에서 이미 헤더 위로 지나간 글을 다시 숨기지 않음', () => {
  const state = setup({passedHeader: 3});
  assert.equal(state.ready(), true);
  assert.deepEqual(state.pending(), [3, 4, 5, 6, 7]);
  assert.equal(state.observers[0].observed.size, 5);
});

test('관찰 이벤트의 순서와 관계없이 같은 화면의 글은 문서 순서로 등장', () => {
  const state = setup();
  state.visible([[3], [1], [0], [2]]);
  assert.deepEqual([0, 1, 2, 3].map(state.delay), ['0ms', '140ms', '280ms', '420ms']);
  assert.deepEqual(state.pending(), [4, 5, 6, 7]);
  assert.equal(state.observers[0].observed.size, 4);
});

test('화면 밖 항목은 기다리고 한번 등장한 항목은 다시 숨기지 않음', () => {
  const state = setup();
  state.visible([[0], [1, false]]);
  assert.deepEqual(state.pending(), [1, 2, 3, 4, 5, 6, 7]);
  state.visible([[0, false], [1]]);
  assert.equal(state.delay(0), '0ms');
  assert.equal(state.delay(1), '0ms');
  assert.deepEqual(state.pending(), [2, 3, 4, 5, 6, 7]);
});

test('키보드 초점으로 이동한 링크와 그 앞의 글은 지연 없이 표시', () => {
  const state = setup();
  state.focus(6);
  assert.deepEqual(state.pending(), [7]);
  for (const item of state.items.slice(0, 7)) {
    assert.equal(item.classes.has('is-reveal-immediate'), true);
    assert.equal(item.properties.get('--gamelab-reveal-delay'), '0ms');
    assert.equal(state.observers[0].observed.has(item), false);
  }
});

test('연출 영역 밖의 초점 이동은 등장 상태를 바꾸지 않음', () => {
  const state = setup();
  state.focus(null);
  assert.deepEqual(state.pending(), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('중간에 모션 감소를 켜면 남은 항목과 지연을 즉시 해제', () => {
  const state = setup();
  state.visible([[0], [1]]);
  state.reduced(true);
  assert.equal(state.ready(), false);
  assert.deepEqual(state.pending(), []);
  assert.equal(state.observers[0].disconnected, true);
  for (const item of state.items) {
    assert.equal(item.classes.has('is-reveal-immediate'), true);
    assert.equal(item.properties.get('--gamelab-reveal-delay'), '0ms');
  }
  state.reduced(false);
  assert.equal(state.ready(), false);
  assert.deepEqual(state.pending(), []);
});

console.log(`게임랩 소개 등장·기본 표시·초점·모션 감소 검사 통과: ${passed}개`);

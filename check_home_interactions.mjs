import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { homeChapters } from './home.mjs';

// 실제 공개 스크립트에 스크롤·입력·페이지 생명주기를 전달합니다. 픽셀 배치는 브라우저에서 별도로 확인합니다.
const source = fs.readFileSync(new URL('./dist/home.js', import.meta.url), 'utf8');

class Element {
  constructor() {
    this.handlers = new Map();
    this.classes = new Set();
    this.dataset = {};
    this.style = {};
    this.attrs = {};
    this.children = [];
    this.map = {};
    this.arrays = {};
    this.textContent = '';
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, event = {}) { for (const callback of this.handlers.get(type) || []) callback({ target: this, ...event }); }
  querySelector(selector) { return this.map[selector] || null; }
  querySelectorAll(selector) { return this.arrays[selector] || []; }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  getBoundingClientRect() { return this.bounds; }
  getAttribute(name) { return this.attrs[name] || null; }
  removeAttribute(name) { delete this.attrs[name]; }
  set src(value) { this.attrs.src = value; }
  get src() { return this.attrs.src || ''; }
}

function media(chapters) {
  const root = new Element();
  root.dataset.chapters = JSON.stringify(chapters);
  root.layers = [0, 1].map(index => {
    const layer = new Element(), video = new Element(), image = new Element();
    video.paused = true;
    video.pause = () => { video.paused = true; };
    video.load = () => {};
    video.play = () => { video.paused = false; video.onplaying?.(); return Promise.resolve(); };
    image.naturalWidth = 100;
    image.decode = () => Promise.resolve();
    if (!index) { image.src = `assets/${chapters[0].scenes[0].image}`; layer.classes.add('is-visible'); }
    layer.map = { video, img: image };
    return layer;
  });
  root.arrays['[data-layer]'] = root.layers;
  return root;
}

function setup({ width = 390, reduced = false, saveData = false, start = 500 } = {}) {
  const home = new Element(), hero = new Element(), group = new Element(), intro = new Element();
  const heroMedia = media(homeChapters);
  hero.map['[data-home-media]'] = heroMedia;
  const cards = [homeChapters.slice(0, 2), [homeChapters[2]], [homeChapters[3]]].map(chapters => {
    const card = new Element();
    card.media = media(chapters);
    card.map['[data-home-media]'] = card.media;
    return card;
  });
  const setStart = top => cards.forEach((card, index) => { card.bounds = { top: top + index * 348, bottom: top + index * 348 + 330 }; });
  setStart(start);
  group.arrays['[data-work-card]'] = cards;
  const lines = ['디자인과 개발 사이,', '경험을 잇습니다.'].map(text => { const line = new Element(); line.textContent = text; return line; });
  intro.arrays['[data-type-line]'] = lines;
  intro.map['.home-intro-follow'] = new Element();
  home.map = { '[data-home-hero]': hero, '[data-work-cards]': group, '[data-home-intro]': intro };
  for (const name of ['progress', 'label', 'title', 'role', 'link', 'count', 'prev', 'next']) home.map[`[data-chapter-${name}]`] = new Element();
  home.arrays['.home-keywords li'] = [new Element(), new Element(), new Element()];
  const document = new Element(), window = new Element(), connection = new Element();
  document.map['[data-home]'] = home;
  document.hidden = false;
  document.fonts = { ready: Promise.resolve() };
  window.innerHeight = 1000;
  window.visualViewport = new Element();
  window.visualViewport.height = 1000;
  window.visualViewport.offsetTop = 0;
  connection.saveData = saveData;
  const queries = new Map();
  const matchMedia = query => {
    if (!queries.has(query)) {
      const result = new Element();
      result.matches = query.includes('reduced-motion') ? reduced : query.includes('hover') ? width > 760 : width <= (query.includes('640') ? 640 : 760);
      queries.set(query, result);
    }
    return queries.get(query);
  };
  const observers = [];
  let now = 0, nextId = 0;
  const frames = new Map(), timers = new Map();
  vm.runInNewContext(source, {
    document, window, navigator: { connection }, matchMedia,
    performance: { now: () => now }, Image: Element,
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: callback => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: id => timers.delete(id),
    IntersectionObserver: window.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
    },
  });
  const visible = (target, isIntersecting) => observers.forEach(observer => observer.callback([{ target, isIntersecting }]));
  visible(hero, false);
  const step = async (ms = 16) => {
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(now));
    await Promise.resolve();
    await Promise.resolve();
  };
  const state = {
    cards, group, document, window, connection, setStart, step, visible,
    active: () => cards.flatMap((card, index) => card.classes.has('is-active') ? [index] : []),
    videos: index => cards[index].media.layers.map(layer => layer.map.video),
    image: index => cards[index].media.layers.find(layer => layer.classes.has('is-visible')).map.img.src,
    scroll: async top => { setStart(top); window.emit('scroll'); await step(); },
    setQuery: (query, matches) => { const result = matchMedia(query); result.matches = matches; result.emit('change'); },
    setWidth: value => {
      width = value;
      for (const [query, result] of queries) {
        if (query.includes('reduced-motion')) continue;
        const matches = query.includes('hover') ? width > 760 : width <= (query.includes('640') ? 640 : 760);
        if (result.matches !== matches) { result.matches = matches; result.emit('change'); }
      }
      window.emit('resize');
    },
  };
  return state;
}

let passed = 0;
async function test(name, action) {
  try { await action(); passed++; } catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
}
function onlyActive(state, index) {
  assert.deepEqual(state.active(), index === null ? [] : [index]);
  assert.equal(state.group.classes.has('has-active'), index !== null);
}
const allPaused = state => state.cards.every((_, index) => state.videos(index).every(video => video.paused));

await test('첫 로드와 순방향·역방향 스크롤은 한 카드만 선택', async () => {
  const state = setup();
  onlyActive(state, 0);
  assert.equal(state.videos(0)[0].paused, false);
  for (const [top, index] of [[100, 1], [-300, 2], [100, 1], [500, 0]]) {
    await state.scroll(top);
    onlyActive(state, index);
  }
});
await test('작업 영역 진입 전과 통과 후에는 모두 정지', async () => {
  const state = setup({ start: 600 });
  onlyActive(state, null);
  assert.equal(allPaused(state), true);
  await state.scroll(500);
  assert.equal(state.videos(0)[0].paused, false);
  await state.scroll(-1000);
  onlyActive(state, null);
  assert.equal(allPaused(state), true);
});
await test('고정 기준선과 카드 간격 중간점에서 선택이 정확히 전환', async () => {
  const state = setup();
  await state.scroll(212);
  onlyActive(state, 0);
  await state.scroll(211);
  onlyActive(state, 1);
  await state.scroll(212);
  onlyActive(state, 0);
});
await test('시각 영역의 확대 대신 바깥 카드 영역으로 판정', async () => {
  const state = setup({ start: 600 });
  state.cards[0].bounds = { top: 540, bottom: 870 };
  state.window.emit('scroll');
  await state.step();
  onlyActive(state, 0);
  // 이미지의 중심은 705px이지만 고정 기준선 550px이 카드에 진입하면 바로 재생합니다.
  assert.equal(state.videos(0)[0].paused, false);
});
await test('모바일 브라우저 표시 영역 높이·위치 변경을 반영', async () => {
  const state = setup();
  state.window.visualViewport.height = 600;
  state.window.visualViewport.offsetTop = 100;
  state.window.visualViewport.emit('resize');
  await state.step();
  onlyActive(state, null);
  state.window.visualViewport.offsetTop = 200;
  state.window.visualViewport.emit('scroll');
  await state.step();
  onlyActive(state, 0);
});
await test('터치 포커스가 이전 카드에 재생을 고정하지 않음', async () => {
  const state = setup();
  state.cards[0].emit('pointerenter', { pointerType: 'touch' });
  state.cards[0].emit('focusin');
  await state.scroll(100);
  onlyActive(state, 1);
  assert.equal(state.videos(0)[0].paused, true);
});
await test('디자인·굿즈의 실제 이미지 세트가 2초마다 전환', async () => {
  for (const [top, index, chapter] of [[100, 1, homeChapters[2]], [-300, 2, homeChapters[3]]]) {
    const state = setup({ start: top });
    for (let count = 0; count < 9; count++) await state.step(200);
    assert.equal(state.image(index), `assets/${chapter.scenes[0].image}`);
    await state.step(200);
    assert.equal(state.image(index), `assets/${chapter.scenes[1].image}`);
    await state.scroll(-1000);
    const stoppedImage = state.image(index);
    for (let count = 0; count < 15; count++) await state.step(200);
    assert.equal(state.image(index), stoppedImage);
  }
});
await test('760px 경계에서 PC 호버·키보드 방식으로 복귀', async () => {
  const state = setup({ width: 760 });
  onlyActive(state, 0);
  state.setWidth(761);
  await state.step();
  onlyActive(state, null);
  assert.equal(state.group.classes.has('is-scroll-preview'), false);
  state.cards[1].emit('pointerenter', { pointerType: 'mouse' });
  onlyActive(state, 1);
  state.cards[1].emit('pointerleave');
  state.cards[2].emit('focusin');
  onlyActive(state, 2);
  state.cards[2].emit('focusout', { relatedTarget: null });
  onlyActive(state, null);
  state.setWidth(760);
  await state.step();
  onlyActive(state, 0);
});
await test('화면 밖 카드의 영상은 정지하고 재진입 시 재생', async () => {
  const state = setup();
  state.visible(state.cards[0], false);
  assert.equal(state.videos(0)[0].paused, true);
  state.visible(state.cards[0], true);
  assert.equal(state.videos(0)[0].paused, false);
});
await test('숨겨진 탭과 페이지 이탈은 정지하고 복귀 위치를 재판정', async () => {
  const state = setup();
  state.document.hidden = true;
  state.document.emit('visibilitychange');
  assert.equal(allPaused(state), true);
  state.document.hidden = false;
  state.document.emit('visibilitychange');
  await state.step();
  assert.equal(state.videos(0)[0].paused, false);
  state.window.emit('pagehide');
  assert.equal(allPaused(state), true);
  state.setStart(100);
  state.window.emit('pageshow');
  await state.step();
  onlyActive(state, 1);
  assert.equal(state.videos(0)[0].paused, true);
});
await test('모션 감소 변경은 즉시 정지하고 해제 후 재생', async () => {
  const state = setup();
  state.setQuery('(prefers-reduced-motion: reduce)', true);
  assert.equal(allPaused(state), true);
  state.setQuery('(prefers-reduced-motion: reduce)', false);
  assert.equal(state.videos(0)[0].paused, false);
});
await test('데이터 절약 변경은 즉시 정지하고 해제 후 재생', async () => {
  const state = setup();
  state.connection.saveData = true;
  state.connection.emit('change');
  assert.equal(allPaused(state), true);
  state.connection.saveData = false;
  state.connection.emit('change');
  assert.equal(state.videos(0)[0].paused, false);
});
await test('모션 감소·데이터 절약 최초 진입은 영상 다운로드를 시작하지 않음', async () => {
  for (const option of [{ reduced: true }, { saveData: true }]) {
    const state = setup(option);
    onlyActive(state, 0);
    assert.equal(allPaused(state), true);
    assert.equal(state.videos(0)[0].getAttribute('src'), null);
  }
});

console.log(`홈 고정 기준선·모바일 자동 재생·PC 입력·페이지 복귀·모션 설정 회귀 검사 통과: ${passed}개`);

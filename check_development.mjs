import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 공개 스크립트에 실제 입력 순서를 전달합니다. 크기·정렬은 별도 브라우저 검수로 확인합니다.
const source = fs.readFileSync(new URL('./dist/development.js', import.meta.url), 'utf8');
class Element {
  constructor() {
    this.handlers = new Map();
    this.classes = new Set();
    this.dataset = {};
    this.attrs = {};
    this.children = [];
    this.map = {};
    this.arrays = {};
    this.classList = {
      add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  addEventListener(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
  }
  emit(type, event = {}) { (this.handlers.get(type) || []).forEach(callback => callback({ target: this, ...event })); }
  querySelector(selector) { return this.map[selector] || null; }
  querySelectorAll(selector) { return this.arrays[selector] || []; }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  getBoundingClientRect() { return this.bounds; }
  getAttribute(name) { return this.attrs[name] || null; }
  matches(selector) { return selector === ':focus-visible' && Boolean(this.focusVisible); }
  set src(value) { this.attrs.src = value; }
}

function setup({ width = 1280, start = 500, reduced = false, saveData = false, autoPlaying = true, rejectPlay = false } = {}) {
  const group = new Element(), document = new Element(), window = new Element(), connection = new Element();
  const pending = [];
  const cards = ['gamelab', 'tasktown'].map(id => {
    const card = new Element(), video = new Element(), media = new Element();
    card.video = video;
    card.media = media;
    card.children.push(media);
    media.children.push(video);
    video.parentElement = media;
    card.map['[data-preview-video]'] = video;
    video.dataset.source = `assets/${id}-background-720p.mp4`;
    video.dataset.mobileSource = `assets/${id}-background-540p.mp4`;
    video.paused = true;
    video.currentTime = 0;
    video.playCalls = 0;
    video.pause = () => { video.paused = true; };
    video.play = () => {
      video.playCalls++;
      if (rejectPlay) return Promise.reject(new Error('Autoplay denied'));
      if (autoPlaying) {
        video.paused = false;
        video.emit('playing');
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => pending.push({ video, resolve, reject }));
    };
    return card;
  });
  const setStart = top => cards.forEach((card, index) => {
    // 대표 미디어 495px과 설명을 합친 고정 슬롯으로 스크롤합니다.
    card.bounds = { top: top + index * 720, bottom: top + index * 720 + 690 };
  });
  setStart(start);
  document.map['[data-development-work]'] = group;
  document.fonts = { ready: Promise.resolve() };
  document.hidden = false;
  group.arrays['[data-project-preview]'] = cards;
  window.innerHeight = 1000;
  window.visualViewport = new Element();
  window.visualViewport.height = 1000;
  window.visualViewport.offsetTop = 0;
  connection.saveData = saveData;
  const queries = new Map();
  const queryValue = query => query.includes('reduced-motion') ? reduced : query.includes('hover') ? width > 760 : width <= 760;
  const matchMedia = query => {
    if (!queries.has(query)) {
      const result = new Element();
      result.matches = queryValue(query);
      queries.set(query, result);
    }
    return queries.get(query);
  };
  const frames = new Map(), observers = [];
  let frameId = 0;
  vm.runInNewContext(source, {
    document, window, navigator: { connection }, matchMedia,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: window.IntersectionObserver = class {
      constructor(callback) { observers.push(callback); }
      observe() {}
    },
  });
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  const step = async () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback());
    await flush();
  };
  return {
    group, cards, document, window, connection, pending, setStart, step, flush,
    active: () => cards.flatMap((card, index) => card.classes.has('is-active') ? [index] : []),
    playing: index => cards[index].classes.has('is-playing'),
    hover: index => cards[index].emit('pointerenter', { pointerType: 'mouse' }),
    leave: index => cards[index].emit('pointerleave'),
    scroll: async top => { setStart(top); window.emit('scroll'); await step(); },
    visible: (index, value) => observers.forEach(callback => callback([{ target: cards[index].media, isIntersecting: value }])),
    setQuery: (query, value) => { const result = matchMedia(query); result.matches = value; result.emit('change'); },
    setWidth: async value => {
      width = value;
      queries.forEach((result, query) => {
        const next = queryValue(query);
        if (next !== result.matches) { result.matches = next; result.emit('change'); }
      });
      window.emit('resize');
      await step();
    },
  };
}

let passed = 0;
async function test(name, action) {
  try { await action(); passed++; } catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
}
const stopped = (state, index) => {
  assert.equal(state.playing(index), false, '기존 썸네일을 표시해야 합니다.');
  assert.equal(state.cards[index].video.paused, true);
  assert.equal(state.cards[index].video.currentTime, 0);
};
const onlyActive = (state, index) => assert.deepEqual(state.active(), index === null ? [] : [index]);

await test('최초 진입은 썸네일을 유지하고 영상을 다운로드하지 않음', () => {
  const state = setup();
  onlyActive(state, null);
  for (const [index, card] of state.cards.entries()) {
    stopped(state, index);
    assert.equal(card.video.getAttribute('src'), null);
  }
});
await test('PC 호버는 해당 영상만 재생하고 해제 시 썸네일·처음 위치 복귀', () => {
  const state = setup();
  state.hover(0);
  onlyActive(state, 0);
  assert.equal(state.playing(0), true);
  assert.equal(state.cards[0].video.getAttribute('src'), 'assets/gamelab-background-720p.mp4');
  state.cards[0].video.currentTime = 8;
  state.hover(1);
  onlyActive(state, 1);
  stopped(state, 0);
  assert.equal(state.playing(1), true);
  state.leave(1);
  onlyActive(state, null);
  stopped(state, 1);
});
await test('실제 playing 전에는 썸네일을 유지하고 늦은 재생은 취소', async () => {
  const state = setup({ autoPlaying: false });
  state.hover(0);
  assert.equal(state.playing(0), false);
  state.leave(0);
  state.cards[0].video.paused = false;
  state.cards[0].video.currentTime = 3;
  state.cards[0].video.emit('playing');
  state.pending[0].resolve();
  await state.flush();
  stopped(state, 0);
});
await test('취소된 이전 play 거부가 새 재생을 숨기지 않음', async () => {
  const state = setup({ autoPlaying: false });
  state.hover(0);
  state.leave(0);
  state.hover(0);
  state.cards[0].video.paused = false;
  state.cards[0].video.emit('playing');
  state.pending[0].reject(new Error('Old request cancelled'));
  await state.flush();
  assert.equal(state.playing(0), true);
  assert.equal(state.cards[0].video.paused, false);
});
await test('자동 재생 거부·미디어 오류는 썸네일로 안전하게 복귀', async () => {
  const rejected = setup({ rejectPlay: true });
  rejected.hover(0);
  await rejected.flush();
  stopped(rejected, 0);
  rejected.cards[0].video.emit('playing');
  stopped(rejected, 0);
  const state = setup();
  state.hover(1);
  state.cards[1].video.emit('error');
  stopped(state, 1);
});
await test('PC 키보드 선택과 카드 내부 초점 이동 유지', () => {
  const state = setup();
  state.hover(0);
  state.document.emit('keydown', { key: 'Tab' });
  state.cards[1].media.focusVisible = true;
  state.cards[1].emit('focusin', { target: state.cards[1].media });
  onlyActive(state, 1);
  state.cards[1].emit('focusout', { relatedTarget: state.cards[1].video });
  onlyActive(state, 1);
  state.cards[1].emit('focusout', { relatedTarget: null });
  onlyActive(state, 0);
  state.leave(0);
  onlyActive(state, null);
});
await test('마우스 클릭으로 생긴 초점은 호버 해제 후 재생을 유지하지 않음', () => {
  const state = setup();
  state.hover(0);
  state.document.emit('pointerdown', { target: state.cards[0].media, pointerType: 'mouse' });
  state.cards[0].emit('focusin', { target: state.cards[0].media });
  state.cards[0].video.currentTime = 4;
  state.leave(0);
  onlyActive(state, null);
  stopped(state, 0);
});
await test('키보드로 선택했던 카드도 마우스로 조작하면 호버 해제 시 복귀', () => {
  const state = setup();
  state.document.emit('keydown', { key: 'Tab' });
  state.cards[1].media.focusVisible = true;
  state.cards[1].emit('focusin', { target: state.cards[1].media });
  onlyActive(state, 1);
  state.hover(1);
  state.document.emit('pointerdown', { target: state.cards[1].media, pointerType: 'mouse' });
  state.leave(1);
  onlyActive(state, null);
  stopped(state, 1);
});
await test('클릭·드래그 후 focus-visible이 남아도 호버 해제 시 썸네일 복귀', () => {
  for (const input of ['pointerdown', 'mousedown']) {
    const state = setup();
    state.document.emit('keydown', { key: 'Tab' });
    state.cards[0].media.focusVisible = true;
    state.hover(0);
    state.document.emit(input, { target: state.cards[0].media, pointerType: 'mouse' });
    state.cards[0].emit('focusin', { target: state.cards[0].media });
    state.leave(0);
    onlyActive(state, null);
    stopped(state, 0);
    state.document.emit('keydown', { key: 'Tab' });
    state.cards[1].media.focusVisible = true;
    state.cards[1].emit('focusin', { target: state.cards[1].media });
    onlyActive(state, 1);
    assert.equal(state.playing(1), true);
  }
});
await test('모바일 순·역스크롤은 고정 기준선의 한 카드만 재생', async () => {
  const state = setup({ width: 390 });
  onlyActive(state, 0);
  assert.equal(state.cards[0].video.getAttribute('src'), 'assets/gamelab-background-540p.mp4');
  await state.scroll(-300);
  onlyActive(state, 1);
  stopped(state, 0);
  assert.equal(state.playing(1), true);
  await state.scroll(500);
  onlyActive(state, 0);
  stopped(state, 1);
  await state.scroll(600);
  onlyActive(state, null);
  stopped(state, 0);
  await state.scroll(-1500);
  onlyActive(state, null);
});
await test('모바일 터치 포커스가 스크롤 선택을 붙잡지 않음', async () => {
  const state = setup({ width: 390 });
  state.cards[0].emit('pointerenter', { pointerType: 'touch' });
  state.document.emit('pointerdown', { target: state.cards[0].media, pointerType: 'touch' });
  state.cards[0].emit('focusin', { target: state.cards[0].media });
  await state.scroll(-300);
  onlyActive(state, 1);
  stopped(state, 0);
});
await test('브라우저 표시 영역과 760px 경계 변경을 반영', async () => {
  const state = setup({ width: 760 });
  state.window.visualViewport.height = 700;
  state.window.visualViewport.emit('resize');
  await state.step();
  onlyActive(state, null);
  state.window.visualViewport.offsetTop = 200;
  state.window.visualViewport.emit('scroll');
  await state.step();
  onlyActive(state, 0);
  await state.setWidth(761);
  onlyActive(state, null);
  state.hover(1);
  assert.equal(state.cards[1].video.getAttribute('src'), 'assets/tasktown-background-720p.mp4');
  await state.setWidth(760);
  onlyActive(state, 0);
});
await test('설명만 보이고 미디어가 화면 밖이면 정지하고 숨겨진 탭도 처리', () => {
  const state = setup();
  state.hover(0);
  state.visible(0, false);
  onlyActive(state, 0);
  stopped(state, 0);
  state.visible(0, true);
  assert.equal(state.playing(0), true);
  state.document.hidden = true;
  state.document.emit('visibilitychange');
  stopped(state, 0);
  state.document.hidden = false;
  state.document.emit('visibilitychange');
  assert.equal(state.playing(0), true);
});
await test('페이지 복귀는 현재 스크롤 위치를 즉시 다시 판정', () => {
  const state = setup({ width: 390 });
  state.window.emit('pagehide');
  stopped(state, 0);
  state.setStart(-300);
  state.window.emit('pageshow');
  onlyActive(state, 1);
  stopped(state, 0);
  assert.equal(state.playing(1), true);
});
await test('모션 감소·데이터 절약 설정과 변경을 존중', () => {
  for (const option of [{ reduced: true }, { saveData: true }]) {
    const state = setup({ width: 390, ...option });
    stopped(state, 0);
    assert.equal(state.cards[0].video.getAttribute('src'), null);
  }
  const state = setup({ width: 390 });
  state.setQuery('(prefers-reduced-motion: reduce)', true);
  stopped(state, 0);
  state.setQuery('(prefers-reduced-motion: reduce)', false);
  assert.equal(state.playing(0), true);
  state.connection.saveData = true;
  state.connection.emit('change');
  stopped(state, 0);
});
await test('생성된 두 프로젝트가 지연 재생 영상과 실제 파일을 연결', () => {
  const markup = fs.readFileSync(new URL('./dist/development.html', import.meta.url), 'utf8');
  const videos = markup.match(/<video\b[^>]*\bdata-preview-video\b[^>]*>/g) || [];
  assert.equal(videos.length, 2);
  videos.forEach((video, index) => {
    const project = ['gamelab', 'tasktown'][index];
    assert.doesNotMatch(video, /\ssrc=/, '첫 로드에는 영상 다운로드를 시작하지 않습니다.');
    for (const [attribute, size] of [['data-source', '720p'], ['data-mobile-source', '540p']]) {
      const file = video.match(new RegExp(`${attribute}="([^"]+)"`))?.[1];
      assert.equal(file, `assets/${project}-background-${size}.mp4`);
      assert.ok(fs.existsSync(new URL(`./dist/${file}`, import.meta.url)));
    }
  });
  for (const property of ['muted', 'playsinline', 'loop']) {
    videos.forEach(video => assert.match(video, new RegExp(`\\s${property}(?:\\s|>)`)));
  }
});
console.log(`게임 개발 미리보기·썸네일 복귀·모바일 스크롤·페이지 상태 회귀 검사 통과: ${passed}개`);

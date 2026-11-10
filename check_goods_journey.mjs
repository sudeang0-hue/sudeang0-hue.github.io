import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderGoodsJourney} from './goods-journey.mjs';

const source = fs.readFileSync(new URL('./dist/goods-journey.js', import.meta.url), 'utf8');
const data = JSON.parse(fs.readFileSync(new URL('./goods-journey.json', import.meta.url), 'utf8'));
const escapeHtml = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const html = renderGoodsJourney({escapeHtml});

class Element {
  constructor() {
    this.attrs = {};
    this.handlers = new Map();
    this.hidden = false;
    this.tabIndex = 0;
    this.id = '';
    this.query = {};
    this.arrays = {};
    const classes = new Set();
    this.classList = {add:value => classes.add(value), contains:value => classes.has(value)};
  }
  querySelector(selector) { return this.query[selector] || null; }
  querySelectorAll(selector) { return this.arrays[selector] || []; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }
  emit(type, event = {}) { for (const handler of this.handlers.get(type) || []) handler(event); }
  focus() { this.owner.focused = this; }
}

function setup({reduced = false, animate = true, panelCount = 3, legacyMotion = false} = {}) {
  const root = new Element(), tablist = new Element(), motion = new Element(), window = new Element();
  const tabs = Array.from({length:3}, (_, index) => { const tab = new Element(); tab.id = `stage-${index}`; return tab; });
  const panels = Array.from({length:panelCount}, () => new Element());
  const animations = [];
  const context = {focused:null};
  tabs.forEach(tab => { tab.owner = context; });
  panels.forEach(panel => {
    panel.query.img = {loading:'lazy'};
    if (animate) panel.animate = (keyframes, options) => {
      const animation = {keyframes, options, cancelled:false, cancel() { this.cancelled = true; }};
      animations.push(animation);
      return animation;
    };
  });
  tablist.hidden = true;
  root.query['[data-journey-tabs]'] = tablist;
  root.arrays['[data-journey-tab]'] = tabs;
  root.arrays['[data-journey-panel]'] = panels;
  motion.matches = reduced;
  if (legacyMotion) {
    motion.addListener = handler => Element.prototype.addEventListener.call(motion, 'change', handler);
    motion.addEventListener = null;
  }
  window.matchMedia = () => motion;
  vm.runInNewContext(source, {document:{querySelectorAll:() => [root]}, window});
  const selected = () => tabs.findIndex(tab => tab.attrs['aria-selected'] === 'true');
  const visible = () => panels.map((panel, index) => panel.hidden ? -1 : index).filter(index => index !== -1);
  const press = (index, key, modifiers = {}) => {
    let prevented = false;
    tabs[index].emit('keydown', {key, ...modifiers, preventDefault() { prevented = true; }});
    return prevented;
  };
  return {root,tablist,tabs,panels,motion,window,context,animations,selected,visible,press};
}

let tests = 0;
const test = (name, run) => { run(); tests++; console.log(`✓ ${name}`); };

test('스크립트 없이도 세 단계의 이미지·출처를 모두 읽을 수 있습니다.', () => {
  assert.equal((html.match(/data-journey-panel/g) || []).length, 3);
  assert.doesNotMatch(html, /data-journey-panel[^>]*\bhidden\b/);
  assert.match(html, /data-journey-tabs hidden/);
  for (const stage of data.stages) {
    assert.ok(fs.existsSync(new URL(`./dist/assets/${stage.file}`, import.meta.url)));
    assert.ok(html.includes(escapeHtml(stage.credit)));
  }
  assert.match(html, /최종 인쇄 도안이 아닌 채색 진행 자료/);
  assert.match(html, /팀원 상품/);
});

test('처음에는 도안 단계 하나만 표시하고 첫 탭을 키보드 경로에 둡니다.', () => {
  const app = setup();
  assert.equal(app.selected(), 0);
  assert.deepEqual(app.visible(), [0]);
  assert.deepEqual(app.tabs.map(tab => tab.tabIndex), [0,-1,-1]);
  assert.equal(app.tablist.hidden, false);
  assert.equal(app.tablist.attrs.role, 'tablist');
  assert.equal(app.panels[0].attrs['aria-labelledby'], app.tabs[0].id);
  assert.equal(app.animations.length, 0);
});

test('탭 클릭은 표시 내용과 선택 표시를 함께 변경합니다.', () => {
  const app = setup();
  app.tabs[1].emit('click');
  assert.equal(app.selected(), 1);
  assert.deepEqual(app.visible(), [1]);
  assert.deepEqual(app.tabs.map(tab => tab.tabIndex), [-1,0,-1]);
  assert.equal(app.panels[1].query.img.loading, 'eager');
  assert.equal(app.animations.length, 1);
});

test('빠르게 여러 탭을 눌러도 마지막 단계만 남고 이전 연출은 취소됩니다.', () => {
  const app = setup();
  [1,2,0,2].forEach(index => app.tabs[index].emit('click'));
  assert.equal(app.selected(), 2);
  assert.deepEqual(app.visible(), [2]);
  assert.ok(app.animations.slice(0,-1).every(animation => animation.cancelled));
  assert.equal(app.animations.at(-1).cancelled, false);
  app.tabs[2].emit('click');
  assert.equal(app.animations.length, 4);
});

test('좌우 방향키로 순환하고 Home·End로 양끝 단계에 이동합니다.', () => {
  const app = setup();
  assert.equal(app.press(0,'ArrowLeft'), true);
  assert.equal(app.selected(), 2);
  assert.equal(app.context.focused, app.tabs[2]);
  app.press(2,'ArrowRight');
  assert.equal(app.selected(), 0);
  app.press(0,'End');
  assert.equal(app.selected(), 2);
  app.press(2,'Home');
  assert.equal(app.selected(), 0);
  assert.equal(app.context.focused, app.tabs[0]);
});

test('브라우저 단축키와 세로 스크롤 키를 가로채지 않습니다.', () => {
  const app = setup();
  assert.equal(app.press(0,'ArrowRight',{altKey:true}), false);
  assert.equal(app.press(0,'ArrowLeft',{metaKey:true}), false);
  assert.equal(app.press(0,'ArrowRight',{ctrlKey:true}), false);
  assert.equal(app.press(0,'ArrowDown'), false);
  assert.equal(app.selected(), 0);
});

test('모션 감소·애니메이션 미지원 환경에서도 즉시 전환됩니다.', () => {
  for (const options of [{reduced:true}, {animate:false}]) {
    const app = setup(options);
    app.tabs[2].emit('click');
    assert.equal(app.selected(), 2);
    assert.deepEqual(app.visible(), [2]);
    assert.equal(app.animations.length, 0);
  }
});

test('연출 중 모션 감소를 켜거나 페이지를 떠나면 연출을 정리합니다.', () => {
  for (const legacyMotion of [false,true]) {
    const app = setup({legacyMotion});
    app.tabs[1].emit('click');
    app.motion.matches = true;
    app.motion.emit('change');
    assert.equal(app.animations[0].cancelled, true);
    app.motion.matches = false;
    app.tabs[2].emit('click');
    app.window.emit('pagehide');
    assert.equal(app.animations[1].cancelled, true);
    assert.deepEqual(app.visible(), [2]);
  }
});

test('불완전한 마크업에서는 콘텐츠를 숨기지 않고 정적 보기로 남깁니다.', () => {
  const app = setup({panelCount:2});
  assert.equal(app.root.classList.contains('is-enhanced'), false);
  assert.deepEqual(app.visible(), [0,1]);
  assert.equal(app.tablist.hidden, true);
});

console.log(`상품화 과정 동작 검사 ${tests}개 통과`);

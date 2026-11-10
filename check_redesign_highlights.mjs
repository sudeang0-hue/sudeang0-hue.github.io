import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { validateHighlights, renderChangeMarkers, renderChangeNotes } from './redesign-highlights.mjs';

const source = fs.readFileSync(new URL('./dist/redesign-highlights.js', import.meta.url), 'utf8');
const screens = JSON.parse(fs.readFileSync(new URL('./gamelab-comparison.json', import.meta.url), 'utf8')).screens;
const highlights = JSON.parse(fs.readFileSync(new URL('./gamelab-highlights.json', import.meta.url), 'utf8'));

// 공개 스크립트에 실제 변경점 좌표·버튼·슬라이더 상태·크기 변경 순서를 전달합니다.
// 계산된 주석의 기하 검증은 여기서, 실제 글꼴·색상·등장 느낌은 브라우저에서 확인합니다.
class Element {
  constructor() {
    this.handlers = new Map();
    this.attrs = {};
    this.dataset = {};
    this.classes = new Set();
    this.style = {
      setProperty(name, value) { this[name] = String(value); },
      getPropertyValue(name) { return this[name] || ''; },
    };
    this.map = {};
    this.arrays = {};
    this.classList = {
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  querySelector(selector) { return this.map[selector] || null; }
  querySelectorAll(selector) { return this.arrays[selector] || []; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }
  emit(type) { for (const handler of this.handlers.get(type) || []) handler({ target: this }); }
}

function setup({ ready = true, resizeObserver = true, withToggle = true, withMaps = true } = {}) {
  const root = new Element(), document = new Element(), window = new Element(), toggle = new Element();
  const mutationObservers = [], resizeObservers = [];
  toggle.hidden = true;
  toggle.textContent = '변경점 보기';
  toggle.setAttribute('aria-pressed', 'false');
  if (ready) root.attrs['data-ready'] = '';
  if (withToggle) root.map['[data-change-toggle]'] = toggle;
  const maps = screens.map(screen => {
    const map = new Element(), frame = new Element(), image = new Element();
    frame.clientWidth = 640;
    frame.clientHeight = 360;
    image.naturalWidth = 1920;
    image.naturalHeight = 1080;
    image.attrs = { width: '1920', height: '1080' };
    frame.map.img = image;
    map.parentElement = frame;
    map.image = image;
    map.screenId = screen.id;
    map.arrays['.redesign-change-mark'] = highlights[screen.id].map(({ rect }) => {
      const mark = new Element();
      const [left, top, width, height] = rect;
      Object.assign(mark.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
      return mark;
    });
    return map;
  });
  root.arrays['.redesign-change-map'] = withMaps ? maps : [];
  document.arrays['[data-redesign-comparison]'] = [root];
  class MutationObserver {
    constructor(callback) { this.callback = callback; mutationObservers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; resizeObservers.push(this); }
    observe(target) { this.targets.push(target); }
  }
  if (resizeObserver) window.ResizeObserver = ResizeObserver;
  vm.runInNewContext(source, { document, window, MutationObserver, ResizeObserver });
  return {
    root, toggle, maps, window, mutationObservers, resizeObservers,
    active: () => root.classes.has('is-showing-changes'),
    change: (key, value) => {
      root.dataset[key] = value;
      mutationObservers.forEach(observer => observer.callback());
    },
    resize: (width, height) => {
      maps.forEach(map => { map.parentElement.clientWidth = width; map.parentElement.clientHeight = height; });
      if (resizeObserver) resizeObservers.forEach(observer => observer.callback());
      else window.emit('resize');
    },
  };
}

let passed = 0;
function test(name, action) {
  try { action(); passed++; } catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
}
const point = (rect = [10, 20, 30, 40]) => ({ title: '변경점', description: '변경 이유', rect });
const oneScreen = [{ id: 'sample' }];

test('공개 다섯 화면은 각각 2~3개의 유효한 변경점을 포함', () => {
  assert.equal(screens.length, 5);
  validateHighlights(screens, highlights);
});

test('화면별 자료 누락·허용 개수 밖 목록 거부', () => {
  for (const data of [{}, { sample: null }, { sample: [] }, { sample: [point()] }, { sample: Array.from({ length: 4 }, () => point()) }]) {
    assert.throws(() => validateHighlights(oneScreen, data));
  }
});

test('빈 문구·미완성·비수치·음수·이미지 밖 좌표 거부', () => {
  for (const rect of [undefined, [], [10, 20, 30], [10, 20, 30, '40'], [NaN, 20, 30, 40], [10, 20, Infinity, 40], [-1, 20, 30, 40], [10, -1, 30, 40], [10, 20, 0, 40], [10, 20, 30, -1], [80, 20, 21, 40], [10, 70, 30, 31]]) {
    assert.throws(() => validateHighlights(oneScreen, { sample: [{ ...point(), rect }, point()] }));
  }
  for (const value of [{ ...point(), title: '' }, { ...point(), description: '' }]) {
    assert.throws(() => validateHighlights(oneScreen, { sample: [value, point()] }));
  }
  assert.doesNotThrow(() => validateHighlights(oneScreen, { sample: [point([0, 0, 100, 100]), point([50, 50, 50, 50])] }));
});

test('설명 출력은 제목·본문의 HTML을 텍스트로 이스케이프', () => {
  const notes = renderChangeNotes([{ ...point(), title: '<img src=x onerror="alert(1)">', description: '<script>alert(1)</script> & "설명"' }]);
  assert.ok(notes.includes('&lt;img'));
  assert.ok(notes.includes('&lt;script&gt;'));
  assert.ok(notes.includes('&amp;'));
  assert.ok(!notes.includes('<script>'));
  assert.ok(!notes.includes('<img'));
  const marks = renderChangeMarkers([point(), point()]);
  assert.ok(marks.includes('aria-hidden="true"'));
  assert.ok(marks.includes('<span>1</span>'));
  assert.ok(marks.includes('<span>2</span>'));
  assert.equal((marks.match(/class="redesign-change-leader"/g) || []).length, 2);
});

test('초기에는 변경점이 숨겨지고 버튼 클릭으로 표시·해제', () => {
  const state = setup();
  assert.equal(state.toggle.hidden, false);
  assert.equal(state.active(), false);
  state.toggle.emit('click');
  assert.equal(state.active(), true);
  assert.equal(state.toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(state.toggle.textContent, '변경점 숨기기');
  state.toggle.emit('click');
  assert.equal(state.active(), false);
  assert.equal(state.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(state.toggle.textContent, '변경점 보기');
});

test('슬라이드 이동 중 번호를 숨기고 완료 후 사용자 선택 복원', () => {
  const state = setup();
  state.toggle.emit('click');
  state.change('comparisonAnimating', 'true');
  assert.equal(state.active(), false);
  assert.equal(state.toggle.getAttribute('aria-pressed'), 'true');
  state.change('comparisonIndex', '4');
  assert.equal(state.active(), false);
  state.change('comparisonAnimating', 'false');
  assert.equal(state.active(), true);
  state.change('comparisonAnimating', 'true');
  state.toggle.emit('click');
  state.change('comparisonAnimating', 'false');
  assert.equal(state.active(), false, '이동 중 숨기기를 누르면 완료 후 다시 나타나면 안 됩니다.');
});

test('이동 중 표시 선택·빠른 토글도 마지막 사용자 선택 유지', () => {
  const state = setup();
  state.change('comparisonAnimating', 'true');
  state.toggle.emit('click');
  assert.equal(state.active(), false);
  state.toggle.emit('click');
  state.toggle.emit('click');
  state.change('comparisonAnimating', 'false');
  assert.equal(state.active(), true);
  state.change('comparisonVisible', '1');
  assert.equal(state.active(), true);
});

test('contain 영상비 기준으로 가로·세로 여백을 제외하고 좌표판 크기 계산', () => {
  const state = setup();
  state.resize(320, 200);
  for (const map of state.maps) {
    assert.equal(map.style.width, '320px');
    assert.equal(map.style.height, '180px');
  }
  state.resize(640, 180);
  for (const map of state.maps) {
    assert.equal(map.style.width, '320px');
    assert.equal(map.style.height, '180px');
  }
  assert.equal(state.resizeObservers[0].targets.length, state.maps.length);
});

// 20px 페이지 여백, 확장된 슬라이더, 28px 주석 공간을 반영한 프레임 크기입니다.
// 스크롤바 유무와 높이 제한으로 생기는 contain 여백도 함께 검사합니다.
const mobileFrames = [
  { name: '320px 세로', width: 272, height: 153 },
  { name: '320px 세로·스크롤바', width: 257, height: 145 },
  { name: '390px 세로', width: 342, height: 192 },
  { name: '390px 세로·스크롤바', width: 327, height: 184 },
  { name: '640px 세로', width: 592, height: 304 },
  { name: '640px 세로·스크롤바', width: 577, height: 304 },
  { name: '568×320 가로·한 화면', width: 520, height: 96 },
  { name: '844×390 가로·두 화면', width: 376, height: 96 },
];

function nearlyEqual(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${message}: ${actual} / ${expected}`);
}

function geometry(map) {
  const width = parseFloat(map.style.width), height = parseFloat(map.style.height);
  const frame = map.parentElement;
  const imageLeft = 28 + (frame.clientWidth - width) / 2;
  const imageTop = (frame.clientHeight - height) / 2;
  const points = map.querySelectorAll('.redesign-change-mark').map((mark, index) => {
    const left = parseFloat(mark.style.left) * width / 100;
    const top = parseFloat(mark.style.top) * height / 100;
    const targetHeight = parseFloat(mark.style.height) * height / 100;
    const value = name => {
      const result = parseFloat(mark.style.getPropertyValue(name));
      assert.ok(Number.isFinite(result), `${map.screenId} ${index + 1}: ${name}가 유효해야 합니다.`);
      return result;
    };
    // absolute 자식의 원점은 강조 테두리(2px) 안쪽입니다.
    const badgeLeft = imageLeft + left + 2 + value('--callout-left');
    const badgeTop = imageTop + top + 2 + value('--callout-top');
    const leaderLeft = imageLeft + left + 2 + value('--leader-left');
    const leaderTop = imageTop + top + 2 + value('--leader-top');
    const leaderWidth = value('--leader-width'), leaderAngle = value('--leader-angle');
    return {
      label: `${map.screenId} ${index + 1}`,
      badge: { left: badgeLeft, right: badgeLeft + 22, top: badgeTop, bottom: badgeTop + 22 },
      leader: {
        left: leaderLeft, top: leaderTop,
        endX: leaderLeft + Math.cos(leaderAngle) * leaderWidth,
        endY: leaderTop + Math.sin(leaderAngle) * leaderWidth,
      },
      target: { left: imageLeft + left, middleY: imageTop + top + targetHeight / 2 },
    };
  });
  return { imageLeft, imageTop, height, points };
}

for (const fixture of mobileFrames) {
  test(`${fixture.name}: 다섯 화면 번호는 이미지 밖·클립 안에 있고 등장 중에도 겹치지 않음`, () => {
    const state = setup();
    state.resize(fixture.width, fixture.height);
    for (const map of state.maps) {
      const { imageLeft, imageTop, height, points } = geometry(map);
      assert.equal(points.length, highlights[map.screenId].length);
      for (const { label, badge } of points) {
        assert.ok(badge.left >= 0, `${label}: 왼쪽 클립 경계를 벗어나면 안 됩니다.`);
        assert.ok(badge.right <= imageLeft, `${label}: 이미지 내용 위에 번호를 놓으면 안 됩니다.`);
        assert.ok(badge.top >= imageTop - 0.000001, `${label}: 위쪽이 잘리면 안 됩니다.`);
        assert.ok(badge.bottom + 6 <= imageTop + height + 0.000001, `${label}: 등장 이동 6px까지 아래쪽이 잘리면 안 됩니다.`);
      }
      for (let first = 0; first < points.length; first++) {
        for (let second = first + 1; second < points.length; second++) {
          const a = points[first].badge, b = points[second].badge;
          // 순서가 다른 도감 번호도 안전하도록 각 등장 위치(0~6px)를 모두 포함합니다.
          const separate = a.right <= b.left || b.right <= a.left
            || a.bottom + 6 <= b.top || b.bottom + 6 <= a.top;
          assert.ok(separate, `${points[first].label}·${points[second].label}: 순차 등장 중 번호가 겹칩니다.`);
        }
      }
    }
  });
  test(`${fixture.name}: 모든 연결선은 자기 번호 오른쪽에서 대상 테두리 왼쪽 중앙까지 이어짐`, () => {
    const state = setup();
    state.resize(fixture.width, fixture.height);
    for (const map of state.maps) {
      for (const { label, badge, leader, target } of geometry(map).points) {
        nearlyEqual(leader.left, badge.right, `${label} 연결선 시작 X`);
        nearlyEqual(leader.top, (badge.top + badge.bottom) / 2, `${label} 연결선 시작 Y`);
        nearlyEqual(leader.endX, target.left, `${label} 대상 테두리 X`);
        nearlyEqual(leader.endY, target.middleY, `${label} 대상 테두리 Y`);
      }
    }
  });
}

test('세로→짧은 가로→세로 회전은 실제 다섯 화면의 번호·연결선 좌표를 재계산', () => {
  const state = setup();
  const snapshots = () => state.maps.map(map => geometry(map));
  state.resize(327, 184);
  const portrait = snapshots();
  state.resize(376, 96);
  const landscape = snapshots();
  assert.notDeepEqual(landscape, portrait);
  state.resize(327, 184);
  assert.deepEqual(snapshots(), portrait);
});

test('지연 이미지 로드 전에는 선언 크기, 로드 후에는 실제 비율 적용', () => {
  const state = setup();
  const map = state.maps[0];
  map.image.naturalWidth = 0;
  map.image.naturalHeight = 0;
  state.resize(400, 300);
  assert.equal(map.style.width, '400px');
  assert.equal(map.style.height, '225px');
  map.image.naturalWidth = 800;
  map.image.naturalHeight = 600;
  map.image.emit('load');
  assert.equal(map.style.width, '400px');
  assert.equal(map.style.height, '300px');
});

test('ResizeObserver 없는 환경도 화면 크기 변경 반영', () => {
  const state = setup({ resizeObserver: false });
  state.resize(320, 180);
  assert.equal(state.maps[0].style.width, '320px');
  assert.equal(state.maps[0].style.height, '180px');
  assert.equal(state.resizeObservers.length, 0);
});

test('아직 배치되지 않은 프레임은 계산을 건너뛰고 표시되면 다시 정렬', () => {
  const state = setup();
  state.resize(0, 0);
  assert.equal(state.maps[0].style.width, '640px');
  state.resize(320, 180);
  assert.equal(state.maps[0].style.width, '320px');
  state.maps[0].image.naturalWidth = 0;
  state.maps[0].image.naturalHeight = 0;
  state.maps[0].image.attrs = {};
  assert.doesNotThrow(() => state.maps[0].image.emit('load'));
});

test('슬라이더 초기화 실패나 자료 누락 시 동작하지 않는 버튼을 숨김', () => {
  for (const options of [{ ready: false }, { withMaps: false }, { withToggle: false }]) {
    const state = setup(options);
    assert.equal(state.toggle.hidden, true);
    assert.equal(state.active(), false);
    assert.equal(state.mutationObservers.length, 0);
  }
});

console.log(`UI 변경점 강조 검사 ${passed}개 통과`);

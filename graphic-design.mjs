import { checkedAssetPath } from './security.mjs';

// 개인 디자인 사례를 기존 공공기관·일러스트 목록과 분리해 출력합니다.
export function renderGraphicDesignPortfolio(data, { escapeHtml: esc }) {
  if (!Array.isArray(data.works) || !data.works.length) {
    throw new Error('디자인 작품 목록이 필요합니다.');
  }
  const ids = data.works.map(work => work.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) {
    throw new Error('디자인 작품 ID는 중복되지 않는 영문·숫자·하이픈이어야 합니다.');
  }

  const photo = (image, work, index, copy = false) => {
    const caption = image.caption || image.alt || work.title;
    return '<figure class="media graphic-art goods-slide" data-goods-source="' + index + '"' + (copy ? ' data-goods-copy hidden' : '') + '>' +
      '<button class="zoom-trigger" type="button" data-zoom data-caption="' + esc(work.title + ' · ' + caption) + '" aria-label="' + esc(caption + ' 크게 보기') + '">' +
      '<img src="assets/' + checkedAssetPath(image.file) + '" alt="' + esc(image.alt || caption) + '" loading="lazy" decoding="async">' +
      '</button><figcaption><span>' + esc(image.caption || '') + '</span><span class="graphic-zoom-hint" aria-hidden="true">확대 ↗</span></figcaption></figure>';
  };

  // 굿즈에서 검증한 순환·드래그 로직을 같은 마크업으로 재사용합니다.
  const slider = work => {
    const images = work.images;
    const copies = images.length > 1;
    const slides = (copies ? photo(images.at(-1), work, images.length - 1, true) : '') +
      images.map((image, index) => photo(image, work, index)).join('') +
      (copies ? photo(images[0], work, 0, true) : '');
    const label = work.title + ' 이미지';
    return '<section class="goods-slider graphic-slider" data-goods-slider data-interval="0" role="region" aria-roledescription="슬라이드" aria-label="' + esc(label) + '">' +
      '<div class="goods-slider-controls" hidden><span class="goods-slider-count" data-slide-count aria-hidden="true">1 / ' + images.length + '</span>' +
      '<div class="goods-slider-buttons"><button type="button" data-slide-prev aria-label="' + esc(label + ' 이전 사진') + '">←</button>' +
      '<button type="button" data-slide-next aria-label="' + esc(label + ' 다음 사진') + '">→</button></div></div>' +
      '<div class="goods-slider-window" tabindex="0" aria-label="' + esc(label + ' · 좌우 방향키로 이동') + '"><div class="goods-slider-track">' + slides + '</div></div>' +
      '<p class="sr-only" data-slide-status role="status" aria-live="polite" aria-atomic="true"></p></section>';
  };

  const metadata = work => {
    const fields = [['제작', work.period], ['담당', work.role], ['도구', work.tools], ['규격', work.format]];
    return '<dl class="graphic-meta">' + fields.filter(([, value]) => value)
      .map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>';
  };

  const project = (work, index) => {
    if (!Array.isArray(work.images) || !work.images.length) {
      throw new Error('대표 이미지가 없는 디자인 작품입니다: ' + work.id);
    }
    const decisions = Array.isArray(work.decisions) ? work.decisions : [];
    return '<article class="graphic-project" id="graphic-' + work.id + '" aria-labelledby="graphic-' + work.id + '-title">' +
      '<header class="graphic-project-heading"><span class="graphic-project-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div>' +
      '<p class="graphic-category">' + esc(work.category) + '</p><h3 id="graphic-' + work.id + '-title">' + esc(work.title) + '</h3></div></header>' +
      '<div class="graphic-feature"><div class="graphic-project-copy"><details class="graphic-meta-disclosure"><summary class="graphic-summary">' + esc(work.summary) + ' <span class="graphic-meta-action"><span class="graphic-meta-show">세부사항 펼치기</span><span class="graphic-meta-hide">세부사항 접기</span><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7 5 5 5-5"/></svg></span></summary>' + metadata(work) + '</details>' +
      (decisions.length ? '<div class="graphic-decisions">' + decisions.map(decision => '<section><h4>' + esc(decision.title) + '</h4><p>' + esc(decision.text) + '</p></section>').join('') + '</div>' : '') +
      '</div>' + slider(work) + '</div>' +
      '</article>';
  };

  return '<section id="design-work" class="design-section graphic-design-portfolio" aria-labelledby="design-title">' +
    '<header class="graphic-heading"><span class="eyebrow">03 / DESIGN</span><h2 id="design-title">' + esc(data.title) + '</h2>' +
    '<p class="graphic-headline">' + esc(data.headline) + '</p>' +
    (data.introduction ? '<p class="graphic-introduction">' + esc(data.introduction) + '</p>' : '') + '</header>' +
    '<nav class="graphic-index" aria-label="디자인 작품 바로가기"><ol>' + data.works.map((work, index) => '<li><a href="#graphic-' + work.id + '"><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span>' + esc(work.title) + '</span></a></li>').join('') + '</ol></nav>' +
    '<div class="graphic-projects">' + data.works.map(project).join('') + '</div></section>';
}

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

  const photo = (image, work, featured = false, wide = false) => {
    const caption = image.caption || image.alt || work.title;
    return '<figure class="media graphic-art' + (featured ? ' graphic-art--featured' : '') + (wide ? ' graphic-art--wide' : '') + '">' +
      '<button class="zoom-trigger" type="button" data-zoom data-caption="' + esc(work.title + ' · ' + caption) + '" aria-label="' + esc(caption + ' 크게 보기') + '">' +
      '<img src="assets/' + checkedAssetPath(image.file) + '" alt="' + esc(image.alt || caption) + '" loading="lazy" decoding="async">' +
      '</button><figcaption><span>' + esc(image.caption || '') + '</span><span class="graphic-zoom-hint" aria-hidden="true">확대 ↗</span></figcaption></figure>';
  };

  const relatedLink = related => {
    if (!related) return '';
    // 작업 사례 연결은 이 사이트 안의 HTML·앵커 주소만 허용합니다.
    if (!/^[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$/i.test(related.href || '')) {
      throw new Error('디자인 관련 사례 링크는 사이트 내부 HTML 주소여야 합니다.');
    }
    return '<div class="graphic-related"><a class="text-link" href="' + esc(related.href) + '">' + esc(related.label) + ' <span aria-hidden="true">↗</span></a></div>';
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
    const extraImages = work.images.slice(1);
    const decisions = Array.isArray(work.decisions) ? work.decisions : [];
    return '<article class="graphic-project" id="graphic-' + work.id + '" aria-labelledby="graphic-' + work.id + '-title">' +
      '<header class="graphic-project-heading"><span class="graphic-project-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div>' +
      '<p class="graphic-category">' + esc(work.category) + '</p><h3 id="graphic-' + work.id + '-title">' + esc(work.title) + '</h3></div></header>' +
      '<div class="graphic-feature"><div class="graphic-project-copy"><p class="graphic-summary">' + esc(work.summary) + '</p>' + metadata(work) +
      (decisions.length ? '<div class="graphic-decisions">' + decisions.map(decision => '<section><h4>' + esc(decision.title) + '</h4><p>' + esc(decision.text) + '</p></section>').join('') + '</div>' : '') +
      relatedLink(work.related) + '</div>' + photo(work.images[0], work, true) + '</div>' +
      (extraImages.length ? '<div class="graphic-gallery" aria-label="' + esc(work.title + ' 세부 이미지') + '">' + extraImages.map((image, imageIndex) => photo(image, work, false, extraImages.length % 2 === 1 && imageIndex === extraImages.length - 1)).join('') + '</div>' : '') +
      '</article>';
  };

  return '<section id="design-work" class="design-section graphic-design-portfolio" aria-labelledby="design-title">' +
    '<header class="graphic-heading"><span class="eyebrow">03 / DESIGN</span><h2 id="design-title">' + esc(data.title) + '</h2>' +
    '<p class="graphic-headline">' + esc(data.headline) + '</p>' +
    (data.introduction ? '<p class="graphic-introduction">' + esc(data.introduction) + '</p>' : '') + '</header>' +
    '<nav class="graphic-index" aria-label="디자인 작품 바로가기"><ol>' + data.works.map((work, index) => '<li><a href="#graphic-' + work.id + '"><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span>' + esc(work.title) + '</span></a></li>').join('') + '</ol></nav>' +
    '<div class="graphic-projects">' + data.works.map(project).join('') + '</div></section>';
}

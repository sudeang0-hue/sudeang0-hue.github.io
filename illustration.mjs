import { checkedAssetPath } from './security.mjs';

// 공공기관 작품의 목록·연도 필터와 분리해 개인 일러스트만 렌더링합니다.
export function renderIllustrationPortfolio(data, { escapeHtml: esc, ext }) {
  const requiredIds = ['memory', 'calendar', 'flandre', 'reimu', 'marisa', 'kumi', 'eunsol'];
  if (!Array.isArray(data.works)) throw new Error('일러스트 작품 목록이 필요합니다.');
  const works = new Map(data.works.map(work => [work.id, work]));
  if (works.size !== data.works.length) throw new Error('일러스트 작품 ID가 중복됐습니다.');
  for (const id of requiredIds) {
    if (!works.has(id)) throw new Error('일러스트 작품이 누락됐습니다: ' + id);
  }
  if (!data.publication?.file) throw new Error('작품집 수록 이미지가 필요합니다.');

  const paragraphs = value => (Array.isArray(value) ? value : [value])
    .filter(text => typeof text === 'string' && text.trim())
    .map(text => '<p>' + esc(text) + '</p>').join('');
  const photo = (work, className = '') => {
    const caption = work.title + (work.kind ? ' · ' + work.kind : '');
    return '<figure class="media illustration-art ' + className + '">' +
      '<button class="zoom-trigger" type="button" data-zoom data-caption="' + esc(caption) + '" aria-label="' + esc(work.title) + ' 크게 보기">' +
      '<img src="assets/' + checkedAssetPath(work.file) + '" alt="' + esc(work.alt) + '" loading="lazy" decoding="async">' +
      '</button><figcaption><span>이미지 크게 보기</span><span aria-hidden="true">↗</span></figcaption></figure>';
  };
  const meta = work => '<p class="illustration-meta">' +
    [work.year, work.kind].filter(Boolean).map(text => '<span>' + esc(text) + '</span>').join('') + '</p>';
  const source = work => ext(work.url, '인스타그램 원문', 'text-link illustration-source');
  const card = id => {
    const work = works.get(id);
    return '<article class="illustration-card" id="illustration-' + id + '">' +
      '<header>' + meta(work) + '<h3>' + esc(work.title) + '</h3></header>' + photo(work) +
      '<div class="illustration-description">' + paragraphs(work.description) + '</div>' + source(work) + '</article>';
  };

  const memory = works.get('memory');
  const calendar = works.get('calendar');
  const publication = data.publication;
  const profile = typeof data.profile === 'string' ? data.profile : data.profile?.url;

  return '<section id="illustration-work" class="design-section illustration-portfolio" aria-labelledby="illustration-title">' +
    '<header class="illustration-heading"><span class="eyebrow">02 / ILLUSTRATION</span>' +
    '<h2 id="illustration-title">' + esc(data.title) + '</h2>' +
    '<p class="illustration-headline">' + esc(data.headline) + '</p></header>' +
    '<article class="illustration-feature" id="illustration-memory">' +
      '<div class="illustration-feature-copy"><div class="illustration-introduction">' + paragraphs(data.introduction) + '</div>' +
      '<div class="illustration-feature-detail">' + meta(memory) + '<h3>' + esc(memory.title) + '</h3>' +
      '<div class="illustration-description">' + paragraphs(memory.description) + '</div>' + source(memory) + '</div></div>' +
      photo(memory, 'illustration-feature-art') + '</article>' +
    '<article class="illustration-calendar" id="illustration-calendar"><header>' + meta(calendar) + '<h3>' + esc(calendar.title) + '</h3></header>' +
      photo(calendar) + '<div class="illustration-wide-detail"><div class="illustration-description">' + paragraphs(calendar.description) + '</div>' + source(calendar) + '</div></article>' +
    '<div class="illustration-series"><div class="illustration-group-heading"><span class="eyebrow">CHARACTER SERIES</span><h3>캐릭터 일러스트 연작</h3></div>' +
      '<div class="illustration-grid illustration-grid--series">' + ['flandre', 'reimu', 'marisa'].map(card).join('') + '</div></div>' +
    '<div class="illustration-grid illustration-grid--pair">' + ['kumi', 'eunsol'].map(card).join('') + '</div>' +
    '<article class="illustration-publication" aria-labelledby="illustration-publication-title">' +
      photo(publication) + '<div class="illustration-publication-copy"><span class="eyebrow">PUBLICATION</span><h3 id="illustration-publication-title">' + esc(publication.title) + '</h3>' +
      '<div class="illustration-description">' + paragraphs(publication.description) + '</div>' +
      ext(publication.url, '작품집 수록 게시물', 'text-link illustration-source') + '</div></article>' +
    '<div class="illustration-related-links">' +
      (profile ? ext(profile, '일러스트 인스타그램', 'text-link') : '') +
      '<a class="text-link" href="planning.html#goods-illustration">일러스트의 굿즈 제작 과정 <span aria-hidden="true">↗</span></a></div>' +
    '</section>';
}

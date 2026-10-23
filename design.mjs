import { checkedAssetPath } from './security.mjs';
import { publicReaderPath } from './public-reader.mjs';

export const designSections = [
  ['public-work', '공공기관 작업'],
  ['illustration-work', '일러스트 작업'],
  ['design-work', '디자인 작업']
];

// 작품 데이터와 화면 구성을 분리해 공식 링크·집계 근거를 함께 관리합니다.
export function renderDesignPortfolio(data, {escapeHtml: esc, ext}) {
  if (!Array.isArray(data.works) || !data.works.length) throw new Error('공공기관 작품 목록이 필요합니다.');
  if (new Set(data.works.map(work => work.id)).size !== data.works.length) throw new Error('작품 ID가 중복됐습니다.');
  const paragraphs = texts => texts.map(text => '<p>'+esc(text)+'</p>').join('');
  const thumbnailPhoto = (image, work) => '<figure class="media public-art public-thumbnail public-thumbnail--'+(image.view === 'top' ? 'top' : 'contain')+'"><a class="public-reader-link" href="'+publicReaderPath(work.id)+'" aria-label="'+esc(work.title)+' '+esc(work.readerLabel||'작품 읽기')+'"><img src="assets/'+checkedAssetPath(image.file)+'" alt="'+esc(image.alt)+'" loading="lazy" decoding="async"></a><figcaption>'+esc(image.caption)+'<span class="public-reader-hint">'+esc(work.readerLabel||'작품 읽기')+' →</span></figcaption></figure>';
  const sourceLinks = work => {
    if (!work.links.length) return '';
    const primary = work.links.filter(link => link.platform === 'instagram');
    const extra = work.links.filter(link => link.platform !== 'instagram');
    return '<div class="public-source-links">'+primary.map(link => ext(link.url, link.label, 'text-link public-source-primary')).join('')+
      (extra.length ? '<details class="public-extra-links"><summary>공식 홈페이지·배포 채널 '+extra.length+'곳</summary><div>'+extra.map(link => ext(link.url, link.label, 'text-link')).join('')+'</div></details>' : '')+'</div>';
  };
  const card = work => {
    const images = work.images || [];
    const thumbnail = work.thumbnail || images[0];
    return '<article class="public-work-card" id="public-'+esc(work.id)+'" data-public-work data-year="'+esc(work.year)+'">'+
      '<header><p class="public-work-meta"><span>'+esc(work.year)+'</span><span>'+esc(work.kind)+'</span></p><h3>'+esc(work.title)+'</h3></header>'+
      (thumbnail ? thumbnailPhoto(thumbnail, work) : '<div class="public-art-pending"><span>작업 자료 연결 준비 중</span></div>')+
      '<p class="public-work-description">'+esc(work.description)+'</p>'+
      (work.detail ? '<p class="public-work-detail">'+esc(work.detail)+'</p>' : '')+
      sourceLinks(work)+
      '</article>';
  };
  return '<div class="wrap design-portfolio"><section id="public-work" class="design-section public-project" aria-labelledby="public-project-title">'+
    '<header class="page-head public-head"><p class="breadcrumb">디자인 및 홍보 &nbsp;/&nbsp; 01. 공공기관 작업</p><span class="eyebrow">PUBLIC COMMUNICATION · WEBTOON · ILLUSTRATION</span><div class="public-header-main"><div class="public-header-copy"><h1 id="public-project-title">'+esc(data.title)+'</h1><p class="subtitle">'+esc(data.headline.join(' '))+'</p><div class="public-intro">'+paragraphs(data.introduction)+'</div></div><nav class="public-social-links" aria-label="공식 홍보 채널">'+data.channels.map(channel => ext(channel.url, channel.label, 'text-link public-social-link')).join('')+'</nav></div><dl class="meta-grid"><div><dt>PERIOD</dt><dd>2022 — 2023 제작 기록</dd></div><div><dt>MY ROLE</dt><dd>웹툰·일러스트 제작</dd></div><div><dt>TOOLS</dt><dd>Adobe Photoshop · Adobe Illustrator</dd></div></dl></header>'+
    '<section class="public-process" aria-labelledby="public-role-title"><div><span class="eyebrow">MY CONTRIBUTION</span><h2 id="public-role-title">내용 조사·작화·수정을 직접 맡았습니다.</h2></div><div class="public-process-steps">'+data.process.map((step,i) => '<article><span class="num">0'+(i+1)+'</span><h3>'+esc(step.title)+'</h3><p>'+esc(step.text)+'</p></article>').join('')+'</div></section>'+
    '<section class="public-works" aria-labelledby="public-works-title"><div class="section-line"><span id="public-works-title">SELECTED WORK / 작품과 활용 기록</span><span>2022 — 2023</span></div><p class="public-collection-note">'+esc(data.collectionNote)+'</p><div class="public-work-filters" role="group" aria-label="제작 연도 선택" data-public-filters hidden><button type="button" data-public-filter="all" aria-pressed="true">전체</button><button type="button" data-public-filter="2023" aria-pressed="false">2023</button><button type="button" data-public-filter="2022" aria-pressed="false">2022</button><span data-public-result aria-live="polite"></span></div><div class="public-work-grid">'+data.works.map(card).join('')+'</div></section></section>'+
    '<section id="illustration-work" class="design-section design-next" aria-labelledby="illustration-title"><span class="eyebrow">02 / ILLUSTRATION</span><h2 id="illustration-title">일러스트 작업</h2><p>굿즈에 사용한 일러스트의 러프·선화·채색과 실물 적용 과정을 소개합니다.</p><p class="design-next-note">공공기관 홍보에 사용된 일러스트는 위 프로젝트에서 함께 볼 수 있습니다.</p><a class="text-link" href="planning.html#goods-illustration">굿즈에 담은 본인 일러스트 보기 ↗</a></section>'+
    '<section id="design-work" class="design-section design-next" aria-labelledby="design-title"><span class="eyebrow">03 / DESIGN</span><h2 id="design-title">디자인 작업</h2><p>게임의 화면 흐름을 설계하고, 실제 에셋과 정보 가독성에 맞춰 UI를 다듬었습니다.</p><a class="text-link" href="gamelab.html#redesign">게임 UI 디자인 사례 보기 ↗</a></section>'+
    '<div class="category-return"><a class="text-link" href="#public-work">공공기관 작업 처음으로 ↑</a><a class="text-link" href="history.html">활동·경력 연혁 보기 ↗</a></div></div>';
}

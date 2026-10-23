import { checkedAssetPath, escapeHtml as esc } from './security.mjs';

export function publicReaderPath(id) {
  if (!/^202[23]-(?:0[1-9]|[1-9][0-9])$/.test(id)) throw new Error('작품 ID를 확인하세요.');
  return 'webtoon-'+id+'.html';
}

// 원게시 순서를 별도 데이터로 관리해 대표 이미지 선정 순서와 섞이지 않게 합니다.
export function renderPublicReader(work, reading, works, { ext }) {
  if (reading.id !== work.id || !reading.chapters?.length || !reading.note) throw new Error('작품 읽기 자료가 필요합니다: '+work.id);
  const index = works.findIndex(item => item.id === work.id);
  const previous = works[index-1];
  const next = works[index+1];
  const chapterMenu = reading.chapters.length > 1 ? '<nav class="webtoon-chapters" aria-label="작품 회차">'+reading.chapters.map((chapter,i) => '<a href="#reader-chapter-'+(i+1)+'">'+esc(chapter.title)+'</a>').join('')+'</nav>' : '';
  const chapters = reading.chapters.map((chapter,i) => {
    if (!chapter.pages?.length) throw new Error('읽기 이미지가 필요합니다: '+work.id);
    return '<section class="webtoon-chapter" id="reader-chapter-'+(i+1)+'" aria-label="'+esc(chapter.title)+'">'+
      (reading.chapters.length > 1 ? '<h2>'+esc(chapter.title)+'</h2>' : '')+
      (chapter.note ? '<p class="webtoon-chapter-note">'+esc(chapter.note)+'</p>' : '')+
      '<div class="webtoon-pages">'+chapter.pages.map((image,pageIndex) => '<img src="assets/'+checkedAssetPath(image.file)+'" alt="'+esc(image.alt||work.title+' · '+chapter.title+' '+(pageIndex+1)+'번째 이미지')+'" loading="'+(i===0&&pageIndex===0?'eager':'lazy')+'" decoding="async"'+(i===0&&pageIndex===0?' fetchpriority="high"':'')+'>').join('')+'</div></section>';
  }).join('');
  const adjacent = (other,label,arrow) => other ? '<a href="'+publicReaderPath(other.id)+'"><span>'+label+' '+arrow+'</span><strong>'+esc(other.title)+'</strong></a>' : '<span class="webtoon-adjacent-empty" aria-hidden="true"></span>';
  return '<article class="webtoon-reader" id="reader-top" data-reader-work="'+esc(work.id)+'"><header class="webtoon-head"><p class="eyebrow">'+esc(work.year)+' · '+esc(work.kind)+'</p><h1>'+esc(work.title)+'</h1><p class="webtoon-description">'+esc(work.description)+'</p><p class="webtoon-scope">'+esc(reading.note)+'</p>'+chapterMenu+'</header>'+chapters+
    '<footer class="webtoon-end"><p class="webtoon-credit">제작: 최희수 · '+esc(work.kind)+'</p><div class="webtoon-publications"><h2>'+esc(work.publicationHeading||'공식 게시 기록')+'</h2><nav aria-label="'+esc(work.title)+' 관련 링크">'+(work.links.length?work.links.map(link=>ext(link.url,link.label)).join(''):'<p>'+esc(work.publicationNote||'공식 최종 게시본 미확인 · 보유 작업 자료')+'</p>')+'</nav></div><nav class="webtoon-adjacent" aria-label="다른 작품 읽기">'+adjacent(previous,'이전 작품','←')+adjacent(next,'다음 작품','→')+'</nav><a class="text-link webtoon-return" href="design.html#public-'+esc(work.id)+'">작품 목록으로 돌아가기 ←</a></footer></article>';
}

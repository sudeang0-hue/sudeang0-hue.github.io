const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sectionIds = ['work', 'education', 'activities'];
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function action(link) {
  if (!link) return '';
  if (!/^[a-z][a-z0-9-]*\.html(?:#[a-z][a-z0-9-]*)?$/.test(link.href) || !link.label) {
    throw new Error('연혁 링크에는 사이트 내부 HTML 주소와 표시 문구가 필요합니다.');
  }
  return `<a class="history-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`;
}

function period(item) {
  if (item.dateLabel && !item.start && !item.end) return escapeHtml(item.dateLabel);
  if (!monthPattern.test(item.start) || (item.ongoing !== true && !monthPattern.test(item.end))) {
    throw new Error(`연혁 ${item.id}: 기간은 YYYY-MM, 진행 중은 ongoing: true로 입력하세요.`);
  }
  if (item.end && item.start > item.end) throw new Error(`연혁 ${item.id}: 시작·종료 순서를 확인하세요.`);
  return `<time datetime="${item.start}">${item.start.replace('-', '.')}</time><span aria-hidden="true"> — </span><span class="sr-only">부터 </span>${item.ongoing === true ? '현재' : `<time datetime="${item.end}">${item.end.replace('-', '.')}</time>`}`;
}

function timelineItem(item, title, ids) {
  if (!/^[a-z][a-z0-9-]*$/.test(item.id) || ids.has(item.id)) throw new Error('연혁 항목 id가 없거나 중복되었습니다.');
  ids.add(item.id);
  if (!item.organization || !item.role || !item.description) throw new Error(`연혁 ${item.id}: 이름·역할·설명이 필요합니다.`);
  return `<li class="history-item" id="history-${item.id}"><div class="history-item-meta"><span class="history-date">${period(item)}</span><span class="history-badge">${escapeHtml(title)}</span></div><h3>${escapeHtml(item.organization)}</h3><p class="history-role">${escapeHtml(item.role)}</p><p class="history-description">${escapeHtml(item.description)}</p>${action(item.link)}</li>`;
}

function historySection(section, ids) {
  if (!Array.isArray(section.items)) throw new Error(`연혁 ${section.id}: items 배열이 필요합니다.`);
  const count = section.items.length;
  const items = [...section.items].sort((a,b) => (b.start || '').localeCompare(a.start || ''));
  const body = count
    ? `<ol class="history-timeline">${items.map(item => timelineItem(item, section.title, ids)).join('')}</ol>`
    : `<div class="history-empty"><span class="history-empty-dot" aria-hidden="true"></span><h3>${escapeHtml(section.emptyTitle || '기록을 준비하고 있습니다.')}</h3><p>${escapeHtml(section.emptyDescription || '')}</p>${action(section.link)}</div>`;
  return `<section class="history-section" id="${section.id}" aria-labelledby="history-${section.id}-title"><header class="history-section-head"><div><span class="eyebrow">${escapeHtml(section.label)}</span><h2 id="history-${section.id}-title">${escapeHtml(section.title)}</h2></div><span class="history-count">${count ? `${String(count).padStart(2, '0')}개 기록` : '기록 준비'}</span></header>${body}</section>`;
}

export function renderHistory(data) {
  if (!data.title || !data.introduction || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt)) throw new Error('연혁 제목·소개·갱신일을 확인하세요.');
  if (JSON.stringify(data.sections?.map(section => section.id)) !== JSON.stringify(sectionIds)) throw new Error('연혁은 근무·교육·활동 순서로 구성합니다.');
  const ids = new Set();
  const sections = data.sections.map(section => historySection(section, ids));
  return `<div class="history-page"><div class="wrap"><header class="category-head history-head"><span class="eyebrow">EXPERIENCE / 지나온 기록</span><h1>${escapeHtml(data.title)}</h1><p class="history-lead">${escapeHtml(data.introduction)}</p><p class="history-updated">업데이트 <time datetime="${data.updatedAt}">${data.updatedAt.replaceAll('-', '.')}</time></p></header><nav class="history-index" aria-label="연혁 목차">${data.sections.map(section => `<a href="#${section.id}">${escapeHtml(section.title)}<span aria-hidden="true">↗</span></a>`).join('')}</nav><div class="history-grid">${sections[0]}<div class="history-side">${sections[1]}${sections[2]}</div></div><div class="category-return"><a class="text-link" href="resume.html">이력서 보기 <span aria-hidden="true">↗</span></a><a class="text-link" href="index.html">게임개발 프로젝트 보기 <span aria-hidden="true">↗</span></a></div></div></div>`;
}

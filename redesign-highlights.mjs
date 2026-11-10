import { escapeHtml } from './security.mjs';

export function validateHighlights(screens, highlights) {
  for (const screen of screens) {
    const points = highlights[screen.id];
    if (!Array.isArray(points) || points.length < 2 || points.length > 3) throw new Error(`${screen.id}: 변경점 2~3개를 확인하세요.`);
    for (const point of points) {
      const [x, y, width, height] = point.rect || [];
      if (!point.title || !point.description || ![x, y, width, height].every(Number.isFinite)
        || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100 || y + height > 100) {
        throw new Error(`${screen.id}: 변경점 문구와 이미지 좌표를 확인하세요.`);
      }
    }
  }
}

export function renderChangeMarkers(points) {
  return '<span class="redesign-change-map" aria-hidden="true">' + points.map((point, index) => {
    const [x, y, width, height] = point.rect;
    return `<span class="redesign-change-mark" style="left:${x}%;top:${y}%;width:${width}%;height:${height}%;--change-order:${index}"><i class="redesign-change-leader"></i><span>${index + 1}</span></span>`;
  }).join('') + '</span>';
}

export function renderChangeNotes(points) {
  return '<ol class="redesign-change-list" aria-label="이 화면의 변경점">' + points.map((point, index) =>
    `<li style="--change-order:${index}"><span class="redesign-change-number" aria-hidden="true">${index + 1}</span><div><b>${escapeHtml(point.title)}</b><span>${escapeHtml(point.description)}</span></div></li>`
  ).join('') + '</ol>';
}

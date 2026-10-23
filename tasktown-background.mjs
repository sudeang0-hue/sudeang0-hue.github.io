import { escapeHtml } from './security.mjs';

// 공통 페이지 생성·디자인과 분리하여 TaskTown에만 배경을 연결합니다.
export function withTasktownBackground(html, assetURL) {
  const asset = file => escapeHtml(assetURL(file));
  const backdrop = '<div class="tasktown-background" data-tasktown-background aria-hidden="true">'
    + '<img class="tasktown-background-poster" src="' + asset('assets/tasktown-background-poster.jpg') + '" width="1280" height="720" alt="" decoding="async">'
    + '<video id="tasktown-background-video" class="tasktown-background-video" data-tasktown-background-video autoplay muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"'
    + ' data-desktop-src="' + asset('assets/tasktown-background-720p.mp4') + '"'
    + ' data-mobile-src="' + asset('assets/tasktown-background-540p.mp4') + '"></video></div>';
  const control = '<button type="button" class="tasktown-background-toggle" data-tasktown-background-toggle aria-controls="tasktown-background-video" aria-label="배경 영상 재생" title="배경 영상 재생" hidden><span aria-hidden="true" data-tasktown-background-icon>▶</span></button>';
  const resources = '<link rel="stylesheet" href="' + asset('tasktown-background.css') + '">'
    + '<script src="' + asset('tasktown-background.js') + '" defer></script>';
  const intro = /(<main id="main">)<div class="wrap">(<header class="page-head">)([\s\S]*?)(<dl class="meta-grid">[\s\S]*?<\/dl>)(<div class="links project-links">[\s\S]*?)<\/header>/;
  if (!intro.test(html)) {
    throw new Error('TaskTown 소개·본문 경계를 찾을 수 없습니다.');
  }
  return html.replace('</head>', resources + '</head>')
    .replace('<body', '<body data-tasktown-background-page')
    .replace(intro, (_, main, start, copy, metadata, links) => main + start
      + '<div class="tasktown-intro" data-tasktown-intro>' + backdrop
      + '<div class="wrap tasktown-intro-copy">' + copy + control + '</div>'
      + '<div class="tasktown-intro-details"><div class="wrap">' + metadata + '</div></div>'
      + '</div><div class="wrap">' + links + '</div></header><div class="wrap">');
}

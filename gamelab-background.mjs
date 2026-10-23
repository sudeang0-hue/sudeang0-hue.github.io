import { escapeHtml } from './security.mjs';

// 공통 페이지 생성·디자인과 분리하여 게임랩에만 배경을 연결합니다.
export function withGamelabBackground(html, assetURL) {
  const asset = file => escapeHtml(assetURL(file));
  const backdrop = '<div class="gamelab-background" data-gamelab-background aria-hidden="true">'
    + '<img class="gamelab-background-poster" src="' + asset('assets/gamelab-background-poster.jpg') + '" width="1280" height="720" alt="" decoding="async">'
    + '<video id="gamelab-background-video" class="gamelab-background-video" data-gamelab-background-video autoplay muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"'
    + ' data-desktop-src="' + asset('assets/gamelab-background-720p.mp4') + '"'
    + ' data-mobile-src="' + asset('assets/gamelab-background-540p.mp4') + '"></video></div>';
  const control = '<button type="button" class="gamelab-background-toggle" data-gamelab-background-toggle aria-controls="gamelab-background-video" aria-label="배경 영상 재생" title="배경 영상 재생" hidden><span aria-hidden="true" data-gamelab-background-icon>▶</span></button>';
  const resources = '<link rel="stylesheet" href="' + asset('gamelab-background.css') + '">'
    + '<script src="' + asset('gamelab-background.js') + '" defer></script>';
  const intro = /(<main id="main">)<div class="wrap">(<header class="page-head">)([\s\S]*?)(<dl class="meta-grid">[\s\S]*?<\/dl>)(<div class="links project-links">[\s\S]*?)<\/header>/;
  if (!intro.test(html)) {
    throw new Error('게임랩 소개·본문 경계를 찾을 수 없습니다.');
  }
  return html.replace('</head>', resources + '</head>')
    .replace('<body', '<body data-gamelab-background-page')
    .replace(intro, (_, main, start, copy, metadata, links) => main + start
      + '<div class="gamelab-intro" data-gamelab-intro>' + backdrop
      + '<div class="wrap gamelab-intro-copy">' + copy + control + '</div>'
      + '<div class="gamelab-intro-details"><div class="wrap">' + metadata + '</div></div>'
      + '</div><div class="wrap">' + links + '</div></header><div class="wrap">');
}

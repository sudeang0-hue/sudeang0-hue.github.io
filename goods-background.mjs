import fs from 'node:fs';
import { checkedAssetPath, escapeHtml } from './security.mjs';

// 굿즈 소개만 꾸며 공통 디자인과 본문의 사진 슬라이드를 분리합니다.
export function withGoodsBackground(html, assetURL) {
  const settings = JSON.parse(fs.readFileSync(new URL('./goods-background.json', import.meta.url), 'utf8'));
  const { intervalMs, fadeMs, photos } = settings;
  if (!Number.isInteger(intervalMs) || intervalMs < 4000 || intervalMs > 10000
    || !Number.isInteger(fadeMs) || fadeMs < 400 || fadeMs > 2000
    || !Array.isArray(photos) || photos.length < 6 || photos.length > 10) {
    throw new Error('굿즈 배경은 사진 6~10장과 표시·전환 시간 설정이 필요합니다.');
  }
  const ids = new Set();
  const sources = new Set();
  const items = photos.map(photo => {
    const position = typeof photo?.position === 'string'
      ? /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/.exec(photo.position) : null;
    if (!photo || !/^[a-z0-9][a-z0-9-]*$/i.test(photo.id) || ids.has(photo.id)
      || typeof photo.file !== 'string' || !/^assets\/goods-background-\d{2}\.webp$/.test(photo.file)
      || sources.has(photo.file) || !position || Number(position[1]) > 100 || Number(position[2]) > 100
      || typeof photo.label !== 'string' || !photo.label.trim()
      || !Number.isInteger(photo.width) || photo.width < 1 || photo.width > 10000
      || !Number.isInteger(photo.height) || photo.height < 1 || photo.height > 10000) {
      throw new Error('굿즈 배경 사진의 식별자·파일·위치·설명을 확인하세요.');
    }
    checkedAssetPath(photo.file.slice('assets/'.length));
    ids.add(photo.id);
    sources.add(photo.file);
    return { id: photo.id, src: assetURL(photo.file), position: photo.position, label: photo.label,
      width: photo.width, height: photo.height };
  });
  const asset = file => escapeHtml(assetURL(file));
  const backdrop = '<div id="goods-background-stage" class="goods-background" data-goods-background aria-hidden="true"'
    + ' data-interval-ms="' + intervalMs + '" data-fade-ms="' + fadeMs + '"'
    + ' data-photos="' + escapeHtml(JSON.stringify(items)) + '">'
    + '<img class="goods-background-photo" data-goods-background-layer src="' + escapeHtml(items[0].src)
    + '" width="' + items[0].width + '" height="' + items[0].height
    + '" alt="" decoding="async" fetchpriority="high" style="object-position:' + escapeHtml(items[0].position) + '">'
    + '<img class="goods-background-photo" data-goods-background-layer alt="" decoding="async"></div>';
  const control = '<button type="button" class="goods-background-toggle" data-goods-background-toggle aria-controls="goods-background-stage"'
    + ' aria-label="배경 사진 자동 넘김 재생" title="배경 사진 자동 넘김 재생" hidden>'
    + '<span aria-hidden="true" data-goods-background-icon>▶</span></button>';
  const resources = '<link rel="stylesheet" href="' + asset('goods-background.css') + '">'
    + '<script src="' + asset('goods-background.js') + '" defer></script>';
  const intro = /(<main id="main">)<div class="wrap">(<header class="category-head goods-head" id="goods-top" tabindex="-1">)([\s\S]*?)<\/header>/;
  if (!intro.test(html)) throw new Error('굿즈 소개·대표 사례의 경계를 찾을 수 없습니다.');
  return html.replace('</head>', resources + '</head>')
    .replace('<body', '<body data-goods-background-page')
    .replace(intro, (_, main, start, copy) => main
      + '<div class="goods-background-intro" data-goods-background-intro>' + backdrop
      + '<div class="wrap">' + start + '<div class="goods-background-copy">' + copy + '</div>'
      + control + '</header></div></div><div class="wrap">');
}

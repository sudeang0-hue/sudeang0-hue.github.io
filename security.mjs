// 정적 사이트에서 사용할 리소스와 HTML 출력 경계를 한곳에서 관리합니다.
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  // 기존 카드·슬라이드의 style 속성은 유지하고 외부 스타일은 차단합니다.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "media-src 'self'",
  "font-src 'self'",
  "frame-src https://embed.figma.com https://www.figma.com",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function checkedExternalURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('외부 링크는 인증 정보가 없는 HTTPS 주소여야 합니다.');
  }
  return url.href;
}

export function checkedAssetPath(value) {
  const file = String(value);
  if (!/^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)*\.(?:png|jpe?g|webp|svg)$/i.test(file)) {
    throw new Error('이미지는 assets 내부의 안전한 상대 파일명이어야 합니다.');
  }
  return file;
}

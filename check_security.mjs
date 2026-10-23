import assert from 'node:assert/strict';
import { checkedExternalURL, checkedAssetPath, escapeHtml } from './security.mjs';

assert.equal(escapeHtml('<img src=x onerror="x"> & \'test\''), '&lt;img src=x onerror=&quot;x&quot;&gt; &amp; &#39;test&#39;');
for (const value of ['javascript:alert(1)', 'data:text/html,x', 'http://example.com', 'https://name:password@example.com/', '//example.com']) {
  assert.throws(() => checkedExternalURL(value), value);
}
assert.equal(checkedExternalURL('https://www.figma.com/proto/file?x=1&y=2'), 'https://www.figma.com/proto/file?x=1&y=2');
for (const value of ['../private.png', 'https://example.com/a.png', 'a.jpg" onerror="x', 'a.png?x=1', '/a.png', 'a//b.png']) {
  assert.throws(() => checkedAssetPath(value), value);
}
assert.equal(checkedAssetPath('goods-i007.jpg'), 'goods-i007.jpg');
assert.equal(checkedAssetPath('icons/github.svg'), 'icons/github.svg');
console.log('HTML 이스케이프·HTTPS 링크·로컬 이미지 경계 검사 통과');

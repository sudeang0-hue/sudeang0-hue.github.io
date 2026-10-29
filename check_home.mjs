import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { homeChapters } from './home.mjs';

const dist = path.join(import.meta.dirname, 'dist');
const mediaFiles = new Set();
const requireFile = (root, file, label) => {
  assert.equal(typeof file, 'string', `${label}: 파일 경로가 필요합니다.`);
  const target = path.resolve(root, file);
  assert.ok(target.startsWith(path.resolve(root) + path.sep), `${label}: 지정 폴더 안의 파일이어야 합니다.`);
  assert.ok(fs.existsSync(target) && fs.statSync(target).isFile(), `${label}: 파일을 찾을 수 없습니다 (${file})`);
};

assert.equal(homeChapters.length, 4, '대표 배경은 4개 챕터여야 합니다.');
homeChapters.forEach((chapter, index) => {
  const label = `${index + 1}번 챕터`;
  assert.match(chapter.href, /^[a-z0-9-]+\.html$/, `${label}: 상세 연결은 기존 로컬 HTML 경로여야 합니다.`);
  requireFile(dist, chapter.href, `${label} 상세 페이지`);

  // 두 영상과 두 이미지 세트가 같은 길이로 순환하는 구성을 검증합니다.
  assert.equal(chapter.scenes.length, index < 2 ? 1 : 5, `${label}: 장면 개수를 확인하세요.`);
  assert.equal(chapter.scenes.reduce((sum, scene) => sum + scene.duration, 0), 10000, `${label}: 총 재생 시간은 10초여야 합니다.`);
  chapter.scenes.forEach((scene, sceneIndex) => {
    const sceneLabel = `${label} ${sceneIndex + 1}번 장면`;
    assert.equal(scene.duration, index < 2 ? 10000 : 2000, `${sceneLabel}: 재생 간격을 확인하세요.`);
    assert.equal(typeof scene.image, 'string', `${sceneLabel}: 대표 이미지가 필요합니다.`);
    if (index < 2) {
      assert.equal(typeof scene.video, 'string', `${sceneLabel}: 동영상이 필요합니다.`);
      assert.equal(typeof scene.mobile, 'string', `${sceneLabel}: 모바일 동영상이 필요합니다.`);
    } else {
      assert.ok(!scene.video && !scene.mobile, `${sceneLabel}: 이미지 세트에는 동영상 대신 이미지를 사용합니다.`);
    }
    for (const field of ['image', 'video', 'mobile']) {
      if (scene[field] === undefined) continue;
      requireFile(path.join(dist, 'assets'), scene[field], `${sceneLabel} ${field}`);
      mediaFiles.add(scene[field]);
    }
  });
});

console.log(`홈 4개 챕터·이미지 2초 전환·챕터별 10초·미디어 ${mediaFiles.size}개·상세 경로 검사 통과`);

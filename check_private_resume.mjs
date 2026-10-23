import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { tryGeneratePrivateResume } from './generate-private-resume.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-private-resume-check-'));
const repository = path.join(temporary, 'fixture-site');
const output = path.join(temporary, 'private-output');
const privateFile = path.join(temporary, 'private.json');
const configFile = path.join(repository, '.private-resume', 'config.json');
const phone = ['010', '0000', '0000'].join('-');
const birthDate = ['2000', '01', '01'].join('.');
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks += 1; }
function rejected(action, message) { assert.throws(action, message); checks += 1; }
function setConfig(outputDirectory = output, privateDataPath = privateFile) {
  fs.writeFileSync(configFile, JSON.stringify({ privateDataPath, outputDirectory }));
}
function source(text = '공통 이력서 원문', href = 'gamelab.html') {
  return '<html><head></head><body><header class="site-header">공개 메뉴</header><main id="main"><div class="wrap"><header class="resume-head"><h1>게임 개발자</h1><div class="resume-contact"><p>공개 이메일</p><button data-print>인쇄</button></div></header><section class="resume-section"><h2>소개</h2><p>' + text + '</p><a href="' + href + '">프로젝트</a><img src="assets/icons/github.svg" alt="GitHub"></section></div></main><footer>공개 하단</footer></body></html>';
}
try {
  fs.mkdirSync(path.join(repository, 'dist/assets/icons'), { recursive: true });
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(path.join(repository, 'dist/resume.html'), source());
  fs.writeFileSync(path.join(repository, 'dist/styles.css'), 'body{color:#222}');
  fs.writeFileSync(path.join(repository, 'dist/assets/icons/github.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  fs.writeFileSync(path.join(repository, 'dist/assets/unused.png'), 'unused-fixture');
  check(tryGeneratePrivateResume({ repositoryRoot: repository }).generated === false, '설정 없는 공개 빌드');
  fs.writeFileSync(privateFile, JSON.stringify({ phone, birthDate }));
  setConfig();
  const initial = fs.readFileSync(path.join(repository, 'dist/resume.html'), 'utf8');
  const first = tryGeneratePrivateResume({ repositoryRoot: repository });
  let html = fs.readFileSync(first.outputFile, 'utf8');
  check(html.includes(phone) && html.includes(birthDate), '개인 정보는 로컬 출력에만 표시');
  check(!html.includes('공개 메뉴') && !html.includes('공개 하단'), '공통 메뉴·하단 제외');
  check(html.includes('src="print.js"') && !html.includes('data-print>'), '인쇄용 스크립트만 사용');
  check(html.includes('href="https://sudeang0-hue.github.io/gamelab.html"'), '공개 링크 유지');
  check(fs.existsSync(path.join(output, 'assets/icons/github.svg')) && !fs.existsSync(path.join(output, 'assets/unused.png')), '참조 자산만 복사');
  check(fs.readFileSync(path.join(repository, 'dist/resume.html'), 'utf8') === initial, '공개 본문 불변');
  const record = JSON.parse(fs.readFileSync(path.join(output, 'generation.json'), 'utf8'));
  check(record.publicDistUnchanged && !JSON.stringify(record).includes(phone), '생성 기록에 개인 값 없음');
  fs.writeFileSync(path.join(repository, 'dist/resume.html'), source('갱신한 공통 본문'));
  const second = tryGeneratePrivateResume({ repositoryRoot: repository });
  html = fs.readFileSync(second.outputFile, 'utf8');
  check(html.includes('갱신한 공통 본문') && first.record.sourceSHA256 !== second.record.sourceSHA256, '공개 원문 변경 자동 반영');
  fs.writeFileSync(privateFile, JSON.stringify({ phone: '<img src=x onerror="x">', birthDate }));
  const escaped = tryGeneratePrivateResume({ repositoryRoot: repository });
  html = fs.readFileSync(escaped.outputFile, 'utf8');
  check(html.includes('&lt;img src=x onerror=&quot;x&quot;&gt;') && !html.includes('<img src=x'), '개인 값 HTML 이스케이프');
  fs.writeFileSync(privateFile, JSON.stringify({ phone, birthDate }));
  for (const subdirectory of ['', 'dist', '.git', 'nested/private']) {
    setConfig(path.join(repository, subdirectory));
    rejected(() => tryGeneratePrivateResume({ repositoryRoot: repository }), '저장소 내부 출력 차단');
  }
  fs.writeFileSync(path.join(repository, 'private.json'), JSON.stringify({ phone, birthDate }));
  setConfig(output, path.join(repository, 'private.json'));
  rejected(() => tryGeneratePrivateResume({ repositoryRoot: repository }), '저장소 내부 개인 원문 차단');
  setConfig();
  fs.writeFileSync(path.join(repository, 'dist/resume.html'), source(phone));
  rejected(() => tryGeneratePrivateResume({ repositoryRoot: repository }), '공개 원문 개인 값 탐지');
  fs.writeFileSync(path.join(repository, 'dist/resume.html'), source('소개', 'javascript:alert(1)'));
  rejected(() => tryGeneratePrivateResume({ repositoryRoot: repository }), '위험 링크 차단');
  fs.writeFileSync(path.join(repository, 'dist/resume.html'), source());
  const junction = path.join(temporary, 'site-junction');
  try {
    fs.symlinkSync(repository, junction, process.platform === 'win32' ? 'junction' : 'dir');
    setConfig(path.join(junction, 'private-output'));
    rejected(() => tryGeneratePrivateResume({ repositoryRoot: repository }), '연결 경로 우회 차단');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    console.log('연결 경로 검사는 OS 권한 제한으로 미실시');
  }
  console.log('개인용 생성·공통 원문 갱신·누출 방지 검사 통과: ' + checks + '개');
} finally {
  const parent = fs.realpathSync(os.tmpdir());
  const actual = fs.realpathSync(temporary);
  if (path.dirname(actual).toLowerCase() !== parent.toLowerCase() || !path.basename(actual).startsWith('portfolio-private-resume-check-')) {
    throw new Error('임시 검사 폴더 정리 경계를 확인하세요.');
  }
  fs.rmSync(actual, { recursive: true, force: true });
}

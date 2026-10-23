import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { escapeHtml, checkedExternalURL, checkedAssetPath } from './security.mjs';

const defaultRoot = path.dirname(fileURLToPath(import.meta.url));
const outputName = '최희수_개인용_이력서.html';
const hash = value => createHash('sha256').update(value).digest('hex');
const readJSON = file => {
  if (fs.statSync(file).size > 65536) throw new Error('개인용 설정 파일의 크기를 확인하세요.');
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('개인용 JSON 파일 형식을 확인하세요.'); }
};

// 존재하지 않는 출력 경로도 실제 상위 폴더를 따라 확인해 junction 우회를 막습니다.
function resolvedDestination(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('개인용 경로는 절대 경로여야 합니다.');
  const absolute = path.resolve(value);
  const missing = [];
  let current = absolute;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('개인용 경로의 상위 폴더를 확인하세요.');
    missing.unshift(path.basename(current));
    current = parent;
  }
  return path.join(fs.realpathSync(current), ...missing);
}

function outsideRepository(value, repository) {
  const target = resolvedDestination(value);
  const root = fs.realpathSync(repository);
  const normalized = text => process.platform === 'win32' ? text.toLowerCase() : text;
  const relative = path.relative(normalized(root), normalized(target));
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('개인용 자료와 출력은 저장소 밖에 두어야 합니다.');
  }
  return target;
}

function publicSnapshot(directory) {
  const files = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('공개 배포 폴더의 연결 파일을 확인하세요.');
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files[path.relative(directory, file)] = hash(fs.readFileSync(file));
    }
  }
  walk(directory);
  return files;
}

function assertPrivateValuesAbsent(directory, fields) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) assertPrivateValuesAbsent(file, fields);
    else if (/\.(?:html|js|css|json|txt|svg)$/i.test(entry.name)) {
      const text = fs.readFileSync(file, 'utf8');
      if (fields.some(value => text.includes(value) || text.includes(escapeHtml(value)))) {
        throw new Error('공개 배포 폴더에서 개인용 정보가 발견됐습니다. 공개하지 말고 확인하세요.');
      }
    }
  }
}

const privateCSS = `
html{scroll-padding-top:0}body{background:#f6f5f1}.wrap{width:min(1000px,calc(100% - 48px))}
.private-toolbar{width:min(1000px,calc(100% - 48px));margin:24px auto 0;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 18px;border:1px solid var(--line);background:var(--wash)}
.private-toolbar p{font-size:12px;margin:0}.private-toolbar button{white-space:nowrap}.private-contact{margin:0 0 14px;display:grid;grid-template-columns:max-content 1fr;gap:4px 18px;font-size:14px}.private-contact dt{color:var(--muted)}.private-contact dd{margin:0}.resume-head{padding-top:30px}.resume-section:last-child{margin-bottom:40px}
@media(max-width:640px){.private-toolbar{align-items:flex-start;flex-direction:column;gap:10px}.private-contact{margin-top:22px}.resume-head{padding-top:25px}}
@media print{
 @page{size:A4;margin:14mm 15mm}
 html,body{background:#fff;color:#252b27;font-size:10pt;line-height:1.55;overflow:visible}
 .private-toolbar,.no-print,.resume-contact .links,.resume-section.no-print{display:none!important}
 .wrap{width:100%;max-width:none;margin:0}
 .resume-head{display:grid;grid-template-columns:1.25fr 1fr;gap:24px;align-items:start;padding:0 0 15px;break-inside:avoid}
 .resume-head h1{font-size:23pt}.resume-head p{font-size:10pt}.private-contact{font-size:10pt;margin:0 0 10px}
 .resume-section{display:grid;grid-template-columns:100px minmax(0,1fr);gap:22px;padding:16px 0;break-inside:auto!important}
 .resume-section>h2{font-size:12pt;margin:0}.resume-item{margin-bottom:18px;break-inside:avoid-page}
 .resume-item header{display:flex;gap:14px}.resume-item h3{font-size:11pt}.resume-item time,.cert-list small{font-size:8.5pt;white-space:nowrap}
 .resume-item p,.resume-item li,.resume-note p,.resume-skills p,.cert-list li{font-size:9.5pt;line-height:1.55}
 .resume-skills{grid-template-columns:1fr 1fr;gap:15px 22px}.resume-skills h3{font-size:10pt}.cert-list li{padding:6px 0}
 h2,h3{break-after:avoid-page}p,li{orphans:2;widows:2}.resume-section:last-child{margin-bottom:0}
}
`;

export function tryGeneratePrivateResume({ repositoryRoot = defaultRoot, configPath } = {}) {
  const repository = fs.realpathSync(repositoryRoot);
  const configFile = configPath || path.join(repository, '.private-resume', 'config.json');
  if (!fs.existsSync(configFile)) return { generated: false, reason: 'no-local-config' };
  const config = readJSON(configFile);
  if (Object.keys(config).some(key => !['privateDataPath', 'outputDirectory'].includes(key))) {
    throw new Error('개인용 설정에는 자료 경로와 출력 폴더만 지정하세요.');
  }
  const dataFile = outsideRepository(config.privateDataPath, repository);
  const destination = outsideRepository(config.outputDirectory, repository);
  if (path.extname(dataFile).toLowerCase() !== '.json' || !fs.statSync(dataFile).isFile()) throw new Error('개인용 JSON 자료를 확인하세요.');
  const data = readJSON(dataFile);
  if (Object.keys(data).some(key => !['phone', 'birthDate'].includes(key))) throw new Error('개인용 자료의 항목을 확인하세요.');
  const rows = [['phone', '전화번호'], ['birthDate', '생년월일']].map(([key, label]) => {
    if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > 80) throw new Error('개인용 연락처 항목을 확인하세요.');
    return { label, value: data[key].trim() };
  });
  const publicDirectory = path.join(repository, 'dist');
  const stylesheet = fs.readFileSync(path.join(publicDirectory, 'styles.css'), 'utf8');
  const before = publicSnapshot(publicDirectory);
  assertPrivateValuesAbsent(publicDirectory, rows.map(row => row.value));
  const sourceFile = path.join(publicDirectory, 'resume.html');
  const source = fs.readFileSync(sourceFile, 'utf8');
  const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) throw new Error('공개 이력서의 main 본문을 확인하세요.');
  let body = main[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '');
  if (!body.includes('<div class="resume-contact">')) throw new Error('공개 이력서의 연락처 위치를 확인하세요.');
  const privateContact = '<dl class="private-contact" aria-label="개인용 연락처">' + rows.map(row => '<dt>' + row.label + '</dt><dd>' + escapeHtml(row.value) + '</dd>').join('') + '</dl>';
  body = body.replace('<div class="resume-contact">', '<div class="resume-contact">' + privateContact);
  const assets = new Map();
  for (const match of stylesheet.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
    const resource = match[1];
    if (!/^assets\/[a-z0-9][a-z0-9/_-]*\.(?:png|jpe?g|webp|svg|woff2?|ttf|otf)$/i.test(resource)) {
      throw new Error('스타일의 로컬 자산 참조를 확인하세요.');
    }
    assets.set(resource, path.join(publicDirectory, resource));
  }
  // 링크는 공개 사이트를 기준으로 절대 주소로 바꾸고 외부 프로토콜을 제한합니다.
  body = body.replace(/\b(href|src)="([^"]*)"/g, (match, attribute, raw) => {
    const value = raw.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (attribute === 'src') {
      if (!value.startsWith('assets/')) throw new Error('개인용 문서의 이미지 참조를 확인하세요.');
      const asset = checkedAssetPath(value.slice(7));
      assets.set('assets/' + asset, path.join(publicDirectory, 'assets', asset));
      return 'src="assets/' + asset + '"';
    }
    if (value.startsWith('#')) return 'href="' + escapeHtml(value) + '"';
    if (value.startsWith('mailto:')) {
      if (!/^mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) throw new Error('이메일 링크를 확인하세요.');
      return 'href="' + escapeHtml(value) + '"';
    }
    const url = new URL(value, 'https://sudeang0-hue.github.io/');
    return 'href="' + escapeHtml(checkedExternalURL(url.href)) + '"';
  });
  const localPolicy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";
  const html = '<!doctype html><html lang="ko" data-theme="light"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="' + escapeHtml(localPolicy) + '"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>최희수 개인용 이력서</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="private-resume.css"><script src="print.js" defer></script></head><body><div class="private-toolbar"><p><strong>개인용 이력서 · 출력용</strong><br>전화번호와 생년월일이 포함된 로컬 문서입니다.</p><button type="button" class="btn-quiet" data-private-print>인쇄 / PDF 저장</button></div><main id="main">' + body + '</main></body></html>';
  fs.mkdirSync(destination, { recursive: true });
  // 폴더 생성 뒤에도 실제 경로를 다시 검증합니다.
  outsideRepository(destination, repository);
  function targetFile(relative) {
    const target = outsideRepository(path.join(destination, relative), repository);
    const remainder = path.relative(destination, target);
    if (remainder === '..' || remainder.startsWith('..' + path.sep) || path.isAbsolute(remainder)) {
      throw new Error('출력 폴더 밖을 가리키는 연결 파일을 확인하세요.');
    }
    return target;
  }
  fs.writeFileSync(targetFile(outputName), html);
  fs.writeFileSync(targetFile('styles.css'), stylesheet);
  fs.writeFileSync(targetFile('private-resume.css'), privateCSS);
  fs.writeFileSync(targetFile('print.js'), "document.querySelector('[data-private-print]')?.addEventListener('click',()=>window.print());\n");
  for (const [relative, sourceAsset] of assets) {
    const target = targetFile(relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(sourceAsset, target);
  }
  const after = publicSnapshot(publicDirectory);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('개인용 생성 중 공개 폴더 변경이 감지됐습니다.');
  assertPrivateValuesAbsent(publicDirectory, rows.map(row => row.value));
  const record = { generatedAt: new Date().toISOString(), source: 'dist/resume.html', sourceSHA256: hash(source), stylesheetSHA256: hash(fs.readFileSync(path.join(publicDirectory, 'styles.css'))), publicDistUnchanged: true, outputFile: outputName, copiedAssets: [...assets.keys()] };
  fs.writeFileSync(targetFile('generation.json'), JSON.stringify(record, null, 2));
  return { generated: true, outputFile: path.join(destination, outputName), record };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = tryGeneratePrivateResume();
  console.log(result.generated ? '개인용 이력서 갱신 완료(저장소 밖 로컬 출력)' : '개인용 설정 없음: 공개 페이지만 유지');
}

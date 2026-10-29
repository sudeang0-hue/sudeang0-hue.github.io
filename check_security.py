"""배포될 HTML의 보안 정책과 리소스 경계를 검사한다. 서버 헤더 검사는 별도다."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json, re

ROOT = Path(__file__).parent
EXPECTED_POLICY = {
    'default-src': ["'self'"], 'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'"],
    'media-src': ["'self'"], 'font-src': ["'self'"],
    'frame-src': ['https://embed.figma.com', 'https://www.figma.com'], 'connect-src': ["'none'"],
    'object-src': ["'none'"], 'base-uri': ["'none'"],
    'form-action': ["'none'"], 'upgrade-insecure-requests': [],
}
FRAME_SANDBOX = {'allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-popups-to-escape-sandbox'}

class SecurityDocument(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors, self.policy, self.referrer = [], [], []
        self.in_script = False
        self.inline_script = []
        self.policy_seen = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and a.get('http-equiv', '').lower() == 'content-security-policy':
            self.policy.append(a.get('content', ''))
            self.policy_seen = True
        if tag == 'meta' and a.get('name', '').lower() == 'referrer':
            self.referrer.append(a.get('content'))
        if tag in ('script', 'link', 'iframe') and not self.policy_seen:
            self.errors.append('CSP must precede resource loading')
        if tag == 'script':
            self.in_script = True
            self.inline_script = []
            if not a.get('src') or urlsplit(a['src']).scheme or a['src'].startswith('//'):
                self.errors.append('Scripts must be local files')
        if tag in ('form', 'object', 'embed', 'base'):
            self.errors.append('Unexpected active element: ' + tag)
        for key, value in attrs:
            if key.lower().startswith('on'):
                self.errors.append('Inline event: ' + key)
            if key in ('src', 'href') and value:
                parsed = urlsplit(value)
                if parsed.scheme and parsed.scheme not in ('https', 'mailto'):
                    self.errors.append('Unexpected URL protocol: ' + parsed.scheme)
                if value.startswith('//'):
                    self.errors.append('Protocol-relative URL')
        if tag == 'a' and a.get('target') == '_blank':
            if not {'noopener', 'noreferrer'}.issubset(set(a.get('rel', '').split())):
                self.errors.append('New tab needs noopener noreferrer')
        if tag == 'iframe':
            if a.get('referrerpolicy') != 'no-referrer':
                self.errors.append('Iframe referrer policy')
            if set(a.get('sandbox', '').split()) != FRAME_SANDBOX:
                self.errors.append('Iframe sandbox')
            if a.get('src'):
                parsed = urlsplit(a['src'])
                if parsed.scheme != 'https' or parsed.hostname != 'embed.figma.com':
                    self.errors.append('Unexpected iframe origin')
    def handle_data(self, data):
        if self.in_script:
            self.inline_script.append(data)
    def handle_endtag(self, tag):
        if tag == 'script':
            if ''.join(self.inline_script).strip():
                self.errors.append('Inline script blocked by policy')
            self.in_script = False

results = []
for file in sorted((ROOT / 'dist').glob('*.html')):
    doc = SecurityDocument()
    doc.feed(file.read_text(encoding='utf-8'))
    if len(doc.policy) != 1:
        doc.errors.append('Expected one CSP')
    else:
        directives = [item.strip().split() for item in doc.policy[0].split(';') if item.strip()]
        parsed = {parts[0]: parts[1:] for parts in directives}
        if len(parsed) != len(directives) or parsed != EXPECTED_POLICY:
            doc.errors.append('Unexpected CSP directives')
    if doc.referrer != ['no-referrer']:
        doc.errors.append('Expected no-referrer meta')
    results.append({'page': file.name, 'errors': doc.errors})
work_ids=[work['id'] for work in json.loads((ROOT/'design-content.json').read_text(encoding='utf-8'))['works']]
expected={'index.html','development.html','gamelab.html','tasktown.html','resume.html','planning.html','design.html','history.html'} | {f'webtoon-{work_id}.html' for work_id in work_ids}
assert {row['page'] for row in results} == expected, 'Expected all main and artwork pages'
(ROOT / 'qa').mkdir(exist_ok=True)
(ROOT / 'qa/security-checks.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(results, ensure_ascii=False, indent=2))
assert all(not row['errors'] for row in results), 'Security policy check failed'


# 개인용 연락처와 출력 파일이 공개 산출물에 섞이지 않게 검사합니다.
private_name = re.compile(r'(?:private[-_]?resume|개인용[_ -]*이력서|private\.json|generation\.json)', re.I)
phone = re.compile(r'(?<![\w])01[016789][ -]?\d{3,4}[ -]?\d{4}(?![\w])')
birth_field = re.compile(r'생년월일|출생일|\bbirthDate\b|\bdateOfBirth\b|\bdate_of_birth\b', re.I)
for file in (ROOT / 'dist').rglob('*'):
    if not file.is_file():
        continue
    relative = file.relative_to(ROOT / 'dist').as_posix()
    assert '.private-resume' not in relative and not private_name.search(file.name), 'Private output in public directory'
    if file.suffix.lower() in {'.html', '.js', '.css', '.json', '.txt', '.svg'}:
        source = file.read_text(encoding='utf-8')
        assert not phone.search(source), 'Phone candidate in public directory: ' + relative
        assert not birth_field.search(source), 'Birth-date field in public directory: ' + relative
print('공개 산출물의 개인용 연락처·생년월일·출력 파일 혼입 검사 통과')

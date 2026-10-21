from html.parser import HTMLParser
from pathlib import Path
import json, re
root=Path(__file__).parent/'dist'
class Doc(HTMLParser):
    def __init__(self): super().__init__(); self.refs=[]; self.ids=[]; self.h1=0; self.imgs=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='img':self.imgs.append(a)
        for k in ('src','href','poster'):
            if a.get(k): self.refs.append(a[k])
results=[]
for file in sorted(root.glob('*.html')):
    raw=file.read_text(encoding='utf-8'); doc=Doc();doc.feed(raw); errors=[]
    for ref in doc.refs:
        if re.match(r'^(https?:|mailto:|data:)',ref):continue
        local,_,anchor=ref.partition('#')
        target=root/local if local else file
        if not target.exists():errors.append('Missing '+ref)
        if anchor and target.suffix=='.html':
            targetdoc=Doc();targetdoc.feed(target.read_text(encoding='utf-8'))
            if anchor not in targetdoc.ids:errors.append('Missing anchor '+ref)
    if doc.h1!=1:errors.append('Expected one H1')
    if len(set(doc.ids))!=len(doc.ids):errors.append('Duplicate IDs')
    if any('alt' not in img for img in doc.imgs):errors.append('Missing alt')
    if re.search(r'[CD]:[/\\\\]',raw):errors.append('Local path leaked')
    if 'noindex,nofollow' not in raw:errors.append('Missing search exclusion')
    results.append({'page':file.name,'local_references':len(doc.refs),'errors':errors})
print(json.dumps(results,ensure_ascii=False,indent=2))
(Path(__file__).parent/'qa').mkdir(exist_ok=True)
(Path(__file__).parent/'qa'/'static-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
assert {r['page'] for r in results} == {'index.html','gamelab.html','tasktown.html','resume.html','planning.html','design.html','history.html'}
assert not any(r['errors'] for r in results)



# 공통 메뉴와 연혁의 구분 순서가 모든 페이지에서 유지되는지 확인합니다.
for file in sorted(root.glob('*.html')):
    raw=file.read_text(encoding='utf-8')
    assert 'href="history.html"' in raw, f'Missing history navigation: {file.name}'
history=(root/'history.html').read_text(encoding='utf-8')
assert history.index('id="work"') < history.index('id="education"') < history.index('id="activities"')
assert 'href="history.html" aria-current="page"' in history
assert '게임개발 세부 메뉴' not in history

from html.parser import HTMLParser
from pathlib import Path
import json, re
from urllib.parse import urlsplit
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
        parsed=urlsplit(ref)
        local,anchor=parsed.path,parsed.fragment
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
base_pages={'index.html','gamelab.html','tasktown.html','resume.html','planning.html','design.html','history.html'}
work_ids=[work['id'] for work in json.loads((root.parent/'design-content.json').read_text(encoding='utf-8'))['works']]
reader_pages={f'webtoon-{work_id}.html' for work_id in work_ids}
assert {r['page'] for r in results} == base_pages | reader_pages
design=(root/'design.html').read_text(encoding='utf-8')
assert 'public-gallery' not in design and 'data-zoom' not in design
for work_id in work_ids:
    filename=f'webtoon-{work_id}.html'
    assert f'href="{filename}"' in design
    reader=(root/filename).read_text(encoding='utf-8')
    assert f'data-reader-work="{work_id}"' in reader
    assert f'href="design.html#public-{work_id}"' in reader
    assert 'data-zoom' not in reader and '<div class="webtoon-pages">' in reader
assert not any(r['errors'] for r in results)



# 공통 메뉴와 연혁의 구분 순서가 모든 페이지에서 유지되는지 확인합니다.
for file in sorted(root.glob('*.html')):
    raw=file.read_text(encoding='utf-8')
    assert 'href="history.html"' in raw, f'Missing history navigation: {file.name}'
history=(root/'history.html').read_text(encoding='utf-8')
assert history.index('id="education"') < history.index('id="activities"') < history.index('id="work"')
assert 'data-history-select="education" aria-controls="education" aria-pressed="true"' in history
assert 'href="history.html" aria-current="page"' in history
assert '게임개발 세부 메뉴' not in history

assert 'src="history-carousel.js"' in history
assert history.count('data-history-select=') == 3
assert 'data-history-carousel' in history and 'class="history-track"' in history
assert 'history-side' not in history

# 자격 6개가 학교 항목 위에 표시되는지 확인합니다.
assert '교육 및 자격' in history
assert history.count('data-history-type="certificate"') == 6
school_index=history.index('id="history-hangang-school"')
for cert_id in ('cert-computer-graphics','cert-itq-excel','cert-itq-powerpoint','cert-itq-hangul','cert-gtq-illustrator','cert-gtq-photoshop'):
    assert history.index(f'id="history-{cert_id}"') < school_index

# 굿즈 목차는 상단 하위 메뉴 한 곳에서 각 본문 영역으로 연결합니다.
goods=(root/'planning.html').read_text(encoding='utf-8')
assert 'class="category-subnav goods-subnav wrap"' in goods
assert 'aria-label="굿즈 기획·제작 세부 메뉴"' in goods
assert 'aria-label="굿즈 사례 목차"' not in goods
for section_id in ('goods-planning','goods-illustration','goods-production','goods-sales','goods-reflection','goods-events'):
    assert f'href="#{section_id}"' in goods and f'id="{section_id}"' in goods

# 게임 사례 목차는 프로젝트 메뉴에서 펼칠 수 있는 한 개의 패널로 유지합니다.
for file_name, label, anchors in (
    ('gamelab.html','게임랩',('flow','redesign','hud','result','ai')),
    ('tasktown.html','TaskTown',('scene','tutorial','sound','collaboration')),
):
    page=(root/file_name).read_text(encoding='utf-8')
    header=page.split('<main id="main">',1)[0]
    assert 'aria-label="게임개발 세부 메뉴"' in header
    assert 'class="category-subnav case-subnav wrap"' in header
    assert page.count(f'aria-label="{label} 사례 목차"')==1
    assert f'aria-label="{label} 사례 목차"' in header
    for anchor in anchors:
        assert f'href="#{anchor}"' in header and f'id="{anchor}"' in page

    assert 'data-case-navigation' in header and 'data-case-toggle' in header
    assert 'aria-controls="game-case-menu"' in header and 'id="game-case-menu"' in header
    assert 'aria-expanded="false"' in header

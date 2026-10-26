import { tryGeneratePrivateResume } from './generate-private-resume.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { renderHistory } from './history.mjs';
import { renderDesignPortfolio, designSections } from './design.mjs';
import { publicReaderPath, renderPublicReader } from './public-reader.mjs';
import { renderAIWorkflow } from './gamelab-ai.mjs';
import { withGamelabBackground } from './gamelab-background.mjs';
import { withTasktownBackground } from './tasktown-background.mjs';
import { withGoodsBackground } from './goods-background.mjs';
import { contentSecurityPolicy, escapeHtml, checkedExternalURL, checkedAssetPath } from './security.mjs';
const out=path.join(import.meta.dirname,'dist');
// 변경된 공통 파일을 이전 캐시와 구분합니다.
const assetURL=file=>file+'?v='+createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex').slice(0,12);

const notion={main:'https://app.notion.com/p/5108337d16328272a5ea8175a56bbb89',intro:'https://app.notion.com/p/3948337d163280b198b5e08dfede269f',game:'https://app.notion.com/p/3f98337d163280e1b8faf226e7e62f92',task:'https://app.notion.com/p/3c98337d163281f8afbbec96f80933b9'};
const ghGame='https://github.com/OZ-GAME-LAB/OZGL2_1';
const ghTask='https://github.com/sudeang0-hue/NookDuck_TaskTown';
const profileIntro='Figma로 화면 흐름과 정보 배치를 설계하고, C#·Unity로 UI와 게임 기능을 연결합니다. 게임 프로젝트와 웹툰·일러스트 제작 경험을 바탕으로 화면의 기능과 시각 표현을 함께 다듬습니다.';
const projectLinks=JSON.parse(fs.readFileSync(new URL('./project-links.json',import.meta.url),'utf8'));
const brandFor=href=>{
 const host=new URL(href).hostname;
 return host==='github.com'?'github':host==='app.notion.com'||host==='www.notion.so'||host.endsWith('.notion.site')?'notion':host==='store.steampowered.com'?'steam':host==='store.onstove.com'?'stove':null;
};
const brandIcon=brand=>brand?'<img class="link-icon brand-mono" src="assets/icons/'+brand+'.svg" width="18" height="18" alt="" aria-hidden="true">':'';
const ext=(href,text,cls='text-link')=>{
 const url=checkedExternalURL(href);
 return '<a class="'+escapeHtml(cls)+' external-link" href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+brandIcon(brandFor(url))+'<span>'+escapeHtml(text)+'</span><span class="external-arrow" aria-hidden="true">↗</span></a>';
};
const storeLink=(project,platform)=>{
 const href=projectLinks[project]?.[platform];
 if(typeof href!=='string') throw new Error('Missing store link setting: '+project+'.'+platform);
 const label=platform==='steam'?'Steam':'STOVE';
 if(!href.trim()) return '<span class="text-link store-link is-pending" role="link" aria-disabled="true" aria-label="'+label+' 상점 링크 준비 중">'+brandIcon(platform)+'<span>'+label+'</span><small>준비 중</small></span>';
 const url=new URL(href);
 if(url.protocol!=='https:'||url.hostname!==(platform==='steam'?'store.steampowered.com':'store.onstove.com')) throw new Error('Use the official HTTPS store URL: '+project+'.'+platform);
 return ext(url.href,label,'text-link store-link');
};
const projectActions=(project,portfolio,code,codeLabel='GitHub')=>'<div class="links project-links">'+storeLink(project,'steam')+storeLink(project,'stove')+ext(portfolio,'전체 포트폴리오')+ext(code,codeLabel)+'</div>';
const zoom=(file,alt,caption='',className='',captionPrefixHtml='')=>'<figure class="media '+escapeHtml(className)+'"><button class="zoom-trigger" type="button" data-zoom data-caption="'+escapeHtml(alt)+'" aria-label="'+escapeHtml(alt)+' 크게 보기"><img src="assets/'+checkedAssetPath(file)+'" alt="'+escapeHtml(alt)+'" loading="lazy" decoding="async"></button><figcaption>'+captionPrefixHtml+escapeHtml(caption)+' <span class="zoom-hint">이미지 확대 ↗</span></figcaption></figure>';
const mini=(file,alt,label)=>'<figure><span class="figure-tag">'+escapeHtml(label)+'</span><button class="zoom-trigger" type="button" data-zoom aria-label="'+escapeHtml(alt)+' 크게 보기"><img src="assets/'+checkedAssetPath(file)+'" alt="'+escapeHtml(alt)+'" loading="lazy"></button></figure>';
const section=(id,num,label,body)=>'<section class="case" id="'+id+'"><div class="case-label"><span class="num">'+num+'</span><h2>'+label+'</h2></div><div class="case-body">'+body+'</div></section>';
const evidence=(links)=>'<div class="evidence">'+links.map(([url,text])=>ext(url,text,'')).join('')+'</div>';
const footer='<section class="contact wrap"><div><h2>함께 만들 게임의 이야기를 기다립니다.</h2><p>최희수 · Portfolio</p></div><div class="links"><a class="text-link" href="mailto:sudeang_@naver.com">이메일 <span aria-hidden="true">↗</span></a>'+ext('https://github.com/sudeang0-hue','GitHub')+'</div></section><footer class="site-footer"><div class="wrap"><p>© 2026 최희수 · Portfolio</p><p>내용 기준 2026.10.26</p></div></footer>';
const dialog='<dialog class="modal" id="image-dialog" aria-label="확대 이미지 보기"><div class="modal-bar"><span data-image-caption></span><div class="modal-actions"><button type="button" data-original aria-pressed="false">원본 크기</button><button type="button" class="modal-close" aria-label="확대 이미지 닫기">닫기 ×</button></div></div><div class="modal-image-wrap" tabindex="0" aria-label="확대 이미지를 좌우와 위아래로 이동"><img alt=""></div></dialog>';
const gameCaseMenus={"gamelab.html": "<a href=\"#flow\">01 Figma UI 흐름 설계</a><a href=\"#redesign\">02 UI 리디자인</a><a href=\"#hud\">03 HUD 연동·오류 해결</a><a href=\"#result\">04 결과·성장 연출</a><a href=\"#ai\">05 AI 활용·자동화</a>", "tasktown.html": "<a href=\"#scene\">01 씬 전환</a><a href=\"#tutorial\">02 튜토리얼 상태 관리</a><a href=\"#sound\">03 사운드·BGM</a><a href=\"#collaboration\">04 팀 기능 통합·협업</a>"};
function shell(page,title,description,body,readerWork=null){
 const nav=[['index.html','게임 개발'],['design.html','디자인 및 홍보'],['planning.html','굿즈 기획·제작'],['history.html','연혁']];
 const category=readerWork?'design.html':['planning.html','design.html','history.html'].includes(page)?page:'index.html';
 const hasCaseMenu=Boolean(gameCaseMenus[page]);
 const caseLabel=page==='gamelab.html'?'게임랩':'TaskTown';
 const caseToggle=hasCaseMenu?'<button type="button" class="case-menu-toggle" data-case-toggle aria-expanded="false" aria-controls="game-case-menu" aria-label="'+caseLabel+' 사례 목차 열기" hidden><span><span class="case-menu-label-wide">사례 </span>목차</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>':'';
 const sectionNav=readerWork?'<nav class="webtoon-toolbar wrap" aria-label="작품 읽기 메뉴"><a href="design.html#public-'+escapeHtml(readerWork.id)+'">← 작품 목록</a><span>'+escapeHtml(readerWork.title)+'</span><a href="#reader-top">맨 위로 ↑</a></nav>':category==='index.html'?'<div class="category-subnav '+(hasCaseMenu?'project-subnav ':'')+'wrap"><nav aria-label="게임개발 세부 메뉴">'+[['index.html','전체 프로젝트'],['gamelab.html','게임랩'],['tasktown.html','TaskTown'],['resume.html','이력서']].map(([href,text])=>'<a href="'+href+'"'+(href===page?' aria-current="page"':'')+'>'+text+'</a>').join('')+'</nav>'+caseToggle+'</div>':category==='planning.html'?'<div class="category-subnav goods-subnav wrap"><nav aria-label="굿즈 기획·제작 세부 메뉴">'+goods.stages.map(stage=>'<a href="#'+escapeHtml(stage.id)+'">'+escapeHtml(stage.number)+' '+escapeHtml(stage.title)+'</a>').join('')+'<a href="#goods-events">참가 활동</a></nav></div>':category==='design.html'?'<div class="category-subnav design-subnav wrap"><nav aria-label="디자인 및 홍보 세부 메뉴">'+designSections.map(([id,label],index)=>'<a href="#'+id+'"'+(index===0?' aria-current="location"':'')+'>'+label+'</a>').join('')+'</nav></div>':'';
 const caseNav=hasCaseMenu?'<div class="category-subnav case-subnav wrap" id="game-case-menu" data-case-panel><nav aria-label="'+caseLabel+' 사례 목차">'+gameCaseMenus[page]+'</nav></div>':'';
 const gameNavigation=hasCaseMenu?'<div class="game-case-navigation" data-case-navigation>'+sectionNav+caseNav+'</div>':sectionNav;
 return '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="'+escapeHtml(contentSecurityPolicy)+'"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f6f5f1"><title>'+escapeHtml(title)+' · 최희수</title><meta name="description" content="'+escapeHtml(description)+'"><link rel="icon" href="favicon.svg" type="image/svg+xml"><script src="theme.js"></script><link rel="stylesheet" href="'+assetURL('styles.css')+'"><script src="'+assetURL('app.js')+'" defer></script>'+ (page==='design.html'?'<link rel="stylesheet" href="'+assetURL('illustration.css')+'"><link rel="stylesheet" href="'+assetURL('graphic-design.css')+'">':'')+'</head><body><a class="skip" href="#main">본문으로 건너뛰기</a><header class="site-header"><div class="nav wrap"><a class="brand" href="index.html">최희수<span>PORTFOLIO</span></a><nav aria-label="주요 메뉴">'+nav.map(([href,text])=>'<a href="'+href+'"'+(href===category?' aria-current="page"':'')+'>'+text+'</a>').join('')+'</nav><button type="button" class="theme-toggle" data-theme-toggle hidden><svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 13.4A8.7 8.7 0 0 1 10.6 3.4 8.7 8.7 0 1 0 20.6 13.4Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button></div>'+gameNavigation+'</header><main id="main">'+body+'</main>'+footer+dialog+'</body></html>';
}
const home='<div class="wrap"><section class="hero"><div><span class="eyebrow">GAME DEVELOPMENT · UI DESIGN</span><h1>화면을 설계하고 게임으로 구현합니다.</h1></div><div class="hero-copy"><p><strong>Unity 개발과 디자인을 연결하는 최희수입니다.</strong></p><p>'+profileIntro+'</p><p class="profile-note">‘메이플스토리’의 코어처럼 기능을 나누고, 링크 스킬처럼 시스템을 연결합니다.</p><div class="links"><a class="text-link" href="resume.html">이력서 보기 <span class="arrow" aria-hidden="true">↗</span></a>'+ext(notion.main,'Notion 원문')+'</div></div></section><div class="section-line"><span>SELECTED WORK / 대표 프로젝트</span><span>2026 · 팀 프로젝트 2선</span></div><section class="work-grid" aria-label="대표 프로젝트"><article><a class="work-image" style="display:block" href="gamelab.html" aria-label="용사때문에 레벨업 프로젝트 보기"><img src="assets/gamelab-portfolio-cover-wide-v2.png" alt="용사때문에 레벨업 · UI / 아트 리소스 — 피드백을 반영한 UI 리디자인부터 실제 게임 연동까지" width="1600" height="690" fetchpriority="high"></a><div class="work-top"><h2><a href="gamelab.html">용사때문에 레벨업</a></h2><a class="arrow" aria-label="게임랩 상세 보기" href="gamelab.html">↗</a></div><p class="work-meta"><span>2026.09 — 10 · 4인 팀</span><span>UI 설계·구현 / 아트 리소스 통합</span></p><p class="work-summary">Figma로 화면 흐름을 설계하고, 가독성 피드백을 반영해 UI를 리디자인했습니다. Unity에서 게임 데이터를 연결하고 HUD의 배치·입력 오류를 수정했습니다.</p><p class="work-tags">Figma UI 설계 &nbsp; / &nbsp; UI 리디자인 &nbsp; / &nbsp; 작업 자동화</p></article><article><a class="work-image" style="display:block" href="tasktown.html" aria-label="TaskTown 프로젝트 보기"><img src="assets/tasktown-portfolio-cover-wide-v2.png" alt="TaskTown · Unity 개발 / 팀 기능 통합 — Windows 데스크톱 게임의 실행 구조와 기능 통합" width="1600" height="690" fetchpriority="high"></a><div class="work-top"><h2><a href="tasktown.html">TaskTown</a></h2><a class="arrow" aria-label="TaskTown 상세 보기" href="tasktown.html">↗</a></div><p class="work-meta"><span>2026.06 — 08 · 5인 팀</span><span>Unity 클라이언트 개발 팀장</span></p><p class="work-summary">클릭·타이핑으로 마을을 키우는 게임의 실행 흐름과 팀 기능 통합을 맡았습니다. 동시 작업을 고려해 수정 범위와 리뷰 항목을 정했습니다.</p><p class="work-tags">실행 흐름 &nbsp; / &nbsp; 팀 기능 통합 &nbsp; / &nbsp; 협업·리뷰</p></article></section><section class="principles"><div><span class="eyebrow">HOW I WORK</span><h2>문제를 정리하고 결과로 확인합니다.</h2></div><div><div class="principle"><span class="num">01</span><h3>판단의 기준</h3><p>팀 피드백을 정보 배치·입력 반응·상태 표시의 문제로 구체화하고, 바꿀 부분과 유지할 동작을 정합니다.</p></div><div class="principle"><span class="num">02</span><h3>연결의 책임</h3><p>팀 기능의 연결 지점을 확인하고, 동시에 진행 중인 작업을 고려해 수정 범위를 정합니다.</p></div><div class="principle"><span class="num">03</span><h3>작업 기준과 자동화</h3><p>수정 범위와 확인 항목을 문서로 정합니다. 반복 제작은 도구로 처리하고, 결과는 실제 화면에서 검토합니다.</p></div></div></section><section class="related-practice" aria-labelledby="related-practice-title"><div><span class="eyebrow">DESIGN EXPERIENCE</span><h2 id="related-practice-title">정보를 구성하고 시각적으로 전달한 경험</h2><p>공공기관 홍보에서는 정보를 대사와 장면으로 구성했고, 굿즈 작업에서는 일러스트를 실물 제작과 판매까지 연결했습니다.</p></div><div class="links"><a class="text-link" href="design.html#public-work">공공기관 홍보 작업 보기 ↗</a><a class="text-link" href="planning.html">굿즈 기획·제작 보기 ↗</a></div></section></div>';
fs.writeFileSync(path.join(out,'index.html'),shell('index.html','게임 개발 · UI 디자인 포트폴리오','최희수의 Unity 개발·UI 디자인 포트폴리오. 화면 설계·구현, 팀 기능 통합과 공공기관 콘텐츠 제작 경험.',home));

const gameHead='<div class="wrap"><header class="page-head"><p class="breadcrumb"><a href="index.html">프로젝트</a> &nbsp;/&nbsp; 01. OZ GAMELAB</p><span class="eyebrow">GAME UI · INTEGRATION · ART RESOURCES</span><h1>용사때문에 레벨업</h1><p class="subtitle">화면 흐름 설계부터 UI 리디자인·Unity 적용까지 맡았습니다.</p><p class="project-intro">유닛 배치·합성으로 용사 웨이브를 막는 그리드 디펜스 로그라이크입니다. 로비·성장·전투 화면에 팀의 게임 데이터를 연결하고, UI 입력 오류와 표시 문제를 수정했습니다.</p><dl class="meta-grid"><div><dt>PERIOD / TEAM</dt><dd>2026.09.02 — 10.14 · 4인</dd></div><div><dt>MY ROLE</dt><dd>UI 설계·구현·연동·연출</dd></div><div><dt>TOOLS</dt><dd>Figma · Unity · C# · uGUI · TMP · DOTween</dd></div></dl>'+projectActions('gamelab',notion.game,ghGame+'/tree/4a102b39733ccf71b7cc05c59eb54ebd7709d975','GitHub')+'</header><figure class="hero-figure"><button type="button" class="zoom-trigger" data-zoom aria-label="게임랩 전투 화면 크게 보기"><img src="assets/gamelab-combat.png" alt="그리드 전장과 스킬 HUD가 연결된 실제 전투 화면" width="1920" height="1080" fetchpriority="high"></button><figcaption>2026.10.14 Unity Play Mode 촬영 · 팀의 전투·성장·스킬 시스템에 UI를 연결한 화면 <span class="zoom-hint">이미지 확대 ↗</span></figcaption></figure>';
const figmaFlowURLs=node=>{
 const params=new URLSearchParams({'node-id':node.replace(':','-'),'starting-point-node-id':node,'scaling':'contain','content-scaling':'fixed','device-frame':'false','hide-ui':'1','show-proto-sidebar':'0'});
 const file='Kz3TNcpjEhLXT7lGoCWinf';
 return {external:'https://www.figma.com/proto/'+file+'?'+params,embed:'https://embed.figma.com/proto/'+file+'?'+params+'&embed-host=sudeang-portfolio'};
};
const figmaLobby=figmaFlowURLs('3:2');
const figmaBattle=figmaFlowURLs('31:8');
const gameFlow=section('flow','01','Figma UI 흐름 설계',`
<h3>화면의 역할과 이동 경로를 Figma로 설계했습니다.</h3>
<p>UI 구현에 앞서 로비·성장 메뉴·전투 준비·결과 화면의 구성과 비율, 필요한 기능을 Figma 프레임으로 정리했습니다. 버튼을 눌렀을 때 화면이 이동하거나 팝업이 열리고, 이전 화면으로 돌아오는 경로는 프로토타입으로 연결했습니다.</p>
<p>이를 팀에 공유해 전체 흐름을 설명하고 피드백을 받았으며, 이후 UI를 제작하고 게임에 적용하는 기준으로 삼았습니다.</p>
${zoom('gamelab-figma-flow-overview.png','Figma 초기 UI 흐름 설계 · 로비·전투 화면 구성과 이동·팝업·복귀 연결','로비·전투 화면의 기능과 이동·복귀 경로를 연결한 초기 Figma 캔버스')}
<div class="facts"><div><h4>로비의 탐색과 복귀</h4><p>특성·스킬 세팅·도감·설정은 로비 위에서 열고 닫는 팝업으로, 전투 준비는 별도 화면으로 이동하도록 구분했습니다.</p></div><div><h4>전투 전후의 정보 구성</h4><p>준비 화면의 전투 진입과 증강·승패 결과의 전환을 정리했습니다. 결과에는 시간·처치 수·배치 수·경험치와 로비 복귀 버튼을 배치했습니다.</p></div></div>

<div class="figma-player" data-figma-player>
<div class="figma-player-bar"><h4>Figma 프로토타입 직접 살펴보기</h4><div class="figma-flow-options" role="group" aria-label="프로토타입 시작 화면" data-figma-controls hidden>
<button type="button" data-figma-flow data-figma-label="로비 흐름" data-figma-src="${figmaLobby.embed.replaceAll('&','&amp;')}" data-figma-href="${figmaLobby.external.replaceAll('&','&amp;')}" aria-pressed="true">로비 흐름</button>
<button type="button" data-figma-flow data-figma-label="전투 흐름" data-figma-src="${figmaBattle.embed.replaceAll('&','&amp;')}" data-figma-href="${figmaBattle.external.replaceAll('&','&amp;')}" aria-pressed="false">전투 흐름</button>
</div></div>
<div class="links figma-player-links"><a class="text-link external-link" data-figma-external href="${figmaLobby.external}" target="_blank" rel="noopener noreferrer">Figma에서 크게 재생 <span aria-hidden="true">↗</span></a>${ext('https://www.figma.com/design/Kz3TNcpjEhLXT7lGoCWinf?node-id=0-1','흐름 설계 원본 보기')}</div>
<div class="figma-player-stage"><div class="figma-player-placeholder" data-figma-placeholder><span class="figma-play-mark" aria-hidden="true">▷</span><p>로비 흐름 프로토타입을 준비하고 있습니다.</p><button type="button" class="btn-quiet" data-figma-load hidden>프로토타입 재생</button><noscript><p>Figma 링크에서 프로토타입을 재생할 수 있습니다.</p></noscript></div>
<iframe data-figma-frame title="게임랩 초기 UI 프로토타입 · 로비 흐름" loading="eager" allow="fullscreen" allowfullscreen tabindex="0" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" hidden></iframe></div>
<div class="figma-player-status"><p data-figma-note>화면 전환을 확인하는 초기 프로토타입으로, 예시 수치와 미정 화면이 포함되어 있습니다. 최종 디자인과 실제 게임 동작은 다음 Unity 구현 사례에서 확인할 수 있습니다. 작은 화면에서는 ‘크게 재생’을 이용해 주세요.</p><button type="button" class="btn-quiet" data-figma-reset hidden>선택한 흐름 처음부터</button></div>
</div>


`)+ '<script src="'+assetURL('figma-prototype.js')+'" defer></script>';
const redesignDetail=(file,alt,label,crop,caption)=>'<figure><span class="figure-tag">'+label+'</span><button class="zoom-trigger redesign-crop redesign-crop--'+crop+'" type="button" data-zoom data-caption="'+alt+' · 전체 캡처" aria-label="'+alt+' 전체 캡처 크게 보기"><img src="assets/'+file+'" alt="'+alt+'" width="1920" height="1080" loading="lazy" decoding="async"></button><figcaption>'+caption+' <span class="zoom-hint">전체 캡처 ↗</span></figcaption></figure>';
const redesignScreens=JSON.parse(fs.readFileSync(new URL('./gamelab-comparison.json',import.meta.url),'utf8')).screens;
if(!Array.isArray(redesignScreens)||!redesignScreens.length||new Set(redesignScreens.map(screen=>screen.id)).size!==redesignScreens.length)throw new Error('리디자인 비교 화면 목록과 중복된 ID를 확인하세요.');
for(const screen of redesignScreens){
 if(!/^[a-z]+$/.test(screen.id)||!screen.title||!screen.note)throw new Error('비교 화면의 이름과 설명을 확인하세요.');
 for(const side of ['before','after'])if(!/^[a-z0-9-]+\.png$/.test(screen[side]?.file)||!screen[side].alt||!screen[side].caption)throw new Error('전후 비교 이미지와 캡션을 확인하세요.');
}
const redesignComparison=()=>{
 const controls='<div class="redesign-screen-controls" data-comparison-controls hidden><div class="redesign-screen-arrows"><button type="button" data-comparison-prev aria-label="이전 전후 비교 화면" aria-controls="redesign-before-screen redesign-after-screen">←</button><button type="button" data-comparison-next aria-label="다음 전후 비교 화면" aria-controls="redesign-before-screen redesign-after-screen">→</button><span data-comparison-count>1 / '+redesignScreens.length+'</span></div></div>';
 const slide=(screen,index,copy=false)=>'<figure class="redesign-screen-slide" data-comparison-source="'+index+'" data-comparison-title="'+escapeHtml(screen.title)+'"'+(copy?' data-comparison-copy hidden':'')+'><button type="button" class="zoom-trigger redesign-screen-frame" data-zoom data-caption="'+escapeHtml(screen.image.alt)+'" aria-label="'+escapeHtml(screen.image.alt)+' 원본 크게 보기"><img src="assets/'+screen.image.file+'" alt="'+escapeHtml(screen.image.alt)+'" width="1920" height="1080" loading="lazy" decoding="async"></button></figure>';
 const loopCount=redesignScreens.length>1?Math.min(2,redesignScreens.length):0;
 const rows=['before','after'].map(side=>{
  const screens=redesignScreens.map(screen=>({...screen,image:screen[side]}));
  return '<section class="redesign-screen-row" aria-label="'+(side==='before'?'Before 초기 화면':'After 리디자인 적용 화면')+'"><div class="redesign-screen-label"><span class="figure-tag">'+(side==='before'?'BEFORE / 초기 구성':'AFTER / 리디자인 적용')+'</span><span class="redesign-screen-zoom">클릭하면 원본 확대 ↗</span></div><div class="redesign-screen-window" data-comparison-viewport id="redesign-'+side+'-screen" tabindex="0" aria-label="'+(side==='before'?'Before':'After')+' 화면 · 좌우 방향키로 함께 넘기기"><div class="redesign-screen-track" data-comparison-track>'+(loopCount?screens.slice(-loopCount):[]).map((screen,index)=>slide(screen,screens.length-loopCount+index,true)).join('')+screens.map((screen,index)=>slide(screen,index)).join('')+screens.slice(0,loopCount).map((screen,index)=>slide(screen,index,true)).join('')+'</div></div></section>';
 }).join('');
 const notes='<div class="redesign-screen-notes">'+redesignScreens.map(screen=>'<p class="redesign-screen-note" data-comparison-note><strong>'+escapeHtml(screen.title)+'</strong> '+escapeHtml(screen.note)+'</p>').join('')+'</div>';
 return '<div class="redesign-screen-comparison" data-redesign-comparison role="region" aria-label="UI 리디자인 전후 화면 비교"><div class="redesign-screen-heading"><h4 id="redesign-comparison-title">로비·전투·세부 화면 | 테마를 다듬고 디자인 기준을 통일했습니다.</h4>'+controls+'</div>'+rows+notes+'<p class="sr-only" data-comparison-status role="status" aria-live="polite" aria-atomic="true"></p></div>';
};
const game1=section('redesign','02','UI 리디자인',`
<h3>실제 게임 리소스와 읽는 흐름에 맞춰 UI를 다시 설계했습니다.</h3>
<p>초기에는 마왕군을 조종해 용사군을 막는 다크 판타지 디펜스 기획에 맞춰, 어두운 색감과 금속 장식 중심으로 UI를 구성했습니다. 기성 UI 에셋을 조합할 때의 어색함을 줄이기 위해 AI 이미지 생성으로 시안을 만들고 필요한 부분을 다듬었습니다.</p>
<p>팀은 가용한 유닛 에셋으로 개발을 진행했고, 실제 캐릭터와 UI를 함께 보니 표현 방식의 차이가 드러났습니다. 팀원과 멘토에게서 정보 가독성과 시선 흐름에 대한 피드백도 받았습니다.</p>
<p>여러 방향의 시안을 팀에 공유하며 중세·마왕군의 분위기를 유지하면서 실제 에셋과 어우러지는 것을 기준으로 잡았습니다. 장식과 텍스처의 밀도를 조정하고, 제목·설명·주요 행동을 구분했습니다.</p>

<section class="redesign-block" aria-labelledby="redesign-comparison-title">
${redesignComparison()}
<ul class="visual-notes">
<li><strong>리소스의 일관성</strong> 판타지 세계의 마왕이라는 플레이어 설정에 맞춰 버건디와 고풍스러운 금색을 주조색으로 정하고, 화면마다 달랐던 색 조합을 통일했습니다.</li>
<li><strong>읽는 순서</strong> 플레이어의 시선 흐름을 고려해 난이도 이름·캐릭터·설명을 카드의 위·중앙·아래로 나눴습니다. 내용을 확인한 뒤 전투 준비로 이어지도록 구성했습니다.</li>
<li><strong>공통 규칙</strong> 기존 픽셀 서체의 가독성을 개선하기 위해 제목은 명조체, 설명은 고딕체로 구분했습니다. 하단 메뉴도 원형 아이콘과 공통 바로 묶어 형태와 배치 기준을 맞췄습니다.</li>
</ul>
</section>

<section class="redesign-block" aria-labelledby="redesign-polish-title">
<h4 id="redesign-polish-title">작은 경계 오류와 글자 깨짐도 실제 화면에서 확인해 수정했습니다.</h4>
<p>시안에서는 괜찮던 리소스도 개별 Sprite로 배치하고 늘리는 과정에서 경계가 어긋났습니다. 화면을 확대해 증상을 확인하고, 이미지 자체와 표시 구조 중 어디에서 생긴 문제인지 구분해 수정했습니다.</p>
<article class="redesign-trouble">
<h5>말풍선 모서리 밖으로 드러나는 배경</h5>
<div class="compare redesign-detail-comparison">${redesignDetail('gamelab-dialogue-before.png','수정 전 말풍선 · 투명 모서리 밖으로 사각 배경이 돌출된 상태','BEFORE / 배경 돌출','dialogue','프레임 위·아래의 사각 배경 경계를 확인할 수 있습니다.')}${redesignDetail('gamelab-dialogue-after.png','수정 후 말풍선 · 배경과 프레임을 일체형으로 적용한 상태','AFTER / 경계 정리','dialogue','모서리와 꼬리 비율을 유지하도록 표시 방식을 조정했습니다.')}</div>
<p>말풍선의 테두리를 쉽게 교체하려고 배경·프레임·꼬리를 나눴지만, 방향과 크기가 바뀔 때 조각의 경계가 어긋나 배경이 밖으로 드러났습니다. 리소스 교체 편의보다 경계를 맞추는 부담이 커져 표시 구조를 바꿨습니다.</p>
<p>튜토리얼 말풍선의 사용 범위를 고려해 <strong>배경·테두리·꼬리를 일체형으로 정리하고, 크기가 늘어나도 모서리와 꼬리 비율은 유지되도록</strong> 표시 방식을 수정했습니다. 좌우 방향은 같은 그림을 반전해 대응하고 본문 여백도 맞췄습니다. 업적 알림에도 배경을 포함한 일체형 패널을 적용해 모서리 밖으로 배경이 보이지 않도록 정리했습니다. 기존 튜토리얼 진행과 업적 알림 동작은 유지했습니다.</p>
<p class="caption">2026.10.13 Game View의 말풍선 영역 확대입니다. 같은 문구를 비교하며, 전장 상태·웨이브·레벨은 다릅니다. 표시 검증용 UI 상태를 구성한 캡처입니다.</p>
</article>
<article class="redesign-trouble">
<h5>결과 숫자 옆에 남는 작은 글자 조각</h5>
<div class="compare redesign-detail-comparison">${redesignDetail('gamelab-number-before.png','수정 전 결과 숫자 · 시간값 왼쪽에 금색 글자 조각이 남은 상태','BEFORE / 잔여 글리프','number','시간값 왼쪽에 얇은 글자 깨짐이 있었습니다.')}${redesignDetail('gamelab-number-after.png','수정 후 결과 숫자 · 같은 시간값 주변의 글자 조각이 사라진 상태','AFTER / 여백 보정','number','같은 결과값에서 글자 깨짐이 없어졌습니다.')}</div>
<p>숫자 옆의 금색 조각은 TextMeshPro의 추가 여백(extraPadding)이 글꼴 이미지의 인접 글자까지 표시하면서 생겼습니다. 추가 여백을 끄고 메시 여백을 갱신한 뒤, 같은 결과 Prefab과 데이터로 전후 화면을 비교해 해결을 확인했습니다. 숫자 값과 집계 연출은 유지했습니다.</p>
<p class="caption">2026.10.13 동일 결과 Prefab·동일 검증 데이터의 글꼴 여백 설정 전후 비교입니다. 본문은 시간값 주변 확대이며, 클릭하면 전체 렌더를 볼 수 있습니다.</p>
</article>
</section>

<section class="redesign-block" aria-labelledby="redesign-reward-title">
<h4 id="redesign-reward-title">보상을 고르기 전에 전장과 시너지를 확인하도록 바꿨습니다.</h4>
<p>직접 플레이하며 후반 조합을 고려해 보상을 고르려는데, 카드가 전장을 가려 현재 시너지 효과를 확인하기 어려웠습니다. <strong>‘전장 보기 → 시너지 확인 → 보상 보기’</strong>로 돌아오는 흐름을 추가했습니다.</p>
<div class="compare redesign-reward-comparison">${mini('gamelab-reward-expanded.png','개선 후 보상 화면 · 후보 카드 아래에 전장 보기 버튼 표시','01 / 보상 후보 확인')}${mini('gamelab-reward-inspection.png','개선 후 전장 보기 · 보상 카드를 접고 시너지 효과를 확인하는 화면','02 / 전장·시너지 확인')}</div>
<p class="caption">두 이미지는 개선 후 기능의 전환 상태입니다. 2026.10.13 저장된 준비 상태에서 웨이브 클리어 기능으로 정상 보상 단계에 진입한 Game View 검증 캡처입니다.</p>
<ul class="visual-notes">
<li><strong>정보 확인</strong> 카드를 접으면 현재 배치와 시너지 설명을 확인할 수 있습니다.</li>
<li><strong>선택 유지</strong> 보상 보기로 돌아와도 기존 후보와 보상 요청이 유지됩니다.</li>
<li><strong>입력 구분</strong> 접힌 상태에서는 시너지 확인과 복귀만 허용하고, 카드 선택·리롤·전투 시작은 막았습니다.</li>
</ul>
</section>

<div class="quote-note redesign-scope"><strong>담당과 확인 범위</strong><p>본인은 UI 구성, 리소스 선별·보정과 Unity 적용을 맡았습니다. 이미지 시안·리소스 생성에는 imagegen을 활용했고, 전투·성장·보상 규칙은 팀의 기존 시스템을 유지했습니다.</p><p>세부 마감과 전장 보기 사례는 2026.10.13 작업 후 10.14 팀 브랜치에 통합된 PR #101을 기준으로 정리했습니다. 당시 1920×1080·1366×768 표시·입력 검증 기록을 근거로 하며, 최종 플레이어 빌드 전체 검증과는 구분합니다.</p></div>
${evidence([[ghGame+'/commit/632a136','로비 디자인 적용 기록'],[ghGame+'/pull/101','마감·전장 보기 팀 통합'],[ghGame+'/blob/8a4fa07/Docs/UI/HeraldrySupplement.md#사용자-피드백-마감-수정-2026-10-13','원인·수정·검증 기록']])}
`);
const game2=section('hud','03','HUD 연동·오류 해결','<h3>움직여야 할 효과와 고정돼야 할 영역을 나눴습니다.</h3><p>쿨다운 효과가 배치 계산에 포함돼 슬롯이 흔들리고, 조준 중 이름표 위에서 입력을 놓으면 취소 대신 시전되는 문제가 있었습니다.</p><div class="facts"><div><h4>배치 흔들림</h4><p>슬롯·프레임·이름표의 고정 영역만 측정하고 불꽃·모래시계 효과는 계산에서 제외했습니다.</p></div><div><h4>입력 취소 오류</h4><p>활성 이름표의 RectTransform을 기존 조준 취소 영역에 포함해 팀원의 시전·쿨다운 흐름을 유지했습니다.</p></div></div><p>Bridge/Adapter를 통해 전투·보상·결과 데이터를 화면에 전달하고, 선택 명령은 기존 게임 시스템으로 되돌렸습니다. UI가 게임 규칙과 데이터를 중복으로 소유하지 않도록 구성했습니다.</p><div class="quote-note"><strong>검증 범위</strong><br>0~5개 장착·반복 활성화·쿨다운 중 배치를 확인했습니다. 저장된 런의 17번째 웨이브 종료부터 18번째 전투·패배 결과까지 관찰했고, 별도 격리 Play Mode 자동 입력 검사 12개를 통과했습니다. 전체 웨이브 완주·수동 전체 드래그·빌드 실행 검증과는 구분합니다.</div>'+evidence([[ghGame+'/commit/f1429e8','전투 UI 연동'],[ghGame+'/blob/f5c8f050847b217cbdd5345ddd723b70186da7eb/Docs/UI/CombatSkillHud.md','HUD 수정·검증 기록']]));
const game3=section('result','04','결과·성장 연출','<h3>성장 과정은 순서대로 보여주고, 스킵과 복귀 입력은 분리했습니다.</h3><p>통계 → 보상 카운트 → 경험치 흡수·레벨업 → 복귀 버튼의 순서로 결과를 보여주도록 구성했습니다. 런 시작·종료 데이터를 스냅샷으로 전달하고, DOTween으로 표시 시점을 조정했습니다.</p><div class="video-wrap"><video controls playsinline preload="metadata" poster="assets/gamelab-result-poster.png" aria-label="결과 정상 재생과 클릭 스킵 비교 영상"><source src="assets/gamelab-result.mp4" type="video/mp4">브라우저가 영상을 지원하지 않습니다. <a href="assets/gamelab-result.mp4">영상 파일 열기</a></video><p class="caption">정상 재생 / 클릭 스킵 비교 · 약 6초 · 무음<br>실제 결과 Prefab · 동일 검증 데이터 · InputSystem 자동 입력 · 실제 Scene 이동 제외</p></div><ul><li>일시정지 중에도 재생되도록 처리하고 동일 결과의 중복 재생을 막았습니다.</li><li>연출 스킵과 로비 복귀 입력을 분리해 한 번의 클릭이 다음 동작까지 진행하지 않도록 했습니다.</li><li>경험치 Fill·흡수 입자와 여러 번의 레벨업을 표시했습니다.</li></ul><div class="video-wrap"><video controls playsinline preload="none" poster="assets/gamelab-combat.png" aria-label="게임랩 전투와 스킬 보상 플레이 영상"><source src="assets/gamelab-gameplay.mp4" type="video/mp4"><a href="assets/gamelab-gameplay.mp4">게임플레이 영상 열기</a></video><p class="caption">Unity Play Mode 전시용 편집본 · 약 50초 · 2026.10.14 작업 자료<br>촬영용 유닛·스킬 구성 사용 · 공유용 720p 사본</p></div>');
const aiWorkflow=JSON.parse(fs.readFileSync(new URL('./gamelab-ai-workflow.json',import.meta.url),'utf8'));
const aiValidation=JSON.parse(fs.readFileSync(path.join(out,'assets',aiWorkflow.validationAsset),'utf8'));
const game4=section('ai','05',aiWorkflow.title,renderAIWorkflow(aiWorkflow,aiValidation,{mini,evidence}));
const gameEnd='<script src="'+assetURL('redesign-comparison.js')+'" defer></script><div class="next-project"><span>NEXT PROJECT</span><a href="tasktown.html">TaskTown <span aria-hidden="true">↗</span></a></div></div>';
fs.writeFileSync(path.join(out,'gamelab.html'),withGamelabBackground(shell('gamelab.html','용사때문에 레벨업','팀 피드백을 반영한 게임 UI 리디자인, HUD 오류 해결, 결과 연출과 AI 에이전트 작업 자동화.',gameHead+gameFlow+game1+game2+game3+game4+gameEnd),assetURL));

const taskHead='<div class="wrap"><header class="page-head"><p class="breadcrumb"><a href="index.html">프로젝트</a> &nbsp;/&nbsp; 02. TASKTOWN</p><span class="eyebrow">UNITY CLIENT · SYSTEM INTEGRATION</span><h1>TaskTown</h1><p class="subtitle">씬 전환·튜토리얼·공용 사운드를 구현하고 팀 기능을 연결했습니다.</p><p class="project-intro">클릭과 타이핑으로 재화를 얻고 마을을 키우는 Windows 데스크톱 게임입니다. 5인 팀의 개발 팀장으로 팀원이 만든 기능을 메인 씬과 빌드에 통합하고, 연결 상태를 함께 검토했습니다.</p><dl class="meta-grid"><div><dt>PERIOD / TEAM</dt><dd>2026.06.29 — 08.12 · 5인</dd></div><div><dt>MY ROLE</dt><dd>Unity 클라이언트 개발 팀장</dd></div><div><dt>TOOLS</dt><dd>Unity · C# · Win32 · AudioMixer</dd></div></dl>'+projectActions('tasktown',notion.task,ghTask)+'<p class="caption">팀 출시 현황: STOVE 2026.09.07 출시 · Steam 출시 예정 · 2026.10.26 확인</p></header><figure class="hero-figure"><button type="button" class="zoom-trigger" data-zoom aria-label="TaskTown 실제 실행 화면 크게 보기"><img src="assets/tasktown-gameplay.png" alt="Windows 데스크톱 아래에 배치된 TaskTown 마을과 동물 주민들" width="2560" height="1440" fetchpriority="high"></button><figcaption>2026.08.25 실제 실행 캡처 · Windows 화면 위에서 함께 동작하는 데스크톱 게임 <span class="zoom-hint">이미지 확대 ↗</span></figcaption></figure>';
const task1=section('scene','01','씬 전환','<h3>전환 순서와 창 설정을 공통 흐름으로 묶었습니다.</h3><p class="diagram-intent">로고·타이틀·게임 화면으로 전환할 때 각 화면에 맞는 해상도와 창 설정이 적용되도록 구성했습니다.</p><p>Bootstrap에서 전역 Manager를 초기화하고 SceneCatalogSO로 Scene 전환 정보를 관리했습니다. 비동기 preload와 활성화 시점을 분리해 로딩 연출과 전환을 조정했습니다.</p>'+zoom('tasktown-scene.png','TaskTown SceneFlow와 Windows 창 설정 적용 순서','최초 실행·재건 이후 분기와 Windows 창 설정 적용 순서를 요약한 개념도','diagram')+'<div class="facts"><div><h4>본인 구현</h4><p>Scene 전환, Scene별 해상도·창 모드 설정, 전환 후 HWND 재탐색과 제어권 인계를 담당했습니다.</p></div><div><h4>팀 기능과 연결</h4><p>팀원의 TransparentWindow가 처리하는 투명도·Always-on-top·click-through 기능과 연결했습니다.</p></div></div>'+evidence([[ghTask+'/pull/30','공통 전환 구조 · PR #30'],[ghTask+'/pull/143','Difficulty 연결 · PR #143']]));
const task2=section('tutorial','02','튜토리얼 상태 관리','<h3>다시 보기를 허용하면서 보상은 중복 지급되지 않도록 했습니다.</h3><p class="diagram-intent">필요한 때에만 튜토리얼을 불러오고, 다시 보기에서도 기존 보상 수령 기록을 유지하도록 진행 상태를 분리했습니다.</p><p>Tutorial을 Additive Scene으로 분리해 필요한 시점에 로드하고 완료 후 언로드했습니다. 진행 단계는 StateMachine, 게임 이벤트와 Tutorial 신호의 연결은 EventBridge가 담당하도록 구성했습니다.</p>'+zoom('tasktown-tutorial.png','TaskTown Additive Tutorial 진입과 완료 및 Replay 상태 관리','Tutorial 기본 진입·종료 흐름을 요약한 개념도','diagram')+'<ul><li>MainScene 자동 진입 시 SaveData의 미완료 상태를 확인해 Overlay를 로드했습니다.</li><li>Replay에서는 진행 상태를 다시 시작하되 일회성 보상 수령 기록은 유지했습니다.</li><li>단계 진입 시 이벤트를 구독하고, 단계 전환·완료 시 해제했습니다.</li><li>구버전 Save 복원과 Skip·Replay까지 같은 진행 흐름 안에서 처리했습니다.</li></ul>'+evidence([[ghTask+'/pull/96','Additive 구조 · PR #96'],[ghTask+'/pull/115','Replay·Save 분리 · PR #115']]));
const task3=section('sound','03','사운드·BGM','<h3>씬이 바뀌어도 같은 사운드 설정을 적용하도록 했습니다.</h3><p class="diagram-intent">장면과 UI에서 공용 사운드를 재생하고, 사용자가 조절한 볼륨을 저장·복원하도록 구성했습니다.</p><p>SoundManager와 AudioMixer로 재생·볼륨 설정을 공통 관리하고, Clip 데이터와 재생 요청을 분리했습니다. one-shot AudioSource를 재사용하고 Option UI에 볼륨 저장·복원을 연결했습니다.</p>'+zoom('tasktown-sound.png','TaskTown 공용 사운드 재생과 볼륨 저장 복원 구조','재생 요청·오디오 출력·설정 데이터의 흐름을 요약한 개념도','diagram')+'<ul><li>Master·BGM·UI·Environment 볼륨을 공통 관리했습니다.</li><li>BGM Playlist·랜덤·Loop·일시정지를 Scene 전환과 독립적으로 연결했습니다.</li><li>통합 과정에서 누락된 UI 버튼음을 점검하고 기본 클릭음 규칙을 적용했습니다.</li></ul>'+evidence([[ghTask+'/pull/20','Sound 기반 · PR #20'],[ghTask+'/pull/130','BGM Playlist · PR #130']]));
// TaskTown의 짧은 본문과 실제 작업 근거를 분리해 관리합니다.
const taskCollaboration=JSON.parse(fs.readFileSync(new URL('./tasktown-collaboration.json',import.meta.url),'utf8'));
const taskCollaborationSteps=taskCollaboration.steps.map((step,index)=>{
 const paragraphs=step.details.map(text=>'<p>'+escapeHtml(text)+'</p>').join('');
 const contracts=step.bullets?'<ul>'+step.bullets.map(item=>'<li><strong>'+escapeHtml(item.label)+'</strong> '+escapeHtml(item.text)+'</li>').join('')+'</ul>':'';
 const links=evidence(step.sourceIds.map(id=>[taskCollaboration.sources[id].url,taskCollaboration.sources[id].label]));
 return '<section class="ai-workflow-step" aria-labelledby="task-collaboration-'+index+'"><span class="ai-step-number">'+String(index+1).padStart(2,'0')+'</span><div><h4 id="task-collaboration-'+index+'">'+escapeHtml(step.heading)+'</h4><p>'+escapeHtml(step.body)+'</p><details class="ai-proof-detail"><summary>'+escapeHtml(step.detailLabel)+'</summary><div class="ai-proof-content">'+paragraphs+contracts+links+'</div></details></div></section>';
}).join('');
const task4=section('collaboration','04',taskCollaboration.title,'<div class="ai-workflow"><h3>'+escapeHtml(taskCollaboration.headline)+'</h3><p class="ai-workflow-intro">'+escapeHtml(taskCollaboration.intro)+'</p><div class="ai-workflow-steps">'+taskCollaborationSteps+'</div><p class="ai-workflow-intro">'+escapeHtml(taskCollaboration.tools)+'</p><p class="caption">'+escapeHtml(taskCollaboration.scope)+'</p></div>'+zoom('tasktown-desktop.png','작업 창과 함께 실행되는 TaskTown 데스크톱 화면','2026.08.25 실행 캡처 · 문서 작업과 게임을 함께 사용하는 화면')+'<div class="links">'+ext('https://youtu.be/u9WawDJRVhM','게임 트레일러')+storeLink('tasktown','steam')+'</div>');
fs.writeFileSync(path.join(out,'tasktown.html'),withTasktownBackground(shell('tasktown.html','TaskTown','Scene 전환, Tutorial 상태 관리, 공용 사운드와 팀 기능 통합을 담당한 TaskTown 개발 사례.',taskHead+task1+task2+task3+task4+'<div class="next-project"><span>MORE ABOUT ME</span><a href="resume.html">이력서 보기 ↗</a></div></div>'),assetURL));

const resume='<div class="wrap"><header class="resume-head"><div><span class="eyebrow">RESUME / 최희수</span><h1>게임 개발 · UI 디자인</h1><p>화면 설계와 시각 표현을 C#·Unity 구현으로 연결합니다. 게임랩에서는 UI 설계·리디자인·연동과 오류 수정을, TaskTown에서는 씬 전환·튜토리얼·사운드 구현과 팀 기능 통합을 맡았습니다.</p></div><div class="resume-contact"><p><a href="mailto:sudeang_@naver.com">sudeang_@naver.com</a><br>'+ext('https://github.com/sudeang0-hue','github.com/sudeang0-hue','contact-link')+'</p><div class="links"><button class="btn-quiet" data-print>인쇄 / PDF 저장</button><button class="btn-quiet" data-copy-email>이메일 복사</button></div></div></header><section class="resume-section"><h2>일하는 방식</h2><div class="resume-note"><p>팀 피드백을 제작 조건으로 정리하고, 연결할 기능과 유지할 동작을 구분합니다. 변경 파일과 화면·검사 기록을 검토해 반영 여부를 결정합니다.</p></div></section><section class="resume-section"><h2>대표 프로젝트</h2><div><article class="resume-item"><header><h3><a href="gamelab.html">용사때문에 레벨업 ↗</a></h3><time>2026.09.02 — 10.14</time></header><p>OZ GAMELAB 2기 · 4인 팀 · UI 설계·구현 / 아트 리소스 통합</p><ul><li>Figma로 화면 이동·팝업·복귀 경로 설계, 팀 피드백을 반영한 UI 리디자인과 공용 Prefab 적용</li><li>게임 시스템 연동, 스킬 HUD 배치 흔들림·입력 취소 오류 수정</li><li>결과·경험치·레벨업 순차 연출과 클릭 스킵·복귀 입력 분리</li><li>수정 범위·네이밍·검수 순서를 문서로 정하고, 리소스 정렬·스킬 UI 반복 조립에 자동화 도구 활용</li></ul></article><article class="resume-item"><header><h3><a href="tasktown.html">TaskTown — 모여라 데스크 타운 ↗</a></h3><time>2026.06.29 — 08.12</time></header><p>5인 팀 · Unity 클라이언트 개발 팀장 · 팀 결과: STOVE 출시</p><ul><li>비동기 SceneFlow와 Scene별 해상도·창 설정, 팀원 투명창 기능 연동</li><li>Additive Tutorial, Replay 진행 상태·일회성 보상 수령 상태 분리</li><li>공용 Sound/BGM과 옵션 볼륨 저장·복원 연결</li><li>팀 기능의 MainScene·빌드 통합, 동시 작업을 고려한 수정 범위와 리뷰 항목 정리</li></ul></article><div class="links no-print">'+ext(notion.main,'전체 프로젝트 포트폴리오')+'</div></div></section><section class="resume-section"><h2>이전 경력 · 콘텐츠 제작</h2><article class="resume-item"><header><h3>광진구청 홍보담당관</h3><time>2022.04 — 2024.01</time></header><p>PR전문 웹툰크리에이터</p><p>정책·생활정보를 웹툰으로 구성하며 내용 조사·대본·콘티·선화·채색·편집·수정 대응을 맡았습니다. 기존 광이·진이 캐릭터의 응용동작, 홍보 일러스트와 배경화면도 제작했습니다.</p><a class="text-link no-print" href="design.html#public-work">공공기관 작업 보기 ↗</a></article></section><section class="resume-section"><h2>기술·도구</h2><div class="resume-skills"><div><h3>개발·UI</h3><p>C# · Unity · uGUI · TextMeshPro · DOTween<br>ScriptableObject · Win32 · AudioMixer</p></div><div><h3>협업·검증</h3><p>Git · GitHub · PR 검토<br>Unity Play Mode · EditMode · NUnit</p></div><div><h3>디자인·제작</h3><p>Figma · Adobe Photoshop<br>Adobe Illustrator</p></div><div><h3>AI·자동화 도구</h3><p>Codex · imagegen · Unity MCP</p></div></div></section><section class="resume-section"><h2>교육·프로젝트 참여</h2><div><article class="resume-item"><header><h3>OZ GAMELAB 2기</h3><time>2026.09 — 10</time></header><p>C#·Unity 기반 4인 협업 프로젝트의 UI·아트 리소스와 화면 연동 담당</p></article><article class="resume-item"><header><h3>오즈코딩스쿨 게임 개발 부트캠프 5기</h3><time>2026.02 — 08</time></header><p>C#·Unity 기반 2인·5인 협업 프로젝트 수행</p></article><article class="resume-item"><header><h3>한강미디어고등학교 산업디자인과</h3><time>2016.03 — 2019.02</time></header></article></div></section><section class="resume-section"><h2>자격증</h2><ul class="cert-list"><li><span>컴퓨터그래픽스운용기능사</span><small>2018.07 · 한국산업인력공단</small></li><li><span>ITQ 엑셀 B급</span><small>2017.12 · 한국생산성본부(KPC)</small></li><li><span>ITQ 파워포인트 C급</span><small>2017.12 · 한국생산성본부(KPC)</small></li><li><span>ITQ 아래한글 A급</span><small>2017.06 · 한국생산성본부(KPC)</small></li><li><span>GTQ 일러스트 1급</span><small>2017.05 · 한국생산성본부(KPC)</small></li><li><span>GTQ(그래픽기술자격) 1급</span><small>2016.03 · 한국생산성본부(KPC)</small></li></ul></section><section class="resume-section no-print"><h2>더 자세한 이야기</h2><div class="resume-note"><p>구현 과정·실행 화면·PR 근거는 프로젝트 상세 페이지와 Notion 원문에 정리했습니다.</p><div class="links">'+ext(notion.intro,'자기소개서')+ext(notion.main,'Notion 이력서 원문')+'</div></div></section></div>';
fs.writeFileSync(path.join(out,'resume.html'),shell('resume.html','이력서','게임 개발자 최희수의 경력, 프로젝트, 기술과 자격증. 디자인과 개발 경험을 연결해 게임의 완성도를 높입니다.',resume));
const designData=JSON.parse(fs.readFileSync(new URL('./design-content.json',import.meta.url),'utf8'));
const illustrationData=JSON.parse(fs.readFileSync(new URL('./illustration-content.json',import.meta.url),'utf8'));
const graphicDesignData=JSON.parse(fs.readFileSync(new URL('./graphic-design-content.json',import.meta.url),'utf8'));
const designBody=renderDesignPortfolio(designData,{escapeHtml,ext,zoom,illustration:illustrationData,graphicDesign:graphicDesignData})+'<script src="'+assetURL('design-portfolio.js')+'" defer></script><script src="'+assetURL('goods-slider.js')+'" defer></script>';
fs.writeFileSync(path.join(out,'design.html'),shell('design.html','디자인 및 홍보','공공기관 웹툰·일러스트와 앱 UI, 브랜드·편집·패키지 디자인 포트폴리오. 작업 의도와 화면·지면 구성, 적용 목업을 함께 소개합니다.',designBody));
const readerWorks=JSON.parse(fs.readFileSync(new URL('./webtoon-content.json',import.meta.url),'utf8')).works;
if(readerWorks.length!==designData.works.length||new Set(readerWorks.map(work=>work.id)).size!==readerWorks.length)throw new Error('모든 작품의 읽기 자료를 확인하세요.');
for(const work of designData.works){
 const reading=readerWorks.find(item=>item.id===work.id);
 if(!reading)throw new Error('작품 읽기 자료 누락: '+work.id);
 fs.writeFileSync(path.join(out,publicReaderPath(work.id)),shell(publicReaderPath(work.id),work.title,work.description,renderPublicReader(work,reading,designData.works,{ext}),work));
}
// 굿즈 사례는 사진과 본문을 별도 자료 파일에서 추가합니다.
const goods=JSON.parse(fs.readFileSync(new URL('./goods-content.json',import.meta.url),'utf8'));
const goodsParagraphs=paragraphs=>paragraphs.map(text=>'<p>'+escapeHtml(text)+'</p>').join('');
const goodsPlaceholder=label=>'<div class="goods-placeholder"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="4" width="26" height="24" rx="2"/><circle cx="11" cy="12" r="2"/><path d="m5 25 8-8 5 5 5-7 6 10"/></svg><span>'+escapeHtml(label)+'</span><small>자료 준비 중</small></div>';
function goodsPhoto(photo,captionLabel=false){
 if(!photo.file||!photo.alt)throw new Error('굿즈 이미지에 file과 alt가 필요합니다.');
 const assetRoot=path.resolve(out,'assets');
 const assetPath=path.resolve(assetRoot,photo.file);
 if(!assetPath.startsWith(assetRoot+path.sep)||!fs.statSync(assetPath).isFile())throw new Error('굿즈 이미지 경로를 확인하세요.');
 const label=photo.label?'<span class="'+(captionLabel?'goods-slide-owner':'figure-tag')+'">'+escapeHtml(photo.label)+'</span>':'';
 const figure=zoom(photo.file,photo.alt,photo.caption||'','',captionLabel?label:'');
 return !captionLabel&&label?figure.replace('<button class="zoom-trigger"',label+'<button class="zoom-trigger"'):figure;
}
function goodsPhotos(images,placeholder,layout='',slider){
 if(!images.length)return placeholder?goodsPlaceholder(placeholder):'';
 if(layout==='slider')return goodsSlider(images,slider);
 return '<div class="goods-photos'+(layout==='comparison'?' goods-comparison':layout==='tiles'?' goods-tiles':'')+'">'+images.map(photo=>goodsPhoto(photo)).join('')+'</div>';
}
function goodsSlider(images,config){
 if(!config||!/^goods-[a-z-]+$/.test(config.id)||!config.label||!config.heading||![0,2000].includes(config.interval))throw new Error('굿즈 슬라이드 설정을 확인하세요.');
 const slide=(photo,index,copy=false)=>goodsPhoto(photo,true).replace('class="media "','class="media goods-slide" data-goods-source="'+index+'"'+(copy?' data-goods-copy hidden':''));
 const slides=(images.length>1?slide(images.at(-1),images.length-1,true):'')+images.map((photo,index)=>slide(photo,index)).join('')+(images.length>1?slide(images[0],0,true):'');
 return '<section class="goods-slider" id="'+escapeHtml(config.id)+'" data-goods-slider data-interval="'+config.interval+'" role="region" aria-roledescription="슬라이드" aria-label="'+escapeHtml(config.label)+'"><p class="figure-tag">'+escapeHtml(config.heading)+'</p><div class="goods-slider-window" tabindex="0" aria-label="'+escapeHtml(config.label)+' · 좌우 방향키로 이동"><div class="goods-slider-track">'+slides+'</div></div><div class="goods-slider-controls" hidden><div class="goods-slider-buttons"><button type="button" data-slide-prev aria-label="'+escapeHtml(config.label)+' 이전 사진">←</button><button type="button" data-slide-next aria-label="'+escapeHtml(config.label)+' 다음 사진">→</button>'+ (config.interval?'<button type="button" data-slide-play aria-label="자동 넘김 일시정지" aria-pressed="true"><span data-play-icon aria-hidden="true">Ⅱ</span></button>':'')+'</div><span class="goods-slider-count" data-slide-count aria-hidden="true">1 / '+images.length+'</span></div><p class="sr-only" data-slide-status role="status" aria-live="polite" aria-atomic="true"></p></section>';
}
// 추가 자료는 기본 details로 열고 닫으며 이미지마다 담당 범위와 설명을 표시합니다.
function goodsGallery(gallery){
 if(!gallery?.images?.length)return '';
 return '<details class="goods-gallery"><summary>'+escapeHtml(gallery.title)+'</summary>'+goodsPhotos(gallery.images,'',gallery.imageLayout||'tiles')+'</details>';
}
function goodsBlocks(blocks=[]){
 return blocks.map(block=>'<div class="goods-block"><h4>'+escapeHtml(block.title)+'</h4>'+goodsParagraphs(block.paragraphs||[])+goodsPhotos(block.images,'',block.imageLayout)+'</div>').join('');
}
const goodsRoles='<section class="goods-roles" aria-label="봉래제 작업 범위">'+goods.responsibilities.map(role=>'<div><h3>'+escapeHtml(role.title)+'</h3><p>'+escapeHtml(role.body)+'</p></div>').join('')+'</section>';
const goodsHeader='<div class="wrap"><header class="category-head goods-head" id="goods-top" tabindex="-1"><span class="eyebrow">PORTFOLIO / '+escapeHtml(goods.title)+'</span><h1>'+escapeHtml(goods.title)+'</h1><p class="subtitle goods-headline">'+escapeHtml(goods.headline)+'</p><div class="goods-introduction">'+goodsParagraphs(goods.introduction)+'</div></header><section class="goods-overview" aria-labelledby="goods-project-title"><div><span class="eyebrow">FEATURED / 대표 사례</span><h2 id="goods-project-title">'+escapeHtml(goods.projectTitle)+'</h2><p class="goods-date">'+escapeHtml(goods.date)+'</p><p class="goods-role">'+escapeHtml(goods.role)+'</p><p class="goods-status">'+escapeHtml(goods.status)+'</p></div>'+goodsSlider(goods.overviewImages,goods.overviewSlider)+'</section>'+goodsRoles;
const goodsCases=goods.stages.map(stage=>section(escapeHtml(stage.id),escapeHtml(stage.number),escapeHtml(stage.title),'<h3>'+escapeHtml(stage.heading)+'</h3>'+goodsParagraphs(stage.paragraphs)+'<ul class="goods-topics" aria-label="'+escapeHtml(stage.title)+' 정리 항목">'+stage.topics.map(topic=>'<li>'+escapeHtml(topic)+'</li>').join('')+'</ul>'+goodsPhotos(stage.images,stage.imagePlaceholder,stage.imageLayout,stage.slider)+goodsBlocks(stage.blocks)+goodsGallery(stage.gallery))).join('');
const goodsEvents='<section class="goods-events" id="goods-events" aria-labelledby="goods-events-title"><header><span class="eyebrow">EVENTS / 활동 기록</span><h2 id="goods-events-title">행사별 참여 범위</h2><p>행사별 담당 범위와 판매 방식을 구분해 정리했습니다.</p></header><div class="goods-event-list">'+goods.events.map(event=>{
 return '<article class="goods-event" id="'+escapeHtml(event.id)+'"><p class="goods-event-date">'+escapeHtml(event.date)+'</p><h3>'+escapeHtml(event.title)+'</h3><p class="goods-event-role">'+escapeHtml(event.role)+'</p><p>'+escapeHtml(event.body)+'</p>'+goodsPhotos(event.images||[],'')+goodsGallery(event.gallery)+'</article>';
}).join('')+'</div></section>';
const goodsEnd='<div class="category-return goods-return"><a class="text-link" href="history.html#activities">활동 연혁 보기 <span aria-hidden="true">↗</span></a><a class="text-link" href="design.html">디자인 및 홍보 보기 <span aria-hidden="true">↗</span></a><a class="text-link goods-back-top" href="#goods-top" data-goods-top>맨 위로 <span aria-hidden="true">↑</span></a></div></div><script src="'+assetURL('goods-slider.js')+'" defer></script>';
fs.writeFileSync(path.join(out,'planning.html'),withGoodsBackground(shell('planning.html',goods.title,'봉래제와 온리전 참가 경험. 본인 일러스트·팀원 시안 피드백, 굿즈 제작·현장 판매와 온라인 판매·발송 과정.',goodsHeader+goodsCases+goodsEvents+goodsEnd),assetURL));
const history=JSON.parse(fs.readFileSync(new URL('./history-content.json',import.meta.url),'utf8'));
fs.writeFileSync(path.join(out,'history.html'),shell('history.html',history.title,'최희수의 교육 및 자격·활동·근무 연혁. 게임 개발 교육과 협업 프로젝트, 콘텐츠 제작과 매장 운영 경험을 정리합니다.',renderHistory(history)));
console.log((7+readerWorks.length)+' pages generated.');


// Reserve image space before lazy loading to keep section anchors stable.
const mediaSizes=new Map(JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'asset-sizes.json'),'utf8')).assets.map(a=>[a.file,a]));
for(const file of ['index.html','gamelab.html','tasktown.html','resume.html','planning.html','design.html','history.html',...readerWorks.map(work=>publicReaderPath(work.id))]){
 let html=fs.readFileSync(path.join(out,file),'utf8');
 html=html.replace(/<img\b[^>]*src="assets\/([^"]+)"[^>]*>/g,(tag,file)=>{const a=mediaSizes.get(file);return !a?.width||/\bwidth=/.test(tag)?tag:tag.slice(0,-1)+' width="'+a.width+'" height="'+a.height+'">'});
 fs.writeFileSync(path.join(out,file),html);
}


// 로컬 설정이 있을 때만 저장소 밖의 개인용 출력도 공통 원문으로 갱신합니다.
const privateResume=tryGeneratePrivateResume();
if(privateResume.generated) console.log('개인용 이력서도 갱신했습니다(저장소 밖 로컬 출력).');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 실제 스크립트의 재생 상태·초점·복원 동작을 검사합니다. 화면 배치는 브라우저에서 확인합니다.
const source=fs.readFileSync(new URL('./dist/figma-prototype.js',import.meta.url),'utf8');
class Style {
 constructor(){this.values=new Map();}
 getPropertyValue(name){return this.values.get(name)?.[0]||'';}
 getPropertyPriority(name){return this.values.get(name)?.[1]||'';}
 setProperty(name,value,priority=''){this.values.set(name,[String(value),priority]);}
 removeProperty(name){this.values.delete(name);}
}
class Element {
 constructor(tag='div',inertSupported=true){
  this.tagName=tag.toUpperCase();this.children=[];this.handlers=new Map();this.map={};this.attrs={};
  this.dataset={};this.style=new Style();this.classes=new Set();this.hidden=false;this.textContent='';
  if(inertSupported)this.inert=false;
  this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};
 }
 addEventListener(type,callback){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(callback);}
 emit(type,event={}){
  const input={target:this,prevented:false,preventDefault(){this.prevented=true;},...event};
  for(const callback of this.handlers.get(type)||[])callback(input);
  return input;
 }
 append(element){element.parentElement=this;element.document=this.document;this.children.push(element);}
 prepend(element){element.parentElement=this;element.document=this.document;this.children.unshift(element);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 getAttribute(name){return this.attrs[name]??null;}
 removeAttribute(name){delete this.attrs[name];}
 contains(element){return this===element||this.children.some(child=>child.contains(element));}
 querySelector(selector){return this.map[selector]||null;}
 descendants(){return this.children.flatMap(child=>[child,...child.descendants()]);}
 querySelectorAll(selector){
  if(selector==='[data-figma-flow]')return this.flows||[];
  return this.descendants().filter(element=>(element.tagName==='BUTTON'&&!element.disabled)||(element.tagName==='A'&&element.href)||element.tagName==='IFRAME'||element.tabIndex>=0);
 }
 getClientRects(){
  for(let node=this;node;node=node.parentElement){
   if(node.hidden||(node.hideWhenExpanded&&this.player.classes.has('is-expanded')))return [];
  }
  return [{}];
 }
 closest(selector){for(let node=this;node;node=node.parentElement)if(selector==='[inert]'&&node.inert)return node;return null;}
 getBoundingClientRect(){return this.boundsFn?this.boundsFn():this.bounds;}
 focus(options){this.document.activeElement=this;this.focusOptions=options;this.emit('focus');}
}

function setup({supported=true,observer=true,present=true,expandPresent=true,viewportPresent=true}={}){
 const document=new Element(),window=new Element();
 const make=(tag='div')=>{const element=new Element(tag,supported);element.document=document;return element;};
 const html=make('html'),body=make('body'),siteHeader=make('header'),main=make('main'),footer=make('footer');
 const section=make('section'),intro=make(),player=make(),after=make(),bar=make(),controls=make(),viewport=make();
 const frame=make('iframe'),placeholder=make(),load=make('button'),reset=make('button'),external=make('a'),expand=make('button');
 const status=make('details'),beforeInert=make();
 html.append(body);body.append(siteHeader);body.append(main);body.append(footer);
 main.append(intro);main.append(section);main.append(after);section.append(beforeInert);section.append(player);
 player.append(bar);bar.append(controls);bar.append(expand);player.append(external);player.append(viewport);player.append(status);
 viewport.append(placeholder);placeholder.append(load);viewport.append(frame);status.append(reset);
 beforeInert.inert=true;expand.hidden=true;frame.hidden=true;load.hidden=true;reset.hidden=true;controls.hidden=true;
 external.hideWhenExpanded=true;status.hideWhenExpanded=true;external.href='https://www.figma.com/proto/file';
 let src='',srcWrites=0;
 Object.defineProperty(frame,'src',{get:()=>src,set:value=>{src=value;srcWrites++;}});
 const flows=['로비 흐름','전투 흐름'].map((label,index)=>{
  const button=make('button');
  button.dataset={figmaLabel:label,figmaHref:`https://www.figma.com/proto/file?node-id=${index}&scaling=contain`,figmaSrc:`https://embed.figma.com/proto/file?node-id=${index}&scaling=fit-width`};
  button.setAttribute('aria-pressed',String(index===0));controls.append(button);return button;
 });
 player.flows=flows;
 player.map={'[data-figma-frame]':frame,'[data-figma-placeholder]':placeholder,'[data-figma-load]':load,'[data-figma-reset]':reset,'[data-figma-controls]':controls,'[data-figma-expand]':expandPresent?expand:null,'[data-figma-viewport]':viewportPresent?viewport:null};
 expand.textContent='전체 화면 ↗';expand.setAttribute('aria-expanded','false');
 document.map={'[data-figma-player]':present?player:null,'[data-figma-external]':external};
 document.body=body;document.documentElement=html;document.activeElement=siteHeader;
 document.createElement=tag=>{const element=make(tag);element.player=player;return element;};
 for(const element of [html,...html.descendants()])element.player=player;
 window.scrollX=7;window.scrollY=1200;window.innerWidth=390;window.innerHeight=844;
 const scrolls=[];
 window.scrollTo=options=>{scrolls.push({x:options.left,y:options.top,behavior:html.style.getPropertyValue('scroll-behavior')});window.scrollX=options.left;window.scrollY=options.top;};
 player.documentTop=1400;
 player.boundsFn=()=>({top:player.classes.has('is-expanded')?0:player.documentTop-window.scrollY});
 viewport.bounds={width:390,height:700};
 const observers=[];
 class Observer {
  constructor(callback){this.callback=callback;this.targets=new Set();this.disconnects=0;observers.push(this);}
  observe(element){this.targets.add(element);}
  disconnect(){this.targets.clear();this.disconnects++;}
 }
 vm.runInNewContext(source,{document,window,URL,ResizeObserver:observer?Observer:undefined});
 return {document,window,html,body,siteHeader,main,footer,section,intro,player,after,beforeInert,viewport,frame,load,reset,external,expand,flows,observers,scrolls,
  srcWrites:()=>srcWrites,expanded:()=>player.classes.has('is-expanded'),
  guards:()=>player.children.filter(element=>element.tagName==='SPAN'),
  click:()=>expand.emit('click'),key:(key,shiftKey=false)=>document.emit('keydown',{key,shiftKey}),
 };
}
let passed=0;
function test(name,action){try{action();passed++;}catch(error){throw new Error(`${name}: ${error.message}`,{cause:error});}}

test('첫 자동 준비는 초점을 빼앗지 않고 기존 시작 화면을 재생',()=>{
 const s=setup();
 assert.equal(s.srcWrites(),1);assert.match(s.frame.src,/node-id=0/);
 assert.equal(s.document.activeElement,s.siteHeader);assert.equal(s.expand.hidden,false);
 assert.equal(s.guards().length,2);assert.ok(s.guards().every(guard=>guard.hidden));
});

test('inert 또는 확대 마크업이 없으면 기존 재생만 유지',()=>{
 for(const options of [{supported:false},{expandPresent:false},{viewportPresent:false}]){
  const s=setup(options);assert.equal(s.expand.hidden,true);assert.equal(s.srcWrites(),1);assert.equal(s.guards().length,0);
  s.flows[1].emit('click');assert.match(s.frame.src,/node-id=1/);
 }
 const absent=setup({present:false});assert.equal(absent.srcWrites(),0);assert.equal(absent.guards().length,0);
});

test('확대는 iframe을 이동하거나 다시 불러오지 않고 대화상자와 배경 잠금을 적용',()=>{
 const s=setup(),parent=s.frame.parentElement;s.click();
 assert.equal(s.expanded(),true);assert.equal(s.srcWrites(),1);assert.equal(s.frame.parentElement,parent);
 assert.equal(s.player.getAttribute('role'),'dialog');assert.equal(s.player.getAttribute('aria-modal'),'true');
 assert.equal(s.player.getAttribute('aria-labelledby'),'figma-player-title');
 assert.equal(s.expand.getAttribute('aria-expanded'),'true');assert.equal(s.expand.textContent,'전체 화면 닫기 ×');
 assert.equal(s.body.style.getPropertyValue('position'),'fixed');assert.equal(s.body.style.getPropertyValue('top'),'-1200px');
 for(const sibling of [s.siteHeader,s.footer,s.intro,s.after,s.beforeInert])assert.equal(sibling.inert,true);
 for(const ancestor of [s.body,s.main,s.section,s.player])assert.equal(ancestor.inert,false);
 assert.equal(s.document.activeElement,s.expand);
});

test('남은 공간 안에서 세로·가로 회전 모두 16:9 크기를 계산',()=>{
 const s=setup();s.click();
 assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'390px');
 s.viewport.bounds={width:844,height:260};s.observers[0].callback();
 assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'462.22px');
 s.viewport.bounds={width:320,height:600};s.window.emit('orientationchange');
 assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'320px');
 assert.equal(s.srcWrites(),1);
});

test('같은 방향으로 닫으면 정확한 스크롤·인라인 우선순위·기존 속성과 inert를 복원',()=>{
 const s=setup();
 s.body.style.setProperty('position','relative','important');s.body.style.setProperty('overflow','clip');
 s.html.style.setProperty('scroll-behavior','smooth','important');
 s.player.style.setProperty('--figma-expanded-width','88%');s.player.setAttribute('role','region');
 s.click();s.window.scrollY=0;s.click();
 assert.equal(s.expanded(),false);assert.equal(s.body.style.getPropertyValue('position'),'relative');
 assert.equal(s.body.style.getPropertyPriority('position'),'important');assert.equal(s.body.style.getPropertyValue('overflow'),'clip');
 assert.equal(s.body.style.getPropertyValue('top'),'');assert.equal(s.player.getAttribute('role'),'region');
 assert.equal(s.player.getAttribute('aria-modal'),null);assert.equal(s.player.getAttribute('aria-labelledby'),null);
 assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'88%');
 assert.deepEqual(s.scrolls,[{x:7,y:1200,behavior:'auto'}]);
 assert.equal(s.html.style.getPropertyValue('scroll-behavior'),'smooth');assert.equal(s.html.style.getPropertyPriority('scroll-behavior'),'important');
 assert.equal(s.beforeInert.inert,true);assert.equal(s.siteHeader.inert,false);assert.equal(s.intro.inert,false);
 assert.equal(s.document.activeElement,s.expand);assert.equal(s.expand.focusOptions.preventScroll,true);
 assert.equal(s.expand.getAttribute('aria-expanded'),'false');assert.equal(s.expand.textContent,'전체 화면 ↗');
 assert.ok(s.guards().every(guard=>guard.hidden));assert.equal(s.srcWrites(),1);
});

test('회전 후 기존 위치를 복원하되 낮아진 화면에서는 플레이어가 보이도록 상한 적용',()=>{
 for(const [originalTop,expectedTop] of [[100,100],[432,156]]){
  const s=setup();s.player.documentTop=s.window.scrollY+originalTop;s.click();
  s.window.innerWidth=844;s.window.innerHeight=390;s.window.scrollY=0;s.player.documentTop=2100;
  s.click();assert.equal(s.window.scrollY,2100-expectedTop);assert.equal(s.player.getBoundingClientRect().top,expectedTop);
 }
});

test('반복 확대·닫기와 중복 Escape에 상태·리스너·관찰자가 쌓이지 않음',()=>{
 const s=setup();
 for(let index=0;index<5;index++){s.click();s.key('Escape');s.key('Escape');}
 assert.equal(s.guards().length,2);assert.equal(s.observers.length,1);assert.equal(s.observers[0].targets.size,0);
 assert.equal(s.document.handlers.get('keydown').length,1);assert.equal(s.window.handlers.get('resize').length,1);
 assert.equal(s.scrolls.length,5);assert.equal(s.srcWrites(),1);assert.equal(s.siteHeader.inert,false);
});

test('Tab 경계와 iframe 이후 포커스 가드는 대화상자 안에서 순환',()=>{
 const s=setup();s.click();
 s.flows[0].focus();assert.equal(s.key('Tab',true).prevented,true);assert.equal(s.document.activeElement,s.frame);
 assert.equal(s.key('Tab').prevented,true);assert.equal(s.document.activeElement,s.flows[0]);
 s.expand.focus();assert.equal(s.key('Tab').prevented,false);
 s.guards()[1].focus();assert.equal(s.document.activeElement,s.flows[0]);
 s.guards()[0].focus();assert.equal(s.document.activeElement,s.frame);
 s.expand.focus();assert.equal(s.key('Escape').prevented,true);assert.equal(s.expanded(),false);
});

test('ResizeObserver가 없어도 resize로 크기를 갱신하고 닫힌 뒤에는 변경하지 않음',()=>{
 const s=setup({observer:false});s.click();s.viewport.bounds={width:900,height:300};s.window.emit('resize');
 assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'533.33px');
 s.click();s.window.emit('resize');assert.equal(s.player.style.getPropertyValue('--figma-expanded-width'),'');
});

test('pagehide는 초점을 강제로 이동하지 않고 잠금을 해제하며 이후 다시 열 수 있음',()=>{
 const s=setup();s.click();s.frame.focus();s.window.emit('pagehide');
 assert.equal(s.expanded(),false);assert.equal(s.siteHeader.inert,false);assert.equal(s.document.activeElement,s.frame);
 assert.equal(s.body.style.getPropertyValue('position'),'');assert.equal(s.observers[0].targets.size,0);
 s.window.emit('pagehide');assert.equal(s.scrolls.length,1);s.click();assert.equal(s.expanded(),true);
});

test('확대 중 흐름 전환·재시작은 동작하고 닫기 자체는 선택한 흐름을 재시작하지 않음',()=>{
 const s=setup();s.click();s.flows[1].emit('click');assert.equal(s.srcWrites(),2);
 assert.equal(s.flows[1].getAttribute('aria-pressed'),'true');assert.equal(s.flows[0].getAttribute('aria-pressed'),'false');
 assert.match(s.external.href,/node-id=1/);assert.match(s.external.href,/scaling=contain/);
 s.flows[1].emit('click');assert.equal(s.srcWrites(),2);s.reset.emit('click');assert.equal(s.srcWrites(),3);
 s.click();assert.equal(s.srcWrites(),3);assert.match(s.frame.src,/node-id=1/);assert.equal(s.flows[1].getAttribute('aria-pressed'),'true');
});

test('기존 HTTPS·호스트·프로토타입 경로 검증은 유지',()=>{
 for(const bad of ['http://embed.figma.com/proto/file','https://example.com/proto/file','https://embed.figma.com/design/file']){
  const s=setup();s.flows[1].dataset.figmaSrc=bad;
  assert.throws(()=>s.flows[1].emit('click'),/Invalid Figma prototype URL/);assert.equal(s.srcWrites(),1);
 }
});

console.log(`Figma prototype: ${passed} checks passed.`);

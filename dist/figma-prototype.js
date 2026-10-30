// 초기 프로토타입의 시작점을 전환합니다. 실제 게임 로직은 실행하지 않습니다.
const figmaPlayer=document.querySelector('[data-figma-player]');
if(figmaPlayer){
 const frame=figmaPlayer.querySelector('[data-figma-frame]');
 const placeholder=figmaPlayer.querySelector('[data-figma-placeholder]');
 const loadButton=figmaPlayer.querySelector('[data-figma-load]');
 const resetButton=figmaPlayer.querySelector('[data-figma-reset]');
 const external=document.querySelector('[data-figma-external]');
 const buttons=[...figmaPlayer.querySelectorAll('[data-figma-flow]')];
 let selected=buttons.find(button=>button.getAttribute('aria-pressed')==='true')||buttons[0];
 let started=false;
 function checkedURL(value,host){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!==host||!url.pathname.startsWith('/proto/')) throw new Error('Invalid Figma prototype URL');
  return url.href;
 }
 function showSelected(){
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button===selected)));
  const label=selected.dataset.figmaLabel;
  frame.title='게임랩 초기 UI 프로토타입 · '+label;
  external.href=checkedURL(selected.dataset.figmaHref,'www.figma.com');
  external.setAttribute('aria-label','Figma에서 '+label+' 크게 재생');
  if(started) frame.src=checkedURL(selected.dataset.figmaSrc,'embed.figma.com');
 }
 buttons.forEach(button=>button.addEventListener('click',()=>{
  if(button===selected) return;
  selected=button;showSelected();
 }));
 // 최초 자동 준비에서는 포커스를 빼앗지 않습니다. 직접 재생·재시작할 때만 이동합니다.
 function startPrototype(moveFocus=false){
  started=true;placeholder.hidden=true;frame.hidden=false;resetButton.hidden=false;
  showSelected();
  if(moveFocus) frame.focus();
 }
 loadButton.addEventListener('click',()=>startPrototype(true));
 resetButton.addEventListener('click',()=>{if(started){showSelected();frame.focus();}});
 figmaPlayer.querySelector('[data-figma-controls]').hidden=false;
 loadButton.hidden=false;
 startPrototype();

 const expandButton=figmaPlayer.querySelector('[data-figma-expand]');
 const viewport=figmaPlayer.querySelector('[data-figma-viewport]');
 // 배경 초점을 확실히 차단할 수 없는 환경에서는 기존 외부 재생 링크를 사용합니다.
 if(expandButton&&viewport&&'inert' in document.createElement('div')){
  let expanded=null;
  const buttonText=expandButton.textContent;
  const buttonLabel=expandButton.getAttribute('aria-label');
  const styleNames=['position','top','left','width','overflow'];
  const attributeNames=['role','aria-modal','aria-labelledby'];
  const readStyle=(element,name)=>[element.style.getPropertyValue(name),element.style.getPropertyPriority(name)];
  const restoreStyle=(element,name,[value,priority])=>value?element.style.setProperty(name,value,priority):element.style.removeProperty(name);
  const restoreAttribute=(element,name,value)=>value===null?element.removeAttribute(name):element.setAttribute(name,value);

  // iframe 안의 키 입력은 부모로 전달되지 않아, 프레임을 벗어나는 Tab도 경계에서 돌립니다.
  const guards=['전체 화면 마지막 항목으로 이동','전체 화면 첫 항목으로 이동'].map(label=>{
   const guard=document.createElement('span');
   guard.className='sr-only';guard.tabIndex=0;guard.hidden=true;
   guard.setAttribute('aria-label',label);
   return guard;
  });
  figmaPlayer.prepend(guards[0]);figmaPlayer.append(guards[1]);
  function focusableItems(){
   return [...figmaPlayer.querySelectorAll('button:not([disabled]),a[href],iframe,[tabindex]:not([tabindex="-1"])')]
    .filter(element=>!guards.includes(element)&&element.getClientRects().length>0&&!element.closest('[inert]'));
  }
  guards[0].addEventListener('focus',()=>{if(expanded)(focusableItems().at(-1)||expandButton).focus();});
  guards[1].addEventListener('focus',()=>{if(expanded)(focusableItems()[0]||expandButton).focus();});

  function fitExpanded(){
   if(!expanded)return;
   const bounds=viewport.getBoundingClientRect();
   if(bounds.width<=0||bounds.height<=0)return;
   const width=Math.floor(Math.min(bounds.width,bounds.height*16/9)*100)/100;
   figmaPlayer.style.setProperty('--figma-expanded-width',width+'px');
  }
  const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(fitExpanded):null;

  function openExpanded(){
   if(expanded)return;
   expanded={
    x:window.scrollX,y:window.scrollY,top:figmaPlayer.getBoundingClientRect().top,
    landscape:window.innerWidth>window.innerHeight,
    styles:styleNames.map(name=>readStyle(document.body,name)),
    width:readStyle(figmaPlayer,'--figma-expanded-width'),
    attributes:attributeNames.map(name=>figmaPlayer.getAttribute(name)),
    siblings:[],
   };
   // 플레이어의 조상 자체는 유지하고 각 단계의 형제만 잠가 iframe을 재생 상태 그대로 둡니다.
   for(let branch=figmaPlayer;branch.parentElement&&branch!==document.body;branch=branch.parentElement){
    for(const sibling of branch.parentElement.children){
     if(sibling===branch)continue;
     expanded.siblings.push([sibling,sibling.inert]);sibling.inert=true;
    }
   }
   document.body.style.setProperty('position','fixed');
   document.body.style.setProperty('top',-expanded.y+'px');
   document.body.style.setProperty('left',-expanded.x+'px');
   document.body.style.setProperty('width','100%');
   document.body.style.setProperty('overflow','hidden');
   figmaPlayer.classList.add('is-expanded');
   figmaPlayer.setAttribute('role','dialog');
   figmaPlayer.setAttribute('aria-modal','true');
   figmaPlayer.setAttribute('aria-labelledby','figma-player-title');
   expandButton.setAttribute('aria-expanded','true');
   expandButton.setAttribute('aria-label','전체 화면 닫기');
   expandButton.textContent='전체 화면 닫기 ×';
   guards.forEach(guard=>{guard.hidden=false;});
   sizeObserver?.observe(viewport);
   fitExpanded();
   expandButton.focus({preventScroll:true});
  }

  function closeExpanded(restoreFocus=true){
   if(!expanded)return;
   const saved=expanded;expanded=null;
   sizeObserver?.disconnect();
   figmaPlayer.classList.remove('is-expanded');
   restoreStyle(figmaPlayer,'--figma-expanded-width',saved.width);
   attributeNames.forEach((name,index)=>restoreAttribute(figmaPlayer,name,saved.attributes[index]));
   expandButton.setAttribute('aria-expanded','false');
   restoreAttribute(expandButton,'aria-label',buttonLabel);
   expandButton.textContent=buttonText;
   guards.forEach(guard=>{guard.hidden=true;});
   saved.siblings.forEach(([element,inert])=>{element.inert=inert;});
   styleNames.forEach((name,index)=>restoreStyle(document.body,name,saved.styles[index]));
   const rotated=saved.landscape!==(window.innerWidth>window.innerHeight);
   // 가로 회전으로 화면이 낮아져도 돌아온 플레이어가 화면 아래에 숨지 않게 합니다.
   const anchorTop=Math.min(saved.top,window.innerHeight*0.4);
   const top=rotated?Math.max(0,window.scrollY+figmaPlayer.getBoundingClientRect().top-anchorTop):saved.y;
   // 전역 smooth 스크롤 설정과 무관하게 닫기 전 콘텐츠 위치로 즉시 돌아옵니다.
   const scrollBehavior=readStyle(document.documentElement,'scroll-behavior');
   document.documentElement.style.setProperty('scroll-behavior','auto');
   window.scrollTo({left:saved.x,top,behavior:'auto'});
   restoreStyle(document.documentElement,'scroll-behavior',scrollBehavior);
   if(restoreFocus)expandButton.focus({preventScroll:true});
  }

  expandButton.addEventListener('click',()=>expanded?closeExpanded():openExpanded());
  document.addEventListener('keydown',event=>{
   if(!expanded)return;
   if(event.key==='Escape'){
    event.preventDefault();closeExpanded();return;
   }
   if(event.key!=='Tab')return;
   const items=focusableItems();
   const first=items[0]||expandButton,last=items.at(-1)||expandButton;
   const active=document.activeElement;
   if(!figmaPlayer.contains(active)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last)){
    event.preventDefault();(event.shiftKey?last:first).focus();
   }
  });
  window.addEventListener('resize',fitExpanded);
  window.addEventListener('orientationchange',fitExpanded);
  // 뒤로 돌아온 페이지에 배경 잠금이 남지 않도록 BFCache 진입 전에도 원상 복구합니다.
  window.addEventListener('pagehide',()=>closeExpanded(false));
  expandButton.hidden=false;
 }
}

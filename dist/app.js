const dialog=document.querySelector('#image-dialog');
let imageOpener=null;
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
 imageOpener=button;const image=button.querySelector('img');dialog.classList.remove('is-original');dialog.querySelector('[data-original]').textContent='원본 크기';dialog.querySelector('[data-original]').setAttribute('aria-pressed','false');dialog.querySelector('img').src=image.src;dialog.querySelector('img').alt=image.alt;dialog.querySelector('[data-image-caption]').textContent=button.dataset.caption||image.alt;dialog.showModal();
}));
if(dialog){
 dialog.querySelector('.modal-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-original]').addEventListener('click',event=>{const original=dialog.classList.toggle('is-original');event.currentTarget.textContent=original?'화면에 맞추기':'원본 크기';event.currentTarget.setAttribute('aria-pressed',String(original));});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>imageOpener?.focus());
}
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
function showStatus(message,ms=2500){document.querySelector('.toast')?.remove();const note=document.createElement('div');note.className='toast';note.setAttribute('role','status');note.textContent=message;document.body.append(note);setTimeout(()=>note.remove(),ms)}
document.querySelectorAll('[data-copy-email]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('sudeang_@naver.com');showStatus('이메일 주소를 복사했습니다.')}catch{showStatus('주소를 직접 복사해 주세요: sudeang_@naver.com',6000)}}));

// 프로젝트 메뉴에 머무를 때만 사례 목차를 펼쳐 본문 높이를 확보합니다.
const caseNavigation=document.querySelector('[data-case-navigation]');
if(caseNavigation){
 const panel=caseNavigation.querySelector('[data-case-panel]');
 const toggle=caseNavigation.querySelector('[data-case-toggle]');
 const label=panel?.querySelector('nav')?.getAttribute('aria-label')||'사례 목차';
 const hoverPointer=window.matchMedia('(hover:hover) and (pointer:fine)');
 let expanded=false;
 let closeTimer=0;
 let suppressHover=false;
 if(panel&&toggle){
  function setCaseMenu(open){
   clearTimeout(closeTimer);
   expanded=open;
   caseNavigation.toggleAttribute('data-case-open',open);
   toggle.setAttribute('aria-expanded',String(open));
   toggle.setAttribute('aria-label',label+(open?' 닫기':' 열기'));
   panel.inert=!open;
   panel.setAttribute('aria-hidden',String(!open));
  }
  function hasMenuFocus(){
   const active=document.activeElement;
   return panel.contains(active)||(caseNavigation.contains(active)&&active.matches(':focus-visible'));
  }
  toggle.hidden=false;
  caseNavigation.dataset.caseReady='';
  setCaseMenu(false);
  caseNavigation.addEventListener('pointerenter',event=>{
   clearTimeout(closeTimer);
   if(event.pointerType!=='touch'&&hoverPointer.matches&&!suppressHover)setCaseMenu(true);
  });
  caseNavigation.addEventListener('pointerleave',event=>{
   suppressHover=false;
   if(event.pointerType!=='touch'&&hoverPointer.matches&&!hasMenuFocus())closeTimer=setTimeout(()=>setCaseMenu(false),150);
  });
  caseNavigation.addEventListener('focusin',event=>{
   if(event.target!==toggle)setCaseMenu(true);
  });
  caseNavigation.addEventListener('focusout',event=>{
   if(!caseNavigation.contains(event.relatedTarget))setCaseMenu(false);
  });
  toggle.addEventListener('click',()=>{
   suppressHover=false;
   setCaseMenu(!expanded);
  });
  caseNavigation.addEventListener('keydown',event=>{
   if(event.key!=='Escape'||!expanded)return;
   event.preventDefault();
   suppressHover=true;
   setCaseMenu(false);
   toggle.focus({preventScroll:true});
  });
  panel.addEventListener('click',event=>{
   if(!event.target.closest('a[href^="#"]'))return;
   suppressHover=true;
   setCaseMenu(false);
   toggle.focus({preventScroll:true});
  });
  document.addEventListener('pointerdown',event=>{
   if(!caseNavigation.contains(event.target))setCaseMenu(false);
  });
  hoverPointer.addEventListener('change',()=>setCaseMenu(false));
 }
}

// 사례 목차가 여러 줄로 바뀌어도 이동한 제목이 고정 헤더에 가리지 않게 합니다.
const sectionNavigation=document.querySelector('.goods-subnav, .case-subnav, .design-subnav');
if(sectionNavigation){
 const header=sectionNavigation.closest('.site-header');
 const sections=[...sectionNavigation.querySelectorAll('a[href^="#"]')].map(link=>({link,section:document.getElementById(link.hash.slice(1))})).filter(item=>item.section);
 let headerHeight=0;
 let selectionFrame=null;
 function updateSectionSelection(){
  selectionFrame=null;
  // 고정 메뉴 바로 아래의 읽기 기준선을 통과한 마지막 항목을 표시합니다.
  const readingLine=headerHeight+21;
  let current=null;
  for(const item of sections){
   if(item.section.getBoundingClientRect().top>readingLine)break;
   current=item.link;
  }
  if(!current&&sectionNavigation.classList.contains('design-subnav'))current=sections[0]?.link;
  for(const {link} of sections){
   if(link===current)link.setAttribute('aria-current','location');
   else link.removeAttribute('aria-current');
  }
 }
 function scheduleSectionSelection(){
  if(selectionFrame===null)selectionFrame=requestAnimationFrame(updateSectionSelection);
 }
 function measureSectionHeader(){
  headerHeight=Math.ceil(header?.getBoundingClientRect().height||0);
  document.documentElement.style.setProperty('--section-header-height',`${headerHeight}px`);
  document.documentElement.style.setProperty('--goods-header-height',`${headerHeight}px`);
  scheduleSectionSelection();
 }
 measureSectionHeader();
 const sectionLayoutObserver=new ResizeObserver(measureSectionHeader);
 if(header)sectionLayoutObserver.observe(header);
 sections.forEach(({section})=>sectionLayoutObserver.observe(section));
 window.addEventListener('scroll',scheduleSectionSelection,{passive:true});
 window.addEventListener('hashchange',scheduleSectionSelection);
 window.addEventListener('pageshow',scheduleSectionSelection);
 document.fonts?.ready.then(scheduleSectionSelection);
}

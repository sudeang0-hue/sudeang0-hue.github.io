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

// 굿즈 하위 메뉴가 여러 줄로 바뀌어도 이동한 제목이 고정 헤더에 가리지 않게 합니다.
const goodsNavigation=document.querySelector('.goods-subnav');
if(goodsNavigation){
 const header=goodsNavigation.closest('.site-header');
 const sections=[...goodsNavigation.querySelectorAll('a[href^="#"]')].map(link=>({link,section:document.getElementById(link.hash.slice(1))})).filter(item=>item.section);
 let headerHeight=0;
 let selectionFrame=null;
 function updateGoodsSelection(){
  selectionFrame=null;
  // 고정 메뉴 바로 아래의 읽기 기준선을 통과한 마지막 항목을 표시합니다.
  const readingLine=headerHeight+21;
  let current=null;
  for(const item of sections){
   if(item.section.getBoundingClientRect().top>readingLine)break;
   current=item.link;
  }
  for(const {link} of sections){
   if(link===current)link.setAttribute('aria-current','location');
   else link.removeAttribute('aria-current');
  }
 }
 function scheduleGoodsSelection(){
  if(selectionFrame===null)selectionFrame=requestAnimationFrame(updateGoodsSelection);
 }
 function measureGoodsHeader(){
  headerHeight=Math.ceil(header?.getBoundingClientRect().height||0);
  document.documentElement.style.setProperty('--goods-header-height',`${headerHeight}px`);
  scheduleGoodsSelection();
 }
 measureGoodsHeader();
 const goodsLayoutObserver=new ResizeObserver(measureGoodsHeader);
 if(header)goodsLayoutObserver.observe(header);
 sections.forEach(({section})=>goodsLayoutObserver.observe(section));
 window.addEventListener('scroll',scheduleGoodsSelection,{passive:true});
 window.addEventListener('hashchange',scheduleGoodsSelection);
 window.addEventListener('pageshow',scheduleGoodsSelection);
 document.fonts?.ready.then(scheduleGoodsSelection);
}

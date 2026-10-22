// PC는 두 종류, 모바일은 한 종류의 전후 화면을 함께 넘깁니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root=>{
 const tracks=[...root.querySelectorAll('[data-comparison-track]')];
 const viewports=[...root.querySelectorAll('[data-comparison-viewport]')];
 const controls=root.querySelector('[data-comparison-controls]');
 const observations=[...root.querySelectorAll('[data-comparison-note]')];
 const status=root.querySelector('[data-comparison-status]');
 const count=root.querySelector('[data-comparison-count]');
 const length=tracks[0]?.children.length??0;
 if(tracks.length!==2||!length||tracks[1].children.length!==length||!controls||!status||!count)return;
 let index=0;
 let anchor=0;
 let visible=window.matchMedia('(max-width:640px)').matches?1:2;
 let drag=null;
 let resizeFrame=0;
 let suppressClickUntil=0;
 const pageCount=()=>Math.ceil(length/visible);
 function showPage(value,announce=true,instant=false,preserveAnchor=false){
  const pages=pageCount();
  const page=(value%pages+pages)%pages;
  const wrapped=value<0||value>=pages;
  index=page*visible;
  if(!preserveAnchor)anchor=index;
  const shownCount=Math.min(visible,length-index);
  root.dataset.comparisonIndex=String(index);
  root.dataset.comparisonVisible=String(shownCount);
  root.dataset.comparisonCapacity=String(visible);
  tracks.forEach(track=>{
   track.style.transitionDuration=wrapped||instant?'0s':'';
   const slides=[...track.children];
   const offset=slides[index].offsetLeft-slides[0].offsetLeft;
   track.style.transform=`translateX(${-offset}px)`;
   slides.forEach((slide,i)=>{
    const shown=i>=index&&i<index+visible;
    slide.inert=!shown;
    slide.setAttribute('aria-hidden',String(!shown));
    slide.setAttribute('role','group');
    slide.setAttribute('aria-label',`${i+1} / ${length} · ${slide.dataset.comparisonTitle}`);
    if(shown){const image=slide.querySelector('img');if(image)image.loading='eager';}
   });
  });
  observations.forEach((note,i)=>note.hidden=i<index||i>=index+visible);
  count.textContent=`${index+1}${shownCount>1?'–'+(index+shownCount):''} / ${length}`;
  if(announce)status.textContent=[...tracks[0].children].slice(index,index+visible).map(slide=>slide.dataset.comparisonTitle).join(' · ')+' 비교';
 }
 root.querySelector('[data-comparison-prev]')?.addEventListener('click',()=>showPage(Math.floor(index/visible)-1));
 root.querySelector('[data-comparison-next]')?.addEventListener('click',()=>showPage(Math.floor(index/visible)+1));
 viewports.forEach(viewport=>{
  viewport.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   event.preventDefault();
   if(event.target!==viewport)viewport.focus({preventScroll:true});
   showPage(event.key==='Home'?0:event.key==='End'?pageCount()-1:Math.floor(index/visible)+(event.key==='ArrowRight'?1:-1));
  });
  viewport.addEventListener('pointerdown',event=>{
   if(!event.isPrimary||event.button!==0||event.target.closest('figcaption'))return;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,viewport,captured:false};
  });
  viewport.addEventListener('dragstart',event=>event.preventDefault());
  viewport.addEventListener('click',event=>{
   if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
 });
 window.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.captured&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}
  if(!drag.captured&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.25){
   drag.captured=true;
   drag.viewport.setPointerCapture(event.pointerId);
  }
 },{passive:true});
 function release(event){
  if(!drag||event.pointerId!==drag.id)return;
  const gesture=drag;
  drag=null;
  if(gesture.viewport.hasPointerCapture(gesture.id))gesture.viewport.releasePointerCapture(gesture.id);
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  const threshold=Math.max(32,Math.min(60,gesture.viewport.clientWidth*.12));
  const swiped=event.type!=='pointercancel'&&Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)*1.25;
  if(gesture.captured||swiped)suppressClickUntil=performance.now()+350;
  if(swiped)showPage(Math.floor(index/visible)+(dx<0?1:-1));
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 window.addEventListener('resize',()=>{
  if(resizeFrame)cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{
   resizeFrame=0;
   visible=window.matchMedia('(max-width:640px)').matches?1:2;
   // 이동 중 폭이 바뀌어도 기존 화면이 포함된 묶음을 보여줍니다.
   showPage(Math.floor(anchor/visible),false,true,true);
  });
 });
 controls.hidden=false;
 root.dataset.ready='';
 showPage(0,false);
});

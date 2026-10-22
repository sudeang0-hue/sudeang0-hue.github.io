// 위 Before와 아래 After를 같은 화면 종류로 함께 넘깁니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root=>{
 const tracks=[...root.querySelectorAll('[data-comparison-track]')];
 const viewports=[...root.querySelectorAll('[data-comparison-viewport]')];
 const controls=root.querySelector('[data-comparison-controls]');
 const selectors=[...root.querySelectorAll('[data-comparison-select]')];
 const observations=[...root.querySelectorAll('[data-comparison-note]')];
 const status=root.querySelector('[data-comparison-status]');
 const count=root.querySelector('[data-comparison-count]');
 if(tracks.length!==2||!selectors.length||!controls||!status||!count)return;
 let index=0;
 let drag=null;
 let suppressClickUntil=0;
 const length=selectors.length;
 const wrap=value=>(value+length)%length;
 function show(value,announce=true){
  const next=wrap(value);
  const wrapped=Math.abs(next-index)>1;
  index=next;
  root.dataset.comparisonIndex=String(index);
  tracks.forEach(track=>{
   track.style.transitionDuration=wrapped?'0s':'';
   track.style.transform=`translateX(${-index*100}%)`;
   [...track.children].forEach((slide,i)=>{
    slide.inert=i!==index;
    slide.setAttribute('aria-hidden',String(i!==index));
    slide.setAttribute('role','group');
    slide.setAttribute('aria-label',`${i+1} / ${length}`);
   });
   const image=track.children[index]?.querySelector('img');
   if(image)image.loading='eager';
  });
  selectors.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  observations.forEach((note,i)=>note.hidden=i!==index);
  count.textContent=`${index+1} / ${length} · ${selectors[index].textContent}`;
  if(announce)status.textContent=`${selectors[index].textContent} · 위 Before, 아래 After 표시`;
 }
 selectors.forEach((button,i)=>button.addEventListener('click',()=>show(i)));
 root.querySelector('[data-comparison-prev]')?.addEventListener('click',()=>show(index-1));
 root.querySelector('[data-comparison-next]')?.addEventListener('click',()=>show(index+1));
 viewports.forEach(viewport=>{
  viewport.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   event.preventDefault();
   if(event.target!==viewport)viewport.focus({preventScroll:true});
   show(event.key==='Home'?0:event.key==='End'?length-1:index+(event.key==='ArrowRight'?1:-1));
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
  if(swiped)show(index+(dx<0?1:-1));
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 controls.hidden=false;
 root.dataset.ready='';
 show(0,false);
});

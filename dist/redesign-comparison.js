// PC는 두 종류, 모바일은 한 종류를 보여주며 마지막 다음에 첫 화면을 이어 붙입니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root=>{
 const tracks=[...root.querySelectorAll('[data-comparison-track]')];
 const viewports=[...root.querySelectorAll('[data-comparison-viewport]')];
 const controls=root.querySelector('[data-comparison-controls]');
 const observations=[...root.querySelectorAll('[data-comparison-note]')];
 const status=root.querySelector('[data-comparison-status]');
 const count=root.querySelector('[data-comparison-count]');
 const originals=tracks[0]?[...tracks[0].children].filter(slide=>!slide.hasAttribute('data-comparison-copy')):[];
 const length=originals.length;
 if(tracks.length!==2||!length||!controls||!status||!count)return;
 if(tracks.some(track=>[...track.children].filter(slide=>!slide.hasAttribute('data-comparison-copy')).length!==length))return;
 // 복사 화면도 HTML 생성 단계에서 두어 기존 이미지 확대 이벤트를 그대로 연결합니다.
 tracks.forEach(track=>track.querySelectorAll('[data-comparison-copy]').forEach(slide=>slide.hidden=false));
 let index=0;
 let visible=window.matchMedia('(max-width:640px)').matches?1:2;
 let drag=null;
 let resizeFrame=0;
 let suppressClickUntil=0;
 function showScreen(value,announce=true,instant=false){
  const wrapped=value<0||value>=length;
  index=(value%length+length)%length;
  const shownCount=Math.min(visible,length);
  const shownIndices=Array.from({length:shownCount},(_,offset)=>(index+offset)%length);
  root.dataset.comparisonIndex=String(index);
  root.dataset.comparisonVisible=String(shownCount);
  root.dataset.comparisonCapacity=String(visible);
  tracks.forEach(track=>{
   track.style.transitionDuration=wrapped||instant?'0s':'';
   const slides=[...track.children];
   const offset=slides[index].offsetLeft-slides[0].offsetLeft;
   track.style.transform=`translateX(${-offset}px)`;
   slides.forEach((slide,i)=>{
    const shown=i>=index&&i<index+shownCount;
    const source=Number(slide.dataset.comparisonSource);
    slide.inert=!shown;
    slide.setAttribute('aria-hidden',String(!shown));
    slide.setAttribute('role','group');
    slide.setAttribute('aria-label',`${source+1} / ${length} · ${slide.dataset.comparisonTitle}`);
    if(shown){const image=slide.querySelector('img');if(image)image.loading='eager';}
   });
  });
  observations.forEach((note,i)=>note.hidden=!shownIndices.includes(i));
  // 사진과 설명의 화면·읽기 순서를 함께 맞춥니다.
  shownIndices.forEach(i=>{const note=observations[i];if(note)note.parentElement.appendChild(note);});
  count.textContent=(shownCount===1?String(index+1):index+shownCount<=length?`${index+1}–${index+shownCount}`:shownIndices.map(i=>i+1).join(' · '))+` / ${length}`;
  if(announce)status.textContent=shownIndices.map(i=>originals[i].dataset.comparisonTitle).join(' · ')+' 비교';
 }
 root.querySelector('[data-comparison-prev]')?.addEventListener('click',()=>showScreen(index-1));
 root.querySelector('[data-comparison-next]')?.addEventListener('click',()=>showScreen(index+1));
 viewports.forEach(viewport=>{
  viewport.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   event.preventDefault();
   if(event.target!==viewport)viewport.focus({preventScroll:true});
   showScreen(event.key==='Home'?0:event.key==='End'?length-1:index+(event.key==='ArrowRight'?1:-1));
  });
  viewport.addEventListener('pointerdown',event=>{
   if(!event.isPrimary||event.button!==0)return;
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
  if(swiped)showScreen(index+(dx<0?1:-1));
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 window.addEventListener('resize',()=>{
  if(resizeFrame)cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{
   resizeFrame=0;
   visible=window.matchMedia('(max-width:640px)').matches?1:2;
   // 화면 폭이 바뀌어도 현재 첫 화면은 그대로 유지합니다.
   showScreen(index,false,true);
  });
 });
 controls.hidden=false;
 root.dataset.ready='';
 showScreen(0,false);
});

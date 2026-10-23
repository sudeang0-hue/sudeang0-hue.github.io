// 논리 화면 번호와 복사본을 포함한 위치를 나눠 양쪽 경계를 같은 속도로 넘깁니다.
document.querySelectorAll('[data-redesign-comparison]').forEach(root=>{
 const tracks=[...root.querySelectorAll('[data-comparison-track]')];
 const viewports=[...root.querySelectorAll('[data-comparison-viewport]')];
 const controls=root.querySelector('[data-comparison-controls]');
 const observations=[...root.querySelectorAll('[data-comparison-note]')];
 const status=root.querySelector('[data-comparison-status]');
 const count=root.querySelector('[data-comparison-count]');
 const originals=tracks[0]?[...tracks[0].children].filter(slide=>!slide.hasAttribute('data-comparison-copy')):[];
 const length=originals.length;
 const prefix=tracks[0]?[...tracks[0].children].findIndex(slide=>!slide.hasAttribute('data-comparison-copy')):0;
 if(tracks.length!==2||!length||!controls||!status||!count)return;
 if(tracks.some(track=>[...track.children].filter(slide=>!slide.hasAttribute('data-comparison-copy')).length!==length))return;
 // 정적으로 만든 복사본에도 기존 이미지 확대 이벤트가 연결됩니다.
 tracks.forEach(track=>track.querySelectorAll('[data-comparison-copy]').forEach(slide=>slide.hidden=false));
 const motion=window.matchMedia('(prefers-reduced-motion:reduce)');
 const FINISH_FALLBACK_MS=500;
 let index=0;
 let position=prefix;
 let visible=window.matchMedia('(max-width:640px)').matches?1:2;
 let moving=false;
 let pendingSteps=0;
 let finishTimer=0;
 let generation=0;
 let startedAt=0;
 let drag=null;
 let resizeFrame=0;
 let suppressClickUntil=0;
 const wrap=value=>(value%length+length)%length;
 function render(announce=false,instant=false){
  const shownCount=Math.min(visible,length);
  const shownIndices=Array.from({length:shownCount},(_,offset)=>(index+offset)%length);
  // 복사본 정렬로 현재 포커스가 가려지면 같은 화면의 버튼이나 보기 영역으로 옮깁니다.
  const focused=tracks.map(track=>[...track.children].find(slide=>slide.contains(document.activeElement)));
  root.dataset.comparisonIndex=String(index);
  root.dataset.comparisonPosition=String(position);
  root.dataset.comparisonVisible=String(shownCount);
  root.dataset.comparisonCapacity=String(visible);
  root.dataset.comparisonAnimating=String(moving);
  tracks.forEach((track,side)=>{
   track.style.transitionDuration=instant?'0s':'';
   const slides=[...track.children];
   const offset=slides[position].offsetLeft-slides[0].offsetLeft;
   track.style.transform=`translateX(${-offset}px)`;
   slides.forEach((slide,i)=>{
    const shown=i>=position&&i<position+shownCount;
    const source=Number(slide.dataset.comparisonSource);
    slide.inert=!shown;
    slide.setAttribute('aria-hidden',String(!shown));
    slide.setAttribute('role','group');
    slide.setAttribute('aria-label',`${source+1} / ${length} · ${slide.dataset.comparisonTitle}`);
    if(shown){const image=slide.querySelector('img');if(image)image.loading='eager';}
   });
   const oldFocus=focused[side];
   if(oldFocus?.inert){
    const equivalent=slides.find(slide=>!slide.inert&&slide.dataset.comparisonSource===oldFocus.dataset.comparisonSource);
    (equivalent?.querySelector('button')??viewports[side]).focus({preventScroll:true});
   }
  });
  observations.forEach((note,i)=>note.hidden=!shownIndices.includes(i));
  shownIndices.forEach(i=>{const note=observations[i];if(note)note.parentElement.appendChild(note);});
  count.textContent=`${index+1} / ${length}`;
  if(announce)status.textContent=shownIndices.map(i=>originals[i].dataset.comparisonTitle).join(' · ')+' 비교';
 }
 function clearFinish(){
  if(finishTimer)clearTimeout(finishTimer);
  finishTimer=0;
 }
 function finish(token){
  if(!moving||token!==generation)return;
  clearFinish();
  moving=false;
  // 경계 이동을 마친 뒤 동일한 그림의 원본 위치로만 즉시 정렬합니다.
  position=prefix+index;
  render(false,true);
  void tracks[0].offsetWidth;
  pump();
 }
 function pump(){
  while(!moving&&pendingSteps){
   const direction=Math.sign(pendingSteps);
   pendingSteps-=direction;
   index=wrap(index+direction);
   if(motion.matches){
    position=prefix+index;
    render(true,true);
    continue;
   }
   position+=direction;
   moving=true;
   const token=++generation;
   startedAt=performance.now();
   render(true,false);
   finishTimer=setTimeout(()=>finish(token),FINISH_FALLBACK_MS);
  }
 }
 function move(direction){
  if(length<2)return;
  pendingSteps+=direction;
  pump();
 }
 function jump(value,announce=true){
  generation++;
  clearFinish();
  moving=false;
  pendingSteps=0;
  index=wrap(value);
  position=prefix+index;
  render(announce,true);
  void tracks[0].offsetWidth;
 }
 tracks[0].addEventListener('transitionend',event=>{
  if(event.target!==tracks[0]||event.propertyName!=='transform'||event.timeStamp<startedAt)return;
  finish(generation);
 });
 root.querySelector('[data-comparison-prev]')?.addEventListener('click',()=>move(-1));
 root.querySelector('[data-comparison-next]')?.addEventListener('click',()=>move(1));
 viewports.forEach(viewport=>{
  viewport.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
   event.preventDefault();
   if(event.target!==viewport)viewport.focus({preventScroll:true});
   if(event.key==='Home'||event.key==='End')jump(event.key==='Home'?0:length-1);
   else move(event.key==='ArrowRight'?1:-1);
  });
  viewport.addEventListener('pointerdown',event=>{
   if(!event.isPrimary||event.button!==0)return;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,viewport,captured:false};
  });
  viewport.addEventListener('dragstart',event=>event.preventDefault());
  viewport.addEventListener('click',event=>{
   if(moving||performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
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
  if(swiped)move(dx<0?1:-1);
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 window.addEventListener('resize',()=>{
  if(resizeFrame)cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{
   resizeFrame=0;
   visible=window.matchMedia('(max-width:640px)').matches?1:2;
   // 크기 변경 중 대기한 입력까지 정산하고 같은 논리 화면에서 다시 배치합니다.
   jump(index+pendingSteps,false);
  });
 });
 motion.addEventListener('change',()=>jump(index+pendingSteps,false));
 controls.hidden=false;
 root.dataset.ready='';
 jump(0,false);
});

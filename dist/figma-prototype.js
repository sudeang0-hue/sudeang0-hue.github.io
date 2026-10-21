// 초기 프로토타입의 시작점을 전환합니다. 실제 게임 로직은 실행하지 않습니다.
const figmaPlayer=document.querySelector('[data-figma-player]');
if(figmaPlayer){
 const frame=figmaPlayer.querySelector('[data-figma-frame]');
 const placeholder=figmaPlayer.querySelector('[data-figma-placeholder]');
 const loadButton=figmaPlayer.querySelector('[data-figma-load]');
 const resetButton=figmaPlayer.querySelector('[data-figma-reset]');
 const status=figmaPlayer.querySelector('[data-figma-status]');
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
  status.textContent=label+' · '+selected.dataset.figmaDescription;
  if(started) frame.src=checkedURL(selected.dataset.figmaSrc,'embed.figma.com');
 }
 buttons.forEach(button=>button.addEventListener('click',()=>{
  if(button===selected) return;
  selected=button;showSelected();
 }));
 loadButton.addEventListener('click',()=>{
  started=true;placeholder.hidden=true;frame.hidden=false;resetButton.hidden=false;
  showSelected();frame.focus();
 });
 resetButton.addEventListener('click',()=>{if(started){showSelected();frame.focus();}});
 figmaPlayer.querySelector('[data-figma-controls]').hidden=false;
 loadButton.hidden=false;
 showSelected();
}

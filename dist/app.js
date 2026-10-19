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

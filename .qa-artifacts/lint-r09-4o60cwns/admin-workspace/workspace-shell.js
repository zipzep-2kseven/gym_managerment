(() => {
  const shell=document.querySelector('.management-shell'),sidebar=document.getElementById('sidebar');
  const main=document.querySelector('.workspace'),bar=document.querySelector('.review-bar'),open=document.getElementById('open-menu');
  const close=returnFocus=>{shell.classList.remove('menu-open');document.body.classList.remove('drawer-open');main.inert=false;bar.inert=false;open.setAttribute('aria-expanded','false');if(returnFocus)open.focus();};
  open.onclick=()=>{shell.classList.add('menu-open');document.body.classList.add('drawer-open');main.inert=true;bar.inert=true;open.setAttribute('aria-expanded','true');document.getElementById('close-menu').focus();};
  document.getElementById('close-menu').onclick=()=>close(true);
  document.getElementById('scrim').onclick=()=>close(true);
  document.addEventListener('keydown',e=>{
    if(!shell.classList.contains('menu-open'))return;
    if(e.key==='Escape'){e.preventDefault();close(true);}
    if(e.key==='Tab'){
      const nodes=[...sidebar.querySelectorAll('button,a[href]')].filter(n=>n.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  sidebar.onclick=e=>{const a=e.target.closest('a');if(!a)return;if(a.hasAttribute('aria-disabled')){e.preventDefault();return;}close(false);};
  matchMedia('(min-width:768px)').addEventListener('change',e=>{if(e.matches&&shell.classList.contains('menu-open')){close(false);document.getElementById('reload')?.focus();}});
})();

(() => {
  const fixtures=window.AdminPilotFixtures, view=window.AdminPilotView;
  const $=selector=>document.querySelector(selector);
  const results=$('#results'), feedback=$('#feedback'), shell=$('.management-shell');
  let server=[],visible=[],filters={search:'',role:'',status:'',page:1},confirm=null,needsReload=new Set(),scenario='default',getState='ready',epoch=0;
  const focusTarget = id => {
    const target=id?document.querySelector(`[data-action="open"][data-id="${id}"]`):null;
    (target&&!target.disabled?target:$('#reload')).focus();
  };
  const filtered = () => visible.filter(row=>(!filters.role||row.roles.includes(filters.role)) && (!filters.status||row.status===filters.status)
    && (!filters.search||`${row.profile?.full_name||''} ${row.email}`.toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi'))));
  const draw = () => {
    shell.classList.toggle('permission',getState==='permission');
    $('#filters').hidden=getState==='permission';$('.page-header').hidden=getState==='permission';
    $('.skip-link').href=getState==='permission'?'#permission-title':'#page-title';
    $('#reload').disabled=!!confirm?.pending;
    $('#filters').querySelectorAll('input,select,button').forEach(n=>n.disabled=!!confirm?.pending);
    results.removeAttribute('aria-busy');
    if(getState==='permission') { results.innerHTML='<h1 id="permission-title" tabindex="-1">Quyền truy cập đã thay đổi</h1>'+view.message('Không thể tiếp tục truy cập quản trị','Danh sách tài khoản đã được ẩn. Hãy xác thực lại phiên và tiếp tục theo quyền hiện tại.','warning'); return; }
    if(getState==='loading') { results.setAttribute('aria-busy','true'); results.innerHTML=view.loading(); return; }
    if(getState==='error') { results.innerHTML=view.message('Không tải được danh sách tài khoản','Bộ lọc được giữ nguyên. Tải lại danh sách để tiếp tục.','error','<button data-action="retry">Thử tải lại</button>'); return; }
    const data=filtered();results.innerHTML=view.list(data.slice((filters.page-1)*20,filters.page*20),data.length,filters.page,confirm,needsReload);
  };
  const tell = (title,detail='',kind='info') => { feedback.innerHTML=view.message(title,detail,kind); };
  const clearTell = () => { feedback.innerHTML=''; };
  const reload = async (afterWrite=false,targetId=null) => {
    const requestEpoch=epoch;
    const reloadButton=$('#reload');reloadButton.disabled=true;reloadButton.textContent='Đang tải…';
    if(!afterWrite)tell('Đang cập nhật danh sách','Dữ liệu hiển thị là lần tải gần nhất.');
    await new Promise(resolve=>setTimeout(resolve,500));
    if(requestEpoch!==epoch)return;
    visible=structuredClone(server);getState='ready';confirm=null;needsReload.clear();
    const max=Math.max(1,Math.ceil(filtered().length/20));const clamped=filters.page>max;filters.page=Math.min(filters.page,max);
    reloadButton.disabled=false;reloadButton.textContent='Tải lại danh sách';draw();
    if(clamped)tell('Đã chuyển về trang '+filters.page,(afterWrite?'Đã cập nhật trạng thái tài khoản. ':'')+'Danh sách đã thay đổi. Bộ lọc hiện tại được giữ nguyên.');
    else if(!afterWrite)clearTell();
    if(afterWrite)focusTarget(targetId);
  };
  const openConfirm = id => {
    if(confirm?.pending||needsReload.has(id))return;
    const row=visible.find(x=>x.user_id===id);if(!row||row.roles.includes('ADMIN'))return;
    confirm={id,next:row.status==='ACTIVE'?'SUSPENDED':'ACTIVE',expected_updated_at:row.updated_at,pending:false,error:''};
    draw();document.querySelector(`[data-confirm="${id}"] h3`).focus();
  };
  const save = async () => {
    if(!confirm||confirm.pending||confirm.error)return;
    const requestEpoch=epoch,target={...confirm};confirm.pending=true;draw();document.querySelector(`[data-confirm="${target.id}"] h3`).focus();
    await new Promise(resolve=>setTimeout(resolve,900));
    if(requestEpoch!==epoch)return;
    const row=server.find(x=>x.user_id===target.id);
    const errorMessages={conflict:'Dữ liệu tài khoản đã thay đổi.',unknown:'Chưa xác định được kết quả cập nhật.',validation:'Không thể cập nhật trạng thái.',gone:'Tài khoản không còn tồn tại.',protected:'Tài khoản hiện có quyền Admin và được bảo vệ.'};
    if(scenario==='gone')server=server.filter(x=>x.user_id!==target.id);
    else if(scenario==='protected'){row.roles=[...row.roles,'ADMIN'];row.updated_at='2026-10-11T01:00:00.000Z';}
    else if(scenario==='conflict'){row.status='SUSPENDED';row.updated_at='2026-10-11T01:00:00.000Z';}
    else if(!errorMessages[scenario]||scenario==='unknown'){row.status=target.next;row.updated_at='2026-10-11T02:00:00.000Z';}
    if(errorMessages[scenario]) { confirm={...target,pending:false,error:errorMessages[scenario]};needsReload.add(target.id);draw();document.querySelector(`[data-confirm="${target.id}"] [role="alert"]`).setAttribute('tabindex','-1');document.querySelector(`[data-confirm="${target.id}"] [role="alert"]`).focus();return; }
    confirm=null;tell('Đã cập nhật trạng thái tài khoản.','','success');
    if(scenario==='save-read-error'){getState='error';draw();tell('Đã cập nhật trạng thái tài khoản.','Thao tác đã được lưu; danh sách chưa tải lại được.','success');$('#reload').focus();return;}
    await reload(true,target.id);
  };
  const reset = () => {
    epoch++;closeMenu();server=scenario==='paging'?fixtures.paging():fixtures.defaults();visible=structuredClone(server);
    if(scenario==='inactive'){server[1].status='INACTIVE';server[1].roles=[];server[1].active_gym_assignments=[];visible=structuredClone(server);}
    filters={search:'',role:'',status:scenario==='paging'?'ACTIVE':'',page:scenario==='paging'?2:1};
    if(scenario==='empty')filters.search='khong-co-ket-qua';
    $('#search').value=filters.search;$('#role').value=filters.role;$('#status').value=filters.status;
    $('#reload').disabled=false;$('#reload').textContent='Tải lại danh sách';confirm=null;needsReload.clear();clearTell();
    getState=scenario==='loading'?'loading':scenario==='get-error'?'error':scenario==='permission'?'permission':'ready';draw();
  };
  const apply = () => { if(confirm?.pending)return;filters.page=1;confirm=null;getState='ready';clearTell();draw(); };
  $('#filters').addEventListener('submit',event=>{event.preventDefault();if(confirm?.pending)return;filters.search=$('#search').value.trim();apply();});
  $('#role').addEventListener('change',event=>{if(confirm?.pending){event.target.value=filters.role;return;}filters.role=event.target.value;apply();});
  $('#status').addEventListener('change',event=>{if(confirm?.pending){event.target.value=filters.status;return;}filters.status=event.target.value;apply();});
  $('#reload').addEventListener('click',()=>{if(!confirm?.pending)void reload();});
  results.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    const {action,id}=button.dataset;
    if(action==='open')openConfirm(id);
    if(action==='confirm')void save();
    if(action==='cancel'&&!confirm?.pending){confirm=null;draw();focusTarget(id);}
    if(action==='retry')void reload();
    if(['prev','next'].includes(action)&&!confirm?.pending){filters.page+=action==='prev'?-1:1;confirm=null;draw();$('#results .total').setAttribute('tabindex','-1');$('#results .total').focus();}
  });
  $('#scenario').addEventListener('change',event=>{scenario=event.target.value;reset();});$('#reset').addEventListener('click',reset);
  document.addEventListener('click',event=>{const disabled=event.target.closest('[aria-disabled="true"]');if(disabled)event.preventDefault();});
  let menuReturn=null;
  const closeMenu = () => {
    const wasOpen=shell.classList.contains('menu-open');shell.classList.remove('menu-open');document.body.classList.remove('drawer-open');
    $('#sidebar').removeAttribute('role');$('#sidebar').removeAttribute('aria-modal');$('#open-menu').setAttribute('aria-expanded','false');
    $('.workspace').inert=false;$('.review-bar').inert=false;if(wasOpen&&menuReturn){if(menuReturn.getClientRects().length)menuReturn.focus();else $('#reload').focus();}
  };
  const openMenu = () => {
    menuReturn=document.activeElement;shell.classList.add('menu-open');document.body.classList.add('drawer-open');
    $('#sidebar').setAttribute('role','dialog');$('#sidebar').setAttribute('aria-modal','true');$('#open-menu').setAttribute('aria-expanded','true');
    $('.workspace').inert=true;$('.review-bar').inert=true;$('#close-menu').focus();
  };
  $('#open-menu').addEventListener('click',openMenu);$('#close-menu').addEventListener('click',closeMenu);$('#scrim').addEventListener('click',closeMenu);
  document.addEventListener('keydown',event=>{
    if(!shell.classList.contains('menu-open'))return;
    if(event.key==='Escape'){event.preventDefault();closeMenu();return;}
    if(event.key!=='Tab')return;
    const nodes=[...$('#sidebar').querySelectorAll('button,a')].filter(n=>!n.disabled);
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  matchMedia('(min-width:768px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
  reset();
})();

window.AdminWorkspace = (() => {
  const f=AdminWorkspaceFixtures,v=AdminWorkspaceView,forms=AdminWorkspaceForms;
  const s={data:f.seed(false),scenario:'default',search:'',draft:'',status:'',page:1,mode:'assign',confirm:null,credential:null,created:null,pending:false,blocked:false};
  let lastBody=null;
  const route=()=>{const [name='gyms',id]=location.hash.slice(1).split('/');return {name,id,g:s.data.gyms.find(g=>g.gym_id===id)};};
  const feedback=(text,error=false,target='feedback')=>{const el=document.getElementById(target);if(el){el.textContent=text;el.className=error?'error':'info';}};
  const render=()=>{
    const r=route();let html;
    if(s.scenario==='permission')html=v.state('Không có quyền truy cập','Phiên Admin không còn hợp lệ. Cần đăng nhập lại trước khi truy cập.');
    else if(s.scenario==='loading')html=v.state('Đang tải dữ liệu','Vui lòng chờ dữ liệu cơ sở hoặc vai trò.');
    else if(s.scenario==='get-error')html=v.state('Không tải được dữ liệu','Tải lại dữ liệu để tiếp tục.');
    else if(s.scenario==='empty')html=v.state('Không có dữ liệu','Không tìm thấy dữ liệu trong phạm vi đang xem.');
    else if(r.name==='roles')html=v.roles();
    else if(r.name==='gyms'||(r.name==='managers'&&!r.id))html=v.gyms(s,r.name==='managers');
    else if(r.name==='gym-create')html=forms.gym(s,null);
    else if(!r.g)html=v.state('Không tìm thấy cơ sở','Quay lại danh sách cơ sở để chọn lại.');
    else if(r.name==='gym')html=forms.gym(s,r.g);
    else if(r.name==='managers')html=forms.managers(s,r.g);
    else html=v.state('Màn chưa thiết kế','Chọn vai trò, cơ sở hoặc bổ nhiệm Manager.');
    document.getElementById('page').innerHTML=html;
    document.querySelectorAll('.review-bar button,.review-bar select').forEach(el=>el.disabled=false);
    document.querySelector('.sidebar nav').inert=false;
    const shell=document.querySelector('.management-shell');shell.classList.toggle('permission',s.scenario==='permission');
    document.querySelectorAll('.sidebar a').forEach(a=>{a.removeAttribute('aria-current');if(a.hash==='#'+(r.name==='gym'||r.name==='gym-create'?'gyms':r.name))a.setAttribute('aria-current','page');});
    bind();
  };
  const lock=()=>{
    document.querySelectorAll('main button,main input,main select,main textarea,.review-bar button,.review-bar select').forEach(el=>el.disabled=true);
    document.querySelectorAll('main a,.sidebar nav').forEach(el=>el.inert=true);
    const focus=document.getElementById('confirm-title')||document.getElementById('feedback');focus.setAttribute('tabindex','-1');focus.focus();
  };
  const write=async(apply,target='form-error')=>{
    if(s.pending||s.blocked)return;
    s.pending=true;lock();feedback('Đang lưu…');
    await new Promise(resolve=>setTimeout(resolve,650));
    s.pending=false;
    if(s.scenario==='conflict'||s.scenario==='unknown'){
      if(s.scenario==='unknown')apply(false);
      s.blocked=true;
      document.querySelectorAll('.review-bar button,.review-bar select').forEach(el=>el.disabled=false);
      document.getElementById('reload').disabled=false;
      feedback(s.scenario==='unknown'?'Chưa xác định kết quả lưu. Tải lại để kiểm tra cơ sở và phân công; mật khẩu tạm không thể lấy lại bằng cách gửi lại.':'Dữ liệu đã thay đổi hoặc phân công không hợp lệ. Tải lại dữ liệu trước khi tiếp tục.',true,target);
      document.getElementById(target)?.setAttribute('tabindex','-1');document.getElementById(target)?.focus();return;
    }
    apply(true);s.confirm=null;render();feedback('Đã lưu thay đổi.');document.getElementById('page-title').focus();
  };
  const formBody=form=>Object.fromEntries([...new FormData(form)].map(([k,value])=>[k,String(value).trim()||null]));
  const createOrEdit=event=>{
    event.preventDefault();const body=formBody(event.currentTarget),r=route();
    if(!body.gym_name||!body.address||(!r.g&&(!body.manager_full_name||body.manager_full_name.length<2)))return feedback('Tên cơ sở, địa chỉ và tên Manager cần có nội dung hợp lệ.',true,'form-error');
    if(!r.g&&s.data.users.some(u=>u.email===body.manager_email.toLowerCase()))return feedback('Email Manager đã được sử dụng. Kiểm tra tài khoản trước khi tạo cơ sở.',true,'form-error');
    const gymBody=Object.fromEntries([...forms.fields.map(x=>x[0]),'description'].map(k=>[k,body[k]]));
    if(gymBody.email)gymBody.email=gymBody.email.toLowerCase();
    lastBody=r.g?Object.fromEntries(Object.entries(gymBody).filter(([k,value])=>value!==(r.g[k]??null))):{...gymBody,manager:{full_name:body.manager_full_name,email:body.manager_email.toLowerCase(),phone:body.manager_phone}};
    if(r.g&&Object.keys(lastBody).length===0)return feedback('Thông tin chưa thay đổi.');
    write(handoff=>{
      if(r.g)Object.assign(r.g,lastBody);
      else{
        const g={...gymBody,gym_id:f.id(s.data.gyms.length+1),status:'ACTIVE'};s.data.gyms.push(g);s.created=g.gym_id;
        const user_id=f.id(300+s.data.users.length);s.data.users.push({user_id,email:body.manager_email.toLowerCase(),status:'ACTIVE',role:'MANAGER',gym_id:g.gym_id});
        s.data.managers.push({gym_manager_id:f.id(400+s.data.managers.length),gym_id:g.gym_id,user_id,status:'ACTIVE',assigned_at:new Date().toISOString()});
        if(handoff)s.credential={email:body.manager_email.toLowerCase(),hidden:false};
      }
    });
  };
  const assign=event=>{
    event.preventDefault();const body=formBody(event.currentTarget),{g}=route();
    if(s.data.managers.some(m=>m.gym_id===g.gym_id&&m.status==='ACTIVE'))return feedback('Cơ sở đã có Manager. Tải lại phân công.',true,'form-error');
    const user=s.data.users.find(u=>u.user_id===body.user_id);
    if(s.mode==='assign'&&(!user||user.status!=='ACTIVE'||user.role!=='MANAGER'||user.gym_id))return feedback('Tài khoản phải đang hoạt động, có vai trò Manager và chưa quản lý cơ sở khác.',true,'form-error');
    if(s.mode==='provision'&&(!body.full_name||body.full_name.length<2))return feedback('Tên Manager cần từ 2 đến 100 ký tự.',true,'form-error');
    if(s.mode==='provision'&&s.data.users.some(u=>u.email===body.email.toLowerCase()))return feedback('Email đã được sử dụng. Kiểm tra tài khoản trước khi cấp mới.',true,'form-error');
    lastBody=s.mode==='assign'?{user_id:body.user_id}:{gym_id:g.gym_id,...body,email:body.email.toLowerCase()};
    write(handoff=>{
      const target=user||{user_id:f.id(300+s.data.users.length),email:body.email.toLowerCase(),status:'ACTIVE',role:'MANAGER'};
      if(!user)s.data.users.push(target);target.gym_id=g.gym_id;
      const old=s.data.managers.find(m=>m.gym_id===g.gym_id&&m.user_id===target.user_id);
      if(old)Object.assign(old,{status:'ACTIVE',assigned_at:new Date().toISOString()});
      else s.data.managers.push({gym_manager_id:f.id(400+s.data.managers.length),gym_id:g.gym_id,user_id:target.user_id,status:'ACTIVE',assigned_at:new Date().toISOString()});
      if(!user&&handoff)s.credential={email:target.email,hidden:false};
    });
  };
  const confirmSave=()=>{
    const {g}=route();
    if(s.confirm==='gym-status'){
      if(s.scenario==='obligations'&&g.status==='ACTIVE')return feedback('Chưa thể ngừng: 1 thanh toán demo PENDING, 2 thẻ PENDING/ACTIVE, 1 đăng ký PT ACTIVE, 3 lịch PENDING/CONFIRMED. Cần xử lý nghĩa vụ theo luồng hiện hành.',true,'confirm-error');
      lastBody={status:g.status==='ACTIVE'?'INACTIVE':'ACTIVE'};return write(()=>Object.assign(g,lastBody),'confirm-error');
    }
    const m=s.data.managers.find(m=>m.gym_manager_id===s.confirm&&m.gym_id===g.gym_id);
    lastBody={};write(()=>{m.status='INACTIVE';s.data.users.find(u=>u.user_id===m.user_id).gym_id=null;},'confirm-error');
  };
  const bind=()=>{
    document.getElementById('reload')?.addEventListener('click',()=>{s.blocked=false;s.confirm=null;s.credential=null;s.created=null;s.scenario='default';document.getElementById('scenario').value='default';render();feedback('Đã tải lại dữ liệu.');});
    document.getElementById('search')?.addEventListener('input',e=>{s.draft=e.target.value;});
    document.getElementById('filters')?.addEventListener('submit',e=>{e.preventDefault();s.search=document.getElementById('search').value.trim();s.page=1;render();});
    document.getElementById('status')?.addEventListener('change',e=>{s.status=e.target.value;s.page=1;render();});
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{s.page+=Number(b.dataset.page);render();});
    document.getElementById('gym-form')?.addEventListener('submit',createOrEdit);
    document.getElementById('manager-form')?.addEventListener('submit',assign);
    document.getElementById('mode')?.addEventListener('change',e=>{s.mode=e.target.value;s.credential=null;render();document.getElementById('mode').focus();});
    document.getElementById('gym-status')?.addEventListener('click',()=>{s.confirm='gym-status';render();document.getElementById('cancel').focus();});
    document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>{s.confirm=b.dataset.revoke;render();document.getElementById('cancel').focus();});
    document.getElementById('cancel')?.addEventListener('click',()=>{const id=s.confirm;s.confirm=null;render();(id==='gym-status'?document.getElementById(id):document.querySelector(`[data-revoke="${id}"]`))?.focus();});
    document.getElementById('confirm-save')?.addEventListener('click',confirmSave);
    document.getElementById('hide-password')?.addEventListener('click',()=>{s.credential.hidden=true;render();document.getElementById('page-title').focus();});
    document.getElementById('clear-credential')?.addEventListener('click',()=>{s.credential=null;render();document.getElementById('page-title').focus();});
  };
  const reset=()=>{Object.assign(s,{data:f.seed(s.scenario==='paging'),search:'',draft:'',status:'',page:1,confirm:null,credential:null,created:null,blocked:false,mode:'assign'});render();};
  document.getElementById('scenario').onchange=e=>{s.scenario=e.target.value;reset();};
  document.getElementById('reset').onclick=()=>{s.scenario='default';document.getElementById('scenario').value='default';reset();};
  window.addEventListener('hashchange',()=>{s.confirm=null;s.credential=null;s.created=null;s.blocked=false;s.search='';s.draft='';s.status='';s.page=1;s.mode='assign';render();document.getElementById('page-title').focus();});
  render();return {lastBody:()=>lastBody};
})();

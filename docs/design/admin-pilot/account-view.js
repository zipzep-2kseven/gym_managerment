window.AdminPilotView = (() => {
  const {statusLabels,roleLabels} = window.AdminPilotFixtures;
  const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const message = (title, detail, kind='info', extra='') => `<div class="feedback ${kind}"><strong>${escape(title)}</strong>${detail?`<p>${escape(detail)}</p>`:''}${extra}</div>`;
  const consequence = (row,next) => next==='SUSPENDED'
    ? 'Người dùng sẽ không thể truy cập tài khoản. Thẻ hội viên, lịch tập và phân công hiện có vẫn được giữ.'
    : 'Người dùng có thể đăng nhập lại; trạng thái thẻ, lịch tập và yêu cầu đổi mật khẩu được giữ nguyên.';
  const confirmation = (row,confirm) => {
    const target = row.profile?.full_name || row.email;
    const verb = confirm.next==='SUSPENDED'?'Khóa tạm tài khoản':'Mở lại tài khoản';
    const managerHint = confirm.next==='SUSPENDED' && row.active_gym_assignments.some(a=>a.assignment_type==='MANAGER');
    return `<div class="account-confirm" data-confirm="${escape(row.user_id)}">
      <h3 tabindex="-1">${verb} cho ${escape(target)}?</h3><p>${consequence(row,confirm.next)}</p>
      ${managerHint?'<p class="account-meta">Nếu cần người tiếp quản Gym, hãy bổ nhiệm Manager tại màn quản trị Gym.</p>':''}
      <div class="confirm-actions"><button data-action="confirm" data-id="${escape(row.user_id)}" class="${confirm.next==='SUSPENDED'?'danger':'primary'}" ${confirm.pending||confirm.error?'disabled':''}>${confirm.pending?'Đang lưu…':confirm.next==='SUSPENDED'?'Xác nhận khóa':'Xác nhận mở lại'}</button>
      <button data-action="cancel" data-id="${escape(row.user_id)}" ${confirm.pending?'disabled':''}>Hủy thao tác</button></div>
      ${confirm.error?`<div role="alert" class="error"><p>${escape(confirm.error)}</p><p>Tải lại danh sách để kiểm tra trạng thái trước khi thao tác tiếp.</p></div>`:''}</div>`;
  };
  const account = (row,confirm,needsReload,pending) => {
    const protectedAdmin = row.roles.includes('ADMIN');
    const id = escape(row.user_id);
    const statusKind = row.status==='ACTIVE'?'success':row.status==='SUSPENDED'?'warning':'neutral';
    return `<article class="account-row" data-account="${id}"><div class="account-summary">
      <div><h2>${escape(row.profile?.full_name||'Chưa có hồ sơ')}</h2><p class="account-email">${escape(row.email)}</p>${row.phone?`<p class="account-meta">${escape(row.phone)}</p>`:''}<p class="account-meta">Tạo ngày 01/10/2026</p></div>
      <div class="account-context"><strong>${escape(row.roles.map(r=>roleLabels[r]||r).join(', ')||'Chưa có vai trò')}</strong><span class="badge ${statusKind}">${escape(statusLabels[row.status])}</span>
        ${row.must_change_password?'<p class="password-gate">Cần đổi mật khẩu tạm.</p>':''}
        ${row.active_gym_assignments.map(a=>`<p class="account-meta">${a.assignment_type==='MANAGER'?'Quản lý':'Huấn luyện viên'} · ${escape(a.gym_name)}</p>`).join('')}</div>
      <div class="account-action">${protectedAdmin?'<p class="protected">Tài khoản Admin được bảo vệ.</p>':!confirm?`<button data-action="open" data-id="${id}" ${needsReload||pending?'disabled':''}>${row.status==='ACTIVE'?'Khóa tạm tài khoản':'Mở lại tài khoản'}</button>${needsReload?'<p class="account-meta">Tải lại danh sách trước khi thao tác tiếp.</p>':''}`:''}</div>
    </div>${confirm?confirmation(row,confirm):''}</article>`;
  };
  const list = (rows,total,page,confirm,needsReload) => `<p class="total">${total} tài khoản phù hợp</p>
    ${total===0?message('Không có tài khoản phù hợp','Hãy điều chỉnh tên, email, vai trò hoặc trạng thái trong bộ lọc.','neutral'):''}
    <div class="account-list">${rows.map(row=>account(row,confirm?.id===row.user_id?confirm:null,needsReload.has(row.user_id),!!confirm?.pending)).join('')}</div>
    ${total>20?`<nav class="pager" aria-label="Phân trang tài khoản"><button data-action="prev" ${page===1?'disabled':''}>Trang trước</button><span>Trang ${page} / ${Math.ceil(total/20)}</span><button data-action="next" ${page*20>=total?'disabled':''}>Trang sau</button></nav>`:''}`;
  const loading = () => `<p role="status">Đang tải tài khoản…</p>${Array.from({length:3},()=>'<div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>').join('')}`;
  return {message,list,loading};
})();

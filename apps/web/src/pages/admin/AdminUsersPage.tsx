import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../../components/gym/GymUi';
import { adminUserService, accountStatusLabel, type UserFilters } from '../../services/admin-user.service';
import { AccountStatusAction } from './AccountStatusAction';
const roleLabels: Record<string,string> = {ADMIN: 'Admin', MANAGER: 'Manager', PT: 'PT', CUSTOMER: 'Customer'};
export const AdminUsersPage = () => {
  const {user} = useAuth(), cache = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({page: 1}), [search, setSearch] = useState(''), [saved, setSaved] = useState(false);
  const query = useQuery({queryKey: ['admin-users', user?.user_id, filters], queryFn: ({signal}) => adminUserService.list(filters,signal), refetchOnWindowFocus: false});
  const change = (value: Partial<UserFilters>) => {setFilters({...filters,...value,page: 1}); setSaved(false);};
  const done = async () => {setSaved(true); await Promise.all([cache.invalidateQueries({queryKey: ['admin-users']}),cache.invalidateQueries({queryKey: ['gyms']}),cache.invalidateQueries({queryKey: ['reviews']})]);};
  return <><Link to="/admin/roles">Xem vai trò hệ thống</Link><h1>Quản lý tài khoản</h1><p>Tra cứu người dùng và tạm dừng quyền truy cập khi cần. Vai trò và phân công được quản lý bằng các luồng riêng.</p>
    <form className="gym-toolbar" onSubmit={e => {e.preventDefault(); change({search: search.trim() || undefined});}}>
      <label className="form-group">Tìm tên hoặc email<input className="form-input" type="search" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label><button className="btn-primary">Tìm kiếm</button>
      <label className="form-group">Vai trò tài khoản<select className="form-input" value={filters.role || ''} onChange={e => change({role: e.target.value || undefined})}><option value="">Tất cả</option>{Object.entries(roleLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-group">Trạng thái tài khoản<select className="form-input" value={filters.status || ''} onChange={e => change({status: (e.target.value || undefined) as UserFilters['status']})}><option value="">Tất cả</option>{Object.entries(accountStatusLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </form>
    <button className="btn-secondary" onClick={() => void query.refetch()}>Tải lại danh sách</button>
    {saved && <p role="status">Đã cập nhật trạng thái tài khoản.</p>}<QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <><p>{query.data.total} tài khoản phù hợp</p><div className="account-list">{query.data.items.map(row => <article className="account-row" key={`${row.user_id}-${row.updated_at}`}>
      <div><h2>{row.profile?.full_name || 'Chưa có hồ sơ'}</h2><p>{row.email}</p>{row.phone && <p>{row.phone}</p>}<p className="gym-muted">Tạo ngày {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(row.created_at))}</p></div>
      <div><p><strong>{row.roles.map(r => roleLabels[r] || r).join(', ') || 'Chưa có vai trò'}</strong></p><p>{accountStatusLabel[row.status]}</p>{row.must_change_password && <p>Cần đổi mật khẩu tạm.</p>}
        {row.active_gym_assignments.map(a => <p key={`${a.assignment_type}-${a.gym_id}`}>{a.assignment_type === 'MANAGER' ? 'Quản lý' : 'Huấn luyện viên'} · {a.gym_name}</p>)}</div>
      <div><AccountStatusAction row={row} done={done} /></div>
    </article>)}</div>{!query.data.items.length && <p>Không có tài khoản phù hợp.</p>}
      {query.data.total > query.data.page_size && <nav className="gym-actions" aria-label="Phân trang tài khoản"><button className="btn-secondary" disabled={filters.page === 1} onClick={() => setFilters({...filters,page: filters.page-1})}>Trang trước</button><span>Trang {filters.page} / {Math.ceil(query.data.total/query.data.page_size)}</span><button className="btn-secondary" disabled={filters.page*query.data.page_size >= query.data.total} onClick={() => setFilters({...filters,page: filters.page+1})}>Trang sau</button></nav>}</>}
  </>;
};

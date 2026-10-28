import { ActionIcon } from '../../components/admin/ActionIcon';
import { AdminUserDetails } from './AdminUserDetails';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../../components/gym/GymUi';
import { adminUserService, accountStatusLabel, type UserFilters } from '../../services/admin-user.service';
import { PageHeader } from '../../components/management/PageHeader';
import { AccountStatusAction } from './AccountStatusAction';
const roleLabels: Record<string,string> = {ADMIN: 'Admin', MANAGER: 'Manager', PT: 'PT', CUSTOMER: 'Customer'};
export const AdminUsersPage = () => {
  const {user} = useAuth(), cache = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({page: 1}), [search, setSearch] = useState(''), [saved, setSaved] = useState(false), [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({queryKey: ['admin-users', user?.user_id, filters], queryFn: ({signal}) => adminUserService.list(filters,signal), refetchOnWindowFocus: false});
  const change = (value: Partial<UserFilters>) => {setFilters({...filters,...value,page: 1}); setSaved(false);};
  const done = async () => {setSaved(true); await Promise.all([cache.invalidateQueries({queryKey: ['admin-users']}),cache.invalidateQueries({queryKey: ['gyms']}),cache.invalidateQueries({queryKey: ['reviews']})]);};
  return <div className="admin-accounts-page"><PageHeader title="Quản lý tài khoản" />
    <form className="admin-list-toolbar account-toolbar" onSubmit={e => {e.preventDefault(); change({search: search.trim() || undefined});}}>
      <label className="form-group">Tìm tên hoặc email<input className="form-input" type="search" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label><button className="admin-icon-action" title="Tìm kiếm" aria-label="Tìm kiếm"><ActionIcon kind="search" /></button>
      <label className="form-group">Vai trò tài khoản<select className="form-input" value={filters.role || ''} onChange={e => change({role: e.target.value || undefined})}><option value="">Tất cả</option>{Object.entries(roleLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="form-group">Trạng thái tài khoản<select className="form-input" value={filters.status || ''} onChange={e => change({status: (e.target.value || undefined) as UserFilters['status']})}><option value="">Tất cả</option>{Object.entries(accountStatusLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </form>
    {saved && <p role="status">Đã cập nhật trạng thái tài khoản.</p>}<QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="admin-gym-table-scroll" role="region" aria-label="Bảng tài khoản" tabIndex={0}><table className="admin-gym-table admin-account-table">
        <caption>{query.data.total} tài khoản phù hợp</caption>
        <thead><tr>{['Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày đăng ký', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{query.data.items.map(row => <tr className="account-row" key={`${row.user_id}-${row.updated_at}`}>
          <th scope="row"><button type="button" className="admin-text-link" onClick={() => setSelected(row.user_id)}>{row.profile?.full_name || 'Chưa có hồ sơ'}</button></th>
          <td>{row.email}</td><td>{row.roles.map(role => roleLabels[role] || role).join(', ') || 'Chưa có vai trò'}</td>
          <td><span className={`admin-status is-${row.status.toLowerCase()}`}>{accountStatusLabel[row.status]}</span></td>
          <td>{new Date(row.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</td>
          <td><div className="admin-gym-row-actions"><button type="button" title="Xem chi tiết" aria-label={`Xem tài khoản ${row.email}`} onClick={() => setSelected(row.user_id)}><ActionIcon kind="view" /></button>
            <AccountStatusAction row={row} done={done} reload={query.refetch} /></div></td>
        </tr>)}</tbody>
      </table>{!query.data.items.length && <p className="admin-gym-empty">Không có tài khoản phù hợp.</p>}</div>
      {selected && query.data.items.find(row => row.user_id === selected) && <AdminUserDetails row={query.data.items.find(row => row.user_id === selected)!} onClose={() => setSelected(null)} />}
      {query.data.total > query.data.page_size && <nav className="gym-actions" aria-label="Phân trang tài khoản"><button className="btn-secondary" disabled={filters.page === 1} onClick={() => setFilters({...filters,page: filters.page-1})}>Trang trước</button><span>Trang {filters.page} / {Math.ceil(query.data.total/query.data.page_size)}</span><button className="btn-secondary" disabled={filters.page*query.data.page_size >= query.data.total} onClick={() => setFilters({...filters,page: filters.page+1})}>Trang sau</button></nav>}</>}
  </div>;
};

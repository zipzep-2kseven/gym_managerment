import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { adminUserService } from '../../services/admin-user.service';
import { QueryState } from './GymUi';

export const ManagerAccountPicker = () => {
  const selectId = useId();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', page: 1 });
  const [selected, setSelected] = useState('');
  const accounts = useQuery({ queryKey: ['admin-users', user?.user_id, 'manager-picker', filters],
    queryFn: ({ signal }) => adminUserService.list({ ...filters, role: 'MANAGER', status: 'ACTIVE' }, signal) });
  return <div>
    <div className="gym-toolbar"><label className="form-group">Tìm Manager theo tên hoặc email
      <input className="form-input" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); setSelected(''); setFilters({ search: search.trim(), page: 1 }); }
      }} /></label>
      <button type="button" className="btn-secondary" onClick={() => { setSelected(''); setFilters({ search: search.trim(), page: 1 }); }}>Tìm Manager</button>
    </div>
    <QueryState pending={accounts.isPending} error={accounts.error} retry={accounts.refetch} />
    <div className="form-group"><label htmlFor={selectId}>Tài khoản Manager</label><select id={selectId} className="form-input" name="user_id" required value={selected} disabled={!accounts.data || accounts.isError}
      onChange={event => setSelected(event.target.value)}>
      <option value="">Chọn Manager phụ trách</option>
      {accounts.data?.items.map(account => <option key={account.user_id} value={account.user_id}
        disabled={account.must_change_password || account.active_gym_assignments.some(assignment => assignment.assignment_type === 'MANAGER')}>
        {account.profile?.full_name || account.email} · {account.email}{account.active_gym_assignments.some(assignment => assignment.assignment_type === 'MANAGER') ? ' · Đang quản lý Gym' : account.must_change_password ? ' · Cần đổi mật khẩu' : ''}
      </option>)}
    </select></div>
    {accounts.data && !accounts.data.items.length && <p>Không tìm thấy tài khoản Manager phù hợp. Bạn có thể chọn cấp tài khoản mới.</p>}
    {accounts.data && accounts.data.total > accounts.data.page_size && <div className="gym-actions">
      <button type="button" className="btn-secondary" disabled={filters.page === 1} onClick={() => { setSelected(''); setFilters({ ...filters, page: filters.page - 1 }); }}>Trang trước</button>
      <span>Trang {filters.page}</span>
      <button type="button" className="btn-secondary" disabled={filters.page * accounts.data.page_size >= accounts.data.total} onClick={() => { setSelected(''); setFilters({ ...filters, page: filters.page + 1 }); }}>Trang sau</button>
    </div>}
  </div>;
};

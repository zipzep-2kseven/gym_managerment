import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { gymService } from '../../services/gym.service';
import { Pager, QueryState } from '../../components/gym/GymUi';
export const ReviewGymFilter = ({value, change}: {value: string; change: (id: string) => void}) => {
  const {user} = useAuth(), [search, setSearch] = useState(''), [page, setPage] = useState(1), [selectedName, setSelectedName] = useState('Gym đã chọn');
  const gyms = useQuery({queryKey: ['gyms', 'admin', 'review-filter', user?.user_id, search, page], queryFn: () => gymService.gyms({page, pageSize: 10, search, sortBy: 'gym_name', sortOrder: 'asc'}, true)});
  return <div><form className="gym-toolbar" onSubmit={e => {e.preventDefault(); setSearch(String(new FormData(e.currentTarget).get('gymSearch') || '')); setPage(1);}}><label className="form-group">Tìm phòng Gym<input className="form-input" name="gymSearch" /></label><button className="btn-secondary">Tìm Gym</button></form>
    <QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
    <label className="form-group">Lọc theo Gym<select className="form-input" value={value} onChange={e => {setSelectedName(gyms.data?.data.find(g => g.gym_id === e.target.value)?.gym_name || 'Gym đã chọn'); change(e.target.value);}}><option value="">Tất cả Gym</option>{value && !gyms.data?.data.some(g => g.gym_id === value) && <option value={value}>{selectedName}</option>}{!gyms.isError && gyms.data?.data.map(g => <option key={g.gym_id} value={g.gym_id}>{g.gym_name}{g.status === 'INACTIVE' ? ' (ngừng hoạt động)' : ''}</option>)}</select></label>
    {gyms.data && !gyms.isError && gyms.data.pagination.totalPages > 1 && <Pager pagination={gyms.data.pagination} onPage={setPage} />}
  </div>;
};

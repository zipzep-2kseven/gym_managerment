import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { Pager, QueryState, SafeImage } from '../../components/gym/GymUi';
import { useListFilters } from '../../hooks/useListFilters';

export const GymDirectoryPage = () => {
  const { query, setFilter } = useListFilters('gym_name');
  const [, setParams] = useSearchParams();
  const landing = useLocation().pathname === '/';
  const gyms = useQuery({ queryKey: ['gyms', 'public', query], queryFn: () => gymService.gyms(query) });
  return <><section className="gym-intro"><p className="gym-eyebrow">KHÔNG GIAN CỦA BẠN. NHỊP TẬP CỦA BẠN.</p><h1>{landing ? 'Bắt đầu hành trình tập luyện.' : 'Khám phá phòng Gym'}</h1><p>Tìm phòng tập, khám phá huấn luyện viên và chọn nơi phù hợp với mục tiêu của bạn.</p></section>
    <form className="gym-toolbar" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); setParams({ search: String(form.get('search') || ''), page: '1', sortBy: query.sortBy || 'gym_name' }); }}>
      <label className="form-group">Tên Gym hoặc địa chỉ<input className="form-input" name="search" defaultValue={query.search} key={query.search} placeholder="Tìm theo tên hoặc địa chỉ" /></label><button className="btn-primary" type="submit">Tìm phòng tập</button>
      <label className="form-group">Sắp xếp<select className="form-input" value={query.sortBy} onChange={e => setFilter('sortBy', e.target.value)}><option value="gym_name">Tên Gym</option><option value="address">Địa chỉ</option><option value="created_at">Ngày tạo</option></select></label>
    </form><QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
    {gyms.data && !gyms.isError && <><div className="gym-directory">{gyms.data.data.map(gym => <article className="gym-list-item" key={gym.gym_id}><SafeImage url={gym.logo_url} alt={gym.gym_name} /><div><h2><Link to={`/gyms/${gym.gym_id}`}>{gym.gym_name}</Link></h2><p>{gym.address}</p>{gym.phone && <p>Điện thoại: {gym.phone}</p>}<Link to={`/gyms/${gym.gym_id}`}>Khám phá phòng tập</Link></div></article>)}</div>{!gyms.data.data.length && <p className="gym-panel">Chưa có Gym phù hợp. Hãy thử tên hoặc địa chỉ khác.</p>}<Pager pagination={gyms.data.pagination} onPage={page => setFilter('page', String(page))} /></>}
  </>;
};

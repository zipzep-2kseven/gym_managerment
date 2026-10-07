import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { Pager, QueryState, SafeImage } from '../../components/gym/GymUi';
import { useListFilters } from '../../hooks/useListFilters';
export const availabilityLabel = { AVAILABLE: 'Sẵn sàng', BUSY: 'Đang bận', ON_LEAVE: 'Đang nghỉ' };
export const PublicTrainersPage = () => {
  const { gymId = '' } = useParams();
  const { query, setFilter } = useListFilters('full_name');
  const trainers = useQuery({ queryKey: ['gyms', 'public', gymId, 'trainers', query], queryFn: () => gymService.trainers(gymId, query) });
  return <><Link to={`/gyms/${gymId}`}>Thông tin phòng Gym</Link><h1>Đội ngũ huấn luyện viên</h1>
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Tên PT hoặc chuyên môn<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm PT</button><label className="form-group">Sắp xếp<select className="form-input" value={query.sortBy} onChange={e => setFilter('sortBy', e.target.value)}><option value="full_name">Tên PT</option><option value="joined_at">Ngày gia nhập</option><option value="created_at">Ngày tạo</option></select></label></form>
    <QueryState pending={trainers.isPending} error={trainers.error} retry={trainers.refetch} />
    {trainers.data && !trainers.isError && <><div className="gym-directory">{trainers.data.data.map(pt => <article className="gym-list-item" key={pt.gym_trainer_id}><SafeImage url={pt.profile?.avatar_url || null} alt={pt.profile?.full_name || 'PT'} /><div><h2><Link to={`/gyms/${gymId}/trainers/${pt.gym_trainer_id}`}>{pt.profile?.full_name || 'Huấn luyện viên'}</Link></h2><p>{pt.specialization || 'Chưa cập nhật chuyên môn'}</p><p>{pt.experience_years ?? 'Chưa cập nhật'} năm kinh nghiệm · {availabilityLabel[pt.availability]}</p></div></article>)}</div>{!trainers.data.data.length && <p>Chưa có PT phù hợp.</p>}<Pager pagination={trainers.data.pagination} onPage={page => setFilter('page', String(page))} /></>}
  </>;
};
export const PublicTrainerPage = () => {
  const { gymId = '', trainerId = '' } = useParams();
  const pt = useQuery({ queryKey: ['gyms', 'public', gymId, 'trainers', trainerId], queryFn: () => gymService.trainer(gymId, trainerId) });
  if (!pt.data || pt.isError) return <QueryState pending={pt.isPending} error={pt.error} retry={pt.refetch} />;
  const data = pt.data;
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return <><Link to={`/gyms/${gymId}/trainers`}>Đội ngũ PT</Link><section className="gym-detail-heading"><SafeImage url={data.profile?.avatar_url || null} alt={data.profile?.full_name || 'PT'} /><div><h1>{data.profile?.full_name || 'Huấn luyện viên'}</h1><p>{data.specialization || 'Chưa cập nhật chuyên môn'}</p><p>{data.experience_years ?? 'Chưa cập nhật'} năm kinh nghiệm · {availabilityLabel[data.availability]}</p></div></section><section className="gym-panel"><h2>Giới thiệu</h2><p className="gym-preserve">{data.bio || 'Chưa cập nhật giới thiệu.'}</p><h2>Kết nối với PT</h2>{data.social_links.length ? <ul>{data.social_links.map(link => /^https?:\/\//i.test(link.url) && <li key={link.social_link_id}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.platform}</a></li>)}</ul> : <p>Chưa cập nhật liên kết.</p>}
    <h2>Lịch làm việc dự kiến</h2>{data.working_schedules.length ? <ul>{data.working_schedules.filter(slot => slot.status === 'ACTIVE').map(slot => <li key={slot.schedule_id}>{days[slot.day_of_week]}: {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</li>)}</ul> : <p>Chưa cập nhật lịch làm việc.</p>}<p>Khung giờ trên là lịch làm việc dự kiến. Sau khi có Membership tại Gym và thống nhất với PT, bạn mới đăng ký dịch vụ và lịch hẹn.</p></section></>;
};

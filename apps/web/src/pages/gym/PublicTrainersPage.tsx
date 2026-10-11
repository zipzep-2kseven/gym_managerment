import { ReviewPanel } from '../../components/review/ReviewPanel';
import { trainerDays } from '../../services/trainer-profile.service';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { Pager, QueryState, SafeImage } from '../../components/gym/GymUi';
import { useListFilters } from '../../hooks/useListFilters';
export const availabilityLabel = { ACCEPTING: 'Đang nhận học viên', ALMOST_FULL: 'Sắp đủ học viên', NOT_ACCEPTING: 'Ngừng nhận học viên mới' };
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
  const days: Record<string, string> = { MONDAY: 'Thứ hai', TUESDAY: 'Thứ ba', WEDNESDAY: 'Thứ tư', THURSDAY: 'Thứ năm', FRIDAY: 'Thứ sáu', SATURDAY: 'Thứ bảy', SUNDAY: 'Chủ nhật' };
  return <><Link to={`/gyms/${gymId}/trainers`}>Đội ngũ PT</Link><section className="gym-detail-heading"><SafeImage url={data.profile?.avatar_url || null} alt={data.profile?.full_name || 'PT'} /><div><h1>{data.profile?.full_name || 'Huấn luyện viên'}</h1><p>{data.specialization || 'Chưa cập nhật chuyên môn'}</p><p>{data.experience_years ?? 'Chưa cập nhật'} năm kinh nghiệm · {availabilityLabel[data.availability]}</p></div></section><section className="gym-panel"><h2>Giới thiệu</h2><p className="gym-preserve">{data.bio || 'Chưa cập nhật giới thiệu.'}</p><h2>Kết nối với PT</h2>{data.social_links.length ? <ul>{data.social_links.map(link => /^https?:\/\//i.test(link.url) && <li key={link.social_link_id}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.platform}</a></li>)}</ul> : <p>Chưa cập nhật liên kết.</p>}
    <h2>Giờ làm việc tham khảo</h2>{data.working_schedules.length ? <ul>{[...data.working_schedules].sort((a, b) => trainerDays.indexOf(a.day_of_week as typeof trainerDays[number]) - trainerDays.indexOf(b.day_of_week as typeof trainerDays[number]) || a.start_time.localeCompare(b.start_time)).filter(slot => slot.status === 'ACTIVE').map(slot => <li key={slot.schedule_id}>{days[slot.day_of_week]}: {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</li>)}</ul> : <p>Chưa cập nhật lịch làm việc.</p>}<p>Giờ làm việc không thể hiện chỗ trống. Lịch tập cần được PT xác nhận. Thay đổi giờ tham khảo không dời hoặc hủy lịch đã đặt.</p></section><ReviewPanel key={`${gymId}-${trainerId}`} gymId={gymId} trainerId={trainerId} /></>;
};

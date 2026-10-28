import { TrainerProfileError } from './TrainerProfileError';
import { ApiClientError } from '../../services/api-client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { SafeImage } from '../../components/gym/GymUi';
import { dayLabels, trainerProfileService, type TrainerProfile } from '../../services/trainer-profile.service';
import { TrainerOwnForm } from './TrainerOwnForm';
import { AvailabilityForm } from '../pt/PtForms';
const ManagerFields = ({ row, done }: { row: TrainerProfile; done: () => Promise<void> }) => {
  const { refreshSession } = useAuth();
  const [specialization, setSpecialization] = useState(row.specialization || ''), [years, setYears] = useState(row.experience_years?.toString() || '');
  const mutation = useMutation({ mutationFn: () => trainerProfileService.saveManaged(row, specialization, years === '' ? null : Number(years)), onSuccess: done, retry: false, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  return <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}><h2>Thông tin chuyên môn</h2>
    <fieldset className="gym-fieldset" disabled={mutation.isPending || row.status !== 'ACTIVE'}><legend>Thông tin do Gym quản lý</legend>
      <label className="form-group">Chuyên môn<input className="form-input" maxLength={200} value={specialization} onChange={e => setSpecialization(e.target.value)} /></label>
      <label className="form-group">Số năm kinh nghiệm<input className="form-input" type="number" min={0} max={80} step={1} value={years} onChange={e => setYears(e.target.value)} /></label>
      <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu thông tin chuyên môn'}</button>
    </fieldset><TrainerProfileError error={mutation.error} /></form>;
};
export const TrainerProfilePage = ({ manager = false }: { manager?: boolean }) => {
  const { trainerId = '' } = useParams(), gym = useManagerGymId(), { user } = useAuth(), cache = useQueryClient();
  const [saved, setSaved] = useState(false);
  const query = useQuery({ queryKey: ['trainer-profile', user?.user_id, manager, gym, trainerId], queryFn: ({ signal }) => manager ? trainerProfileService.managed(gym, trainerId, signal) : trainerProfileService.mine(signal), enabled: !manager || !!gym, refetchOnWindowFocus: false });
  const done = async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['trainer-profile'] }), cache.invalidateQueries({ queryKey: ['gyms'] })]); setSaved(true); };
  const row = query.data;
  return <><Link to={manager ? '/manager/trainers' : '/my-pt'}>{manager ? 'Danh sách PT' : 'PT và lịch tập'}</Link><h1>{manager ? 'Hồ sơ huấn luyện viên' : 'Hồ sơ PT của tôi'}</h1>
    <PackageQueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {saved && <p role="status">Đã lưu thay đổi.</p>}
    {row && !query.isError && <><div className="gym-detail-heading"><SafeImage url={row.profile?.avatar_url || null} alt={row.profile?.full_name || 'PT'} /><div><h2>{row.profile?.full_name || 'Huấn luyện viên'}</h2><p>{row.specialization || 'Chưa cập nhật chuyên môn'} · {row.experience_years ?? 'Chưa cập nhật'} năm kinh nghiệm</p>
      <div className="gym-actions">{!manager && <Link to="/profile">Sửa tên và ảnh đại diện</Link>}<Link to={`/gyms/${row.gym_id}/trainers/${row.gym_trainer_id}`}>Xem trang PT công khai</Link></div></div></div>
      {row.status === 'ACTIVE' && <AvailabilityForm key={`${row.gym_trainer_id}-${row.availability}`} gymId={row.gym_id} trainerId={row.gym_trainer_id} value={row.availability} />}
      {manager ? <><ManagerFields key={row.updated_at} row={row} done={done} /><section className="gym-panel"><h2>Giới thiệu của PT</h2><p className="gym-preserve">{row.bio || 'Chưa có giới thiệu.'}</p><h2>Liên kết</h2>{row.social_links.filter(link => /^https?:\/\//i.test(link.url)).map(link => <p key={link.platform}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.platform}</a></p>)}<h2>Giờ làm việc tham khảo</h2>{row.working_schedules.map((slot, i) => <p key={i}>{dayLabels[slot.day_of_week]}: {slot.start_time}–{slot.end_time}</p>)}{!row.working_schedules.length && <p>Chưa khai báo giờ làm việc.</p>}<p>Giờ tham khảo không thể hiện chỗ trống và không thay lịch tập.</p></section></> : <TrainerOwnForm key={row.updated_at} row={row} done={done} />}
      <button className="btn-secondary" onClick={() => void query.refetch()}>Tải lại hồ sơ</button>
    </>}
  </>;
};

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TrainerProfileError } from './TrainerProfileError';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { dayLabels, trainerDays, platforms, trainerProfileService, type TrainerProfile, type TrainerHours, type TrainerLink } from '../../services/trainer-profile.service';
export const TrainerOwnForm = ({ row, done }: { row: TrainerProfile; done: () => Promise<void> }) => {
  const { refreshSession } = useAuth();
  const [bio, setBio] = useState(row.bio || ''), [links, setLinks] = useState<TrainerLink[]>(row.social_links), [hours, setHours] = useState<TrainerHours[]>(row.working_schedules);
  const mutation = useMutation({ mutationFn: () => trainerProfileService.saveMine(row, bio, links.map(r => ({ ...r, url: r.url.trim() })), hours), onSuccess: done, retry: false, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  return <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}><fieldset className="gym-fieldset" disabled={mutation.isPending}>
    <legend>Hồ sơ giới thiệu và giờ làm việc</legend>
    <label className="form-group">Giới thiệu ngắn<textarea className="form-textarea" maxLength={2000} value={bio} onChange={e => setBio(e.target.value)} /></label>
    <section><h2>Liên kết của tôi</h2><p>Không bắt buộc. Mỗi nền tảng một liên kết.</p>{links.map((link, index) => <div className="gym-toolbar" key={index}>
      <label className="form-group">Nền tảng<select className="form-input" aria-label={`Nền tảng ${index + 1}`} value={link.platform} onChange={e => setLinks(links.map((r, i) => i === index ? { ...r, platform: e.target.value } : r))}>{platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}</select></label>
      <label className="form-group">Đường dẫn<input className="form-input" aria-label={`Đường dẫn ${index + 1}`} type="url" required maxLength={2048} value={link.url} onChange={e => setLinks(links.map((r, i) => i === index ? { ...r, url: e.target.value } : r))} /></label>
      <button className="btn-secondary" type="button" onClick={() => setLinks(links.filter((_, i) => i !== index))}>Bỏ liên kết {index + 1}</button>
    </div>)}<button className="btn-secondary" type="button" disabled={links.length >= 5} onClick={() => setLinks([...links, { platform: platforms.find(p => !links.some(r => r.platform === p)) || 'WEBSITE', url: '' }])}>Thêm liên kết</button></section>
    <section><h2>Giờ làm việc tham khảo</h2><p>Giờ Việt Nam. Cho phép nhiều ca trong ngày; không trùng giờ hoặc qua nửa đêm. Ngày không khai báo sẽ không hiển thị.</p>
      {hours.map((slot, index) => <div className="gym-toolbar" key={index}>
        <label className="form-group">Ngày<select className="form-input" aria-label={`Ngày ca ${index + 1}`} value={slot.day_of_week} onChange={e => setHours(hours.map((r, i) => i === index ? { ...r, day_of_week: e.target.value } : r))}>{trainerDays.map(day => <option key={day} value={day}>{dayLabels[day]}</option>)}</select></label>
        <label className="form-group">Từ<input className="form-input" type="time" required aria-label={`Bắt đầu ca ${index + 1}`} value={slot.start_time} onChange={e => setHours(hours.map((r, i) => i === index ? { ...r, start_time: e.target.value } : r))} /></label>
        <label className="form-group">Đến<input className="form-input" type="time" required aria-label={`Kết thúc ca ${index + 1}`} value={slot.end_time} onChange={e => setHours(hours.map((r, i) => i === index ? { ...r, end_time: e.target.value } : r))} /></label>
        <button className="btn-secondary" type="button" onClick={() => setHours(hours.filter((_, i) => i !== index))}>Bỏ ca {index + 1}</button>
      </div>)}<button className="btn-secondary" type="button" disabled={hours.length >= 28} onClick={() => setHours([...hours, { day_of_week: 'MONDAY', start_time: '06:00', end_time: '10:00' }])}>Thêm ca làm việc</button>
      <p>Thay đổi giờ tham khảo không dời hoặc hủy lịch tập đã đặt.</p></section>
    <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu hồ sơ và giờ làm việc'}</button>
  </fieldset><TrainerProfileError error={mutation.error} /></form>;
};

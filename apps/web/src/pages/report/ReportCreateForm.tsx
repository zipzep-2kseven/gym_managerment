import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { reportService, readReportPhoto, type ReportImage } from '../../services/report.service';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { MutationError } from '../../components/gym/GymUi';
import { ApiClientError } from '../../services/api-client';
export const ReportCreateForm = () => {
  const { user, refreshSession } = useAuth(), cache = useQueryClient();
  const gyms = useQuery({ queryKey: ['reports', user?.user_id, 'eligible-gyms'], queryFn: ({ signal }) => reportService.gyms(signal) });
  const [gym, setGym] = useState(''), [content, setContent] = useState(''), [image, setImage] = useState<ReportImage>(), [imageError, setImageError] = useState(''), [reading, setReading] = useState(false), [saved, setSaved] = useState(false);
  const upload = useRef<HTMLInputElement>(null); const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const selected = gyms.data?.length === 1 ? gyms.data[0].gym_id : gym;
  const mutation = useMutation({ mutationFn: () => reportService.create(selected, content.trim(), image), retry: false,
    onSuccess: async () => { setSaved(true); setContent(''); setImage(undefined); if (upload.current) upload.current.value = ''; await cache.invalidateQueries({ queryKey: ['reports'] }); },
    onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  return <section className="gym-panel"><h2>Gửi báo cáo sự cố</h2><p>Mô tả vị trí và vấn đề bạn gặp. Không cần mã máy hoặc chọn thiết bị.</p>
    <PackageQueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
    {gyms.data && !gyms.isError && (gyms.data.length ? <form onSubmit={e => { e.preventDefault(); if (!reading && !imageError && !mutation.isPending) { setSaved(false); mutation.mutate(); } }}>
      <fieldset className="gym-fieldset" disabled={mutation.isPending || reading}><label className="form-group">Gym<select aria-label="Gym" className="form-input" required value={selected} onChange={e => { setGym(e.target.value); setSaved(false); }}><option value="">Chọn Gym đang tập</option>{gyms.data.map(g => <option key={g.gym_id} value={g.gym_id}>{g.gym_name}</option>)}</select></label>
        <label className="form-group">Nội dung sự cố<textarea className="form-textarea" required minLength={5} maxLength={4000} value={content} onChange={e => { setContent(e.target.value); setSaved(false); }} placeholder="Ví dụ: máy chạy bộ gần cửa bị đứng băng chuyền." /></label>
        <label className="form-group">Ảnh sự cố (không bắt buộc)<input ref={upload} className="form-input" type="file" accept="image/jpeg,image/png" capture="environment" onChange={async e => {
          const file = e.target.files?.[0], current = ++version.current; setImage(undefined); setImageError(''); setSaved(false);
          if (!file) return; setReading(true);
          try { const photo = await readReportPhoto(file); if (current === version.current) setImage(photo); }
          catch (error) { if (current === version.current) setImageError(error instanceof Error ? error.message : 'Không thể đọc ảnh.'); }
          finally { if (current === version.current) setReading(false); }
        }} /></label><p>Một ảnh JPEG/PNG, tối đa 5 MB. Có thể chụp trực tiếp bằng điện thoại.</p>
        {image && <><img className="report-photo" src={`data:${image.mime_type};base64,${image.data}`} alt="Ảnh sự cố sẽ gửi" /><button type="button" className="btn-secondary" onClick={() => { version.current++; setImage(undefined); setImageError(''); if (upload.current) upload.current.value = ''; }}>Bỏ ảnh</button></>}
        {imageError && <><p role="alert">{imageError}</p><button type="button" className="btn-secondary" onClick={() => { setImageError(''); if (upload.current) upload.current.value = ''; }}>Bỏ ảnh không hợp lệ</button></>}
        <button className="btn-primary" disabled={!!imageError}>{mutation.isPending ? 'Đang gửi…' : reading ? 'Đang đọc ảnh…' : 'Gửi báo cáo'}</button>
      </fieldset><MutationError error={mutation.error} />{mutation.error instanceof ApiClientError && mutation.error.statusCode === 0 && <p role="alert">Chưa xác định kết quả gửi. Hãy làm mới danh sách báo cáo để kiểm tra trước khi gửi lại.</p>}{saved && <p role="status">Đã gửi báo cáo. Manager sẽ tiếp nhận và cập nhật kết quả.</p>}
    </form> : <p>Bạn cần thẻ hội viên đang hoạt động và còn hạn tại Gym để gửi báo cáo. Báo cáo cũ vẫn xem được bên dưới.</p>)}
  </section>;
};

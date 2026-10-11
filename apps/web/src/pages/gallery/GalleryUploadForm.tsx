import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MutationError } from '../../components/gym/GymUi';
import { readGymPhoto, type PhotoUpload } from '../../services/photo-upload';
import { galleryService } from '../../services/gallery.service';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
export const GalleryUploadForm = ({ gym, count, done }: { gym: string; count: number; done: () => Promise<void> }) => {
  const { refreshSession } = useAuth();
  const [photo, setPhoto] = useState<PhotoUpload>(), [error, setError] = useState(''), [reading, setReading] = useState(false);
  const [caption, setCaption] = useState(''), [saved, setSaved] = useState(false), input = useRef<HTMLInputElement>(null), version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const mutation = useMutation({ mutationFn: () => galleryService.upload(gym, photo!, caption), retry: false, gcTime: 0,
    onSuccess: async () => { setPhoto(undefined); setCaption(''); setSaved(true); if (input.current) input.current.value = ''; await done(); }, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  const clear = () => { version.current++; setPhoto(undefined); setError(''); setReading(false); if (input.current) input.current.value = ''; };
  return <section className="gym-panel"><h2>Thêm ảnh phòng tập</h2><p>{count}/10 ảnh · JPEG/PNG tối đa 5 MB mỗi ảnh. Ảnh được tối ưu trước khi lưu.</p>
    {saved && <p role="status">Đã thêm ảnh.</p>}{count >= 10 ? <p>Đã đủ 10 ảnh. Xóa một ảnh trước khi thêm ảnh mới.</p> : <form onSubmit={e => { e.preventDefault(); if (photo && !reading && !error && !mutation.isPending) mutation.mutate(); }}>
      <fieldset className="gym-fieldset" disabled={mutation.isPending}><legend>Ảnh mới</legend>
        <label className="form-group">Ảnh phòng tập<input ref={input} className="form-input" type="file" accept="image/jpeg,image/png" disabled={reading} onChange={async e => {
          const file = e.target.files?.[0], token = ++version.current; setPhoto(undefined); setError(''); setSaved(false); mutation.reset();
          if (!file) return; setReading(true);
          try { const result = await readGymPhoto(file); if (version.current === token) setPhoto(result); }
          catch (failure) { if (version.current === token) setError(failure instanceof Error ? failure.message : 'Không đọc được ảnh.'); }
          finally { if (version.current === token) setReading(false); }
        }} /></label>
        {reading && <p role="status">Đang xử lý ảnh…</p>}{error && <p role="alert">{error}</p>}
        {photo && <img className="gallery-photo" src={`data:${photo.mime_type};base64,${photo.data}`} alt="Ảnh phòng tập sẽ thêm" />}
        {(photo || error || reading) && <button className="btn-secondary" type="button" onClick={clear}>Bỏ ảnh đã chọn</button>}
        <label className="form-group">Chú thích ảnh mới (không bắt buộc)<input className="form-input" maxLength={200} value={caption} onChange={e => setCaption(e.target.value)} /></label>
        <button className="btn-primary" disabled={!photo || reading || !!error || mutation.isPending}>{mutation.isPending ? 'Đang tải ảnh…' : 'Thêm ảnh'}</button>
      </fieldset><MutationError error={mutation.error} />
      {mutation.error instanceof ApiClientError && mutation.error.statusCode === 0 && <p role="alert">Chưa xác định kết quả tải ảnh. Hãy làm mới danh sách trước khi gửi lại.</p>}
    </form>}
  </section>;
};

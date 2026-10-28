import { useEffect, useRef, useState } from 'react';
import { readGymPhoto, type PhotoUpload } from '../../services/photo-upload';
import type { useAdminGallery } from '../../hooks/useAdminGallery';

export const AdminGalleryUpload = ({ action, count, blocked }: { action: ReturnType<typeof useAdminGallery>; count: number; blocked: boolean }) => {
  const [photo, setPhoto] = useState<PhotoUpload | null>(null), [caption, setCaption] = useState(''), [error, setError] = useState('');
  const picker = useRef<HTMLInputElement>(null), version = useRef(0);
  const setPreparing = action.setPreparing;
  useEffect(() => () => { version.current++; setPreparing(false); }, [setPreparing]);
  const clear = () => { version.current++; setPhoto(null); setError(''); setPreparing(false); if (picker.current) picker.current.value = ''; };
  const choose = async (file?: File) => {
    const token = ++version.current; setPhoto(null); setError(''); action.reset();
    if (!file) { setPreparing(false); return; }
    setPreparing(true);
    try { const next = await readGymPhoto(file); if (token === version.current) setPhoto(next); }
    catch (failure) { if (token === version.current) setError(failure instanceof Error ? failure.message : 'Không đọc được ảnh.'); }
    finally { if (token === version.current) setPreparing(false); }
  };
  const remoteBusy = action.pending || action.reading || !!action.uncertain;
  return <form className="gym-panel admin-gallery-upload" aria-label="Thêm ảnh phòng tập" onSubmit={async event => {
    event.preventDefault(); if (!photo || blocked || action.locked || count >= 10) return;
    if (await action.send({ kind: 'upload', photo, caption })) { clear(); setCaption(''); }
  }}>
    <div><h2>Thêm ảnh phòng tập</h2><p>{count}/10 ảnh · JPEG hoặc PNG, tối đa 5 MiB và 20 megapixel. Ảnh được thu nhỏ tối đa 1600 px trước khi tải.</p></div>
    {count >= 10 && <p role="status">Gallery đã đủ 10 ảnh. Xóa một ảnh trước khi thêm ảnh mới.</p>}
    <label htmlFor="admin-gallery-file">Ảnh phòng tập</label>
    <input ref={picker} id="admin-gallery-file" type="file" accept="image/jpeg,image/png" disabled={blocked || action.locked} onChange={event => void choose(event.target.files?.[0])} />
    {action.preparing && <p role="status">Đang xử lý ảnh…</p>}
    {error && <p role="alert">{error}</p>}
    {photo && <img className="admin-gallery-preview" src={`data:${photo.mime_type};base64,${photo.data}`} alt="Ảnh phòng tập sẽ thêm" />}
    <label htmlFor="admin-gallery-new-caption">Chú thích ảnh mới (không bắt buộc)</label>
    <textarea id="admin-gallery-new-caption" maxLength={200} value={caption} disabled={blocked || action.locked} onChange={event => setCaption(event.target.value)} />
    <div className="admin-gallery-actions"><button className="btn-primary" disabled={!photo || !!error || blocked || action.locked || count >= 10}>{action.pending ? 'Đang xử lý…' : 'Thêm ảnh'}</button>
      <button type="button" className="btn-secondary" disabled={remoteBusy || (blocked && !action.preparing)} onClick={clear}>Bỏ ảnh đã chọn</button></div>
  </form>;
};

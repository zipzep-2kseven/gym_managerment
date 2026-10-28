import { useEffect, useRef, useState } from 'react';
import type { GalleryImage } from '../../services/gallery.service';

export const AdminGalleryEditor = ({ row, blocked, pending, close, save }: { row: GalleryImage; blocked: boolean; pending: boolean; close: () => void; save: (caption: string) => void }) => {
  const [caption, setCaption] = useState(row.caption || ''), input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  return <form className="gym-panel admin-gallery-editor" aria-label="Sửa chú thích ảnh" onSubmit={event => { event.preventDefault(); if (!blocked) save(caption); }}>
    <h2>Sửa chú thích ảnh</h2><p>Chú thích tối đa 200 ký tự. Để trống để bỏ chú thích.</p>
    <label htmlFor="admin-gallery-caption">Chú thích ảnh</label>
    <textarea ref={input} id="admin-gallery-caption" maxLength={200} value={caption} disabled={blocked} onChange={event => setCaption(event.target.value)} />
    <div className="admin-gallery-actions"><button className="btn-primary" disabled={blocked || caption.trim() === (row.caption || '')}>{pending ? 'Đang lưu…' : 'Lưu chú thích'}</button>
      <button type="button" className="btn-secondary" disabled={blocked} onClick={close}>Hủy</button></div>
  </form>;
};
export const AdminGalleryDelete = ({ row, blocked, pending, close, remove }: { row: GalleryImage; blocked: boolean; pending: boolean; close: () => void; remove: () => void }) => {
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirm.current?.focus(); }, []);
  return <section className="gym-panel admin-gallery-editor" aria-label="Xác nhận xóa ảnh">
    <h2>Xóa ảnh khỏi gallery?</h2><p className="gym-preserve">{row.caption || 'Ảnh chưa có chú thích.'}</p>
    <p>Ảnh sẽ không còn trong gallery nội bộ và công khai. Nếu xóa ảnh đầu tiên, ảnh kế tiếp trở thành đại diện gallery. Logo Gym và ảnh phản ánh được giữ nguyên.</p>
    <div className="admin-gallery-actions"><button ref={confirm} className="btn-danger" disabled={blocked} onClick={remove}>{pending ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
      <button className="btn-secondary" disabled={blocked} onClick={close}>Hủy</button></div>
  </section>;
};

import type { GalleryImage } from '../../services/gallery.service';
import type { useAdminGallery } from '../../hooks/useAdminGallery';
import { AdminGalleryPhoto } from './AdminGalleryPhoto';

export const AdminGalleryRow = ({ row, index, count, action, blocked, open, move }: { row: GalleryImage; index: number; count: number; action: ReturnType<typeof useAdminGallery>; blocked: boolean;
  open: (kind: 'caption' | 'delete', row: GalleryImage) => void; move: (index: number, delta: number) => void }) => <article className="gym-panel admin-gallery-row" aria-label={`Ảnh ${index + 1}`}>
  <div className="admin-gallery-row-heading"><h3 tabIndex={-1} data-gallery-heading={row.image_id}>Ảnh {index + 1}</h3>{index === 0 && <span className="admin-badge">Đại diện gallery</span>}</div>
  <AdminGalleryPhoto key={`${row.image_id}:${action.revision}`} row={row} index={index} revision={action.revision} deny={action.deny} />
  <p className="gym-preserve admin-gallery-caption">{row.caption || 'Chưa có chú thích.'}</p>
  <div className="admin-gallery-actions">
    <button className="btn-secondary" data-gallery-opener={`caption-${row.image_id}`} disabled={blocked} onClick={() => open('caption', row)}>Sửa chú thích ảnh {index + 1}</button>
    <button className="btn-secondary" data-gallery-opener={`up-${row.image_id}`} disabled={blocked || index === 0} onClick={() => move(index, -1)}>Lên</button>
    <button className="btn-secondary" data-gallery-opener={`down-${row.image_id}`} disabled={blocked || index === count - 1} onClick={() => move(index, 1)}>Xuống</button>
    <button className="btn-danger" data-gallery-opener={`delete-${row.image_id}`} disabled={blocked} onClick={() => open('delete', row)}>Xóa ảnh</button>
  </div>
</article>;

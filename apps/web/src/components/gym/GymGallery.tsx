import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
export const GalleryPhoto = ({ row, internal = false }: { row: GalleryImage; internal?: boolean }) => {
  const [error, setError] = useState(false);
  return error ? <p role="status">Không tải được ảnh. Hãy làm mới để thử lại.</p> : <img className="gallery-photo" crossOrigin={internal ? 'use-credentials' : 'anonymous'}
    src={galleryService.image(row, internal)} alt={row.caption || 'Không gian phòng tập'} loading="lazy" onError={() => setError(true)} />;
};
export const GymGallery = ({ gymId }: { gymId: string }) => {
  const query = useQuery({ queryKey: ['gallery', 'public', gymId], queryFn: ({ signal }) => galleryService.list(gymId, false, signal) });
  if (query.isPending) return <p role="status">Đang tải ảnh phòng tập…</p>;
  if (query.isError) return <div role="alert">Không tải được ảnh phòng tập. <button className="btn-secondary" onClick={() => void query.refetch()}>Thử lại ảnh</button></div>;
  if (!query.data.length) return null;
  return <section className="gym-gallery"><h2>Không gian phòng tập</h2><div className="gallery-grid">{query.data.map((row, index) => <figure key={row.image_id} className={index === 0 ? 'gallery-cover' : ''}>
    <GalleryPhoto row={row} />{row.caption && <figcaption>{row.caption}</figcaption>}
  </figure>)}</div></section>;
};

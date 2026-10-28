import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gymImages } from '../database/schema/index.js';
import { createGalleryRepository, galleryDto } from '../repositories/gallery.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { createGalleryImageStore } from './gallery-image-store.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { galleryUpload, galleryCaption, galleryOrder } from '../validators/gallery.validator.js';
import { AppError } from '../utils/errors.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const authorize = (tx: Transaction, actor: string, gym: string, read = false) => {
  const repo = createStaffingRepository(tx); return createGymScopeService(repo, repo).requireInternalScope(actor, gym, read ? ['ADMIN', 'MANAGER'] : ['MANAGER']);
};
const conflict = () => new AppError(409, 'GALLERY_CHANGED', 'Danh sách ảnh đã thay đổi. Hãy tải lại trước khi sửa.');
const checkCapacity = async (tx: Transaction, actor: string, gym: string) => {
  const repo = createGalleryRepository(tx); await repo.lockGym(gym); await authorize(tx, actor, gym);
  const rows = await repo.list(gym);
  if (rows.length >= 10) throw new AppError(409, 'GALLERY_LIMIT', 'Mỗi Gym có tối đa 10 ảnh.');
  return rows;
};
export const createGalleryService = (database: typeof db = db, images = createGalleryImageStore()) => ({
  authorizeUpload: (actor: string, gym: string) => database.transaction(tx => checkCapacity(tx, actor, gym)).catch(staffingDatabaseError),
  list: (gym: string, actor?: string) => database.transaction(async tx => {
    const repo = createGalleryRepository(tx);
    if (actor) await authorize(tx, actor, gym, true);
    else if (!await repo.publicGym(gym)) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym công khai.');
    return (await repo.list(gym)).map(galleryDto);
  }).catch(staffingDatabaseError),
  upload: async (actor: string, gym: string, input: unknown) => {
    const body = galleryUpload.parse(input), id = randomUUID();
    await database.transaction(tx => checkCapacity(tx, actor, gym)).catch(staffingDatabaseError);
    const key = await images.save(id, body.image);
    try {
      return await database.transaction(async tx => {
        const rows = await checkCapacity(tx, actor, gym);
        return galleryDto(await createGalleryRepository(tx).insert({ imageId: id, gymId: gym, imageUrl: key, caption: body.caption,
          displayOrder: rows.length ? Math.max(...rows.map(r => r.displayOrder)) + 1 : 0 }));
      });
    } catch (error) {
      try { if (!(await database.select({ id: gymImages.imageId }).from(gymImages).where(eq(gymImages.imageId, id))).length) await images.remove(key); }
      catch { console.error('[GALLERY_CLEANUP_DEFERRED]'); }
      return staffingDatabaseError(error);
    }
  },
  caption: async (actor: string, gym: string, id: string, input: unknown) => {
    const body = galleryCaption.parse(input);
    return database.transaction(async tx => {
      const repo = createGalleryRepository(tx); await repo.lockGym(gym); await authorize(tx, actor, gym);
      const row = await repo.find(gym, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
      if (row.updatedAt.toISOString() !== body.expected_updated_at) throw conflict();
      return galleryDto(await repo.change(gym, id, { caption: body.caption }));
    }).catch(staffingDatabaseError);
  },
  reorder: async (actor: string, gym: string, input: unknown) => {
    const body = galleryOrder.parse(input);
    return database.transaction(async tx => {
      const repo = createGalleryRepository(tx); await repo.lockGym(gym); await authorize(tx, actor, gym);
      const rows = await repo.list(gym), current = rows.map(r => r.imageId);
      if (JSON.stringify(current) !== JSON.stringify(body.expected_image_ids) || body.image_ids.length !== current.length
        || new Set(body.image_ids).size !== current.length || body.image_ids.some(id => !current.includes(id))) throw conflict();
      for (const [displayOrder, id] of body.image_ids.entries()) await repo.change(gym, id, { displayOrder });
      return (await repo.list(gym)).map(galleryDto);
    }).catch(staffingDatabaseError);
  },
  remove: async (actor: string, gym: string, id: string) => {
    const key = await database.transaction(async tx => {
      const repo = createGalleryRepository(tx); await repo.lockGym(gym); await authorize(tx, actor, gym);
      const row = await repo.find(gym, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
      await repo.remove(gym, id); return row.imageUrl;
    }).catch(staffingDatabaseError);
    if (/^[0-9a-f-]{36}\.(png|jpg)$/.test(key)) await images.remove(key);
    return { message: 'Đã xóa ảnh.' };
  },
  image: async (gym: string, id: string, actor?: string) => {
    const key = await database.transaction(async tx => {
      const repo = createGalleryRepository(tx);
      if (actor) await authorize(tx, actor, gym, true);
      else if (!await repo.publicGym(gym)) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym công khai.');
      const row = await repo.find(gym, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
      return row.imageUrl;
    }).catch(staffingDatabaseError);
    return images.read(key);
  },
});
export const galleryService = createGalleryService();

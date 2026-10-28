import { z } from 'zod';
const uuid = z.uuid().transform(v => v.toLowerCase());
export const galleryParams = z.object({ gymId: uuid }).strict();
export const galleryItemParams = galleryParams.extend({ imageId: uuid });
const caption = z.string().trim().max(200).transform(v => v || null);
export const galleryUpload = z.object({ caption: caption.optional(), image: z.object({
  mime_type: z.enum(['image/jpeg', 'image/png']), data: z.string().min(4).max(6990508).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(v => v.length % 4 === 0),
}).strict() }).strict();
export const galleryCaption = z.object({ caption, expected_updated_at: z.iso.datetime({ offset: true }) }).strict();
export const galleryOrder = z.object({ image_ids: z.array(uuid).max(10), expected_image_ids: z.array(uuid).max(10) }).strict();

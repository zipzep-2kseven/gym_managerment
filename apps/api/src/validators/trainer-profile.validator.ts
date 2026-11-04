import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max).transform(v => v || null);
export const trainerOwnInput = z.object({
  expected_updated_at: z.iso.datetime({ offset: true }), bio: text(2000),
  social_links: z.array(z.object({ platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE']),
    url: z.url({ protocol: /^https?$/ }).max(2048).refine(v => { const url = new URL(v); return !url.username && !url.password; }, 'Liên kết không được chứa tài khoản/mật khẩu.') }).strict()).max(5),
}).strict().superRefine((body, ctx) => {
  if (new Set(body.social_links.map(r => r.platform)).size !== body.social_links.length) ctx.addIssue({ code: 'custom', path: ['social_links'], message: 'Mỗi nền tảng chỉ có một liên kết.' });
});
export const trainerManagedInput = z.object({ expected_updated_at: z.iso.datetime({ offset: true }), specialization: text(200), experience_years: z.number().int().min(0).max(80).nullable() }).strict();
export type TrainerOwnInput = z.infer<typeof trainerOwnInput>;

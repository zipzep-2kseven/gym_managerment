import { z } from 'zod';
export const trainerDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const text = (max: number) => z.string().trim().max(max).transform(v => v || null);
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const trainerOwnInput = z.object({
  expected_updated_at: z.iso.datetime({ offset: true }), bio: text(2000),
  social_links: z.array(z.object({ platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE']),
    url: z.url({ protocol: /^https?$/ }).max(2048).refine(v => { const url = new URL(v); return !url.username && !url.password; }, 'Liên kết không được chứa tài khoản/mật khẩu.') }).strict()).max(5),
  working_schedules: z.array(z.object({ day_of_week: z.enum(trainerDays), start_time: time, end_time: time }).strict()).max(28),
}).strict().superRefine((body, ctx) => {
  if (new Set(body.social_links.map(r => r.platform)).size !== body.social_links.length) ctx.addIssue({ code: 'custom', path: ['social_links'], message: 'Mỗi nền tảng chỉ có một liên kết.' });
  for (const day of trainerDays) {
    const slots = body.working_schedules.filter(r => r.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    slots.forEach((row, i) => { if (row.end_time <= row.start_time || (i > 0 && slots[i - 1].end_time > row.start_time)) ctx.addIssue({ code: 'custom', path: ['working_schedules'], message: 'Giờ kết thúc phải sau giờ bắt đầu, không trùng ca hoặc qua nửa đêm.' }); });
  }
});
export const trainerManagedInput = z.object({ expected_updated_at: z.iso.datetime({ offset: true }), specialization: text(200), experience_years: z.number().int().min(0).max(80).nullable() }).strict();
export type TrainerOwnInput = z.infer<typeof trainerOwnInput>;

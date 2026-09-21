import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ message: 'Email là bắt buộc.' })
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng.')
    .max(254, 'Email tối đa 254 ký tự.'),
  password: z
    .string({ message: 'Mật khẩu là bắt buộc.' })
    .min(1, 'Mật khẩu không được để trống.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

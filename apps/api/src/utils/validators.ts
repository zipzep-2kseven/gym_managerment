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
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z
      .string({ message: 'Mật khẩu hiện tại là bắt buộc.' })
      .min(1, 'Mật khẩu hiện tại không được để trống.')
      .max(128, 'Mật khẩu hiện tại tối đa 128 ký tự.'),
    new_password: z
      .string({ message: 'Mật khẩu mới là bắt buộc.' })
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.')
      .max(128, 'Mật khẩu mới tối đa 128 ký tự.')
      .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa.')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ số.'),
    confirm_password: z.string().max(128).optional(),
  })
  .strict()
  .refine((data) => !data.confirm_password || data.new_password === data.confirm_password, {
    message: 'Xác nhận mật khẩu mới không khớp.',
    path: ['confirm_password'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const registerSchema = z.object({
  email: z
    .string({ message: 'Email là bắt buộc.' })
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng.')
    .max(254, 'Email tối đa 254 ký tự.'),
  password: z
    .string({ message: 'Mật khẩu là bắt buộc.' })
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số.'),
  full_name: z
    .string({ message: 'Họ và tên là bắt buộc.' })
    .trim()
    .min(2, 'Họ và tên phải có từ 2 đến 100 ký tự.')
    .max(100, 'Họ và tên phải có từ 2 đến 100 ký tự.'),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null))
    .refine((val) => val === null || /^(?:\+84|0)[35789]\d{8}$/.test(val), {
      message: 'Số điện thoại không đúng định dạng.',
    }),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Họ và tên phải có từ 2 đến 100 ký tự.')
      .max(100, 'Họ và tên phải có từ 2 đến 100 ký tự.')
      .optional(),
    phone: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => (val === undefined ? undefined : val && val.trim() !== '' ? val.trim() : null))
      .refine((val) => val === undefined || val === null || /^(?:\+84|0)[35789]\d{8}$/.test(val), {
        message: 'Số điện thoại không đúng định dạng.',
      }),
    date_of_birth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD.')
      .nullable()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const d = new Date(val);
          return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
        },
        { message: 'Ngày sinh không hợp lệ.' }
      ),
    gender: z
      .string()
      .trim()
      .max(50, 'Giới tính tối đa 50 ký tự.')
      .nullable()
      .optional(),
    address: z
      .string()
      .trim()
      .max(500, 'Địa chỉ tối đa 500 ký tự.')
      .nullable()
      .optional(),
    avatar_url: z
      .string()
      .trim()
      .url('Đường dẫn ảnh đại diện không đúng định dạng URL.')
      .max(2048, 'Đường dẫn ảnh đại diện tối đa 2048 ký tự.')
      .refine(value => {
        try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
        catch { return false; }
      }, { message: 'Ảnh đại diện phải dùng URL HTTP(S) không chứa tài khoản hoặc mật khẩu.' })
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      const allowedKeys = ['full_name', 'phone', 'date_of_birth', 'gender', 'address', 'avatar_url'];
      return allowedKeys.some((k) => (data as any)[k] !== undefined);
    },
    {
      message: 'Cần cung cấp ít nhất một trường thông tin để cập nhật.',
    }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

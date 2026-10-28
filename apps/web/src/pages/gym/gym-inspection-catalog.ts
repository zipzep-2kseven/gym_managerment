export const gymSections = {
  staff: { label: 'Nhân sự', resources: ['trainers', 'schedules', 'social'] },
  members: { label: 'Gói tập & hội viên', resources: ['packages', 'memberships', 'payments', 'consultations'] },
  pt: { label: 'Lịch PT', resources: ['appointments', 'registrations'] },
  facilities: { label: 'Cơ sở vật chất', resources: ['equipment', 'images'] },
  reports: { label: 'Báo cáo sự cố', resources: ['reports'] },
  reviews: { label: 'Đánh giá', resources: ['gym-reviews', 'trainer-reviews'] },
} as const;
export const resourceLabels: Record<string, string> = {
  trainers: 'Huấn luyện viên', schedules: 'Lịch làm việc PT', social: 'Liên kết của PT', packages: 'Gói tập',
  memberships: 'Hội viên', payments: 'Thanh toán', consultations: 'Yêu cầu tư vấn', appointments: 'Lịch hẹn PT',
  registrations: 'Đăng ký PT', equipment: 'Thiết bị', images: 'Ảnh phòng Gym', reports: 'Báo cáo sự cố',
  'gym-reviews': 'Đánh giá Gym', 'trainer-reviews': 'Đánh giá PT',
};
export const resourceColumns: Record<string, string[]> = {
  trainers: ['full_name', 'email', 'specialization', 'status'], schedules: ['trainer_name', 'day_of_week', 'start_time', 'end_time', 'status'],
  social: ['trainer_name', 'platform', 'url'], packages: ['package_name', 'duration_days', 'price', 'status'],
  memberships: ['full_name', 'email', 'package_name', 'end_date', 'status'], payments: ['full_name', 'package_name', 'amount', 'status', 'paid_at'],
  consultations: ['full_name', 'phone', 'preferred_contact', 'status'], appointments: ['customer_name', 'trainer_name', 'start_time', 'end_time', 'status'],
  registrations: ['customer_name', 'trainer_name', 'package_name', 'status'], equipment: ['equipment_code', 'equipment_type', 'condition', 'status'],
  images: ['caption', 'display_order'], reports: ['title', 'full_name', 'status', 'created_at'],
  'gym-reviews': ['full_name', 'rating', 'comment', 'status'], 'trainer-reviews': ['full_name', 'trainer_name', 'rating', 'comment', 'status'],
};
export const fieldLabels: Record<string, string> = {
  full_name: 'Họ tên', email: 'Email', phone: 'Điện thoại', specialization: 'Chuyên môn', experience_years: 'Số năm kinh nghiệm',
  bio: 'Giới thiệu', status: 'Trạng thái', availability: 'Nhận học viên', joined_at: 'Ngày tham gia', created_at: 'Ngày tạo', updated_at: 'Cập nhật gần nhất',
  trainer_name: 'Huấn luyện viên', customer_name: 'Hội viên', day_of_week: 'Thứ', start_time: 'Bắt đầu', end_time: 'Kết thúc',
  platform: 'Nền tảng', url: 'Liên kết', package_name: 'Gói tập', duration_days: 'Thời hạn (ngày)', price: 'Giá', description: 'Mô tả',
  start_date: 'Ngày bắt đầu', end_date: 'Ngày hết hạn', purchase_price: 'Giá đăng ký', amount: 'Số tiền', payment_method: 'Phương thức thanh toán',
  transaction_code: 'Mã giao dịch', paid_at: 'Ngày thanh toán', preferred_contact: 'Liên hệ mong muốn', preferred_date: 'Ngày tư vấn mong muốn',
  preferred_time: 'Giờ tư vấn mong muốn', content: 'Nội dung', assignee_name: 'Người phụ trách', processing_note: 'Ghi chú tư vấn',
  note: 'Ghi chú', registered_at: 'Ngày đăng ký', equipment_code: 'Mã thiết bị', equipment_type: 'Loại thiết bị', purchase_date: 'Ngày mua',
  condition: 'Tình trạng', caption: 'Chú thích', display_order: 'Thứ tự hiển thị', report_type: 'Loại sự cố', title: 'Tiêu đề',
  has_image: 'Ảnh đính kèm', resolver_name: 'Người xử lý', resolution_note: 'Ghi chú xử lý', resolved_at: 'Ngày giải quyết',
  rating: 'Số sao', comment: 'Nội dung đánh giá', hidden_at: 'Ngày ẩn', moderator_name: 'Người kiểm duyệt', hidden_reason: 'Lý do ẩn',
};
const values: Record<string, string> = {
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Khóa tạm', PENDING: 'Chờ xử lý', SUCCESS: 'Thành công', FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền', EXPIRED: 'Hết hạn', COMPLETED: 'Hoàn tất', CONFIRMED: 'Đã xác nhận',
  CONTACTED: 'Đã liên hệ', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', REJECTED: 'Đã từ chối', VISIBLE: 'Công khai', HIDDEN: 'Đã ẩn',
  GOOD: 'Tốt', MAINTENANCE: 'Bảo trì', BROKEN: 'Hỏng', OUT_OF_SERVICE: 'Ngừng sử dụng', ACCEPTING: 'Đang nhận', ALMOST_FULL: 'Sắp đầy', NOT_ACCEPTING: 'Ngừng nhận',
  MONDAY: 'Thứ hai', TUESDAY: 'Thứ ba', WEDNESDAY: 'Thứ tư', THURSDAY: 'Thứ năm', FRIDAY: 'Thứ sáu', SATURDAY: 'Thứ bảy', SUNDAY: 'Chủ nhật',
  EQUIPMENT: 'Thiết bị', FACILITY: 'Cơ sở vật chất', CLEANLINESS: 'Vệ sinh', SERVICE: 'Dịch vụ', OTHER: 'Khác',
};
export const inspectionValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Chưa cập nhật';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  const text = String(value);
  if (['price', 'purchase_price', 'amount'].includes(key)) return `${Number(value).toLocaleString('vi-VN')} ₫`;
  if (/(_at|_date)$/.test(key) || ['start_time', 'end_time'].includes(key) && text.includes('T')) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', ...(key.endsWith('_date') ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}) });
  }
  return values[text] || text;
};

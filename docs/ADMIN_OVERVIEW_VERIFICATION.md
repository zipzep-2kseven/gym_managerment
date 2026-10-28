# Tổng quan Admin — 2026-10-15

Trang `/admin/dashboard` giữ sidebar 4 mục đã chốt. Nội dung gồm tiêu đề, thời điểm cập nhật, 3 thẻ chỉ số và biểu đồ doanh thu 7 ngày bên dưới. Mobile xếp các thẻ dọc. Bấm toàn thẻ Gym/tài khoản mở danh sách tương ứng. Biểu đồ hỗ trợ rê chuột, chọn ngày bằng bàn phím/chạm và phần số liệu theo ngày thu gọn.

Doanh thu lấy từ `payments` có trạng thái hiện tại `SUCCESS`, theo `paid_at`, ngày Việt Nam. Giao dịch `REFUNDED` bị loại khỏi cả tổng tháng và ngày thanh toán ban đầu; không ghi một khoản âm vào ngày hoàn tiền. Vì vậy doanh thu lịch sử thay đổi khi giao dịch được hoàn tiền. Không lấy doanh thu từ giá trị memberships. Tổng tài khoản đếm mọi tài khoản đã đăng ký, gồm tất cả vai trò/trạng thái.

## Kiểm chứng

- Playwright `admin-dashboard.spec.ts`: 16/16 bài qua, gồm sidebar, tooltip, liên kết thẻ, bố cục 1440/375px, WCAG AA, tải lỗi/thử lại và thu hồi quyền. Chạy bằng cấu hình tạm kế thừa `playwright.admin-dashboard.config.ts` trên cổng 3117 vì cổng 3110 đang được dùng; cấu hình tạm được dọn sau kiểm thử.
- `npm run test:admin-dashboard --workspace @multi-gym/api`: qua; database tạm, kiểm tra ngày/tháng Việt Nam, số thập phân, loại giao dịch tương lai/null/hoàn tiền và quyền hiện hành.
- `npm run test:dashboard-cache --workspace @multi-gym/web`: 1/1 qua.
- `npm run typecheck --workspace @multi-gym/web`, `npm run typecheck:e2e --workspace @multi-gym/web`, `npm run build --workspace @multi-gym/web`: qua.
- ESLint các file TS/TSX thay đổi và `git diff --check`: qua.

Ảnh giao diện dùng dữ liệu API giả lập: [desktop](design/admin-workspace/previews/overview-1440.png), [mobile](design/admin-workspace/previews/overview-375.png). Đã xem trực tiếp cả hai ảnh. API được kiểm tra riêng bằng PostgreSQL tạm; chưa xác nhận số liệu trên môi trường triển khai.

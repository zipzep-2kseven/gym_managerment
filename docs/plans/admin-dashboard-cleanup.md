# Kế hoạch chỉnh dashboard Admin — 2026-10-14

> Cập nhật yêu cầu ngày 2026-10-15: Admin được xem đầy đủ thông tin từng Gym, gồm báo cáo sự cố ở chế độ chỉ xem. Các quyết định cũ về chặn quyền đọc và bỏ màn thông tin được thay thế bởi [kế hoạch mới](admin-table-layout-and-gym-details.md). Nội dung bên dưới lưu lịch sử triển khai ngày 2026-10-14.

Phạm vi: Admin quản lý phòng Gym, tài khoản và kiểm duyệt đánh giá. Yêu cầu của người dùng gồm lập kế hoạch và thực hiện ngay.

1. Điều hướng (không phụ thuộc): giữ Tổng quan và ba chức năng; sidebar không đổi thành menu vận hành khi chọn Gym. Xóa các lối tắt trùng lặp. Kiểm tra: browser desktop/mobile, đường dẫn cũ.
2. Danh sách Gym (phụ thuộc API): API trả Manager ACTIVE cùng danh sách bằng LEFT JOIN, không phát sinh N+1. Bảng có tên, địa chỉ, Manager, trạng thái, Xem/Sửa/Xóa; tìm kiếm, lọc, phân trang. Kiểm tra: API integration và browser.
3. Chi tiết Gym (phụ thuộc 1–2): tách xem/sửa; bổ nhiệm và lịch sử phân công nằm trong Gym; form chỉ mở khi cần. Xóa có xác nhận, API Admin kiểm tra quyền hiện hành và để FK ngăn xóa dữ liệu liên kết (kể cả phân công Manager). Kiểm tra: browser và API xóa Gym trống/Gym có liên kết.
4. Báo cáo sự cố (độc lập): giữ luồng Customer/Manager, bỏ route Admin và quyền Admin trên API danh sách, ảnh và xử lý. Kiểm tra: integration từ chối Admin và Manager khác Gym, giữ Manager đúng Gym.

Checkpoint: typecheck, build, lint các file thay đổi, browser desktop/mobile (bao gồm accessibility), API integration liên quan. Không thay đổi schema/migrations, không xóa dữ liệu thật.

Ghi chú phạm vi: bỏ các màn hình vận hành khỏi router Admin trong đợt UI này; không tự động mở rộng thay đổi chính sách API của tất cả phân hệ PT/gói tập/hội viên/ảnh vốn có đặc tả và bộ kiểm thử riêng. Báo cáo sự cố được sửa quyền API ngay theo yêu cầu rõ ràng.

## Kết quả triển khai

- [x] Sidebar cố định: Tổng quan, Quản lý phòng Gym, Quản lý tài khoản, Kiểm duyệt đánh giá. Bỏ cụm lối tắt dashboard trùng chức năng và nút vai trò riêng trong trang tài khoản.
- [x] Bảng Gym đủ 5 cột; Manager lấy qua LEFT JOIN và chuẩn hóa null khi chưa bổ nhiệm. Phân trang chỉ xuất hiện khi có nhiều trang.
- [x] Tách `/admin/gyms/:gymId` (xem) và `/admin/gyms/:gymId/edit` (sửa). Manager nằm trong chi tiết Gym; chọn tài khoản theo tên/email thay vì nhập UUID. Lịch sử phân công thu gọn.
- [x] Xóa có dialog xác nhận, hỗ trợ Escape và trả focus. API chỉ cho Admin hiện hành; FK RESTRICT bảo vệ dữ liệu liên kết, trả 409 có hướng dẫn ngừng hoạt động.
- [x] Bỏ route và quyền API báo cáo của Admin. Customer giữ quyền báo cáo của mình; Manager cần phân công ACTIVE tại đúng Gym.
- [x] Các route vận hành cũ ở workspace Admin chuyển về danh sách Gym. Sidebar không chuyển thành menu nghiệp vụ Gym.

## Kiểm chứng ngày 2026-10-14

- `npm run lint`: qua, không có warning.
- `npm run typecheck` và `npm run build`: qua toàn bộ workspaces.
- `npm run test:admin-dashboard --workspace @multi-gym/web`: 30/30 bài qua; API giả lập, desktop/mobile, kiểm tra WCAG AA, focus dialog, bổ nhiệm/thu hồi và cache.
- `npm run test:lifecycle --workspace @multi-gym/api`: qua các nhóm lifecycle/migration, staffing, Gym management, Gym write và discovery, sử dụng PostgreSQL database tạm.
- `npm run test:reports --workspace @multi-gym/api`: 9 nhóm qua, bao gồm từ chối Admin xem/ảnh/xử lý và bảo vệ phạm vi Manager.
- Ảnh kiểm tra giao diện: `docs/design/admin-workspace/previews/cleanup-list-1440.png`, `cleanup-list-375.png`, `cleanup-detail-1440.png`, `cleanup-detail-375.png` (dữ liệu giả lập).

Giới hạn: đợt này thu gọn workspace Admin và sửa quyền API báo cáo sự cố. Quyền API cũ của PT, gói tập, hội viên và ảnh chưa được thu hẹp đồng loạt; không dùng việc ẩn menu làm bằng chứng các API đó đã bị chặn. Gym có lịch sử phân công Manager cũng không xóa được, kể cả khi phân công đã thu hồi.

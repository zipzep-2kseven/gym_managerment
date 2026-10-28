# APP-02 — Customer Calendar Verification

Ngày: 2026-10-09. Phạm vi: calendar Customer tại `/my-pt`, dùng nghiệp vụ và API PT hiện có.

## Changed

Thêm `CustomerCalendar`, `CustomerAppointmentDetail` và helper thời gian Việt Nam. Tích hợp workspace Customer, query tải đủ các trang `/pt-appointments/me` với pageSize=100, deduplicate theo appointment_id. Có ngày/tuần/danh sách, bộ lọc Gym/trạng thái, điều hướng ngày, chi tiết và form dời/hủy. Bổ sung CSS responsive, suite Playwright và tài liệu plan/UI/README.

## Why

Customer cần xem lịch tập với PT theo ngày/tuần, tìm lịch theo Gym/trạng thái và thao tác từ chi tiết. Luồng đăng ký/thẻ/đặt lịch đã có giữ nguyên; calendar phải bao gồm cả lịch nằm ngoài trang đầu.

## Tests

- `npm run test:customer-calendar -w apps/web`: **4/4 PASS**, Chromium, trình duyệt America/Los_Angeles với giờ kiểm thử cố định. Kiểm tra đủ trang, thứ Hai đầu tuần, ngày Việt Nam, midnight [start,end), continuation, lọc kết hợp, điều hướng, dời với offset +07:00, hủy có lý do, quyền Customer, terminal history, dialog/focus/Escape, pending/conflict, lỗi trang sau/retry và responsive 375/768/1024/1440.
- `npm run test:pt-workflow -w apps/web`: **2/2 PASS**, gồm luồng thật với API/PostgreSQL fixture tạm: thẻ demo → PT → yêu cầu lịch → xác nhận → dời → hủy → đổi PT → Admin đọc lịch sử; Customer đọc lịch qua component mới. Test thứ hai kiểm tra pending/conflict lúc tạo lịch.
- `npm run typecheck -w apps/web`: **PASS**.
- `npm run build -w apps/web`: **PASS**, Vite 130 modules, JS 304.99 kB (gzip 89.36 kB).

## Verification

Đã xem ảnh calendar ở `/tmp/customer-calendar-375.png` và `/tmp/customer-calendar-1440.png`: ngày/trạng thái rõ, desktop 7 cột, mobile 1 cột, không tràn ngang. Dialog được kiểm tra bằng browser ở cả bốn kích thước.

Docker dev API/web đang running, PostgreSQL healthy. `/health` tại port 4000 trả 200; module `/src/pages/pt/CustomerCalendar.tsx` tại port 3000 trả 200. Web dùng bind mount và Vite nên phục vụ code mới; không cần chạy migration hoặc restart dịch vụ. Kiểm thử ghi chạy trên fixture tạm, không tạo giao dịch/lịch demo vào database vận hành.

## Issues / limits

Không có lỗi chặn trong các kiểm tra trên. API hiện tại chưa lọc theo khoảng ngày nên frontend tải lịch sử đầy đủ; dữ liệu lớn cần cân nhắc API range riêng sau này. Phân trang không cung cấp snapshot nguyên tử nếu dữ liệu đổi giữa các request; làm mới lịch đồng bộ lại theo backend.

Calendar dành cho tài khoản CUSTOMER không đồng thời role PT. PT/Manager/Admin và tài khoản hai role Customer/PT giữ workspace danh sách hiện có; calendar cho staff không thuộc yêu cầu lần này. Không triển khai lịch tự tập, notification, drag/drop, slot realtime hoặc lưu chế độ xem qua WebStorage.

## Architecture Impact

Chỉ sửa frontend và tài liệu; không thêm package, API, bảng/cột, migration hoặc policy nghiệp vụ. TanStack Query giữ server state theo user; mọi quyền/scope/validation/thay đổi trạng thái vẫn do APP-01 backend kiểm tra. Dời/hủy dùng form/service hiện có, invalidate query PT sau thành công. Thời gian theo Asia/Ho_Chi_Minh, giao ngày dùng [start,end) như policy đã duyệt.

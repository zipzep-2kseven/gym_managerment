# CON-01/CON-02 — Đăng ký tư vấn đơn giản

Ngày: 2026-10-10. Người dùng duyệt triển khai các đề xuất tư vấn tối giản trong cuộc trò chuyện, đã ghi nhận trong Architecture/Domain.

## Changed

- Public Gym đổi CTA thành **Đăng ký tư vấn**. Trang `/gyms/:gymId/consultation` có họ tên/số điện thoại bắt buộc, nội dung và thời gian tiện liên hệ tùy chọn. Guest gửi không login/thẻ; phiên hợp lệ điền sẵn thông tin và cho sửa. Success khóa gửi lại, focus kết quả; pending khóa form; lỗi giữ input và không tự retry.
- Manager có `/manager/consultations` và liên kết điều hướng: danh sách phân trang/lọc trạng thái/làm mới, bấm gọi, ghi chú xử lý và chuyển trạng thái. Chờ liên hệ → Đã liên hệ → Hoàn thành; hủy cần lý do và xác nhận. Nội dung khách giữ riêng, terminal không sửa/mở lại.
- Ba endpoint POST/GET/PATCH consultation-requests, validator/service/repository và limiter riêng. Optional auth không hạ cookie lỗi thành Guest. Public response chỉ xác nhận nhận yêu cầu, không có contact/ID/actor.
- Migration `0005_consultation_simple`: thêm preferred_contact VARCHAR(200) và processing_note TEXT nullable vào bảng hiện có; giữ nguyên 21 bảng và dữ liệu. Rollback fail-safe khi field mới có dữ liệu. Không ghi vào preferred_date/preferred_time/email/assigned_to cũ.
- Cập nhật Architecture/Domain/Feature/UI/API/Database/Plan/README; thêm scripts test:consultation, tests và Playwright config. Cập nhật hai kiểm tra Gym UI cho CTA/form đã triển khai, giữ các regression còn lại.

## Why

Khách để lại thông tin, Manager liên hệ để thống nhất nhu cầu và giờ đến Gym. Form ngắn phù hợp quy trình tiếp nhận thực tế, không đòi hỏi vận hành slot lịch hoặc phân công nhân viên. Ghi chú riêng tránh thay đổi nội dung khách gửi.

## Tests

- `npm run test:consultation -w apps/api`: **8 nhóm PASS**, database tạm với migrations 0000–0005. Bao gồm Guest, DTO riêng tư, validation/allowlist, Gym inactive/UUID sai, actor từ phiên, account/password gate, quyền Manager đúng Gym thay JWT claims, Admin/PT/Customer bị chặn, phân trang, chuyển trạng thái/lý do hủy, ghi chú riêng, concurrency, revoke assignment, IP limiter và expiry, migration/rollback bảo toàn dữ liệu.
- `npm run test:consultation -w apps/web`: **3/3 PASS**. Luồng browser/API/database thật Guest gửi → Manager gọi/ghi chú/đã liên hệ/hoàn thành; hủy có lý do và giữ nội dung; profile điền sẵn nhưng sửa được, pending không gửi lặp, 429 giữ input. Public form không tràn ngang tại 375/768/1024/1440; kiểm tra không lưu WebStorage.
- `npm run test:gym-ui -w apps/web`: **24/24 PASS** sau cập nhật CTA và thay ca placeholder bằng form tư vấn thực tế.
- `npm run test:reports -w apps/api`: **8 nhóm PASS** trên migration chain hiện tại.
- API build, typecheck tests; Web typecheck/build: **PASS**. Web build 138 modules, JS 323.83 kB/gzip 94.02 kB. `git diff --check`: **PASS**. Không tính placeholder lint là kiểm tra lint.

## Verification

Đã xem ảnh `/tmp/consultation-public.png` và `/tmp/consultation-manager.png`: form liên hệ ngắn, thời gian ghi dạng chữ; inbox có số gọi, trạng thái và ghi chú. Ghi dữ liệu kiểm thử chỉ trên database tạm, không tạo yêu cầu hoặc giao dịch thử trong database vận hành.

Docker config được kiểm tra, API image build thành công. Backup database trước migration: `/tmp/gym-consultation-20261010-0osjzvbr/database.dump` (92.680 bytes), pg_restore --list thành công; archive permission 0600, thư mục 0700. Đã áp dụng migration 0005 và khởi động lại API Docker dev; không reset DB hoặc volume.

Sau triển khai: journal 6 migrations, hai cột mới hiện diện, consultation_requests vận hành vẫn 0 bản ghi; API/web running, PostgreSQL healthy. Smoke browser chỉ đọc trên localhost: health 200, Public Gym API 200, mở trang Đăng ký tư vấn và form thành công, 0 runtime errors/0 writes. Web chạy source bind mount/Vite; không rebuild web Docker image, đã build ứng dụng bằng workspace script.

## Issues

Không có lỗi chặn trong kiểm tra trên. Limiter 5 lần/15 phút/IP nằm trong bộ nhớ một process, không tin X-Forwarded-For khi trust proxy tắt; restart sẽ reset, cần xem lại khi có proxy/nhiều replica. Không CAPTCHA hoặc POST idempotency; mất mạng UI hướng dẫn liên hệ Gym trước gửi lại. Cookies sai cần đăng nhập lại, không tự gửi dưới danh nghĩa Guest.

Ghi chú là một giá trị hiện tại, không phải nhật ký; lưu mới thay giá trị cũ. expected_status bảo vệ thao tác dựa trên trạng thái cũ, không phát hiện hai lần sửa ghi chú cùng trạng thái; ghi sau cùng thắng. Không có notification/SLA, slot/giữ chỗ, reassign, lịch sử riêng cho khách hoặc quyền Admin/Staff/PT. Liên hệ cũ dạng email/preferred_date/preferred_time không được hiển thị trong inbox mới; không có dữ liệu consultation cũ trong môi trường Docker được kiểm tra.

Build Docker npm ci thông báo dependency audit warnings có sẵn; không thay package hoặc thực hiện audit fix trong task này.

## Architecture Impact

Không đổi stack/auth hoặc thêm package/table. Thay đổi schema additive hai cột được ghi trong quyết định nghiệp vụ người dùng đã duyệt. Giữ REST/service/repository/Drizzle, HttpOnly cookies và TanStack Query. Manager role và assignment ACTIVE đọc lại từ DB; mọi query resource có gym_id. Tạo và cập nhật khóa parent Gym trong transaction ngắn; PATCH thêm khóa row. Response no-store, strict allowlist, phone chuẩn hóa; không public contact hoặc actor/assignment trong DTO.

Q-19 đóng phần Consultation tối giản, Q-14 Staff và Gallery/storage vẫn OPEN. Không sinh Appointment/Payment/Membership hoặc tự phân công PT, không mở rộng sang booking hay chat.

# Báo cáo sự cố đơn giản — Verification

Ngày: 2026-10-10. Người dùng duyệt hai sửa đổi: Customer gửi nội dung/ảnh không chọn máy; hoãn danh mục và quản lý từng máy khỏi demo.

## Changed

- Customer có trang `/reports`: chọn Gym có thẻ đang hoạt động và còn hạn, nhập nội dung, đính kèm tối đa một ảnh tùy chọn. Không nhập mã máy hoặc chọn thiết bị. Có lịch sử, lọc trạng thái và kết quả xử lý.
- Manager có trang `/manager/reports` theo Gym được phân công; Admin mở báo cáo từ trang quản trị từng Gym. Tiếp nhận chuyển PENDING → IN_PROGRESS; giải quyết chuyển IN_PROGRESS → RESOLVED với ghi chú; từ chối PENDING/IN_PROGRESS → REJECTED với lý do. Không mở lại báo cáo đã kết thúc hoặc sửa nội dung/ảnh gốc.
- Bổ sung API report theo API_SPEC §24, service/repository/validator và ảnh private. Không triển khai API/UI danh mục hoặc quản lý máy trong demo; giữ nguyên các bảng và dữ liệu thiết bị.
- Migration `0004_report_without_equipment` bỏ CHECK bắt buộc thiết bị cho báo cáo loại EQUIPMENT; không thêm bảng/cột hoặc xóa dữ liệu. Form mới được backend phân loại OTHER và lưu equipment_id NULL. Rollback từ chối nếu dữ liệu không còn thỏa CHECK cũ.
- Đồng bộ Architecture/Domain/Feature/Database/API/UI/Implementation Plan/README và cấu hình volume ảnh Docker.

## Why

Customer có thể báo sự cố ngay tại phòng tập bằng mô tả và ảnh. Manager nhận đủ thông tin để kiểm tra thực tế, không cần duy trì danh mục mã máy chỉ để gửi báo cáo. Việc giữ schema hiện tại bảo toàn dữ liệu và cho phép xem xét quản lý thiết bị sau này.

## Tests

- `npm run test:reports -w apps/api`: **8 nhóm PASS** trên database tạm với đầy đủ migration. Kiểm tra eligibility, account/role thực trong DB, Gym scope, ownership ảnh, strict payload, chữ ký/MIME ảnh, pagination, lịch sử sau khi thẻ hết hạn, metadata xử lý, cạnh tranh resolve/reject và rollback fail-safe.
- `npm run test:reports -w apps/web`: **3/3 PASS**. Luồng thật Customer đăng nhập → mua thẻ demo → gửi nội dung/ảnh → Manager tiếp nhận/giải quyết → Customer xem kết quả. Kiểm tra ảnh thực sự giải mã và hiển thị trong browser, payload ảnh trên 100 kB, responsive 375/768/1024/1440, không lưu dữ liệu vào WebStorage. Các ca bổ sung kiểm tra thiếu thẻ, ảnh SVG bị từ chối, pending không gửi hai lần và lỗi 403 giữ nội dung.
- Regression Gym UI: **24/24 PASS**. Regression Gym write/onboarding: **12 ca PASS**; staffing: **12 ca PASS**, trên schema hiện tại.
- API typecheck/build và typecheck tests: **PASS**. Web typecheck/build: **PASS** (135 modules; JS 317.15 kB, gzip 92.62 kB).
- `git diff --check`: **PASS**.

## Verification

Đã xem ảnh browser `/tmp/reports-customer.png` và `/tmp/reports-manager.png`; ảnh báo cáo hiển thị, nội dung và thao tác xử lý rõ ràng. Kiểm thử ghi dữ liệu dùng fixture/database tạm, không tạo báo cáo hoặc giao dịch thử trong database vận hành.

Docker development đã build API, backup database trước thay đổi, áp dụng migration 0004 và khởi động lại API. Backup ở `/tmp/gym-report-20261010-pfmy86_s/database.dump` (92.773 bytes), đã kiểm tra danh mục bằng pg_restore. Volume `multi_gym_report_images` được gắn tại `/app/data/report-images`.

Kiểm tra sau triển khai: journal có 5 migrations, CHECK bắt buộc thiết bị đã được bỏ, database vận hành vẫn có 0 reports; API health và module giao diện trả 200. Smoke browser chỉ đọc: Admin đăng nhập → mở Gym → mở báo cáo, API trả 200 và không có runtime error. API/web đang chạy, PostgreSQL healthy.

## Issues / limits

Không có lỗi chặn trong các kiểm tra trên. Ảnh JPEG/PNG đầu vào tối đa 5 MiB, tối đa 20 megapixels. Browser thu nhỏ và mã hóa lại JPEG trước gửi; backend kiểm tra base64, dung lượng, MIME/chữ ký/cấu trúc và kích thước. Đây không phải cơ chế quét malware hoặc giải mã ảnh đầy đủ phía backend.

Ảnh lưu private trên filesystem/volume cho demo; upload production bị tắt cho đến khi chọn storage. Backup/restore cần gồm cả database và volume ảnh. File và transaction DB không nguyên tử chung: lỗi thông thường có cleanup, nhưng crash hoặc kết quả commit không xác định có thể để lại file mồ côi; chưa có tác vụ đối soát tự động.

POST report chưa có idempotency. UI khóa khi đang gửi, không tự retry; mất mạng hướng dẫn tải lại danh sách trước khi gửi lại. Không có email/push notification, nhiều ảnh, mở lại báo cáo hoặc nghiệp vụ bảo trì/kho thiết bị. Storage ảnh Gym/avatar và payment production vẫn ngoài phạm vi quyết định này.

## Architecture Impact

Giữ 21 bảng, REST/Express/TypeScript/Drizzle/PostgreSQL và TanStack Query; không thêm package. Quyền đọc/ghi/ảnh lấy từ account/role/assignment/ownership hiện hành trong DB, không tin actor hoặc Gym do body khai báo. Ghi report và chuyển trạng thái khóa parent Gym trong transaction; ảnh không giữ khóa DB lúc ghi filesystem. Tái kiểm tra eligibility trong transaction tạo report.

Parser ảnh có giới hạn riêng sau authentication và kiểm tra eligibility; các request JSON khác giữ giới hạn cũ. File dùng tên UUID server, permission riêng, không public static; endpoint ảnh yêu cầu session và quyền, no-store/nosniff, MIME cố định. Browser tải ảnh qua CORS với credentials. Không trả file key hoặc thông tin tài khoản Customer trong DTO.

Hai thay đổi nghiệp vụ và phạm vi upload demo đã được ghi trong Architecture Decisions/Domain Rules. Các câu hỏi production còn mở không được coi là hoàn thành bởi bản demo.

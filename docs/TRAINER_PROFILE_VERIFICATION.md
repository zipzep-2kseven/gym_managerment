# TPR-01 — Hồ sơ PT và giờ làm việc tham khảo

Ngày kiểm chứng: 2026-10-10. Thực hiện theo đề xuất đã được người dùng duyệt và quyết định Q-16/Q-18 trong Architecture/Domain.

## Changed

- Thêm validator/repository/service/router trainer-profile. API_SPEC §27 mô tả GET/PUT `/trainer-profile/me` và GET/PATCH `/gyms/:gymId/management/trainers/:trainerId/profile`.
- PT vào **Hồ sơ PT** (`/pt/profile`) để sửa giới thiệu, liên kết và giờ theo tuần. Tên/ảnh dẫn tới hồ sơ cá nhân hiện có. Manager vào **Quản lý PT → Hồ sơ và giờ làm việc** để sửa chuyên môn/số năm kinh nghiệm, xem giới thiệu/liên kết/giờ; không sửa thay các phần PT quản lý.
- Trang PT công khai hiển thị giờ theo thứ, kèm giải thích giờ tham khảo không thể hiện chỗ trống và lịch tập cần PT xác nhận. Availability giữ chính sách hiện có.
- Giới thiệu tối đa 2.000 ký tự, chuyên môn 200 ký tự, kinh nghiệm 0–80 năm. Tối đa 5 liên kết, mỗi nền tảng một liên kết HTTP(S), không nhận thông tin đăng nhập trong URL. Tối đa 28 ca/tuần; nhiều ca/ngày, phút HH:mm theo giờ Việt Nam, không qua đêm hoặc chồng lấn; hai ca liền nhau được phép.
- Ghi nguyên tử, kiểm tra phiên bản hồ sơ để chống ghi đè. Bỏ ca chuyển sang INACTIVE, thêm lại ca trùng dùng lại bản ghi. UI khóa khi lưu, giữ nội dung khi lỗi, không tự retry; lỗi quyền làm mới phiên. Tắt refetch khi đổi cửa sổ để tránh mất nội dung đang nhập.
- Cập nhật README, tài liệu nghiệp vụ/contract/UI/plan và scripts kiểm thử. Không thêm package, bảng, cột hay migration.

## Why

Khách cần hiểu PT phụ trách lĩnh vực gì và thường làm việc lúc nào. PT tự quản lý thông tin giới thiệu, Manager kiểm soát thông tin chuyên môn tại đúng Gym. Giờ theo tuần chỉ là tham khảo; yêu cầu lịch và xác nhận PT tiếp tục dùng luồng Appointment hiện có.

## Tests

- `npm run test:trainer-profile -w apps/api`: **7 nhóm PASS** trên database tạm với toàn bộ migrations. Kiểm tra auth/quyền thực từ DB, ownership/cross-Gym, DTO không lộ credential/contact riêng, allowlist, giới hạn, URL không hợp lệ, ca chồng/qua đêm/liền nhau, atomic rollback, stale/concurrent save, lịch sử INACTIVE và tái sử dụng ID, phân công bị thu hồi và yêu cầu đổi mật khẩu.
- API thật tạo Appointment ngoài giờ tham khảo thành công; xóa toàn bộ giờ tham khảo giữ nguyên dữ liệu Appointment đã tạo.
- `npm run test:trainer-profile -w apps/web`: **3/3 PASS**. PT sửa hồ sơ/giờ → Manager sửa chuyên môn → Guest xem; pending chặn gửi lặp; lỗi stale/chồng giờ giữ nội dung. Không lưu token trong WebStorage. Không tràn ngang tại 375/768/1024/1440 px.
- Hồi quy API PT workflow: **17 ca PASS**; kiểm tra migration/rollback PT workflow: **3 ca PASS**. Hồi quy trình duyệt PT workflow: **2/2 PASS**; Gym UI: **24/24 PASS**.
- API typecheck, typecheck tests và build: **PASS**. Web typecheck/build sau chỉnh khoảng cách các liên kết và tắt refetch khi focus: **PASS**, 147 modules, JS 339,14 kB/gzip 97,67 kB. Docker Compose config và API image build: **PASS**. Không tính placeholder lint là lint thật.

## Verification

Đã xem ảnh `/tmp/trainer-profile-own.png` và `/tmp/trainer-profile-public.png`; sau đó chỉnh nhóm liên kết hồ sơ cá nhân/công khai để có khoảng cách rõ hơn. Kiểm thử browser chạy trên API/database tạm, không tạo hồ sơ, thẻ hoặc Appointment thử trong database vận hành.

API Docker đã rebuild và recreate thành công. Smoke chỉ đọc: health **200**, Guest gọi hồ sơ riêng **401**, module giao diện đang phục vụ **200**. Web dùng source bind mount/Vite hiện có; đã build workspace, không rebuild web Docker image. Kiểm tra vận hành ghi nhận 6 migrations, 0 working schedules và 0 social links; không reset DB hoặc chạy migration mới.

Để thử: Manager hiện có vào **Quản lý PT → Tiếp nhận PT** để cấp tài khoản PT. PT đăng nhập, đổi mật khẩu tạm theo luồng hiện có rồi mở **Hồ sơ PT**, thêm giới thiệu/liên kết/ca và lưu. Manager xem hồ sơ, sửa chuyên môn/kinh nghiệm; mở trang PT công khai để đối chiếu. Không ghi credential vào báo cáo này.

## Issues

Không có lỗi chặn trong các kiểm tra trên. Giờ tham khảo không phải lịch trống, không hạn chế đặt lịch ngoài giờ và không tự dời/hủy Appointment; chưa đồng bộ lịch bên ngoài hoặc có luồng duyệt giờ.

Không thêm upload avatar/chứng chỉ; tên/ảnh dùng hồ sơ hiện có. Nội dung nhập chưa lưu cục bộ; tải lại hồ sơ chủ động hoặc mutation thành công có thể thay phiên bản form. Khi nhận lỗi phiên bản cũ, cần tải lại và đối chiếu trước khi lưu.

Quy tắc chồng ca được kiểm tra trong API và tuần tự hóa qua khóa Gym; SQL trực tiếp ngoài API không tự nhận toàn bộ validation này. Dependency hiện có vẫn có npm audit warnings trong Docker build; không thêm package hoặc chạy audit fix trong task này.

## Architecture Impact

Giữ stack, 21 bảng, JWT HttpOnly cookie, Drizzle/PostgreSQL và TanStack Query. Q-16/Q-18 đã chốt theo phê duyệt người dùng; không chốt thêm policy review, storage production hoặc thanh toán thật.

Mọi quyền PT/Manager và phân công được kiểm tra lại từ DB trong transaction. Ghi khóa Gym trước account/assignment, yêu cầu Gym và PT ACTIVE, lọc cả Gym/trainer ở thao tác hồ sơ; chỉ PT chính chủ sửa phần tự quản lý, chỉ Manager đúng Gym sửa chuyên môn/kinh nghiệm. Timestamp tăng đơn điệu để kiểm tra phiên bản. Không ghi Registration/Appointment trong service hồ sơ, không thay đổi trạng thái hoặc lịch hẹn khi thay giờ theo tuần.

# REV-02 — Admin quản lý đánh giá

Ngày: 2026-10-10. Người dùng yêu cầu góp ý sát thực tế và thực hiện. Áp dụng moderation thủ công tối giản, giữ nội dung và audit; không tự ẩn vì điểm thấp.

## Changed

- Thêm review-moderation repository/service/controller/router; mở GET `/admin/reviews` và PATCH `/admin/reviews/:kind/:reviewId/hide` theo API_SPEC §29. Validator strict cho kind/Gym/status/page và hidden_reason 1–1.000 ký tự sau trim.
- Service review hiện có dùng lại moderation service cho hide, giữ raw-row return cho callers/test baseline. Quyền Admin ACTIVE/đã đổi mật khẩu tạm được kiểm tra từ DB với khóa account/role trong transaction, không tin JWT role claims.
- Admin list lọc Gym/PT, Gym và VISIBLE/HIDDEN; mới nhất trước/ID ổn định, phân trang; đọc cả Gym/PT INACTIVE. Projection gồm tên/ID cần nhận diện, nội dung/rating/ngày và audit ẩn; không email/phone/credential. Không đổi public/self projection REV-01.
- `/admin/reviews` và menu **Quản lý đánh giá**: tìm Gym có phân trang, chọn loại/trạng thái, xem nội dung gốc/lịch sử ẩn. Form lý do → Tiếp tục → Xác nhận ẩn, có hủy; pending khóa form, không retry PATCH; lỗi giữ lý do, tải lại để đối chiếu. Thành công làm mới moderation/public/self cache và về trang 1 để không mắc ở trang rỗng sau ẩn.
- Hiển thị lời nhắc không ẩn vì rating thấp/góp ý về dịch vụ. Review HIDDEN chỉ đọc audit, không có nút sửa/xóa/unhide hoặc ẩn lại. Text dài không làm tràn ngang.
- Cập nhật README, Architecture/Domain/Feature/API/Database/UI/Plan và scripts kiểm thử. Không thêm package, bảng, cột, migration, lịch sử/audit table mới.

## Why

Admin cần xử lý nội dung vi phạm mà vẫn bảo toàn trải nghiệm thật của hội viên. Nhập lý do và xác nhận giúp tránh thao tác nhầm; audit một lần giúp truy lại việc xử lý. Điểm thấp không phải bằng chứng vi phạm. Màn hiện tại dùng xử lý thủ công, không thêm báo cáo review, duyệt trước đăng hoặc tự động phân loại nội dung.

## Tests

- `npm run test:review-moderation -w apps/api`: **6 nhóm PASS** trên DB tạm/full migrations. Guest/Customer/Manager/PT denied kể cả JWT claims Admin; DB-current Admin list/hide; filter Gym/kind/status/pagination/empty; safe DTO/no-store; rating thấp vẫn VISIBLE; strict reason/query/body/params và wrong kind; hai Admin cùng ẩn chỉ một 200 và một 409; rating/comment/audit gốc giữ nguyên, retry không ghi đè; DELETE/edit bị DB trigger chặn; hidden khỏi public aggregate/list, self không audit; xử lý Gym/PT INACTIVE; role revocation/password/suspended account từ chối.
- `npm run test:review-moderation -w apps/web`: **2/2 PASS** sau chỉnh wrap nội dung dài. Browser/API/DB thật: Customer gửi Gym/PT → Admin lọc, nhập lý do, hủy rồi xác nhận ẩn → Guest empty/public average loại hidden → Customer còn bản gốc HIDDEN nhưng không audit. Pending chặn lặp, 409 giữ lý do; tải lại hiện audit Admin khác. Responsive 375/768/1024/1440 px, gồm chuỗi nhận xét dài không ngắt; WebStorage rỗng.
- Hồi quy REV-01: `npm run test:reviews -w apps/api` **8 nhóm PASS**; `npm run test:reviews -w apps/web` **2/2 PASS**. Gym UI: **24/24 PASS**.
- Baseline `node_modules/.bin/tsx apps/api/tests/database-business.test.ts`: **31 checks + 12 staffing + 13 repository + 15 scope + 15 scope integration PASS**, giữ tương thích service hide và baseline trigger/relations.
- API typecheck/typecheck tests/build và Web typecheck/build **PASS**. Build web cuối: 154 modules, JS 350,17 kB/gzip 100,68 kB. Docker Compose config/API image build và `git diff --check` **PASS**. Không tính placeholder lint là lint thật.

## Verification

Đã xem `/tmp/review-moderation-admin.png` và `/tmp/review-moderation-form.png`: filters, nội dung, sao, lý do/xác nhận, lỗi/tải lại và lịch sử xử lý hiển thị rõ. Kiểm thử chỉ dùng database tạm và credential fixture; không thêm review hoặc hide review thật trong DB vận hành.

API Docker rebuild/recreate thành công; web dùng source bind mount/Vite hiện có, đã build workspace, không rebuild web Docker image. Smoke vận hành chỉ đọc: health 200, Guest gọi Admin reviews 401, public reviews 200, module ReviewModerationPage 200. Counts trước/sau smoke: 6 migrations, 0 gym_reviews, 0 trainer_reviews. Không migrate/reset DB.

Để thử: Customer đủ điều kiện gửi review theo REV-01 → Admin đăng nhập → **Quản lý đánh giá**, chọn loại/Gym/trạng thái → Ẩn đánh giá → lý do → Tiếp tục → Xác nhận ẩn. Chọn Đã ẩn để xem audit. Đăng xuất mở Gym/PT đối chiếu public; Customer đăng nhập vẫn thấy bản đã gửi. Không có dữ liệu review giả được seed vào môi trường vận hành.

## Issues

Không có lỗi chặn trong các kiểm tra trên. Lời nhắc không ẩn vì điểm thấp là policy vận hành, backend không tự phán xét nội dung hoặc lý do; Admin chịu trách nhiệm quyết định. Lý do nhập tự do, không thêm enum/cột phân loại.

Không có unhide, sửa/xóa, report review, notification, duyệt nhiều bước, bulk hide, export hoặc lọc theo số sao. Draft lý do chưa gửi không lưu cục bộ; đổi bộ lọc/tải lại trang có thể mất draft. Mất mạng sau commit cần tải lại; PATCH không tự retry, 409 giữ audit cũ. Public read đang diễn ra trong snapshot trước commit có thể hoàn tất với dữ liệu cũ; request mới sau commit chỉ VISIBLE. Không thu hồi nội dung đã tải trước đó.

Giới hạn REV-01 về duplicate/COMPLETED ngoài API vẫn giữ nguyên; task này không mở lại eligibility hoặc thay DB constraints. Docker npm ci vẫn có audit warnings dependency hiện có, không thêm package hoặc audit fix.

## Architecture Impact

None đối với stack/schema/auth. Quyết định REV-02 đã được ghi theo yêu cầu đề xuất và thực hiện của người dùng. Giữ 21 bảng, JWT HttpOnly cookie, Drizzle/PostgreSQL và TanStack Query.

Admin có scope toàn hệ thống tường minh, filter Gym qua target relation. Hide suy ra Gym từ review DB, khóa parent Gym trước account/role, update có điều kiện VISIBLE và đúng target. Server đặt hidden_by/clock_timestamp, giữ rating/comment/created_at; trigger 0001 bảo vệ nội dung/audit. List snapshot REPEATABLE READ để rows/count nhất quán. Sanitized DB errors và projection nội bộ tránh lộ credential; public/self không audit. Không ghi Membership/Registration/Appointment trong moderation.

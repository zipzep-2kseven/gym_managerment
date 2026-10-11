# Tạo Gym kèm Manager — Verification

Ngày: 2026-10-09. Người dùng đã duyệt gộp form và tạo nguyên tử, giữ mật khẩu tạm do backend sinh.

## Changed

Mở rộng `POST /gyms` với `manager: { email, full_name, phone? }`. Service tạo Gym/User/Profile/role MANAGER/assignment trong một transaction. Tách `staff-provisioning.ts` để tái sử dụng logic mật khẩu/tạo staff giữa luồng mới và provisioning Manager/PT hiện có. PATCH chỉ nhận field Gym.

Form `/admin/gyms/create` có thông tin Gym và Manager bắt buộc; success hiển thị email/mật khẩu tạm một lần, nút ẩn, liên kết cơ sở và tạo cơ sở khác. Tách `GymFields` dùng chung với form sửa để giữ field/validation nhất quán. Mutation có gcTime=0 và reset sau success; credential chỉ giữ trong state component đang mở, không lưu WebStorage/query cache. Cập nhật Architecture/Domain/Feature/API/UI/Plan/README.

## Why

Tạo cơ sở xong cần có người quản lý đăng nhập ngay. Một thao tác nguyên tử tránh Gym dang dở khi cấp tài khoản thất bại, đồng thời giữ màn bổ nhiệm cho tài khoản đã có và thay người quản lý sau này.

## Tests

- `npm run test:gym-onboarding -w apps/api`: **12 Gym write/onboarding + 12 staffing regression cases PASS**, database tạm với đầy đủ migration 0000–0003. Bao gồm normalized email, Argon2id, đổi mật khẩu bắt buộc, scope Manager, credential chỉ trả một lần, public/session/list không chứa credential, trùng email/phone rollback, strict nested allowlist, PATCH không provision, quyền DB thay vì JWT claims, concurrency cùng email chỉ một Gym commit. Trigger test-only gây lỗi ở bước assignment sau khi User/Profile/Role đã insert, xác nhận cả năm nhóm bản ghi rollback; trigger được xóa trong finally.
- `npm run test:gym-ui -w apps/web`: **24/24 PASS**. Form gộp/request allowlist, Manager bắt buộc, pending không gửi hai lần, success khóa tạo lại và focus vào kết quả để dễ bàn giao, credential ẩn được, tạo cơ sở khác reset form, conflict giữ input, regression sửa/phân công/quyền và responsive/focus.
- `npm run test:gym-live -w apps/web`: **2/2 PASS**. API/PostgreSQL/browser thật trên fixture tạm: Guest/Public/Manager/PT regression; Admin tạo Gym kèm Manager → nhận mật khẩu → Manager login/đổi mật khẩu → sửa đúng Gym → Admin revoke → Manager khác không sửa được Gym.
- API typecheck/build và typecheck tests: **PASS**.
- Web typecheck/build: **PASS** (132 modules; JS 308.07 kB, gzip 90.16 kB).
- `git diff --check`: **PASS**.

## Verification

Browser đã kiểm tra 375/768/1024/1440, không tràn ngang. Đã xem ảnh `/tmp/gym03-375-_admin_gyms_create.png`; form hai phần rõ ràng, mobile một cột. Các test success/conflict và luồng API thật đều dùng fixture/database tạm; không tạo Gym hoặc tài khoản test trong database vận hành.

Docker dev phục vụ module CreateGymWithManagerForm tại port 3000 (200) và API `/health` port 4000 (200). Source đã bind mount/Vite/tsx watch; không cần migration/restart cho thay đổi này. Không rebuild image Docker; build ứng dụng được kiểm tra bằng scripts workspace.

## Issues / limits

Không có lỗi chặn trong các kiểm tra trên. API không có idempotency cho POST tạo Gym; nếu kết nối mất sau commit, UI hướng dẫn kiểm tra Gym/phân công trước khi gửi lại. Không tự retry. Mật khẩu tạm mất khi ẩn/rời trang và không có API đọc lại theo Q-10; bàn giao trước khi rời trang. Chưa triển khai email delivery/reset password mới.

API không gửi manager vẫn hỗ trợ tạo Gym độc lập để tương thích và dùng Manager đã có; form Admin mới bắt buộc Manager. Không tự gán tài khoản trùng email thành Manager và không tự revoke phân công khác.

## Architecture Impact

Không thêm package/endpoint/table/column/migration. Giữ REST/layered services/Drizzle/PostgreSQL, HttpOnly Cookie, Argon2id và role/scope DB authoritative. Authorize sơ bộ trước hash; hash ngoài khóa/transaction; recheck và giữ khóa account/role trong transaction ghi. Gym mới chưa public/visible trước commit; assignment luôn dùng ID Gym vừa insert. Response no-store, không trả hash/credential trong projections đọc và lỗi. Giới hạn partial unique Manager hiện có được giữ nguyên. Thay đổi nghiệp vụ đã được người dùng duyệt và ghi trong Architecture Decisions.

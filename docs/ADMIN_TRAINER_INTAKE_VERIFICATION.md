# R14 — Admin tiếp nhận PT theo Gym

**Cập nhật hiện hành:** [R16](ADMIN_TRAINER_ACCEPTANCE.md) bổ sung coverage và sửa việc mất receipt/credential khi provision201 rồi Gym refetch lỗi. Khi có context đã đọc và lỗi không phải401/403, form giữ mounted state với thao tác tiếp nhận mới bị khóa; lỗi quyền vẫn gỡ form. Kết quả và mô tả R14 dưới đây là lịch sử lát cắt.

Ngày 12/10/2026. SCR-ADM-010: `/admin/gyms/:gymId/trainers/assign`, mở từ nút Tiếp nhận PT trên roster của Gym ACTIVE. Scope G2 hiện hành đã duyệt. Hoàn thành bước3 trong Implementation §5.3; ADM-UI-01 vẫn IN_PROGRESS.

## Hành vi triển khai

- Route nằm trong guard Admin hiện hành. Context Gym dùng query actor/Gym, UUID hợp lệ và API danh sách Gym Admin; roster và intake dùng chung hook context. Form được remount theo actor/Gym. Gym INACTIVE không cho gán/provision; Gym không tồn tại hoặc đọc lỗi không hiện form.
- Gán tài khoản có sẵn bằng UUID User ID và chuyên môn, số năm kinh nghiệm, tiểu sử tùy chọn. Payload chỉ chứa các field được API cho phép, trim chuỗi, bỏ field trống, giữ kinh nghiệm0. Backend kiểm account ACTIVE/PT, uniqueness và trạng thái Gym.
- Cấp tài khoản mới bằng họ tên/email/điện thoại tùy chọn và các field PT ban đầu. Không gửi role/status/password/availability/gym_id trong body. API và schema giữ nguyên.
- Pending khóa field, mode, submit và nút quay lại của form. Ref đồng bộ chặn gửi lặp trước lượt render tiếp theo; retry POST=false. Success khóa gửi lại; đổi mode là thao tác bắt đầu form mới và xóa input/credential. Sidebar vẫn cho rời màn; không tuyên bố khóa mọi điều hướng hay ngăn đóng tab.
- Thành công invalidate Gym và tài khoản theo hook hiện hành. Success được báo/focus; credential chỉ nằm trong state của form, mutation dùng gcTime0 và reset sau bàn giao về local state. Không lưu vào Web Storage, URL hoặc log. Có nút ẩn và trả focus về thông báo thành công; rời màn/đổi Gym/mode/phiên xóa credential. PT mới phải đổi mật khẩu và phân công ban đầu NOT_ACCEPTING. Không có API lấy lại plaintext.
- HTTP400/404/409 giữ input và hiển thị lỗi, không auto-reactivate cặp cũ. HTTP401/403 kiểm tra lại phiên; mất quyền sẽ gỡ form. Nếu backend trả GYM_INACTIVE sau GET, đọc lại Gym và khóa form.
- Network/5xx/kết quả chưa rõ khóa gửi và đổi mode. Nút Đối soát đọc roster hết các trang; provision còn tra tài khoản theo email chính xác qua danh sách Admin. Đọc lỗi tiếp tục khóa. Thấy ACTIVE thì báo kết quả hiện có, không cấp lại hoặc lấy lại mật khẩu; thấy INACTIVE/có account nhưng chưa thấy assignment thì giữ khóa để kiểm tra. Chỉ sau đọc thành công và không thấy kết quả mới cho chủ động gửi lại. Read-back là snapshot, không phải CAS hoặc chứng minh request trước đã commit; backend vẫn xử lý concurrency. Rời rồi mở lại màn tạo form mới; không lưu khóa đối soát qua phiên/điều hướng.
- Tách StaffFields từ form đang có để dùng chung các label/native validation, không thay flow Manager hiện hành. Form mới dùng token Admin Minimal SaaS × Enterprise Operations, dials3/1/5; không thêm package.

## Bằng chứng kiểm chứng

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:admin-trainers --workspace @multi-gym/web` lần cuối | 31/31 PASS, retries0: intake20 + roster11 |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-trainers,gym,admin-dashboard,manager-dashboard,pt-dashboard,customer-dashboard` | 96/96 PASS trước bổ sung ca đối soát INACTIVE cuối: PT30, Gym25, Admin26, Manager/PT/Customer mỗi suite5 |
| `npm run lint` | PASS |
| `npm run typecheck --workspaces`; `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| `npm run build --workspaces`; `git diff --check` | PASS |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | 4/4 PASS |

Tổng97 ca browser khác nhau: suite PT cuối31 +66 ca hồi quy. Không cộng lượt PT lặp. Sau lượt6suite, chỉnh logic Admin đối soát phân công INACTIVE và refresh khi GYM_INACTIVE; đã chạy lại đầy đủ suite PT31 và các kiểm tra static/build. Gym/dashboard hồi quy chạy sau lần tách StaffFields, không chạy lại vì hai chỉnh cuối chỉ nằm trong hook/form Admin.

Suite PT cuối có29 ca mock và2 journey API/PostgreSQL thật. Intake live tạo hai Gym trong DB tạm, provision qua UI, kiểm roster ACTIVE/NOT_ACCEPTING/experience0; đăng nhập PT bằng HTTP cookie jar riêng xác nhận role PT/password gate. Dùng API lifecycle có sẵn để chuẩn bị account PT rảnh rồi gán qua UI ở Gym khác, roster hiển thị đúng. Ngừng Gym sau khi mở form rồi provision bị409 GYM_INACTIVE; query Gym cập nhật UI và account bị rollback, search email trả total0. Journey roster live R13 vẫn chạy và không bị fixture intake làm thay đổi Browser Gym.

Mock kiểm strict payload/native UUID validation, pending/success guard, mode/đổi Gym/rời màn/logout, credential không nằm Web Storage, HTTP400/401/403/404/409/network/500, failed read-back, account-only, nhiều trang, ACTIVE và INACTIVE pair, Admin-only và Gym INACTIVE. Responsive375/768/1024/1440 không tràn ngang; axe A/AA375/1440 không có violation. Không coi đây là chứng nhận WCAG/screen reader hoặc kiểm heap toàn bộ trình duyệt. Credential cache được kiểm tra bằng cấu hình/source review, không có test heap.

Đã xem ảnh mock [desktop](design/admin-frontend/previews/trainer-intake-desktop.png) và [mobile](design/admin-frontend/previews/trainer-intake-mobile.png). Ảnh chứa credential giả của mock. Log: `/tmp/multi-gym-r14-regression.log`, `/tmp/multi-gym-r14-trainers-final.log`. PostgreSQL xác nhận còn0 database `gym03_browser_%` sau chạy.

Runner vẫn23suite, suite admin-trainers bao gồm cả hai file roster/intake. Chưa chạy tổng23suite×2vòng; kết quả QA tổng R12 là lịch sử. Không chạy lại toàn bộ backend integration trong R14, không thay backend/schema/API/policy.

## Truy vết và bước tiếp theo

R14 bổ sung phần intake của REQ-ADM-PT-04/06/09/10/11/12; phần duplicate/read-back của05 và scope/reset01. Không coi đủ12REQ đã PASS. R15 tiếp theo: ngừng/kích hoạt phân công bằng confirmation, nghĩa vụ đang mở/counts, trạng thái account/role/Gym và reload/page recovery. Không thêm profile/social/working hours/availability write cho Admin.

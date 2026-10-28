# R16 — Nghiệm thu tổng hợp PT Admin theo Gym

Ngày 12/10/2026. Phạm vi G2 đã duyệt: SCR-ADM-009 `/admin/gyms/:gymId/trainers` và SCR-ADM-010 `/admin/gyms/:gymId/trainers/assign`. Nghiệm thu bước5 của Implementation §5.3 trên fixture cô lập. ADM-UI-01 tổng thể vẫn IN_PROGRESS; Membership, report entry và các màn Admin khác còn tiếp tục.

## Thay đổi và lỗi đã sửa

- Bổ sung19 ca browser: suite PT từ48 lên67 (roster12, intake27, lifecycle28);63 mock và4 journey API/PostgreSQL thật. Bổ sung1 group lifecycle và3 group staffing trong backend, cùng assertion từ chối cùng trạng thái ACTIVE/INACTIVE.
- Provision201 rồi Gym refetch500 trước đây unmount form, mất receipt và credential. Regression đỏ báo không tìm thấy output mật khẩu. Giữ form theo actor/Gym khi có dữ liệu Gym trước đó và lỗi đọc không phải401/403; khóa tiếp nhận mới và yêu cầu đọc lại. Receipt/credential vẫn bàn giao hoặc ẩn được. Khi quyền đọc mất vẫn gỡ form, kể cả `/auth/me` còn trả ADMIN. Không dùng dữ liệu Gym cũ để cho gửi mới.
- GET401 trước đây điều hướng login khi AuthContext chưa kiểm phiên xong; RequireGuest đẩy người dùng về `/`, sau đó phiên mới bị xóa. Regression đỏ tái hiện ở preflight lifecycle. QueryState thêm tùy chọn không tự redirect401; ba màn/vùng PT dùng tùy chọn này để hooks kiểm phiên và RequireAuth điều hướng sau kết quả. Mặc định QueryState của các luồng khác giữ nguyên. Kiểm thêm roster hết phiên đi đúng login.
- Giữ Minimal SaaS × Enterprise Operations, dials3/1/5 và components/tokens hiện có. Không thêm dependency, route, schema, API hoặc quyền backend. Backend chỉ thay tests.

## Đối chiếu12 REQ / AC / TC

Các hậu tố01–12 map cùng REQ-ADM-PT, AC-ADM-PT và TC-ADM-PT trong Feature §5.4/Implementation §5.3. ĐẠT dưới đây áp dụng hành vi và điều kiện kiểm chứng mô tả, không phải xác nhận deployment hoặc mọi interleaving có thể xảy ra.

Nguồn browser: [roster](../apps/web/e2e/admin-trainers.spec.ts), [intake](../apps/web/e2e/admin-trainer-intake.spec.ts), [lifecycle](../apps/web/e2e/admin-trainer-lifecycle.spec.ts). Nguồn backend: [management](../apps/api/tests/gym-management.integration.test.ts), [lifecycle/migration](../apps/api/tests/gym-lifecycle.integration.test.ts), [staffing](../apps/api/tests/staffing.integration.test.ts), [PT workflow](../apps/api/tests/pt-workflow.integration.test.ts), [trainer profile](../apps/api/tests/trainer-profile.integration.test.ts), [Admin users](../apps/api/tests/admin-user.integration.test.ts).

| REQ / AC / TC | Kết quả | Hành vi và bằng chứng |
| --- | --- | --- |
| 01 | ĐẠT | Roster mở từ Gym detail/sidebar đúng Gym; UUID sai không query, CUSTOMER/MANAGER/PT không vào Admin. Query keys actor/Gym, form remount/reset. Mock SPA Gym switch/return không hồi sinh credential/confirmation; response provision đang pending ở Gym cũ không đưa credential vào form Gym mới. Backend management kiểm Guest/current role/account/cross-Gym. |
| 02 | ĐẠT | Roster toolbar URL: search specialization/bio, status/sort allowlist, reset page1, pageSize20/default created_at desc, metadata total. Browser `Admin enters scoped roster...`; backend management kiểm literal `%_\\`, paging/tie-break và projection. Không bổ sung tìm tên/email/availability. |
| 03 | ĐẠT | Roster hiển thị null khác0, User ID, joined_at, availability tham khảo và trạng thái phân công khác account. Mock pending→empty, lỗi đầu/cached/retry, Gym INACTIVE và responsive; backend assert exact assignment-only keys, không email/phone/hash. “Read-only roster” là projection không sửa profile/availability; action ngừng được phép theo REQ09. |
| 04 | ĐẠT | Assign strict UUID/body/optional fields/experience0, không role/status/Gym ID trong body. Live provision→stop→assign ở Gym khác. Backend group mới kiểm target không tồn tại, SUSPENDED, thiếu PT không tạo assignment hay đổi account/role; Q08 concurrent multi-Gym chỉ một winner và không tự revoke. |
| 05 | ĐẠT | Live mới POST cặp INACTIVE trả409 ASSIGNMENT_ALREADY_EXISTS; vẫn một row INACTIVE, bio cũ giữ nguyên. Sau đó UI kích hoạt bằng PATCH, giữ ID/joined_at/created_at/bio/specialization/experience/availability. Mock reconciliation INACTIVE không coi thành công ACTIVE hoặc gán lại. |
| 06 | ĐẠT | Live UI provision201 tạo ACTIVE/PT/password gate và ACTIVE/NOT_ACCEPTING/experience0. Mock pending/hide/mode/Gym/logout/leave/Web Storage; mới kiểm success+refetch500 giữ credential và read401/403 xóa credential. Backend staffing duplicate email/phone, missing PT role configuration và assignment FK failure giữ atomicity account/profile/role/assignment; one-time/no-store và không plaintext trong GET. |
| 07 | ĐẠT | Confirmation nêu Gym/User/assignment, cancel/Escape không PATCH, trả focus. Đếm Registration ACTIVE và Appointment PENDING/CONFIRMED độc lập, kể cả quá giờ/nhiều trang. Mock409 counts; live obligations1/1 và backend409, xử lý nghĩa vụ bằng actor được phép rồi UI ngừng; account/role/availability và lịch sử giữ nguyên. Không force/tự cancel. |
| 08 | ĐẠT | Mock Gym/account/role/other-Gym gating, đọc account nhiều trang không lọc PT nên phát hiện role mất; role/Gym đổi sau preflight phải theo lỗi server và đọc lại. Live kích hoạt giữ identity/profile/history/NOT_ACCEPTING. Backend kiểm current account/role/unique và từ chối cùng trạng thái ACTIVE/INACTIVE. |
| 09 | ĐẠT | Gym INACTIVE vẫn đọc được; disable assign/provision/activate đã biết, vẫn có thể ngừng nếu không còn nghĩa vụ. Live intake Gym đổi sau GET rollback account; live lifecycle Gym ngừng sau preflight trả409 GYM_INACTIVE, đọc lại khóa kích hoạt. Chuyển Gym bằng stop rồi assign riêng, không transfer nguyên tử. |
| 10 | ĐẠT | Mock ref guard chống gửi lặp, pending khóa submit/cancel, retry=false; cancel trước ghi không API; receipt focus và invalidate Gym/accounts. Page cuối không còn row về trang hợp lệ theo metadata mới. Success+refetch failure giữ receipt lifecycle và credential intake, không tự gửi lại. |
| 11 | ĐẠT | Intake400/401/403/404/409/network/500; lifecycle400/401/403/404/409/network/500 và read/write mất quyền. Form/context giữ khi còn quyền; mất quyền gỡ controls. Unknown đọc roster/account trước retry, failed read giữ khóa; exact email case-insensitive và account/roster nhiều trang, account-only/INACTIVE giữ khóa. Committed/lost response không POST/PATCH lặp. Backend concurrent assignment/booking/stop có real lock waiter; không thêm CAS/version. |
| 12 | ĐẠT | Admin UI chỉ roster/assign/provision/status; không controls profile/social/hours/availability/Appointment write/Registration create/payment. Live Admin availability403, Guest status401, Manager Gym khác403; PT-workflow/profile integration kiểm các action ngoài quyền Admin. Keyboard/focus/Escape/live messages và overflow375/768/1024/1440, axe375/1440 cho roster/intake/confirmation. Credential clear theo navigation/mode/Gym/phiên. |

## Kết quả lệnh

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-trainers,gym,admin-dashboard,manager-dashboard,pt-dashboard,customer-dashboard,auth,admin-users --rounds=2` | PASS:8 suites ×2 vòng,288 lượt browser, retries0 |
| `npm run test:lifecycle --workspace @multi-gym/api` sau assertion cuối | PASS:13 lifecycle/migration,15 staffing current schema;6 management,8 public PT,12 Gym write,7 public Gym |
| `npm run test:pt-workflow --workspace @multi-gym/api` | PASS:17 HTTP/DB groups và3 migration scenarios |
| `npm run test:trainer-profile --workspace @multi-gym/api` | PASS:7 groups |
| `npm run test:admin-users --workspace @multi-gym/api` | PASS:8 groups |
| `npm run lint`; `npm run typecheck --workspaces`; `npm run build --workspaces` | PASS |
| `npm run typecheck:tests --workspace @multi-gym/api`; `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | PASS:4/4 |
| `git diff --check`; truy vấn chỉ đọc `pg_database` sau runner | PASS;0 database còn lại với prefix `gym03_browser_` hoặc `gym_lifecycle_test_` |

Browser logs: `apps/web/.qa-artifacts/{suite}-round-{1,2}.log`; runner `/tmp/multi-gym-r16-regression.log`. Backend lifecycle cuối: `/tmp/multi-gym-r16-backend-lifecycle-final.log`. Bằng chứng đỏ401 `/tmp/multi-gym-r16-focused.log`, rồi6 ca tập trung PASS `/tmp/multi-gym-r16-focused-green.log`. Lượt đầu64 ca có61 PASS/3 FAIL: hai ca focus dùng sai event nên chưa phát GET (đổi thành window visibilitychange, chờ đúng response), một ca401 là lỗi app đã sửa; không bỏ assertion để qua test.

Kết quả lưu tại [qa02-r16-verification.json](qa02-r16-verification.json). Mỗi vòng: PT67, Gym25, Admin dashboard26, Manager/PT/Customer dashboard mỗi suite5, auth8, Admin users3 =144 ca khác nhau;288 là số lượt qua hai vòng, không phải288 ca riêng. PT gồm63 mock +4 live, cả hai vòng đều qua. Không cộng thêm các lượt đỏ/tập trung vào tổng nghiệm thu. Đã xem lại ảnh mobile mock intake/confirmation do suite tạo; không tràn ngang, ID xuống dòng và các nút đọc được.

## Giới hạn và bước kế tiếp

- Nghiệm thu môi trường Chromium/fixture API/PostgreSQL tạm. Không chứng nhận screen reader/WCAG, kiểm heap, mọi race hoặc deployment. Không lưu/ghi trace, video, screenshot credential thật; ảnh responsive hiện có chỉ dùng dữ liệu mock.
- Credential chỉ còn trong mounted form; response bị mất sau commit không thể phục hồi plaintext. Khóa unknown outcome chỉ trong mounted form, không lưu qua tab/phiên/navigation; rời rồi mở lại phải chủ động kiểm tra roster/account trước tiếp nhận lại. Backend uniqueness vẫn là ràng buộc cuối; read-back không phải CAS hoặc bảo đảm request trước đã hoàn tất.
- Đọc account/roster/obligations dùng pagination của API có sẵn, chi phí tăng theo số trang. Preflight là snapshot; server kiểm lại current quyền/role/account/Gym/nghĩa vụ ở transaction.
- QA R16 chạy các suite liên quan; chưa chạy toàn bộ23suite×2. QA tổng R12 là lịch sử. Task tiếp theo R17: Membership Admin chỉ đọc theo Gym, theo10 REQ tại Feature §5.5/Implementation §5.4. Sau đó report chọn Gym, các màn Admin còn lại và QA tổng.

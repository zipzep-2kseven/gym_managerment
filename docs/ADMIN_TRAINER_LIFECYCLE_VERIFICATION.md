# R15 — Admin ngừng/kích hoạt phân công PT

**Cập nhật hiện hành:** [R16](ADMIN_TRAINER_ACCEPTANCE.md) đã đối chiếu12 REQ và bổ sung các ca còn thiếu nêu trong báo cáo này: permission loss, HTTP400/404/5xx, account paging, role/Gym đổi sau preflight và duplicate pair live. Điều hướng401 của màn PT chờ kết quả kiểm phiên từ guard. Kết quả R15 dưới đây là lịch sử lát cắt.

Ngày 12/10/2026. SCR-ADM-009 `/admin/gyms/:gymId/trainers`. Scope G2 đã duyệt; hoàn thành bước4 trong Implementation §5.3. ADM-UI-01 vẫn IN_PROGRESS, chưa tuyên bố nghiệm thu toàn bộ12REQ.

## Hành vi triển khai

- Nút Ngừng/Kích hoạt PT trên mỗi dòng mở vùng xác nhận inline. Nêu tên/ID Gym, assignment ID và User ID; focus vào tiêu đề. Hủy/Escape chưa gửi không mutation và trả focus về nút mở hoặc refresh. Pending PATCH khóa xác nhận/hủy/Escape; ref chặn gửi lặp trước render. Mỗi lúc chỉ có một vùng xác nhận.
- Mở xác nhận đọc lại Gym và assignment từ danh sách hiện có, truyền AbortSignal. Ngừng đọc hết trang Registration và Appointment theo Gym, đếm đúng trainer ID: Registration ACTIVE và Appointment PENDING/CONFIRMED, kể cả quá giờ và độc lập trạng thái Registration. Dùng Set ID chống đếm trùng; không thêm endpoint đếm hoặc lọc chưa được API hỗ trợ.
- Kích hoạt đọc account hiện hành qua danh sách Admin phân trang vì search chỉ hỗ trợ email/tên, không UUID. Không lọc role PT trước khi tìm để có thể phát hiện role đã mất. Chỉ đưa kết quả điều kiện vào query cache/xác nhận, không render contact/profile từ account. Chặn nếu Gym không ACTIVE, account không ACTIVE/không PT, hoặc PT có ACTIVE assignment tại Gym khác. Cách đọc tuyến tính theo số trang là giới hạn của API hiện có.
- Preflight có loading/error/retry; lỗi hoặc điều kiện không đủ thì khóa xác nhận. Trạng thái đã bằng target thì yêu cầu đọc lại danh sách, không PATCH lặp. Các read là snapshot; backend vẫn kiểm quyền/account/role/unique/Gym/obligations trong transaction, không coi preflight là CAS.
- PATCH đúng `/gyms/:gymId/trainers/:trainerId/status`, body chỉ `{status}`. Không sửa account/role/history/profile/joined_at/availability, không force/auto-transfer, không tự hủy nghĩa vụ. Gym INACTIVE khóa kích hoạt nhưng có thể ngừng phân công nếu hết nghĩa vụ.
- Thành công invalidate Gym và tài khoản qua useGymMutation; giữ receipt thành công kể cả Gym/roster refetch sau đó lỗi. Receipt có actor/Gym scope và focus. Trang không còn dòng do filter sẽ tự về trang hợp lệ theo metadata mới, chỉ khi đọc thành công; không dùng stale/error metadata để đổi trang.
- Mọi lỗi mutation khóa xác nhận lại; nút Đọc lại điều kiện phải đọc thành công cả preflight lẫn Gym/roster mới mở khóa. 409 nghĩa vụ hiển thị counts từ server; network/mất phản hồi không tự PATCH lại. Read-back thấy target đã hiện hữu thì giữ disabled, hiển thị trạng thái hiện tại. HTTP401/403 kiểm lại phiên theo hooks hiện hành; password gate giữ luồng chung.
- Đổi Gym/actor xóa selection/receipt; query/panel scope đúng identity. Hủy hoặc rời vùng đang GET bỏ callback reload tiếp theo và abort query khi unmount. Sidebar/URL/tab vẫn cho rời trang trong pending; không tuyên bố khóa toàn bộ browser navigation.
- Dùng tokens/components Admin hiện có, Minimal SaaS × Enterprise Operations, dials3/1/5. Không thêm package, API, schema hoặc backend policy. Backend file thay đổi chỉ là fixture cô lập, bật riêng cho suite Admin trainers; Browser Gym gốc không bị sửa dữ liệu bởi journey lifecycle.

## Bằng chứng kiểm chứng

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:admin-trainers --workspace @multi-gym/web` cuối | 48/48 PASS, retries0: lifecycle17 + intake20 + roster11 |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-trainers,gym,admin-dashboard,manager-dashboard,pt-dashboard,customer-dashboard` | 113/113 PASS trước bổ sung ca scope cuối: PT47, Gym25, Admin26, Manager/PT/Customer mỗi suite5 |
| `npm run test:lifecycle --workspace @multi-gym/api` | PASS; báo cáo12 lifecycle/migration,12 staffing trên schema hiện hành và các ca Gym/public PT/Gym write phụ thuộc |
| `npm run lint`; `npm run typecheck --workspaces`; `npm run build --workspaces` | PASS |
| `npm run typecheck:e2e --workspace @multi-gym/web`; `npm run typecheck:tests --workspace @multi-gym/api` | PASS |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | 4/4 PASS |
| `npm run lint`; web typecheck/e2e typecheck/build sau sửa scope cuối; `git diff --check` | PASS |

Tổng114 ca browser khác nhau: suite PT cuối48 +66 ca hồi quy, không cộng lượt lặp. Sau lượt6suite, sửa handler Escape để tuân lint a11y và xóa selection/receipt khi đổi Gym/actor; đã chạy lại toàn bộ PT48 và static/build web. Không có thay đổi hành vi các dashboard/Gym form khác sau lượt hồi quy. PT cuối gồm45 ca mock và3 journey API/PostgreSQL thật.

Mock lifecycle kiểm xác nhận identity/focus/cancel/Escape, pending/strict status body, stop/activate, account suspended/role mất/assignment Gym khác, inactive Gym, obligations quá giờ/nhiều trang, conflict counts, read-before-retry/failed reload, committed-with-lost-response, success-with-failed-refetch, page cuối rỗng và SPA Gym switch. Responsive375/768/1024/1440 không tràn ngang; axe A/AA375/1440 không có violation. Không coi đây là chứng nhận WCAG/screen reader.

Log kiểm chứng: `/tmp/multi-gym-r15-regression.log`, `/tmp/multi-gym-r15-trainers-complete.log`, `/tmp/multi-gym-r15-backend.log`; test đỏ scope `/tmp/multi-gym-r15-scope-red.log`. Runner vẫn23suite, admin-trainers bao gồm3file; chưa chạy tổng23suite×2vòng. Kết quả R12 là lịch sử. Sau chạy PostgreSQL xác nhận còn0 DB `gym03_browser_%`.

Ảnh mock đã xem: [desktop](design/admin-frontend/previews/trainer-lifecycle-desktop.png), [mobile](design/admin-frontend/previews/trainer-lifecycle-mobile.png). Không chứa dữ liệu deployment hoặc credential thật.

Ca live lifecycle riêng: fixture có Registration ACTIVE và Appointment PENDING quá giờ. UI đếm1/1 và khóa ngừng; direct PATCH bị409 với count lịch1. Tài khoản PT thuộc phân công xử lý lịch qua API hiện hành; Admin kết thúc đăng ký qua API cho phép để chuẩn bị hết nghĩa vụ. Sau đó UI ngừng rồi kích hoạt; ID/User ID/joined_at/specialization/availability không đổi, lịch sử Appointment còn cùng ID và trạng thái CANCELLED. Không có action Admin hủy Appointment trong UI. Ca live đầu tiên dùng Customer hủy lịch quá giờ bị409 APPOINTMENT_STARTED; đã sửa actor của test sang PT đúng policy, không sửa backend.

Kiểm tra scope bổ sung tái hiện vùng xác nhận cũ hiện lại khi SPA đổi Gym rồi quay về. Test thất bại trước sửa (expected0, received1); sửa bằng xóa selection/receipt theo Gym/actor, rồi kiểm tra lại toàn suite. Escape dùng listener có scope và cleanup, đáp ứng lint a11y; vùng xác nhận inline không tự gán dialog/modal hoặc trap focus.

## Truy vết và tiếp theo

Bổ sung hành vi REQ-ADM-PT-05/07/08/09/10/11/12 và reset/scope01. Bộ UI mock/live và lifecycle integration không đồng nghĩa đủ mọi AC trong12REQ: còn cần nghiệm thu tổng hợp, permission loss/race ở mọi thời điểm, mutation HTTP400/404/5xx, race role/Gym sau preflight, account scan nhiều trang và kiểm accessibility mở rộng. R16 tiếp theo là bước5 của Implementation §5.3: đối chiếu toàn bộ luồng PT Admin, bổ sung coverage thiếu và chạy các kiểm tra tổng hợp phù hợp.

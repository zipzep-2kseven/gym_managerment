# R13 — Admin đọc phân công PT theo Gym

Ngày 12/10/2026. SCR-ADM-009: `/admin/gyms/:gymId/trainers`. Phạm vi G2 đã duyệt; lát cắt đầu tiên triển khai roster đọc, chưa triển khai assign/provision/lifecycle của PT. ADM-UI-01 vẫn IN_PROGRESS.

## Hành vi đã triển khai

- Lối vào từ Gym detail và sidebar scoped; header/context dùng tên, địa chỉ, trạng thái Gym thật từ danh sách Admin hiện có. Route dùng guard Admin/password/account hiện hành, không dùng Manager assignment để suy ra Gym của Admin.
- GET nội bộ `/gyms/:gymId/management/trainers`, pageSize20, mặc định created_at desc; tìm literal chuyên môn/tiểu sử khi submit, lọc ACTIVE/INACTIVE, sort created_at/joined_at/specialization asc/desc. Đổi filter/sort về page1; Pager dùng metadata. Không có tìm tên/email hoặc lọc availability chưa được API hỗ trợ.
- Render User ID, chuyên môn/tiểu sử, trạng thái phân công, availability chỉ đọc, kinh nghiệm và ngày tham gia theo giờ Việt Nam. `null` kinh nghiệm khác `0`; không dựng tên/avatar/contact từ User ID. Gym INACTIVE vẫn đọc roster.
- Query key chứa actor/Gym/query; truyền AbortSignal cho Gym và roster. Gym UUID sai không gọi query riêng tư; chỉ đọc roster sau khi xác nhận Gym. Đổi Gym qua SPA không giữ dòng Gym trước. HTTP401/403 ẩn dữ liệu riêng tư và kiểm tra lại phiên.
- Loading/empty/error/stale cache/retry riêng; refresh đọc lại Gym và roster. Retry bàn phím trả focus về refresh nếu thành công; không giành focus khi người dùng đã chuyển control. Bổ sung fallback button cho component feedback hiện có.
- Giao diện dùng token/Admin component hiện có, hướng Minimal SaaS × Enterprise Operations, variance/motion/density 3/1/5. Hai cột nội dung ở desktop, xếp dọc ở mobile; ID/text dài xuống dòng. Không thêm package hoặc thay API/backend/schema/quyền.

QA bằng ảnh phát hiện NavLink tô active cả mục cha dù item đặt `exact`. Đã truyền `end={item.exact}` cho NavLink; kiểm chứng một mục active trên roster và có icon/accessible name khi thu gọn sidebar. Dùng glyph phân công đang có trong hệ thống.

## Bằng chứng chạy cuối

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-trainers,admin-dashboard,manager-dashboard,pt-dashboard,customer-dashboard` | 52/52 PASS, một vòng không retry: roster11, Admin26, Manager/PT/Customer mỗi suite5 |
| `npm run test:gym-ui --workspace @multi-gym/web -- --reporter=line --output=/tmp/multi-gym-r13-gym-final` | 25/25 PASS |
| `npm run build`; `npm run typecheck` | PASS toàn workspace |
| `npm run build --workspace @multi-gym/web` sau chỉnh navigation cuối | PASS |
| `npm run typecheck:e2e --workspace @multi-gym/web`; `npm run lint`; `git diff --check` | PASS |

Tổng 77 browser tests, không cộng các lượt chạy lặp. Roster gồm 10 ca mock và 1 journey API/PostgreSQL thật trên DB tạm. Ca live: Admin vào roster qua Gym detail, count metadata1, projection không có profile; đăng nhập Manager rồi direct route Admin bị chặn. Không suy ra endpoint roster chặn Manager, vì backend hiện cho Manager đúng Gym đọc qua workspace Manager.

Ca mock bao phủ paging/filter/sort/keyboard, null/0, đổi Gym qua SPA, Gym INACTIVE, initial/cached failure/retry, direct Customer/Manager/PT denied, UUID sai, mất quyền sau snapshot, pending→empty, sidebar active/collapse và responsive375/768/1024/1440. Axe A/AA tại375/1440 PASS; không phải chứng nhận WCAG/screen reader. PostgreSQL xác nhận không còn DB browser tạm sau chạy.

Đã xem ảnh [desktop](design/admin-frontend/previews/trainers-desktop.png) và [mobile](design/admin-frontend/previews/trainers-mobile.png); ảnh dùng dữ liệu mock, không phải dữ liệu deployment. Suite mới được thêm vào runner mặc định, tăng22→23. Kết quả R12 22suite×2vòng là lịch sử; chưa chạy QA tổng23suite×2vòng trong R13.

## Truy vết và công việc tiếp theo

Lát cắt này kiểm chứng phần đọc của ADM-PT-01–03 và phần scope/privacy/responsive của ADM-PT-12; không coi cả12REQ đã PASS. Query key/AbortSignal có source và test scope, chưa có live race cho mọi response chậm/actor switch. Metadata/filter/sort browser mock và live list cơ bản chưa thay thế mọi integration của backend.

R14 tiếp theo: SCR-ADM-010 `/admin/gyms/:gymId/trainers/assign`, gán tài khoản PT có sẵn hoặc provision mới, pending/success/credential trong mounted form, reset khi đổi mode/Gym/session. Sau đó lifecycle confirmation, obligations, reload/page recovery và nghiệm thu toàn bộ PT theo các slice trong Implementation §5.3. Không tái dùng action profile/availability/working-hours của Manager cho Admin.

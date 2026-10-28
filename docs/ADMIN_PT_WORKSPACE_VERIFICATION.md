# R22 — Giám sát PT cho Admin

**Cập nhật QA tổng — 14/10/2026:** toàn28suite×2vòng và root QA-02 đã PASS sau R22; [báo cáo824lượt browser](QA_02_POST_R22_VERIFICATION.md). Kết quả188lượt và ghi chú chưa chạy QA tổng bên dưới thuộc lượt nghiệm thu R22 trước đó.

Ngày: 14/10/2026. Phạm vi: SCR-ADM-015 `/admin/gyms/:gymId/pt`, FEAT-PTR-003/005, FEAT-APP-003 và REQ/AC/TC-ADM-BASE-24–26. ADM-UI-01 còn IN_PROGRESS đến QA tổng.

## Hành vi và phạm vi

- Context Gym/breadcrumb; đọc lịch sử cả Gym INACTIVE. Đăng ký/lịch có hai pager độc lập,20/trang, tổng từ API. Khi trang không còn dữ liệu, chỉ pager tương ứng về trang hợp lệ. Tên thiếu dùng fallback; identity, thời hạn thẻ và ghi chú nguồn giữ nguyên.
- Lịch hiển thị UTC+7, cả PENDING/CONFIRMED/COMPLETED/CANCELLED. Admin không tạo/dời/hủy/xác nhận/hoàn thành buổi, không đổi availability hoặc tự tạo đăng ký thay thế.
- Registration ACTIVE có vùng kết thúc inline: lý do trim1–2000, xác nhận rõ, pending khóa ghi/pager/làm mới, đóng/Escape trả focus khi chưa có kết quả chưa rõ.409 lịch mở giữ lý do, yêu cầu PT/Manager xử lý ở luồng có quyền.
-200 có receipt; network/5xx/409 yêu cầu đọc lại trước thao tác mới. Tìm theo ID bất biến qua mọi trang ở service, không suy thành công từ việc vắng trên trang đang xem. Đọc ra ACTIVE chỉ cho gửi mới sau chọn “Dùng trạng thái vừa đọc”; terminal không retry ghi. GET lỗi giữ lý do/receipt và cho đọc lại.401/403 gỡ cả dữ liệu/form và kiểm phiên.
- Đọc lại dùng chốt đồng bộ chống hai lượt scan do click cùng tick, AbortSignal khi rời màn và khóa controls trong lúc đọc. Ca hồi quy đã tái hiện thất bại khi bỏ chốt, rồi chạy lại với chốt.

Không thêm endpoint, dependency mới, schema hay migration nghiệp vụ; giữ policy PT workflow. Các package được phục hồi khai báo phụ thuộc đã có trong stash/node_modules.

## Phục hồi nền workspace trước kiểm chứng

Workspace đầu lượt có marker merge trong3package.json, README và3spec; App mở scaffold, API chỉ mount auth, một số khai báo/auth trở về baseline cũ, journal chỉ còn migration0000. Vì vậy lần chạy đầu không thể chứng minh R22: browser không có màn PT; DB tạm thiếu availability.

Đã hợp nhất phần có chức năng mới của các đoạn xung đột và phục hồi từ `stash@{0}` (`backup-before-checkout-kha`): App/providers/router/CSS imports, API app/routes/config/auth/error utilities, khai báo schema hiện hành, journal0000–0005 và dependency manifests/lockfile. Giữ các màn Admin/hooks/R22 mới hơn trong workspace. Không apply toàn bộ stash, không chạy migration hoặc reset DB vận hành. Các file trước phục hồi có bản sao tại `/tmp/gym-r22-pre-recovery-t8b6vymx`; stash vẫn còn nguyên. Phần phục hồi cần được review cùng diff R22 vì ảnh hưởng boot/auth toàn ứng dụng.

## Traceability

| Requirement | Bằng chứng |
| --- | --- |
| ADM-BASE-24 | Mock paging độc lập,total,invalid scope,page shrink,empty/terminal/fallback,read/write permission loss; live25đăng ký/24lịch, Gym INACTIVE; HTTP scoped paging và wrong-Gym404. |
| ADM-BASE-25 | Mock reason/Escape/focus/pending/receipt/GET500/409/lost response, tìm ID ở trang2, đọc trùng; live409→PT xử lý→Admin200→readback, history giữ; HTTP200/repeat/409/400/404. |
| ADM-BASE-26 | Mock giờ09:00 khi browser timezone Los Angeles, đủ4status và không nút ghi; live/API ADMIN-only403 cho4action lịch, HTTP403 create/availability; current role/status/password gates. |

## Kiểm chứng

[Artifact kiểm chứng R22](qa02-r22-verification.json). DB/browser fixture chỉ tạo dữ liệu lịch sử trong database tạm và tự dọn.

| Lệnh / kiểm tra | Kết quả ngày14/10/2026 |
| --- | --- |
| `npm run test:e2e -w apps/web -- --suites=admin-pt-workspace,pt-workflow,admin-trainers,auth,security --rounds=2` |5suite×2vòng,188lượt PASS,retries0. Mỗi vòng: R22 16ca(15mock,1live), PT workflow2, Admin trainers67, Auth8, Security1. |
| `npm run test:pt-workflow -w apps/api` |19group HTTP/DB PASS và3kiểm tra migration PASS; gồm Admin scope/current gates/appointment DENY và end/repeat/history. |
| `npm run test:qa01 -w apps/api` |Toàn bộ chuỗi backend QA-01 PASS sau phục hồi nền; không thay cho root QA-02. |
| `npm run lint`, `npm run typecheck`, `npm run typecheck:e2e -w apps/web`, `npm run typecheck:tests -w apps/api`, `npm run build` |PASS; build cảnh báo kích thước chunk dưới đây. |
| `npm run test:dashboard-cache -w apps/web` |4/4 PASS. |
| Rapid readback regression |RED: bỏ synchronous guard→2scan thay vì1; GREEN: giữ guard→PASS trong cả2vòng R22. Red/green riêng không cộng vào188. |
| Cleanup kiểm thử |0 DB `gym03_browser_` còn lại. Có1DB `pkg01_test_` không có kết nối; không khớp fixture R22 thất bại đầu lượt, chưa xác định nguồn nên giữ nguyên. |
| Liên kết tài liệu và `git diff --check` |Không link local thiếu; diff không lỗi whitespace. |

## Ảnh giao diện

[Desktop](design/admin-frontend/previews/pt-workspace-desktop.png) · [Mobile](design/admin-frontend/previews/pt-workspace-mobile.png). Responsive375/768/1024/1440 không overflow ngang; axe kiểm vùng main và confirmation theo WCAG2A/AA/2.1AA. Giữ design tokens Admin/dials3/1/5.

## Giới hạn

- Lookup Registration qua list nhiều trang không có snapshot xuyên request; target vắng không chứng minh kết quả ghi. Backend kiểm lại nghĩa vụ/quyền/trạng thái mỗi lần ghi mới; không thêm CAS hoặc idempotency giả.
- Kiểm chứng trên Chromium và PostgreSQL tạm; chưa deployment hoặc đồng bộ Figma.
- Build có cảnh báo chunk web512.03kB,gzip138.14kB; tối ưu bundle ngoài lát cắt.
- Hồi quy liên quan không thay cho QA tổng toàn28suite/root QA-02; đó là bước tiếp theo trước chốt ADM-UI-01.

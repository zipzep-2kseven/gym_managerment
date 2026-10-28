# R18 — Chọn Gym để xem báo cáo sự cố Admin

Ngày 12/10/2026. Scope G2 đã duyệt: SCR-ADM-012 `/admin/reports` dẫn đến SCR-ADM-007 `/admin/gyms/:gymId/reports`. Thực hiện bốn bước Implementation §5.5 theo8 REQ/AC/TC. ADM-UI-01 vẫn IN_PROGRESS; tiếp theo R19 chuẩn hóa màn kiểm duyệt đánh giá Admin theo ADM-BASE-27/28.

## Phạm vi triển khai

- Mục **Báo cáo sự cố** trong menu toàn sàn và lối tắt dashboard dẫn tới selector. Tìm tên/địa chỉ Gym literal, status ACTIVE/INACTIVE hoặc tất cả, paging12 và default gym_name asc; query URL được chuẩn hóa theo allowlist. Tổng là số Gym phù hợp, không số báo cáo.
- Entry chỉ gọi GET `/admin/gyms`, không gọi report/image trước khi chọn, không nút ghi Gym/report. Gym INACTIVE có link lịch sử. Chọn link tới scoped route bằng ID, không truyền filter/page report hay return URL tùy ý. Browser Back giữ URL selector; “Chọn Gym khác” về entry mặc định.
- Admin destination riêng dùng services/guards/context và contract có sẵn; wrapper key actor/Gym reset page1/status Tất cả/form/ảnh/feedback. Query actor/mode/Gym/page/status có AbortSignal; GET Gym cũ bị hủy, response ghi đã gửi vẫn thuộc scope cũ. Manager/Customer giữ luồng hiện có; `ReportPhoto` được tách dùng chung với cùng hành vi private/fallback.
- Report list paging20 và bốn trạng thái theo server, ngày giờ Việt Nam, context/breadcrumb/ảnh private. Initial/refetch/empty/page recovery riêng; lỗi có cache đánh dấu dữ liệu cũ và khóa ghi. Lỗi401/403 từ list/context/mutation gỡ dữ liệu/actions, kiểm phiên rồi guard điều hướng. UUID/Gym sai không fallback public/Customer.
- Giữ investigate PENDING→IN_PROGRESS, resolve IN_PROGRESS→RESOLVED và reject PENDING/IN_PROGRESS→REJECTED. Note trim/bắt buộc/max2000, synchronous guard chống gửi lặp, retry=false. Pending khóa filters/page/actions; Escape/đóng form trả focus về nút hiện hành. Receipt thành công còn khi refetch lỗi hoặc row rời filter.
- Validation400 giữ note để sửa;409/404/network/5xx yêu cầu đọc lại trước ghi tiếp. Đọc lại thất bại giữ khóa, committed/lost response không tự gửi lại. Thành công invalidate reports theo actor/Gym; kết quả request cũ không hiện dưới Gym mới. Không edit/delete/create/reopen report hoặc quyền/API mới.
- Giữ Minimal SaaS × Enterprise Operations, dials3/1/5 và tokens/components hiện có. Không thêm dependency hoặc thay production backend/schema/contract/policy; backend chỉ bổ sung fixture/test. Runner mặc định tăng24→25suite với `admin-reports`.

## Đối chiếu8 REQ / AC / TC

Các hậu tố01–08 map REQ-ADM-REP, AC-ADM-REP và TC-ADM-REP tại Feature §5.6/Implementation §5.5. ĐẠT áp dụng các trạng thái/điều kiện kiểm chứng dưới đây, không chứng nhận deployment hay mọi lịch request đồng thời.

Nguồn: [entry](../apps/web/e2e/admin-reports.spec.ts), [scope/action](../apps/web/e2e/admin-reports-scope.spec.ts), [recovery](../apps/web/e2e/admin-reports-recovery.spec.ts), [live API/DB](../apps/web/e2e/admin-reports-live.spec.ts), [backend report9 nhóm](../apps/api/tests/report.integration.test.ts). Implementation: [selector hook](../apps/web/src/hooks/useAdminReportGyms.ts), [selector page](../apps/web/src/pages/report/AdminReportEntryPage.tsx), [destination](../apps/web/src/pages/report/AdminReportsPage.tsx), [action hook](../apps/web/src/hooks/useAdminReportAction.ts), [row/form](../apps/web/src/pages/report/AdminReportRow.tsx).

| REQ / AC / TC | Kết quả | Hành vi và bằng chứng |
| --- | --- | --- |
| 01 | ĐẠT | Menu toàn sàn active đúng `/admin/reports`, heading/role guards; mock CUSTOMER/PT/MANAGER không vào entry/destination và không private GET. Live selector chỉ GET Gym/auth trước chọn, không mutation. Dashboard có lối tắt tương ứng. |
| 02 | ĐẠT | Mock15 Gym12+3 và live16 Gym12+4, total metadata; literal `%_\\`, status/reset1, URL reload/Back, canonical query lạ và page5→2. Chỉ query Gym allowlist, sort mặc định gym_name asc. |
| 03 | ĐẠT | Link accessible name có tên Gym, route đúng ID; mock/live chọn INACTIVE rồi đọc lịch sử. Request spy không report/image fan-out ở selector. Live ảnh private có bytes, Guest image401; backend owner/local Manager/Admin image200, Gym khác403. |
| 04 | ĐẠT | Mock status IN_PROGRESS/page2/note rồi đổi Gym→page1/Tất cả/form cũ gỡ; quay lại không phục hồi note. Actor đổi sau auth recheck cùng Gym cũng reset. Late GET A bị abort, chỉ render B; pending PATCH A hoàn tất không receipt/note dưới B. Image state nằm trong subtree scoped. |
| 05 | ĐẠT | Back từ report về selector giữ status/query đã áp dụng, Back qua search khôi phục page2 và input. Direct report query URL không trở thành filter report; reload local status về Tất cả. Chọn Gym khác tới `/admin/reports` mặc định. |
| 06 | ĐẠT | Pending khác0, empty Gym khác empty reports; page cuối giảm dữ liệu→trang hợp lệ theo fresh metadata. Selector/scoped network/400/404/500 retry; cached401/403 gỡ private data, expired login/revoked Admin denied; Guest/password gate/SUSPENDED không query. UUID/Gym missing không fallback. Backend thêm current DB role/status/gate với JWT claim ADMIN. |
| 07 | ĐẠT | Mock/live Admin investigate→resolve và reject từ PENDING/IN_PROGRESS; payload đúng `{}` hoặc note trim, blank khóa, terminal không nút.409/network/5xx giữ note/khóa đến read-back; failed read giữ khóa. Committed/lost response chỉ một PATCH; success+read500 giữ receipt. Live trước/sau giữ content/image/rows khác; backend terminal race chỉ một winner, wrong-Gym404 và trái quyền403. |
| 08 | ĐẠT | Heading focus khi navigation/scope, Enter link/form, Escape/đóng trả nút hiện hành, receipt/loading/error có live state. Long names/address/content/IDs/form tại375/768/1024/1440 không overflow; axe375/1440 trên entry và destination. Pending khóa filters/page/actions; read/write cũ không trình bày dưới Gym mới. |

## Fixture, ảnh và lỗi đã sửa

`ADMIN_REPORT_FIXTURE=true` seed15 Gym mixed status và25 báo cáo ở Gym01 +1 lịch sử Gym02 INACTIVE trong DB browser tạm. Ảnh1px PNG lưu ở upload directory tạm/private; cleanup theo fixture hiện có. Các fixture khác không bật flag. Backend thêm1 group Admin HTTP/DB: INACTIVE history/processing, exact10 field DTO, no-store, cross-Gym404 và current role/account/gate403. Không ghi dữ liệu vận hành.

Đã xem [selector desktop](design/admin-frontend/previews/report-entry-desktop.png), [selector mobile](design/admin-frontend/previews/report-entry-mobile.png), [report desktop](design/admin-frontend/previews/reports-desktop.png), [report mobile](design/admin-frontend/previews/reports-mobile.png). Ảnh chỉ dữ liệu mock; tên/địa chỉ/IDs/content dài xuống dòng. Config tắt trace/video/screenshot live; ảnh chia sẻ do ca mock tạo.

Ca keyboard ban đầu tái hiện trả focus vào ref nút đã unmount khi mở form. Đã sửa dùng action ID tìm nút hiện hành sau React commit; Escape của cả hai trạng thái được kiểm lại. Lint yêu cầu bỏ key handler trên form không tương tác, dùng listener scoped; dependency effect được khai rõ. Typecheck E2E thêm `src/vite-env.d.ts` vì type import IncidentReport kéo vào module dùng ImportMeta.env. Các lỗi test khác: exact label bao gồm text option (đổi sang accessible combobox name), spy live phải chấp nhận GET auth/me, StrictMode có GET mount đầu bị abort rồi GET thứ hai (kiểm bounded recovery và trang cuối đúng). Không bỏ kiểm phạm vi hoặc mutation để qua test.

## Kết quả lệnh

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-reports,reports,admin-dashboard,gym,admin-memberships,auth,admin-users --rounds=2` | PASS:7 suites ×2 vòng,266 lượt browser, retries0 |
| `npm run test:reports --workspace @multi-gym/api` | PASS:9 HTTP/DB/migration groups |
| `npm run lint`; `npm run typecheck --workspaces`; `npm run build --workspaces` | PASS |
| `npm run typecheck:tests --workspace @multi-gym/api`; `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | PASS:4/4 |
| `git diff --check`; truy vấn `pg_database` sau runner | PASS;0 DB prefix `gym03_browser_` còn lại |

Kết quả tại [qa02-r18-verification.json](qa02-r18-verification.json), đã đối chiếu14 bản ghi suite/vòng exit0. Mỗi vòng: Admin report44 (43mock+1live), Report Manager/Customer3, Admin dashboard26, Gym25, Membership24, auth8, Admin users3 =133 ca khác nhau;266 là lượt qua hai vòng, không phải266 ca riêng. Không cộng các lượt lỗi ban đầu vào nghiệm thu.

Logs: `apps/web/.qa-artifacts/{suite}-round-{1,2}.log`, `/tmp/multi-gym-r18-regression.log`, `/tmp/multi-gym-r18-backend-reports.log`, `/tmp/multi-gym-r18-static.log`. Lượt35 ca ban đầu có27 PASS/8 FAIL, gồm lỗi focus thật và lỗi locator/spy/StrictMode của test đã giải thích ở trên. Lượt44 ca trước hồi quy có43 PASS/1 FAIL do worker đã nạp assertion đếm GET cũ trước khi file được sửa; hai vòng runner mới trên source cuối đều44/44. Kết quả không tuyên bố root QA-02 hoặc toàn bộ25suite đã chạy.

## Giới hạn và bước kế tiếp

- Chromium/fixture API/PostgreSQL tạm, không xác nhận deployment, screen reader/chứng nhận WCAG hoặc mọi race. Axe chỉ kiểm các trạng thái mô tả. Chưa chạy toàn bộ25suite×2/root QA-02 sau R18; QA tổng R12 là lịch sử.
- Quyền thay đổi được biết khi GET/write/auth tiếp theo; không có push event. Nguồn Gym context dùng list Admin hiện có, chi phí tăng theo số trang Gym. Page snapshot nhất quán trong từng request, không snapshot xuyên các trang.
- Request ghi đã gửi không thể rollback bằng đổi route. Khóa unknown outcome/note/receipt chỉ trong mounted scope; rời rồi mở lại phải đọc trạng thái mới. Read-back không phải CAS hay bảo đảm request trước đã kết thúc. Server state machine và quyền hiện hành là ràng buộc cuối.
- Note chưa lưu được gỡ khi đổi Gym/actor/filter/page; không dialog cảnh báo hoặc persist Web Storage mới. Ảnh lỗi dùng fallback private; retry bằng làm mới danh sách, không public URL.
- R19 tiếp theo: chuẩn hóa màn kiểm duyệt đánh giá Admin (ADM-BASE-27/28). Sau đó gói/gallery/giám sát PT và QA tổng; ADM-UI-01 vẫn IN_PROGRESS.

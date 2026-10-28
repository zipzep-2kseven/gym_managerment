# R17 — Thẻ hội viên Admin chỉ đọc theo Gym

Ngày 12/10/2026. Scope G2 đã duyệt: SCR-ADM-011 `/admin/gyms/:gymId/memberships`, FEAT-MEM-003/P-ADM-23. Thực hiện năm bước Implementation §5.4 theo10 REQ/AC/TC. ADM-UI-01 tổng thể vẫn IN_PROGRESS; tiếp theo R18 entry chọn Gym cho báo cáo sự cố.

## Phạm vi triển khai

- Mở **Thẻ hội viên** từ thông tin Gym hoặc sidebar cơ sở, có breadcrumb và context Gym. Gym INACTIVE vẫn tra cứu lịch sử. Dùng GET `/api/v1/gyms/:gymId/memberships` hiện hành, chỉ page/pageSize20; type/client riêng đúng14 field của DTO, không đổi lựa chọn thẻ ở form Manager.
- Tổng từ `pagination.totalItems` là số thẻ, một hội viên nhiều dòng. Hiển thị đủ PENDING/ACTIVE/EXPIRED/CANCELLED theo dữ liệu server, tên null/rỗng có fallback và User ID. Ngày YYYY-MM-DD hiển thị ngày lịch; không tự đổi ACTIVE khi qua end_date.
- Thông tin inline từ dòng hiện hành: IDs Gym/gói/payment, giá lúc mua và timestamps giờ Việt Nam. Giá định dạng trực tiếp decimal string để giữ cents, kể cả0 và999999999999.99; payment null chỉ là thiếu liên kết. Không fetch detail/payment/contact hoặc thêm control ghi thẻ, Registration/Appointment hay tiền.
- Query key actor/Gym/page/pageSize, AbortSignal cho GET. Đổi Gym/actor có effective page1 ngay trước query và chuẩn hóa URL; chỉ URL page được dùng, query lạ bị bỏ. Đổi trang/Gym/actor/refetch đóng thông tin. Escape/đóng trả focus về nút mở, retry thành công trả về control hợp lệ qua component feedback hiện có.
- Loading, rỗng toàn Gym, trang vượt cuối và lỗi có state riêng. Recovery dùng metadata mới, không lặp; refetch lỗi giữ list cũ có cảnh báo và khóa mở thông tin. Lỗi401/403 ẩn dữ liệu kể cả session còn ADMIN, kiểm phiên qua hooks/guard; context lỗi không dùng public/Customer fallback.
- Giữ Minimal SaaS × Enterprise Operations, dials3/1/5, tokens/components hiện có. Không dependency mới hoặc thay production backend/schema/API/quyền. Fixture/test và cổng QA được bổ sung.

## Đối chiếu10 REQ / AC / TC

Các hậu tố01–10 cùng map REQ-ADM-MEM, AC-ADM-MEM và TC-ADM-MEM tại Feature §5.5/Implementation §5.4. ĐẠT áp dụng hành vi và điều kiện kiểm chứng mô tả dưới đây, không chứng nhận deployment hay mọi lịch request đồng thời.

Nguồn: [browser24 ca](../apps/web/e2e/admin-memberships.spec.ts), [HTTP/DB7 nhóm](../apps/api/tests/admin-membership.integration.test.ts), [fixture browser cô lập](../apps/api/tests/gym-03.browser-fixture.ts), [page](../apps/web/src/pages/gym/AdminMembershipsPage.tsx), [hook](../apps/web/src/hooks/useAdminMemberships.ts), [thông tin dòng](../apps/web/src/components/gym/AdminMembershipDetails.tsx).

| REQ / AC / TC | Kết quả | Hành vi và bằng chứng |
| --- | --- | --- |
| 01 | ĐẠT | Mock entry Gym detail/sidebar, đúng breadcrumb/Gym; live API/PostgreSQL đọc Gym ACTIVE25 thẻ và Gym INACTIVE2 thẻ lịch sử. Backend kiểm Admin/local Manager, cross-Gym Manager403, Guest401, Customer/PT403 và Gym missing404. |
| 02 | ĐẠT | Mock/live20+5, page URL/reload/back/reset Gym1; exact page/pageSize không query mới. Backend25 thẻ cùng created_at, ID tăng dần tie-break, hai trang không trùng/thiếu/cross-Gym; count25 khác2 user. |
| 03 | ĐẠT | All4 status trên list mock/live/backend, cùng User nhiều dòng; tổng là số thẻ. ACTIVE quá end_date còn ACTIVE, không filter eligibility. |
| 04 | ĐẠT | Mock tên null/blank, giá0, payment null; backend profile thiếu/tên có hồ sơ/payment có ID, exact14 top fields và nested allowlist, ID Gym/package/customer nhất quán; không email/phone/avatar/health/hash/demo. |
| 05 | ĐẠT | Browser America/Los_Angeles vẫn thấy01/01/2020 từ YYYY-MM-DD; timestamp17:00Z hiện00:00 ngày kế tiếp ở Việt Nam. ACTIVE qua end_date vẫn Hoạt động. GET lặp không đổi bản ghi/timestamps; note không hứa đủ điều kiện PT. |
| 06 | ĐẠT | Mock0,00 ₫ và999.999.999.999,99 ₫; backend decimal snapshot khác giá Package. Payment null không suy trạng thái; non-null chỉ là ID. Request spy không gọi payment/demo/contact API. |
| 07 | ĐẠT | Inline từ row, không GET detail; heading nhận focus, Enter mở/Escape hoặc nút đóng trả focus. Đổi trang/Gym/return và tải lại khi row bị xóa không phục hồi snapshot. State có actor/page/dataUpdatedAt và không mở trong fetch/error. |
| 08 | ĐẠT | Pending không giả0, empty total0/page2→1, page3→2 theo metadata mới không loop. Network/400/404/409/500 retry có chủ ý, cached500 cảnh báo/đóng/khóa thông tin đến khi đọc thành công. Gym context lỗi chặn list. |
| 09 | ĐẠT | Mock Guest/password gate/SUSPENDED và role CUSTOMER/PT/MANAGER không gửi private read; 401/403 sau có cache gỡ list/detail, hết phiên đi login và revoked role rời workspace. Backend đọc current DB role/account/gate/assignment dù JWT claim ADMIN; UUID/query strict400, Gym404, no-store. |
| 10 | ĐẠT | Browser kiểm không có control ghi và observed request sau login chỉ GET; backend repeated reads giữ toàn bộ Membership rows/timestamps. Keyboard/focus/live messages, overflow375/768/1024/1440 và axe375/1440 có info mở/tên dài/IDs dài. |

## Fixture và kiểm tra giao diện

Browser fixture chỉ thêm dữ liệu khi `ADMIN_MEMBERSHIP_FIXTURE=true`, trên DB tạm có guard tên/cleanup. Gym25 thẻ mixed-status giữ ACTIVE. Gym khác2 thẻ EXPIRED/CANCELLED mới chuyển INACTIVE; không vô hiệu ràng buộc ngừng Gym. Lượt đầu fixture bị23514 vì thử ngừng Gym còn PENDING/ACTIVE; đã sửa fixture đúng nghiệp vụ rồi suite24/24 qua. Backend setup ban đầu sai cách mount Express router, đã sửa và đặt setup trong try/finally; DB tạm của lượt setup lỗi đã dọn riêng, không xóa fixture cũ khác.

Đã xem [ảnh desktop1440](design/admin-frontend/previews/memberships-desktop.png) và [ảnh mobile375](design/admin-frontend/previews/memberships-mobile.png) của frontend với dữ liệu mock; tên/IDs/metadata xuống dòng, không tràn ngang. Ảnh không phải dữ liệu vận hành. Config live tắt trace/video/screenshot để không lưu phiên đăng nhập hoặc credential; ảnh chia sẻ chỉ do ca mock responsive tạo.

## Kết quả lệnh

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-memberships,admin-trainers,gym,admin-dashboard,manager-dashboard,pt-dashboard,customer-dashboard,auth,admin-users --rounds=2` | PASS:9 suites ×2 vòng,336 lượt browser, retries0 |
| `npm run test:admin-memberships --workspace @multi-gym/web -- --reporter=line` | PASS:24/24 trong lượt riêng trước hồi quy |
| `npm run test:admin-memberships --workspace @multi-gym/api` | PASS:7 HTTP/DB groups trên source cuối |
| `npm run test:pt-workflow --workspace @multi-gym/api` | PASS:17 HTTP/DB groups và3 migration scenarios |
| `npm run lint`; `npm run typecheck --workspaces`; `npm run build --workspaces` | PASS |
| `npm run typecheck:tests --workspace @multi-gym/api`; `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | PASS:4/4 |
| `git diff --check`; truy vấn `pg_database` sau runner | PASS;0 DB prefix `gym03_browser_`, DB setup lỗi R17 đã dọn |

Kết quả lưu tại [qa02-r17-verification.json](qa02-r17-verification.json). Mỗi vòng: Membership24 (23mock+1live), PT67, Gym25, Admin dashboard26, Manager/PT/Customer mỗi suite5, auth8, Admin users3 =168 ca khác nhau;336 là lượt chạy qua hai vòng, không phải336 ca riêng. Mọi suite/round exit0, không retry; không cộng các lần chạy riêng hoặc fixture/setup lỗi vào tổng.

Logs runner: `apps/web/.qa-artifacts/{suite}-round-{1,2}.log` và `/tmp/multi-gym-r17-regression.log`; backend `/tmp/multi-gym-r17-backend-memberships.log`, `/tmp/multi-gym-r17-backend-pt.log`; static `/tmp/multi-gym-r17-static.log`. Runner mặc định tăng23→24suite và backend QA-01 có Membership test, nhưng R17 chỉ chạy nhóm liên quan ở bảng trên, chưa chạy toàn bộ24suite×2/root QA-02. QA tổng R12 là bằng chứng lịch sử.

## Giới hạn và bước kế tiếp

- Kiểm chứng Chromium và fixture API/PostgreSQL cô lập, không xác nhận deployment, screen reader hoặc chứng nhận WCAG. Axe và kiểm bàn phím chỉ chứng minh các trạng thái được kiểm tra.
- Paging có snapshot repeatable-read cho mỗi request, không giữ snapshot xuyên nhiều trang trong lúc dữ liệu thay đổi; UI dùng metadata mới để khôi phục trang. Thông tin mở rộng được đóng khi refetch, không giữ dữ liệu dòng cũ như vừa cập nhật.
- Mất quyền được nhận biết qua GET/session tiếp theo, không có push event. Dùng nguồn Admin Gym context hiện có; chi phí tra cứu context tăng theo số trang Gym.
- R18 tiếp theo: entry `/admin/reports` chọn Gym theo Implementation §5.5 và Feature §5.6. Sau đó chuẩn hóa các màn Admin còn lại và QA tổng; không đánh dấu toàn bộ ADM-UI-01 hoàn tất.

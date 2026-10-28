# R19 — Chuẩn hóa kiểm duyệt đánh giá Admin

Ngày 12/10/2026. Scope G2 đã duyệt: SCR-ADM-008 `/admin/reviews`, REQ/AC/TC-ADM-BASE-27/28. Giữ chính sách REV-02 và contract API §29. ADM-UI-01 vẫn IN_PROGRESS; tiếp theo R20 quản lý gói tập Admin theo Gym.

## Changed

- [Page](../apps/web/src/pages/review/ReviewModerationPage.tsx) dùng header, chính sách, hai vùng bộ lọc, danh sách nội dung gốc và audit theo nền tảng Admin. [Row](../apps/web/src/pages/review/AdminReviewRow.tsx) có target, Gym/PT ngừng hoạt động, tác giả, điểm/ngày giờ Việt Nam, fallback comment/tên PT. HIDDEN chỉ đọc lịch sử.
- [Selector Gym](../apps/web/src/pages/review/ReviewGymFilter.tsx) tìm literal sau trim, sort tên asc, paging10 riêng; giữ ID/tên/trạng thái Gym đã chọn khi tìm/chuyển trang. Query có actor/search/page và AbortSignal; filter Gym không bị mất khi selector đổi trang. Review paging10 và total theo metadata hiện hành, filter đổi reset page1/form; trang cuối rỗng phục hồi theo tổng mới.
- [Hook](../apps/web/src/hooks/useAdminReviewModeration.ts) quản lý query/mutation/recovery trong subtree key actor. Kind/Gym/status/page nằm trong query key; GET cũ bị hủy khi đổi filter. Cached lỗi thường hiện nhãn dữ liệu cũ và khóa ghi; lỗi401/403 từ list/selector/mutation gỡ nội dung/form và kiểm phiên trước guard điều hướng. Actor đổi reset toàn bộ state cục bộ.
- [Form](../apps/web/src/pages/review/HideReviewForm.tsx): lý do trim/bắt buộc/max1000 → Tiếp tục → Xác nhận ẩn; sửa lý do reset xác nhận. Pending khóa reason/submit/hủy/filter/pager và action khác; synchronous guard chống submit lặp, retry=false. Heading/reason/confirmation/receipt có focus; Escape/hủy trả focus về nút hiện hành. Hủy trước gửi không mutation.
- 400 giữ input để sửa.409/404/network/5xx giữ reason và khóa cả hủy/đổi filter/ghi mới đến khi đọc lại thành công. [Service read-back](../apps/web/src/services/review-moderation.service.ts) quét danh sách hiện hành đúng kind/Gym, paging10, bỏ status hiển thị để tìm đúng ID; không coi row mất khỏi VISIBLE là đã ẩn, không thử kind khác. Target thiếu hoặc đọc thất bại giữ khóa. Sau đọc thành công phải xác nhận lại; nếu HIDDEN hiện audit theo filter phù hợp.
- Thành công200 về page1, invalidate moderation của actor và public/self reviews. Receipt còn nếu refetch lỗi hoặc row rời filter. Read-back xác nhận HIDDEN cũng invalidate reviews; không tự PATCH lại khi mất phản hồi. Kết quả request từ màn đã unmount không đặt reason/receipt vào màn mới.
- CSS chỉ mở rộng phạm vi Admin, giữ Minimal SaaS × Enterprise Operations/dials3/1/5/tokens hiện có. Không thêm dependency, production endpoint/schema/migration/role/policy hoặc quyền sửa/xóa/unhide. Backend chỉ thêm fixture có cờ riêng; runner mặc định vẫn25suite.

## Why

Luồng cũ cho xác nhận ẩn lần nữa ngay sau409/mất mạng và chưa quản lý focus. Chốt đọc lại ở cấp màn giữ nguyên lý do, ngăn bỏ qua bằng đóng form/đổi filter, và đối chiếu kết quả ngay cả khi review đã rời bộ lọc VISIBLE. DTO nguyên bản/audit vẫn do backend kiểm tra và ghi.

## Đối chiếu REQ / AC / TC

Nguồn: [selector/UI/keyboard/axe](../apps/web/e2e/review-moderation-admin.spec.ts), [recovery/auth/race](../apps/web/e2e/review-moderation-recovery.spec.ts), [live paging/history](../apps/web/e2e/review-moderation-live.spec.ts), [live public/self và conflict](../apps/web/e2e/review-moderation.spec.ts), [backend moderation](../apps/api/tests/review-moderation.integration.test.ts), [backend reviews](../apps/api/tests/review.integration.test.ts).

| REQ / AC / TC | Kết quả trong fixture | Bằng chứng |
| --- | --- | --- |
| ADM-BASE-27 | ĐẠT | Default Gym, review10/trang và total; selector17Gym mock/18Gym live có pager riêng, chọn INACTIVE ở trang2 rồi quay trang1/search vẫn giữ nhãn/ID. Kind/status/Gym reset review1/form; local filters reset khi reload/actor đổi. PT name/comment null có fallback; Gym/PT INACTIVE đọc lịch sử. Empty/missing filter/initial failure/cached500/retry/page recovery, cached401/403 và mất phiên/quyền có coverage. Late Gym GET bị abort khi đổi PT. |
| ADM-BASE-28 | ĐẠT | Hai bước, trim/max/blank, sửa reason reset confirm; Enter/Escape/hủy/focus và không ghi khi hủy. Pending và submit tổng hợp chỉ một PATCH.400 sửa input;404/409/network/500 khóa đến read-back; lỗi read/missing giữ khóa. Committed/lost response tìm ID ở trang2 đúng kind/Gym không status, không PATCH lặp; success+refetch500 giữ receipt. Live hide Gym/PT INACTIVE, giữ comment/rating/author/time và mọi row khác; repeat409 không ghi đè audit. Backend concurrent200/409, immutable trigger, public total/average loại HIDDEN và Customer không nhận audit. |

ĐẠT chỉ áp dụng các trạng thái và lịch request đã kiểm chứng; không chứng nhận mọi interleaving hoặc môi trường vận hành.

## Tests

- Suite kiểm duyệt:36ca,34mock +2live API/PostgreSQL. Config [review-moderation](../apps/web/playwright.review-moderation.config.ts) mở rộng testMatch, retries0, trace/video/screenshot tự động tắt; screenshot chủ động chỉ dùng mock.
- `npm run test:review-moderation --workspace @multi-gym/api`:6group PASS; `npm run test:reviews --workspace @multi-gym/api`:8group PASS. Bao gồm Guest/non-Admin, DB-current role/status/password gate dù JWT cũ, wrong kind/Gym, strict payload/query, eligibility, public/self projection, immutable history và race.
- Lint, typecheck workspaces, typecheck API tests/E2E, build workspaces và dashboard cache4 PASS.
- `npm run test:e2e --workspace @multi-gym/web -- --suites=review-moderation,reviews,admin-dashboard,admin-reports,auth,admin-users --rounds=2`:6suite×2,119ca/vòng, **238 lượt browser PASS**, không retry, exit0. [Kết quả từng suite/vòng](qa02-r19-verification.json).

| Suite | Ca mỗi vòng | Hai vòng |
| --- | ---: | ---: |
| review-moderation | 36 | 72 |
| reviews | 2 | 4 |
| admin-dashboard | 26 | 52 |
| admin-reports | 44 | 88 |
| auth | 8 | 16 |
| admin-users | 3 | 6 |
| Tổng | 119 | 238 |

## Verification

- [Ảnh desktop](design/admin-frontend/previews/reviews-desktop.png) · [ảnh mobile](design/admin-frontend/previews/reviews-mobile.png). Screenshot mock gồm form xác nhận và lịch sử ẩn; stress case dùng tên/comment/reason dài.375/768/1024/1440 không overflow; axe WCAG2A/AA/2.1AA tại375/1440 không violation trong ca đã kiểm.
- Cleanup sau kiểm thử:0DB `gym03_browser_` còn lại. Không xóa DB dev hoặc fixture không thuộc R19.
- Fixture [gym-03](../apps/api/tests/gym-03.browser-fixture.ts), cờ `ADMIN_REVIEW_MODERATION_FIXTURE=true`:17Gym lịch sử riêng,13Gym review với13Customer/EXPIRED Membership,3HIDDEN seed và1PT review với COMPLETED Registration/Appointment. PT riêng không có profile để kiểm fallback; ngừng Gym/PT sau seed, giữ Browser Gym hiện hữu cho luồng public/self. Thực thi FK/trigger thật, không disable constraint hoặc sửa dữ liệu vận hành.
- Ca409 mới trước sửa thất bại vì nút xác nhận vẫn enabled; sau sửa đã qua trong suite đầy đủ. Lần dựng fixture đầu bị unique active PT vì dùng PT đã có ở Browser Gym; sửa bằng account PT riêng, giữ constraint.
- Hồi quy ban đầu phát hiện mock dashboard PATCH trả `{}` thay DTO; sửa mock trả review/audit đủ theo API §29, giữ assertion total18 và42. Ca dashboard đó đã chạy lại PASS. Lỗi thuộc mock cũ, không thêm fallback giả trong production UI.

## Issues / giới hạn

- Lý do, receipt và chốt read-back là mounted state; rời route/actor hoặc reload không lưu bản nháp vào Web Storage. Request đã gửi có thể hoàn tất sau rời màn; backend kiểm quyền/current state và transition một lần. Khi mở lại cần dữ liệu mới; không tuyên bố khóa bền vững qua mọi tab hoặc thu hồi request đã gửi.
- Contract không có review detail; read-back quét trang cùng kind/Gym theo giới hạn page100000 của API. Chưa đo hiệu năng trên Gym có dữ liệu cực lớn. Nếu không tìm thấy hoặc tổng thay đổi làm không tìm được ID, giữ khóa thay vì giả định kết quả.
- Chưa chạy root QA-02/toàn25suite×2 trong R19; chưa kiểm deployment, Safari/Firefox hoặc screen reader. Manual policy vẫn do Admin áp dụng; điểm thấp không tự ẩn.

## Architecture Impact

None. Giữ21bảng, Drizzle, JWT HttpOnly/current DB authorization, routes/DTO/no-store và REV-02. Không thêm analytics, notification, Audit_Log, moderation tự động hoặc thao tác ghi mới.

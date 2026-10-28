# Nghiệm thu frontend Admin dashboard — R08

Ngày: 12/10/2026. Phạm vi: `/admin/dashboard`, shell/navigation liên quan và hồi quy các vai trò sau R02–R07. **Kiểm chứng chức năng frontend: PASS. Cổng lint toàn repo: FAIL.** ADM-UI-01 vẫn IN_PROGRESS; báo cáo này không nghiệm thu toàn bộ roadmap Admin hoặc xác nhận deployment.

**Cập nhật sau R08 — R09, 12/10/2026:** cổng lint toàn repo đã PASS sau sửa cấu hình môi trường prototype và tham chiếu `window.*`. Typecheck workspace PASS, hai prototype đạt 51/51 kiểm tra. Bảng kết quả R08 bên dưới giữ kết quả lịch sử của lượt nghiệm thu đó; không còn blocker lint hiện tại. Xem [chi tiết R09](ADMIN_UI_01_IMPLEMENTATION.md#r09--xử-lý-baseline-lint-prototype-12102026). Các phần backend/DB thật chưa xác nhận vẫn còn.

**Cập nhật R10, 12/10/2026:** đã bổ sung kiểm chứng total/order/mixed status/provision/assignment và quyền DB hiện tại bằng API/PostgreSQL thật trong môi trường cô lập: dashboard live 5/5, Gym live 2/2 và các integration liên quan PASS. Xem [ma trận live](ADMIN_DASHBOARD_LIVE_VERIFICATION.md). Các phần “chưa xác nhận” của ma trận R08 dưới đây là trạng thái lịch sử; phần deployment/live race/browser khác và roadmap ngoài dashboard vẫn chưa xác nhận.

## Thay đổi phát sinh từ QA

Retry thay nút đang focus bằng thông báo tải, khiến focus rơi về body khi request kết thúc. Test bàn phím đã tái hiện lỗi trước sửa. `DashboardQueryFeedback` nay trả focus về nút retry nếu tiếp tục lỗi, hoặc liên kết hành động trong vùng tương ứng nếu thành công. Nếu người dùng chuyển sang control khác trong khi chờ, component giữ focus tại đó; không focus vào drawer bị inert hoặc phần tử không hiển thị.

Thêm sáu ca browser: retry lỗi lặp/thành công, không giành focus khi người dùng đã chuyển control, metadata total không hợp lệ, logout hủy Gym request và đăng nhập actor mới, năm lối tắt mở màn thật, lỗi refresh Gym giữ danh sách cache và retry riêng nguồn. Không đổi API/backend/schema/quyền hoặc thêm dependency.

## Kết quả chạy cuối

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| Admin dashboard | `npm run test:admin-dashboard --workspace @multi-gym/web -- --reporter=line --output=/tmp/multi-gym-r08-final` | 26/26 PASS |
| Gym UI | `npm run test:gym-ui --workspace @multi-gym/web` | 25/25 PASS |
| Manager dashboard | `npm run test:manager-dashboard --workspace @multi-gym/web` | 5/5 PASS |
| PT dashboard | `npm run test:pt-dashboard --workspace @multi-gym/web` | 5/5 PASS |
| Customer dashboard | `npm run test:customer-dashboard --workspace @multi-gym/web` | 5/5 PASS |
| Query cache | `npm run test:dashboard-cache --workspace @multi-gym/web` | 4/4 PASS |
| Build workspace | `npm run build` | PASS |
| Typecheck workspace/E2E | `npm run typecheck`; `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| ESLint TS/TSX đang sửa/thêm trong web | `npx eslint --max-warnings=0` trên danh sách file Git đang sửa/thêm | PASS |
| Whitespace | `git diff --check` | PASS |
| ESLint toàn repo | `npm run lint` | FAIL: 115 lỗi `no-undef` trong prototype `docs/design/admin-pilot` và `docs/design/admin-workspace` |

Tổng: **66/66 browser tests**, chạy Chromium với API mock; **4/4 cache tests** dùng QueryClient thực. Không cộng các lần chạy trung gian thất bại vào kết quả cuối. Lint toàn repo chưa đạt, nên chưa thể kết luận tất cả cổng chất lượng của repo đã thông qua.

## Đối chiếu REQ-ADM-DASH-01–10

Ma trận cập nhật coverage frontend cho [Feature §5.7](FEATURE_SPEC.md#57-dashboard-admin-kpi-và-độ-mới-dữ-liệu--adm-spec-08-11102026-ready_for_review), thay cho mô tả GAP tại thời điểm soạn spec. Đây không phải tuyên bố tất cả yêu cầu backend đã nghiệm thu.

| REQ/TC | Bằng chứng frontend đã kiểm chứng | Phần chưa xác nhận |
| --- | --- | --- |
| ADM-DASH-01 | Redirect Admin, ba nguồn KPI riêng, Customer bị chặn, session hết hạn/role bị thu hồi rời workspace | Role/quyền và tổng từ DB thật |
| ADM-DASH-02 | Total metadata 25 với tối đa 5 Gym; tên dài/detail đúng Gym; create tăng total, đổi status giữ tổng và cập nhật dòng | Ordering/tie-break và tổng backend thực |
| ADM-DASH-03 | User total từ metadata, không dùng số dòng; tạo Gym kèm Manager cập nhật count; khóa User giữ tổng | Dashboard sau provision PT mới, gán/thu hồi trên backend thật |
| ADM-DASH-04 | Nguồn `kind=gym`, nhãn phạm vi công khai/đã ẩn; hide review giữ tổng all-status | Phép đếm DB thật loại trừ trainer review |
| ADM-DASH-05 | Loading/zero/missing/invalid/error phân biệt; lỗi một nguồn độc lập; cache cũ và retry riêng nguồn; focus retry | Không xác nhận mọi biến thể response từ backend thật |
| ADM-DASH-06 | QueryClient kiểm tra prefix invalidation, tách nguồn/actor; browser create Gym, status Gym/User, hide review rồi quay lại | Mọi mutation/phiên đồng thời trên server thật |
| ADM-DASH-07 | Key theo actor; logout hủy Gym request chờ; actor mới không thấy snapshot cũ; system/Gym navigation | Race/network và thu hồi grant trong môi trường triển khai |
| ADM-DASH-08 | Năm lối tắt mở màn thật, KPI links và Gym detail; system/Gym scope | Các entry proposal chưa triển khai vẫn ngoài phạm vi |
| ADM-DASH-09 | Một nguồn 401/403 ẩn toàn bộ snapshot; kiểm tra lại phiên và guard xử lý hết hạn/thu hồi Admin | Mọi biến thể account/password gate sau lỗi query, quyền backend thật |
| ADM-DASH-10 | Refresh ba nguồn, busy/stale/client timestamp; responsive, axe A/AA, keyboard drawer/retry và focus lifecycle | Browser khác, screen reader thủ công và môi trường production |

Nguồn: [Admin E2E](../apps/web/e2e/admin-dashboard.spec.ts), [cache tests](../apps/web/tests/admin-dashboard-cache.test.ts). Responsive kiểm tra 375/768/1024/1440px; ca tên Gym dài bổ sung 900px. Đã xem lại ảnh [desktop](design/admin-frontend/previews/dashboard-desktop.png) và [mobile](design/admin-frontend/previews/dashboard-mobile.png) từ lượt E2E cuối: bố cục/chữ/action rõ, số liệu trong ảnh là mock. Kiểm tra axe không thay thế kiểm thử screen reader thủ công.

## Công việc còn lại trước nghiệm thu rộng hơn

- Baseline lint prototype đã xử lý trong R09; cổng lint toàn repo PASS.
- Integration cho số tổng, phân quyền, provision/assignment đã chạy trong R10; live race/liên phiên còn theo [giới hạn báo cáo live](ADMIN_DASHBOARD_LIVE_VERIFICATION.md#giới-hạn-còn-lại).
- Review các màn/entry proposal và phần roadmap Admin ngoài dashboard; giữ ADM-UI-01 IN_PROGRESS.

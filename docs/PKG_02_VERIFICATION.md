# PKG-02 — Package UI verification

**Cập nhật Admin R20 — 12/10/2026:** route Admin đã dùng màn riêng theo5 REQ ADM-BASE-10–14, với context Gym, snapshot/recovery/focus và nền tảng Admin. [Bằng chứng hiện hành R20](ADMIN_PACKAGES_VERIFICATION.md). Kết quả PKG-02 ngày07/10 bên dưới là lịch sử; Manager/Public tiếp tục dùng luồng này.

Ngày: 2026-10-07. Phạm vi: FEAT-PKG-001–007 trên API PKG-01 hiện có.

## Changed

- Thêm `apps/web/src/types/package.types.ts`, `services/package.service.ts`, `hooks/usePackages.ts`.
- Thêm components `PackageToolbar`, `PackageSummary`, `PackageForm`, `PackageQueryState` và pages `PublicPackagesPage`, `ManagedPackagesPage`.
- Nối 4 route public/Manager/Admin trong AppRoutes; thêm liên kết quản lý trên trang Gym; bổ sung sort allowlist cho useListFilters và CSS trên token hiện có.
- Thêm `package-ui.spec.ts`, `package-live.spec.ts`, hai cấu hình Playwright và scripts `test:package-ui`, `test:package-live`.
- Cập nhật README, UI_UX_SPEC, FEATURE_SPEC và IMPLEMENTATION_PLAN. Giữ nguyên các thay đổi backend PKG-01 đang có trong workspace.

## Why

Khách có thể xem catalog và chi tiết gói tập; Manager/Admin có thể tạo, sửa, mở/ngừng bán gói trong đúng Gym. Dùng service + TanStack Query; không thêm thư viện, API, bảng hoặc migration.

## Routes

| Route | Quyền / nguồn dữ liệu |
| --- | --- |
| `/gyms/:gymId/packages` | Public ACTIVE catalog; tìm kiếm/phân trang/sắp xếp |
| `/gyms/:gymId/packages/:packageId` | Public detail; package/Gym hidden hoặc sai scope cùng 404 |
| `/manager/packages` | RequireAuth + RequireRole + GymScopeGuard; Gym lấy từ assignment của `/auth/me` |
| `/admin/gyms/:gymId/packages` | RequireAuth + RequireRole ADMIN; catalog nội bộ gồm INACTIVE |

Biểu mẫu sửa dùng row từ management list, không gọi public detail để đọc gói ngừng bán. UI bảo vệ trải nghiệm; quyền và Gym scope vẫn do API kiểm tra độc lập.

## Tests

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:package-ui -w apps/web` | 23/23 Chromium cases |
| `npm run test:package-live -w apps/web` | 2/2 luồng browser → Express → PostgreSQL thật |
| `npm run test:gym-ui -w apps/web` | 23/23 hồi quy Gym/PT UI |
| `npm run test:gym-live -w apps/web` | 2/2 hồi quy Gym/PT với API/DB thật |
| `npm run typecheck` | PASS toàn workspace |
| `npm run typecheck:tests -w apps/api` | PASS |
| `npm run build` | PASS toàn workspace |
| `git diff --check` + whitespace check file frontend mới | PASS |

Mock cases: Guest projection/decimal max; search/sort/order/page/query allowlist; loading/network/retry/empty; safe 404; Guest/Customer/PT/Manager bị chặn Admin; password gate và missing assignment; POST decimal string và duplicate submit; native validation giá/name/duration; partial PATCH/null description/baseline qua refetch; INACTIVE filter, xác nhận/hủy status; lỗi 400/403/409 giữ dữ liệu form; lỗi đọc quyền không render cached row; bỏ qua Gym query tự khai; expired session; responsive/focus.

Live cases: Manager tạo gói, Guest xem list/detail, sửa giá về 0.00 và mô tả, ngừng bán → Guest detail 404, mở lại → Guest thấy; Admin tạo Gym rồi ngừng Gym, quản lý catalog/gói trong Gym INACTIVE; Manager cross-Gym GET/POST bị backend trả 403 và route Admin bị chặn.

Live config tái sử dụng fixture `gym-03.browser-fixture.ts`: tạo database `gym03_browser_*`, chạy migration hiện có chỉ trong DB tạm, tạo test account rồi DROP database khi shutdown. Trace/screenshot/video tắt trên luồng có đăng nhập. Không áp dụng migration hoặc ghi dữ liệu vào DB vận hành. Kiểm tra read-only pg_database sau lượt chạy cuối: 0 database `gym03_browser_*` còn lại.

## Verification

- Form chỉ gửi package_name, description, duration_days, price. Price đi qua API dưới dạng chuỗi; chuẩn hóa/hiển thị bằng thao tác chuỗi, không dùng floating point để làm tròn.
- PATCH gửi field thay đổi so với snapshot; baseline tiến lên sau thành công, không ghi đè field chưa sửa khi API refetch. Tạo thành công khóa form tới khi đóng để tránh tạo lại cùng gói.
- Mutation không retry tự động, pending khóa form và submit; query key gồm Gym và actor với catalog nội bộ. Invalidate toàn bộ Package cache của Gym sau mutation; login/logout cache clear dùng nền tảng hiện có.
- API đọc 401 xác nhận lại session trước Navigate login: ca tái hiện ban đầu về `/` do RequireGuest còn state đăng nhập cũ; sau sửa ca đó PASS. 403/404 không render dữ liệu cached của response lỗi.
- Status API không body identity/status/force; xác nhận trước mở/ngừng bán. Không tạo hoặc sửa Payment/Membership/history.
- Taste native tokens + Tailwind hiện có, navy/đỏ/trắng, dials 5/2/4. Kiểm tra không overflow ở 375/768/1024/1440; ảnh `/tmp/pkg02-*.png`, đã xem mobile/desktop. Focus-visible rõ, label trên input, reduced-motion theo CSS hiện có. Màu CTA/text dùng nguyên token đã kiểm chứng trong GYM-03.
- Không thêm credential vào frontend runtime, Web Storage hoặc log; test dùng account fixture tạm hiện có.

## Issues

Checkout, Payment callback/method, Membership và thời điểm login trong checkout vẫn thuộc PAY/Q-01/Q-02/Q-17. Detail chỉ thông báo thanh toán trực tuyến chưa triển khai và dẫn thông tin liên hệ Gym; không tạo giao dịch/thẻ giả. Consultation vẫn là placeholder riêng. Không có production deployment trong task này. Root lint hiện là placeholder nên không dùng làm bằng chứng lint.

## Architecture Impact

None. Giữ React/Vite, Router guards, TanStack Query, Tailwind và 7 endpoint PKG-01.

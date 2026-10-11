# QA-01 — Security and API contract verification

Ngày: 2026-10-11. Phạm vi: các chức năng demo đã triển khai, từ Auth/Gym/Package đến Payment demo/PT/Report/Consultation/Gallery/Profile/Review/Admin. Không mở payment/storage production hoặc quản lý máy.

## Audit Report

**Input:** `apps/api/src`, `apps/web/src`, các bộ integration/browser test, API/Architecture/Domain specs và workspace manifests.

**Assumptions:** một API process trong Docker development; PostgreSQL thật; UI React SPA dùng BrowserRouter, không SSR. Quyền nghiệp vụ phải đến từ DB, không từ claim role. Dữ liệu vận hành được giữ; test ghi vào DB/ảnh tạm riêng.

**Quick Stats:** 205 file nguồn, 9.743 dòng TypeScript/TSX ở thời điểm rà soát; Express/Drizzle/PostgreSQL và React/Vite. Đây là thống kê phạm vi scan, không có nghĩa mọi dòng đều được review thủ công. Kiểm tra tập trung trên auth transport, route/private inventory, validation, DTO, query scope và regression các nghiệp vụ.

### Executive Summary (Read This First)

- Đã sửa log unhandled error có thể chứa SQL/params/credential và cache header thiếu trên Auth.
- Đã chặn request ghi từ browser Origin không được phép, gồm logout không JSON; kiểm chứng bằng browser thật với origin khác port nhưng cùng site.
- Đã áp dụng giới hạn login đã có trong spec, đồng bộ chi phí dummy Argon2id, sửa profile password gate và chuẩn hóa lỗi concurrent email/phone thành 409.
- 66 route private được kiểm tra qua app thật; role giả, ownership, cross-Gym và revoke/suspend/password gate được kiểm tra kết hợp với hồi quy toàn hệ thống.
- Kết luận: QA-01 hoàn thành cho phạm vi demo. Dependency/tooling còn việc trước production; không tuyên bố hệ thống production-ready hoặc audit dependency sạch.

### Critical Issues (Must Fix Before Production)

None identified còn mở trong phạm vi code demo được kiểm tra. Không phải kết luận bảo mật tuyệt đối hoặc thay thế pentest.

### High-Risk Issues

**[HIGH — fixed] H-01: Log exception thô có thể lộ dữ liệu.**
Location: `apps/api/src/middleware/error-handler.ts`. Dimension: Security.
Problem: `err.message` của ORM chứa SQL và bind parameters, có thể gồm hash/contact. Fix: chỉ log event cố định `[UNHANDLED_ERROR]`, response 500 giữ envelope an toàn. Test inject SQL/password/cookie/token sentinel vào lỗi, kiểm tra cả log và response.

**[HIGH — fixed] H-02: CORS/SameSite chưa chặn request ghi từ origin cùng site.**
Location: `app.ts`, `request-security.ts`. Dimension: Security.
Problem: logout nhận POST không cần JSON, CORS chỉ quản lý khả năng đọc response. Fix: kiểm tra Origin exact allowlist/Referer fallback trước parse/auth/ghi, browser thiếu nguồn bị từ chối; giữ native-client compatibility. Có test browser thật, cùng hostname khác port. Nguồn tham khảo: [Express CORS](https://expressjs.com/en/resources/middleware/cors/), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**[HIGH — fixed] H-03: Login thiếu giới hạn sai và dummy verify rẻ hơn hash thật.**
Location: `auth.routes.ts`, `login-rate-limit.ts`, `constants/auth.constants.ts`. Dimension: Security/Robustness.
Problem: đặc tả 10 lượt sai/phút/IP chưa được triển khai; dummy hash m=19456/t=2/p=1 khác m=65536/t=3/p=4. Fix: limiter bounded một process, reserve trước verify, success trả slot, Retry-After; dummy dùng cùng work parameters. Không cam kết toàn request constant-time. Unit test gồm concurrent pending, success, hết cửa sổ, spoof X-Forwarded-For.

**[HIGH — fixed] H-04: Password gate bỏ sót profile.**
Location: `user.service.ts`. Dimension: Security/Contract.
Problem: User còn mật khẩu tạm vẫn đọc/sửa profile dù API spec chỉ cho session/password/logout. Fix: kiểm tra trước đọc/ghi và recheck sau row lock; integration thực tế đổi mật khẩu rồi profile mới được dùng. Test Admin race vẫn kiểm tra suspension; fixture đặt account eligible cho race riêng.

**[HIGH — open, tooling] H-05: Dependency development còn advisories.**
Location: `package-lock.json`, `apps/web/package.json`, `apps/api/package.json`. Dimension: Production risks.
Evidence: `npm audit --json` trả exit 1, **15 package entries: 7 high, 8 moderate, 0 critical**. Bao gồm Vite/esbuild, Tailwind và transitives, Drizzle tooling. Các entry có thể là dependency cha/transitive của cùng advisory, không tính là 15 lỗ hổng độc lập. Không chạy audit fix force hoặc nâng major trong lượt QA này. Hướng xử lý: cập nhật dependency theo nhóm và chạy regression, phục vụ production bằng static build, không public dev server. Audit không chứng minh mọi advisory đều khai thác được trên môi trường Linux/demo hiện tại; chưa dựng exploit cho tooling.

### Maintainability Problems

**[MEDIUM — fixed] M-01: Auth/Profile contract validation và lỗi chưa nhất quán.**
Location: `utils/validators.ts`, `utils/jwt.ts`, `auth.middleware.ts`, `account-database-error.ts`, `app.ts`. Dimension: Robustness/Consistency.
Fix: strict unknown-field rejection; giới hạn password; kiểm tra ngày tồn tại, URL HTTP(S) không userinfo; HS256 và UUID subject; API 404 JSON; unwrap known unique constraints qua cause để trả 409. Concurrent registration/profile phone tests dùng unique lock thật và xác minh rollback.

**[MEDIUM — open] M-02: React Router runtime advisories còn được audit báo.**
Evidence: `npm audit --omit=dev --json` trả exit 1, **2 moderate package entries**, `react-router` và `react-router-dom`; không có high/critical trong production dependencies. Không tương đương hai exploit đã xác nhận. [Maintainer open-redirect advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6) yêu cầu chú ý dữ liệu không tin cậy đưa vào navigation. App hiện truyền pathname từ route state ở LoginPage, chưa dựng exploit remote cho đường này. [SSR advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg) loại trừ Declarative Mode; app dùng BrowserRouter SPA. Hướng xử lý trước production: kiểm tra/siết các navigation inputs và nâng lên phiên bản đã vá trong một lượt migration có regression.

**[MEDIUM — open, QA-02] M-03: Lint placeholder và kiểm tra UI toàn hệ thống chưa hoàn tất.**
Location: root `package.json`, `docs/IMPLEMENTATION_PLAN.md`. Dimension: Maintainability/Technical debt.
Build/typecheck có chạy thật; root lint hiện chỉ echo. QA-02 phải cấu hình/kiểm tra lint thật, responsive/a11y và ổn định browser toàn hệ thống. Không lấy kết quả build làm kết quả lint/a11y.

### Production Readiness Score

Score: **81 / 100**, đánh giá heuristic sau sửa code, không phải chứng nhận. Khấu trừ H-05 (-8, thêm -5 cho pattern dependency development ở ít nhất ba nhóm), M-02 (-3), M-03 (-3). Demo được kiểm chứng; trước production còn dependency/tooling, QA-02 và các chính sách production ngoài phạm vi đã hoãn.

### Refactoring Priorities

1. [P1 — done] H-01/H-02: safe logs/cache và browser write origin — S — ngăn lộ credential và request ghi giả mạo.
2. [P2 — done] H-03/H-04: login protection và profile password gate — S — áp dụng đúng đặc tả Auth.
3. [P3 — done] M-01: validation/JWT/error contracts và regression toàn hệ thống — S — lỗi input/concurrency có mã nhất quán.
4. [P4 — production follow-up] H-05/M-02: cập nhật tooling/router, kiểm tra navigation — M — xử lý advisories; không dùng nâng major tự động.
5. [P5 — QA-02] M-03: lint thật, responsive/a11y và ổn định kiểm thử — M.

**Quick Wins:** no-store/nosniff, bỏ X-Powered-By, safe error event, strict Auth schema và API 404 đã triển khai. Không refactor domain/schema khi không có lỗi chứng minh; không thêm package/migration/endpoint.

## Changes and verification

- `npm run test:qa01 -w apps/api`: PASS (exit 0). Gồm **12 security unit/HTTP tests**, **13 full-app HTTP/DB groups** với **66 private routes**, rồi toàn bộ scripts database/Gym/Package/Payment/PT/onboarding/Report/Consultation/Gallery/Trainer Profile/Review/moderation/Admin.
- Các bộ regression có 31 database checks, Gym acceptance 49 HTTP checks/16 endpoints, Package 20 DB + 13 full-app checks, Payment 14, PT 17 + 3 migration cases; onboarding/staffing, Report 8, Consultation 8, Gallery 8, Profile 7, Review 8, moderation 6, Admin 8 nhóm. Không cộng các nhóm và assertion thành một số test giả chính xác.
- Browser: `test:security` **1/1**, `test:admin-users` **3/3**, `test:payment-demo` **4/4**, `test:pt-workflow` **2/2** PASS trên DB/ảnh tạm. Tổng **10 browser cases**; không tuyên bố tất cả browser suite đã chạy.
- Workspace typecheck, API typecheck:tests, workspace build: PASS. Web 158 modules, JS 356,60 kB/gzip 101,96 kB. `git diff --check`: PASS.
- Red/green: trước fix có **9/10 security groups FAIL** (cache/origin/headers/404/validation/date/JWT/log); sau fix PASS. Concurrent registration ban đầu 500, sau fix 409; concurrent phone 409 và rollback được kiểm chứng. Hai lỗi fixture/selector được sửa theo bằng chứng: Admin race kế thừa password gate từ case trước; browser logout chuyển sang heading login, không có link login ở trang đó. Limiter test cleanup được làm idempotent, không đổi product logic để chiều test.
- Harness dùng config import giống fixture hiện có, assert AuthService dùng đúng DB tạm, đóng pool trước DROP thường. Lượt harness ban đầu dùng dynamic config dẫn tới hai module DB instances trong tsx và cleanup FORCE ngắt pool còn mở; đã sửa import, không suppress pool error. Lượt cuối tạo/dọn database bình thường.

## Limits

Limiter không chia sẻ giữa instance hoặc qua restart; qua reverse proxy cần thiết kế trusted IP rõ ràng. Native client thiếu Origin/Referer/Sec-Fetch-Site vẫn được hỗ trợ; đây không phải cơ chế chặn client có toàn quyền tạo HTTP header. Quyền riêng tư vẫn đến từ cookie/DB. JWT chưa có permanent revocation store; token còn hạn có thể dùng lại khi mở khóa account theo ADM-01. Public/history đã tải không bị thu hồi từ browser. Origin guard không bảo vệ khi chính origin tin cậy bị XSS.

Ảnh/gallery/report, storage và thanh toán production giữ giới hạn các task trước. Không thay đổi legacy avatar, refund, role CRUD hoặc policy thiết bị. Không tuyên bố chứng minh không còn mọi IDOR, timing leak, hoặc lỗ hổng dependency.

## Docker development

`docker compose build api` và `docker compose up -d --no-deps api`: PASS. API dev được recreate với source hiện hành; Web vẫn dùng source bind mount. Không migrate/reset database và không tạo/khóa tài khoản vận hành.

Smoke: health/public Gyms 200; Guest Admin users 401; unknown API 404 JSON; POST logout từ Origin không phép 403 UNTRUSTED_ORIGIN, không Set-Cookie. Các API responses giữ no-store/nosniff và không X-Powered-By. Counts trước/sau giữ **3 users, 2 gyms, 0 memberships, 0 registrations, 0 appointments**.

Docker/npm audit vẫn báo các dependency advisories đã nêu; không tính build thành audit sạch.

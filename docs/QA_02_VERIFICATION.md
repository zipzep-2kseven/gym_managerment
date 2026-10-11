# QA-02 — giao diện và độ ổn định kiểm thử

Ngày kiểm tra: 2026-10-11. Phạm vi: demo hiện có; không thay đổi policy, schema hay dữ liệu vận hành.

## Thay đổi

- Thay lint placeholder bằng ESLint 9 flat config: JS/TypeScript recommended, React Hooks, JSX accessibility; fail khi có warning. Bỏ qua build, migration generated, các thư mục skill/vendor. `no-explicit-any` chưa bật do DTO/test boundaries hiện hữu; lint không thay cho typecheck.
- Baseline lint có 15 lỗi: import/biến không dùng, dependency thừa của refreshSession và autoFocus. Đã sửa; giữ đúng Express Request namespace augmentation với ngoại lệ cục bộ có giải thích. Native dialog dùng showModal để focus, có kiểm tra focus/trap/restore bằng bàn phím.
- Baseline axe phát hiện 13 phần tử chữ thiếu tương phản ở register/profile/change-password (2,56:1). Đổi muted text từ #94A3B8 sang #64748B. Giữ thiết kế navy/đỏ hiện hữu.
- Skip link chuyển focus vào main; HTML khai báo tiếng Việt. Profile có h1/main, header và nội dung tài khoản xuống dòng khi màn hình nhỏ/chuỗi dài. Các ô Auth/Profile liên kết lỗi bằng aria-invalid và aria-describedby.
- Auth E2E cũ thực thi Docker SQL vào database demo và dùng tài khoản từ test trước. Thay bằng fixture database ngẫu nhiên, metadata không chứa mật khẩu, guard tên database tạm và tài khoản độc lập mỗi test; không bỏ qua lỗi cleanup. Không còn xóa user demo ở afterAll.
- Test Package live dùng luồng tạo Gym cũ; cập nhật sang tạo Gym kèm Manager như nghiệp vụ đã triển khai.
- Runner chạy 17 cấu hình tuần tự, mỗi cấu hình/vòng có fixture mới, retries=0; fail fast và lưu log/kết quả. Bổ sung typecheck cho E2E/config và test API.

## Phạm vi kiểm chứng

- 39 trang theo Guest/Customer/PT/Manager/Admin: public Gym/PT/package/consultation, Auth/Profile, Customer payment/membership/report/PT, PT profile/workspace, Manager, Admin. Kiểm tra tràn ngang ở 375/768/1024/1440; axe WCAG 2 A/AA và 2.1 A/AA tại 375/1440.
- Kiểm tra bàn phím: skip link, gửi login bằng Enter, lỗi ô nhập, dialog focus ban đầu, Shift+Tab/Tab và background inert (native modal cho phép focus vào browser chrome), Escape và trả focus. Axe bổ sung ở dialog và consultation pending.
- Loading/empty/error/retry có test và axe; các bộ nghiệp vụ kiểm tra pending/disabled/chống submit lặp, lỗi 409/429, giữ nội dung, phân trang và các trạng thái dữ liệu thực tế.
- 17 suites: auth, gym UI/live, package UI/live, payment demo, PT workflow, customer calendar, reports, consultation, gallery, trainer profile, reviews, review moderation, admin users, security, QA-02. Calendar chạy timezone America/Los_Angeles để kiểm tra quy tắc giờ Việt Nam.

## Kết quả

**QA-02 CLOSED cho demo.** Các bước của chuỗi nghiệm thu được chạy riêng và đều hoàn tất:

| Kiểm tra | Kết quả |
|---|---|
| npm run lint | PASS, 0 lỗi/warning |
| npm run typecheck | PASS cả 3 workspaces |
| npm run build | PASS cả 3 workspaces |
| API typecheck:tests, Web typecheck:e2e | PASS |
| API test:qa01 | PASS: 12 security tests, 13 full-app groups/66 private routes và toàn bộ hồi quy database/Gym/package/payment/PT/onboarding/report/consultation/gallery/profile/review/moderation/admin |
| Web test:qa02 | PASS 17 suites × 2 vòng; 91 tests/vòng, tổng 182 lượt, retries=0 |
| Ma trận giao diện | PASS 39 trang × 4 độ rộng; axe tại 375/1440, không có violation trong phạm vi đã chạy |
| Docker dev smoke | Login tải được ở localhost:3000, lang=vi, muted=#64748B, không tràn ngang ở 375 |
| Profile email dài (mock, không ghi DB) | Không tràn ngang ở 375/768/1024/1440 |
| git diff --check | PASS |

| Suite | Vòng 1 passed | Vòng 2 passed |
|---|---:|---:|
| auth | 8 | 8 |
| gym | 24 | 24 |
| gym-live | 2 | 2 |
| package | 23 | 23 |
| package-live | 2 | 2 |
| payment-demo | 4 | 4 |
| pt-workflow | 2 | 2 |
| customer-calendar | 4 | 4 |
| reports | 3 | 3 |
| consultation | 3 | 3 |
| gallery | 2 | 2 |
| trainer-profile | 3 | 3 |
| reviews | 2 | 2 |
| review-moderation | 2 | 2 |
| admin-users | 3 | 3 |
| security | 1 | 1 |
| qa02 | 3 | 3 |

Đã xem ảnh Guest desktop, Manager mobile/desktop và Profile mobile. Các kiểm tra tự động này gồm trạng thái dữ liệu, loading/empty/error/retry, form pending và modal; không suy diễn thành chứng nhận WCAG.

Database demo trước/sau: 3 users, 2 gyms, 0 memberships, 0 PT registrations/appointments, 6 migrations. Sau runner: 0 database gym03_browser_* còn lại; auth fixture metadata đã dọn. Không reset hay migrate database vận hành.

## Chạy lại và bằng chứng

`npm run test:qa02` tại root chạy toàn bộ chuỗi. Một vòng browser: `npm run test:e2e --workspace @multi-gym/web`. Chi tiết axe: `npm run test:accessibility --workspace @multi-gym/web`.

Artifacts tại `apps/web/.qa-artifacts/`: browser-results.json, log mỗi suite/vòng, accessibility-results.json, ảnh Guest/Manager/Profile tại 375/1440. Artifacts bị gitignore; chạy lại để tạo bằng chứng mới. Công cụ và cách diễn giải theo [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) và [typescript-eslint configs](https://typescript-eslint.io/users/configs/).

## Giới hạn

Axe và kiểm tra bàn phím này không phải chứng nhận WCAG hay kiểm tra toàn bộ trình đọc màn hình. Browser tự động chạy Chromium; Safari/Firefox và thiết bị thật vẫn là kiểm tra bổ sung trước production. Hai vòng không retry là bằng chứng ổn định trong lần chạy này, không bảo đảm không bao giờ flaky.

Audit dependency còn 15 package entries (7 high, 8 moderate; cùng số lượng với QA-01). Audit `--omit=dev` còn 2 moderate entries (react-router/react-router-dom). Runtime router và các công cụ build còn follow-up trước production; QA-02 không tự nâng major. Payment/storage production và quản lý máy vẫn giữ phạm vi hoãn đã thống nhất.

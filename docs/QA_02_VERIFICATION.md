# QA-02 — giao diện và độ ổn định kiểm thử

**QA tổng sau R22 — 14/10/2026:** toàn chuỗi root `npm run test:qa02` PASS,exit0; đủ28suite×2vòng,824lượt browser PASS,retries0. Static/build/tests-typecheck/cache4/4/backend QA-01 PASS. Đây là kết quả QA tổng mới nhất; các ghi chú chưa chạy tổng phía dưới là lịch sử. [Báo cáo](QA_02_POST_R22_VERIFICATION.md).

**R22 — 14/10/2026:** giám sát PT SCR-ADM-015 đã kiểm chứng theo ADM-BASE-24–26; [báo cáo](ADMIN_PT_WORKSPACE_VERIFICATION.md), [artifact188lượt browser PASS](qa02-r22-verification.json). Năm suite liên quan×2vòng,retries0; suite R22 có15mock+1live. Lint/typecheck/build/tests-typecheck/cache và toàn bộ backend QA-01 PASS sau phục hồi nền workspace. Runner có28suite; chưa chạy toàn bộ28suite hoặc root QA-02 trong R22. Các dòng R21 chưa nghiệm thu R22 phía dưới mô tả lịch sử; tiếp theo QA tổng.

**Chốt R21 — 14/10/2026:** R21 bổ sung suite thứ27 là `admin-gallery`49ca (47mock,2live). Năm suite liên quan×2 vòng ngày12/10:250 lượt PASS; sau sửa picker thêm102 lượt Gallery PASS. Ngày14/10 chạy lại Gallery trên workspace hiện tại thêm102 lượt PASS: [artifact454 lượt hồi quy, retries0](qa02-r21-verification.json). [Báo cáo R21](ADMIN_GALLERY_VERIFICATION.md) ghi backend8group/cache4 PASS, static/build chạy lại PASS, các sửa nhỏ và8/8 ca PT bổ sung, giới hạn bundle/storage. Workspace có suite PT thứ28; R22 chưa được nghiệm thu đầy đủ. Chưa chạy toàn bộ runner/root QA-02 trong R21.

**Cập nhật R20 — 12/10/2026:** runner mặc định tăng25→26suite với `admin-packages`40ca (38mock,2live). Năm suite liên quan×2 vòng:198 lượt browser PASS không retry, package backend20+13 checks/static/build/cache4 PASS. [Báo cáo R20](ADMIN_PACKAGES_VERIFICATION.md) và [kết quả từng suite/vòng](qa02-r20-verification.json) ghi bằng chứng và giới hạn. Chưa chạy toàn bộ26suite×2/root QA-02 trong R20; QA tổng R12 bên dưới là lịch sử.

**Cập nhật R19 — 12/10/2026:** suite `review-moderation` mở rộng2→36ca (34mock,2live) trong runner mặc định25suite; review/moderation backend14group. Sáu suite liên quan×2 vòng:238 lượt browser PASS không retry; static/build/cache4 PASS. [Báo cáo R19](ADMIN_REVIEW_MODERATION_VERIFICATION.md) và [kết quả từng suite/vòng](qa02-r19-verification.json) ghi bằng chứng và giới hạn. Chưa chạy toàn bộ25suite×2/root QA-02 trong R19; QA tổng R12 dưới đây là lịch sử.

**Cập nhật R18 — 12/10/2026:** runner mặc định tăng24→25suite với `admin-reports`; report backend từ8 lên9 group. R18 chạy7suite liên quan ×2 vòng,266 lượt browser PASS không retry, backend report9/static/build/cache4 PASS. [Báo cáo R18](ADMIN_REPORT_ENTRY_VERIFICATION.md) và [kết quả từng suite/vòng](qa02-r18-verification.json). Chưa chạy toàn bộ25suite×2/root QA-02 sau R18; QA tổng R12 dưới đây là lịch sử.

**Cập nhật R17 — 12/10/2026:** runner mặc định tăng23→24suite với `admin-memberships`; backend QA-01 bổ sung7 group Membership. R17 chạy9suite liên quan ×2 vòng,336 lượt browser PASS không retry, backend Membership/PT workflow/static/build/cache PASS. [Báo cáo R17](ADMIN_MEMBERSHIP_VERIFICATION.md) và [kết quả từng suite/vòng](qa02-r17-verification.json). Chưa chạy toàn bộ24suite×2 hoặc root QA-02 sau R17; kết quả root QA R12 bên dưới là lịch sử.

Ngày kiểm tra: 2026-10-11. Phạm vi: demo hiện có; không thay đổi policy, schema hay dữ liệu vận hành.

**Kết quả mới nhất — R12, 12/10/2026:** toàn chuỗi root `npm run test:qa02` PASS, exit code 0; gồm lint/typecheck/build, test typecheck, cache 4/4, backend QA-01 và đủ 22 browser suite × 2 vòng không retry. 138 ca/vòng, tổng 276 lượt browser PASS. Xem [báo cáo R12](QA_02_R12_VERIFICATION.md). Các ghi chú R11 chưa chạy toàn chuỗi và kết quả 17 suite ngày 11/10 bên dưới là lịch sử.

**Cập nhật R11 — 12/10/2026:** runner mặc định đã tăng từ 17 lên 22 suite, thêm Admin dashboard mock/live và Manager/PT/Customer dashboard. Root QA-02 bổ sung dashboard cache trước backend regression. Năm suite bổ sung đã chạy qua runner chung một vòng: 46/46 PASS không retry; cache 4/4, lint và typecheck E2E PASS. Chưa chạy lại toàn bộ 22 suite × 2 vòng hoặc toàn chuỗi root QA-02 trong R11; các số 17 suite/182 lượt bên dưới là kết quả lịch sử ngày 11/10. Chi tiết tại [R11](ADMIN_UI_01_IMPLEMENTATION.md#r11--đưa-dashboard-vào-cổng-hồi-quy-qa-12102026).

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

Chạy riêng nhóm dashboard: `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-dashboard,admin-dashboard-live,manager-dashboard,pt-dashboard,customer-dashboard`. Có thể thêm `--rounds=2`; bỏ `--suites` để chạy đủ 22 suite. Tên suite không hợp lệ/rỗng/trùng bị từ chối trước khi chạy. `browser-results.json` và log phản ánh lượt chạy gần nhất, có thể chỉ là nhóm suite đã chọn; không dùng chúng để khẳng định toàn bộ QA nếu chưa chạy đủ.

Artifacts tại `apps/web/.qa-artifacts/`: browser-results.json, log mỗi suite/vòng, accessibility-results.json, ảnh Guest/Manager/Profile tại 375/1440. Artifacts bị gitignore; chạy lại để tạo bằng chứng mới. Công cụ và cách diễn giải theo [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) và [typescript-eslint configs](https://typescript-eslint.io/users/configs/).

## Giới hạn

Axe và kiểm tra bàn phím này không phải chứng nhận WCAG hay kiểm tra toàn bộ trình đọc màn hình. Browser tự động chạy Chromium; Safari/Firefox và thiết bị thật vẫn là kiểm tra bổ sung trước production. Hai vòng không retry là bằng chứng ổn định trong lần chạy này, không bảo đảm không bao giờ flaky.

Audit dependency còn 15 package entries (7 high, 8 moderate; cùng số lượng với QA-01). Audit `--omit=dev` còn 2 moderate entries (react-router/react-router-dom). Runtime router và các công cụ build còn follow-up trước production; QA-02 không tự nâng major. Payment/storage production và quản lý máy vẫn giữ phạm vi hoãn đã thống nhất.

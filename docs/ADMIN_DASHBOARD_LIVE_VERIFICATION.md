# R10 — Dashboard với API và PostgreSQL thật

Ngày 12/10/2026. **PASS trong môi trường kiểm thử cô lập**, không xác nhận deployment. Bổ sung kiểm chứng backend cho các khoảng trống R08; ADM-UI-01 vẫn IN_PROGRESS.

## Phạm vi và cách chạy

```bash
npm run test:admin-dashboard-live --workspace @multi-gym/web
```

Lệnh dùng Chromium, Vite, Express và PostgreSQL thật, không mock endpoint. Cần PostgreSQL/DATABASE_URL hợp lệ, quyền tạo DB kiểm thử, Chromium và cổng 3104/4103 trống. Fixture hiện có tạo DB tên ngẫu nhiên `gym03_browser_*`, áp dụng migration đầy đủ, seed riêng và xóa DB khi kết thúc. Test SQL chỉ được kết nối khi tên DB khớp prefix và UUID từ file thông tin fixture của lượt chạy; không in connection string/credential hoặc ghi vào DB demo. Các test chạy thành một workflow tuần tự, không retry.

Thêm flag `ADMIN_DASHBOARD_FIXTURE` vào fixture dùng chung; chỉ config mới bật flag. Dữ liệu lịch sử membership/PT registration đáp ứng trigger review thật; review được tạo VISIBLE rồi ẩn có audit. Giữ constraints và guard hiện hành. Không thay production code/API/schema hoặc thêm dependency.

## Coverage mới

| Yêu cầu | Kiểm chứng xuyên UI/API/DB |
| --- | --- |
| ADM-DASH-02 | 7 Gym gồm ACTIVE/INACTIVE, UI tối đa 5 dòng; total khớp SQL count. So khớp thứ tự `created_at DESC, gym_id ASC` với DB. Tạo Gym kèm Manager qua UI tăng Gym 7→8; ngừng Gym qua API vẫn tổng 8. |
| ADM-DASH-03/06 | Tạo Gym kèm Manager tăng User 4→5 khi quay lại dashboard qua sidebar; provision PT qua API tăng 5→6 sau refresh. Khóa User PT, thu hồi Manager trước khi chuyển Gym, gán lại và thu hồi đều giữ tổng User 6. Không tăng count thủ công trên client. |
| ADM-DASH-04 | Hai Gym review VISIBLE/HIDDEN đều được đếm; một trainer review được đếm riêng và không cộng vào Gym KPI. Hide review qua API giữ tổng Gym review 2, DB xác nhận hai bản ghi HIDDEN. |
| ADM-DASH-01/09 | Sau đăng nhập Admin, đổi role/password gate/status trong DB trong khi giữ cookie cũ. Refresh nhận 401/403, KPI biến mất; role hiện guard không có quyền, password chuyển change-password, khóa tài khoản hiện guard không khả dụng. Không yêu cầu role/status đổi URL vì guard hiện nội dung thay thế tại route hiện hành. |
| ADM-DASH-10 | Refresh tải ba nguồn thật và total UI khớp count trực tiếp trong DB sau mỗi thay đổi. |

Provision PT, status/hide và assignment ở suite mới đi qua request API của browser rồi refresh dashboard; không gọi đó là kiểm chứng toàn bộ form UI. Suite Gym live hiện có chạy lại để kiểm tra provision PT/status qua form, tạo Gym/Manager, đổi mật khẩu và chặn cross-Gym. Hồi quy cache/invalidation mounted query vẫn có bằng chứng R05/R08 riêng; refetch sau quay lại/refresh không tự chứng minh invalidation.

## Kết quả chạy cuối

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:admin-dashboard-live --workspace @multi-gym/web -- --reporter=line --output=/tmp/multi-gym-r10-final` | 5/5 PASS, không retry |
| `npm run test:gym-live --workspace @multi-gym/web -- --reporter=line --output=/tmp/multi-gym-r10-gym` | 2/2 PASS |
| `npm run test:admin-users --workspace @multi-gym/api` | 8 nhóm integration PASS |
| `npm run test:review-moderation --workspace @multi-gym/api` | 6 nhóm integration PASS |
| `npm run test:gym-onboarding --workspace @multi-gym/api` | 12 ca onboarding + 12 ca staffing PASS |
| `npm run typecheck:e2e --workspace @multi-gym/web` | PASS |
| `npm run typecheck:tests --workspace @multi-gym/api` | PASS |
| `npm run lint`; `git diff --check` | PASS |

Kiểm tra hậu chạy qua `pg_database` xác nhận không còn DB `gym03_browser_*`. Tổng browser live trong lượt này: **7/7**. Không cộng số nhóm integration với số ca browser và không coi 66 mock browser tests của R08 là vừa chạy lại. Build không chạy lại vì chỉ thay test/fixture/config/script và tài liệu.

Nguồn: [suite live](../apps/web/e2e/admin-dashboard-live.spec.ts), [config](../apps/web/playwright.admin-dashboard-live.config.ts), [fixture](../apps/api/tests/gym-03.browser-fixture.ts).

## Giới hạn còn lại

- Chưa xác nhận bản build, dữ liệu/quyền và vận hành trong môi trường triển khai.
- Race của response chậm/logout/actor switch có coverage mock R08, chưa có live browser race tương đương; backend có các integration CAS/khóa đã chạy nhưng không đại diện mọi race dashboard.
- Chưa chạy browser khác/screen reader thủ công hoặc nghiệm thu mọi mutation/form trong roadmap Admin.
- Các màn/entry proposal Admin ngoài dashboard tiếp tục theo roadmap; không coi toàn bộ 79 Requirement đã đạt.

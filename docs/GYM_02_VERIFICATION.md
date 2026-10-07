# GYM-02 — Nghiệm thu backend

Ngày kiểm tra: 2026-10-06.

**GYM-02: CLOSED — implementation và verification backend.** GYM-01 giữ CLOSED. UI thuộc GYM-03, chưa triển khai trong đợt này. Trạng thái CLOSED không có nghĩa đã triển khai vào database vận hành.

## Phạm vi đợt 5

Bổ sung `apps/api/tests/gym-02.acceptance.test.ts`, chạy app/router Express thật với đăng nhập và cookie thật trên database tạm. Runner tạo database riêng, áp dụng 0000–0002, thực hiện luồng nghiệp vụ rồi xóa database đó. Thêm script `test:gym02`, đưa acceptance vào `test:database`, và thêm `tsconfig.tests.json` cùng script `typecheck:tests` để kiểm tra TypeScript của source/tests.

Không sửa business logic, schema hoặc migration trong đợt 5. Các repository Gym/User, GymScopeService và migration 0000/0001 được giữ nguyên. Chạy regression baseline hiện có không mở lại nghiệm thu GYM-01.

## API và bằng chứng nghiệm thu

Tất cả đường dẫn dưới đây có prefix `/api/v1`. Acceptance qua app thật có phản hồi thành công cho **16/16 endpoint**; kiểm tra chi tiết validation, scope và concurrency nằm trong các suite integration tương ứng.

| Nhóm | Endpoint | Bằng chứng |
| --- | --- | --- |
| Public Gym | `GET /gyms`, `GET /gyms/:gymId` | ACTIVE-only, projection công khai, pagination/search/sort, 404 khi ẩn/không tồn tại; `public-gym.integration.test.ts` |
| Ghi Gym | `POST /gyms`, `PATCH /gyms/:gymId` | Admin tạo; Admin/Manager ACTIVE đúng Gym cập nhật; allowlist, authorization và concurrent partial updates; `gym-write.integration.test.ts` |
| Manager | `POST /admin/managers/provision`, `GET /gyms/:gymId/managers`, `POST /gyms/:gymId/managers/assign`, `POST /gyms/:gymId/managers/:managerId/revoke` | Credential do backend sinh, password gate, giới hạn Manager, revoke/reactivate cùng bản ghi, refreshed assigned_at và concurrency; `staffing.integration.test.ts` |
| PT provisioning | `POST /gyms/:gymId/trainers/provision` | Admin hoặc Manager ACTIVE đúng Gym; duplicate email không trả credential; `staffing.integration.test.ts` và full-app acceptance |
| PT assignment/status | `POST /gyms/:gymId/trainers`, `PATCH /gyms/:gymId/trainers/:trainerId/status` | Q-08 một ACTIVE Gym/PT; transfer rõ ràng, reuse assignment; Q-13 chặn nghĩa vụ mở và kiểm tra điều kiện activation; `gym-lifecycle.integration.test.ts` |
| Gym status | `PATCH /gyms/:gymId/status` | Chặn Payment/Membership/Registration/Appointment mở, kể cả lịch quá hạn chưa kết thúc; không cascade; migration guards và concurrency; `gym-lifecycle.integration.test.ts` |
| Public PT | `GET /gyms/:gymId/trainers`, `GET /gyms/:gymId/trainers/:trainerId` | Gym/PT ACTIVE, mọi availability, profile an toàn, social links/schedule ACTIVE, isolation; `public-trainer.integration.test.ts` |
| Quản trị | `GET /admin/gyms`, `GET /gyms/:gymId/management/trainers` | Role/assignment từ DB, Gym A/B, account/password gate, filter và đọc nội bộ Gym INACTIVE; `gym-management.integration.test.ts` |

Luồng acceptance liên kết: Admin đăng nhập → tạo hai Gym → provision Manager → đổi password tạm → Manager sửa Gym đúng scope/provision PT → PT đổi password → đọc public/internal → từ chối ngừng khi còn nghĩa vụ → giải quyết fixture → ngừng/kích hoạt lại PT → revoke/reactivate Manager → chuyển PT giữa Gym với giới hạn Q-08 → ngừng/mở lại Gym và kiểm tra lịch sử.

Role, Assignment, Membership, PT Registration và Appointment được kiểm tra như các thực thể riêng. Đổi mật khẩu không tự chuyển account/email/assignment status; revoke assignment tác động quyền ở request tiếp theo. Membership/Registration/Appointment trong acceptance được tạo và kết thúc bằng **SQL fixture**, không phải bằng API nghiệp vụ chưa triển khai.

## Kết quả chạy

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:database -w apps/api` | PASS: 86 kiểm tra baseline; 52 ca trên schema 0002; full-app acceptance 49 kiểm tra HTTP, 16/16 endpoint Gym |
| `GYM_TEST_ORDER=reverse npm run test:lifecycle -w apps/api` | PASS: 52 ca trên schema 0002 theo thứ tự đảo ngược |
| `npm run typecheck:tests -w apps/api` | PASS: source và tests API |
| `npm run typecheck` | PASS: toàn workspace |
| `npm run build` | PASS: toàn workspace |
| `git diff --check` | PASS |

52 ca trên schema hiện tại gồm: 12 lifecycle/migration, 12 staffing, 7 public Gym, 7 ghi Gym, 8 public PT, 6 danh sách quản trị. Các suite kiểm tra upgrade fail-safe với dữ liệu cũ không hợp lệ, rollback bảo toàn dữ liệu, tranh chấp assignment, booking/PT deactivation và Payment/Gym shutdown bằng giao dịch đồng thời chờ khóa thực sự.

Baseline 0000/0001 có fixture lịch sử từng cho phép PT đa Gym; kết quả baseline không được dùng làm bằng chứng cho policy Q-08 hiện tại. Policy hiện tại được chứng minh trên migration 0002.

Không chạy browser/UI E2E trong đợt 5; auth được kiểm tra qua HTTP thật. Lint root hiện là placeholder, không ghi nhận là đã lint.

## Trạng thái triển khai và phần tiếp theo

Kiểm tra database đang cấu hình bằng transaction **READ ONLY** ghi nhận:

- Migration 0000 và 0001 đã được ghi trong journal.
- Migration 0002 chưa được ghi trong journal.
- Index `gym_trainers_active_user_key` và Gym shutdown guard chưa có.

**Database vận hành chưa có bảo vệ Q-08/Q-13 của migration 0002.** Cần triển khai migration này trước khi đưa hành vi backend phụ thuộc vào sử dụng vận hành. Đợt nghiệm thu không chạy migration hoặc thay đổi dữ liệu của database vận hành.

Không còn blocker implementation/verification trong phạm vi backend GYM-02 đã chốt. Công việc kế tiếp theo Implementation Plan là **GYM-03 — Public Gym/PT và Manager/Admin forms**; chưa thực hiện trong đợt 5. Các Q mở cho Payment/Membership/Booking, upload và nghiệp vụ khác tiếp tục thuộc phạm vi riêng, không được tự chốt ở đây.

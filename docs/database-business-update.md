# Cập nhật database nghiệp vụ Gym / PT

Báo cáo của lượt triển khai migration 0001 trước đó. Kết quả test ở §8 là bằng chứng của lượt đó, không phải lần chạy lại trong task đồng bộ tài liệu. Đặc tả hiện hành: [Domain Rules](DOMAIN_RULES.md), [Database Spec](DATABASE_SPEC.md), [API Spec](API_SPEC.md) và [Implementation Plan](IMPLEMENTATION_PLAN.md).

## 1. Database hiện tại đã kiểm tra

Express + TypeScript, PostgreSQL 17, Drizzle ORM 0.45 và Drizzle Kit 0.31.
Đã đọc migration `0000_stiff_blur.sql`, snapshot, journal, toàn bộ schema/relations,
seed roles/admin, services, controllers, DTO và các nơi tham chiếu bảng cũ.
Database thực tế trước thay đổi có migration 0000, 15 bảng, không có native enum;
status được triển khai bằng `varchar + CHECK`. Không có FK/CHECK chưa validate.

15 bảng: users, user_profiles, roles, user_roles, gyms, gym_managers,
gym_trainers, packages, payments, memberships, pt_registrations, pt_appointments,
equipment_types, equipments, gym_reports.

## 2. Các migration đã tạo

- `apps/api/drizzle/0001_gym_business_update.sql`: sáu bảng mới, availability,
  index/FK/CHECK và trigger bảo vệ nghiệp vụ. Đã áp dụng lên database trong `.env`.
- `apps/api/drizzle/meta/0001_snapshot.json`, `_journal.json`: metadata Drizzle.
- `apps/api/drizzle/rollback/0001_gym_business_update.sql`: rollback thủ công có
  kiểm tra dữ liệu, vì Drizzle Kit hiện tại của dự án không có lệnh down.

Migration 0000 không thay đổi. Drizzle chạy migration trong transaction;
kiểm tra dữ liệu PT sai Gym sẽ làm cả migration thất bại, không tự sửa/xóa dữ liệu.
Journal ngăn chạy migration hai lần. Nếu schema bị sửa thủ công ngoài journal,
CREATE/ALTER sẽ báo xung đột và rollback thay vì bỏ qua một schema không tương thích.
Các trigger SQL tùy chỉnh được quản lý trong migration, không nằm trong Drizzle snapshot;
cần giữ chúng khi tạo các migration sau.

Chạy từ thư mục `apps/api`, sau khi cấu hình biến môi trường:

```sh
node --env-file=../../.env ../../node_modules/drizzle-kit/bin.cjs migrate
```

Rollback chỉ dùng khi 0001 là migration mới nhất. Dừng application writers, backup,
mở một transaction, chạy file rollback, xóa đúng journal entry 0001 rồi commit:

```sql
BEGIN;
-- Chạy toàn bộ apps/api/drizzle/rollback/0001_gym_business_update.sql tại đây.
DELETE FROM drizzle.__drizzle_migrations
WHERE created_at = 1790580907366;
COMMIT;
```

Nếu bất kỳ bước nào lỗi: `ROLLBACK`, không xóa journal riêng lẻ.
File down khóa các bảng liên quan và từ chối khi bảng mới có dữ liệu hoặc availability
đã khác mặc định. Khi đó giữ schema và rollback application; không xóa dữ liệu mới.
Không chạy rollback lên database hiện tại trong quá trình thực hiện task này.
Đã kiểm thử down/up và từ chối rollback có dữ liệu trên database riêng.

## 3. Các bảng mới

- gym_images: nhiều ảnh/Gym, caption, display_order, timestamps.
- consultation_requests: Guest có user_id NULL, liên hệ, thời gian mong muốn,
  nội dung, trạng thái, assigned_to và timestamps.
- pt_social_links: platform/url theo PT, không tạo cột riêng cho từng mạng xã hội.
- pt_working_schedules: thứ, giờ bắt đầu/kết thúc, status và timestamps.
- gym_reviews: đúng Gym, tác giả, rating/comment, trạng thái, audit ẩn.
- trainer_reviews: đúng gym_trainer_id, tác giả, rating/comment, trạng thái, audit ẩn.

## 4. Các bảng đã chỉnh sửa

- gym_trainers thêm availability, NOT NULL, mặc định NOT_ACCEPTING. Giữ nguyên status.
- pt_registrations thêm trigger kiểm tra cùng Gym, không đổi cột.
- memberships và gym_trainers thêm trigger chống đổi Gym khi đã có PT Registration.
- Không sửa cấu trúc Membership, Payment, Package hay Appointment.

## 5. Constraint / FK đã thêm

- FK của bảng mới đều RESTRICT khi xóa/cập nhật khóa, tránh cascade mất lịch sử.
- Index cho tất cả FK mới; index theo đối tượng/trạng thái hoặc thứ/display_order.
- CHECK tương đương trainer_availability, consultation_status, review_status,
  social_platform, day_of_week; không tạo native enum trùng.
- CHECK rating nguyên 1–5, display_order >= 0, end_time > start_time,
  URL/liên hệ bắt buộc không rỗng, audit ẩn phải có đủ thời gian/Admin/lý do.
- Không thêm unique một review mỗi người/đối tượng vì nghiệp vụ chưa yêu cầu.
- Giữ các composite FK đã có: Payment–Package cùng Gym, Membership–Package cùng
  Gym, Membership–Payment cùng user/Gym/Package.
- Trigger PT kiểm tra cả insert/update và đổi Gym ở bảng cha. Khóa hàng cha khi
  kiểm tra để ngăn thay đổi Gym đồng thời làm sai quan hệ.
- Trigger review kiểm tra Membership/PT Registration khi tạo; chặn DELETE/TRUNCATE,
  sửa nội dung/tác giả/đối tượng; chỉ cho VISIBLE → HIDDEN với Admin hoạt động.
  Không cho ghi đè audit hay unhide vì chưa có nghiệp vụ tương ứng.

## 6. Business validation cần Backend đảm bảo

Đã thêm services có thể kiểm thử bằng dependency injection:

- review.service: lấy actorId từ authentication server; kiểm tra tài khoản hoạt động,
  Membership đúng người/đối tượng và PT Registration; kiểm tra rating;
  chỉ Admin được hide và lưu hidden_by từ actorId, không từ request body.
- pt-registration.service: Membership thuộc Customer, ACTIVE và trong thời hạn;
  PT ACTIVE và cùng Gym. Không tạo bảng giá/thanh toán PT. Availability độc lập với
  status và không tự động coi là số chỗ trống hoặc thay thế sự thống nhất với PT.

Chưa có API Gym/PT/Review trong backend cũ. Không tạo thêm routes/controllers.
Khi bổ sung endpoint, phải gọi các service này; không tin user_id/hidden_by từ client.
Frontend/public query phải chỉ trả review VISIBLE; chỉ Admin được truy cập audit.
Không cấp credentials database cho client; DB trigger không thay thế xác thực actor.
Admin nghiệp vụ khác với PostgreSQL superuser, người có quyền DDL vẫn có thể vô hiệu trigger.

Consultation khi có endpoint: validate email/phone/ngày mong muốn, URL an toàn,
quyền người xử lý và assignment cùng Gym. Current schema không có Staff role/assignment;
không tự thêm role/bảng ngoài yêu cầu. updated_at của bảng mới ngoài review cần được
backend cập nhật khi sửa, giống convention các bảng cũ.

## 7. Các file source code bị ảnh hưởng

- Schema: gyms.ts, index.ts, relations.ts; thêm discovery.ts, trainer-profile.ts, reviews.ts.
- Services: thêm review.service.ts, pt-registration.service.ts.
- apps/api/package.json: thêm test:database.
- apps/api/tests/database-business.test.ts: integration test PostgreSQL thật.
- apps/web/e2e/auth-acceptance.spec.ts: thu hẹp cleanup về đúng email của lượt test;
  không còn xóa mọi user có prefix customer.
- Migration/snapshot/journal/rollback và tài liệu này.

Seed roles/admin, DTO/auth responses và API hiện tại không cần đổi. Không thêm sample
seed vào database đang dùng; fixtures hợp lệ chỉ được tạo trong database kiểm thử riêng.

## 8. Test đã chạy

- `node --env-file=.env --import tsx apps/api/tests/database-business.test.ts`: 31 checks PASS.
  Fresh migration, chạy lại, down/up, bảo toàn dữ liệu trước nâng cấp,
  fail atomically khi legacy PT sai Gym, FK, CHECK, Guest consultation,
  review eligibility, giữ nội dung/audit, phân quyền Admin, PT service, ORM relations.
- `npm run typecheck`: cả ba workspaces PASS.
- `npm run build`: web/API/shared PASS.
- `npm run test:e2e -w apps/web`: 8/8 acceptance tests PASS.
- `npm run db:generate -w apps/api`: không còn schema diff.
- Migration thực tế: 21 bảng, journal 0000 + 0001. So sánh SHA-256 dữ liệu từng bảng
  cũ trước/sau (bỏ cột availability mới) cho kết quả giống nhau trên cả 15 bảng.
  Trước nâng cấp: roles=4, users=2, user_profiles=1, user_roles=2; bảng nghiệp vụ còn lại rỗng.
  Trường hợp có dữ liệu nghiệp vụ đã được kiểm tra riêng bằng fixture trước upgrade.

Test database cần tài khoản có quyền CREATE DATABASE; luôn dùng tên ngẫu nhiên và chỉ
DROP database thử nghiệm do chính lượt test tạo. Không reset database application.

## 9. Những vấn đề còn tồn tại / quyết định cần lưu ý

Không phát hiện lỗi qua các kiểm tra trên. Các điểm nghiệp vụ chưa được mô tả cụ thể
được triển khai theo quy ước sau, cần giữ nhất quán khi phát triển API:

- Working Schedule status: ACTIVE/INACTIVE; khung qua nửa đêm phải tách thành hai ngày.
- PT cũ mặc định NOT_ACCEPTING, cần PT/Manager chủ động cập nhật khi triển khai giao diện.
- Membership đủ điều kiện review: ACTIVE hoặc EXPIRED, đã tới start_date;
  PT Registration: ACTIVE hoặc COMPLETED. PENDING/CANCELLED bị loại vì chưa có
  lịch sử trạng thái để chứng minh đã sử dụng. Nếu cần cho phép người từng dùng nhưng
  sau đó hủy, cần chốt bằng chứng sử dụng trước khi mở rộng rule.
- Chưa có mô hình Staff để xác minh assigned_to thuộc Staff của Gym.
- Không triển khai API mới, PT pricing/payment hay các tính năng ngoài phạm vi.


## 10. Đồng bộ tài liệu nghiệp vụ chính thức

Bộ docs đã đưa phạm vi hiện hành lên 21 bảng; Membership là cốt lõi, PT và Consultation không bắt buộc trong đăng ký Gym. API/Feature/UI/Plan phân biệt schema/service đã có với endpoint và màn hình mục tiêu. Các giới hạn triển khai hiện tại được theo dõi tập trung ở Domain §9: Q-14 Staff, Q-15 review, Q-16 availability/quyền profile, Q-17 checkout/account, Q-18 Working Schedule, Q-19 Consultation/gallery. Không coi điều kiện ACTIVE/EXPIRED hoặc việc cấm tác giả sửa review trong trigger hiện tại là quyết định mới của người dùng.

Lượt đồng bộ này chỉ sửa Markdown và hướng dẫn AI; không sửa source code, migration, seed hay dữ liệu database. Nếu quyết định tiếp theo thay đổi constraint/trigger, cần migration mới bảo toàn dữ liệu.

Kiểm tra tài liệu trong lượt đồng bộ: đối chiếu đủ 21 bảng/cột/constraint/index với snapshot 0001 và đọc trigger SQL; kiểm tra mapping Feature/API/UI, mã Q, link nội bộ/anchor và bảng Markdown. Hash source code trong apps/packages được so trước/sau để xác nhận không thay đổi trong lượt này. Không chạy lại migration/build/E2E vì thay đổi chỉ là tài liệu.

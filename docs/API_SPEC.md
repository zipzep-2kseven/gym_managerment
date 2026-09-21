# Multi-Gym Platform — REST API Specification

## 1. Phạm vi và mức độ hoàn thiện hợp đồng

Đồng bộ với ERD 15 bảng tại [DATABASE_SPEC.md](DATABASE_SPEC.md) và nghiệp vụ [DOMAIN_RULES.md](DOMAIN_RULES.md). Giữ REST `/api/v1`, Express/TypeScript, Zod, Drizzle/PostgreSQL, JWT qua cookie. Không tạo CRUD máy móc cho mọi bảng.

Catalog dưới đây mô tả hợp đồng mục tiêu, không khẳng định endpoint đã được triển khai. Các hàng có mã Q là **DRAFT phần phụ thuộc** và chưa được triển khai hành vi đó trước khi chốt Q tại Domain §9. Các thao tác không bị chặn vẫn cần schema/constraints phù hợp trước khi chạy. Giá trị status tham chiếu Database §11, không tự chọn enum vật lý.

## 2. Tiêu Chuẩn Giao Thức & Cấu Trúc Chung

### 2.1. Base URL & Giao Thức
- **Development:** `http://localhost:4000/api/v1`
- **Production:** `https://api.gymplatform.vn/api/v1`
- **Giao thức:** HTTPS bắt buộc ở môi trường Production.
- **Content-Type:** `application/json; charset=utf-8` cho tất cả request và response có payload.

### 2.2. Chuẩn Hóa HTTP Status Codes
Hệ thống sử dụng mã trạng thái HTTP chuẩn xác theo ngữ nghĩa:

| HTTP Status | Ý nghĩa chuẩn | Ngữ cảnh sử dụng |
| :--- | :--- | :--- |
| **`200 OK`** | Thành công | Thao tác đọc danh sách, chi tiết, cập nhật thành công, logout hoặc trả về kết quả truy vấn. Logout trả JSON theo envelope chuẩn. |
| **`201 Created`** | Khởi tạo thành công | Tạo mới resource thành công (User, Gym, Package, Membership, Appointment...). |
| **`204 No Content`** | Thành công không nội dung | Thao tác xóa thành công khi endpoint quy định không trả kèm body. |
| **`400 Bad Request`** | Lỗi định dạng dữ liệu | Payload không khớp Zod schema, query params sai kiểu dữ liệu, thiếu trường bắt buộc. |
| **`401 Unauthorized`** | Chưa xác thực | Không có cookie xác thực hoặc phiên không hợp lệ, ví dụ JWT hết hạn hay sai chữ ký. |
| **`403 Forbidden`** | Không có quyền hạn | Phiên hợp lệ nhưng User không ACTIVE (INACTIVE hoặc SUSPENDED), hoặc vi phạm RBAC / Gym Scope / Resource Ownership. |
| **`404 Not Found`** | Không tìm thấy | Resource ID không tồn tại hoặc resource thuộc phòng gym khác (giấu thông tin để chống enumeration). |
| **`409 Conflict`** | Xung đột trạng thái / Dữ liệu | Trùng lặp email, trùng lịch tập PT (Appointment overlap), vi phạm status transition không hợp lệ. |
| **`422 Unprocessable Entity`** | Không thể xử lý ngữ nghĩa | Dữ liệu đúng schema cú pháp nhưng vi phạm business logic sâu (ví dụ: ngày kết thúc trước ngày bắt đầu). |
| **`500 Internal Server Error`** | Lỗi nội bộ hệ thống | Lỗi cơ sở dữ liệu không mong muốn, unhandled exception (ẩn toàn bộ chi tiết stack trace với client). |

---

## 3. Định Dạng Payload Thống Nhất (Envelope Format)

Toàn bộ response của hệ thống đều được chuẩn hóa theo cấu trúc Envelope:

### 3.1. Phản hồi thành công cho Single Resource (Object)
```json
{
  "success": true,
  "data": {
    "gym_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "gym_name": "Elite Fitness District 1",
    "status": "ACTIVE"
  }
}
```

### 3.2. Phản hồi thành công cho Collection có Phân trang (Paginated List)
```json
{
  "success": true,
  "data": [
    {
      "gym_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "gym_name": "Elite Fitness District 1",
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### 3.3. Phản hồi lỗi chuẩn (Standard Error Envelope)
```json
{
  "success": false,
  "error": {
    "code": "GYM_SCOPE_FORBIDDEN",
    "message": "You do not have administrative permission to access resources belonging to Gym ID 7c9e6679-7425-40de-944b-e07fc1f90ae7.",
    "details": null
  }
}
```

### 3.4. Phản hồi lỗi Validation (Zod Validation Error)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "price",
        "message": "Price must be greater than or equal to 0"
      },
      {
        "field": "duration_days",
        "message": "Duration days must be greater than 0"
      }
    ]
  }
}
```

---

## 4. Kiến Trúc Xác Thực (Authentication) & Quản Lý Phiên

### 4.1. Cơ chế JWT + HttpOnly Cookie
1. **Transport:** Khi người dùng Login hoặc Register thành công, server sinh JSON Web Token (JWT) và thiết lập thông qua HTTP Response Header `Set-Cookie`.
2. **Cookie Flags bắt buộc:**
   - `HttpOnly = true`: Ngăn chặn JavaScript chạy trên trình duyệt truy cập cookie (chống tấn công XSS).
   - `Secure = true`: Cookie chỉ được truyền qua kênh HTTPS (cho phép HTTP ở môi trường localhost dev).
   - `SameSite = Lax`: Chống tấn công Cross-Site Request Forgery (CSRF) trong khi vẫn duy trì trải nghiệm chuyển trang thông thường.
   - `Path = /api/v1`: Giới hạn phạm vi cookie chỉ gửi kèm các request đến API backend.
   - `Max-Age = 604800` (7 ngày).
3. **Cấm tuyệt đối:** Client không bao giờ lưu trữ token trong `localStorage` hay `sessionStorage`.
4. **Argon2id Hashing:** Toàn bộ mật khẩu người dùng được băm bằng thuật toán Argon2id với thông số an toàn: Memory cost = 65536 KB (64MB), Iterations = 3, Parallelism = 4.
5. **Token Payload Claims:**
   - `sub`: `user_id` (UUID).
   - `email`: Email người dùng.
   - `roles`: Mảng các mã vai trò cấp hệ thống `['CUSTOMER']` hoặc `['MANAGER']` hoặc `['PT']` hoặc `['ADMIN']`.
   - `iat`: Timestamp cấp phát.
   - `exp`: Timestamp hết hạn.

---


## 5. Phân quyền, scope và DTO

- User đăng nhập lấy từ JWT sub và kiểm tra trạng thái/quyền hiện tại trong DB. Manager đối chiếu gym_managers ACTIVE; PT đối chiếu gym_trainers ACTIVE, đúng User và Gym.
- Customer sở hữu Payment/Membership/Report qua user_id. Registration qua Membership.user_id; Appointment qua Registration → Membership.user_id. PT truy học viên/lịch qua Registration → gym_trainers.user_id.
- Route gymId là Gym cần thao tác, không phải bằng chứng quyền. Registration/Appointment JOIN qua Membership và đối chiếu Gym Trainer cùng Gym. Admin không được bỏ qua toàn vẹn quan hệ.
- Public Gym/Package/PT chỉ trả trường công khai. Role không thay thế scope, ownership hoặc field allowlist. Không trả password_hash hay token trong JSON.
- must_change_password=true: cho phép đọc phiên, đổi mật khẩu, logout; chặn thao tác nghiệp vụ khác với 403 PASSWORD_CHANGE_REQUIRED. Quy trình xác minh email và phát mật khẩu tạm theo Q-10.
- Timestamp trả ISO 8601 có timezone, ngày trả YYYY-MM-DD, giờ hoạt động là giờ địa phương theo policy được chốt. IDs dùng UUID; tiền là giá trị decimal với precision/serialization cuối cùng chờ Q-11, không tính tiền từ số client tùy ý.

### 5.1. Projection và response DTO

| DTO | Field / ý nghĩa |
| :--- | :--- |
| UserSession | user_id, email, phone, email_verified_at, must_change_password, status, created_at, updated_at; profile (UserProfile hoặc NULL), roles (mảng role_name), active_gym_assignments |
| active_gym_assignments | Mảng projection của gym_managers/gym_trainers: assignment_type (MANAGER/PT), gym_id, gym_manager_id hoặc gym_trainer_id tương ứng. Đây là DTO tính từ quan hệ, không phải cột/bảng mới. |
| UserProfile | profile_id, user_id, full_name, date_of_birth, gender, address, avatar_url, created_at, updated_at |
| UserProfileView | {phone, profile}; phone từ users, profile là UserProfile hoặc NULL |
| UserAdminView | user_id, email, phone, email_verified_at, must_change_password, status, created_at, updated_at; roles và profile theo projection được cấp quyền |
| TrainerPublicView | gym_trainer_id, gym_id, specialization, experience_years, bio, status, joined_at; profile công khai chỉ full_name, avatar_url |
| EquipmentView | Manager/Admin: equipments; Customer chọn máy: equipment_id, gym_id, equipment_type_id, equipment_code |
| MembershipView | Các cột memberships + gym: {gym_id, gym_name}, package: {package_id, package_name}; giá hiển thị vẫn là purchase_price, không phải Package.price hiện tại |
| RegistrationView | Các cột pt_registrations + membership: {membership_id, user_id, gym_id, package_id, start_date, end_date, status}, customer: {user_id, full_name, avatar_url}, trainer: {gym_trainer_id, user_id, gym_id, full_name, avatar_url}, gym: {gym_id, gym_name} |
| AppointmentView | Các cột pt_appointments + registration: RegistrationView, chỉ cho tài nguyên thuộc scope/ownership của request |
| ManagerProvisionResult / TrainerProvisionResult | {user: UserSession, assignment: gym_managers hoặc gym_trainers}; cách giao credential tạm là Q-10, không trả hash hoặc ghi log mật khẩu |

Các projection quan hệ được Backend JOIN trong cùng scope; full_name/avatar_url có thể NULL khi chưa có Profile. Không cho PT truy cập danh sách Membership toàn Gym để tự ghép tên học viên. Projection không thêm cột/bảng. DTO có tên bảng trong catalog dùng các cột đúng Database Spec dưới đây, được giới hạn bởi scope/role. Các field bổ sung như roles/profile là projection được khai báo ở trên, không tạo thêm schema.

| Resource | Field |
| :--- | :--- |
| roles | `role_id`, `role_name`, `description` |
| gyms | `gym_id`, `gym_name`, `description`, `phone`, `email`, `address`, `latitude`, `longitude`, `logo_url`, `opening_time`, `closing_time`, `status`, `created_at`, `updated_at` |
| gym_managers | `gym_manager_id`, `gym_id`, `user_id`, `assigned_at`, `status`, `created_at`, `updated_at` |
| gym_trainers | `gym_trainer_id`, `gym_id`, `user_id`, `specialization`, `experience_years`, `bio`, `status`, `joined_at`, `created_at`, `updated_at` |
| packages | `package_id`, `gym_id`, `package_name`, `description`, `duration_days`, `price`, `status`, `created_at`, `updated_at` |
| payments | `payment_id`, `user_id`, `gym_id`, `package_id`, `amount`, `payment_method`, `transaction_code`, `payment_status`, `paid_at`, `created_at`, `updated_at` |
| memberships | `membership_id`, `user_id`, `gym_id`, `package_id`, `payment_id`, `start_date`, `end_date`, `purchase_price`, `status`, `created_at`, `updated_at` |
| pt_registrations | `registration_id`, `membership_id`, `gym_trainer_id`, `registered_at`, `status`, `note`, `created_at`, `updated_at` |
| pt_appointments | `appointment_id`, `registration_id`, `start_time`, `end_time`, `status`, `note`, `created_at`, `updated_at` |
| equipment_types | `equipment_type_id`, `name`, `description`, `created_at`, `updated_at` |
| equipments | `equipment_id`, `gym_id`, `equipment_type_id`, `equipment_code`, `purchase_date`, `condition`, `status`, `created_at`, `updated_at` |
| gym_reports | `report_id`, `user_id`, `gym_id`, `equipment_id`, `report_type`, `title`, `content`, `image_url`, `status`, `resolved_by`, `resolved_at`, `resolution_note`, `created_at`, `updated_at` |

### 5.2. Quy ước ghi dữ liệu

`?` trong catalog là field tùy chọn của request, không quyết định nullable vật lý. PATCH cần ít nhất một field được cho phép. Không nhận PK, timestamps, role hay scope ngoài allowlist; gym_id từ route được xác thực. Các field bắt buộc/phạm vi chưa chốt vẫn được theo dõi tại Q-11 trước khi sinh validator hoàn chỉnh.

POST tạo resource trả 201, GET/PATCH/action trả 200; register/login đặt cookie. auth/me trả UserSession; register/login bọc trong {user: UserSession}; response luôn nằm trong envelope §3. Lỗi validation 400, sai quan hệ nghiệp vụ 422, xung đột 409. Các action thay đổi trạng thái phải kiểm tra trạng thái nguồn và chống cập nhật đồng thời.

## 6. Catalog endpoint và payload

Tất cả path dưới đây có tiền tố **/api/v1**. Path :managerId là gym_manager_id; :trainerId là gym_trainer_id. Các :registrationId/:appointmentId dùng PK mới tương ứng. Không dùng id chung trong response.

| Feature | Method / Path | Actor / Scope | Body | Response data | Phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FEAT-AUTH-001 | `POST /auth/register` | Guest | email, password, full_name; phone? | UserSession | — |
| FEAT-AUTH-002 | `POST /auth/login` | Guest | email, password | UserSession | — |
| FEAT-AUTH-003 | `POST /auth/logout` | Authenticated | — | {message} | — |
| FEAT-AUTH-004 | `GET /auth/me` | Authenticated | — | UserSession | — |
| FEAT-AUTH-004 | `GET /users/me/profile` | Authenticated, chính chủ | — | UserProfileView | — |
| FEAT-AUTH-005 | `PATCH /users/me/profile` | Authenticated, chính chủ | full_name?, phone?, date_of_birth?, gender?, address?, avatar_url? | UserProfileView | — |
| FEAT-AUTH-006 | `POST /auth/change-password` | Authenticated, chính chủ | current_password, new_password | {message} | — |
| FEAT-GYM-001 | `GET /gyms` | Public | — | gyms[] | — |
| FEAT-GYM-002 | `GET /gyms/:gymId` | Public | — | gyms | — |
| FEAT-GYM-003 | `POST /gyms` | Admin | gym_name, address; description?, phone?, email?, latitude?, longitude?, logo_url?, opening_time?, closing_time? | gyms | — |
| FEAT-GYM-004 | `PATCH /gyms/:gymId` | Admin, Manager đúng Gym | Các field tạo Gym, tất cả tùy chọn; không nhận gym_id/status | gyms | — |
| FEAT-GYM-005 | `PATCH /gyms/:gymId/status` | Admin | status | gyms | Q-13 |
| FEAT-MGR-001 | `POST /admin/managers/provision` | Admin | gym_id, email, full_name; phone? | ManagerProvisionResult | Q-10, Q-11 |
| FEAT-MGR-002 | `GET /gyms/:gymId/managers` | Admin, Manager đúng Gym | — | gym_managers[] | — |
| FEAT-MGR-003 | `POST /gyms/:gymId/managers/assign` | Admin | user_id | gym_managers | Q-11, Q-12 |
| FEAT-MGR-004 | `POST /gyms/:gymId/managers/:managerId/revoke` | Admin | — | gym_managers | — |
| FEAT-TRN-001 | `GET /gyms/:gymId/trainers` | Public | — | TrainerPublicView[] | — |
| FEAT-TRN-002 | `GET /gyms/:gymId/trainers/:trainerId` | Public | — | TrainerPublicView | — |
| FEAT-TRN-003 | `POST /gyms/:gymId/trainers` | Admin, Manager đúng Gym | user_id; specialization?, experience_years?, bio? | gym_trainers | Q-08, Q-11 |
| FEAT-TRN-004 | `PATCH /gyms/:gymId/trainers/:trainerId/status` | Admin, Manager đúng Gym | status | gym_trainers | Q-13 |
| FEAT-TRN-005 | `POST /gyms/:gymId/trainers/provision` | Admin, Manager đúng Gym (dự kiến) | email, full_name; phone?, specialization?, experience_years?, bio? | TrainerProvisionResult | Q-10, Q-11 |
| FEAT-PKG-001 | `GET /gyms/:gymId/packages` | Public | — | packages[] | — |
| FEAT-PKG-002 | `GET /gyms/:gymId/packages/:packageId` | Public | — | packages | — |
| FEAT-PKG-003 | `POST /gyms/:gymId/packages` | Admin, Manager đúng Gym | package_name, duration_days, price; description? | packages | — |
| FEAT-PKG-004 | `PATCH /gyms/:gymId/packages/:packageId` | Admin, Manager đúng Gym | package_name?, duration_days?, price?, description? | packages | — |
| FEAT-PKG-005 | `PATCH /gyms/:gymId/packages/:packageId/deactivate` | Admin, Manager đúng Gym | — | packages | — |
| FEAT-PKG-006 | `PATCH /gyms/:gymId/packages/:packageId/activate` | Admin, Manager đúng Gym | — | packages | — |
| FEAT-PAY-001 | `POST /gyms/:gymId/payments` | Customer | package_id, payment_method | payments | Q-01, Q-02, Q-11 |
| FEAT-PAY-002 | `GET /payments/me` | Customer | — | payments[] | — |
| FEAT-PAY-002 | `GET /payments/:paymentId` | Customer, chính chủ | — | payments | — |
| FEAT-MEM-002 | `GET /memberships/me` | Customer | — | MembershipView[] | — |
| FEAT-MEM-003 | `GET /gyms/:gymId/memberships` | Admin, Manager đúng Gym | — | MembershipView[] | — |
| FEAT-MEM-004 | `GET /memberships/:membershipId` | Customer chính chủ; Admin, Manager đúng Gym | — | MembershipView | — |
| FEAT-PTR-001 | `POST /gyms/:gymId/pt-registrations` | Customer chính chủ; Manager đúng Gym | membership_id, gym_trainer_id; note? | RegistrationView | Q-04, Q-05, Q-11 |
| FEAT-PTR-002 | `GET /pt-registrations/me` | Customer, PT | — | RegistrationView[] | — |
| FEAT-PTR-003 | `GET /gyms/:gymId/pt-registrations` | Admin, Manager đúng Gym | — | RegistrationView[] | — |
| FEAT-PTR-004 | `PATCH /gyms/:gymId/pt-registrations/:registrationId/assign` | Admin, Manager đúng Gym | gym_trainer_id | RegistrationView | Q-07 |
| FEAT-PTR-005 | `PATCH /gyms/:gymId/pt-registrations/:registrationId/cancel` | Admin, Manager đúng Gym | note? | RegistrationView | Q-13 |
| FEAT-APP-001 | `POST /gyms/:gymId/pt-appointments` | Customer chính chủ, PT phụ trách, Manager đúng Gym | registration_id, start_time, end_time; note? | AppointmentView | Q-04, Q-05, Q-06, Q-11 |
| FEAT-APP-002 | `GET /pt-appointments/me` | Customer, PT | — | AppointmentView[] | — |
| FEAT-APP-003 | `GET /gyms/:gymId/pt-appointments` | Admin, Manager đúng Gym | — | AppointmentView[] | — |
| FEAT-APP-004 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/reschedule` | Customer chính chủ, PT phụ trách, Manager đúng Gym | start_time, end_time; note? | AppointmentView | Q-06, Q-11 |
| FEAT-APP-005 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/cancel` | Customer chính chủ, PT phụ trách, Manager đúng Gym | note? | AppointmentView | Q-06 |
| FEAT-APP-006 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/complete` | PT phụ trách, Manager đúng Gym | note? | AppointmentView | Q-05, Q-06 |
| FEAT-APP-008 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/confirm` | Chờ quyết định quyền tại Q-06 | — | AppointmentView | Q-06 |
| FEAT-EQT-001 | `GET /equipment-types` | Authenticated, phục vụ luồng hợp lệ | — | equipment_types[] | — |
| FEAT-EQP-001 | `GET /gyms/:gymId/equipments` | Admin, Manager đúng Gym; Customer gửi report theo Q-09 | — | EquipmentView[] | Q-09 |
| FEAT-EQP-002 | `POST /gyms/:gymId/equipments` | Admin, Manager đúng Gym | equipment_type_id, equipment_code, condition, status; purchase_date? | equipments | — |
| FEAT-EQP-003 | `PATCH /gyms/:gymId/equipments/:equipmentId` | Admin, Manager đúng Gym | equipment_type_id?, equipment_code?, purchase_date?, condition?, status? | equipments | Q-09 |
| FEAT-REP-001 | `POST /gyms/:gymId/reports` | Customer trong scope hợp lệ | report_type, title, content; equipment_id?, image_url? | gym_reports | Q-09 (eligibility chọn máy) |
| FEAT-REP-002 | `GET /reports/me` | Customer | — | gym_reports[] | — |
| FEAT-REP-003 | `GET /gyms/:gymId/reports` | Admin, Manager đúng Gym | — | gym_reports[] | — |
| FEAT-REP-004 | `PATCH /gyms/:gymId/reports/:reportId/investigate` | Admin, Manager đúng Gym | — | gym_reports | — |
| FEAT-REP-005 | `PATCH /gyms/:gymId/reports/:reportId/resolve` | Admin, Manager đúng Gym | resolution_note | gym_reports | — |
| FEAT-REP-006 | `PATCH /gyms/:gymId/reports/:reportId/reject` | Admin, Manager đúng Gym | Chờ Q-13 | gym_reports | Q-13 |
| FEAT-ADM-001 | `GET /admin/users` | Admin | — | UserAdminView[] | — |
| FEAT-ADM-002 | `PATCH /admin/users/:userId/status` | Admin | status | UserAdminView | — |
| FEAT-ADM-003 | `GET /admin/roles` | Admin | — | roles[] | — |
| FEAT-GYM-006 | `GET /admin/gyms` | Admin | — | gyms[] | — |
| FEAT-TRN-006 | `GET /gyms/:gymId/management/trainers` | Admin, Manager đúng Gym | — | gym_trainers[] | — |
| FEAT-PKG-007 | `GET /gyms/:gymId/management/packages` | Admin, Manager đúng Gym | — | packages[] | — |

## 7. Quy tắc xử lý theo endpoint

### `POST /auth/register`

Chuẩn hóa email trim/lowercase, mật khẩu 8–128 ký tự có chữ hoa và số; full_name 2–100. Transaction tạo User ACTIVE, Profile và role CUSTOMER, assigned_at. phone lưu ở users; email_verified_at NULL, must_change_password false. Không nhận role từ client. Cấp cookie theo hợp đồng hiện có; nếu sau này yêu cầu xác minh trước đăng nhập thì phải giải quyết Q-10.

### `POST /auth/login`

Đối chiếu Argon2id, chỉ User ACTIVE; lỗi sai tài khoản chung, không lộ email tồn tại. Rate limit đăng nhập sai 10 lần/phút/IP. Trả cờ must_change_password; tài khoản có cờ phải đổi mật khẩu trước thao tác nghiệp vụ.

### `POST /auth/logout`

Xóa auth_token cookie đúng Path, Max-Age=0. Trả `200 OK` với JSON `{"success": true, "data": {"message": "Đăng xuất thành công"}}`; không cam kết thu hồi JWT ở nơi khác nếu chưa có cơ chế tương ứng.

### `GET /auth/me`

Lấy User/Profile/roles và phân công hợp lệ từ database. Không tin role hoặc scope client tự khai.

### `GET /users/me/profile`

Profile có thể NULL; phone lấy từ User, không thêm cột vào user_profiles.

### `PATCH /users/me/profile`

Payload tổng hợp: phone ghi users.phone; các field hồ sơ ghi user_profiles. Transaction khi sửa cả hai bảng; không cho sửa user_id/email_verified_at/roles qua endpoint này. phone theo định dạng Việt Nam hiện có; ngày YYYY-MM-DD; avatar_url là URL. Danh mục gender hoàn thiện ở Q-11.

### `POST /auth/change-password`

Kiểm tra mật khẩu cũ, băm mật khẩu mới theo cùng policy đăng ký; cập nhật password_hash và must_change_password=false. Không trả mật khẩu/hash.

### `GET /gyms`

Chỉ dữ liệu Gym công khai ACTIVE; phân trang/tìm theo gym_name và address.

### `GET /gyms/:gymId`

Tìm bằng gym_id; không tiết lộ dữ liệu riêng tư của nhân sự/hội viên.

### `POST /gyms`

Admin tạo cơ sở; trạng thái dự kiến ACTIVE. Không có Manager tự động nếu chưa thực hiện provisioning/assignment.

### `PATCH /gyms/:gymId`

Cập nhật thông tin Gym, giữ định danh; không cho chuyển scope của tài nguyên.

### `PATCH /gyms/:gymId/status`

Giá trị dự kiến ACTIVE/INACTIVE; tác động tới hợp đồng/lịch đang có cần chốt trước triển khai.

### `POST /admin/managers/provision`

Transaction tạo User, Profile, role MANAGER, gym_managers của Gym đã tồn tại; must_change_password=true. Giữ INV-010; không tự thu hồi Manager khác. Cách giao mật khẩu tạm qua kênh được duyệt, không log/hash trong response.

### `GET /gyms/:gymId/managers`

Danh sách phân công hiện lưu, không gọi là nhật ký đầy đủ mọi lần bổ nhiệm vì cặp Gym/User duy nhất.

### `POST /gyms/:gymId/managers/assign`

User có role MANAGER; không trùng cặp, không vượt INV-010. Chặn nếu Gym/User đã có phân công ACTIVE xung đột; không tự revoke. Tái bổ nhiệm cùng cặp chờ Q-12.

### `POST /gyms/:gymId/managers/:managerId/revoke`

managerId là gym_manager_id thuộc route Gym; ACTIVE → INACTIVE, không xóa phân công.

### `GET /gyms/:gymId/trainers`

Chỉ PT ACTIVE tại Gym công khai; User/profile được chiếu trường công khai, không trả email/phone đăng nhập mặc định.

### `GET /gyms/:gymId/trainers/:trainerId`

trainerId là gym_trainer_id; trả specialization, experience_years, bio và thông tin hiển thị công khai.

### `POST /gyms/:gymId/trainers`

User có role PT, cặp Gym/User duy nhất, ghi joined_at; không tự tạo role quản trị từ request. Trường hợp phân công PT đa Gym phụ thuộc Q-08.

### `PATCH /gyms/:gymId/trainers/:trainerId/status`

ACTIVE/INACTIVE; xử lý các lịch đang có trước khi ngừng phân công theo policy sẽ chốt.

### `POST /gyms/:gymId/trainers/provision`

DRAFT: tạo User/Profile/role PT/phân công trong transaction, mật khẩu tạm có must_change_password=true. Quyền cấp và cách giao mật khẩu cần Q-10.

### `GET /gyms/:gymId/packages`

Package ACTIVE thuộc Gym route.

### `GET /gyms/:gymId/packages/:packageId`

packageId là package_id; không có field hạn mức buổi PT.

### `POST /gyms/:gymId/packages`

duration_days > 0, price >= 0; Gym lấy từ route đã xác thực. Chốt precision tiền/defaults ở Q-11.

### `PATCH /gyms/:gymId/packages/:packageId`

Không đổi gym_id; giá mới không ghi đè memberships.purchase_price hoặc Payment lịch sử.

### `PATCH /gyms/:gymId/packages/:packageId/deactivate`

Chuyển INACTIVE, không hủy các Membership đã mua.

### `PATCH /gyms/:gymId/packages/:packageId/activate`

Chuyển ACTIVE trong Gym được quản lý.

### `POST /gyms/:gymId/payments`

DRAFT phần tích hợp: Backend lấy user_id từ phiên và kiểm tra Package cùng Gym, tự xác định amount; tạo PENDING. Không nhận amount/payment_status/paid_at từ Customer. Cơ chế khóa giá theo Q-01.

### `GET /payments/me`

Chỉ payments.user_id = auth.user_id; không mở danh sách thanh toán toàn Gym cho Customer.

### `GET /payments/:paymentId`

Không cho suy đoán Payment của User khác. Trả payment_status; frontend không tự xác nhận thanh toán.

### `GET /memberships/me`

Lọc user_id; trả purchase_price/payment_id, không thay bằng giá Package mới.

### `GET /gyms/:gymId/memberships`

Lọc trực tiếp gym_id; không mở CRUD tạo thẻ bỏ qua Payment.

### `GET /memberships/:membershipId`

Xác định scope từ bản ghi, không chỉ từ route; payment_id có thể NULL.

### `POST /gyms/:gymId/pt-registrations`

Membership và Gym Trainer cùng Gym route; Customer phải sở hữu Membership; Manager kiểm tra hội viên trong Gym. PT ACTIVE. Không nhận customer_id/gym_id trong body, không có quota.

### `GET /pt-registrations/me`

Customer lọc qua Membership.user_id, PT qua Gym Trainer.user_id; kết quả chỉ các phân công hợp lệ.

### `GET /gyms/:gymId/pt-registrations`

JOIN Membership để xác định Gym; đối chiếu Gym Trainer cùng Gym.

### `PATCH /gyms/:gymId/pt-registrations/:registrationId/assign`

DRAFT: kiểm tra cùng Gym; không tự cascade chuyển lịch quá khứ hoặc hủy lịch tương lai.

### `PATCH /gyms/:gymId/pt-registrations/:registrationId/cancel`

DRAFT: chuyển CANCELLED sau khi chốt xử lý lịch liên quan; không tự hủy dây chuyền.

### `POST /gyms/:gymId/pt-appointments`

Truy Registration → Membership/Gym Trainer để kiểm tra Customer/PT/Gym; end_time > start_time, start_time > now. Chống trùng hai phía và race condition theo quyết định Q-06/Q-11. Không nhận ID Customer/PT riêng.

### `GET /pt-appointments/me`

Lọc qua Registration và ownership/phân công, không truy customer_id/trainer_id trực tiếp trên Appointment.

### `GET /gyms/:gymId/pt-appointments`

Lọc qua Registration → Membership.gym_id; phạm vi thời gian theo from/to.

### `PATCH /gyms/:gymId/pt-appointments/:appointmentId/reschedule`

DRAFT: kiểm tra lại scope, trạng thái, hạn dời và trùng lịch như khi tạo; không đổi registration_id.

### `PATCH /gyms/:gymId/pt-appointments/:appointmentId/cancel`

DRAFT: trạng thái đích CANCELLED; hạn hủy và nguồn trạng thái chờ Q-06.

### `PATCH /gyms/:gymId/pt-appointments/:appointmentId/complete`

DRAFT: đích COMPLETED; không tăng bộ đếm buổi không tồn tại hoặc tự hoàn tất Registration. Chống thực thi lặp sau khi chốt lifecycle.

### `PATCH /gyms/:gymId/pt-appointments/:appointmentId/confirm`

DRAFT: thể hiện nhãn CONFIRMED của ERD, không mặc định PT/Manager/Customer nào được xác nhận.

### `GET /equipment-types`

Danh mục dùng chung; không gắn gym_id. Không mở quyền ghi hoặc tạo endpoint CRUD loại thiết bị khi Q-09 chưa chốt.

### `GET /gyms/:gymId/equipments`

Manager xem đầy đủ máy trong Gym; Customer chỉ dữ liệu chọn máy (equipment_id, gym_id, equipment_type_id, equipment_code). Eligibility Customer và lọc trạng thái máy chờ Q-09.

### `POST /gyms/:gymId/equipments`

Loại thiết bị tồn tại; cặp gym_id/equipment_code duy nhất; Gym từ route đã kiểm tra.

### `PATCH /gyms/:gymId/equipments/:equipmentId`

Không nhận gym_id để chuyển Gym. condition tách status; xung đột mã máy trả 409. Chính sách ngừng dùng khi đang có report chờ Q-09.

### `POST /gyms/:gymId/reports`

Lấy user_id từ phiên; EQUIPMENT phải chọn thiết bị cùng Gym; loại khác equipment_id có thể NULL nhưng nếu có vẫn cùng Gym. Tạo PENDING, kết quả xử lý NULL; tối đa một ảnh. Không nhận resolved_by/status.

### `GET /reports/me`

Chỉ user_id chính chủ, hiển thị kết quả giải quyết nếu có.

### `GET /gyms/:gymId/reports`

Lọc Gym/status/report_type/equipment_id; không hiển thị báo cáo Gym khác.

### `PATCH /gyms/:gymId/reports/:reportId/investigate`

PENDING → IN_PROGRESS; giữ route investigate hiện có nhưng payload dùng trạng thái mới.

### `PATCH /gyms/:gymId/reports/:reportId/resolve`

IN_PROGRESS → RESOLVED; Backend gán resolved_by=auth.user_id, resolved_at=now, lưu resolution_note trong một cập nhật nguyên tử. Không tự chuyển condition máy sang GOOD.

### `PATCH /gyms/:gymId/reports/:reportId/reject`

DRAFT: trạng thái REJECTED; điều kiện từ chối và metadata cần chốt, không tự dùng resolved_at như đã giải quyết.

### `GET /admin/users`

Không trả password_hash, không log dữ liệu xác thực.

### `PATCH /admin/users/:userId/status`

ACTIVE/INACTIVE/SUSPENDED; tài khoản không ACTIVE bị từ chối nghiệp vụ, kể cả JWT còn hạn.

### `GET /admin/roles`

Trả role_id, role_name, description; không tự thêm role thứ năm.

### `GET /admin/gyms`

Danh sách tất cả Gym theo filter status, gồm ACTIVE và INACTIVE; không thay đổi projection/scope của GET /gyms công khai.

### `GET /gyms/:gymId/management/trainers`

Danh sách phân công PT trong Gym, lọc ACTIVE/INACTIVE; không mở dữ liệu này qua endpoint public. Chỉ User thuộc scope được trả thông tin cần thiết, không trả password_hash.

### `GET /gyms/:gymId/management/packages`

Danh sách gói của Gym, gồm ACTIVE/INACTIVE, phân trang/lọc trạng thái; public list vẫn chỉ gói được công khai.

## 8. Payment → Membership và các action chưa mở

FEAT-PAY-003 là xử lý kết quả thanh toán đáng tin cậy ở server: kiểm tra nguồn, Payment/User/Gym/Package, amount và transaction_code; đánh dấu SUCCESS và tạo tối đa một Membership trong transaction hoặc cơ chế nhất quán được duyệt. Retry/kết quả lặp không sinh thẻ lần hai. Không đưa endpoint để Customer tự PATCH SUCCESS.

Hợp đồng gateway/webhook/internal callback (URL, chữ ký, retry, danh sách trạng thái chuyển được) **chưa chốt Q-01**; không giả định đã có route. FEAT-MEM-001 là kết quả tạo Membership từ Payment, không còn POST Membership tự phục vụ bỏ qua thanh toán. Q-02 quyết định trạng thái/ngày thẻ và refund; Q-03 quyết định trường hợp payment_id NULL. Không tự mở API refund/cấp thẻ thủ công.

Các action cũ suspend/terminate/no-show và activation tại quầy không thuộc catalog thực thi hiện tại: trạng thái/lifecycle tương ứng không còn trong ERD hoặc chưa có policy thay thế. FEAT-MEM-005/006/007 và FEAT-APP-007 được ghi chờ review trong Feature Spec; không ánh xạ tự động sang CANCELLED/INACTIVE. API đổi PT giữ tên action assign, body chuẩn hóa gym_trainer_id; xử lý lịch cũ chờ Q-07.

## 9. Phân trang, lọc, tìm kiếm và sắp xếp

Giữ page (mặc định 1), pageSize (mặc định 20, tối đa 100); totalItems/totalPages/hasNextPage/hasPreviousPage theo §3. Tham số search, sortBy, sortOrder (asc/desc) phải allowlist theo resource, không đưa trực tiếp vào SQL. Mặc định created_at desc cho bảng có cột này; roles theo role_name, user_roles theo assigned_at nếu cần đọc projection.

Filter status theo Database §11, riêng Payment dùng payment_status; report thêm report_type/equipment_id. Lịch dùng from/to timestamp với from < to. Các filter không được mở rộng scope của User. Không dùng phân trang để tính tổng quota, dashboard hoặc tổng số lịch toàn bộ.

## 10. Mã lỗi và bảo mật

| HTTP / Code | Ý nghĩa |
| :--- | :--- |
| 400 VALIDATION_ERROR | Field/kiểu/allowlist không hợp lệ |
| 401 AUTH_INVALID_CREDENTIALS | Sai thông tin đăng nhập, thông báo chung |
| 401 AUTH_REQUIRED | Thiếu hoặc sai phiên |
| 403 AUTH_ACCOUNT_SUSPENDED | Khi kiểm tra phiên hợp lệ, User không ACTIVE (INACTIVE hoặc SUSPENDED) |
| 403 PASSWORD_CHANGE_REQUIRED | Cần đổi mật khẩu tạm trước nghiệp vụ |
| 403 INSUFFICIENT_ROLE / GYM_SCOPE_FORBIDDEN | Không có role hoặc phân công Gym hợp lệ |
| 403 RESOURCE_OWNERSHIP_FORBIDDEN | Không sở hữu tài nguyên; có thể dùng 404 để che tồn tại |
| 404 NOT_FOUND | Không tìm thấy trong scope được cấp |
| 409 EMAIL_ALREADY_EXISTS / ASSIGNMENT_ALREADY_EXISTS / EQUIPMENT_CODE_EXISTS | Trùng email, cặp phân công hoặc mã máy |
| 409 USER_ALREADY_ACTIVE_MANAGER / GYM_ALREADY_HAS_ACTIVE_MANAGER | Vi phạm giới hạn phân công Manager ACTIVE |
| 409 INVALID_STATUS_TRANSITION | Chuyển trạng thái trái policy đã duyệt |
| 409 APPOINTMENT_OVERLAP | Trùng lịch theo policy Q-06 sau khi chốt |
| 422 CROSS_GYM_REFERENCE | Package/Payment/Membership/Trainer/Equipment khác Gym |
| 422 INVALID_TIME_RANGE | Thời gian lịch hẹn không hợp lệ |
| 500 INTERNAL_SERVER_ERROR | Lỗi nội bộ, không lộ SQL/stack trace |

Không coi DRAFT là endpoint production trả lỗi giả. Chưa triển khai route phụ thuộc trước khi chốt contract. Không trả password_hash/token nội bộ; không log credential; dùng HTTPS production, CORS allowlist, kiểm soát CSRF cho cookie writes và validation Zod ở Backend.

## 11. Transaction và kiểm thử hợp đồng

- Register/provision: User + Profile + User Role + phân công (nếu có) nguyên tử; không còn PK id ở user_roles.
- Payment SUCCESS + Membership: chống xử lý lặp và hai request đồng thời, giữ giá lịch sử; nguồn xác nhận theo Q-01.
- Gán Manager: chống vượt giới hạn ACTIVE khi hai Admin thao tác; cơ chế cụ thể theo Q-11.
- Appointment: kiểm tra scope và trùng lịch an toàn khi đồng thời, không dựa vào kiểm tra trước INSERT đơn thuần hoặc constraint cũ trên cột đã bỏ.
- Report resolve: status + người xử lý + thời điểm + ghi chú cùng cập nhật; không cho client mạo danh resolved_by.
- Integration tests: 401/403/404, IDOR, Gym A/B, allowlist field, nullable Payment/Equipment, giá lịch sử, retry và concurrency. API examples/DTO không chứa field ngoài Database Spec trừ projection được khai báo.

## 12. Câu hỏi mở và phụ thuộc

Tham chiếu duy nhất [DOMAIN_RULES.md §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn), Q-01–Q-13. Những route/phần hành vi có mã Q trong catalog là hợp đồng dự kiến chờ hoàn thiện; không công bố sẵn sàng triển khai hoặc bổ sung route ngoài scope để tự giải quyết.

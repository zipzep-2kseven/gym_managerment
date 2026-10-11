# Multi-Gym Platform — REST API Specification

## 1. Phạm vi và mức độ hoàn thiện hợp đồng

Đồng bộ với ERD 21 bảng tại [DATABASE_SPEC.md](DATABASE_SPEC.md) và nghiệp vụ [DOMAIN_RULES.md](DOMAIN_RULES.md). Giữ REST `/api/v1`, Express/TypeScript, Zod, Drizzle/PostgreSQL, JWT qua cookie. Không tạo CRUD máy móc cho mọi bảng.

Catalog dưới đây mô tả hợp đồng mục tiêu, không khẳng định endpoint đã được triển khai. Các hàng có mã Q là **DRAFT phần phụ thuộc** và chưa được triển khai hành vi đó trước khi chốt Q tại Domain §9. Các thao tác không bị chặn vẫn cần schema/constraints phù hợp trước khi chạy. Giá trị status tham chiếu Database §7; baseline vật lý là VARCHAR + CHECK. Auth/User và nhóm Gym/PT của GYM-02 đã hoạt động; PKG-01 triển khai 7 endpoint Package tại §20. Review/Consultation và các nhóm còn lại vẫn là contract mục tiêu nếu chưa có ghi nhận triển khai riêng.

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
- must_change_password=true: cho phép đọc phiên, đổi mật khẩu, logout; chặn thao tác nghiệp vụ khác với 403 PASSWORD_CHANGE_REQUIRED. Q-10 đã chốt: không thêm email verification gate; backend sinh mật khẩu tạm và trả một lần qua response provisioning khi chưa có delivery service.
- Timestamp trả ISO 8601 có timezone, ngày trả YYYY-MM-DD, giờ hoạt động là giờ địa phương theo policy được chốt. IDs dùng UUID; tiền trong DB là numeric(14,2); DTO tiền truyền decimal string, không ép JavaScript floating point, không tính tiền từ số client tùy ý.

### 5.1. Projection và response DTO

| DTO | Field / ý nghĩa |
| :--- | :--- |
| UserSession | user_id, email, phone, email_verified_at, must_change_password, status, created_at, updated_at; profile (UserProfile hoặc NULL), roles (mảng role_name), active_gym_assignments |
| active_gym_assignments | Mảng projection của gym_managers/gym_trainers: assignment_type (MANAGER/PT), gym_id, gym_manager_id hoặc gym_trainer_id tương ứng. Đây là DTO tính từ quan hệ, không phải cột/bảng mới. |
| UserProfile | profile_id, user_id, full_name, date_of_birth, gender, address, avatar_url, created_at, updated_at |
| UserProfileView | {phone, profile}; phone từ users, profile là UserProfile hoặc NULL |
| UserAdminView | user_id, email, phone, email_verified_at, must_change_password, status, created_at, updated_at; roles và profile theo projection được cấp quyền |
| TrainerPublicView | gym_trainer_id, gym_id, specialization, experience_years, bio, status, availability, joined_at; social_links: PtSocialLinkView[], working_schedules: PtWorkingScheduleView[] (chỉ ACTIVE); profile công khai chỉ full_name, avatar_url |
| EquipmentView | Manager/Admin: equipments; Customer chọn máy: equipment_id, gym_id, equipment_type_id, equipment_code |
| MembershipView | Các cột memberships + gym: {gym_id, gym_name}, package: {package_id, package_name}; giá hiển thị vẫn là purchase_price, không phải Package.price hiện tại |
| RegistrationView | Các cột pt_registrations + membership: {membership_id, user_id, gym_id, package_id, start_date, end_date, status}, customer: {user_id, full_name, avatar_url}, trainer: {gym_trainer_id, user_id, gym_id, full_name, avatar_url}, gym: {gym_id, gym_name} |
| AppointmentView | Các cột pt_appointments + registration: RegistrationView, chỉ cho tài nguyên thuộc scope/ownership của request |
| ManagerProvisionResult / TrainerProvisionResult | {user: UserSession, assignment: gym_managers hoặc gym_trainers, temporary_password: string}; temporary_password chỉ có trong response tạo thành công cho actor có quyền khi chưa có delivery service. Không lưu/log plaintext, không trả hash, không có API đọc lại; UserSession không chứa credential |

Các projection quan hệ được Backend JOIN trong cùng scope; full_name/avatar_url có thể NULL khi chưa có Profile. Không cho PT truy cập danh sách Membership toàn Gym để tự ghép tên học viên. Projection không thêm cột/bảng. DTO có tên bảng trong catalog dùng các cột đúng Database Spec dưới đây, được giới hạn bởi scope/role. Các field bổ sung như roles/profile là projection được khai báo ở trên, không tạo thêm schema.

| Resource | Field |
| :--- | :--- |
| roles | `role_id`, `role_name`, `description` |
| gyms | `gym_id`, `gym_name`, `description`, `phone`, `email`, `address`, `latitude`, `longitude`, `logo_url`, `opening_time`, `closing_time`, `status`, `created_at`, `updated_at` |
| gym_managers | `gym_manager_id`, `gym_id`, `user_id`, `assigned_at`, `status`, `created_at`, `updated_at` |
| gym_trainers | `gym_trainer_id`, `gym_id`, `user_id`, `specialization`, `experience_years`, `bio`, `status`, `availability`, `joined_at`, `created_at`, `updated_at` |
| packages | `package_id`, `gym_id`, `package_name`, `description`, `duration_days`, `price`, `status`, `created_at`, `updated_at` |
| payments | `payment_id`, `user_id`, `gym_id`, `package_id`, `amount`, `payment_method`, `transaction_code`, `payment_status`, `paid_at`, `created_at`, `updated_at` |
| memberships | `membership_id`, `user_id`, `gym_id`, `package_id`, `payment_id`, `start_date`, `end_date`, `purchase_price`, `status`, `created_at`, `updated_at` |
| pt_registrations | `registration_id`, `membership_id`, `gym_trainer_id`, `registered_at`, `status`, `note`, `created_at`, `updated_at` |
| pt_appointments | `appointment_id`, `registration_id`, `start_time`, `end_time`, `status`, `note`, `created_at`, `updated_at` |
| equipment_types | `equipment_type_id`, `name`, `description`, `created_at`, `updated_at` |
| equipments | `equipment_id`, `gym_id`, `equipment_type_id`, `equipment_code`, `purchase_date`, `condition`, `status`, `created_at`, `updated_at` |
| gym_reports | `report_id`, `user_id`, `gym_id`, `equipment_id`, `report_type`, `title`, `content`, `image_url`, `status`, `resolved_by`, `resolved_at`, `resolution_note`, `created_at`, `updated_at` |

### 5.2. Quy ước ghi dữ liệu

`?` trong catalog là field tùy chọn của request, không quyết định nullable vật lý. PATCH cần ít nhất một field được cho phép. Không nhận PK, timestamps, role hay scope ngoài allowlist; gym_id từ route được xác thực. Kiểu/nullability/allowlist vật lý lấy Database Spec; lifecycle và quyền chưa chốt theo Domain §9. DTO public không được trả thẳng ORM row có dữ liệu riêng tư.

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
| FEAT-GYM-005 | `PATCH /gyms/:gymId/status` | Admin | status | gyms | Q-13 Gym đã chốt |
| FEAT-MGR-001 | `POST /admin/managers/provision` | Admin | gym_id, email, full_name; phone? | ManagerProvisionResult | Q-10 đã chốt |
| FEAT-MGR-002 | `GET /gyms/:gymId/managers` | Admin, Manager đúng Gym | — | gym_managers[] | — |
| FEAT-MGR-003 | `POST /gyms/:gymId/managers/assign` | Admin | user_id | gym_managers | Q-12 đã chốt |
| FEAT-MGR-004 | `POST /gyms/:gymId/managers/:managerId/revoke` | Admin | — | gym_managers | — |
| FEAT-TRN-001 | `GET /gyms/:gymId/trainers` | Public | — | TrainerPublicView[] | — |
| FEAT-TRN-002 | `GET /gyms/:gymId/trainers/:trainerId` | Public | — | TrainerPublicView | — |
| FEAT-TRN-003 | `POST /gyms/:gymId/trainers` | Admin, Manager đúng Gym | user_id; specialization?, experience_years?, bio? | gym_trainers | Q-08 PT đã chốt |
| FEAT-TRN-004 | `PATCH /gyms/:gymId/trainers/:trainerId/status` | Admin, Manager đúng Gym | status | gym_trainers | Q-13 PT đã chốt |
| FEAT-TRN-005 | `POST /gyms/:gymId/trainers/provision` | Admin, Manager có role và assignment ACTIVE đúng Gym | email, full_name; phone?, specialization?, experience_years?, bio? | TrainerProvisionResult | Q-10 đã chốt |
| FEAT-PKG-001 | `GET /gyms/:gymId/packages` | Public | — | packages[] | — |
| FEAT-PKG-002 | `GET /gyms/:gymId/packages/:packageId` | Public | — | packages | — |
| FEAT-PKG-003 | `POST /gyms/:gymId/packages` | Admin, Manager đúng Gym | package_name, duration_days, price; description? | packages | — |
| FEAT-PKG-004 | `PATCH /gyms/:gymId/packages/:packageId` | Admin, Manager đúng Gym | package_name?, duration_days?, price?, description? | packages | — |
| FEAT-PKG-005 | `PATCH /gyms/:gymId/packages/:packageId/deactivate` | Admin, Manager đúng Gym | — | packages | — |
| FEAT-PKG-006 | `PATCH /gyms/:gymId/packages/:packageId/activate` | Admin, Manager đúng Gym | — | packages | — |
| FEAT-PAY-001 | `POST /gyms/:gymId/payments` | Customer | package_id, payment_method | payments | Q-01, Q-02, Q-17 |
| FEAT-PAY-002 | `GET /payments/me` | Customer | — | payments[] | — |
| FEAT-PAY-002 | `GET /payments/:paymentId` | Customer, chính chủ | — | payments | — |
| FEAT-MEM-002 | `GET /memberships/me` | Customer | — | MembershipView[] | — |
| FEAT-MEM-003 | `GET /gyms/:gymId/memberships` | Admin, Manager đúng Gym | — | MembershipView[] | — |
| FEAT-MEM-004 | `GET /memberships/:membershipId` | Customer chính chủ; Admin, Manager đúng Gym | — | MembershipView | — |
| FEAT-PTR-001 | `POST /gyms/:gymId/pt-registrations` | Customer chính chủ; Manager đúng Gym | membership_id, gym_trainer_id; note? | RegistrationView | Q-04, Q-16 |
| FEAT-PTR-002 | `GET /pt-registrations/me` | Customer, PT | — | RegistrationView[] | — |
| FEAT-PTR-003 | `GET /gyms/:gymId/pt-registrations` | Admin, Manager đúng Gym | — | RegistrationView[] | — |
| FEAT-PTR-004 | `PATCH /gyms/:gymId/pt-registrations/:registrationId/assign` | Admin, Manager đúng Gym | gym_trainer_id | RegistrationView | Q-07 |
| FEAT-PTR-005 | `PATCH /gyms/:gymId/pt-registrations/:registrationId/cancel` | Admin, Manager đúng Gym | note? | RegistrationView | Q-13 |
| FEAT-APP-001 | `POST /gyms/:gymId/pt-appointments` | Customer chính chủ, PT phụ trách, Manager đúng Gym | registration_id, start_time, end_time; note? | AppointmentView | Q-04, Q-06 |
| FEAT-APP-002 | `GET /pt-appointments/me` | Customer, PT | — | AppointmentView[] | — |
| FEAT-APP-003 | `GET /gyms/:gymId/pt-appointments` | Admin, Manager đúng Gym | — | AppointmentView[] | — |
| FEAT-APP-004 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/reschedule` | Customer chính chủ, PT phụ trách, Manager đúng Gym | start_time, end_time; note? | AppointmentView | Q-06 |
| FEAT-APP-005 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/cancel` | Customer chính chủ, PT phụ trách, Manager đúng Gym | note? | AppointmentView | Q-06 |
| FEAT-APP-006 | `PATCH /gyms/:gymId/pt-appointments/:appointmentId/complete` | PT phụ trách, Manager đúng Gym | note? | AppointmentView | Q-06 |
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
| FEAT-ADM-001 | `GET /admin/users` | Admin | search, role, status, page, pageSize | {items:UserAdminView[],page,page_size,total} | §30 |
| FEAT-ADM-002 | `PATCH /admin/users/:userId/status` | Admin | status, expected_updated_at | UserAdminView | §30 |
| FEAT-ADM-003 | `GET /admin/roles` | Admin | — | roles[] | — |
| FEAT-GYM-006 | `GET /admin/gyms` | Admin | — | gyms[] | — |
| FEAT-TRN-006 | `GET /gyms/:gymId/management/trainers` | Admin, Manager đúng Gym | — | gym_trainers[] | — |
| FEAT-PKG-007 | `GET /gyms/:gymId/management/packages` | Admin, Manager đúng Gym | — | packages[] | — |

## 7. Quy tắc xử lý theo endpoint

### `POST /auth/register`

Chuẩn hóa email trim/lowercase, mật khẩu 8–128 ký tự có chữ hoa và số; full_name 2–100. Transaction tạo User ACTIVE, Profile và role CUSTOMER, assigned_at. phone lưu ở users; email_verified_at NULL, must_change_password false. Không nhận role từ client. Cấp cookie theo hợp đồng hiện có; Q-10 đã chốt không thêm email verification gate; yêu cầu riêng sau này cần quyết định riêng.

### `POST /auth/login`

Đối chiếu Argon2id, chỉ User ACTIVE; lỗi sai tài khoản chung, không lộ email tồn tại. Rate limit đăng nhập sai 10 lần/phút/IP. Trả cờ must_change_password; tài khoản có cờ phải đổi mật khẩu trước thao tác nghiệp vụ.

### `POST /auth/logout`

Xóa auth_token cookie đúng Path, Max-Age=0. Trả `200 OK` với JSON `{"success": true, "data": {"message": "Đăng xuất thành công"}}`; không cam kết thu hồi JWT ở nơi khác nếu chưa có cơ chế tương ứng.

### `GET /auth/me`

Lấy User/Profile/roles và phân công hợp lệ từ database. Không tin role hoặc scope client tự khai.

### `GET /users/me/profile`

Profile có thể NULL; phone lấy từ User, không thêm cột vào user_profiles.

### `PATCH /users/me/profile`

Payload tổng hợp: phone ghi users.phone; các field hồ sơ ghi user_profiles. Transaction khi sửa cả hai bảng; không cho sửa user_id/email_verified_at/roles qua endpoint này. phone theo định dạng Việt Nam hiện có; ngày YYYY-MM-DD; avatar_url là URL. gender hiện là text nullable; không tự ép danh mục enum chưa có trong schema.

### `POST /auth/change-password`

Kiểm tra mật khẩu cũ, băm mật khẩu mới theo cùng policy đăng ký; cập nhật password_hash và must_change_password=false. Không trả mật khẩu/hash.

### `GET /gyms`

Chỉ dữ liệu Gym công khai ACTIVE; phân trang/tìm theo gym_name và address.

### `GET /gyms/:gymId`

Tìm bằng gym_id; không tiết lộ dữ liệu riêng tư của nhân sự/hội viên.

### `POST /gyms`

Admin tạo cơ sở; status mặc định ACTIVE theo schema. Không có Manager tự động nếu chưa thực hiện provisioning/assignment.

### `PATCH /gyms/:gymId`

Cập nhật thông tin Gym, giữ định danh; không cho chuyển scope của tài nguyên.

### `PATCH /gyms/:gymId/status`

Admin đổi ACTIVE/INACTIVE theo Domain §10; trả 409 GYM_HAS_OPEN_OBLIGATIONS kèm counts nếu còn nghĩa vụ mở. Không cascade, không force. Contract cụ thể tại §15.

### `POST /admin/managers/provision`

Transaction tạo User, Profile, role MANAGER, gym_managers của Gym đã tồn tại; must_change_password=true. Giữ INV-010; không tự thu hồi Manager khác. Backend sinh mật khẩu tạm và chỉ lưu hash. Khi chưa có delivery service, trả temporary_password một lần cho Admin bàn giao; không log/lưu plaintext hoặc có API đọc lại.

### `GET /gyms/:gymId/managers`

Danh sách phân công hiện lưu, không gọi là nhật ký đầy đủ mọi lần bổ nhiệm vì cặp Gym/User duy nhất.

### `POST /gyms/:gymId/managers/assign`

User có role MANAGER; không trùng cặp, không vượt INV-010. Chặn nếu Gym/User đã có phân công ACTIVE xung đột; không tự revoke. Tái bổ nhiệm cùng cặp dùng lại bản ghi INACTIVE → ACTIVE, giữ ID/created_at và cập nhật assigned_at lần ACTIVE gần nhất. Cặp đã ACTIVE trả 409 ASSIGNMENT_ALREADY_EXISTS.

### `POST /gyms/:gymId/managers/:managerId/revoke`

managerId là gym_manager_id thuộc route Gym; ACTIVE → INACTIVE, không xóa phân công.

### `GET /gyms/:gymId/trainers`

Chỉ PT ACTIVE tại Gym công khai; User/profile được chiếu trường công khai, không trả email/phone đăng nhập mặc định.

### `GET /gyms/:gymId/trainers/:trainerId`

trainerId là gym_trainer_id; trả specialization, experience_years, bio và thông tin hiển thị công khai.

### `POST /gyms/:gymId/trainers`

User ACTIVE có role PT, Gym ACTIVE; tối đa một assignment PT ACTIVE toàn hệ thống theo Q-08. Không tự revoke/cấp role. Cặp đã có trả 409 ASSIGNMENT_ALREADY_EXISTS; kích hoạt lại bằng API status, giữ row cũ.

### `PATCH /gyms/:gymId/trainers/:trainerId/status`

Admin/Manager ACTIVE đúng Gym đổi ACTIVE/INACTIVE theo Domain §10; trả 409 TRAINER_HAS_OPEN_OBLIGATIONS khi còn đăng ký/lịch mở. Kích hoạt lại kiểm tra Gym/User/role PT và giới hạn Q-08, không thay availability. Contract tại §15.

### `POST /gyms/:gymId/trainers/provision`

Tạo User/Profile/role PT/phân công trong transaction; backend sinh mật khẩu tạm, must_change_password=true. Admin hoặc Manager có role và assignment ACTIVE đúng Gym được thực hiện. Khi chưa có delivery service, response trả temporary_password một lần; không log/lưu plaintext hoặc có API đọc lại. Không yêu cầu email verification.

### `GET /gyms/:gymId/packages`

Package ACTIVE thuộc Gym route.

### `GET /gyms/:gymId/packages/:packageId`

packageId là package_id; không có field hạn mức buổi PT.

### `POST /gyms/:gymId/packages`

duration_days > 0, price >= 0; Gym lấy từ route đã xác thực. price dùng numeric(14,2), status mặc định ACTIVE theo Database Spec.

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

Sau khi trao đổi/thống nhất, Membership và Gym Trainer cùng Gym route; Customer phải sở hữu Membership; Manager kiểm tra hội viên trong Gym. PT ACTIVE. Không nhận customer_id/gym_id trong body, không có quota.

### `GET /pt-registrations/me`

Customer lọc qua Membership.user_id, PT qua Gym Trainer.user_id; kết quả chỉ các phân công hợp lệ.

### `GET /gyms/:gymId/pt-registrations`

JOIN Membership để xác định Gym; đối chiếu Gym Trainer cùng Gym.

### `PATCH /gyms/:gymId/pt-registrations/:registrationId/assign`

DRAFT: kiểm tra cùng Gym; không tự cascade chuyển lịch quá khứ hoặc hủy lịch tương lai.

### `PATCH /gyms/:gymId/pt-registrations/:registrationId/cancel`

DRAFT: chuyển CANCELLED sau khi chốt xử lý lịch liên quan; không tự hủy dây chuyền.

### `POST /gyms/:gymId/pt-appointments`

Truy Registration → Membership/Gym Trainer để kiểm tra Customer/PT/Gym; end_time > start_time, start_time > now. Chống trùng hai phía và race condition theo quyết định Q-06. Không nhận ID Customer/PT riêng.

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

Đã triển khai list/search/filter/pagination và safe projection; contract chính thức tại §30. Không trả password_hash, không log dữ liệu xác thực.

### `PATCH /admin/users/:userId/status`

ACTIVE/INACTIVE/SUSPENDED và expected_updated_at; bảo vệ mọi Admin, không cascade nghĩa vụ. Contract chính thức tại §30; tài khoản không ACTIVE bị từ chối nghiệp vụ, kể cả JWT còn hạn.

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

Filter status theo Database §7, riêng Payment dùng payment_status; report thêm report_type/equipment_id. Lịch dùng from/to timestamp với from < to. Các filter không được mở rộng scope của User. Không dùng phân trang để tính tổng quota, dashboard hoặc tổng số lịch toàn bộ.

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
- Gán Manager: chống vượt giới hạn ACTIVE khi hai Admin thao tác; được bảo vệ bởi hai partial unique index; tái bổ nhiệm theo Q-12 đã chốt: reactivate bản ghi hiện tại, không thêm dòng trùng cặp.
- Appointment: kiểm tra scope và trùng lịch an toàn khi đồng thời, không dựa vào kiểm tra trước INSERT đơn thuần hoặc constraint cũ trên cột đã bỏ.
- Report resolve: status + người xử lý + thời điểm + ghi chú cùng cập nhật; không cho client mạo danh resolved_by.
- Integration tests: 401/403/404, IDOR, Gym A/B, allowlist field, nullable Payment/Equipment, giá lịch sử, retry và concurrency. API examples/DTO không chứa field ngoài Database Spec trừ projection được khai báo.

## 12. Câu hỏi mở và phụ thuộc

Tham chiếu duy nhất [DOMAIN_RULES.md §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn), Q-01–Q-19. Những route/phần hành vi có mã Q trong catalog là hợp đồng dự kiến chờ hoàn thiện; không công bố sẵn sàng triển khai hoặc bổ sung route ngoài scope để tự giải quyết.


## 13. Hợp đồng cho nghiệp vụ Gym/PT cập nhật

Các path bên dưới là thiết kế REST để triển khai trong task tiếp theo, tiền tố `/api/v1`. DRAFT chỉ chặn phần policy được ghi, không có nghĩa đã tồn tại controller/route. API public read có thể triển khai độc lập các câu hỏi về write. Không thêm endpoint PT pricing/payment/chat.

### 13.1. DTO mới và quy tắc public/private

| DTO | Field allowlist |
| :--- | :--- |
| GymImageView | image_id, gym_id, image_url, caption, display_order, created_at, updated_at |
| ConsultationReceipt | consultation_request_id, status, created_at; không trả bản ghi liên hệ đầy đủ qua public receipt |
| ConsultationManagementView | consultation_request_id, gym_id, user_id nullable, full_name, phone, email nullable, preferred_date nullable, preferred_time nullable, content nullable, status, assigned_to nullable, created_at, updated_at; chỉ người xử lý có quyền |
| PtSocialLinkView | social_link_id, gym_trainer_id, platform, url, created_at, updated_at |
| PtWorkingScheduleView | schedule_id, gym_trainer_id, day_of_week, start_time, end_time, status, created_at, updated_at |
| GymReviewPublicView | gym_review_id, gym_id, rating, comment nullable, status=VISIBLE, created_at, updated_at, author: {full_name nullable, avatar_url nullable}; không có user_id/contact/hidden_* |
| TrainerReviewPublicView | trainer_review_id, gym_trainer_id, rating, comment nullable, status=VISIBLE, created_at, updated_at, author: {full_name nullable, avatar_url nullable}; không có user_id/contact/hidden_* |
| ReviewModerationView | kind (projection gym/trainer), đúng review PK/target PK, user_id, rating, comment, status, hidden_at, hidden_by, hidden_reason, created_at, updated_at; chỉ Admin |

TrainerPublicView được mở rộng bằng social_links/working_schedules; review lấy từ endpoint riêng có phân trang. PT Profile dùng full_name/avatar_url của user_profiles; không trả email/phone tài khoản mặc định, không thêm chứng chỉ giả hoặc field PT price. Gym Detail kết hợp Gym, gallery, Package, PT và review qua các endpoint công khai; thông tin tiện ích hiện dùng description, chưa có bảng tiện ích riêng.

### 13.2. Catalog mới

| Feature | Method / Path | Actor / Scope | Body | Response data | Phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FEAT-GIM-001 | `GET /gyms/:gymId/images` | Public | — | GymImageView[] | — |
| FEAT-GIM-002 | `PUT /gyms/:gymId/images` | Manager đúng Gym; quyền khác chờ Q-19 | images: [{image_url, caption?, display_order}] | GymImageView[] | Q-10/Q-19 |
| FEAT-CON-001 | `POST /gyms/:gymId/consultation-requests` | Guest hoặc Customer | full_name, phone; email?, preferred_date?, preferred_time?, content? | ConsultationReceipt | Q-19 (validation thời gian) |
| FEAT-CON-002 | `GET /gyms/:gymId/consultation-requests` | Manager đúng Gym; Staff chờ Q-14 | — | ConsultationManagementView[] | Q-14 (Staff) |
| FEAT-CON-003 | `PATCH /gyms/:gymId/consultation-requests/:requestId` | Manager đúng Gym; Staff chờ Q-14 | status?, assigned_to? | ConsultationManagementView | Q-14/Q-19 |
| FEAT-TRN-007 | `PATCH /gyms/:gymId/trainers/:trainerId/availability` | PT chính chủ; Manager ACTIVE đúng Gym | availability | TrainerPublicView | Q-16 |
| FEAT-TRN-008 | `PUT /gyms/:gymId/trainers/:trainerId/social-links` | PT chính chủ; quyền thay mặt chờ Q-16 | links: [{platform, url}] | PtSocialLinkView[] | Q-16 |
| FEAT-TRN-009 | `PUT /gyms/:gymId/trainers/:trainerId/working-schedules` | PT chính chủ; quyền thay mặt chờ Q-18 | schedules: [{day_of_week, start_time, end_time, status}] | PtWorkingScheduleView[] | Q-18 |
| FEAT-REV-001 | `GET /gyms/:gymId/reviews` | Public | — | GymReviewPublicView[] | — |
| FEAT-REV-002 | `POST /gyms/:gymId/reviews` | Customer đủ điều kiện | rating; comment? | GymReviewPublicView | Q-15 |
| FEAT-REV-003 | `GET /gyms/:gymId/trainers/:trainerId/reviews` | Public | — | TrainerReviewPublicView[] | — |
| FEAT-REV-004 | `POST /gyms/:gymId/trainers/:trainerId/reviews` | Customer đủ điều kiện | rating; comment? | TrainerReviewPublicView | Q-15 |
| FEAT-REV-005 | `GET /admin/reviews` | Admin | — | ReviewModerationView[] | — |
| FEAT-REV-006 | `PATCH /admin/reviews/:kind/:reviewId/hide` | Admin hoạt động | hidden_reason | ReviewModerationView | — |

### 13.3. Validation, trạng thái và bảo mật

- GET gallery/review/PT chỉ cho Gym công khai, PT có phân công ACTIVE; availability NOT_ACCEPTING vẫn là thông tin profile, không đồng nghĩa INACTIVE. Review list dùng page/pageSize như §9, backend cố định status=VISIBLE cho public, bỏ filter HIDDEN do client cố gửi.
- Consultation: full_name không rỗng, tối đa 100 ký tự; phone không rỗng, tối đa 20; email tùy chọn tối đa 254 và đúng định dạng; ngày ISO, giờ HH:mm:ss. preferred_date/time độc lập nullable như schema, policy ngày quá khứ/timezone theo Q-19/Q-18. Validate content và payload limit trước triển khai; không tự thêm trường DB.
- Optional auth chỉ dùng cho Consultation public: không có cookie là Guest. Có cookie hợp lệ dùng actor server; cookie không hợp lệ trả 401 thay vì liên kết sai User. Tài khoản INACTIVE/SUSPENDED trả 403; must_change_password giữ hạn chế phiên. Không nhận danh tính hay assigned_to từ body.
- Consultation mới PENDING; các giá trị CONTACTED/COMPLETED/CANCELLED không tự xác định transition hợp lệ. Request ID không phải credential; không mở GET public chi tiết bằng ID. Quyền assignment/transition chờ Q-14/Q-19; không tự tạo notification.
- PUT social/schedule/gallery là thiết kế thay danh sách một resource thuộc một Gym/PT, phải nguyên tử; xác minh ownership mọi lần, không áp dụng cơ chế này cho review. Payload array giới hạn theo validation khi triển khai; không thay đổi liên hệ người khác.
- Review: validate rating nguyên 1–5/comment; gọi review service với actor từ phiên. Trước khi nối route, hoàn tất policy Q-15; hiện service/trigger chỉ cho Membership ACTIVE/EXPIRED đã bắt đầu, Registration ACTIVE/COMPLETED. Không nhận audit/status/user_id từ Customer.
- Hide: hidden_reason không rỗng; kiểm tra Admin hiện tại, update có điều kiện status=VISIBLE. Chỉ server đặt hidden_at/hidden_by. Không lặp hide ghi đè audit; không có PATCH nội dung hoặc DELETE review, không unhide trước quyết định mới.
- PT register: giữ membership_id + gym_trainer_id, không yêu cầu chọn PT trong Payment. Hiện service chỉ Customer chính chủ với thẻ ACTIVE trong thời hạn và PT ACTIVE cùng Gym; quyền Manager tạo thay ở catalog cũ là contract mục tiêu chưa có trong service, phải kiểm tra actor/scope khi triển khai. Q-16 quyết định chặn đăng ký theo availability; không tự suy ra rule này từ status.

### 13.4. Lỗi và kiểm thử bổ sung

| HTTP / code hiện có ở service | Ý nghĩa |
| :--- | :--- |
| 400 VALIDATION_ERROR | Rating/lý do ẩn không hợp lệ |
| 403 REVIEW_FORBIDDEN | Tài khoản không hoạt động |
| 403 REVIEW_NOT_ELIGIBLE | Thiếu quan hệ sử dụng đúng Gym/PT |
| 403 REVIEW_MODERATION_FORBIDDEN | Không phải Admin hoạt động |
| 409 REVIEW_NOT_VISIBLE | Review không tồn tại hoặc đã ẩn, không ghi đè audit |
| 403 MEMBERSHIP_REQUIRED | Không có thẻ ACTIVE chính chủ trong thời hạn |
| 400 TRAINER_GYM_MISMATCH | PT không ACTIVE cùng Gym |

Đây là mã service hiện tại, chưa phải bằng chứng HTTP route đã có; code SQLSTATE phải được ánh xạ an toàn khi nối controller. Kiểm thử Guest consultation, danh tính giả, Manager Gym A/B, public lọc HIDDEN ở server, rating ngoài khoảng, Membership sai người/Gym, PT không có Registration, hide trái quyền, hide lặp và bảo toàn nội dung/audit. Kiểm thử Working Schedule không làm đổi Appointment và checkout hoàn tất không cần PT/tư vấn.

## 14. Contract triển khai Q-10/Q-12

- POST `/admin/managers/provision`: Admin, body strict `{gym_id, email, full_name, phone?}`, 201 ManagerProvisionResult.
- POST `/gyms/:gymId/trainers/provision`: Admin hoặc Manager ACTIVE đúng Gym, body strict `{email, full_name, phone?, specialization?, experience_years?, bio?}`, 201 TrainerProvisionResult.
- POST `/gyms/:gymId/managers/assign`: Admin, body strict `{user_id}`; 200 assignment, kể cả reactivate; không nhận role/status/assigned_at từ client.
- GET `/gyms/:gymId/managers`: Admin hoặc Manager ACTIVE đúng Gym; chỉ trả assignment, không credential.
- POST `/gyms/:gymId/managers/:managerId/revoke`: Admin, body rỗng; ACTIVE → INACTIVE, không xóa. Bản ghi không thuộc route Gym trả 404; đã INACTIVE trả 409 INVALID_STATUS_TRANSITION.
- Mọi response nhóm này dùng `Cache-Control: no-store`. Provision response chứa `temporary_password` duy nhất tại thời điểm tạo; retry email đã tồn tại trả 409 EMAIL_ALREADY_EXISTS, không trả lại credential. Mất response không có API lấy lại plaintext; không tự thêm cơ chế reset/delivery.
- Role mục tiêu chưa có trong seed là lỗi cấu hình 500; không tự tạo role. User được provision ACTIVE, email_verified_at NULL, must_change_password=true theo baseline; không gate email.
- User được gán Manager phải tồn tại, ACTIVE và có role MANAGER trong DB. Thiếu user: 404 NOT_FOUND; account không ACTIVE: 403 ACCOUNT_DEACTIVATED; thiếu role: 403 INSUFFICIENT_ROLE. Không yêu cầu target đã đổi mật khẩu trước phân công; actor vẫn chịu password-change gate.
- Xung đột unique email/phone: 409 EMAIL_ALREADY_EXISTS / PHONE_ALREADY_EXISTS. Giới hạn Manager: 409 GYM_ALREADY_HAS_ACTIVE_MANAGER / USER_ALREADY_ACTIVE_MANAGER; cặp đã ACTIVE: 409 ASSIGNMENT_ALREADY_EXISTS. Transaction rollback toàn bộ khi lỗi.
- Đổi mật khẩu mới trùng hiện tại: 400 VALIDATION_ERROR, không bỏ must_change_password.
- Không có endpoint lấy credential, không nhận password/role/actorId/assignment status do client tự khai. Q-08 PT và Q-13 Gym/PT được bổ sung tại §15; upload Q-10 vẫn OPEN.


## 15. Contract Q-08 PT / Q-13 Gym và PT

- `PATCH /gyms/:gymId/status`: Admin; strict body `{status: 'ACTIVE' | 'INACTIVE'}`; 200 Gym DTO.
- `PATCH /gyms/:gymId/trainers/:trainerId/status`: Admin/Manager ACTIVE đúng Gym; strict body như trên; 200 assignment PT. trainerId là gym_trainer_id thuộc Gym route, sai Gym trả 404 NOT_FOUND.
- `POST /gyms/:gymId/trainers`: Admin/Manager ACTIVE đúng Gym; strict body `{user_id, specialization?, experience_years?, bio?}`; 201 assignment mới. User phải ACTIVE, có role PT; không tự cấp role. Cặp có sẵn trả 409 ASSIGNMENT_ALREADY_EXISTS, dùng PATCH status để kích hoạt lại.
- Trùng trạng thái hiện tại: 409 INVALID_STATUS_TRANSITION; PT ACTIVE tại Gym khác: 409 USER_ALREADY_ACTIVE_TRAINER; Gym INACTIVE chặn tạo/kích hoạt assignment: 409 GYM_INACTIVE.
- Ngừng Gym: 409 GYM_HAS_OPEN_OBLIGATIONS nếu còn nghĩa vụ; ngừng PT: 409 TRAINER_HAS_OPEN_OBLIGATIONS. `error.details` chứa số lượng `{payments, memberships, registrations, appointments}`; với PT, payments/memberships luôn 0. Đếm mọi Appointment PENDING/CONFIRMED kể cả đã quá giờ, không suy ra hoàn thành từ thời gian.
- Gym: Payment PENDING, Membership PENDING/ACTIVE, Registration ACTIVE, Appointment PENDING/CONFIRMED đều chặn. PT: Registration ACTIVE hoặc Appointment PENDING/CONFIRMED chặn độc lập.
- PT reactivation yêu cầu Gym ACTIVE, User ACTIVE và role PT hiện tại; account lỗi 403 ACCOUNT_DEACTIVATED, role thiếu 403 INSUFFICIENT_ROLE. Giữ ID/created_at/joined_at, hồ sơ, availability và mọi dữ liệu lịch sử.
- Không đổi account, role, hợp đồng, đăng ký, lịch hoặc availability theo dây chuyền. Không force bypass, không xóa history. Admin/Manager còn scope vẫn đọc nội bộ Gym INACTIVE. Public Gym/PT list/detail đã triển khai; chỉ trả Gym ACTIVE và assignment PT ACTIVE, theo §16/§18.
- Database bảo vệ cả ghi nghĩa vụ mới/kích hoạt lại trước Gym/PT INACTIVE (409 GYM_INACTIVE/TRAINER_INACTIVE khi qua service); cùng Gym dùng khóa transaction trước kiểm tra. Deadlock/serialization failure: 409 CONCURRENT_MODIFICATION, caller có thể thử lại sau khi đọc trạng thái mới. Không trả SQL/credential trong lỗi.
- API mới dùng envelope hiện có và Cache-Control: no-store. Không thay policy Booking/Registration cancellation, refund hoặc Customer đa Gym.


## 16. GYM-02 đợt 1 — Public Gym API đã triển khai

- `GET /api/v1/gyms`: Guest không cần cookie/token. Query strict: `page` (số nguyên dương, mặc định 1), `pageSize` (1–100, mặc định 20), `search` (trim, tìm chuỗi con không phân biệt hoa/thường trong gym_name hoặc address), `sortBy` (`created_at`, `gym_name`, `address`), `sortOrder` (`asc`, `desc`). Mặc định created_at desc; gym_id asc phân xử các giá trị bằng nhau để phân trang ổn định. Ký tự `%`, `_`, `\` trong search được tìm như ký tự thường. Query lạ, lặp tham số hoặc offset vượt giới hạn số nguyên an toàn trả 400 VALIDATION_ERROR; không nhận filter status từ client.
- Trả envelope collection §3.2; totalItems và data cùng bộ lọc ACTIVE/search và snapshot. Không có kết quả: data=[], totalPages=0; page vượt cuối trả data=[] và giữ tổng thật. hasPreviousPage dựa trên page>1.
- `GET /api/v1/gyms/:gymId`: Gym ACTIVE trả 200; Gym INACTIVE/không tồn tại cùng trả 404 NOT_FOUND; UUID sai trả 400 VALIDATION_ERROR.
- Projection tường minh gồm gym_id, gym_name, description, phone, email, address, latitude, longitude, logo_url, opening_time, closing_time, status, created_at, updated_at. phone/email là liên hệ của Gym, không phải User; không join User/assignment/Membership hoặc trả credential. Timestamp ISO, numeric coordinates giữ dạng chuỗi theo schema hiện có.
- Hai endpoint dùng Cache-Control: no-store; lỗi nội bộ không trả SQL. Không bổ sung create/update Gym, public PT, gallery/review aggregation hoặc UI trong đợt này.


## 17. GYM-02 đợt 2 — Tạo/cập nhật thông tin Gym đã triển khai

- `POST /api/v1/gyms`: Admin có account ACTIVE, không bị must_change_password gate và có role ADMIN hiện tại trong DB. Body strict yêu cầu `gym_name`, `address`; nhận tùy chọn description, phone, email, latitude, longitude, logo_url, opening_time, closing_time. Trả 201 `{success:true,data:Gym}` theo projection Gym §6. Gym mới ACTIVE theo default. Khi có `manager`, tạo nguyên tử User/Profile/role MANAGER/phân công và trả credential một lần theo §23; khi không có vẫn chỉ tạo Gym.
- `PATCH /api/v1/gyms/:gymId`: Admin hoặc User có role MANAGER và assignment ACTIVE đúng Gym, account ACTIVE và đã đổi mật khẩu nếu bắt buộc. Body strict chứa ít nhất một field thông tin nêu trên. Trả 200 Gym DTO. Field bị bỏ qua giữ nguyên; field nullable nhận null để xóa giá trị. gym_name/address không nhận null hoặc chuỗi trắng.
- gym_name/address trim và không rỗng. description là chuỗi nullable. phone trim, 1–20 ký tự; đây là liên hệ Gym, không ép định dạng điện thoại cá nhân. email trim/lowercase, định dạng email, tối đa 254 ký tự. logo_url chỉ HTTP/HTTPS, không thực hiện upload.
- latitude/longitude nhận số JSON hoặc chuỗi thập phân hữu hạn trong khoảng [-90,90]/[-180,180]; lưu theo numeric(9,6), response giữ chuỗi decimal. opening_time/closing_time nhận HH:mm hoặc HH:mm:ss (00:00:00–23:59:59), response HH:mm:ss. Không thêm rule closing>opening vì Gym có thể mở qua đêm.
- Từ chối gym_id, status, timestamps, actor/role/assignment và mọi field lạ bằng 400 VALIDATION_ERROR; không ghi một phần payload bị lỗi. UUID sai trả 400, Gym không tồn tại trả 404 NOT_FOUND.
- Thiếu phiên/actor không tồn tại: 401; account INACTIVE/SUSPENDED: 403 ACCOUNT_DEACTIVATED; must_change_password: 403 PASSWORD_CHANGE_REQUIRED; create thiếu ADMIN: 403 INSUFFICIENT_ROLE. Update dùng mã lỗi scope hiện có, không tin role trong JWT hoặc body.
- Update chỉ sửa thông tin và updated_at; giữ gym_id/status/created_at, không chuyển scope hoặc cascade. Gym INACTIVE không tự cấm sửa thông tin nếu actor còn quyền, nhưng không được kích hoạt bằng PATCH thông tin và vẫn ẩn khỏi public.
- Update khóa Gym trước kiểm tra account/role/assignment trong transaction, cùng thứ tự khóa với lifecycle/provisioning. Create kiểm tra account/role trong transaction cấp hệ thống, không yêu cầu Gym có sẵn. Không đổi schema/migration/GYM-01. Response dùng Cache-Control: no-store; lỗi DB qua mapper an toàn, không lộ SQL.


## 18. GYM-02 đợt 3 — PT công khai đã triển khai

- `GET /api/v1/gyms/:gymId/trainers`: Guest, không cần cookie/token. Chỉ trả assignment PT ACTIVE thuộc Gym ACTIVE trên route. Gym INACTIVE/không tồn tại trả 404 NOT_FOUND; Gym ACTIVE không có PT trả 200 với data=[] và totalPages=0.
- `GET /api/v1/gyms/:gymId/trainers/:trainerId`: trainerId là gym_trainer_id, không phải user_id. Sai Gym, PT INACTIVE, ID không tồn tại hoặc Gym không công khai cùng trả 404 NOT_FOUND; UUID sai trả 400 VALIDATION_ERROR.
- Response đúng TrainerPublicView §6: gym_trainer_id, gym_id, specialization, experience_years, bio, status, availability, joined_at; profile chỉ `{full_name, avatar_url}` hoặc null nếu chưa có; social_links/working_schedules theo DTO §13. Lịch làm việc chỉ ACTIVE, mảng không có dữ liệu trả []; không trả User ID, email/phone đăng nhập, credential, DOB, địa chỉ cá nhân hoặc audit review.
- Availability ACCEPTING/ALMOST_FULL/NOT_ACCEPTING đều được hiển thị khi assignment ACTIVE; không thêm account/role/email-verification/availability gate vào public projection. Không suy ra lịch làm việc là booking hay sức chứa.
- Query list strict: page mặc định 1; pageSize mặc định 20, tối đa 100; search trim, tìm chuỗi con không phân biệt hoa/thường theo full_name/specialization, escape ký tự LIKE `%`, `_`, `\`. sortBy chỉ created_at/joined_at/full_name, sortOrder asc/desc; mặc định created_at desc, gym_trainer_id asc phân xử đồng hạng. Từ chối query lạ, lặp tham số, page không nguyên dương hoặc offset vượt số nguyên an toàn; không nhận status/availability filter.
- Phân trang dùng envelope §3.2, totalItems cùng filter với data; trang vượt cuối trả mảng rỗng. Kiểm tra Gym, count/page, profile và dữ liệu con chung một read-only repeatable-read snapshot. Lấy social links/schedules theo batch chỉ cho IDs của trang hiện tại, không query riêng từng PT.
- Mọi response qua router này dùng Cache-Control: no-store; lỗi nội bộ không trả SQL. Không sửa dữ liệu, schema/migration; không triển khai UI, review, ghi profile/availability/social/working schedule trong đợt này.


## 19. GYM-02 đợt 4 — Danh sách quản trị Gym/PT đã triển khai

- `GET /api/v1/admin/gyms`: chỉ User ACTIVE có role ADMIN hiện tại và không bị must_change_password gate. Trả Gym DTO theo §6; mặc định gồm ACTIVE và INACTIVE.
- `GET /api/v1/gyms/:gymId/management/trainers`: Admin hoặc User có role MANAGER và assignment ACTIVE đúng Gym; account ACTIVE, đã đổi mật khẩu nếu bắt buộc. Trả các cột gym_trainers: gym_trainer_id, gym_id, user_id, specialization, experience_years, bio, availability, status, joined_at, created_at, updated_at. Không đọc/trả email/phone/hash hoặc trường riêng tư của User.
- Query strict cho cả hai: page mặc định 1, pageSize mặc định 20 (1–100), status tùy chọn ACTIVE/INACTIVE; bỏ status nghĩa là cả hai, không nhận ALL. search trim, không phân biệt hoa/thường, tìm chuỗi con literal (escape `%`, `_`, `\`); Gym tìm gym_name/address, PT tìm specialization/bio.
- sortBy Gym: created_at/gym_name/address; PT: created_at/joined_at/specialization. sortOrder asc/desc, mặc định created_at desc; ID resource asc phân xử đồng hạng. Envelope collection §3.2, totalItems cùng filter và snapshot với data; không kết quả trả totalPages=0, trang vượt cuối trả data=[].
- Không nhận gym_id/actor/role từ query; scope PT luôn lấy từ route và DB. Từ chối query lạ/lặp tham số, status/sort không hợp lệ, page không nguyên dương, pageSize vượt 100 và offset vượt số nguyên an toàn bằng 400 VALIDATION_ERROR. UUID sai trả 400; Gym không tồn tại trả 404 NOT_FOUND sau xác thực.
- Thiếu phiên/actor không tồn tại: 401; account INACTIVE/SUSPENDED: 403 ACCOUNT_DEACTIVATED; password gate: 403 PASSWORD_CHANGE_REQUIRED; thiếu quyền Admin list: 403 INSUFFICIENT_ROLE; PT list dùng mã lỗi scope hiện có. Không tin role JWT; role/assignment revoke có hiệu lực ở lần đọc tiếp theo.
- Gym INACTIVE vẫn đọc nội bộ được nếu actor còn scope. Quyền này không mở rộng response public: GET /gyms chỉ ACTIVE, public PT không trả assignment INACTIVE hoặc user_id, kể cả người gọi là Admin.
- Kiểm tra quyền và đọc count/page cùng transaction repeatable-read; giữ share locks trên dữ kiện quyền, PT list khóa Gym trước account/assignment theo thứ tự lifecycle. Không ghi dữ liệu nghiệp vụ. Lỗi serialization/deadlock dùng 409 CONCURRENT_MODIFICATION hiện có; không trả SQL. Mọi response nhóm này dùng Cache-Control: no-store.
- Không thêm UI, quản trị Package/User/Role hay thay đổi schema/migration trong đợt này.


## 20. PKG-01 — Package API đã triển khai

| Feature | Endpoint (prefix `/api/v1`) | Quyền và kết quả |
| --- | --- | --- |
| FEAT-PKG-001 | `GET /gyms/:gymId/packages` | Public; Package ACTIVE và Gym ACTIVE; collection envelope §3.2 |
| FEAT-PKG-002 | `GET /gyms/:gymId/packages/:packageId` | Public; đúng Gym, Package/Gym ACTIVE; 200 Package DTO |
| FEAT-PKG-003 | `POST /gyms/:gymId/packages` | Admin hoặc Manager có assignment ACTIVE đúng Gym; 201 Package DTO |
| FEAT-PKG-004 | `PATCH /gyms/:gymId/packages/:packageId` | Cùng quyền quản trị; 200 Package DTO |
| FEAT-PKG-005 | `PATCH /gyms/:gymId/packages/:packageId/deactivate` | Cùng quyền quản trị; 200, status INACTIVE |
| FEAT-PKG-006 | `PATCH /gyms/:gymId/packages/:packageId/activate` | Cùng quyền quản trị; 200, status ACTIVE |
| FEAT-PKG-007 | `GET /gyms/:gymId/management/packages` | Cùng quyền quản trị; ACTIVE/INACTIVE theo filter; collection envelope §3.2 |

- Package DTO tường minh: package_id, gym_id, package_name, description, duration_days, price, status, created_at, updated_at. Timestamp ISO; price luôn decimal string với hai chữ số lẻ. Không join User/Payment/Membership, không quota PT.
- POST body strict: package_name (trim, không rỗng), duration_days (JSON integer 1–2147483647), price (decimal **string**, không nhận JSON number); description tùy chọn string hoặc null. status mặc định ACTIVE theo schema. PATCH chỉ nhận các field này, có ít nhất một field; field bỏ qua giữ nguyên, description=null xóa mô tả. gym_id/package_id/status/timestamps/actor/role/quota và mọi field lạ trả 400 VALIDATION_ERROR.
- price trim, 1–12 chữ số nguyên và tùy chọn 1–2 chữ số lẻ; không âm, tối đa 999999999999.99. Không nhận exponent, NaN/Infinity, dấu cộng, dấu phẩy hoặc phần lẻ thứ ba. Chuẩn hóa bằng thao tác chuỗi, không làm tròn floating point: `"00012.5"` → `"12.50"`, `"0"` → `"0.00"`.
- List query strict: page mặc định 1, pageSize mặc định 20, tối đa 100; search tìm package_name/description, trim, không phân biệt hoa/thường, escape `%`, `_`, `\` thành literal. sortBy: created_at/package_name/duration_days/price; sortOrder asc/desc, mặc định created_at desc; package_id asc phân xử đồng hạng. price sort theo numeric của DB. Chỉ management nhận status ACTIVE/INACTIVE; không gửi status nghĩa là cả hai. Public từ chối filter status và mọi query lạ/lặp tham số; offset phải là số nguyên an toàn. Trang vượt cuối trả data=[], không kết quả totalPages=0.
- UUID route kiểm tra bằng Zod. Detail/create/update/status không nhận query parameters; status nhận body rỗng hoặc `{}` và không có force/cascade. Public Gym/Package INACTIVE, không tồn tại hoặc Package khác Gym đều trả cùng 404 NOT_FOUND an toàn.
- Private endpoint có authenticate trước controller; account/role/assignment lấy lại từ DB trong transaction, không tin role JWT. Thiếu phiên/actor: 401; account INACTIVE/SUSPENDED: 403 ACCOUNT_DEACTIVATED; password gate: 403 PASSWORD_CHANGE_REQUIRED; sai role/scope/phân công: 403 theo GymScopeService. Package khác Gym/missing trả 404 sau xác minh scope.
- Internal catalog vẫn đọc/tạo/sửa/đổi trạng thái trong Gym INACTIVE nếu actor còn scope, tương tự thông tin Gym; việc này không mở Gym public, không cho phép mua gói hoặc cấp hợp đồng. Không sửa account/role/assignment/Payment/Membership. Ngừng bán không bị chặn bởi Membership đã mua và không hủy thẻ; đây là FEAT-PKG-005 đã chốt, không áp dụng rule ngừng Gym/PT vào Package.
- Public đọc parent visibility và dữ liệu trên read-only repeatable-read snapshot. Management count/page/quyền cùng repeatable-read transaction. Write khóa share Gym trước account/role/assignment, cập nhật row Package theo cả gym_id và package_id; partial updates không ghi đè field ngoài payload. Giữ lock dữ kiện quyền tới commit để revoke/account change an toàn với request đang chờ.
- Mọi Package response dùng Cache-Control: no-store. JSON sai cú pháp hoặc scalar bị Express từ chối trước Zod cũng trả 400 VALIDATION_ERROR an toàn, không log payload. SQL/stack/credential không trả client; database error → 500 INTERNAL_SERVER_ERROR, deadlock/serialization → 409 CONCURRENT_MODIFICATION. Không tự retry hoặc mở endpoint DELETE.
- PKG-01 không triển khai checkout, callback/payment method, Membership API, UI hoặc migration mới. Q-01/Q-02 vẫn chặn đúng phần Payment phụ thuộc. Bằng chứng nghiệm thu: [PKG_01_VERIFICATION.md](PKG_01_VERIFICATION.md).


## 21. Payment demo — đã triển khai (2026-10-08)

Nguồn SUCCESS là bộ mô phỏng backend được người dùng yêu cầu, không phải dữ kiện tiền thật. Mặc định ghi bị tắt; PAYMENT_MODE=demo trong môi trường không production mới bật. UI/API/DB đánh dấu demo. Không có callback hoặc endpoint Customer tự PATCH SUCCESS.

- POST `/api/v1/gyms/:gymId/payments`: Customer từ DB, strict UUID params, query rỗng, body `{package_id: UUID, payment_method: string trim 1–80}`; bất kỳ phương thức hợp lệ nào đều mô phỏng thành công. Header Idempotency-Key UUID bắt buộc, normalize UUID lowercase.
- Gym/Package ACTIVE, cùng Gym; backend đọc price/duration dưới lock. Tạo Payment SUCCESS + Membership ACTIVE trong một transaction; amount/purchase_price giữ decimal string, kể cả 0 hoặc numeric max. Paid_at từ server, ngày Việt Nam, số ngày bao gồm ngày cuối. Duration vượt năm 9999 trả 400 INVALID_DURATION trước ghi.
- HTTP 201 khi tạo mới, 200 khi replay. Data `{demo:true,replayed,payment,membership}`. Payment DTO gồm payment_id/user_id/gym_id/package_id/amount/payment_method/transaction_code/payment_status/paid_at/created_at/updated_at/demo. Membership DTO gồm membership_id/user_id/gym_id/package_id/payment_id/purchase_price/start_date/end_date/status/created_at/updated_at/demo.
- payment_method lưu `DEMO:<method>`, transaction_code `DEMO:<UUID>`. Replay cùng actor/Gym/package/method giữ nguyên Payment/thẻ dù Package đã đổi hoặc ngừng bán. Key khác input/actor/Gym trả 409 IDEMPOTENCY_CONFLICT an toàn; không lộ dữ liệu. Lỗi Membership rollback Payment; DB serialization/deadlock trả 409 CONCURRENT_MODIFICATION.
- GET `/api/v1/payments/me`, GET `/api/v1/memberships/me`: Customer chính chủ; collection envelope, strict query page (1–1000000, default1), pageSize (1–100, default20), created_at desc/PK asc. List thẻ nhận demo flag qua Payment nguồn, không suy từ price.
- GET `/api/v1/payments/:paymentId`: Customer chính chủ, UUID/query rỗng; safe404 nếu sai owner/missing. Không mở lịch sử tài chính toàn Gym cho Manager/Admin.
- Mọi endpoint authenticate và Cache-Control:no-store; quyền account/role/password gate đọc lại DB. Guest401, sai role403, resource hidden/wrongGym404, strict payload400; demo disabled503 PAYMENT_DEMO_DISABLED. App CORS cho Idempotency-Key.
- Demo không thực hiện expiry/refund/manual membership hoặc quyết định policy nhiều thẻ tiền thật. Các lần bấm với key mới là giao dịch demo độc lập. Real payment contracts ở §8 vẫn chưa triển khai.

## 22. PT Registration / Appointment / Availability — triển khai 2026-10-09

Chính sách được duyệt tại PLAN-03 §9. Phần này thay thế DRAFT/UNKNOWN tương ứng trong catalog §8/§13; không mở `/assign` ghi đè đăng ký. Tất cả đường dẫn dưới có prefix `/api/v1`, authenticate cookie, Cache-Control no-store; backend đọc account/role/assignment hiện hành và password gate. Body/params/query Zod strict, UUID lowercase.

| Method / Path | Actor | Input | Output |
| --- | --- | --- | --- |
| PATCH /gyms/:gymId/trainers/:trainerId/availability | PT chính chủ ACTIVE hoặc Manager ACTIVE đúng Gym | {availability: ACCEPTING/ALMOST_FULL/NOT_ACCEPTING} | {gym_trainer_id,gym_id,availability} |
| POST /gyms/:gymId/pt-registrations | Customer chính chủ hoặc Manager đúng Gym | {membership_id,gym_trainer_id,note?} | RegistrationView, 201 |
| GET /pt-registrations/me | Customer/PT | page/pageSize | RegistrationView[] + pagination |
| GET /gyms/:gymId/pt-registrations | Admin/Manager đúng Gym | page/pageSize | RegistrationView[] + pagination |
| PATCH /gyms/:gymId/pt-registrations/:registrationId/cancel | Admin/Manager đúng Gym | {note}, lý do bắt buộc | RegistrationView |
| POST /gyms/:gymId/pt-appointments | Customer chính chủ/PT được giao/Manager đúng Gym | {registration_id,start_time,end_time,note?} | AppointmentView PENDING, 201 |
| GET /pt-appointments/me | Customer/PT | page/pageSize | AppointmentView[] + pagination |
| GET /gyms/:gymId/pt-appointments | Admin/Manager đúng Gym | page/pageSize | AppointmentView[] + pagination |
| PATCH /gyms/:gymId/pt-appointments/:appointmentId/confirm | PT được giao/Manager | {note?} | AppointmentView CONFIRMED |
| PATCH /gyms/:gymId/pt-appointments/:appointmentId/reschedule | Customer chính chủ/PT được giao/Manager | {start_time,end_time,note?} | AppointmentView PENDING |
| PATCH /gyms/:gymId/pt-appointments/:appointmentId/cancel | Customer chính chủ/PT được giao/Manager | {note}, bắt buộc | AppointmentView CANCELLED |
| PATCH /gyms/:gymId/pt-appointments/:appointmentId/complete | PT được giao/Manager | {note?} | AppointmentView COMPLETED |

- Response {success:true,data}; collections có pagination cùng cấp data, page mặc định 1 tối đa 1e6, pageSize mặc định 20 tối đa 100. Registration sort created_at desc/id asc, Appointment sort start_time desc/id asc. Scope Customer theo Membership.user_id; PT theo trainer.user_id và assignment ACTIVE; tài khoản hai role lấy hợp của hai tập. Projection §6, không email/phone/hash/account data.
- Registration: Membership ACTIVE trong ngày Việt Nam và Gym/PT/account/role ACTIVE; một ACTIVE/thẻ. NOT_ACCEPTING chặn mới. Demo Membership được dùng; không phân biệt thẻ demo trong eligibility. Availability không chặn buổi của đăng ký cũ. Không sửa Membership/PT nguồn hoặc history; cancel chỉ khi không còn Appointment PENDING/CONFIRMED, repeat giữ kết quả cũ.
- Appointment: Registration ACTIVE và thẻ còn hạn cho create/confirm/reschedule; ISO timestamp phải có offset/Z. Toàn bộ khoảng [start,end) nằm trong ngày thẻ Việt Nam, start > now, end > start. PENDING/CONFIRMED giữ chỗ toàn hệ thống cho cả User học/dạy, kể cả hai role. Conflict chỉ thông báo chung, không lộ lịch Gym khác. Working Schedule chỉ tham khảo.
- Dời trước giờ bắt đầu, kiểm tra lại và về PENDING. Dời cùng start/end là no-op. Confirm trước giờ chỉ PT/Manager. Customer hủy trước giờ; PT/Manager hủy quá giờ với lý do. Complete chỉ từ CONFIRMED sau end; repeat cùng đích không sửa note/timestamp. Thẻ hết hạn không ngăn xử lý nghĩa vụ cũ. Terminal không chỉnh sửa. Không quota/refund/NO_SHOW mới/cascade.
- POST Appointment không có cơ chế replay theo Idempotency-Key ở bản đầu: gửi lại cùng giờ trong lúc lịch mở trả 409 APPOINTMENT_OVERLAP; người dùng tải lại danh sách trước thử lại sau lỗi mạng. UI khóa submit pending, mutations retry=false. POST Registration lặp trả 409 ACTIVE_REGISTRATION_EXISTS.
- Lỗi: 400 VALIDATION_ERROR/INVALID_APPOINTMENT_TIME; 401 không phiên; 403 quyền/account/password; 404 tài nguyên ngoài Gym hoặc không tồn tại; 409 MEMBERSHIP_REQUIRED/PT_INACTIVE/TRAINER_NOT_ACCEPTING/ACTIVE_REGISTRATION_EXISTS/APPOINTMENT_OVERLAP/REGISTRATION_HAS_OPEN_APPOINTMENTS/APPOINTMENT_STARTED/INVALID_STATUS/CONCURRENT_MODIFICATION/PT_POLICY_CONFLICT. SQL/stack không trả client.
- Migration 0003: unique ACTIVE Registration/thẻ; preflight overlap legacy; immutable Registration source/terminal history và participant identity; overlap trigger khóa Gym → participant User theo UUID. API thêm khóa actor cùng thứ tự, thẩm định scope và state machine. Các ghi Appointment yêu cầu isolation READ COMMITTED; snapshot repeatable-read/serializable bị từ chối để không bỏ sót conflict sau chờ khóa. SQL trực tiếp sai thứ tự có thể bị abort do deadlock. Không thêm bảng/cột. Đã áp dụng migration 0002–0003 lên database Docker development đang dùng ngày 2026-10-09; xem PT_WORKFLOW_VERIFICATION.md.

### Thẻ hội viên cho form Manager (FEAT-MEM-003)

GET `/api/v1/gyms/:gymId/memberships` đã triển khai như phần hỗ trợ đăng ký hộ. Admin hoặc Manager ACTIVE đúng Gym, account/password gate hiện hành; Customer/PT không đọc danh sách Gym. Query strict page/pageSize như §22; created_at desc, membership_id asc; không filter do client tự khai. MembershipView §6 + customer {user_id,full_name} để chọn thẻ bằng tên hội viên. Không email/phone/credential. Trả mọi status cho quản trị; form chỉ đưa thẻ ACTIVE còn hạn vào lựa chọn. DTO, ownership và eligibility ghi Registration vẫn do backend thẩm định.


## 23. Tạo Gym kèm Manager — 2026-10-09

`POST /api/v1/gyms`, authenticated Admin hiện hành. Giữ các field Gym §17 và bổ sung field optional `manager: { email, full_name, phone? }`, strict allowlist theo provisioning hiện có. Email trim/lowercase, tên 2–100 ký tự, phone nullable theo validator staff. Không nhận password/roles/status/user_id/gym_id trong manager; PATCH /gyms/:gymId không nhận manager.

Success 201 `{success:true,data:{...Gym,manager:{user:UserSession,assignment:ManagerAssignment,temporary_password:string}}}` khi có manager, `Cache-Control: no-store`. Assignment luôn trỏ Gym vừa tạo. User ACTIVE/MANAGER/must_change_password=true; lần đăng nhập đầu dùng luồng đổi mật khẩu hiện có. Khi không có manager, response Gym cũ không có field credential.

Authorize sơ bộ trước hash, hash ngoài transaction/khóa, recheck DB account/ADMIN grant trong transaction ghi. Insert Gym/User/Profile/Role/Assignment nguyên tử; unique email/phone hoặc thiếu role rollback toàn bộ. 400 strict validation, 401 unauthenticated, 403 role/account/password gate, 409 EMAIL_ALREADY_EXISTS/PHONE_ALREADY_EXISTS/concurrency, 500 cấu hình/hạ tầng. Response lỗi và public/list/update/session không chứa mật khẩu tạm/hash. Không có API đọc lại credential.

Không tự retry POST khi mất kết nối sau commit: Admin kiểm tra danh sách cơ sở/phân công trước khi thao tác tiếp; API chưa có idempotency cho tạo Gym. Manager đã có tài khoản dùng màn Bổ nhiệm Manager.


## 24. Báo cáo sự cố bằng nội dung/ảnh — 2026-10-10

Thay draft Report/EQP trước đó trong phạm vi demo; không mở API danh mục/máy. Các endpoint đều cookie authenticated, no-store, quyền DB authoritative; Guest không gửi/đọc ảnh. Không cho sửa/xóa chứng cứ gốc.

- POST /gyms/:gymId/reports: Customer có thẻ ACTIVE còn hạn tại Gym ACTIVE, gồm thẻ demo. Body strict `{content: string(5..4000), image?: {mime_type: 'image/jpeg'|'image/png', data: base64}}`. Không title/type/equipment_id/user_id/Gym/status/image_url tự khai. Tối đa 1 ảnh ≤5MiB, chữ ký MIME/giới hạn kích thước, canonical base64; JSON limit 7MiB, auth/eligibility trước parse lớn và kiểm tra lại transaction ghi. Server gán type OTHER/title từ nội dung/PENDING; không tự tạo quan hệ thiết bị.
- GET /reports/me: chính chủ, không yêu cầu thẻ còn hạn để đọc lịch sử.
- GET /gyms/:gymId/reports: Admin/Manager assignment ACTIVE đúng Gym; được xử lý lịch sử khi Gym ngừng.
- GET /reports/:reportId/image: chính chủ hoặc Admin/Manager đúng Gym, current account ACTIVE/password gate. Trả binary MIME cố định JPEG/PNG, no-store, nosniff, CORP same-site; frontend dùng CORS use-credentials với origin đã cấu hình. Không static public/path tùy ý.
- PATCH /gyms/:gymId/reports/:reportId/investigate: strict body {}, PENDING→IN_PROGRESS.
- PATCH /gyms/:gymId/reports/:reportId/resolve: `{resolution_note: string(1..2000)}`, IN_PROGRESS→RESOLVED; server gán actor và resolved_at.
- PATCH /gyms/:gymId/reports/:reportId/reject: cùng note allowlist, PENDING/IN_PROGRESS→REJECTED, lý do bắt buộc; actor resolved_by, resolved_at NULL, updated_at là thời điểm từ chối. Terminal không mở lại; lặp/action không phù hợp trả 409.

GET collections query strict page (1..1000000), pageSize (1..100), status? (4 giá trị). Response collection envelope chuẩn, projection `{report_id,gym_id,gym_name,content,status,has_image,resolution_note,created_at,updated_at,resolved_at}`. Create/action trả projection trong data; không file key, email, credential, user_id khác Gym.

Lỗi: 400 validation/image sai; 401 thiếu phiên; 403 account/role/scope/card không đủ; 404 Gym/Report/ảnh không tồn tại; 409 chuyển trạng thái hoặc concurrency; 413 vượt body; 503 upload chưa hỗ trợ môi trường production. Ảnh demo local disk volume, tối đa 20M pixels, frontend re-encode JPEG/resize cạnh dài1600 loại metadata. Không tích hợp storage production, Gallery/Avatar/upload chung. POST không tự retry, chưa có idempotency; mất mạng sau commit cần kiểm tra lịch sử trước gửi lại.

## 25. Đăng ký tư vấn — contract được duyệt 2026-10-10

CON-01/CON-02 theo quyết định mới nhất trong Architecture/Domain. Base `/api/v1`.

| Method / route | Quyền | Request / response |
| :--- | :--- | :--- |
| POST `/gyms/:gymId/consultation-requests` | Guest hoặc phiên hiện hành hợp lệ; Gym ACTIVE | Strict `{full_name, phone, content?, preferred_contact?}`; 201 `{success:true,data:{message:"Gym đã nhận yêu cầu và sẽ liên hệ để tư vấn."}}` |
| GET `/gyms/:gymId/consultation-requests` | Chỉ MANAGER và assignment ACTIVE đúng Gym | Strict query page/pageSize/status; `{success:true,data:[Consultation],pagination}` |
| PATCH `/gyms/:gymId/consultation-requests/:requestId` | Chỉ MANAGER và assignment ACTIVE đúng Gym | Strict `{expected_status,status,processing_note?}`; 200 `{success:true,data:Consultation}` |

Họ tên trim 2–100 ký tự; phone tối đa 20 ký tự đầu vào, loại khoảng trắng/dấu ngoặc/chấm/gạch ngang, sau chuẩn hóa 9–15 chữ số, cho phép dấu + ở đầu. content trim tối đa 2000, preferred_contact trim tối đa 200; rỗng lưu NULL. Không nhận email/preferred_date/preferred_time/user_id/gym_id/status/assigned_to/processing_note từ public body. Cookie không có là Guest; cookie sai trả 401, account INACTIVE/SUSPENDED hoặc must_change_password trả 403, không tự hạ thành Guest. User_id lấy duy nhất từ cookie hợp lệ; không bắt Membership. Response POST không có contact/ID/user/assignment, không mở public GET.

Consultation DTO nội bộ: consultation_request_id, gym_id, full_name, phone, content, preferred_contact, processing_note, status, created_at, updated_at; không trả user_id/email/assigned_to. page mặc định 1, pageSize mặc định 20/tối đa 100, status enum bốn giá trị. UUID route hợp lệ bắt buộc, giới hạn JSON 100 kB.

Transitions: PENDING→CONTACTED→COMPLETED, PENDING/CONTACTED→CANCELLED với processing_note không rỗng làm lý do. Cùng trạng thái PENDING/CONTACTED cho phép lưu ghi chú riêng; cập nhật processing_note thay ghi chú hiện tại, không phải nhật ký. Terminal không sửa/mở lại. expected_status phải bằng trạng thái hiện tại, sai trả 409 INVALID_STATUS_TRANSITION. Khóa Gym trước account/assignment và row khi PATCH; queries read/write luôn có gym_id. Có thể xử lý yêu cầu cũ của Gym INACTIVE; không nhận yêu cầu mới. Admin/PT/Customer/Manager khác Gym không có quyền đọc/xử lý.

POST giới hạn 5 lần/15 phút/IP trong một process, tính cả request bị từ chối sau limiter, map tối đa 10.000 IP còn hiệu lực; dùng req.ip/remoteAddress khi trust proxy tắt, không tin X-Forwarded-For. 429 RATE_LIMITED kèm Retry-After; reset khi restart. Khi chạy nhiều process/proxy cần xem lại limiter trước production. Không CAPTCHA, không idempotency/automatic retry. No-store cho các response route.

400 validation, 401 session, 403 account/password/role/scope, 404 Gym/resource sai scope, 409 state/concurrency, 413 body quá lớn, 429 rate limit, 500 lỗi an toàn. Không tạo Appointment/Payment/Membership, assignment, email/SMS hoặc SLA phản hồi.

## 26. Gallery demo — GIM-01 (2026-10-10)

Theo quyết định Gallery demo mới nhất trong Architecture/Domain. Base `/api/v1`.

| Method / route | Quyền | Contract |
| :--- | :--- | :--- |
| GET `/gyms/:gymId/images` | Guest, Gym ACTIVE | 200 `{success:true,data:GalleryImage[]}` theo thứ tự; tối đa 10 ảnh qua API ghi hiện tại |
| GET `/gyms/:gymId/management/images` | Admin hoặc Manager ACTIVE đúng Gym | Cùng DTO, gồm Gym INACTIVE |
| POST `/gyms/:gymId/images` | Admin hoặc Manager ACTIVE đúng Gym | Strict `{image:{mime_type,data},caption?}`; 201 GalleryImage |
| PATCH `/gyms/:gymId/images/:imageId` | Admin hoặc Manager ACTIVE đúng Gym | Strict `{caption,expected_updated_at}`; 200 GalleryImage |
| PATCH `/gyms/:gymId/images/order` | Admin hoặc Manager ACTIVE đúng Gym | Strict `{expected_image_ids,image_ids}`; 200 GalleryImage[] |
| DELETE `/gyms/:gymId/images/:imageId` | Admin hoặc Manager ACTIVE đúng Gym | Body vắng hoặc strict {}; 200 `{message:"Đã xóa ảnh."}` |
| GET `/gyms/:gymId/images/:imageId/file` | Guest, Gym ACTIVE | Bytes JPEG/PNG, no-store/nosniff; row phải đúng Gym |
| GET `/gyms/:gymId/management/images/:imageId/file` | Admin hoặc Manager ACTIVE đúng Gym | Bytes private, gồm Gym INACTIVE |

GalleryImage DTO: image_id, gym_id, caption, display_order, updated_at; không trả storage key/image_url hoặc actor. Đường ảnh được frontend tạo từ Gym/image ID và endpoint tương ứng; không redirect hoặc fetch URL do client cung cấp. List không có query parameters, strict UUID route. Ảnh đầu tiên là cover của gallery; logo riêng không bị thay đổi.

Upload một JPEG/PNG base64 canonical tối đa 5 MiB/20 megapixels, caption trim tối đa 200, rỗng NULL. UI mã hóa lại JPEG và thu nhỏ cạnh dài 1600 trước gửi; server kiểm tra độc lập, loại PNG text/EXIF và JPEG EXIF/XMP/IPTC/comments, không nhận filename/image_url/gym_id/display_order từ body. Parser riêng 7 MiB sau authenticate/authorize sơ bộ; request khác giữ 100 kB. Demo dùng GALLERY_UPLOAD_DIR/volume riêng, production upload trả 503 GALLERY_UPLOAD_DISABLED khi chưa có storage được chọn.

Mọi write khóa Gym trước quyền account/assignment và gallery: recheck quota trong transaction insert, tối đa 10 row/Gym qua API. Reorder phải chứa chính xác mỗi image ID hiện tại một lần và expected_image_ids đúng thứ tự hiện hành, mọi cập nhật nguyên tử. Caption expected_updated_at phải bằng timestamp ISO server đã trả; sai dữ liệu cũ trả 409 GALLERY_CHANGED. DELETE row commit trước cleanup file, URL cũ trả 404. Không sửa/xóa bản ghi hoặc file báo cáo sự cố. Ngừng Gym giữ row/file, các request public mới trả 404; không thu hồi bytes đã tải trước đó.

400 validation/ảnh sai, 401 chưa login, 403 account/password/role/scope, 404 Gym/resource sai scope, 409 GALLERY_LIMIT/GALLERY_CHANGED/concurrency, 413 body vượt giới hạn, 503 storage disabled, 500 lỗi an toàn. No-store cho list và file. Public bytes Cross-Origin-Resource-Policy cross-origin; private bytes same-site và browser dùng CORS credentials. Không static directory, không provider/crop/album/video/versioning/drag-drop. Không tự retry POST khi mất mạng, UI hướng dẫn kiểm tra danh sách trước gửi lại.

## 27. TPR-01 — Hồ sơ và giờ làm việc tham khảo (2026-10-10)

Q-16/Q-18 đã được người dùng duyệt, theo quyết định mới nhất trong Architecture/Domain. Base `/api/v1`.

| Method / route | Quyền | Contract |
| :--- | :--- | :--- |
| GET `/trainer-profile/me` | PT chính chủ có assignment ACTIVE | 200 TrainerProfile, actor từ cookie/DB, không nhận user/gym/trainer ID |
| PUT `/trainer-profile/me` | PT chính chủ, Gym/PT ACTIVE | Strict `{expected_updated_at,bio,social_links,working_schedules}` toàn bộ hồ sơ tự quản lý |
| GET `/gyms/:gymId/management/trainers/:trainerId/profile` | Manager ACTIVE đúng Gym | 200 TrainerProfile, đọc được PT/Gym INACTIVE trong scope |
| PATCH `/gyms/:gymId/management/trainers/:trainerId/profile` | Manager ACTIVE đúng Gym, Gym/PT ACTIVE | Strict `{expected_updated_at,specialization,experience_years}` |

TrainerProfile DTO: gym_id, gym_trainer_id, specialization, experience_years, bio, availability, status, updated_at, profile:{full_name,avatar_url}|null, social_links:[{platform,url}], working_schedules:[{day_of_week,start_time,end_time}]. Không email/phone/user_id/password/hash/Appointment/học viên. List children ACTIVE-only cho working schedules, thứ Hai→Chủ nhật rồi giờ bắt đầu; query GET strict rỗng, route UUID chuẩn hóa lowercase.

Bio string trim ≤2000, rỗng NULL. Manager specialization string trim ≤200, rỗng NULL; experience_years int 0–80 hoặc NULL. Self không nhận chuyên môn/kinh nghiệm/trạng thái/availability/actor; Manager không nhận bio/social/schedule. availability giữ endpoint hiện có, các mutation invalidate cả trainer-profile để timestamp được cập nhật. Tên/ảnh dùng User Profile hiện có, không mở upload mới.

social_links toàn bộ set, ≤5, platform enum hiện có FACEBOOK/INSTAGRAM/YOUTUBE/TIKTOK/WEBSITE, mỗi platform một URL HTTP(S) ≤2048 không chứa user/password. Giữ ID khi sửa platform hiện có, xóa liên kết bị bỏ khi lưu; không audit/version. working_schedules toàn bộ set ACTIVE, ≤28 ca, day enum thứ trong tuần, HH:mm giờ Việt Nam, end>start, không overlap cùng ngày, ca liền kề được phép, không qua nửa đêm. Không khai báo giờ không chặn booking. Không công khai Appointment hoặc chỗ trống từ dữ liệu này.

Write khóa parent Gym trước account/role/assignment/trainer, quyền lấy lại trong transaction. expected_updated_at so với timestamp server hiện hành; stale/concurrent trả 409 PROFILE_CHANGED. Parent updated_at tăng tối thiểu 1 ms khi API hồ sơ mới ghi để version không lặp. Các ca bị bỏ chuyển INACTIVE, không xóa lịch sử; exact day/time có thể reactivate ID cũ, ca mới tạo row. Thao tác không ghi pt_appointments/pt_registrations/memberships hoặc sửa check chống trùng Appointment; không tạo/dời/hủy lịch tự động, không giữ slot.

400 validation/allowlist/url/overlap, 401 cookie, 403 role/account/password/assignment/Gym/PT inactive, 404 PT sai Gym trong scope, 409 stale/concurrency, 500 lỗi an toàn. No-store, parser 100 kB hiện có. Admin không có quyền API TPR mới chỉ vì role ADMIN; provisioning/lifecycle hiện có giữ nguyên.


## 28. REV-01 — Review Customer và public (2026-10-10)

GET/POST `/gyms/:gymId/reviews`, GET/POST `/gyms/:gymId/trainers/:trainerId/reviews`: GET public; POST authentication Customer và Q-15 mới. Body strict `{rating: integer 1..5, comment?: string|null <=2000}`; không nhận actor/status/audit. POST 201 `{success:true,data:{review_id,rating,comment,status,created_at}}`. Duplicate kể cả HIDDEN trả 409 REVIEW_ALREADY_EXISTS; thiếu eligibility 403 REVIEW_NOT_ELIGIBLE; target inactive/khác Gym 404. Không PATCH/DELETE review.

GET public query strict `page` 1..100000, `pageSize` 1..50, mặc định 1/10; data `{items:[{review_id,rating,comment,created_at,author_name}],page,page_size,total,average_rating}`. Chỉ VISIBLE, mới nhất trước/ID để ổn định; average=null khi chưa có review. Không contact/User ID/audit. Target Gym/PT inactive 404. No-store.

GET `/gyms/:gymId/reviews/me` và `/gyms/:gymId/trainers/:trainerId/reviews/me`: authenticated Customer; query rỗng. data `{eligible,reason,review:null|{review_id,rating,comment,status,created_at}}`. Trả review chính chủ cả HIDDEN nhưng không audit; không đổi eligibility thành quyền từ frontend. Mọi ghi kiểm tra lại DB; account/role/password/assignment và ownership hiện hành. Q-15 theo quyết định 2026-10-10; REV-02 ngoài phạm vi.


## 29. REV-02 — Admin moderation (2026-10-10)

GET `/admin/reviews`: authenticated Admin ACTIVE, đã đổi mật khẩu tạm. Query strict `{kind?:gym|trainer (default gym), gym_id?:UUID, status?:VISIBLE|HIDDEN, page?:1..100000 (default1), pageSize?:1..50 (default10)}`. data `{items:ReviewModerationView[],page,page_size,total}`. Sắp created_at DESC/id DESC. Đọc cả target INACTIVE; Gym không tồn tại là empty. View: review_id/kind/rating/comment/status/created_at, gym {gym_id,gym_name,status}, trainer null|{gym_trainer_id,full_name,status}, author {user_id,full_name}, moderation null|{hidden_by,moderator_name,hidden_at,hidden_reason}. Không email/phone/hash/token.

PATCH `/admin/reviews/:kind/:reviewId/hide`: params kind gym|trainer + UUID; query rỗng; body strict `{hidden_reason:trimmed string 1..1000}`. 200 `{success:true,data:ReviewModerationView}`. Server tự ghi actor/thời gian, không nhận audit/status/content/rating từ client. 404 ID không tồn tại ở đúng kind; 409 REVIEW_NOT_VISIBLE nếu đã HIDDEN; 401 Guest, 403 non-Admin/current role revoked/account/password gate. No-store mọi response nội bộ. Không PATCH nội dung/DELETE/unhide. Không ẩn vì rating thấp; policy/lời nhắc UI theo quyết định REV-02.


## 30. ADM-01 — Admin User management (2026-10-10)

GET `/admin/users`: authenticated Admin ACTIVE, đã đổi mật khẩu tạm. Query strict `{search?:trim <=100, role?:ADMIN|MANAGER|PT|CUSTOMER, status?:ACTIVE|INACTIVE|SUSPENDED, page?:1..100000 (default1), pageSize?:1..50 (default20)}`. Search literal case-insensitive email/full_name; created_at DESC/user_id ASC ổn định. data `{items:UserAdminView[],page,page_size,total}`. View: user_id/email/phone/status/must_change_password/email_verified_at/created_at/updated_at, profile null|{full_name,avatar_url}, roles string[], active_gym_assignments [{gym_id,gym_name,assignment_type:MANAGER|PT}]. Không credential/hash/token/thông tin hồ sơ sức khỏe, địa chỉ hoặc ngày sinh.

GET `/admin/roles`: quyền như trên, query rỗng; data `[{role_id,role_name,description}]`. Chỉ đọc roles.

PATCH `/admin/users/:userId/status`: UUID params/query rỗng; strict body `{status:ACTIVE|INACTIVE|SUSPENDED,expected_updated_at:ISO datetime offset}`. Server auth từ DB; 200 UserAdminView, 403 ADMIN_ACCOUNT_PROTECTED cho Admin target (gồm self), 404 target missing, 409 USER_CHANGED stale, 409 INVALID_STATUS_TRANSITION nếu cùng status. Không body actor/role/password/gym_id. No-store private responses. Có xác nhận UI; không cascade, không đổi role/gate/phân công/nghĩa vụ. Token cũ bị chặn khi User không ACTIVE, không session revocation vĩnh viễn. Quyết định ADM-01 ở Architecture/Domain.

CAS chuẩn hóa expected_updated_at về UTC trước so sánh; offset biểu diễn cùng thời điểm không tạo conflict giả. Profile write khóa User và đọc lại status trong transaction; password update kiểm tra ACTIVE/hash đã xác minh trong chính UPDATE sau hashing, không giữ khóa trong Argon2.

## QA-01 — Hợp đồng bảo vệ dùng chung (2026-10-11)

- `/api/v1` luôn có `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`; response không lộ X-Powered-By.
- POST/PUT/PATCH/DELETE: Origin phải khớp chính xác một entry `CORS_ORIGIN`; Referer là fallback khi thiếu Origin. Nguồn sai/null/malformed, hoặc browser có Sec-Fetch-Site mà thiếu nguồn: 403 `{success:false,error:{code:"UNTRUSTED_ORIGIN",message,details:null}}` trước parse/auth/ghi. Client không có browser source headers được hỗ trợ. GET/HEAD/OPTIONS giữ contract hiện hành.
- Login: sau 10 request sai/đang xử lý/phút/IP, 429 RATE_LIMITED có Retry-After (giây). Thành công không tích lũy vào giới hạn; IP không lấy từ X-Forwarded-For. Limiter một process, không lưu email/password.
- Login/register/change-password/update-profile không nhận field ngoài allowlist. current_password và confirm_password tối đa 128; ngày sinh phải đúng lịch; avatar_url HTTP(S), không username/password. Legacy không tự reconcile.
- must_change_password chặn GET/PATCH `/users/me/profile` với PASSWORD_CHANGE_REQUIRED, gồm recheck trong transaction; đọc session/đổi mật khẩu/logout vẫn được phép.
- JWT subject sai định dạng, hết hạn, chữ ký/algorithm không hợp lệ đều 401 UNAUTHORIZED. Chỉ HS256 được chấp nhận.
- Concurrent email/phone unique conflict vẫn là 409 EMAIL_ALREADY_EXISTS/PHONE_ALREADY_EXISTS; transaction không ghi profile/account một phần.
- Route `/api/v1` không tồn tại: 404 `{success:false,error:{code:"NOT_FOUND",message:"Không tìm thấy API.",details:null}}`.

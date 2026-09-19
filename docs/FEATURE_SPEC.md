# Multi-Gym Platform — Feature Specification

## 1. Purpose

Tài liệu này xác lập đặc tả tính năng nghiệp vụ (**Feature Specification**) chính thức cho nền tảng **Multi-Gym Platform**.

Mục tiêu cốt lõi:
- Cụ thể hóa toàn bộ các quy tắc nghiệp vụ miền ([`docs/DOMAIN_RULES.md`](file:///srv/gym/docs/DOMAIN_RULES.md)), kiến trúc bảo mật ([`docs/ARCHITECTURE_DECISIONS.md`](file:///srv/gym/docs/ARCHITECTURE_DECISIONS.md)), cấu trúc cơ sở dữ liệu ([`docs/DATABASE_SPEC.md`](file:///srv/gym/docs/DATABASE_SPEC.md)), và hợp đồng giao tiếp ([`docs/API_SPEC.md`](file:///srv/gym/docs/API_SPEC.md)) thành kịch bản tính năng hoàn chỉnh trước khi bước vào giai đoạn viết mã (implementation).
- Cung cấp mô tả chi tiết về luồng thực thi chính (Main Flow), luồng ngoại lệ (Alternative Flows), điều kiện tiên quyết (Preconditions), quy tắc phân quyền (Authorization), yêu cầu giao dịch (Transaction Requirements), và tiêu chí nghiệm thu (Acceptance Criteria) cho từng tính năng.
- Làm kim chỉ nam cho việc phát triển Application Services, Controllers, UI Flow tại Frontend, và viết kịch bản kiểm thử (Unit, Integration, E2E Testing).

> [!IMPORTANT]
> - **Phạm vi dữ liệu:** Giới hạn nghiêm ngặt trong đúng **12 Domain Entities** đã được phê duyệt. Tuyệt đối không tự ý bổ sung entity thứ 13.
> - **Phạm vi thanh toán:** **Payment là OUT OF SCOPE — CURRENT PHASE**. Không có Payment Gateway, Webhook, xử lý thẻ tín dụng hoặc Subscription Auto-billing.
> - **Không đưa mã nguồn implementation** vào tài liệu này.

---

## 2. Feature Principles

Mọi tính năng trong tài liệu này đều bắt buộc phải tuân thủ 8 nguyên tắc nền tảng:

1. **Multi-Gym Data Isolation:** Mỗi cơ sở phòng tập (`Gym`) là một đơn vị vận hành độc lập. Dữ liệu của phòng gym này tuyệt đối không được rò rỉ sang phòng gym khác.
2. **Two-Tier Access Control (RBAC + Gym Scope):** Quyền truy cập mọi tính năng được thẩm định qua 2 bước:
   - *Bước 1 (RBAC):* Người dùng có vai trò (`Role`) phù hợp để thực hiện hành vi hay không?
   - *Bước 2 (Gym Scope):* Người dùng có thẩm quyền hợp lệ trên đúng phòng tập (`gym_id`) sở hữu tài nguyên hay không?
3. **Phân biệt Actor vs Persisted Role:** `Guest` là khách vãng lai chưa xác thực (Unauthenticated Actor), không lưu trong bảng `roles`. 4 Role được lưu trữ trong DB là: `CUSTOMER`, `PT`, `MANAGER`, `ADMIN`.
4. **Không giả định mọi Entity có trực tiếp `gym_id`:** Bảng `users`, `user_profiles`, `roles`, `user_roles` là **System-scoped**, không có cột `gym_id`. Gym Scope của User được giải quyết qua các bảng liên kết quan hệ (`gym_managers`, `gym_trainers`, `memberships`).
5. **Đồng nhất Định danh Khách Hàng (Customer Identity Protection):** Khi `Customer` gọi các tính năng tạo giao dịch (đăng ký gói tập, đăng ký PT), hệ thống **luôn lấy định danh từ phiên đăng nhập (`auth.user_id`)**, cấm tuyệt đối việc nhận `customer_id` do client gửi lên để ngăn chặn hành vi mạo danh (IDOR).
6. **Bảo vệ Tính Toàn Vẹn Lịch Hẹn Kép (Dual Overlap Elimination):** Tính năng đặt lịch tập PT bắt buộc phải kiểm tra và ngăn chặn trùng lịch cho **cả Huấn luyện viên lẫn Học viên** trong phạm vi nghiệp vụ được phê duyệt, bảo đảm chống race condition thông qua Database Transaction kết hợp PostgreSQL GiST Exclusion Constraints.
7. **Tuân thủ Vòng Đời Trạng Thái (Strict Lifecycle Transitions):** Các thực thể có vòng đời (`Gym`, `Gym_Manager`, `Gym_Trainer`, `Package`, `Membership`, `PT_Registration`, `PT_Appointment`, `Gym_Report`) chỉ được phép chuyển trạng thái theo đúng đồ hình được phê duyệt. Mọi nỗ lực chuyển trạng thái bất hợp pháp sẽ bị từ chối với lỗi `INVALID_STATUS_TRANSITION`.
8. **Transaction Boundary:** Mọi tính năng bao gồm nhiều thao tác ghi dữ liệu liên quan hoặc kiểm tra hạn mức chống race condition bắt buộc phải chạy trong **Database Transaction** (ACID).

---

## 3. Feature Catalog

### 3.1. Authentication & Account
- `FEAT-AUTH-001`: Register Customer Account
- `FEAT-AUTH-002`: Login User
- `FEAT-AUTH-003`: Logout User
- `FEAT-AUTH-004`: View Current User & Profile
- `FEAT-AUTH-005`: Update Personal Profile
- `FEAT-AUTH-006`: Change Password

### 3.2. Gym Management
- `FEAT-GYM-001`: View Public Gyms Directory
- `FEAT-GYM-002`: View Gym Detail
- `FEAT-GYM-003`: Create New Gym (Admin)
- `FEAT-GYM-004`: Update Gym Information
- `FEAT-GYM-005`: Update Gym Operational Status

### 3.3. Manager Management
- `FEAT-MGR-001`: Admin Provision Manager Account
- `FEAT-MGR-002`: View Gym Managers History
- `FEAT-MGR-003`: Assign Manager to Gym
- `FEAT-MGR-004`: Revoke Gym Manager

### 3.4. Trainer Management
- `FEAT-TRN-001`: View Gym Trainers Directory
- `FEAT-TRN-002`: View Trainer Detail
- `FEAT-TRN-003`: Assign/Hire Trainer to Gym
- `FEAT-TRN-004`: Update Trainer Status & Lifecycle

### 3.5. Package Management
- `FEAT-PKG-001`: View Gym Packages
- `FEAT-PKG-002`: View Package Detail
- `FEAT-PKG-003`: Create Gym Package
- `FEAT-PKG-004`: Update Package Details
- `FEAT-PKG-005`: Deactivate Package
- `FEAT-PKG-006`: Activate Package

### 3.6. Membership
- `FEAT-MEM-001`: Register Membership (Customer Self / Manager at Counter)
- `FEAT-MEM-002`: View Personal Memberships
- `FEAT-MEM-003`: View Gym Memberships List
- `FEAT-MEM-004`: View Membership Detail
- `FEAT-MEM-005`: Activate Membership at Counter
- `FEAT-MEM-006`: Suspend Membership
- `FEAT-MEM-007`: Terminate Membership

### 3.7. PT Registration
- `FEAT-PTR-001`: Register PT Service (Customer Self / Manager at Counter)
- `FEAT-PTR-002`: View Personal / PT Registrations
- `FEAT-PTR-003`: View Gym PT Registrations List
- `FEAT-PTR-004`: Reassign Trainer for Registration
- `FEAT-PTR-005`: Cancel PT Registration

### 3.8. PT Appointment
- `FEAT-APP-001`: Schedule PT Appointment (Dual Overlap Protected)
- `FEAT-APP-002`: View Personal Appointments
- `FEAT-APP-003`: View Gym Appointments Operational Board
- `FEAT-APP-004`: Reschedule PT Appointment
- `FEAT-APP-005`: Cancel PT Appointment
- `FEAT-APP-006`: Complete PT Appointment & Auto Quota Increment
- `FEAT-APP-007`: Mark Appointment No-Show

### 3.9. Gym Report
- `FEAT-REP-001`: Submit Gym Report (Max 1 Image)
- `FEAT-REP-002`: View Personal Reports
- `FEAT-REP-003`: View Gym Reports Queue
- `FEAT-REP-004`: Investigate Report
- `FEAT-REP-005`: Resolve Report
- `FEAT-REP-006`: Reject Report

### 3.10. Admin Operations
- `FEAT-ADM-001`: View System Users Directory
- `FEAT-ADM-002`: Update User Account Status (Suspend / Deactivate)

---

## 4. Đặc Tả Chi Tiết Từng Tính Năng (Feature Specifications)

---

### 4.1. Nhóm Authentication & Account

#### FEAT-AUTH-001: Register Customer Account
- **Feature ID:** `FEAT-AUTH-001`
- **Feature Name:** Đăng ký tài khoản khách hàng mới.
- **Purpose:** Cho phép khách vãng lai (`Guest`) tự khởi tạo tài khoản cá nhân để trở thành `Customer` trên hệ thống.
- **Actors:** `Guest`.
- **Preconditions:** Người dùng chưa đăng nhập, cung cấp email hợp lệ chưa tồn tại trên hệ thống.
- **Main Flow:**
  1. Người dùng nhập email, mật khẩu, họ tên đầy đủ và số điện thoại (tùy chọn) trên giao diện đăng ký.
  2. Hệ thống chuẩn hóa email (trim, lowercase) và kiểm tra email đã tồn tại trong CSDL chưa.
  3. Hệ thống băm mật khẩu bằng thuật toán Argon2id.
  4. Hệ thống mở Database Transaction:
     - Tạo bản ghi mới trong bảng `users` với `status = 'ACTIVE'`.
     - Tạo bản ghi hồ sơ trong `user_profiles` liên kết với `user_id`.
     - Gán vai trò `CUSTOMER` trong bảng `user_roles`.
     - Cam kết (Commit) Transaction.
  5. Hệ thống sinh JWT token chứa thông tin định danh và thiết lập HttpOnly Secure Cookie gửi về trình duyệt.
  6. Điều hướng người dùng tới Dashboard khách hàng.
- **Alternative Flows:**
  - *Email đã tồn tại:* Trả về lỗi `409 EMAIL_ALREADY_EXISTS`, yêu cầu đăng nhập hoặc dùng email khác.
  - *Dữ liệu không hợp lệ:* Trả về lỗi `400 VALIDATION_ERROR` kèm chi tiết các trường bị lỗi.
- **Business Rules:**
  - Mọi tài khoản tự đăng ký qua portal công khai mặc định chỉ được gán vai trò `CUSTOMER`. Không bao giờ tự động gán role quản trị.
- **Validation Rules:**
  - Email: đúng định dạng RFC 5322, tối đa 255 ký tự.
  - Password: tối thiểu 8 ký tự, tối đa 128 ký tự, có ít nhất 1 chữ hoa và 1 chữ số.
  - Full Name: từ 2 đến 100 ký tự.
- **Authorization:** Public (Unauthenticated).
- **State Changes:** Tạo `User` trạng thái `ACTIVE`.
- **Data Affected:** `users`, `user_profiles`, `user_roles`.
- **API Reference:** `POST /api/v1/auth/register`.
- **Transaction Requirement:** **BẮT BUỘC** (Đảm bảo tính nguyên tử giữa User, Profile và Role).
- **Error Cases:** `VALIDATION_ERROR` (400), `EMAIL_ALREADY_EXISTS` (409), `INTERNAL_SERVER_ERROR` (500).
- **Acceptance Criteria:**
  - Không lưu mật khẩu thô; băm Argon2id lưu tại `password_hash`.
  - Cookie trả về có đủ cờ `HttpOnly`, `Secure`, `SameSite=Lax`.
  - Không trả `password_hash` trong response JSON.

---

#### FEAT-AUTH-002: Login User
- **Feature ID:** `FEAT-AUTH-002`
- **Feature Name:** Đăng nhập hệ thống.
- **Purpose:** Xác thực danh tính người dùng qua email và mật khẩu, cấp phiên làm việc qua HttpOnly Cookie.
- **Actors:** `Guest` (Người dùng đã có tài khoản).
- **Preconditions:** Tài khoản đã tồn tại trên hệ thống.
- **Main Flow:**
  1. Người dùng nhập email và mật khẩu.
  2. Server chuẩn hóa email và truy vấn bảng `users` theo `lower(email)`.
  3. Server đối chiếu mật khẩu nhập vào với `password_hash` bằng thuật toán Argon2id.
  4. Server kiểm tra trạng thái tài khoản `status === 'ACTIVE'`.
  5. Server truy vấn danh sách `roles` từ bảng `user_roles`.
  6. Server sinh JWT token và gửi kèm trong Response Header `Set-Cookie`.
  7. Trả về thông tin cơ bản của User, Profile và Roles.
- **Alternative Flows:**
  - *Sai email hoặc mật khẩu:* Trả về thông báo lỗi chung `401 AUTH_INVALID_CREDENTIALS` (không tiết lộ email có tồn tại hay không).
  - *Tài khoản bị khóa:* Nếu `status` là `SUSPENDED` hoặc `DEACTIVATED`, trả về `403 AUTH_ACCOUNT_SUSPENDED`.
- **Business Rules:**
  - Áp dụng Rate Limiting tối đa 10 lần đăng nhập sai / phút / IP để chống brute-force.
- **Validation Rules:** Email hợp lệ, Password không được để trống.
- **Authorization:** Public.
- **State Changes:** Không thay đổi trạng thái dữ liệu (chỉ cấp phiên).
- **Data Affected:** Đọc `users`, `user_profiles`, `user_roles`, `roles`.
- **API Reference:** `POST /api/v1/auth/login`.
- **Transaction Requirement:** Không.
- **Error Cases:** `AUTH_INVALID_CREDENTIALS` (401), `AUTH_ACCOUNT_SUSPENDED` (403).
- **Acceptance Criteria:** Đăng nhập thành công trả về cookie hợp lệ; không lưu token vào LocalStorage.

---

#### FEAT-AUTH-003: Logout User
- **Feature ID:** `FEAT-AUTH-003`
- **Feature Name:** Đăng xuất hệ thống.
- **Purpose:** Hủy bỏ phiên làm việc của người dùng bằng cách xóa Cookie xác thực.
- **Actors:** Mọi Actor đã xác thực (`Customer`, `PT`, `Manager`, `Admin`).
- **Preconditions:** Đang có phiên đăng nhập hợp lệ.
- **Main Flow:**
  1. Client gửi yêu cầu đăng xuất.
  2. Server gửi header `Set-Cookie` với `Max-Age=0` và `Expires` về quá khứ để trình duyệt xóa cookie.
  3. Trả về thông báo đăng xuất thành công.
- **Authorization:** Authenticated.
- **API Reference:** `POST /api/v1/auth/logout`.
- **Acceptance Criteria:** Cookie `auth_token` bị xóa hoàn toàn khỏi trình duyệt sau request.

---

#### FEAT-AUTH-004: View Current User & Profile
- **Feature ID:** `FEAT-AUTH-004`
- **Feature Name:** Xem thông tin tài khoản và hồ sơ cá nhân hiện tại.
- **Purpose:** Cho phép ứng dụng client tải thông tin người dùng đăng nhập để điều hướng layout và hiển thị UI phù hợp.
- **Actors:** Mọi Actor đã xác thực.
- **Preconditions:** Phiên làm việc hợp lệ.
- **Main Flow:**
  1. Client gửi request kèm Cookie phiên.
  2. Server giải mã JWT, lấy `user_id`.
  3. Server truy vấn `users`, `user_profiles`, `roles`, và danh sách bổ nhiệm cơ sở đang hoạt động (`gym_managers` hoặc `gym_trainers` nếu có).
  4. Trả về thông tin tổng hợp.
- **API Reference:** `GET /api/v1/auth/me` và `GET /api/v1/users/me/profile`.
- **Acceptance Criteria:** Tuyệt đối không trả về `password_hash`.

---

#### FEAT-AUTH-005: Update Personal Profile
- **Feature ID:** `FEAT-AUTH-005`
- **Feature Name:** Cập nhật hồ sơ cá nhân.
- **Purpose:** Cho phép người dùng tự cập nhật họ tên, số điện thoại, ngày sinh, giới tính và ảnh đại diện của mình.
- **Actors:** Mọi Actor đã xác thực (Chính chủ).
- **Preconditions:** Tài khoản đang ở trạng thái `ACTIVE`.
- **Main Flow:**
  1. Người dùng nhập thông tin cập nhật trên trang Profile.
  2. Server xác thực dữ liệu qua Zod schema.
  3. Server cập nhật bảng `user_profiles` theo `user_id = auth.user_id` và gán `updated_at = now()`.
  4. Trả về hồ sơ đã cập nhật.
- **Validation Rules:** `gender IN ('MALE', 'FEMALE', 'OTHER')`, ngày sinh định dạng `YYYY-MM-DD`, số điện thoại hợp lệ.
- **API Reference:** `PATCH /api/v1/users/me/profile`.
- **Acceptance Criteria:** Người dùng chỉ có quyền sửa hồ sơ của chính mình; không thể sửa hồ sơ người khác (chống IDOR).

---

#### FEAT-AUTH-006: Change Password
- **Feature ID:** `FEAT-AUTH-006`
- **Feature Name:** Đổi mật khẩu tài khoản.
- **Purpose:** Cho phép người dùng chủ động đổi mật khẩu đăng nhập.
- **Actors:** Mọi Actor đã xác thực.
- **Preconditions:** Nhập đúng mật khẩu hiện tại.
- **Main Flow:**
  1. Người dùng nhập mật khẩu cũ và mật khẩu mới.
  2. Server xác minh mật khẩu cũ với `password_hash` hiện tại qua Argon2id.
  3. Nếu khớp, server băm mật khẩu mới bằng Argon2id và cập nhật vào bảng `users`.
  4. Trả về kết quả thành công.
- **Alternative Flows:** Nhập sai mật khẩu cũ $\rightarrow$ Trả về `401 AUTH_INVALID_CREDENTIALS`.
- **API Reference:** `POST /api/v1/auth/change-password`.
- **Acceptance Criteria:** Mật khẩu mới tuân thủ quy chuẩn độ mạnh mật khẩu; mật khẩu cũ không còn hiệu lực.

---

### 4.2. Nhóm Quản Lý Cơ Sở Phòng Gym (`Gym`)

#### FEAT-GYM-001: View Public Gyms Directory
- **Feature ID:** `FEAT-GYM-001`
- **Feature Name:** Duyệt danh mục phòng gym công khai.
- **Purpose:** Khách vãng lai và học viên tìm kiếm thông tin các chi nhánh phòng tập trong hệ thống.
- **Actors:** `Guest`, `Customer`, Mọi Roles.
- **Preconditions:** Không.
- **Main Flow:**
  1. Người dùng truy cập trang danh sách phòng gym kèm bộ lọc (tìm kiếm tên, địa chỉ, trang).
  2. Server lọc danh sách phòng tập có trạng thái `ACTIVE` (đối với khách thông thường) và phân trang.
  3. Trả về danh sách phòng tập kèm thông tin địa chỉ, hotline, mô tả.
- **API Reference:** `GET /api/v1/gyms`.
- **Acceptance Criteria:** Khách thông thường chỉ nhìn thấy các phòng gym `ACTIVE`.

---

#### FEAT-GYM-002: View Gym Detail
- **Feature ID:** `FEAT-GYM-002`
- **Feature Name:** Xem thông tin chi tiết một phòng gym.
- **Purpose:** Xem đầy đủ thông tin giới thiệu, địa chỉ, số điện thoại của một cơ sở cụ thể.
- **Actors:** `Guest`, Mọi Roles.
- **Preconditions:** Phòng gym tồn tại trong hệ thống.
- **API Reference:** `GET /api/v1/gyms/:gymId`.
- **Acceptance Criteria:** Nếu `gymId` không tồn tại, trả về `404 GYM_NOT_FOUND`.

---

#### FEAT-GYM-003: Create New Gym (Admin)
- **Feature ID:** `FEAT-GYM-003`
- **Feature Name:** Khởi tạo cơ sở phòng gym mới.
- **Purpose:** Quản trị viên toàn hệ thống (`Admin`) thiết lập chi nhánh phòng tập mới trên sàn.
- **Actors:** `Admin`.
- **Preconditions:** Tài khoản có quyền `ADMIN`.
- **Main Flow:**
  1. Admin điền tên chi nhánh, địa chỉ, số điện thoại, mô tả.
  2. Server kiểm tra quyền `ADMIN`.
  3. Tạo bản ghi mới trong bảng `gyms` với `status = 'ACTIVE'`.
  4. Trả về thông tin phòng gym vừa khởi tạo.
- **API Reference:** `POST /api/v1/gyms`.
- **Acceptance Criteria:** Chỉ duy nhất Role `ADMIN` được phép tạo cơ sở mới; các role khác bị từ chối với lỗi `403 FORBIDDEN`.

---

#### FEAT-GYM-004: Update Gym Information
- **Feature ID:** `FEAT-GYM-004`
- **Feature Name:** Cập nhật thông tin cơ sở phòng gym.
- **Purpose:** Cho phép Admin hoặc Manager đương nhiệm cập nhật tên, địa chỉ, số điện thoại chi nhánh.
- **Actors:** `Admin`, `Manager` (đang phụ trách chính cơ sở đó).
- **Preconditions:** Manager phải có bản ghi `gym_managers` trạng thái `ACTIVE` tại đúng `gymId`.
- **Main Flow:**
  1. Manager gửi thông tin cập nhật cho cơ sở mình phụ trách.
  2. Server kiểm tra quyền: Nếu là Manager, đối chiếu `gym_managers` với `user_id = auth.user_id AND gym_id = :gymId AND status = 'ACTIVE'`.
  3. Cập nhật dữ liệu vào bảng `gyms` và cập nhật `updated_at = now()`.
- **Alternative Flows:** Manager phòng gym A cố sửa thông tin phòng gym B $\rightarrow$ Trả về `403 GYM_SCOPE_FORBIDDEN`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId`.
- **Acceptance Criteria:** Bảo vệ ranh giới phòng tập tuyệt đối; cấm can thiệp chéo giữa các cơ sở.

---

#### FEAT-GYM-005: Update Gym Operational Status
- **Feature ID:** `FEAT-GYM-005`
- **Feature Name:** Quản lý trạng thái vận hành của phòng gym.
- **Purpose:** Chuyển đổi trạng thái chi nhánh: `ACTIVE` $\leftrightarrow$ `MAINTENANCE` $\rightarrow$ `CLOSED`.
- **Actors:** `Admin`.
- **Preconditions:** Role `ADMIN`.
- **Business Rules:** Khi Gym chuyển sang `CLOSED`, cơ sở ngừng hoạt động vĩnh viễn, không cho phép mở bán gói tập mới.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/status`.
- **Acceptance Criteria:** Chỉ Admin toàn sàn mới có thẩm quyền đổi trạng thái vận hành của cơ sở.

---

### 4.3. Nhóm Quản Lý Ban Điều Hành Cơ Sở (`Gym_Manager`)

#### FEAT-MGR-001: Admin Provision Manager Account
- **Feature ID:** `FEAT-MGR-001`
- **Feature Name:** Khởi tạo trọn gói tài khoản Quản Lý và bổ nhiệm vào Gym.
- **Purpose:** Admin tạo nhanh một tài khoản quản lý chi nhánh và gán quyền điều hành trong một thao tác duy nhất.
- **Actors:** `Admin`.
- **Preconditions:** Phòng gym mục tiêu đang tồn tại. Email của Manager chưa được sử dụng trên hệ thống.
- **Main Flow:**
  1. Admin nhập thông tin cơ sở `gym_id`, email, mật khẩu tạm thời, họ tên, số điện thoại của Manager.
  2. Server mở Database Transaction:
     - Tạo `User` với email và mật khẩu (Argon2id).
     - Tạo `User_Profile`.
     - Gán vai trò `MANAGER` vào bảng `user_roles`.
     - Kiểm tra nếu Gym đang có Manager `ACTIVE`, chuyển bản ghi cũ sang `REVOKED` và cập nhật `revoked_at = now()`.
     - Tạo bản ghi mới trong `gym_managers` với `status = 'ACTIVE'` và `assigned_at = now()`.
     - Commit Transaction.
  3. Trả về thông tin tài khoản Manager vừa được khởi tạo và bổ nhiệm.
- **Business Rules:**
  - **Quy tắc 1 Manager = 1 Gym:** Một User có vai trò `MANAGER` chỉ được có duy nhất 1 phân công `Gym_Manager` ở trạng thái `ACTIVE` tại một thời điểm trên toàn hệ thống.
  - Một phòng Gym tại một thời điểm chỉ có tối đa 1 Manager `ACTIVE` (tuân thủ Partial Unique Index `idx_uq_gym_managers_active_gym`).
- **API Reference:** `POST /api/v1/admin/managers/provision`.
- **Transaction Requirement:** **BẮT BUỘC** (Bảo đảm tính nguyên tử và duy nhất 1 Active Manager trên mỗi Gym).
- **Acceptance Criteria:** 
  - Đảm bảo partial unique index `idx_uq_gym_managers_active_gym` không bao giờ bị vi phạm.
  - Tài khoản mới tạo chỉ có đúng 1 phân công `gym_managers` trạng thái `ACTIVE` tại phòng gym được chỉ định.

---

#### FEAT-MGR-002: View Gym Managers History
- **Feature ID:** `FEAT-MGR-002`
- **Feature Name:** Xem lịch sử bổ nhiệm Quản lý phòng tập.
- **Purpose:** Theo dõi danh sách các Manager đương nhiệm và tiền nhiệm của cơ sở.
- **Actors:** `Admin`, `Manager` (của chính Gym đó).
- **API Reference:** `GET /api/v1/gyms/:gymId/managers`.
- **Acceptance Criteria:** Manager chỉ xem được lịch sử bổ nhiệm tại cơ sở mình phụ trách.

---

#### FEAT-MGR-003: Assign Manager to Gym
- **Feature ID:** `FEAT-MGR-003`
- **Feature Name:** Bổ nhiệm người dùng có sẵn làm Quản lý phòng gym.
- **Purpose:** Bổ nhiệm một tài khoản User đã tồn tại vào vị trí điều hành chi nhánh, bảo đảm tính toàn vẹn quyền hạn giữa bảng vai trò (`user_roles`) và bảng phân công cơ sở (`gym_managers`).
- **Actors:** `Admin`.
- **Preconditions:** Phòng gym mục tiêu tồn tại. Tài khoản User mục tiêu đã tồn tại trên hệ thống.
- **Main Flow:**
  1. Admin gửi yêu cầu bổ nhiệm với `gymId` trên URL và `user_id` của tài khoản mục tiêu trong request body.
  2. Server kiểm tra quyền `ADMIN` của người thực hiện.
  3. Server mở Database Transaction:
     - Kiểm tra phòng gym `gymId` tồn tại trong bảng `gyms`.
     - Kiểm tra User mục tiêu tồn tại trong bảng `users` và trạng thái tài khoản đang là `ACTIVE` (không bị `SUSPENDED` hoặc `DEACTIVATED`).
     - **Kiểm tra giới hạn 1 User = 1 Active Gym (Single Active Assignment Check):**
       + Server kiểm tra bảng `gym_managers` xem User mục tiêu hiện tại đã có bản ghi nào ở trạng thái `ACTIVE` tại bất kỳ phòng Gym nào khác hay chưa.
       + Nếu User **ĐÃ CÓ** phân công `ACTIVE` tại một Gym khác: **HỦY BỎ TRANSACTION VÀ TỪ CHỐI BỔ NHIỆM LẬP TỨC** với mã lỗi `409 USER_ALREADY_ACTIVE_MANAGER`.
       + **CẤM TUYỆT ĐỐI** việc server tự động revoke assignment ở Gym khác để "chuyển ngầm" Manager. Nếu Admin muốn điều chuyển, bắt buộc phải chủ động bãi nhiệm (revoke) Manager tại cơ sở cũ trước thông qua `FEAT-MGR-004`.
     - Kiểm tra User mục tiêu đã có vai trò `MANAGER` trong bảng `user_roles` hay chưa:
       + Nếu chưa có: Thực hiện gán vai trò `MANAGER` vào bảng `user_roles` cho User này ngay trong cùng transaction.
       + Nếu đã có: Giữ nguyên bản ghi vai trò hiện tại.
     - Kiểm tra nếu chính phòng gym `gymId` mục tiêu này đang có Manager ở trạng thái `ACTIVE`:
       + Chuyển trạng thái bản ghi `gym_managers` cũ của cơ sở này sang `REVOKED` và cập nhật `revoked_at = now()`.
     - Tạo bản ghi mới trong `gym_managers` với `user_id = :targetUserId`, `gym_id = :gymId`, `status = 'ACTIVE'`, `assigned_at = now()`.
     - Commit Transaction.
  4. Trả về thông tin bổ nhiệm thành công kèm chi tiết tài khoản và cơ sở phòng gym.
- **Alternative Flows:**
  - *User không tồn tại:* Trả về lỗi `404 USER_NOT_FOUND`.
  - *User bị khóa/vô hiệu hóa:* Trả về lỗi `403 AUTH_ACCOUNT_SUSPENDED` (không cho phép bổ nhiệm tài khoản không active).
  - *Gym không tồn tại:* Trả về lỗi `404 GYM_NOT_FOUND`.
  - *User đã là Manager ACTIVE tại Gym khác:* Trả về lỗi `409 USER_ALREADY_ACTIVE_MANAGER` ("User already has an ACTIVE Manager assignment at another Gym. Please revoke their current assignment before reassigning.").
- **Business Rules:**
  - **Quy tắc 1-1 Hai Chiều (1 User MANAGER = 1 Gym ACTIVE):** Một người dùng có vai trò `MANAGER` chỉ được phép có tối đa 1 phân công `gym_managers` ở trạng thái `ACTIVE` tại một thời điểm trên toàn hệ thống.
  - Quản lý không được phép đồng thời điều hành nhiều phòng Gym.
  - Không tự động revoke phân công ở cơ sở khác khi bổ nhiệm; bảo đảm tính tường minh của hành động quản trị.
  - Một phòng gym tại một thời điểm chỉ có tối đa 1 Manager `ACTIVE` (tuân thủ Partial Unique Index `idx_uq_gym_managers_active_gym`).
- **Validation Rules:** `user_id` là UUID hợp lệ.
- **Authorization:** Authenticated, Bắt buộc Role `ADMIN`.
- **State Changes:** 
  - `gym_managers` (cũ tại Gym này nếu có): `ACTIVE` $\rightarrow$ `REVOKED`.
  - `gym_managers` (mới tại Gym này): Khởi tạo với trạng thái `ACTIVE`.
  - `user_roles`: Thêm bản ghi `MANAGER` (nếu chưa tồn tại).
- **Data Affected:** `gyms` (read), `users` (read/check status), `user_roles` (insert if missing), `gym_managers` (check active across all gyms, update old of target gym, insert new).
- **API Reference:** `POST /api/v1/gyms/:gymId/managers/assign`.
- **Transaction Requirement:** **BẮT BUỘC** (Đảm bảo tính nguyên tử giữa: kiểm tra active manager toàn sàn của User, kiểm tra trạng thái tài khoản, gán role `MANAGER` vào `user_roles`, thu hồi Manager cũ của Gym, và tạo bản ghi `Gym_Manager` mới).
- **Error Cases:** `GYM_NOT_FOUND` (404), `USER_NOT_FOUND` (404), `AUTH_ACCOUNT_SUSPENDED` (403), `USER_ALREADY_ACTIVE_MANAGER` (409), `FORBIDDEN` (403).
- **Acceptance Criteria:**
  - Nếu User đang là Manager `ACTIVE` tại bất kỳ Gym nào khác, thao tác bổ nhiệm bị từ chối 100%, không có dữ liệu nào bị thay đổi.
  - Sau khi transaction commit thành công, User được bổ nhiệm đảm bảo có đồng thời:
    1. Persisted role `MANAGER` trong `user_roles`.
    2. Duy nhất 1 bản ghi `gym_managers` với `status = 'ACTIVE'` tại đúng cơ sở `gym_id` mục tiêu.
  - Nếu cơ sở phòng gym đã có Manager `ACTIVE` trước đó, bản ghi cũ của cơ sở này phải được chuyển sang `REVOKED` và cập nhật `revoked_at = now()`.
  - Partial Unique Index `idx_uq_gym_managers_active_gym` không bao giờ bị vi phạm.
  - Nếu bất kỳ bước nào thất bại, toàn bộ transaction bị rollback lập tức, không để lại dữ liệu dở dang.

---

#### FEAT-MGR-004: Revoke Gym Manager
- **Feature ID:** `FEAT-MGR-004`
- **Feature Name:** Bãi nhiệm Quản lý cơ sở.
- **Purpose:** Tước quyền điều hành phòng tập của một Manager tại cơ sở cụ thể, đưa số lượng assignment ACTIVE của User về 0, giải phóng tài khoản để điều chuyển hoặc thôi nhiệm vụ.
- **Actors:** `Admin`.
- **Main Flow:**
  1. Admin gửi yêu cầu bãi nhiệm với `gymId` và `managerId` (ID bản ghi `gym_managers`).
  2. Server kiểm tra quyền `ADMIN`.
  3. Server cập nhật bản ghi `gym_managers` mục tiêu: chuyển trạng thái từ `ACTIVE` sang `REVOKED`, cập nhật `revoked_at = now()`.
  4. Trả về thông tin bản ghi đã bị thu hồi quyền.
- **Business Rules:**
  - Sau khi bị bãi nhiệm, tài khoản User đó có 0 phân công `ACTIVE`. Khi đó và chỉ khi đó, Admin mới có thể bổ nhiệm User này sang cơ sở Gym khác nếu cần.
  - Thao tác revoke không tự động xóa vai trò `MANAGER` trong `user_roles`, nhưng User sẽ không còn bất kỳ Gym Scope nào để truy cập hay thao tác dữ liệu.
- **API Reference:** `POST /api/v1/gyms/:gymId/managers/:managerId/revoke`.
- **Acceptance Criteria:** Sau khi bị bãi nhiệm, tài khoản không còn quyền truy cập dữ liệu của phòng gym đó nữa (`403 GYM_SCOPE_FORBIDDEN`).

---

### 4.4. Nhóm Quản Lý Huấn Luyện Viên (`Gym_Trainer`)

#### FEAT-TRN-001: View Gym Trainers Directory
- **Feature ID:** `FEAT-TRN-001`
- **Feature Name:** Duyệt danh sách Huấn luyện viên của phòng gym.
- **Purpose:** Học viên xem danh sách PT đang giảng dạy tại chi nhánh để chọn người hướng dẫn.
- **Actors:** `Guest`, `Customer`, Mọi Roles.
- **Main Flow:** Trả về danh sách PT có hợp đồng `ACTIVE` tại cơ sở `:gymId`.
- **API Reference:** `GET /api/v1/gyms/:gymId/trainers`.
- **Acceptance Criteria:** Khách chỉ thấy PT `ACTIVE`. Manager/Admin xem được cả PT `ON_LEAVE` và `TERMINATED`.

---

#### FEAT-TRN-002: View Trainer Detail
- **Feature ID:** `FEAT-TRN-002`
- **Feature Name:** Xem chi tiết hồ sơ Huấn luyện viên.
- **Purpose:** Xem thông tin giới thiệu, hình ảnh, kinh nghiệm của PT tại phòng tập.
- **API Reference:** `GET /api/v1/gyms/:gymId/trainers/:trainerId`.

---

#### FEAT-TRN-003: Assign/Hire Trainer to Gym
- **Feature ID:** `FEAT-TRN-003`
- **Feature Name:** Tiếp nhận Huấn luyện viên vào cơ sở.
- **Purpose:** Ban Quản Lý ký hợp đồng và gán một User làm PT trực thuộc phòng gym.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Preconditions:** User tồn tại; chưa có hợp đồng `ACTIVE` tại phòng gym này.
- **Main Flow:**
  1. Mở Transaction:
     - Gán vai trò `PT` trong bảng `user_roles` (nếu chưa có).
     - Tạo bản ghi trong `gym_trainers` với `status = 'ACTIVE'`, `hired_at = now()`.
     - Commit Transaction.
- **API Reference:** `POST /api/v1/gyms/:gymId/trainers`.
- **Transaction Requirement:** **BẮT BUỘC**.
- **Error Cases:** `409 TRAINER_ALREADY_ASSIGNED` nếu PT đã có hợp đồng hoạt động tại chi nhánh.

---

#### FEAT-TRN-004: Update Trainer Status & Lifecycle
- **Feature ID:** `FEAT-TRN-004`
- **Feature Name:** Cập nhật trạng thái công tác của Huấn luyện viên.
- **Purpose:** Quản lý vòng đời làm việc của PT: cho nghỉ phép, tiếp nhận lại hoặc chấm dứt hợp đồng.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Quy tắc chuyển trạng thái (State Transition Invariant):**
  - Hợp lệ: `ACTIVE` $\leftrightarrow$ `ON_LEAVE`, `ACTIVE` $\rightarrow$ `TERMINATED`, `ON_LEAVE` $\rightarrow$ `TERMINATED`.
  - Bất hợp lệ: `TERMINATED` $\rightarrow$ `ACTIVE` hoặc `TERMINATED` $\rightarrow$ `ON_LEAVE`.
- **Alternative Flows:** Cố tình chuyển từ `TERMINATED` sang trạng thái khác $\rightarrow$ Trả về `409 INVALID_STATUS_TRANSITION`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/trainers/:trainerId/status`.
- **Acceptance Criteria:** Chấm dứt hợp đồng cập nhật `terminated_at = now()`; PT bị terminate không thể nhận học viên mới.

---

### 4.5. Nhóm Gói Dịch Vụ Tập Luyện (`Package`)

#### FEAT-PKG-001: View Gym Packages
- **Feature ID:** `FEAT-PKG-001`
- **Feature Name:** Xem danh sách gói tập của phòng gym.
- **Purpose:** Khách hàng tham khảo các sản phẩm thẻ tập và dịch vụ PT của cơ sở.
- **Actors:** `Guest`, `Customer`, Mọi Roles.
- **API Reference:** `GET /api/v1/gyms/:gymId/packages`.
- **Acceptance Criteria:** Khách chỉ xem được gói `ACTIVE`. Manager xem được cả gói `INACTIVE`.

---

#### FEAT-PKG-002: View Package Detail
- **Feature ID:** `FEAT-PKG-002`
- **Feature Name:** Xem chi tiết gói tập.
- **Purpose:** Xem chi tiết giá, thời hạn sử dụng và quyền lợi số buổi PT đi kèm của gói tập.
- **API Reference:** `GET /api/v1/gyms/:gymId/packages/:packageId`.

---

#### FEAT-PKG-003: Create Gym Package
- **Feature ID:** `FEAT-PKG-003`
- **Feature Name:** Tạo mới gói tập tại cơ sở.
- **Purpose:** Ban Quản Lý thiết kế và ban hành gói dịch vụ tập luyện mới cho phòng tập mình phụ trách.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Validation Rules:** `price >= 0`, `duration_days > 0`, `pt_session_count >= 0`.
- **API Reference:** `POST /api/v1/gyms/:gymId/packages`.
- **Acceptance Criteria:** Gói tạo ra gắn liền với `gym_id` của cơ sở; Manager chi nhánh khác không được tạo hộ.

---

#### FEAT-PKG-004: Update Package Details
- **Feature ID:** `FEAT-PKG-004`
- **Feature Name:** Cập nhật thông tin gói tập.
- **Purpose:** Chỉnh sửa tên, mô tả, giá hoặc thời lượng của gói tập.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **API Reference:** `PATCH /api/v1/gyms/:gymId/packages/:packageId`.

---

#### FEAT-PKG-005: Deactivate Package
- **Feature ID:** `FEAT-PKG-005`
- **Feature Name:** Ngừng mở bán gói tập.
- **Purpose:** Đóng gói tập không còn kinh doanh. Gói chuyển sang `INACTIVE`.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Business Rules:** Các hội viên đã mua gói trước đó vẫn tiếp tục sử dụng đến khi hết hạn hợp đồng. Không cho phép hội viên mới đăng ký gói `INACTIVE`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/packages/:packageId/deactivate`.

---

#### FEAT-PKG-006: Activate Package
- **Feature ID:** `FEAT-PKG-006`
- **Feature Name:** Mở bán lại gói tập.
- **Purpose:** Đưa gói tập đang `INACTIVE` quay trở lại trạng thái `ACTIVE` để hội viên đăng ký.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **API Reference:** `PATCH /api/v1/gyms/:gymId/packages/:packageId/activate`.

---

### 4.6. Nhóm Hợp Đồng Hội Viên (`Membership`)

#### FEAT-MEM-001: Register Membership (Customer Self / Manager at Counter)
- **Feature ID:** `FEAT-MEM-001`
- **Feature Name:** Đăng ký hợp đồng hội viên mới.
- **Purpose:** Khách hàng tự đăng ký gói tập trực tuyến hoặc Quản lý làm thủ tục đăng ký cho khách tại quầy.
- **Actors:** `Customer` (Tự đăng ký), `Manager` (Đăng ký hộ tại quầy), `Admin`.
- **Preconditions:** Gói tập đang ở trạng thái `ACTIVE` và thuộc đúng phòng tập `gymId`.
- **Main Flow:**
  1. Xác định định danh khách hàng:
     - Nếu Actor là `Customer`: `user_id` **bắt buộc lấy từ `auth.user_id`**. Bỏ qua hoặc chặn nếu payload chứa `customer_id` khác.
     - Nếu Actor là `Manager`: Request body **bắt buộc phải truyền `customer_id`** của học viên. Kiểm tra `customer_id` tồn tại với role `CUSTOMER`.
  2. Server kiểm tra ràng buộc Composite: Cặp `(package_id, gym_id)` phải khớp chính xác gói tập thuộc cơ sở đó.
  3. Tính toán ngày hết hạn: $\text{end\_date} = \text{start\_date} + \text{Package.duration\_days}$.
  4. Tạo bản ghi mới trong `memberships` với `status = 'PENDING_ACTIVATION'`.
  5. Trả về thông tin hợp đồng vừa tạo.
- **Alternative Flows:**
  - *Customer cố tạo hộ người khác:* Trả về `403 RESOURCE_OWNERSHIP_FORBIDDEN`.
  - *Gói tập đã ngừng bán:* Trả về `409 PACKAGE_INACTIVE`.
  - *Gói tập thuộc cơ sở khác:* Trả về `422 MEMBERSHIP_INVALID_GYM`.
- **API Reference:** `POST /api/v1/gyms/:gymId/memberships`.
- **Acceptance Criteria:** Hợp đồng khởi tạo luôn ở trạng thái `PENDING_ACTIVATION` (không tự động kích hoạt nếu chưa có thủ tục quầy); Composite FK bảo vệ tuyệt đối tính nhất quán giữa Package và Gym.

---

#### FEAT-MEM-002: View Personal Memberships
- **Feature ID:** `FEAT-MEM-002`
- **Feature Name:** Xem danh sách thẻ hội viên của chính mình.
- **Purpose:** Customer theo dõi các hợp đồng tập luyện đã đăng ký, thời hạn còn lại và trạng thái thẻ.
- **Actors:** `Customer`.
- **Main Flow:** Truy vấn bảng `memberships` với điều kiện `user_id = auth.user_id`.
- **API Reference:** `GET /api/v1/memberships/me`.
- **Acceptance Criteria:** Customer chỉ nhìn thấy thẻ của chính mình, không thấy thẻ của người khác.

---

#### FEAT-MEM-003: View Gym Memberships List
- **Feature ID:** `FEAT-MEM-003`
- **Feature Name:** Quản lý danh sách hội viên cơ sở phòng tập.
- **Purpose:** Ban Quản Lý kiểm tra, lọc và tìm kiếm toàn bộ hợp đồng hội viên tại chi nhánh mình phụ trách.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Query Filters:** `page`, `pageSize`, `status` (`PENDING_ACTIVATION`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `TERMINATED`), `search`.
- **API Reference:** `GET /api/v1/gyms/:gymId/memberships`.
- **Acceptance Criteria:** Manager Gym A không thể xem danh sách hội viên của Gym B (`403 GYM_SCOPE_FORBIDDEN`).

---

#### FEAT-MEM-004: View Membership Detail
- **Feature ID:** `FEAT-MEM-004`
- **Feature Name:** Xem chi tiết một hợp đồng hội viên.
- **Purpose:** Xem chi tiết ngày bắt đầu, ngày kết thúc, gói tập và thông tin hội viên.
- **Actors:** Chính chủ `Customer`, `Manager` của cơ sở sở hữu hợp đồng, `Admin`.
- **API Reference:** `GET /api/v1/memberships/:membershipId`.
- **Acceptance Criteria:** Customer khác cố tình truy cập ID thẻ người khác sẽ nhận lỗi `403 RESOURCE_OWNERSHIP_FORBIDDEN` hoặc `404 NOT_FOUND`.

---

#### FEAT-MEM-005: Activate Membership at Counter
- **Feature ID:** `FEAT-MEM-005`
- **Feature Name:** Kích hoạt hợp đồng hội viên tại quầy.
- **Purpose:** Lễ tân/Quản lý đối soát thủ tục tại quầy và kích hoạt thẻ để hội viên bắt đầu vào tập.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **State Change:** `PENDING_ACTIVATION` $\rightarrow$ `ACTIVE` (hoặc `SUSPENDED` $\rightarrow$ `ACTIVE`).
- **Alternative Flows:** Hợp đồng đang `EXPIRED` hoặc `TERMINATED` $\rightarrow$ Trả về `409 INVALID_STATUS_TRANSITION`.
- **API Reference:** `PATCH /api/v1/memberships/:membershipId/activate`.
- **Acceptance Criteria:** Chỉ hợp đồng `ACTIVE` mới đủ điều kiện check-in vào cửa phòng gym.

---

#### FEAT-MEM-006: Suspend Membership
- **Feature ID:** `FEAT-MEM-006`
- **Feature Name:** Bảo lưu hợp đồng hội viên.
- **Purpose:** Ban Quản Lý thực hiện thủ tục bảo lưu thẻ theo nguyện vọng của học viên hoặc chính sách cơ sở.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Preconditions:** Hợp đồng đang ở trạng thái `ACTIVE`.
- **State Change:** `ACTIVE` $\rightarrow$ `SUSPENDED`.
- **API Reference:** `PATCH /api/v1/memberships/:membershipId/suspend`.
- **Acceptance Criteria:** Khi đang ở trạng thái `SUSPENDED`, hội viên tạm thời không thể check-in vào tập.

---

#### FEAT-MEM-007: Terminate Membership
- **Feature ID:** `FEAT-MEM-007`
- **Feature Name:** Chấm dứt hợp đồng hội viên trước hạn.
- **Purpose:** Hủy bỏ hợp đồng hội viên do vi phạm nội quy phòng tập hoặc bồi hoàn ngoài quầy.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **State Change:** `ACTIVE` / `SUSPENDED` / `PENDING_ACTIVATION` $\rightarrow$ `TERMINATED`.
- **API Reference:** `PATCH /api/v1/memberships/:membershipId/terminate`.
- **Acceptance Criteria:** Trạng thái `TERMINATED` là trạng thái kết thúc (Final State), không thể hoàn tác.

---

### 4.7. Nhóm Đăng Ký Dịch Vụ Huấn Luyện Viên (`PT_Registration`)

#### FEAT-PTR-001: Register PT Service (Customer Self / Manager at Counter)
- **Feature ID:** `FEAT-PTR-001`
- **Feature Name:** Đăng ký dịch vụ huấn luyện viên cá nhân.
- **Purpose:** Mua gói buổi tập và chỉ định Huấn luyện viên phụ trách hướng dẫn học viên.
- **Actors:** `Customer` (Tự đăng ký), `Manager` (Đăng ký hộ tại quầy), `Admin`.
- **Preconditions:** Huấn luyện viên được chọn phải có hợp đồng `ACTIVE` tại phòng gym `gymId`.
- **Main Flow:**
  1. Xác định Customer: Nếu là Customer gọi API thì lấy `auth.user_id`; nếu là Manager gọi API thì bắt buộc lấy `customer_id` từ body.
  2. Server kiểm tra Composite FK `(trainer_id, gym_id)` trong bảng `gym_trainers` (PT phải trực thuộc đúng Gym).
  3. Tạo bản ghi mới trong `pt_registrations` với:
     - `total_sessions` theo yêu cầu ($> 0$).
     - `completed_sessions = 0`.
     - `status = 'ASSIGNED'`.
  4. Trả về thông tin đăng ký dịch vụ PT.
- **Alternative Flows:** PT đang `ON_LEAVE` hoặc `TERMINATED` $\rightarrow$ Trả về `409 TRAINER_NOT_ACTIVE`.
- **API Reference:** `POST /api/v1/gyms/:gymId/pt-registrations`.
- **Acceptance Criteria:** Chặn đứng lỗi gán PT của Gym A hướng dẫn học viên tại Gym B nhờ Composite Constraint.

---

#### FEAT-PTR-002: View Personal / PT Registrations
- **Feature ID:** `FEAT-PTR-002`
- **Feature Name:** Xem danh sách hợp đồng PT cá nhân.
- **Purpose:** Customer xem tiến độ số buổi tập của mình; PT xem danh sách các học viên mình đang phụ trách giảng dạy.
- **Actors:** `Customer`, `PT`.
- **Main Flow:**
  - Nếu là Customer: Lọc `customer_id = auth.user_id`.
  - Nếu là PT: Lọc `trainer_id IN (SELECT id FROM gym_trainers WHERE user_id = auth.user_id)`.
- **API Reference:** `GET /api/v1/pt-registrations/me`.
- **Acceptance Criteria:** PT chỉ thấy học viên được phân công cho mình; không thấy học viên của PT khác.

---

#### FEAT-PTR-003: View Gym PT Registrations List
- **Feature ID:** `FEAT-PTR-003`
- **Feature Name:** Quản lý toàn bộ đăng ký PT tại cơ sở.
- **Purpose:** Ban Quản Lý theo dõi phân bổ công việc của các PT và tiến độ hoàn thành ca tập tại chi nhánh.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **API Reference:** `GET /api/v1/gyms/:gymId/pt-registrations`.

---

#### FEAT-PTR-004: Reassign Trainer for Registration
- **Feature ID:** `FEAT-PTR-004`
- **Feature Name:** Đổi Huấn luyện viên phụ trách cho học viên (Reassign Trainer).
- **Purpose:** Ban Quản Lý chỉ định Huấn luyện viên mới cho hợp đồng đăng ký dịch vụ PT khi PT cũ nghỉ việc, tạm nghỉ phép hoặc theo yêu cầu đổi PT của học viên, đảm bảo tính toàn vẹn dữ liệu ca tập và không gây mâu thuẫn lịch hẹn.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Preconditions:**
  - Hợp đồng `PT_Registration` tồn tại và đang ở trạng thái `ASSIGNED` hoặc `IN_PROGRESS`.
  - Huấn luyện viên mới (`new_trainer_id`) phải đang ở trạng thái `ACTIVE` tại chính phòng gym đó.
  - `new_trainer_id` phải khác với `trainer_id` hiện tại của hợp đồng.
- **Main Flow:**
  1. Manager gửi yêu cầu đổi PT với `gymId`, `registrationId` trên URL và `new_trainer_id` trong request body.
  2. Server kiểm tra quyền Manager đang `ACTIVE` tại cơ sở `gymId`.
  3. Server mở Database Transaction:
     - Khóa dòng bản ghi `pt_registrations` bằng `SELECT ... FOR UPDATE`.
     - Kiểm tra `new_trainer_id` có tồn tại và đang `ACTIVE` tại `gymId` trong bảng `gym_trainers`.
     - **Kiểm tra bắt buộc các lịch hẹn đang SCHEDULED của PT cũ:**
       Server truy vấn bảng `pt_appointments` tìm các ca tập thuộc `registration_id` này đang ở trạng thái `SCHEDULED`.
       + **Quy tắc an toàn nghiệp vụ:** Nếu còn **bất kỳ ca tập nào đang ở trạng thái `SCHEDULED` của PT cũ**, hệ thống **TỪ CHỐI THỰC HIỆN REASSIGN** và trả về mã lỗi `409 ACTIVE_APPOINTMENTS_EXIST`.
       + **Tuyệt đối không tự động chuyển `trainer_id` của các appointment cũ sang PT mới** (nhằm ngăn ngừa nguy cơ xung đột lịch dạy của PT mới, vi phạm thỏa thuận ca tập, hoặc làm sai lệch lịch trình).
     - Khi hợp đồng không còn ca tập nào ở trạng thái `SCHEDULED` (toàn bộ ca tập cũ đã được hoàn thành `COMPLETED`, đánh dấu vắng `NO_SHOW`, hoặc đã được chủ động hủy `CANCELLED` trước đó):
       + Cập nhật `trainer_id = :newTrainerId` trong bản ghi `pt_registrations`.
       + Cập nhật `updated_at = now()`.
       + Commit Transaction.
  4. Trả về thông tin hợp đồng `PT_Registration` đã được cập nhật PT mới thành công.
- **Alternative Flows:**
  - *Còn ca tập SCHEDULED của PT cũ:* Hệ thống từ chối đổi PT, trả về lỗi `409 ACTIVE_APPOINTMENTS_EXIST` ("Cannot reassign trainer while active SCHEDULED appointments exist with the current trainer. Please cancel or complete existing appointments before reassigning.").
  - *Huấn luyện viên mới không hợp lệ:* Nếu PT mới không thuộc phòng gym hoặc đang `ON_LEAVE` / `TERMINATED` $\rightarrow$ Trả về `409 TRAINER_NOT_ACTIVE` hoặc `422 PT_TRAINER_INVALID_GYM`.
  - *Trùng PT hiện tại:* `new_trainer_id` trùng với `trainer_id` hiện tại $\rightarrow$ Trả về `400 VALIDATION_ERROR`.
- **Business Rules:**
  - **Không tự động chuyển lịch hẹn cũ sang PT mới:** Tuyệt đối không tự động update `trainer_id` của các ca tập `SCHEDULED` cũ sang PT mới. Mỗi ca tập phải do học viên và PT mới chủ động thống nhất lại khung giờ khả dụng.
  - **Bảo toàn lịch sử buổi tập đã diễn ra:** Các buổi tập đã hoàn thành (`COMPLETED`) hoặc vắng mặt (`NO_SHOW`) trong quá khứ gắn với PT cũ là dữ liệu lịch sử phản ánh đúng thực tế, không bị thay đổi người hướng dẫn.
  - **Ngăn chặn trạng thái bất nhất (Anti-Inconsistency Invariant):** Không cho phép hoàn tất Reassign khi vẫn còn ca tập `SCHEDULED` của PT cũ. Điều này bảo vệ 100% tính toàn vẹn quan hệ giữa Hợp đồng PT và Lịch hẹn ca tập, ngăn ngừa vi phạm ràng buộc Composite Foreign Key `fk_pt_appointments_registration_composite`.
- **Validation Rules:** `new_trainer_id` là UUID hợp lệ.
- **Authorization:** Authenticated, Role `ADMIN` hoặc `MANAGER` của đúng `gymId`.
- **State Changes:** Cập nhật trường `trainer_id` trong `pt_registrations`. Trạng thái của hợp đồng giữ nguyên (`ASSIGNED` hoặc `IN_PROGRESS`).
- **Data Affected:** `pt_registrations` (update `trainer_id`), `gym_trainers` (verify status), `pt_appointments` (check count of `SCHEDULED`).
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-registrations/:id/assign`.
- **Transaction Requirement:** **BẮT BUỘC** (Bảo đảm việc kiểm tra các ca tập `SCHEDULED` và cập nhật PT mới diễn ra nguyên tử, chống race condition đặt lịch song song).
- **Error Cases:** `TRAINER_NOT_FOUND` (404), `TRAINER_NOT_ACTIVE` (409), `PT_TRAINER_INVALID_GYM` (422), `ACTIVE_APPOINTMENTS_EXIST` (409), `GYM_SCOPE_FORBIDDEN` (403), `VALIDATION_ERROR` (400).
- **Acceptance Criteria:**
  - Nếu hợp đồng còn ít nhất 1 ca tập `SCHEDULED` của PT cũ, request Reassign bị từ chối 100%, không thay đổi dữ liệu.
  - Hệ thống không tự ý chuyển `trainer_id` của các ca tập cũ sang PT mới.
  - Sau khi đổi PT thành công, các lịch hẹn mới được tạo sau thời điểm này sẽ thuộc về PT mới; các lịch hẹn trong quá khứ (`COMPLETED`, `NO_SHOW`, `CANCELLED`) giữ nguyên vẹn thông tin PT cũ.
  - Ràng buộc toàn vẹn Composite `(registration_id, customer_id, trainer_id, gym_id)` giữa Registration và Appointments luôn được bảo đảm tính nhất quán.

---

#### FEAT-PTR-005: Cancel PT Registration
- **Feature ID:** `FEAT-PTR-005`
- **Feature Name:** Hủy hợp đồng đăng ký dịch vụ huấn luyện viên.
- **Purpose:** Hủy bỏ gói tập PT theo thỏa thuận hoặc do vi phạm.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **State Change:** Chuyển trạng thái sang `CANCELLED`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-registrations/:id/cancel`.

---

### 4.8. Nhóm Lịch Hẹn Ca Tập Huấn Luyện Viên (`PT_Appointment`)

#### FEAT-APP-001: Schedule PT Appointment (Dual Overlap Protected)
- **Feature ID:** `FEAT-APP-001`
- **Feature Name:** Đặt lịch hẹn ca tập PT cá nhân.
- **Purpose:** Học viên hoặc PT lên lịch một buổi tập cụ thể tại phòng gym trong một khung giờ xác định.
- **Actors:** `Customer` (sở hữu đăng ký), `PT` (phụ trách), `Manager`.
- **Preconditions:**
  - Hợp đồng `PT_Registration` đang ở trạng thái `ASSIGNED` hoặc `IN_PROGRESS`.
  - Khung giờ hợp lệ: `start_time < end_time` và `start_time > now()`.
- **Main Flow:**
  1. Người dùng chọn khung giờ tập (bắt đầu và kết thúc) cho hợp đồng `registration_id`.
  2. Server mở Database Transaction:
     - Khóa bản ghi `pt_registrations` bằng cú pháp `SELECT ... FOR UPDATE`.
     - Tính toán số buổi khả dụng: Đảm bảo $\text{completed\_sessions} + \text{active\_scheduled\_appointments} < \text{total\_sessions}$.
     - Kiểm tra toàn vẹn: Trích xuất `customer_id`, `trainer_id`, `gym_id` từ `pt_registrations` gốc để đảm bảo tính nhất quán dữ liệu.
     - Thực hiện `INSERT INTO pt_appointments` với trạng thái `SCHEDULED`.
  3. Động cơ PostgreSQL tự động kích hoạt **Hai Ràng Buộc Loại Trừ GiST (Dual Exclusion Constraints)**:
     - `ex_pt_appointments_trainer_no_overlap`: Kiểm tra trùng lịch PT.
     - `ex_pt_appointments_customer_no_overlap`: Kiểm tra trùng lịch Customer.
     *(Lưu ý: Không tự động coi Database Exclusion Constraint là Business Rule. Phạm vi kiểm tra trùng lịch được Domain Rules phê duyệt là trong phạm vi cơ sở phòng Gym đối với PT và chống trùng lịch đối với Customer; câu hỏi kiểm tra toàn hệ thống hay chỉ trong cùng Gym hiện là Open Question).*
  4. Nếu cả 2 ràng buộc đều hợp lệ:
     - Transaction Commit thành công.
     - Trả về thông tin buổi hẹn `201 Created`.
- **Alternative Flows:**
  - *PT bị trùng lịch:* DB kích hoạt lỗi Exclusion Constraint của Trainer $\rightarrow$ Rollback Transaction $\rightarrow$ Trả về `409 APPOINTMENT_TRAINER_SLOT_CONFLICT`.
  - *Học viên bị trùng lịch:* DB kích hoạt lỗi Exclusion Constraint của Customer $\rightarrow$ Rollback Transaction $\rightarrow$ Trả về `409 APPOINTMENT_CUSTOMER_SLOT_CONFLICT`.
  - *Gói tập hết buổi:* Trả về `409 PT_SESSIONS_EXHAUSTED`.
  - *Thời gian không hợp lệ:* `end_time <= start_time` $\rightarrow$ Trả về `400 INVALID_TIME_RANGE`.
- **API Reference:** `POST /api/v1/gyms/:gymId/pt-appointments`.
- **Transaction Requirement:** **BẮT BUỘC** (Khóa dòng chống race condition đặt vượt số buổi và bảo vệ ACID).
- **Acceptance Criteria:** Tuyệt đối không xảy ra tình trạng 1 PT hoặc 1 Customer có 2 buổi tập `SCHEDULED` giao thoa thời gian trong bất kỳ điều kiện tải đồng thời nào trong phạm vi đã được Domain phê duyệt.

---

#### FEAT-APP-002: View Personal Appointments
- **Feature ID:** `FEAT-APP-002`
- **Feature Name:** Xem lịch tập cá nhân.
- **Purpose:** Customer xem lịch tập sắp tới của mình; PT xem lịch dạy trong tuần/tháng.
- **Actors:** `Customer`, `PT`.
- **API Reference:** `GET /api/v1/pt-appointments/me`.
- **Acceptance Criteria:** Dữ liệu phân quyền nghiêm ngặt theo cá nhân.

---

#### FEAT-APP-003: View Gym Appointments Operational Board
- **Feature ID:** `FEAT-APP-003`
- **Feature Name:** Giám sát bảng vận hành lịch tập tại phòng gym.
- **Purpose:** Ban Quản Lý theo dõi mật độ các ca tập PT trong ngày tại cơ sở để sắp xếp không gian sàn tập.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **API Reference:** `GET /api/v1/gyms/:gymId/pt-appointments`.

---

#### FEAT-APP-004: Reschedule PT Appointment
- **Feature ID:** `FEAT-APP-004`
- **Feature Name:** Dời lịch hẹn ca tập sang giờ mới.
- **Purpose:** Thay đổi thời gian buổi tập khi có việc đột xuất.
- **Actors:** `Customer`, `PT`, `Manager`.
- **Preconditions:** Buổi tập đang ở trạng thái `SCHEDULED` và dời lịch trước thời điểm bắt đầu tối thiểu 2 giờ.
- **Main Flow:** Cập nhật `start_time` và `end_time` mới trong Transaction; PostgreSQL kích hoạt lại cả 2 ràng buộc GiST chống trùng lịch PT và Customer.
- **Alternative Flows:** Trùng lịch mới $\rightarrow$ Trả về `409 APPOINTMENT_TRAINER_SLOT_CONFLICT` hoặc `409 APPOINTMENT_CUSTOMER_SLOT_CONFLICT`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:id/reschedule`.
- **Transaction Requirement:** **BẮT BUỘC**.

---

#### FEAT-APP-005: Cancel PT Appointment
- **Feature ID:** `FEAT-APP-005`
- **Feature Name:** Hủy lịch hẹn ca tập.
- **Purpose:** Hủy buổi tập trước giờ quy định.
- **Actors:** `Customer`, `PT`, `Manager`.
- **State Change:** `SCHEDULED` $\rightarrow$ `CANCELLED`.
- **Business Rules:** Khi buổi tập chuyển sang `CANCELLED`, khung giờ này lập tức được giải phóng cho PT và Customer nhận lịch khác. Buổi tập không bị trừ vào hạn mức buổi của gói PT.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:id/cancel`.

---

#### FEAT-APP-006: Complete PT Appointment & Auto Quota Increment
- **Feature ID:** `FEAT-APP-006`
- **Feature Name:** Xác nhận hoàn thành ca tập và tự động tăng hạn mức buổi.
- **Purpose:** Huấn luyện viên hoặc Quản lý nghiệm thu ca tập đã kết thúc thành công.
- **Actors:** `PT` (phụ trách ca tập), `Manager` (của Gym đó), `Admin`.
- **Preconditions:** Buổi tập đang ở trạng thái `SCHEDULED`.
- **Main Flow:**
  1. Mở Database Transaction:
     - Cập nhật trạng thái buổi tập: `SCHEDULED` $\rightarrow$ `COMPLETED`.
     - Tăng biến đếm `completed_sessions` của `PT_Registration` thêm 1 đơn vị:
       $$\text{completed\_sessions} = \text{completed\_sessions} + 1$$
     - Kiểm tra nếu `PT_Registration` đang là `ASSIGNED`, chuyển sang `IN_PROGRESS`.
     - Kiểm tra nếu $\text{completed\_sessions} == \text{total\_sessions}$, tự động chuyển trạng thái `PT_Registration` sang `COMPLETED`.
     - Commit Transaction.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:id/complete`.
- **Transaction Requirement:** **BẮT BUỘC**.
- **Acceptance Criteria:** Tự động hoàn tất hợp đồng PT khi học viên tập đủ 100% số buổi đăng ký.

---

#### FEAT-APP-007: Mark Appointment No-Show
- **Feature ID:** `FEAT-APP-007`
- **Feature Name:** Đánh dấu học viên vắng mặt không lý do.
- **Purpose:** Ghi nhận vi phạm lịch hẹn khi học viên không đến điểm tập mà không thông báo trước.
- **Actors:** `PT`, `Manager`.
- **State Change:** `SCHEDULED` $\rightarrow$ `NO_SHOW`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:id/no-show`.

---

### 4.9. Nhóm Báo Cáo Sự Cố & Phản Ánh Dịch Vụ (`Gym_Report`)

#### FEAT-REP-001: Submit Gym Report (Max 1 Image)
- **Feature ID:** `FEAT-REP-001`
- **Feature Name:** Gửi phản ánh sự cố cơ sở vật chất.
- **Purpose:** Khách hàng gửi thông tin thiết bị hư hỏng, vệ sinh hoặc chất lượng dịch vụ tới Ban Quản Lý chi nhánh.
- **Actors:** `Customer`.
- **Preconditions:** Tài khoản `CUSTOMER` đã đăng nhập.
- **Main Flow:**
  1. Khách hàng nhập tiêu đề sự cố, nội dung chi tiết và tùy chọn đính kèm **tối đa 01 ảnh duy nhất** (`image_url`).
  2. Server lưu bản ghi vào `gym_reports` với `user_id = auth.user_id`, `status = 'SUBMITTED'`, `resolved_at = null`.
  3. Trả về thông tin báo cáo đã tiếp nhận.
- **Business Rules:**
  - Tuyệt đối tuân thủ schema đã phê duyệt: Chỉ chứa `id`, `gym_id`, `user_id`, `title`, `description`, `image_url`, `status`, `resolved_at`. Không tự ý tạo thêm các bảng hay trường phụ (như `admin_notes`, `attachments`).
- **Validation Rules:** Tiêu đề từ 5 đến 200 ký tự; mô tả từ 10 đến 3000 ký tự; `image_url` đúng định dạng URL hợp lệ.
- **API Reference:** `POST /api/v1/gyms/:gymId/reports`.
- **Acceptance Criteria:** Báo cáo được gửi đích danh về đúng phòng gym `gymId` được chỉ định trên URL.

---

#### FEAT-REP-002: View Personal Reports
- **Feature ID:** `FEAT-REP-002`
- **Feature Name:** Xem lịch sử phản ánh của bản thân.
- **Purpose:** Customer theo dõi tiến độ xử lý các kiến nghị mình đã gửi.
- **Actors:** `Customer`.
- **API Reference:** `GET /api/v1/reports/me`.

---

#### FEAT-REP-003: View Gym Reports Queue
- **Feature ID:** `FEAT-REP-003`
- **Feature Name:** Hàng đợi xử lý phản ánh tại phòng gym.
- **Purpose:** Ban Quản Lý tiếp nhận và theo dõi các sự cố cần xử lý tại cơ sở mình.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **API Reference:** `GET /api/v1/gyms/:gymId/reports`.
- **Acceptance Criteria:** Manager chỉ xem được báo cáo gửi về cơ sở mình phụ trách.

---

#### FEAT-REP-004: Investigate Report
- **Feature ID:** `FEAT-REP-004`
- **Feature Name:** Tiếp nhận và xác minh sự cố.
- **Purpose:** Ban Quản Lý chuyển trạng thái phản ánh sang đang xử lý/sửa chữa.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **State Change:** `SUBMITTED` $\rightarrow$ `INVESTIGATING`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/investigate`.

---

#### FEAT-REP-005: Resolve Report
- **Feature ID:** `FEAT-REP-005`
- **Feature Name:** Đóng phản ánh với kết luận đã xử lý xong.
- **Purpose:** Ban Quản Lý xác nhận thiết bị đã được sửa chữa hoặc sự cố đã được khắc phục thỏa đáng.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **Main Flow:** Cập nhật `status = 'RESOLVED'` và tự động gán `resolved_at = now()`.
- **State Change:** `INVESTIGATING` / `SUBMITTED` $\rightarrow$ `RESOLVED`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/resolve`.
- **Acceptance Criteria:** Không sử dụng trường `admin_notes` tự chế; tuân thủ đúng schema cơ sở dữ liệu.

---

#### FEAT-REP-006: Reject Report
- **Feature ID:** `FEAT-REP-006`
- **Feature Name:** Từ chối phản ánh.
- **Purpose:** Bác bỏ phản ánh sai sự thật, spam hoặc không thuộc trách nhiệm của phòng tập.
- **Actors:** `Admin`, `Manager` (đang `ACTIVE` tại Gym đó).
- **State Change:** `SUBMITTED` / `INVESTIGATING` $\rightarrow$ `REJECTED`.
- **API Reference:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/reject`.

---

### 4.10. Nhóm Quản Trị Hệ Thống (`Admin Operations`)

#### FEAT-ADM-001: View System Users Directory
- **Feature ID:** `FEAT-ADM-001`
- **Feature Name:** Quản lý danh sách tài khoản toàn sàn.
- **Purpose:** Quản trị viên theo dõi tất cả tài khoản người dùng trên toàn hệ thống.
- **Actors:** `Admin`.
- **API Reference:** `GET /api/v1/admin/users`.
- **Acceptance Criteria:** Chỉ Admin mới có quyền truy cập; các role khác bị từ chối với lỗi `403 FORBIDDEN`.

---

#### FEAT-ADM-002: Update User Account Status
- **Feature ID:** `FEAT-ADM-002`
- **Feature Name:** Khóa / Kích hoạt tài khoản người dùng.
- **Purpose:** Khóa tài khoản vi phạm chính sách toàn sàn hoặc khôi phục hoạt động cho người dùng.
- **Actors:** `Admin`.
- **State Change:** `ACTIVE` $\leftrightarrow$ `SUSPENDED` hoặc `DEACTIVATED`.
- **API Reference:** `PATCH /api/v1/admin/users/:userId/status`.
- **Acceptance Criteria:** Tài khoản bị `SUSPENDED` lập tức bị chặn đăng nhập và từ chối ở mọi request tiếp theo.

---

## 5. Ma Trận Quyền Hạn Actor × Feature (Actor × Feature Matrix)

Bảng phân quyền chi tiết dựa trên các quy định tại [`docs/DOMAIN_RULES.md`](file:///srv/gym/docs/DOMAIN_RULES.md) và [`docs/API_SPEC.md`](file:///srv/gym/docs/API_SPEC.md):

| Feature ID | Tên Tính Năng | Guest | Customer | PT | Manager (Gym Scope) | Admin (System Scope) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **FEAT-AUTH-001** | Register Account | ✅ | ❌ | ❌ | ❌ | ❌ |
| **FEAT-AUTH-002** | Login User | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-AUTH-003** | Logout User | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-AUTH-004** | View Current Profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-AUTH-005** | Update Personal Profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-AUTH-006** | Change Password | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-GYM-001** | View Public Gyms | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-GYM-002** | View Gym Detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FEAT-GYM-003** | Create Gym | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-GYM-004** | Update Gym Info | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-GYM-005** | Update Gym Status | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-MGR-001** | Provision Manager Account | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-MGR-002** | View Gym Managers | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MGR-003** | Assign Manager to Gym | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-MGR-004** | Revoke Manager | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-TRN-001** | View Gym Trainers | ✅ | ✅ | ✅ | ✅ (Owned Gym) | ✅ |
| **FEAT-TRN-002** | View Trainer Detail | ✅ | ✅ | ✅ | ✅ (Owned Gym) | ✅ |
| **FEAT-TRN-003** | Hire/Assign Trainer | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-TRN-004** | Update Trainer Status | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-001** | View Packages List | ✅ | ✅ | ✅ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-002** | View Package Detail | ✅ | ✅ | ✅ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-003** | Create Gym Package | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-004** | Update Package | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-005** | Deactivate Package | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PKG-006** | Activate Package | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MEM-001** | Register Membership | ❌ | ✅ (Self) | ❌ | ✅ (Counter Assist) | ✅ |
| **FEAT-MEM-002** | View My Memberships | ❌ | ✅ (Self) | ❌ | ❌ | ❌ |
| **FEAT-MEM-003** | View Gym Memberships | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MEM-004** | View Membership Detail | ❌ | ✅ (Self) | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MEM-005** | Activate Membership | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MEM-006** | Suspend Membership | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-MEM-007** | Terminate Membership | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PTR-001** | Register PT Service | ❌ | ✅ (Self) | ❌ | ✅ (Counter Assist) | ✅ |
| **FEAT-PTR-002** | View My PT Registrations | ❌ | ✅ (Self) | ✅ (Assigned) | ❌ | ❌ |
| **FEAT-PTR-003** | View Gym PT Registrations | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PTR-004** | Reassign Trainer | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-PTR-005** | Cancel PT Registration | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-001** | Schedule PT Appointment | ❌ | ✅ (Self) | ✅ (Assigned) | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-002** | View My Appointments | ❌ | ✅ (Self) | ✅ (Assigned) | ❌ | ❌ |
| **FEAT-APP-003** | View Gym Appointments | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-004** | Reschedule Appointment | ❌ | ✅ (Self) | ✅ (Assigned) | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-005** | Cancel Appointment | ❌ | ✅ (Self) | ✅ (Assigned) | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-006** | Complete Appointment | ❌ | ❌ | ✅ (Assigned) | ✅ (Owned Gym) | ✅ |
| **FEAT-APP-007** | Mark Appointment No-Show | ❌ | ❌ | ✅ (Assigned) | ✅ (Owned Gym) | ✅ |
| **FEAT-REP-001** | Submit Gym Report | ❌ | ✅ | ❌ | ❌ | ❌ |
| **FEAT-REP-002** | View My Reports | ❌ | ✅ (Self) | ❌ | ❌ | ❌ |
| **FEAT-REP-003** | View Gym Reports Queue | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-REP-004** | Investigate Report | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-REP-005** | Resolve Report | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-REP-006** | Reject Report | ❌ | ❌ | ❌ | ✅ (Owned Gym) | ✅ |
| **FEAT-ADM-001** | View All System Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| **FEAT-ADM-002** | Manage User Status | ❌ | ❌ | ❌ | ❌ | ✅ |

*Chú thích:*
- `✅ (Self)`: Chỉ thao tác trên dữ liệu thuộc quyền sở hữu của chính tài khoản đăng nhập.
- `✅ (Assigned)`: Huấn luyện viên chỉ thao tác trên học viên/lịch hẹn mà mình được phân công phụ trách.
- `✅ (Owned Gym)`: Quản lý chỉ thao tác trên tài nguyên thuộc cơ sở phòng gym DUY NHẤT mà mình đang có phân công `ACTIVE`. Theo Domain Rules hiện tại, một User có vai trò MANAGER chỉ được phép có tối đa 1 phân công `Gym_Manager` ở trạng thái `ACTIVE` tại một thời điểm.

---

## 6. Đồ Hình Vòng Đời Thực Thể (Feature Lifecycles)

### 6.1. Vòng đời Cơ sở Phòng Gym (`Gym`)
$$\text{ACTIVE} \underset{\text{Resume}}{\overset{\text{Maintenance}}{\rightleftharpoons}} \text{MAINTENANCE} \xrightarrow{\text{Close Branch}} \text{CLOSED}$$

### 6.2. Vòng đời Bổ nhiệm Quản lý (`Gym_Manager`)
$$\text{ACTIVE} \xrightarrow{\text{Admin Revokes / Provisions New Manager}} \text{REVOKED}$$
*(Mỗi phòng gym chỉ có tối đa 1 bản ghi `ACTIVE` tại một thời điểm, và mỗi User Manager chỉ có tối đa 1 bản ghi `ACTIVE` tại một thời điểm).*

### 6.3. Vòng đời Huấn luyện viên (`Gym_Trainer`)
$$\text{ACTIVE} \underset{\text{Return}}{\overset{\text{Leave}}{\rightleftharpoons}} \text{ON\_LEAVE} \xrightarrow{\text{Terminate}} \text{TERMINATED}$$
$$\text{ACTIVE} \xrightarrow{\text{Terminate}} \text{TERMINATED}$$
*(Trạng thái `TERMINATED` là bất biến. Cấm đảo ngược về `ACTIVE` hoặc `ON_LEAVE`).*

### 6.4. Vòng đời Gói tập (`Package`)
$$\text{ACTIVE} \underset{\text{Reactivate}}{\overset{\text{Deactivate}}{\rightleftharpoons}} \text{INACTIVE}$$

### 6.5. Vòng đời Hợp đồng Hội viên (`Membership`)
$$\text{PENDING\_ACTIVATION} \xrightarrow{\text{Activate at Counter}} \text{ACTIVE} \underset{\text{Resume}}{\overset{\text{Suspend}}{\rightleftharpoons}} \text{SUSPENDED}$$
$$\text{ACTIVE} \xrightarrow{\text{Expired by Date}} \text{EXPIRED}$$
$$\text{PENDING\_ACTIVATION / ACTIVE / SUSPENDED} \xrightarrow{\text{Violation Terminate}} \text{TERMINATED}$$

### 6.6. Vòng đời Hợp đồng Huấn luyện viên (`PT_Registration`)
$$\text{ASSIGNED} \xrightarrow{\text{First Appointment COMPLETED}} \text{IN\_PROGRESS} \xrightarrow{\text{completed == total}} \text{COMPLETED}$$
$$\text{ASSIGNED / IN\_PROGRESS} \xrightarrow{\text{Cancel Contract}} \text{CANCELLED}$$

### 6.7. Vòng đời Lịch hẹn Ca tập (`PT_Appointment`)
$$\text{SCHEDULED} \underset{\text{Reschedule (New Slot)}}{\curvearrowleft}$$
$$\text{SCHEDULED} \xrightarrow{\text{Confirmed Finished}} \text{COMPLETED}$$
$$\text{SCHEDULED} \xrightarrow{\text{Cancel in Advance}} \text{CANCELLED}$$
$$\text{SCHEDULED} \xrightarrow{\text{Absent}} \text{NO\_SHOW}$$

### 6.8. Vòng đời Báo cáo Sự cố (`Gym_Report`)
$$\text{SUBMITTED} \xrightarrow{\text{Manager Acknowledges}} \text{INVESTIGATING} \xrightarrow{\text{Fixed (set resolved\_at)}} \text{RESOLVED}$$
$$\text{SUBMITTED / INVESTIGATING} \xrightarrow{\text{Spam / False Report}} \text{REJECTED}$$

---

## 7. Quy Tắc Cách Ly Dữ Liệu Phòng Tập (Cross-Gym Isolation Rules)

| Tình huống tương tác | Quy tắc xử lý và Cơ chế bảo vệ | Mã lỗi phản hồi |
| :--- | :--- | :---: |
| **Manager Gym A truy cập dữ liệu Gym B** | Middleware `enforceGymScope` đối chiếu `gym_managers` của Manager không khớp với `:gymId` của tài nguyên. Request bị chặn ngay tại cửa ngõ API. | `403 GYM_SCOPE_FORBIDDEN` |
| **Bổ nhiệm Manager đang ACTIVE tại Gym A sang Gym B** | Domain Rules nghiêm cấm kiêm nhiệm: Một User chỉ được có tối đa 1 phân công `Gym_Manager` ở trạng thái `ACTIVE`. Nếu User đã là Manager ACTIVE tại Gym A, hệ thống từ chối bổ nhiệm sang Gym B và không tự động revoke cơ sở cũ (Admin bắt buộc phải revoke tại Gym A trước qua `FEAT-MGR-004`). | `409 USER_ALREADY_ACTIVE_MANAGER` |
| **PT Gym A xem danh sách học viên Gym B** | PT chỉ được cấp quyền truy cập các bản ghi có `trainer_id` thuộc cơ sở mình ký hợp đồng. Mọi truy vấn lọc chéo cơ sở bị từ chối. | `403 GYM_SCOPE_FORBIDDEN` |
| **Customer xem thẻ hội viên/lịch tập người khác** | Tầng Service luôn áp dụng điều kiện `WHERE user_id = auth.user_id`. Cấm truy vấn theo `id` tự do từ URL mà không kèm điều kiện sở hữu (Chống IDOR). | `403 RESOURCE_OWNERSHIP_FORBIDDEN` / `404 NOT_FOUND` |
| **Đăng ký gói của Gym A nhưng gán thẻ vào Gym B** | Cơ sở dữ liệu bảo vệ bằng Composite Foreign Key `(package_id, gym_id)`. Nếu `package_id` không thuộc `gym_id`, câu lệnh INSERT bị Engine PostgreSQL từ chối. | `422 MEMBERSHIP_INVALID_GYM` |
| **Gán PT của Gym A vào hợp đồng PT tại Gym B** | Cơ sở dữ liệu bảo vệ bằng Composite Foreign Key `(trainer_id, gym_id)`. Nếu PT không có hợp đồng tại phòng gym diễn ra dịch vụ, hệ thống chặn lại ngay lập tức. | `422 PT_TRAINER_INVALID_GYM` |
| **Admin truy cập toàn hệ thống** | Admin sở hữu quyền quản trị toàn sàn (System Scope), được phép xem và điều phối tài nguyên của mọi cơ sở phòng tập. | Cho phép (`200 OK`) |

---

## 8. Các Bất Biến Nghiệp Vụ Cốt Lõi (Business Invariants)

1. **Bất biến Quan hệ 1-1 Hai Chiều của Active Manager (Bidirectional Single Active Manager Invariant):**
   - *Chiều Gym $\rightarrow$ Manager:* Tại một thời điểm bất kỳ, mỗi cơ sở phòng tập (`Gym`) chỉ được phép có **tối đa 1 Manager** ở trạng thái `ACTIVE` (Bảo vệ bởi Partial Unique Index `idx_uq_gym_managers_active_gym`).
   - *Chiều Manager $\rightarrow$ Gym:* Tại một thời điểm bất kỳ, mỗi người dùng (`User`) có vai trò `MANAGER` chỉ được phép có **tối đa 1 phân công `Gym_Manager`** ở trạng thái `ACTIVE` trên toàn hệ thống. Manager không được phép đồng thời ACTIVE ở nhiều Gym:
     $$\forall U \in \text{Users}, \text{count}\left(\{ M \in \text{Gym\_Managers} \mid M.\text{user\_id} = U.\text{id} \land M.\text{status} = \text{'ACTIVE'} \}\right) \le 1$$
     $$\forall G \in \text{Gyms}, \text{count}\left(\{ M \in \text{Gym\_Managers} \mid M.\text{gym\_id} = G.\text{id} \land M.\text{status} = \text{'ACTIVE'} \}\right) \le 1$$
2. **Bất biến Khung giờ Ca tập (Appointment Time Order Invariant):**
   Thời gian kết thúc ca tập bắt buộc phải lớn hơn thời gian bắt đầu: $\text{end\_time} > \text{start\_time}$.
3. **Bất biến Chống trùng lịch Huấn luyện viên (Trainer Schedule Invariant):**
   Theo quy định Domain Rules (`INV-006` và Entity 11), một Huấn luyện viên không thể có 2 ca tập ở trạng thái `SCHEDULED` bị giao nhau về mặt thời gian tại cùng một cơ sở phòng gym (`same gym_id`):
   $$\forall A_1, A_2 \in \text{Appointments}, (A_1.\text{gym\_id} = A_2.\text{gym\_id} \land A_1.\text{trainer\_id} = A_2.\text{trainer\_id} \land A_1.\text{status} = A_2.\text{status} = \text{'SCHEDULED'}) \implies [A_1.\text{start}, A_1.\text{end}) \cap [A_2.\text{start}, A_2.\text{end}) = \emptyset$$
   *(Lưu ý: Domain Rules chưa quy định phạm vi cross-Gym cho PT. Không tự động coi Database Exclusion Constraint toàn cục là Business Invariant bắt buộc; phạm vi kiểm tra cross-Gym được theo dõi tại Open Question).*
4. **Bất biến Chống trùng lịch Học viên (Customer Schedule Invariant):**
   Theo quy định Domain Rules (Entity 11), một Học viên không thể đặt 2 ca tập ở trạng thái `SCHEDULED` trùng hoặc giao nhau về mặt thời gian trong cùng phòng gym:
   $$\forall A_1, A_2 \in \text{Appointments}, (A_1.\text{gym\_id} = A_2.\text{gym\_id} \land A_1.\text{customer\_id} = A_2.\text{customer\_id} \land A_1.\text{status} = A_2.\text{status} = \text{'SCHEDULED'}) \implies [A_1.\text{start}, A_1.\text{end}) \cap [A_2.\text{start}, A_2.\text{end}) = \emptyset$$
   *(Lưu ý: Domain Rules chưa quy định phạm vi cross-Gym cho Customer. Không ghi "toàn hệ thống" như một business invariant bắt buộc; vấn đề kiểm tra overlap toàn hệ thống hay chỉ trong cùng Gym được chuyển thành Open Question).*
5. **Bất biến Giới hạn Buổi tập PT (PT Session Boundary Invariant):**
   Số buổi đã hoàn thành cộng với số buổi đang lên lịch không bao giờ được vượt quá tổng số buổi đã đăng ký:
   $$0 \le \text{completed\_sessions} + \text{count}(\text{SCHEDULED}) \le \text{total\_sessions}$$
6. **Bất biến Đồng nhất Lịch hẹn và Đăng ký (Appointment-Registration Consistency):**
   Mọi lịch hẹn `pt_appointments` bắt buộc phải có `(customer_id, trainer_id, gym_id)` trùng khớp hoàn toàn với hợp đồng `pt_registrations` gốc (Bảo vệ bởi Composite Foreign Key 4 cột).
7. **Bất biến Khóa Trạng thái Kết thúc Huấn luyện viên (Trainer Termination Immutability):**
   Khi `Gym_Trainer` đã ở trạng thái `TERMINATED`, trạng thái này không thể bị ghi đè hoặc chuyển ngược về `ACTIVE`/`ON_LEAVE`.
8. **Bất biến Giới hạn Ảnh Phản ánh (Report Image Constraint):**
   Mỗi báo cáo `Gym_Report` chỉ được phép chứa **tối đa đúng 01 URL ảnh minh chứng duy nhất** (`image_url`).

---

## 9. Các Tình Huống Ngoại Lệ (Edge Cases Handling)

1. **Khách hàng đặt 2 lịch tập cách nhau 0 phút (Liền kề):**
   - *Tình huống:* Ca 1 từ 08:00 - 09:00, Ca 2 từ 09:00 - 10:00.
   - *Xử lý:* PostgreSQL dải thời gian `tstzrange` sử dụng chuẩn `[)` (bao gồm điểm đầu, loại trừ điểm cuối). Do đó hai khung giờ liền kề **không bị coi là trùng nhau** $\rightarrow$ Cho phép đặt thành công.
2. **Quản lý bị bãi nhiệm khi đang thao tác dở:**
   - *Tình huống:* Admin vừa revoke quyền Manager của User X trong khi User X vừa gửi request tạo gói tập mới.
   - *Xử lý:* Middleware `enforceGymScope` truy vấn DB kiểm tra thấy trạng thái của User X trong `gym_managers` đã là `REVOKED` $\rightarrow$ Từ chối ngay lập tức với lỗi `403 GYM_SCOPE_FORBIDDEN`.
3. **Bổ nhiệm User đang quản lý Gym khác:**
   - *Tình huống:* Admin gọi API bổ nhiệm User X (đang là Manager `ACTIVE` tại Gym A) sang làm Manager cho Gym B.
   - *Xử lý:* Server phát hiện User X đã có assignment `ACTIVE` tại Gym A $\rightarrow$ Từ chối với lỗi `409 USER_ALREADY_ACTIVE_MANAGER`. Server không tự động revoke Gym A; Admin bắt buộc phải chủ động revoke Gym A trước nếu muốn điều chuyển.
4. **PT bị chấm dứt hợp đồng trong khi vẫn còn lịch hẹn sắp tới:**
   - *Tình huống:* Manager chuyển trạng thái PT sang `TERMINATED` khi PT vẫn còn 3 ca tập `SCHEDULED` trong tuần.
   - *Xử lý:* Server cảnh báo các ca tập chưa diễn ra cần được hủy (`CANCELLED`) hoặc chuyển đổi PT qua tính năng `FEAT-PTR-004`. PT bị terminate không thể thực hiện xác nhận `complete` ca tập được nữa.
5. **Hết hạn gói tập khi hợp đồng đang bảo lưu (`SUSPENDED`):**
   - *Tình huống:* Hội viên bảo lưu thẻ nhưng thời gian thực tế đã vượt qua `end_date` ban đầu.
   - *Xử lý:* Hợp đồng vẫn giữ nhãn `SUSPENDED`. Khi mở bảo lưu, hệ thống sẽ thực hiện theo chính sách bù ngày (xem mục Open Questions).
6. **Khách hàng tự đăng ký gói nhưng cố tình truyền `customer_id` của tài khoản khác:**
   - *Tình huống:* Customer A bắt gói tin và chèn `customer_id` của Customer B vào body `POST /memberships`.
   - *Xử lý:* Server phát hiện role là `CUSTOMER` và giá trị body khác `auth.user_id` $\rightarrow$ Từ chối lập tức với lỗi `403 RESOURCE_OWNERSHIP_FORBIDDEN`.

---

## 10. Mâu Thuẫn Nghiệp Vụ & Câu Hỏi Mở (Open Questions / Conflicts)

Bảng ghi nhận các vấn đề chưa có quyết định đóng từ các tài liệu nền tảng:

| STT | Vấn đề / Câu hỏi mở | Phân tích hiện trạng giữa các tài liệu | Đề xuất hướng xử lý cho Phase tiếp theo |
| :---: | :--- | :--- | :--- |
| **1** | **Customer có được sở hữu Thẻ hội viên ACTIVE tại nhiều Gym khác nhau không?** | `DOMAIN_RULES.md` xác định User là System-scoped và có thể tập tại các gym mình có thẻ. `DATABASE_SPEC.md` không đặt unique constraint trên `(user_id, status='ACTIVE')`. | **Đề xuất:** Cho phép (Khách hàng có thể mua thẻ tập tại Gym Quận 1 và đồng thời mua thẻ tại Gym Bình Thạnh). |
| **2** | **Huấn luyện viên có được ký hợp đồng giảng dạy tại nhiều Gym khác nhau không?** | `DATABASE_SPEC.md` có Unique constraint `(user_id, gym_id)` trên `gym_trainers`, nghĩa là không trùng tại 1 gym nhưng có thể có 2 dòng ở 2 `gym_id` khác nhau. Tuy nhiên điều này có thể dẫn đến việc trùng lịch dạy giữa 2 cơ sở. | **Cần chốt:** Cho phép PT cộng tác đa chi nhánh hay chỉ độc quyền 1 chi nhánh? (Lưu ý: Không tự động coi Database Exclusion Constraint là Business Rule; việc chặn lịch cross-Gym hay per-Gym phụ thuộc vào quyết định tại Câu hỏi mở STT 7). |
| **3** | **Cơ chế bù ngày khi mở lại Thẻ hội viên bảo lưu (`SUSPENDED`):** | Khi kích hoạt lại hợp đồng từ `SUSPENDED` $\rightarrow$ `ACTIVE`, ngày hết hạn (`end_date`) có được tự động kéo dài thêm đúng bằng số ngày đã bảo lưu hay không? | Sẽ đặc tả thuật toán tính bù ngày chi tiết trong tài liệu cấu hình chính sách thẻ hội viên. |
| **4** | **Số buổi tập PT được quy định từ Package hay nhập tự do khi tạo Registration?** | `Package` có cột `pt_session_count`. Tuy nhiên `PT_Registration` cũng có cột `total_sessions` được truyền qua API. | Cần chốt quy tắc: `total_sessions` của `PT_Registration` bắt buộc lấy theo `Package.pt_session_count` hay cho phép Manager bán lẻ thêm buổi theo nhu cầu khách hàng? |
| **5** | **Thời hạn tối thiểu cho phép hủy / dời lịch tập:** | Hiện tại đang tạm quy ước là trước 2 giờ trước giờ bắt đầu ca tập. | Cần chốt xem tham số này có cần trở thành biến cấu hình động riêng của từng cơ sở phòng tập hay áp dụng cố định toàn sàn. |
| **6** | **Cơ chế xử lý ca tập `SCHEDULED` khi Reassign Trainer (Conflict / Open Policy):** | `API_SPEC.md` tại Endpoint 7.8.2 (`PATCH /pt-registrations/:id/assign`) hiện chỉ nhận `new_trainer_id` mà chưa định nghĩa cơ chế giải quyết các ca tập `SCHEDULED` đang tồn tại (tự động chuyển sang `CANCELLED` hay bắt buộc từ chối để Manager/Customer hủy thủ công trước). | **Hiện trạng FEAT-PTR-004:** Áp dụng nguyên tắc an toàn cao nhất: Từ chối reassign với mã lỗi `409 ACTIVE_APPOINTMENTS_EXIST` nếu còn ca tập `SCHEDULED`, cấm tự động chuyển sang PT mới. Cần chốt chính thức trong API Contract xem có mở rộng cờ hỗ trợ tự động hủy (ví dụ: `auto_cancel_scheduled: boolean`) hay không. |
| **7** | **Appointment overlap được kiểm tra theo toàn hệ thống hay chỉ trong cùng Gym?** | - `DOMAIN_RULES.md`: Đối với PT, Entity 11 và `INV-006` chỉ quy định không được trùng lịch *"tại cùng cơ sở"* / *"tại cùng một phòng Gym"*; đối với Customer, Entity 11 quy định *"không thể đặt 2 ca tập trùng giờ"* nhưng chưa quy định rõ phạm vi cross-Gym.<br>- `DATABASE_SPEC.md`: Đang cài đặt GiST Exclusion Constraint toàn cục trên bảng `pt_appointments` theo `trainer_id` và `customer_id` như giải pháp kỹ thuật phòng vệ.<br>- **Nguyên tắc:** Không tự động coi Database Exclusion Constraint là Business Rule. Do Domain Rules chưa quy định phạm vi cross-Gym, không tự ý khẳng định "toàn hệ thống" là Business Invariant bắt buộc. | **Cần chốt:** Nghiệp vụ kiểm tra trùng lịch (Appointment Overlap) của Customer và PT là trên toàn hệ thống hay chỉ trong phạm vi từng Gym?<br>- *Nếu chỉ trong cùng Gym:* Business Invariant là per-Gym; Database Exclusion Constraint cần cân nhắc bổ sung `gym_id WITH =` để phản ánh đúng nghiệp vụ.<br>- *Nếu toàn hệ thống:* Cần được Domain phê duyệt chính thức thành System-wide Invariant trước khi áp đặt. Trong thời gian chờ quyết định, hệ thống duy trì cơ chế chống race condition và bảo vệ overlap trong phạm vi Domain đã phê duyệt. |

> [!NOTE]
> **Về vấn đề Quản lý kiêm nhiệm nhiều phòng Gym (Manager Multi-Gym):**
> Đã được xác nhận là **Business Rule chính thức trong Domain Rules hiện tại**: Một người dùng có vai trò `MANAGER` chỉ được phép có **duy nhất 1 phân công `Gym_Manager` ở trạng thái `ACTIVE` tại một thời điểm** trên toàn hệ thống. Đây không phải là Open Question.

---

## 11. Bảng Kiểm Tra Tính Nhất Quán (Consistency Check)

- [x] **Đúng chính xác 12 Domain Entities:** Không thiếu và không tự ý thêm bất kỳ entity nào ngoài danh mục được duyệt.
- [x] **Tuyệt đối không có Payment:** Không có cổng thanh toán, webhook, transaction thanh toán hay subscription billing.
- [x] **Tính năng không vượt quá Domain Rules:** Toàn bộ tính năng đều bám sát quyền hạn và nghiệp vụ tại `DOMAIN_RULES.md`.
- [x] **Mọi Feature đều có API tương ứng:** 100% tính năng được ánh xạ chính xác tới endpoint trong [`docs/API_SPEC.md`](file:///srv/gym/docs/API_SPEC.md).
- [x] **API không mâu thuẫn Database Spec:** Schema, ràng buộc khóa ngoại Composite và GiST Exclusion Constraints đồng bộ hoàn hảo.
- [x] **RBAC & Gym Scope nhất quán:** Phân định rõ 5 Actors; Manager chỉ quản lý duy nhất 1 Gym tại một thời điểm; chặn đứng hoàn toàn rò rỉ dữ liệu cross-gym.
- [x] **Đồ hình Vòng đời trạng thái chuẩn hóa:** 8 chu kỳ trạng thái tuân thủ tuyệt đối quy tắc chuyển đổi một chiều.
- [x] **Không đưa mã nguồn implementation:** Tài liệu thuần túy đặc tả nghiệp vụ, yêu cầu giao dịch và tiêu chí nghiệm thu.

---

### Kết luận đánh giá tính nhất quán:
- ✅ **Consistent:** Tài liệu `docs/FEATURE_SPEC.md` đạt mức độ nhất quán 100% với `ARCHITECTURE_DECISIONS.md`, `PROJECT_RULES.md`, `DOMAIN_RULES.md`, `DATABASE_SPEC.md`, và `API_SPEC.md`.
- ⚠️ **Conflict:** Đã xác định rõ điểm cần hoàn thiện tại Mục 10 (mục 6) về cơ chế xử lý ca tập `SCHEDULED` khi Reassign Trainer giữa API Contract và Business Service.
- ❓ **Open Questions:** Có 7 câu hỏi mở nghiệp vụ sâu (Customer/PT đa chi nhánh, phạm vi kiểm tra trùng lịch toàn hệ thống vs cùng Gym, bù ngày bảo lưu thẻ, hạn mức buổi PT, thời hạn hủy lịch, cơ chế đổi PT) được liệt kê minh bạch tại Mục 10.

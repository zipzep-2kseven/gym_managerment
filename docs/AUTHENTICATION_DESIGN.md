# Authentication Design & Contract — Multi-Gym Platform

## 1. Mục Đích & Nguồn Chân Lý (Source of Truth)

Tài liệu này xác lập thiết kế kỹ thuật chi tiết và hợp đồng giao tiếp (Contract) cho tầng Xác thực (Authentication) của dự án **Multi-Gym Platform** trước khi triển khai mã nguồn Login API (Giai đoạn 6B).

Tài liệu được xây dựng dựa trên sự tuân thủ nghiêm ngặt các tài liệu nền tảng:
- [`docs/PROJECT_RULES.md`](file:///srv/gym/docs/PROJECT_RULES.md) (Nhóm 7: Authentication Rules, Nhóm 8: Authorization Rules)
- [`docs/ARCHITECTURE_DECISIONS.md`](file:///srv/gym/docs/ARCHITECTURE_DECISIONS.md) (Mục 4: Technology Decisions, Mục 5: Authentication Decision)
- [`docs/DATABASE_SPEC.md`](file:///srv/gym/docs/DATABASE_SPEC.md) (Mục 6.1: `users`, 6.2: `user_profiles`, 6.3: `roles`, 6.4: `user_roles`)
- [`docs/DOMAIN_RULES.md`](file:///srv/gym/docs/DOMAIN_RULES.md) (Mục 2: Actors & Roles, Mục 6: Bất biến nghiệp vụ INV-011)
- [`docs/FEATURE_SPEC.md`](file:///srv/gym/docs/FEATURE_SPEC.md) (FEAT-AUTH-002: Đăng nhập, FEAT-AUTH-003: Đăng xuất, FEAT-AUTH-004: Thông tin phiên)
- [`docs/API_SPEC.md`](file:///srv/gym/docs/API_SPEC.md) (Mục 2, 3: Envelope Standard, Mục 4: Kiến trúc xác thực JWT + Cookie, Mục 6 & 7: Catalog & Quy tắc endpoint)

---

## 2. Authentication Flow

### 2.1. Login Flow (`POST /api/v1/auth/login`)

```text
Client (Web SPA / Mobile / Postman)
      │
      │  POST /api/v1/auth/login { email, password }
      ▼
Express Route / Middleware
      │
      ├─► Step 1: Rate Limiting Check (Tối đa 10 lần thử sai/phút/IP)
      ├─► Step 2: Request Validation (Zod schema: format email, format password)
      │
      ▼
Authentication Service
      │
      ├─► Step 3: Normalize Input: email = lower(btrim(email))
      │
      ├─► Step 4: Query User từ DB (Database: users JOIN user_roles JOIN roles)
      │     │
      │     ├─► User không tồn tại ──┐
      │     │                        ├─► Step 5A: Chạy Dummy Hash Verification (chống Timing Attack)
      │     │                        │           Trả về HTTP 401 INVALID_CREDENTIALS (Generic)
      │     ▼                        │
      ├─► Step 5: Verify Credential ──┘
      │     Argon2id.verify(user.password_hash, input_password)
      │     Nếu password sai ────────► Trả về HTTP 401 INVALID_CREDENTIALS (Generic)
      │
      ├─► Step 6: Kiểm tra Account Status
      │     ├─► status == 'INACTIVE'  ──► Trả về HTTP 403 ACCOUNT_DEACTIVATED
      │     └─► status == 'SUSPENDED' ──► Trả về HTTP 403 ACCOUNT_DEACTIVATED
      │
      ├─► Step 7: Truy vấn dữ liệu bổ trợ để dựng Authenticated Identity
      │     - user_profiles (hồ sơ nếu có, có thể NULL)
      │     - roles (mảng role_name: ADMIN, MANAGER, PT, CUSTOMER)
      │     - active_gym_assignments (phân công ACTIVE tại gym_managers / gym_trainers)
      │
      ├─► Step 8: Phát hành Token & Cookie
      │     - Tạo JWT Token mang payload: { sub: user_id, email, roles, iat, exp }
      │     - Thiết lập Response Header Set-Cookie: auth_token (HttpOnly, Secure, SameSite=Lax, Path=/api/v1)
      │
      ▼
Response (HTTP 200 OK)
      Envelope format: { success: true, data: UserSession }
      (TUYỆT ĐỐI KHÔNG chứa password_hash hoặc jwt raw token trong JSON body)
```

### 2.2. Failed Login Behavior (Chống User Enumeration)

Khi thông tin đăng nhập không hợp lệ, hệ thống phải xử lý phản hồi đồng nhất:

| Trường hợp | Nguyên nhân kỹ thuật | HTTP Status | Mã lỗi (`code`) | Thông báo (`message`) |
| :--- | :--- | :--- | :--- | :--- |
| **Email không tồn tại** | Query `users` trả về 0 dòng | `401 Unauthorized` | `INVALID_CREDENTIALS` | `"Email hoặc mật khẩu không chính xác."` |
| **Sai mật khẩu** | `argon2.verify` trả về `false` | `401 Unauthorized` | `INVALID_CREDENTIALS` | `"Email hoặc mật khẩu không chính xác."` |
| **User bị INACTIVE** | User status = `INACTIVE` | `403 Forbidden` | `ACCOUNT_DEACTIVATED` | `"Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa."` |
| **User bị SUSPENDED** | User status = `SUSPENDED` | `403 Forbidden` | `ACCOUNT_DEACTIVATED` | `"Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa."` |
| **Payload không hợp lệ** | Email sai cú pháp, thiếu password | `400 Bad Request` | `VALIDATION_ERROR` | `"Dữ liệu yêu cầu không hợp lệ."` |
| **Vượt quá rate limit** | Quá 10 lần sai / 1 phút / IP | `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | `"Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau."` |

> [!IMPORTANT]
> **Nguyên tắc chống User Enumeration & Timing Attack:**
> Phản hồi cho trường hợp "Email không tồn tại" và "Mật khẩu sai" **hoàn toàn giống nhau** về HTTP Status (`401`), Error Code (`INVALID_CREDENTIALS`) và Error Message. Ngoài ra, backend thực hiện so khớp mật khẩu giả lập (dummy verification) khi email không tồn tại để thời gian phản hồi (response time) không làm lộ việc user có tồn tại trong hệ thống hay không.

### 2.3. Successful Login Response

Đăng nhập thành công trả về:
1. **Header:** `Set-Cookie: auth_token=<JWT_TOKEN>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1; Max-Age=604800`
2. **Body:** DTO `UserSession` chứa thông tin định danh, trạng thái tài khoản, vai trò và phân công hiện tại.
3. **Tuyệt đối không chứa:** `password_hash`, `password`, `salt` hay token JWT thô trong JSON body.

---

## 3. Password Policy & Hashing Standard

### 3.1. Tiêu Chuẩn Mật Khẩu (Password Rules)
- **Độ dài tối thiểu:** 8 ký tự.
- **Độ dài tối đa:** 128 ký tự (ngăn chặn DoS khi tính toán băm).
- **Độ phức tạp:** Phải chứa ít nhất 01 chữ cái viết hoa (`A-Z`) và ít nhất 01 chữ số (`0-9`).
- **Khoảng trắng:** Không cho phép mật khẩu chỉ gồm khoảng trắng; mật khẩu không bị trim tự động để giữ nguyên ký tự do người dùng nhập.

### 3.2. Thuật Toán Băm (Argon2id)
- **Thư viện thực thi:** `@node-rs/argon2` (Native binding hiệu năng cao, ổn định trên môi trường Linux/Node.js, đã cài đặt và nghiệm thu tại Giai đoạn 5B).
- **Loại thuật toán:** `Argon2id` (v19) — chống cả Side-Channel Attack và GPU/ASIC Cracking.
- **Tham số kỹ thuật chuẩn hóa (Cost Parameters):**
  - **Memory Cost (`memoryCost`):** `65536` KB (64 MB).
  - **Time Cost (`timeCost` / Iterations):** `3` vòng lặp.
  - **Parallelism (`parallelism`):** `4` luồng tính toán.
- **Verify Mechanism:**
  ```typescript
  import { verify } from '@node-rs/argon2';

  const isValid: boolean = await verify(user.passwordHash, inputPassword);
  ```

### 3.3. Yêu Cầu Đổi Mật Khẩu (`must_change_password`)
- Cột `must_change_password boolean NOT NULL DEFAULT false` trên bảng `users`.
- Đối với tài khoản do Admin hoặc Manager khởi tạo (Provisioning) cấp mật khẩu tạm: cờ này được set thành `true`.
- **Hành vi phiên khi `must_change_password = true`:**
  - Người dùng **VẪN ĐƯỢC PHÉP** đăng nhập thành công và nhận session cookie.
  - Người dùng **ĐƯỢC PHÉP** gọi các endpoint:
    - `GET /api/v1/auth/me` (để kiểm tra phiên làm việc)
    - `POST /api/v1/auth/change-password` (để đổi mật khẩu mới)
    - `POST /api/v1/auth/logout` (để kết thúc phiên)
  - **BỊ CHẶN** với HTTP `403 Forbidden` (`PASSWORD_CHANGE_REQUIRED`) đối với tất cả các endpoint nghiệp vụ khác cho đến khi hoàn thành đổi mật khẩu qua `POST /api/v1/auth/change-password`.

---

## 4. Token & Session Strategy

### 4.1. Quyết Định Kiến Trúc: JWT + HttpOnly Cookie

Theo [`docs/ARCHITECTURE_DECISIONS.md`](file:///srv/gym/docs/ARCHITECTURE_DECISIONS.md) (Mục 4 & 5) và [`docs/PROJECT_RULES.md`](file:///srv/gym/docs/PROJECT_RULES.md) (Rule 7.1, 7.2):

- **Chiến lược xác thực:** JSON Web Token (JWT) có chữ ký số bí mật (Secret Key HMAC-SHA256).
- **Phương thức vận chuyển (Transport):** **HttpOnly, Secure, SameSite Cookie**.
- **Tên Cookie:** `auth_token`.
- **Thông số Cookie bắt buộc:**
  - `HttpOnly: true` — JavaScript trên trình duyệt (document.cookie) hoàn toàn không thể đọc được token $\rightarrow$ Triệt tiêu rủi ro rò rỉ token qua XSS.
  - `Secure: true` — Chỉ gửi cookie qua HTTPS (trong môi trường development cho phép qua HTTP localhost).
  - `SameSite: Lax` — Bảo vệ chống CSRF trong các request cross-site.
  - `Path: /api/v1` — Cookie chỉ tự động gửi kèm các request hướng tới API backend.
  - `Max-Age: 604800` giây (tương đương 7 ngày).
- **Cấm Tuyệt Đối:**
  - Không lưu token trong `localStorage`.
  - Không lưu token trong `sessionStorage`.
  - Không lưu token trong biến toàn cục `window`.

### 4.2. JWT Claims Specification

```json
{
  "sub": "b2f6ef53-90d2-4ee4-90a6-c956daae0aa4",
  "email": "admin@multigym.com",
  "roles": ["ADMIN"],
  "iat": 1758441600,
  "exp": 1759046400
}
```

- `sub` (Subject): `user_id` (UUIDv4) của người dùng trong bảng `users`.
- `email`: Email đã chuẩn hóa của người dùng.
- `roles`: Mảng chuỗi các vai trò hệ thống đã cấp (`['ADMIN']`, `['MANAGER']`, `['PT']`, `['CUSTOMER']`).
- `iat` (Issued At): Unix timestamp tại thời điểm tạo token.
- `exp` (Expiration): Unix timestamp hết hạn (+7 ngày kể từ thời điểm tạo).

### 4.3. Dependencies Kỹ Thuật (Sẽ cài đặt ở Giai đoạn 6B)
- Ký và kiểm tra JWT: `jsonwebtoken` + `@types/jsonwebtoken` (hoặc `jose`).
- Đọc cookie từ Express Request: `cookie-parser` + `@types/cookie-parser`.
- *Lưu ý:* Không cài đặt trước ở bước 6A này; sẽ cài đặt đúng thời điểm implement 6B.

---

## 5. Authenticated User Model & DTO Contract

### 5.1. Mô Hình `UserSession` (Phản hồi cho Authentication)

Khi xác thực thành công hoặc truy vấn `/auth/me`, Backend trả về đối tượng `UserSession` tuân thủ bảng đặc tả tại [`docs/API_SPEC.md §5.1`](file:///srv/gym/docs/API_SPEC.md):

```typescript
export interface UserSession {
  user_id: string;                                   // UUID
  email: string;                                     // lower(btrim(email))
  phone: string | null;                              // phone từ bảng users
  email_verified_at: string | null;                  // ISO 8601 UTC timestamp
  must_change_password: boolean;                    // Cờ bắt buộc đổi mật khẩu
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';       // Trạng thái tài khoản
  created_at: string;                                // ISO 8601 UTC timestamp
  updated_at: string;                                // ISO 8601 UTC timestamp
  profile: UserProfile | null;                       // Chi tiết hồ sơ (hoặc null nếu chưa tạo)
  roles: string[];                                   // Mảng tên vai trò: ['ADMIN'], ['CUSTOMER'], ...
  active_gym_assignments: ActiveGymAssignment[];     // Phân công phòng gym đang ACTIVE
}

export interface UserProfile {
  profile_id: string;                               // UUID
  user_id: string;                                  // UUID
  full_name: string;                                // 2-100 ký tự
  date_of_birth: string | null;                     // YYYY-MM-DD
  gender: string | null;                            // Giới tính
  address: string | null;                           // Địa chỉ
  avatar_url: string | null;                        // URL ảnh đại diện
  created_at: string;                               // ISO 8601 UTC timestamp
  updated_at: string;                               // ISO 8601 UTC timestamp
}

export interface ActiveGymAssignment {
  assignment_type: 'MANAGER' | 'PT';                // Loại vai trò phân công
  gym_id: string;                                   // UUID phòng gym
  gym_name?: string;                                // Tên cơ sở (nếu JOIN)
  gym_manager_id?: string;                          // PK từ gym_managers (nếu type = MANAGER)
  gym_trainer_id?: string;                          // PK từ gym_trainers (nếu type = PT)
}
```

### 5.2. Danh Sách Thuộc Tính Tuyệt Đối Không Expose
- `password_hash`
- Plaintext password
- Salt
- Internal database cursor / query metadata
- Secret keys

---

## 6. Error Contract (Chuẩn Envelope Bắt Buộc)

Toàn bộ phản hồi lỗi từ Authentication tuân thủ Envelope Standard quy định tại [`docs/API_SPEC.md §3.3 & §3.4`](file:///srv/gym/docs/API_SPEC.md):

```json
{
  "success": false,
  "error": {
    "code": "STRING_IDENTIFIER",
    "message": "Mô tả lỗi dễ hiểu cho người dùng.",
    "details": null
  }
}
```

### 6.1. Chi Tiết Các Mã Lỗi Xác Thực

#### 1. Lỗi Credential không hợp lệ (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không chính xác.",
    "details": null
  }
}
```

#### 2. Lỗi Tài khoản vô hiệu hóa / tạm khóa (403 Forbidden)
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DEACTIVATED",
    "message": "Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ quản trị viên.",
    "details": null
  }
}
```

#### 3. Lỗi Bắt buộc đổi mật khẩu trước khi thao tác (403 Forbidden)
```json
{
  "success": false,
  "error": {
    "code": "PASSWORD_CHANGE_REQUIRED",
    "message": "Bạn cần đổi mật khẩu trước khi thực hiện các thao tác khác.",
    "details": null
  }
}
```

#### 4. Lỗi Dữ liệu đầu vào sai định dạng (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu yêu cầu không hợp lệ.",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng."
      },
      {
        "field": "password",
        "message": "Mật khẩu phải có ít nhất 8 ký tự."
      }
    ]
  }
}
```

#### 5. Lỗi Quá số lần đăng nhập cho phép (429 Too Many Requests)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau ít phút.",
    "details": null
  }
}
```

#### 6. Lỗi Chưa xác thực khi gọi Private Endpoint (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Yêu cầu đăng nhập để truy cập tài nguyên này.",
    "details": null
  }
}
```

---

## 7. Security Requirements

Mọi triển khai liên quan đến Authentication phải tuân thủ nghiêm ngặt 8 điều răn bảo mật:

1. **Cấm log mật khẩu:** Không bao giờ ghi log chuỗi mật khẩu nguyên bản (plaintext password) ra console, logger, error tracker hay persistent storage.
2. **Cấm log & trả password_hash:** Không bao giờ log `password_hash`, không bao giờ serialize `password_hash` vào bất kỳ response JSON nào.
3. **Không lưu plaintext password:** Mọi mật khẩu lưu trong cơ sở dữ liệu bắt buộc phải được băm qua Argon2id.
4. **Không truyền credentials qua URL:** Thông tin xác thực (email, password, token) không bao giờ được đặt trong query parameters hoặc URL path.
5. **Không commit secret:** Khóa bí mật ký JWT (`JWT_SECRET`) phải đọc từ biến môi trường qua `process.env`, có fallback an toàn cho môi trường development và bắt buộc cấu hình trên production.
6. **Chống User Enumeration:** Thông báo lỗi đăng nhập thất bại do sai email hoặc sai password phải đồng nhất tuyệt đối (`INVALID_CREDENTIALS`).
7. **Rate Limiting nghiêm ngặt:** Giới hạn tối đa 10 lần thử sai trong vòng 1 phút trên mỗi địa chỉ IP nguồn tại endpoint `/auth/login`.
8. **An toàn Cookie:** Thiết lập đầy đủ cờ bảo mật `HttpOnly`, `Secure` (trong môi trường Production / HTTPS), `SameSite=Lax`, `Path=/api/v1`.

---

## 8. Trách Nhiệm Cơ Sở Dữ Liệu (Database Responsibility)

Trong luồng Authentication, tầng xác thực **chỉ được phép thực hiện thao tác ĐỌC (SELECT)** trên các bảng:
- `users`: Tìm kiếm user bằng email đã chuẩn hóa:
  ```sql
  SELECT * FROM users WHERE email = lower(btrim($1)) LIMIT 1;
  ```
- `roles` & `user_roles`: Đọc danh sách vai trò của user:
  ```sql
  SELECT r.role_name 
  FROM roles r 
  JOIN user_roles ur ON r.role_id = ur.role_id 
  WHERE ur.user_id = $1;
  ```
- `user_profiles`: Đọc thông tin hồ sơ của user (nếu có).
- `gym_managers` & `gym_trainers`: Đọc phân công phòng tập còn hiệu lực (`status = 'ACTIVE'`).

**Ranh giới bất biến:**
- **KHÔNG** tạo thêm bất kỳ bảng cơ sở dữ liệu nào ở giai đoạn này.
- **KHÔNG** sửa đổi migration SQL hiện tại (`0000_stiff_blur.sql`).
- **KHÔNG** sửa đổi `DATABASE_SPEC.md` hay ERD.
- **KHÔNG** thêm/bớt cột trên bảng `users`.

---

## 9. Phân Định Ranh Giới: Authentication vs Authorization vs Gym Scope

Hệ thống phân tách rõ rệt ba tầng kiểm soát bảo mật độc lập:

```text
Request Đến
   │
   ▼
[ 1. AUTHENTICATION LAYER ]  ──► "Bạn là ai?" (Who are you?)
   │   - Trích xuất JWT từ Cookie auth_token.
   │   - Xác minh tính toàn vẹn chữ ký và hạn dùng.
   │   - Nạp định danh người dùng: req.user = UserSession.
   │
   ▼
[ 2. AUTHORIZATION LAYER ]   ──► "Bạn có quyền thực hiện hành động này không?" (What can you do?)
   │   - Kiểm tra vai trò hệ thống: RBAC (ADMIN, MANAGER, PT, CUSTOMER).
   │   - Ví dụ: Chỉ MANAGER mới có quyền thêm PT; chỉ ADMIN mới có quyền tạo Gym.
   │
   ▼
[ 3. GYM SCOPE LAYER ]       ──► "Bạn có quyền tại cơ sở phòng Gym này không?" (In which Gym?)
       - Kiểm tra phân công cụ thể tại cơ sở:
         - Manager phải có bản ghi ACTIVE trong gym_managers của đúng gym_id.
         - PT phải có bản ghi ACTIVE trong gym_trainers của đúng gym_id.
         - Customer phải sở hữu Membership hợp lệ tại đúng gym_id.
       - Ngăn chặn triệt để hành vi can thiệp chéo giữa các chi nhánh (Cross-Gym Data Leakage).
```

> [!NOTE]
> Trong Giai đoạn 6A và 6B, phạm vi công việc **CHỈ DỪNG LẠI Ở TẦNG 1 (AUTHENTICATION)**. Tầng 2 (Authorization) và Tầng 3 (Gym Scope) sẽ được thiết kế và triển khai ở các giai đoạn tiếp theo.

---

## 10. Login API Contract Chi Tiết

### 10.1. Endpoint Đăng Nhập (`POST /api/v1/auth/login`)

- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Authentication:** Không yêu cầu (Public/Guest).
- **Rate Limit:** 10 requests / phút / IP.

#### Request Headers:
```http
Content-Type: application/json
Accept: application/json
```

#### Request Body Schema (Zod Validation):
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc.' })
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng.')
    .max(254, 'Email tối đa 254 ký tự.'),
  password: z
    .string({ required_error: 'Mật khẩu là bắt buộc.' })
    .min(1, 'Mật khẩu không được để trống.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

#### Request Body Example:
```json
{
  "email": "admin@multigym.com",
  "password": "AdminSecurePassword123!"
}
```

#### Response 200 OK (Đăng nhập thành công):
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Set-Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/api/v1; Max-Age=604800; HttpOnly; SameSite=Lax
```
```json
{
  "success": true,
  "data": {
    "user_id": "b2f6ef53-90d2-4ee4-90a6-c956daae0aa4",
    "email": "admin@multigym.com",
    "phone": null,
    "email_verified_at": null,
    "must_change_password": false,
    "status": "ACTIVE",
    "created_at": "2026-09-21T07:44:59.000Z",
    "updated_at": "2026-09-21T07:44:59.000Z",
    "profile": null,
    "roles": ["ADMIN"],
    "active_gym_assignments": []
  }
}
```

#### Response 401 Unauthorized (Sai email hoặc mật khẩu):
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
```
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không chính xác.",
    "details": null
  }
}
```

#### Response 403 Forbidden (Tài khoản bị vô hiệu hóa):
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8
```
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DEACTIVATED",
    "message": "Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ quản trị viên.",
    "details": null
  }
}
```

---

### 10.2. Endpoint Đăng Xuất (`POST /api/v1/auth/logout`)

- **Method:** `POST`
- **Path:** `/api/v1/auth/logout`
- **Authentication:** Yêu cầu người dùng đã xác thực (hoặc không bắt buộc khắt khe để đảm bảo xóa cookie an toàn).
- **Hành động:** Thiết lập lại cookie `auth_token` với `Max-Age=0` hoặc `Expires` trong quá khứ trên cùng `Path=/api/v1`.

#### Response 200 OK:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Set-Cookie: auth_token=; Path=/api/v1; Max-Age=0; HttpOnly; SameSite=Lax
```
```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công."
  }
}
```

---

### 10.3. Endpoint Kiểm Tra Phiên Hiện Tại (`GET /api/v1/auth/me`)

- **Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Authentication:** Bắt buộc (yêu cầu cookie `auth_token` hợp lệ).
- **Hành động:** Đọc `sub` từ JWT trong cookie, query trực tiếp từ database để đảm bảo thông tin trạng thái tài khoản, vai trò và phân công phòng gym là cập nhật nhất (Freshness).

#### Response 200 OK:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```
```json
{
  "success": true,
  "data": {
    "user_id": "b2f6ef53-90d2-4ee4-90a6-c956daae0aa4",
    "email": "admin@multigym.com",
    "phone": null,
    "email_verified_at": null,
    "must_change_password": false,
    "status": "ACTIVE",
    "created_at": "2026-09-21T07:44:59.000Z",
    "updated_at": "2026-09-21T07:44:59.000Z",
    "profile": null,
    "roles": ["ADMIN"],
    "active_gym_assignments": []
  }
}
```

#### Response 401 Unauthorized (Chưa đăng nhập / Token hết hạn):
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
```
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Yêu cầu đăng nhập để truy cập tài nguyên này.",
    "details": null
  }
}
```

# Architecture Decisions

## 1. Purpose

Tài liệu này ghi nhận chính thức toàn bộ các quyết định kiến trúc cốt lõi (Architecture Baseline), công nghệ nền tảng, tiêu chuẩn bảo mật, phạm vi nghiệp vụ và nguyên tắc thiết kế cho dự án **Multi-Gym Platform**. 

Mọi lập trình viên và AI coding agent tham gia phát triển dự án bắt buộc phải tuân thủ nghiêm ngặt các quyết định trong tài liệu này làm nguồn chân lý kỹ thuật (Technical Source of Truth), nhằm đảm bảo hệ thống phát triển nhất quán, an toàn, không bị phân mảnh hay "vibe coding" sai lệch kiến trúc.

---

## 2. Project Context

- **Bối cảnh hệ thống:** Multi-Gym là nền tảng quản lý tập trung đa cơ sở phòng tập (Multi-Branch Platform), cho phép nhiều phòng Gym và chi nhánh hoạt động độc lập trên cùng một hạ tầng ứng dụng và cơ sở dữ liệu dùng chung.
- **Các Actor chính:**
  1. `Guest`: Khách vãng lai xem danh sách phòng gym, gói tập và huấn luyện viên công khai.
  2. `Customer`: Khách hàng mua gói tập, đăng ký hội viên của từng phòng gym, đặt lịch tập với PT và gửi báo cáo sự cố.
  3. `PT (Personal Trainer)`: Huấn luyện viên trực thuộc một phòng gym cụ thể, phụ trách hướng dẫn và quản lý lịch hẹn của học viên tại cơ sở đó.
  4. `Manager`: Quản lý điều hành được chỉ định cho một phòng gym duy nhất, chịu trách nhiệm quản lý gói tập, phân công PT, duyệt báo cáo và thống kê tại cơ sở mình phụ trách.
  5. `Admin`: Quản trị viên toàn hệ thống, quản lý danh mục phòng gym, bổ nhiệm Manager và giám sát toàn bộ nền tảng.
- **Mục tiêu kiến trúc:** Xây dựng một hệ thống phân tách ranh giới rõ ràng giữa các phòng Gym (Data Isolation via Gym Scope), an toàn mặc định (Security by Default), có hiệu năng cao, dễ bảo trì và trải nghiệm người dùng hiện đại, tinh tế.

---

## 3. Architecture Overview

Hệ thống tuân thủ kiến trúc phân lớp hướng dịch vụ (Layered RESTful Architecture) với luồng xử lý dữ liệu đơn hướng và ranh giới rõ ràng:

```text
Browser / Client
      │
      ▼
React 18 + Vite (SPA)
[React Router + TanStack Query + Tailwind CSS]
      │
      │  HTTPS / REST API (JSON) + HttpOnly Cookie
      ▼
Express + TypeScript (API Gateway / Application Layer)
      │
      ├─► Middleware: Rate Limit / CORS / Body Parser
      ├─► Middleware: Authentication (JWT in HttpOnly Cookie)
      ├─► Middleware: Authorization (RBAC + Gym Scope Verification)
      ├─► Middleware: Request Validation (Zod Schemas)
      │
      ▼
Route Handlers / Controllers
      │
      ▼
Application Services (Business Logic & Scoping Rules)
      │
      ▼
Data Access Layer (Drizzle ORM)
      │
      ▼
PostgreSQL Database (multi_gym_db)
```

---

## 4. Technology Decisions

| Khu vực (Area) | Quyết định (Decision) | Lý do kỹ thuật (Reason) |
| :--- | :--- | :--- |
| **Backend Runtime / Framework** | **Express + TypeScript** | Hệ sinh thái trưởng thành, ổn định cao, tương thích hoàn hảo với TypeScript và mô hình layered architecture tiêu chuẩn. |
| **API Style** | **REST API** | Chuẩn hóa giao tiếp, rõ ràng về HTTP verbs/status codes, dễ dàng mô hình hóa bằng OpenAPI và kiểm thử tự động. |
| **Database Engine** | **PostgreSQL 17** | Hệ quản trị CSDL quan hệ mạnh mẽ, hỗ trợ toàn vẹn khóa ngoại, indexing tối ưu, JSONB linh hoạt và sẵn sàng cho multi-tenancy quy mô lớn. |
| **Database Access / ORM** | **Drizzle ORM** | Type-safe tối đa (end-to-end), hiệu năng tiệm cận SQL thuần, cơ chế migration minh bạch, nhẹ và dễ kiểm soát câu lệnh query scoping theo `gym_id`. |
| **Validation Library** | **Zod** | Schema validation số 1 cho TypeScript, hỗ trợ parse/infer types dùng chung cho cả backend và frontend qua `packages/shared`. |
| **Authentication Strategy** | **JWT (JsonWebToken)** | Stateless authentication, dễ dàng mang claims (user_id, roles, gym_assignments) hỗ trợ xác thực nhanh chóng. |
| **Token Transport** | **HttpOnly + Secure Cookie** | Ngăn chặn hoàn toàn rủi ro đánh cắp token qua tấn công XSS (Cross-Site Scripting) so với lưu token trong `localStorage`. |
| **Password Hashing** | **Argon2id** | Thuật toán băm mật khẩu hiện đại nhất (chiến thắng Password Hashing Competition), chống tấn công GPU/ASIC brute-force tốt hơn bcrypt/scrypt. |
| **Frontend Framework & Tooling** | **React 18 + Vite** | Tốc độ build/HMR cực nhanh, hệ sinh thái component phong phú, phù hợp kiến trúc SPA hiện đại. |
| **Client Routing** | **React Router (v6+)** | Thư viện điều hướng chuẩn công nghiệp, hỗ trợ nested routes, data loaders và Route Guards bảo vệ theo Role/Gym Scope. |
| **Server State Management** | **TanStack Query (React Query)** | Quản lý caching, deduping, background fetching, pagination và optimistic updates chuyên nghiệp cho REST API state. |
| **Styling Solution** | **Tailwind CSS** | Utility-first CSS giúp xây dựng giao diện nhanh, nhất quán về design tokens (spacing, color, radius) và không phát sinh CSS thừa. |
| **Unit Testing** | **Vitest** | Native Vite test runner cực nhanh, tương thích hoàn toàn cú pháp Jest/TypeScript mà không cần cấu hình phức tạp. |
| **API Integration Testing** | **Supertest** | Kiểm thử trực tiếp HTTP layer của Express mà không cần khởi chạy server thực tế qua socket. |
| **End-to-End Testing** | **Playwright** | Framework kiểm thử trình duyệt chéo (Chromium, Firefox, WebKit) mạnh mẽ, tự động hóa luồng người dùng đa role chính xác. |
| **API Documentation** | **OpenAPI (v3)** | Tiêu chuẩn mô tả API contract độc lập với ngôn ngữ, là nguồn sinh mock data, client SDK và tài liệu kỹ thuật. |
| **Development Environment** | **Docker Compose** | Chuẩn hóa môi trường chạy đồng nhất giữa mọi thành viên (`postgres`, `api`, `web`), giải quyết bài toán "works on my machine". |

---

## 5. Authentication Decision

- **Cơ chế chính:** JSON Web Token (JWT) được ký bảo mật từ server.
- **Phương thức vận chuyển (Transport):** **HttpOnly, Secure, SameSite Cookie**.
  - Flag `HttpOnly`: JavaScript trong trình duyệt không thể truy cập token $\rightarrow$ Triệt tiêu nguy cơ XSS lấy cắp phiên làm việc.
  - Flag `Secure`: Chỉ gửi qua kênh HTTPS (trong môi trường development cho phép qua HTTP localhost).
  - Flag `SameSite=Lax` hoặc `Strict`: Bảo vệ phiên làm việc khỏi tấn công CSRF (Cross-Site Request Forgery).
- **Quy tắc bảo mật nghiêm ngặt:** **TUYỆT ĐỐI KHÔNG LƯU TOKEN TRONG `localStorage` HOẶC `sessionStorage`**.
- **Thuật toán mã hóa mật khẩu:** **Argon2id** được sử dụng bắt buộc cho tất cả thông tin đăng nhập tài khoản. Mật khẩu gốc không bao giờ được lưu trữ hay log ra hệ thống.

---

## 6. Authorization Decision

Hệ thống áp dụng mô hình kết hợp: **RBAC (Role-Based Access Control) + Gym Scope Enforcement**.

### 6.1. 5 Actors và 4 roles lưu trữ
1. `Guest` (Unauthenticated)
2. `Customer`
3. `PT`
4. `Manager`
5. `Admin`

### 6.2. Nguyên tắc Thẩm định Quyền
- **Role không phải là yếu tố duy nhất:** Kiểm tra Role chỉ là bước điều kiện cần, không phải điều kiện đủ.
- **Xác thực 2 bước bắt buộc (Two-tier Check):**
  $$\text{User Request} \longrightarrow \text{Step 1: Check Role Permission} \longrightarrow \text{Step 2: Check Gym Scope Permission} \longrightarrow \text{Resource Access}$$
  1. *Bước 1 (Role Check):* User có quyền thực hiện hành động này không? (Ví dụ: Chỉ `Manager` mới có quyền duyệt PT hoặc tạo Package).
  2. *Bước 2 (Gym Scope Check):* User có thẩm quyền trên đúng phòng gym sở hữu tài nguyên này không? (đối chiếu gym_managers/gym_trainers hoặc ownership qua Membership; users không có gym_id).
- **Quy tắc ranh giới Manager:** Manager của Gym A **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP** đọc, sửa, xóa bất kỳ dữ liệu nào thuộc về Gym B.
- **Quy tắc ranh giới PT:** Huấn luyện viên chỉ được xem danh sách học viên và lịch hẹn được phân công tại Gym mà mình ký hợp đồng.

---

## 7. Multi-Gym Isolation Decision

Hệ thống triển khai mô hình **Shared-Database, Shared-Schema với Application-Level Multi-Gym Isolation**:

1. **Gym Scope Key:** Dữ liệu Gym-scoped phải có đường xác định Gym rõ ràng: gym_id trực tiếp trên gym_managers, gym_trainers, packages, payments, memberships, equipments, gym_reports; pt_registrations qua Membership/Gym Trainer; pt_appointments qua Registration. Không thêm cột ngoài ERD. Chốt index và bảo vệ xuyên bảng ở bước constraints.
2. **Scoping Middleware:** Backend xây dựng middleware chuyên trách `enforceGymScope` nhằm trích xuất `gym_id` từ route parameters / query / body và đối chiếu với phân công/ownership còn hiệu lực trong database của User đăng nhập; không lấy token hoặc gym_id frontend làm nguồn quyền duy nhất.
3. **Repository Scoping:** SELECT/UPDATE/DELETE dữ liệu thuộc Gym phải lọc gym_id trực tiếp hoặc JOIN/EXISTS qua quan hệ nguồn. Registration/Appointment không có gym_id trực tiếp; scope đi qua Membership và đối chiếu Gym Trainer. Bảng system-scoped áp dụng ownership/quyền tương ứng, không ép gym_id giả.
4. **Ngăn chặn Single-Gym Assumption:** Cấm mọi giả định trong code rằng hệ thống chỉ có một phòng tập (không hardcode `gym_id`, không viết query thiếu điều kiện lọc theo gym).

---

## 8. Frontend Architecture

Giao diện Single Page Application (SPA) xây dựng trên nền tảng:
- **Core:** React 18 + TypeScript + Vite.
- **Routing:** React Router v6+ với cơ chế Router Guard phân luồng theo 5 layout tương ứng 5 Roles:
  - `PublicLayout`: Dành cho khách vãng lai và các trang xác thực (Login/Register).
  - `CustomerLayout`: Dashboard hội viên, lịch tập cá nhân, đăng ký gói.
  - `PTLayout`: Lịch dạy, quản lý học viên thuộc phòng tập phụ trách.
  - `ManagerLayout`: Quản trị phòng gym cụ thể, phân công PT, quản lý gói tập, báo cáo.
  - `AdminLayout`: Giám sát toàn hệ thống, danh sách tất cả các phòng gym, cấu hình sàn.
- **Server State & Data Fetching:** TanStack Query đảm nhận việc caching, revalidating và đồng bộ trạng thái từ Backend API. Không dùng global store (như Redux) cho server data.
- **Styling:** Tailwind CSS áp dụng thống nhất các tokens theo thiết kế chuẩn.

---

## 9. UI / UX Direction

### 9.1. Phong cách thiết kế chính thức (Official Design Language)
- **Đặc trưng:** **Minimalist — Modern — Clean — Professional**.
- **Triết lý:** Tập trung vào công năng quản lý và trải nghiệm người dùng thể thao chuyên nghiệp. Tối giản chi tiết thừa, ưu tiên không gian thở (whitespace) hợp lý và phân cấp thị giác (visual hierarchy) rành mạch.

### 9.2. Bảng màu chủ đạo (Color Palette)
Hệ thống sử dụng bảng màu tối giản có độ tương phản cao và hiện đại:
- **Dark Navy (`#0F172A` / `#0A0F1D`):** Màu nền thanh điều hướng, typography chính, thẻ trạng thái cao cấp, đại diện cho tính kỷ luật và vững chãi.
- **Red (`#E11D48` / `#EF4444`):** Màu Accent năng động, thể thao, dùng cho Primary Call-To-Action (CTA), highlight trạng thái active và điểm nhấn thị giác quan trọng.
- **White (`#FFFFFF`):** Màu nền chính cho bề mặt nội dung, mang lại cảm giác sạch sẽ, thoáng đãng.
- **Light Gray (`#F1F5F9` / `#E2E8F0`):** Màu nền phụ, đường phân cách (dividers), borders tinh tế và trạng thái thẻ thứ cấp.

### 9.3. Nguyên tắc Thiết kế Chống Rườm Rà (Restraint Directives)
- Ít thành phần thừa, bố cục rõ ràng theo lưới.
- Typography rõ ràng, dễ đọc trên mọi độ phân giải.
- **Không lạm dụng gradient** lòe loẹt hoặc mesh tím xanh AI-slop.
- **Không lạm dụng shadow** nặng nề; ưu tiên phân cách bằng viền mảnh và khoảng trống.
- **Không lạm dụng border-radius**; sử dụng bán kính bo góc đồng nhất (`rounded-md` / `rounded-lg`).
- **Kiểm soát Animation:** Chuyển động nhẹ, mượt mà (dưới 300ms), có mục đích hỗ trợ cảm nhận thao tác người dùng (Tactile feedback). Không sử dụng animation chuyển động bay lượn chỉ để trang trí làm chậm trải nghiệm quản lý.

### 9.4. Tích hợp Taste Skill
Đối với mọi tác vụ liên quan đến UI/UX, AI Assistant và lập trình viên bắt buộc phải tự động tham chiếu và tuân thủ các quy chuẩn anti-slop chi tiết từ [`.taste-skill/skills/taste-skill/SKILL.md`](file:///srv/gym/.taste-skill/skills/taste-skill/SKILL.md).

---

## 10. Testing Strategy Decision

Hệ thống áp dụng chiến lược kiểm thử hình kim tự tháp (Testing Pyramid) với 3 công cụ chủ lực:

1. **Vitest (Unit Testing):**
   - *Vai trò:* Kiểm tra tính đúng đắn của các hàm tiện ích, logic tính toán giá gói tập, validator schemas Zod, và các business rules độc lập trong Services.
   - *Đặc điểm:* Chạy siêu nhanh trong quá trình code hàng ngày.
2. **Supertest (API & Integration Testing):**
   - *Vai trò:* Kiểm thử các endpoint Express API. Trọng tâm cốt lõi là kiểm tra luồng xác thực (Authentication), phân quyền (RBAC) và **kiểm thử cách ly dữ liệu giữa các Gym (Cross-Gym Data Leakage Test)**.
3. **Playwright (End-to-End Testing):**
   - *Vai trò:* Tự động hóa kiểm thử hành vi thực tế của người dùng trên trình duyệt: Luồng đăng nhập, đăng ký gói tập, chuyển đổi giao diện theo Role, và kiểm tra hiển thị đúng dữ liệu phòng gym được phân quyền.

---

## 11. API Documentation

- Toàn bộ giao tiếp giữa Client và Backend được đặc tả chính thức thông qua tiêu chuẩn **OpenAPI 3.0**.
- Cung cấp tài liệu rõ ràng về:
  - Danh sách Endpoints và HTTP Methods.
  - Cấu trúc Request Parameters, Query Strings, Request Body.
  - Cấu trúc Response thành công (`200`, `201`) và Response lỗi chuẩn (`400`, `401`, `403`, `404`, `500`).
  - Định nghĩa cơ chế xác thực cookie.

---

## 12. Development Environment

Môi trường phát triển chuẩn hóa của toàn bộ đội ngũ được điều phối qua **Docker Compose** ([`docker-compose.yml`](file:///srv/gym/docker-compose.yml)):

1. **`postgres`:** PostgreSQL 17 Alpine, cổng ánh xạ `5432:5432`, gắn persistent volume `multi_gym_postgres_data` để bảo toàn dữ liệu.
2. **`api`:** Backend Express + TypeScript, cổng ánh xạ `4000:4000`, kết nối nội bộ tới cơ sở dữ liệu qua mạng `multi_gym_network` bằng service name `postgres:5432`.
3. **`web`:** Frontend React + Vite, cổng ánh xạ `3000:3000`, kết nối gọi API tới backend tại port `4000`.

Mục tiêu: Đảm bảo toàn bộ thành viên clone dự án về máy đều có môi trường chạy đồng nhất tức thì qua lệnh `docker compose up -d`.

---

## 13. Current Domain Scope (15 Approved Tables)

Theo yêu cầu cập nhật ERD và đồng bộ tài liệu, phạm vi mới gồm đúng 15 bảng trong [DATABASE_SPEC.md](DATABASE_SPEC.md):

1. `users` — PK `user_id`.
2. `user_profiles` — PK `profile_id`.
3. `roles` — PK `role_id`.
4. `user_roles` — PK tổ hợp `(user_id, role_id)`.
5. `gyms` — PK `gym_id`.
6. `gym_managers` — PK `gym_manager_id`.
7. `gym_trainers` — PK `gym_trainer_id`.
8. `packages` — PK `package_id`.
9. `payments` — PK `payment_id`.
10. `memberships` — PK `membership_id`.
11. `pt_registrations` — PK `registration_id`.
12. `pt_appointments` — PK `appointment_id`.
13. `equipment_types` — PK `equipment_type_id`.
14. `equipments` — PK `equipment_id`.
15. `gym_reports` — PK `report_id`.

Role lưu trữ gồm ADMIN, MANAGER, PT, CUSTOMER; Guest là actor chưa đăng nhập. Role không xác định Gym. Payment → Membership, quản lý thiết bị và report gắn thiết bị thuộc phạm vi thiết kế mới. PT Registration dựa trên Membership; Appointment suy ra Customer/PT/Gym qua quan hệ.

Status/enum ở DATABASE_SPEC.md §11 là dự kiến. ERD không còn mô hình quota buổi PT. Giữ nguyên giới hạn quyền Manager của kiến trúc trước: tối đa một Gym ACTIVE mỗi Manager và một Manager ACTIVE mỗi Gym; cách thực thi/tái bổ nhiệm theo khóa cặp chờ chốt.


## 14. Phạm vi thiết kế và giới hạn triển khai

### 14.1. Payment và thiết bị trong phạm vi mới

Cho phép đặc tả payments, equipment_types, equipments và các luồng trong ERD. Thay thế quyết định cũ loại Payment khỏi phạm vi. Chưa chọn payment gateway, webhook contract, phương thức thanh toán hoặc cơ chế xác minh thành công; các mục phụ thuộc Q-01/Q-02 phải chờ quyết định trước triển khai.

### 14.2. Ngoài phạm vi

Không thêm Invoice, Transaction, Audit_Log, Report_Attachment hoặc bảng thứ 16. Không thêm subscription billing, kho vật tư/bảo trì phức tạp, AI/ML, sinh lịch tự động hoặc theo dõi thể lực. Quản lý thiết bị cơ bản đã thuộc phạm vi; không đồng nghĩa có quản lý kho nâng cao.

Lần cập nhật này chỉ đồng bộ tài liệu trong docs; không tạo code, schema/migration hay chạy database.


## 15. Architectural Principles

Toàn bộ quá trình thiết kế và viết mã phải tuân thủ 7 nguyên tắc bất biến:

1. **Principle 1 — Multi-Gym First:** Mọi tính năng, bảng dữ liệu và API endpoint đều phải được thiết kế với tư duy phục vụ nhiều cơ sở phòng gym độc lập trên cùng hệ thống.
2. **Principle 2 — Security by Default:** Xác thực (Authentication), Phân quyền (Authorization), Kiểm tra dữ liệu (Validation) và Kiểm soát ranh giới phòng tập (Gym Scope) là bắt buộc ở mọi ngõ vào của Backend.
3. **Principle 3 — Backend Is the Source of Truth:** Kiểm tra dữ liệu và ẩn hiện nút bấm ở Frontend chỉ phục vụ nâng cao trải nghiệm người dùng (UX). Mọi quyết định an toàn dữ liệu và quyền truy cập thực sự thuộc về Backend.
4. **Principle 4 — Separation of Concerns:** Tách bạch rạch ròi trách nhiệm giữa các tầng: `Route` $\rightarrow$ `Controller` $\rightarrow$ `Service` $\rightarrow$ `Data Access (Drizzle)` $\rightarrow$ `PostgreSQL`. Không nhồi nhét logic nghiệp vụ vào Controller hay UI Component.
5. **Principle 5 — Explicit Contracts:** Hợp đồng dữ liệu giữa Client và Server phải tường minh, có type-safety và validation hai đầu thông qua Zod schemas và OpenAPI.
6. **Principle 6 — Consistency Over Complexity:** Ưu tiên tính nhất quán, đơn giản, dễ hiểu và dễ bảo trì hơn là cố tình áp dụng các mẫu trừu tượng (abstractions) quá sớm hoặc công nghệ phức tạp không cần thiết.
7. **Principle 7 — Future Extensibility Without Premature Implementation:** Thiết kế hệ thống sạch sẽ, có khả năng mở rộng trong tương lai nhưng kiên quyết không hiện thực hóa các tính năng chưa thuộc phạm vi hiện tại (ví dụ subscription billing và kho vật tư nâng cao).

---

## 16. Decision Constraints

- **Tính bất biến:** Mọi AI coding agent và lập trình viên tham gia dự án **KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI** các quyết định kiến trúc đã nêu trong tài liệu này.
- **Quy trình thay đổi quyết định (RFC Process):**
  Nếu trong quá trình triển khai phát sinh yêu cầu kỹ thuật buộc phải thay đổi:
  1. Nêu rõ nguyên nhân kỹ thuật và ngữ cảnh phát sinh.
  2. Đánh giá toàn diện tác động tới các tầng còn lại (Impact Analysis).
  3. Đề xuất phương án cập nhật tài liệu Architecture Decision.
  4. Phải nhận được sự phê duyệt chính thức từ Lead/User trước khi bắt tay vào sửa mã nguồn.

---

## 17. Open Questions

Stack, ORM và cơ chế xác thực giữ nguyên. Các quyết định nghiệp vụ/kỹ thuật còn mở được quản lý duy nhất tại [DOMAIN_RULES.md §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn), mã Q-01–Q-13. Chỉ chặn công việc phụ thuộc; không tự chuyển giá trị dự kiến thành policy đã phê duyệt.

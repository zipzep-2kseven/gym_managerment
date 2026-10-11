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

1. **Gym Scope Key:** Dữ liệu Gym-scoped phải có đường xác định Gym rõ ràng: gym_id trực tiếp trên gym_managers, gym_trainers, packages, payments, memberships, equipments, gym_reports, gym_images, consultation_requests, gym_reviews; pt_social_links/pt_working_schedules/trainer_reviews qua gym_trainers; pt_registrations qua Membership/Gym Trainer; pt_appointments qua Registration. Không thêm cột ngoài ERD. Baseline FK/index/trigger đã có trong migration 0000/0001; xem Database Spec.
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

## 13. Current Domain Scope (21 Approved Tables)

Theo yêu cầu cập nhật ERD và đồng bộ tài liệu, phạm vi mới gồm đúng 21 bảng trong [DATABASE_SPEC.md](DATABASE_SPEC.md):

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
16. `gym_images` — PK `image_id`.
17. `consultation_requests` — PK `consultation_request_id`.
18. `pt_social_links` — PK `social_link_id`.
19. `pt_working_schedules` — PK `schedule_id`.
20. `gym_reviews` — PK `gym_review_id`.
21. `trainer_reviews` — PK `trainer_review_id`.

Role lưu trữ gồm ADMIN, MANAGER, PT, CUSTOMER; Guest là actor chưa đăng nhập. Role không xác định Gym. Payment → Membership, quản lý thiết bị và report gắn thiết bị thuộc phạm vi thiết kế mới. PT Registration dựa trên Membership; Appointment suy ra Customer/PT/Gym qua quan hệ.

Status/enum tương đương ở DATABASE_SPEC.md §7 đã được triển khai bằng VARCHAR + CHECK. ERD không còn mô hình quota buổi PT. Giữ nguyên giới hạn quyền Manager của kiến trúc trước: tối đa một Gym ACTIVE mỗi Manager và một Manager ACTIVE mỗi Gym; giới hạn đã được bảo vệ bằng partial unique index; Q-12 đã chốt: reactivate bản ghi INACTIVE hiện tại, giữ ID/created_at và cập nhật assigned_at lần ACTIVE gần nhất; không thêm bảng lịch sử.


### 13.1. Quyết định nghiệp vụ cập nhật

Nghiệp vụ chính thức của người dùng thay thế mô tả cũ xung đột. Membership là cốt lõi: Gym → Package → xác nhận → Payment → Membership. PT và Consultation đều tùy chọn; PT Registration diễn ra sau Membership và sau trao đổi/thống nhất với PT. Gym Detail có hai CTA Đăng ký ngay / Đặt lịch tư vấn.

PT Profile gồm thông tin công khai, social links, availability, working schedule và review; chứng chỉ chỉ khi được hỗ trợ, không tạo schema chứng chỉ mới. trainer_status và availability độc lập. Working Schedule không phải Appointment. Review giữ nguyên dữ liệu gốc; chỉ Admin ẩn vi phạm kèm audit, không có API xóa review. Guest được gửi Consultation không cần đăng nhập.

Schema 21 bảng và hai service review/PT đã có; API/UI mới là mục tiêu cần triển khai. Role CUSTOMER cấp tài khoản khác tư cách hội viên của Gym. Staff và các quyết định chi tiết chưa chốt được ghi duy nhất tại [Domain §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn).

## 14. Phạm vi thiết kế và giới hạn triển khai

### 14.1. Payment và thiết bị trong phạm vi mới

Cho phép đặc tả payments, equipment_types, equipments và các luồng trong ERD. Thay thế quyết định cũ loại Payment khỏi phạm vi. Chưa chọn payment gateway, webhook contract, phương thức thanh toán hoặc cơ chế xác minh thành công; các mục phụ thuộc Q-01/Q-02 phải chờ quyết định trước triển khai.

### 14.2. Ngoài phạm vi

Không thêm Invoice, Transaction, Audit_Log, Report_Attachment hoặc bảng ngoài danh mục 21 bảng. Không triển khai PT Pricing/Package/Payment, chat realtime, social network, marketplace PT độc lập, recommendation, gym comparison hoặc booking realtime phức tạp. Không thêm subscription billing, kho vật tư/bảo trì phức tạp, AI/ML, sinh lịch tự động hoặc theo dõi thể lực. Quản lý thiết bị cơ bản đã thuộc phạm vi; không đồng nghĩa có quản lý kho nâng cao.

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

Stack, ORM và cơ chế xác thực giữ nguyên. Các quyết định nghiệp vụ/kỹ thuật còn mở được quản lý duy nhất tại [DOMAIN_RULES.md §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn), mã Q-01–Q-19. Chỉ chặn công việc phụ thuộc; không tự chuyển giá trị dự kiến thành policy đã phê duyệt.


### Quyết định Q-10/Q-12 — Provisioning và tái bổ nhiệm Manager

Backend sinh mật khẩu tạm cho Manager/PT, lưu Argon2id hash; actor không nhập password. Khi chưa có email/notification delivery, chỉ response provisioning thành công trả `temporary_password` một lần cho actor được phép để bàn giao. Không lưu/log plaintext, không endpoint đọc lại; response `Cache-Control: no-store`. Session/projection thông thường không chứa credential. Đổi mật khẩu phải dùng giá trị mới khác giá trị hiện tại để mật khẩu tạm hết hiệu lực; chỉ cập nhật hash, `must_change_password=false`, `updated_at`. Không thay đổi account status/email verification/assignment.

Admin provision Manager/PT; Manager có role và assignment ACTIVE đúng Gym được provision PT. Không thêm email verification gate. Transaction tạo User/Profile/Role/Assignment nguyên tử; quyền được đọc lại từ DB trong transaction. Giới hạn Manager giữ nguyên bằng constraint hiện có, không tự revoke Manager xung đột. Revoke giữ row INACTIVE; tái bổ nhiệm cùng User/Gym dùng lại row và cập nhật assigned_at, giữ created_at. Không migration/history table mới. Upload Q-10 còn mở. Q-08 PT và Q-13 Gym/PT được chốt ở quyết định tiếp theo bên dưới; các lifecycle khác vẫn mở.


### Q-08 PT / Q-13 Gym và PT — ngừng khi hết nghĩa vụ

Áp dụng Domain §10 và API §15. PT tối đa một assignment ACTIVE toàn hệ thống, bảo vệ bằng partial unique index mới `gym_trainers_active_user_key`. Giữ lịch sử INACTIVE, không tự xử lý dữ liệu cũ xung đột. Migration 0002 từ chối dữ liệu không phù hợp thay vì revoke/xóa.

Gym/PT chỉ ngừng khi không còn nghĩa vụ mở theo policy; không cascade. Các thao tác ghi liên quan và đổi trạng thái dùng khóa parent Gym trong transaction ngắn; trigger chặn ghi nghĩa vụ vào Gym/PT INACTIVE và kiểm tra nghĩa vụ khi ngừng. API khóa Gym trước account/assignment; SQL ngoài API có thứ tự khóa khác có thể bị PostgreSQL hủy vì deadlock, không bỏ qua rule. Các Gym độc lập không dùng khóa toàn hệ thống. Không giữ khóa khi hash password/gọi dịch vụ ngoài.

Tái sử dụng GymScopeService đã CLOSED; bổ sung policy tại service/DB mới, không mở lại GYM-01. Không thêm trạng thái đóng khẩn cấp, history table, refund hay Customer đa Gym.


## Thanh toán demo — yêu cầu người dùng ngày 2026-10-08

Người dùng yêu cầu tạm dùng mock: bấm thanh toán với phương thức nào cũng mô phỏng thành công để demo, chưa tích hợp thanh toán thật. Đây là ngoại lệ có phạm vi rõ ràng cho luồng demo, không chốt gateway hoặc chính sách thanh toán thật.

- Backend chỉ bật ghi thanh toán mô phỏng khi `PAYMENT_MODE=demo` và NODE_ENV khác production; mặc định disabled. Customer hiện hành, Gym/Package ACTIVE và request hợp lệ vẫn bắt buộc.
- Backend đọc price/duration từ Package, tạo Payment SUCCESS và Membership ACTIVE ngay trong cùng transaction. `payment_method`/`transaction_code` mang prefix DEMO; API/UI gắn nhãn demo, không thu tiền thật. Ngày thẻ theo Asia/Ho_Chi_Minh, end_date bao gồm ngày cuối = ngày bắt đầu + duration_days - 1.
- Idempotency-Key UUID định danh một lần bấm; cùng actor/Gym/input trả kết quả cũ, không tạo lần hai. Body không được tự khai amount/SUCCESS/user_id/Gym/thời hạn. Không có webhook, credentials cổng, refund hoặc cấp thẻ bỏ qua Payment.
- Không tồn tại Payment PENDING chờ bên ngoài trong luồng này; không thêm duration snapshot, bảng hoặc migration. Đề xuất snapshot trong PLAN-02 trước đó chỉ còn là bản tham khảo cho thanh toán thật sau này.
- Demo cho phép tạo các lần mua độc lập khi dùng key mới, có thể có nhiều thẻ; đây là hành vi mô phỏng, không đóng Q-08 Customer cho production. Chưa có expiry scheduler hay quyền dùng thẻ cho PT; không tự cascade Registration/Appointment.
- Q-01/Q-02/Q-03 cho tiền thật và các policy chưa chốt vẫn OPEN. PAY-01/PAY-02/PAY-03 bản production không được đánh dấu hoàn thành dựa trên demo.

## PT và lịch hẹn — quyết định người dùng ngày 2026-10-09

Áp dụng [PLAN-03 §9](PLAN_03_PT_APPOINTMENT_POLICY_PROPOSAL.md#9-chính-sách-được-duyệt-ngày-2026-10-09) và các quy tắc chi tiết §2–§5 không bị §9 thay thế. Thẻ ACTIVE còn hạn theo Asia/Ho_Chi_Minh, gồm thẻ demo, được đăng ký PT cùng Gym. Một Registration ACTIVE/thẻ. NOT_ACCEPTING chặn đăng ký mới; PT chính chủ/Manager đúng Gym đổi availability; không chặn lịch học viên cũ.

Lịch mới PENDING giữ chỗ; PT/Manager xác nhận. Chống chồng lịch của Customer/PT toàn hệ thống kể cả User hai role, khoảng [start,end). Dời trước giờ về PENDING; Customer hủy trước giờ, PT/Manager xử lý quá giờ, lý do bắt buộc. Complete chỉ CONFIRMED sau end. Vắng mặt CANCELLED với lý do. Không tự expire/cascade. Đổi PT kết thúc đăng ký cũ khi hết lịch mở rồi tạo đăng ký mới, giữ quan hệ lịch sử.

Q-04/Q-06/Q-07 chốt theo phạm vi trên; Q-16 chốt availability, còn profile/social. Working Schedule tham khảo; Q-18 ghi lịch vẫn mở. Q-08 Customer và chính sách tiền thật không thay đổi. Không thêm bảng/cột/PT pricing/payment/quota.


## Tạo Gym kèm Manager — người dùng duyệt ngày 2026-10-09

Form Admin tạo cơ sở mới gồm thông tin Gym và thông tin Manager (họ tên, email đăng nhập, số điện thoại tùy chọn). Backend tạo Gym ACTIVE và User/Profile/role MANAGER/phân công ACTIVE trong một transaction; lỗi bất kỳ bước nào rollback toàn bộ. Backend sinh mật khẩu tạm Argon2id, chỉ trả plaintext một lần trong response no-store để bàn giao; Manager bắt buộc đổi mật khẩu khi đăng nhập lần đầu. Giữ giới hạn một Manager ACTIVE/Gym và một Gym ACTIVE/Manager.

Mở rộng POST /gyms với `manager` lồng gồm email/full_name/phone?; không cho actor khai mật khẩu, role, status, assignment hoặc gym_id của Manager. UI tạo mới bắt buộc Manager; API không có manager giữ contract tạo Gym độc lập để tương thích luồng hiện có và bổ nhiệm tài khoản đã tồn tại. PATCH Gym không nhận manager. Không thêm endpoint, schema/migration, notification hoặc policy phân công mới. Màn Bổ nhiệm Manager giữ nguyên để cấp/gán/revoke/tái bổ nhiệm sau này.


## Báo cáo sự cố đơn giản — người dùng duyệt 2026-10-10

Demo bỏ màn danh mục loại thiết bị và quản lý từng máy (thêm/sửa/mã máy/chuyển Gym/thống kê). Giữ equipment_types/equipments và dữ liệu/FK cũ, không xóa bảng. Customer có Membership ACTIVE còn hạn tại Gym ACTIVE (gồm thẻ demo) gửi nội dung và tối đa một ảnh tùy chọn; không chọn máy/nhập mã. Equipment_id nullable kể cả EQUIPMENT; không tự gắn máy hoặc đổi condition. Lịch sử báo cáo cá nhân vẫn đọc khi thẻ hết hạn. Không API sửa/xóa nội dung/ảnh gốc.

Manager đúng Gym/Admin tiếp nhận PENDING→IN_PROGRESS, xử lý IN_PROGRESS→RESOLVED với ghi chú bắt buộc; từ chối PENDING/IN_PROGRESS→REJECTED với lý do bắt buộc. Terminal không mở lại; backend lấy actor từ phiên. RESOLVED có resolved_by/resolved_at; REJECTED lưu actor tại resolved_by và lý do tại resolution_note, resolved_at NULL, thời điểm từ chối theo updated_at. Không cascade thiết bị/thẻ/lịch tập.

Q-09 đóng phần eligibility, bỏ chọn thiết bị và hoãn quản lý thiết bị khỏi demo; không mở quyền ghi danh mục. Q-13 đóng lifecycle Report trên. Q-10 chỉ chốt upload Report demo: một ảnh JPEG/PNG ≤5MiB, lưu disk riêng ngoài public/static, volume Docker bền vững; đọc qua API có ownership/role/Gym scope, không URL công khai. Production upload vẫn chưa chọn provider và bị tắt; không áp dụng lựa chọn này cho Gallery/PT/avatar. Không thêm package hoặc bảng ảnh. Form dùng giờ Việt Nam và có loading/error/retry/pending.


## Đăng ký tư vấn đơn giản — quyết định được duyệt 2026-10-10

Người dùng duyệt CON-01/CON-02: CTA “Đăng ký tư vấn”, không đặt slot/giữ chỗ. Guest gửi không login, User hợp lệ được liên kết từ cookie và điền sẵn nhưng sửa được thông tin liên hệ. Gym ACTIVE lấy từ route; họ tên/số điện thoại bắt buộc, nội dung và thời gian tiện liên hệ dạng chữ tùy chọn. Không nhận user_id/status/assigned_to/email/preferred_date/preferred_time từ public body; không trả contact/actor trong public response.

Chỉ Manager có role và assignment ACTIVE đúng Gym xem và xử lý; chưa mở quyền Staff/Admin/PT. PENDING → CONTACTED → COMPLETED; PENDING/CONTACTED → CANCELLED bắt buộc lý do. Không reopen/reassign/xóa hoặc sửa thông tin khách. Manager lưu ghi chú riêng, bấm gọi số điện thoại; COMPLETED không đồng nghĩa mua gói. Thời gian liên hệ chỉ là nguyện vọng, không SLA, không Appointment/Payment/Membership/notification tự động.

Bổ sung hai cột nullable `preferred_contact` VARCHAR(200) và `processing_note` TEXT trong consultation_requests, migration giữ dữ liệu cũ/21 bảng, không ghép ghi chú vào content khách. assigned_to giữ NULL vì chưa phân công; không dùng để suy quyền. Q-19 đóng phần consultation tối giản; Q-14 Staff và Gallery/storage còn OPEN. Giới hạn gửi theo IP trong bộ nhớ một process (5 lần/15 phút), không tin X-Forwarded-For; khóa nút pending/no retry. Chưa CAPTCHA, lịch sử riêng cho khách hoặc idempotency; mất mạng yêu cầu liên hệ Gym trước gửi lại.


## Gallery demo — quyết định được duyệt 2026-10-10

Người dùng duyệt GIM-01: Admin mọi Gym, Manager có role/assignment ACTIVE đúng Gym thêm ảnh, sửa caption, đổi thứ tự và xóa có xác nhận. Guest chỉ xem list/bytes của Gym ACTIVE; ngừng Gym giữ ảnh, nội bộ vẫn quản lý được Gym INACTIVE. Logo tách gallery; ảnh đầu theo display_order là ảnh đại diện gallery. Mỗi lần thêm một ảnh, tối đa 10/Gym, đầu vào JPEG/PNG tối đa 5 MiB/20 megapixels, caption tùy chọn tối đa 200 ký tự. UI tự thu nhỏ cạnh dài tối đa 1600 và re-encode JPEG bỏ metadata; backend độc lập kiểm tra và loại metadata ảnh trước lưu. Không video/album/crop/360/versioning/drag-drop.

Demo lưu filesystem trong volume gallery riêng, không dùng volume báo cáo private, không public static; endpoint ảnh kiểm tra Gym ACTIVE mỗi lần, nội bộ có endpoint private có auth/scope. Không provider/package/table/column/migration mới; gym_images hiện có đủ. Upload production disabled đến khi chọn storage. Ghi gallery khóa Gym trong transaction, tối đa 10 và reorder nguyên tử/chống dữ liệu cũ; không lấy gym_id/image_url từ body. Xóa row trước rồi cleanup file, file mồ côi có thể tồn tại nếu crash, không public nếu không còn row. Public DTO không trả storage key/actor. Backup cả DB và volume; không reset dữ liệu cũ hoặc ảnh báo cáo. Q-10/Q-19 đóng gallery demo; storage production còn OPEN.


## TPR-01 — Hồ sơ PT / giờ làm việc tham khảo (duyệt 2026-10-10)

PT chính chủ có role/assignment ACTIVE tự sửa bio, liên kết và giờ làm việc tại Gym mình; Manager có role/assignment ACTIVE đúng Gym quản lý specialization/experience_years, xem bio/social/giờ nhưng không sửa thay PT. Phân công/status/availability giữ API/policy hiện có; Admin provisioning hiện có không thay đổi, chưa mở Admin sửa trong API TPR mới. Tên/ảnh dùng User Profile hiện hành, không thêm upload/chứng chỉ/PT pricing/thông tin sức khỏe.

Q-16 phần profile/social và Q-18 giờ tham khảo đã chốt: Asia/Ho_Chi_Minh, nhiều ca/ngày, HH:mm, không overlap cùng ngày hoặc qua nửa đêm, ca liền kề được phép; tối đa 28 ca/tuần cho form đơn giản. Không khai báo ngày là không hiển thị, không đồng nghĩa nghỉ/không được booking. Working Schedule chỉ tham khảo, không giữ slot, không chặn đặt lịch ngoài ca, không tự tạo/dời/hủy Appointment. Không lộ học viên hoặc Appointment trong DTO public. Không approval/lịch nghỉ/calendar sync/sinh slot tự động.

Bio trim tối đa 2000; specialization trim tối đa 200; kinh nghiệm nguyên 0–80 hoặc NULL; tối đa một link cho mỗi platform hiện có, URL HTTP(S) tối đa 2048 không chứa user/password. API strict ownership/allowlist, parent Gym lock và expected_updated_at để chặn stale/concurrent writes; giờ đã bỏ chuyển INACTIVE, giữ ID/history; giờ trùng exact có thể reactivate row cũ. Social set cập nhật theo platform, giữ ID khi có thể. Không tự sửa dữ liệu legacy ngoài thao tác lưu đã yêu cầu. Gym/PT INACTIVE không tự chỉnh hồ sơ; Manager xem được lịch sử tại Gym mình. Production payment/storage và Review còn OPEN.


## Q-15 — Review tối giản được duyệt (2026-10-10)

Người dùng yêu cầu góp ý sát thực tế và thực hiện REV-01. Áp dụng: Customer ACTIVE, đã đổi mật khẩu tạm, có Membership ACTIVE/EXPIRED đã tới start_date theo Asia/Ho_Chi_Minh tại Gym ACTIVE được đánh giá Gym. Đánh giá PT cần thêm Registration ACTIVE/COMPLETED cùng Gym và ít nhất một Appointment COMPLETED với đúng Gym Trainer; chỉ đăng ký hoặc lịch CANCELLED không đủ. Target PT/Gym phải ACTIVE; PT account ACTIVE. Thẻ demo được dùng cùng điều kiện. Nhân sự có assignment Manager/PT ACTIVE tại Gym không đánh giá Gym/PT tại Gym đó, không đánh giá chính mình.

Một review mỗi User/Gym và mỗi User/Gym Trainer (assignment), tính cả HIDDEN; không reset khi mua thẻ mới hoặc tái kích hoạt assignment. Rating số nguyên 1–5, comment tùy chọn, trim và tối đa 2.000 ký tự; không ảnh. Không sửa/xóa/unhide. Public chỉ VISIBLE trên target ACTIVE, chỉ tên hiển thị hội viên/rating/comment/ngày, không User ID/contact/audit. Đọc trạng thái đánh giá của bản thân gồm review gốc và eligibility, không audit ẩn; lỗi ghi lại 409, không tự retry khi mất mạng, tải lại để đối chiếu. Phân trang mới nhất trước và thống kê count/average chỉ VISIBLE; chưa có review thì average=null.

Giữ schema/trigger bất biến 0001. Policy chặt hơn (COMPLETED, một review) thực thi tại service với khóa parent Gym, recheck eligibility và duplicate trong transaction; SQL trực tiếp ngoài API chưa có ràng buộc unique/COMPLETED mới. Không tự sửa/xóa review legacy trùng; public vẫn giữ dữ liệu gốc, Customer có bất kỳ review nào không gửi thêm. REV-02 Admin moderation/UI giữ task riêng.


## REV-02 — Moderation tối giản (2026-10-10)

Người dùng yêu cầu đề xuất thực tế và triển khai. Admin ACTIVE đã đổi mật khẩu tạm xem review Gym/PT toàn hệ thống, gồm Gym/PT INACTIVE; lọc loại Gym/PT, Gym và VISIBLE/HIDDEN, phân trang mới nhất trước. Chỉ hiển thị tên/ID nội bộ cần nhận diện, nội dung gốc và audit ẩn; không email/phone/password. Không tự động ẩn theo điểm thấp, không ép đánh giá tích cực. Giao diện nhắc chỉ ẩn nội dung vi phạm (xúc phạm, spam, thông tin riêng hoặc nội dung không liên quan).

Ẩn cần nhập lý do rõ ràng 1–1.000 ký tự, xác nhận trước gửi; server đặt hidden_by/hidden_at, giữ nguyên rating/comment/created_at. VISIBLE → HIDDEN một lần; hai lần ẩn đồng thời chỉ một commit, lần sau 409 không ghi đè audit. Không sửa/xóa/unhide/duyệt trước đăng, không luồng report review/notification. Public và thống kê chỉ VISIBLE như REV-01. HIDDEN giữ bản riêng cho Customer và audit chỉ Admin. Quyền kiểm tra từ DB trong transaction; khóa parent Gym trước account/role rồi update status có điều kiện. Không package/schema/migration mới.


## ADM-01 — Quản lý tài khoản tối giản (2026-10-10)

Người dùng yêu cầu góp ý thực tế và triển khai. Admin ACTIVE đã đổi mật khẩu tạm được đọc User toàn hệ thống, tìm tên/email, lọc role/status, phân trang; đọc danh mục 4 roles, không tạo/sửa role. Projection chỉ identity/contact cần quản lý, tên/avatar, trạng thái/password gate/timestamps, roles và phân công Gym ACTIVE; không hash/password/token, không health/address/birthday.

UI Khóa tạm SUSPENDED / Mở lại ACTIVE, có xác nhận. API giữ allowlist ACTIVE/INACTIVE/SUSPENDED theo spec; INACTIVE là trạng thái cũ có thể đọc và mở lại, UI không thêm nút ngừng vĩnh viễn. Không DELETE/reset password/sửa role. Chặn thay đổi trạng thái mọi tài khoản có role ADMIN, gồm actor, để tránh tự khóa hoặc mất Admin cuối; quản lý Admin ngoài scope này.

Khóa User là ngăn truy cập, không ngừng Gym/PT assignment và không hủy nghĩa vụ. Membership/Payment/Registration/Appointment/report/consultation/assignment giữ nguyên kể cả còn ACTIVE hoặc lịch PENDING/CONFIRMED; không cascade/refund/dời lịch. Manager còn hoạt động đúng Gym (hoặc PT phụ trách còn hoạt động) xử lý lịch theo quyền hiện có; Admin xem lịch và bổ nhiệm Manager tiếp quản, không được cấp thêm quyền sửa lịch; chuyển Manager cần dùng revoke/assign riêng, không tự thay thế. Mở lại không gia hạn thẻ, không reset password gate hoặc tự cấp role/assignment. Role/status được kiểm tra từ DB ở lần gọi tiếp theo; phiên JWT còn hạn không dùng private nghiệp vụ khi User không ACTIVE. JWT không có session revocation store: khi mở lại, token cũ chưa hết hạn có thể dùng lại; không tuyên bố đã thu hồi token vĩnh viễn.

Đổi trạng thái cần expected_updated_at để chống ghi đè; khóa account actor/target theo UUID tăng dần trước đọc quyền/ghi. Không cần Gym lock vì không sửa Gym/assignment/nghĩa vụ; operations Gym hiện có khóa account nên tuần tự hóa với status. Không ghi lý do không có cột lưu, không thêm Audit_Log; phát structured operational log actor/target/old/new/time sau commit, không contact/credential. Log không phải audit history bền vững trên DB. Không migration/package mới.

## QA-01 — Gia cố bảo mật và hợp đồng demo (2026-10-11)

Theo yêu cầu đề xuất và triển khai QA-01: giữ JWT + HttpOnly/Secure/SameSite=Lax và quyền hiện hành từ DB. JWT ký/xác minh HS256; subject phải là UUID trước truy vấn. Không thêm session store, role, entity hoặc migration.

Tất cả phản hồi `/api/v1` có `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`; bỏ X-Powered-By. Request ghi kiểm tra Origin chính xác theo `CORS_ORIGIN`; thiếu Origin dùng origin của Referer. Browser có Sec-Fetch-Site nhưng thiếu cả hai nguồn bị từ chối 403 UNTRUSTED_ORIGIN. Native client không có các header browser vẫn được phép và phải qua authentication/authorization bình thường. CORS không thay thế kiểm tra nguồn ghi; không dùng Host hoặc X-Forwarded-* do client gửi để tự mở quyền. GET/HEAD/OPTIONS không ghi và không chịu gate này.

Áp dụng đặc tả login đã có: tối đa 10 lượt sai/đang xử lý mỗi phút/IP trong một process, 429 RATE_LIMITED + Retry-After; đăng nhập thành công trả lại slot. Map giới hạn 10.000 IP; không nhận forwarding header làm IP. Đây là bảo vệ demo một process, restart xóa counters; triển khai nhiều instance/proxy cần thiết kế shared limiter/trust proxy riêng. Dummy Argon2id dùng cùng m=65536/t=3/p=4 với hash thật, giảm lệch chi phí verify, không tuyên bố toàn request constant-time.

Auth/Profile schema strict; current/confirm password tối đa 128 ký tự; ngày sinh phải tồn tại; avatar mới/cập nhật chỉ URL HTTP(S) không userinfo. Dữ liệu legacy không tự sửa. Tài khoản còn password gate không đọc/sửa profile; kiểm tra lại gate trong transaction ghi. `/auth/me`, đổi mật khẩu, logout vẫn theo policy cũ.

Unhandled error log chỉ event cố định, không message/cause/SQL/params. Unique conflict email/phone được unwrap qua `cause` và map constraint cho phép sang 409, không đọc raw detail. API không tồn tại trả 404 JSON chuẩn, không phản chiếu đường dẫn trong HTML. Nghiệm thu và các vấn đề dependency còn lại tại QA_01_VERIFICATION.md.

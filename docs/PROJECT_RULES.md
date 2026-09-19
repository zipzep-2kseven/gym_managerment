# Multi-Gym Project Rules

## 1. Mục Đích & Phạm Vi Áp Dụng

Tài liệu này xác lập bộ quy tắc dự án (**Project Rules**) chính thức cho toàn bộ quá trình phát triển nền tảng **Multi-Gym**.

Mọi lập trình viên và AI coding agent tham gia vào dự án bắt buộc phải tuân thủ nghiêm ngặt các quy tắc này như **luật vận hành bắt buộc** khi:
- Phân tích yêu cầu (Analyze task)
- Lập kế hoạch (Plan)
- Viết code mới (Implement)
- Chỉnh sửa và tái cấu trúc (Refactor & Fix)
- Review code
- Viết test và chạy kiểm thử (Test)
- Kiểm tra giao diện và trải nghiệm người dùng (Verify UI/UX)
- Đánh giá hoàn thành task (Definition of Done)

Tài liệu này cụ thể hóa các quyết định trong [`docs/ARCHITECTURE_DECISIONS.md`](file:///srv/gym/docs/ARCHITECTURE_DECISIONS.md) thành các quy tắc thực thi có thể kiểm chứng được.

---

## 2. Nguyên Tắc Của Project Rules

Mọi quy tắc trong tài liệu này phải ngắn gọn, rõ ràng, cụ thể và có tính thực thi:
- **Không viết quy tắc cảm tính:** Cấm các câu chung chung như *"Code phải tốt"*, *"Code phải sạch"*, *"UI phải đẹp"*.
- **Viết quy tắc kiểm chứng được:** Mọi quy tắc phải có tiêu chí rõ ràng để AI hoặc linter/test có thể kiểm tra Đúng/Sai (ví dụ: *"Mọi endpoint private bắt buộc phải đi qua middleware authentication trước khi chuyển tiếp vào controller"*).

---

## 3. Thứ Bậc Chân Lý (Source of Truth Hierarchy)

Khi có sự xung đột thông tin giữa các tài liệu hoặc giữa tài liệu và mã nguồn hiện có, áp dụng thứ tự ưu tiên tuyệt đối từ cao xuống thấp:

```text
1. Explicit user requirement của task hiện tại
   ↓
2. Architecture Decisions (docs/ARCHITECTURE_DECISIONS.md)
   ↓
3. Project Rules (Tài liệu này)
   ↓
4. Domain Rules / Feature Specifications
   ↓
5. API Contract (OpenAPI) / Database Specification
   ↓
6. Existing implementation (Mã nguồn hiện có trong repo)
   ↓
7. AI assumptions (Giả định của AI - Luôn có độ ưu tiên thấp nhất)
```

- **Quy tắc bất biến:** Không bao giờ dùng mã nguồn hiện tại làm lý do để phá vỡ `Architecture Decisions` hoặc `Project Rules`.
- **Xử lý xung đột:** Nếu yêu cầu mới từ người dùng mâu thuẫn trực tiếp với `Architecture Decisions`, AI **không được tự ý sửa kiến trúc**, phải báo cáo xung đột và đề xuất quy trình cập nhật `Architecture Decision Change`.

---

## 4. Cơ Chế Phân Loại Task (Task Dispatcher)

Trước khi viết bất kỳ dòng code nào, AI bắt buộc phải phân loại task vào một hoặc nhiều nhóm sau để kích hoạt đúng tập quy tắc tương ứng:

| Nhóm Task | Phạm vi công việc | Quy tắc & Kỹ năng bắt buộc áp dụng |
| :--- | :--- | :--- |
| **A. Backend** | Express, Route, Controller, Service, Middleware | Nhóm 9, Nhóm 6, Nhóm 7, Nhóm 8 |
| **B. Database** | PostgreSQL, Drizzle ORM, Schema, Migration, Query | Nhóm 10, Nhóm 6, `postgres-best-practices` |
| **C. AuthN / AuthZ** | Token JWT, Cookie, Password, RBAC, Gym Scope | Nhóm 7, Nhóm 8, Nhóm 6, `saas-multi-tenant` |
| **D. Frontend / UI** | React, Vite, Tailwind CSS, TanStack Query, React Router | Nhóm 12, Nhóm 13, **Tự động áp dụng Taste Skill (Nhóm 14)** |
| **E. API Contract** | OpenAPI, Request/Response DTOs, Zod schemas | Nhóm 11, Nhóm 15 |
| **F. Testing** | Vitest, Supertest, Playwright, test suites | Nhóm 16 |
| **G. Infra / Docker** | Docker Compose, Dockerfile, Container networking, Volumes | Nhóm 21 |
| **H. Documentation** | Architecture decisions, Specs, Guides | Nhóm 22 |
| **I. Cross-cutting** | Tính năng end-to-end đi qua nhiều tầng | Áp dụng đồng thời toàn bộ các nhóm liên quan |

---

## 5. Quy Tắc Phát Triển Chung (General Development Rules)

### Rule 5.1 — Không code khi chưa hiểu rõ task
Trước khi chạm vào code:
1. Đọc và hiểu kỹ yêu cầu.
2. Đối chiếu với `docs/ARCHITECTURE_DECISIONS.md`.
3. Kiểm tra các Domain/Feature rules liên quan.
4. Kiểm tra mã nguồn hiện tại để nắm convention.
5. Lập danh sách chính xác các file cần tạo/sửa.
6. Đánh giá ảnh hưởng tới các layer khác (Dependency & Contract Impact).
7. Chỉ implementation sau khi đã hoàn thành 6 bước trên.

### Rule 5.2 — Không tự ý mở rộng scope (No Scope Creep)
Tuyệt đối không tự ý:
- Thêm tính năng không được yêu cầu.
- Thêm entity mới ngoài 12 entity đã duyệt.
- Thêm endpoint API không có trong spec.
- Cài thêm thư viện (npm package) khi chưa thảo luận.
- Đổi công nghệ hoặc thay đổi kiến trúc.
Nếu phát hiện điều gì cần thiết: Ghi nhận, giải thích lý do kỹ thuật, đề xuất và chờ quyết định.

### Rule 5.3 — Không tạo workaround phá vỡ kiến trúc
Tuyệt đối không giải quyết bài toán bằng cách:
- Hard-code dữ liệu nghiệp vụ.
- Bypass middleware authentication hoặc authorization.
- Bỏ qua tầng validation Zod.
- Duplicate logic nghiệp vụ ở nhiều nơi.
- Tạo API tạm thời sai chuẩn REST.
- Đưa business logic/security check xuống UI để né backend.

---

## 6. Quy Tắc Multi-Gym (Multi-Gym Rules — CRITICAL)

Hệ thống luôn luôn hoạt động dưới mô hình **Multi-Gym**. Mọi giả định hệ thống là Single-Gym đều là vi phạm nghiêm trọng.

### Rule 6.1 — Xác định Gym Scope bắt buộc
Mọi dữ liệu và thao tác thuộc phạm vi vận hành phòng gym bắt buộc phải xác định được `gym_id`. Cấm truy cập hoặc thao tác trên tài nguyên Gym-scoped mà không xác định rõ scope.

### Rule 6.2 — Cách ly dữ liệu chéo phòng Gym (Cross-Gym Isolation)
Người dùng thuộc Gym A tuyệt đối không được:
- Đọc dữ liệu của Gym B.
- Chỉnh sửa dữ liệu của Gym B.
- Xóa dữ liệu của Gym B.
- Suy diễn hoặc dò quét dữ liệu Gym B thông qua API parameters.

### Rule 6.3 — Thẩm định Gym Scope tại Backend
Gym Scope phải được kiểm tra và thực thi tại Backend. Frontend chỉ đóng vai trò hỗ trợ trải nghiệm (UX). Backend tuyệt đối không tin tưởng mù quáng:
- `gym_id` client tự gửi lên body/header.
- `role` do client gửi.
- Các cờ quyền hạn (permission flags) do client tự xưng.

### Rule 6.4 — Bắt buộc Scope trong câu truy vấn Drizzle
Mọi truy vấn Drizzle ORM liên quan đến tài nguyên Gym-scoped bắt buộc phải có điều kiện lọc phạm vi:
```typescript
// BẮT BUỘC:
where(eq(packages.gymId, currentGymId))
```
Cấm viết các câu lệnh `SELECT`, `UPDATE`, `DELETE` thiếu điều kiện lọc `gym_id` dẫn đến nguy cơ rò rỉ dữ liệu chéo.

### Rule 6.5 — Cấm hard-code Gym
- Cấm hard-code `gym_id` dạng hằng số cố định trong code.
- Cấm tạo logic đặc thù chỉ chạy riêng cho một Gym cụ thể trừ khi có cấu hình hệ thống bằng dữ liệu.

---

## 7. Quy Tắc Xác Thực (Authentication Rules)

- **Cơ chế:** JWT (JsonWebToken) + HttpOnly Cookie.
- **Mã hóa mật khẩu:** Argon2id.

### Rule 7.1 — Cấm lưu token trong Web Storage
Tuyệt đối không lưu authentication token hoặc refresh token vào:
- `localStorage`
- `sessionStorage`
- Biến toàn cục `window` có thể bị mã độc XSS đọc lén.

### Rule 7.2 — Bảo vệ Endpoint Private
Mọi endpoint private bắt buộc phải đi qua middleware xác thực JWT từ HttpOnly Cookie trước khi request chạm vào Controller/Service.

### Rule 7.3 — Cấm ghi log thông tin nhạy cảm
Tuyệt đối không log ra console, file log hay monitoring:
- Mật khẩu gốc.
- Chuỗi password hash Argon2id.
- Chuỗi JWT raw token hoặc secret key.
- Cookie xác thực và session credentials.

### Rule 7.4 — Backend là thẩm quyền xác thực duy nhất
Frontend không được tự quyết định rằng người dùng "đã đăng nhập an toàn" chỉ dựa vào local state. Mọi trạng thái xác thực phải được xác nhận qua response từ endpoint `/auth/me` của Backend.

---

## 8. Quy Tắc Phân Quyền (Authorization Rules)

- **Mô hình:** RBAC (Role-Based Access Control) kết hợp chặt chẽ với Gym Scope Enforcement.
- **5 Roles chính thức:** `Guest`, `Customer`, `PT`, `Manager`, `Admin`.

### Rule 8.1 — Role không bao giờ là yếu tố duy nhất
Cấm viết code kiểu:
```typescript
// SAI NGHIÊM TRỌNG:
if (user.role === 'MANAGER') return allow();
```
Phải luôn thẩm định:
$$\text{Action} + \text{Resource} + \mathbf{\text{Gym Scope}} + \text{Assignment/Ownership}$$

### Rule 8.2 — Quyền hạn Manager
Manager chỉ có quyền quản trị phòng Gym duy nhất mà mình được Admin bổ nhiệm (`Gym_Manager`). Cấm Manager Gym A can thiệp Gym B.

### Rule 8.3 — Quyền hạn Huấn Luyện Viên (PT)
PT chỉ có quyền truy cập học viên, gói tập và lịch hẹn trong phạm vi Gym mà mình được chỉ định hợp đồng (`Gym_Trainer`).

### Rule 8.4 — Quyền hạn Admin
Admin có thẩm quyền toàn hệ thống nhưng mọi thao tác vẫn phải đi qua pipeline xác thực và ghi vết audit log đầy đủ.

### Rule 8.5 — Frontend không phải ranh giới an toàn (Security Boundary)
Việc Frontend ẩn nút, disable link, hoặc redirect trang chỉ là tối ưu UX. Backend luôn luôn phải kiểm tra lại quyền hạn độc lập trên từng request.

---

## 9. Quy Tắc Kiến Trúc Backend (Backend Architecture Rules)

- **Công nghệ:** Express + TypeScript (ESM) + REST API + Zod + Drizzle ORM + PostgreSQL 17.
- **Luồng xử lý chuẩn:**
  $$\text{Request} \longrightarrow \text{Middleware} \longrightarrow \text{Route} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Data Access (Drizzle)} \longrightarrow \text{PostgreSQL}$$

### Rule 9.1 — Trách nhiệm của Controller
Controller chỉ làm 4 việc:
1. Tiếp nhận HTTP Request.
2. Trích xuất input đã validate.
3. Gọi Application Service tương ứng.
4. Định dạng và trả về HTTP Response.
*Cấm nhồi nhét business logic phức tạp hoặc câu query DB trong controller.*

### Rule 9.2 — Trách nhiệm của Service
Toàn bộ logic nghiệp vụ, tính toán, kiểm tra quy tắc Multi-Gym phải nằm trong tầng Service.

### Rule 9.3 — Truy cập Dữ liệu độc quyền qua Drizzle
Mọi thao tác với database phải thông qua Drizzle ORM schema và client. Cấm cài đặt thêm thư viện truy vấn thứ hai (như Prisma, TypeORM, hoặc raw SQL client riêng).

### Rule 9.4 — Validation bắt buộc với Zod
Toàn bộ dữ liệu đầu vào (`req.body`, `req.query`, `req.params`) phải được validate bằng Zod schema trước khi chuyển sang Service. Frontend validation không thay thế cho Backend validation.

### Rule 9.5 — Xử lý lỗi an toàn
Không bao giờ trả về stack trace, thông tin hệ thống nội bộ hoặc chi tiết lỗi cơ sở dữ liệu cho client trong môi trường production. Trả về cấu trúc lỗi chuẩn:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message"
  }
}
```

---

## 10. Quy Tắc Cơ Sở Dữ Liệu (Database Rules)

- **Động cơ:** PostgreSQL 17.
- **ORM:** Drizzle ORM.

### Rule 10.1 — Cấm thêm ORM khác
Không cài đặt hay sử dụng thêm bất kỳ thư viện ORM nào khác ngoài Drizzle ORM.

### Rule 10.2 — Schema phản ánh đúng Domain
Bảng cơ sở dữ liệu phải bám sát chính xác các Domain Entities đã duyệt. Cấm tạo bảng tùy tiện chỉ để lưu object tạm của frontend.

### Rule 10.3 — Toàn vẹn dữ liệu quan hệ
Mọi quan hệ dữ liệu phải có Foreign Key, ràng buộc `NOT NULL`, Unique Constraint và Index phù hợp (đặc biệt là index trên các trường `gym_id`, `user_id`).

### Rule 10.4 — Chiến lược Gym-Scoped Data
Mọi bảng lưu trữ dữ liệu thuộc về Gym bắt buộc phải có cột `gym_id UUID NOT NULL REFERENCES gyms(id)`.

### Rule 10.5 — Quy trình Migration duy nhất
Mọi thay đổi cấu trúc bảng phải được tạo qua file migration của Drizzle (`drizzle-kit generate` $\rightarrow$ `drizzle-kit migrate`). Cấm sửa bảng trực tiếp bằng tay trên database production/dev mà không có file migration.

---

## 11. Quy Tắc Thiết Kế API (API Rules)

### Rule 11.1 — Naming Endpoint chuẩn RESTful
- Sử dụng danh từ số nhiều (ví dụ: `/api/v1/gyms`, `/api/v1/packages`).
- Định danh tài nguyên qua URL: `/api/v1/gyms/:gymId/packages/:packageId`.

### Rule 11.2 — Đúng ngữ nghĩa HTTP Method
- `GET`: Đọc dữ liệu (Idempotent, an toàn).
- `POST`: Tạo mới tài nguyên.
- `PATCH`: Cập nhật một phần tài nguyên.
- `DELETE`: Xóa tài nguyên.

### Rule 11.3 — Bắt buộc Validate Input
Mọi endpoint nhận dữ liệu phải khai báo Zod schema tương ứng.

### Rule 11.4 — Format Response đồng nhất
Mọi response trả về client phải tuân theo cấu trúc bao bọc chuẩn:
- Thành công: `{ "success": true, "data": ... }`
- Thất bại: `{ "success": false, "error": { "code": "...", "message": "..." } }`

### Rule 11.5 — Endpoint Private có Guard
Mọi route private phải khai báo rõ middleware xác thực và phân quyền trong file routes.

### Rule 11.6 — Bất biến API Contract
Không được tự ý thay đổi cấu trúc request/response mà không cập nhật tài liệu OpenAPI và thông báo ảnh hưởng tới Frontend.

---

## 12. Quy Tắc Frontend (Frontend Architecture Rules)

- **Stack:** React 18 + Vite + TypeScript + React Router + TanStack Query + Tailwind CSS.

### Rule 12.1 — Quản lý Server State độc quyền bằng TanStack Query
Dữ liệu lấy từ API phải được quản lý thông qua TanStack Query (`useQuery`, `useMutation`). Cấm tự tạo store toàn cục (Redux, Zustand) chỉ để lưu server data khi TanStack Query đã đảm nhận xuất sắc việc caching và refetching.

### Rule 12.2 — Bảo vệ Protected Routes
Các route yêu cầu đăng nhập hoặc yêu cầu Role cụ thể bắt buộc phải được bao bọc bởi Route Guards tương ứng (`RequireAuth`, `RequireRole`, `GymScopeGuard`).

### Rule 12.3 — Không chứa Security Logic nhạy cảm
Frontend không bao giờ chứa secret key, thuật toán phân quyền tối mật hay business rules quan trọng.

### Rule 12.4 — Không nhân bản logic Fetching
Mọi API call phải được định nghĩa tập trung trong tầng `src/services/` hoặc `src/hooks/` dưới dạng custom hooks (ví dụ: `usePackages(gymId)`), không viết `fetch`/`axios` rải rác bên trong UI components.

---

## 13. Quy Tắc Thiết Kế UI / UX (UI / UX Rules)

- **Phong cách:** **Minimalist — Modern — Clean — Professional**.
- **Bảng màu:**
  - **Dark Navy (`#0F172A` / `#0A0F1D`)**: Trọng tâm, sang trọng, kỷ luật.
  - **Red (`#E11D48` / `#EF4444`)**: Điểm nhấn thể thao, CTA chính.
  - **White (`#FFFFFF`)**: Nền sáng, sạch sẽ, thoáng đãng.
  - **Light Gray (`#F1F5F9` / `#E2E8F0`)**: Nền phụ, viền mảnh tinh tế.

### Rule 13.1 — Tự động tuân thủ Taste Skill
Mọi tác vụ giao diện bắt buộc phải đọc và tuân thủ các quy tắc anti-slop chi tiết trong [`.taste-skill/skills/taste-skill/SKILL.md`](file:///srv/gym/.taste-skill/skills/taste-skill/SKILL.md).

### Rule 13.2 — Nhất quán Design Tokens
Cấm tự ý pha màu mới, cấm dùng font tùy tiện ngoài hệ thống, cấm đổi bán kính bo góc lộn xộn. Tuân thủ bảng màu và scale token đã định.

### Rule 13.3 — Tối giản công năng (Minimalism)
Không nhồi nhét thành phần trang trí vô nghĩa. Mọi thẻ, nút, văn bản phải phục vụ mục tiêu hành động rõ ràng của người dùng.

### Rule 13.4 — Tiết chế Animation
Chuyển động phải nhẹ (< 300ms), mượt mà và có mục đích xúc giác (hover feedback, active press feedback, modal transition). Cấm dùng animation bay lượn nặng nề chỉ để biểu diễn.

### Rule 13.5 — Responsive toàn diện
Giao diện phải hiển thị hoàn hảo trên Desktop (1440px/1024px), Tablet (768px) và Mobile (375px).

### Rule 13.6 — Khả năng tiếp cận (Accessibility - a11y)
- Độ tương phản chữ đạt chuẩn WCAG AA (tối thiểu 4.5:1).
- Có trạng thái `focus-visible` rõ ràng khi dùng phím Tab.
- Nhãn Label luôn nằm trên ô Input.

---

## 14. Cơ Chế Tự Động Kích Hoạt Taste Skill (Taste Skill Auto-Activation)

Khi nhận bất kỳ task nào có chứa một trong các từ khóa sau:
> *UI, UX, giao diện, page, screen, màn hình, component, layout, dashboard, form, button, modal, table, card, responsive, animation, visual, design, styling, mobile, tablet...*

AI **PHẢI TỰ ĐỘNG** thực hiện quy trình:
$$\text{UI Task} \longrightarrow \text{Đọc Taste Skill} \longrightarrow \text{Tuyên bố Design Read & Dials} \longrightarrow \text{Triển khai React Code}$$

**Developer KHÔNG CẦN phải nhắc lại:** *"Hãy sử dụng Taste Skill"*.

---

## 15. Quy Tắc Thư Viện Dùng Chung (`packages/shared`)

`packages/shared` chỉ dùng để chia sẻ các tài nguyên thực sự cần thiết giữa Backend và Frontend:
- Interfaces, Types, Enums nghiệp vụ.
- Hằng số hệ thống (`APP_NAME`, Regex, Error Codes).
- Zod Validation Schemas dùng chung.

**Cấm:**
- Không đưa logic chỉ chạy ở server vào `shared`.
- Không đưa code kết nối database hoặc Drizzle instance vào `shared`.
- Không biến `shared` thành bãi rác chứa các hàm helper không liên quan.

---

## 16. Quy Tắc Kiểm Thử (Testing Rules)

- **Bộ công cụ:** Vitest (Unit), Supertest (API Integration), Playwright (E2E).

### Rule 16.1 — Kiểm thử nghiệp vụ lõi
Mọi logic tính toán, phân quyền, xử lý hợp đồng hội viên bắt buộc phải có unit test bao phủ.

### Rule 16.2 — Kiểm thử an toàn bảo mật (Security Tests bắt buộc)
Mọi API bảo vệ bắt buộc phải có integration test kiểm thử các ca:
- Không gửi token $\rightarrow$ Trả về `401 Unauthorized`.
- Token sai role $\rightarrow$ Trả về `403 Forbidden`.
- **Manager Gym A cố tình truy cập tài nguyên Gym B $\rightarrow$ Trả về `403 Forbidden` (Bắt buộc kiểm thử Cross-Gym Data Leakage)**.

### Rule 16.3 — Bao phủ cả Happy Path và Failure Path
Không chỉ test trường hợp thành công; phải test cả trường hợp validation thất bại, dữ liệu trùng lặp, tài nguyên không tồn tại.

### Rule 16.4 — Cấm sửa test để né lỗi
Tuyệt đối không sửa đổi hay xóa bỏ test case hợp lệ chỉ để làm cho code chạy pass giả tạo.

---

## 17. Quy Tắc Về Thanh Toán (Payment Rule — STRICT OUT OF SCOPE)

> [!CAUTION]
> **PAYMENT HIỆN TẠI LÀ: OUT OF SCOPE — CURRENT PHASE**

AI **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP** tự ý tạo:
- Entity hoặc bảng dữ liệu `Payment` / `Invoice` / `Transaction`.
- Payment API endpoints hoặc controllers.
- Payment business services hoặc helpers.
- Payment UI components hoặc form thanh toán.
- Webhooks hoặc tích hợp các cổng thanh toán (Stripe, VNPay, MoMo, VietQR).

Nếu một tính năng yêu cầu kích hoạt dịch vụ, xử lý dưới dạng trạng thái hợp đồng (ví dụ: `Membership` kích hoạt trực tiếp ở trạng thái test hoặc chờ duyệt), không triển khai module thanh toán.

---

## 18. Quy Tắc Giới Hạn Phạm Vi Domain (Domain Scope Rule)

Hệ thống chỉ bao gồm chính xác **12 thực thể nghiệp vụ cốt lõi**:
1. `User`
2. `User_Profile`
3. `Role`
4. `User_Role`
5. `Gym`
6. `Gym_Manager`
7. `Gym_Trainer`
8. `Package`
9. `Membership`
10. `PT_Registration`
11. `PT_Appointment`
12. `Gym_Report`

**Cấm tự ý tạo thực thể thứ 13.** Nếu phát hiện yêu cầu nghiệp vụ đòi hỏi thực thể mới:
1. Dừng việc tạo bảng/entity.
2. Báo cáo và giải trình tại sao 12 entity hiện tại không đáp ứng được.
3. Chờ quyết định phê duyệt chính thức từ User/Lead.

---

## 19. Quy Chuẩn Chất Lượng Mã Nguồn (Code Quality Rules)

- **Tiêu chuẩn:** Code phải trực diện, dễ đọc, dễ bảo trì, an toàn kiểu dữ liệu (type-safe) và dễ kiểm thử.
- **Cấm Over-Engineering:** Không tạo các lớp wrapper trừu tượng không cần thiết.
- **Cấm Copy-Paste:** Tái sử dụng hợp lý qua các services/components dùng chung.
- **Cấm dùng `any`:** Không dùng kiểu `any` để trốn tránh lỗi TypeScript.
- **Cấm nuốt lỗi (Silent Failure):** Không viết `catch (e) {}` rỗng mà không xử lý hoặc log lỗi.

---

## 20. Quản Lý Biến Môi Trường & Bí Mật (Environment & Secrets)

- Tuyệt đối không commit file `.env`, mật khẩu, JWT secret, API key, database credentials, SSH key vào Git.
- Toàn bộ bí mật phải được nạp thông qua biến môi trường `process.env`.
- Mẫu cấu hình bắt buộc phải được cập nhật tương ứng vào `.env.example`.

---

## 21. Quy Tắc Vận Hành Docker (Docker Rules)

- Docker Compose là môi trường phát triển mặc định gồm 3 services: `postgres`, `api`, `web`.
- Không tự ý thêm các container hạ tầng khác (Redis, Kafka, MinIO...) khi chưa có quyết định kiến trúc.
- Khi chỉnh sửa cấu hình Docker, luôn kiểm tra:
  - Network nội bộ (`multi_gym_network`).
  - Persistent volume (`multi_gym_postgres_data`).
  - Healthcheck của database.
  - Chạy `docker compose config` để xác thực cú pháp trước khi chạy container.

---

## 22. Quy Tắc Tài Liệu Hóa (Documentation Rules)

- Mọi quyết định kiến trúc phải được ghi nhận tại [`docs/ARCHITECTURE_DECISIONS.md`](file:///srv/gym/docs/ARCHITECTURE_DECISIONS.md).
- Mọi hợp đồng API phải được cập nhật vào tài liệu OpenAPI / API Contract.
- Không để các quy tắc nghiệp vụ quan trọng chỉ nằm trong prompt chat hoặc trí nhớ tạm thời của AI.

---

## 23. Quy Trình Quản Lý Thay Đổi (Change Management)

Nếu một yêu cầu phát sinh đòi hỏi thay đổi các quyết định kiến trúc nền tảng (đổi ORM, đổi Database, đổi cơ chế Auth, mở rộng Domain Scope, kích hoạt Payment):
1. **Dừng triển khai ngay lập tức.**
2. Báo cáo xung đột kỹ thuật (Conflict Notification).
3. Phân tích tác động chi tiết (Impact Analysis).
4. Đề xuất phương án sửa đổi tài liệu Architecture Decision.
5. Chỉ được viết code sau khi User/Lead đã phê duyệt chính thức bằng văn bản.

---

## 24. Quy Trình Xác Thực Trước Khi Báo Cáo Hoàn Thành (Verification Checklist)

Trước khi công bố một task đã hoàn thành, AI bắt buộc phải tự rà soát theo 8 câu hỏi kiểm định:
1. **Architecture:** Code có vi phạm bất kỳ quyết định nào trong `docs/ARCHITECTURE_DECISIONS.md` không?
2. **Scope:** Có phát sinh entity hoặc feature ngoài phạm vi (như Payment) không?
3. **Security:** Authentication, Authorization và Gym Scope đã được thẩm định an toàn tại Backend chưa?
4. **Database:** Query có khả năng làm lộ dữ liệu chéo giữa các Gym không? Migration có chạy mượt mà không?
5. **API:** Validation Zod có đầy đủ không? Có làm gãy API contract hiện có không?
6. **Frontend:** UI có tuân thủ phong cách Minimalist Modern không? Đã áp dụng Taste Skill chưa? Có responsive không?
7. **Testing:** Test liên quan đã được viết, cập nhật và chạy pass 100% chưa?
8. **Secrets:** Có bất kỳ password, secret, hay API key nào bị hard-code hoặc lọt vào Git không?

---

## 25. Tiêu Chuẩn Hoàn Thành (Definition of Done — DoD)

Một task chỉ được coi là hoàn tất khi thỏa mãn đầy đủ các tiêu chí:

- [ ] Yêu cầu được hiểu sâu sắc và triển khai đúng phạm vi cho phép.
- [ ] Không vi phạm `docs/ARCHITECTURE_DECISIONS.md`.
- [ ] Không vi phạm bất kỳ điều khoản nào trong `Project Rules`.
- [ ] Cách ly Multi-Gym được đảm bảo tuyệt đối trên mọi API và câu query liên quan đến Gym.
- [ ] Authentication & Authorization được kiểm tra nghiêm ngặt tại Backend.
- [ ] Toàn bộ input từ client được validate bằng Zod schemas.
- [ ] Business logic nằm đúng tại tầng Service, không nằm trong Controller hay UI Component.
- [ ] API Contract / OpenAPI được cập nhật nếu có thay đổi endpoint.
- [ ] Database migration được tạo và kiểm tra nếu có thay đổi cấu trúc bảng.
- [ ] Test cases tương ứng (Unit, Integration hoặc Cross-Gym check) đã được viết và pass.
- [ ] Tác vụ UI/UX đã áp dụng triệt để Taste Skill và kiểm tra Responsive (Desktop, Tablet, Mobile).
- [ ] Không hard-code bất kỳ secret hoặc thông tin xác thực nào.
- [ ] Không tự ý tạo entity thứ 13 hoặc tính năng Payment.
- [ ] Đã chạy quy trình Verification kiểm tra thực tế.

---

## 26. Quy Chuẩn Báo Cáo Kết Quả (Reporting Standard)

Sau mỗi task implementation, AI phải báo cáo theo cấu trúc ngắn gọn chuẩn mực:

```markdown
### Changed
- Danh sách các file đã tạo mới hoặc chỉnh sửa.

### Why
- Lý do kỹ thuật thực hiện thay đổi.

### Tests
- Các lệnh test đã chạy và kết quả thực tế.

### Verification
- Tóm tắt kết quả kiểm định về Security, Gym Scope, Validation, và UI.

### Issues
- Các vấn đề tồn đọng hoặc rủi ro kỹ thuật cần lưu ý (nếu có).

### Architecture Impact
- Ghi rõ: "None" HOẶC "Requires Architecture Decision Review" (kèm mô tả phần bị ảnh hưởng).
```

---

## 27. Nguyên Tắc Tối Thượng (The Final Rule)

Tài liệu Project Rules này là **hiến pháp kỹ thuật** của dự án Multi-Gym Platform.

Mọi hành động của AI Coding Agent bắt buộc phải tuân theo chu trình:
$$\mathbf{READ} \longrightarrow \mathbf{UNDERSTAND} \longrightarrow \mathbf{PLAN} \longrightarrow \mathbf{IMPLEMENT} \longrightarrow \mathbf{VERIFY}$$

**TUYỆT ĐỐI KHÔNG ĐƯỢC:**
$$\mathbf{GUESS} \longrightarrow \mathbf{CODE} \longrightarrow \mathbf{HOPE}$$

Khi phát hiện thiếu thông tin hoặc yêu cầu không rõ ràng:
- Không tự suy đoán nghiệp vụ quan trọng.
- Không tự ý mở rộng phạm vi.
- Không tự ý sửa đổi kiến trúc.
- Dừng lại, nêu rõ giả định hoặc đặt câu hỏi để nhận chỉ đạo chính xác từ Lead/User.

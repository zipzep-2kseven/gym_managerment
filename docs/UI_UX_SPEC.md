# Multi-Gym Platform — UI/UX Specification

Đặc tả giao diện theo ERD 21 bảng, [API_SPEC.md](API_SPEC.md) và [FEATURE_SPEC.md](FEATURE_SPEC.md). Giữ phong cách, design tokens, responsive và accessibility hiện có; cập nhật dữ liệu/form/action theo thiết kế mới. Đây là tài liệu, không phải giao diện đã triển khai.

Các mã Q tham chiếu [DOMAIN_RULES.md §9](DOMAIN_RULES.md#9-câu-hỏi-mở-và-phạm-vi-chặn) là ghi chú cho đội phát triển, không hiển thị mã kỹ thuật hoặc lý do schema trên màn hình người dùng. Chức năng DRAFT chưa được phát hành; không tạo nút gọi API chưa có contract hoặc mô phỏng thành công.

## 1. UI/UX PRINCIPLES

### 1.1. Triết Lý Thiết Kế (Design Direction)
Hệ thống Web tập Gym — Multi-Gym Platform được định vị là nền tảng quản trị và vận hành thể thao chuyên nghiệp. Định hướng thiết kế tuân thủ nghiêm ngặt **Taste Skill: Premium Utilitarian Minimalism & Editorial UI**:
- **Minimalist & Clean:** Giao diện tài liệu hóa (document-style), tập trung vào dữ liệu nghiệp vụ, cắt giảm tối đa các chi tiết trang trí rườm rà.
- **Modern & Professional:** Đậm chất kỹ thuật số, tin cậy, sắc nét.
- **Bảng màu chủ đạo:** Dark Navy (`#0B132B` / `#1C2541`), Crimson Red (`#DC2626` / `#B91C1C`), Pure White (`#FFFFFF`), Light Slate/Bone Gray (`#F8FAFC` / `#F1F5F9`).
- **Kiềm chế thị giác (Visual Restraint):**
  - Tuyệt đối **không sử dụng gradient đa sắc sặc sỡ**.
  - **Hạn chế shadow:** Không dùng drop-shadow đậm màu hay mờ ảo diện rộng; ưu tiên viền phẳng siêu mảnh (`1px solid #E2E8F0`).
  - **Hạn chế card lồng card (Card-in-card nesting):** Giảm thiểu phân mảnh giao diện thành quá nhiều ô hộp nhỏ.
  - **Border radius vừa phải:** Bo góc từ `4px` đến `8px` cho components; chỉ sử dụng `rounded-full` cho Status Badges và User Avatars.
  - **Micro-animation có mục đích:** Thời gian chuyển động ngắn ($\le 250\text{ms}$), gia tốc `ease-out`, phục vụ phản hồi xúc giác (hover, focus, modal open) thay vì hiệu ứng biểu diễn.

### 1.2. Phân Cấp Thị Giác (Visual Hierarchy)
- **Typographic Dominance:** Sử dụng độ tương phản kích thước và trọng lượng font để dẫn dắt mắt đọc thay vì dùng mảng màu nổi bật.
- **Khoảng trống chủ động (Macro-Whitespace):** Sử dụng padding và margin hào phóng (`24px` – `48px`) giữa các khối chức năng lớn để tạo cảm giác thoáng đãng, dễ đọc.
- **Màu nhấn có kiểm soát (Scarce Color):** Màu đỏ Crimson và các gam màu pastel nhạt chỉ xuất hiện tại các điểm kích hoạt hành động chính (Primary CTA), trạng thái cảnh báo hoặc tag định danh.

### 1.3. Bố Cục & Trình Bày (Layout Principles)
- **Khung lưới chuẩn:** Hệ thống CSS Grid / Flexbox đáp ứng theo chiều dọc (Vertical Rhythm) 4px.
- **Vùng nội dung trọng tâm:** Không thiết kế dashboard dạng "card grid dày đặc" (dense widget soup). Mỗi màn hình tập trung vào 1 bảng điều khiển cốt lõi hoặc 1 bảng dữ liệu chính kèm thanh công cụ thao tác rõ ràng.

### 1.4. Nguyên Tắc Thích Ứng (Responsive Principles)
- Hệ thống hỗ trợ hoàn chỉnh 3 nhóm thiết bị: Desktop ($\ge 1024\text{px}$), Tablet ($768\text{px} - 1023\text{px}$), Mobile ($< 768\text{px}$).
- **Không co ép dữ liệu Desktop xuống Mobile:** Trên màn hình nhỏ, các bảng dữ liệu phức tạp (Table) tự động chuyển sang dạng thẻ tóm tắt (Summary Cards) có khả năng xem chi tiết; Menu bên (Sidebar) ẩn vào Drawer trượt.

### 1.5. Trợ Năng & Dễ Tiếp Cận (Accessibility - WCAG AA)
- Độ tương phản chữ tối thiểu: `4.5:1` cho nội dung thông thường và `3:1` cho tiêu đề lớn.
- Bắt buộc hỗ trợ điều hướng hoàn toàn bằng bàn phím (Keyboard Navigation với Focus Ring rõ nét `outline: 2px solid #1C2541`).
- Mọi trường nhập liệu đều gắn nhãn tường minh `<label for="...">`, hỗ trợ đọc màn hình qua các thuộc tính ARIA (`aria-describedby`, `aria-invalid`, `aria-live`).

### 1.6. Trạng Thái Giao Diện Chuẩn Hóa (Standard UI States)
Mọi khối giao diện tải dữ liệu đều có 4 trạng thái bắt buộc:
1. **Loading State:** Sử dụng Skeleton Shimmer tông xám nhạt phẳng (`#F1F5F9` $\leftrightarrow$ `#E2E8F0`), giữ nguyên khung kích thước thật của nội dung để chống giật layout (Layout Shift).
2. **Empty State:** Biểu tượng đường nét tối giản (Minimal SVG Line Icon), 1 câu giải thích rõ ràng (ví dụ: *"Chưa có lịch hẹn nào sắp tới"*), và 1 nút bấm Primary CTA dẫn tới hành vi khởi tạo (nếu người dùng có quyền).
3. **Error State:** Khung cảnh báo màu đỏ pastel nhẹ (`#FEF2F2`), viền đỏ nhạt (`#FECACA`), thông điệp giải thích thân thiện và nút "Thử lại" (Retry Action).
4. **Success State:** Phản hồi xúc giác tức thì: Modal đóng lại, dòng dữ liệu mới chèn vào đầu bảng với viền sáng thoáng qua ($300\text{ms}$), kèm thông báo Toast nổi nhẹ góc dưới màn hình.

### 1.7. Biểu Mẫu & Xác Thực (Form Validation UX)
- **Inline Validation:** Kiểm tra lỗi ngay khi người dùng rời khỏi ô nhập liệu (`onBlur`). Khi đang gõ (`onChange`), nếu đã có lỗi thì xóa lỗi khi người dùng sửa đúng.
- **Disable Submit & Anti-Double-Click:** Khi đang gửi request (Pending/Submitting), nút bấm bị vô hiệu hóa, chuyển sang trạng thái Loading Spinner và ngăn chặn bấm nhiều lần.
- **Server Error Mapping:** Ánh xạ chính xác mã lỗi từ `API_SPEC.md` thành thông báo trực tiếp dưới trường tương ứng (ví dụ: `409` slot conflict, `400` invalid time range).

### 1.8. Hộp Thoại Xác Nhận (Confirmation Dialogs)
- Bắt buộc áp dụng cho mọi thao tác phá hủy (Destructive) hoặc thay đổi trạng thái lớn: Bãi nhiệm Manager, ngừng phân công PT, hủy ca tập, đổi PT (chỉ khi action đã có policy và API được duyệt).
- Dialog gồm: Tiêu đề rõ ràng, mô tả hệ quả nghiệp vụ ngắn gọn, nút Hủy (Secondary) và nút Xác nhận (Destructive Red hoặc Solid Navy).

### 1.9. Cơ Chế Thông Báo (Toast Notification)
- Vị trí: Cố định góc dưới bên phải (`bottom-right`), nổi nhẹ trên nền trắng, viền mảnh `1px solid #E2E8F0`.
- Thời lượng: Tự biến mất sau `4000ms` đối với thành công (`Success`) / thông tin (`Info`); giữ nguyên cho tới khi bấm đóng đối với lỗi nghiêm trọng (`Error`).

---

## 2. DESIGN TOKENS

Toàn bộ giao diện sử dụng các biến CSS Design Tokens tập trung. Tuyệt đối không hard-code mã màu hay giá trị ad-hoc trong mã nguồn thành phần.

```css
:root {
  /* --- Brand & Monochrome Palette --- */
  --color-canvas: #FFFFFF;
  --color-canvas-subtle: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-hover: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-subtle: #F1F5F9;
  --color-border-strong: #CBD5E1;

  /* Typography Colors */
  --color-text-primary: #0F172A;     /* Slate 900 */
  --color-text-secondary: #475569;   /* Slate 600 */
  --color-text-muted: #94A3B8;       /* Slate 400 */
  --color-text-inverse: #FFFFFF;

  /* Dark Navy (Primary Accent) */
  --color-navy-900: #0B132B;
  --color-navy-800: #1C2541;
  --color-navy-700: #2F3E66;

  /* Crimson Red (Action & Destructive Accent) */
  --color-crimson-700: #B91C1C;
  --color-crimson-600: #DC2626;
  --color-crimson-500: #EF4444;
  --color-crimson-50: #FEF2F2;

  /* Semantic State Colors */
  --color-success-text: #166534;
  --color-success-bg: #DCFCE7;
  --color-warning-text: #854D0E;
  --color-warning-bg: #FEF9C3;
  --color-error-text: #991B1B;
  --color-error-bg: #FEE2E2;
  --color-info-text: #1E40AF;
  --color-info-bg: #DBEAFE;
  --color-neutral-text: #334155;
  --color-neutral-bg: #F1F5F9;

  /* --- Typography Hierarchy --- */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Geist Sans", Helvetica, Arial, sans-serif;
  --font-mono: "Geist Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --text-display: 700 2rem/1.25 var(--font-sans);      /* 32px */
  --text-h1: 600 1.5rem/1.3 var(--font-sans);           /* 24px */
  --text-h2: 600 1.25rem/1.35 var(--font-sans);         /* 20px */
  --text-h3: 600 1rem/1.4 var(--font-sans);             /* 16px */
  --text-body: 400 0.875rem/1.5 var(--font-sans);       /* 14px */
  --text-body-medium: 500 0.875rem/1.5 var(--font-sans);
  --text-caption: 400 0.75rem/1.4 var(--font-sans);     /* 12px */
  --text-mono-data: 400 0.8125rem/1.4 var(--font-mono); /* 13px */

  /* --- Spacing Scale (4px Base) --- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* --- Border Radius --- */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* --- Elevation & Shadows (Subtle / Flat) --- */
  --shadow-none: none;
  --shadow-subtle: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-dropdown: 0 4px 12px 0 rgba(15, 23, 42, 0.08);
  --shadow-modal: 0 8px 24px 0 rgba(15, 23, 42, 0.12);

  /* --- Motion / Timing --- */
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 250ms;
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---


## 3. Layout, navigation và Gym Scope

- PublicLayout: điều hướng Gym, gói tập, PT, đăng ký/đăng nhập; AuthLayout cho biểu mẫu xác thực.
- CustomerLayout: hồ sơ, thanh toán, thẻ hội viên, đăng ký PT, lịch và phản ánh cá nhân.
- PTLayout: hồ sơ, học viên được giao, lịch dạy. Scope từ phân công và API, không tự chuyển tới Gym chưa được cấp quyền.
- ManagerLayout: thông tin Gym, PT, gói tập, hội viên, lịch, thiết bị, báo cáo. Hiển thị Gym đang quản lý cố định; giữ giới hạn một Gym ACTIVE theo Domain.
- AdminLayout: tài khoản, role, Gym, bổ nhiệm Manager và báo cáo theo Gym. Chọn Gym là bộ lọc, mọi request vẫn được kiểm tra backend.
- Header hiển thị tên Gym từ dữ liệu được cấp quyền. users không có gym_id. Customer nhiều bản ghi Membership không đồng nghĩa được dùng đồng thời nhiều Gym khi Q-08 chưa chốt.
- Khi must_change_password=true, dẫn tới khu vực đổi mật khẩu trước các trang nghiệp vụ; vẫn cho logout. Không lưu JWT trong localStorage/sessionStorage.

## 4. Screen inventory và đặc tả

Giữ các mã màn hình hiện có; thêm màn hình Payment và Equipment. Route frontend dưới đây là route UI; API mapping lấy theo Feature ID tại API Spec §6, không tự suy ra endpoint từ route UI.

### SCR-GST-001: Landing Page (Trang Chủ Nền Tảng)

- **Route:** `/`.
- **Feature/API mapping:** `FEAT-GYM-001`.
- **Dữ liệu và thao tác:** Giới thiệu nền tảng; danh sách Gym công khai từ API, CTA tìm Gym/đăng ký. Không hiển thị số liệu hoặc thống kê giả.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-002: Public Gym Directory (Danh Sách Phòng Gym)

- **Route:** `/gyms`.
- **Feature/API mapping:** `FEAT-GYM-001`.
- **Dữ liệu và thao tác:** Danh sách gym_name, address, phone, logo_url; tìm kiếm và phân trang page/pageSize. Tọa độ là dữ liệu vị trí, chưa tự chọn dịch vụ bản đồ hoặc thuật toán tìm gần nhất.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-003: Public Gym Detail (Chi Tiết Phòng Gym)

- **Route:** `/gyms/:gymId`.
- **Feature/API mapping:** `FEAT-GYM-002`, `FEAT-GIM-001`, `FEAT-REV-001`, `FEAT-CON-001`.
- **Dữ liệu và thao tác:** Hiển thị description, email, phone, address, logo_url, latitude/longitude, opening_time/closing_time từ API; không coi giờ mở cửa/logo là nội dung tĩnh nữa. Gallery ảnh thực tế tách logo, mô tả/tiện ích hiện có, Package, review VISIBLE và PT thuộc Gym. Hai CTA chính: “Đăng ký ngay” → chọn Package; “Đặt lịch tư vấn” → form không bắt login. Liên kết xem PT là điều hướng phụ, không chen bước chọn PT vào checkout.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-004: Public Gym Packages (Danh Sách Gói Tập Cơ Sở)

- **Route:** `/gyms/:gymId/packages`.
- **Feature/API mapping:** `FEAT-PKG-001`, `FEAT-PKG-002`.
- **Dữ liệu và thao tác:** Hiển thị package_name, duration_days, price, description. CTA mua gói dẫn chọn/xác nhận Package; vị trí login/register theo Q-17 trước Payment cần user_id; không có bước chọn PT; không hiển thị quota hoặc loại gói không có trong ERD.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-005: Public Gym Trainers (Đội Ngũ Huấn Luyện Viên Cơ Sở)

- **Route:** `/gyms/:gymId/trainers`.
- **Feature/API mapping:** `FEAT-TRN-001`, `FEAT-TRN-002`.
- **Dữ liệu và thao tác:** Họ tên/avatar công khai, specialization, experience_years, bio, availability; liên kết xem profile chi tiết. Hiển thị “Liên hệ để trao đổi”, không chào giá PT cố định. Chỉ sau Membership và thống nhất mới sang đăng ký PT; không yêu cầu nhập số buổi quota.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-006: Customer Register (Đăng Ký Tài Khoản Khách Hàng)

- **Route:** `/register`.
- **Feature/API mapping:** `FEAT-AUTH-001`.
- **Dữ liệu và thao tác:** Form email, password, full_name, phone tùy chọn. Chuẩn validation theo API; số điện thoại lưu ở User. Không cho chọn role.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-007: User Login (Đăng Nhập Người Dùng)

- **Route:** `/login`.
- **Feature/API mapping:** `FEAT-AUTH-002`, `FEAT-AUTH-004`.
- **Dữ liệu và thao tác:** Đăng nhập email/password. Đọc must_change_password để dẫn tới đổi mật khẩu trước nghiệp vụ. Redirect sau login chỉ URL nội bộ hợp lệ, không lưu token trong Web Storage.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-001: Customer Dashboard (Bàn Làm Việc Hội Viên)

- **Route:** `/dashboard`.
- **Feature/API mapping:** `FEAT-MEM-002`, `FEAT-APP-002`, `FEAT-PAY-002`.
- **Dữ liệu và thao tác:** Liệt kê thẻ, lịch và thanh toán cá nhân; không tính tổng toàn bộ từ một trang danh sách. Không có API dashboard riêng thì không bịa số liệu.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-002: Personal Profile & Security (Hồ Sơ & Bảo Mật)

- **Route:** `/profile`.
- **Feature/API mapping:** `FEAT-AUTH-004`, `FEAT-AUTH-005`, `FEAT-AUTH-006`.
- **Dữ liệu và thao tác:** Form full_name, phone (User), date_of_birth, gender, address, avatar_url; khu vực đổi mật khẩu. email_verified_at/must_change_password chỉ đọc theo phiên, không checkbox cho client tự xác minh.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-003: My Memberships List (Danh Sách Hợp Đồng Hội Viên Của Tôi)

- **Route:** `/memberships`.
- **Feature/API mapping:** `FEAT-MEM-002`.
- **Dữ liệu và thao tác:** Bảng membership_id, Gym, package_id, start_date/end_date, purchase_price, payment_id, status. Không có nút tự tạo thẻ không thanh toán; dữ liệu nhiều Gym không đồng nghĩa policy đa Gym đã chốt.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-004: Membership Detail Card (Chi Tiết Hợp Đồng Hội Viên)

- **Route:** `/memberships/:membershipId`.
- **Feature/API mapping:** `FEAT-MEM-004`, `FEAT-PAY-002`.
- **Dữ liệu và thao tác:** Chi tiết Membership với giá mua lịch sử và Payment liên kết nếu có. payment_id NULL hiển thị chưa liên kết thanh toán; không tạo hành động cấp miễn phí.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-005: My PT Registrations (Hợp Đồng Tập Huấn Luyện Viên Của Tôi)

- **Route:** `/pt-registrations`.
- **Feature/API mapping:** `FEAT-PTR-001`, `FEAT-PTR-002`.
- **Dữ liệu và thao tác:** Sau Membership và trao đổi/thống nhất với PT, hiển thị RegistrationView và form chọn membership_id trước, rồi gym_trainer_id đúng Gym. Đây là luồng bổ sung, không phải bước checkout Gym. note tùy chọn; không nhập customer_id, gym_id hoặc tổng số buổi.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-006: Chi tiết đăng ký PT và lịch hẹn

- **Route:** `/pt-registrations/:registrationId`.
- **Feature/API mapping:** `FEAT-PTR-002`, `FEAT-APP-002`.
- **Dữ liệu và thao tác:** Chi tiết registered_at, Membership/PT từ RegistrationView, note và các AppointmentView cùng registration_id. Không có thanh tiến độ hoặc số buổi còn lại. Nếu dùng dữ liệu danh sách đã tải, chỉ hiển thị phạm vi đó và không giả định đầy đủ.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-007: PT Appointments & Booking (Lịch Hẹn PT & Đặt Ca Tập)

- **Route:** `/pt-appointments`.
- **Feature/API mapping:** `FEAT-APP-001`, `FEAT-APP-002`, `FEAT-APP-004`, `FEAT-APP-005`.
- **Dữ liệu và thao tác:** Lịch có appointment_id, registration_id, start_time/end_time, status, note. Form đặt/dời chỉ các field API cho phép. Các action chờ Q-06 không được mở trước khi contract chốt.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-008: My Submitted Reports (Lịch Sử Phản Ánh Của Tôi)

- **Route:** `/reports`.
- **Feature/API mapping:** `FEAT-REP-002`.
- **Dữ liệu và thao tác:** Report cá nhân: report_type, title, content, thiết bị nếu có, status và resolution_note/resolved_at. Không hiển thị người xử lý có quyền mới nào ngoài dữ liệu API trả.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-009: Submit Gym Report Form (Gửi Phản Ánh Sự Cố Phòng Gym)

- **Route:** `/gyms/:gymId/reports/new`.
- **Feature/API mapping:** `FEAT-REP-001`, `FEAT-EQP-001`.
- **Dữ liệu và thao tác:** Chọn Gym hợp lệ → report_type → EQUIPMENT chọn máy của Gym theo mã/loại → title/content → một image_url tùy chọn → gửi. Khi đổi Gym phải xóa lựa chọn máy cũ. Không gửi status, resolved_by hay user_id.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-001: PT Dashboard (Bàn Làm Việc Huấn Luyện Viên)

- **Route:** `/pt/dashboard`.
- **Feature/API mapping:** `FEAT-PTR-002`, `FEAT-APP-002`.
- **Dữ liệu và thao tác:** Học viên và lịch thuộc phân công PT đăng nhập; scope do backend xác minh. Không có số buổi quota hoặc doanh thu giả.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-002: PT Profile View (Hồ Sơ Nghề Nghiệp Huấn Luyện Viên)

- **Route:** `/pt/profile`.
- **Feature/API mapping:** `FEAT-AUTH-004`, `FEAT-TRN-002`.
- **Dữ liệu và thao tác:** Hồ sơ cá nhân và thông tin phân công: specialization, experience_years, bio, joined_at. Profile riêng từ auth; public trainer DTO không chứa email/phone cá nhân.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-003: Assigned Trainees (Danh Sách Học Viên Phụ Trách)

- **Route:** `/pt/registrations`.
- **Feature/API mapping:** `FEAT-PTR-002`, `FEAT-APP-001`.
- **Dữ liệu và thao tác:** Danh sách Registration phụ trách; đọc Customer từ RegistrationView được cấp quyền. Đặt lịch bằng registration_id, không tự đổi người tập/PT.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-004: PT Appointments Management (Quản Lý Ca Dạy PT)

- **Route:** `/pt/appointments`.
- **Feature/API mapping:** `FEAT-APP-002`, `FEAT-APP-004`, `FEAT-APP-005`, `FEAT-APP-006`, `FEAT-APP-008`.
- **Dữ liệu và thao tác:** Danh sách lịch cá nhân. Chỉ hiện hành động đã được Q-06 chốt quyền và trạng thái nguồn; không mặc định PT luôn có quyền confirm.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-005: Appointment Execution Detail (Chi Tiết & Xác Nhận Buổi Tập)

- **Route:** `/pt/appointments/:appointmentId`.
- **Feature/API mapping:** `FEAT-APP-002`, `FEAT-APP-006`.
- **Dữ liệu và thao tác:** Chi tiết lịch và note; action hoàn thành theo policy, không tự tăng bộ đếm hay hoàn tất Registration. Không có nút vắng mặt trước quyết định mới.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-TRN-006: PT Appointment Calendar (Lịch Các Buổi Tập Cụ Thể)

- **Route:** `/pt/schedule`.
- **Feature/API mapping:** `FEAT-APP-002`, `FEAT-APP-001`.
- **Dữ liệu và thao tác:** Đây là lịch Appointment, không phải Working Schedule. Lịch tuần trên desktop, danh sách ngày trên mobile; from/to theo timezone hiển thị, gửi ISO có múi giờ. Không mở lịch Gym khác từ frontend.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-001: Manager Dashboard (Bàn Làm Việc Quản Lý Phòng Gym)

- **Route:** `/manager/dashboard`.
- **Feature/API mapping:** `FEAT-MEM-003`, `FEAT-APP-003`, `FEAT-REP-003`.
- **Dữ liệu và thao tác:** Tổng quan tài nguyên Gym đang quản lý; chỉ hiển thị số liệu đủ nguồn. Không thêm doanh thu/thanh toán toàn Gym khi quyền tài chính chưa chốt.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-002: Gym Information & Profile Edit (Cập Nhật Thông Tin Cơ Sở)

- **Route:** `/manager/gym`.
- **Feature/API mapping:** `FEAT-GYM-004`.
- **Dữ liệu và thao tác:** Form gym_name, description, phone, email, address, latitude/longitude, logo_url, opening_time/closing_time; không cho đổi gym_id. Quy tắc giờ qua đêm chờ constraints.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-003: Manager Profile View (Hồ Sơ Quản Lý)

- **Route:** `/manager/profile`.
- **Feature/API mapping:** `FEAT-AUTH-004`, `FEAT-MGR-002`.
- **Dữ liệu và thao tác:** Hồ sơ Manager và phân công hiện tại; phân công theo cặp không phải nhật ký mọi lần bổ nhiệm.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-004: Gym Trainers Roster (Quản Lý Huấn Luyện Viên Cơ Sở)

- **Route:** `/manager/trainers`.
- **Feature/API mapping:** `FEAT-TRN-006`, `FEAT-TRN-001`, `FEAT-TRN-004`.
- **Dữ liệu và thao tác:** Danh sách quản trị PT ACTIVE/INACTIVE qua FEAT-TRN-006; action cập nhật trạng thái theo policy. Public API vẫn chỉ chiếu PT công khai.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-005: Onboard Trainer to Gym (Tiếp Nhận Huấn Luyện Viên)

- **Route:** `/manager/trainers/assign`.
- **Feature/API mapping:** `FEAT-TRN-003`, `FEAT-TRN-005`.
- **Dữ liệu và thao tác:** Gán User PT có sẵn hoặc cấp tài khoản mới theo Q-10 đã chốt; chỉ actor có quyền nhận mật khẩu tạm một lần để bàn giao, không có chức năng đọc lại. Form specialization, experience_years, bio; không dùng introduction.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-006: Gym Packages Catalog Management (Quản Lý Gói Tập Cơ Sở)

- **Route:** `/manager/packages`.
- **Feature/API mapping:** `FEAT-PKG-007`, `FEAT-PKG-003`, `FEAT-PKG-004`, `FEAT-PKG-005`, `FEAT-PKG-006`.
- **Dữ liệu và thao tác:** Form package_name, description, duration_days, price; thao tác mở/ngừng bán giữ Membership cũ. Danh sách quản trị ACTIVE/INACTIVE lấy FEAT-PKG-007; public list vẫn chỉ gói công khai.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-007: Gym Memberships Operations (Vận Hành Thẻ Hội Viên Cơ Sở)

- **Route:** `/manager/memberships`.
- **Feature/API mapping:** `FEAT-MEM-003`, `FEAT-MEM-004`.
- **Dữ liệu và thao tác:** Bảng hội viên của Gym, giá mua, ngày hiệu lực, trạng thái. Các action kích hoạt/bảo lưu/chấm dứt/cấp thẻ thủ công chưa mở khi policy mới chưa chốt.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-008: Đăng ký PT và điều phối trong Gym

- **Route:** `/manager/pt-registrations`.
- **Feature/API mapping:** `FEAT-PTR-001`, `FEAT-PTR-003`, `FEAT-PTR-004`, `FEAT-PTR-005`.
- **Dữ liệu và thao tác:** Form chọn Membership trong Gym và PT cùng Gym; hiển thị note/registered_at. Reassign chờ Q-07, không tự hủy lịch hàng loạt từ client.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-009: Gym PT Master Appointments Calendar (Lịch Vận Hành Ca Tập Phòng Gym)

- **Route:** `/manager/pt-appointments`.
- **Feature/API mapping:** `FEAT-APP-003`, `FEAT-APP-001`.
- **Dữ liệu và thao tác:** Lịch toàn Gym được backend lọc qua Registration/Membership. Tạo lịch theo policy Q-06; không tự gán Gym/PT/Customer lên Appointment.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-010: Gym Incident Reports Resolution (Xử Lý Sự Cố & Phản Ánh Cơ Sở)

- **Route:** `/manager/reports`.
- **Feature/API mapping:** `FEAT-REP-003`, `FEAT-REP-004`, `FEAT-REP-005`, `FEAT-REP-006`.
- **Dữ liệu và thao tác:** Lọc report_type/status/equipment_id. Chi tiết title/content/image_url và máy. Tiếp nhận → form resolution_note → giải quyết; resolved_by/resolved_at do server ghi. Không đổi condition máy tự động.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-001: Platform Admin Dashboard (Bàn Làm Việc Ban Quản Trị Toàn Sàn)

- **Route:** `/admin/dashboard`.
- **Feature/API mapping:** `FEAT-GYM-006`, `FEAT-ADM-001`, `FEAT-GYM-001`.
- **Dữ liệu và thao tác:** Điều hướng quản trị và danh sách Gym qua FEAT-GYM-006; thống kê tổng hợp chỉ khi có contract hỗ trợ, không lấy một trang làm tổng.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-002: Platform Users & Accounts Directory (Quản Lý Tài Khoản Toàn Sàn)

- **Route:** `/admin/users`.
- **Feature/API mapping:** `FEAT-ADM-001`, `FEAT-ADM-002`.
- **Dữ liệu và thao tác:** Bảng User: user_id, email, phone, status, email_verified_at, must_change_password; không hiển thị hash hoặc mật khẩu tạm trong bảng/log.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-003: System Roles & Permissions Viewer (Xem Danh Mục Vai Trò Hệ Thống)

- **Route:** `/admin/roles`.
- **Feature/API mapping:** `FEAT-ADM-003`.
- **Dữ liệu và thao tác:** Xem role_id, role_name, description; không có role Guest và không mở CRUD role ngoài contract.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-004: Platform Gyms Management (Danh Sách Cơ Sở Toàn Sàn)

- **Route:** `/admin/gyms`.
- **Feature/API mapping:** `FEAT-GYM-006`, `FEAT-GYM-001`, `FEAT-GYM-004`, `FEAT-GYM-005`.
- **Dữ liệu và thao tác:** Danh sách Admin qua FEAT-GYM-006 gồm ACTIVE/INACTIVE theo filter; không dùng public list để quản trị Gym ngừng hoạt động.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-005: Gym Facility Creation & Status Control (Tạo Mới & Đổi Trạng Thái Phòng Gym)

- **Route:** `/admin/gyms/create` để tạo, `/admin/gyms/:gymId` để sửa/đổi trạng thái.
- **Feature/API mapping:** `FEAT-GYM-003`, `FEAT-GYM-005`.
- **Dữ liệu và thao tác:** Tạo Gym với các thông tin mới; trạng thái ACTIVE/INACTIVE. Ngừng Gym theo Q-13 đã chốt (Domain §10); hiển thị số nghĩa vụ đang mở từ lỗi 409, không có force hoặc hủy dây chuyền.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-006: Manager Provisioning & Assignment Console (Khởi Tạo & Bổ Nhiệm Quản Lý)

- **Route:** `/admin/managers`.
- **Feature/API mapping:** `FEAT-MGR-001`, `FEAT-MGR-002`, `FEAT-MGR-003`, `FEAT-MGR-004`.
- **Dữ liệu và thao tác:** Tạo User Manager → gán MANAGER → liên kết Gym. Không vượt giới hạn ACTIVE; không tự thay Manager cũ. Tái bổ nhiệm giữ bản ghi cũ; assigned_at là lần ACTIVE gần nhất, created_at là lần tạo đầu. Không thể hiển thị toàn bộ lịch sử từ các cặp unique.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-007: System-wide Incident Reports Monitor (Giám Sát Sự Cố Toàn Sàn)

- **Route:** `/admin/reports`.
- **Feature/API mapping:** `FEAT-REP-003`.
- **Dữ liệu và thao tác:** Chọn Gym rồi xem report qua endpoint scoped được Admin phép truy cập; không giả lập endpoint report toàn sàn hoặc tổng hợp thiếu trang.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-010: Mua gói và thanh toán

- **Route:** `/customer/payments/new`.
- **Feature/API mapping:** `FEAT-PAY-001`.
- **Dữ liệu và thao tác:** Chọn Package/Gym, xác nhận giá do server trả và phương thức đã được Q-01 duyệt. Tạo PENDING; không tự đánh dấu SUCCESS khi đóng hộp thoại hoặc quay về từ trang thanh toán. UI thanh toán thực tế chờ lựa chọn tích hợp.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-CUS-011: Thanh toán của tôi

- **Route:** `/customer/payments`.
- **Feature/API mapping:** `FEAT-PAY-002`, `FEAT-MEM-002`.
- **Dữ liệu và thao tác:** Hiển thị payment_id, amount, payment_method, transaction_code nếu được trả, payment_status, paid_at. Chỉ hiển thị đã có thẻ khi Membership nguồn thực sự tồn tại; REFUNDED không tự quyết định thẻ bị hủy.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-011: Thiết bị tại Gym

- **Route:** `/manager/equipments`.
- **Feature/API mapping:** `FEAT-EQP-001`, `FEAT-EQT-001`.
- **Dữ liệu và thao tác:** Bảng equipment_code, loại máy, purchase_date, condition, status; lọc/tìm và mở form máy. Không cho đổi Gym bằng client để truy cập thiết bị Gym khác.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-MGR-012: Thêm/cập nhật thiết bị

- **Route:** `/manager/equipments/new` hoặc `/manager/equipments/:equipmentId/edit`.
- **Feature/API mapping:** `FEAT-EQP-002`, `FEAT-EQP-003`, `FEAT-EQT-001`.
- **Dữ liệu và thao tác:** Chọn equipment_type_id, nhập equipment_code, purchase_date, condition/status. Báo lỗi trùng mã trong Gym. Không có trường chuyển Gym hoặc tự tạo loại máy mới khi Q-09 chưa chốt.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-007: Đặt lịch tư vấn

- **Route:** `/gyms/:gymId/consultation`.
- **Feature/API mapping:** FEAT-CON-001.
- **UI:** Full name/phone bắt buộc; email, ngày/giờ mong muốn, nội dung tùy chọn. Guest không bị chuyển sang login. User đăng nhập được điền sẵn thông tin phù hợp và sửa trước khi gửi; không hiện user_id/assigned_to/status input.
- **Trạng thái:** Loading/pending chống gửi lặp; lỗi inline; thành công “Gym đã nhận yêu cầu tư vấn”, không báo đặt thành công buổi tập hoặc thanh toán. Không hứa thời gian phản hồi chưa chốt. Validation ngày theo Q-19.

### SCR-GST-008: PT Profile công khai

- **Route:** `/gyms/:gymId/trainers/:trainerId`.
- **Feature/API mapping:** FEAT-TRN-002, FEAT-REV-003.
- **UI:** Ảnh/họ tên/bio/chuyên môn/kinh nghiệm, social links, availability, Working Schedule và review VISIBLE. Chứng chỉ chỉ hiện khi có dữ liệu được hỗ trợ; không tạo fake badges. “Liên hệ để trao đổi” qua liên kết đã công khai; không lộ số/email đăng nhập riêng tư.
- **Hành động:** Sau Membership cùng Gym và thống nhất với PT mới đến đăng ký dịch vụ; không tạo chat hoặc thanh toán PT. Không hiển thị lịch hẹn riêng của học viên khác.

### SCR-CUS-012: Đánh giá Gym

- **Route:** `/gyms/:gymId/reviews/new`.
- **Feature/API mapping:** FEAT-REV-002.
- **UI:** Rating 1–5 và comment tùy chọn; login và eligibility từ backend. Không hiển thị chọn user_id/Gym khác trong form. Submit thành công chỉ khi API xác nhận. Không có edit/delete; trường hợp tác giả sửa chờ Q-15.

### SCR-CUS-013: Đánh giá PT

- **Route:** `/gyms/:gymId/trainers/:trainerId/reviews/new`.
- **Feature/API mapping:** FEAT-REV-004.
- **UI:** Đúng PT đã có quan hệ sử dụng; rating/comment. Xử lý REVIEW_NOT_ELIGIBLE bằng thông báo rõ, không bỏ qua backend hoặc cho chọn Registration của người khác. Không tự mở review chỉ vì có Membership Gym.

### SCR-MGR-013: Xử lý yêu cầu tư vấn

- **Route:** `/manager/consultations`.
- **Feature/API mapping:** FEAT-CON-002, FEAT-CON-003.
- **UI:** Danh sách và chi tiết liên hệ đúng Gym, trạng thái, thời gian mong muốn/nội dung; thao tác tiếp nhận/cập nhật theo Q-19. Assignment Staff chỉ xuất hiện khi Q-14 có mô hình quyền. Không tạo booking tự động.

### SCR-MGR-014: Gallery Gym

- **Route:** `/manager/gym/images`.
- **Feature/API mapping:** FEAT-GIM-002.
- **UI:** Ảnh/caption/thứ tự; nguồn upload theo Q-10/Q-19, không giả lập upload thành công. Logo vẫn là trường riêng. Không thao tác review tại màn hình gallery.

### SCR-TRN-007: Availability, Social và Working Schedule

- **Route:** `/pt/profile/availability-and-schedule`.
- **Feature/API mapping:** FEAT-TRN-007, FEAT-TRN-008, FEAT-TRN-009.
- **UI:** Chọn phân công Gym được cấp quyền; availability tách status, nhiều social links theo platform, nhiều khung giờ theo thứ. Không có bảng giá/quota. Validation giờ/timezone theo Q-18; không biến màn hình này thành lịch hẹn Customer.
- **Trạng thái:** Loading/empty/error/success; lưu qua server theo scope, không thông báo đã đổi Appointment. Quyền thay mặt theo Q-16/Q-18.

### SCR-ADM-008: Review Moderation

- **Route:** `/admin/reviews`.
- **Feature/API mapping:** FEAT-REV-005, FEAT-REV-006.
- **UI:** Filter Gym/PT, Gym, VISIBLE/HIDDEN; xem nội dung gốc và audit. Với VISIBLE, nút “Ẩn đánh giá” yêu cầu lý do; HIDDEN hiển thị người/thời điểm/lý do. Không có xóa, sửa rating/comment, unhide hoặc ghi đè audit.
- **Trạng thái:** 403 chặn người không phải Admin; 409 tải lại dữ liệu nếu review đã bị ẩn; chỉ báo thành công sau server xác nhận.

## 5. Form, trạng thái và luồng quan trọng

- Form chỉ gửi allowlist trong API §6; payload aggregate hồ sơ ghi phone ở User, address/avatar ở Profile. Field kết quả xử lý report là read-only ngoại trừ resolution_note ở action resolve.
- Status badges lấy đúng nhóm tại Database §7, không ánh xạ mọi INACTIVE/PENDING thành cùng một nghiệp vụ. Dùng màu semantic tokens kèm chữ, không chỉ dựa vào màu.
- Khi thay Gym/Membership trên form, xóa lựa chọn PT/Equipment cũ và tải lại danh sách đúng scope. Backend vẫn xác minh liên kết khi submit.
- Luồng mua: Package → Payment PENDING → nhận kết quả thật từ Backend → Membership nếu đã phát hành. Disable submit khi pending chỉ chống double-click UX, không thay idempotency server.
- Luồng PT: Membership → PT cùng Gym → Registration → Appointment. Không hiển thị số buổi còn lại hoặc thanh tiến độ quota.
- Luồng thiết bị/report: chọn loại EQUIPMENT → tìm máy bằng mã/loại trong Gym → title/content/ảnh → PENDING → Manager IN_PROGRESS → resolution_note → RESOLVED; người và thời điểm xử lý do Backend ghi.
- Lỗi validation đặt tại field; 409 trùng mã máy/trùng lịch hiển thị giải thích và giữ dữ liệu nhập; retry mất mạng không tạo Payment/Membership lần hai. Khi chưa biết kết quả thanh toán, hiển thị đang chờ xác nhận thay vì tự kết luận thất bại/thành công.
- Upload ảnh theo Q-10; schema chứa URL không đồng nghĩa đã có API upload. Không hardcode image storage hoặc thêm thư viện bản đồ trong đợt này.

## 6. RESPONSIVE UX SPECIFICATION

Chi tiết chiến lược thích ứng cho các thành phần then chốt:

```
+-------------------------------------------------------------------------+
| BREAKPOINTS:                                                            |
| Mobile: < 768px  |  Tablet: 768px - 1023px  |  Desktop: >= 1024px       |
+-------------------------------------------------------------------------+
```

### 6.1. Bảng Dữ Liệu (Data Tables)
- **Desktop ($\ge 1024\text{px}$):** Hiển thị dạng bảng kẻ viền đầy đủ các cột dữ liệu, hỗ trợ cố định tiêu đề (Sticky Table Header).
- **Tablet ($768\text{px} - 1023\text{px}$):** Ẩn bớt các cột thứ yếu (như ngày tạo, mã định danh nội bộ); thanh cuộn ngang mượt mà cho bảng nhiều dữ liệu.
- **Mobile ($< 768\text{px}$):** Tự động chuyển đổi từ bảng sang **Danh sách thẻ tóm tắt (Card List)**:
  - Mỗi hàng dữ liệu biến thành 1 thẻ độc lập viền `1px solid var(--color-border)`.
  - Hàng trên: Tiêu đề chính + Huy hiệu trạng thái.
  - Hàng giữa: 2 chỉ số quan trọng nhất (ví dụ: Ngày hết hạn, Tên cơ sở).
  - Hàng dưới: Hàng nút bấm hành động (Action Buttons) kích thước lớn vừa vặn ngón tay cái ($\ge 44\text{px}$).

### 6.2. Biểu Mẫu Nhập Liệu (Forms)
- **Desktop:** Biểu mẫu 2 cột (Two-column grid) cho các form dài (ví dụ: Thông tin cá nhân + Liên hệ).
- **Mobile:** Biểu mẫu co về 1 cột đơn (Single-column layout). Bàn phím ảo tối ưu theo loại dữ liệu (`type="email"`, `type="tel"`, `inputmode="numeric"`). Nút Submit cố định ở chân màn hình (Sticky Bottom Action Bar).

### 6.3. Thanh Điều Hướng & Menu (Navigation & Sidebar)
- **Desktop:** Thanh Sidebar bên trái cố định độ rộng `240px` – `260px`.
- **Tablet / Mobile:** Sidebar ẩn hoàn toàn. Xuất hiện nút "Hamburger" góc trái trên Header. Khi bấm, mở **Drawer trượt từ bên trái** (Left Off-canvas Drawer) chiếm 80% bề ngang màn hình, kèm lớp phủ mờ (Backdrop Blur `rgba(15, 23, 42, 0.4)`).

### 6.4. Lịch Biểu & Thời Khóa Biểu (Calendar / Schedule View)
- **Desktop:** Lưới lịch tuần 7 cột tương ứng từ Thứ 2 đến Chủ nhật, trục tung là 24 giờ.
- **Mobile:** Chuyển sang **Dạng dòng thời gian dọc (Agenda / Daily Timeline List)**:
  - Thanh chọn ngày dạng băng chuyền ngang (Horizontal Date Picker Strip) ở trên cùng.
  - Bên dưới liệt kê danh sách các ca tập theo thứ tự giờ tăng dần trong ngày đã chọn.

### 6.5. Hộp Thoại & Cửa Sổ Bật Lên (Modals & Dialogs)
- **Desktop:** Hộp thoại căn chính giữa màn hình (Centered Modal), độ rộng cố định `480px` – `640px`.
- **Mobile:** Tự động chuyển thành **Khay trượt từ đáy lên (Bottom Sheet Modal)**:
  - Bo tròn 2 góc trên (`border-radius: 16px 16px 0 0`).
  - Cho phép vuốt xuống để đóng khay hoặc bấm nút "Đóng" góc phải trên.

---

## 7. ACCESSIBILITY (A11Y - WCAG AA STANDARDS)

1. **Điều Hướng Bàn Phím (Full Keyboard Operability):**
   - Phím `Tab` và `Shift + Tab` di chuyển tuần tự qua các nút bấm, ô nhập liệu và liên kết theo thứ tự DOM tự nhiên.
   - Phím `Esc` lập tức đóng hộp thoại Modal, Drawer hoặc Toast đang mở.
   - Vòng tròn tiêu điểm (Focus Ring): Tuyệt đối không xóa bỏ `outline: none` nếu không thay thế bằng `:focus-visible` tương đương (`outline: 2px solid var(--color-navy-800)` với offset `2px`).
2. **Bắt Tiêu Điểm Trong Modal (Modal Focus Trapping):**
   - Khi Modal mở ra, tiêu điểm tự động nhảy vào nút hoặc ô nhập liệu đầu tiên trong Modal. Người dùng bấm Tab không thể nhảy ra các thành phần phía sau trang nền. Khi đóng Modal, trả lại tiêu điểm cho nút bấm đã mở Modal ban đầu.
3. **Thẻ Nhãn HTML Ngữ Nghĩa (Semantic HTML):**
   - Sử dụng chuẩn xác các thẻ `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>`, `<h1>` $\rightarrow$ `<h3>`.
   - Các bảng dữ liệu bắt buộc có thẻ `<thead>`, `<tbody>`, `<th scope="col">`.
4. **Hỗ Trợ Trình Đọc Màn Hình (Screen Readers):**
   - Các nút bấm chỉ chứa Icon (như nút X đóng modal, nút Kebab 3 chấm) bắt buộc phải có thuộc tính `aria-label="Đóng cửa sổ"` hoặc văn bản ẩn `<span class="sr-only">`.
   - Các thông báo Toast sử dụng vùng động `aria-live="polite"` để máy đọc tự động xướng âm thanh cho người khiếm thị khi có thông báo mới.

---


## 8. Components và kiểm tra UX

Giữ Button/Input/Select/Modal/Drawer/Table/Pagination/StatusBadge, GymBadge, guards và các trạng thái loading/empty/error. Bổ sung PaymentStatus, EquipmentSelector, EquipmentForm và ReportResolutionForm trên cùng design tokens, không tạo design system mới.

Kiểm tra viewport 375/768/1024/1440, bàn phím, focus trong dialog, label/inline errors, contrast và dữ liệu thực từ API. Desktop lịch tuần chuyển danh sách ngày trên mobile. Không lấy tổng một trang làm dashboard hoặc tải dữ liệu Gym khác để hoàn thiện tên hiển thị.

## 9. Phụ thuộc và câu hỏi mở

Q-01/Q-02: checkout, phản hồi thanh toán/thẻ; Q-03: cấp thẻ thủ công; Q-04/Q-06/Q-07: form PT và các action lịch; Q-08: PT chỉ một Gym ACTIVE; Customer đa Gym còn mở; Q-09: tra cứu/ghi thiết bị và danh mục; Q-10: provisioning/email đã chốt, upload còn mở; Q-11: baseline vật lý đã có; Q-05: quota ngoài phạm vi; Q-12: tái bổ nhiệm Manager đã chốt; Q-13: Gym/PT đã chốt; các action status khác còn thiếu policy. Chỉ phát hành phần API đã chốt, không hiển thị action chưa khả dụng như đã hoạt động.


Nghiệp vụ mới bổ sung phụ thuộc Q-14 Staff, Q-15 eligibility/edit/unhide review, Q-16 availability/quyền profile, Q-17 tài khoản trong checkout, Q-18 timezone/lịch làm việc, Q-19 vận hành tư vấn/gallery. Đây là ghi chú triển khai, không hiển thị mã Q trong sản phẩm. Các màn hình mới chưa có code; giữ nguyên design tokens/responsive/a11y hiện có khi triển khai.


## GYM-03 — Phạm vi giao diện đã triển khai

GYM-03 nối các API GYM-02 hiện có: Public Gym directory/detail và PT list/profile; Manager Gym edit/PT roster/assign/provision/status; Admin Gym list/create/edit/status và Manager provision/assign/revoke. Có role/scope guards, TanStack Query, Tailwind utilities trên design tokens hiện có; mật khẩu tạm chỉ nằm trong form đang mở, không lưu Web Storage hoặc cache bền vững.

Chưa có API đọc Gym riêng cho Manager/Admin. Manager đọc public Gym ACTIVE để khởi tạo form và backend thẩm định scope khi ghi; Gym không còn public trả trạng thái không khả dụng. Admin detail duyệt danh sách nội bộ theo trang để đọc cả Gym INACTIVE, không gọi public detail làm nguồn quản trị.

Hai CTA trên Gym detail dẫn đúng khu vực Package/Consultation, hiện thông báo chức năng chưa triển khai. API/UI Package, gallery, consultation và review thuộc các lát cắt riêng; không hiển thị dữ liệu giả hoặc gửi request đến endpoint chưa có. Upload logo vẫn chưa mở; form nhận URL HTTP/HTTPS theo contract hiện tại.

Bằng chứng kiểm thử và giới hạn phát hành: [GYM_03_VERIFICATION.md](GYM_03_VERIFICATION.md).

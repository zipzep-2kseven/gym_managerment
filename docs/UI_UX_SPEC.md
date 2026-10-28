# Multi-Gym Platform — UI/UX Specification

**R22 — 14/10/2026:** SCR-ADM-015 dùng context Gym, hai vùng đăng ký/lịch và pager độc lập20. Xác nhận kết thúc inline giữ lý do/receipt, Escape/focus; đọc lại nhiều trang theo ID, chặn đọc trùng và hủy request khi rời màn. Lịch chỉ đọc/giờ Việt Nam, Gym INACTIVE vẫn tra cứu; giữ tokens/dials3/1/5. [Phạm vi, ảnh và kiểm chứng](ADMIN_PT_WORKSPACE_VERIFICATION.md).

**R21 — 12/10/2026:** SCR-ADM-014 Gallery Admin dùng context Gym/quota, grid2/1 cột, preview/form caption và xác nhận xóa inline. Lên/Xuống giữ focus; caption giữ snapshot/bản nháp qua lỗi và chỉ nhận timestamp mới sau đọc lại + xác nhận. Conversion/upload/caption/order/delete khóa chung; receipt còn khi GET lỗi, lost POST cần kiểm tra thủ công và chọn lại ảnh. Private bytes có fallback/retry riêng;401/403 gỡ dữ liệu và kiểm phiên. [Ảnh và kiểm chứng R21](ADMIN_GALLERY_VERIFICATION.md). Giữ tokens/dials3/1/5; Manager/Public dùng GIM-01. Tiếp theo R22 giám sát PT; baseline Gallery trước R21 là lịch sử.

**R20 — 12/10/2026:** SCR-ADM-013 có page header/context Gym, catalog12/URL, giá decimal chính xác, vùng tạo/sửa và xác nhận status. Snapshot giữ qua refetch/lỗi context Gym; UI giải thích cùng field last write wins, partial PATCH/null, success lock và receipt khi tải lại lỗi. Kết quả chưa rõ bắt buộc đọc lại; lost POST cho duyệt catalog chỉ đọc rồi xác nhận trước đóng, không retry tự động. [Ảnh và kiểm chứng R20](ADMIN_PACKAGES_VERIFICATION.md). Admin dùng tokens/dials3/1/5; PKG-02 Manager/Public giữ phong cách hiện có. Tiếp theo R21 Gallery Gym; mô tả baseline trước R20 là lịch sử.

**R19 — 12/10/2026:** SCR-ADM-008 dùng page header, vùng chính sách, bộ lọc/selector và danh sách/audit theo nền tảng Admin hiện có. Hai pager độc lập10; form lý do → xác nhận, focus/Escape/hủy; receipt, cached error và đọc lại cưỡng chế sau409/network/5xx. [Ảnh và kiểm chứng R19](ADMIN_REVIEW_MODERATION_VERIFICATION.md). Tiếp theo R20 quản lý gói tập Admin; các mô tả thiếu coverage trước R19 là lịch sử.

**R18 — 12/10/2026:** SCR-ADM-012 chọn Gym từ menu toàn sàn/lối tắt dashboard, tìm tên/địa chỉ, status Gym và paging12/URL. SCR-ADM-007 có context/breadcrumb/Chọn Gym khác, local report filters/paging20 reset theo actor/Gym, receipt/note/error/read-back và focus. [Ảnh,8 REQ và kiểm chứng R18](ADMIN_REPORT_ENTRY_VERIFICATION.md). Mô tả proposal/chưa có route bên dưới là lịch sử; tiếp theo R19 kiểm duyệt đánh giá Admin.

**R17 — 12/10/2026:** SCR-ADM-011 `/admin/gyms/:gymId/memberships` đã có entry Gym/sidebar, danh sách20 thẻ/trang, mọi status và vùng thông tin chỉ đọc từ dòng hiện hành. Đổi Gym/actor về trang1; đổi trang/Gym/actor/refetch đóng thông tin. Ngày lịch giữ nguyên, giá decimal giữ hai chữ số, tổng là số thẻ. Gym INACTIVE vẫn đọc lịch sử; lỗi quyền ẩn dữ liệu và kiểm phiên trước guard điều hướng. [Kiểm chứng R17 và ảnh](ADMIN_MEMBERSHIP_VERIFICATION.md). Tiếp theo R18 entry chọn Gym cho báo cáo; các mô tả proposal Membership bên dưới là baseline lịch sử.

**R16 — 12/10/2026:** đã đối chiếu12 REQ PT Admin trong [báo cáo nghiệm thu](ADMIN_TRAINER_ACCEPTANCE.md). Intake giữ receipt/credential sau provision thành công nếu đọc lại Gym lỗi không phải401/403, nhưng khóa tiếp nhận mới đến khi đọc thành công; lỗi quyền gỡ form. Màn PT kiểm phiên qua hooks/guard trước điều hướng401 để tránh về trang chủ do phiên cũ. Giữ thiết kế/tokens hiện có; nội dung proposal bên dưới là baseline lịch sử.

**Admin dashboard QA — R08, 12/10/2026:** bố cục R07 đã được kiểm chứng cùng loading/error/cache/auth/navigation/responsive/keyboard. Retry khôi phục focus theo kết quả và giữ focus nếu người dùng đã chuyển control. 66/66 browser tests và 4/4 cache tests PASS; lint toàn repo còn 115 lỗi prototype. Xem [báo cáo nghiệm thu và giới hạn](ADMIN_DASHBOARD_ACCEPTANCE.md). ADM-UI-01 vẫn IN_PROGRESS.

**Cập nhật R09, 12/10/2026:** blocker 115 lỗi lint prototype đã được xử lý; lint toàn repo/typecheck PASS, prototype pilot 24/24 và workspace 27/27 kiểm tra PASS. Không thay giao diện hoặc nghiệp vụ frontend. Kết quả R08 ở trên là lịch sử; giới hạn backend integration vẫn còn.

**Cập nhật R10, 12/10/2026:** dashboard live 5/5 và Gym live 2/2 PASS trên API/PostgreSQL thật trong DB tạm; total/all-status/provision/assignment/guard được kiểm chứng theo [báo cáo live](ADMIN_DASHBOARD_LIVE_VERIFICATION.md). Không đổi giao diện; kết quả không xác nhận deployment hoặc toàn bộ roadmap Admin.

**R15 — 12/10/2026:** SCR-ADM-009 có nút ngừng/kích hoạt PT và vùng xác nhận inline, focus/Cancel/Escape, trạng thái pending/error/success và đọc lại điều kiện. Giữ availability/account/history; Gym INACTIVE chặn kích hoạt nhưng cho ngừng nếu hết nghĩa vụ. Xem [phạm vi, ảnh và kiểm chứng R15](ADMIN_TRAINER_LIFECYCLE_VERIFICATION.md).

**R14 — 12/10/2026:** SCR-ADM-010 đã triển khai tiếp nhận PT theo Gym, gán/provision và bàn giao mật khẩu tạm. Trạng thái pending/success, đối soát kết quả chưa rõ, quyền Admin và khóa Gym INACTIVE được kiểm chứng. Xem [phạm vi, ảnh và kiểm chứng R14](ADMIN_TRAINER_INTAKE_VERIFICATION.md). Lifecycle còn tiếp tục.

**R13 — 12/10/2026:** SCR-ADM-009 đã triển khai roster PT đọc theo Gym, cùng bộ lọc chuyên môn/tiểu sử, trạng thái phân công, sort/paging/refresh. Chỉ hiện projection nội bộ và availability read-only; Gym INACTIVE đọc được. Sidebar exact chỉ active đúng mục. Xem [phạm vi, ảnh và kiểm chứng](ADMIN_TRAINERS_READ_VERIFICATION.md). Tiếp nhận/lifecycle chưa triển khai trong lát cắt này.

**Admin visual system — R06, 12/10/2026:** theo hướng redesign đã yêu cầu, `.admin-workspace` dùng xanh dương cho action/focus trên workspace sáng, sidebar navy/active xanh và KPI neutral đồng nhất. ACTIVE/INACTIVE/SUSPENDED dùng màu semantic kèm nhãn. Token và kiểm chứng tại [R06](ADMIN_UI_01_IMPLEMENTATION.md#r06--token-và-component-thị-giác-admin-12102026); quy tắc palette/focus nền tảng bên dưới vẫn áp dụng cho các workspace khác, được override trong phạm vi Admin này.

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

## Quyết định G2 hiện hành — 11/10/2026

Người dùng yêu cầu “áp dụng các đề xuất và thực hiện” sau danh sách sáu nội dung duyệt. G2 **APPROVED về phạm vi thiết kế**: baseline Admin; PT roster/tiếp nhận; Membership read-only/paging-only; entry chọn Gym cho report scoped; nhãn “Đánh giá Gym toàn sàn”; các cải thiện UX/state/error/reload/cache/page recovery/keyboard/focus đã nêu. ADM-DEC-01–04 APPROVED về nội dung này; không mở quyền/API/backend/payment. Những trạng thái OPEN/PROPOSED/chưa duyệt trong các mục đặc tả ngày trước là lịch sử, được quyết định này thay thế về scope; route mới vẫn **chưa triển khai**. G3 chưa duyệt, các GAP được đưa vào thiết kế chưa phải lỗi đã sửa hoặc AC đã PASS.

ADM-DESIGN-01 đã soạn [ADMIN_FIGMA_BRIEF.md](ADMIN_FIGMA_BRIEF.md). Theo yêu cầu thực hiện bước02, đã tạo [pilot quản lý tài khoản để review](ADMIN_DESIGN_02_PILOT_REVIEW.md): prototype HTML độc lập có tương tác; Figma có24/33 frame được dựng và còn dở vì hạn mức Starter. ADM-DEC-06 đã chọn Figma + prototype HTML trong repo. ADM-DESIGN-02 **IN_PROGRESS — pilot READY_FOR_REVIEW**, G3 chưa duyệt. Theo yêu cầu ưu tiên Admin, đã tiếp tục [prototype vai trò/Gym/bổ nhiệm Manager](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md): tổng cộng5/15 Screen IDs được dựng,10 IDs còn lại chưa thiết kế. ADM-UI-01 chưa bắt đầu, không đổi frontend/API/backend.

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
- **Feature/API mapping:** `FEAT-GYM-002`.
- **Dữ liệu và thao tác:** Hiển thị description, email, phone, address, logo_url, latitude/longitude, opening_time/closing_time từ API; không coi giờ mở cửa/logo là nội dung tĩnh nữa. Tabs gói tập và PT.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-004: Public Gym Packages (Danh Sách Gói Tập Cơ Sở)

- **Route:** `/gyms/:gymId/packages`.
- **Feature/API mapping:** `FEAT-PKG-001`, `FEAT-PKG-002`.
- **Dữ liệu và thao tác:** Hiển thị package_name, duration_days, price, description. CTA mua gói dẫn luồng Payment sau đăng nhập; không hiển thị quota hoặc loại gói không có trong ERD.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-GST-005: Public Gym Trainers (Đội Ngũ Huấn Luyện Viên Cơ Sở)

- **Route:** `/gyms/:gymId/trainers`.
- **Feature/API mapping:** `FEAT-TRN-001`, `FEAT-TRN-002`.
- **Dữ liệu và thao tác:** Họ tên/avatar công khai, specialization, experience_years, bio. CTA đăng ký PT yêu cầu chọn Membership cùng Gym; không yêu cầu nhập số buổi.
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
- **Dữ liệu và thao tác:** Danh sách RegistrationView và form chọn membership_id trước, rồi chọn gym_trainer_id đúng Gym. note tùy chọn; không nhập customer_id, gym_id hoặc tổng số buổi.
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

### SCR-TRN-006: PT Weekly Schedule Calendar (Lịch Biểu Tuần Huấn Luyện Viên)

- **Route:** `/pt/schedule`.
- **Feature/API mapping:** `FEAT-APP-002`, `FEAT-APP-001`.
- **Dữ liệu và thao tác:** Lịch tuần trên desktop, danh sách ngày trên mobile; from/to theo timezone hiển thị, gửi ISO có múi giờ. Không mở lịch Gym khác từ frontend.
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
- **Dữ liệu và thao tác:** Gán User PT có sẵn hoặc cấp tài khoản mới theo contract DRAFT Q-10. Form specialization, experience_years, bio; không dùng introduction.
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

- **Route:** `/admin/gyms/:gymId`.
- **Feature/API mapping:** `FEAT-GYM-003`, `FEAT-GYM-005`.
- **Dữ liệu và thao tác:** Tạo Gym với các thông tin mới; trạng thái ACTIVE/INACTIVE. Tác động đổi trạng thái tới hợp đồng hiện có chờ Q-13.
- **Trạng thái và quyền:** Loading/empty/error/success theo §1; scope và các action DRAFT kế thừa API. Lỗi 401 dẫn đăng nhập; 403/404 không tiết lộ dữ liệu Gym khác.

### SCR-ADM-006: Manager Provisioning & Assignment Console (Khởi Tạo & Bổ Nhiệm Quản Lý)

- **Route:** `/admin/managers`.
- **Feature/API mapping:** `FEAT-MGR-001`, `FEAT-MGR-002`, `FEAT-MGR-003`, `FEAT-MGR-004`.
- **Dữ liệu và thao tác:** Tạo User Manager → gán MANAGER → liên kết Gym. Không vượt giới hạn ACTIVE; không tự thay Manager cũ. Không thể hiển thị toàn bộ lịch sử tái bổ nhiệm từ các cặp unique.
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

## ADM-SPEC-04 — Baseline Admin, đầu vào thiết kế (11/10/2026)

**READY_FOR_REVIEW.** Dùng mẫu pilot theo yêu cầu tiếp tục của người dùng; chỉ đặc tả baseline đã có, chưa đổi UI. [Feature §5.3](FEATURE_SPEC.md#53-đặc-tả-chức-năng-admin-hiện-hành--adm-spec-04-11102026-ready_for_review) chứa field dictionary, 28 Requirement/AC mới, quyền và contract; [Implementation §5.2](IMPLEMENTATION_PLAN.md#52-truy-vết-baseline-admin--adm-spec-04) chứa TC/source/test và coverage thiếu. Field ID/version dùng kỹ thuật không mặc định thành cột hiển thị. Dashboard riêng tiếp tục ở ADM-SPEC-08; tài khoản theo SCR-ADM-002 pilot.

### Màn, dữ liệu hiển thị và luồng thao tác hiện tại

| Screen/route | Nội dung và luồng hiện hành | Pending/success/empty/error |
| --- | --- | --- |
| SCR-ADM-003 `/admin/roles` | Heading Vai trò hệ thống; link về tài khoản; article role_name/description (null → “Chưa có mô tả.”). Không render role_id, CRUD hoặc role Guest. | QueryState loading/error/retry; empty “Chưa có vai trò hệ thống.”; không mutation/success toast. |
| SCR-ADM-004 `/admin/gyms` | Heading Cơ sở toàn hệ thống; link Tạo Gym/Bổ nhiệm Manager; search submit và select status; article gym_name/address/status, link Sửa thông tin, nút Ngừng/Kích hoạt. URL filters, pageSize=12, mặc định gym_name asc; Pager đọc metadata. | Skeleton/query error/retry, empty “Chưa có Gym phù hợp.”; status pending chung, inline ConfirmAction đóng ngay khi gửi, MutationError hiện lỗi/counts. Không mô tả như modal hoặc đã có toast status success. |
| SCR-ADM-005 `/admin/gyms/create` | GymFields + identity Manager bắt buộc ở UI; Tạo cơ sở và Manager. API vẫn cho phép không manager. Result focusable nêu Gym/email/mật khẩu tạm, nút Đã bàn giao, ẩn mật khẩu, Xem cơ sở vừa tạo/Tạo cơ sở khác. | Fieldset disabled pending và sau tạo; result được focus, mutation cache reset; credential giữ state form, không Web Storage. Conflict giữ input; mất mạng có cảnh báo kiểm tra danh sách/phân công trước gửi lại. |
| SCR-ADM-005 `/admin/gyms/:gymId` | Link list/gallery/packages/reports/PT; Gym status và inline Ngừng/Kích hoạt; form thông tin được điền từ `adminGym()` quét list nội bộ. Chỉ gửi field đổi, nullable xóa bằng null; logo nhập URL, không upload. | QueryState; form snapshot ổn định khi background refetch, pending disabled, “Thông tin đã được lưu.”. Status success invalidates gyms, không có toast riêng. Hết list không tìm ID tạo NOT_FOUND phía client. |
| SCR-ADM-006 `/admin/managers` | Tìm Gym và Pager của selector → chọn Gym → StaffForm + assignment list. Mode Gán tài khoản có sẵn (User ID) / Cấp tài khoản mới (tên/email/phone). List User ID/status/assigned_at; ACTIVE có Thu hồi phân công inline. | Chưa chọn không form/list; đổi Gym/search/page clear lựa chọn/ngữ cảnh phù hợp; StaffForm key Gym reset input/credential. Success phân công/credential một lần; pending khóa form; lỗi không tự thay Manager cũ. |
| Scoped Package `/admin/gyms/:gymId/packages` (PKG-02) | Về thông tin Gym; search/status/sort toolbar, Pager URL; tên/mô tả/thời hạn/giá/status; Tạo gói mở PackageForm inline, Sửa gói, Ngừng/Mở bán inline confirmation. Form tên/ngày/decimal price/mô tả, Đóng biểu mẫu. | Loading/error/empty; pending khóa form; tạo thành công khóa submit đến đóng, edit success báo đã lưu; đổi status refetch list. Không DELETE, checkout hoặc bảng giao dịch. |
| Scoped Gallery `/admin/gyms/:gymId/gallery` (GIM-01) | Về Gym; quota N/10, file picker JPEG/PNG, preview/Bỏ ảnh/chú thích/Thêm ảnh; list private photo, caption edit, Lên/Xuống, Xóa ảnh bằng `window.confirm`. Ảnh đầu cover gallery, logo riêng. | Đang xử lý ảnh/pending upload/success clear preview; quota đầy ẩn form upload; mutation caption/order/delete pending chung riêng với upload. Lỗi ảnh có fallback, refresh reset mutation; conflict cần snapshot mới. |
| SCR-ADM-007 `/admin/gyms/:gymId/reports` | Heading Báo cáo sự cố tại Gym; filter status local reset page1, Làm mới báo cáo, Pager; article Gym/status/created/content/private ảnh/note. PENDING Tiếp nhận trực tiếp; Giải quyết/Từ chối mở form note inline rồi Lưu kết quả/Đóng. | Query loading/error/empty; ảnh lỗi có thông báo riêng; pending khóa action/form tương ứng; mutation giữ note khi lỗi, success refetch. Terminal không nút xử lý. Không form tạo Report Admin hoặc inbox aggregate. |
| Scoped PT `/admin/gyms/:gymId/pt` | Hai vùng Đăng ký PT và Lịch tập, query/pager riêng, Làm mới danh sách. Registration: tên PT/hội viên/Gym/status/ngày thẻ/note; ACTIVE có Kết thúc đăng ký / đổi PT mở ReasonForm. Lịch: participant/Gym/time/status/note chỉ đọc. | Lỗi/empty/loading từng vùng; ReasonForm lý do ≤2000, Xác nhận/Đóng disabled pending; success đóng/refetch. Không form chọn PT thay thế hoặc nút ghi Appointment/availability ở Admin mode. |
| SCR-ADM-008 `/admin/reviews` | Kind Gym/PT, status, selector Gym có search/pager riêng; tổng và Pager review local pageSize10; target/status ngừng/tác giả/rating/time/comment (null→Không có nhận xét.). Audit moderator/time/reason nếu HIDDEN; VISIBLE có HideReviewForm reason → Tiếp tục → Xác nhận ẩn/Hủy. | QueryState/empty; reason đổi reset bước confirm; pending khóa fieldset, lỗi giữ reason; success page1/refetch và status báo đã ẩn/lưu lịch sử xử lý. Không unhide/edit/delete. |

### Quy tắc state, lỗi và khôi phục dùng cho design

Phân biệt hành vi đã có ở bảng trên với các yêu cầu chuẩn hóa dưới đây. Không gọi mọi confirmation là modal hoặc giả mọi màn đã có đầy đủ focus management.

| Tình huống | Hành vi/đầu vào thiết kế và cách khôi phục |
| --- | --- |
| GET loading/empty/error | Giữ route và context Gym/filter; chỉ render dữ liệu khi query không lỗi. QueryState/PackageQueryState cho skeleton, empty và retry; không dùng dữ liệu public thay private sau lỗi. |
| 400 validation | Hiển thị thông điệp và field errors từ API, giữ input còn hợp lệ; không tự thêm field hoặc sửa actor/Gym để vượt validator. Trình duyệt kiểm tra input không thay validation server. |
| 401 / PASSWORD_CHANGE_REQUIRED / 403 | GET helper đi login/change-password với mã tương ứng, 403/404 hiển thị an toàn; mutation hook refresh session hoặc chuyển password gate tùy hook. Dừng ghi khi actor mất quyền, không tự retry sau auth. Cần test từng màn cho quyền thay đổi giữa lúc mở form và submit. |
| 404 resource/scope | Ẩn dữ liệu hoặc form không còn khả dụng, cho về danh sách đúng quyền; ảnh lỗi không fetch static URL. Không diễn giải resource sai Gym thành cho chọn Gym tùy ý để tiếp tục. |
| 409 nghĩa vụ/assignment/status | Hiển thị counts/loại conflict; đọc lại trước xác nhận mới. Không force, cascade hoặc tự revoke người khác. Admin-only không tự xử lý Appointment bị chặn. Package same-status repeatable khác Gym/Report/Review transition. |
| 409 Gallery version/order, Review đã ẩn | Giữ input có thể sửa, tải lại snapshot/audit rồi quyết định tiếp; không tự đổi version/reason hoặc ghi đè kết quả người khác. |
| Mạng/5xx sau mutation | Không tự retry; kết quả có thể đã commit. Đọc lại resource/list trước thao tác mới; POST tạo Gym/cấp Manager/upload chưa có idempotency hoặc lấy lại credential. Đặc biệt không hứa lỗi mạng sẽ rollback transaction. |
| 413 / 503 gallery storage | Giải thích payload quá lớn hoặc storage demo chưa bật môi trường production; giữ context, chọn ảnh phù hợp/đọc lại list; không tự thêm dịch vụ storage. |
| Success | Chỉ báo sau server success; invalidate đúng query family hiện hành (gyms/packages/gallery/reports/pt/review-moderation). Dashboard invalidation và nhất quán liên màn tiếp tục review ở ADM-SPEC-08; không giả mọi query đã được phủ. |

### Khoảng trống cần review trước thiết kế/implementation

| GAP mới | Bằng chứng/giới hạn hiện tại | Đề xuất và kiểm chứng cần làm |
| --- | --- | --- |
| ADM-BASE-GAP-01 | Baseline ConfirmAction/native confirm còn ở màn legacy. R21 Gallery Admin dùng inline confirm, khóa pending và focus/Escape; R19 Review hai bước. | Phần Gallery Admin có bằng chứng R21; tiếp tục đánh giá từng màn còn lại, không suy test skip-link thành coverage mọi mutation. |
| ADM-BASE-GAP-02 | Form Gym/Package partial PATCH không CAS. R20 Package Admin đã giữ snapshot qua GET/Gym error, giải thích cùng field last write wins và đọc lại trước dùng snapshot mới khi kết quả chưa rõ. | Package UX có bằng chứng R20; contract vẫn không CAS. Form Gym theo lát cắt riêng; nếu muốn CAS phải lập contract đề xuất, không thêm expected_updated_at vào API hiện hành. |
| ADM-BASE-GAP-03 | Các list giữ page có thể rỗng sau đổi status/quota/total; Manager selector dùng danh sách Gym phân trang, detail Admin quét nhiều trang. | Thống nhất empty-page recovery; test Gym ngoài trang đầu, xóa dòng cuối, chọn Gym rồi đổi selector; endpoint detail mới chỉ là đề xuất riêng nếu cần. |
| ADM-BASE-GAP-04 | R21 Gallery Admin đã có chốt chung conversion/upload/caption/order/delete và cưỡng chế readback trước thao tác mới khi kết quả chưa rõ. Manager giữ màn legacy có mutations riêng. | Phần Admin được kiểm chứng bằng pending/conversion/synthetic duplicate, concurrent quota/CAS/order và delete unknown; không suy thay đổi cho Manager. |
| ADM-BASE-GAP-05 | R16–R21 đã bổ sung suites Admin PT/Membership/Report/Review/Package/Gallery; R21 có Admin upload/caption/order/delete/private bytes và permission-loss riêng. | Bằng chứng theo từng báo cáo; QA toàn27suite sau các lát cắt vẫn cần chạy ở bước QA tổng. |
| ADM-BASE-GAP-06 | Mutation sau conflict/mạng chưa rõ có thể gửi lại mà chưa cưỡng chế GET; recovery chưa đồng nhất các màn. | Chốt read-before-retry và giữ input theo từng loại lỗi; test commit rồi mất response, cancel/reopen form sau lỗi. |

Các GAP là đề xuất chưa duyệt, không task code mới tự phát. Responsive dùng widths 375/768/1024/1440, không tràn ngang email/ID/text dài; timestamp Việt Nam, note/comment giữ xuống dòng, action không chỉ màu. Thiết kế cần xác định focus sau form đóng/list refetch, live announcement và ảnh alt/error. Chưa có Figma frames hoặc nghiệm thu a11y toàn bộ; không đưa fake KPI/credential vào dữ liệu mẫu có thể chia sẻ.

## ADM-SPEC-05 — Đề xuất màn Admin quản lý PT theo Gym (11/10/2026)

**READY_FOR_REVIEW, chưa triển khai/chưa duyệt route.** Màn dưới là proposal cho ADM-DEC-02; chưa cấp SCR chính thức. [Feature §5.4](FEATURE_SPEC.md#54-đề-xuất-admin-quản-lý-pt-theo-gym--adm-spec-05-11102026-ready_for_review) quy định field/permission/contract và 12 REQ/AC; [Implementation §5.3](IMPLEMENTATION_PLAN.md#53-truy-vết-đề-xuất-màn-pt-admin--adm-spec-05) quy định test/coverage và dependency.

### Bố cục và tương tác đề xuất

| Màn đề xuất | Nội dung, luồng và dữ liệu |
| --- | --- |
| Roster `/admin/gyms/:gymId/trainers` | Trong AdminLayout/ManagementShell, breadcrumb Quản trị Gym → Gym đã chọn → PT; link về Gym, heading Huấn luyện viên tại Gym, badge trạng thái Gym và nút Tiếp nhận PT. Context Gym lấy từ route và nguồn list Admin đã có, không thêm API detail. Lỗi đọc context phải chặn mutation đến khi biết đúng Gym. |
| Toolbar roster | Search “Chuyên môn hoặc tiểu sử” bằng submit/Enter; status “Trạng thái phân công” với Tất cả/Hoạt động/Ngừng hoạt động; sort created_at/joined_at/specialization và asc/desc. Đề xuất URL filters, pageSize20/default created_at desc, reset page1 khi filter đổi; query key gồm actor/Gym/filter. Không search tên/email hoặc status User. |
| Dòng roster | User ID đầy đủ có thể wrap, chuyên môn hoặc “Chưa cập nhật”, kinh nghiệm null→“Chưa cập nhật”, 0→“0 năm”, bio nullable; badge phân công, availability chỉ đọc, joined_at theo giờ Việt Nam. Không avatar/name/contact giả hoặc link profile TPR-01. trainer ID là key kỹ thuật/status path, không đổi User ID thành trainerId. |
| Action dòng | ACTIVE: “Ngừng phân công PT”; INACTIVE: “Kích hoạt phân công PT”. Xác nhận inline nêu User ID/Gym/status đích và giữ account/history/availability; Hủy local. Pending khóa confirm/hủy và các mutation liên quan trong phạm vi Gym. Không gọi nút “Khóa PT” gây nhầm khóa tài khoản. |
| Tiếp nhận `/admin/gyms/:gymId/trainers/assign` | Header Gym/breadcrumb/link roster; mode Gán tài khoản có sẵn (UUID User ID) / Cấp tài khoản mới (tên/email/phone). Cả hai nhận field ban đầu specialization/experience_years/bio tùy chọn. Form không role/password/status/availability/Gym editable. Chuyển mode clear credential và lỗi/input của mode cũ. |
| Result provision | Nêu email, Gym, assignment đã tạo và yêu cầu PT đổi mật khẩu lần đầu; output mật khẩu tạm với nút Đã bàn giao, ẩn mật khẩu. Giữ credential trong mounted state và clear mutation cache; không Web Storage/log/auto-copy. Báo rõ NOT_ACCEPTING, PT hoặc Manager cập nhật ở luồng đúng quyền. Chặn gửi lặp sau success, cho về roster hoặc bắt đầu cấp khác rõ ràng. |
| Điều hướng | Đề xuất link Quản lý PT từ AdminGymPage, tiếp nhận từ roster, back về đúng Gym. Giám sát đăng ký/lịch dùng `/admin/gyms/:gymId/pt` đã có, không thay thế roster. Đổi Gym/rời màn hủy đọc cũ, clear credential/form/lỗi và không render roster cũ dưới heading Gym mới. Mutation đã gửi không thể giả rollback vì đổi route. |

Gym INACTIVE: banner “Gym đang ngừng hoạt động; bạn vẫn có thể tra cứu phân công.”, disable Tiếp nhận/Kích hoạt theo context; ngừng phân công vẫn cần backend kiểm nghĩa vụ. List không trả User status, nên không disable kích hoạt chỉ dựa vào phỏng đoán User; server trả ACCOUNT_DEACTIVATED/INSUFFICIENT_ROLE khi target không đủ điều kiện. Không thêm badge “Tài khoản hoạt động” từ status phân công.

### Trạng thái và khôi phục lỗi đề xuất

| Tình huống | Hiển thị và khôi phục |
| --- | --- |
| Context/list loading, empty, GET failure | Skeleton/status, controls mutation chưa sẵn sàng; empty giữ toolbar và nút tiếp nhận nếu Gym ACTIVE; lỗi retry không dùng roster public thay thế. Tổng là số phân công khớp query; Pager metadata server. |
| Form validation/400 | Field errors và alert, giữ input; UUID, identity, integer/field allowlist đúng validator. Không tự thêm giới hạn search/bio vào contract hoặc đổi role target. |
| Pending/success | Khóa submit/hủy thao tác đang gửi, retry=false; success sau API 200/201 mới thông báo/refetch roster. Status/filter làm trang cuối rỗng: đọc tổng rồi chuyển trang hợp lệ, báo việc đổi trang. Form assign thành công về roster hoặc hiện result, không tự provision lại. |
| 401/403 actor/gate | Refresh session; login/change-password hoặc access denied theo auth hiện hành; clear credential khi session không đủ quyền, không auto-submit sau login. Phân biệt lỗi actor với target ACCOUNT_DEACTIVATED/INSUFFICIENT_ROLE, không đổi role/account để “sửa” lỗi. |
| 404 Gym/target/assignment | Không có dữ liệu cross-Gym; đọc lại context/list, về Gym list nếu parent mất. UUID target không tồn tại cần kiểm tra input; không dò Gym khác tự động để tiếp tục action. |
| 409 ASSIGNMENT_ALREADY_EXISTS | Đọc roster cùng Gym; cặp INACTIVE dùng kích hoạt qua xác nhận mới, không POST tạo trùng/cập nhật field cũ. Không đoán đã có row từ việc lọc một trang. |
| 409 USER_ALREADY_ACTIVE_TRAINER | PT còn ACTIVE tại Gym khác; không tự revoke/transfer. Admin kiểm tra tại Gym nguồn với quyền hiện hành, ngừng khi hết nghĩa vụ rồi tiếp nhận Gym đích; chưa có transfer nguyên tử. |
| 409 TRAINER_HAS_OPEN_OBLIGATIONS | Hiển thị số Registration/lịch hẹn, payments/memberships bằng 0 theo contract PT; link workspace giám sát của Gym. Giữ phân công ACTIVE, không force/cascade hoặc mở quyền ghi lịch Admin. |
| 409 GYM_INACTIVE/INVALID_STATUS_TRANSITION/CONCURRENT_MODIFICATION | Đọc lại Gym/roster trước thao tác mới; đổi nút theo trạng thái thực. Không tự gửi lại hoặc thêm expected_updated_at vào PATCH status. |
| 409 EMAIL_ALREADY_EXISTS/PHONE_ALREADY_EXISTS | Giữ identity để sửa; nếu tài khoản đã tồn tại, kiểm tra role/PT và dùng mode gán đúng UUID khi đủ điều kiện. Không tự đổi role hoặc trả lại mật khẩu cũ. |
| Network/5xx sau POST hoặc PATCH | Alert kết quả chưa rõ, giữ dữ liệu nhập nhưng buộc đọc lại roster/tài khoản trước gửi mới. Credential bị mất response không có endpoint lấy lại; không hứa retry trả plaintext, không hứa rollback. |

### Tái sử dụng và các điểm cần review

- `ManagedTrainersPage` hiện lấy Gym từ Manager assignment, link `/manager/...`, có AvailabilityForm và hồ sơ/giờ làm việc. Không mount nguyên màn bằng URL Admin. Đề xuất tách catalog nhận explicit gymId/context/allowed actions; Admin chỉ có roster và lifecycle, giữ chức năng Manager riêng.
- Có thể dùng `gymService.managedTrainers/assignTrainer/provisionTrainer/trainerStatus`, StaffForm, Pager, QueryState, MutationError; phải kiểm tra lifecycle state/credential cache/pending/reset khi Gym đổi. StaffForm hiện chưa khóa submit sau success hoặc chuẩn hóa đọc lại khi mạng chưa rõ; dùng lại cần chỉnh hành vi theo AC được duyệt, không coi đã đủ.
- `useListFilters('specialization')` hiện mặc định pageSize12/specialization asc; đề xuất này chọn 20/created_at desc như API default. Cần cấu hình rõ, không dùng hook rồi mô tả hành vi khác. `ManagedTrainer` frontend thiếu created_at/updated_at trong kiểu dù API có; bổ sung type đúng contract nếu triển khai, không thêm field backend.
- Trợ năng/responsive: label tất cả control, Tab/Enter/Space, focus về target hợp lệ sau dialog/form đóng/refetch, role=status/alert, không chỉ màu. Kiểm tra User ID/bio dài, 375/768/1024/1440px; plaintext handoff không vào fixture/screenshot chia sẻ. Không drag-drop/profile drawer không có contract.

**Các lựa chọn cần chốt ở ADM-DEC-02:** có đưa hai màn/route vào design hay hoãn; chấp nhận nhận diện roster bằng User ID + chuyên môn ở bản đầu; chọn pattern xác nhận/focus nhất quán trong design system. Khuyến nghị dùng đúng DTO và không thêm tìm tên/contact cho bản đầu. Yêu cầu “bước tiếp theo” cho phép soạn proposal này, chưa được ghi thành duyệt route/quyền/triển khai. Hoãn màn PT không chặn đặc tả Membership hoặc dashboard baseline.

## ADM-SPEC-06 — Đề xuất tra cứu thẻ hội viên theo Gym (11/10/2026)

**Hiện hành R17:** G2 đã duyệt, SCR-ADM-011 đã triển khai theo bố cục và10 REQ của đề xuất này. Giá/IDs/payment/timestamps đặt trong vùng inline mở bằng “Xem thông tin thẻ”, không fetch detail riêng. [Báo cáo R17](ADMIN_MEMBERSHIP_VERIFICATION.md) là bằng chứng hiện hành; trạng thái OPEN/chưa có route bên dưới là lịch sử.

**READY_FOR_REVIEW — route/màn PROPOSED, ADM-DEC-03 OPEN.** `/admin/gyms/:gymId/memberships` chưa có trong AppRoutes, chưa cấp SCR chính thức. [Feature §5.5](FEATURE_SPEC.md#55-đề-xuất-tra-cứu-thẻ-hội-viên-theo-gym--adm-spec-06-11102026-ready_for_review) có contract/field/quyền/10 REQ-AC; [Implementation §5.4](IMPLEMENTATION_PLAN.md#54-truy-vết-đề-xuất-membership-admin--adm-spec-06) có TC và coverage thiếu. Màn đọc độc lập workspace PT, không quản lý giao dịch tiền thật.

### Bố cục và tương tác đề xuất

1. Link “Thẻ hội viên” từ AdminGymPage; AdminLayout/ManagementShell với breadcrumb Quản trị Gym → Gym đã chọn → Thẻ hội viên. Header tên Gym/trạng thái từ nguồn list Admin hiện có, không thêm GET detail nội bộ. Gym INACTIVE có thông báo vẫn tra cứu lịch sử được, không disable đọc chỉ vì ngừng Gym.
2. Heading “Thẻ hội viên tại Gym”, tổng “N thẻ hội viên” từ totalItems, nút “Tải lại danh sách”. Query key gồm actor/gymId/page/pageSize; đề xuất pageSize20 và URL page, chỉ nhận page hợp lệ. Không toolbar search/status/date/sort, chỉ Pager vì contract chỉ page/pageSize.
3. Dòng/thẻ responsive hiển thị tên hội viên hoặc “Chưa có tên hồ sơ” + User ID, ID thẻ, tên gói, ngày bắt đầu/kết thúc, status từ DB. Một hội viên nhiều thẻ có nhiều dòng; không nhóm rồi gọi tổng là unique members. Tên/contact thiếu không fetch dữ liệu User khác để bù.
4. Action duy nhất “Xem thông tin thẻ” mở vùng inline read-only từ dòng: IDs Gym/gói/payment, Giá lúc mua và timestamps. payment_id null ghi “Không có liên kết thanh toán trong dữ liệu”; không badge demo/tiền thật/đã thanh toán, nút checkout/hoàn tiền hoặc endpoint detail riêng. Nếu bỏ giá ở bản đầu vẫn giữ dictionary phục vụ traceability.
5. Giữ status server; nhãn thời hạn phụ nếu cần phân biệt chưa bắt đầu/đã qua ngày kết thúc phải nói rõ là theo ngày Việt Nam, không đổi EXPIRED hoặc tạo promise eligibility. Không dùng UTC Date conversion cho YYYY-MM-DD; timestamp metadata dùng giờ Việt Nam.
6. Đóng vùng thông tin trả focus về nút mở; đổi Gym/page clear dòng mở/selection/lỗi và cancel query cũ, không giữ thẻ Gym trước dưới header Gym mới. Refetch dữ liệu mới phải cập nhật hoặc đóng vùng snapshot cũ; nếu dòng không còn ở trang hiện hành thì đóng có thông báo phù hợp.
7. Pager lấy metadata server, không đếm độ dài trang làm tổng; trang quá cuối cho về trang hợp lệ sau đọc tổng. Empty toàn Gym vẫn giữ heading/Tải lại, không gợi ý tạo thẻ hoặc ghi tiền. Không tự tải tất cả trang để tìm kiếm hoặc tính analytics.

### State và error recovery đề xuất

| State/lỗi | Hành vi và khôi phục |
| --- | --- |
| Context/list loading | Skeleton/role=status, chưa render dữ liệu Gym khác; controls cần dữ liệu bị disable; context lỗi chặn vùng chi tiết và cho đọc lại/về Gym list. |
| Success | Render read-only list và tổng/Pager; không toast “Đã cập nhật thẻ” vì không mutation. Tải lại GET có indicator để biết dữ liệu đang được làm mới. |
| Empty | total=0: “Gym chưa có thẻ hội viên.”; data=[] nhưng total>0/page ngoài cuối: thông báo trang không còn kết quả và đưa về trang hợp lệ, không báo Gym chưa có thẻ. |
| Tên null/payment null/giá0 | Fallback theo dictionary; không báo lỗi hệ thống, không suy thẻ miễn phí/demo/chưa thanh toán. 0 là giá hợp lệ và giữ decimal chính xác. |
| 400 params/query | Kiểm tra gymId/page/pageSize; URL page không hợp lệ normalize về1 trước GET, Gym UUID sai hiển thị an toàn; không retry mãi cùng input hoặc thêm filter lạ. |
| 401/password gate/403 | Refresh session và auth routing hiện hành; ẩn list/chi tiết nếu mất quyền, login/change-password hoặc access denied tương ứng. Backend tiếp tục kiểm DB account/role/scope, không trust client. |
| 404 Gym missing | Không có resource; cho về danh sách Gym. Không đổi sang public Gym detail hoặc `/memberships/me` để “khôi phục” list Admin. |
| Network/5xx/409 concurrency | Error/retry GET theo dữ liệu mới; không có rollback/mutation. Giữ context/page hợp lệ, không render snapshot sai Gym hoặc báo đã cập nhật. Lỗi không lộ SQL/credential. |

### Tái sử dụng và các điểm cần chốt

- Backend/list đã có. `ptService.memberships()` gọi đúng API nhưng `PtMembershipChoice` hiện chỉ khai một phần DTO phục vụ form chọn thẻ; proposal cần type read-only đủ projection, không giả type này đã có purchase_price/payment_id/timestamps. Có thể tách client membership dùng chung, không tạo endpoint mới.
- `RegisterPtPage` lọc từng trang thẻ ACTIVE còn hạn để đăng ký và có ghi Registration; không tái dùng nguyên màn cho Admin hoặc dùng choices làm danh sách toàn Gym. Dùng Pager/query/error helpers, thêm rõ scope Gym từ route và auth Admin.
- Trợ năng: tên/ID/thời hạn/status có nhãn, control bàn phím, focus sau đóng/refetch, status/error live; 375/768/1024/1440px không tràn ID/text dài. Không copy credential vì màn không có credential.
- ADM-DEC-03 cần chốt có thêm màn read-only và giới hạn bản đầu chỉ paging; khuyến nghị giá/payment metadata ở vùng thông tin phụ, chưa cần search/status/date/nguồn demo. Nếu cần các field/query đó, lập contract riêng trước design/code. Đề xuất read-only này không mở quản lý giao dịch tiền thật.

## ADM-SPEC-07 — Đề xuất điểm chọn Gym cho báo cáo sự cố (11/10/2026)

**Hiện hành R18:** scope G2 đã duyệt, SCR-ADM-012 và recovery của SCR-ADM-007 đã triển khai. [Báo cáo R18](ADMIN_REPORT_ENTRY_VERIFICATION.md) thay thế trạng thái OPEN/chưa có route và coverage thiếu trong baseline bên dưới. Không cảnh báo/dialog mới cho việc rời form; scope đổi gỡ state cũ. Request ghi đã gửi vẫn có thể hoàn tất ở Gym trước, không báo kết quả dưới Gym mới.

**READY_FOR_REVIEW; entry `/admin/reports` vẫn PROPOSED, ADM-DEC-04 OPEN.** Màn đích `/admin/gyms/:gymId/reports` có code, SCR-ADM-007. [Feature §5.6](FEATURE_SPEC.md#56-đề-xuất-điểm-truy-cập-báo-cáo-sự-cố--adm-spec-07-11102026-ready_for_review) có field/quyền/8 REQ-AC; [Implementation §5.5](IMPLEMENTATION_PLAN.md#55-truy-vết-entry-báo-cáo-admin--adm-spec-07) có8TC/coverage thiếu. Không cấp SCR mới để tạo màn Report trùng.

| Vùng/interaction | Đề xuất, phân biệt hiện trạng |
| --- | --- |
| Điều hướng toàn sàn | Thêm mục Báo cáo sự cố dẫn `/admin/reports` nếu duyệt; header scope Toàn hệ thống, heading Chọn Gym để xem báo cáo sự cố, giải thích cần chọn cơ sở. Sidebar scoped Báo cáo sự cố hiện đã có, giữ nguyên đích. |
| Selector | Search “Tên hoặc địa chỉ Gym” submit/Enter, trạng thái Gym Tất cả/Hoạt động/Ngừng hoạt động; query URL, pageSize12/gym_name asc, Pager và tổng “N Gym phù hợp”. Không badge counts/report/chờ xử lý khi chưa có dữ liệu. |
| Dòng Gym | Tên/địa chỉ/status + link “Xem báo cáo sự cố tại [tên Gym]” tới scoped route bằng ID, không dùng tên để ghép URL. Gym INACTIVE vẫn chọn được, nhắc đây là truy cập lịch sử nội bộ; không chặn bằng public visibility. |
| Màn đích | ReportsPage mode admin hiện có status filter local/pageSize20/Pager, nội dung/ảnh private/note/actions. Scope lấy route; deep link hoạt động độc lập selector. Không đưa filter report vào URL khi code chưa hỗ trợ. |
| Đổi Gym/đường về | Đề xuất link Chọn Gym khác từ màn đích về entry. Browser Back khôi phục selector qua URL/history; direct deep link dùng entry default. Scope đổi reset page/status/form và bỏ dữ liệu cũ, cần kiểm chứng/tách key scope khi implementation; query key có scope chưa tự chứng minh local state đã reset. |

| State/lỗi | UX và khôi phục |
| --- | --- |
| Selector loading/refetch | Skeleton/status; input còn sửa được khi phù hợp, không render danh sách cũ dưới query/context sai. Không request reports/images cho Gym chưa chọn. |
| Empty selector | “Không có Gym phù hợp.”; giữ toolbar để đổi search/status; không khẳng định hệ thống không có report. Page ngoài cuối có đường về trang hợp lệ. |
| GET selector 400/401/403/5xx/network | Validation query/auth/password gate/permission thông điệp tương ứng; error/retry đọc list, không dùng public list hoặc tính report từng Gym để bù. Mất quyền ẩn dữ liệu và theo auth guard. |
| Report empty/loading/error | Màn đích giữ recovery hiện hành theo baseline; empty là không report khớp Gym/status, không phải selector empty. 404 Gym/report không còn khả dụng cho về entry/Gym list; ảnh lỗi giữ fallback private, không public URL. |
| Report mutation pending/conflict | Giữ state machine/notes/duplicate guard của baseline; 409 hoặc kết quả mạng chưa rõ cần đọc lại trước action mới. Không làm mất input chỉ vì refresh selector; đổi scope không chuyển note/action sang Gym khác. |
| Scope change trong khi request đang chạy | Abort GET cũ khi không cần; khóa/reset ngữ cảnh mutation, server vẫn authoritative. Mutation đã gửi không thể giả rollback khi đổi route; success chỉ làm mới resource đúng Gym, không báo dưới Gym mới. |

**Reuse:** dùng gymService.gyms(query,true), useListFilters('gym_name',true), Pager/QueryState/StatusBadge và AdminLayout; tái dùng dữ liệu/list pattern của AdminGymsPage nhưng không nút tạo/sửa/status Gym. ReportsPage tiếp tục dùng route scoped, cần reset local state theo scope nếu muốn đạt AC mới. Entry không sửa backend/controller/validator, không có report aggregator hoặc inbox tổng.

**Trợ năng/responsive:** label/filter/search rõ, link nhận diện tên Gym, Tab/Enter, focus heading khi navigation và control hợp lệ khi back; widths375/768/1024/1440 và tên/địa chỉ dài không tràn. Pattern focus/note khi rời form chưa lưu cần chốt trong design system, không coi đã có dialog cảnh báo. ADM-DEC-04 chỉ chọn thêm entry hoặc hoãn; khi hoãn dùng đường Gym list/detail/sidebar đã có. Chưa duyệt Figma/route/code hoặc quản lý giao dịch tiền thật.

## ADM-SPEC-08 — Dashboard, KPI, state và cache (11/10/2026)

**READY_FOR_REVIEW**, SCR-ADM-001 đã có; label/cache/auth/a11y cải thiện vẫn proposal. [Feature §5.7](FEATURE_SPEC.md#57-dashboard-admin-kpi-và-độ-mới-dữ-liệu--adm-spec-08-11102026-ready_for_review) có định nghĩa từng KPI/10 REQ-AC; [Implementation §5.6](IMPLEMENTATION_PLAN.md#56-dashboard-và-traceability-tổng-thể--adm-spec-08) có10TC và bảng tổng thể đến Figma/implementation. Khung dashboard chứa các màn chức năng Admin; không dựng analytics giả để giống ảnh tham khảo.

### Bố cục và states

Baseline: PageHeader Tổng quan ban quản trị/ngày Việt Nam/Toàn hệ thống, Tạo cơ sở mới; 3 SummaryMetric; Cơ sở trong hệ thống tối đa5 dòng tên/địa chỉ/status/Chi tiết; Lối tắt tạo Gym/bổ nhiệm Manager/tài khoản/review/role. Từ KPI đi list toàn sàn, từ Gym vào shell scoped. Màn mới proposal05–07 không tự hiện navigation; không giả total report/PT/Membership trên dashboard.

| State | Baseline hiện tại và yêu cầu đề xuất |
| --- | --- |
| Initial loading | Skeleton từng KPI, Gym list skeleton chung nguồn với Gym metric. Đề xuất live label đang tải và không đọc0 khi chưa nhận metadata. |
| Success/zero | Metadata tổng với0 là kết quả thật; Gym empty có link tạo đầu tiên khi actor đủ quyền. Review/tài khoản0 chỉ là tập đếm trống; không lời nhắc thanh toán/duyệt pending. |
| Null/missing metadata | SummaryMetric hiện `value ?? 0`; đề xuất placeholder “Chưa có dữ liệu”, không giả0 hoặc render chart. Test success envelope thiếu metadata cần bổ sung. |
| Một query lỗi mạng/5xx | Card Không thể tải/Thử lại, vùng khác còn đọc được; Gym query lỗi ảnh hưởng cả Gym metric/list. Retry chỉ query tương ứng, không dẫn link đích. |
| Auth failure401/403 gate/role | Hook dashboard chưa refresh session theo lỗi từng query; đề xuất refresh và access guard, ẩn private data khi mất quyền. Không coi revoked Admin là partial failure và tiếp tục show cache card khác. |
| Refetch có cache/mutation success | Hiện chưa có feedback refetch/last-updated; đề xuất trạng thái đang làm mới/stale, nếu có thời gian ghi rõ client nhận query nào. Lỗi refetch không chứng minh snapshot mới; không realtime/poll tự hứa. |
| Manual refresh tổng quan | Chưa có; đề xuất nút Làm mới tổng quan đọc3query với state riêng và lỗi từng vùng. Không gom 3response thành timestamp DB nguyên tử. |
| Mobile/keyboard | Test source có4widths/Axe375+1440/menu; cần keyboard/focus/retry/live state cụ thể. SummaryMetric hiện Link bao button retry, đề xuất tách link và button thành siblings để tránh interactive nesting. |

### Audit invalidation — hiện trạng so với yêu cầu đề xuất

**Cập nhật 12/10/2026 — R05:** dashboard đã chuyển sang query keys thuộc `gyms`/`admin-users`/`review-moderation`, có User ID và suffix dashboard riêng; invalidation hiện có đã phủ các snapshot. Mutation tạo/phân công nhân sự invalidate thêm tài khoản. Audit bên dưới mô tả baseline ngày 11/10 trước thay đổi. Xem [R05 và kiểm chứng](ADMIN_UI_01_IMPLEMENTATION.md#r05--đồng-bộ-cache-dashboard-sau-mutation-12102026); trạng thái/query feedback/auth/signal thuộc R04, chưa suy ra hoàn thành toàn ADM-UI-01 hoặc realtime giữa các phiên.

Dashboard keys đều bắt đầu `['admin','dashboard',user_id,...]`, đuôi gyms/users-count/reviews-count. Invalidation prefix ở màn con dưới **không khớp** keys này. Không khẳng định dữ liệu luôn stale vì mount/refetch mặc định có thể đọc lại; kết luận là invalidation explicit chưa bảo đảm freshness. Query Gym chưa truyền AbortSignal, hai query kia có signal. AuthContext clear cache khi login/register/logout, refreshSession không tự clear toàn bộ cache ở mọi lỗi.

| Mutation hiện hành / invalidation hiện có | Tác động thật và yêu cầu dashboard sau duyệt |
| --- | --- |
| Tạo Gym/sửa/status, Manager provision/assign/revoke, PT lifecycle qua useGymMutation → `['gyms']` | Tạo/sửa/status ảnh hưởng Gym list; total Gym chỉ tăng khi tạo. Provision tạo User ảnh hưởng users-count, tạo Gym kèm Manager ảnh hưởng cả hai. Assign/revoke/status PT không đổi số User/Gym; không assert tổng giảm khi ngừng. Đề xuất invalidate dashboard family phù hợp sau commit. |
| User status → admin-users/gyms/reviews | Tổng User unfiltered giữ nguyên; cùng dữ liệu cần được đọc lại khi status/context quyền đổi. Dashboard invalidate không thay thế refreshSession hoặc guard cho mất quyền. |
| Review hide → review-moderation/reviews | Tổng Gym review gồm HIDDEN giữ nguyên; refetch theo query kind gym, không kỳ vọng giảm1. Customer tạo Gym review làm tăng nguồn total nhưng không có push realtime hiện hành; manual/navigation refetch dùng cho session Admin. |
| Package → packages; Gallery → gallery; Report → reports; Registration → pt/gyms/trainer-profile | Không tác động3tổng trực tiếp, giữ query resource riêng; không thêm KPI để “phủ” mutation. Nếu thiết kế thêm nguồn cần contract/decision riêng. |

Đề xuất chuẩn hóa invalidation theo resource và dashboard actual key, tests quay về sau create/provision/edit/status/hide với kỳ vọng đúng semantics. Có thể dùng shared key factory khi implementation, chưa thêm dependency/endpoint. Query reset actor/logout/abort và auth-error còn cần E2E; không chỉ dựa key actor là đủ cô lập UI.

### Các GAP cho G2 và design

| GAP mới | Việc cần review/kiểm chứng |
| --- | --- |
| ADM-DASH-GAP-01 | Nhãn review rộng hơn kind=gym; ADM-DEC-01 khuyến nghị “Đánh giá Gym toàn sàn”. |
| ADM-DASH-GAP-02 | Null fallback0 và thiếu refetch/stale/manual refresh semantics. |
| ADM-DASH-GAP-03 | Keys màn con không invalidate dashboard; xác định affected resource/test sau mutation, không làm sai total all-status. |
| ADM-DASH-GAP-04 | Auth failure một query chưa có refresh session/clear private view đầy đủ; Gym request thiếu signal. |
| ADM-DASH-GAP-05 | Button trong Link, live states/focus chưa có coverage đủ; thiết kế structure/control rồi kiểm keyboard/Axe. |

Chưa có Figma reference, design frames hoặc sign-off G2/G3. Proposal05–07 chỉ đưa vào brief khi chọn hoặc ghi rõ deferred; baseline dùng screens đã có. Không biểu đồ tăng trưởng/doanh thu/real payments/unique members/open report count thiếu contract.

## ADM-DESIGN-01 — Design system và screen inventory

[Brief thiết kế Admin](ADMIN_FIGMA_BRIEF.md) §2 là inventory token thực tế từ CSS; §3 cấp15Screen IDs/mapping route/Requirement; §4 là component/interaction, §5 quy tắc frame/state/responsive. SCR-ADM-009/010 PT roster/tiếp nhận,011Membership,012entry report là route mới đã duyệt scope/chưa có code. SCR-ADM-013/014/015 định danh màn scoped Package/Gallery/PT đã có code. SCR-ADM-001–008 giữ nguyên; không đổi Feature ID/quyền/contract.

Quy luật mới đưa vào design: semantic token code, spacing4px/light canvas/sidebar navy; input/control min44px, typography14–16px và contrast đúng cặp sử dụng; drawer focus trap/Escape/return focus, confirmation rõ target/hậu quả, pending/error/reload recovery, read-only fields theo DTO. Shadow/motion docs §2 khác code được ghi trong brief, chưa coi đã chuẩn hóa CSS. G3 cần review bản thiết kế thật, không nghiệm thu accessibility chỉ từ brief.

## 5. Form, trạng thái và luồng quan trọng

- Form chỉ gửi allowlist trong API §6; payload aggregate hồ sơ ghi phone ở User, address/avatar ở Profile. Field kết quả xử lý report là read-only ngoại trừ resolution_note ở action resolve.
- Status badges lấy đúng nhóm tại Database §11, không ánh xạ mọi INACTIVE/PENDING thành cùng một nghiệp vụ. Dùng màu semantic tokens kèm chữ, không chỉ dựa vào màu.
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

Q-01/Q-02: checkout, phản hồi thanh toán/thẻ; Q-03: cấp thẻ thủ công; Q-04/Q-05/Q-06/Q-07: form PT và các action lịch; Q-08: UI đa Gym; Q-09: tra cứu/ghi thiết bị và danh mục; Q-10: xác minh email, cấp mật khẩu, upload; Q-11: validation vật lý; Q-12: tái bổ nhiệm Manager; Q-13: các action status còn thiếu policy. Chỉ phát hành phần API đã chốt, không hiển thị action chưa khả dụng như đã hoạt động.

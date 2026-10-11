# Báo cáo Nghiệm thu Dashboard & Khung Quản trị Multi-Gym (PLAN_04)

Ngày hoàn thành: 11/10/2026  
Tình trạng: **100% HOÀN THÀNH VÀ ĐẠT TẤT CẢ TIÊU CHUẨN KIỂM THỬ**

---

## 1. Mục tiêu và Kiến trúc Triển khai

Thay thế kiến trúc layout thanh ngang đơn cấp (`GymLayout`) bằng hệ thống Workspace chuyên biệt hóa theo từng vai trò người dùng, kế thừa khung làm việc hợp nhất `ManagementShell`:

1. **Khung giao diện chung (`ManagementShell.tsx`):**
   - **Sidebar Navy (`#0B132B`):** Cố định 248px ở desktop, có nút thu gọn thành rail icon 72px, chuyển thành Drawer trượt có backdrop trên thiết bị di động (< 1024px).
   - **Topbar sáng (64px):** Cố định trên cùng, chứa nút toggle sidebar, thông tin phạm vi làm việc (`scopeTitle`), huy hiệu vai trò (`roleBadge`), liên kết hồ sơ cá nhân và nút đăng xuất.
   - **Vùng nội dung chính (`#gym-main`):** Bố cục dạng CSS Grid đáp ứng, hỗ trợ keyboard focus (`tabIndex={-1}`) và liên kết nhảy nhanh (`skip-link`).

2. **Bốn Không gian làm việc (Workspaces):**
   - **Manager Workspace (`ManagerLayout`):** Bắt buộc bảo vệ bởi `RequireRole(['MANAGER'])` và `GymScopeGuard`. Quản lý cơ sở được phân công, gói tập, PT, lịch tập, duyệt tư vấn, sự cố và ảnh gym.
   - **Admin Workspace (`AdminLayout`):** Hỗ trợ chuyển đổi Dual-Mode: Chế độ toàn hệ thống (Tổng quan, Quản lý cơ sở, Bổ nhiệm Manager, Quản lý tài khoản, Vai trò hệ thống, Kiểm duyệt đánh giá) và Chế độ giám sát cơ sở (`/admin/gyms/:gymId/*`) kèm nút quay lại danh sách cơ sở.
   - **PT Workspace (`PTLayout`):** Quản lý lịch dạy & học viên (`/my-pt`), hồ sơ huấn luyện viên (`/pt/profile`) và dashboard tổng quan (`/pt/dashboard`).
   - **Customer Workspace (`CustomerLayout`):** Quản lý thẻ hội viên (`/memberships`), lịch tập & PT (`/my-pt`), lịch sử giao dịch (`/payments`), báo cáo sự cố (`/reports`) và dashboard tổng quan (`/dashboard`).

3. **Nguyên tắc Toàn vẹn Dữ liệu (Data Integrity):**
   - Không số liệu giả lập, không mock widget.
   - Không đếm `data.length` của một trang paginated đơn lẻ. Chỉ hiển thị số tổng khi API trả về trường `pagination.totalItems` hoặc `total`.
   - Cô lập lỗi hoàn toàn (Partial Failure Isolation): Nếu một API lỗi, chỉ thẻ tương ứng hiển thị trạng thái lỗi cùng nút *Thử lại*, không làm crash các widget khác hoặc toàn trang.

---

## 2. Danh mục File đã Triển khai

| Phân loại | Tên File | Chức năng |
| --- | --- | --- |
| **Styles** | `apps/web/src/management.css` | Hệ thống style scoped, CSS Grid, tokens màu, WCAG contrast và responsive drawer |
| **Types** | `apps/web/src/types/navigation.types.ts` | Interface định nghĩa nhóm menu, mục menu và quyền |
| **Components** | `apps/web/src/components/navigation/Sidebar.tsx` | Thanh điều hướng bên hông, active indicator, drawer mobile |
| | `apps/web/src/components/navigation/Topbar.tsx` | Thanh điều hướng trên cùng, context phạm vi, profile link |
| | `apps/web/src/components/management/PageHeader.tsx` | Header trang quản trị chuẩn hóa kèm subtitle và CTA |
| | `apps/web/src/components/management/SummaryMetric.tsx` | Thẻ hiển thị chỉ số KPI, hỗ trợ skeleton, error retry và link điều hướng |
| **Layouts** | `apps/web/src/layouts/ManagementShell.tsx` | Khung giao diện dùng chung cho cả 4 workspace |
| | `apps/web/src/layouts/ManagerLayout.tsx` | Workspace cho Quản lý cơ sở |
| | `apps/web/src/layouts/AdminLayout.tsx` | Workspace cho Quản trị viên (hỗ trợ Dual-Mode navigation) |
| | `apps/web/src/layouts/PTLayout.tsx` | Workspace cho Huấn luyện viên |
| | `apps/web/src/layouts/CustomerLayout.tsx` | Workspace cho Hội viên |
| **Hooks** | `apps/web/src/hooks/useManagerDashboard.ts` | Truy vấn độc lập: tư vấn, sự cố, lịch PT, gói tập, HLV cơ sở |
| | `apps/web/src/hooks/useAdminDashboard.ts` | Truy vấn độc lập: tổng số cơ sở, tài khoản toàn sàn, đánh giá toàn sàn |
| | `apps/web/src/hooks/usePtDashboard.ts` | Truy vấn độc lập: lịch dạy cá nhân, học viên phụ trách, hồ sơ HLV |
| | `apps/web/src/hooks/useCustomerDashboard.ts` | Truy vấn độc lập: thẻ hội viên, lịch tập cá nhân, lịch sử thanh toán |
| **Pages** | `apps/web/src/pages/dashboard/ManagerDashboardPage.tsx` | Màn hình tổng quan Quản lý cơ sở (`/manager/dashboard`) |
| | `apps/web/src/pages/dashboard/AdminDashboardPage.tsx` | Màn hình tổng quan Quản trị viên (`/admin/dashboard`) |
| | `apps/web/src/pages/dashboard/PTDashboardPage.tsx` | Màn hình tổng quan Huấn luyện viên (`/pt/dashboard`) |
| | `apps/web/src/pages/dashboard/CustomerDashboardPage.tsx` | Màn hình tổng quan Hội viên (`/dashboard`) |
| **Routing** | `apps/web/src/routes/AppRoutes.tsx` | Định tuyến 4 workspace, bảo vệ bằng Auth & Role Guards, chia sẻ `/my-pt` |
| | `apps/web/src/layouts/GymLayout.tsx` | Layout công khai tinh giản, bổ sung lối tắt tổng quan theo vai trò |
| **E2E Tests** | `apps/web/e2e/manager-dashboard.spec.ts` | 5 bài test E2E kiểm tra toàn diện Manager Dashboard |
| | `apps/web/e2e/admin-dashboard.spec.ts` | 5 bài test E2E kiểm tra Dual-Mode và Admin Dashboard |
| | `apps/web/e2e/pt-dashboard.spec.ts` | 5 bài test E2E kiểm tra PT Dashboard và workspace |
| | `apps/web/e2e/customer-dashboard.spec.ts` | 5 bài test E2E kiểm tra Customer Dashboard và workspace |
| | `apps/web/e2e/qa02.spec.ts` | Bổ sung toàn bộ các route dashboard mới vào suite kiểm toán WCAG & viewport |

---

## 3. Bằng chứng Thực thi và Kết quả Kiểm thử

### 3.1. Các bộ kiểm thử Dashboard mới

- **`npm run test:manager-dashboard`:** **5/5 PASS (7.7s)**
  - Hiển thị đầy đủ số liệu xác thực, lịch hẹn gần nhất, điều hướng menu.
  - Thu gọn sidebar desktop, drawer mobile và trạng thái active.
  - Skip link điều hướng tới `#gym-main`.
  - Cô lập lỗi thẻ chỉ số kèm nút thử lại.
  - Responsive 375, 768, 1024, 1440px và kiểm toán Axe accessibility.

- **`npm run test:admin-dashboard`:** **5/5 PASS (7.5s)**
  - Chuyển hướng `/admin` $\to$ `/admin/dashboard`, hiển thị 3 thẻ KPI.
  - Cô lập lỗi thẻ chỉ số người dùng và thử lại thành công.
  - Chuyển đổi linh hoạt giữa chế độ toàn sàn và giám sát cơ sở.
  - Kiểm toán Axe WCAG 2A/2AA và co giãn 4 kích thước màn hình không tràn ngang.
  - Khóa truy cập với người dùng không phải Admin.

- **`npm run test:pt-dashboard`:** **5/5 PASS (7.1s)**
  - Chuyển hướng `/pt` $\to$ `/pt/dashboard`, hiển thị lịch dạy, học viên và hồ sơ.
  - Cô lập lỗi truy vấn lịch hẹn, giữ các thẻ khác.
  - Điều hướng mượt mà giữa `/my-pt`, `/pt/profile` trong PTLayout.
  - Kiểm toán WCAG 2A/2AA và mobile drawer.
  - Khóa truy cập với người dùng không phải PT.

- **`npm run test:customer-dashboard`:** **5/5 PASS (6.7s)**
  - Hiển thị thẻ hội viên sở hữu, lịch tập sắp tới, giao dịch thanh toán.
  - Cô lập lỗi truy vấn giao dịch, giữ các thẻ khác.
  - Điều hướng mượt mà giữa `/dashboard`, `/memberships`, `/my-pt` trong CustomerLayout.
  - Kiểm toán WCAG 2A/2AA và mobile drawer.
  - Khóa truy cập với khách vãng lai (Guest).

### 3.2. Kiểm thử Hồi quy Toàn sàn (Regression Testing)

Tất cả các bộ kiểm thử hiện có của dự án đều chạy và đạt kết quả tuyệt đối:

| Lệnh kiểm thử | Số test pass | Thời gian | Kết quả |
| --- | --- | --- | --- |
| `npm run test:accessibility` (QA-02 bao gồm tất cả các route của mọi role) | 3/3 | 60.0s | **PASS (0 vi phạm)** |
| `npm run test:admin-users` | 3/3 | 10.1s | **PASS** |
| `npm run test:review-moderation` | 2/2 | 9.0s | **PASS** |
| `npm run test:gym-ui` | 24/24 | 24.5s | **PASS** |
| `npm run test:package-ui` | 23/23 | 18.3s | **PASS** |
| `npm run test:consultation` | 3/3 | 8.7s | **PASS** |
| `npm run test:gallery` | 2/2 | 8.5s | **PASS** |
| `npm run test:reports` | 3/3 | 9.1s | **PASS** |
| `npm run test:pt-workflow` | 2/2 | 12.8s | **PASS** |
| `npm run test:customer-calendar` | 4/4 | 8.2s | **PASS** |
| `npm run test:trainer-profile` | 3/3 | 9.4s | **PASS** |
| `npm run test:payment-demo` | 4/4 | 11.4s | **PASS** |

### 3.3. Kiểm tra Mã nguồn & Bản dựng

- `npm run lint`: **0 warnings, 0 errors** (áp dụng `--max-warnings=0`).
- `npm run typecheck`: **0 errors** trên toàn bộ 3 workspaces (`web`, `api`, `shared`).
- `npm run build`: **Bản dựng thành công** (176 modules transformed, gzip JS ~111kB, CSS ~5.5kB).

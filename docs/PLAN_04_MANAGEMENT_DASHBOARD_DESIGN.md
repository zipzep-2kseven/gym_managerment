# Kế hoạch dashboard và quy luật thiết kế khu quản trị Multi-Gym

Ngày: 11/10/2026. Trạng thái: ĐÃ HOÀN THÀNH TRIỂN KHAI TOÀN BỘ (Steps 1–13). Tất cả 4 Workspaces (Manager, Admin, PT, Customer), 4 Dashboards và suite E2E đã nghiệm thu 100%.

## 1. Cách hiểu yêu cầu

Dashboard là một trang tổng quan nằm **bên trong không gian quản trị chung**. Sidebar, topbar và vùng nội dung tồn tại xuyên suốt khi chuyển giữa tổng quan, danh sách, chi tiết và biểu mẫu. Người dùng thực hiện nghiệp vụ trong cùng không gian này.

Ảnh SB Admin Pro và Maxton là tham chiếu về bố cục: sidebar trái, topbar trên, nội dung phía phải, các khối tổng quan. Không sao chép dữ liệu bán hàng, widget trang trí hoặc bảng màu tím/neon. Định hướng đề xuất: khu quản trị vận hành Gym chuyên nghiệp, mật độ vừa, ưu tiên công việc cần xử lý.

## 2. Hiện trạng đã đối chiếu

- `apps/web/src/layouts/GymLayout.tsx` đang chứa cả điều hướng công khai và liên kết Customer/PT/Manager/Admin trong một header ngang.
- `apps/web/src/routes/AppRoutes.tsx` đặt phần lớn các màn nghiệp vụ dưới layout đó; chưa khai báo route dashboard riêng cho từng vai trò.
- `ManagerGymPage` là trang sửa thông tin Gym; `AdminGymsPage` là danh sách cơ sở. Hai trang này không thay thế trang tổng quan vận hành.
- Đã có quản trị Gym/Manager, tài khoản, vai trò chỉ đọc, kiểm duyệt đánh giá; Manager có gói tập, PT, lịch, tư vấn, sự cố, gallery.
- Customer có thẻ, thanh toán demo, lịch/PT, báo cáo; PT có lịch/học viên qua workspace và hồ sơ PT.
- Architecture Decisions §8 đã định hướng Public/Customer/PT/Manager/Admin layouts. Kế hoạch này đưa giao diện tiến tới cấu trúc đó, dùng chung thành phần khung để tránh nhân bản.
- UI/UX spec đã mô tả các route tổng quan, nhưng không đồng nghĩa các route/API thống kê đã tồn tại. Những bổ sung nghiệp vụ cuối spec và code hiện hành phải được kiểm tra khi triển khai.
- Thanh toán hiện có là demo, API đọc giao dịch/thẻ cá nhân. Chưa có nguồn doanh thu toàn Gym/toàn sàn dùng cho dashboard.

Nguồn đối chiếu: `docs/ARCHITECTURE_DECISIONS.md`, `docs/DOMAIN_RULES.md`, `docs/UI_UX_SPEC.md`, README và các routes/services frontend hiện có. Không thêm quyền Staff, quản lý thiết bị, quota PT hoặc quyền tài chính vào kế hoạch đợt đầu.

## 3. Lựa chọn thiết kế

| Phương án | Đánh giá cho hiện tại |
| --- | --- |
| Toàn bộ dark như Maxton | Có thể làm ở đợt sau; cần bộ token dark và kiểm tra tương phản riêng cho bảng/form/ảnh |
| Sidebar navy + topbar/nội dung sáng | **Đề xuất mặc định**: gần mẫu quản trị, giữ nhận diện và token hiện có, thuận tiện đọc bảng/form lâu |
| Toàn bộ sáng | Khả thi, nhưng sidebar navy giúp phân biệt khu quản trị và trang khám phá Gym rõ hơn |

Đợt đầu không thêm theme switcher. Dùng React Router, TanStack Query và styling hiện có; chưa cài admin template hoặc thư viện UI/chart mới. Component khung và CSS Grid đủ cho bố cục. Chỉ đánh giá thư viện chart khi có dữ liệu/contract cho biểu đồ.

## 4. Khung giao diện và điều hướng

```text
┌──────────────────┬──────────────────────────────────────────┐
│ MULTIGYM         │ Thu menu · Phạm vi làm việc · Tài khoản   │
│ Vai trò / Gym    ├──────────────────────────────────────────┤
│                  │ Breadcrumb                               │
│ Tổng quan        │ Tiêu đề + mô tả ngắn + hành động chính   │
│                  │                                          │
│ VẬN HÀNH         │ Khối tổng quan có dữ liệu xác thực       │
│ Lịch tập & PT    │                                          │
│ Yêu cầu tư vấn   │ Nội dung chính: lịch / bảng / form       │
│ Báo cáo sự cố    │                                          │
│                  │ Khối phụ: việc cần xử lý / liên kết      │
│ CƠ SỞ            │                                          │
│ Gói tập · PT     │                                          │
│ Thông tin · Ảnh  │                                          │
│                  │                                          │
│ Xem trang Gym    │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

Đây là ví dụ cho Manager; menu của từng vai trò có dữ liệu cấu hình riêng.

### 4.1. Sitemap chi tiết và quyền truy cập (Bước 1)

| Vai trò | Tên mục | Route | Guard / Điều kiện | Component phụ trách | Ghi chú điều hướng |
| --- | --- | --- | --- | --- | --- |
| **Manager** | Tổng quan | `/manager/dashboard` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ManagerDashboardPage` | Route tổng quan mới |
| Manager | PT và lịch tập | `/manager/pt` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `PtWorkspacePage mode="manager"` | Giữ nguyên URL & chức năng hiện có |
| Manager | Yêu cầu tư vấn | `/manager/consultations` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ConsultationInboxPage` | Quản lý inbox tư vấn |
| Manager | Xử lý báo cáo | `/manager/reports` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ReportsPage mode="manager"` | Tiếp nhận & xử lý sự cố |
| Manager | Gói tập | `/manager/packages` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ManagedPackagesPage` | Bật/tắt & tạo gói |
| Manager | Quản lý PT | `/manager/trainers` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ManagedTrainersPage` | Danh sách PT cơ sở |
| Manager | Tiếp nhận PT | `/manager/trainers/assign` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `AssignTrainerPage` | Cấp/gán PT vào Gym |
| Manager | Hồ sơ PT | `/manager/trainers/:id/profile` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `TrainerProfilePage manager` | Chỉnh sửa hồ sơ PT |
| Manager | Thông tin Gym | `/manager/gym` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `ManagerGymPage` | Cập nhật thông tin cơ sở |
| Manager | Ảnh Gym | `/manager/gallery` | `RequireRole(['MANAGER'])`, `GymScopeGuard` | `GalleryPage` | Quản lý ảnh cơ sở |
| Manager | Xem trang Gym | `/gyms/:gymId` | Công khai / xác thực | `PublicGymPage` | Lối tắt xem trang khách thấy |
| **Admin** | Tổng quan | `/admin/dashboard` | `RequireRole(['ADMIN'])` | `AdminDashboardPage` | Route tổng quan sàn |
| Admin | Quản lý cơ sở | `/admin/gyms` | `RequireRole(['ADMIN'])` | `AdminGymsPage` | Danh sách cơ sở |
| Admin | Tạo cơ sở mới | `/admin/gyms/create` | `RequireRole(['ADMIN'])` | `CreateGymPage` | Tạo Gym kèm Manager |
| Admin | Bổ nhiệm Manager | `/admin/managers` | `RequireRole(['ADMIN'])` | `AdminManagersPage` | Cấp Manager độc lập |
| Admin | Tài khoản | `/admin/users` | `RequireRole(['ADMIN'])` | `AdminUsersPage` | Khóa/mở tài khoản |
| Admin | Vai trò hệ thống | `/admin/roles` | `RequireRole(['ADMIN'])` | `AdminRolesPage` | Danh sách vai trò chỉ đọc |
| Admin | Kiểm duyệt đánh giá | `/admin/reviews` | `RequireRole(['ADMIN'])` | `ReviewModerationPage` | Ẩn/hiện review toàn sàn |
| Admin (Gym scoped) | Chi tiết Gym | `/admin/gyms/:gymId` | `RequireRole(['ADMIN'])` | `AdminGymPage` | Thông tin cơ sở |
| Admin (Gym scoped) | Gói tập Gym | `/admin/gyms/:gymId/packages` | `RequireRole(['ADMIN'])` | `ManagedPackagesPage admin` | Giám sát gói tập |
| Admin (Gym scoped) | Ảnh Gym | `/admin/gyms/:gymId/gallery` | `RequireRole(['ADMIN'])` | `GalleryPage admin` | Giám sát ảnh |
| Admin (Gym scoped) | Báo cáo Gym | `/admin/gyms/:gymId/reports` | `RequireRole(['ADMIN'])` | `ReportsPage mode="admin"` | Giám sát sự cố |
| Admin (Gym scoped) | Lịch tập Gym | `/admin/gyms/:gymId/pt` | `RequireRole(['ADMIN'])` | `PtWorkspacePage mode="admin"` | Giám sát lịch (chỉ đọc) |
| **PT** | Tổng quan | `/pt/dashboard` | `RequireRole(['PT'])` | `PtDashboardPage` | Lịch dạy sắp tới |
| PT | PT và lịch tập | `/my-pt` | `RequireRole(['PT'])` | `PtWorkspacePage` | Quản lý ca tập & học viên |
| PT | Hồ sơ cá nhân | `/pt/profile` | `RequireRole(['PT'])` | `TrainerProfilePage` | Cập nhật bio & lịch làm |
| **Customer** | Tổng quan | `/dashboard` | `RequireRole(['CUSTOMER'])` | `CustomerDashboardPage` | Bàn làm việc hội viên |
| Customer | Thẻ hội viên | `/memberships` | `RequireRole(['CUSTOMER'])` | `MembershipsPage` | Danh sách thẻ tập |
| Customer | PT và lịch tập | `/my-pt` | `RequireRole(['CUSTOMER'])` | `PtWorkspacePage` | Đăng ký & quản lý lịch |
| Customer | Lịch sử thanh toán | `/payments` | `RequireRole(['CUSTOMER'])` | `PaymentHistoryPage` | Lịch sử demo thanh toán |
| Customer | Báo cáo sự cố | `/reports` | `RequireRole(['CUSTOMER'])` | `ReportsPage` | Gửi & theo dõi phản ánh |

- Sidebar nhóm tối đa hai cấp; mục đang mở có nhãn, nền active và `aria-current` phù hợp. Route chi tiết giữ active mục cha.
- Manager luôn thấy Gym được bổ nhiệm, không có bộ chọn Gym khác. Chưa có phân công thì hiển thị thông báo và đường về tài khoản.
- Admin ở phạm vi toàn hệ thống; khi vào `/admin/gyms/:gymId/*`, hiển thị tên Gym và menu con: thông tin, gói tập, ảnh, sự cố, giám sát PT/lịch. Có liên kết quay lại danh sách cơ sở. Chưa chọn Gym thì không hiển thị nội dung scoped.
- PT chỉ thấy phân công hợp lệ; giờ làm việc tham khảo không được thể hiện như lịch còn chỗ trống.
- Người có nhiều role được chuyển không gian làm việc giữa các role thực sự được cấp. Không ghép toàn bộ menu các role vào một sidebar.
- Avatar mở hồ sơ, đổi mật khẩu và đăng xuất. Hồ sơ/đổi mật khẩu dùng luồng hiện có; gate bắt buộc đổi mật khẩu vẫn được ưu tiên.
- Topbar không đặt chuông thông báo, tìm kiếm toàn hệ thống hoặc cài đặt khi chưa có chức năng. Tìm kiếm nằm trong toolbar từng danh sách.
- Giữ URL nghiệp vụ hiện có. Dashboard là route bổ sung; chuyển trang con giữ khung qua `<Outlet />`, không dựng dashboard lồng dashboard.
- Trang công khai tiếp tục phục vụ khám phá Gym; có liên kết rõ ràng giữa trang công khai và không gian làm việc.

## 5. Nội dung dashboard phù hợp từng vai trò

### 5.1. Bảng đối chiếu nguồn dữ liệu widget (Bước 1)

| Vai trò | Widget | Service / Hàm frontend | Endpoint backend | Tham số & Filter | Khả năng tính Total / Giới hạn | Hành động & Liên kết |
| --- | --- | --- | --- | --- | --- | --- |
| **Manager** | Tư vấn chờ xử lý | `consultationService.list` | `GET /api/v1/gyms/:gymId/consultation-requests` | `page=1, pageSize=20, status=PENDING` | Có `pagination.totalItems` chuẩn từ backend | Xem danh sách tư vấn (`/manager/consultations?status=PENDING`) |
| Manager | Sự cố chờ xử lý | `reportService.list` | `GET /api/v1/gyms/:gymId/reports` | `page=1, pageSize=20, status=PENDING` | Có `pagination.totalItems` chuẩn từ backend | Xem danh sách sự cố (`/manager/reports?status=PENDING`) |
| Manager | Lịch hẹn gần nhất | `ptService.appointments` | `GET /api/v1/gyms/:gymId/pt-appointments` | `page=1, pageSize=20` | API **không hỗ trợ filter date/status**; chỉ lấy trang 1 hiển thị các ca hẹn gần nhất | Mở toàn bộ lịch tập (`/manager/pt`) |
| Manager | Gói tập đang bán | `packageService.list` | `GET /api/v1/gyms/:gymId/management/packages` | `page=1, pageSize=1, status=ACTIVE` | Có `pagination.totalItems` chuẩn | Quản lý gói tập (`/manager/packages`) |
| Manager | Huấn luyện viên hoạt động | `gymService.managedTrainers` | `GET /api/v1/gyms/:gymId/management/trainers` | `page=1, pageSize=1, status=ACTIVE` | Có `pagination.totalItems` chuẩn | Quản lý PT (`/manager/trainers`) |
| **Admin** | Tổng số cơ sở | `gymService.gyms` | `GET /api/v1/admin/gyms` | `page=1, pageSize=1` | Có `pagination.totalItems` chuẩn | Quản trị cơ sở (`/admin/gyms`) |
| Admin | Tài khoản toàn sàn | `adminUserService.list` | `GET /api/v1/admin/users` | `page=1, pageSize=1` | Có `total` chuẩn từ `UserList` | Quản lý tài khoản (`/admin/users`) |
| Admin | Đánh giá toàn sàn | `reviewModerationService.list` | `GET /api/v1/admin/reviews` | `page=1, pageSize=1, kind=gym` | Có `total` chuẩn từ `ModerationList` | Kiểm duyệt đánh giá (`/admin/reviews`) |
| **PT** | Lịch dạy sắp tới | `ptService.appointments` | `GET /api/v1/pt-appointments/me` | `page=1, pageSize=20` | API phân trang cá nhân; hiển thị các ca hẹn tiếp theo | Mở lịch PT (`/my-pt`) |
| PT | Trạng thái nhận học viên | `trainerProfileService.mine` | `GET /api/v1/trainer-profile/me` | N/A | Dữ liệu hồ sơ đơn lẻ | Cập nhật hồ sơ (`/pt/profile`) |
| **Customer** | Thẻ hội viên đang có | `paymentService.memberships` | `GET /api/v1/memberships/me` | `page=1, pageSize=20` | Danh sách thẻ cá nhân | Xem thẻ (`/memberships`) |
| Customer | Ca tập tiếp theo | `ptService.appointments` | `GET /api/v1/pt-appointments/me` | `page=1, pageSize=20` | Ca hẹn đã đăng ký | Mở lịch hẹn (`/my-pt`) |
| Customer | Giao dịch demo | `paymentService.payments` | `GET /api/v1/payments/me` | `page=1, pageSize=10` | Có nhãn rõ "Thanh toán demo" | Xem lịch sử thanh toán (`/payments`) |

### 5.2. Wireframe Manager Dashboard (Bước 2)

#### Bố cục Desktop (>= 1024px)
```text
┌──────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ MULTIGYM             │ [Icon Thu gọn]  Cơ sở: Gym Bình An             [User] Browser MANAGER   │
│ Quản lý cơ sở        ├────────────────────────────────────────────────────────────────────────┤
│                      │ Breadcrumb: Quản trị > Tổng quan                                       │
│ [Icon] Tổng quan (*) │                                                                        │
│                      │ <h1>Tổng quan Gym Bình An</h1>               [Button] Mở lịch tập      │
│ VẬN HÀNH             │ Ngày hôm nay: Thứ Hai, 11/10/2026 · Trạng thái: Đang hoạt động          │
│ [Icon] Lịch tập & PT ├────────────────────────────────────────────────────────────────────────┤
│ [Icon] Tư vấn        │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ [Icon] Xử lý báo cáo │ │ Tư vấn chờ    │ │ Sự cố chờ     │ │ Gói đang bán  │ │ PT hoạt động │ │
│                      │ │ 3             │ │ 1             │ │ 6             │ │ 4            │ │
│ CƠ SỞ                │ │ Xem inbox ->  │ │ Xử lý ngay -> │ │ Quản lý ->    │ │ Danh sách -> │ │
│ [Icon] Gói tập       │ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘ │
│ [Icon] Quản lý PT    ├─────────────────────────────────────────┬──────────────────────────────┤
│ [Icon] Thông tin Gym │ LỊCH HẸN VẬN HÀNH GẦN NHẤT              │ VIỆC CẦN XỬ LÝ NGAY          │
│ [Icon] Ảnh Gym       │ • 08:00 - 09:30 · Lê Văn C · PT Trần An │ • Tư vấn: Nguyễn Văn A       │
│                      │   [Trạng thái: ĐÃ XÁC NHẬN]             │   SĐT: 0912345678 (10p trước)│
│ [Icon] Xem trang Gym │ • 10:00 - 11:30 · Trần Thị B · PT Văn D │ • Sự cố: Máy chạy bộ hỏng... │
│                      │   [Trạng thái: CHỜ DUYỆT]               │                              │
│                      │                                         │ LỐI TẮT VẬN HÀNH             │
│                      │                                         │ • Cập nhật thông tin phòng   │
│                      │                                         │ • Quản lý thư viện ảnh       │
│                      │                                         │ • Thêm huấn luyện viên mới   │
└──────────────────────┴─────────────────────────────────────────┴──────────────────────────────┘
```

#### Bố cục Mobile (< 768px)
```text
┌──────────────────────────────────────────────────┐
│ [≡ Menu] MULTIGYM        Gym Bình An      [User] │
├──────────────────────────────────────────────────┤
│ <h1>Tổng quan Gym Bình An</h1>                   │
│ [Button: Mở lịch tập]                            │
├──────────────────────────────────────────────────┤
│ [Thẻ: Tư vấn chờ: 3] ->                          │
│ [Thẻ: Sự cố chờ: 1] ->                           │
│ [Thẻ: Gói đang bán: 6] ->                        │
│ [Thẻ: PT hoạt động: 4] ->                        │
├──────────────────────────────────────────────────┤
│ LỊCH HẸN GẦN NHẤT (Danh sách dạng thẻ cuộn)     │
│ • 08:00 Lê Văn C - PT Trần An [ĐÃ XÁC NHẬN]      │
│ • 10:00 Trần Thị B - PT Văn D [CHỜ DUYỆT]        │
├──────────────────────────────────────────────────┤
│ VIỆC CẦN XỬ LÝ NGAY                              │
│ • Tư vấn: Nguyễn Văn A (0912345678)              │
│ • Sự cố: Máy chạy bộ tầng 2                      │
└──────────────────────────────────────────────────┘
```

### 5.3. Quy tắc dữ liệu và xử lý lỗi riêng biệt
1. Lập bảng widget → service → filter → pagination/total → quyền trước khi code từng dashboard (đã lập tại §5.1).
2. Không dùng `items.length` của một trang phân trang làm tổng. Chỉ dùng metadata `totalItems` / `total` nếu backend hỗ trợ đúng điều kiện cần hiển thị.
3. Filter thời gian/trạng thái phải áp dụng trên toàn bộ nguồn phù hợp, không lọc một trang rồi tuyên bố đó là toàn bộ lịch hôm nay.
4. Đối với lịch tập toàn Gym: do endpoint backend `GET /gyms/:gymId/pt-appointments` chỉ phân trang theo `page, pageSize` và chưa hỗ trợ filter theo ngày, widget dashboard chỉ hiển thị danh sách các buổi hẹn từ trang đầu tiên (hoặc các ca mới nhất) và cung cấp đường dẫn rõ ràng đến màn hình lịch đầy đủ `/manager/pt`.
5. Nguyên tắc lỗi cục bộ (Partial Failure): Khi một widget (ví dụ Tư vấn) gặp lỗi, các widget khác (Sự cố, Gói tập, PT) vẫn hiển thị bình thường. Widget lỗi hiển thị cảnh báo nhẹ và nút "Thử lại".
6. Không điền số demo hoặc 0 giả định khi đang tải hoặc khi API lỗi. Lỗi tải không đồng nghĩa số lượng bằng 0.
7. Tiền demo có nhãn “Thanh toán demo”; không gọi tổng giao dịch demo là doanh thu thực.
8. Query key gồm: `['manager', 'dashboard', gymId, resource]`. Khi chuyển sang Gym khác hoặc đăng xuất, cache cũ được xóa bỏ hoặc cô lập theo đúng `gymId`.

## 6. Quy luật design áp dụng xuyên suốt

| Thành phần | Quy luật đề xuất và tiêu chí kiểm tra |
| --- | --- |
| Sidebar | Desktop rộng 248px, thu gọn 72px; nền navy từ token; item cao tối thiểu 44px; icon có accessible name/tooltip khi thu gọn |
| Topbar | Cao tối thiểu 64px, sticky, nền sáng, viền dưới; nội dung dài được wrap, không che nội dung khi zoom |
| Content | Padding 24px desktop, 16px mobile; chiều rộng tối đa 1400px trong vùng còn lại; Grid 12 cột desktop, 1 cột mobile |
| Khoảng cách | Dùng scale 4/8/12/16/24/32 hiện có; các khối cách nhau 24px, trường form 16px |
| Màu | Navy cho brand/điều hướng; trắng và slate cho nội dung; đỏ nhấn tiết chế; trạng thái dùng token semantic hiện có |
| Nút | Nút chính navy theo code hiện tại; destructive đỏ và có xác nhận; link điều hướng không giả làm nút submit; tối đa một CTA primary ở header |
| Chữ | Giữ font system hiện có và tiếng Việt; H1 24px, H2 18px, nội dung 14–16px; số KPI 28px; số bảng dùng tabular numerals |
| Card | Viền 1px từ token, radius 8px; shadow nhẹ khi cần; không card lồng card; đợt đầu tối đa 4 chỉ số và 2 khối nội dung chính |
| Danh sách | Header → toolbar → bảng/list → phân trang; giữ filter trong URL theo pattern hiện có; có tổng chỉ khi API cung cấp |
| Chi tiết/form | Breadcrumb, tiêu đề, trạng thái, nhóm thông tin; nhãn trên input; lỗi cạnh trường; khóa submit khi pending; giữ draft khi lỗi |
| Trạng thái | Loading skeleton giữ kích thước; empty có giải thích; error có retry GET; POST không tự retry; thành công cập nhật cache liên quan |
| Motion | 150–250ms; hỗ trợ reduced motion; không animation biểu diễn hoặc minh họa chiếm vùng dữ liệu |

**Responsive:** >=1024px sidebar cố định có nút thu gọn; 768–1023px mặc định rail thu gọn có thể mở drawer; <768px sidebar trong drawer, topbar gọn, nội dung một cột. Lịch tuần chuyển danh sách/ngày trên mobile. Bảng phức tạp có summary cards hoặc cuộn trong vùng bảng riêng, không làm toàn trang tràn ngang.

**Accessibility:** giữ skip link, landmarks, focus-visible, label và tương phản theo spec. Drawer/dialog có focus trap, Escape để đóng và trả focus về nút mở; mục tiêu nội bộ vùng bấm 44px. Kiểm tra reflow tại 320 CSS px/zoom, ngoài các viewport 375/768/1024/1440. Màu trạng thái luôn kèm nhãn, không chỉ dựa vào màu.

Tham khảo kiểm chứng: [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Mức 44px là mục tiêu thiết kế của dự án, không phải cách diễn đạt ngưỡng tối thiểu của SC 2.5.8.

## 7. Cấu trúc triển khai đề xuất

- `layouts/ManagementShell.tsx`: bố cục chung sidebar/topbar/content và Outlet, không chứa logic nghiệp vụ.
- `layouts/AdminLayout.tsx`, `ManagerLayout.tsx`, `PTLayout.tsx`, `CustomerLayout.tsx`: cấu hình khung theo role; `PublicLayout.tsx` tách từ GymLayout.
- `components/navigation/`: Sidebar, Topbar, menu tài khoản; cấu hình menu riêng theo workspace.
- `components/management/`: PageHeader, SummaryMetric và các thành phần trạng thái cần tái sử dụng; tái sử dụng QueryState/StatusBadge/Pager nếu phù hợp.
- `pages/dashboard/`: dashboard theo role; `hooks/` điều phối server state; `services/` giữ API call. Không query DB hoặc phân quyền backend trong layout.
- Token tái sử dụng `index.css`; style khu quản trị giới hạn scope để không ảnh hưởng auth/public. Không sửa `.btn-primary` toàn cục chỉ để phù hợp sidebar.
- Guards hiện có tiếp tục bao bọc đúng routes. Sidebar chỉ là UX; quyền role/Gym/ownership vẫn do backend xác minh.

## 8. Kế hoạch thực hiện theo thứ tự

Mỗi bước là một đơn vị nghiệm thu. Danh sách file là dự kiến; nếu vượt khoảng 5 file thì chia bước khi triển khai.

| Bước | Nội dung / file dự kiến | Tiêu chí nghiệm thu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Chốt sitemap và bảng nguồn dữ liệu trong tài liệu này; đối chiếu spec/API | Mỗi menu có route/quyền; mỗi widget có nguồn và giới hạn; đánh dấu phần thiếu contract | Review với routes/services và tài liệu nghiệp vụ | **Hoàn thành** (Checkpoint A) |
| 2 | Wireframe Manager desktop/mobile và quy luật token; cập nhật UI_UX_SPEC sau review | Có tổng quan, danh sách, chi tiết/form; cùng một khung; không widget giả | Đối chiếu wireframe với các luật ở §6 | **Hoàn thành** (Checkpoint A) |
| 3 | ManagementShell, Sidebar, Topbar, cấu hình menu và CSS có scope | Thu/mở menu, active item, bàn phím/drawer hoạt động; layout không chứa nghiệp vụ | Playwright khung + accessibility; typecheck/build/lint | **Hoàn thành** (Checkpoint A) |
| 4 | ManagerLayout và nhánh Manager trong AppRoutes | Mọi URL Manager hiện có dùng khung; trực tiếp/reload đúng trang; giữ GymScopeGuard và password gate | Hồi quy gói, PT, tư vấn, report/gallery | **Hoàn thành** (Checkpoint A) |
| 5 | ManagerDashboard và hooks cho các khối đủ nguồn | Tư vấn/sự cố/lịch có nguồn đúng; partial failure không xóa khối khác; tổng không sai pagination | `test:manager-dashboard` (5/5 PASS) | **Hoàn thành** (Checkpoint A) |
| 6 | AdminLayout, menu và nhánh Admin | Giữ routes tài khoản/role/review/Gym; menu con scoped có tên Gym và đường quay lại | Hồi quy admin-users, review-moderation, gym-ui | **Hoàn thành** (Checkpoint B) |
| 7 | AdminDashboard và hooks phù hợp | Danh sách/lối tắt thật; số tổng chỉ khi đủ metadata; không thêm quyền tư vấn/tài chính | `test:admin-dashboard` (5/5 PASS) | **Hoàn thành** (Checkpoint B) |
| 8 | PTLayout và nhánh PT/shared workspace | Lịch/học viên/hồ sơ truy cập đúng quyền; /my-pt không nhân bản nghiệp vụ | Hồi quy pt-workflow và trainer-profile | **Hoàn thành** (Checkpoint C) |
| 9 | PTDashboard và hooks | Lịch đúng ownership; availability không bị hiểu là slot/quota | `test:pt-dashboard` (5/5 PASS) | **Hoàn thành** (Checkpoint C) |
| 10 | CustomerLayout và nhánh Customer | Thẻ/lịch/thanh toán/report giữ luồng, liên kết Gym rõ; tài khoản nhiều role chuyển đúng workspace | Hồi quy payment-demo, customer-calendar, reports | **Hoàn thành** (Checkpoint C) |
| 11 | CustomerDashboard và hooks | Thẻ/lịch từ tài khoản hiện tại; nhãn demo đúng; không tính tổng từ một trang | `test:customer-dashboard` (5/5 PASS) | **Hoàn thành** (Checkpoint C) |
| 12 | Tách PublicLayout và điều hướng vào workspace | Khám phá Gym/đăng nhập/checkout vẫn truy cập được; profile/change-password giữ hành vi | Auth/gym/package browser regression | **Hoàn thành** (Checkpoint C) |
| 13 | Kiểm tra tổng thể và báo cáo nghiệm thu | Không mất chức năng, không leak scope/cache, đạt viewport/a11y; ghi rõ giới hạn dữ liệu còn lại | QA-02 (3/3 PASS, 100% route/role), lint, typecheck, build PASS | **Hoàn thành** (Checkpoint C) |

- **Checkpoint A (Đã nghiệm thu):** Khung giao diện `ManagementShell`, CSS scoped và `ManagerDashboard` hoạt động hoàn chỉnh, đạt chuẩn WCAG AA và responsive 375–1440px.
- **Checkpoint B (Đã nghiệm thu):** `AdminLayout` hỗ trợ chuyển đổi linh hoạt dual-mode (toàn hệ thống vs giám sát cơ sở), `AdminDashboard` với 3 chỉ số KPI và lối tắt chuẩn chỉnh.
- **Checkpoint C (Đã nghiệm thu):** `PTLayout` (`/pt/dashboard`, `/my-pt`, `/pt/profile`), `CustomerLayout` (`/dashboard`, `/memberships`, `/payments`, `/reports`, `/my-pt`), chia sẻ linh hoạt `/my-pt`, điều hướng workspace từ `GymLayout`. Báo cáo QA-02 và toàn bộ 14 bộ test E2E đạt 100% PASS.

Lệnh kiểm chứng dùng scripts hiện có: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run typecheck:e2e -w apps/web`; các browser suite liên quan ở từng bước. Chạy `npm run test:qa02` khi tích hợp đầy đủ và môi trường đáp ứng điều kiện README. Không chạy migration hoặc tạo dữ liệu nghiệp vụ vào DB vận hành để trang tổng quan có số đẹp.

## 9. Rủi ro và ranh giới đợt đầu

| Rủi ro | Hướng xử lý |
| --- | --- |
| Dashboard đẹp nhưng số liệu sai | Chốt nguồn/filter/total trước; bỏ KPI chưa đủ nguồn |
| Chuyển layout làm hỏng guards hoặc link cũ | Giữ URL, tái sử dụng guards; test trực tiếp URL, reload và role khác |
| Nhầm Gym khi Admin đổi scope | Scope rõ trong URL/header/query key; không giữ dữ liệu Gym trước |
| Nhân bản quyền/thao tác | Dashboard dẫn về màn hiện có; không mở quyền tài chính/Staff hoặc sửa lịch Admin |
| CSS ảnh hưởng auth/public | Giới hạn CSS quản trị; kiểm tra luồng public và profile/password |
| Fetch tất cả trang gây chậm | Không mặc định dùng all-pages cho thống kê; đánh giá riêng lịch và đề xuất contract khi cần |

Ưu tiên release: khung quản trị + Manager, sau đó Admin, rồi PT/Customer. Theme dark, biểu đồ xu hướng, thông báo và tìm kiếm toàn hệ thống chỉ xét ở đợt sau khi có nhu cầu và nguồn dữ liệu được duyệt. Các lựa chọn mặc định trong kế hoạch là đề xuất thiết kế, chưa phải thay đổi architecture/spec chính thức.

# ADM-UI-01 — Áp dụng giao diện Admin vào ứng dụng

**QA tổng sau R22 — 14/10/2026:** R22 giám sát PT đã kiểm chứng; QA-02 tự động toàn ứng dụng PASS root exit0,28suite×2vòng,824lượt browser,retries0. Các ghi chú “tiếp theo QA tổng” phía dưới là lịch sử; đây không phải nghiệm thu các hạng mục design/Figma còn dở. [Báo cáo](QA_02_POST_R22_VERIFICATION.md).

**Cập nhật R21 — 12/10/2026:** SCR-ADM-014 Gallery Admin có context Gym/quota, upload/caption/order/delete với chốt ghi chung, đọc lại kết quả trước thao tác tiếp, ảnh private và kiểm phiên/focus/responsive. Gym INACTIVE vẫn quản trị nội bộ; lost POST không tự retry hoặc suy identity ảnh. [Phạm vi,5 REQ và kiểm chứng R21](ADMIN_GALLERY_VERIFICATION.md). Tiếp theo R22 giám sát PT; ADM-UI-01 vẫn IN_PROGRESS.

**Cập nhật R20 — 12/10/2026:** đã chuẩn hóa SCR-ADM-013 gói tập Admin theo Gym: catalog12/URL, snapshot/partial/null, confirmation/pending/focus và receipt/read-back; giữ Gym INACTIVE nội bộ cùng lịch sử thẻ/giao dịch. [Phạm vi,5 REQ và kiểm chứng R20](ADMIN_PACKAGES_VERIFICATION.md). Tiếp theo R21 Gallery Gym; ADM-UI-01 vẫn IN_PROGRESS.

**Cập nhật R19 — 12/10/2026:** đã chuẩn hóa màn kiểm duyệt Gym/PT SCR-ADM-008, selector/pager độc lập, lịch sử ẩn, xác nhận/focus, khóa ghi và read-back khi kết quả chưa rõ. [Phạm vi, ADM-BASE-27/28 và kiểm chứng R19](ADMIN_REVIEW_MODERATION_VERIFICATION.md). Tiếp theo R20 quản lý gói tập theo Gym; ADM-UI-01 tổng thể vẫn IN_PROGRESS.

**Cập nhật R18 — 12/10/2026:** đã có selector báo cáo SCR-ADM-012 và recovery theo actor/Gym ở SCR-ADM-007, giữ API/policy hiện có. [Phạm vi,8 REQ và kiểm chứng R18](ADMIN_REPORT_ENTRY_VERIFICATION.md). Tiếp theo R19 kiểm duyệt đánh giá Admin; ADM-UI-01 tổng thể vẫn IN_PROGRESS. Kết quả và “Việc còn lại” trước R18 dưới đây là lịch sử từng lát cắt.

**Cập nhật R17 — 12/10/2026:** đã triển khai màn thẻ hội viên chỉ đọc theo Gym SCR-ADM-011, phân trang20, thông tin dòng, trạng thái dữ liệu/quyền và responsive. [Phạm vi,10 REQ và kiểm chứng R17](ADMIN_MEMBERSHIP_VERIFICATION.md). Tiếp theo R18 entry chọn Gym cho báo cáo; ADM-UI-01 tổng thể vẫn IN_PROGRESS. Phần “Việc còn lại” và kết quả trước R17 dưới đây mô tả lịch sử từng lát cắt.

**Cập nhật R16 — 12/10/2026:** đã nghiệm thu12 REQ/AC/TC PT Admin trong phạm vi fixture, bổ sung coverage và sửa credential/refetch failure cùng điều hướng401. Xem [bằng chứng và giới hạn R16](ADMIN_TRAINER_ACCEPTANCE.md). Tiếp theo Membership Admin chỉ đọc theo Gym; ADM-UI-01 tổng thể vẫn IN_PROGRESS.

**Cập nhật R15 — 12/10/2026:** roster PT có xác nhận ngừng/kích hoạt, đọc nghĩa vụ và current account/role/Gym, recovery sau lỗi và trang cuối rỗng. Xem [báo cáo R15](ADMIN_TRAINER_LIFECYCLE_VERIFICATION.md). Nghiệm thu PT tổng hợp tiếp tục ở R16; ADM-UI-01 vẫn IN_PROGRESS.

**Cập nhật R14 — 12/10/2026:** Admin có màn tiếp nhận PT theo Gym, gán/provision, credential một lần và đối soát lỗi chưa rõ. Xem [báo cáo R14](ADMIN_TRAINER_INTAKE_VERIFICATION.md). Lifecycle PT còn tiếp tục; ADM-UI-01 vẫn IN_PROGRESS.

Ngày 11/10/2026. Người dùng yêu cầu “okay vậy thực hiện tiếp theo đi” sau khi xác nhận cần đưa prototype vào frontend đang chạy. Chỉ dẫn này cho phép triển khai lát cắt Admin bên dưới. **ADM-UI-01: IN_PROGRESS; lát cắt giao diện đầu tiên đã áp dụng vào `apps/web`.** Các ghi chú “frontend chưa thay đổi” trong tài liệu prototype mô tả đợt trước; không còn là trạng thái hiện tại của lát cắt này.

## Phạm vi đã sửa

| Trang | Thay đổi hiển thị và hành vi |
| --- | --- |
| `/admin/dashboard` | Ba KPI trên một hàng ở desktop, thẻ lớn và nhấn màu nhẹ; nhãn “Đánh giá Gym toàn sàn”; danh sách cơ sở/lối tắt dùng bố cục mới; nút chi tiết đủ cao 44px. |
| `/admin/users` | Tiêu đề/nút thao tác chung, bộ lọc trong panel, tài khoản thành các thẻ riêng, trạng thái có nhãn màu. Luồng API/CAS/khóa và mở lại giữ nguyên. |
| `/admin/roles` | Bốn role trên lưới hai cột desktop/một cột mobile; chỉ đọc, description null có fallback, có nút tải lại. |
| `/admin/gyms` | Tiêu đề/thao tác/bộ lọc thống nhất, tổng kết quả và thẻ cơ sở; giữ tìm/lọc/phân trang và API hiện hành. |
| `/admin/gyms/create` | Biểu mẫu tạo Gym kèm Manager nằm dưới page header mới; giữ tạo nguyên tử, credential một lần và chống gửi lặp. |
| `/admin/gyms/:gymId` | Khối phạm vi Gym/tình trạng/địa chỉ/lối tắt; tách form thông tin và khối trạng thái hai cột desktop, một cột mobile. |
| `/admin/managers` | Phạm vi Gym rõ ràng, form/phân công hai cột; Gym có assignment ACTIVE khóa bổ nhiệm mới cho tới khi thu hồi; bàn giao credential vẫn giữ trong form. |

CSS mới `apps/web/src/admin.css` chỉ áp dụng qua class `admin-workspace`; Manager/PT/Customer không nhận theme Admin. Khung chung cho phép thêm class; nút hồ sơ mobile Admin chuyển thành biểu tượng có tên truy cập để tránh chồng chữ. Không thêm endpoint, quyền, schema, dependency hoặc giao dịch tiền thật.

## Xem trong ứng dụng

Chạy frontend bằng lệnh dev hiện dùng và mở `/admin/dashboard`, `/admin/users`, `/admin/gyms`, `/admin/managers`. Vite đang chạy sẽ nhận thay đổi; tải lại trình duyệt nếu đang giữ trang cũ. Nếu chạy bản build/preview, cần build lại rồi dùng đầu ra mới. Dữ liệu trên các trang vẫn lấy từ API thật hiện hành, không thay bằng fixtures prototype.

Ảnh từ frontend thật với API mock kiểm thử: [dashboard desktop](design/admin-frontend/previews/dashboard-desktop.png), [dashboard mobile](design/admin-frontend/previews/dashboard-mobile.png). Các số liệu trong ảnh là dữ liệu kiểm thử, không phải dữ liệu triển khai.

## Kiểm chứng

Các lệnh kiểm tra dùng cho lát cắt này:

- `npm run build --workspace @multi-gym/web`
- `npm run test:admin-dashboard --workspace @multi-gym/web`: KPI, lỗi từng nguồn, scope/navigation, responsive 375/768/1024/1440, axe, quyền và vị trí nhãn/nút hồ sơ trên mobile.
- `npm run test:gym-ui --workspace @multi-gym/web`: tạo/sửa Gym, nghĩa vụ, credential, đúng Gym, hồi quy Manager/PT/public và khóa bổ nhiệm khi có Manager ACTIVE.
- `npm run test:admin-users --workspace @multi-gym/web`: tra cứu/role, bảo vệ Admin, CAS/pending, khóa/mở lại trên DB tạm và hồi quy xác thực.

**Kết quả chạy cuối:** build PASS, typecheck E2E PASS; dashboard 5/5, Gym UI 25/25, tài khoản 3/3 PASS (33 kiểm tra). Đã xem ảnh desktop/mobile; lỗi chồng chữ mobile có kiểm tra tái hiện trước sửa và PASS sau sửa.

Các bộ kiểm tra mock và DB tạm không chứng minh môi trường triển khai đã nhận bản build. Kết quả chạy cuối được ghi trong báo cáo [verification](design/admin-frontend/verification.json).

## Việc còn lại

Đây là lát cắt giao diện đầu tiên, không đánh dấu hoàn tất toàn bộ ADM-UI-01 hoặc nghiệm thu tất cả 79 Requirement. Các state nâng cao trong prototype như khóa điều hướng toàn workspace khi ghi, focus restoration mọi mutation, phục hồi trang cuối, tổng hợp lỗi xác thực dashboard/cache vẫn cần triển khai/kiểm chứng riêng. Các màn PT roster/tiếp nhận, Membership, điểm chọn Gym cho sự cố và thiết kế chi tiết các màn sự cố/đánh giá/gói/gallery/giám sát PT tiếp tục theo roadmap Admin. Giao diện riêng của Manager chưa được thiết kế lại trong đợt này.

## R02 — Sửa navigation tablet (12/10/2026)

Theo yêu cầu thực hiện task đầu tiên của proposal redesign, đã sửa lát cắt navigation dưới ADM-UI-01. Topbar dùng breakpoint `lg` (1024px), khớp drawer trong `management.css`; nút mở menu hiện dưới 1024px, nút thu gọn desktop hiện từ 1024px. ManagementShell đóng drawer khi chuyển sang desktop và không áp dụng trạng thái thu gọn desktop vào drawer đang mở, giữ nhãn và chiều rộng 248px. Không đổi palette, API, schema, quyền hoặc dependency.

Test hồi quy bổ sung tại `apps/web/e2e/admin-dashboard.spec.ts`: mở/đóng menu ở 375/767/768/900/1023px, navigation desktop ở 1024/1440px, desktop thu gọn → tablet drawer đầy đủ nhãn, tablet mở → desktop → tablet không giữ overlay/open state. Test thất bại trên code cũ vì thiếu nút menu tại tablet; bộ Admin chạy lại sau sửa đạt 6/6.

Kiểm chứng mới cho lát cắt này:

- `npm run typecheck`, `npm run build`: PASS toàn workspace.
- `npm run typecheck:e2e --workspace @multi-gym/web`: PASS.
- ESLint Topbar, ManagementShell và admin-dashboard test với `--max-warnings=0`: PASS.
- Admin dashboard 6/6; hồi quy Manager/PT/Customer dashboard mỗi bộ 5/5, tổng 21/21 browser tests PASS. Các bộ này dùng API mock, không chứng minh môi trường deployment.
- `npm run lint` toàn repository: FAIL với 115 lỗi `no-undef` tại prototype JavaScript trong `docs/design/admin-pilot` và `docs/design/admin-workspace`; các file prototype/config không được sửa trong R02. Chưa đạt cổng lint toàn repository.

ADM-UI-01 vẫn IN_PROGRESS. Focus trap, cô lập nền, loại menu đóng khỏi Tab order và return focus thuộc R03; visual direction xanh và widget trạng thái vẫn chưa triển khai. Ảnh preview lịch sử không cập nhật trong task navigation.

## R03 — Keyboard và focus cho drawer (12/10/2026)

Đã triển khai `useDrawerFocus` dùng chung trong Sidebar của ManagementShell. Dưới 1024px, sidebar đóng được đặt `inert` để loại khỏi Tab order. Khi mở, drawer có `role="dialog"`/`aria-modal`, focus chuyển đến nút đóng; Tab/Shift+Tab chạy vòng trong drawer. Skip link và nội dung nền được đặt `inert`, cuộn body được khóa. Escape, nút đóng, backdrop và đổi route đều đóng drawer và trả focus về phần tử mở trước đó; khi chuyển desktop, nút thu gọn menu nhận focus nếu nút mở mobile đã ẩn.

Hook dọn event listener và khôi phục giá trị `inert`/overflow trước đó khi đóng, chuyển breakpoint hoặc unmount. Bước trả focus chạy sau React commit để tránh React khôi phục focus vào link của drawer vừa đóng; có kiểm tra drawer chưa mở lại và phần tử đích còn tương tác được. ManagementShell dùng callback đóng ổn định. Không thêm package, không đổi palette/API/quyền/schema.

Ba test mới bao phủ bàn phím ở 375/900px, nền không nhận focus, axe WCAG A/AA khi drawer mở, đóng bằng Escape/nút/backdrop, đổi route, chuyển desktop và rời ManagementShell. Các test thất bại trước implementation; sau sửa, bộ Admin đạt 9/9.

Kiểm chứng R03:

- `npm run build`, `npm run typecheck`: PASS toàn workspace.
- `npm run typecheck:e2e --workspace @multi-gym/web`: PASS.
- ESLint Sidebar/Topbar/useDrawerFocus/ManagementShell/admin-dashboard test với `--max-warnings=0`: PASS.
- Admin 9/9; Manager/PT/Customer mỗi bộ 5/5: tổng 24/24 browser tests PASS. Dùng API mock, chưa xác nhận deployment.
- Lint toàn repository vẫn FAIL: 115 lỗi `no-undef` trong prototype cũ tại `docs/design/admin-pilot` và `docs/design/admin-workspace`.

R03 đã hoàn thành phạm vi keyboard/focus drawer; ADM-UI-01 vẫn IN_PROGRESS. Task tiếp theo là R04 — chuẩn hóa trạng thái KPI/dashboard. Ảnh preview lịch sử được giữ nguyên trong lát cắt này.

## R04 — Trạng thái KPI và dashboard (12/10/2026)

Đã thay KPI Admin bằng `AdminDashboardMetric`, tách article chứa dữ liệu khỏi liên kết điều hướng và nút retry. Tổng chỉ được hiển thị khi là số nguyên không âm hợp lệ; thiếu/null/không hợp lệ hiển thị “Chưa có dữ liệu”, số 0 thật vẫn hiển thị 0. `SummaryMetric` của các dashboard khác chưa thay đổi.

Nguồn giữ nguyên: Gym lấy `pagination.totalItems` từ `/admin/gyms?page=1&pageSize=5`, User lấy `total` từ `/admin/users?page=1&pageSize=20`, Gym Review lấy `total` từ `/admin/reviews?kind=gym&page=1&pageSize=10`. Không thêm bộ lọc status; không suy ra tổng bằng số dòng trang đầu. Danh sách Gym chỉ báo rỗng khi nhận được mảng rỗng; thiếu dữ liệu có trạng thái riêng.

`DashboardQueryFeedback` thông báo tải/làm mới/lỗi và thời gian client nhận dữ liệu cho từng nguồn bằng live region. Nút “Làm mới tổng quan” gọi cả ba query và khóa khi đang tải; retry chỉ tải lại nguồn tương ứng. Lỗi làm mới giữ số liệu và danh sách đã nhận kèm cảnh báo dữ liệu cũ; không giả snapshot mới hoặc thời điểm DB nguyên tử. HTTP 401/403 ở bất kỳ nguồn nào ẩn tất cả dữ liệu dashboard, kiểm tra lại phiên qua `refreshSession` và để guard xác thực/quyền hiện có xử lý. Request Gym được truyền AbortSignal như hai nguồn còn lại.

Kiểm chứng R04:

- `npm run build`, `npm run typecheck`: PASS toàn workspace; `npm run typecheck:e2e --workspace @multi-gym/web`: PASS.
- ESLint các component mới, AdminDashboardPage, useAdminDashboard, gym.service và admin-dashboard test: PASS với `--max-warnings=0`.
- Admin dashboard 16/16 và Gym UI 25/25: tổng 41/41 browser tests PASS. Bảy ca mới bao phủ loading/missing/zero, Gym unavailable/empty, refresh ba nguồn/stale/retry bàn phím, 401/403 và session/role bị thu hồi. Hồi quy responsive 375/768/1024/1440 và axe vẫn PASS.
- Đã xem ảnh frontend desktop/mobile mới do E2E tạo; cập nhật hai preview hiện có. Số liệu trong ảnh là API mock kiểm thử.
- `npm run lint` toàn repo: FAIL với 115 lỗi `no-undef` trong prototype cũ; không sửa cấu hình lint/prototype trong lát cắt này.

R04 hoàn thành phạm vi trạng thái dashboard. ADM-UI-01 vẫn IN_PROGRESS; đồng bộ invalidation dashboard sau mutation và visual redesign còn ở các task tiếp theo. Không đổi API/backend/quyền/schema hoặc thêm package; kiểm thử mock chưa xác nhận deployment.

## R05 — Đồng bộ cache dashboard sau mutation (12/10/2026)

Đã đưa query dashboard vào nhóm tài nguyên hiện có qua `adminDashboardKeys`; mỗi key vẫn chứa User ID và phân biệt snapshot dashboard với danh sách/phạm vi Gym:

| Nguồn | Query key mới | Invalidation được tiếp nhận |
| --- | --- | --- |
| Gym/list tối đa 5 dòng | `['gyms', 'admin', userId, 'dashboard']` | Mutation Gym qua `useGymMutation`, cũng như invalidation Gym sau User status |
| Tổng User | `['admin-users', userId, 'dashboard-count']` | User status; tạo Gym kèm Manager; cấp/gán Manager/PT; thu hồi Manager và đổi trạng thái PT |
| Tổng Gym Review | `['review-moderation', userId, 'dashboard-count', 'gym']` | Hide review qua callback invalidation hiện có |

`useGymMutation` thêm tùy chọn `affectsAccounts`, chỉ invalidate `admin-users` khi thao tác liên quan tài khoản/phân công. Các form tạo Gym kèm Manager/Staff, thu hồi Manager và trạng thái PT đã bật tùy chọn này. Sửa thông tin/trạng thái Gym vẫn chỉ invalidate nhóm Gym. Invalidation chạy sau server success, không sửa số tổng bằng phép tăng/giảm trên client và không đổi hành vi bàn giao credential. Query dashboard không còn phụ thuộc namespace riêng mà mutation bỏ sót.

Kiểm chứng R05:

- Test cache thực bằng QueryClient tái hiện 3 lỗi invalidation với key cũ, sau sửa 4/4 PASS. Kiểm tra nguồn liên quan bị đánh dấu invalidated, nguồn khác giữ nguyên, snapshot không tự đổi total, actor và list/count không dùng chung dữ liệu. Lệnh: `npm run test:dashboard-cache --workspace @multi-gym/web`; dùng Node/tsx đã có trong monorepo, không thêm dependency. Test được đưa vào typecheck E2E.
- Browser Admin 19/19; Gym UI 25/25: tổng 44/44 PASS. Ba ca mới đi từ dashboard sang tạo Gym kèm Manager/đổi status Gym/khóa User/ẩn review rồi quay lại: tạo Gym tăng cả Gym/User; status và hide giữ tổng all-status. Invalidation explicit được kiểm tra bằng test cache, không suy ra từ refetch khi mount vốn có `staleTime: 0`.
- `npm run build`, `npm run typecheck`, `npm run typecheck:e2e --workspace @multi-gym/web`: PASS. ESLint các file sửa và test cache với `--max-warnings=0`: PASS.
- Lint toàn repo vẫn FAIL với 115 lỗi prototype `no-undef` cũ. Preview dashboard được E2E tạo lại với API mock, không phải dữ liệu production.

R05 hoàn thành phạm vi cache sau mutation trong client hiện hành; ADM-UI-01 vẫn IN_PROGRESS. Không có push realtime giữa các phiên/người dùng; refresh thủ công và refetch khi điều hướng vẫn dùng cho thay đổi ở phiên khác. Backend/API/quyền/schema và package dependency giữ nguyên. Visual redesign tiếp tục ở task sau.

## R06 — Token và component thị giác Admin (12/10/2026)

Đã thêm `apps/web/src/admin-tokens.css`, chỉ kế thừa trong `.admin-workspace`. Design read: Minimal SaaS × Enterprise Operations; variance/motion/density `3/1/5`. CSS Admin sử dụng token cho sidebar/active, action/hover/focus, padding/radius/gap và typography heading/KPI; nền, chữ, border và màu trạng thái tiếp tục dùng token hiện có.

| Token | Giá trị / mục đích |
| --- | --- |
| `--admin-action` / `--admin-action-hover` / `--admin-action-soft` | `#2563eb` / `#1d4ed8` / `#eff6ff`: tương tác chính, hover, nền hover nhẹ |
| `--admin-focus` / `--admin-focus-on-navy` | `#2563eb` / `#93c5fd`: focus trên workspace / sidebar navy |
| `--admin-sidebar` / `--admin-sidebar-active` | `#0b132b` / `#1e40af`: nền sidebar / mục hiện hành |
| `--admin-radius-card` / `--admin-panel-padding` / `--admin-section-gap` | Alias radius-lg/space-6/space-5: 8px/24px/20px |
| `--admin-page-title-size` / `--admin-metric-size` | 28px/36px; responsive mobile tiếp tục dùng heading 24px |

Nút chính, liên kết KPI và focus dùng xanh dương. Secondary button dùng surface trắng với hover xanh nhạt. KPI dùng cùng surface trắng, border 1px, bỏ viền màu riêng từng thẻ và shadow khi hover lên article không tương tác. Sidebar active có nền xanh và focus tương phản trên navy. Không đổi bố cục/dashboard data, không thêm chart/search/feed chưa có nguồn.

StatusBadge bổ sung class trạng thái; chỉ CSS Admin đổi ACTIVE thành xanh semantic và INACTIVE thành neutral. Tài khoản SUSPENDED dùng warning thay vì neutral. Nhãn trạng thái vẫn giữ để không phụ thuộc màu. Component chung ở các vai trò khác không nhận palette Admin. R02–R05, cache, retry và semantics số liệu được giữ.

Kiểm chứng R06:

- Admin dashboard 19/19, Gym UI 25/25, Manager dashboard 5/5: tổng 49/49 browser tests PASS. Có responsive 375/768/1024/1440, axe WCAG A/AA và keyboard/drawer.
- Build toàn workspace và build frontend cuối: PASS; typecheck toàn workspace/E2E: PASS. ESLint GymUi/AdminUsersPage: PASS; `git diff --check`: PASS. Lint toàn repo còn 115 lỗi prototype `no-undef` cũ.
- Kiểm tra computed styles trong trình duyệt: CTA nền và focus `rgb(37,99,235)`; focus link KPI solid 2px; ba KPI cùng nền trắng/border neutral 1px. Trang đăng nhập giữ nút navy và không kế thừa `--admin-action`.
- Đã xem preview desktop/mobile mới do E2E tạo và cập nhật ảnh hiện có; các số liệu là API mock kiểm thử, chưa xác nhận deployment.

R06 hoàn thành nền tảng token/component thị giác Admin; ADM-UI-01 vẫn IN_PROGRESS. Các task bố cục dashboard và nghiệm thu tổng thể còn tiếp tục; không suy ra toàn bộ roadmap hoàn thành. Không thêm package hoặc thay API/backend/quyền/schema.

## R07 — Bố cục dashboard và các vùng vận hành (12/10/2026)

Đã hoàn thiện bố cục `/admin/dashboard` theo Minimal SaaS × Enterprise Operations, variance/motion/density `3/1/5`:

- Header gồm ngày/phạm vi neutral, tiêu đề, mô tả ngắn và hai action thật: làm mới/tạo cơ sở. Phạm vi “Toàn hệ thống” không dùng dấu chấm xanh thể hiện tình trạng hoạt động.
- Ba KPI có mô tả phạm vi đếm: Gym gồm hoạt động/ngừng hoạt động, User mọi vai trò/trạng thái, Gym Review công khai/đã ẩn. Không thêm số liệu đối chiếu hoặc biểu đồ thiếu nguồn.
- Vùng Gym là cột chính; danh sách dùng `ul/li`, căn cột tên/địa chỉ, trạng thái và liên kết chi tiết ở desktop, chuyển thành dòng thông tin/nhãn/action ở mobile. Bỏ card/border lồng từng cơ sở; liên kết chi tiết có tên truy cập riêng theo Gym và vùng bấm tối thiểu 44px. Ghi rõ đây là danh sách tối đa 5 cơ sở, có lối vào danh sách đầy đủ để tìm kiếm/lọc; không gọi là cơ sở mới nhất.
- Vùng lối tắt ở cột phụ có mô tả tác vụ; các link giữ route và accessible name hiện có, mô tả qua `aria-describedby`. Dưới 1200px hai vùng xếp dọc; KPI xếp một cột dưới 768px với padding/chữ gọn hơn.

Tách `AdminGymOverview` và `AdminDashboardShortcuts` thành component riêng; page giảm còn 102 dòng. CSS bố cục chỉ áp dụng trong Admin dashboard. Giữ loading/error/unavailable/empty/cached data/refetch feedback, kiểm tra quyền, retry và invalidation của R02–R06; không tạo request hoặc widget mới.

Kiểm chứng R07:

- Admin dashboard 20/20, Manager dashboard 5/5: 25/25 browser tests PASS; cache tests 4/4 PASS. Ca mới kiểm tra 5 tên/địa chỉ Gym dài tại 375/768/900/1024/1440px, không overflow, link chi tiết có tên riêng/chiều cao 44px và đi đúng Gym. Tổng KPI lấy metadata 25, không lấy số 5 dòng hiện ra.
- Responsive/axe WCAG A/AA chạy lại sau tinh chỉnh phạm vi neutral: PASS. Đã xem preview desktop/mobile và cập nhật ảnh frontend thật dùng API mock hiện có.
- Build/typecheck toàn workspace, typecheck E2E và build frontend cuối: PASS. ESLint page/component/test đã sửa và `git diff --check`: PASS. Lint toàn repo vẫn FAIL với 115 lỗi `no-undef` prototype cũ.

R07 hoàn thành phạm vi bố cục dashboard; ADM-UI-01 vẫn IN_PROGRESS. Task tiếp theo là nghiệm thu dashboard và rà soát các state/responsive/interaction cuối. Không thêm package hoặc đổi backend/API/quyền/schema; kết quả mock không xác nhận deployment hoặc nghiệm thu toàn bộ roadmap Admin.

## R08 — QA và nghiệm thu frontend dashboard (12/10/2026)

Đã đối chiếu REQ-ADM-DASH-01–10 và lập [báo cáo nghiệm thu](ADMIN_DASHBOARD_ACCEPTANCE.md) với bằng chứng frontend, kết quả chạy cuối và các phần backend/integration chưa xác nhận. Bổ sung sáu ca E2E cho focus retry, metadata không hợp lệ, logout/request cancellation/actor mới, toàn bộ lối tắt và Gym cached refresh failure.

QA tái hiện lỗi nút retry bị thay bằng loading khiến focus rơi về body. Đã sửa `DashboardQueryFeedback`: retry thất bại trả focus về nút retry, thành công chuyển sang action link của vùng; không giành focus nếu người dùng đã chuyển control. Test lỗi lặp và thành công đạt sau sửa.

Kiểm chứng cuối: Admin 26/26, Gym UI 25/25, Manager/PT/Customer mỗi suite 5/5 — tổng 66/66 browser tests PASS; cache 4/4 PASS. Build/typecheck toàn workspace, typecheck E2E, ESLint TS/TSX đang sửa/thêm trong web và `git diff --check` PASS. Đã xem preview desktop/mobile từ lượt E2E cuối. Browser tests dùng Chromium/API mock, không xác nhận DB thật/deployment hoặc mọi browser/screen reader.

`npm run lint` toàn repo vẫn FAIL với 115 lỗi `no-undef` ở prototype cũ. R08 hoàn thành việc QA và ghi nhận kết quả, nhưng toàn bộ cổng chất lượng repo chưa thông qua. ADM-UI-01 vẫn IN_PROGRESS. Công việc tiếp theo: xử lý baseline lint, sau đó kiểm chứng integration và các phần roadmap Admin còn lại. Không thêm dependency hoặc thay backend/API/schema/quyền.

## R09 — Xử lý baseline lint prototype (12/10/2026)

Đã tái hiện `npm run lint` thất bại với 115 lỗi `no-undef`. Nguyên nhân: cấu hình chỉ khai báo browser globals cho TS/TSX trong web, trong khi prototype dùng JS chạy trong browser và check.mjs chứa callback Playwright chạy trong trang. Các script workspace cũng tham chiếu trực tiếp tên property được gán trên `window` từ script trước.

Thêm browser globals chỉ cho JS/MJS trong `docs/design/admin-pilot` và `docs/design/admin-workspace`. Giữ Node globals cho check script. Đổi các tham chiếu fixtures/view/forms/controller thành `window.AdminWorkspace*`, giữ thứ tự script hiện hành. Không ignore prototype, tắt `no-undef`, thêm dependency hoặc đổi runtime nghiệp vụ/API/schema.

Kiểm chứng R09:

- `npm run lint`: PASS toàn repo với `--max-warnings=0` (trước sửa: 115 lỗi, sau sửa: 0 lỗi).
- Probe qua ESLint API: browser globals được nhận diện trong hai phạm vi; biến giả chưa khai báo vẫn nhận `no-undef`; script Node ngoài phạm vi vẫn báo lỗi nếu dùng `document`.
- Chạy `node check.mjs` của hai prototype trên bản sao trong `.qa-artifacts/lint-r09-4o60cwns`: pilot 24/24, workspace 27/27, không failure. Bao gồm chức năng, responsive, keyboard/focus và axe; dùng dữ liệu hư cấu, không kết nối backend. Ảnh và JSON được ghi vào bản sao để giữ artifact thiết kế hiện có.
- `npm run typecheck`: PASS web/api/shared. `git diff --check`: PASS.

R09 hoàn thành phạm vi baseline lint. Các kết quả FAIL lint trong R04–R08 là lịch sử, blocker đó đã được xử lý. Không chạy lại 66 browser tests dashboard trong R09 vì production dashboard không đổi; kết quả R08 vẫn gắn với lượt chạy trước. ADM-UI-01 vẫn IN_PROGRESS; tiếp theo kiểm chứng integration với backend/DB thật theo ma trận phần còn thiếu của R08.

## R10 — Kiểm chứng dashboard với API và DB thật (12/10/2026)

Đã thêm suite/config/script `test:admin-dashboard-live`, mở rộng fixture dùng chung bằng flag riêng để seed hơn 5 Gym/mixed status và lịch sử review hợp lệ. Chỉ chạy trên DB tạm có prefix/UUID được kiểm tra, áp dụng migration đầy đủ và cleanup. Không thay production frontend/backend/API/schema/dependency.

Kiểm chứng total UI đối chiếu SQL count, thứ tự Gym khi trùng created_at, tạo Gym kèm Manager qua UI, provision PT qua API, khóa User, status Gym/hide review và gán/thu hồi Manager. Phiên cũ bị role/password/status DB thay đổi nhận 401/403 khi refresh; dashboard mất dữ liệu riêng tư và guard hiện hành xử lý đúng. Chi tiết các bước dùng form/API và giới hạn tại [báo cáo live](ADMIN_DASHBOARD_LIVE_VERIFICATION.md).

Kết quả cuối: dashboard live 5/5, Gym live hồi quy 2/2 PASS; backend User 8 nhóm, review moderation 6 nhóm, onboarding 12 ca và staffing 12 ca PASS. Typecheck E2E/API tests, lint toàn repo và `git diff --check` PASS. PostgreSQL xác nhận không còn DB browser tạm sau chạy. Không chạy lại build hoặc 66 mock browser tests R08 vì production code không đổi.

R10 hoàn thành phạm vi kiểm chứng backend/DB thật trong môi trường cô lập. Chưa xác nhận deployment/live browser race liên phiên hoặc tất cả 79 Requirement; ADM-UI-01 vẫn IN_PROGRESS và các màn ngoài dashboard tiếp tục theo roadmap.

## R11 — Đưa dashboard vào cổng hồi quy QA (12/10/2026)

Audit runner phát hiện các suite dashboard có script riêng nhưng chưa nằm trong `test:e2e`/`test:qa02`. Đã bổ sung `admin-dashboard`, `admin-dashboard-live`, `manager-dashboard`, `pt-dashboard`, `customer-dashboard` vào danh sách mặc định, tăng 17→22 suite. Root QA-02 chạy thêm `test:dashboard-cache` trước backend regression. Giữ chạy tuần tự, fail fast, retries=0, log/kết quả từng suite/vòng và fixture cô lập hiện có.

Runner hỗ trợ `--suites=name1,name2` để chạy nhóm đã chọn với cùng cơ chế log/fixture/fail fast. Chỉ chấp nhận tên trong danh sách; tên rỗng, không hợp lệ hoặc trùng bị từ chối trước khởi động test. Mặc định không truyền tùy chọn này vẫn chạy đủ 22 suite; `--rounds` giữ giới hạn 1–5. Không đổi production UI/API/backend/schema hoặc thêm package.

Kiểm chứng R11:

- `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-dashboard,admin-dashboard-live,manager-dashboard,pt-dashboard,customer-dashboard`: PASS 5 suite × 1 vòng không retry — Admin 26, Admin live 5, Manager/PT/Customer mỗi suite 5, tổng 46/46. Đã đọc `browser-results.json` của runner và đối chiếu từng suite exit code 0.
- `npm run test:dashboard-cache --workspace @multi-gym/web`: 4/4 PASS; `npm run lint` và `npm run typecheck:e2e --workspace @multi-gym/web`: PASS. `git diff --check`: PASS.
- CLI probe từ chối `--suites=`, tên không tồn tại, tên trùng, đường dẫn ngoài danh sách và `--rounds=0` trước khi mở browser.

Artifacts hiện tại nằm trong `apps/web/.qa-artifacts/`; JSON chỉ chứa nhóm 5 suite của lượt này. R11 hoàn thành việc tích hợp cổng hồi quy, chưa chạy toàn bộ root QA-02 hoặc 22 suite × 2 vòng nên không tuyên bố kết quả đó PASS. ADM-UI-01 vẫn IN_PROGRESS. Task nghiệm thu tiếp theo: chạy QA-02 đầy đủ hai vòng với phạm vi mở rộng, xử lý lỗi nếu có và cập nhật bằng chứng.

## R12 — Nghiệm thu đầy đủ QA-02 hai vòng (12/10/2026)

Đã chạy `npm run test:qa02` từ root đến hết, exit code 0. Lint/typecheck/build toàn workspace, typecheck API/E2E tests, cache 4/4 và toàn chuỗi backend QA-01 PASS. Runner thực thi đủ 22 suite × 2 vòng với retries=0: 138 ca/vòng, tổng 276 lượt browser PASS. Không phát sinh lỗi cần sửa code/test trong lượt này.

Đã đối chiếu 44 bản ghi suite/vòng và mọi exit code 0. Kiểm tra DB read-only trước/sau giữ số đếm demo 3 User/2 Gym/1 Membership/0 registration/0 appointment; không suy ra toàn bộ bản ghi bất biến chỉ từ số đếm. Không còn DB browser tạm sau chạy. `git diff --check` PASS. Chi tiết từng suite và bằng chứng tại [báo cáo R12](QA_02_R12_VERIFICATION.md).

R12 hoàn thành việc nghiệm thu cổng hồi quy mở rộng; ghi chú R11 chưa chạy toàn chuỗi là lịch sử. Kết quả không xác nhận deployment hoặc toàn bộ roadmap/79 Requirement Admin. ADM-UI-01 vẫn IN_PROGRESS cho các màn ngoài dashboard; không mở lại các nghiệp vụ đã CLOSED hoặc triển khai phần đã hoãn.

## R13 — Roster PT đọc theo Gym cho Admin (12/10/2026)

Đã thực hiện lát cắt roster đọc đầu tiên của scope PT được G2 duyệt: SCR-ADM-009 `/admin/gyms/:gymId/trainers`, lối vào Gym detail/sidebar, context và query actor/Gym, search/status/sort/paging20/refresh. Hiển thị đúng projection, null/0 và availability read-only; chặn UUID sai và ẩn dữ liệu sau lỗi quyền. Không bê action Manager hoặc thêm API/package/schema.

Đã sửa NavLink exact qua `end` sau khi ảnh QA tái hiện nhiều mục sidebar active cùng lúc; retry thành công có fallback focus vào refresh trong roster. Đã xem và lưu preview desktop/mobile. Roster11/11 (10mock+1live), Admin26/26, Manager/PT/Customer mỗi suite5/5 và Gym UI25/25 PASS — tổng77 ca. Build/typecheck/lint và diff check PASS; DB browser tạm đã dọn.

Chi tiết và giới hạn tại [báo cáo R13](ADMIN_TRAINERS_READ_VERIFICATION.md). Runner mặc định tăng lên23suite; R12 là kết quả trước lát cắt này, không coi QA23suite×2vòng đã chạy. R13 hoàn thành phần đọc; ADM-UI-01 vẫn IN_PROGRESS. R14 tiếp theo là SCR-ADM-010 gán/provision PT và credential; lifecycle/page recovery tiếp tục sau đó.

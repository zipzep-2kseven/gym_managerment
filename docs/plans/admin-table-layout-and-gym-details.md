# Kế hoạch UI Admin dạng bảng và chi tiết Gym — 2026-10-15

Trạng thái: Đã triển khai; kết quả kiểm chứng và ảnh giao diện được ghi ở cuối tài liệu.

## Yêu cầu đã ghi nhận

Tài liệu này thay thế các quyết định mâu thuẫn trong kế hoạch `admin-dashboard-cleanup.md` ngày 2026-10-14, đặc biệt việc bỏ toàn bộ màn hình thông tin Gym và chặn Admin đọc báo cáo sự cố.

- Admin quản lý phòng Gym, tài khoản và kiểm duyệt đánh giá; được xem đầy đủ thông tin nghiệp vụ của từng Gym để giám sát.
- Admin sửa thông tin Gym, quản lý trạng thái cơ sở và bổ nhiệm/thu hồi Manager trong Gym đó. Các thao tác vận hành Gym thuộc Manager phụ trách.
- Báo cáo sự cố nằm trong chi tiết Gym: Admin xem danh sách, nội dung, ảnh và tiến độ xử lý; không tiếp nhận/giải quyết/từ chối báo cáo.
- Sidebar giữ Tổng quan, Quản lý phòng Gym, Quản lý tài khoản, Kiểm duyệt đánh giá; không đưa nghiệp vụ riêng của Gym ra sidebar toàn hệ thống.
- Áp dụng bố cục nội dung của ảnh tham chiếu cho danh sách Gym và tài khoản. Ảnh không được hiểu là yêu cầu bỏ sidebar toàn ứng dụng.

## Đề xuất bố cục

Tên pattern: table-based admin layout / CRUD list view, gồm page header, compact toolbar, data table, status badge, row actions và pagination.

- Tiêu đề trang ngắn, không thêm các cụm mô tả và thẻ thống kê chiếm chỗ ở trang danh sách.
- Một thanh công cụ ngay dưới tiêu đề: nút chính bên trái (Thêm phòng Gym), tìm kiếm bên phải. Bộ lọc trạng thái/vai trò đặt cùng hàng nếu đủ chỗ, hoặc thu gọn vào Bộ lọc trên màn hình nhỏ.
- Một bảng chính, tiêu đề cột có nền nhạt, đường phân cách rõ, khoảng cách dòng vừa đủ đọc. Badge trạng thái nhỏ và nhất quán giữa hai trang.
- Thao tác bằng icon nhỏ ở cột cuối, có nhãn truy cập và tooltip; dùng icon mắt (xem), bút (sửa), thùng rác (xóa) tại Gym. Tên Gym cũng là liên kết mở chi tiết.
- Icon thao tác nằm trong vùng bấm đủ lớn (đề xuất 40px), có focus bàn phím. Không dùng màu hoặc tooltip làm cách duy nhất truyền đạt ý nghĩa.
- Phân trang ở cuối bảng, chỉ hiện nút đổi trang khi có nhiều trang. Loading, lỗi, không có dữ liệu giữ trong cùng vùng danh sách.
- Desktop hiển thị bảng đầy đủ; mobile thanh công cụ xuống dòng, bảng cuộn ngang trong khung, không làm tràn toàn trang.

### Cột dữ liệu

| Trang | Cột chính | Thao tác |
|---|---|---|
| Phòng Gym | Tên phòng tập, địa chỉ, Manager phụ trách, trạng thái | Xem, sửa, xóa |
| Tài khoản | Họ tên, email, vai trò, trạng thái, ngày đăng ký | Xem chi tiết, khóa/mở khóa theo quyền hiện hành |

Giữ cột Manager theo yêu cầu trước, dù ảnh mẫu không có cột này. Số điện thoại, phân công tại Gym và thông tin bổ sung của tài khoản nằm trong vùng chi tiết; không kéo dài mỗi dòng bảng. Không tự thêm tạo/xóa tài khoản hoặc sửa vai trò chỉ vì ảnh mẫu có icon CRUD.

Ảnh có nhãn Bảo trì, nhưng schema hiện tại của Gym chỉ có ACTIVE/INACTIVE. Đợt này giữ Hoạt động/Ngừng hoạt động; không thêm trạng thái database theo hình minh họa.

## Chi tiết Gym

Giữ sidebar Admin; thêm breadcrumb Danh sách Gym → Tên Gym. Dùng thanh điều hướng tab trong vùng nội dung, có thể cuộn ngang trên mobile. Mỗi tab có URL riêng và giữ Gym đang chọn khi tải lại trang.

| Tab | Nội dung xem | Thao tác Admin |
|---|---|---|
| Tổng quan | Thông tin Gym, liên hệ, giờ mở cửa, vị trí, trạng thái | Sửa thông tin/trạng thái qua nút Sửa |
| Nhân sự | Manager, lịch sử phân công, PT và thông tin chuyên môn | Bổ nhiệm/thu hồi Manager tại đây |
| Gói tập & hội viên | Gói tập, hội viên, thanh toán, yêu cầu tư vấn theo nhóm nội dung | Chỉ xem |
| Lịch PT | Đăng ký PT và lịch hẹn | Chỉ xem |
| Cơ sở vật chất | Thiết bị, loại thiết bị, tình trạng và ảnh Gym | Chỉ xem |
| Báo cáo sự cố | Danh sách, nội dung, ảnh, trạng thái và ghi chú xử lý | Chỉ xem |
| Đánh giá | Đánh giá Gym và PT thuộc Gym | Liên kết sang kiểm duyệt, giữ bộ lọc Gym |

Các danh sách dài trong tab có phân trang, lọc khi cần. Chỉ tải dữ liệu của tab đang mở; không tải toàn bộ nghiệp vụ của Gym trong một response. Không lộ password hash, mật khẩu tạm, đường dẫn file nội bộ hoặc thông tin xác thực khi xem đầy đủ thông tin Gym.

## Thứ tự thực hiện

### 1. Chốt hợp đồng đọc và ma trận quyền

Phụ thuộc: không. Phạm vi: tài liệu quyền và route/service liên quan.

- [x] Liệt kê endpoint hiện có cho từng tab; xác định phần thiếu, đặc biệt thiết bị, thanh toán, tư vấn và chi tiết tài khoản.
- [x] Tách quyền đọc Admin/Manager với quyền ghi vận hành Manager. Giữ quyền quản lý Gym/Manager và kiểm duyệt của Admin.
- [x] Ghi rõ API nào cần khôi phục, bổ sung hoặc thu hẹp quyền ghi; kiểm tra tài khoản nhiều vai trò theo phân công thực tế.

Kiểm chứng: mọi mục trong bảng tab có nguồn dữ liệu và quy tắc quyền cụ thể, không suy quyền từ việc ẩn nút.

### 2. Đồng bộ bố cục danh sách Gym

Phụ thuộc: bước 1 cho hợp đồng dữ liệu. Phạm vi: AdminGymsPage, CSS và component thao tác hàng.

- [x] Gom nút Thêm và tìm kiếm vào một toolbar; thu gọn khung lồng nhau.
- [x] Giữ đủ cột Manager, chuyển Xem/Sửa/Xóa thành icon có nhãn; giữ xác nhận xóa và lỗi dữ liệu liên kết.
- [x] Giữ tìm kiếm, lọc, phân trang và bố cục mobile.

Kiểm chứng: browser desktop/mobile, thao tác bằng bàn phím, lỗi xóa 409 không làm mất dòng dữ liệu.

### 3. Đồng bộ bố cục danh sách tài khoản

Phụ thuộc: bước 2 để dùng cùng quy tắc trình bày. Phạm vi: AdminUsersPage, AccountStatusAction, component chi tiết tài khoản và CSS.

- [x] Thay card hiện tại bằng bảng với cột đã đề xuất; giữ tìm kiếm/lọc vai trò/trạng thái.
- [x] Xem thông tin bổ sung trong drawer chi tiết; khóa/mở khóa dùng xác nhận theo chính sách hiện hành.
- [x] Không thêm quyền tạo/xóa tài khoản hay sửa vai trò ngoài yêu cầu.

Kiểm chứng: browser lọc/phân trang, mở/đóng drawer, focus, lỗi cập nhật đồng thời, trạng thái sau khóa/mở khóa.

Checkpoint 1: lint/typecheck, hai danh sách hoạt động; chụp desktop/mobile và đối chiếu ảnh tham chiếu.

### 4. Tạo khung chi tiết Gym và tab Nhân sự

Phụ thuộc: bước 1–2. Phạm vi: routes, shell/tab navigation, trang tổng quan, AdminGymManagers.

- [x] Tách xem/sửa, bổ sung breadcrumb và navigation tab trong nội dung, sidebar giữ nguyên.
- [x] Tổng quan hiển thị đầy đủ trường Gym phù hợp; chuyển phần Manager vào Nhân sự, giữ form bổ nhiệm chỉ mở khi cần.
- [x] Khôi phục đọc danh sách/thông tin PT tại Gym, không đưa lại form vận hành PT cho Admin.

Kiểm chứng: URL tab, refresh, Gym không tồn tại, Gym ngừng hoạt động, bổ nhiệm/thu hồi và phạm vi dữ liệu giữa hai Gym.

### 5. Tab Gói tập & hội viên

Phụ thuộc: bước 1 và 4. Chia thành các lát nhỏ: gói tập; hội viên; thanh toán; tư vấn. Mỗi lát tối đa khoảng 3–5 file, hoàn tất API đọc và UI trước khi chuyển lát kế tiếp.

- [x] Danh sách/chi tiết đọc đúng Gym, kể cả dữ liệu lịch sử hợp lệ.
- [x] Không hiển thị form mua/gia hạn/xử lý thanh toán/tư vấn cho Admin; kiểm tra API ghi tương ứng.
- [x] Có phân trang, trạng thái tải/lỗi/rỗng và thông tin nhận diện người dùng phù hợp.

Kiểm chứng: API integration read-only và cross-Gym, browser dữ liệu có/rỗng/lỗi.

### 6. Tab Lịch PT và Cơ sở vật chất

Phụ thuộc: bước 1 và 4. Chia riêng lát lịch PT, thiết bị và ảnh để giữ thay đổi nhỏ.

- [x] Khôi phục đọc đăng ký/lịch hẹn; không có nút đổi lịch/xác nhận/kết thúc cho Admin.
- [x] Hiển thị thiết bị và loại/tình trạng; bổ sung endpoint đọc nếu chưa có.
- [x] Hiển thị gallery ở chế độ xem, không dùng lại màn hình có upload/sửa/xóa ảnh cho Admin.

Kiểm chứng: API đúng phạm vi, lịch sử, phân trang và browser ở màn hình nhỏ; API ghi bị từ chối với Admin không có quyền vận hành.

### 7. Tab Báo cáo sự cố và Đánh giá

Phụ thuộc: bước 1 và 4. Làm riêng hai lát báo cáo và đánh giá.

- [x] Khôi phục Admin đọc danh sách và ảnh báo cáo; giữ tiếp nhận/giải quyết/từ chối cho Manager phụ trách.
- [x] Hiển thị đánh giá Gym và PT theo Gym; liên kết tới kiểm duyệt với Gym được chọn sẵn.
- [x] Không tạo lại mục báo cáo ở sidebar toàn hệ thống; cập nhật kiểm thử đã chặn toàn bộ quyền đọc Admin ở đợt trước.

Kiểm chứng: Admin đọc được và không ghi được báo cáo, Manager đúng Gym xử lý được, người khác không đọc ảnh; bộ lọc kiểm duyệt nhận đúng Gym.

Checkpoint 2: kiểm tra toàn bộ tab, tài khoản nhiều vai trò, giữ đúng Gym trên URL và API. Không coi ẩn nút là hoàn thành phân quyền.

### 8. Kiểm tra và bàn giao

Phụ thuộc: bước 2–7.

- [x] Lint, typecheck/build; chạy bộ kiểm thử API/UI bị ảnh hưởng, cập nhật kỳ vọng cũ.
- [x] Kiểm tra 375px và desktop, điều hướng bàn phím, tooltip/drawer/dialog, cuộn bảng, nhãn trạng thái và accessibility.
- [x] Lưu ảnh và báo cáo ngắn: hạng mục đã làm, bằng chứng, giới hạn còn lại.

## Rủi ro và hướng xử lý

- Các màn Admin cũ chứa nút vận hành: chỉ tái sử dụng phần đọc sau khi kiểm tra cả UI và API ghi.
- Đọc được toàn bộ thông tin không đồng nghĩa truy vấn mọi bảng một lần: phân trang và tải theo tab.
- Không tạo migrations chỉ để khớp hình vẽ. Xóa Gym có dữ liệu liên kết vẫn bị chặn; ngừng hoạt động là thao tác riêng.
- Tài liệu/kiểm thử ngày 2026-10-14 phản ánh quyết định cũ; phải cập nhật cùng code trong từng bước, không dùng kết quả kiểm thử cũ để xác nhận yêu cầu mới.

## Hợp đồng API triển khai

- `GET /admin/gyms/:gymId/inspection/:resource`: Admin hiện hành, Gym tồn tại; hỗ trợ page/pageSize/search/status, snapshot nhất quán giữa dữ liệu và tổng số.
- Resource cố định: trainers, schedules, social, packages, memberships, payments, consultations, registrations, appointments, equipment, images, reports, gym-reviews, trainer-reviews. Chỉ trả projection đã duyệt; không trả password hoặc đường dẫn lưu ảnh.
- Dữ liệu tài khoản và drawer dùng DTO từ `GET /admin/users` (đã có phone, email, vai trò, trạng thái, phân công, ngày đăng ký); không thêm endpoint lấy tài khoản bằng ID không cần thiết.
- Ảnh báo cáo: `GET /reports/:reportId/image`, ảnh Gym: `GET /gyms/:gymId/management/images/:imageId/file`; kiểm tra quyền đọc Admin hoặc Manager đúng phạm vi.
- Ghi gói tập, ảnh, tiếp nhận/kích hoạt PT và kết thúc đăng ký PT: Manager được phân công; các nghiệp vụ cá nhân PT/Customer giữ quy tắc sở hữu hiện có. Ghi báo cáo: Manager phụ trách. Quản lý thông tin/trạng thái Gym và bổ nhiệm Manager vẫn giữ quyền hiện hành.
- Tài khoản có cả ADMIN và MANAGER chỉ được thao tác vận hành tại Gym có phân công MANAGER ACTIVE; vai trò ADMIN không cấp quyền vận hành toàn hệ thống.


## Kết quả kiểm chứng triển khai ngày 2026-10-15

- Hai danh sách dùng bảng, toolbar gọn và icon thao tác. Drawer tài khoản và dialog khóa/mở khóa hỗ trợ Escape, giữ focus và xử lý lỗi phiên bản dữ liệu.
- Chi tiết Gym có 7 tab với URL riêng. Mỗi nhóm chỉ tải khi được mở; tên, trạng thái và đầy đủ chi tiết được hiển thị bằng nhãn tiếng Việt. URL cũ trainers/packages/memberships/gallery chuyển về tab đọc tương ứng.
- Bổ nhiệm Manager ở Nhân sự; các nghiệp vụ còn lại ở chế độ giám sát. Liên kết sang kiểm duyệt giữ Gym và loại đánh giá.
- Không tạo migration hoặc đổi tập trạng thái Gym. Xóa Gym có dữ liệu liên kết vẫn bị chặn.

Các lệnh kiểm chứng:

| Lệnh | Kết quả |
|---|---|
| `npm run test:admin-dashboard --workspace @multi-gym/web` | 35/35 browser tests qua, gồm desktop/mobile và WCAG AA |
| `npm run test:admin-users --workspace @multi-gym/web` | 4/4 qua; bao gồm đăng nhập thật, khóa/mở khóa và đọc cả 14 nhóm thông tin qua ứng dụng/API thật |
| `npm run test:admin-inspection --workspace @multi-gym/api` | 4 nhóm qua; kiểm tra đủ 14 projection, phân trang, cách ly Gym, tài khoản/role hiện hành và quyền nhiều vai trò |
| `npm run test:packages --workspace @multi-gym/api` | 20 integration cases và 15 full-app HTTP checks qua |
| `npm run test:gallery --workspace @multi-gym/api` | 8 nhóm qua |
| `npm run test:reports --workspace @multi-gym/api` | 9 nhóm qua; Admin xem được nội dung/ảnh nhưng không xử lý được |
| `npm run test:pt-workflow --workspace @multi-gym/api` | 19 nhóm HTTP/DB và kiểm tra migration qua |
| `npm run test:lifecycle --workspace @multi-gym/api` | Các nhóm lifecycle, Gym management/write/discovery và 15 staffing cases qua |
| `npm run lint`, `npm run typecheck`, `npm run build` | Qua |
| `npm run typecheck:tests --workspace @multi-gym/api`, `npm run typecheck:e2e --workspace @multi-gym/web` | Qua |

Ảnh trong `docs/design/admin-workspace/previews/`:
- `table-gyms-1440.png`, `table-gyms-375.png`.
- `table-accounts-1440.png`, `table-accounts-375.png`.
- `table-inspection-1440.png`, `table-inspection-375.png` (dữ liệu giả lập để kiểm tra giao diện).
- `table-live-gym-details.png` (phiên đăng nhập và dữ liệu fixture PostgreSQL của bộ kiểm thử ứng dụng thật).

Giới hạn: kết quả trên xác nhận code và các bộ kiểm thử liên quan; không phải bằng chứng đã phát hành lên môi trường production. Những bộ kiểm thử Admin vận hành cũ không đại diện cho workspace chỉ xem mới và không được tính trong các kết quả trên.

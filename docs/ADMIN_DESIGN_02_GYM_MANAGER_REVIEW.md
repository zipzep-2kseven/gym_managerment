# ADM-DESIGN-02 — Review vai trò, cơ sở và bổ nhiệm Manager

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

Ngày 11/10/2026. Đợt tiếp theo ưu tiên **Admin**: SCR-ADM-003/004/005/006. Đây là prototype HTML độc lập để review G3; không phải giao diện Manager đăng nhập. ADM-DESIGN-02 vẫn IN_PROGRESS, G3 PENDING, ADM-UI-01 chưa bắt đầu.

## 1. Mở bản review

- [Prototype có thể thao tác](design/admin-workspace/index.html#gyms): mở bằng trình duyệt. Có thể chạy `python3 -m http.server 8765 --bind 127.0.0.1 --directory docs` từ root rồi vào `http://127.0.0.1:8765/design/admin-workspace/`.
- [Vai trò desktop](design/admin-workspace/previews/roles-desktop.png), [cơ sở desktop](design/admin-workspace/previews/gyms-desktop.png), [tạo cơ sở desktop](design/admin-workspace/previews/create-desktop.png), [Manager desktop](design/admin-workspace/previews/managers-desktop.png).
- [Thông tin cơ sở mobile](design/admin-workspace/previews/gym-mobile.png), [bổ nhiệm Manager mobile](design/admin-workspace/previews/manager-mobile.png).
- [Bằng chứng kiểm tra](design/admin-workspace/verification.json), chạy lại bằng `node docs/design/admin-workspace/check.mjs`.

Dùng cùng token/sidebar/topbar với [pilot tài khoản](design/admin-pilot/index.html). Hai prototype đã nối điều hướng vai trò, tài khoản, cơ sở và Manager. Các menu Tổng quan/Đánh giá/Báo cáo chưa thiết kế được đánh dấu không khả dụng. Thanh Review G3 là công cụ review, không thuộc giao diện sản phẩm.

Figma giữ trạng thái dở của pilot tài khoản do hạn mức Starter; không có frame Figma mới trong đợt này. Bản HTML và ảnh là đầu ra review chính.

## 2. Luồng và nguồn hiện hành

| Screen / nguồn | Giao diện và thao tác được dựng |
| --- | --- |
| SCR-ADM-003 · GET `/admin/roles` | Bốn role ADMIN/MANAGER/PT/CUSTOMER, description nullable có fallback; chỉ đọc, không CRUD/Guest. |
| SCR-ADM-004 · GET `/admin/gyms` | Tìm tên/địa chỉ khi submit, lọc ACTIVE/INACTIVE, 20 cơ sở/trang, reset trang khi lọc, vào chỉnh sửa/bổ nhiệm. |
| SCR-ADM-005 · POST `/gyms` | Gym và Manager đầu tiên trong một form; tách email liên hệ Gym khỏi email đăng nhập; thành công hiển thị credential mẫu một lần, khóa gửi lặp, link cơ sở vừa tạo. |
| SCR-ADM-005 · PATCH `/gyms/:gymId` | Chỉ field thay đổi, nullable để trống thành null, email chuẩn hóa, tọa độ có giới hạn; trạng thái là thao tác riêng. |
| SCR-ADM-005 · PATCH `/gyms/:gymId/status` | Xác nhận ngừng/kích hoạt; lỗi nghĩa vụ hiển thị số lượng nhóm đang mở, giữ thông tin/lịch sử, không force/cascade. |
| SCR-ADM-006 · GET `/gyms/:gymId/managers` | Chọn Gym trước khi xem; scope nêu tên/trạng thái/ID Gym. Assignment chỉ có User ID/trạng thái/lần bổ nhiệm gần nhất, không bịa tên/email/avatar từ DTO. |
| SCR-ADM-006 · POST `/gyms/:gymId/managers/assign` | Gán tài khoản ACTIVE có role MANAGER chưa quản lý Gym khác; tái kích hoạt giữ ID phân công. |
| SCR-ADM-006 · POST `/admin/managers/provision` | Cấp tài khoản mới và phân công, credential placeholder để bàn giao. Không nhập password/role/status do client tự đặt. |
| SCR-ADM-006 · POST `/gyms/:gymId/managers/:managerId/revoke` | Xác nhận thu hồi phân công ACTIVE; giữ tài khoản/role/lịch sử. Một Gym có một Manager ACTIVE; thu hồi trước khi bổ nhiệm người mới. |

Đối chiếu [Feature §5.3](FEATURE_SPEC.md#53-đặc-tả-chức-năng-admin-hiện-hành--adm-spec-04-11102026-ready_for_review), `apps/web/src/pages/admin/AdminRolesPage.tsx`, `AdminGymsPage.tsx`, `AdminManagersPage.tsx`, `components/gym/GymFields.tsx`, `CreateGymWithManagerForm.tsx`, `StaffForm.tsx`, `services/gym.service.ts`, `types/gym.types.ts`. Thông tin Gym nội bộ hiện được tìm trong danh sách Admin phân trang; prototype không đề xuất endpoint chi tiết mới.

Mô phỏng dùng dữ liệu hư cấu/UUID mẫu/email `example.test`; mật khẩu luôn là `[MẬT KHẨU TẠM MẪU]`. Không gọi API, không lưu credential vào WebStorage. Mẫu gán tài khoản có sẵn: User ID `00000000-0000-4000-8000-000000000202` chưa được phân công, `...201` đang quản lý Gym Mẫu A, `...203` khóa tạm nên bị từ chối.

## 3. Quyết định thiết kế cần review G3

1. Tiếp tục sidebar navy, nội dung trắng/slate; desktop danh sách cơ sở và form hai cột, mobile xếp dọc; không banner/chart trang trí.
2. Tách thông tin Gym và trạng thái; scope Gym luôn xuất hiện ở màn chỉnh sửa/bổ nhiệm. Đổi cơ sở xóa draft, confirmation và credential.
3. Assignment ACTIVE khóa form bổ nhiệm. Người dùng thu hồi rõ ràng trước khi thay Manager; không tự chuyển người cũ hoặc sửa role User.
4. Confirmation inline; hủy trả focus nút mở; pending khóa form/nút/điều hướng. Thành công đưa focus về tiêu đề; drawer trap focus, Escape đóng, resize về desktop bỏ drawer.
5. Credential chỉ xuất hiện sau thành công trong phiên form, có nút “Đã bàn giao, ẩn mật khẩu”. Reload/đổi cơ sở không khôi phục mật khẩu; không có nút reset mật khẩu.
6. Lỗi ghi/xung đột hoặc kết quả chưa rõ khóa gửi lại và yêu cầu tải dữ liệu để kiểm tra. Tình huống unknown giả lập phía dữ liệu đã ghi nhưng chưa nhận phản hồi. Không gửi lại provision để lấy credential.

Thanh review hỗ trợ mặc định/loading/empty/lỗi đọc/mất quyền/xung đột/unknown/Gym còn nghĩa vụ/phân trang. Các tình huống ghi chỉ áp dụng màn có thao tác ghi; roles luôn chỉ đọc. Mất quyền ẩn nội dung và menu; đây là trạng thái thiết kế, không triển khai xác thực.

## 4. Kiểm chứng và giới hạn

Browser checks kiểm tra reflow 375/768/1024/1440, search draft/paging, PATCH changed-only/null, pending, nghĩa vụ và confirmation, credential lifecycle, assign/provision/revoke, recovery, keyboard/drawer, axe WCAG và không có request mạng/lỗi JavaScript. Đợt kiểm tra ngày 11/10/2026: 27/27 checks nhóm này PASS; pilot tài khoản chạy riêng 24/24 PASS sau khi nối menu. Đã xem 6 ảnh desktop/mobile và đối chiếu 422 file production với baseline: không thay đổi. Kết quả mới nhất nằm ở verification JSON.

Đây là kiểm chứng prototype, không phải PASS các AC backend hoặc xác nhận production đã sửa. Không có giao dịch tiền thật; số Payment demo đang mở chỉ minh họa lỗi chặn ngừng Gym hiện hành. Mô phỏng không tái hiện đầy đủ server validation/concurrency, GET danh sách nhiều lượt hoặc xác thực phiên.

## 5. Tiếp theo

Đã dựng 5/15 Screen IDs tính cả SCR-ADM-002; SCR-ADM-005 có cả tạo và chỉnh sửa. Còn 10 IDs: PT roster/tiếp nhận, Membership; sự cố/đánh giá/gói/gallery/PT supervision; dashboard và điểm chọn Gym cho sự cố. Tiếp tục thiết kế các màn Admin theo roadmap, review G3 trước khi chuyển ADM-UI-01. Giao diện riêng cho Manager thực hiện sau Admin.

# ADM-UI-01 — Áp dụng giao diện Admin vào ứng dụng

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

# Tổng quan Admin — bố cục thống kê và doanh thu

Áp dụng mẫu giao diện đã thống nhất: ba thẻ trên một hàng và biểu đồ đường phía dưới. Điện thoại xếp thẻ theo chiều dọc.

| Thành phần | Nội dung |
| --- | --- |
| Tổng phòng Gym | Tất cả Gym, kèm số phòng đang hoạt động; liên kết đến danh sách Gym. |
| Tổng tài khoản | Tất cả tài khoản đăng ký, mọi vai trò/trạng thái; liên kết đến quản lý tài khoản. |
| Doanh thu tháng này | Tổng `payments.amount` có trạng thái `SUCCESS`, theo `paid_at` trong tháng hiện tại. |
| Biểu đồ 7 ngày | Sáu ngày trước và hôm nay; ngày không có doanh thu hiển thị 0. Chọn điểm để xem số tiền, bảng chi tiết thu gọn bên dưới. |

Giờ nghiệp vụ: `Asia/Ho_Chi_Minh`. Loại giao dịch hoàn tiền, thất bại, chờ thanh toán, thiếu `paid_at` hoặc có thời gian thanh toán sau thời điểm thống kê. Tổng tiền giữ kiểu decimal trong PostgreSQL và chuỗi decimal trong API. Chỉ đổi sang số để định dạng/vẽ biểu đồ.

`GET /api/v1/admin/dashboard` trả một ảnh chụp thống kê nhất quán. Kiểm tra tài khoản và vai trò Admin hiện tại từ database, response `no-store`. Giao diện phân biệt đang tải/lỗi/giá trị 0; lỗi làm mới giữ dữ liệu cũ kèm thông báo, lỗi quyền truy cập ẩn toàn bộ dữ liệu.

Giữ bốn mục sidebar đã chốt. Tổng quan có một nút làm mới, không thêm tìm kiếm toàn cục hoặc danh sách Gym trùng chức năng quản lý.

## Kiểm chứng

- API trên PostgreSQL tạm: ranh giới nửa đêm/đầu tháng, decimal, ngày trống, loại hoàn tiền và giao dịch tương lai; quyền Admin hiện tại và no-store.
- Browser: ba thẻ, biểu đồ, bàn phím, lỗi và khôi phục; desktop/mobile, không tràn ngang và kiểm tra axe.
- Live browser với API/PostgreSQL tạm: đối chiếu tổng số với SQL; thêm thanh toán thành công và hoàn tiền, làm mới và đối chiếu doanh thu.
- Lint, typecheck, typecheck e2e, kiểm thử cache và build toàn workspace.

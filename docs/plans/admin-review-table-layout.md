# Chỉnh bố cục kiểm duyệt đánh giá

Yêu cầu: đồng bộ trang kiểm duyệt với bảng Gym/tài khoản; không đổi nghiệp vụ hoặc database.

1. Gom loại, Gym, trạng thái vào toolbar. Gym dùng bộ chọn có tìm kiếm và tải thêm trong dropdown; giữ Gym đã chọn khi tìm kiếm hoặc tải trang khác.
2. Bảng 7 cột: người đánh giá, đối tượng, số sao, nội dung, ngày gửi, trạng thái, thao tác. Nội dung tối đa hai dòng; icon xem và ẩn ở cột cuối.
3. Drawer xem đầy đủ nội dung và lịch sử. Dialog ẩn yêu cầu lý do và xác nhận. Nguyên tắc kiểm duyệt mở riêng khi cần.
4. Giữ cơ chế lỗi/mất phản hồi: giữ lý do, khóa gửi lặp, cho đọc lại trong dialog; không cho sửa lịch sử hoặc khôi phục đánh giá đã ẩn.
5. Kiểm chứng: browser bộ lọc/phân trang/dialog/drawer, thao tác bàn phím, mất phản hồi, quyền truy cập, desktop/mobile/WCAG; API moderation hiện hành, lint/typecheck/build.

## Kết quả triển khai — 2026-10-15

- Bảng 7 cột đồng bộ với Gym/tài khoản, rút gọn nhận xét hai dòng và dùng icon xem/ẩn. Chỉ có hai trạng thái Công khai/Đã ẩn; không có thao tác khôi phục.
- Toolbar gom loại đánh giá, Gym và trạng thái. Bộ chọn Gym có tìm kiếm và tải thêm ngay trong dropdown, giữ nhãn đã chọn khi kết quả tìm thay đổi.
- Drawer hiển thị đầy đủ nội dung và lịch sử kiểm duyệt. Dialog ẩn trích nội dung gốc, giữ lý do khi hủy/mở lại, yêu cầu xác nhận và hỗ trợ bàn phím. Chính sách mở trong dialog riêng.
- Giữ nguyên hook/API phân quyền và cơ chế read-back. Gửi lỗi hoặc mất phản hồi không tự gửi lại; có nút đọc lại ngay trong dialog. Tự chuyển trang sau kết quả ghi không xóa lý do khi danh sách chưa tải lại được.
- Không sửa schema/migrations, không thêm nghiệp vụ xóa/khôi phục đánh giá.

Kiểm chứng:
- Bộ browser kiểm duyệt: dữ liệu giả lập và ứng dụng/API/PostgreSQL thật; kiểm tra bảng, dropdown, drawer, dialog, phân trang, mất phản hồi, gửi lặp, thay đổi tài khoản/quyền và mobile/WCAG AA.
- Bộ browser dashboard/Gym/tài khoản: 35 bài qua, bao gồm liên kết từ tab đánh giá Gym sang kiểm duyệt và tổng số trên dashboard sau khi ẩn.
- API `test:review-moderation`: 6 nhóm qua, gồm quyền hiện hành, đánh giá ít sao, tính bất biến và cập nhật điểm công khai.
- Lint/typecheck/typecheck:e2e/build đã chạy trên source cập nhật.

Ảnh kiểm tra: `docs/design/admin-workspace/previews/review-table-1440.png`, `review-table-375.png`, `review-drawer-1440.png`, `review-hide-1440.png`, `review-picker-1440.png`. Ảnh dùng dữ liệu giả lập; các bài live xác minh luồng ghi và lịch sử với database tạm. Bộ ảnh `review-stress-*` kiểm tra nội dung dài.

Kết quả cuối: `npm run test:review-moderation --workspace @multi-gym/web` qua 38/38 bài; `npm run lint`, `npm run typecheck`, `npm run typecheck:e2e --workspace @multi-gym/web` và `npm run build` đều hoàn tất với exit code 0. Không có thay đổi production/deploy trong lượt này.

# ERD PostgreSQL hiện tại cho dbdiagram.io

Ngày đối chiếu: 14/10/2026.

Mở [multi-gym-current.dbml](multi-gym-current.dbml), copy toàn bộ nội dung và dán vào editor DBML của dbdiagram.io. File thay thế code ERD 15 bảng cũ bằng mô hình 21 bảng hiện đang triển khai.

## Nội dung

- 21 bảng, 189 cột, 36 khóa ngoại, 43 CHECK; kiểu dữ liệu, NULL/default, khóa chính và các index đối chiếu trực tiếp với catalog PostgreSQL theo transaction read-only.
- Giữ tên 15 bảng cũ và thêm `gym_images`, `consultation_requests`, `pt_social_links`, `pt_working_schedules`, `gym_reviews`, `trainer_reviews` từ migration0001.
- Khóa UUID với `gen_random_uuid()`; các cột trạng thái dùng `varchar` + CHECK đúng database, không dùng ENUM PostgreSQL như biểu diễn trong code DBML cũ.
- Giữ khóa ngoại tổ hợp của Payment/Membership/Package và Report/Equipment để biểu diễn đúng phạm vi Gym. Quan hệ một-một đặt bảng cha trước, bảng chứa khóa ngoại sau.
- Bốn unique index có `WHERE` được ghi trong Note của bảng, không khai báo thành unique toàn bảng. Thứ tự DESC của index thường được ghi trong note index; danh sách cột vẫn hiển thị trong indexes.
- 19 trigger được ghi trong Note, kèm tên hàm; phần thân hàm và logic triển khai xem migrations0001–0003. DBML không thay thế chuỗi migrations của dự án.

Các cột khác ERD cũ cũng đã được đồng bộ, gồm độ dài email, TEXT, numeric(14,2), timestamptz(3), nullability/default và các cột consultation mới ở migration0005. Bảng Equipment vẫn được giữ trong database dù giao diện quản lý thiết bị chưa nằm trong phạm vi demo.

## Kiểm chứng

[Artifact kiểm chứng](multi-gym-current.verification.json): parser `@dbml/core`10.3.1, định dạng `dbmlv2`, PASS. Đối chiếu tên bảng với khai báo Drizzle và kiểm từng cột, khóa, constraint, index và FK với catalog database. Parser được cài ở thư mục tạm; không thêm dependency vào ứng dụng. Không thực hiện DDL hoặc thay dữ liệu database.

Cú pháp tham khảo: [DBML chính thức](https://dbml.dbdiagram.io/docs/). CHECK sử dụng cú pháp DBML hiện hành; cần dùng editor/parser hỗ trợ phiên bản hiện hành.

# REV-01 — Đánh giá Gym/PT và public discovery

Ngày: 2026-10-10. Người dùng yêu cầu đề xuất sát thực tế và thực hiện; quyết định Q-15/contract được ghi trước khi triển khai.

## Changed

- Tái sử dụng hai bảng review và `review.service.ts`; thêm review repository/validator/controller/router. Sáu endpoint tại API_SPEC §28: GET/POST review Gym/PT, GET trạng thái/điều kiện của bản thân.
- Customer ACTIVE, đã đổi mật khẩu tạm, có thẻ ACTIVE/EXPIRED đã bắt đầu theo giờ Việt Nam được đánh giá Gym ACTIVE. Đánh giá PT cần Registration ACTIVE/COMPLETED cùng Gym và ít nhất một Appointment COMPLETED với đúng PT; target PT và account phải ACTIVE. Thẻ demo dùng cùng điều kiện. Nhân sự có assignment Manager/PT ACTIVE tại Gym không đánh giá Gym/PT của Gym đó.
- Mỗi User/Gym hoặc User/Gym Trainer một review, tính cả HIDDEN và các lần mua thẻ mới. Rating số nguyên 1–5; comment trim, tùy chọn, tối đa 2.000 ký tự. Không ảnh/sửa/xóa/unhide.
- Public Gym/PT Detail thêm ReviewPanel: tên hiển thị hội viên, rating/ngày/nhận xét, phân trang 10 mục, trung bình/số review VISIBLE. Không có review thì average=null. Không đưa User ID/contact/audit vào projection. Query strict và phân trang giới hạn; target không công khai trả 404.
- Customer thấy điều kiện, form hoặc review chính chủ đã gửi (kể cả HIDDEN, không audit). Pending khóa form, POST không tự retry; lỗi giữ draft và có tải lại. Link đăng nhập giữ trang trở về. Nội dung render bằng React text, không HTML từ người gửi.
- Cập nhật Architecture/Domain/Feature/API/Database/UI/README/Plan. Không package/schema/migration mới. REV-02 moderation UI chưa triển khai.

## Why

Thẻ đã bắt đầu là bằng chứng tối giản về quan hệ hội viên Gym; chưa có check-in nên không chứng minh Customer thực sự tới Gym. Với PT đã có lịch tập, yêu cầu buổi COMPLETED thay vì chỉ đăng ký sẽ sát việc sử dụng dịch vụ hơn. Một review mỗi đối tượng và giữ nội dung giúp tránh spam và giữ lịch sử, trong khi form chỉ cần sao và nhận xét.

## Tests

- `npm run test:reviews -w apps/api`: **8 nhóm PASS** trên database tạm/full migration chain. Guest/read-only; role hiện hành từ DB thay JWT claims; cross-Gym target 404; query/body strict; rating/comment limits; thẻ chưa bắt đầu/CANCELLED không đủ; hai POST đồng thời chỉ một 201 và một 409; replay/renewal không gửi thêm; PT chưa tập hoặc lịch CANCELLED không đủ, COMPLETED đủ; hidden retained, count/average/list không chứa HIDDEN; projection không lộ contact/credential/audit; pagination; expired Membership; demo Payment tạo thẻ đủ điều kiện; staff conflict, role/account/password gates, Gym/PT INACTIVE. DELETE/sửa nội dung bị trigger chặn.
- `npm run test:reviews -w apps/web`: **2/2 PASS**. API/database thật: Customer gửi review Gym/PT → reload không gửi thêm → Guest xem. Browser fixture có thẻ/lịch COMPLETED lịch sử chỉ ở DB tạm, không dùng thời gian chờ để mô phỏng hoàn thành. Pending/409 giữ draft; tải lại thấy review bản thân HIDDEN nhưng public vẫn empty. Không tràn ngang 375/768/1024/1440 px; WebStorage rỗng.
- Hồi quy: `npm run test:gym-ui -w apps/web` **24/24 PASS**; `npm run test:trainer-profile -w apps/web` **3/3 PASS**.
- Baseline DB: `node_modules/.bin/tsx apps/api/tests/database-business.test.ts` **31 checks + 12 staffing + 13 repository + 15 scope + 15 scope integration PASS**. Fixture bổ sung role Customer/buổi COMPLETED để khớp policy mới. Relation consultation chỉ chọn cột thuộc baseline 0001; loại hai cột được thêm ở 0005 khỏi fixture đóng băng, không thay baseline migration.
- API typecheck/tests typecheck/build và Web typecheck/build **PASS**. Web 150 modules; JS 343,59 kB/gzip 98,97 kB. Docker Compose config/API build và `git diff --check` **PASS**. Không tính placeholder lint là lint thật.

## Verification

Đã xem `/tmp/reviews-public.png` và `/tmp/reviews-customer.png`: khu public/rating/ngày/nhận xét và form/lỗi/tải lại hiển thị rõ; responsive đã kiểm tra bằng browser.

API Docker rebuild/recreate thành công; web source bind mount/Vite hiện có, build workspace nhưng không rebuild web Docker image. Smoke chỉ đọc: health 200, public review 200, Guest đọc review riêng 401, module ReviewPanel 200. Trước/sau smoke: 6 migrations, 0 gym_reviews, 0 trainer_reviews; không chạy migration/reset DB hoặc tạo review/lịch thử trong database vận hành.

Thử bằng Customer: mở Gym Detail, mua gói demo nếu chưa có thẻ đã bắt đầu; khu Đánh giá cho chọn sao/nhận xét và gửi. Với PT cần hoàn thành một buổi theo luồng PT hiện có trước. Đăng xuất để đối chiếu review công khai; đăng nhập lại thấy bản đã gửi, không gửi lần hai. Chưa có API/UI Admin hide trong task này; kiểm thử hidden dùng service moderation hiện có trong DB tạm.

## Issues

Không có lỗi chặn trong các kiểm tra trên. Backend chỉ chấp nhận Registration ACTIVE/COMPLETED; Registration CANCELLED không đủ, kể cả có lịch sử tập. Membership CANCELLED cũng không đủ. Không có check-in, ảnh review, phản hồi của Gym/PT, lọc sao, chỉnh sửa hoặc khôi phục review.

Một review được tính theo Gym Trainer assignment ID. Tái kích hoạt cùng assignment giữ review cũ; assignment khác tại Gym khác là đối tượng khác. Dữ liệu legacy trùng không tự sửa/xóa; Customer có bất kỳ review cũ nào không gửi thêm.

Quy tắc một review và yêu cầu buổi COMPLETED thực thi tại API, tuần tự hóa bằng khóa Gym; SQL trực tiếp ngoài API vẫn có trigger baseline 0001 nhưng chưa có unique constraint hoặc guard COMPLETED mới. Không coi đây là DB constraint đã triển khai. Nội dung nhập chưa gửi không lưu cục bộ; tải lại trang mất draft. Docker npm ci vẫn có audit warnings dependency hiện có, không thêm package/chạy audit fix.

## Architecture Impact

None đối với stack/schema/auth. Quyết định Q-15 đã được ghi theo yêu cầu đề xuất và thực hiện của người dùng. Giữ 21 bảng, JWT HttpOnly cookie, Drizzle và TanStack Query; không mở payment thật hoặc moderation UI.

Ghi khóa parent Gym trước account/role/assignment/membership; target trainer đối chiếu Gym, eligibility và duplicate kiểm tra lại trong transaction READ COMMITTED. Ngày của service/trigger thống nhất bằng timezone transaction Asia/Ho_Chi_Minh. Public read dùng snapshot REPEATABLE READ để list/count/average nhất quán trong một response. Không ghi Membership/Registration/Appointment khi tạo review. Errors DB được sanitize; DTO riêng public/self không trả raw row hoặc credentials.

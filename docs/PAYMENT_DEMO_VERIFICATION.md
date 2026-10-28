# Payment demo — nghiệm thu

Ngày: 2026-10-08. Yêu cầu người dùng: tạm dùng mock, bấm thanh toán bằng phương thức nào cũng mô phỏng thành công để demo; chưa tích hợp payment thật.

## Changed

- API: thêm payment validator/repository/service/controller/router; nối 4 endpoint trong apiRouter; config PAYMENT_MODE, CORS Idempotency-Key.
- Web: thêm payment service, CheckoutPage, PaymentHistoryPage/MembershipsPage; route checkout/Customer history/thẻ, CTA từ chi tiết gói, liên kết thẻ trong header.
- Tests: payment-demo.integration.test.ts, payment-demo.spec.ts, Playwright config/scripts; fixture browser thêm Customer. Test package UI đổi expectation từ placeholder sang thông báo demo đúng hành vi mới.
- Config: `.env.example`, API env example và Compose hỗ trợ PAYMENT_MODE. Đã bật `PAYMENT_MODE=demo` trong hai file `.env` local được git-ignore; cần khởi động lại API/Compose để process nhận cấu hình. Không thêm secret vào Git.
- Đồng bộ Architecture/Domain/Project Rules và `.agent/rules/multi-gym.md`, API/Feature/UI/plan/README; đề xuất PLAN-02 tiền thật được đánh dấu chỉ còn tham khảo cho tương lai.

## Why

Demo hoạt động end-to-end với Payment và Membership thật trong DB nhưng không thu tiền hoặc gọi cổng thanh toán. Backend mô phỏng nguồn SUCCESS sau xác thực/validation, lấy amount/duration từ Package và tạo thẻ ngay; không có PENDING chờ bên ngoài nên không cần snapshot column hoặc migration.

## Tests

- `npm run test:database -w apps/api`: PASS toàn baseline/schema/lifecycle/Gym/Package regression và 14 ca Payment demo HTTP/DB.
- `npm run test:payment-demo -w apps/web`: 4/4 PASS; 3 luồng thật qua browser → Express → PostgreSQL (CARD/BANK_TRANSFER/WALLET), 1 ca pending/double-submit/error/responsive.
- `npm run test:package-ui -w apps/web`: 23/23 PASS sau cập nhật CTA demo.
- `npm run test:gym-ui -w apps/web`: 23/23 PASS hồi quy.
- `npm run typecheck`, `npm run typecheck:tests -w apps/api`, `npm run build`: PASS.
- `docker compose config --quiet`, `git diff --check`, whitespace/link checks: PASS. Root lint là placeholder, không dùng làm bằng chứng lint.

HTTP/DB cases kiểm tra Guest401, current roles dù JWT khai ADMIN, disabled503, strict payload/key/query, hidden/wrong-Gym404, atomic SUCCESS/thẻ và giá từ server, replay giữ history sau đổi gói, key collision ownership/input, 5 POST concurrent chỉ một thẻ, mọi method/zero/max decimal, pagination/ownership, account/password/revoke, ngày Việt Nam và rollback sau Payment insert.

Browser thật kiểm tra Guest vào checkout phải login Customer rồi quay lại checkout, body không khai amount/status/user/Gym, CORS gửi key, SUCCESS + thẻ, replay giữ membership_id, đọc history/thẻ và không lưu token vào Web Storage. Responsive ca checkout không overflow ở 375/768/1024/1440; dùng nguyên tokens/focus/reduced-motion của nền tảng hiện tại (Taste dials 5/2/4).

## Verification

- Đã kiểm tra config với NODE_ENV=production/PAYMENT_MODE=demo: demoEnabled=false. Kiểm tra read-only pg_database sau test: 0 DB gym03_browser_* hoặc pkg01_test_* còn lại.
- Chế độ ghi mặc định disabled; chỉ PAYMENT_MODE=demo và NODE_ENV không production bật bộ mô phỏng. Production không phát hành thẻ mock qua endpoint này.
- Role CUSTOMER/account/password đọc lại DB; actor từ HttpOnly-cookie identity. Customer có thể mua Package công khai tại Gym, không cần Manager assignment. Đọc lịch sử chỉ user_id chính chủ; membership list demo flag xác định qua Payment nguồn.
- Gym → account → Package lock order, actor update lock serialize retry; Package share lock giữ giá/thời hạn tới commit. Payment PK và Membership unique payment_id bảo vệ concurrency; Membership insert lỗi rollback Payment.
- Idempotency-Key UUID được normalize; chỉ replay khi owner/Gym/package/method/status khớp. Key mới tạo lần mua demo độc lập. Không tự retry mutation ở client; khi mất response giữ cùng key/method trong form đang mở.
- Price/amount/purchase_price là decimal text từ DB; không round qua floating point. Start_date là ngày xử lý theo Asia/Ho_Chi_Minh; end_date gồm đủ duration_days. DTO/demo prefix phân biệt rõ mô phỏng.
- Không thay schema, tạo/chạy migration vận hành, gọi ngân hàng, SDK, webhook hoặc sửa Package/Payment/Membership lịch sử. Test fixtures dùng DB tạm và cleanup.

## Issues

- Đây là demo, không phải PAY-01/02/03 production đã hoàn thành. Q-01/Q-02/Q-03/Q-08 production và refund/cancel/expiry còn chưa chốt/triển khai. Demo key mới có thể tạo nhiều thẻ độc lập; không suy thành policy production.
- Chưa có expiry scheduler; thẻ demo lưu ACTIVE sau tạo, ngày bắt đầu/kết thúc được lưu đúng. Không dùng phần này làm bằng chứng booking/PT eligibility đã triển khai.
- Client giữ key trong form hiện tại; refresh/mở checkout mới là một lần mua demo mới. Không có cổng thanh toán hoặc tiền thật để đối soát.
- Không tự áp migration 0002 vào DB vận hành. Trạng thái kiểm thử trong DB tạm khác trạng thái phát hành/vận hành.

## Architecture Impact

Ngoại lệ mock đã được người dùng yêu cầu và ghi vào Architecture/Domain/Project Rules. Stack, 21 bảng, schema, auth và Gym scope giữ nguyên. Không triển khai đề xuất snapshot/đổi ERD của PLAN-02 tiền thật.

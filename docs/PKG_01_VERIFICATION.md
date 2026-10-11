# PKG-01 — Nghiệm thu backend Package

Ngày kiểm tra: 2026-10-07.

## Phạm vi thay đổi

Triển khai FEAT-PKG-001–007 bằng validator, repository Drizzle, service, controller và router tại `apps/api/src/{validators,repositories,services,controllers,routes}/package.*.ts`; mount trong `routes/index.ts`. Dùng schema Package và GymScopeService hiện có. Không cài thư viện, tạo bảng, migration hoặc endpoint ngoài catalog. UI chưa thay đổi; task tiếp theo là PKG-02.

| Endpoint (prefix `/api/v1`) | Hành vi |
| --- | --- |
| `GET /gyms/:gymId/packages` | Guest đọc Package/Gym ACTIVE, pagination/search/sort |
| `GET /gyms/:gymId/packages/:packageId` | Projection Package đúng Gym; hidden/missing trả 404 an toàn |
| `GET /gyms/:gymId/management/packages` | Admin/Manager ACTIVE đúng scope; cả ACTIVE/INACTIVE theo filter |
| `POST /gyms/:gymId/packages` | Body allowlist; mặc định ACTIVE; 201 |
| `PATCH /gyms/:gymId/packages/:packageId` | Partial update, không đổi scope/status/identity; 200 |
| `PATCH /gyms/:gymId/packages/:packageId/deactivate` | Ngừng bán; không hủy Membership hoặc sửa Payment |
| `PATCH /gyms/:gymId/packages/:packageId/activate` | Mở bán lại, giữ ID/history |

Contract chi tiết tại [API_SPEC.md §20](API_SPEC.md). price input/output là decimal string theo numeric(14,2), không nhận JSON number/exponent/NaN/Infinity hoặc phần lẻ thứ ba. Chuẩn hóa bằng chuỗi và DB numeric; sort giá dùng numeric. duration_days nguyên dương trong giới hạn PostgreSQL integer; description nhận null. Body/query/route strict Zod; không role/gym_id/quota/force/cascade từ client.

Internal catalog Gym INACTIVE vẫn có thể được quản lý nếu actor còn scope; Gym/Package vẫn bị ẩn public. Ngừng/mở bán Package là policy FEAT-PKG-005/006 đã chốt, không áp dụng điều kiện nghĩa vụ của ngừng Gym/PT cho Package. Payment/Membership API và checkout vẫn phụ thuộc Q riêng.

Bổ sung xử lý `entity.parse.failed` trong middleware lỗi chung: JSON sai cú pháp/scalar trả 400 VALIDATION_ERROR, không ghi log thông báo parser chứa payload. Error responses có no-store. Đây là sửa lỗi được test red/green: scalar trước đó trả 500 và log một phần payload; sau sửa trả 400 và không chứa sentinel trong response/log.

## Kết quả verification

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:packages -w apps/api` (chạy trong test:database) | 20 ca HTTP/database + 13 kiểm tra HTTP qua app thật; 7/7 endpoint Package |
| `PACKAGE_TEST_ORDER=reverse npm run test:packages -w apps/api` | 20 ca theo thứ tự đảo + 13 kiểm tra full-app HTTP |
| `npm run test:database -w apps/api` | Regression baseline 86 kiểm tra, schema 0002 52 ca, GYM-02 49 kiểm tra HTTP/16 endpoint; toàn bộ PKG-01 ở trên |
| `npm run typecheck` | PASS toàn workspace |
| `npm run typecheck:tests -w apps/api` | PASS source và tests API |
| `npm run build` | PASS toàn workspace |
| `git diff --check` | PASS |

Tests: `package-test-fixture.ts`, `package-public.cases.ts`, `package-write.cases.ts`, `package-auth.cases.ts`, `package.integration.test.ts`, `package.acceptance.test.ts`. Script test:packages chạy integration và full-app acceptance; test:database gọi thêm test:packages sau các suite hiện có.

20 ca integration bao gồm public projection, decimal chính xác, count/page cùng filter, tie ordering, search literal, sort numeric, malformed query/UUID/body, hidden/missing/wrong-Gym, visibility, current-role/assignment/account/password gates, fake ADMIN JWT claims, Guest 401 trên 5 endpoint private, Manager A/B, body spoof, price/duration boundaries, nullable clear, giữ identity/timestamps/omitted fields, Payment/Membership history và status repeatable, internal INACTIVE catalog, lỗi DB an toàn, concurrent partial/status updates. Các input lỗi được lặp trong mỗi ca, không đồng nghĩa chỉ có 20 request HTTP.

Ca authorization concurrency quan sát waiter thật qua pg_blocking_pids: transaction giữ assignment đang revoke; request ghi Package phải chờ, rồi bị từ chối 403 sau commit revoke và không sửa giá. Các write giữ share lock Gym → account/role/assignment tới commit, cập nhật Package với gym_id/package_id. Public đọc snapshot repeatable-read read-only; management count/page và quyền cùng snapshot.

Full-app acceptance dùng Express app/router thật, Admin đăng nhập với Argon2 và cookie thật → tạo Gym → tạo Package → đọc public/private → sửa giá → ngừng bán/public 404 → đọc internal INACTIVE → kích hoạt lại. JSON scalar qua app thật trả 400. Không tạo credential/user bằng frontend hoặc fake endpoint.

## Trạng thái triển khai và giới hạn

Tất cả database tests tạo database riêng; migration 0000–0002 chỉ chạy trên database tạm. Harness đóng server/pool và DROP database; kiểm tra catalog sau chạy ghi nhận 0 database `pkg01_test_*`/`pkg01_acceptance_*` còn lại. Không thay dữ liệu hoặc chạy migration vào database vận hành.

Payment/Membership trong test giữ giá lịch sử là fixture SQL/Drizzle, không phải triển khai payment callback hoặc Membership API. Giá Package mới không sửa Payment PENDING đã có; cách chốt giá/thanh toán thuộc Q-01/Q-02. Không có refund, cấp Membership thủ công, quota PT, DELETE Package hoặc UI trong PKG-01.

Không chạy browser E2E vì không sửa frontend; PKG-02 sẽ triển khai UI gói tập và nối CTA. Lint root vẫn placeholder, không báo đã lint. Ghi nhận migration 0002 chưa triển khai vận hành trong báo cáo GYM-02 là công việc deployment riêng; PKG-01 không cập nhật trạng thái deployment đó.

Architecture impact: None. Phạm vi 21 bảng, REST/Drizzle/Zod và JWT HttpOnly cookie giữ nguyên.

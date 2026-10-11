# ADM-01 — Admin quản lý tài khoản

Ngày nghiệm thu: 2026-10-10. Phạm vi: tra cứu tài khoản toàn hệ thống, danh mục role chỉ đọc, khóa tạm/mở lại; không mở quản lý credential hoặc role CRUD.

## Changed

- Backend: `admin-user.validator`, repository/service/controller/routes và mount router trong `routes/index.ts`; GET users/roles, PATCH status. Projection rõ ràng, phân trang/filter/search literal, authorization từ DB, account locks và expected_updated_at.
- Frontend: service `admin-user.service`, `AdminUsersPage`, `AccountStatusAction`, `AdminRolesPage`, route `/admin/users` và `/admin/roles`; nav Admin, layout responsive, pending/error/confirmation.
- `UserService`: injectable DB phục vụ kiểm thử; profile transaction khóa account và đọc lại ACTIVE trước ghi phone/profile. `AuthService.changePassword`: UPDATE chỉ khi ACTIVE và password_hash vẫn đúng bản đã xác minh, chặn thay mật khẩu sau suspension trong thời gian hashing/chờ khóa. Không giữ lock khi Argon2.
- API/browser tests, scripts `test:admin-users`, README, Architecture/Domain/Feature/UI/API và Implementation Plan.

## Why

Dùng khóa tạm cho vấn đề truy cập, tránh lẫn với ngừng Gym/PT hay hủy hợp đồng. Giữ thẻ/lịch/phân công để nhân sự còn hoạt động giải quyết nghĩa vụ đúng luồng. Tất cả Admin được bảo vệ để màn quản lý này không tự khóa Admin hoặc mất người quản trị cuối. Không cung cấp lý do giả khi schema không có nơi lưu; structured operational event actor/target/old/new/time được phát sau commit, không contact/credential và không nhận là audit DB bền vững.

CAS và khóa UUID tăng dần chống hai Admin ghi đè trạng thái. Timestamp đầu vào được chuẩn hóa UTC; server tăng phiên bản tối thiểu 1 ms. Cập nhật hồ sơ/mật khẩu phải tuần tự với suspension, kể cả request đã vượt qua kiểm tra sơ bộ.

## Tests

- `npm run test:admin-users -w apps/api`: **8 nhóm PASS** trên DB tạm/full migrations. Guest và non-Admin bị từ chối kể cả JWT claim ADMIN; safe DTO/no-store; literal wildcard/name/email/search hoa thường; role/status/paging/catalog; strict body/query/params; bảo vệ self/other Admin; missing/stale/same status và offset timestamp; CAS đồng thời một 200, một 409; khóa/mở lại không đổi nghĩa vụ/phân công/role; Manager xử lý lịch khi PT bị khóa; revoked role/suspended actor/password gate; profile/password chờ row lock không thể ghi sau suspension; login blocked, reopen giữ password gate và đổi mật khẩu bình thường.
- `npm run test:admin-users -w apps/web`: **3/3 PASS ở hai lượt chạy cuối liên tiếp**. API/DB/browser thật: Customer bị chặn khỏi Admin; Admin list/filter/search, đọc bốn roles, bảo vệ Admin, hủy rồi xác nhận khóa/mở; cookie phiên Customer hiện hành bị chặn khi khóa và dùng lại sau mở. Mock case: paging, pending chặn duplicate, 409 yêu cầu reload và xác nhận lại. Auth regression trong DB tạm: đăng ký → sửa hồ sơ → đổi mật khẩu → mật khẩu cũ bị từ chối → mật khẩu mới đăng nhập được.
- Responsive **375/768/1024/1440 px** cho list và confirmation/error với email dài; không overflow, WebStorage rỗng.
- `npm run test:pt-workflow -w apps/api`: **17 HTTP/DB cases + 3 migration cases PASS**. `test:reviews`: **8 nhóm PASS**; `test:review-moderation`: **6 nhóm PASS**.
- Workspace typecheck/build, API typecheck tests, Docker Compose config/API image build và `git diff --check`: PASS. Web build: 158 modules, JS 356,60 kB/gzip 101,96 kB. Không tính placeholder lint là lint thật.

## Verification

Đã xem `/tmp/admin-users.png` và `/tmp/admin-users-conflict.png`. List, action, xác nhận, error/reload, paging và chuỗi contact dài hiển thị rõ, không đưa password vào UI.

API Docker dev đã rebuild/recreate; Web dùng source bind mount/Vite hiện có, workspace build đã kiểm chứng. Smoke chỉ đọc: health/public Gyms 200, Guest gọi Admin users/roles 401, module Users/Roles 200. Counts trước/sau giữ **6 migrations, 3 users, 0 suspended users, 0 memberships/registrations/appointments**. Không khóa/mở hay tạo tài khoản trong DB vận hành, không migrate/reset DB.

Thử thủ công: Admin → **Quản lý tài khoản** → tìm Customer/Manager/PT → Khóa tạm → đọc ảnh hưởng → Xác nhận. Dùng cửa sổ riêng kiểm tra người dùng bị khóa; sau đó Mở lại. Kiểm tra Manager/PT vẫn còn phân công, thẻ/lịch còn giữ. Nhân sự còn hoạt động xử lý lịch theo quyền cũ; Admin xem lịch và bổ nhiệm Manager tiếp quản tại luồng riêng, không có quyền sửa lịch mới trong task này.

## Issues

Không có lỗi chặn trong lượt kiểm thử cuối. Các lỗi selector của auth regression đã chỉnh theo nút/thông báo hiện có. Có một lượt browser timeout trước khi trang login render trong thời gian chạy build/dev reload; không tái hiện ở hai lượt chạy cuối liên tiếp, chưa kết luận nguyên nhân. Theo dõi độ ổn định tại QA-02.

JWT chưa có revocation store: token cũ bị chặn khi User không ACTIVE; khi mở lại, token còn hạn có thể dùng lại. Không hứa thu hồi phiên vĩnh viễn. Không thêm lý do/audit table, bulk action, xóa user, reset password, sửa role hoặc tự hủy/dời lịch/hoàn tiền. Khóa Manager không tự đổi người quản lý; Admin cần dùng revoke/assign riêng. Các snapshot đọc bắt đầu trước commit có thể kết thúc với dữ liệu cũ; không thu hồi nội dung đã tải trước đó.

Npm ci Docker vẫn báo audit warnings từ dependencies hiện có; task không cài package hoặc tự audit fix. QA-01/QA-02 toàn hệ thống vẫn chưa hoàn thành bởi các kiểm thử này.

## Architecture Impact

None đối với stack/schema/auth transport. Quyết định ADM-01 được ghi theo yêu cầu đề xuất và triển khai của người dùng. Giữ 21 bảng, Drizzle/PostgreSQL và cookie HttpOnly; account là system scope, Admin toàn hệ thống tường minh. Status chỉ ghi users, không Gym/assignment/duty, không cần Gym lock; phối hợp với luồng Gym qua account lock hiện có. Không thêm schema/migration/package.

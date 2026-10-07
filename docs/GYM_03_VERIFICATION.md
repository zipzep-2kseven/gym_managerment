# GYM-03 — Public Gym/PT và form Manager/Admin

Ngày kiểm tra: 2026-10-07.

## Phạm vi

Giao diện nối 16 endpoint GYM-02 hiện có, giữ nguyên backend business logic, schema và contract. Bổ sung TanStack Query 5 và Tailwind CSS 3 sau khi người dùng xác nhận; Tailwind chỉ nạp utilities để giữ tương thích các form Auth và design tokens hiện có.

| Màn hình | Route và hành vi |
| --- | --- |
| Public directory | `/`, `/gyms`: search, sort, phân trang lấy tổng từ envelope API, logo/địa chỉ/điện thoại |
| Public Gym | `/gyms/:gymId`: các field liên hệ/vị trí/giờ mở cửa, hai CTA Package/Consultation và điều hướng PT |
| Public PT | `/gyms/:gymId/trainers`, `/gyms/:gymId/trainers/:trainerId`: profile giới hạn field, chuyên môn, kinh nghiệm, bio, availability, social links và working schedule; không bảng giá/quota/lịch hẹn riêng |
| Manager Gym | `/manager/gym`: Gym từ phân công `/auth/me`, PATCH field thay đổi, nullable clear, giữ thông báo thành công qua refetch |
| Manager PT | `/manager/trainers`, `/manager/trainers/assign`: roster nội bộ ACTIVE/INACTIVE, filter/search/page, gán User hoặc provision tài khoản, thay status có xác nhận |
| Admin Gym | `/admin/gyms`, `/admin/gyms/create`, `/admin/gyms/:gymId`: danh sách nội bộ, tạo/sửa và status; mở lại Gym INACTIVE sau refresh |
| Admin Manager | `/admin/managers`: chọn Gym từ danh sách nội bộ phân trang, provision/assign/list/revoke; thay Gym xóa form và credential cũ |

Các file chính: `apps/web/src/pages/gym/`, `components/gym/`, `components/guards/RequireRole.tsx`, `GymScopeGuard.tsx`, `services/gym.service.ts`, `hooks/useGym.ts`, `types/gym.types.ts`, `layouts/GymLayout.tsx`, `gym.css`; cập nhật App, routes, API client và AuthContext. Có hai cấu hình Playwright riêng cùng API fixture cho kiểm thử browser thật.

## Kiểm thử

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:gym-ui -w apps/web` | 23/23 ca Chromium với API mock |
| `npm run test:gym-live -w apps/web` | 2/2 luồng Chromium với Express/PostgreSQL thật, cookie HttpOnly thật và database tạm áp dụng migration 0000–0002 |
| `npm run typecheck` | PASS toàn workspace |
| `npm run typecheck:tests -w apps/api` | PASS source/tests, gồm browser fixture |
| `npm run build` | PASS toàn workspace |
| `git diff --check` | PASS |

Mock suite kiểm tra projection public (không render User/contact riêng dù fixture có field dư), pagination envelope, loading/empty/network error/retry, 404/403, Guest/Customer/PT/Manager bị chặn Admin, password gate, thiếu phân công, revoked scope, PATCH allowlist và null, tọa độ sai, chống submit lặp, INACTIVE roster, status conflict 409 có số nghĩa vụ, PT assign/provision, credential và đổi Gym. Kiểm tra overflow/focus bằng bàn phím trên 375/768/1024/1440px; chụp và xem hình desktop/mobile. CTA trắng trên đỏ có contrast 6.47:1; chữ chính 17.85:1 và chữ phụ 7.24:1 trên nền tương ứng. Không coi những kiểm tra này là chứng nhận a11y toàn ứng dụng.

Live suite dùng app/router thật: Guest xem Gym/PT; Manager đăng nhập, sửa Gym và thấy thông báo lưu, provision PT, ngừng/kích hoạt PT; Admin tạo Gym, ngừng/kích hoạt, đọc Gym INACTIVE sau reload, provision/revoke Manager; Manager ghi Gym khác bị backend trả 403. Mỗi lần chạy tạo database `gym03_browser_*` riêng; fixture đóng pool/server và DROP database khi kết thúc. Kiểm tra catalog ghi nhận 0 database browser fixture còn lại. Không chạy migration hoặc thay dữ liệu database vận hành.

Ca thông báo lưu đã được xác minh red/green: PATCH thật trả 200 nhưng thông báo biến mất khi form key đổi theo `updated_at`; giữ form theo identity Gym và snapshot chỉnh sửa ổn định sửa lỗi, rồi chạy lại cả hai suite. PATCH tiếp tục chỉ gửi field người dùng thay đổi để bảo toàn cập nhật độc lập của người khác.

Không chạy lại toàn bộ integration GYM-02 hoặc suite Auth legacy có fixture trực tiếp trên database vận hành; source/backend không đổi. Lint root là placeholder, không báo đã lint.

## Security và giới hạn

- RequireAuth giữ password/account gate hiện có; thêm RequireRole và GymScopeGuard cho UX. Backend tiếp tục xác minh role/assignment/scope trên từng request. Manager không lấy Gym scope từ query string hoặc form.
- Server state dùng Query; private key có actor và Gym. Login/register/logout xóa cache. Mutation không tự retry, không giữ thao tác chờ offline; form disable trong lúc gửi. Error query không render dữ liệu cũ. Status có xác nhận inline và lỗi 409, không force/cascade.
- Credential chỉ hiển thị trong mounted form sau provision thành công, có nút ẩn; mutation cache được reset, `gcTime=0`, không Web Storage/persist/log. Live test tắt trace/screenshot/video để tránh lưu mật khẩu tạm vào artifact.
- Không có private GET Gym detail trong contract. Admin tìm Gym bằng các trang `GET /admin/gyms` (100/trang), hỗ trợ INACTIVE nhưng số request tăng theo vị trí Gym. Manager khởi tạo form từ public detail ACTIVE; Gym không còn public trả không khả dụng. Không thêm endpoint riêng để né contract.
- Package, gallery, consultation, review và upload thuộc task riêng, API chưa có. Hai CTA vẫn điều hướng đúng khu vực nhưng destination thông báo chưa triển khai; không giả lập checkout, gửi tư vấn hoặc thành công.
- Theo báo cáo GYM-02, migration 0002 còn cần áp dụng vào database vận hành trước khi sử dụng lifecycle Q-08/Q-13. GYM-03 không thực hiện deployment/migration này.
- `npm audit --omit=dev` tại lần kiểm tra ghi nhận 2 moderate ở React Router đã có; không có lỗ hổng trong TanStack Query mới. Không tự nâng cấp dependency ngoài phạm vi.

Architecture impact: None. Không thêm bảng, API hoặc cơ chế auth mới.

# PT workflow — verification 2026-10-09

## Changed

- Chốt PLAN-03 theo phê duyệt của người dùng: Q-04/Q-06/Q-07, availability trong Q-16; đồng bộ Architecture/Domain/Feature/API/UI/Implementation Plan/Database Spec/README.
- Backend: `pt-workflow.validator.ts`, repository, policy/service, controller/router; mount trong routes/index. 13 endpoints: availability; Registration create/list mine/list Gym/cancel; Appointment create/list mine/list Gym/confirm/reschedule/cancel/complete; list Membership của Gym cho form Manager (FEAT-MEM-003 đã có catalog).
- Migration Drizzle `0003_pt_workflow.sql`, snapshot/journal; unique ACTIVE Registration/thẻ, preflight legacy overlap, guards history/participant identity/overlap. Rollback riêng không sửa/xóa domain rows. Giữ nguyên 0000–0002.
- Web: pt types/service/forms, RegisterPtPage/PtWorkspacePage, route guards, navigation/CTA từ thẻ, Manager/PT availability. Manager chọn thẻ bằng tên hội viên/gói/ngày; không cần nhập UUID. Sửa public PT availability và weekday để khớp enum/contract hiện hành.
- Tests: PT HTTP/DB, migration, E2E thật và mock pending/conflict; script test:pt-workflow ở API/web. Frozen lifecycle suite cố định chain 0000–0002 vì có rollback riêng 0002; các suite Package/Payment/PT/browser vẫn migrate toàn bộ chain. Fixture Gym UI cũ sửa BUSY/day_of_week số thành ALMOST_FULL/MONDAY đúng contract, giữ các assertion hành vi.
- Service đăng ký PT 0001 được đánh dấu legacy cho frozen baseline test, không còn singleton runtime; router mới chỉ dùng service policy được duyệt.

## Why

Hoàn thiện luồng thẻ hội viên → PT → lịch tập sau khi hai bên thống nhất, bao gồm thẻ demo. Tránh đăng ký mới cho PT ngừng nhận học viên; một PT phụ trách/thẻ; không ghi đè quan hệ lịch sử khi đổi PT; chống chồng lịch cả người học/người dạy qua nhiều thẻ/Gym và hai role.

## Tests

- `npm run test:database -w apps/api`: PASS, exit 0. Baseline 31 + staffing 12 + repository 13 + scope 15 + scope integration 15; current Gym/lifecycle suites 52; GYM-02 acceptance 49 HTTP; Package 20 + 13; Payment demo 14; PT workflow 17 nhóm HTTP/DB và 3 ca migration.
- `npm run test:pt-workflow -w apps/api`: PASS sau thay validator pagination string strict. Bao phủ Guest, current DB roles/account/password, ownership, Manager Gym A/B, thẻ demo/expired/future, PT role revoked, availability, một đăng ký đồng thời, PENDING/CONFIRMED overlap, adjacent intervals, ISO timezone/time/card range, confirm/reschedule/cancel/complete/retry/history. Có real DB lock waiter cross-Gym và dual-role overlap. DB guard từ chối sửa identity/history, overlap và ghi với repeatable-read snapshot.
- Migration: rollback giữ rows; legacy ACTIVE trùng thẻ từ chối; legacy overlap từ chối atomically, không reconcile hoặc xóa rows. Fresh-chain/repeat migration qua harness và baseline suites.
- `npm run test:pt-workflow -w apps/web`: 2/2 PASS Chromium. Một luồng thật với cookie/API/Postgres DB tạm: PT mở nhận → Customer mua thẻ demo/đăng ký/đặt → PT confirm/dời → Manager xử lý conflict lịch mở/hủy/kết thúc/tạo hộ từ selector → Admin đọc history. Một ca mock pending/double-submit và 409 conflict. Giờ UI Việt Nam, Web Storage rỗng.
- `npm run test:payment-demo -w apps/web`: 4/4 PASS; `test:package-ui`: 23/23 PASS; `test:gym-ui`: 23/23 PASS.
- Root typecheck/build và API typecheck:tests: PASS. Không gọi root lint placeholder là lint thực.
- `git diff --check`, links/local file inventory và whitespace: PASS. Read-only pg_database kiểm tra các DB tạm của Gym/Package/browser: remaining 0.

## Verification

- Route authentication cookie trước controller; Zod strict params/body/query (reject arrays/duplicate pagination); current DB role/assignment/account/password gate trong service. Customer không tạo bằng thẻ người khác, PT chỉ được giao, Manager đúng Gym; Admin đọc/cancel Registration theo catalog và không tự đặt/confirm lịch.
- Truy vấn scoped bằng Gym qua Membership/Gym Trainer hoặc ownership; global overlap chỉ dùng nội bộ, không trả lịch/Gym khác. DTO explicit, không credentials/email/phone/private profile. Cache-Control no-store.
- Gym → sorted actor/participant User → Membership locks, read committed writes và đọc lại dữ liệu sau chờ. Khóa Gym phối hợp shutdown; user locks phối hợp cross-Gym/dual-role; database guard bảo vệ direct SQL overlap ở READ COMMITTED. SQL sai thứ tự có thể bị deadlock abort, không bỏ qua policy.
- Toàn bộ khoảng lịch trong ngày thẻ theo Asia/Ho_Chi_Minh, end là mốc loại trừ. Current Customer/PT target account/role được kiểm tra cho nghĩa vụ mới; không bắt target còn role hoặc thẻ còn hạn để Manager xử lý nghĩa vụ cũ.
- Taste design read: quản lý lịch tập/hội viên, giữ navy/red/white tokens, dials 5/2/4; loading/error/empty/conflict, mutation pending disabled/retry false, refresh danh sách. Đã kiểm tra responsive 375/768/1024/1440 cho danh sách và form; xem ảnh `/tmp/pt-workflow-375.png`, `-1440.png`, `-form.png`. Labels/focus theo controls/styles hiện có. Không tạo lịch tự động từ Working Schedule.

## Issues

- Đã nâng cấp database Docker development đang dùng và restart API/web ngày 2026-10-09 theo yêu cầu tiếp theo của người dùng; xem phần triển khai bên dưới. Môi trường khác vẫn cần migration. Migration từ chối legacy trùng; không tự ngừng/xóa/sửa dữ liệu để nâng cấp.
- Giao diện lịch dạng danh sách và form; calendar lưới chưa thuộc phần triển khai này. Working Schedule hiển thị tham khảo, ghi lịch làm việc/social/profile vẫn chờ policy riêng.
- PENDING giữ chỗ tới khi được xử lý, không auto-timeout/scheduler. Lịch mở quá giờ cần PT/Manager xử lý thủ công. Chưa thêm NO_SHOW/phạt hủy/refund/quota/PT payment.
- POST Appointment chưa có replay key; lặp cùng giờ đang mở trả 409 overlap. UI không tự retry, khóa submit và có Làm mới danh sách; lỗi mạng invalidates dữ liệu PT để phát hiện request có thể đã commit. POST Registration lặp trả 409 ACTIVE_REGISTRATION_EXISTS.
- Q-08 Customer production và payment thật vẫn OPEN; một ACTIVE Registration/thẻ không chốt giới hạn thẻ/Gym. Tests complete/expiry dùng clock injection ở API; browser thật kiểm tra lịch tương lai và hủy/đổi, không giả lập buổi tập đã diễn ra.

## Architecture Impact

Quyết định nghiệp vụ đã được người dùng duyệt 2026-10-09 và ghi vào Architecture/Domain/PLAN-03 §9. Giữ stack/21 bảng/các cột/enum; không package mới, gateway, quota hoặc entity ngoài scope. Index/trigger mới trong migration riêng để thực thi policy. Không cần thêm phê duyệt cho các quyết định đã được duyệt trong phiên.

## Triển khai Docker development — 2026-10-09

### Changed

- Database thực tế trước triển khai chỉ có migration 0000/0001; áp dụng thành công 0002_gym_lifecycle và 0003_pt_workflow bằng `docker compose run --rm --no-deps api npm run db:migrate -w apps/api`.
- Build lại images API/web, tạm dừng hai dịch vụ để backup/migrate rồi recreate/start. PostgreSQL và persistent volume giữ nguyên. API đang NODE_ENV=development, PAYMENT_MODE=demo.
- Backup custom-format tại `/tmp/gym-deploy-20261009-bpfqCS/database.dump`, thư mục 0700/file 0600. Archive được kiểm tra bằng pg_restore --list; không ghi dữ liệu backup vào Git.

### Why

Người dùng yêu cầu áp dụng migration và khởi động lại để chức năng đã triển khai hoạt động trên môi trường đang dùng.

### Tests

- Preflight: 0 thẻ có Registration ACTIVE trùng, 0 lịch mở chồng người, 0 PT có nhiều assignment ACTIVE, 0 Gym INACTIVE có nghĩa vụ mở theo kiểm tra ban đầu. Migration tự kiểm tra các điều kiện còn lại và thành công.
- `docker compose config --quiet`, build api/web, db:migrate, up: exit 0. Journal thực tế có 4 entries; index pt_registrations_active_membership_key và guard_pt_overlap() tồn tại.
- API /health 200; web / 200; API/web Up, PostgreSQL healthy. 13 endpoint PT/Membership mới trả 401 cho Guest, chứng minh router đã được triển khai và có authentication.
- Chromium trên http://localhost:3000 với tài khoản Admin đã có: login PASS, auth/me sau reload 200, Admin Gym UI PASS, Registration/Appointment read 200, Membership read 200; không browser runtime error. Đăng xuất cuối kiểm tra. Không tạo Customer/Payment/Registration/Appointment thử nghiệm trong database đang dùng.

### Verification

Backup trước migration, API/web dừng trong lúc migrate. Không tự reconcile legacy. Cookie đăng nhập HttpOnly/SameSite, session tiếp tục hoạt động sau reload. Giao diện và read APIs mới dùng database đã migrate; luồng ghi đa actor được kiểm thử trước đó trong DB tạm.

### Issues

Không còn việc migration/restart tồn đọng trên môi trường Docker này. Chưa triển khai môi trường production, không bật payment thật hoặc thay policy còn mở.

### Architecture Impact

None — triển khai các migration và code đã duyệt, giữ 21 bảng/stack/config development hiện có.

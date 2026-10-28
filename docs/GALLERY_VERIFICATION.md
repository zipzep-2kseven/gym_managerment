# GIM-01 — Gallery demo Verification

**Cập nhật R21 — 12/10/2026:** màn Admin SCR-ADM-014 đã tách khỏi GalleryPage legacy, có liên khóa ghi, readback/snapshot/receipt, inline confirm/focus và private bytes kiểm phiên. [Phạm vi và kiểm chứng Admin mới](ADMIN_GALLERY_VERIFICATION.md). Báo cáo dưới đây là lịch sử GIM-01; Manager/Public và backend giữ contract hiện hành.

Ngày: 2026-10-10. Người dùng duyệt toàn bộ phương án gallery tối giản: Manager đúng Gym/Admin, public ACTIVE-only, volume riêng, giới hạn 10 ảnh/5 MB, chú thích và Lên/Xuống.

## Changed

- Tái sử dụng gym_images; không migration/table/column/package mới. Backend gallery repository/service/validator/router và image store, 8 endpoint theo API_SPEC §26. Gallery store tái sử dụng kiểm tra/chế độ file của image store hiện có, loại metadata độc lập trước lưu và cleanup có log an toàn khi lỗi.
- Public Gym Detail thêm khu Không gian phòng tập: ảnh đầu đại diện gallery, các ảnh còn lại theo thứ tự, chú thích, loading/error/retry; logo riêng.
- `/manager/gallery` từ Quản lý Gym → Ảnh phòng Gym; `/admin/gyms/:gymId/gallery` từ Admin sửa Gym → Ảnh phòng Gym. Một ảnh/lần, preview, chú thích mới/chỉnh sửa, Lên/Xuống, xóa xác nhận, pending/validation/network errors và làm mới. Refresh session khi mutation trả 401/403.
- Tách photo-upload.ts để report/gallery dùng chung browser decode/resize/re-encode; giữ export readReportPhoto tương thích. Đã sửa validator base64 gallery/report sau khi kiểm thử phát hiện regex cũ tràn ngăn xếp trên payload lớn; regex tuyến tính và canonical validation trong store vẫn chặn dữ liệu sai.
- Docker có GALLERY_UPLOAD_DIR `/app/data/gallery-images` và volume `multi_gym_gallery_images`, riêng report volume private. Cập nhật env examples, gitignore, README và Architecture/Domain/Feature/API/Database/UI/Plan. Browser fixture dùng thư mục gallery tạm riêng; cleanup theo fixture.

## Why

Khách cần hình dung không gian, khu tập và tiện ích trước khi đăng ký. Màn quản lý ngắn, không phải vận hành album hoặc trình chỉnh sửa ảnh. Cách lưu và quyền public/private được tách để ảnh báo cáo sự cố không trở thành ảnh công khai.

## Tests

- `npm run test:gallery -w apps/api`: **8 nhóm PASS** trên database tạm/full migration chain. Guest ACTIVE-only; real DB role/assignment thay JWT claims; Manager khác Gym/PT/Customer bị chặn; DTO không lộ storage key; public/private bytes/no-store; strict allowlist/MIME/signature/oversize/caption; PNG EXIF/text và JPEG metadata cả giữa scans bị loại; stale caption/reorder; Gym INACTIVE giữ dữ liệu nhưng public 404; delete row/file và URL cũ 404; concurrent vị trí thứ 10 chỉ một commit, quota/file count 10; revoke và production upload disabled.
- `npm run test:gallery -w apps/web`: **2/2 PASS**. Browser/API/database thật: Manager thêm 2 ảnh → sửa caption/đổi thứ tự → Guest xem bytes giải mã thực sự → Admin cancel/confirm xóa. Ảnh đầu vào 2000 px được thu nhỏ thành 1600 px trước upload và public naturalWidth=1600. Public/management không tràn ngang tại 375/768/1024/1440. SVG bị chặn, pending không gửi lặp, 409 giữ ảnh/chú thích; WebStorage rỗng.
- Report regression: `npm run test:reports -w apps/api`: **8 nhóm PASS**, bao gồm ảnh vượt 5 MiB không gây 500/tràn stack. `npm run test:reports -w apps/web`: **3/3 PASS**, sau tách photo-upload và cập nhật parser.
- `npm run test:gym-ui -w apps/web`: **24/24 PASS**. Mock bổ sung empty gallery endpoint cho contract mới, các kiểm tra Gym/Manager/provisioning/guards giữ nguyên.
- API typecheck/build/typecheck tests: **PASS**; Web typecheck/build: **PASS**, 143 modules, JS 330.63 kB/gzip 95.66 kB. `git diff --check` và Docker Compose config: **PASS**. Không tính placeholder lint là lint thật.

## Verification

Đã xem `/tmp/gallery-public.png` và `/tmp/gallery-manager.png`: ảnh đại diện/gallery/chú thích hiển thị, form upload và Lên/Xuống/xóa rõ ràng. Tests ghi vào database tạm và file tạm; không thêm ảnh test vào database vận hành.

Đã backup database trước recreate API tại `/tmp/gym-gallery-20261010-im6di0nc/database.dump` (92.830 bytes), pg_restore --list thành công; thư mục 0700/archive 0600. Build API Docker và recreate API với volume `multi_gym_gallery_images` → `/app/data/gallery-images` thành công. Không cần migration/reset DB; journal giữ 6 migrations, gym_images vận hành vẫn 0 rows. Volume report vẫn riêng. Web source bind mount/Vite hiện hành; đã build web workspace, không rebuild web Docker image.

Smoke trên localhost chỉ đọc: health 200, gallery public 200, Admin đăng nhập và mở gallery nội bộ 200; 0 runtime errors, 0 gallery writes; đã logout. Credential lấy từ README cho smoke, không in/lưu vào report.

## Issues

Không có lỗi chặn trong các kiểm tra trên. Đây là storage filesystem cho demo; production upload disabled cho đến khi chọn provider/storage. Backup/restore cần DB và volume ảnh. Filesystem và DB không nguyên tử chung: cleanup lỗi hoặc crash có thể để lại file mồ côi, chưa có đối soát tự động. Không có row thì endpoint không đọc file mồ côi.

POST chưa idempotency; UI khóa pending, không tự retry và hướng dẫn làm mới khi mất mạng. UI thu nhỏ/re-encode; API trực tiếp kiểm tra kích thước và loại metadata nhưng không decode/thu nhỏ ảnh đầy đủ phía server. Kiểm tra chữ ký/cấu trúc/dimensions không thay thế malware scanner hoặc image decoder đầy đủ. Không thu hồi ảnh đã được khách tải trước khi Gym ngừng; các request public mới kiểm tra trạng thái và trả 404.

Giữ dữ liệu/URL legacy trong DB, không tự fetch/redirect URL ngoài filesystem gallery; cần xử lý riêng nếu có ảnh legacy. Môi trường Docker được kiểm tra chưa có ảnh legacy. Không album/video/crop/360/versioning/drag-drop, không thay logo. Docker npm ci vẫn thông báo audit warnings của dependency hiện có; task không thêm package hoặc chạy audit fix.

## Architecture Impact

None đối với stack/schema/auth: giữ 21 bảng, Drizzle/PostgreSQL/REST và TanStack Query, không package mới. Quyết định quyền/storage demo/giới hạn đã được người dùng duyệt và ghi trong Architecture/Domain. Q-10/Q-19 gallery demo đã chốt; storage production còn OPEN, không tự chọn provider.

Mọi write lấy Gym từ route và quyền hiện hành từ DB, khóa parent Gym trước account/assignment, quota recheck trong transaction ghi. Reorder expected IDs phải đúng toàn bộ thứ tự hiện tại, caption expected timestamp tránh ghi đè stale. Queries SELECT/UPDATE/DELETE ảnh có gym_id; server sinh UUID filename, không nhận path/URL client. File permission 0600/directory 0700; không public static. Public bytes kiểm tra Gym ACTIVE; private bytes kiểm tra Admin hoặc Manager ACTIVE đúng Gym, CORS credentials/no-store/nosniff. Report ảnh vẫn qua endpoint riêng có ownership/scope và volume riêng.

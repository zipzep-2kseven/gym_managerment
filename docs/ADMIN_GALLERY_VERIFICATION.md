# R21 — Gallery Gym cho Admin

Triển khai: 12/10/2026; kiểm chứng lại và chốt báo cáo: 14/10/2026. Phạm vi: SCR-ADM-014 `/admin/gyms/:gymId/gallery`, FEAT-GIM-002, P-ADM-18 và REQ/AC/TC-ADM-BASE-15–19. ADM-UI-01 vẫn IN_PROGRESS; tiếp theo hoàn thiện/nghiệm thu R22 giám sát PT, sau đó QA tổng.

## Changed

- [Màn Admin riêng](../apps/web/src/pages/gallery/AdminGalleryPage.tsx) dùng nền tảng Admin, context Gym và quota N/10. Gym INACTIVE vẫn quản trị nội bộ. Ảnh đầu đại diện gallery; logo riêng, public ACTIVE-only. Grid hai cột desktop, một cột mobile; các nút Lên/Xuống có trạng thái biên và khôi phục focus theo ảnh. Các thành phần upload, dòng ảnh, editor, xác nhận xóa và recovery được tách riêng. Manager/Public giữ màn GIM-01.
- [Hook điều phối](../apps/web/src/hooks/useAdminGallery.ts) dùng query theo actor/Gym, GET có AbortSignal và một chốt ghi cho upload/caption/order/delete. Chuyển Gym/actor gỡ bản nháp, lỗi và receipt; phản hồi ghi trễ không hiện ở phạm vi mới. Dữ liệu cached lỗi thường vẫn hiển thị cùng cảnh báo, giữ bản nháp nhưng khóa ghi. Lỗi401/403 từ list, mutation hoặc ảnh private gỡ dữ liệu/form và kiểm lại phiên.
- Upload dùng `readGymPhoto`: JPEG/PNG≤5 MiB,≤20 megapixel, thu nhỏ cạnh dài≤1600 px và re-encode JPEG. Đọc ảnh cũng khóa các mutation khác; có thể hủy, kết quả đọc trễ bị bỏ qua. Tên file đang chọn khớp preview, chỉ reset khi bỏ ảnh hoặc nhận upload201. POST chỉ image/caption trim, không gửi tên file/URL/order/Gym/actor. Quota10 lấy từ danh sách và tiếp tục do transaction server quyết định; form luôn giữ ảnh đã chọn khi upload bị quota từ chối.
- Caption giữ bản nháp cùng snapshot lúc mở, kể cả khi list/context Gym refetch lỗi. PATCH gửi string trim, rỗng→server lưu null và `expected_updated_at` gốc. Sau409, đọc lại và chọn **Dùng dữ liệu vừa đọc** mới thay timestamp; bản nháp không bị ghi đè. Nếu ảnh đã mất thì đóng editor. Reorder gửi đủ hai mảng ID nguyên trạng và thứ tự mới; sau conflict không tự replay thứ tự cũ.
- Xóa dùng vùng xác nhận inline, mô tả đúng ảnh/hệ quả cover; Hủy/Escape không ghi, focus trả về opener hoặc heading nếu ảnh đã bị xóa. DELETE không body. Receipt chỉ có sau phản hồi thành công hợp lệ, giữ qua GET lỗi. Không suy việc row vắng sau GET là bằng chứng yêu cầu của mình thành công.
- Kết quả ghi chưa rõ bị khóa đến khi đọc lại thành công và xác nhận dùng snapshot. Upload mất phản hồi không có idempotency/identity proof: phải xem gallery và đánh dấu đã kiểm tra trước khi đóng; ảnh/chú thích của lần gửi cũ bị bỏ, cần chọn lại để tạo ý định mới. Upload409 quota giữ ảnh để tiếp tục sau khi Admin chủ động xóa ảnh khác. Các từ chối400/413/503 giữ input để sửa, không tự retry.
- [Ảnh private](../apps/web/src/pages/gallery/AdminGalleryPhoto.tsx) qua service đọc Blob có credentials, no-store và AbortSignal; kiểm MIME, object URL được thu hồi khi thay ảnh/unmount. Lỗi file404/network/decode có fallback và retry ảnh riêng; không ngăn sửa chú thích/sắp xếp/xóa. Lỗi401/403 gỡ toàn bộ gallery trước kiểm phiên. List/response được kiểm tra scope và DTO tối thiểu trước hiển thị hoặc báo thành công; không dùng file URL public thay thế.

## Why

Gallery Admin trước R21 dùng chung màn Manager, upload có mutation riêng với caption/order/delete, native confirm và editor key theo timestamp. Luồng lỗi chưa ép đọc lại trước gửi tiếp; private `<img>` chỉ có fallback chung, không phân biệt mất quyền. R21 xử lý ADM-BASE-GAP-04 và phần Gallery của GAP-01/05/06 bằng điều phối chung, snapshot rõ ràng và coverage Admin riêng.

## Tests

| REQ / AC / TC | Bằng chứng kiểm thử |
| --- | --- |
| ADM-BASE-15 | Admin Gym INACTIVE/list no-query/DTO allowlist, nullable caption/cover; private bytes thật1600px. Mock lỗi bytes401/403 kiểm phiên,404 retry riêng, decode lỗi; read401/403/404/500, wrong-Gym DTO/UUID, actor/Gym reset và GET trễ. |
| ADM-BASE-16 | Admin upload201 bằng UI/API thật; preview1600px/JPEG và body strict. API thật hai yêu cầu tranh slot cuối→201/409, UI quota409→đọc đủ10→giữ draft→xóa chủ động→upload mới. Mock type/size/corrupt/20MP, conversion cancel/pending, upload pending/synthetic duplicate,400/413/503, lost POST/network/500 và response sai identity. |
| ADM-BASE-17 | API thật stale caption409→read→adopt timestamp→caption rỗng lưu null. Mock read lỗi giữ draft, explicit accept giữ input và PATCH version mới; caption200 rồi GET500 giữ editor/receipt; quyền mất lúc submit, target404 rồi read vắng; context Gym cached500 giữ draft. |
| ADM-BASE-18 | API thật Lên đổi cover. Mock full expected/new ID arrays, upload đồng thời gây409 rồi click mới dùng đủ ID; boundary disabled, focus sau đổi thứ tự; conversion/upload/delete pending chặn reorder. Integration backend kiểm duplicate/stale và atomic update; code inspection xác nhận ID ngoài list bị từ chối trước ghi. |
| ADM-BASE-19 | Admin hủy/Escape/confirm, DELETE body vắng, API thật row/file404, wrong-Gym404 và inactive public404. Mock DELETE commit-row rồi mất phản hồi/cleanup500→read vắng→đóng, không DELETE lần hai; pending khóa Hủy/Escape/thao tác khác. Backend kiểm scope gallery/file và cleanup bình thường; lỗi cleanup sau commit được mô phỏng ở UI. Code inspection xác nhận gallery repository/store tách Report. |

Các nguồn: [suite chính](../apps/web/e2e/admin-gallery.spec.ts), [recovery](../apps/web/e2e/admin-gallery-recovery.spec.ts), [scope/quyền](../apps/web/e2e/admin-gallery-scope.spec.ts), [API thật](../apps/web/e2e/admin-gallery-live.spec.ts), [hồi quy Manager/Public/Admin](../apps/web/e2e/gallery.spec.ts), [8 group backend](../apps/api/tests/gallery.integration.test.ts). Hai viewport375/1440 kiểm axe WCAG2A/AA/2.1AA;375/768/1024/1440 kiểm không tràn ngang với caption dài, editor và focus bàn phím. [Preview desktop](design/admin-frontend/previews/gallery-desktop.png) và [mobile](design/admin-frontend/previews/gallery-mobile.png) dùng PNG canvas kiểm thử, không phải ảnh Gym vận hành.

## Verification

Chạy trên DB/browser fixture tạm, retries0, trace/video/screenshot lỗi tắt. Không ghi dữ liệu vận hành hoặc dùng credential thật trong artifact.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-gallery,gallery,admin-packages,admin-dashboard,auth --rounds=2` | PASS49+2+40+26+8=125/vòng,250 lượt. Đây là lượt trước sửa tên file bị reset sớm. Ba suite Package/dashboard/auth không thay đổi sau lượt này. |
| `npm run test:admin-gallery --workspace @multi-gym/web -- --grep 'Upload strictly sends'` | Red: tên file rỗng mặc dù preview còn; nguyên nhân `choose()` gọi cùng hàm clear của nút bỏ ảnh. Sau tách reset picker khỏi bước đọc ảnh: green1/1. Assertion tên file giữ nguyên trong suite. |
| `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-gallery,gallery --rounds=2` | PASS sau sửa picker:49+2=51/vòng,102 lượt; retries0. Gallery gồm47mock và2live; hồi quy Manager/Public/Admin2ca. |
| Cùng lệnh Gallery hai vòng ngày14/10, sau các thay đổi PT/route/CSS hiện có | PASS49+2=51/vòng, thêm102 lượt, retries0. |
| `npm run test:gallery --workspace @multi-gym/api` | PASS8 group integration/PostgreSQL: quyền DB/scope, strict payload, metadata stripping, caption/reorder/quota atomic và public INACTIVE/file404. |
| lint; typecheck3workspace; API test typecheck; E2E typecheck; build3workspace | PASS sau sửa picker ngày12/10 và chạy lại trên workspace hiện tại ngày14/10; build có cảnh báo kích thước chunk nêu dưới đây. |
| `npm run test:dashboard-cache --workspace @multi-gym/web` | PASS4/4. |
| `npm run test:admin-pt-workspace --workspace @multi-gym/web` | Kiểm tra bổ sung workspace PT:8/8 PASS sau các sửa nhỏ mô tả dưới đây; chưa thay cho nghiệm thu R22 đầy đủ. |

[Artifact từng suite/vòng](qa02-r21-verification.json) ghi250 lượt hồi quy liên quan trước sửa picker,102 lượt Gallery sau sửa ngày12/10 và102 lượt Gallery trên workspace hiện tại ngày14/10: tổng454 lượt PASS, không retry. Red/green riêng và8 ca PT không cộng vào454. Kiểm tra sau cleanup:0 DB `gym03_browser_` còn lại. Liên kết tài liệu và `git diff --check` được kiểm tra lại sau cập nhật báo cáo. R21 bổ sung suite thứ27 là `admin-gallery`49ca (47mock,2live); workspace đã có thêm suite PT thứ28 thuộc R22 chưa được nghiệm thu đầy đủ trong báo cáo này. Chưa chạy toàn bộ runner hoặc root QA-02 trong R21.

Kiểm tra workspace ngày14/10 phát hiện lỗi lint ở form PT hiện có: handler Escape gắn trên `<form>` không đáp ứng jsx-a11y. Đã chuyển sang document listener có kiểm tra focus bên trong form, giữ guard busy/needsRead và cleanup. Hai ca PT ban đầu thất bại: selector lấy `<time>` của feedback thay giờ lịch tập, và nhãn Lý do bọc textarea khiến tên nhãn thay đổi theo bản nháp. Test giờ được giới hạn vào article và giữ assertion09:00, bổ sung datetime gốc; label textarea được tách và liên kết htmlFor/id. Sau sửa:8/8 PASS, lint/typecheck/build PASS. Các thay đổi này giữ chức năng PT hiện có; R22 cần tiếp tục đối chiếu contract/coverage/API thật và báo cáo riêng.

## Issues

- Không có idempotency cho POST upload hoặc proof kết quả lost response. Readback không chứng minh ảnh nào của lần gửi trước; UI yêu cầu kiểm tra thủ công và ý định mới. Không thêm cơ chế retry tự động.
- DELETE commit row trước cleanup. Store demo hiện tại ghi log an toàn khi unlink lỗi và vẫn có thể trả200;200 không chứng minh orphan đã dọn. UI cũng xử lý trường hợp response500/mất mạng sau row commit bằng đọc lại, nhưng chỉ biết row hiện tại. Ca500 được mô phỏng ở UI, không phải lỗi unlink thật được chèn vào store mặc định. Backend/storage cần quy trình vận hành riêng để dọn orphan nếu có.
- Storage production vẫn OPEN theo GIM-01;503 hiển thị thông điệp API. Không cấu hình nhà cung cấp storage hoặc deployment trong R21.
- Build web ngày12/10 có cảnh báo chunk chính vượt500 kB (~502 kB, gzip~136 kB); workspace hiện tại ngày14/10 là511.69 kB, gzip138.10 kB. Build vẫn thành công. Chưa làm tối ưu bundle toàn ứng dụng trong lát cắt này.
- Coverage tại Chromium/DB tạm. R21 kiểm thử các suite liên quan, không thay bằng nghiệm thu toàn bộ runner28suite hoặc root QA-02; Figma/deployment chưa được kiểm chứng lại.

## Architecture Impact

None về contract/domain/schema/quyền: tái sử dụng8 endpoint và21 bảng hiện hành, TanStack Query, auth guard, context Gym, tokens và bộ đọc ảnh. Không migration, dependency hoặc endpoint mới; không đổi payment/history. Fetch bytes đặt trong service, orchestration trong hook, UI chia theo hành động. ADM-UI-01 tiếp tục đến R22 và QA tổng.

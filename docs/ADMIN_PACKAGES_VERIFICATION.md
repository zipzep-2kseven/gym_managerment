# R20 — Quản lý gói tập Admin theo Gym

Ngày: 12/10/2026. Phạm vi: SCR-ADM-013 `/admin/gyms/:gymId/packages`, FEAT-PKG-003–007 và REQ/AC/TC-ADM-BASE-10–14. ADM-UI-01 tổng thể vẫn IN_PROGRESS; tiếp theo R21 Gallery Gym.

## Changed

- [Màn Admin riêng](../apps/web/src/pages/package/AdminPackagesPage.tsx) dùng PageHeader, context Gym, toolbar/Pager, feedback dữ liệu và các vùng tạo/sửa/xác nhận/kiểm tra kết quả. Header nêu tên và trạng thái Gym; Gym INACTIVE vẫn quản trị catalog nội bộ. Catalog có giá decimal chính xác, thời hạn, mô tả nullable và trạng thái bán. Manager/Public giữ luồng PKG-02, dùng chung hàm chuẩn hóa giá.
- [Query theo actor/Gym](../apps/web/src/hooks/useAdminPackages.ts): pageSize12; search/status/sort/order/page theo URL, loại query không được phép, đổi filter về page1, Back khôi phục và tự phục hồi trang cuối rỗng theo metadata mới. GET có AbortSignal; query/error/receipt/form reset khi actor hoặc Gym đổi. Cache lỗi thường giữ dữ liệu cũ có cảnh báo và khóa ghi;401/403 gỡ dữ liệu/form và kiểm phiên trước guard.
- [Editor](../apps/web/src/pages/package/AdminPackageEditor.tsx) giữ snapshot lúc mở qua refetch; tên trim, integer ngày1–2147483647, giá chuỗi tối đa999999999999.99/2 chữ số lẻ. Không chuyển giá qua Number; description rỗng→null. PATCH chỉ field đổi, baseline tiến theo input đã gửi sau200; omitted fields do người khác sửa giữ nguyên. Không có thay đổi báo riêng và không PATCH. UI giải thích cùng trường thì lần lưu sau thắng; không thêm CAS/version giả.
- [Bộ điều khiển ghi](../apps/web/src/hooks/useAdminPackageAction.ts): một thao tác chung, synchronous guard, retry=false, pending khóa field/close/filter/pager/action khác. Xác nhận status có target/hậu quả; Hủy/Escape không ghi, trả focus về nút hiện hành hoặc heading nếu row đã rời filter. Thành công200/201 giữ receipt ngay cả khi GET sau đó lỗi, invalidate cache package của Gym gồm public/private. Form tạo đã thành công giữ field/submit khóa đến đóng rõ ràng.
- 400 giữ draft để sửa.404/409/network/5xx hoặc response không xác định đúng Gym/ID khóa gửi lại đến đọc thành công. [Read-back private](../apps/web/src/services/package.service.ts) tìm đúng ID trong management list không search/status, paging100; không dùng public detail để đọc INACTIVE. Kết quả được trình bày trước khi người dùng chọn dùng snapshot mới. Target thiếu hoặc GET lỗi giữ khóa, không tự gửi lại PATCH.
- POST mất response không có idempotency hay tên duy nhất: không suy gói trùng tên là do mình tạo. Đọc lại catalog rồi cho tìm/lọc/phân trang chỉ đọc trong khi giữ form tạo khóa; người dùng phải xác nhận đã kiểm tra trước đóng. Không tự gửi lại POST hoặc báo tạo thành công nếu không có201 hợp lệ.
- Lỗi tải lại context Gym có cache giữ form/receipt, báo dữ liệu cũ và khóa ghi đến đọc Gym thành công; lỗi quyền vẫn gỡ nội dung. CSS chỉ mở rộng phạm vi Admin, dùng tokens hiện có và dials3/1/5. Không thêm thư viện, endpoint, schema, migration hoặc backend production change.
- Thêm suite [admin-packages](../apps/web/playwright.admin-packages.config.ts); runner mặc định tăng25→26suite. Live dùng fixture gym-03 hiện có trên DB tạm, không sửa fixture/schema/dữ liệu dev. Mock PKG-02 Admin bổ sung context Gym/DTO đúng scope và filter thật; giữ kiểm tra Hủy/PATCH/Đang bán, thêm receipt và empty sau row rời INACTIVE. Live cũ chỉ định rõ receipt để tránh nhiều vùng role=status.

## Why

Admin cần biết đang sửa catalog cơ sở nào và phân biệt kết quả ghi với kết quả tải lại. Màn dùng chung trước đây có thể mất form khi GET lỗi, không có chốt đọc lại khi phản hồi chưa rõ và chưa giải thích concurrent edit. R20 chuẩn hóa UX trên contract hiện hành; mở bán gói không kích hoạt lại Gym, ngừng bán không hủy lịch sử thẻ/giao dịch.

## Đối chiếu REQ / AC / TC

Nguồn: [catalog/form/status/URL/axe](../apps/web/e2e/admin-packages.spec.ts), [recovery/auth/late request](../apps/web/e2e/admin-packages-recovery.spec.ts), [context/create receipt](../apps/web/e2e/admin-packages-context.spec.ts), [live Admin](../apps/web/e2e/admin-packages-live.spec.ts), [PKG-02 Manager/Public](../apps/web/e2e/package-ui.spec.ts), [backend write/history](../apps/api/tests/package-write.cases.ts), [backend auth/scope](../apps/api/tests/package-auth.cases.ts).

| REQ / AC / TC | Coverage |
| --- | --- |
| ADM-BASE-10 | Catalog nội bộ Gym INACTIVE; price max/zero và null fallback; metadata25row/3trang, URL allowlist, search trim, status/sort/order/page, Back, trang vượt tổng và empty sau status. Loading/initial error/cached error/retry, current session/password/role/scope, actor/Gym reset và GET abort. |
| ADM-BASE-11 | Admin POST201 allowlist/ACTIVE, trim và canonical decimal; invalid tên/ngày/giá không gửi, pending/synthetic submit không ghi lần hai. Tạo thành công khóa field/submit đến đóng;201+refetch500 giữ receipt. Lost response không tự retry hay suy identity từ tên, catalog paging được mở chỉ đọc sau GET rồi yêu cầu xác nhận kiểm tra. |
| ADM-BASE-12 | Partial PATCH/null, no-change không PATCH, snapshot qua refetch/concurrent edit và baseline sau lưu. Live concurrent đổi name/duration/price rồi Admin ghi price giữ omitted; cùng field last write wins theo contract.400 sửa tiếp,404/409/network/500/read-failure/missing target giữ draft và đọc lại đúng ID ở trang2 trước dùng snapshot mới. Backend giữ Payment/Membership nguyên trạng. |
| ADM-BASE-13 | Ngừng bán có target/hậu quả, Hủy/Escape/focus và pending liên khóa; receipt200 còn khi refetch500; lost response đọc được INACTIVE private mà không PATCH tự động; row rời filter và trang cuối về trang hợp lệ. Live/public và backend chứng minh ẩn public, giữ lịch sử. |
| ADM-BASE-14 | Mở bán có confirm/pending/receipt, empty INACTIVE phục hồi. Concurrent cùng trạng thái vẫn200 và body rỗng; live activate lại cùng trạng thái vẫn200. Gym INACTIVE giữ nội bộ/ẩn public; wrong Gym404 không sửa target. |

Coverage áp dụng fixture/lịch request đã chạy; không chứng nhận mọi interleaving hoặc môi trường vận hành.

## Tests

- Suite Admin Package:40ca,38mock +2live API/PostgreSQL; trace/video/screenshot tự động tắt, ảnh chủ động chỉ dùng mock. Config dùng fixture gym-03 sẵn có trên DB tạm, không thêm seed hoặc tắt constraint.
- `npm run test:e2e --workspace @multi-gym/web -- --suites=admin-packages,package,package-live,admin-dashboard,auth --rounds=2`:5suite×2,99ca/vòng, **198 lượt browser PASS**, không retry, exit0. [Kết quả từng suite/vòng](qa02-r20-verification.json).
- Lint toàn repo, typecheck workspaces, typecheck API tests/E2E, build workspaces và4 dashboard cache tests PASS, exit0 sau bản sửa cuối.

| Suite | Ca mỗi vòng | Hai vòng |
| --- | ---: | ---: |
| admin-packages | 40 | 80 |
| package | 23 | 46 |
| package-live | 2 | 4 |
| admin-dashboard | 26 | 52 |
| auth | 8 | 16 |
| Tổng | 99 | 198 |

- Backend `npm run test:packages --workspace @multi-gym/api`:20 HTTP/database cases +13 full-app HTTP checks PASS, đủ7endpoint với cookie thật. Bao gồm validation/no-store, price/history, concurrent PATCH/status, current authorization và Manager A không đọc/ghi Gym B.
- Hồi quy có lỗi trước sửa: cached Gym500 làm mất editor/draft; cùng ca giữ draft, khóa ghi và retry đã chạy PASS sau sửa. Lượt đầu còn phát hiện nhãn “đang chờ” được dùng cho lỗi GET; tách pending khỏi khóa do lỗi và giữ kiểm tra nút disabled.

## Verification

- [Ảnh desktop](design/admin-frontend/previews/packages-desktop.png) · [ảnh mobile](design/admin-frontend/previews/packages-mobile.png). Screenshot chỉ dùng mock, không credential.375/768/1024/1440 kiểm không overflow, tên/mô tả dài và bàn phím; axe WCAG2A/AA/2.1AA tại375/1440 trong editor.
- Giá lưu và hiển thị qua chuỗi; ID/Gym/status/timestamps chỉ đọc, body allowlist, không DELETE/quota PT/thu tiền thật. Backend vẫn là nơi kiểm quyền/scope/validation; không thêm RLS hoặc thay JWT HttpOnly/Drizzle.
- Không sửa schema/migration hoặc dữ liệu vận hành; fixture browser/API tự tạo và dọn DB tạm. Kiểm tra cleanup cuối:0DB `gym03_browser_` còn lại; không xóa DB dev hoặc fixture không thuộc R20.

## Issues / giới hạn

- Snapshot, draft, receipt và khóa là state của màn đang mounted; đổi route/actor/reload không lưu vào Web Storage. Request đã gửi có thể hoàn tất sau rời màn; không hứa khóa bền vững qua nhiều tab hay khôi phục chắc chắn POST mất phản hồi.
- API Package chưa có CAS/version/idempotency. Cùng trường là last write wins; tên gói không duy nhất. Read-back chỉ chứng minh dữ liệu hiện tại, không chứng minh ai tạo/sửa nó. Tạo mới sau bước kiểm tra vẫn là quyết định rõ ràng của người dùng.
- Read-back quét management list100/trang, client chặn quá100000trang và giữ khóa nếu không xác định được ID. Chưa đo hiệu năng catalog cực lớn hoặc chứng nhận snapshot nguyên tử qua nhiều trang.
- Chưa chạy root QA-02/toàn26suite×2, deployment, Safari/Firefox hoặc screen reader. R20 không hoàn tất roadmap Admin hoặc tiền thật.

## Architecture Impact

None. Giữ21bảng, quyền/contract7endpoint PKG-01, projection public/private và lịch sử Payment/Membership. Thay đổi nằm ở UI/controller/service read-back và kiểm chứng.

# PLAN-02 — Đề xuất chính sách Payment/Membership

Ngày tạo: 2026-10-07; cập nhật: 2026-10-08. Trạng thái: **DRAFT cho tiền thật — phần demo đã có yêu cầu thay thế ngày 2026-10-08**, chưa đóng PLAN-02, chưa chốt Q-01/Q-02/Q-03. Tài liệu này là bản để duyệt, không thay thế Domain/Architecture/API hiện hành.

> Cập nhật: người dùng chọn thanh toán mock để demo, chưa muốn payment thật. Các đề xuất cổng/snapshot/phê duyệt bên dưới chỉ là tham khảo cho tương lai, không chặn demo. Luồng demo xác nhận và tạo thẻ ngay trong một transaction, không thêm snapshot hoặc migration; xem quyết định demo ở Architecture và [PAYMENT_DEMO_VERIFICATION.md](PAYMENT_DEMO_VERIFICATION.md).

## 1. Kết quả rà soát

- Payment/Membership đã có schema, FK cùng User/Gym/Package, unique transaction_code toàn hệ thống và unique memberships.payment_id; không tạo lại hai bảng này.
- payments.amount và memberships.purchase_price là numeric(14,2). Dùng decimal string ở API và so sánh chính xác tại backend.
- Payment chưa có thời hạn gói tại lúc đặt mua. memberships.start_date/end_date chỉ có khi tạo thẻ. Package.duration_days có thể sửa trong lúc Payment PENDING; hiện không có cách phục hồi chắc chắn thời hạn cũ từ schema này.
- Migration 0002 yêu cầu Gym ACTIVE khi ghi Payment PENDING/SUCCESS hoặc Membership PENDING/ACTIVE. Ngừng Gym bị chặn bởi Payment PENDING và Membership PENDING/ACTIVE. Không bypass hoặc force callback để vượt guard.
- Package INACTIVE không đồng nghĩa hủy giao dịch/thẻ đã mua; cần phân biệt không cho đặt mua mới và xử lý Payment đã được tạo hợp lệ trước đó.
- Architecture §7 cấm tự thêm cột ngoài ERD; §14.1 yêu cầu chốt gateway/nguồn xác nhận trước triển khai. Đề xuất thêm snapshot dưới đây cần cập nhật kiến trúc/ERD có chủ đích sau phê duyệt.

## 2. Gói chính sách đề xuất để duyệt

| Mục | Đề xuất cho bản đầu tiên | Quyết định liên quan |
| --- | --- | --- |
| Phương thức | Chọn **một** phương thức; đang chờ người dùng chọn cổng hoặc chuyển khoản xác nhận bởi Admin | Q-01 |
| Giá | Chốt Package.price vào Payment.amount lúc tạo PENDING; thay giá Package sau đó không sửa amount của Payment này | Q-01 |
| Thời hạn | Chốt Package.duration_days lúc tạo PENDING vào snapshot riêng; không dùng thời hạn mới của Package để phát hành thẻ cũ | Bổ sung dữ liệu cần duyệt |
| Tiền tệ | VND; bộ chuyển đổi của phương thức phải biểu diễn đúng amount, không tự làm tròn; chưa hỗ trợ gói 0 đồng qua checkout trong bản đầu tiên | Q-01 |
| Danh tính | Guest xem/chọn gói; đăng nhập/đăng ký trước tạo Payment; user_id lấy từ phiên CUSTOMER còn hiệu lực | Q-17 |
| Kích hoạt | Xác nhận thành công và tạo Membership ACTIVE trong một DB transaction; không yêu cầu chọn PT/tư vấn | Q-02 |
| Ngày sử dụng | start_date là ngày backend xác nhận thành công theo Asia/Ho_Chi_Minh; end_date = start_date + duration_snapshot - 1; dùng tới hết ngày end_date | Q-02 |
| Hoàn tiền/hủy thẻ | Bản đầu tiên không mở action refund hoặc hủy thẻ đã trả tiền; không tự ghi REFUNDED hoặc tự hủy Registration/Appointment | Q-02 / Q-13 |
| Cấp thẻ thủ công | Không mở luồng payment_id NULL ở bản đầu tiên; nullable hiện có chỉ giữ tương thích dữ liệu | Q-03 |
| Nhiều Membership | Q-08 phần Customer chưa chốt: cần chọn cho phép nhiều thẻ cùng/khác Gym hoặc giới hạn; chưa tự thêm unique/đổi lifecycle | Q-08 Customer |

Ví dụ cần duyệt: Payment tạo với giá 500000.00 và thời hạn 30 ngày; sau đó Package đổi thành 600000.00/60 ngày. Payment cũ vẫn thanh toán 500000.00 và nhận 30 ngày. Xác nhận thành công ngày 07/10/2026 thì thẻ dùng 07/10–05/11/2026, gồm đủ 30 ngày.

Q-02 có thể được chốt **phạm vi bản đầu tiên** bằng quyết định chưa hỗ trợ refund/cancel-paid; chính sách mở các action đó sau này vẫn phải được duyệt riêng. Không tuyên bố mọi lifecycle Membership đã được giải quyết.

## 3. Nguồn xác nhận và hợp đồng tích hợp

### Nếu chọn cổng thanh toán

- Dùng sandbox để nghiệm thu trước production. Adapter phải theo tài liệu chính thức của cổng được chọn: URL, phương thức HTTP, chữ ký, canonicalization, query-to-server verification, đơn vị tiền, timestamp và acknowledgement/retry.
- Redirect/return URL của trình duyệt chỉ hiển thị trạng thái do backend trả; không đổi Payment thành SUCCESS hoặc cấp thẻ từ query frontend.
- Backend xác minh nguồn trước khi chuyển payload thành kết quả nội bộ. Đối chiếu merchant, payment reference, amount, currency, transaction reference và kết quả. Không nhận user_id/gym_id/package_id làm nguồn danh tính từ callback.
- URL webhook, tên field và chữ ký chưa được ấn định trong bản này; sẽ điền hợp đồng chính xác sau khi chọn cổng và đọc tài liệu chính thức. Chưa có route callback được triển khai.

### Nếu chọn chuyển khoản do Admin xác nhận

- Đây là nghiệp vụ ghi nhận chuyển khoản đã được Admin đối soát, không phải webhook đã được ngân hàng xác thực tự động.
- Customer chỉ tạo PENDING và xem lịch sử; không tự khai SUCCESS, amount đáng tin cậy hoặc cấp Membership.
- Chỉ Admin hiện hành trong DB được xác nhận; Manager không có quyền tài chính mặc định. Lấy payment reference và dữ kiện chuyển khoản từ đối soát; cần chốt nơi đối soát và transaction reference trước mở endpoint.
- Contract action xác nhận, dữ liệu chứng từ và audit khả dụng trong 21 bảng cần được người dùng duyệt; không tự thêm bảng Audit_Log hoặc biến trình duyệt thành nguồn bằng chứng tin cậy.

Hai nhánh là lựa chọn thay thế; không triển khai cả hai mặc định. Không cần gửi tài khoản thật, khóa bí mật hoặc credentials để duyệt chính sách.

## 4. Contract ứng dụng dự kiến sau phê duyệt

### Tạo Payment — endpoint có trong catalog, chưa triển khai

`POST /api/v1/gyms/:gymId/payments`

- Strict body `{ package_id, payment_method }`; phương thức chỉ thuộc allowlist đã duyệt. Không nhận amount, paid_at, status, role, user_id, Gym trong body hoặc dữ kiện snapshot tự khai.
- Đề xuất header `Idempotency-Key` là UUID do client tạo một lần cho một lần đặt mua. Dùng UUID này làm payment_id của request mới để tận dụng PK hiện có, không thêm bảng/key store. Khóa này không cấp quyền truy cập bản ghi.
- Key lặp cùng actor/Gym/package/method trả Payment cũ và không tạo yêu cầu thu tiền mới. Key bị dùng với input/actor/Gym khác trả lỗi conflict an toàn, không trả Payment của người khác. Không so lại giá Package mới khi replay để thay snapshot cũ.
- Kiểm tra account/role CUSTOMER hiện tại, Gym/Package ACTIVE và Package thuộc Gym trước tạo mới. Thực thi policy Membership đã được duyệt, không tự quyết Q-08.
- Khóa dữ kiện Gym/User/Package trong transaction, lấy amount/duration từ DB. Sau commit mới gọi hệ thống bên ngoài; không giữ transaction/DB lock trong network call.
- Nếu phản hồi cổng bị mất: request lặp truy xuất/reconcile đúng payment reference; không tạo giao dịch thu tiền mới. Cách tạo URL/session idempotent phụ thuộc contract chính thức của cổng.
- Membership chưa tồn tại khi Payment còn PENDING. Không mở POST Membership tự phục vụ.
- Envelope, HTTP status tạo mới/replay và payment initiation DTO (URL/hướng dẫn chuyển khoản) sẽ được cụ thể hóa ở PAY-01; không coi tên field transport chưa duyệt là API đã có.

### Kết quả nội bộ sau xác minh nguồn

Adapter cung cấp payment reference, amount/currency đã chuẩn hóa, transaction reference và kết quả có nguồn xác minh. Đây là input nội bộ, **không phải DTO Customer được gửi để tự xác nhận**.

- transaction_code lưu dưới dạng namespace phương thức + mã giao dịch ngoài, ví dụ `METHOD:reference`; không đổi unique toàn hệ thống. Cổng khác có cùng mã ngoài không bị gộp; một giao dịch không dùng được cho Payment thứ hai.
- paid_at đến từ dữ kiện nguồn đã xác minh; quy tắc timezone/độ lệch thời gian cụ thể theo tích hợp đã chọn. Ngày bắt đầu thẻ dùng ngày backend xác nhận, không lấy đồng hồ máy khách.
- Tìm Payment theo reference rồi lấy User/Gym/Package từ bản ghi DB. Package đã ngừng bán không tự từ chối SUCCESS của Payment được tạo hợp lệ trước đó; không mở mua mới từ Package INACTIVE.
- Sau khi xác minh: khóa Gym trước, khóa Payment và dữ kiện liên quan theo thứ tự nhất quán; đọc lại trạng thái sau chờ khóa. Không lấy kết quả kiểm tra từ trước khi lock làm quyết định commit.
- SUCCESS lần đầu: kiểm tra amount/reference/tuple, đổi Payment SUCCESS, ghi paid_at/transaction_code, tạo một Membership với purchase_price=Payment.amount, ngày từ duration snapshot; commit cùng transaction. Lỗi giữa chừng rollback cả Payment và Membership.
- SUCCESS lặp khớp: trả kết quả hiện có; không sửa paid_at/ngày thẻ/giá/thẻ ID và không phát hành lần hai. Unique payment_id là hàng rào DB cuối cùng, không thay khóa/check trong service.
- Cùng reference nhưng khác amount hoặc Payment: từ chối/an toàn, không sửa bản ghi. DB error không lộ SQL/secret; deadlock/serialization báo conflict theo envelope nền tảng. Transport ACK/retry theo cổng sau khi chọn, không tự trả ACK thành công khi chưa commit.

## 5. Lifecycle dự kiến

| Hiện tại | Kết quả xác minh | Xử lý đề xuất |
| --- | --- | --- |
| PENDING | SUCCESS | Transaction Payment SUCCESS + một Membership ACTIVE |
| PENDING | FAILED/CANCELLED cuối cùng đã xác minh | Đổi trạng thái tương ứng, không tạo thẻ |
| SUCCESS | SUCCESS cùng giao dịch/amount | Idempotent, giữ nguyên dữ liệu lịch sử |
| SUCCESS | FAILED/CANCELLED | Không hạ trạng thái, giữ thẻ; phân loại kết quả cũ/xung đột theo contract nguồn |
| FAILED/CANCELLED | SUCCESS đến muộn | Không tự phục hồi hoặc cấp thẻ; đối soát thủ công theo policy nguồn cần chốt trước vận hành |
| Bất kỳ | REFUNDED hoặc yêu cầu hủy thẻ đã trả | Chưa hỗ trợ trong bản đầu tiên; xử lý đối soát riêng, không tự cascade |

Chưa chọn timeout tự động cho Payment PENDING. PENDING chặn ngừng Gym theo policy đã có; thời gian hết hạn, xác minh giao dịch trước timeout và xử lý SUCCESS tới muộn phải được điền sau khi chọn phương thức. Không triển khai expiry bằng việc đoán rằng khách đã rời trang.

Expiry Membership là hạng mục phải đặc tả trước phát hành: ngày hết hạn không tự đổi cột status hiện tại. Cơ chế ACTIVE → EXPIRED phải cập nhật có kiểm soát, không cascade PT; Q-04/Q-13 tiếp tục chi phối Registration/Appointment. Không chỉ đổi nhãn UI rồi giả định Gym hết nghĩa vụ mở.

## 6. Tác động schema/kiến trúc cần duyệt

**Requires Architecture Decision Review** cho `payments.duration_days_snapshot` ngoài ERD hiện có. Không có schema/migration mới trong PLAN-02.

- Đề xuất integer dương cho Payment được tạo bởi API mới; source luôn Package tại lúc tạo Payment, bất biến sau tạo.
- Không thể backfill chính xác thời hạn lịch sử bằng duration hiện tại nếu Package từng thay đổi. PAY-01 phải đọc-only inventory dữ liệu trước thiết kế migration; không tự sửa giao dịch/thẻ cũ.
- Payment SUCCESS cũ có thẻ: giữ nguyên start/end/purchase_price. Payment PENDING cũ thiếu snapshot phải được đối soát/xác nhận thời hạn trước tiếp tục; không đoán hoặc âm thầm thu tiền theo gói mới.
- Phương án tránh thêm cột là chặn sửa price/duration khi có Payment PENDING, nhưng thay đổi hành vi PKG-01 đã nghiệm thu và cũng cần duyệt; không áp dụng cả hai phương án cùng lúc.
- Giữ migration 0000–0002; nếu duyệt snapshot, tạo migration mới trong PAY-01, nghiệm thu trên database tạm và không tự áp dụng vận hành.

## 7. Các bước triển khai và nghiệm thu sau quyết định

1. **Chốt PLAN-02:** chọn phương thức, duyệt hoặc sửa bảng chính sách, chọn snapshot/khóa chỉnh sửa, chốt phạm vi Q-08 Customer và timeout/late-success/expiry. Đồng bộ Architecture, Domain, Feature, Database, API, UI và plan. Chỉ đóng phần Q đã thực sự có câu trả lời.
2. **PAY-01:** rà schema hiện có; migration snapshot nếu duyệt; đặc tả đúng adapter/callback/ACK theo nguồn, allowlist và idempotency; tests constraints, legacy rows, scope User/Gym/Package, tiền/thời hạn chính xác. Không triển khai transport placeholder để giả lập production.
3. **PAY-02:** tạo/replay Payment và xử lý kết quả xác minh; tests Guest 401, role/scope/ownership, callback giả, sai amount/reference/currency, callback lặp và đồng thời, rollback, Package đổi giá/thời hạn/ngừng bán, revoke quyền, Gym inactive và SUCCESS đến muộn. Test lock waiter thực tế, không dùng sleep để giả định race.
4. **PAY-03:** checkout với login trước tạo Payment, pending/failure/retry, history/thẻ đọc; E2E sandbox/nguồn đối soát đã duyệt; UI chỉ theo backend, không tự đánh dấu SUCCESS/ACTIVE. Kiểm tra expiry trước phát hành luồng dùng thẻ.

Verification dự kiến: tests Payment theo fixture DB tạm được viết trong PAY, hồi quy `npm run test:database -w apps/api`, typecheck source/tests, build và Playwright luồng thực theo nguồn được chọn. Không công bố các test chưa tồn tại là đã PASS.

## 8. Hiện trạng lượt PLAN-02 này

Đã rà schema, migration, Domain/Feature/API/Architecture và viết bản đề xuất để duyệt. Chưa cài SDK, tạo callback, sửa Payment/Membership runtime, thêm cột hoặc chạy migration. Kiểm tra tài liệu bằng diff/đường dẫn tham chiếu; không cần chạy lại browser/build cho lượt chỉ sửa docs.

## 9. Ma trận nghiệm thu PAY sau khi chốt chính sách

Ma trận này là đặc tả test dự kiến, chưa phải test đã chạy. Các ca phụ thuộc phương thức, snapshot, giới hạn Membership hoặc lifecycle chỉ được triển khai khi quyết định tương ứng đã được duyệt.

| Ca | Điều kiện / thao tác | Kết quả phải kiểm chứng |
| --- | --- | --- |
| PAY-A01 | Guest tạo Payment | 401; không ghi Payment/Membership hoặc gọi nguồn thu tiền |
| PAY-A02 | Actor sai role/account/password gate | Từ chối theo contract hiện có; không có side effect |
| PAY-A03 | Package của Gym B gửi vào route Gym A | Từ chối an toàn, không tạo giao dịch khác Gym |
| PAY-A04 | Body tự khai amount/status/user_id/snapshot | Validation thất bại; chỉ dữ kiện DB được dùng |
| PAY-A05 | Key lặp cùng actor/Gym/input, kể cả concurrent | Một Payment; replay đúng amount/thời hạn ban đầu; không thu tiền lần hai |
| PAY-A06 | Key trùng nhưng actor/Gym/input khác | Conflict an toàn; không lộ bản ghi của actor khác |
| PAY-A07 | Package đổi giá/thời hạn khi Payment PENDING | Hành vi đúng phương án snapshot/khóa chỉnh sửa đã duyệt; không dùng giá/thời hạn mới âm thầm |
| PAY-A08 | Package ngừng bán sau tạo PENDING hợp lệ | Không mở mua mới; xử lý kết quả giao dịch cũ theo policy đã duyệt |
| PAY-A09 | Callback giả hoặc return URL frontend khai thành công | Không đổi Payment hoặc cấp Membership |
| PAY-A10 | Nguồn thật nhưng sai merchant/reference/amount/currency | Không xác nhận SUCCESS; không tạo thẻ |
| PAY-A11 | SUCCESS hợp lệ | Payment và Membership cùng User/Gym/Package, purchase_price từ Payment; một transaction |
| PAY-A12 | SUCCESS lặp và hai SUCCESS concurrent | Một Membership; giữ nguyên ID, paid_at, ngày và giá của kết quả đầu |
| PAY-A13 | transaction_code đã dùng ở Payment khác | Conflict; không reassociate giao dịch/thẻ |
| PAY-A14 | Lỗi sau đổi Payment trước insert Membership | Rollback toàn bộ; request lặp có thể hoàn tất theo nguồn đã xác minh |
| PAY-A15 | SUCCESS/FAILED/CANCELLED đến sai thứ tự | Đúng bảng lifecycle được duyệt; không hạ SUCCESS hoặc tự phục hồi giao dịch cuối |
| PAY-A16 | Ngừng Gym hoặc revoke quyền cạnh tranh với request | Lock waiter thực; đọc lại dữ kiện sau lock; không vượt guard/scope |
| PAY-A17 | Hai lần mua cạnh tranh với giới hạn Membership | Theo Q-08 đã chọn; không tự áp unique hoặc nhận tiền rồi từ chối thẻ do một check thiếu khóa |
| PAY-A18 | Xác nhận sát nửa đêm / duration=1 / qua tháng-năm | Ngày Việt Nam, đủ số ngày, không off-by-one hoặc lấy giờ máy khách |
| PAY-A19 | Mất phản hồi của nguồn thu tiền | Reconcile/replay đúng payment reference; không tạo một lần thu mới |
| PAY-A20 | Payment/Membership legacy thiếu snapshot hoặc payment_id NULL | Giữ history; không đoán thời hạn hoặc tự mở cấp thẻ thủ công |
| PAY-A21 | Customer đọc Payment/Membership của User khác | Safe 404 theo ownership; không trả dữ liệu nội bộ |
| PAY-A22 | Manager đọc Membership Gym khác | 403 theo scope backend; không trả dữ liệu chéo Gym |
| PAY-A23 | Gói giá 0 hoặc số tiền phương thức không biểu diễn được | Theo allowlist tiền đã duyệt; không tự làm tròn, thu tiền hoặc cấp thẻ miễn phí |
| PAY-A24 | Refund/cancel-paid hoặc Membership hết hạn | Theo phạm vi lifecycle đã duyệt; không cascade PT hoặc coi nhãn UI là thay đổi DB |

Tách nghiệm thu provider sandbox/đối soát thật khỏi API mock. Mock nguồn chỉ dùng kiểm tra lỗi/transaction deterministic, không là bằng chứng xác thực chữ ký hoặc thu tiền thật.

## 10. Điều kiện sẵn sàng bắt đầu PAY-01

- [x] Đã đối chiếu schema Payment/Membership hiện có và FK/unique/precision.
- [x] Đã xác định gap thời hạn lúc mua và ảnh hưởng migration/legacy.
- [x] Đã tách nguồn xác nhận khỏi return URL và payload Customer.
- [x] Có lifecycle dự kiến và ma trận nghiệm thu retry/concurrency/ownership/Gym scope.
- [ ] Có lựa chọn phương thức và nguồn xác nhận được người dùng chốt.
- [ ] Bảng chính sách §2 được duyệt hoặc chỉnh sửa; đặc biệt snapshot/giới hạn Membership.
- [ ] Nếu thêm cột: Architecture/ERD/Database Spec được cập nhật chính thức trước viết migration.
- [ ] Contract nguồn có URL, xác minh, reference, đơn vị tiền, expiry/late-success và ACK/retry cụ thể.

Lưu ý kiểm chứng: FK nguồn Membership hiện chỉ chứng minh cùng Payment/User/Gym/Package, không chứng minh Payment đã SUCCESS hoặc purchase_price bằng amount. Trigger 0002 bảo vệ Gym ACTIVE, không xác minh nguồn tiền hoặc đầy đủ state machine thanh toán. PAY service phải kiểm tra các invariant này; không tuyên bố unique/FK hiện tại đã giải quyết toàn bộ Payment → Membership.

# PLAN-03 — Đề xuất đăng ký PT và lịch hẹn

Ngày: 2026-10-08. **APPROVED — người dùng duyệt ngày 2026-10-09, với điều chỉnh availability bên dưới**. Các §1–§8 là bản đề xuất ban đầu; §9 ghi quyết định được duyệt và thay thế các điểm trái nhau. Q-08 Customer production và quyền profile/social/Working Schedule chưa chốt.

## 1. Hiện trạng đã kiểm tra

- `pt_registrations` gồm registration_id, membership_id, gym_trainer_id, registered_at, status, note và timestamps. Trạng thái ACTIVE/CANCELLED/COMPLETED; không có gym_id/customer_id hoặc quota.
- `pt_appointments` gồm appointment_id, registration_id, start_time/end_time, status, note và timestamps. Trạng thái PENDING/CONFIRMED/COMPLETED/CANCELLED, CHECK end_time > start_time. Không có trạng thái NO_SHOW, exclusion chống overlap hoặc lịch sử đổi PT riêng.
- Migration 0001 bảo vệ Registration và Membership/Gym Trainer cùng Gym; 0002 bảo vệ Gym/PT ACTIVE và chặn ngừng khi còn nghĩa vụ mở. Các guard này chưa chứng minh điều kiện thẻ/ngày, quyền actor, chống trùng lịch hoặc đầy đủ state machine Appointment.
- `pt-registration.service.ts` hiện chỉ hỗ trợ Customer chính chủ, thẻ ACTIVE trong ngày hiệu lực và PT ACTIVE cùng Gym; chưa có controller/router. Service dùng CURRENT_DATE phụ thuộc timezone DB và chưa kiểm tra current role/account/password hoặc availability. Không coi hiện trạng này là policy đã được duyệt.
- Payment demo tạo thẻ ACTIVE, có ngày và giá mua; chưa có expiry scheduler hoặc quyền dùng thẻ demo cho PT. Phần mở quyền đó được đề xuất dưới đây để tiếp nối demo.
- Working Schedule là khung tham khảo theo tuần, không sinh slot, giữ chỗ hoặc tự chặn Appointment. Không đưa Q-18 chưa chốt vào việc đặt lịch như một rule đã duyệt.

## 2. Chính sách đề xuất cho đăng ký PT (Q-04/Q-16)

| Mục | Đề xuất để duyệt |
| --- | --- |
| Thẻ hợp lệ | Membership ACTIVE, start_date ≤ ngày Việt Nam hiện tại ≤ end_date; thuộc đúng Gym route. Check ngày độc lập status để không dùng thẻ đã quá hạn nhưng chưa được cập nhật EXPIRED. |
| Thẻ demo | Cho phép Membership tạo từ Payment demo tham gia luồng PT khi đủ điều kiện thẻ/Gym/PT; không biến thành thanh toán PT thật. |
| Customer | Chỉ đăng ký bằng Membership của mình; actor/account/current role CUSTOMER/password gate lấy lại từ DB. |
| Manager | Được tạo thay cho hội viên trong đúng Gym có assignment MANAGER ACTIVE, sau khi đã trao đổi/thống nhất. Không lấy customer_id hoặc role tự khai từ body. |
| Admin | Xem catalog toàn hệ thống theo API hiện có; không tự thêm quyền tạo Registration ngoài actor catalog Customer/Manager. |
| PT | Gym Trainer ACTIVE cùng Gym, User ACTIVE và role PT còn trong DB. Không suy quyền từ JWT hoặc availability. |
| Availability bản đầu | ACCEPTING/ALMOST_FULL/NOT_ACCEPTING chỉ hiển thị; không tự chặn đăng ký mới sau khi hai bên đã thống nhất. PT default NOT_ACCEPTING hiện tại không làm demo bị khóa. Nếu muốn NOT_ACCEPTING chặn, cần chọn policy đó và triển khai quyền cập nhật availability trước demo. |
| Số đăng ký | Đề xuất tối đa một Registration ACTIVE trên một Membership; có thể dùng các Membership khác nhau. Không chốt giới hạn số thẻ hoặc Customer nhiều Gym của production tại đây. |
| Lịch sử | Giữ Registration CANCELLED/COMPLETED; không xóa hoặc tái sử dụng ID cũ làm một PT/thẻ khác. |
| Bằng chứng thống nhất | Customer/Manager xác nhận qua hành động tạo Registration và note tùy chọn; không tự thêm bảng/chữ ký/notification hoặc cơ chế PT duyệt Registration ngoài schema. |

Body POST catalog: `{membership_id, gym_trainer_id, note?}`; Membership/Gym Trainer xác định Customer/PT/Gym tại backend. Không có giá/PT Package/PT Payment, quota hoặc field status/actor/Gym do client tự chọn.

## 3. Lịch hẹn đề xuất (Q-06)

- Customer chính chủ, PT phụ trách hiện hành hoặc Manager ACTIVE đúng Gym được tạo lịch theo catalog. Registration phải ACTIVE; thẻ còn hiệu lực tại thời điểm request, Gym và PT còn ACTIVE. Current account/role/assignment của actor và PT được đọc lại tại backend.
- Mọi lịch mới tạo PENDING; PENDING và CONFIRMED đều giữ chỗ. PT phụ trách hoặc Manager đúng Gym xác nhận PENDING → CONFIRMED; Customer không tự xác nhận.
- API nhận ISO timestamp có offset hoặc Z; lưu timestamptz, hiển thị Asia/Ho_Chi_Minh. Backend yêu cầu start_time > now, end_time > start_time. Không nhận datetime thiếu timezone rồi đoán theo trình duyệt.
- Toàn bộ khoảng lịch nằm trong ngày hiệu lực Membership: start ≥ đầu start_date theo giờ Việt Nam, end ≤ đầu ngày sau end_date. Lịch kết thúc đúng 00:00 ngày kế sau end_date hợp lệ vì end là mốc loại trừ. Không bắt buộc lịch nằm trong Working Schedule chưa có policy Q-18.
- Chống trùng theo khoảng nửa mở `[start,end)`: hai lịch liền kề được phép. Overlap khi `existing.start < requested.end AND existing.end > requested.start`.
- Kiểm tra toàn hệ thống cho User tham gia với tư cách Customer hoặc PT, qua JOIN Registration → Membership/Gym Trainer. Nếu một User có cả hai role, lịch học và lịch dạy của User đó cũng không được chồng nhau. Không chỉ kiểm tra trong Gym route hoặc một Membership.
- Lịch COMPLETED/CANCELLED không giữ chỗ. Lịch PENDING/CONFIRMED quá giờ vẫn là nghĩa vụ mở cho tới khi được xử lý; không tự coi là hoàn thành, không có timeout tự hủy trong bản đầu.
- Dời lịch: Customer/PT/Manager đúng quyền được dời PENDING/CONFIRMED chưa bắt đầu; kiểm tra lại điều kiện và overlap, giữ registration_id. Đề xuất chuyển về PENDING để PT/Manager xác nhận lại; không âm thầm giữ xác nhận cho giờ mới.
- Customer chỉ hủy PENDING/CONFIRMED trước start_time; PT phụ trách hoặc Manager được hủy lịch mở, kể cả quá giờ, với note lý do bắt buộc. Không hoàn tiền/quota hoặc cascade thẻ/Registration.
- Hoàn thành: chỉ PT phụ trách hoặc Manager đúng Gym, từ CONFIRMED sau end_time. Request complete lặp cùng trạng thái trả kết quả cũ, không tạo side effect. Customer không được tự đánh dấu hoàn thành; không tự hoàn tất Registration.
- Vắng mặt: bản đầu không có trạng thái NO_SHOW; PT/Manager xử lý CANCELLED kèm note, không khai COMPLETED cho một buổi không diễn ra.

| Action | Nguồn | Đích đề xuất | Actor / điều kiện |
| --- | --- | --- | --- |
| Tạo | Chưa có | PENDING | Customer chính chủ / PT phụ trách / Manager đúng Gym; thẻ/PT/Gym và thời gian hợp lệ |
| Xác nhận | PENDING | CONFIRMED | PT phụ trách / Manager; chưa bắt đầu, thẻ còn hợp lệ, kiểm tra lại điều kiện |
| Dời | PENDING/CONFIRMED | PENDING | Customer/PT/Manager đúng scope; lịch chưa bắt đầu; kiểm tra lại overlap và thời hạn |
| Hủy | PENDING/CONFIRMED | CANCELLED | Customer trước giờ; PT/Manager được xử lý quá giờ, phải có lý do |
| Hoàn thành | CONFIRMED | COMPLETED | PT/Manager; đã kết thúc; không xét availability để phủ nhận buổi đã diễn ra |
| Sửa lịch đã kết thúc | CANCELLED/COMPLETED | Không cho phép | Giữ lịch sử; các action ngoại lệ chưa mở |

Confirm/cancel cùng trạng thái đích có thể trả kết quả cũ sau xác minh scope, không sửa note/timestamp lần đầu. Reschedule với cùng start/end hiện tại trả kết quả cũ; request reschedule khác giờ là một thay đổi mới và phải thẩm định lại. Không tự thêm Idempotency-Key column hoặc bảng lịch sử trong PLAN-03; cơ chế chống POST lặp được cụ thể hóa ở APP-01 sau khi duyệt.

## 4. Đổi PT và kết thúc Registration (Q-07/Q-13 liên quan)

Đề xuất bản đầu **không sửa gym_trainer_id/membership_id trên Registration đã tạo**. Appointment xác định PT gián tiếp qua Registration; sửa row cũ có thể khiến toàn bộ lịch quá khứ bị quy cho PT mới. Trainer Review cũng dựa trên quan hệ đăng ký đã tồn tại, nên chỉ kiểm tra “chưa có lịch” là chưa đủ để chứng minh không có lịch sử cần giữ.

Quy trình đổi PT:

1. Customer/PT/Manager xử lý từng Appointment PENDING/CONFIRMED còn mở theo quyền hủy/hoàn thành; kể cả lịch đã quá giờ. Không tự cascade hủy lịch khi đổi PT.
2. Admin hoặc Manager đúng Gym kết thúc Registration ACTIVE → CANCELLED theo FEAT-PTR-005, note lý do bắt buộc, chỉ khi không còn Appointment mở.
3. Customer hoặc Manager tạo Registration mới trên Membership hợp lệ với PT mới ACTIVE cùng Gym, giữ nguyên row Registration/lịch/review cũ. Không tự chuyển Appointment sang Registration mới.

Endpoint `/assign` đang DRAFT sẽ chưa mở trong bản đầu theo đề xuất này; nếu cần đổi PT bằng một action, phải duyệt lại contract sao cho không viết đè quan hệ lịch sử. Không tự gán đích COMPLETED cho Registration từ việc hoàn thành một buổi; quyền/điều kiện complete Registration là một policy riêng chưa được catalog đặc tả.

Hủy/hoàn thành lịch cũ và kết thúc Registration kiểm tra quyền actor hiện hành; không bắt thẻ còn hạn hoặc PT target còn role/availability để cho Manager xử lý nghĩa vụ cũ. Không cho actor đã mất quyền tự tiếp tục thao tác.

Membership hết hạn: chặn tạo/xác nhận/dời lịch và đăng ký mới dựa trên ngày. Cho phép đọc history và PT/Manager xử lý các lịch mở cũ; không tự xóa/hủy Registration/Appointment hoặc trả tiền. Registration ACTIVE còn tồn tại vẫn chặn ngừng PT/Gym theo Q-13 đã chốt cho tới khi được kết thúc có chủ đích. Policy hủy Membership/refund thật vẫn chưa mở.

## 5. Kỹ thuật và ảnh hưởng schema

Không thêm bảng/cột/status, không cài package trong PLAN-03. Sau phê duyệt, PTR/APP phải đánh giá các index/guard cần bổ sung bằng migration mới; không sửa migration 0000–0002.

- Membership ownership và scope gián tiếp được kiểm tra trước trả dữ liệu; Customer không được suy đoán thẻ/lịch của User khác. PT chỉ xem User/Registration/Lịch được giao, Manager chỉ Gym được bổ nhiệm; Admin theo action catalog.
- Tái sử dụng GymScopeService cho actor nội bộ, bổ sung kiểm tra Customer và policy thẻ/giờ; không coi service register hiện có là đủ auth/validation cho API mới.
- Registration ACTIVE trùng Membership: nếu duyệt giới hạn §2, khóa Membership trước check/insert và cân nhắc partial unique index. Inventory legacy bằng read-only; migration gặp dữ liệu xung đột phải dừng, không tự CANCELLED/xóa.
- Appointment chống race: Gym parent lock trước, sau đó khóa tập User liên quan (actor/Customer/PT) theo thứ tự UUID nhất quán, rồi Membership/Registration và Appointment cần cập nhật. Khóa User bao quát mọi vai trò của cùng một người; sau chờ lock đọc lại scope/eligibility/overlap.
- Truy vấn overlap phải kiểm tra mọi Gym của các User liên quan; chỉ phục vụ kiểm tra nội bộ, không trả lịch/Gym khác trong payload conflict. Các request không chia sẻ người tham gia không dùng lock toàn hệ thống.
- Cùng thứ tự lock cho create/confirm/reschedule/cancel/complete và kết thúc Registration. Việc thay Membership/PT account/assignment cạnh tranh được kiểm tra dưới lock; không giữ DB transaction khi gọi mạng bên ngoài.
- Không thể thêm exclusion constraint chỉ theo registration_id rồi tuyên bố đã chống trùng Customer/PT toàn hệ thống: hai registration_id vẫn có thể cùng User. Nếu cần DB guard cho ghi ngoài API, phải thiết kế qua quan hệ gián tiếp, index và tests cụ thể trong APP-01.
- Timezone nghiệp vụ phải explicit tại service/query, không dựa CURRENT_DATE theo timezone DB. Các phép đổi ngày/range có tests sát nửa đêm và ranh giới ngày hết hạn.

## 6. Ma trận nghiệm thu dự kiến

Đây là test specification, **chưa phải các tests đã chạy**.

| Ca | Hành vi cần kiểm chứng |
| --- | --- |
| PT-A01 | Guest401; role/account/password gate hiện hành dù JWT còn claim cũ |
| PT-A02 | Customer không dùng Membership của người khác; safe ownership error |
| PT-A03 | Manager Gym A không đọc/tạo/sửa Registration/Lịch Gym B |
| PT-A04 | Membership/PT/Gym khác nhau, PT INACTIVE hoặc User/role PT bị revoke đều từ chối |
| PT-A05 | ACTIVE thẻ còn hạn mới đăng ký; PENDING/EXPIRED/CANCELLED và thẻ quá ngày đều bị chặn |
| PT-A06 | Thẻ demo đủ điều kiện dùng luồng PT; không phát sinh Payment/PT quota |
| PT-A07 | Availability xử lý đúng lựa chọn đã duyệt, độc lập status và lịch cũ |
| PT-A08 | Hai request Registration ACTIVE cùng Membership cạnh tranh: chỉ một thắng nếu duyệt giới hạn |
| PT-A09 | Payload lạ/status/customer/Gym tự khai và UUID/query sai bị validation |
| PT-A10 | PENDING giữ chỗ; Customer không confirm; PT/Manager confirm đúng scope |
| PT-A11 | Overlap Customer qua nhiều Membership/Gym và PT qua nhiều Registration đều bị chặn |
| PT-A12 | User mang hai role không trùng lịch học/dạy; hai request đồng thời không cùng commit |
| PT-A13 | Khoảng sát nhau end=start hợp lệ; PENDING/CONFIRMED conflict; COMPLETED/CANCELLED không giữ chỗ |
| PT-A14 | Timestamp thiếu offset, end≤start, start≤now và khoảng vượt ngày thẻ bị chặn |
| PT-A15 | Giờ Việt Nam sát nửa đêm; end đúng 00:00 ngày sau end_date; DB timezone khác không đổi kết quả |
| PT-A16 | Dời lịch kiểm tra lại overlap, giữ Registration và đưa về PENDING; loại lịch chính nó khỏi overlap |
| PT-A17 | Customer hủy trước giờ; PT/Manager xử lý lịch mở quá giờ với note; không tự cascade |
| PT-A18 | Complete chỉ từ CONFIRMED đã kết thúc; repeat không đổi timestamp/note/history |
| PT-A19 | Đổi PT giữ row cũ và lịch/review; kết thúc Registration có lịch mở trả conflict |
| PT-A20 | Membership hết hạn ngăn ghi lịch mới nhưng không che history hoặc ngăn xử lý lịch cũ |
| PT-A21 | Gym/PT shutdown và appointment/register cạnh tranh: không vượt guard sau khi chờ lock |
| PT-A22 | Legacy trùng/xung đột làm migration dừng; rollback giữ dữ liệu; lỗi DB an toàn |

## 7. Thứ tự triển khai sau khi duyệt

1. **PTR-01a:** DTO/repository và API đọc Registration của Customer/PT và catalog Admin/Manager; pagination và projection theo actor. Tests401/403/ownership/Gym A/B.
2. **PTR-01b:** validate và tạo Registration theo Q-04/Q-16 đã chọn; current role/assignment, ngày Việt Nam, giới hạn ACTIVE/concurrency và migration guard nếu cần. Cho phép thẻ demo theo policy đã duyệt, không phụ thuộc cổng tiền thật.
3. **PTR-02:** kết thúc Registration và quy trình đổi PT bảo toàn lịch sử theo §4; không mở assign ghi đè row cũ.
4. **APP-01a:** tạo/đọc/confirm Appointment, overlap và lock đồng thời trên cả Customer/PT; tests actual lock waiter.
5. **APP-01b:** reschedule/cancel/complete theo state machine; tests ranh giới giờ và retry.
6. **APP-02:** UI chọn thẻ → PT → Registration → đặt lịch/confirm/quản lý; quyền Customer/PT/Manager, loading/error/conflict, responsive và E2E với API/DB tạm thật.

Mỗi lát cắt chỉ triển khai action đã duyệt và giữ các Q còn lại mở. Q-08 Customer nhiều thẻ/Gym production vẫn độc lập; demo hiện cho nhiều thẻ. Giới hạn một Registration ACTIVE mỗi Membership không được suy thành giới hạn thẻ/Gym. Quyền sửa availability/profile/Working Schedule (TPR-01, Q-16/Q-18) chưa được chốt bởi đề xuất “availability chỉ hiển thị” cho đăng ký.

## 8. Kết quả lượt đặc tả PLAN-03 ban đầu

Đã đọc schema/service/guard hiện có và Domain/Feature/API; viết chính sách để duyệt, ma trận actor/state machine, các gap và 22 ca nghiệm thu dự kiến. Chỉ thêm tài liệu và cập nhật plan; chưa viết runtime/migration, chưa chạy DB hoặc tự cập nhật Q thành CLOSED.

Verification: kiểm tra link, IDs trong ma trận, whitespace/diff và đối chiếu field/status với schema. Architecture impact của lượt docs: None; các thay đổi policy/API/index dự kiến phải được duyệt trước triển khai tương ứng.

## 9. Chính sách được duyệt ngày 2026-10-09

Người dùng yêu cầu áp dụng và thực hiện đề xuất đã xem. Phần này thay thế nội dung trái nhau ở bản đề xuất phía trên:
- NOT_ACCEPTING chặn tạo Registration mới; ACCEPTING/ALMOST_FULL cho phép. Không chặn lịch của Registration đã tồn tại theo availability. PT chính chủ hoặc Manager ACTIVE đúng Gym đổi availability. Không mặc định đổi dữ liệu PT demo đang có.
- Customer hủy lịch trước giờ bắt đầu phải nhập lý do; PT/Manager cũng bắt buộc lý do, được xử lý lịch quá giờ.
- Các chính sách thẻ ACTIVE còn hạn (gồm demo), một Registration ACTIVE/thẻ, bảo toàn lịch sử khi đổi PT, PENDING giữ chỗ và cần PT/Manager xác nhận, chống trùng toàn hệ thống, dời trước giờ về PENDING, complete sau kết thúc và xử lý nghĩa vụ cũ áp dụng theo §2–§5.
- Working Schedule chỉ tham khảo. Không phí hủy, quota, thanh toán PT, NO_SHOW mới hoặc tự cascade. PENDING quá giờ cần PT/Manager xử lý thủ công trong bản đầu; không scheduler tự hủy.
- Q-04/Q-06/Q-07 chốt cho luồng này; Q-16 chỉ chốt availability. Profile/social và Q-18 ghi lịch làm việc vẫn OPEN; Q-08 Customer production và tiền thật vẫn OPEN.

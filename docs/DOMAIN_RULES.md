# Multi-Gym Platform — Domain Rules

## 1. Mục đích và phạm vi

Đặc tả nghiệp vụ theo ERD 21 bảng tại [DATABASE_SPEC.md](DATABASE_SPEC.md), tuân thủ [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) và [PROJECT_RULES.md](PROJECT_RULES.md). Membership là nghiệp vụ chính; PT là dịch vụ bổ sung, Consultation là nhánh tùy chọn. Bao gồm Gallery, PT Profile/Social/Availability/Working Schedule, Gym/Trainer Review, Payment và quản lý/báo cáo thiết bị. Không thêm entity ngoài 21 bảng.

Tên field và PK lấy theo Database Spec. Status vật lý đã có trong migration 0000/0001 dưới dạng VARCHAR + CHECK; luật chưa đủ quyết định được ghi Q-01–Q-19, schema đã có không có nghĩa API/UI đã được triển khai. Các bảng kỹ thuật không thay thế kiểm tra quyền nghiệp vụ.

## 2. Actors và quyền theo phạm vi

| Actor | Quyền / phạm vi |
| :--- | :--- |
| Guest | Xem Gym, gallery, Package, PT Profile và review VISIBLE; gửi Consultation không cần đăng nhập; đăng ký tài khoản và đăng nhập. Không có role lưu trong DB. |
| Customer | Mua gói qua Payment; xem Payment/Membership của mình; đăng ký PT bằng Membership của mình; xem/đặt lịch và gửi báo cáo trong scope được cấp; gửi Consultation và review đúng quan hệ sử dụng. |
| PT | Có role PT và gym_trainers hợp lệ; chỉ xem học viên và thao tác lịch thuộc phân công của mình. |
| Manager | Có role MANAGER và gym_managers ACTIVE; quản lý thông tin Gym, PT, Package, hội viên, thiết bị, report và xử lý Consultation của Gym đó; không sửa/xóa review. |
| Admin | Quản lý tài khoản, danh mục role, Gym và phân công Manager toàn hệ thống; vẫn phải xác thực và kiểm tra quan hệ cùng Gym; chỉ ẩn review vi phạm kèm audit, không xóa vật lý. |

Staff là người xử lý tư vấn trong nghiệp vụ mới nhưng chưa có role/assignment trong schema; triển khai quyền Staff phụ thuộc Q-14, không tự tạo role.

Role CUSTOMER hiện được cấp khi tạo tài khoản; tư cách thành viên của một Gym được xác định bằng Membership, không bằng role. Điểm tạo/đăng nhập tài khoản trong checkout chờ Q-17.

Role xác định quyền hành động, không xác định Gym. Quyền truy cập gồm role + phân công/scope + ownership + trạng thái. Guest xem dữ liệu công khai không có nghĩa được đọc dữ liệu nội bộ của Gym.

## 3. Danh mục 21 thực thể

| Bảng | Định danh | Trách nhiệm nghiệp vụ |
| :--- | :--- | :--- |
| `users` | `user_id` | Tài khoản email/password; phone, email_verified_at và must_change_password. Không lưu mật khẩu thô. |
| `user_profiles` | `profile_id` | Hồ sơ full_name, ngày sinh, giới tính, address, avatar_url. User tối đa một Profile. |
| `roles` | `role_id` | role_name duy nhất: ADMIN, MANAGER, PT, CUSTOMER. |
| `user_roles` | `user_id, role_id` | Gán role cho User; assigned_at ghi thời điểm, không gắn Gym. |
| `gyms` | `gym_id` | Cơ sở có gym_name, thông tin liên hệ, vị trí, logo_url, giờ mở/đóng. |
| `gym_managers` | `gym_manager_id` | User được quản lý Gym nào; cặp Gym/User duy nhất, không dùng các dòng trùng cặp làm lịch sử. |
| `gym_trainers` | `gym_trainer_id` | PT thuộc Gym nào; specialization, experience_years, bio, joined_at, availability độc lập status; cặp Gym/User duy nhất. |
| `packages` | `package_id` | Sản phẩm của Gym với package_name, duration_days và giá hiện tại; không chứa quota PT. |
| `payments` | `payment_id` | Ghi nhận Customer thanh toán cho Package tại Gym; mã giao dịch duy nhất khi có giá trị. |
| `memberships` | `membership_id` | Hợp đồng sở hữu bởi User, thuộc Gym và Package; purchase_price giữ giá mua, payment_id tùy chọn và duy nhất khi có. |
| `pt_registrations` | `registration_id` | Liên kết Membership với Gym Trainer cùng Gym; không trực tiếp lưu Customer/Gym hoặc bộ đếm buổi. |
| `pt_appointments` | `appointment_id` | Ca tập thuộc Registration; có start_time, end_time, status, note; Customer/PT/Gym suy ra qua quan hệ. |
| `equipment_types` | `equipment_type_id` | Danh mục loại thiết bị toàn hệ thống, không phải máy cụ thể. |
| `equipments` | `equipment_id` | Máy thực tế thuộc Gym và loại thiết bị; equipment_code duy nhất trong Gym; condition tách biệt status. |
| `gym_reports` | `report_id` | Phản ánh với title/content, loại report, một ảnh; tùy chọn thiết bị cùng Gym; ghi người và kết quả xử lý. |
| `gym_images` | `image_id` | Gallery thực tế của Gym, caption và display_order; không thay logo_url. |
| `consultation_requests` | `consultation_request_id` | Yêu cầu tư vấn của Guest/Customer; user_id nullable, liên hệ và người xử lý. |
| `pt_social_links` | `social_link_id` | Platform/url tham khảo và liên hệ theo Gym Trainer, không phải social network. |
| `pt_working_schedules` | `schedule_id` | Khung giờ làm việc theo thứ, tách biệt Appointment cụ thể. |
| `gym_reviews` | `gym_review_id` | Customer đánh giá đúng Gym, rating/comment và audit ẩn. |
| `trainer_reviews` | `trainer_review_id` | Customer đánh giá đúng Gym Trainer qua quan hệ sử dụng; audit ẩn. |

## 4. Gym Scope Matrix

| Phạm vi | Bảng / đường xác định |
| :--- | :--- |
| System | users, user_profiles, roles, user_roles, equipment_types |
| Gốc | gyms.gym_id |
| Gym trực tiếp | gym_managers, gym_trainers, packages, payments, memberships, equipments, gym_reports, gym_images, consultation_requests, gym_reviews qua gym_id |
| Registration | pt_registrations.membership_id → memberships.gym_id; đối chiếu gym_trainers.gym_id qua gym_trainer_id |
| Hồ sơ/lịch/review PT | pt_social_links, pt_working_schedules, trainer_reviews → gym_trainers.gym_id |
| Appointment | pt_appointments.registration_id → Registration → Membership/Gym Trainer |
| Customer sở hữu PT | Registration → memberships.user_id; Appointment đi qua Registration |
| PT được phân công | Registration → gym_trainers.user_id; Appointment đi qua Registration |

Backend phải đối chiếu route Gym với Gym nguồn và quyền hiện tại trong DB. Không lấy user_id/gym_id/role từ request làm bằng chứng phân quyền. Admin có system scope nhưng không được tạo liên kết chéo Gym sai dữ liệu.

## 5. Quan hệ và luồng chính

ERD đầy đủ ở [DATABASE_SPEC.md §5](DATABASE_SPEC.md#5-sơ-đồ-quan-hệ-thực-thể-erd).

- User có tối đa một Profile; User N–N Role qua user_roles.
- User/Gym 1–N các phân công gym_managers và gym_trainers. Cardinality không tự cho phép nhiều phân công ACTIVE: giữ giới hạn Manager ở INV-010; PT tối đa một Gym ACTIVE theo Q-08 đã chốt; Customer đa Gym còn OPEN.
- Gym 1–N Package; User/Gym/Package 1–N Payment và Membership.
- Payment 1–0..1 Membership; Membership có thể không liên kết Payment về mặt dữ liệu, nghiệp vụ cấp thẻ thủ công chờ Q-03.
- Membership và Gym Trainer 1–N Registration; Registration 1–N Appointment.
- Equipment Type và Gym 1–N Equipment; Equipment 1–N Report, mỗi Report có thể không có Equipment.
- User 1–N Report qua người gửi user_id và riêng qua người xử lý resolved_by (tùy chọn).

**Gym Detail:** thông tin Gym, gallery, địa chỉ/vị trí, giờ hoạt động, mô tả/tiện ích hiện có, Package, review VISIBLE và PT thuộc Gym. Chỉ hai CTA chính: **Đăng ký ngay** và **Đặt lịch tư vấn**. Không thêm bảng tiện ích/chứng chỉ khi chưa có yêu cầu.

**Mua gói:** Guest chọn Gym → chọn Package → xác nhận → thanh toán → Membership → Customer của Gym. Không có bước chọn PT hoặc Consultation bắt buộc. Về xử lý dữ liệu: chọn Package → Payment PENDING → xác nhận thành công đáng tin cậy → SUCCESS → tạo tối đa một Membership đúng User/Gym/Package, lưu purchase_price. Không tự lấy giá Package hiện tại để sửa giá lịch sử.

**Tư vấn:** Guest/Customer → chọn Gym → nhập full_name, phone, email tùy chọn, thời gian mong muốn và content → PENDING → Manager/Staff liên hệ → cập nhật trạng thái. Thời gian mong muốn không phải booking đã xác nhận. Guest có user_id NULL; phiên hợp lệ lấy user_id từ server.

**Đăng ký PT:** sau Membership → xem PT cùng Gym/Profile → liên hệ qua thông tin công khai/social links → trao đổi nhu cầu, chi phí, lịch → thống nhất → tạo Registration. Không có giá/PT Package/PT Payment cố định. Appointment lưu buổi tập cụ thể đã thống nhất, có end_time > start_time. Working Schedule chỉ là khung làm việc tham khảo, không tự sinh Appointment hoặc giữ chỗ. Điều kiện sử dụng thẻ và trạng thái lịch theo Q-04/Q-06.

**Thiết bị:** Manager chọn loại dùng chung → tạo từng máy cho Gym mình → quản lý condition/status. Không thêm lịch sử bảo trì, kho phụ tùng.

**Báo cáo:** Customer chọn loại; EQUIPMENT chọn máy cùng Gym → nhập title/content/image_url → PENDING → Manager tiếp nhận IN_PROGRESS → RESOLVED, ghi resolved_by/resolved_at/resolution_note. Các loại khác có thể không chọn máy.

## 6. Bất biến nghiệp vụ

| Mã | Quy tắc |
| :--- | :--- |
| INV-001 | Package và Equipment thuộc đúng một Gym. |
| INV-002 | Payment và Membership có cùng Gym với Package được tham chiếu. |
| INV-003 | Có Payment nguồn thì Membership khớp User/Gym/Package; một Payment tối đa sinh một Membership, kể cả xử lý đồng thời/lặp lại. |
| INV-004 | Membership và Gym Trainer trong Registration cùng Gym; PT đang có phân công hợp lệ. |
| INV-005 | Appointment thuộc Registration hợp lệ và end_time > start_time; không đặt lịch trong quá khứ. |
| INV-006 | Phải bảo vệ trùng lịch Customer/PT và race condition; phạm vi, trạng thái giữ chỗ và cơ chế cụ thể chờ Q-06. |
| INV-007 | purchase_price ghi giá mua lịch sử, không thay đổi theo Package.price. Quy tắc quota cũ được thay thế bằng vấn đề Q-05, không còn là công thức thực thi. |
| INV-008 | Report tối đa một image_url; khi gắn Equipment phải cùng Gym; người xử lý có quyền tại Gym đó. |
| INV-009 | Role không thay thế Scope/Ownership; mọi thao tác đọc/ghi phải kiểm tra backend. |
| INV-010 | Mỗi Gym tối đa một Manager ACTIVE và mỗi Manager tối đa một Gym ACTIVE; UNIQUE cặp không đủ bảo vệ giới hạn này. |
| INV-011 | User có tối đa một Profile; role_name và email duy nhất; không gán trùng cặp User/Role. |
| INV-012 | Không trùng cặp Gym/User trong mỗi bảng phân công hoặc Gym/equipment_code trong equipments. |
| INV-013 | Chọn PT và Consultation không bắt buộc khi đăng ký Gym; Membership không phụ thuộc PT Registration. |
| INV-014 | trainer_status ACTIVE/INACTIVE khác availability ACCEPTING/ALMOST_FULL/NOT_ACCEPTING; PT ACTIVE vẫn có thể NOT_ACCEPTING. |
| INV-015 | Guest gửi Consultation không cần tài khoản; không nhận user_id/assigned_to/status từ public request. |
| INV-016 | Gym Review kiểm tra Customer → Membership → Gym; Trainer Review kiểm tra Customer → Membership → PT Registration → Gym Trainer cùng Gym ở backend. |
| INV-017 | Gym/Manager/Staff/PT không sửa/xóa review/rating; không DELETE vật lý review trong nghiệp vụ thường, kể cả Admin. |
| INV-018 | Admin ẩn review vi phạm bằng VISIBLE → HIDDEN, ghi hidden_at/hidden_by/hidden_reason và giữ nội dung gốc. Public chỉ trả VISIBLE; không lộ audit riêng tư. |
| INV-019 | Working Schedule khác Appointment; không tự thêm PT Pricing/Package/Payment, chat realtime, social network, marketplace độc lập, recommendation, gym comparison hoặc booking realtime phức tạp. |

## 7. Status và lifecycle

Danh sách duy nhất tại [DATABASE_SPEC.md §7](DATABASE_SPEC.md#7-danh-mục-trạng-thái-status-allowlist); dùng VARCHAR + CHECK như schema hiện tại; không tạo native enum trùng. Không dùng cùng nhãn trạng thái để suy ra cùng ý nghĩa ở các bảng.

Luồng đã mô tả: Payment PENDING → SUCCESS → sinh Membership; Report PENDING → IN_PROGRESS → RESOLVED và ghi kết quả. FAILED/CANCELLED/REFUNDED, REJECTED và các lifecycle còn lại có giá trị trong schema nhưng điều kiện chuyển đầy đủ cần chốt theo §9. Không suy ra tự động ACTIVE Membership hoặc COMPLETED Registration từ các nhãn này.

Tài khoản Manager/PT được cấp mật khẩu tạm phải có must_change_password; đổi thành công thì bỏ cờ. email_verified_at NULL nghĩa chưa xác minh, không có is_verified. Chưa tự mở luồng gửi email/token lưu trữ mới.

Availability có default vật lý NOT_ACCEPTING; working schedule có status ACTIVE/INACTIVE và end_time > start_time. Đây là convention hiện tại, không phải bằng chứng số chỗ trống. Consultation có PENDING/CONTACTED/COMPLETED/CANCELLED; quyền và ma trận chuyển đầy đủ theo Q-19.

Review mới VISIBLE; HIDDEN phải có đủ audit. Trigger hiện tại chỉ cho hide một lần, không sửa nội dung bởi bất kỳ actor nào hoặc unhide. Điều kiện review hiện triển khai: Membership ACTIVE/EXPIRED và đã tới start_date; Trainer Registration ACTIVE/COMPLETED. Đây là hiện trạng kỹ thuật cần đối chiếu Q-15, không tự suy ra mọi ACTIVE đã hoàn thành buổi tập. PT service hiện yêu cầu Membership ACTIVE trong thời hạn, PT ACTIVE cùng Gym; Q-04/Q-16 còn mở.

## 8. Ma trận hành động

| Dữ liệu | Customer | PT | Manager | Admin |
| :--- | :--- | :--- | :--- | :--- |
| Hồ sơ/tài khoản cá nhân | Xem/sửa của mình | Của mình | Của mình | Của mình; quản trị status User |
| Gym/Package/PT công khai | Xem | Xem | Xem; quản lý Gym mình | Quản lý toàn hệ thống |
| Phân công Manager | — | — | Xem Gym mình | Tạo/gán/thu hồi, giữ INV-010 |
| Payment | Tạo PENDING, xem của mình | — | Quyền tài chính chờ Q-01/Q-02 | Quyền tài chính chờ Q-01/Q-02 |
| Membership | Xem của mình | Qua nghiệp vụ học viên được giao, không danh sách toàn Gym | Xem Gym mình; ghi chờ Q-02/Q-03 | Xem; ghi chờ Q-02/Q-03 |
| Registration | Đăng ký/xem của mình | Xem được giao | Xem/tạo trong Gym; đổi PT chờ Q-07 | Quản trị theo scope và policy |
| Appointment | Xem/đặt/dời/hủy của mình theo Q-06 | Xem/đặt/quản lý được giao theo Q-06 | Xem/đặt/quản lý Gym theo Q-06 | Giám sát; không tự thêm action ngoài API |
| Equipment | Tra cứu để gửi report theo scope | Không mặc định quyền sửa | Thêm/sửa máy của Gym | Quản trị theo scope |
| Equipment Type | Đọc phục vụ luồng hợp lệ | Đọc phục vụ luồng hợp lệ | Đọc danh mục | Quyền ghi chờ Q-09 |
| Report | Tạo/xem của mình | — | Xem/tiếp nhận/giải quyết Gym mình | Giám sát/xử lý theo API |
| Consultation | Gửi yêu cầu; xem riêng chưa đặc tả | Không mặc định quyền xem | Tiếp nhận/xử lý đúng Gym | Không tự mở quyền đọc liên hệ toàn hệ thống ngoài policy Q-14/Q-19 |
| Working Schedule / Social / Availability | Xem phần công khai | Khai báo lịch mình; quyền profile theo Q-16/Q-18 | Quyền thay PT chờ Q-16/Q-18 | Không mặc định sửa thay PT |
| Gym/Trainer Review | Tạo khi đủ điều kiện, xem VISIBLE | Xem VISIBLE, không sửa/xóa | Xem VISIBLE, không sửa/xóa | Xem audit theo scope quản trị; ẩn vi phạm, không sửa nội dung/xóa |

Guest cũng được xem dữ liệu public và gửi Consultation; không được xem danh sách liên hệ của người khác.

## 9. Câu hỏi mở và phạm vi chặn

Đây là danh mục câu hỏi mở dùng chung cho toàn bộ docs. Ghi nhận UNKNOWN không có nghĩa được tự chọn policy. Chỉ chặn tác vụ phụ thuộc, các phần không liên quan tiếp tục triển khai khi được yêu cầu.

| Mã | Vấn đề | Cần quyết định | Phần phụ thuộc |
| :--- | :--- | :--- | :--- |
| Q-01 | Thanh toán và giá lịch sử | Chọn payment_method, nguồn xác nhận thành công, phạm vi transaction_code, cơ chế chống xử lý lặp và chốt giá khi Package đổi giá trong lúc Payment PENDING. Không nhận SUCCESS hoặc amount đáng tin cậy từ frontend. | Payment → Membership |
| Q-02 | Kích hoạt và hoàn tiền | Membership sau SUCCESS bắt đầu PENDING hay ACTIVE, cách tính ngày, ảnh hưởng của REFUNDED/FAILED/CANCELLED; ai có quyền hủy hoặc hoàn tiền? | Ghi Payment, tạo/kích hoạt Membership |
| Q-03 | Membership không qua Payment | Có cho phép cấp thẻ với payment_id NULL không, ai được cấp và purchase_price lấy từ đâu? Nullable không tự mở luồng này. | Cấp thẻ thủ công |
| Q-04 | Điều kiện Membership cho PT | Trạng thái/thời hạn Membership nào được đăng ký và đặt lịch; xử lý Membership hết hạn/hủy khi còn lịch tương lai. | Tạo Registration/Appointment |
| Q-05 | Quota PT — ngoài phạm vi hiện tại | Không có quota trong Gym Package, không đếm buổi để áp hạn mức/PT pricing. Không tự mở lại thiết kế quota; chỉ xét khi có yêu cầu mới. | Không chặn đăng ký PT vì quota |
| Q-06 | Lịch hẹn và chống trùng | PENDING hay CONFIRMED giữ chỗ? Ai xác nhận? Phạm vi trùng lịch cùng Gym hay toàn hệ thống, thời hạn hủy/dời, trường hợp vắng mặt và điều kiện hoàn thành? Chọn cơ chế chống race condition với scope gián tiếp. | Tạo/xác nhận/dời/hủy/hoàn thành Appointment |
| Q-07 | Đổi PT và lịch sử | Cách đổi gym_trainer_id khi đã có lịch sử hoặc lịch tương lai; tránh khiến lịch cũ bị quy cho PT mới do quan hệ gián tiếp. Có cho đổi Membership nguồn không? | Reassign Registration |
| Q-08 | Đa Gym | ĐÃ CHỐT phần PT: mỗi User PT tối đa một phân công ACTIVE trên toàn hệ thống; chuyển Gym phải ngừng phân công cũ trước, không tự revoke và không xóa lịch sử. Customer nhiều Membership ACTIVE ở nhiều Gym vẫn OPEN; không suy diễn từ quyết định PT. | Tạo hợp đồng/phân công chéo Gym |
| Q-09 | Danh mục và thiết bị | Ai quản trị equipment_types, thiết bị nào Customer được chọn khi báo cáo, chính sách ngừng dùng/chuyển Gym khi đã có report? | Ghi equipment_types, chuyển Gym thiết bị |
| Q-10 | Tài khoản và ảnh | ĐÃ CHỐT provisioning: backend sinh mật khẩu tạm, chỉ lưu hash, không log/lưu plaintext; khi chưa có delivery service chỉ trả temporary_password một lần trong response provisioning cho actor có quyền, không có API đọc lại. Admin provision Manager/PT; Manager có role và assignment ACTIVE đúng Gym được provision PT. must_change_password=true; không thêm email verification gate. Upload/storage vẫn OPEN; không tự chọn provider/thêm bảng. | Provisioning đã có quyết định; upload còn chờ |
| Q-11 | Constraints vật lý — đã có baseline | Migration 0000/0001 và Database Spec ghi VARCHAR + CHECK, FK/index/trigger. Không còn chặn vì lựa chọn enum chưa chốt. Chống trùng Appointment vẫn thuộc Q-06, không được coi là đã giải quyết. | Đối chiếu schema khi triển khai |
| Q-12 | Lịch sử phân công Manager | ĐÃ CHỐT: giữ giới hạn ACTIVE và UNIQUE cặp. Revoke ACTIVE → INACTIVE, không xóa. Tái bổ nhiệm dùng lại bản ghi INACTIVE → ACTIVE, cập nhật assigned_at thành thời điểm bắt đầu lần ACTIVE gần nhất, giữ created_at và ID. Không tự revoke phân công xung đột, không thêm history table; không phải full audit history. | Tái bổ nhiệm Manager đã có quyết định |
| Q-13 | Chuyển trạng thái khác | ĐÃ CHỐT phần Gym/PT theo §10 bên dưới: chỉ ngừng khi hết nghĩa vụ mở, không cascade. Reject report, hủy Registration/Membership và các lifecycle khác vẫn OPEN; không dùng endpoint status để bỏ qua nghiệp vụ. | Các action chuyển trạng thái chưa đủ policy |
| Q-14 | Staff và xử lý Consultation | Chưa có STAFF role/assignment. Xác nhận cách cấp quyền và scope Staff; Manager đúng Gym là actor đã có. Không tự thêm bảng/role. | Phần quyền Staff/assignment |
| Q-15 | Review eligibility và vòng đời | Chốt bằng chứng đã sử dụng, trường hợp hủy, số review mỗi đối tượng, quyền tác giả chỉnh nội dung và khôi phục ẩn. Hiện trigger bất biến, không unhide, không UNIQUE theo user/target; Membership ACTIVE/EXPIRED đã bắt đầu và PT Registration ACTIVE/COMPLETED. | Mở API ghi review và thay đổi trigger nếu được yêu cầu |
| Q-16 | Availability và quản trị profile PT | NOT_ACCEPTING có chặn đăng ký mới hay chỉ hiển thị? Ai đổi availability/social/profile ngoài PT chính chủ? Service hiện chưa chặn theo availability. | Đăng ký PT, API ghi profile |
| Q-17 | Tài khoản trong checkout | Role CUSTOMER được cấp khi đăng ký tài khoản, Membership mới tạo tư cách thành viên Gym. Chốt thời điểm login/register trước thanh toán; không tự xây anonymous payment vì payments.user_id NOT NULL. | UX checkout Guest và Payment |
| Q-18 | Working Schedule | PT khai báo theo thứ; chốt timezone, overlap, khung qua nửa đêm và quan hệ với Appointment. Hiện end_time > start_time, không timezone riêng hoặc exclusion chống overlap; không tự sửa lịch hẹn khi đổi lịch làm việc. | API ghi lịch và hiển thị giờ |
| Q-19 | Vận hành Consultation / Gallery | Chốt transition/cancel/reassign Consultation, ngày mong muốn và thời gian phản hồi; quyền ghi/gallery/upload theo Q-10. Không biến preferred_date/time thành slot booking hoặc tự thêm notification. | API quản trị và upload |

## 10. Tiêu chí kiểm tra tài liệu

- Đúng 21 bảng; không dùng cột hoặc trạng thái cũ như hợp đồng hiện hành.
- Scope gián tiếp và quan hệ nullable được phản ánh nhất quán ở API/UI.
- Mỗi câu hỏi chưa quyết định có mã Q dùng chung; không công bố toàn bộ nghiệp vụ sẵn sàng triển khai.
- Không thêm code, migration hoặc bảng để tự giải quyết câu hỏi mở.


## 10. Q-08 PT / Q-13 Gym và PT — quyết định đã chốt

- Q-08: User PT có tối đa một assignment ACTIVE toàn hệ thống. Chuyển Gym yêu cầu ngừng assignment cũ trước; giữ bản ghi cũ. Không giới hạn lịch sử INACTIVE. Không tự thay đổi quyền Customer đa Gym.
- Admin ngừng Gym ACTIVE → INACTIVE chỉ khi không còn Payment PENDING, Membership PENDING/ACTIVE, PT Registration ACTIVE, Appointment PENDING/CONFIRMED tại Gym. Lịch đã quá giờ nhưng chưa kết thúc vẫn chặn. Trạng thái thẻ là căn cứ, không tự bỏ qua vì end_date đã qua.
- Gym INACTIVE không công khai; chặn mua gói, đăng ký PT, đặt lịch, tạo/kích hoạt phân công mới. Giữ account, role, assignment và lịch sử. Admin/Manager còn scope được đọc nội bộ. Không tự hoàn tiền/hủy/chuyển dữ liệu. Chưa có cơ chế đóng khẩn cấp hoặc tạm dừng hợp đồng.
- Admin hoặc Manager có role và assignment ACTIVE đúng Gym ngừng phân công PT khi không còn PT Registration ACTIVE hoặc Appointment PENDING/CONFIRMED gắn với assignment đó. Không khóa User, xóa role/assignment, chuyển học viên hoặc sửa availability.
- Admin kích hoạt lại Gym; không khôi phục hợp đồng/lịch đã kết thúc. Admin/Manager ACTIVE đúng Gym kích hoạt lại PT khi Gym ACTIVE, User ACTIVE, có role PT, không có assignment ACTIVE tại Gym khác. Dùng lại ID, giữ created_at/joined_at và các trường hồ sơ/availability.
- Conflict trả 409, kèm số lượng nghĩa vụ mở nếu có. Kiểm tra và đổi trạng thái phải an toàn trước ghi đồng thời. Không có force bypass.
- Quyết định này không chốt Q-01/Q-02 về hoàn tiền/thanh toán, Q-06/Q-07 về hủy/đổi lịch/PT, Q-16 availability hoặc phần Q-13 còn lại.

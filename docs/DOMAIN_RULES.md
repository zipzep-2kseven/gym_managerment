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

Review mới VISIBLE; HIDDEN phải có đủ audit. Trigger hiện tại chỉ cho hide một lần, không sửa nội dung bởi bất kỳ actor nào hoặc unhide. Điều kiện review hiện triển khai: Membership ACTIVE/EXPIRED và đã tới start_date; Trainer Registration ACTIVE/COMPLETED. Đây là baseline trigger 0001. API review áp dụng thêm quyết định Q-15 ngày 2026-10-10 ở cuối tài liệu: PT cần Appointment COMPLETED và mỗi User/target chỉ một review; không suy ra ACTIVE đã tập. PT workflow/Q-04/Q-16 theo các quyết định mới đã chốt.

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
| Q-04 | CLOSED — điều kiện Membership cho PT | ACTIVE và còn hạn theo ngày Việt Nam, gồm thẻ demo; toàn bộ lịch trong ngày thẻ; hết hạn không xóa history/ngăn xử lý nghĩa vụ cũ. Xem quyết định 2026-10-09. | Đã chốt cho PTR/APP |
| Q-05 | Quota PT — ngoài phạm vi hiện tại | Không có quota trong Gym Package, không đếm buổi để áp hạn mức/PT pricing. Không tự mở lại thiết kế quota; chỉ xét khi có yêu cầu mới. | Không chặn đăng ký PT vì quota |
| Q-06 | CLOSED — lịch hẹn và chống trùng | PENDING/CONFIRMED giữ chỗ toàn hệ thống Customer/PT; PT/Manager confirm; dời trước giờ về PENDING; hủy có lý do; complete sau end; vắng mặt CANCELLED. Xem PLAN-03 §9/API §22. | Đã chốt cho APP |
| Q-07 | CLOSED — đổi PT và lịch sử | Không đổi Membership/PT nguồn; xử lý lịch mở, kết thúc đăng ký cũ rồi tạo mới; giữ lịch/review. Không mở assign ghi đè. | Đã chốt cho PTR-02 |
| Q-08 | Đa Gym | ĐÃ CHỐT phần PT: mỗi User PT tối đa một phân công ACTIVE trên toàn hệ thống; chuyển Gym phải ngừng phân công cũ trước, không tự revoke và không xóa lịch sử. Customer nhiều Membership ACTIVE ở nhiều Gym vẫn OPEN; không suy diễn từ quyết định PT. | Tạo hợp đồng/phân công chéo Gym |
| Q-09 | Danh mục và thiết bị | CHỐT demo 2026-10-10: không triển khai danh mục/QL máy; Customer thẻ ACTIVE còn hạn báo nội dung + ảnh tùy chọn, không chọn máy; giữ schema/dữ liệu thiết bị. | Equipment API/UI hoãn khỏi demo; Report không phụ thuộc EQP |
| Q-10 | Tài khoản và ảnh | ĐÃ CHỐT provisioning: backend sinh mật khẩu tạm, chỉ lưu hash, không log/lưu plaintext; khi chưa có delivery service chỉ trả temporary_password một lần trong response provisioning cho actor có quyền, không có API đọc lại. Admin provision Manager/PT; Manager có role và assignment ACTIVE đúng Gym được provision PT. must_change_password=true; không thêm email verification gate. Upload report/gallery demo đã chốt; storage production còn OPEN; không tự chọn provider/thêm bảng. | Provisioning đã có quyết định; upload còn chờ |
| Q-11 | Constraints vật lý — đã có baseline | Migration 0000/0001 và Database Spec ghi VARCHAR + CHECK, FK/index/trigger. Không còn chặn vì lựa chọn enum chưa chốt. Chống trùng Appointment vẫn thuộc Q-06, không được coi là đã giải quyết. | Đối chiếu schema khi triển khai |
| Q-12 | Lịch sử phân công Manager | ĐÃ CHỐT: giữ giới hạn ACTIVE và UNIQUE cặp. Revoke ACTIVE → INACTIVE, không xóa. Tái bổ nhiệm dùng lại bản ghi INACTIVE → ACTIVE, cập nhật assigned_at thành thời điểm bắt đầu lần ACTIVE gần nhất, giữ created_at và ID. Không tự revoke phân công xung đột, không thêm history table; không phải full audit history. | Tái bổ nhiệm Manager đã có quyết định |
| Q-13 | Chuyển trạng thái khác | ĐÃ CHỐT User account status theo ADM-01 và phần Gym/PT theo §10 bên dưới: chỉ ngừng khi hết nghĩa vụ mở, không cascade. Reject report, hủy Registration/Membership và các lifecycle khác vẫn OPEN; không dùng endpoint status để bỏ qua nghiệp vụ. | Các action chuyển trạng thái chưa đủ policy |
| Q-14 | Staff và xử lý Consultation | Chưa có STAFF role/assignment. Xác nhận cách cấp quyền và scope Staff; Manager đúng Gym là actor đã có. Không tự thêm bảng/role. | Phần quyền Staff/assignment |
| Q-15 | Review eligibility và vòng đời | ĐÃ CHỐT ngày 2026-10-10: thẻ đã bắt đầu; PT cần buổi COMPLETED; một review mỗi User/target kể cả HIDDEN; không sửa/xóa/unhide. Xem quyết định Q-15 cuối tài liệu. | REV-01; REV-02 moderation UI riêng |
| Q-16 | CHỐT — availability và profile/social | Availability giữ policy hiện có; TPR-01 ngày 2026-10-10: PT tự sửa bio/links, Manager đúng Gym sửa chuyên môn/kinh nghiệm; tên/ảnh dùng profile hiện có. | Đã có quyết định triển khai |
| Q-17 | Tài khoản trong checkout | Role CUSTOMER được cấp khi đăng ký tài khoản, Membership mới tạo tư cách thành viên Gym. Chốt thời điểm login/register trước thanh toán; không tự xây anonymous payment vì payments.user_id NOT NULL. | UX checkout Guest và Payment |
| Q-18 | CHỐT — giờ làm việc tham khảo | PT tự khai báo nhiều ca/ngày, Asia/Ho_Chi_Minh, không overlap/qua nửa đêm; adjacent hợp lệ. Manager xem; không chặn booking ngoài ca/tự sửa Appointment. | TPR-01 theo quyết định 2026-10-10 |
| Q-19 | Vận hành Consultation / Gallery | CHỐT Consultation tối giản ngày 2026-10-10: Manager-only, PENDING→CONTACTED→COMPLETED; cancel kèm lý do, nguyện vọng liên hệ dạng chữ, không reassign/slot/SLA/notification. Gallery demo đã duyệt; storage production còn OPEN. | Storage production còn chờ |

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


## Thanh toán demo — yêu cầu người dùng ngày 2026-10-08

Người dùng yêu cầu tạm dùng mock: bấm thanh toán với phương thức nào cũng mô phỏng thành công để demo, chưa tích hợp thanh toán thật. Đây là ngoại lệ có phạm vi rõ ràng cho luồng demo, không chốt gateway hoặc chính sách thanh toán thật.

- Backend chỉ bật ghi thanh toán mô phỏng khi `PAYMENT_MODE=demo` và NODE_ENV khác production; mặc định disabled. Customer hiện hành, Gym/Package ACTIVE và request hợp lệ vẫn bắt buộc.
- Backend đọc price/duration từ Package, tạo Payment SUCCESS và Membership ACTIVE ngay trong cùng transaction. `payment_method`/`transaction_code` mang prefix DEMO; API/UI gắn nhãn demo, không thu tiền thật. Ngày thẻ theo Asia/Ho_Chi_Minh, end_date bao gồm ngày cuối = ngày bắt đầu + duration_days - 1.
- Idempotency-Key UUID định danh một lần bấm; cùng actor/Gym/input trả kết quả cũ, không tạo lần hai. Body không được tự khai amount/SUCCESS/user_id/Gym/thời hạn. Không có webhook, credentials cổng, refund hoặc cấp thẻ bỏ qua Payment.
- Không tồn tại Payment PENDING chờ bên ngoài trong luồng này; không thêm duration snapshot, bảng hoặc migration. Đề xuất snapshot trong PLAN-02 trước đó chỉ còn là bản tham khảo cho thanh toán thật sau này.
- Demo cho phép tạo các lần mua độc lập khi dùng key mới, có thể có nhiều thẻ; đây là hành vi mô phỏng, không đóng Q-08 Customer cho production. Chưa có expiry scheduler hay quyền dùng thẻ cho PT; không tự cascade Registration/Appointment.
- Q-01/Q-02/Q-03 cho tiền thật và các policy chưa chốt vẫn OPEN. PAY-01/PAY-02/PAY-03 bản production không được đánh dấu hoàn thành dựa trên demo.

## PT và lịch hẹn — quyết định người dùng ngày 2026-10-09

Áp dụng [PLAN-03 §9](PLAN_03_PT_APPOINTMENT_POLICY_PROPOSAL.md#9-chính-sách-được-duyệt-ngày-2026-10-09) và các quy tắc chi tiết §2–§5 không bị §9 thay thế. Thẻ ACTIVE còn hạn theo Asia/Ho_Chi_Minh, gồm thẻ demo, được đăng ký PT cùng Gym. Một Registration ACTIVE/thẻ. NOT_ACCEPTING chặn đăng ký mới; PT chính chủ/Manager đúng Gym đổi availability; không chặn lịch học viên cũ.

Lịch mới PENDING giữ chỗ; PT/Manager xác nhận. Chống chồng lịch của Customer/PT toàn hệ thống kể cả User hai role, khoảng [start,end). Dời trước giờ về PENDING; Customer hủy trước giờ, PT/Manager xử lý quá giờ, lý do bắt buộc. Complete chỉ CONFIRMED sau end. Vắng mặt CANCELLED với lý do. Không tự expire/cascade. Đổi PT kết thúc đăng ký cũ khi hết lịch mở rồi tạo đăng ký mới, giữ quan hệ lịch sử.

Q-04/Q-06/Q-07 chốt theo phạm vi trên; Q-16 chốt availability, còn profile/social. Working Schedule tham khảo; Q-18 ghi lịch vẫn mở. Q-08 Customer và chính sách tiền thật không thay đổi. Không thêm bảng/cột/PT pricing/payment/quota.

## Tạo cơ sở và Manager cùng lúc — quyết định 2026-10-09

Admin tạo cơ sở mới qua form gồm Gym và Manager. Gym ACTIVE và User/Profile/role MANAGER/gym_managers ACTIVE được tạo nguyên tử; lỗi tài khoản hoặc phân công không để lại cơ sở dang dở. Manager mới chỉ được phân công vào Gym vừa tạo, account ACTIVE và must_change_password=true. Mật khẩu tạm sinh bởi backend, bàn giao một lần và đổi khi đăng nhập đầu tiên theo Q-10. Giới hạn Manager hiện có không đổi; không gán role từ body, không tự thu hồi người khác.

Luồng API tạo Gym độc lập vẫn hỗ trợ khi không có `manager`; bổ nhiệm/gán tài khoản đã có và thay/revoke Manager vẫn dùng chức năng riêng. API PATCH thông tin Gym không cấp tài khoản. Đây là cập nhật luồng tạo cơ sở, không mở policy Customer đa Gym hay thanh toán thật.


## Báo cáo sự cố đơn giản — người dùng duyệt 2026-10-10

Demo bỏ màn danh mục loại thiết bị và quản lý từng máy (thêm/sửa/mã máy/chuyển Gym/thống kê). Giữ equipment_types/equipments và dữ liệu/FK cũ, không xóa bảng. Customer có Membership ACTIVE còn hạn tại Gym ACTIVE (gồm thẻ demo) gửi nội dung và tối đa một ảnh tùy chọn; không chọn máy/nhập mã. Equipment_id nullable kể cả EQUIPMENT; không tự gắn máy hoặc đổi condition. Lịch sử báo cáo cá nhân vẫn đọc khi thẻ hết hạn. Không API sửa/xóa nội dung/ảnh gốc.

Manager đúng Gym/Admin tiếp nhận PENDING→IN_PROGRESS, xử lý IN_PROGRESS→RESOLVED với ghi chú bắt buộc; từ chối PENDING/IN_PROGRESS→REJECTED với lý do bắt buộc. Terminal không mở lại; backend lấy actor từ phiên. RESOLVED có resolved_by/resolved_at; REJECTED lưu actor tại resolved_by và lý do tại resolution_note, resolved_at NULL, thời điểm từ chối theo updated_at. Không cascade thiết bị/thẻ/lịch tập.

Q-09 đóng phần eligibility, bỏ chọn thiết bị và hoãn quản lý thiết bị khỏi demo; không mở quyền ghi danh mục. Q-13 đóng lifecycle Report trên. Q-10 chỉ chốt upload Report demo: một ảnh JPEG/PNG ≤5MiB, lưu disk riêng ngoài public/static, volume Docker bền vững; đọc qua API có ownership/role/Gym scope, không URL công khai. Production upload vẫn chưa chọn provider và bị tắt; không áp dụng lựa chọn này cho Gallery/PT/avatar. Không thêm package hoặc bảng ảnh. Form dùng giờ Việt Nam và có loading/error/retry/pending.


## Đăng ký tư vấn đơn giản — quyết định được duyệt 2026-10-10

Người dùng duyệt CON-01/CON-02: CTA “Đăng ký tư vấn”, không đặt slot/giữ chỗ. Guest gửi không login, User hợp lệ được liên kết từ cookie và điền sẵn nhưng sửa được thông tin liên hệ. Gym ACTIVE lấy từ route; họ tên/số điện thoại bắt buộc, nội dung và thời gian tiện liên hệ dạng chữ tùy chọn. Không nhận user_id/status/assigned_to/email/preferred_date/preferred_time từ public body; không trả contact/actor trong public response.

Chỉ Manager có role và assignment ACTIVE đúng Gym xem và xử lý; chưa mở quyền Staff/Admin/PT. PENDING → CONTACTED → COMPLETED; PENDING/CONTACTED → CANCELLED bắt buộc lý do. Không reopen/reassign/xóa hoặc sửa thông tin khách. Manager lưu ghi chú riêng, bấm gọi số điện thoại; COMPLETED không đồng nghĩa mua gói. Thời gian liên hệ chỉ là nguyện vọng, không SLA, không Appointment/Payment/Membership/notification tự động.

Bổ sung hai cột nullable `preferred_contact` VARCHAR(200) và `processing_note` TEXT trong consultation_requests, migration giữ dữ liệu cũ/21 bảng, không ghép ghi chú vào content khách. assigned_to giữ NULL vì chưa phân công; không dùng để suy quyền. Q-19 đóng phần consultation tối giản; Q-14 Staff và Gallery/storage còn OPEN. Giới hạn gửi theo IP trong bộ nhớ một process (5 lần/15 phút), không tin X-Forwarded-For; khóa nút pending/no retry. Chưa CAPTCHA, lịch sử riêng cho khách hoặc idempotency; mất mạng yêu cầu liên hệ Gym trước gửi lại.


## Gallery demo — quyết định được duyệt 2026-10-10

Người dùng duyệt GIM-01: Admin mọi Gym, Manager có role/assignment ACTIVE đúng Gym thêm ảnh, sửa caption, đổi thứ tự và xóa có xác nhận. Guest chỉ xem list/bytes của Gym ACTIVE; ngừng Gym giữ ảnh, nội bộ vẫn quản lý được Gym INACTIVE. Logo tách gallery; ảnh đầu theo display_order là ảnh đại diện gallery. Mỗi lần thêm một ảnh, tối đa 10/Gym, đầu vào JPEG/PNG tối đa 5 MiB/20 megapixels, caption tùy chọn tối đa 200 ký tự. UI tự thu nhỏ cạnh dài tối đa 1600 và re-encode JPEG bỏ metadata; backend độc lập kiểm tra và loại metadata ảnh trước lưu. Không video/album/crop/360/versioning/drag-drop.

Demo lưu filesystem trong volume gallery riêng, không dùng volume báo cáo private, không public static; endpoint ảnh kiểm tra Gym ACTIVE mỗi lần, nội bộ có endpoint private có auth/scope. Không provider/package/table/column/migration mới; gym_images hiện có đủ. Upload production disabled đến khi chọn storage. Ghi gallery khóa Gym trong transaction, tối đa 10 và reorder nguyên tử/chống dữ liệu cũ; không lấy gym_id/image_url từ body. Xóa row trước rồi cleanup file, file mồ côi có thể tồn tại nếu crash, không public nếu không còn row. Public DTO không trả storage key/actor. Backup cả DB và volume; không reset dữ liệu cũ hoặc ảnh báo cáo. Q-10/Q-19 đóng gallery demo; storage production còn OPEN.


## TPR-01 — Hồ sơ PT / giờ làm việc tham khảo (duyệt 2026-10-10)

PT chính chủ có role/assignment ACTIVE tự sửa bio, liên kết và giờ làm việc tại Gym mình; Manager có role/assignment ACTIVE đúng Gym quản lý specialization/experience_years, xem bio/social/giờ nhưng không sửa thay PT. Phân công/status/availability giữ API/policy hiện có; Admin provisioning hiện có không thay đổi, chưa mở Admin sửa trong API TPR mới. Tên/ảnh dùng User Profile hiện hành, không thêm upload/chứng chỉ/PT pricing/thông tin sức khỏe.

Q-16 phần profile/social và Q-18 giờ tham khảo đã chốt: Asia/Ho_Chi_Minh, nhiều ca/ngày, HH:mm, không overlap cùng ngày hoặc qua nửa đêm, ca liền kề được phép; tối đa 28 ca/tuần cho form đơn giản. Không khai báo ngày là không hiển thị, không đồng nghĩa nghỉ/không được booking. Working Schedule chỉ tham khảo, không giữ slot, không chặn đặt lịch ngoài ca, không tự tạo/dời/hủy Appointment. Không lộ học viên hoặc Appointment trong DTO public. Không approval/lịch nghỉ/calendar sync/sinh slot tự động.

Bio trim tối đa 2000; specialization trim tối đa 200; kinh nghiệm nguyên 0–80 hoặc NULL; tối đa một link cho mỗi platform hiện có, URL HTTP(S) tối đa 2048 không chứa user/password. API strict ownership/allowlist, parent Gym lock và expected_updated_at để chặn stale/concurrent writes; giờ đã bỏ chuyển INACTIVE, giữ ID/history; giờ trùng exact có thể reactivate row cũ. Social set cập nhật theo platform, giữ ID khi có thể. Không tự sửa dữ liệu legacy ngoài thao tác lưu đã yêu cầu. Gym/PT INACTIVE không tự chỉnh hồ sơ; Manager xem được lịch sử tại Gym mình. Production payment/storage và Review còn OPEN.


## Q-15 — Review tối giản được duyệt (2026-10-10)

Người dùng yêu cầu góp ý sát thực tế và thực hiện REV-01. Áp dụng: Customer ACTIVE, đã đổi mật khẩu tạm, có Membership ACTIVE/EXPIRED đã tới start_date theo Asia/Ho_Chi_Minh tại Gym ACTIVE được đánh giá Gym. Đánh giá PT cần thêm Registration ACTIVE/COMPLETED cùng Gym và ít nhất một Appointment COMPLETED với đúng Gym Trainer; chỉ đăng ký hoặc lịch CANCELLED không đủ. Target PT/Gym phải ACTIVE; PT account ACTIVE. Thẻ demo được dùng cùng điều kiện. Nhân sự có assignment Manager/PT ACTIVE tại Gym không đánh giá Gym/PT tại Gym đó, không đánh giá chính mình.

Một review mỗi User/Gym và mỗi User/Gym Trainer (assignment), tính cả HIDDEN; không reset khi mua thẻ mới hoặc tái kích hoạt assignment. Rating số nguyên 1–5, comment tùy chọn, trim và tối đa 2.000 ký tự; không ảnh. Không sửa/xóa/unhide. Public chỉ VISIBLE trên target ACTIVE, chỉ tên hiển thị hội viên/rating/comment/ngày, không User ID/contact/audit. Đọc trạng thái đánh giá của bản thân gồm review gốc và eligibility, không audit ẩn; lỗi ghi lại 409, không tự retry khi mất mạng, tải lại để đối chiếu. Phân trang mới nhất trước và thống kê count/average chỉ VISIBLE; chưa có review thì average=null.

Giữ schema/trigger bất biến 0001. Policy chặt hơn (COMPLETED, một review) thực thi tại service với khóa parent Gym, recheck eligibility và duplicate trong transaction; SQL trực tiếp ngoài API chưa có ràng buộc unique/COMPLETED mới. Không tự sửa/xóa review legacy trùng; public vẫn giữ dữ liệu gốc, Customer có bất kỳ review nào không gửi thêm. REV-02 Admin moderation/UI giữ task riêng.


## REV-02 — Moderation tối giản (2026-10-10)

Người dùng yêu cầu đề xuất thực tế và triển khai. Admin ACTIVE đã đổi mật khẩu tạm xem review Gym/PT toàn hệ thống, gồm Gym/PT INACTIVE; lọc loại Gym/PT, Gym và VISIBLE/HIDDEN, phân trang mới nhất trước. Chỉ hiển thị tên/ID nội bộ cần nhận diện, nội dung gốc và audit ẩn; không email/phone/password. Không tự động ẩn theo điểm thấp, không ép đánh giá tích cực. Giao diện nhắc chỉ ẩn nội dung vi phạm (xúc phạm, spam, thông tin riêng hoặc nội dung không liên quan).

Ẩn cần nhập lý do rõ ràng 1–1.000 ký tự, xác nhận trước gửi; server đặt hidden_by/hidden_at, giữ nguyên rating/comment/created_at. VISIBLE → HIDDEN một lần; hai lần ẩn đồng thời chỉ một commit, lần sau 409 không ghi đè audit. Không sửa/xóa/unhide/duyệt trước đăng, không luồng report review/notification. Public và thống kê chỉ VISIBLE như REV-01. HIDDEN giữ bản riêng cho Customer và audit chỉ Admin. Quyền kiểm tra từ DB trong transaction; khóa parent Gym trước account/role rồi update status có điều kiện. Không package/schema/migration mới.


## ADM-01 — Quản lý tài khoản tối giản (2026-10-10)

Người dùng yêu cầu góp ý thực tế và triển khai. Admin ACTIVE đã đổi mật khẩu tạm được đọc User toàn hệ thống, tìm tên/email, lọc role/status, phân trang; đọc danh mục 4 roles, không tạo/sửa role. Projection chỉ identity/contact cần quản lý, tên/avatar, trạng thái/password gate/timestamps, roles và phân công Gym ACTIVE; không hash/password/token, không health/address/birthday.

UI Khóa tạm SUSPENDED / Mở lại ACTIVE, có xác nhận. API giữ allowlist ACTIVE/INACTIVE/SUSPENDED theo spec; INACTIVE là trạng thái cũ có thể đọc và mở lại, UI không thêm nút ngừng vĩnh viễn. Không DELETE/reset password/sửa role. Chặn thay đổi trạng thái mọi tài khoản có role ADMIN, gồm actor, để tránh tự khóa hoặc mất Admin cuối; quản lý Admin ngoài scope này.

Khóa User là ngăn truy cập, không ngừng Gym/PT assignment và không hủy nghĩa vụ. Membership/Payment/Registration/Appointment/report/consultation/assignment giữ nguyên kể cả còn ACTIVE hoặc lịch PENDING/CONFIRMED; không cascade/refund/dời lịch. Manager còn hoạt động đúng Gym (hoặc PT phụ trách còn hoạt động) xử lý lịch theo quyền hiện có; Admin xem lịch và bổ nhiệm Manager tiếp quản, không được cấp thêm quyền sửa lịch; chuyển Manager cần dùng revoke/assign riêng, không tự thay thế. Mở lại không gia hạn thẻ, không reset password gate hoặc tự cấp role/assignment. Role/status được kiểm tra từ DB ở lần gọi tiếp theo; phiên JWT còn hạn không dùng private nghiệp vụ khi User không ACTIVE. JWT không có session revocation store: khi mở lại, token cũ chưa hết hạn có thể dùng lại; không tuyên bố đã thu hồi token vĩnh viễn.

Đổi trạng thái cần expected_updated_at để chống ghi đè; khóa account actor/target theo UUID tăng dần trước đọc quyền/ghi. Không cần Gym lock vì không sửa Gym/assignment/nghĩa vụ; operations Gym hiện có khóa account nên tuần tự hóa với status. Không ghi lý do không có cột lưu, không thêm Audit_Log; phát structured operational log actor/target/old/new/time sau commit, không contact/credential. Log không phải audit history bền vững trên DB. Không migration/package mới.

# Multi-Gym Platform — Domain Rules

## 1. Mục đích và phạm vi

Đặc tả nghiệp vụ theo ERD 15 bảng tại [DATABASE_SPEC.md](DATABASE_SPEC.md), tuân thủ [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) và [PROJECT_RULES.md](PROJECT_RULES.md). Bao gồm Payment → Membership, đăng ký PT dựa trên Membership và quản lý/báo cáo thiết bị. Không thêm entity ngoài 15 bảng.

Tên field và PK lấy theo Database Spec. Status là giá trị dự kiến; luật chưa đủ quyết định được ghi Q-01–Q-13, không mặc định schema đã được triển khai. Các bảng kỹ thuật không thay thế kiểm tra quyền nghiệp vụ.

## 2. Actors và quyền theo phạm vi

| Actor | Quyền / phạm vi |
| :--- | :--- |
| Guest | Xem Gym, Package, PT công khai; đăng ký và đăng nhập. Không có role lưu trong DB. |
| Customer | Mua gói qua Payment; xem Payment/Membership của mình; đăng ký PT bằng Membership của mình; xem/đặt lịch và gửi báo cáo trong scope được cấp. |
| PT | Có role PT và gym_trainers hợp lệ; chỉ xem học viên và thao tác lịch thuộc phân công của mình. |
| Manager | Có role MANAGER và gym_managers ACTIVE; quản lý thông tin Gym, PT, Package, hội viên, thiết bị và report của Gym đó. |
| Admin | Quản lý tài khoản, danh mục role, Gym và phân công Manager toàn hệ thống; vẫn phải xác thực và kiểm tra quan hệ cùng Gym. |

Role xác định quyền hành động, không xác định Gym. Quyền truy cập gồm role + phân công/scope + ownership + trạng thái. Guest xem dữ liệu công khai không có nghĩa được đọc dữ liệu nội bộ của Gym.

## 3. Danh mục 15 thực thể

| Bảng | Định danh | Trách nhiệm nghiệp vụ |
| :--- | :--- | :--- |
| `users` | `user_id` | Tài khoản email/password; phone, email_verified_at và must_change_password. Không lưu mật khẩu thô. |
| `user_profiles` | `profile_id` | Hồ sơ full_name, ngày sinh, giới tính, address, avatar_url. User tối đa một Profile. |
| `roles` | `role_id` | role_name duy nhất: ADMIN, MANAGER, PT, CUSTOMER. |
| `user_roles` | `user_id, role_id` | Gán role cho User; assigned_at ghi thời điểm, không gắn Gym. |
| `gyms` | `gym_id` | Cơ sở có gym_name, thông tin liên hệ, vị trí, logo_url, giờ mở/đóng. |
| `gym_managers` | `gym_manager_id` | User được quản lý Gym nào; cặp Gym/User duy nhất, không dùng các dòng trùng cặp làm lịch sử. |
| `gym_trainers` | `gym_trainer_id` | PT thuộc Gym nào; specialization, experience_years, bio, joined_at; cặp Gym/User duy nhất. |
| `packages` | `package_id` | Sản phẩm của Gym với package_name, duration_days và giá hiện tại; không chứa quota PT. |
| `payments` | `payment_id` | Ghi nhận Customer thanh toán cho Package tại Gym; mã giao dịch duy nhất khi có giá trị. |
| `memberships` | `membership_id` | Hợp đồng sở hữu bởi User, thuộc Gym và Package; purchase_price giữ giá mua, payment_id tùy chọn và duy nhất khi có. |
| `pt_registrations` | `registration_id` | Liên kết Membership với Gym Trainer cùng Gym; không trực tiếp lưu Customer/Gym hoặc bộ đếm buổi. |
| `pt_appointments` | `appointment_id` | Ca tập thuộc Registration; có start_time, end_time, status, note; Customer/PT/Gym suy ra qua quan hệ. |
| `equipment_types` | `equipment_type_id` | Danh mục loại thiết bị toàn hệ thống, không phải máy cụ thể. |
| `equipments` | `equipment_id` | Máy thực tế thuộc Gym và loại thiết bị; equipment_code duy nhất trong Gym; condition tách biệt status. |
| `gym_reports` | `report_id` | Phản ánh với title/content, loại report, một ảnh; tùy chọn thiết bị cùng Gym; ghi người và kết quả xử lý. |

## 4. Gym Scope Matrix

| Phạm vi | Bảng / đường xác định |
| :--- | :--- |
| System | users, user_profiles, roles, user_roles, equipment_types |
| Gốc | gyms.gym_id |
| Gym trực tiếp | gym_managers, gym_trainers, packages, payments, memberships, equipments, gym_reports qua gym_id |
| Registration | pt_registrations.membership_id → memberships.gym_id; đối chiếu gym_trainers.gym_id qua gym_trainer_id |
| Appointment | pt_appointments.registration_id → Registration → Membership/Gym Trainer |
| Customer sở hữu PT | Registration → memberships.user_id; Appointment đi qua Registration |
| PT được phân công | Registration → gym_trainers.user_id; Appointment đi qua Registration |

Backend phải đối chiếu route Gym với Gym nguồn và quyền hiện tại trong DB. Không lấy user_id/gym_id/role từ request làm bằng chứng phân quyền. Admin có system scope nhưng không được tạo liên kết chéo Gym sai dữ liệu.

## 5. Quan hệ và luồng chính

ERD đầy đủ ở [DATABASE_SPEC.md §5](DATABASE_SPEC.md#5-quan-hệ-tổng-thể).

- User có tối đa một Profile; User N–N Role qua user_roles.
- User/Gym 1–N các phân công gym_managers và gym_trainers. Cardinality không tự cho phép nhiều phân công ACTIVE: giữ giới hạn Manager ở INV-010; Customer/PT đa Gym ở Q-08.
- Gym 1–N Package; User/Gym/Package 1–N Payment và Membership.
- Payment 1–0..1 Membership; Membership có thể không liên kết Payment về mặt dữ liệu, nghiệp vụ cấp thẻ thủ công chờ Q-03.
- Membership và Gym Trainer 1–N Registration; Registration 1–N Appointment.
- Equipment Type và Gym 1–N Equipment; Equipment 1–N Report, mỗi Report có thể không có Equipment.
- User 1–N Report qua người gửi user_id và riêng qua người xử lý resolved_by (tùy chọn).

**Mua gói:** chọn Package → Payment PENDING → xác nhận thành công đáng tin cậy → SUCCESS → tạo tối đa một Membership đúng User/Gym/Package, lưu purchase_price. Không tự lấy giá Package hiện tại để sửa giá lịch sử.

**Đăng ký PT:** chọn Membership sở hữu → chọn Gym Trainer cùng Gym → tạo Registration → tạo Appointment có end_time > start_time. Điều kiện sử dụng thẻ và trạng thái lịch theo Q-04/Q-06.

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
| INV-006 | Phải bảo vệ trùng lịch Customer/PT và race condition; phạm vi, trạng thái giữ chỗ và cơ chế cụ thể chờ Q-06/Q-11. |
| INV-007 | purchase_price ghi giá mua lịch sử, không thay đổi theo Package.price. Quy tắc quota cũ được thay thế bằng vấn đề Q-05, không còn là công thức thực thi. |
| INV-008 | Report tối đa một image_url; khi gắn Equipment phải cùng Gym; người xử lý có quyền tại Gym đó. |
| INV-009 | Role không thay thế Scope/Ownership; mọi thao tác đọc/ghi phải kiểm tra backend. |
| INV-010 | Mỗi Gym tối đa một Manager ACTIVE và mỗi Manager tối đa một Gym ACTIVE; UNIQUE cặp không đủ bảo vệ giới hạn này. |
| INV-011 | User có tối đa một Profile; role_name và email duy nhất; không gán trùng cặp User/Role. |
| INV-012 | Không trùng cặp Gym/User trong mỗi bảng phân công hoặc Gym/equipment_code trong equipments. |

## 7. Status và lifecycle

Danh sách duy nhất tại [DATABASE_SPEC.md §11](DATABASE_SPEC.md#11-statusenum-dự-kiến); chưa chốt ENUM hay VARCHAR + CHECK. Không dùng cùng nhãn trạng thái để suy ra cùng ý nghĩa ở các bảng.

Luồng đã mô tả: Payment PENDING → SUCCESS → sinh Membership; Report PENDING → IN_PROGRESS → RESOLVED và ghi kết quả. FAILED/CANCELLED/REFUNDED, REJECTED và các lifecycle còn lại có giá trị dự kiến nhưng điều kiện chuyển đầy đủ cần chốt theo §9. Không suy ra tự động ACTIVE Membership hoặc COMPLETED Registration từ các nhãn này.

Tài khoản Manager/PT được cấp mật khẩu tạm phải có must_change_password; đổi thành công thì bỏ cờ. email_verified_at NULL nghĩa chưa xác minh, không có is_verified. Chưa tự mở luồng gửi email/token lưu trữ mới.

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

## 9. Câu hỏi mở và phạm vi chặn

Đây là danh mục câu hỏi mở dùng chung cho toàn bộ docs. Ghi nhận UNKNOWN không có nghĩa được tự chọn policy. Chỉ chặn tác vụ phụ thuộc, các phần không liên quan tiếp tục triển khai khi được yêu cầu.

| Mã | Vấn đề | Cần quyết định | Phần phụ thuộc |
| :--- | :--- | :--- | :--- |
| Q-01 | Thanh toán và giá lịch sử | Chọn payment_method, nguồn xác nhận thành công, phạm vi transaction_code, cơ chế chống xử lý lặp và chốt giá khi Package đổi giá trong lúc Payment PENDING. Không nhận SUCCESS hoặc amount đáng tin cậy từ frontend. | Payment → Membership |
| Q-02 | Kích hoạt và hoàn tiền | Membership sau SUCCESS bắt đầu PENDING hay ACTIVE, cách tính ngày, ảnh hưởng của REFUNDED/FAILED/CANCELLED; ai có quyền hủy hoặc hoàn tiền? | Ghi Payment, tạo/kích hoạt Membership |
| Q-03 | Membership không qua Payment | Có cho phép cấp thẻ với payment_id NULL không, ai được cấp và purchase_price lấy từ đâu? Nullable không tự mở luồng này. | Cấp thẻ thủ công |
| Q-04 | Điều kiện Membership cho PT | Trạng thái/thời hạn Membership nào được đăng ký và đặt lịch; xử lý Membership hết hạn/hủy khi còn lịch tương lai. | Tạo Registration/Appointment |
| Q-05 | Quota PT | ERD không có cột tổng/đã dùng hoặc số buổi PT trong Package. Có còn giới hạn buổi không và mô hình nào hỗ trợ? Không tính quota hoặc tự thêm cột. | Giới hạn buổi, hoàn tất Registration |
| Q-06 | Lịch hẹn và chống trùng | PENDING hay CONFIRMED giữ chỗ? Ai xác nhận? Phạm vi trùng lịch cùng Gym hay toàn hệ thống, thời hạn hủy/dời, trường hợp vắng mặt và điều kiện hoàn thành? Chọn cơ chế chống race condition với scope gián tiếp. | Tạo/xác nhận/dời/hủy/hoàn thành Appointment |
| Q-07 | Đổi PT và lịch sử | Cách đổi gym_trainer_id khi đã có lịch sử hoặc lịch tương lai; tránh khiến lịch cũ bị quy cho PT mới do quan hệ gián tiếp. Có cho đổi Membership nguồn không? | Reassign Registration |
| Q-08 | Đa Gym | Customer có được nhiều Membership ACTIVE ở nhiều Gym? PT có được nhiều phân công ACTIVE? Không suy ra quyền này từ cardinality 1–N. | Tạo hợp đồng/phân công chéo Gym |
| Q-09 | Danh mục và thiết bị | Ai quản trị equipment_types, thiết bị nào Customer được chọn khi báo cáo, chính sách ngừng dùng/chuyển Gym khi đã có report? | Ghi equipment_types, chuyển Gym thiết bị |
| Q-10 | Tài khoản và ảnh | Quy trình xác minh email, quyền bị giới hạn trước xác minh, cách cấp/giao mật khẩu tạm cho PT, nơi lưu/upload avatar/logo/ảnh report. Không chọn nhà cung cấp hoặc thêm bảng. | Xác minh email, provisioning PT, upload |
| Q-11 | Constraints vật lý | Kiểu/precision/default/nullability còn thiếu, ENUM hay VARCHAR + CHECK, FK actions, indexes, bảo vệ xuyên bảng và giới hạn Manager ACTIVE. Xem DATABASE_SPEC.md §12. | Schema/migration hoàn chỉnh |
| Q-12 | Lịch sử phân công Manager | Giữ giới hạn cũ: tối đa một Manager ACTIVE mỗi Gym và tối đa một Gym ACTIVE mỗi Manager. UNIQUE cặp không lưu được nhiều lần bổ nhiệm; chốt cách tái bổ nhiệm mà không thêm bảng lịch sử. | Tái bổ nhiệm/lịch sử Manager |
| Q-13 | Chuyển trạng thái khác | Điều kiện reject report, hủy Registration, ngừng phân công PT khi còn lịch, quyền cập nhật các trạng thái ngoài luồng đã mô tả; không dùng endpoint status để bỏ qua nghiệp vụ. | Các action chuyển trạng thái chưa đủ policy |

## 10. Tiêu chí kiểm tra tài liệu

- Đúng 15 bảng; không dùng cột hoặc trạng thái cũ như hợp đồng hiện hành.
- Scope gián tiếp và quan hệ nullable được phản ánh nhất quán ở API/UI.
- Mỗi câu hỏi chưa quyết định có mã Q dùng chung; không công bố toàn bộ nghiệp vụ sẵn sàng triển khai.
- Không thêm code, migration hoặc bảng để tự giải quyết câu hỏi mở.

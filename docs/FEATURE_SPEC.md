# Multi-Gym Platform — Feature Specification

## 1. Phạm vi

Đồng bộ thiết kế 15 bảng theo [DATABASE_SPEC.md](DATABASE_SPEC.md), [DOMAIN_RULES.md](DOMAIN_RULES.md) và [API_SPEC.md](API_SPEC.md). Tài liệu mô tả hành vi mục tiêu, không phải trạng thái đã triển khai. Payment và quản lý thiết bị cơ bản thuộc phạm vi; không thêm bảng khác.

## 2. Nguyên tắc và tiêu chí chung

- Backend quyết định role + Gym Scope + ownership; frontend chỉ hỗ trợ UX. Customer identity lấy từ phiên, không lấy customer_id client khai.
- Registration/Appointment kiểm tra Gym qua Membership/Gym Trainer; không giả định có gym_id trực tiếp.
- Mọi feature ghi nhiều bản ghi cần transaction; kiểm tra trạng thái nguồn và concurrency. Không trả hoặc log password_hash/credential.
- Status/enum dự kiến ở Database §11. Feature phụ thuộc Q phải chờ quyết định, không tự dùng giá trị dự kiến làm lifecycle hoàn chỉnh.
- Acceptance chung: actor đúng mới thao tác được; sai Gym/ownership bị từ chối; input ngoài allowlist bị từ chối; response theo API; thao tác bị lỗi không ghi dữ liệu dở dang.
- Mỗi feature dưới đây kế thừa validation, response DTO, HTTP/mã lỗi cụ thể từ endpoint cùng Feature ID ở API §6–7. Các ca kiểm thử bao gồm luồng thành công, validation, quyền, scope, trạng thái và concurrency nếu có ghi liên quan.

## 3. Danh mục và đặc tả tính năng

### FEAT-AUTH-001: Đăng ký Customer

- **Actor / scope:** Guest.
- **API:** `POST /api/v1/auth/register`.
- **Luồng và quy tắc:** Chuẩn hóa email trim/lowercase, mật khẩu 8–128 ký tự có chữ hoa và số; full_name 2–100. Transaction tạo User ACTIVE, Profile và role CUSTOMER, assigned_at. phone lưu ở users; email_verified_at NULL, must_change_password false. Không nhận role từ client. Cấp cookie theo hợp đồng hiện có; nếu sau này yêu cầu xác minh trước đăng nhập thì phải giải quyết Q-10.
- **Dữ liệu vào / ra:** email, password, full_name; phone? → UserSession.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-AUTH-002: Đăng nhập

- **Actor / scope:** Guest.
- **API:** `POST /api/v1/auth/login`.
- **Luồng và quy tắc:** Đối chiếu Argon2id, chỉ User ACTIVE; lỗi sai tài khoản chung, không lộ email tồn tại. Rate limit đăng nhập sai 10 lần/phút/IP. Trả cờ must_change_password; tài khoản có cờ phải đổi mật khẩu trước thao tác nghiệp vụ.
- **Dữ liệu vào / ra:** email, password → UserSession.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-AUTH-003: Đăng xuất

- **Actor / scope:** Authenticated.
- **API:** `POST /api/v1/auth/logout`.
- **Luồng và quy tắc:** Xóa auth_token cookie đúng Path, Max-Age=0. Trả 200; không cam kết thu hồi JWT ở nơi khác nếu chưa có cơ chế tương ứng.
- **Dữ liệu vào / ra:** — → {message}.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-AUTH-004: Thông tin phiên

- **Actor / scope:** Authenticated; Authenticated, chính chủ.
- **API:** `GET /api/v1/auth/me`; `GET /api/v1/users/me/profile`.
- **Luồng và quy tắc:** Lấy User/Profile/roles và phân công hợp lệ từ database. Không tin role hoặc scope client tự khai. Profile có thể NULL; phone lấy từ User, không thêm cột vào user_profiles.
- **Dữ liệu vào / ra:** — → UserSession; — → UserProfileView.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-AUTH-005: Cập nhật hồ sơ

- **Actor / scope:** Authenticated, chính chủ.
- **API:** `PATCH /api/v1/users/me/profile`.
- **Luồng và quy tắc:** Payload tổng hợp: phone ghi users.phone; các field hồ sơ ghi user_profiles. Transaction khi sửa cả hai bảng; không cho sửa user_id/email_verified_at/roles qua endpoint này. phone theo định dạng Việt Nam hiện có; ngày YYYY-MM-DD; avatar_url là URL. Danh mục gender hoàn thiện ở Q-11.
- **Dữ liệu vào / ra:** full_name?, phone?, date_of_birth?, gender?, address?, avatar_url? → UserProfileView.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-AUTH-006: Đổi mật khẩu

- **Actor / scope:** Authenticated, chính chủ.
- **API:** `POST /api/v1/auth/change-password`.
- **Luồng và quy tắc:** Kiểm tra mật khẩu cũ, băm mật khẩu mới theo cùng policy đăng ký; cập nhật password_hash và must_change_password=false. Không trả mật khẩu/hash.
- **Dữ liệu vào / ra:** current_password, new_password → {message}.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-001: Danh sách Gym

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms`.
- **Luồng và quy tắc:** Chỉ dữ liệu Gym công khai ACTIVE; phân trang/tìm theo gym_name và address.
- **Dữ liệu vào / ra:** — → gyms[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-002: Chi tiết Gym

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms/:gymId`.
- **Luồng và quy tắc:** Tìm bằng gym_id; không tiết lộ dữ liệu riêng tư của nhân sự/hội viên.
- **Dữ liệu vào / ra:** — → gyms.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-003: Tạo Gym

- **Actor / scope:** Admin.
- **API:** `POST /api/v1/gyms`.
- **Luồng và quy tắc:** Admin tạo cơ sở; trạng thái dự kiến ACTIVE. Không có Manager tự động nếu chưa thực hiện provisioning/assignment.
- **Dữ liệu vào / ra:** gym_name, address; description?, phone?, email?, latitude?, longitude?, logo_url?, opening_time?, closing_time? → gyms.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-004: Sửa Gym

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId`.
- **Luồng và quy tắc:** Cập nhật thông tin Gym, giữ định danh; không cho chuyển scope của tài nguyên.
- **Dữ liệu vào / ra:** Các field tạo Gym, tất cả tùy chọn; không nhận gym_id/status → gyms.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-005: Trạng thái Gym

- **Actor / scope:** Admin.
- **API:** `PATCH /api/v1/gyms/:gymId/status`.
- **Luồng và quy tắc:** Giá trị dự kiến ACTIVE/INACTIVE; tác động tới hợp đồng/lịch đang có cần chốt trước triển khai.
- **Dữ liệu vào / ra:** status → gyms.
- **Phụ thuộc:** Q-13
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MGR-001: Cấp tài khoản Manager

- **Actor / scope:** Admin.
- **API:** `POST /api/v1/admin/managers/provision`.
- **Luồng và quy tắc:** Transaction tạo User, Profile, role MANAGER, gym_managers của Gym đã tồn tại; must_change_password=true. Giữ INV-010; không tự thu hồi Manager khác. Cách giao mật khẩu tạm qua kênh được duyệt, không log/hash trong response.
- **Dữ liệu vào / ra:** gym_id, email, full_name; phone? → ManagerProvisionResult.
- **Phụ thuộc:** Q-10, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MGR-002: Danh sách phân công Manager

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/managers`.
- **Luồng và quy tắc:** Danh sách phân công hiện lưu, không gọi là nhật ký đầy đủ mọi lần bổ nhiệm vì cặp Gym/User duy nhất.
- **Dữ liệu vào / ra:** — → gym_managers[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MGR-003: Gán Manager

- **Actor / scope:** Admin.
- **API:** `POST /api/v1/gyms/:gymId/managers/assign`.
- **Luồng và quy tắc:** User có role MANAGER; không trùng cặp, không vượt INV-010. Chặn nếu Gym/User đã có phân công ACTIVE xung đột; không tự revoke. Tái bổ nhiệm cùng cặp chờ Q-12.
- **Dữ liệu vào / ra:** user_id → gym_managers.
- **Phụ thuộc:** Q-11, Q-12
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MGR-004: Thu hồi phân công Manager

- **Actor / scope:** Admin.
- **API:** `POST /api/v1/gyms/:gymId/managers/:managerId/revoke`.
- **Luồng và quy tắc:** managerId là gym_manager_id thuộc route Gym; ACTIVE → INACTIVE, không xóa phân công.
- **Dữ liệu vào / ra:** — → gym_managers.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-TRN-001: Danh sách PT công khai

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms/:gymId/trainers`.
- **Luồng và quy tắc:** Chỉ PT ACTIVE tại Gym công khai; User/profile được chiếu trường công khai, không trả email/phone đăng nhập mặc định.
- **Dữ liệu vào / ra:** — → TrainerPublicView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-TRN-002: Chi tiết PT

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms/:gymId/trainers/:trainerId`.
- **Luồng và quy tắc:** trainerId là gym_trainer_id; trả specialization, experience_years, bio và thông tin hiển thị công khai.
- **Dữ liệu vào / ra:** — → TrainerPublicView.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-TRN-003: Gán PT có tài khoản

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `POST /api/v1/gyms/:gymId/trainers`.
- **Luồng và quy tắc:** User có role PT, cặp Gym/User duy nhất, ghi joined_at; không tự tạo role quản trị từ request. Trường hợp phân công PT đa Gym phụ thuộc Q-08.
- **Dữ liệu vào / ra:** user_id; specialization?, experience_years?, bio? → gym_trainers.
- **Phụ thuộc:** Q-08, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-TRN-004: Đổi trạng thái PT

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/trainers/:trainerId/status`.
- **Luồng và quy tắc:** ACTIVE/INACTIVE; xử lý các lịch đang có trước khi ngừng phân công theo policy sẽ chốt.
- **Dữ liệu vào / ra:** status → gym_trainers.
- **Phụ thuộc:** Q-13
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-TRN-005: Cấp tài khoản PT mới

- **Actor / scope:** Admin, Manager đúng Gym (dự kiến).
- **API:** `POST /api/v1/gyms/:gymId/trainers/provision`.
- **Luồng và quy tắc:** DRAFT: tạo User/Profile/role PT/phân công trong transaction, mật khẩu tạm có must_change_password=true. Quyền cấp và cách giao mật khẩu cần Q-10.
- **Dữ liệu vào / ra:** email, full_name; phone?, specialization?, experience_years?, bio? → TrainerProvisionResult.
- **Phụ thuộc:** Q-10, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-001: Danh sách Package

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms/:gymId/packages`.
- **Luồng và quy tắc:** Package ACTIVE thuộc Gym route.
- **Dữ liệu vào / ra:** — → packages[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-002: Chi tiết Package

- **Actor / scope:** Public.
- **API:** `GET /api/v1/gyms/:gymId/packages/:packageId`.
- **Luồng và quy tắc:** packageId là package_id; không có field hạn mức buổi PT.
- **Dữ liệu vào / ra:** — → packages.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-003: Tạo Package

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `POST /api/v1/gyms/:gymId/packages`.
- **Luồng và quy tắc:** duration_days > 0, price >= 0; Gym lấy từ route đã xác thực. Chốt precision tiền/defaults ở Q-11.
- **Dữ liệu vào / ra:** package_name, duration_days, price; description? → packages.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-004: Sửa Package

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/packages/:packageId`.
- **Luồng và quy tắc:** Không đổi gym_id; giá mới không ghi đè memberships.purchase_price hoặc Payment lịch sử.
- **Dữ liệu vào / ra:** package_name?, duration_days?, price?, description? → packages.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-005: Ngừng bán Package

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/packages/:packageId/deactivate`.
- **Luồng và quy tắc:** Chuyển INACTIVE, không hủy các Membership đã mua.
- **Dữ liệu vào / ra:** — → packages.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PKG-006: Mở bán Package

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/packages/:packageId/activate`.
- **Luồng và quy tắc:** Chuyển ACTIVE trong Gym được quản lý.
- **Dữ liệu vào / ra:** — → packages.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PAY-001: Tạo Payment

- **Actor / scope:** Customer.
- **API:** `POST /api/v1/gyms/:gymId/payments`.
- **Luồng và quy tắc:** DRAFT phần tích hợp: Backend lấy user_id từ phiên và kiểm tra Package cùng Gym, tự xác định amount; tạo PENDING. Không nhận amount/payment_status/paid_at từ Customer. Cơ chế khóa giá theo Q-01.
- **Dữ liệu vào / ra:** package_id, payment_method → payments.
- **Phụ thuộc:** Q-01, Q-02, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PAY-002: Payment của tôi

- **Actor / scope:** Customer; Customer, chính chủ.
- **API:** `GET /api/v1/payments/me`; `GET /api/v1/payments/:paymentId`.
- **Luồng và quy tắc:** Chỉ payments.user_id = auth.user_id; không mở danh sách thanh toán toàn Gym cho Customer. Không cho suy đoán Payment của User khác. Trả payment_status; frontend không tự xác nhận thanh toán.
- **Dữ liệu vào / ra:** — → payments[]; — → payments.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MEM-002: Membership của tôi

- **Actor / scope:** Customer.
- **API:** `GET /api/v1/memberships/me`.
- **Luồng và quy tắc:** Lọc user_id; trả purchase_price/payment_id, không thay bằng giá Package mới.
- **Dữ liệu vào / ra:** — → MembershipView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MEM-003: Membership tại Gym

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/memberships`.
- **Luồng và quy tắc:** Lọc trực tiếp gym_id; không mở CRUD tạo thẻ bỏ qua Payment.
- **Dữ liệu vào / ra:** — → MembershipView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-MEM-004: Chi tiết Membership

- **Actor / scope:** Customer chính chủ; Admin, Manager đúng Gym.
- **API:** `GET /api/v1/memberships/:membershipId`.
- **Luồng và quy tắc:** Xác định scope từ bản ghi, không chỉ từ route; payment_id có thể NULL.
- **Dữ liệu vào / ra:** — → MembershipView.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PTR-001: Đăng ký PT bằng Membership

- **Actor / scope:** Customer chính chủ; Manager đúng Gym.
- **API:** `POST /api/v1/gyms/:gymId/pt-registrations`.
- **Luồng và quy tắc:** Membership và Gym Trainer cùng Gym route; Customer phải sở hữu Membership; Manager kiểm tra hội viên trong Gym. PT ACTIVE. Không nhận customer_id/gym_id trong body, không có quota.
- **Dữ liệu vào / ra:** membership_id, gym_trainer_id; note? → RegistrationView.
- **Phụ thuộc:** Q-04, Q-05, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PTR-002: Registration của tôi

- **Actor / scope:** Customer, PT.
- **API:** `GET /api/v1/pt-registrations/me`.
- **Luồng và quy tắc:** Customer lọc qua Membership.user_id, PT qua Gym Trainer.user_id; kết quả chỉ các phân công hợp lệ.
- **Dữ liệu vào / ra:** — → RegistrationView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PTR-003: Registration tại Gym

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/pt-registrations`.
- **Luồng và quy tắc:** JOIN Membership để xác định Gym; đối chiếu Gym Trainer cùng Gym.
- **Dữ liệu vào / ra:** — → RegistrationView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PTR-004: Đổi PT

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-registrations/:registrationId/assign`.
- **Luồng và quy tắc:** DRAFT: kiểm tra cùng Gym; không tự cascade chuyển lịch quá khứ hoặc hủy lịch tương lai.
- **Dữ liệu vào / ra:** gym_trainer_id → RegistrationView.
- **Phụ thuộc:** Q-07
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-PTR-005: Hủy Registration

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-registrations/:registrationId/cancel`.
- **Luồng và quy tắc:** DRAFT: chuyển CANCELLED sau khi chốt xử lý lịch liên quan; không tự hủy dây chuyền.
- **Dữ liệu vào / ra:** note? → RegistrationView.
- **Phụ thuộc:** Q-13
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-001: Đặt Appointment

- **Actor / scope:** Customer chính chủ, PT phụ trách, Manager đúng Gym.
- **API:** `POST /api/v1/gyms/:gymId/pt-appointments`.
- **Luồng và quy tắc:** Truy Registration → Membership/Gym Trainer để kiểm tra Customer/PT/Gym; end_time > start_time, start_time > now. Chống trùng hai phía và race condition theo quyết định Q-06/Q-11. Không nhận ID Customer/PT riêng.
- **Dữ liệu vào / ra:** registration_id, start_time, end_time; note? → AppointmentView.
- **Phụ thuộc:** Q-04, Q-05, Q-06, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-002: Lịch cá nhân

- **Actor / scope:** Customer, PT.
- **API:** `GET /api/v1/pt-appointments/me`.
- **Luồng và quy tắc:** Lọc qua Registration và ownership/phân công, không truy customer_id/trainer_id trực tiếp trên Appointment.
- **Dữ liệu vào / ra:** — → AppointmentView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-003: Lịch tại Gym

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/pt-appointments`.
- **Luồng và quy tắc:** Lọc qua Registration → Membership.gym_id; phạm vi thời gian theo from/to.
- **Dữ liệu vào / ra:** — → AppointmentView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-004: Dời lịch

- **Actor / scope:** Customer chính chủ, PT phụ trách, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:appointmentId/reschedule`.
- **Luồng và quy tắc:** DRAFT: kiểm tra lại scope, trạng thái, hạn dời và trùng lịch như khi tạo; không đổi registration_id.
- **Dữ liệu vào / ra:** start_time, end_time; note? → AppointmentView.
- **Phụ thuộc:** Q-06, Q-11
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-005: Hủy lịch

- **Actor / scope:** Customer chính chủ, PT phụ trách, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:appointmentId/cancel`.
- **Luồng và quy tắc:** DRAFT: trạng thái đích CANCELLED; hạn hủy và nguồn trạng thái chờ Q-06.
- **Dữ liệu vào / ra:** note? → AppointmentView.
- **Phụ thuộc:** Q-06
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-006: Hoàn thành lịch

- **Actor / scope:** PT phụ trách, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:appointmentId/complete`.
- **Luồng và quy tắc:** DRAFT: đích COMPLETED; không tăng bộ đếm buổi không tồn tại hoặc tự hoàn tất Registration. Chống thực thi lặp sau khi chốt lifecycle.
- **Dữ liệu vào / ra:** note? → AppointmentView.
- **Phụ thuộc:** Q-05, Q-06
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-APP-008: Xác nhận lịch

- **Actor / scope:** Chờ quyết định quyền tại Q-06.
- **API:** `PATCH /api/v1/gyms/:gymId/pt-appointments/:appointmentId/confirm`.
- **Luồng và quy tắc:** DRAFT: thể hiện nhãn CONFIRMED của ERD, không mặc định PT/Manager/Customer nào được xác nhận.
- **Dữ liệu vào / ra:** — → AppointmentView.
- **Phụ thuộc:** Q-06
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-EQT-001: Tra cứu loại thiết bị

- **Actor / scope:** Authenticated, phục vụ luồng hợp lệ.
- **API:** `GET /api/v1/equipment-types`.
- **Luồng và quy tắc:** Danh mục dùng chung; không gắn gym_id. Không mở quyền ghi hoặc tạo endpoint CRUD loại thiết bị khi Q-09 chưa chốt.
- **Dữ liệu vào / ra:** — → equipment_types[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-EQP-001: Danh sách máy của Gym

- **Actor / scope:** Admin, Manager đúng Gym; Customer gửi report theo Q-09.
- **API:** `GET /api/v1/gyms/:gymId/equipments`.
- **Luồng và quy tắc:** Manager xem đầy đủ máy trong Gym; Customer chỉ dữ liệu chọn máy (equipment_id, gym_id, equipment_type_id, equipment_code). Eligibility Customer và lọc trạng thái máy chờ Q-09.
- **Dữ liệu vào / ra:** — → EquipmentView[].
- **Phụ thuộc:** Q-09
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-EQP-002: Thêm máy

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `POST /api/v1/gyms/:gymId/equipments`.
- **Luồng và quy tắc:** Loại thiết bị tồn tại; cặp gym_id/equipment_code duy nhất; Gym từ route đã kiểm tra.
- **Dữ liệu vào / ra:** equipment_type_id, equipment_code, condition, status; purchase_date? → equipments.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-EQP-003: Cập nhật máy

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/equipments/:equipmentId`.
- **Luồng và quy tắc:** Không nhận gym_id để chuyển Gym. condition tách status; xung đột mã máy trả 409. Chính sách ngừng dùng khi đang có report chờ Q-09.
- **Dữ liệu vào / ra:** equipment_type_id?, equipment_code?, purchase_date?, condition?, status? → equipments.
- **Phụ thuộc:** Q-09
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-001: Gửi report

- **Actor / scope:** Customer trong scope hợp lệ.
- **API:** `POST /api/v1/gyms/:gymId/reports`.
- **Luồng và quy tắc:** Lấy user_id từ phiên; EQUIPMENT phải chọn thiết bị cùng Gym; loại khác equipment_id có thể NULL nhưng nếu có vẫn cùng Gym. Tạo PENDING, kết quả xử lý NULL; tối đa một ảnh. Không nhận resolved_by/status.
- **Dữ liệu vào / ra:** report_type, title, content; equipment_id?, image_url? → gym_reports.
- **Phụ thuộc:** Q-09 (eligibility chọn máy)
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-002: Report của tôi

- **Actor / scope:** Customer.
- **API:** `GET /api/v1/reports/me`.
- **Luồng và quy tắc:** Chỉ user_id chính chủ, hiển thị kết quả giải quyết nếu có.
- **Dữ liệu vào / ra:** — → gym_reports[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-003: Report tại Gym

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/reports`.
- **Luồng và quy tắc:** Lọc Gym/status/report_type/equipment_id; không hiển thị báo cáo Gym khác.
- **Dữ liệu vào / ra:** — → gym_reports[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-004: Tiếp nhận report

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/investigate`.
- **Luồng và quy tắc:** PENDING → IN_PROGRESS; giữ route investigate hiện có nhưng payload dùng trạng thái mới.
- **Dữ liệu vào / ra:** — → gym_reports.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-005: Giải quyết report

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/resolve`.
- **Luồng và quy tắc:** IN_PROGRESS → RESOLVED; Backend gán resolved_by=auth.user_id, resolved_at=now, lưu resolution_note trong một cập nhật nguyên tử. Không tự chuyển condition máy sang GOOD.
- **Dữ liệu vào / ra:** resolution_note → gym_reports.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-REP-006: Từ chối report

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `PATCH /api/v1/gyms/:gymId/reports/:reportId/reject`.
- **Luồng và quy tắc:** DRAFT: trạng thái REJECTED; điều kiện từ chối và metadata cần chốt, không tự dùng resolved_at như đã giải quyết.
- **Dữ liệu vào / ra:** Chờ Q-13 → gym_reports.
- **Phụ thuộc:** Q-13
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-ADM-001: Danh sách User

- **Actor / scope:** Admin.
- **API:** `GET /api/v1/admin/users`.
- **Luồng và quy tắc:** Không trả password_hash, không log dữ liệu xác thực.
- **Dữ liệu vào / ra:** — → UserAdminView[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-ADM-002: Đổi trạng thái User

- **Actor / scope:** Admin.
- **API:** `PATCH /api/v1/admin/users/:userId/status`.
- **Luồng và quy tắc:** ACTIVE/INACTIVE/SUSPENDED; tài khoản không ACTIVE bị từ chối nghiệp vụ, kể cả JWT còn hạn.
- **Dữ liệu vào / ra:** status → UserAdminView.
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-ADM-003: Danh mục role

- **Actor / scope:** Admin.
- **API:** `GET /api/v1/admin/roles`.
- **Luồng và quy tắc:** Trả role_id, role_name, description; không tự thêm role thứ năm.
- **Dữ liệu vào / ra:** — → roles[].
- **Phụ thuộc:** Không có câu hỏi riêng; vẫn phụ thuộc schema/constraints dùng chung.
- **Nghiệm thu:** Đúng luồng trên và tiêu chí §2; không triển khai phần phụ thuộc khi Q chưa chốt.

### FEAT-GYM-006: Danh sách Gym quản trị

- **Actor / scope:** Admin.
- **API:** `GET /api/v1/admin/gyms`.
- **Luồng và quy tắc:** Danh sách tất cả Gym theo filter status, gồm ACTIVE và INACTIVE; không thay đổi projection/scope của GET /gyms công khai.
- **Dữ liệu vào / ra:** query phân trang/filter → gyms[].
- **Phụ thuộc:** Schema/constraints dùng chung.
- **Nghiệm thu:** Danh sách quản trị đầy đủ theo filter, không rò rỉ sang public hoặc Gym khác; 401/403/ownership tests theo API.

### FEAT-TRN-006: Danh sách PT quản trị

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/management/trainers`.
- **Luồng và quy tắc:** Danh sách phân công PT trong Gym, lọc ACTIVE/INACTIVE; không mở dữ liệu này qua endpoint public. Chỉ User thuộc scope được trả thông tin cần thiết, không trả password_hash.
- **Dữ liệu vào / ra:** query phân trang/filter → gym_trainers[].
- **Phụ thuộc:** Schema/constraints dùng chung.
- **Nghiệm thu:** Danh sách quản trị đầy đủ theo filter, không rò rỉ sang public hoặc Gym khác; 401/403/ownership tests theo API.

### FEAT-PKG-007: Danh sách Package quản trị

- **Actor / scope:** Admin, Manager đúng Gym.
- **API:** `GET /api/v1/gyms/:gymId/management/packages`.
- **Luồng và quy tắc:** Danh sách gói của Gym, gồm ACTIVE/INACTIVE, phân trang/lọc trạng thái; public list vẫn chỉ gói được công khai.
- **Dữ liệu vào / ra:** query phân trang/filter → packages[].
- **Phụ thuộc:** Schema/constraints dùng chung.
- **Nghiệm thu:** Danh sách quản trị đầy đủ theo filter, không rò rỉ sang public hoặc Gym khác; 401/403/ownership tests theo API.

## 4. Luồng liên bảng và tính năng chưa mở

### FEAT-PAY-003: Xác nhận thanh toán và tạo Membership

- **Actor:** Nguồn xác nhận server đáng tin cậy, hình thức cụ thể Q-01; không phải quyền Customer tự khai SUCCESS.
- **Luồng:** Payment PENDING → xác nhận thành công → SUCCESS, ghi paid_at/transaction_code → tạo Membership cùng User/Gym/Package và lưu purchase_price.
- **Transaction:** Một Payment tối đa một Membership kể cả retry/concurrency. Không dùng giá Package sau này để sửa giá lịch sử.
- **API:** Hợp đồng callback/gateway chưa chốt, không có route công khai trong catalog.
- **Phụ thuộc:** Q-01/Q-02/Q-11. Kiểm thử: giả mạo kết quả bị từ chối, callback lặp chỉ một thẻ, sai amount/Gym/User/Package không phát hành thẻ, rollback không tạo dữ liệu dở dang.

### FEAT-MEM-001: Membership phát sinh từ Payment

Kế thừa FEAT-PAY-003, không còn luồng Customer/Manager tạo trực tiếp qua POST memberships để bỏ qua Payment. payment_id NULL chỉ hỗ trợ khả năng dữ liệu; cấp thẻ thủ công chờ Q-03. Nghiệm thu: payment_id không trùng khi có giá trị, purchase_price giữ nguyên khi Package đổi giá.

### Các mã tính năng cũ chờ review, không tái sử dụng cho chức năng khác

| Feature ID | Nội dung | Trạng thái |
| :--- | :--- | :--- |
| FEAT-MEM-005 | Kích hoạt thẻ tại quầy | Chờ Q-02; không tự mặc định cần bước này sau SUCCESS |
| FEAT-MEM-006 | Bảo lưu thẻ | Không có trạng thái tương ứng trong ERD; chưa triển khai, cần yêu cầu nghiệp vụ riêng |
| FEAT-MEM-007 | Chấm dứt thẻ | Chờ Q-02/Q-13; không tự đổi tên thành CANCELLED rồi giữ logic cũ |
| FEAT-APP-007 | Đánh dấu vắng mặt | Chờ Q-06; ERD không có trạng thái vắng mặt hoặc bộ đếm buổi |

## 5. Ma trận quyền và scope

Theo [DOMAIN_RULES.md §8](DOMAIN_RULES.md#8-ma-trận-hành-động) và Actor/Scope của từng endpoint. Manager chỉ Gym có phân công ACTIVE; PT chỉ học viên/lịch mình phụ trách; Customer chỉ tài nguyên cá nhân. Admin vẫn phải bảo vệ quan hệ cùng Gym. Tra cứu máy cho Customer chờ eligibility tại Q-09, không mở danh sách nội bộ tự do.

## 6. Lifecycle và trạng thái giao diện

Dùng danh sách dự kiến ở Database §11. Report PENDING → IN_PROGRESS → RESOLVED ghi đủ kết quả. Payment PENDING → SUCCESS tạo thẻ theo Q-01/Q-02. Appointment PENDING/CONFIRMED không tương đương tự động với trạng thái đặt lịch cũ; việc giữ chỗ/xác nhận chờ Q-06. Không tự tăng quota khi COMPLETED hoặc suy ra Registration phải hoàn thành.

## 7. Ngoại lệ và tiêu chí kiểm thử trọng yếu

| Tình huống | Kết quả mong muốn |
| :--- | :--- |
| Client truyền User khác hoặc role quản trị | Không nhận/mạo danh; ownership từ phiên và quan hệ |
| Payment/Package/Membership hoặc Registration/PT khác Gym | Từ chối, không có dữ liệu dở dang |
| Payment được xác nhận hai lần | Tối đa một Membership; cơ chế chống lặp được kiểm thử |
| Package đổi giá | purchase_price cũ giữ nguyên; Payment chưa trả áp dụng policy Q-01 |
| Hai request đặt lịch trùng | Kết quả theo Q-06, không cùng thành công nếu vi phạm giữ chỗ |
| Manager bị thu hồi khi đang mở trang | Request tiếp theo bị Backend chặn, UI tải lại phiên |
| Equipment của Gym khác được gửi trong report | Từ chối dù equipment_id có tồn tại |
| Report resolved_by do client tự gửi | Không cho ghi; Backend lấy User xử lý |
| Đổi PT sau khi có lịch | Không tự làm sai lịch sử; chờ Q-07 |
| must_change_password=true | Chỉ cho luồng đổi mật khẩu/phiên/logout, không cho tiếp tục nghiệp vụ |

## 8. Câu hỏi mở

Danh mục duy nhất Q-01–Q-13 tại Domain §9. Không thêm bảng/cột để giải quyết thay người dùng. Đặc tả mới không tự cho phép đa Gym, thẻ miễn thanh toán, hoàn tiền, quota buổi hoặc tự động bảo trì thiết bị.

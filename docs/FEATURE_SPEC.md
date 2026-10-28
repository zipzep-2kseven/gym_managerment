# Multi-Gym Platform — Feature Specification

**R22 — 14/10/2026:** SCR-ADM-015 chuẩn hóa theo REQ/AC-ADM-BASE-24–26: scope Gym, paging độc lập20, nguồn read-only và lịch UTC+7; kết thúc Registration có lý do, khóa ghi/đọc lại theo ID khi kết quả chưa rõ. Giữ quyền/API PT hiện hành. [Phạm vi, ảnh và kiểm chứng](ADMIN_PT_WORKSPACE_VERIFICATION.md).

**R21 — 12/10/2026:** SCR-ADM-014 đã chuẩn hóa Gallery Admin theo5 REQ/AC-ADM-BASE-15–19: Gym INACTIVE nội bộ, quota10 và liên khóa mutations/đọc ảnh, caption CAS, reorder đầy đủ IDs, xác nhận xóa cùng receipt/readback. Private bytes401/403 kiểm phiên và gỡ dữ liệu; lost upload không tự retry hay suy identity từ gallery. [Bằng chứng R21](ADMIN_GALLERY_VERIFICATION.md). Giữ GIM-01 API/policy/storage; tiếp theo R22 giám sát PT.

**R20 — 12/10/2026:** SCR-ADM-013 đã chuẩn hóa catalog gói Admin theo5 REQ/AC-ADM-BASE-10–14: Gym INACTIVE được quản trị nội bộ, URL/paging12, snapshot/partial PATCH/null, xác nhận status, pending/receipt và chốt đọc lại sau phản hồi chưa rõ. [Bằng chứng R20](ADMIN_PACKAGES_VERIFICATION.md). Cùng field last write wins; tên không duy nhất, lost POST không tự gửi lại hay suy gói của mình. Không đổi API/policy/history; tiếp theo R21 Gallery Gym.

**Cập nhật R19 — 12/10/2026:** đã chuẩn hóa kiểm duyệt đánh giá Admin SCR-ADM-008 theo REQ/AC-ADM-BASE-27/28. Selector giữ Gym đã chọn khi tìm/chuyển trang; review giữ nội dung gốc và audit. Pending khóa thao tác, lỗi chưa rõ bắt buộc đọc lại đúng kind/Gym trước gửi mới, lỗi quyền gỡ dữ liệu và kiểm phiên. [Bằng chứng R19](ADMIN_REVIEW_MODERATION_VERIFICATION.md). Giữ contract/policy REV-02; tiếp theo R20 quản lý gói tập Admin.

**R18 — 12/10/2026:** SCR-ADM-012 `/admin/reports` chọn/tìm/lọc/phân trang Gym đã triển khai; SCR-ADM-007 reset actor/Gym và xử lý pending/conflict/unknown outcome theo quyền hiện có. [Báo cáo R18](ADMIN_REPORT_ENTRY_VERIFICATION.md) đối chiếu8 REQ/AC/TC. Scope G2 đã duyệt; mô tả entry PROPOSED/OPEN phía dưới là lịch sử. Tiếp theo R19 kiểm duyệt đánh giá Admin.

**R17 — 12/10/2026:** FEAT-MEM-003 đã có màn Admin riêng SCR-ADM-011 `/admin/gyms/:gymId/memberships`, paging-only20, mọi trạng thái và thông tin dòng chỉ đọc. Scope G2 đã duyệt; [báo cáo R17](ADMIN_MEMBERSHIP_VERIFICATION.md) đối chiếu10 REQ/AC/TC. Mô tả PROPOSED/OPEN/chưa triển khai Membership bên dưới là lịch sử đặc tả; tiếp theo R18 entry báo cáo theo §5.6.

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

## Quyết định G2 hiện hành — 11/10/2026

Người dùng yêu cầu “áp dụng các đề xuất và thực hiện” sau danh sách sáu nội dung duyệt. G2 **APPROVED về phạm vi thiết kế**: baseline Admin; PT roster/tiếp nhận; Membership read-only/paging-only; entry chọn Gym cho report scoped; nhãn “Đánh giá Gym toàn sàn”; các cải thiện UX/state/error/reload/cache/page recovery/keyboard/focus đã nêu. ADM-DEC-01–04 APPROVED về nội dung này; không mở quyền/API/backend/payment. Những trạng thái OPEN/PROPOSED/chưa duyệt trong các mục đặc tả ngày trước là lịch sử, được quyết định này thay thế về scope; route mới vẫn **chưa triển khai**. G3 chưa duyệt, các GAP được đưa vào thiết kế chưa phải lỗi đã sửa hoặc AC đã PASS.

ADM-DESIGN-01 đã soạn [ADMIN_FIGMA_BRIEF.md](ADMIN_FIGMA_BRIEF.md). Theo yêu cầu thực hiện bước02, đã tạo [pilot quản lý tài khoản để review](ADMIN_DESIGN_02_PILOT_REVIEW.md): prototype HTML độc lập có tương tác; Figma có24/33 frame được dựng và còn dở vì hạn mức Starter. ADM-DEC-06 đã chọn Figma + prototype HTML trong repo. ADM-DESIGN-02 **IN_PROGRESS — pilot READY_FOR_REVIEW**, G3 chưa duyệt. Theo yêu cầu ưu tiên Admin, đã tiếp tục [prototype vai trò/Gym/bổ nhiệm Manager](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md): tổng cộng5/15 Screen IDs được dựng,10 IDs còn lại chưa thiết kế. ADM-UI-01 chưa bắt đầu, không đổi frontend/API/backend.

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

### 5.1. Catalog Admin — ADM-SPEC-02 (11/10/2026)

Catalog này tập hợp **31 Feature ID đã có**, không tạo tính năng nghiệp vụ hoặc cấp quyền mới. Dùng cùng các quyết định hiện hành ở cuối Architecture/Domain/Feature và API contracts. Chi tiết quyền tại [Domain §8.1–8.3](DOMAIN_RULES.md#81-quy-ước-ma-trận-admin--adm-spec-02); inventory implementation tại [roadmap §2.1](ADMIN_SPECIFICATION_ROADMAP.md#21-inventory-nguồn--adm-spec-01-11102026).

**Trạng thái review:** catalog và ma trận được chuẩn bị để chủ dự án review; chưa đồng nghĩa duyệt các màn/route mới. BE/FE “đã có” là đối chiếu source, không phải kết quả test mới. ADMIN trong catalog không cộng quyền CUSTOMER/PT/MANAGER của tài khoản nhiều role.

| Feature ID | Mục đích / action Admin | Phạm vi, quyền (Domain) | API hiện có (prefix `/api/v1`) | Screen/implementation và phụ thuộc |
| --- | --- | --- | --- | --- |
| FEAT-ADM-001 | Tra cứu tài khoản | System; P-ADM-01 | GET `/admin/users` | SCR-ADM-002 `/admin/users`, BE/FE có; ADM-01 |
| FEAT-ADM-002 | Đổi trạng thái tài khoản | System; P-ADM-02/03 | PATCH `/admin/users/:userId/status` | SCR-ADM-002, BE/FE có; CAS, protect mọi Admin, không cascade |
| FEAT-ADM-003 | Đọc bốn role | System; P-ADM-04 | GET `/admin/roles` | SCR-ADM-003 `/admin/roles`, BE/FE có; không CRUD |
| FEAT-GYM-003 | Tạo Gym, có luồng tạo cùng Manager | System/new Gym; P-ADM-06 | POST `/gyms` | SCR-ADM-005 `/admin/gyms/create`, BE/FE có; onboarding atomic/credential handoff |
| FEAT-GYM-004 | Sửa thông tin Gym | Gym; P-ADM-07 | PATCH `/gyms/:gymId` | SCR-ADM-004/005 `/admin/gyms/:gymId`, BE/FE có; field allowlist |
| FEAT-GYM-005 | Kích hoạt/ngừng Gym | Gym; P-ADM-08 | PATCH `/gyms/:gymId/status` | SCR-ADM-005, BE/FE có; Q-13 nghĩa vụ, không force/cascade |
| FEAT-GYM-006 | Danh sách Gym nội bộ | System; P-ADM-05 | GET `/admin/gyms` | SCR-ADM-004 `/admin/gyms`, BE/FE có; filter ACTIVE/INACTIVE |
| FEAT-MGR-001 | Cấp tài khoản và phân công Manager | Gym; P-ADM-09 | POST `/admin/managers/provision` | SCR-ADM-006 `/admin/managers`, BE/FE có; provisioning/giới hạn ACTIVE |
| FEAT-MGR-002 | Đọc phân công Manager | Gym; P-ADM-10 | GET `/gyms/:gymId/managers` | SCR-ADM-006, BE/FE có; giữ đúng Gym |
| FEAT-MGR-003 | Gán/tái kích hoạt phân công Manager | Gym; P-ADM-11 | POST `/gyms/:gymId/managers/assign` | SCR-ADM-006, BE/FE có; target ACTIVE/MANAGER, không tự thay người cũ |
| FEAT-MGR-004 | Thu hồi phân công Manager | Gym; P-ADM-12 | POST `/gyms/:gymId/managers/:managerId/revoke` | SCR-ADM-006, BE/FE có; chỉ assignment hợp lệ/ACTIVE |
| FEAT-TRN-003 | Gán PT có tài khoản | Gym; P-ADM-13 | POST `/gyms/:gymId/trainers` | BE có; màn Admin riêng PROPOSED tại ADM-SPEC-05/ADM-DEC-02 |
| FEAT-TRN-004 | Ngừng/kích hoạt phân công PT | Gym; P-ADM-14 | PATCH `/gyms/:gymId/trainers/:trainerId/status` | BE có; Admin UI PROPOSED; Q-08/Q-13 nghĩa vụ/assignment |
| FEAT-TRN-005 | Cấp tài khoản PT mới | Gym; P-ADM-15 | POST `/gyms/:gymId/trainers/provision` | BE có; Admin UI PROPOSED; giới hạn provisioning và credential |
| FEAT-TRN-006 | Đọc roster nội bộ | Gym; P-ADM-16 | GET `/gyms/:gymId/management/trainers` | BE có; màn `/admin/gyms/:gymId/trainers` chỉ PROPOSED |
| FEAT-PKG-003 | Tạo gói tập | Gym; P-ADM-17 | POST `/gyms/:gymId/packages` | BE/FE có, `/admin/gyms/:gymId/packages`; screen scoped trong UI §PKG-02 |
| FEAT-PKG-004 | Sửa gói tập | Gym + Package; P-ADM-17 | PATCH `/gyms/:gymId/packages/:packageId` | BE/FE có; không sửa purchase_price đã mua |
| FEAT-PKG-005 | Ngừng bán gói | Gym + Package; P-ADM-17 | PATCH `/gyms/:gymId/packages/:packageId/deactivate` | BE/FE có; không hủy thẻ/payment cũ |
| FEAT-PKG-006 | Mở bán gói | Gym + Package; P-ADM-17 | PATCH `/gyms/:gymId/packages/:packageId/activate` | BE/FE có; không tự áp điều kiện nghĩa vụ của Gym/PT |
| FEAT-PKG-007 | Đọc catalog nội bộ | Gym; P-ADM-17 | GET `/gyms/:gymId/management/packages` | BE/FE có; dùng internal, không public list cho gói INACTIVE |
| FEAT-GIM-002 | Thêm/caption/order/delete gallery | Gym + Image; P-ADM-18 | GET `/gyms/:gymId/management/images`; POST `/gyms/:gymId/images`; PATCH `/gyms/:gymId/images/order`; PATCH/DELETE `/gyms/:gymId/images/:imageId` | BE/FE có, `/admin/gyms/:gymId/gallery`; GIM-01 demo/storage limits |
| FEAT-REP-003 | Đọc báo cáo/ảnh sự cố | Gym + Report; P-ADM-19 | GET `/gyms/:gymId/reports`; GET `/reports/:reportId/image` | SCR-ADM-007 scoped route có; entry point `/admin/reports` PROPOSED |
| FEAT-REP-004 | Tiếp nhận sự cố | Gym + Report; P-ADM-20 | PATCH `/gyms/:gymId/reports/:reportId/investigate` | BE/FE có; chỉ PENDING→IN_PROGRESS |
| FEAT-REP-005 | Giải quyết sự cố | Gym + Report; P-ADM-21 | PATCH `/gyms/:gymId/reports/:reportId/resolve` | BE/FE có; IN_PROGRESS→RESOLVED, ghi chú bắt buộc |
| FEAT-REP-006 | Từ chối sự cố | Gym + Report; P-ADM-22 | PATCH `/gyms/:gymId/reports/:reportId/reject` | BE/FE có; PENDING/IN_PROGRESS→REJECTED, lý do bắt buộc |
| FEAT-MEM-003 | Đọc thẻ theo Gym | Gym qua Membership; P-ADM-23 | GET `/gyms/:gymId/memberships` | BE/FE có; SCR-ADM-011 `/admin/gyms/:gymId/memberships` theo R17; page/pageSize |
| FEAT-PTR-003 | Đọc đăng ký PT theo Gym | Gym qua Membership/Trainer; P-ADM-24 | GET `/gyms/:gymId/pt-registrations` | BE/FE có `/admin/gyms/:gymId/pt`; cùng Gym, phân trang |
| FEAT-PTR-005 | Kết thúc đăng ký PT | Gym qua Registration; P-ADM-25 | PATCH `/gyms/:gymId/pt-registrations/:resourceId/cancel` | BE/FE có trong workspace Admin; note bắt buộc, không còn lịch mở |
| FEAT-APP-003 | Đọc lịch theo Gym | Gym qua Registration; P-ADM-26 | GET `/gyms/:gymId/pt-appointments` | BE/FE có workspace Admin; không Appointment write |
| FEAT-REV-005 | Đọc moderation Gym/PT | System, filter Gym; P-ADM-27 | GET `/admin/reviews` | SCR-ADM-008 `/admin/reviews`, BE/FE có; cả target INACTIVE, DTO private |
| FEAT-REV-006 | Ẩn review vi phạm | Target→Gym; P-ADM-28 | PATCH `/admin/reviews/:kind/:reviewId/hide` | SCR-ADM-008, BE/FE có; reason/audit, không sửa/xóa/unhide |

**Dashboard:** SCR-ADM-001 `/admin/dashboard` tổng hợp FEAT-GYM-006/ADM-001/REV-005 bằng nguồn list/metadata hiện có, không cấp Feature ID analytics mới. Review query kind=gym và nhãn rộng hơn nguồn vẫn là ADM-AUDIT-08/ADM-DEC-01 OPEN. Không thêm payment/revenue analytics.

**Ghi chú screen IDs:** các màn scoped package/gallery/PT đã có route được tham chiếu từ UI spec/updates; không tự cấp SCR-ADM mới để lấp chỗ trống ID. Màn mới chỉ được cấp ID/thiết kế sau review ADM-SPEC-05–07. Feature ID tồn tại không tự phê duyệt màn mới.

**Chức năng loại trừ và phụ thuộc quyết định:** role CRUD/reset password/delete user hoặc quản trị target Admin ngoài ADM-01; review edit/delete/unhide; Appointment writes do ADMIN riêng; Admin inbox Consultation/TPR-01/availability. Equipment/settings/audit viewer/notifications/search toàn hệ thống là backlog, không có contract mới được duyệt ở catalog này. Quản lý giao dịch tiền thật đã được người dùng loại khỏi đợt này.

### 5.2. Pilot quản lý tài khoản — ADM-SPEC-03 (11/10/2026, READY_FOR_REVIEW)

Pilot hoàn thiện mẫu đặc tả cho `FEAT-ADM-001/002`, màn `SCR-ADM-002`. Đây là tài liệu cho hành vi ADM-01 đã có; các cải thiện UX được đánh dấu riêng tại UI spec, chưa phải yêu cầu triển khai được duyệt. Contract chuẩn ở [API_SPEC §30](API_SPEC.md#30-adm-01--admin-user-management-2026-10-10); quyền ở [Domain §8](DOMAIN_RULES.md#8-ma-trận-hành-động). Các mã `REQ-ADM-ACC-*`, `AC-ADM-ACC-*`, `TC-ADM-ACC-*` dưới đây là mã truy vết tài liệu mới, không thay Feature/Screen ID hoặc tên test hiện có.

**Actor và điều kiện:** Admin toàn sàn, tài khoản DB đang ACTIVE, `must_change_password=false`, role ADMIN còn hiệu lực. Không dùng role trong JWT làm nguồn cấp quyền. P-ADM-01 cho đọc, P-ADM-02 cho đổi trạng thái có điều kiện, P-ADM-03 bảo vệ mọi target có ADMIN, P-ADM-04 cho danh mục role chỉ đọc. Không cần chọn Gym ở màn này; phân công Gym chỉ là thông tin ngữ cảnh. Manager/PT/Customer không có quyền chỉ vì có phân công.

#### Luồng chức năng và tiêu chí nghiệm thu

| Requirement mới / AC mới | Luồng và kết quả có thể kiểm chứng |
| --- | --- |
| REQ-ADM-ACC-01 / AC-ADM-ACC-01 | Vào `/admin/users` bằng actor hợp lệ: GET trang 1, pageSize=20, đọc tổng từ `total`; Guest 401, actor không đủ quyền 403. Quyền phải được kiểm tra lại từ DB cho từng request, kể cả sau khi role bị thu hồi hoặc tài khoản bị khóa. |
| REQ-ADM-ACC-02 / AC-ADM-ACC-02 | Nhập tên/email rồi bấm Tìm kiếm hoặc Enter: trim, chuỗi rỗng bỏ search; literal không phân biệt hoa/thường, `%`, `_`, `\` không trở thành wildcard. Đổi search đã áp dụng/role/status đưa về trang 1. Vai trò và trạng thái có lựa chọn Tất cả. |
| REQ-ADM-ACC-03 / AC-ADM-ACC-03 | Trang trước/sau giữ bộ lọc đã áp dụng; giới hạn nút theo page/page_size/total; sắp xếp `created_at DESC, user_id ASC`. Không dùng số dòng trang hiện tại làm tổng. Không có kết quả vẫn cho đổi bộ lọc/tải lại. |
| REQ-ADM-ACC-04 / AC-ADM-ACC-04 | Chỉ nhận/hiển thị projection trong từ điển bên dưới; không credential, hash, token, mật khẩu tạm, dữ liệu sức khỏe, địa chỉ/ngày sinh. Link Xem vai trò hệ thống sang SCR-ADM-003 chỉ đọc, không biến bộ lọc role thành thao tác gán role. |
| REQ-ADM-ACC-05 / AC-ADM-ACC-05 | Target có bất kỳ role ADMIN, gồm self: hiển thị “Tài khoản Admin được bảo vệ.” và không có nút đổi trạng thái. Gọi trực tiếp PATCH vẫn bị 403 `ADMIN_ACCOUNT_PROTECTED`. |
| REQ-ADM-ACC-06 / AC-ADM-ACC-06 | Target ACTIVE: Khóa tạm → xác nhận SUSPENDED; target INACTIVE/SUSPENDED: Mở lại → xác nhận ACTIVE. Hủy trước khi gửi không PATCH. Xác nhận nêu đúng target và hậu quả, nhắc bàn giao nếu có phân công MANAGER. Không có input lý do hoặc nút INACTIVE trong pilot. |
| REQ-ADM-ACC-07 / AC-ADM-ACC-07 | Xác nhận gửi đúng `{status,expected_updated_at}` lấy từ dòng đã đọc, UUID target trên path, query rỗng; server chuẩn hóa timestamp offset về UTC. Body/query dư, status ngoài enum, UUID/timestamp sai đều bị validation; không nhận actor/role/password/gym_id từ client. |
| REQ-ADM-ACC-08 / AC-ADM-ACC-08 | Pending khóa Xác nhận/Hủy của dòng đang gửi, không tự retry mutation. Hai request cùng version chỉ một request commit; stale → 409 `USER_CHANGED`, cùng trạng thái → 409 `INVALID_STATUS_TRANSITION`. Lỗi phải yêu cầu đọc lại dữ liệu trước một xác nhận mới, không tự cập nhật version rồi gửi lại. |
| REQ-ADM-ACC-09 / AC-ADM-ACC-09 | Thành công: thông báo, đóng xác nhận, tải lại danh sách theo bộ lọc hiện hành. Khóa/mở không đổi role, password gate, phân công, Membership, Registration, Appointment hoặc dữ liệu thanh toán demo. Khi không ACTIVE, phiên cũ và login bị chặn; mở lại giữ password gate và có thể cho JWT còn hạn hoạt động lại. |
| REQ-ADM-ACC-10 / AC-ADM-ACC-10 | GET/PATCH lỗi có trạng thái khôi phục tại SCR-ADM-002: không thông báo thành công khi request lỗi, không mất bộ lọc vì lỗi, 401/403 làm mới session theo luồng auth. Mất mạng/5xx sau PATCH phải tải lại kiểm tra kết quả vì không biết server đã commit hay chưa. |
| REQ-ADM-ACC-11 / AC-ADM-ACC-11 | Dùng Tab/Enter/Space truy cập tìm kiếm, bộ lọc, phân trang, xác nhận/hủy; trạng thái lỗi/thành công có thông báo trợ năng, không phụ thuộc màu. 375/768/1024/1440px không tràn ngang với email dài. Coverage bàn phím/focus vẫn cần bổ sung, không coi có semantic HTML là đã nghiệm thu. |

#### Từ điển UserAdminView

Tất cả field là **read-only** trong danh sách; PATCH chỉ nhận status đích và version. Nguồn: projection tại [admin-user.repository.ts](../apps/api/src/repositories/admin-user.repository.ts); kiểu frontend tại [admin-user.service.ts](../apps/web/src/services/admin-user.service.ts). “Không hiển thị” mô tả UI hiện tại, không phải quyền bổ sung.

| Field / nullable | Nguồn và mục đích | Cách dùng tại SCR-ADM-002 hiện tại |
| --- | --- | --- |
| `user_id` / không | User; định danh target và key | Không hiển thị; dùng path PATCH |
| `email` / không | User; nhận diện và tìm kiếm | Hiển thị email; fallback tên trong xác nhận |
| `phone` / có | User; liên hệ trong allowlist | Chỉ hiển thị khi có giá trị |
| `status` / không | User; ACTIVE/INACTIVE/SUSPENDED | Hoạt động / Ngừng hoạt động / Khóa tạm; xác định nút |
| `must_change_password` / không | User; gate mật khẩu tạm | Khi true: “Cần đổi mật khẩu tạm.”; không được sửa từ màn này |
| `email_verified_at` / có | User; metadata xác minh | Không hiển thị hoặc cho đổi |
| `created_at` / không | User; ngày tạo và thứ tự danh sách | “Tạo ngày …”, định dạng vi-VN, Asia/Ho_Chi_Minh |
| `updated_at` / không | User; version chống ghi stale | Không hiển thị; gửi nguyên thời điểm đã nhận làm expected_updated_at |
| `profile` / có | UserProfile left join; hồ sơ có thể chưa tồn tại | Không có/tên rỗng: “Chưa có hồ sơ” |
| `profile.full_name` / không khi profile có | UserProfile; tên hiển thị/tìm kiếm | Heading tên tài khoản, tên trong xác nhận |
| `profile.avatar_url` / có | UserProfile; URL avatar được projection | Chưa render avatar |
| `roles[]` / mảng có thể rỗng | UserRole/Role; các role được gán | Admin/Manager/PT/Customer; rỗng: “Chưa có vai trò” |
| `active_gym_assignments[]` / mảng có thể rỗng | GymManager/GymTrainer có phân công ACTIVE, join Gym | “Quản lý · tên Gym” hoặc “Huấn luyện viên · tên Gym”; không suy Gym đang ACTIVE |
| `…gym_id`, `…gym_name`, `…assignment_type` / không | Định danh/tên Gym; loại MANAGER/PT | ID kỹ thuật, tên và loại hiển thị; không cho chỉnh phân công |

#### Contract, giới hạn và hậu điều kiện

- GET `/api/v1/admin/users`: search trim ≤100; role ADMIN/MANAGER/PT/CUSTOMER; status ACTIVE/INACTIVE/SUSPENDED; page 1–100000 mặc định 1; pageSize 1–50 mặc định 20. Frontend hiện cố định 20. Success `{success:true,data:{items,page,page_size,total}}`; response nội bộ `Cache-Control: no-store`.
- PATCH `/api/v1/admin/users/:userId/status`: UUID; body strict `{status,expected_updated_at}`; status API cho phép cả ba enum, UI chỉ gửi ACTIVE/SUSPENDED. Success `{success:true,data:UserAdminView}`. Không suy API có INACTIVE thành nút ngừng vĩnh viễn hoặc xóa tài khoản.
- Server khóa/đọc lại actor và target, kiểm tra quyền/bảo vệ Admin/version trước ghi, cập nhật status và updated_at. Sự kiện sau commit chỉ chứa actor/target/trạng thái/thời điểm; không có lý do bắt buộc, audit viewer hoặc lịch sử audit bền vững trong scope.
- Không CRUD role, reset password, xóa User, chỉnh profile hoặc gán/thu hồi Gym từ pilot. Không mở quản lý giao dịch tiền thật. Việc xử lý lịch/phân công còn tồn tại dùng luồng riêng đúng quyền; Admin-only không được cấp thêm quyền ghi Appointment.

Mapping AC → API → Screen → source/test và các khoảng trống tại [Implementation §5.1](IMPLEMENTATION_PLAN.md#51-truy-vết-pilot-tài-khoản--adm-spec-03).

### 5.3. Đặc tả chức năng Admin hiện hành — ADM-SPEC-04 (11/10/2026, READY_FOR_REVIEW)

Người dùng yêu cầu bước tiếp theo sau pilot: dùng mẫu Field → Flow → State/Error → AC → Test cho baseline. Không suy thành duyệt GAP hoặc các màn mới. Quyền tham chiếu [Domain §8.2](DOMAIN_RULES.md#82-ma-trận-hành-động-admin-chi-tiết), contract tham chiếu các mục hiện hành của [API_SPEC](API_SPEC.md); không tạo endpoint hoặc Feature/Screen ID. `REQ-ADM-BASE-*`, `AC-ADM-BASE-*`, `TC-ADM-BASE-*` là mã truy vết tài liệu mới. Mỗi REQ dưới có AC cùng hậu tố; kết quả phải được kiểm chứng, chưa nhận PASS từ việc đọc mã.

**Điều kiện chung:** actor có ADMIN hiện hành từ DB, account ACTIVE, qua password gate. Quyền toàn sàn vẫn kiểm tra Gym/resource cụ thể; UUID sai 400, resource thuộc Gym khác không được coi là của Gym trên route. Chỉ đọc DTO allowlist; ID/timestamp/status/actor là read-only trừ action có contract. Không thanh toán tiền thật/refund/revenue analytics. PT roster/provision UI và Membership độc lập còn ở ADM-SPEC-05/06; report entry toàn sàn ở ADM-SPEC-07.

#### 5.3.1. Vai trò, Gym và tạo cơ sở kèm Manager

**Actor/scope:** P-ADM-04–08; role list toàn hệ thống, list Gym toàn sàn, sửa/status theo Gym route. SCR-ADM-003/004/005; frontend `adminGym()` tìm ID bằng cách đọc tuần tự các trang GET `/admin/gyms` pageSize=100, không có endpoint detail `/admin/gyms/:gymId` và không dùng public detail cho Gym INACTIVE. API §14/15/17/19/23/30.

| Field / nguồn | Validation, nullable và mục đích |
| --- | --- |
| Role `role_id`, `role_name`, `description` | Role; ID/name read-only, description nullable. Bốn role ADMIN/MANAGER/PT/CUSTOMER; không Guest hoặc CRUD. |
| Gym `gym_id`, `status`, `created_at`, `updated_at` | Gym; metadata read-only trong form, status đổi ở endpoint riêng. Không chuyển ID/scope hoặc nhận timestamps từ client. |
| `gym_name`, `address` | Gym; trim, bắt buộc không rỗng khi tạo, PATCH bỏ qua giữ nguyên; không nhận null. |
| `description`, `phone`, `email`, `logo_url` | Gym; tùy chọn/nullable; description text; phone trim 1–20 ký tự; email lowercase hợp lệ ≤254; logo HTTP(S), không phải upload. Đây là liên hệ Gym, không phải tài khoản Manager. |
| `latitude`, `longitude`, `opening_time`, `closing_time` | Gym; nullable; tọa độ [-90,90]/[-180,180], DTO decimal string; HH:mm hoặc HH:mm:ss → HH:mm:ss. Không bắt closing>opening vì có thể qua đêm. |
| `manager.email`, `manager.full_name`, `manager.phone` | User/Profile qua tạo nguyên tử; email lowercase, tên 2–100, phone tùy chọn nullable theo staff validator. Không nhận role/password/user_id/status/assignment do client cấp. |
| Result `manager.user`, `manager.assignment`, `manager.temporary_password` | Server trả một lần khi tạo cùng Manager; tài khoản ACTIVE/MANAGER, must_change_password=true. Plaintext chỉ phục vụ bàn giao ở form đang mount; không API lấy lại. |

| REQ mới (AC cùng hậu tố) | Feature và luồng → tiêu chí nghiệm thu |
| --- | --- |
| REQ-ADM-BASE-01 / AC-ADM-BASE-01 | FEAT-ADM-003: GET `/admin/roles`, query rỗng → đọc bốn role; description null có fallback. Không nút create/edit/delete role. |
| REQ-ADM-BASE-02 / AC-ADM-BASE-02 | FEAT-GYM-006: GET `/admin/gyms`, search/status/page/pageSize/sort → list cả ACTIVE/INACTIVE theo filter, tổng metadata cùng bộ lọc; search literal, sort có tie-break gym_id. Màn sửa tìm ID qua các trang list nội bộ, hết trang chưa tìm thấy tạo lỗi NOT_FOUND phía client; không bịa API detail nội bộ. |
| REQ-ADM-BASE-03 / AC-ADM-BASE-03 | FEAT-GYM-003: POST `/gyms` body Gym + manager optional ở API; UI tạo hiện bắt nhập Manager → 201 cùng assignment đúng Gym. Lỗi identity/assignment/config rollback Gym/User/Profile/Role/Assignment toàn bộ; pending chặn submit; credential hiển thị một lần, ẩn sau bàn giao, không trả lại ở GET/error. |
| REQ-ADM-BASE-04 / AC-ADM-BASE-04 | FEAT-GYM-004: PATCH `/gyms/:gymId` chỉ field thông tin thay đổi; bỏ qua giữ nguyên, nullable null xóa. Giữ ID/status/created_at, không PATCH manager hoặc kích hoạt Gym bằng form; Gym INACTIVE vẫn sửa được đúng scope. Không có CAS Gym info; cập nhật độc lập không ghi đè field không gửi. |
| REQ-ADM-BASE-05 / AC-ADM-BASE-05 | FEAT-GYM-005: xác nhận PATCH `/gyms/:gymId/status` `{status:ACTIVE|INACTIVE}`; same status 409. Ngừng bị chặn nếu Payment demo PENDING, Membership PENDING/ACTIVE, Registration ACTIVE hoặc Appointment PENDING/CONFIRMED, gồm lịch quá giờ; 409 trả counts. Không force/cascade, không tự xử lý nghĩa vụ. |

**State/error/recovery:** list loading/empty/error/retry; form pending/success/error giữ input; Gym status xác nhận inline, Hủy không API. 409 EMAIL_ALREADY_EXISTS/PHONE_ALREADY_EXISTS: sửa identity và gửi mới; GYM_HAS_OPEN_OBLIGATIONS: hiển thị counts, xử lý bằng luồng riêng đủ quyền rồi đọc lại trước xác nhận. 401/403 cập nhật session/gate; 404 không render form tài nguyên. POST mất response sau commit: kiểm tra list Gym/phân công, không tự retry, chưa có idempotency hoặc lấy lại mật khẩu. Partial PATCH không bảo đảm tránh ghi đè cùng field; đây là giới hạn hiện hành cần giữ trong design brief.

#### 5.3.2. Cấp và phân công Manager

**Actor/scope:** P-ADM-09–12, SCR-ADM-006 `/admin/managers`, API §14. Chọn Gym bằng danh sách quản trị phân trang; không tự bổ nhiệm người mới thay thế người đang ACTIVE.

| Field / nguồn | Validation, nullable và mục đích |
| --- | --- |
| `gym_id` / Gym | Gym đã chọn; input UUID cho provision, path cho list/assign/revoke. Không tự suy Gym từ User ID. |
| `user_id` / User | UUID target trong body assign; target tồn tại, ACTIVE, có MANAGER trong DB. Target chưa đổi mật khẩu tạm vẫn được phân công; actor phải qua gate. |
| `email`, `full_name`, `phone` / User/Profile | Provision theo staff identity validator; phone nullable; không password/role/status do client cấp. |
| `gym_manager_id`, `gym_id`, `user_id`, `status`, `assigned_at`, metadata tạo / GymManager | Read-only từ assignment; UI hiện hiển thị User ID/status/assigned_at. Reactivate giữ ID/created_at, assigned_at là lần ACTIVE gần nhất; không giả lịch sử đầy đủ. |
| `user`, `assignment`, `temporary_password` / provision result | Credential một lần; list/assign/revoke không trả mật khẩu. Không lưu vào Web Storage hoặc log. |

| REQ mới (AC cùng hậu tố) | Feature và luồng → tiêu chí nghiệm thu |
| --- | --- |
| REQ-ADM-BASE-06 / AC-ADM-BASE-06 | FEAT-MGR-002: GET `/gyms/:gymId/managers` → assignment đúng Gym gồm trạng thái; không coi một trang Gym selector là mọi Gym. Chưa chọn Gym không gọi list/provision/assign/revoke. |
| REQ-ADM-BASE-07 / AC-ADM-BASE-07 | FEAT-MGR-001: POST `/admin/managers/provision` `{gym_id,email,full_name,phone?}` → 201 User/Profile/MANAGER/assignment nguyên tử, bàn giao mật khẩu và yêu cầu đổi lần đầu. Conflict rollback toàn bộ, không retry để lấy lại credential. |
| REQ-ADM-BASE-08 / AC-ADM-BASE-08 | FEAT-MGR-003: POST `/gyms/:gymId/managers/assign` `{user_id}` → assign mới hoặc reactivate cùng row. Một Manager ACTIVE/Gym và một Gym ACTIVE/User; target sai role/account bị từ chối; không revoke người cũ tự động. |
| REQ-ADM-BASE-09 / AC-ADM-BASE-09 | FEAT-MGR-004: xác nhận POST `/gyms/:gymId/managers/:managerId/revoke` body rỗng → ACTIVE→INACTIVE; giữ User/role/history. Sai Gym 404; already INACTIVE 409; chọn Gym khác phải xóa form/credential ngữ cảnh cũ. |

**State/error/recovery:** selector loading/empty/error; chọn Gym mở StaffForm + assignment list; assign bằng User ID hoặc cấp mới bằng identity. Pending khóa form/revoke; success đọc lại phân công, plaintext chỉ trong mounted form và có nút ẩn. 409 GYM_ALREADY_HAS_ACTIVE_MANAGER/USER_ALREADY_ACTIVE_MANAGER/ASSIGNMENT_ALREADY_EXISTS: giữ target cũ, hướng dẫn kiểm tra/thu hồi rõ ràng rồi thao tác mới. 404 missing target, 403 ACCOUNT_DEACTIVATED/INSUFFICIENT_ROLE: không tự đổi account/role. Mất response provision kiểm tra danh sách và tài khoản, không hứa khôi phục credential. Chưa có màn tìm User thay input UUID.

#### 5.3.3. Gói tập và Gallery theo Gym

**Actor/scope:** P-ADM-17/18, `/admin/gyms/:gymId/packages`, `/admin/gyms/:gymId/gallery`; screen scoped đã ghi ở cập nhật PKG-02/GIM-01, không cấp ID trùng. API §20/26. Được quản trị nội bộ Gym INACTIVE khi actor còn quyền; không làm Gym xuất hiện public.

| Field / nguồn | Validation, nullable và mục đích |
| --- | --- |
| Package `package_id`, `gym_id`, `status`, timestamps | Package; read-only trong form, định danh/phân trang/trạng thái. Không DELETE package. |
| `package_name`, `duration_days`, `price`, `description` | Tên trim không rỗng; ngày JSON integer 1–2147483647; giá decimal string không âm ≤999999999999.99, ≤2 số lẻ, không exponent/comma/number, chuẩn hóa hai số lẻ; description nullable. Đây là giá catalog, không quản lý giao dịch tiền thật. |
| Gallery `image_id`, `gym_id`, `display_order`, `updated_at` | GymImage; read-only, thứ tự/identity/version; không storage key/actor/path do client chọn. |
| `caption` | Nullable; trim ≤200, rỗng→null; PATCH kèm expected_updated_at từ DTO. |
| Upload `image.mime_type`, `image.data` | JPEG/PNG base64 canonical; một ảnh ≤5MiB, ≤20M pixels. UI resize cạnh dài 1600/re-encode JPEG; server kiểm tra và loại metadata độc lập. Không tên file/image_url hoặc storage provider mới. |
| Reorder `expected_image_ids`, `image_ids` | Snapshot thứ tự cũ và toàn bộ thứ tự mới; mỗi ID hiện tại đúng một lần, tối đa 10; không ID Gym khác. |

| REQ mới (AC cùng hậu tố) | Feature và luồng → tiêu chí nghiệm thu |
| --- | --- |
| REQ-ADM-BASE-10 / AC-ADM-BASE-10 | FEAT-PKG-007: GET `/gyms/:gymId/management/packages` search/status/sort/paging → catalog gồm INACTIVE, tổng đúng scope; dùng internal thay public. |
| REQ-ADM-BASE-11 / AC-ADM-BASE-11 | FEAT-PKG-003: POST `/gyms/:gymId/packages` field form allowlist → 201 ACTIVE, pending khóa submit, success chặn tạo trùng trong form đã lưu. |
| REQ-ADM-BASE-12 / AC-ADM-BASE-12 | FEAT-PKG-004: PATCH `/gyms/:gymId/packages/:packageId` chỉ field thay đổi → giữ omitted/identity/status, null xóa description; giá/ngày mới không đổi purchase_price/ngày của thẻ hoặc payment demo đã có. |
| REQ-ADM-BASE-13 / AC-ADM-BASE-13 | FEAT-PKG-005: xác nhận PATCH `…/:packageId/deactivate` body rỗng → INACTIVE, ẩn public; không hủy Membership hoặc kiểm nghĩa vụ như ngừng Gym/PT. |
| REQ-ADM-BASE-14 / AC-ADM-BASE-14 | FEAT-PKG-006: xác nhận PATCH `…/:packageId/activate` body rỗng → ACTIVE; status actions hiện repeatable, không tự ghi same-status thành 409 của Gym. |
| REQ-ADM-BASE-15 / AC-ADM-BASE-15 | FEAT-GIM-002 read: GET `/gyms/:gymId/management/images` query rỗng → list và bytes private theo đúng Gym; ảnh đầu là cover gallery, logo độc lập; caption null có fallback, ảnh lỗi không phá thao tác. |
| REQ-ADM-BASE-16 / AC-ADM-BASE-16 | FEAT-GIM-002 upload: POST `/gyms/:gymId/images` `{image,caption?}` → 201; quota tối đa 10 kiểm lại transaction. Hai upload tranh slot cuối không vượt quota; form đọc ảnh/pending không cho submit lặp. |
| REQ-ADM-BASE-17 / AC-ADM-BASE-17 | FEAT-GIM-002 caption: PATCH `…/images/:imageId` `{caption,expected_updated_at}` → lưu đúng version; stale 409 GALLERY_CHANGED, tải lại trước chỉnh tiếp. |
| REQ-ADM-BASE-18 / AC-ADM-BASE-18 | FEAT-GIM-002 reorder: PATCH `…/images/order` `{expected_image_ids,image_ids}` → cập nhật nguyên tử; Lên/Xuống giữ đủ ID, không drag-drop giả; stale/foreign/duplicate không ghi một phần. |
| REQ-ADM-BASE-19 / AC-ADM-BASE-19 | FEAT-GIM-002 delete: xác nhận DELETE `…/images/:imageId` body vắng/{} → xóa row rồi cleanup file, URL cũ 404; không xóa ảnh Report. Ngừng Gym giữ gallery row/file, public list/bytes mới 404. |

**State/error/recovery:** Package list loading/empty/error, tạo/sửa form inline, pending và status xác nhận; đọc lại catalog sau success. Gallery chọn ảnh→đọc/preview→upload, lỗi giữ ảnh/caption để sửa, success clear upload và invalidate gallery; caption/reorder/delete có mutation chung, chưa liên khóa với upload riêng. 409 GALLERY_LIMIT: đọc lại quota; GALLERY_CHANGED: Làm mới ảnh rồi chỉnh snapshot mới. 413 giảm payload, 503 GALLERY_UPLOAD_DISABLED: giữ giải thích storage demo chưa bật production, không đổi provider trong task này. POST mất response: đọc lại trước gửi mới; PATCH price/form không có CAS, không bảo đảm đồng thời cùng field. No-store list và bytes, không static public directory.

#### 5.3.4. Báo cáo sự cố, đăng ký PT và lịch đọc

**Actor/scope:** P-ADM-19–26, SCR-ADM-007 scoped `/admin/gyms/:gymId/reports`, workspace `/admin/gyms/:gymId/pt`; API §22/24. Được xử lý lịch sử Gym INACTIVE nếu quyền còn hiệu lực. Không inbox report toàn sàn mới, không tạo Registration hoặc ghi Appointment bằng role ADMIN riêng.

| Field / nguồn | Nullable/read-only và mục đích |
| --- | --- |
| Report `report_id`, `gym_id`, `gym_name`, `content`, `status`, `has_image`, `created_at`, `updated_at` | Report/Gym; chứng cứ gốc và metadata read-only; ảnh qua private endpoint, không sửa/xóa content/ảnh/author. Không email/credential/storage key. |
| `resolution_note`, `resolved_at` | Nullable trong DTO; note trim 1–2000 bắt buộc khi resolve/reject. Server gán actor; resolve ghi thời gian, reject resolved_at=null và dùng updated_at làm thời điểm từ chối. |
| Registration `registration_id`, `membership_id`, `gym_trainer_id`, `status`, `note`; `membership`, `customer`, `trainer`, `gym` | Registration join Membership/PT/Gym/Profile; read-only identity/status/source, note nullable. Tên customer/trainer nullable fallback Hội viên/PT; ngày thẻ và scope theo membership.gym_id. Không contact/credential. |
| Appointment `appointment_id`, `registration_id`, `start_time`, `end_time`, `status`, `note`, `registration` | Appointment + Registration; read-only ở Admin workspace, note nullable, timestamp hiển thị giờ Việt Nam. Không suy giờ đã qua thành COMPLETED. |
| Cancel Registration `{note}` | Lý do bắt buộc theo pt-workflow validator; giữ nguồn/history, không tự tạo Registration thay thế. |

| REQ mới (AC cùng hậu tố) | Feature và luồng → tiêu chí nghiệm thu |
| --- | --- |
| REQ-ADM-BASE-20 / AC-ADM-BASE-20 | FEAT-REP-003: GET `/gyms/:gymId/reports` page/pageSize/status, GET `/reports/:reportId/image` private → đúng Gym, cả terminal/history; ảnh thiếu 404, unauthorized không bytes. |
| REQ-ADM-BASE-21 / AC-ADM-BASE-21 | FEAT-REP-004: nút Tiếp nhận PATCH `…/reports/:reportId/investigate` `{}` → chỉ PENDING→IN_PROGRESS; UI hiện gửi trực tiếp, không modal xác nhận. |
| REQ-ADM-BASE-22 / AC-ADM-BASE-22 | FEAT-REP-005: chọn Giải quyết, nhập resolution_note rồi Lưu kết quả PATCH `…/resolve` → chỉ IN_PROGRESS→RESOLVED; server gán actor/time, giữ chứng cứ. |
| REQ-ADM-BASE-23 / AC-ADM-BASE-23 | FEAT-REP-006: chọn Từ chối, nhập lý do PATCH `…/reject` → PENDING/IN_PROGRESS→REJECTED; terminal không action/reopen, concurrent terminal chỉ một winner. |
| REQ-ADM-BASE-24 / AC-ADM-BASE-24 | FEAT-PTR-003: GET `/gyms/:gymId/pt-registrations` page/pageSize → đúng Gym qua Membership/PT, pagination độc lập lịch; tất cả dữ liệu nguồn read-only, không edit PT tại chỗ. |
| REQ-ADM-BASE-25 / AC-ADM-BASE-25 | FEAT-PTR-005: Kết thúc đăng ký / đổi PT → ReasonForm nhập note, PATCH `/gyms/:gymId/pt-registrations/:resourceId/cancel` → ACTIVE→CANCELLED khi không còn PENDING/CONFIRMED Appointment. 409 REGISTRATION_HAS_OPEN_APPOINTMENTS không tự cancel lịch; giữ lịch sử, tạo đăng ký mới ở luồng đúng actor. |
| REQ-ADM-BASE-26 / AC-ADM-BASE-26 | FEAT-APP-003: GET `/gyms/:gymId/pt-appointments` page/pageSize → list giờ Việt Nam; Admin mode không có nút tạo/dời/hủy/xác nhận/hoàn thành lịch hoặc availability. |

**State/error/recovery:** Reports filter status đưa về page 1; pending khóa vùng action, lỗi giữ note, thành công refetch reports. Ảnh lỗi có lời nhắc kiểm tra phiên/làm mới; không chuyển sang URL public. 409 trạng thái/concurrency: đọc lại trạng thái terminal trước thao tác mới; 404 sai Gym/missing không lộ chứng cứ. PT có hai query/pager, lỗi từng vùng và Làm mới danh sách; ReasonForm pending khóa gửi/hủy, lỗi giữ lý do, success đóng form/invalidate pt. Có nghĩa vụ mở: staff có quyền xử lý ở luồng khác, không bổ sung quyền Appointment cho Admin. Không có search/status/date filter mới cho PT khi contract chỉ page/pageSize.

#### 5.3.5. Kiểm duyệt đánh giá Gym/PT

**Actor/scope:** P-ADM-27/28/29, SCR-ADM-008 `/admin/reviews`, API §29; đọc cả target Gym/PT INACTIVE. Chính sách vi phạm nội dung; điểm thấp/góp ý dịch vụ không phải lý do ẩn.

| Field / nguồn | Nullable/read-only và mục đích |
| --- | --- |
| `review_id`, `kind`, `rating`, `comment`, `status`, `created_at` | GymReview/TrainerReview; comment nullable; rating/comment/author bất biến. kind gym/trainer xác định endpoint, không dùng ID cùng kind khác. |
| `gym {gym_id,gym_name,status}`, `trainer {gym_trainer_id,full_name,status}` | Target context; trainer null với Gym review, full_name có thể null. Hiển thị target ngừng để hiểu lịch sử, không cấm moderation chỉ vì INACTIVE. |
| `author {user_id,full_name}` | Tác giả trong DTO nội bộ; không email/phone. User ID kỹ thuật, tên hiển thị; không chọn lại author. |
| `moderation {hidden_by,moderator_name,hidden_at,hidden_reason}` | Nullable nếu chưa ẩn; audit do server ghi, chỉ đọc ở Admin. Không coi đây là viewer audit toàn hệ thống hoặc lộ cho public/Customer. |
| Input `hidden_reason` | Trim 1–1000; bắt buộc; server tự gán actor/time/status, không nhận audit/content/rating trong body. |

| REQ mới (AC cùng hậu tố) | Feature và luồng → tiêu chí nghiệm thu |
| --- | --- |
| REQ-ADM-BASE-27 / AC-ADM-BASE-27 | FEAT-REV-005: GET `/admin/reviews` kind/gym_id/status/page/pageSize → total đúng query, default gym, frontend pageSize=10; bộ chọn Gym có search/pager riêng, giữ lựa chọn khi chuyển trang selector. Target missing filter có thể empty, không tự endpoint analytics. |
| REQ-ADM-BASE-28 / AC-ADM-BASE-28 | FEAT-REV-006: VISIBLE → Ẩn đánh giá → lý do → Tiếp tục → Xác nhận ẩn, PATCH `/admin/reviews/:kind/:reviewId/hide` `{hidden_reason}` → HIDDEN/audit, original giữ nguyên và bị loại khỏi public list/average. Hủy không mutation, sửa reason reset xác nhận; đồng thời chỉ một commit, repeated 409 REVIEW_NOT_VISIBLE; không edit/delete/unhide. |

**State/error/recovery hiện hành R19:** loading/empty/error/retry; filter đổi reset page1/form, selector Gym có search/pager riêng và giữ nhãn đã chọn. Pending khóa reason/submit/hủy/filter/page; synchronous guard và mutation retry=false. Success báo role=status, về page1, invalidate moderation/public reviews; receipt còn nếu refetch lỗi.400 giữ reason để sửa;409/404/network/5xx khóa ghi/hủy/đổi filter đến khi đọc lại đúng kind/Gym và danh sách thành công. Read-back bỏ status hiển thị, quét paging10 đến đúng ID; missing không thử kind khác hoặc coi mất khỏi filter là đã ẩn.401/403 gỡ dữ liệu/form và refresh session trước guard. Heading/reason/confirmation/receipt được focus; Escape/hủy trả nút hiện hành. State/lock nằm trong mounted actor subtree; xem [giới hạn và bằng chứng R19](ADMIN_REVIEW_MODERATION_VERIFICATION.md).

**Truy vết và giới hạn thiết kế:** UI/state/hành vi thực tế tại [UI_UX_SPEC — ADM-SPEC-04](UI_UX_SPEC.md#adm-spec-04--baseline-admin-đầu-vào-thiết-kế-11102026), AC/test tại [Implementation §5.2](IMPLEMENTATION_PLAN.md#52-truy-vết-baseline-admin--adm-spec-04). Không đồng nhất các UI xác nhận đang khác nhau thành một modal đã có; việc chuẩn hóa và bổ sung kiểm thử thực hiện sau design review.

### 5.4. Đề xuất Admin quản lý PT theo Gym — ADM-SPEC-05 (11/10/2026, READY_FOR_REVIEW)

**Cập nhật R16, 12/10/2026:** hai màn PT Admin đã được đối chiếu12 REQ/AC/TC trong [nghiệm thu R16](ADMIN_TRAINER_ACCEPTANCE.md). Bổ sung coverage permission loss, role/Gym đổi sau preflight, account paging, duplicate INACTIVE pair và rollback. Đã sửa mất credential khi provision201 rồi refetch Gym lỗi và điều hướng401 trước khi kiểm phiên xong. Các mô tả proposal/OPEN/chưa có route dưới đây là baseline lịch sử, được thay bởi scope G2 đã duyệt và các cập nhật R13–R16; không yêu cầu duyệt lại cùng scope. Giới hạn mounted-state/read-back và môi trường nghiệm thu được ghi trong báo cáo.

**Cập nhật R15, 12/10/2026:** SCR-ADM-009 có ngừng/kích hoạt PT, xác nhận scope/identity, đọc điều kiện hiện tại và nghĩa vụ mở, xử lý lỗi/reload/page recovery. Xem [coverage R15](ADMIN_TRAINER_LIFECYCLE_VERIFICATION.md). Nghiệm thu tổng hợp12REQ vẫn tiếp tục; các cập nhật R13/R14 dưới đây là lịch sử từng lát cắt.

**Cập nhật R14, 12/10/2026:** SCR-ADM-010 đã có route `/admin/gyms/:gymId/trainers/assign` với gán/provision, bàn giao credential một lần, chặn gửi lặp, Gym INACTIVE gating và đối soát trước retry. Xem [coverage R14](ADMIN_TRAINER_INTAKE_VERIFICATION.md). Lifecycle PT và nghiệm thu toàn bộ12REQ còn tiếp tục.

**Cập nhật R13, 12/10/2026:** scope đã được duyệt trong quyết định G2 hiện hành. SCR-ADM-009 có route `/admin/gyms/:gymId/trainers` đọc roster với tìm chuyên môn/tiểu sử, status, sort, paging và refresh. Tiếp nhận/gán/provision/lifecycle chưa triển khai trong lát cắt này; không coi đủ 12 REQ đã nghiệm thu. Các mô tả proposal/chưa có route bên dưới là baseline lịch sử trước R13.

**Chỉ soạn đề xuất:** FEAT-TRN-003–006 và quyền P-ADM-13–16 đã có ở backend; màn/route Admin mới còn chờ ADM-DEC-02. Không thêm quyền/endpoint/schema. Route dự kiến `/admin/gyms/:gymId/trainers` và `/admin/gyms/:gymId/trainers/assign`; chưa có trong AppRoutes. Chưa cấp Screen ID chính thức trước review; ký hiệu màn đề xuất trong UI spec không phải SCR đã triển khai. Actor ADMIN hiện hành từ DB, account ACTIVE, qua password gate; scope Gym lấy từ route, không lấy Manager assignment của actor.

#### Contract và từ điển dữ liệu

Nguồn chuẩn: [API §19](API_SPEC.md#19-gym-02-đợt-4--danh-sách-quản-trị-gympt-đã-triển-khai), §14/15; [repository danh sách](../apps/api/src/repositories/gym-management.repository.ts), [validator query](../apps/api/src/validators/gym-management.validator.ts), [validator staffing](../apps/api/src/validators/staffing.validator.ts), [validator lifecycle](../apps/api/src/validators/gym-lifecycle.validator.ts). Mọi field roster read-only; các field chuyên môn/tiểu sử chỉ có input ban đầu trong assign/provision, không có action Admin cập nhật về sau.

| Field/nguồn | Nullable, validation và cách dùng đề xuất |
| --- | --- |
| `gym_trainer_id`, `gym_id`, `user_id` / GymTrainer | UUID không null; định danh phân công, Gym, tài khoản. trainerId trên status path là gym_trainer_id, không user_id. Hiển thị User ID để nhận diện; không suy họ tên từ ID. |
| `specialization`, `experience_years`, `bio` / GymTrainer | Nullable ở roster; chuyên môn/tiểu sử có fallback “Chưa cập nhật”, kinh nghiệm null khác 0. Input tùy chọn: specialization trim string, experience_years JSON integer 0–2147483647, bio string; bỏ field trống thay gửi null khi schema không nhận null. |
| `status` / GymTrainer | ACTIVE/INACTIVE là trạng thái **phân công PT**, không trạng thái User. Nhãn “Phân công hoạt động/ngừng hoạt động”; nút đổi phân công riêng với khóa tài khoản tại `/admin/users`. |
| `availability` / GymTrainer | ACCEPTING/ALMOST_FULL/NOT_ACCEPTING; chỉ đọc. PT mới mặc định NOT_ACCEPTING; Admin không có nút đổi. PT chính chủ/Manager đúng Gym dùng luồng hiện có để cập nhật. |
| `joined_at`, `created_at`, `updated_at` / GymTrainer | Timestamp read-only; ngày tham gia hiển thị giờ Việt Nam, created/updated metadata kỹ thuật. Reactivate giữ ID/created_at/joined_at/history; không giả audit nhiều lần chuyển trạng thái. |
| `email`, `full_name`, `phone` / User/Profile khi provision | Email trim/lowercase hợp lệ ≤254, full_name trim 2–100; phone tùy chọn nullable theo staff identity validator. Chỉ nhập khi cấp mới; roster không trả email/phone/name/avatar. |
| Provision result `user`, `assignment`, `temporary_password` | Credential một lần khi 201; ACTIVE/PT/must_change_password=true, assignment ACTIVE/NOT_ACCEPTING. Giữ plaintext trong state form đang mount, nút bàn giao/ẩn; không lưu Web Storage/query cache/log hoặc xuất file. |
| `pagination` / collection metadata | page/pageSize/totalItems/totalPages/hasNextPage/hasPreviousPage cùng cấp data theo envelope collection; số phân công không phải số PT toàn sàn hoặc số hội viên. |

GET `/api/v1/gyms/:gymId/management/trainers`: search literal case-insensitive **chỉ specialization/bio**, status ACTIVE/INACTIVE hoặc bỏ để lấy cả hai; page mặc định1, pageSize20 (1–100), sortBy created_at/joined_at/specialization, sortOrder asc/desc, default created_at desc; gym_trainer_id asc tie-break. Query strict, không gym_id/actor/role/availability/name/email filter; không có giới hạn search mới tự gán thành contract. List gồm Gym INACTIVE; không join User/Profile, nên không đủ kết luận target User đang ACTIVE từ roster.

POST `/gyms/:gymId/trainers`: `{user_id,specialization?,experience_years?,bio?}`, 201 assignment mới. POST `/gyms/:gymId/trainers/provision`: `{email,full_name,phone?,specialization?,experience_years?,bio?}`, 201 provision result. PATCH `/gyms/:gymId/trainers/:trainerId/status`: `{status:ACTIVE|INACTIVE}`, 200 assignment. Response private no-store; không gửi password/roles/availability/gym_id/status trong assign/provision. Status không có expected_updated_at/CAS trong contract hiện hành.

#### Luồng và tiêu chí nghiệm thu đề xuất

Các REQ/AC/TC dưới là mã tài liệu mới, chưa là task code được duyệt. Từng interaction phải dùng API trên hoặc local behavior, không tái dùng quyền Manager để mở Admin action.

| REQ mới / AC mới | Feature → hành vi và kết quả kiểm chứng sau khi triển khai được duyệt |
| --- | --- |
| REQ-ADM-PT-01 / AC-ADM-PT-01 | TRN-006: từ Gym detail vào roster đúng gymId, header/breadcrumb có Gym; GET nội bộ lấy cả ACTIVE/INACTIVE. Không có Gym/actor hợp lệ không gọi query/mutation; đổi Gym xóa form/credential/lỗi và query phải scope lại. |
| REQ-ADM-PT-02 / AC-ADM-PT-02 | TRN-006: tìm Chuyên môn hoặc tiểu sử, lọc Trạng thái phân công, sort field allowlist và Pager; đổi filter/sort về page1, total dùng metadata. Không quảng cáo tìm tên/email hoặc lọc availability; đề xuất pageSize20/default created_at desc. |
| REQ-ADM-PT-03 / AC-ADM-PT-03 | TRN-006: render đúng projection/null/0/availability và trạng thái phân công; không fake tên/avatar/contact hoặc đồng nhất User status. Có empty/retry và read-only roster Gym INACTIVE. |
| REQ-ADM-PT-04 / AC-ADM-PT-04 | TRN-003: Tiếp nhận PT → Gán tài khoản có sẵn, nhập UUID user_id và field ban đầu tùy chọn → POST trainers. Target phải tồn tại/ACTIVE/PT; không tự cấp role hoặc sửa status User. Một assignment ACTIVE toàn hệ thống, không tự revoke ở Gym khác. |
| REQ-ADM-PT-05 / AC-ADM-PT-05 | TRN-003/004: cặp Gym/User đã có trả ASSIGNMENT_ALREADY_EXISTS; đọc roster đúng Gym, nếu INACTIVE dùng status ACTIVE thay tạo bản ghi mới. Không auto-reactivate trong POST hoặc cập nhật bio cũ bằng assign lại. |
| REQ-ADM-PT-06 / AC-ADM-PT-06 | TRN-005: mode Cấp tài khoản mới nhập identity/field ban đầu → POST provision, success bàn giao credential một lần, nút ẩn và thông báo password gate/NOT_ACCEPTING. Unique identity/config/assignment failure rollback toàn bộ; không API lấy lại plaintext. |
| REQ-ADM-PT-07 / AC-ADM-PT-07 | TRN-004: ACTIVE→INACTIVE có xác nhận nêu phân công/User ID/Gym, giữ account/role/history/availability. Nếu Registration ACTIVE hoặc Appointment PENDING/CONFIRMED (cả quá giờ) còn mở, 409 TRAINER_HAS_OPEN_OBLIGATIONS hiển thị counts, không force hoặc tự cancel lịch. |
| REQ-ADM-PT-08 / AC-ADM-PT-08 | TRN-004: INACTIVE→ACTIVE có xác nhận; Gym ACTIVE, User ACTIVE có PT và không ACTIVE ở Gym khác. Giữ ID/joined_at/profile/history/availability, không đổi NOT_ACCEPTING thành ACCEPTING. Same-status 409, trạng thái User cần server kiểm lại. |
| REQ-ADM-PT-09 / AC-ADM-PT-09 | TRN-003/004/005: Gym INACTIVE vẫn đọc được, disable tạo/gán/kích hoạt trong UI khi biết Gym status; backend vẫn authoritative nếu Gym đổi sau GET. Có thể ngừng phân công nếu hết nghĩa vụ và còn quyền. Chuyển Gym là ngừng cũ rồi gán mới theo luồng riêng, chưa có transfer nguyên tử. |
| REQ-ADM-PT-10 / AC-ADM-PT-10 | Mọi mutation: pending chặn gửi lặp/hủy, retry=false; Hủy xác nhận chưa gửi không API; success báo trạng thái rồi refetch đúng Gym. Sau status đổi filter, xử lý trang rỗng bằng đọc tổng mới/đưa về trang hợp lệ; đã triển khai R15 và kiểm chứng lại R16. |
| REQ-ADM-PT-11 / AC-ADM-PT-11 | 400/401/403/404/409/network/5xx giữ context/input phù hợp, không tự retry POST; kết quả chưa rõ phải đọc lại roster/tài khoản trước gửi mới. Concurrent assignment/status tuân backend constraints; không giả CAS hoặc đưa version vào body. |
| REQ-ADM-PT-12 / AC-ADM-PT-12 | Chỉ Admin controls roster/assign/provision/status; không profile edit/social/working hours/availability/Appointment write/Registration create/real payments. Bàn phím/focus/live messages, ID/text dài ở 375/768/1024/1440 không tràn ngang; credential bị xóa khi rời/đổi Gym. |

**Decision scope:** ADM-DEC-02 vẫn OPEN cho màn/route đề xuất. Khuyến nghị bản đầu nhận diện bằng User ID + chuyên môn, không join danh sách toàn sàn để bổ sung tên từng dòng. Nếu cần tên/avatar/tìm theo User phải soạn contract/UX riêng, không fetch public PT detail cho roster INACTIVE hoặc gọi TPR-01 bằng Admin. Có thể thêm tiện ích tìm tài khoản role PT bằng API tài khoản đã có trong phiên bản sau, nhưng chưa mặc định vào bản đầu.

UI/error recovery/tái sử dụng: [đề xuất màn PT](UI_UX_SPEC.md#adm-spec-05--đề-xuất-màn-admin-quản-lý-pt-theo-gym-11102026). Mapping test và thứ tự implementation nếu duyệt: [Implementation §5.3](IMPLEMENTATION_PLAN.md#53-truy-vết-đề-xuất-màn-pt-admin--adm-spec-05).

### 5.5. Đề xuất tra cứu thẻ hội viên theo Gym — ADM-SPEC-06 (11/10/2026, READY_FOR_REVIEW)

**Hiện hành R17:** đã triển khai SCR-ADM-011 theo10 REQ dưới đây, dùng GET và quyền có sẵn; scope G2 được duyệt. [Ma trận nghiệm thu R17](ADMIN_MEMBERSHIP_VERIFICATION.md) là bằng chứng hiện hành. Giá/payment/IDs/timestamps là field phụ trong vùng inline; không quản trị thanh toán. Các trạng thái đề xuất phía dưới giữ để truy vết lịch sử.

**Phạm vi:** màn Admin read-only đề xuất `/admin/gyms/:gymId/memberships`, dùng FEAT-MEM-003/P-ADM-23 và API đã có; ADM-DEC-03 vẫn OPEN. Chưa cấp Screen ID chính thức, thêm route/code hoặc thông qua design. Không tạo/gia hạn/hủy/chỉnh thẻ, đăng ký PT hộ bằng Admin, ghi nhận/hoàn tiền hoặc quản lý giao dịch tiền thật. Một User có thể có nhiều Membership, nên tiêu đề/tổng là **thẻ hội viên**, không phải số hội viên duy nhất.

**Actor/scope:** ADMIN hiện hành từ DB, account ACTIVE, đã qua password gate. Parent Gym cụ thể lấy từ route; internal scope cho phép đọc lịch sử cả Gym INACTIVE. Manager có assignment ACTIVE đúng Gym là actor khác được backend cho phép; không lấy Gym từ Manager assignment để xác định scope màn Admin. Customer/PT không đọc list Gym bằng quyền riêng đó.

#### Contract và từ điển field

Nguồn: [API §22 — thẻ cho form Manager](API_SPEC.md#thẻ-hội-viên-cho-form-manager-feat-mem-003), [service listMemberships](../apps/api/src/services/pt-workflow.service.ts), [repository listMemberships](../apps/api/src/repositories/pt-workflow.repository.ts), [validator ptPage/ptGymParams](../apps/api/src/validators/pt-workflow.validator.ts), [controller](../apps/api/src/controllers/pt-workflow.controller.ts), [routes](../apps/api/src/routes/pt-workflow.routes.ts). GET `/api/v1/gyms/:gymId/memberships`: strict UUID params; chỉ query page (1–1000000, mặc định1), pageSize (1–100, mặc định20). created_at DESC/membership_id ASC; không search/status/date/sort/customer filter; không lọc ACTIVE như form đăng ký PT.

200 `{success:true,data:MembershipView[],pagination:{page,pageSize,totalItems,totalPages,hasNextPage,hasPreviousPage}}`; no-store. Count/page/scope trong transaction repeatable-read. Empty totalPages=0; page vượt cuối data=[] giữ total thật. Response list theo Gym không có `demo` hoặc payment status; contract Customer `/memberships/me` có demo flag không tự mở rộng contract này. Catalog cũ có detail `/memberships/:membershipId` nhưng không có route đã mount trong implementation hiện tại; proposal dùng dữ liệu dòng, không gọi API detail giả định.

Tất cả field read-only, nguồn Membership/Gym/Package/UserProfile; không health/contact/credential, không sửa ownership từ client.

| Field | Nullable/nguồn và cách hiển thị đề xuất |
| --- | --- |
| `membership_id` | UUID Membership; ID thẻ để phân biệt các thẻ của cùng hội viên; wrap/có thể copy bằng thao tác rõ ràng sau design review, không rút gọn đến mất khả năng nhận diện. |
| `user_id`, `customer.user_id` | UUID Membership.user_id; nhận diện hội viên kỹ thuật, không email/phone; phải nhất quán trong DTO. |
| `customer.full_name` | Nullable do left join UserProfile; tên hiển thị, null/rỗng→“Chưa có tên hồ sơ”, kèm User ID; không suy User thiếu hoặc bị khóa. Không avatar trong DTO này. |
| `gym_id`, `gym {gym_id,gym_name}` | Gym của thẻ; scope phải trùng Gym route; header dùng Gym context qua nguồn Admin đã có, không có API Gym detail nội bộ mới. |
| `package_id`, `package {package_id,package_name}` | Package đúng Gym; tên gói hiển thị. DTO không có current price/duration/status Package; không suy gói đang bán từ việc thẻ còn tồn tại. |
| `payment_id` | Nullable; ID liên kết nếu có, chỉ metadata kỹ thuật khi mở thông tin dòng. null→“Không có liên kết thanh toán trong dữ liệu”; không suy miễn phí/chưa thanh toán/demo hoặc lỗi dữ liệu. Không nút mở giao dịch/hoàn tiền. |
| `purchase_price` | Decimal string không âm từ snapshot Membership; nhãn “Giá lúc mua” nếu hiển thị, không thay bằng giá Package hiện tại, không cộng thành doanh thu. Định dạng tránh làm tròn mất cent với miền numeric(14,2). |
| `start_date`, `end_date` | Ngày YYYY-MM-DD; hiển thị ngày lịch, không parse thành UTC rồi lệch ngày. Là thời hạn thẻ, không tự đổi status DB theo ngày. |
| `status` | PENDING/ACTIVE/EXPIRED/CANCELLED từ Membership; Chờ kích hoạt/Hoạt động/Hết hạn/Đã hủy, text/badge read-only. Không nút đổi trạng thái; nhãn không khẳng định đã thanh toán. |
| `created_at`, `updated_at` | Timestamp ISO; ngày tạo/cập nhật theo Asia/Ho_Chi_Minh nếu mở thông tin dòng; không dùng updated_at làm CAS cho action không tồn tại. |

#### Luồng và tiêu chí nghiệm thu đề xuất

REQ/AC/TC dưới là mã tài liệu mới, chưa phải test runtime đã PASS hoặc yêu cầu triển khai được duyệt.

| REQ mới / AC mới | Hành vi → kết quả kiểm chứng khi triển khai được duyệt |
| --- | --- |
| REQ-ADM-MEM-01 / AC-ADM-MEM-01 | Từ Admin Gym detail vào màn đúng gymId, context/header/breadcrumb; GET list đúng route/actor. Gym INACTIVE vẫn đọc nội bộ khi quyền còn hiệu lực, không dùng public visibility để từ chối lịch sử. |
| REQ-ADM-MEM-02 / AC-ADM-MEM-02 | Pager pageSize20 gọi từng trang, tổng đọc totalItems, thứ tự server ổn định; đổi Gym reset page1 và clear dòng đang mở/query cũ. Không tải hết trang để fake search/tổng unique hoặc analytics. |
| REQ-ADM-MEM-03 / AC-ADM-MEM-03 | Render mọi status và thẻ cùng User thành các dòng riêng; title/tổng là số thẻ, không số hội viên duy nhất. Không dùng form PT eligibility filter để ẩn thẻ quá hạn/PENDING/CANCELLED. |
| REQ-ADM-MEM-04 / AC-ADM-MEM-04 | Projection đúng dictionary, fallback tên thiếu/payment_id null, 0 giá khác null; không join dữ liệu User nhạy cảm hoặc fetch contact để bù. UUID/Gym/customer/package đúng ownership, không chuyển scope qua client. |
| REQ-ADM-MEM-05 / AC-ADM-MEM-05 | Giữ status server và ngày thẻ độc lập; ACTIVE đã qua end_date vẫn hiển thị ACTIVE theo dữ liệu, có thể ghi thời hạn đã qua bằng nhãn phụ rõ ràng. Không tự đánh dấu EXPIRED, không tuyên bố đủ điều kiện booking/Registration chỉ từ status. |
| REQ-ADM-MEM-06 / AC-ADM-MEM-06 | Giá lúc mua dùng purchase_price string, không giá catalog hoặc tổng tiền thu; payment_id không chứng minh trạng thái thanh toán hoặc nguồn demo. Không badge demo/tiền thật khi DTO không có nguồn xác nhận. |
| REQ-ADM-MEM-07 / AC-ADM-MEM-07 | “Xem thông tin thẻ” mở vùng read-only từ dữ liệu dòng hiện hành, không endpoint detail mới. Đổi trang/Gym hoặc reload loại dòng phải đóng/đọc lại vùng này; không trình bày snapshot cũ như dữ liệu đã cập nhật. |
| REQ-ADM-MEM-08 / AC-ADM-MEM-08 | Loading/empty/retry/refetch state riêng; trang vượt cuối đọc metadata và cho về trang hợp lệ, empty toàn Gym không lỗi. GET network/5xx không render dữ liệu sai context; bộ lọc UI mới không được giả đủ kết quả toàn Gym. |
| REQ-ADM-MEM-09 / AC-ADM-MEM-09 | Guest401, actor/account/role/gate403, Gym missing404, UUID/query400: state khôi phục đúng auth/context. Mất quyền khi màn mở ẩn danh sách/chi tiết và không tự gọi mutation; không fallback sang Customer endpoint. |
| REQ-ADM-MEM-10 / AC-ADM-MEM-10 | Không nút tạo/gia hạn/hủy/sửa thẻ/đổi hội viên/gói/ghi tiền/hoàn tiền; không Registration create/Appointment write Admin. Control có label/Tab/Enter, focus quay về dòng sau đóng thông tin, live state; ID/tên dài tại375/768/1024/1440 không tràn ngang. |

**Mở rộng ngoài bản đầu:** search tên/User ID, status/date filter, unique customers, badge demo, detail endpoint, export và bulk action chỉ được đưa vào khi có đề xuất contract/policy riêng. Màn read-only đủ scope với dữ liệu hiện tại; ADM-DEC-03 chốt có đưa route vào design và field giá/payment metadata có cần hiện hay giữ ở thông tin dòng. Khuyến nghị thông tin chính là tên/ID hội viên, ID thẻ, gói, thời hạn, status; giá/IDs/timestamps phụ trong vùng mở rộng. Không thêm quản lý giao dịch tiền thật để bù thiếu demo flag.

UI/state/error: [proposal Membership](UI_UX_SPEC.md#adm-spec-06--đề-xuất-tra-cứu-thẻ-hội-viên-theo-gym-11102026). Traceability/test/implementation khi duyệt: [Implementation §5.4](IMPLEMENTATION_PLAN.md#54-truy-vết-đề-xuất-membership-admin--adm-spec-06).

### 5.6. Đề xuất điểm truy cập báo cáo sự cố — ADM-SPEC-07 (11/10/2026, READY_FOR_REVIEW)

**Hiện hành R18:** đã triển khai SCR-ADM-012 và recovery scoped theo8 REQ dưới đây trong scope G2 đã duyệt. [Ma trận nghiệm thu R18](ADMIN_REPORT_ENTRY_VERIFICATION.md) là bằng chứng hiện hành. Selector đọc Gym, không report aggregate/fan-out; màn đích dùng route/quyền/API xử lý hiện có. Trạng thái OPEN/chưa có entry bên dưới là lịch sử đặc tả.

**Phạm vi:** `/admin/reports` là trang chọn Gym đề xuất, dẫn đến `/admin/gyms/:gymId/reports` đã triển khai (SCR-ADM-007). ADM-DEC-04 vẫn OPEN; chưa thêm route/code hoặc cấp quyền. Entry dùng FEAT-GYM-006/P-ADM-05 để tìm Gym; màn đích dùng FEAT-REP-003–006/P-ADM-19–22 hiện hành. Không Feature ID nghiệp vụ mới hoặc inbox tất cả Gym, không gọi report từng Gym để tạo số tổng giả. Thanh toán tiền thật không thuộc scope.

**Actor:** ADMIN hiện hành trong DB, account ACTIVE, qua password gate; trang chọn toàn sàn và trang đích một Gym vẫn nằm trong AdminLayout/ManagementShell. Gym INACTIVE vẫn được chọn để đọc/xử lý lịch sử nếu actor còn quyền. Không sử dụng Manager assignment để xác định Gym Admin hoặc list public chỉ ACTIVE để cấp quyền.

#### Dữ liệu và contract hiện có

Nguồn: [API §19](API_SPEC.md#19-gym-02-đợt-4--danh-sách-quản-trị-gympt-đã-triển-khai), [API §24](API_SPEC.md#24-báo-cáo-sự-cố-bằng-nội-dungảnh--2026-10-10), [gym client](../apps/web/src/services/gym.service.ts), [report client](../apps/web/src/services/report.service.ts), [ReportsPage](../apps/web/src/pages/report/ReportsPage.tsx). Contract không đổi.

| Field/nguồn | Cách dùng đề xuất và giới hạn |
| --- | --- |
| `gym_id`, `gym_name`, `address`, `status` / Gym DTO | ID kỹ thuật tạo route; tên/địa chỉ nhận diện Gym, status ACTIVE/INACTIVE read-only. Chọn cả INACTIVE; không tạo nút đổi Gym status ở entry. |
| `pagination` / GET admin/gyms | totalItems là số Gym khớp filter, không số report/chưa xử lý. page/pageSize/totalPages/hasNextPage/hasPreviousPage cho Pager. |
| Query `search`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder` | Chỉ gửi allowlist Gym query; search tên/địa chỉ literal, status bỏ nghĩa cả hai. Đề xuất pageSize12/sort gym_name asc theo hook hiện hành; đổi search/status về page1. Không report status/date ở selector. |
| Report DTO tại màn đích | Giữ content/status/private image/note/timestamps và state machine đã đặc tả Feature §5.3.4/UI baseline. Selector chưa đọc report nên không có counts, latest incident hoặc trạng thái “Gym không có sự cố”. |

GET `/api/v1/admin/gyms` dùng envelope collection/no-store, private role từ DB. Chọn Gym mới gọi GET `/gyms/:gymId/reports` page/pageSize/status và GET `/reports/:reportId/image` khi dòng có ảnh ở màn đích. PATCH investigate/resolve/reject giữ contract hiện có; không action ở trang chọn, không tạo Report Admin, edit/delete chứng cứ hoặc reopen terminal.

#### Luồng và tiêu chí nghiệm thu đề xuất

REQ/AC/TC sau là mã tài liệu mới; màn entry chưa triển khai, mọi AC phải được kiểm chứng sau duyệt.

| REQ mới / AC mới | Hành vi → kết quả kiểm chứng |
| --- | --- |
| REQ-ADM-REP-01 / AC-ADM-REP-01 | Có navigation toàn sàn “Báo cáo sự cố” tới entry, heading “Chọn Gym để xem báo cáo sự cố”; không gọi đây là inbox/tổng report. Route chỉ dành Admin, không có mutation lúc chọn Gym. |
| REQ-ADM-REP-02 / AC-ADM-REP-02 | Search tên/địa chỉ, filter trạng thái Gym, Pager gọi GET admin/gyms; URL selector giữ query/page hợp lệ, reload/back khôi phục bộ lọc đã áp dụng. Tổng là Gym metadata, không filter một trang rồi báo kết quả toàn sàn. |
| REQ-ADM-REP-03 / AC-ADM-REP-03 | Mỗi dòng Gym có link “Xem báo cáo sự cố” tới đúng `/admin/gyms/:gymId/reports`; chưa chọn không gọi reports/images hoặc fan-out request cho mọi Gym. Gym INACTIVE vẫn có link lịch sử. |
| REQ-ADM-REP-04 / AC-ADM-REP-04 | Vào màn đích bằng chọn Gym/deep link/reload dùng gymId route và query key actor/mode/scope; không dữ liệu/note/ảnh Gym trước. Khi scope đổi phải reset page1/status Tất cả và form cũ; đây là yêu cầu recovery đề xuất, chưa coi implementation đã cưỡng chế. |
| REQ-ADM-REP-05 / AC-ADM-REP-05 | Report filter/status/page hiện local state; selector không truyền `?status=PENDING` hoặc hứa restore filter report. Browser back về entry khôi phục URL selector, direct deep link có đường “Chọn Gym khác” tới entry default; không thêm return URL tùy ý. |
| REQ-ADM-REP-06 / AC-ADM-REP-06 | Loading/empty/error/retry của selector độc lập màn đích; total0 Gym khác empty report của Gym đã chọn. Guest401/current role/account/gate403/Gym missing404/query400 xử lý đúng auth/context, không fallback public hoặc lộ report private. |
| REQ-ADM-REP-07 / AC-ADM-REP-07 | Tại màn đích giữ investigate PENDING→IN_PROGRESS, resolve note bắt buộc IN_PROGRESS→RESOLVED, reject note PENDING/IN_PROGRESS→REJECTED; server thẩm định Gym/report/actor, concurrency409 đọc lại. Entry không cấp quyền ghi lịch/thiết bị/payment hoặc đổi chính sách xử lý. |
| REQ-ADM-REP-08 / AC-ADM-REP-08 | Link có accessible name rõ Gym, keyboard/skip navigation/focus heading khi chuyển scope, trạng thái lỗi/thành công được thông báo, names/address dài tại375/768/1024/1440 không tràn. Dữ liệu list/report pending cũ không được hiển thị dưới header Gym mới. |

**Quyết định:** khuyến nghị entry chỉ là danh sách Gym có search/status/paging và link scoped, giữ SCR-ADM-007 cho màn đích. Nếu hoãn ADM-DEC-04, tiếp tục đường đã có Admin Gym list → detail/sidebar → báo cáo scoped, không chặn baseline/dashboard. Màn mới không tự được duyệt bởi yêu cầu viết bước tiếp theo. Không mở rộng API filter/deep-link report, KPI hay tổng sự cố trong proposal này.

UI/recovery tại [ADM-SPEC-07](UI_UX_SPEC.md#adm-spec-07--đề-xuất-điểm-chọn-gym-cho-báo-cáo-sự-cố-11102026); mapping coverage và slices tại [Implementation §5.5](IMPLEMENTATION_PLAN.md#55-truy-vết-entry-báo-cáo-admin--adm-spec-07).

### 5.7. Dashboard Admin, KPI và độ mới dữ liệu — ADM-SPEC-08 (11/10/2026, READY_FOR_REVIEW)

SCR-ADM-001 `/admin/dashboard` đã có trong AdminLayout/ManagementShell; `/admin` redirect về đây. Dashboard là cửa vào các chức năng quản trị toàn sàn và scope từng Gym, không chỉ trang thống kê độc lập. Dùng FEAT-GYM-006/ADM-001/REV-005, không tạo API analytics/Feature ID mới. Đặc tả dựa trên [useAdminDashboard](../apps/web/src/hooks/useAdminDashboard.ts), [AdminDashboardPage](../apps/web/src/pages/dashboard/AdminDashboardPage.tsx), [SummaryMetric](../apps/web/src/components/management/SummaryMetric.tsx); đề xuất label/UX/cache chưa là thay đổi code được duyệt. Không doanh thu, quản lý giao dịch tiền thật, % tăng trưởng, chart giả, số hội viên duy nhất hoặc queue chờ duyệt không có nguồn.

#### Từ điển KPI, scope và nguồn

| KPI / field và query hiện tại | Ý nghĩa/phạm vi/đích | Trạng thái/giới hạn |
| --- | --- | --- |
| Tổng số cơ sở — GET `/api/v1/admin/gyms` page1/pageSize5; `pagination.totalItems` | Toàn sàn, không status/search filter, gồm ACTIVE/INACTIVE; link `/admin/gyms`. Cùng query cung cấp list tối đa5 dòng. | total=0 là không Gym; không dùng data.length thay tổng. Không hiểu thành chỉ Gym đang hoạt động. |
| Tài khoản toàn sàn — GET `/api/v1/admin/users` page1, client pageSize20; `data.total` | Không role/status/search filter; gồm mọi role/status và User chưa có profile; không Guest. Link `/admin/users`. | total=0 hợp lệ; không unique Customer/hội viên/active users. UI chỉ dùng count, không render contact trong card. |
| Đánh giá Gym toàn sàn — GET `/api/v1/admin/reviews` kind=gym/page1, client pageSize10; `data.total` | Gym reviews cả VISIBLE/HIDDEN và target INACTIVE; không trainer reviews, không review chờ duyệt. Link `/admin/reviews` mặc định kind gym. | UI hiện ghi “Đánh giá toàn sàn”; đổi thành nhãn cột này là ADM-DEC-01 OPEN. Hide không giảm total khi không filter status; không cộng rating hoặc items trang đầu. |
| Cơ sở trong hệ thống — `gymsQuery.data.data.slice(0,5)` | Gym name/address/status/gym_id; link detail `/admin/gyms/:gymId`; Xem tất cả về list. Query không truyền sort, API default created_at desc/gym_id asc. | Không riêng ACTIVE, không list mọi Gym. Giữ heading trung tính hiện có; nếu đổi thành “mới nhất” phải xác nhận sort/test, không suy từ tên biến recentGyms. |
| Ngày tại header | Thời gian máy trình duyệt, format vi-VN/Asia/Ho_Chi_Minh | Ngày hiện tại không phải thời điểm snapshot hoặc “cập nhật dữ liệu lúc…”. Ba query độc lập không có snapshot nguyên tử toàn dashboard. |

Nguồn contract [API §19](API_SPEC.md#19-gym-02-đợt-4--danh-sách-quản-trị-gympt-đã-triển-khai)/§29/30; quyền P-ADM-05/01/27. Backend kiểm Admin DB ACTIVE/password gate cho từng request, enabled isAdmin ở hook chỉ tối ưu frontend. Data private no-store, không public endpoint để bù lỗi. Dữ liệu error/null/unavailable không được gọi là0: `SummaryMetric` hiện fallback value null thành0 nếu không loading/error, cần đề xuất sửa riêng.

#### Luồng và tiêu chí nghiệm thu

REQ/AC/TC mới dùng cho traceability, không coi runtime đã đạt. Baseline và proposal phân biệt tại UI và Implementation.

| REQ mới / AC mới | Hành vi → kết quả kiểm chứng |
| --- | --- |
| REQ-ADM-DASH-01 / AC-ADM-DASH-01 | Admin hợp lệ vào `/admin`→dashboard trong shell toàn sàn; mất quyền/gate không tiếp tục đọc dữ liệu. Header ngày/scope, 3 KPI, list tối đa5 và shortcuts có nguồn/đích; không analytics mới. |
| REQ-ADM-DASH-02 / AC-ADM-DASH-02 | Tổng Gym lấy totalItems với query không filter; tạo Gym tăng tổng sau đọc mới, status ACTIVE/INACTIVE không đổi tổng chỉ đổi badge/list. List≤5 không bị trình bày như total. |
| REQ-ADM-DASH-03 / AC-ADM-DASH-03 | Tổng tài khoản lấy total không filter; cấp Manager/PT thành công tăng tổng khi tạo User mới, assign/revoke không tạo User; đổi User status không giảm tổng. Không render User contact trong KPI. |
| REQ-ADM-DASH-04 / AC-ADM-DASH-04 | Nhãn review phản ánh kind=gym/all statuses; ADM-DEC-01 chờ duyệt. Hide giữ tổng unfiltered, public visible aggregate là nguồn khác; không đếm PT/chờ duyệt hoặc cộng một trang. |
| REQ-ADM-DASH-05 / AC-ADM-DASH-05 | Query loading/error/zero độc lập, lỗi network/5xx một metric không làm mất dữ liệu thành công ở vùng khác. Retry vùng lỗi không điều hướng card; null/missing metadata→không có dữ liệu, không0. Backend auth failure cần xử lý theo AC09 thay partial success thông thường. |
| REQ-ADM-DASH-06 / AC-ADM-DASH-06 | Success từ mutation màn con làm mới đúng dashboard query bị ảnh hưởng; test tạo Gym/provision từ dashboard→màn con→back, metadata/list không còn stale sau refetch. Không giả total thay đổi cho action không đổi tập đếm. |
| REQ-ADM-DASH-07 / AC-ADM-DASH-07 | Query actor/scope thay đổi hoặc logout clear dữ liệu cũ, request cũ không render dưới session/Gym mới. Dashboard query Gym chưa nhận signal nên abort cần bổ sung khi implementation; key actor riêng không tự chứng minh permission-loss recovery. |
| REQ-ADM-DASH-08 / AC-ADM-DASH-08 | Mỗi card/list/shortcut dẫn đúng màn đã có; scope Gym qua detail/sidebar rõ. Route PT roster/Membership/entry report đề xuất chỉ hiện khi được chọn ở G2 và triển khai; không link dead-end hoặc vượt quyền Admin-only. |
| REQ-ADM-DASH-09 / AC-ADM-DASH-09 | 401/current role/account/password gate403 từ bất kỳ query: refresh session, ẩn dashboard nếu không còn đủ quyền, chuyển auth/access denied; không giữ các card private khác như auth còn hợp lệ. Retry không tự mở quyền hoặc POST. |
| REQ-ADM-DASH-10 / AC-ADM-DASH-10 | Đề xuất nút Làm mới tổng quan refetch3query, feedback/refetch time là thời điểm client nhận từng query, không cam kết đồng bộ/cập nhật realtime. Keyboard/focus/live state, không button trong link hoặc thao tác retry kích hoạt navigation, 375/768/1024/1440 không tràn. |

**Mức độ mới:** hiện refetchOnWindowFocus=false, không poll/realtime/manual refresh toàn dashboard hoặc last-updated indicator. Query không phải snapshot xuyên API. Nếu refetch lỗi có cache cũ, phải báo lỗi/stale rõ chứ không trình bày như mới; timestamp từng query không chứng minh version DB toàn hệ thống. Dùng dữ liệu minimal theo client hiện hành, chưa thêm count-only endpoint.

**Cổng G2:** baseline docs01–04 đã soạn; proposals05–07 còn OPEN, được tách khỏi mặc định thiết kế. Cần chốt ADM-DEC-01 nhãn, ADM-DEC-02/03/04 chọn/hoãn màn mới, recovery/cache GAP và phạm vi screen/action dùng để thiết kế. Soạn ADM-SPEC-08 chưa thông qua G2/G3; không tự coi việc yêu cầu bước tiếp theo là duyệt mọi proposal.

[UI dashboard/state/cache audit](UI_UX_SPEC.md#adm-spec-08--dashboard-kpi-state-và-cache-11102026), [Implementation §5.6 — traceability tổng thể](IMPLEMENTATION_PLAN.md#56-dashboard-và-traceability-tổng-thể--adm-spec-08).

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

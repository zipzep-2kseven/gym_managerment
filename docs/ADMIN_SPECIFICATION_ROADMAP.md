# Lộ trình hoàn thiện đặc tả và giao diện Admin Multi-Gym

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

## Quyết định G2 hiện hành — 11/10/2026

Người dùng yêu cầu “áp dụng các đề xuất và thực hiện” sau danh sách sáu nội dung duyệt. G2 **APPROVED về phạm vi thiết kế**: baseline Admin; PT roster/tiếp nhận; Membership read-only/paging-only; entry chọn Gym cho report scoped; nhãn “Đánh giá Gym toàn sàn”; các cải thiện UX/state/error/reload/cache/page recovery/keyboard/focus đã nêu. ADM-DEC-01–04 APPROVED về nội dung này; không mở quyền/API/backend/payment. Những trạng thái OPEN/PROPOSED/chưa duyệt trong các mục đặc tả ngày trước là lịch sử, được quyết định này thay thế về scope; route mới vẫn **chưa triển khai**. G3 chưa duyệt, các GAP được đưa vào thiết kế chưa phải lỗi đã sửa hoặc AC đã PASS.

ADM-DESIGN-01 đã soạn [ADMIN_FIGMA_BRIEF.md](ADMIN_FIGMA_BRIEF.md). Theo yêu cầu thực hiện bước02, đã tạo [pilot quản lý tài khoản để review](ADMIN_DESIGN_02_PILOT_REVIEW.md): prototype HTML độc lập có tương tác; Figma có24/33 frame được dựng và còn dở vì hạn mức Starter. ADM-DEC-06 đã chọn Figma + prototype HTML trong repo. ADM-DESIGN-02 **IN_PROGRESS — pilot READY_FOR_REVIEW**, G3 chưa duyệt. Theo yêu cầu ưu tiên Admin, đã tiếp tục [prototype vai trò/Gym/bổ nhiệm Manager](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md): tổng cộng5/15 Screen IDs được dựng,10 IDs còn lại chưa thiết kế. ADM-UI-01 chưa bắt đầu, không đổi frontend/API/backend.

Ngày lập: 11/10/2026. Phạm vi hiện được yêu cầu: lập kế hoạch bằng tiếng Việt, chuẩn bị thực hiện tuần tự rồi thiết kế giao diện. **ADM-SPEC-01 đã thực hiện; ADM-SPEC-02/03 đã soạn catalog/quyền/pilot; theo yêu cầu tiếp tục, ADM-SPEC-04 đã áp dụng mẫu và soạn baseline để review ngày 11/10/2026. ADM-SPEC-05 đã soạn đề xuất PT để review; ADM-SPEC-06 đã soạn proposal Membership read-only; ADM-SPEC-07 đã soạn proposal entry báo cáo; ADM-SPEC-08 đã soạn dashboard/KPI/traceability để review G2; các bước design/UI/QA chưa thực hiện.** Chưa thiết kế hoặc sửa code giao diện; màn/quyền/API mới chưa được phê duyệt.

## 1. Mục tiêu và ranh giới

Hoàn thiện khu Admin dựa trên chức năng hiện hành, bổ sung các màn còn thiếu có nguồn dữ liệu và quyền phù hợp. Dashboard nằm trong khung quản trị chung; các trang danh sách, chi tiết và biểu mẫu dùng cùng workspace. Tận dụng AdminLayout/ManagementShell hiện có, không làm lại từ đầu.

Người dùng xác định **chưa áp dụng quản lý giao dịch tiền thật**. Lộ trình này không có tích hợp ngân hàng/cổng thanh toán, webhook tiền thật, xác nhận giao dịch thủ công, hoàn tiền, đối soát hoặc báo cáo doanh thu thực. Luồng demo hiện có giữ phạm vi riêng; dữ liệu thẻ demo không được gọi là tiền thật/doanh thu.

Việc yêu cầu lập kế hoạch không tự phê duyệt endpoint, quyền, route hoặc nghiệp vụ mới. Mỗi đề xuất mới có cổng quyết định rõ ràng. Không tạo schema, migration, package hoặc code trong nhiệm vụ lập kế hoạch này.

### Phân loại công việc

| Mức | Nội dung | Cách xử lý |
| --- | --- | --- |
| P0 | Chuẩn hóa nguồn, catalog, quyền, pilot tài khoản, đặc tả chức năng đã có và dashboard | Ưu tiên; giữ policy hiện hành |
| P1 | Màn Admin quản lý PT và tra cứu hội viên theo Gym | Đề xuất bổ sung UI trên quyền/API đã có; review trước thiết kế |
| P2 | Điểm truy cập sự cố toàn sàn bằng chọn Gym | Đề xuất điều hướng; không mặc định aggregate toàn sàn |
| Backlog | Audit viewer tổng quát, settings, notifications, tìm kiếm toàn hệ thống, thiết bị | Ghi nhận; không nằm trong đường triển khai đợt này |
| Loại khỏi đợt này | Quản lý giao dịch tiền thật và analytics tài chính | Không có task triển khai hoặc phụ thuộc chặn lộ trình |

## 2. Baseline và bằng chứng

Đối chiếu PROJECT_RULES §3/5–8/12–13/22–23, ARCHITECTURE_DECISIONS §8–9, DOMAIN_RULES và các quyết định cuối tài liệu, FEATURE_SPEC, API_SPEC, DATABASE_SPEC, IMPLEMENTATION_PLAN, UI_UX_SPEC, PLAN_04 và báo cáo nghiệm thu liên quan.

| Phần | Nguồn code/contract hiện có | Kết luận dùng để lập kế hoạch |
| --- | --- | --- |
| Khung Admin | `apps/web/src/layouts/AdminLayout.tsx`, `ManagementShell.tsx`, `routes/AppRoutes.tsx` | Đã có phạm vi toàn hệ thống và phạm vi một Gym, route `/admin/dashboard` |
| Tài khoản/role | API_SPEC §30; `admin-user.routes.ts`, service/repository/validator; `AdminUsersPage`, `AccountStatusAction`, `AdminRolesPage` | Có search/filter/paging, status CAS, bảo vệ Admin; role chỉ đọc |
| Gym/Manager | API_SPEC §15/17/19/23; gym-write/lifecycle/management và staffing routes/services; AdminGyms/AdminManagers pages | Có CRUD giới hạn theo policy, tạo Gym kèm Manager, provision/assign/revoke |
| PT roster/provision/status | `gym-management`, `gym-lifecycle`, `staffing` services; `gymService.managedTrainers/provisionTrainer/assignTrainer/trainerStatus` | Backend cho Admin theo Gym; chưa có nhánh Admin roster/provision riêng |
| PT profile/availability | `trainer-profile.service.ts`, `pt-workflow-policy.ts`, `pt-workflow.service.ts` | Không sao chép toàn bộ quyền của màn Manager sang Admin; Admin riêng không có quyền TPR-01/availability |
| Hội viên theo Gym | GET `/gyms/:gymId/memberships`; `pt-workflow.service.ts`, repository và validator | Admin có read; query hiện chỉ page/pageSize; chưa có search/status/date filter |
| Đăng ký/lịch PT | `/admin/gyms/:gymId/pt`, `PtWorkspacePage mode="admin"` | Admin đọc lịch; **đã có nút kết thúc Registration** khi ACTIVE, backend chặn nếu còn lịch mở. Không tạo lại thao tác này |
| Sự cố | API_SPEC cập nhật report; `report.service.ts`; `/admin/gyms/:gymId/reports` | Đã xem/xử lý theo Gym; `/admin/reports` trong spec chưa là route code hiện tại |
| Review | API_SPEC §29; moderation service/validator; `ReviewModerationPage` | Đọc Gym/PT cả INACTIVE; chỉ hide có lý do, giữ nội dung/audit |
| Dashboard | `useAdminDashboard.ts`, `AdminDashboardPage.tsx` | Total từ metadata; review query chỉ kind=gym nhưng nhãn “Đánh giá toàn sàn” rộng hơn nguồn |

Các đường dẫn backend viết ngắn trong bảng được tìm tại `apps/api/src/routes/`, `services/`, `repositories/`, `validators/`; frontend tại `apps/web/src/`. Contract API có prefix `/api/v1`. Báo cáo PASS trước đây là bằng chứng lịch sử, chưa được chạy lại trong task lập kế hoạch này.

Những khác biệt tài liệu được đối chiếu tại ADM-SPEC-01: mô tả layout/routes cũ trong PLAN_04; trạng thái implementation cũ trong Feature/Implementation Plan; route sự cố; review visibility; mã PLAN-04 bị dùng cho nội dung khác nhau. Kết quả và phần còn cần quyết định ở §2.1–2.3. Không lấy code làm lý do thay đổi policy cao hơn.

### 2.1. Inventory nguồn — ADM-SPEC-01, 11/10/2026

Đây là snapshot kiểm tra source/tài liệu, không phải kiểm chứng runtime hay database vận hành. “Đã triển khai” trong audit nghĩa là đã đối chiếu implementation hiện có; kết quả test lịch sử được ghi riêng, không nhận là PASS mới. Không tìm thấy tệp Use Case độc lập/OpenAPI YAML hoặc JSON trong các tài liệu dự án đã kiểm kê; ERD ở Database Spec §5, use case/contract mô tả bằng Markdown.

| Nguồn / phần liên quan | Mục đích, rule/quyết định có bằng chứng | Thiếu/khác biệt và cách xử lý |
| --- | --- | --- |
| [PROJECT_RULES.md](PROJECT_RULES.md) §3,5–8,12–13,22–23,28–29 | Source hierarchy; giữ 21 bảng/stack; scope do backend; không suy quyền từ UI; quản trị review chỉ hide | Không thay đổi rules. Yêu cầu thực hiện ADM-SPEC-01 cho phép đồng bộ docs, không mở code/domain |
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) §8–9 và các cập nhật Gym/PT, REV-02, ADM-01 | Layout theo role, design language; account protected; immutable review/audit; lifecycle và onboarding | Không thay quyết định kiến trúc. Dùng quyết định cập nhật để đối chiếu mô tả cũ |
| [DOMAIN_RULES.md](DOMAIN_RULES.md) §2–5, §9–10 và cập nhật | Admin system scope nhưng action-specific; đường scope qua Membership/Trainer; Q và giới hạn quyền | Không coi quyền Admin toàn hệ thống là quyền write mọi tài nguyên; chi tiết ma trận sẽ làm ở ADM-SPEC-02 |
| [FEATURE_SPEC.md](FEATURE_SPEC.md) FEAT-ADM-001–003, FEAT-GYM/MGR/TRN/PKG/REP và FEAT-REV-005/006; cập nhật ADM-01/REV-02 | Danh mục FEAT ổn định; quyết định review/user được ghi nhận đã duyệt | Đồng bộ status/DTO account và status/contract moderation; không cấp Feature ID mới trong audit |
| [API_SPEC.md](API_SPEC.md) §15/19/23/29/30 và updates report/PT | Contract lifecycle, scoped list, atomic onboarding, moderation và UserAdminView | Contract users/review có data.items/total, khác envelope một số list khác; không thay API trong task này |
| [DATABASE_SPEC.md](DATABASE_SPEC.md) §4–5, §10–13 và updates 0002–0005/REV-02 | 21 bảng, ERD/FK, trạng thái, immutable review và audit hide | Có cột không được trả trong Admin DTO; không có Audit_Log tổng quát. Không xác nhận migration live bằng đọc schema |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §3–5 và các cập nhật nghiệm thu | Task/status/dependencies; có Feature→API→UI | §4.1 có nhiều dòng stale; đồng bộ bằng source và updates, tách historical test/deployment claims khỏi runtime hiện tại |
| [UI_UX_SPEC.md](UI_UX_SPEC.md) §1–2, SCR-ADM-001–008 và updates | Tokens/states/a11y; routes/screens hiện có hoặc mục tiêu | SCR-ADM-007 route chưa có code; ghi rõ route scoped đã có và entry point planned. Map dashboard thực tế dùng moderation gym reviews |
| [PLAN_04_MANAGEMENT_DASHBOARD_DESIGN.md](PLAN_04_MANAGEMENT_DASHBOARD_DESIGN.md) §2/4/8 | Kế hoạch khung quản trị cũ, sitemap và báo cáo checkpoint | Baseline ban đầu được gắn nhãn lịch sử; sửa hide/unhide và Appointment/Registration; mã file lịch sử không đổi |
| [DASHBOARD_VERIFICATION.md](DASHBOARD_VERIFICATION.md), [ADMIN_USERS_VERIFICATION.md](ADMIN_USERS_VERIFICATION.md), [REVIEW_MODERATION_VERIFICATION.md](REVIEW_MODERATION_VERIFICATION.md), [PT_WORKFLOW_VERIFICATION.md](PT_WORKFLOW_VERIFICATION.md) | Báo cáo trước đây về phạm vi triển khai/test và giới hạn; PT ghi Admin read/cancel Registration | Không dùng các báo cáo này làm bằng chứng test mới; PT report có ghi triển khai migration 0002/0003 lịch sử |
| [GYM_02_VERIFICATION.md](GYM_02_VERIFICATION.md), [GYM_03_VERIFICATION.md](GYM_03_VERIFICATION.md), [GYM_ONBOARDING_VERIFICATION.md](GYM_ONBOARDING_VERIFICATION.md), [PKG_02_VERIFICATION.md](PKG_02_VERIFICATION.md), [REPORT_DEMO_VERIFICATION.md](REPORT_DEMO_VERIFICATION.md), [GALLERY_VERIFICATION.md](GALLERY_VERIFICATION.md), [QA_02_VERIFICATION.md](QA_02_VERIFICATION.md) | Ghi nhận Gym/Manager, catalog, report/gallery và QA theo từng lát cắt | Các giới hạn “chưa làm” tại lượt nghiệm thu cũ không thay status của lượt triển khai mới |
| [AppRoutes.tsx](../apps/web/src/routes/AppRoutes.tsx), [AdminLayout.tsx](../apps/web/src/layouts/AdminLayout.tsx), [ManagementShell.tsx](../apps/web/src/layouts/ManagementShell.tsx) | Admin routes dưới RequireAuth/RequireRole, menu toàn hệ thống và scoped Gym | Không có routes Admin roster/Membership riêng hay `/admin/reports`; frontend visibility không thay quyền API |
| [admin-user.service.ts](../apps/api/src/services/admin-user.service.ts), [admin-user.repository.ts](../apps/api/src/repositories/admin-user.repository.ts), [admin-user.validator.ts](../apps/api/src/validators/admin-user.validator.ts), [AccountStatusAction.tsx](../apps/web/src/pages/admin/AccountStatusAction.tsx) | Current DB account/role/password gate; protect Admin; CAS; status allowlist; DTO giới hạn; xác nhận/pending | UI khóa tạm/mở lại; API có INACTIVE không đồng nghĩa thêm UI ngừng vĩnh viễn; operational event không phải audit DB bền vững |
| [gym-scope.service.ts](../apps/api/src/services/gym-scope.service.ts), [gym-lifecycle.service.ts](../apps/api/src/services/gym-lifecycle.service.ts), [staffing.service.ts](../apps/api/src/services/staffing.service.ts), [ManagedTrainersPage.tsx](../apps/web/src/pages/gym/ManagedTrainersPage.tsx) | Admin được roster/provision/assign/status theo policy; Manager-only form lấy Gym từ assignment | Admin PT UI còn proposal; không bê availability/TPR action từ Manager vào; lifecycle nghĩa vụ không được bypass |
| [pt-workflow-policy.ts](../apps/api/src/services/pt-workflow-policy.ts), [pt-workflow.service.ts](../apps/api/src/services/pt-workflow.service.ts), [pt-workflow.validator.ts](../apps/api/src/validators/pt-workflow.validator.ts), [PtWorkspacePage.tsx](../apps/web/src/pages/pt/PtWorkspacePage.tsx) | Scoped read Admin; cancel Registration có điều kiện đã có cả API/UI; Appointment write không cấp bởi ADMIN riêng; Membership query page/pageSize | Không tạo lại kết thúc Registration; search/date/status Membership cần contract nếu đề xuất, không suy ra từ schema |
| [review-moderation.service.ts](../apps/api/src/services/review-moderation.service.ts), [review.validator.ts](../apps/api/src/validators/review.validator.ts), [ReviewModerationPage.tsx](../apps/web/src/pages/review/ReviewModerationPage.tsx) | Admin ACTIVE/password gate; kind Gym/PT; hidden_reason 1–1000; VISIBLE→HIDDEN; không edit/delete/unhide | API/UI đã có theo REV-02; dữ liệu private không tự đưa vào public projection |
| [report.service.ts](../apps/api/src/services/report.service.ts), [consultation.service.ts](../apps/api/src/services/consultation.service.ts), [trainer-profile.service.ts](../apps/api/src/services/trainer-profile.service.ts) | Admin/Manager xử lý report scoped; consultation Manager-only; TPR-01 PT/Manager theo phần dữ liệu | Không mở Admin inbox/TPR quyền mới; `/admin/reports` chỉ là entry point đề xuất |
| [useAdminDashboard.ts](../apps/web/src/hooks/useAdminDashboard.ts), [AdminDashboardPage.tsx](../apps/web/src/pages/dashboard/AdminDashboardPage.tsx) | Counts lấy metadata; review query kind=gym; label “Đánh giá toàn sàn” | Chênh lệch label/source giữ OPEN để chốt ở ADM-SPEC-08; audit không sửa UI |
| [admin-user.integration.test.ts](../apps/api/tests/admin-user.integration.test.ts), [review-moderation.integration.test.ts](../apps/api/tests/review-moderation.integration.test.ts), [admin-users.spec.ts](../apps/web/e2e/admin-users.spec.ts), [review-moderation.spec.ts](../apps/web/e2e/review-moderation.spec.ts), [admin-dashboard.spec.ts](../apps/web/e2e/admin-dashboard.spec.ts) | Có test sources về authorization/projection/protection/CAS, hide/audit/concurrency, states/navigation/responsive | Đã đọc coverage liên quan; không chạy lại suites. Traceability chi tiết và coverage gaps làm ở các bước sau |

### 2.2. Phân loại kết quả audit

| Nhóm | Kết luận và nguồn |
| --- | --- |
| A — Confirmed | Các quyết định Gym/Manager lifecycle/onboarding, ADM-01, REV-02 và PT workflow được ghi ở Architecture/Domain/Feature/API. Real-payment management được người dùng loại khỏi lộ trình hiện tại |
| B — Implemented | AdminLayout/dashboard; users/roles; Gym/Manager; scoped package/gallery/report; PT read/end Registration. Đối chiếu AppRoutes/services/pages, không chỉ menu hoặc báo cáo |
| C — Planned, chưa có implementation tương ứng | SCR-ADM-007 `/admin/reports` trong spec; EQP-01/02 DEFERRED ngoài đợt này. Mô tả planned không có nghĩa đã phê duyệt implementation hiện tại |
| D — Proposed, chưa duyệt | Admin roster/provision PT UI, Membership read-only UI, scope selector entry point report và thay đổi nhãn KPI khuyến nghị ở §5 |
| E — Unresolved | ADM-DEC-01–06; Figma refs/Test Case IDs chưa chuẩn hóa; design/screens mở rộng chưa chốt. Không chặn mô tả account hiện hành |
| F — Conflicting/stale | Mô tả implementation cũ, route planned không phân biệt code, mã PLAN-04 trùng ngữ cảnh và KPI label rộng hơn query. Các mô tả stale có nguồn cập nhật rõ đã sửa; KPI/new UI giữ OPEN. Chưa phát hiện xung đột policy chặn pilot trong nguồn đã kiểm tra |

### 2.3. Sổ khác biệt và quyết định

Các mã ADM-AUDIT là mã phát hiện trong lượt này. RESOLVED nghĩa là đã xử lý cách diễn đạt tài liệu theo nguồn hiện có, không phải cấp quyền mới. OPEN chỉ chặn phần phụ thuộc tương ứng. Các lựa chọn ADM-DEC vẫn là đề xuất, không bị tự chuyển APPROVED khi hoàn tất audit.

| Phát hiện | Nguồn và vấn đề | Xử lý/trạng thái | Bước liên quan |
| --- | --- | --- | --- |
| ADM-AUDIT-01 | PLAN_04 §2 mô tả GymLayout/routes trước triển khai nhưng dễ đọc như hiện tại | RESOLVED — giữ baseline lịch sử có nhãn; dẫn inventory hiện tại, không xóa lịch sử | ADM-SPEC-01 |
| ADM-AUDIT-02 | Implementation Plan §4.1 ghi PT/Review chưa có routes/UI dù updates và AppRoutes có | RESOLVED — ghi PT workflow/REV-01/02 đã có; giới hạn ownership/write giữ nguyên | ADM-SPEC-01 |
| ADM-AUDIT-03 | FEAT-REV-005/006 ghi API/UI chưa có, trả list đơn và tham chiếu API §13 cũ | RESOLVED — status/DTO theo REV-02/API §29; không edit/delete/unhide | ADM-SPEC-01 |
| ADM-AUDIT-04 | FEAT-ADM-001/002 thiếu envelope/CAS và không nêu rõ bảo vệ Admin ở đoạn catalog | RESOLVED — đồng bộ contract; pilot chi tiết đã soạn tại Feature §5.2/SCR-ADM-002/Implementation §5.1, chờ G1 | ADM-SPEC-03 |
| ADM-AUDIT-05 | SCR-ADM-007 ghi `/admin/reports` không phân biệt planned với route scoped đã có | RESOLVED về mô tả — ghi rõ hai trạng thái; OPEN nhu cầu tạo entry point (ADM-DEC-04) | ADM-SPEC-07 |
| ADM-AUDIT-06 | Ghi “Ẩn/hiện review”, “PT workspace chỉ đọc” có thể suy ra unhide hoặc bỏ sót Registration end | RESOLVED — hide-only; Appointment read-only khác kết thúc Registration đã có | ADM-SPEC-01/04 |
| ADM-AUDIT-07 | PLAN-04 trong Implementation Plan là domain preparation; PLAN_04 file là dashboard | RESOLVED về quy ước — giữ mã lịch sử theo tài liệu; việc Admin mới dùng ADM-SPEC/ADM-DESIGN/ADM-UI; không tái cấp mã cũ | ADM-SPEC-01 |
| ADM-AUDIT-08 | Label review toàn sàn nhưng hook kind=gym | OPEN — ghi actual behavior; khuyến nghị nhãn Gym (ADM-DEC-01), chưa sửa UI hay coi là duyệt aggregate | ADM-SPEC-08 |
| ADM-AUDIT-09 | Backend Admin roster/Membership reads không có màn Admin riêng | OPEN proposal — ADM-DEC-02/03; không suy thiếu backend và không auto-approve routes/filters | ADM-SPEC-05/06 |
| ADM-AUDIT-10 | §4.1 còn các phủ định cũ về Payment/demo/Report/Consultation/Gallery/Profile và migration live | RESOLVED — đồng bộ implementation theo updates, ghi kết quả migration/test theo thời điểm báo cáo thay vì claim live hiện tại | ADM-SPEC-01 |

**Kết luận chuyển bước:** nguồn đủ để bắt đầu ADM-SPEC-02 và sau đó pilot tài khoản; không còn khác biệt policy cần quyết định trước khi mô tả account hiện hành. Màn mới/KPI/Figma giữ cổng review đã định. Không tự thực hiện bước 02 trong lượt yêu cầu bước 01.

## 3. Trình tự và cổng kiểm tra

```text
01 Chuẩn hóa nguồn → 02 Catalog/quyền → 03 Pilot tài khoản → G1 Review pilot
  → 04 Đặc tả chức năng hiện có
  → 05 Kế hoạch màn PT → 06 Kế hoạch màn hội viên → 07 Điểm truy cập sự cố
  → 08 Dashboard và traceability → G2 Chốt phạm vi/màn/contract
  → 09 Chuẩn bị design system/Figma → 10 Thiết kế → G3 Review thiết kế
  → 11 Triển khai từng lát cắt → 12 Nghiệm thu
```

Các mã ADM-SPEC/ADM-DESIGN/ADM-UI dưới đây là **mã công việc đề xuất**, không thay Feature ID hoặc Screen ID đã có. Mỗi bước chưa triển khai có trạng thái TODO; hạng mục mở rộng chưa duyệt có trạng thái PROPOSED. Phần bị từ chối hoặc hoãn được bỏ khỏi đường phụ thuộc trước khi đi tiếp.

## 4. Các plan chi tiết

### ADM-SPEC-01 — Chuẩn hóa nguồn và hiện trạng (P0, DONE — 11/10/2026)

**Kết quả:** inventory §2.1, phân loại §2.2 và sổ khác biệt §2.3; đồng bộ năm tài liệu roadmap/plan/feature/UI hiện có. Kiểm chứng tài liệu: đối chiếu source paths, liên kết/anchors, giới hạn file thay đổi và định dạng diff. Không chạy test ứng dụng/DB, không sửa code/contract/schema. Quyết định về KPI/màn mở rộng vẫn OPEN.

**Mục tiêu:** có một baseline đáng tin để đặc tả; sửa thông tin cũ mà không mở rộng nghiệp vụ.

**Đầu vào/phụ thuộc:** các nguồn ở §2; không phụ thuộc chức năng mới.

**Công việc:**
- Lập inventory: file/section, purpose, quyết định được ghi nhận, implementation/test evidence, khoảng trống/xung đột.
- Chia trạng thái confirmed/implemented/planned/proposed/unresolved/conflict cho từng nhóm Admin.
- Đối chiếu mô tả cũ với cập nhật mới; dùng hierarchy PROJECT_RULES §3 khi giải quyết, ghi rõ nguồn quyết định.
- Thống nhất mã roadmap Admin độc lập PLAN-04; giữ ID FEAT/SCR hiện có và liên kết lịch sử.
- Sửa nhãn mô tả “Ẩn/hiện review”: hiện chỉ hide, không có unhide; phân biệt lịch Appointment read-only với kết thúc Registration.

**Đầu ra/file dự kiến:** bảng audit và decision register trong tài liệu này; cập nhật đúng các đoạn stale ở PLAN_04/IMPLEMENTATION_PLAN/FEATURE_SPEC (chia thành task nhỏ nếu quá 5 file).

**Nghiệm thu/kiểm chứng:** mọi kết luận có path/section; chức năng đã có không bị đưa thành task xây mới; route đã có/đề xuất được phân biệt. Review diff và liên kết, không chạy migration/test DB cho task docs.

**Phê duyệt/kết thúc:** chủ dự án quyết định các xung đột thật sự; vấn đề có nguồn cập nhật rõ được đồng bộ theo nguồn, không xin duyệt lại policy đã có. Kết thúc khi không còn xung đột chặn pilot.

### ADM-SPEC-02 — Catalog Admin và ma trận quyền (P0, READY_FOR_REVIEW — 11/10/2026)

**Đầu ra đã soạn:** [Feature §5.1](FEATURE_SPEC.md#51-catalog-admin--adm-spec-02-11102026) có 31 Feature IDs hiện có và trạng thái BE/FE/screen/proposal; [Domain §8.1–8.3](DOMAIN_RULES.md#81-quy-ước-ma-trận-admin--adm-spec-02) có 36 dòng P-ADM, điều kiện A0/scope, allowlist dữ liệu và 12 nhóm nguồn/coverage. [Implementation Plan](IMPLEMENTATION_PLAN.md) ghi task dependencies/cổng review. Quyền hiện hành được đối chiếu với backend; các proposal ADM-DEC giữ OPEN, chưa tự duyệt catalog hoặc thay policy.

**Kiểm chứng tài liệu:** kiểm tra đủ/không trùng Feature IDs và permission IDs, mapping hai chiều catalog→quyền→nguồn, local links, route/API gallery và giới hạn file thay đổi; không chạy test ứng dụng hoặc DB trong task docs.

**Mục tiêu:** chốt Admin được làm gì và trong phạm vi nào trước khi mô tả UI.

**Đầu vào/phụ thuộc:** ADM-SPEC-01, Domain/Feature/API và backend authorization hiện hành.

**Công việc:**
- Gom FEAT-ADM-001–003, GYM-003–006, MGR-001–004, TRN-003–006, PKG-003–007, GIM-002, REP-003–006, MEM-003, PTR-003/005, APP-003, REV-005–006.
- Với từng resource/action ghi allowed/denied/conditional/unknown, account/password gate, Gym/ownership và lifecycle.
- Tách quyền frontend hiển thị khỏi backend; tài khoản nhiều role không được coi mọi quyền là của ADMIN.
- Ghi giới hạn: bảo vệ mọi Admin target; roles read-only; không Appointment writes; không Admin inbox tư vấn/TPR-01/availability; không review edit/delete/unhide.
- Đánh dấu màn mới PT/hội viên/sự cố là đề xuất UI; mỗi action phải trỏ đến policy/API hiện có hoặc mục quyết định mới.

**Đầu ra/file dự kiến:** catalog tại FEATURE_SPEC, quyền tại DOMAIN_RULES, trạng thái phụ thuộc tại IMPLEMENTATION_PLAN. Không mở rộng architecture/schema.

**Nghiệm thu/kiểm chứng:** không có “Admin toàn quyền”; mỗi action có nguồn service/contract; dữ liệu nhạy cảm có allowlist. So sánh validators/services và test quyền, chỉ ghi coverage đã đọc.

**Phê duyệt/kết thúc:** duyệt catalog và phần đề xuất mới; ô unknown chặn đúng action phụ thuộc, không chặn toàn bộ đặc tả.

### ADM-SPEC-03 — Pilot quản lý tài khoản (P0, READY_FOR_REVIEW — 11/10/2026)

**Mục tiêu:** hoàn thiện một mẫu đặc tả end-to-end trên tính năng đã có; không xây lại ADM-01.

**Đầu vào/phụ thuộc:** ADM-SPEC-02, API_SPEC §30, FEAT-ADM-001/002, SCR-ADM-002, AdminUsers/AccountStatusAction và tests liên quan.

**Công việc:**
- Viết actor, preconditions, luồng search/filter/paging, chọn khóa/mở, xác nhận/hủy, pending, success và reload khi conflict.
- Field dictionary: UserAdminView allowlist, field nullable/read-only, nguồn, nhãn và mục đích; không suy ra quyền đọc address/birthday từ schema.
- Mapping GET `/admin/users`, PATCH `/admin/users/:userId/status`, body strict status/expected_updated_at và các lỗi 401/403/404/409/validation/network.
- Ghi UI hiện dùng ACTIVE→SUSPENDED, INACTIVE/SUSPENDED→ACTIVE; API allowlist rộng hơn không đồng nghĩa thêm nút ngừng vĩnh viễn.
- Viết acceptance cho bảo vệ Admin, CAS, không cascade, duplicate submit, lỗi giữ context, keyboard và responsive.

**Đầu ra/file dự kiến:** mở rộng Feature/UI/API đúng phần còn thiếu; một mẫu Feature, Screen và traceability trong docs hiện có. Feature/Screen IDs giữ nguyên; Requirement/Test Case IDs bổ sung phải đánh dấu mới.

**Nghiệm thu/kiểm chứng:** mỗi interaction có action/API hoặc hành vi local; mỗi lỗi có state khôi phục; acceptance liên kết `apps/api/tests/admin-user.integration.test.ts`, `apps/web/e2e/admin-users.spec.ts` hoặc ghi test còn thiếu. Không nhận test đã PASS chỉ vì có mã test.

**Kết quả soạn đặc tả ngày 11/10/2026:**
- [Feature §5.2](FEATURE_SPEC.md#52-pilot-quản-lý-tài-khoản--adm-spec-03-11102026-ready_for_review): actor/quyền, 11 Requirement/AC mới, field dictionary UserAdminView, contract và hậu điều kiện; giữ FEAT-ADM-001/002.
- [SCR-ADM-002](UI_UX_SPEC.md#scr-adm-002-platform-users--accounts-directory-quản-lý-tài-khoản-toàn-sàn): 8 bước interaction hiện hành, lỗi/khôi phục, responsive/trợ năng; xác nhận inline, bộ lọc local state. Bốn khoảng trống ADM-ACC-GAP-01–04 (trang rỗng, dashboard invalidation, focus, bắt buộc đọc lại sau lỗi) là đề xuất chưa duyệt.
- [Implementation §5.1](IMPLEMENTATION_PLAN.md#51-truy-vết-pilot-tài-khoản--adm-spec-03): 11 TC mới map Requirement/AC → API/local → Screen/source → test có mã hoặc thiếu; đọc 8 group backend và 2 test E2E liên quan, không chạy hoặc nhận PASS trong bước docs.
- Không đổi API/schema/quyền/code; không yêu cầu lý do khóa, không tạo audit viewer, không mở quản lý giao dịch tiền thật. ADM-DEC-05 được áp dụng ở mức cấu trúc mẫu theo yêu cầu tiếp tục; các đề xuất mở rộng còn lại chưa được coi là duyệt.

**Phê duyệt/kết thúc (G1):** yêu cầu “thực hiện bước tiếp theo” sau pilot được dùng làm chỉ dẫn áp dụng cấu trúc mẫu vào ADM-SPEC-04. Đây là chấp thuận cách viết cho baseline; nội dung/GAP vẫn READY_FOR_REVIEW, không suy ra nghiệm thu AC hoặc phê duyệt thay đổi UI/quyền.

### ADM-SPEC-04 — Đặc tả đầy đủ các chức năng Admin đã có (P0, READY_FOR_REVIEW — 11/10/2026)

**Mục tiêu:** áp dụng mẫu pilot cho các tính năng hiện hành, không tạo màn trùng.

**Đầu vào/phụ thuộc:** G1, catalog và quyền đã đối chiếu.

**Công việc chia theo lát cắt, mỗi lát cắt khoảng 2–4 file docs:**
1. Roles read-only; Gym list/detail/create/status và tạo Gym kèm Manager, lỗi rollback/identity conflict và credential handoff.
2. Manager provision/list/assign/revoke, không tự thay người cũ; phản hồi giới hạn assignment ACTIVE.
3. Package catalog/actions, Gallery upload/caption/order/delete và giới hạn storage hiện hành.
4. Report list/image/investigate/resolve/reject; Registration read/end và Appointment read; lỗi nghĩa vụ còn mở.
5. Review filters/content/audit/hide, lý do và xác nhận; giữ rating/comment/author, concurrency và privacy.

**Đầu ra/file dự kiến:** FEATURE_SPEC/UI_UX_SPEC/API_SPEC, quyền tham chiếu DOMAIN_RULES; thêm mapping test tại IMPLEMENTATION_PLAN theo từng lát cắt.

**Nghiệm thu/kiểm chứng:** các màn hiện có có field/action/state/error/acceptance; mọi mutation đúng policy; loading/empty/error/pending/success và permission loss có coverage. Đối chiếu source/test, chưa thay code.

**Kết quả soạn ngày 11/10/2026:** đủ 5 nhóm baseline tại [Feature §5.3](FEATURE_SPEC.md#53-đặc-tả-chức-năng-admin-hiện-hành--adm-spec-04-11102026-ready_for_review), field/source/nullable, 28 REQ/AC mới và contract hiện có; [UI baseline](UI_UX_SPEC.md#adm-spec-04--baseline-admin-đầu-vào-thiết-kế-11102026) có 10 dòng màn/route, states/errors/recovery và 6 GAP mới; [Implementation §5.2](IMPLEMENTATION_PLAN.md#52-truy-vết-baseline-admin--adm-spec-04) có 28 TC và nguồn test/coverage thiếu. Đã phân biệt frontend quét list Gym với API detail chưa tồn tại, Package status repeatable với Gym/Report/Review transition, và Registration end với Appointment read-only. Không đổi API/schema/code; không chạy integration/E2E trong bước docs. Các GAP cần review trước design/implementation, chưa phải task code được duyệt.

**Phê duyệt/kết thúc:** READY_FOR_REVIEW cho từng nhóm; quyền mới ngoài baseline phải quyết định riêng. Bước tiếp theo ADM-SPEC-05 chỉ lập đặc tả đề xuất màn PT trên quyền/API đã có; chưa đưa vào thiết kế/triển khai nếu ADM-DEC-02 chưa chốt. Baseline đã có mẫu đầu vào thiết kế nhưng G2/G3 chưa thông qua.

### ADM-SPEC-05 — Bổ sung kế hoạch màn quản lý PT theo Gym (P1, READY_FOR_REVIEW — 11/10/2026; màn mới vẫn PROPOSED)

**Mục tiêu:** cung cấp UX Admin cho roster và provisioning/lifecycle đã được backend cho phép.

**Đầu vào/phụ thuộc:** ADM-SPEC-02/04, staffing và gym management/lifecycle contracts. Duyệt nhu cầu màn mới trước thiết kế.

**Đề xuất phạm vi:** list/search/status/paging, cấp tài khoản PT mới hoặc gán PT có sẵn, ngừng/kích hoạt theo policy. Route đề xuất `/admin/gyms/:gymId/trainers` và `/admin/gyms/:gymId/trainers/assign`; chưa tồn tại trong AppRoutes. Screen ID mới chỉ cấp sau khi kiểm tra tránh trùng SCR hiện có.

**Công việc:**
- Mapping GET management/trainers, POST trainers/provision, POST trainers, PATCH trainer/status; xác nhận projection/validation/filter trong API_SPEC §19 và contracts liên quan.
- Đặc tả trạng thái target/user/Gym, giới hạn một assignment ACTIVE, 409 nghĩa vụ đang mở và chuyển Gym không tự revoke.
- Kiểm kê khả năng dùng lại ManagedTrainers/StaffForm: màn hiện tại lấy Gym từ Manager assignment, có action availability/profile không thuộc quyền Admin; không tái sử dụng nguyên màn bằng cách đổi URL.
- Đặc tả bàn giao mật khẩu tạm theo luồng provisioning hiện có, không lưu hoặc ghi log credential.

**Đầu ra/file dự kiến:** proposal và quyết định trong catalog/quyền; nếu duyệt, Screen spec, route proposal, API mapping và acceptance. Tái sử dụng FEAT-TRN-003–006.

**Nghiệm thu/kiểm chứng:** 100% action dùng API có quyền Admin; không sửa bio/social/working hours/availability qua quyền Manager; đổi Gym không giữ form/credential/query cũ. Dựa vào staffing/gym lifecycle tests và liệt kê browser Admin coverage cần bổ sung.

**Kết quả soạn ngày 11/10/2026:** [Feature §5.4](FEATURE_SPEC.md#54-đề-xuất-admin-quản-lý-pt-theo-gym--adm-spec-05-11102026-ready_for_review) có DTO/validation, 12 REQ/AC và ranh giới quyền; [UI proposal](UI_UX_SPEC.md#adm-spec-05--đề-xuất-màn-admin-quản-lý-pt-theo-gym-11102026) có roster/tiếp nhận, trạng thái/lỗi/khôi phục/tái sử dụng; [Implementation §5.3](IMPLEMENTATION_PLAN.md#53-truy-vết-đề-xuất-màn-pt-admin--adm-spec-05) có 12 TC và 5 slice implementation nếu duyệt. Roster chỉ có User ID/chuyên môn, chưa có họ tên/avatar; search chỉ specialization/bio. Availability chỉ đọc, PT mới NOT_ACCEPTING, không tái dùng nguyên màn Manager. Không đổi code/API/quyền/schema hoặc chạy integration/E2E.

**Phê duyệt/kết thúc:** đặc tả READY_FOR_REVIEW; ADM-DEC-02 cho hai màn/route vẫn OPEN. Yêu cầu tiếp tục cho phép soạn proposal, chưa duyệt thiết kế/triển khai. Hoãn không chặn baseline Admin; nếu yêu cầu quyền mới, tách proposal độc lập trước code. Bước kế tiếp ADM-SPEC-06 soạn tra cứu Membership read-only theo Gym.

### ADM-SPEC-06 — Bổ sung kế hoạch tra cứu thẻ/hội viên theo Gym (P1, READY_FOR_REVIEW — 11/10/2026; màn mới vẫn PROPOSED)

**Mục tiêu:** Admin đọc danh sách Membership của một Gym độc lập workspace PT, phục vụ tra cứu vận hành.

**Đầu vào/phụ thuộc:** ADM-SPEC-02/04, FEAT-MEM-003 và GET `/gyms/:gymId/memberships`.

**Đề xuất phạm vi:** read-only, phân trang; route đề xuất `/admin/gyms/:gymId/memberships`. Một User có thể có nhiều thẻ; số Membership không được gọi là số hội viên duy nhất.

**Công việc:**
- Field mapping từ DTO: membership_id, user_id/tên, Gym, Package, payment_id nullable, purchase_price, start_date/end_date/status và timestamps được API trả.
- Chốt nội dung nào cần hiển thị; không đưa phone/email/health data vào projection khi API không cung cấp.
- Query hiện chỉ page/pageSize: bản đầu dùng đúng phân trang; search/status/date filters là backlog contract, không lọc một trang rồi tuyên bố kết quả toàn Gym.
- Xác định cách nhận diện nguồn demo: chưa mặc định API list theo Gym có field demo; không suy diễn mọi thẻ là demo hoặc thêm endpoint payment để bù. Review field/nhãn nếu cần.
- Không tạo/gia hạn/hủy thẻ, ghi nhận thanh toán hoặc hoàn tiền. Chi tiết có thể dùng dữ liệu dòng hiện có, không giả định detail endpoint đã có.

**Đầu ra/file dự kiến:** Screen/Field/Permission/API mapping, acceptance và đề xuất query nếu thật sự cần.

**Nghiệm thu/kiểm chứng:** có thẻ nhiều trang, thiếu payment/profile, rỗng, lỗi, Gym không tồn tại, mất quyền; không gán tổng thẻ thành unique customers hoặc tổng doanh thu. Đối chiếu pt-workflow validator/service/repository.

**Kết quả soạn ngày 11/10/2026:** [Feature §5.5](FEATURE_SPEC.md#55-đề-xuất-tra-cứu-thẻ-hội-viên-theo-gym--adm-spec-06-11102026-ready_for_review) có field/DTO/permission và 10 REQ/AC; [UI proposal](UI_UX_SPEC.md#adm-spec-06--đề-xuất-tra-cứu-thẻ-hội-viên-theo-gym-11102026) có list/Pager/thông tin dòng read-only/state/error/reuse; [Implementation §5.4](IMPLEMENTATION_PLAN.md#54-truy-vết-đề-xuất-membership-admin--adm-spec-06) có10TC/coverage thiếu/thứ tự triển khai nếu duyệt. Bản đầu chỉ paging, không search/status/date filters; tổng là số thẻ, không unique hội viên/doanh thu. List Gym chưa có demo flag, không gọi detail endpoint chỉ có trong catalog cũ; payment_id null/tên thiếu là fallback hợp lệ. Không sửa code/API/schema/quyền hoặc chạy integration/E2E.

**Phê duyệt/kết thúc:** đặc tả READY_FOR_REVIEW, màn/route vẫn PROPOSED, ADM-DEC-03 OPEN cho read-only/paging-only và field hiển thị; contract mở rộng chỉ làm khi duyệt riêng. Yêu cầu tiếp tục chỉ cho soạn đề xuất, chưa duyệt triển khai. Bước tiếp theo ADM-SPEC-07 soạn điểm chọn Gym để vào màn báo cáo scoped đã có.

### ADM-SPEC-07 — Điểm truy cập sự cố theo Gym từ toàn sàn (P2, READY_FOR_REVIEW — 11/10/2026; entry vẫn PROPOSED)

**Mục tiêu:** Admin tìm Gym rồi đi tới màn sự cố scoped đã có, giảm số bước điều hướng.

**Đầu vào/phụ thuộc:** ADM-SPEC-04, SCR-ADM-007 và FEAT-REP-003–006.

**Đề xuất phạm vi:** `/admin/reports` làm trang chọn/tìm Gym có phân trang → `/admin/gyms/:gymId/reports`. Route đầu chưa có code; route scoped đã có. Không thêm API inbox tất cả Gym, không tải report từng Gym hàng loạt để giả lập tổng.

**Công việc:** mô tả lựa chọn Gym và trạng thái fetch/error; giữ màn report và action hiện có; chốt trạng thái filter trong URL chỉ khi màn đích thực sự hỗ trợ; đánh dấu route planned/implemented đúng thực tế.

**Đầu ra/file dự kiến:** mở rộng SCR-ADM-007 và navigation/traceability; giữ API report scoped.

**Nghiệm thu/kiểm chứng:** chọn Gym A/B dẫn đúng URL, không giữ dữ liệu Gym trước, reload/deep link hoạt động; không phát request report cho Gym chưa chọn. Test Admin navigation/scoped reports dự kiến.

**Kết quả soạn ngày 11/10/2026:** [Feature §5.6](FEATURE_SPEC.md#56-đề-xuất-điểm-truy-cập-báo-cáo-sự-cố--adm-spec-07-11102026-ready_for_review) có8REQ/AC/field/quyền/API; [UI proposal](UI_UX_SPEC.md#adm-spec-07--đề-xuất-điểm-chọn-gym-cho-báo-cáo-sự-cố-11102026) có selector/navigation/URL/state/error/scope recovery; [Implementation §5.5](IMPLEMENTATION_PLAN.md#55-truy-vết-entry-báo-cáo-admin--adm-spec-07) có8TC và4slices nếu duyệt. Selector chỉ đọc Gym list, không fan-out report/count tổng. Report scoped giữ state machine và filter local, chưa hứa URL restore report; scope reset/form pending cần kiểm chứng. Không sửa code/API/quyền/schema hoặc chạy integration/E2E.

**Phê duyệt/kết thúc:** READY_FOR_REVIEW, ADM-DEC-04 OPEN cho entry hoặc chỉ dùng danh sách Gym hiện có; yêu cầu soạn bước tiếp theo chưa duyệt route/code. Hoãn không chặn thiết kế baseline. Bước kế tiếp ADM-SPEC-08 đặc tả KPI/dashboard/state/traceability; proposal05–07 còn OPEN phải tách khỏi baseline đã triển khai.

### ADM-SPEC-08 — Dashboard, trạng thái và traceability (P0, READY_FOR_REVIEW — 11/10/2026)

**Mục tiêu:** tổng quan đúng ý nghĩa dữ liệu và nối đầy đủ yêu cầu đến kiểm thử.

**Đầu vào/phụ thuộc:** ADM-SPEC-04 và kết quả duyệt/hoãn 05–07.

**Công việc:**
- Đề xuất đổi nhãn thành “Đánh giá Gym toàn sàn”, giữ query kind=gym; review trước khi sửa UI. Nếu cần cả Gym/PT, lập yêu cầu tổng hợp riêng, không cộng một trang hoặc đổi API tùy tiện.
- Định nghĩa KPI: phạm vi, filter/status, nguồn total, ý nghĩa khi null/error/empty và link đích. Gym/user total không tự hiểu là ACTIVE-only; review không tự hiểu là chờ duyệt.
- Giữ danh sách cơ sở từ API, không gọi là cơ sở mới nhất nếu sort chưa được contract đảm bảo; không % tăng trưởng/doanh thu/biểu đồ chưa đủ nguồn.
- Audit cache/query invalidation sau mutation ở màn con; ghi acceptance cho dữ liệu stale, scope/user change và partial failure, không mặc định implementation đã xử lý đầy đủ.
- Hoàn thiện Requirement → FEAT → SCR → API → Test Case → Figma reference → Implementation status. Figma refs để “chưa thiết kế”, không tạo reference giả.

**Đầu ra/file dự kiến:** UI_UX_SPEC SCR-ADM-001, FEATURE_SPEC/API mapping cần đồng bộ và IMPLEMENTATION_PLAN traceability.

**Nghiệm thu/kiểm chứng:** mỗi KPI/list/link có contract; action mới được đánh dấu proposal; mọi yêu cầu có acceptance/test hoặc gap rõ. Kiểm tra `admin-dashboard.spec.ts` và các tests nghiệp vụ, không nhận mocks là xác minh analytics backend.

**Kết quả soạn ngày 11/10/2026:** [Feature §5.7](FEATURE_SPEC.md#57-dashboard-admin-kpi-và-độ-mới-dữ-liệu--adm-spec-08-11102026-ready_for_review) có nguồn3KPI/list/header/đích và10REQ/AC; [UI dashboard](UI_UX_SPEC.md#adm-spec-08--dashboard-kpi-state-và-cache-11102026) có state/error/invalidation audit/5GAP; [Implementation §5.6](IMPLEMENTATION_PLAN.md#56-dashboard-và-traceability-tổng-thể--adm-spec-08) có10TC và ma trận tổng79REQ/AC/TC đến Feature/Screen/API/Test/Figma/implementation. Review chỉ kind gym/all statuses; hide/User status/Gym status không tự giảm unfiltered totals. Dashboard keys khác prefix màn con, auth failure/null fallback/retry nesting/signal/refetch semantics là gap chưa sửa. Không đổi code/API/schema/quyền hoặc chạy integration/E2E; Figma refs ghi chưa thiết kế.

**Phê duyệt/kết thúc (G2):** READY_FOR_REVIEW, chưa thông qua G2/G3. Duyệt label ADM-DEC-01, chọn/hoãn proposal05–07 qua ADM-DEC-02/03/04 và các GAP sẽ thiết kế; không có unknown chặn phần đã chọn. Khuyến nghị baseline screens hiện có và proposal tách riêng. Bước kế tiếp ADM-DESIGN-01 chuẩn bị design system/brief theo scope review, chưa tạo Figma hoặc triển khai UI ở bước này.

### ADM-DESIGN-01 — Chuẩn bị design system và đầu vào Figma (READY_FOR_REVIEW — 11/10/2026)

**Mục tiêu:** cung cấp brief thiết kế có thể sử dụng mà không bịa nội dung, dữ liệu hoặc quyền.

**Đầu vào/phụ thuộc:** G2; token/component/layout hiện có và quy luật đã duyệt.

**Công việc:** inventory tokens màu/font/spacing/radius/motion, PageHeader/Sidebar/Topbar/status/form/list/dialog; map từng Screen ID với navigation, field/action và state variants; chuẩn bị dữ liệu mẫu thiết kế có nhãn, không dùng thông tin cá nhân thật.

**Đầu ra/file dự kiến:** phần design system trong UI_UX_SPEC; tài liệu `ADMIN_FIGMA_BRIEF.md` đề xuất chỉ tạo tại bước này, tham chiếu đặc tả nguồn thay vì thành policy độc lập. Mỗi prompt Figma có source IDs, responsive constraints và forbidden actions theo policy.

**Nghiệm thu/kiểm chứng:** đủ desktop/mobile và loading/empty/error/pending/conflict/permission-loss; no fake functionality; contrast/focus/labels/drawer conventions truy vết được. Chuẩn bị không đồng nghĩa đã tạo Figma.

**Kết quả:** brief đã soạn ở [ADMIN_FIGMA_BRIEF.md](ADMIN_FIGMA_BRIEF.md); scope G2 đã được người dùng duyệt theo quyết định đầu tài liệu. Inventory code token/shadow/motion và khác biệt với docs;15screen gồm IDs mới009–015, source/action/state/width mapping và prompt pilot; credential mẫu là placeholder. Chưa tạo Figma/prototype, chưa sửa frontend.

**Phê duyệt/kết thúc:** READY_FOR_REVIEW cho brief/visual direction, chưa G3. Bước kế tiếp ADM-DESIGN-02 tạo thiết kế/prototype pilot tài khoản, review rồi nhân rộng; chọn công cụ/file thực tế khi bắt đầu. Không phụ thuộc mua plugin hoặc đổi framework.

### ADM-DESIGN-02 — Thiết kế giao diện và review (IN_PROGRESS — pilot READY_FOR_REVIEW)

**Mục tiêu:** tạo thiết kế sau đặc tả, áp dụng cùng khung Admin hiện có.

**Đầu vào/phụ thuộc:** ADM-DESIGN-01 được duyệt.

**Trình tự:** pilot tài khoản → Gym/Manager → phần PT/hội viên được duyệt → report/review/package/gallery → dashboard tổng hợp các entry points. Prototype cần thể hiện scope toàn sàn và từng Gym, không chỉ trang tổng quan đẹp.

**Đầu ra:** design frames/prototype có Screen ID/state ID, bản đồ component và ghi chú interaction; cập nhật Figma refs thực nếu có.

**Đã thực hiện đợt pilot — 11/10/2026:** [review package](ADMIN_DESIGN_02_PILOT_REVIEW.md), [prototype có thể bấm](design/admin-pilot/index.html),4 ảnh preview, manifest Figma và browser verification. HTML mô phỏng13 tình huống và luồng search/filter/paging/lock/unlock/error/recovery/focus/drawer. Figma đã tạo33 wrapper,24 frame có nội dung,9 frame trống do công cụ báo hết hạn mức Starter; chưa nối reactions hoặc kiểm tra cuối sau sửa layout. Pilot dùng HTML làm đầu ra review chính. G3 pilot chưa duyệt. Đã tiếp tục [nhóm vai trò/Gym/bổ nhiệm Manager](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md), với prototype HTML có tương tác và ảnh responsive; tổng cộng5/15 Screen IDs được dựng,10 IDs còn lại chưa thiết kế.

**Nghiệm thu/kiểm chứng:** so từng action/field với spec, đọc được dữ liệu dài và null, keyboard/focus order, responsive 375/768/1024/1440; kiểm tra reflow/zoom khi triển khai. Nếu thiết kế cần quyền/field mới, quay về bước spec thay vì tự bổ sung.

**Phê duyệt/kết thúc (G3):** review pilot rồi toàn bộ thiết kế trong phạm vi; mọi sai khác được giải quyết trước frontend.

### ADM-UI-01 — Triển khai tuần tự từng lát cắt (TODO, chỉ sau G3)

**Mục tiêu:** chuyển thiết kế đã duyệt thành UI, tái sử dụng nghiệp vụ hiện có.

**Đầu vào/phụ thuộc:** G3 và contract đã chốt. Khi thực hiện, chia mỗi lát cắt thành task khoảng 3–5 file logic, có acceptance và test riêng.

**Trình tự dự kiến:**
1. Thành phần chung cần chỉnh + pilot tài khoản; bảo vệ roles/credentials và routes cũ.
2. Các cải tiến Gym/Manager theo thiết kế; giữ transactional onboarding và nghĩa vụ lifecycle.
3. Admin PT nếu duyệt; không bê action profile/availability của Manager vào.
4. Admin Membership read-only nếu duyệt; không mở payment/refund.
5. Entry point report nếu duyệt; polish report/review/package/gallery theo spec.
6. Dashboard labels/link/cache và responsive; không tạo analytics tài chính.

**Đầu ra/file dự kiến:** các layouts/components/pages/hooks/services/routes frontend phù hợp. Backend chỉ được sửa khi có task/contract riêng đã duyệt; không mặc định cần DB changes.

**Nghiệm thu/kiểm chứng:** lint/typecheck/build; test browser cho từng lát cắt, permissions/direct URL/reload/scope switch/long data/pending/error/conflict. Với API mở rộng đã duyệt cần backend integration và contract checks riêng. Không tạo nghiệp vụ vào DB vận hành để làm đầy dashboard.

**Phê duyệt/kết thúc:** triển khai chỉ phần đã duyệt; checkpoint sau pilot và mỗi nhóm màn. Quyền/migration/package mới phải xử lý theo PROJECT_RULES, không đi kèm lặng lẽ trong UI task.

### ADM-QA-01 — Nghiệm thu và đồng bộ trạng thái (TODO)

**Mục tiêu:** xác nhận đúng chức năng/quyền và báo cáo bằng kết quả thực, không chỉ ảnh đẹp.

**Đầu vào/phụ thuộc:** các lát cắt ADM-UI-01 được chọn đã thực hiện.

**Công việc:** review acceptance/traceability, test các role/assignment/status/password gate, cross-Gym/scope/cache, privacy, stale concurrency, responsive/a11y và hồi quy public/Manager/PT/Customer khi có ảnh hưởng.

**Lệnh nền hiện có:** `npm run lint`, `npm run typecheck`, `npm run build`, `npm run typecheck:e2e -w apps/web`. Các suites liên quan: `test:admin-users`, `test:admin-dashboard`, `test:gym-ui`, `test:review-moderation`, `test:package-ui`, `test:gallery`, `test:reports`, `test:pt-workflow`, `test:accessibility` trong workspace web; backend suites tương ứng khi thay đổi backend. Màn mới cần bổ sung coverage/runner trong task implementation được phép. Chạy QA-02 tổng thể khi phạm vi thay đổi yêu cầu và điều kiện README đáp ứng, không lặp lại vô hạn sau khi kiểm tra đủ.

**Đầu ra/file dự kiến:** báo cáo nghiệm thu Admin ở docs (tên chốt khi tạo), trạng thái từng task/screen/test/Figma ref và giới hạn còn lại.

**Nghiệm thu/kiểm chứng:** test mới chạy có log/kết quả, acceptance không còn gap chặn; verify mobile/keyboard; docs ghi đúng phần đã triển khai và hoãn; real-payment exclusion giữ nguyên.

**Phê duyệt/kết thúc:** chủ dự án review kết quả; không tuyên bố production-ready dựa trên nghiệm thu UI/demo.

## 5. Những quyết định cần review, không chặn việc lập kế hoạch

| Mã quyết định đề xuất | Mặc định khuyến nghị | Thời điểm cần chốt |
| --- | --- | --- |
| ADM-DEC-01 — APPROVED scope G2 | Đổi nhãn review thành “Đánh giá Gym toàn sàn”, giữ nguồn hiện có | Trước G2/thiết kế dashboard |
| ADM-DEC-02 — APPROVED scope G2 | Thêm màn PT cho list/provision/assign/status; giữ giới hạn Admin hiện hành | Trước ADM-SPEC-05 được đưa vào design |
| ADM-DEC-03 — APPROVED scope G2 | Thêm Membership read-only theo Gym, phân trang, chưa search/filter mới | Trước ADM-SPEC-06 được đưa vào design |
| ADM-DEC-04 — APPROVED scope G2 | Entry point report chỉ chọn Gym và dùng màn scoped hiện có | Trước ADM-SPEC-07 được đưa vào design; có thể hoãn |
| ADM-DEC-05 | Đã áp dụng cấu trúc pilot vào baseline theo yêu cầu tiếp tục ngày 11/10/2026; GAP/nội dung còn review | G1 về cấu trúc mẫu; không nghiệm thu runtime |
| ADM-DEC-06 — RESOLVED cho pilot | File Figma thực + prototype HTML độc lập trong repo; HTML tiếp tục review khi Figma Starter hết hạn mức | ADM-DESIGN-02; refs và trạng thái ở review package |

Thanh toán tiền thật **đã được người dùng loại khỏi phạm vi ở lượt yêu cầu này**, không hỏi lại và không đưa vào quyết định pending. Audit viewer/settings/notifications/search/equipment giữ backlog riêng, không có task code trong roadmap này.

## 6. Cách thực hiện và duy trì tài liệu

- Bắt đầu bằng ADM-SPEC-01 → 02 → 03, không bắt đầu Figma/frontend ngay khi mới có roadmap.
- Mỗi task ghi status, nguồn, đầu ra, acceptance, verification và quyết định; không dùng “đã hoàn thành” trước khi có bằng chứng đúng loại task.
- Ưu tiên mở rộng FEATURE_SPEC, DOMAIN_RULES, API_SPEC, UI_UX_SPEC, IMPLEMENTATION_PLAN. Roadmap này quản lý thứ tự và gap, không là nguồn nghiệp vụ thứ hai.
- Requirement IDs bổ sung có thể dùng `REQ-ADM-*`, acceptance `AC-ADM-*`, test cases `TC-ADM-*`; đây là convention đề xuất cần thống nhất ở pilot, không ghi như repo đã có.
- Mọi route/component mới trong roadmap là proposal cho đến khi được duyệt và triển khai. Field có trong DB không tự xuất hiện trong DTO hoặc UI.
- Review/spec approval và design approval là checkpoint chất lượng; không mở thêm authorization cho hành động ngoài phạm vi session.
- Đợt này hoàn thành khi các tính năng được chọn có đặc tả, thiết kế, implementation và kiểm chứng truy vết được; phần hoãn được ghi rõ, không dùng số lượng backlog làm thước đo hoàn thành demo cũ.

# Brief thiết kế giao diện Admin Multi-Gym

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

**Cập nhật ADM-DESIGN-02 — 11/10/2026:** đã tạo [pilot HTML có tương tác và review package](ADMIN_DESIGN_02_PILOT_REVIEW.md). [Figma thực](https://www.figma.com/design/wqLL7irruGrJrybCgx6bop?node-id=4-2) có24/33 frame được dựng;9 frame còn trống và chưa nối reactions do hạn mức Starter. Pilot READY_FOR_REVIEW, G3 pending; đã tiếp tục [prototype vai trò/Gym/bổ nhiệm Manager](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md), tổng cộng5/15 Screen IDs được dựng,10 IDs còn lại chưa thiết kế. Các mô tả “chưa có Figma” bên dưới ghi tình trạng lúc lập brief bước01.

Ngày 11/10/2026 — ADM-DESIGN-01, READY_FOR_REVIEW. Người dùng đã duyệt sáu đề xuất phạm vi G2 bằng yêu cầu “áp dụng các đề xuất và thực hiện”: baseline Admin, PT roster/tiếp nhận, Membership chỉ đọc, entry báo cáo, nhãn KPI Gym Review và cải thiện UX. Đây là đầu vào ADM-DESIGN-02, chưa phải thiết kế được duyệt G3 hoặc frontend đã sửa. Không có file/frame Figma được tạo trong bước brief.

Nguồn chức năng: [Feature §5.1–5.7](FEATURE_SPEC.md), [quyền Admin](DOMAIN_RULES.md#82-ma-trận-hành-động-admin-chi-tiết), [API contract](API_SPEC.md), [traceability79REQ/AC/TC](IMPLEMENTATION_PLAN.md#56-dashboard-và-traceability-tổng-thể--adm-spec-08), [lộ trình](ADMIN_SPECIFICATION_ROADMAP.md). Brief chỉ quyết định cách trình bày trong scope đã duyệt, không mở policy/contract.

## 1. Hướng thiết kế và phạm vi

Ứng dụng quản trị có sidebar/topbar và các màn chức năng nằm trong cùng khung. Dashboard là điểm vào; workflow thật là tra cứu, quản lý và xử lý theo Gym. Tham khảo cấu trúc sidebar/content của ảnh người dùng, không sao chép các chart, KPI tăng trưởng hoặc chức năng chưa có nguồn.

Light theme cho vùng nội dung, sidebar navy, typography rõ và mật độ vừa đủ cho dữ liệu vận hành; tránh banner trang trí lớn. Không chọn dark theme toàn trang chỉ vì ảnh tham khảo tối. Giữ pattern hiện hành và thiết kế responsive cho375/768/1024/1440px. Thanh toán tiền thật/refund/doanh thu, notifications/settings/search toàn sàn/audit viewer/thiết bị nằm ngoài scope.

## 2. Token inventory và quy luật thị giác

Nguồn triển khai: [index.css](../apps/web/src/index.css), [management.css](../apps/web/src/management.css), [gym.css](../apps/web/src/gym.css). Các giá trị dưới là inventory hiện hành; các kích thước typography/layout đề xuất phải được review trong prototype, chưa ghi là CSS đã đổi.

| Nhóm | Token/code hiện có | Quy luật thiết kế |
| --- | --- | --- |
| Canvas/surface | canvas/surface #FFFFFF; canvas-subtle #F8FAFC; surface-hover #F1F5F9 | Nền nhẹ, card trắng, viền border #E2E8F0; không mọi vùng đều dùng card lồng nhau. |
| Text | primary #0F172A; secondary #475569; muted #64748B; inverse #FFFFFF | Nội dung chính/nhãn/phụ có phân cấp; muted không dùng làm placeholder duy nhất cho dữ liệu bắt buộc. |
| Brand/action | navy900 #0B132B,800 #1C2541,700 #2F3E66; crimson700 #B91C1C,600 #DC2626,500 #EF4444 | Sidebar navy; CTA chính navy, destructive đỏ có nhãn/xác nhận. Không dùng crimson500 cho chữ trắng cỡ nhỏ nếu chưa đạt contrast. |
| Semantic | success #166534/#DCFCE7; warning #854D0E/#FEF9C3; error #991B1B/#FEE2E2; info #1E40AF/#DBEAFE; neutral #334155/#F1F5F9 | Badge text+icon khi cần, không chỉ màu. Trạng thái phân công PT khác User/Gym/Membership. |
| Font | font-sans system stack; font-mono system monospace | Đề xuất body14–16px, labels14px, phụ12–14px, h1 24–28px, h2 18–20px; line-height1.4–1.6. ID dùng mono/wrap, không che ID cần nhận diện. |
| Spacing/radius | space1/2/3/4/5/6/8/10/12 =4/8/12/16/20/24/32/40/48px; radius4/6/8/full | Form/list theo grid4px, khoảng nhóm24px; card radius8px, control6px; không tự phát thêm nhiều radius. |
| Shadow | shadow-subtle: 0 1px 3px rgba(15,23,42,.05); shadow-card theo index.css | Viền là chủ đạo, shadow nhẹ; docs §2 có shadow khác code, dùng inventory code làm baseline rồi chuẩn hóa sau design. |
| Motion | motion-fast150ms ease-out; motion-normal250ms ease-out | Chỉ drawer/menu/feedback, reduced-motion tắt animation không thiết yếu. Docs duration/ease khác code cần mapping, không coi biến mới đã tồn tại. |
| Shell hiện tại | sidebar248px/collapsed72px; brand/topbar64px; nav/action min44px | Giữ nhận diện shell; desktop content padding24px, mobile16px là định hướng. Drawer mobile có overlay/focus trap/Escape/trả focus. |

Text thường đạt contrast4.5:1, chữ lớn3:1; focus/control thiết yếu3:1 với nền kề. Kiểm tra từng cặp token dùng thật; viền trang trí mảnh không tự bảo đảm input/focus đủ contrast. Focus ring đề xuất navy7002px+offset2px, control min44px. Không tuyên bố WCAG đạt chỉ từ palette.

## 3. Bản đồ màn và navigation

SCR-ADM-001–008 giữ nguyên. Các mã009–015 dưới được cấp cho phạm vi thiết kế sau kiểm tra inventory không trùng; route mới được duyệt về scope, chưa triển khai. Scoped Package/Gallery/PT trước đây chưa có SCR-ADM riêng, mã mới chỉ định danh thiết kế, không tạo tính năng trùng.

| Screen | Route và dữ liệu/action chính | Requirement/TC nguồn; hiện trạng code |
| --- | --- | --- |
| SCR-ADM-001 | /admin/dashboard:3KPI, list5Gym, shortcuts, refresh; nhãn Đánh giá Gym toàn sàn | ADM-DASH-01–10; có baseline, cải thiện chờ design/UI |
| SCR-ADM-002 | /admin/users:search/role/status/page, khóa/mở non-Admin, CAS/conflict | ADM-ACC-01–11; có baseline |
| SCR-ADM-003 | /admin/roles:4roles chỉ đọc | ADM-BASE-01; có |
| SCR-ADM-004 | /admin/gyms:list/search/status/page, sửa và lifecycle | ADM-BASE-02/05; có |
| SCR-ADM-005 | /admin/gyms/create và /admin/gyms/:gymId:create cùng Manager, edit/status/context | ADM-BASE-03–05; có, hai flow dùng cùng screen ID |
| SCR-ADM-006 | /admin/managers:chọn Gym/provision/assign/revoke/credential | ADM-BASE-06–09; có |
| SCR-ADM-007 | /admin/gyms/:gymId/reports:list/private image/investigate/resolve/reject | ADM-BASE-20–23, ADM-REP-03–08; có |
| SCR-ADM-008 | /admin/reviews:filters/audit/hide reason hai bước | ADM-BASE-27/28; có |
| SCR-ADM-009 | /admin/gyms/:gymId/trainers:roster/search specialization-bio/status/paging/lifecycle | ADM-PT-01–03/05/07–12; route mới chưa có |
| SCR-ADM-010 | /admin/gyms/:gymId/trainers/assign:assign/provision/credential ban đầu | ADM-PT-04–06/09–12; route mới chưa có |
| SCR-ADM-011 | /admin/gyms/:gymId/memberships:list/paging/thông tin dòng read-only | ADM-MEM-01–10; route mới chưa có |
| SCR-ADM-012 | /admin/reports:chọn/tìm Gym→SCR-ADM-007, không report aggregate | ADM-REP-01–08; route mới chưa có |
| SCR-ADM-013 | /admin/gyms/:gymId/packages:catalog/create/edit/status, decimal price | ADM-BASE-10–14; có |
| SCR-ADM-014 | /admin/gyms/:gymId/gallery:upload/caption/order/delete/private bytes | ADM-BASE-15–19; có |
| SCR-ADM-015 | /admin/gyms/:gymId/pt:Registration đọc/end có note, Appointment chỉ đọc | ADM-BASE-24–26; có |

Toàn sàn: Tổng quan, Cơ sở, Tài khoản, Vai trò, Manager, Đánh giá, Báo cáo chọn Gym. Trong Gym: breadcrumb tên/status Gym, Thông tin, PT, Thẻ hội viên, Gói tập, Gallery, Sự cố, Giám sát đăng ký/lịch; có đường về danh sách Gym/toàn hệ thống. Không đưa Manager-only profile/availability/Consultation vào menu Admin.

## 4. Component và quy luật interaction

| Thành phần / nguồn | Reuse và thay đổi cần thiết kế |
| --- | --- |
| AdminLayout/ManagementShell/PageHeader | Giữ scope toàn sàn/Gym rõ, một h1, action chính theo màn; mobile menu drawer có keyboard/focus/overlay. Sidebar active đúng route, không link route chưa triển khai trong ứng dụng đang chạy. |
| SummaryMetric | Card text/total/link; retry button tách khỏi Link. 0 khác missing/error, loading/refetch/stale riêng. Không chart hoặc delta thiếu API. |
| Toolbar/Pager/list rows | Label rõ, search submit/Enter theo spec; filter server đưa page1; empty total0 khác page vượt cuối. Desktop bảng khi dữ liệu song song, mobile stacked rows vẫn giữ field/action labels; không ép table nếu article hiện có đủ rõ. |
| Form/MutationError/QueryState | Required/optional rõ, validation field+summary, giữ input khi lỗi, pending disable submit/hủy, success sau server. 401/403 permission loss ẩn private view; network chưa rõ phải đọc lại trước mutation mới. |
| ConfirmAction/AccountStatusAction | Chuẩn hóa inline confirmation nêu target/action/hậu quả; dialog chỉ khi prototype cần, phải trap focus/Escape/return focus. Không toast success khi lỗi hoặc tự retry action. |
| Review hide | Giữ lý do1–1000 và hai bước; sửa reason reset confirm, không unhide/edit/delete. Review thấp không bị coi vi phạm. |
| Report action | Tiếp nhận trực tiếp với feedback; resolve/reject form note1–2000. Terminal không action, ảnh private lỗi có fallback. Không thêm confirm mọi click vô điều kiện. |
| Credential handoff | Plaintext chỉ result mounted form, nút bàn giao/ẩn, warning đổi mật khẩu lần đầu; pending/success guard và clear khi đổi Gym/session/route. Không ảnh/screenshot dữ liệu credential thật. |
| PT/Membership | Roster PT dùng User ID/chuyên môn, không fake tên/avatar; availability chỉ đọc. Membership mọi status/paging-only, payment null không suy demo/đã thanh toán, không write thẻ. |

Cache/key/invalidation, signal/auth refresh và CAS là ghi chú bàn giao kỹ thuật tại spec, không hiển thị thuật ngữ đó trong user flow. Thiết kế thể hiện hậu quả: dữ liệu đang tải/đã thay đổi/tải lại để kiểm tra. Đổi scope không chuyển note/form/query cũ, mutation đã gửi không giả rollback khi rời màn.

## 5. Frame và state variants cần tạo ở ADM-DESIGN-02

Frame naming `SCR-ADM-NNN / flow / width / state`; stateID dùng screen prefix + DEFAULT/LOADING/EMPTY/ERROR/PENDING/SUCCESS/CONFLICT/PERMISSION_LOSS/REFETCH khi phù hợp. READ-only screens không bịa PENDING write hoặc SUCCESS mutation.

Mọi screen có desktop1440/mobile375; xác nhận reflow ở768/1024. DEFAULT/LOADING/EMPTY/ERROR/PERMISSION_LOSS cho mọi dữ liệu; REFRESH/REFETCH khi có đọc lại. Write screens có PENDING/SUCCESS/validation error/CONFLICT và result chưa rõ sau mất mạng; dialog focus/inline confirmation variants cho action có xác nhận. Pilot tài khoản thêm protected Admin, missing profile, suspended target, stale version; onboarding/provision thêm credential shown/hidden/identity conflict; Gallery thêm quota10/reading image/image failure/order stale; Reports thêm4status/private image error; PT thêm Gym INACTIVE/obligation counts/NOT_ACCEPTING; Membership thêm all4status/name-null/payment-null/giá0/ACTIVE qua thời hạn; dashboard thêm partial failure/metadata missing/all0/auth loss.

Các variant chủ yếu kiểm chứng trên pilot và các pattern chung rồi apply mọi màn; checklist màn nào dùng state nào phải nằm ở annotations, không chỉ có một default frame. Khi lập brief bước01, Figma reference chưa thiết kế cho15screen. Trạng thái mới nhất của Figma và HTML ở đầu tài liệu và các review package.

## 6. Dữ liệu mẫu và prompt thiết kế

Chỉ dùng mẫu hư cấu, không gọi database để tạo records demo. Gym: “Gym Mẫu A” ACTIVE, “Gym Mẫu B” INACTIVE; account: “Người dùng mẫu”, sample@example.test, profile-null và email dài; ID UUID hư cấu không dựa ID vận hành. PT roster không thêm full_name, tên hội viên Membership có null. Giá snapshot “500000.50”/“0.00”, payment_id null, dates YYYY-MM-DD. KPI mẫu Gym12/users42/GymReviews18 với chú thích **dữ liệu mẫu**, không số thật. Hidden reason/note mẫu không thông tin cá nhân. Credential variant dùng `[MẬT KHẨU TẠM MẪU]`, không bí mật thật.

Prompt pilot: “Thiết kế SCR-ADM-002 trong khung Admin của brief này; REQ/AC/TC-ADM-ACC-01–11 tại Feature §5.2/Implementation §5.1 là nguồn. Dùng token code inventory, tiếng Việt,1440/375 và reflow768/1024. Tạo default/loading/empty/error/permission-loss, protected Admin, inline lock/unlock, pending/success/CAS conflict. Không role CRUD/reset-password/deleteUser/health fields. Annotate control→API hoặc local, focus và recovery. Dữ liệu hư cấu có nhãn.”

Các prompt tiếp theo thay Screen ID và Requirement group đúng bảng §3, giữ constraints/token/state; không cho công cụ tự thêm field/quyền/chart. Có thể dùng Figma thật khi tạo artifact ở bước02 và công cụ có khả năng; nếu chưa chọn file thì prototype trong repo là phương án, chưa có công cụ/file nào được dùng trong bước01. Không cần mua plugin hoặc đổi framework.

## 7. Checklist review và bàn giao

- Scope15screen khớp sources, baseline/proposal route mới tách khỏi implemented;79REQ/AC/TC có đường truy vết qua Implementation.
- Token inventory phân biệt code/docs/proposal, contrast/focus được kiểm ở cặp màu sử dụng; chưa tuyên bố WCAG từ token.
- Có variants desktop/mobile, lỗi/loading/empty/pending/conflict/permission loss đúng interaction, field null/dài/trạng thái thật.
- Pilot accounts review trước Gym/Manager→PT/Membership→Report/Review/Package/Gallery→dashboard/navigation hoàn chỉnh.
- ADM-DESIGN-02 tạo frame/prototype thật rồi ghi link/reference thật. G3 review thiết kế trước ADM-UI-01; không tự chuyển code frontend trong nhiệm vụ brief này.

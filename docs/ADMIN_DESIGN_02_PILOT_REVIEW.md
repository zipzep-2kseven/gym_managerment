# ADM-DESIGN-02 — Review pilot quản lý tài khoản Admin

**Cập nhật triển khai frontend — 11/10/2026:** theo yêu cầu tiếp tục đưa thiết kế vào ứng dụng, đã áp dụng lát cắt Admin đầu tiên (dashboard/tài khoản/vai trò/Gym/bổ nhiệm Manager). Xem [phạm vi và kiểm chứng ADM-UI-01](ADMIN_UI_01_IMPLEMENTATION.md). ADM-UI-01 IN_PROGRESS; các ghi chú “chưa sửa frontend” dưới đây mô tả trạng thái trước đợt này, không phải trạng thái hiện tại. Không suy ra duyệt toàn bộ thiết kế hoặc hoàn thành mọi Requirement.

Ngày 11/10/2026. **Pilot SCR-ADM-002: READY_FOR_REVIEW bằng prototype HTML. ADM-DESIGN-02 toàn bộ: IN_PROGRESS. G3 pilot/toàn bộ: PENDING. ADM-UI-01 chưa bắt đầu.**

Đợt này thực hiện pilot theo [thứ tự trong roadmap](ADMIN_SPECIFICATION_ROADMAP.md#adm-design-02--thiết-kế-giao-diện-và-review-in_progress--pilot-ready_for_review). Các màn Gym/Manager, PT, Membership, Report/Review/Package/Gallery và dashboard chưa được thiết kế trong đợt pilot. Quản lý giao dịch tiền thật tiếp tục nằm ngoài phạm vi.

## 1. Mở bản review

- **Bản có thể thao tác:** [prototype HTML](design/admin-pilot/index.html). Mở file này bằng trình duyệt; không cần khởi động API/database. Nếu IDE không chạy JavaScript trong preview, mở bằng Chrome/Firefox hoặc chạy `python3 -m http.server 8765 --bind 127.0.0.1 --directory docs` từ root repo rồi vào `http://127.0.0.1:8765/design/admin-pilot/`.
- **Ảnh xem nhanh:** [desktop](design/admin-pilot/previews/desktop.png), [mobile](design/admin-pilot/previews/mobile.png), [xác nhận mobile](design/admin-pilot/previews/confirmation-mobile.png), [drawer mobile](design/admin-pilot/previews/drawer-mobile.png).
- **Figma đã tạo, còn dở:** [file Multi-Gym Admin](https://www.figma.com/design/wqLL7irruGrJrybCgx6bop?node-id=4-2). Có33 wrapper,24 frame đã dựng,9 frame còn trống do hạn mức công cụ Figma MCP của gói Starter. Frame desktop4:2/mobile4:3 đã dựng; một số layout đã được chỉnh sau ảnh kiểm tra đầu tiên. Chưa có screenshot/readback cuối sau sửa và chưa nối reactions. Không coi Figma là prototype hoàn chỉnh hoặc đã nghiệm thu G3.
- **Trạng thái Figma có thể tiếp tục:** [manifest](design/admin-pilot/figma-manifest.json) lưu fileKey,33 frame IDs, component/property/token IDs và trạng thái từng frame. Frame EMPTY_TOOL_LIMIT không phải màn đã thiết kế.

Thanh “Review G3” là công cụ dành cho người duyệt, nằm ngoài giao diện sản phẩm. Nó chọn13 tình huống mẫu và làm lại ví dụ. Sidebar thể hiện khung Admin tổng; luồng bấm chỉ nối tài khoản. Cập nhật đợt tiếp theo: menu vai trò/Gym/bổ nhiệm Manager và “Xem vai trò hệ thống” đã nối sang [prototype nhóm Admin tiếp theo](ADMIN_DESIGN_02_GYM_MANAGER_REVIEW.md). Tổng quan/đánh giá/báo cáo vẫn aria-disabled; frontend production chưa thay đổi.

## 2. Quyết định thiết kế để review

| Nội dung | Phương án pilot |
| --- | --- |
| Shell | Sidebar navy248px ở desktop; thu gọn72px ở768/1024; topbar64px; drawer ở375. Main trắng/slate, không banner lớn/chart trang trí. |
| Dữ liệu | Article/card tài khoản như cấu trúc hiện hành; desktop3 cột, màn hẹp xếp dọc. Email dài wrap; tên/phone/roles nullable có fallback đúng spec. Không thêm ảnh đại diện/health fields. |
| Typography/token | CSS token dự án; body14px, h128px/mobile24px, card8px, control6px, spacing4px, control min44px. HTML giữ font stack hệ thống; Figma chọn Roboto từ stack vì Segoe UI/Arial không có trong danh sách font trả về. |
| Actions | Xác nhận inline, chỉ non-Admin; nêu target và hậu quả, nhắc người tiếp quản khi khóa Manager. Không lý do khóa, role CRUD/reset password/delete. |
| Xác nhận | Prototype mở một vùng xác nhận tại một thời điểm. Khi pending, chặn xác nhận/hủy và tạm khóa bộ lọc/tải lại/khởi tạo action khác để giữ context. Đây là lựa chọn UX cần review, không mô tả code hiện hành đã đổi. |
| Recovery | Xung đột/lỗi/kết quả chưa rõ giữ context; Hủy đóng panel nhưng target vẫn không gửi lại được cho đến khi tải GET thành công. Không tự retry mutation. |
| Focus | Mở xác nhận→heading panel; hủy/thành công→action target nếu còn, nếu biến mất→Tải lại; lỗi→alert. Drawer trap Tab, Escape/overlay/Đóng menu, trả focus Menu; đóng khi chuyển breakpoint desktop. |
| Quyền | Mọi target có ADMIN được bảo vệ, kể cả nhiều role. Mất quyền ẩn danh sách/bộ lọc/điều hướng Admin và đưa về view thông báo. Việc redirect/session thật là công việc frontend sau G3. |

UI kit Simple Design System đã được khảo sát; Button/Input/Body dùng Inter và button40px, không phù hợp brief. Figma có bộ local gồm Button15 variants, Badge5, Input4, Select4, AccountIdentity1, hai sidebar, Topbar1, AccountStatusAction9 variants;69 variables có scopes/code syntax và7 text styles. Semantic color alias primitives theo CSS. Không dựng một design system đầy đủ ngoài nhu cầu pilot.

## 3. Mapping control, dữ liệu và trạng thái

Nguồn: [Feature §5.2](FEATURE_SPEC.md#52-pilot-quản-lý-tài-khoản--adm-spec-03-11102026-ready_for_review), [UI SCR-ADM-002](UI_UX_SPEC.md#scr-adm-002-platform-users--accounts-directory-quản-lý-tài-khoản-toàn-sàn), [11 bộ REQ/AC/TC](IMPLEMENTATION_PLAN.md#51-truy-vết-pilot-tài-khoản--adm-spec-03). Prototype mô phỏng interaction; không phải kiểm thử các API này.

| Control/state | Contract hoặc local behavior / ghi chú bàn giao |
| --- | --- |
| Tìm tên/email | GET `/api/v1/admin/users`, search tối đa100 ký tự, submit/Enter, trim. Gõ chưa submit không đổi kết quả; đổi select giữ search đã áp dụng. |
| Vai trò/trạng thái | GET role4/status3; select áp dụng ngay, page1. Role/status trong prototype cùng tập giá trị contract. Không đồng bộ URL, không page-size selector. |
| Tải lại/Thử tải lại | GET với bộ lọc/page hiện hành. Refetch giữ dữ liệu trước đó với nhãn rõ, khác initial loading. Sau tải thành công bỏ guard yêu cầu reload. |
| Phân trang | page/pageSize20; Trang trước/sau khi total>20. Fixture phân trang có21 người ACTIVE, trang2 có1 người; khóa người cuối đưa về trang1 với20 người và thông báo. Không dùng dữ liệu mẫu3 dòng để giả một trang20 dòng. |
| Khóa/mở | PATCH `/api/v1/admin/users/:userId/status`, `{status, expected_updated_at}`; ACTIVE→SUSPENDED; INACTIVE/SUSPENDED→ACTIVE. Prototype dùng snapshot local và các tình huống mô phỏng, không gọi API. |
| ADMIN target | Không có action. Tình huống “Target trở thành Admin khi lưu” giữ error/context; tải lại thấy bảo vệ, không có nút ghi. |
| Pending/success | Hai nút panel disabled trong thời gian mô phỏng lưu; success đóng panel và tải danh sách. Password gate/phân công giữ nguyên. |
| Conflict/validation/not-found | Không success, không tự merge/retry. Tải lại kiểm tra target/version; target biến mất không tiếp tục ghi. |
| Kết quả chưa rõ | Ví dụ server mẫu đã đổi nhưng phản hồi bị mất. UI giữ bản đọc cũ và lỗi; GET sau đó thấy trạng thái mới. Không suy rollback hoặc tiếp tục PATCH tự động. |
| PATCH thành công, GET lỗi | Giữ thông báo đã lưu và lỗi đọc; ẩn list cũ, cho tải lại. Không suy thao tác ghi thất bại. |
| Permission loss | Không hiển thị danh sách/private fields; chưa kiểm chứng auth refresh/redirect/backend authorization thực. |
| Loading/empty/GET error | Có nhãn trạng thái riêng; total0 chỉ dùng khi kết quả thực sự rỗng, lỗi/missing không đổi thành0. |

Figma frame name `SCR-ADM-002 / Accounts / width / STATE`; HTML thể hiện cùng nhóm state qua dữ liệu và thao tác thật. Nhãn SCENARIO/Review không phải trạng thái business mới. Dữ liệu đều `example.test`, UUID hư cấu, không lưu localStorage và reset khi tải lại trang; không có tiền thật hoặc credential thật.

## 4. Kết quả kiểm chứng pilot

Lệnh từ root: `node docs/design/admin-pilot/check.mjs`. Suite đã chạy24 kiểm tra,0 thất bại; thời điểm/kết quả gốc nằm trong [verification.json](design/admin-pilot/verification.json). Kiểm reflow375/768/1024/1440, email dài, search draft/submit, bảo vệ Admin, lock/unlock/pending, giữ phân công/password gate, error/reload guards, clamp trang, focus/keyboard/drawer; axe kiểm4 view default/conflict/permission/drawer. Suite xuất4 ảnh preview để kiểm tra bằng mắt.

Đã xem ảnh render, sửa khoảng trắng auto-layout Figma, sửa màu chữ nút Đóng menu trong HTML và cách ẩn skip-link khi chụp full-page. Kiểm tra màu thực và thao tác keyboard bổ sung cho drawer; axe tự động không thay review bằng mắt. Không tuyên bố đạt toàn bộ WCAG hoặc AC production; đây là bằng chứng của prototype độc lập. Figma còn thiếu kiểm tra cuối do tool limit. Các GAP cache/invalidation/auth của app tiếp tục chờ ADM-UI/QA.

## 5. Nội dung cần duyệt và bước sau

1. Sidebar/topbar/light canvas, mật độ3 cột desktop và card mobile có phù hợp việc quản trị tài khoản không.
2. Xác nhận inline và hậu quả giữ thẻ/lịch/phân công/password gate; một panel tại một thời điểm và việc khóa controls trong pending.
3. Search submit, filter áp dụng ngay, dữ liệu dài/null, bảo vệ Admin và page recovery.
4. Thông báo lỗi/thành công, chặn gửi lại trước GET, focus sau thao tác và drawer mobile.

Sau review pilot, sửa sai khác rồi nhân rộng theo roadmap: Gym/Manager → PT/Membership → Report/Review/Package/Gallery → dashboard. Chưa thông qua G3 toàn bộ và chưa chuyển sang sửa frontend production. Không cần nâng gói Figma để tiếp tục review HTML; có thể tiếp tục Figma khi hạn mức/công cụ cho phép, dùng manifest để không tạo trùng.

# Multi-Gym Platform

Multi-Gym is a centralized multi-tenant platform where multiple gyms and branches operate within a shared web application, providing gym-scoped operations for Customers, Personal Trainers (PTs), and Gym Managers, under global administration.

---

## 1. Monorepo Structure

The project is structured as an npm workspaces monorepo:

```text
/srv/gym/
├── apps/
│   ├── web/              # Frontend web application (React + TypeScript + Vite)
│   └── api/              # Backend API application (Node.js + Express + TypeScript)
├── packages/
│   └── shared/           # Shared types, constants, and utilities across workspaces
├── .agent/
│   ├── rules/            # Project-level architecture and development rules
│   └── skills/           # Project-specific AI agent workflows
├── .env.example          # Root environment variable template
├── .gitignore            # Monorepo Git ignore rules
├── package.json          # Root npm workspaces definition and shared scripts
├── tsconfig.base.json    # Base TypeScript compiler configuration
└── README.md             # Project documentation
```

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (prepared for relational multi-tenant integration)
- **Monorepo & Package Management:** npm workspaces

---

## 3. Applications and Packages

### `apps/web`
The client-side single-page application built with React and Vite. It is organized into a feature-oriented folder layout:
- `src/components/`, `src/layouts/`, `src/pages/`
- `src/features/`, `src/hooks/`, `src/services/`
- `src/routes/`, `src/utils/`, `src/types/`, `src/constants/`

### `apps/api`
The backend HTTP API built with Express and TypeScript. It adheres to a clean layered architecture:
- `src/config/`, `src/controllers/`, `src/routes/`
- `src/middleware/`, `src/services/`, `src/repositories/`
- `src/models/`, `src/database/`, `src/utils/`
- Contains a baseline health-check endpoint: `GET /health`.

### `packages/shared`
A shared TypeScript library consumed by both `apps/web` and `apps/api` for cross-cutting constants and types.

---

## 4. Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+ recommended)

### 1. Install Dependencies
Run from the monorepo root:
```bash
npm install
```

### 2. Environment Configuration
Copy the `.env.example` templates to `.env` in the root and respective app directories:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Development Mode
To start development servers across workspaces:
```bash
# Start all workspaces
npm run dev

# Or start individually:
npm run dev --workspace=@multi-gym/api
npm run dev --workspace=@multi-gym/web
```
- Frontend dev server: `http://localhost:3000`
- API dev server: `http://localhost:4000` (`GET http://localhost:4000/health`)

---

## 5. Building and Type Checking

### Build All Workspaces
```bash
npm run build
```

### Run Type Checking
```bash
npm run typecheck
```

---

## 6. Docker & PostgreSQL Development Workflow

### 1. Khởi động PostgreSQL và Backend API bằng Docker Compose
Sau khi tạo file `.env` từ `.env.example`:
```bash
# Build và chạy ngầm (detached mode)
docker compose up -d

# Xem trạng thái các containers
docker compose ps

# Xem logs theo thời gian thực
docker compose logs -f
docker compose logs -f api
docker compose logs -f postgres

# Dừng hệ thống
docker compose down

# Dừng và xóa volumes (lưu ý: sẽ xóa dữ liệu database)
docker compose down -v
```

### 2. Frontend Development
Khởi chạy Frontend trực tiếp trên máy host với Vite để tận dụng Fast HMR:
```bash
npm run dev --workspace=@multi-gym/web
```
Frontend kết nối trực tiếp với Backend API đang chạy trong Docker tại `http://localhost:4000`.

### Giao diện gói tập (PKG-02)

- Khách: chọn Gym → **Đăng ký ngay** → xem danh sách/chi tiết gói tập.
- Manager: **Quản lý Gym** → **Quản lý gói tập** (`/manager/packages`).
- Admin: **Quản trị** → chọn **Sửa thông tin** một Gym → **Quản lý gói tập**.
- Manager/Admin có thể tạo, sửa, mở/ngừng bán gói tập. Thanh toán trực tuyến sẽ triển khai trong phần Payment/Membership.

Kiểm thử: `npm run test:package-ui -w apps/web` và `npm run test:package-live -w apps/web` (luồng thật dùng database tạm, tự dọn sau khi chạy).

### Email & Password Admin
admin@multigym.com
Admin123

### Thanh toán demo (không thu tiền thật)

Đặt `PAYMENT_MODE=demo` trong `.env` của API/root, dùng `NODE_ENV=development`, rồi khởi động lại API (`npm run dev -w apps/api`; nếu đang dùng Docker: `docker compose up -d --force-recreate api`). Mặc định `PAYMENT_MODE=disabled`; production luôn tắt mô phỏng.

Đăng ký/đăng nhập tài khoản Customer → chọn Gym → Đăng ký ngay → xem gói → Tiếp tục thanh toán demo → chọn Thẻ ngân hàng/Chuyển khoản/Ví điện tử → Thanh toán demo. Các phương thức đều mô phỏng thành công khi yêu cầu hợp lệ; thẻ được tạo và xem tại `/memberships`, giao dịch tại `/payments`. Admin/Manager quản lý catalog, không mặc định có role Customer để mua.

Demo dùng giá/thời hạn hiện tại khi bấm thanh toán, không gọi ngân hàng hoặc webhook. Mỗi lần mua mới có key riêng; retry cùng key không phát hành thêm thẻ. Xem [báo cáo](docs/PAYMENT_DEMO_VERIFICATION.md).

### PT và lịch tập

Sau khi mua thẻ demo, Customer vào **Thẻ hội viên → Đăng ký PT**; trao đổi và thống nhất với PT trước đăng ký. PT vào **PT và lịch tập → Nhận học viên mới**, chọn Đang nhận/Sắp đủ để mở đăng ký. Manager đổi availability tại **Quản lý PT**, và quản lý đăng ký/lịch tại `/manager/pt`.

Customer/PT xem `/my-pt`; Customer yêu cầu lịch, PT/Manager xác nhận, dời trước giờ cần xác nhận lại, hủy cần lý do. Manager kết thúc đăng ký khi hết lịch mở, rồi tạo đăng ký mới khi đổi PT. Giờ nhập/hiển thị Việt Nam. Admin giám sát `/admin/gyms/:gymId/pt`.

Database Docker đang dùng đã được nâng cấp qua `0003_pt_workflow` ngày 2026-10-09; API/web đã build và khởi động lại. Khi cài đặt ở môi trường khác, cần chạy đủ chuỗi migration. Migration từ chối đăng ký ACTIVE trùng thẻ hoặc lịch mở trùng người; không tự sửa/xóa dữ liệu legacy. Xem báo cáo triển khai tại docs/PT_WORKFLOW_VERIFICATION.md.


### Lịch Customer (APP-02)

Đăng nhập Customer → **PT và lịch tập** (`/my-pt`) → **Lịch tập của tôi**. Chọn Danh sách/Ngày/Tuần, lọc Gym và trạng thái. Nhấn một buổi để xem chi tiết hoặc dời/hủy trước giờ bắt đầu; hủy cần lý do, dời cần PT/Manager xác nhận lại. Mọi giờ lịch theo Việt Nam.

Kiểm thử: `npm run test:customer-calendar -w apps/web`. Xem [báo cáo APP-02](docs/APP_02_CUSTOMER_CALENDAR_VERIFICATION.md).

### Tạo Gym và Manager cùng lúc

Admin → Quản trị → Tạo Gym (`/admin/gyms/create`) → điền thông tin Gym và họ tên/email Manager (điện thoại tùy chọn) → **Tạo cơ sở và Manager**. Nếu lỗi, toàn bộ thao tác rollback. Thành công trả email và mật khẩu tạm để bàn giao; Manager đăng nhập bằng email đó và phải đổi mật khẩu lần đầu. Ẩn mật khẩu hoặc rời trang sẽ không xem lại được.

Màn **Bổ nhiệm Manager** vẫn dùng để gán tài khoản có sẵn, cấp tài khoản tại Gym đã có hoặc thay người quản lý. Kiểm thử backend: `npm run test:gym-onboarding -w apps/api`; trình duyệt: `npm run test:gym-ui -w apps/web`, `npm run test:gym-live -w apps/web`. Xem [báo cáo](docs/GYM_ONBOARDING_VERIFICATION.md).


### Báo cáo sự cố đơn giản (demo)

Customer → **Báo cáo sự cố** (`/reports`) → chọn Gym đang có thẻ ACTIVE còn hạn → nhập nội dung và chụp/tải tối đa một ảnh JPEG/PNG ≤5MB (tùy chọn) → Gửi báo cáo. Không cần mã máy/chọn thiết bị. Thẻ demo được dùng; thẻ hết hạn vẫn đọc báo cáo cũ.

Manager → **Xử lý báo cáo** (`/manager/reports`) → Tiếp nhận → Giải quyết có kết quả hoặc Từ chối có lý do. Admin xem link Báo cáo sự cố trên trang quản trị Gym. Không triển khai danh mục/QL máy, giữ bảng/dữ liệu hiện có.

Docker lưu ảnh private trong volume `multi_gym_report_images`, API lấy `REPORT_UPLOAD_DIR=/app/data/report-images`; không public static. Chạy API ngoài Docker có thể đặt REPORT_UPLOAD_DIR vào thư mục riêng; mặc định apps/api/data/report-images khi cwd apps/api. Upload production tắt cho đến khi chọn storage. Cần migration `0004_report_without_equipment`; không reset database/volume. Backup phục hồi phải gồm cả database và volume ảnh.

Kiểm thử: `npm run test:reports -w apps/api` và `npm run test:reports -w apps/web`. Xem [báo cáo kiểm chứng](docs/REPORT_DEMO_VERIFICATION.md).

### Đăng ký tư vấn (CON-01/CON-02)

Trang Gym có nút **Đăng ký tư vấn** → `/gyms/:gymId/consultation`. Guest gửi được không login/thẻ; điền tên/số điện thoại, nội dung và thời gian tiện liên hệ tùy chọn. Thời gian là nguyện vọng; Gym liên hệ để thống nhất, chưa giữ chỗ.

Manager đúng Gym mở **Yêu cầu tư vấn** → `/manager/consultations`, bấm gọi, ghi chú và xử lý Chờ liên hệ → Đã liên hệ → Hoàn thành; hủy cần lý do. Admin/Staff/PT chưa có quyền inbox trong phạm vi này. Không tự tạo lịch PT/thẻ/thanh toán hoặc gửi email/SMS. POST giới hạn 5 lần/15 phút/IP cho một process; UI không tự retry.

Cần migration `0005_consultation_simple`; không reset DB. Kiểm chứng: `npm run test:consultation -w apps/api` và `npm run test:consultation -w apps/web`. Xem [CONSULTATION_VERIFICATION.md](docs/CONSULTATION_VERIFICATION.md).

### Ảnh giới thiệu phòng Gym (GIM-01)

Manager: **Quản lý Gym → Ảnh phòng Gym** (`/manager/gallery`). Admin: **Quản trị → Sửa thông tin Gym → Ảnh phòng Gym** (`/admin/gyms/:gymId/gallery`). Thêm một JPEG/PNG/lần, tối đa 10 ảnh/Gym và 5 MB/ảnh; chú thích tùy chọn tối đa 200 ký tự. Dùng Lên/Xuống đổi thứ tự, ảnh đầu đại diện gallery; logo riêng. Xóa có xác nhận. Khách xem gallery trên trang Gym ACTIVE; Gym INACTIVE giữ ảnh và nội bộ vẫn quản lý được.

Docker dev lưu gallery trong volume `multi_gym_gallery_images`, `GALLERY_UPLOAD_DIR=/app/data/gallery-images`, tách ảnh báo cáo private. API ngoài Docker có thể đặt GALLERY_UPLOAD_DIR riêng; mặc định data/gallery-images theo cwd. UI thu nhỏ/re-encode ảnh, backend bỏ metadata; upload production tắt khi chưa chọn storage. Backup/restore cần DB và các volume ảnh. Không migration/reset DB cho gallery.

Kiểm thử: `npm run test:gallery -w apps/api` và `npm run test:gallery -w apps/web`. Bằng chứng/giới hạn: [GALLERY_VERIFICATION.md](docs/GALLERY_VERIFICATION.md).

### Hồ sơ PT và giờ làm việc tham khảo (TPR-01)

PT đăng nhập → **Hồ sơ PT** (`/pt/profile`): sửa giới thiệu, liên kết và giờ theo tuần, nhiều ca/ngày. Tên/ảnh dùng **Sửa tên và ảnh đại diện** dẫn tới hồ sơ cá nhân hiện có. Manager: **Quản lý Gym → Quản lý PT → Hồ sơ và giờ làm việc**, sửa chuyên môn/số năm kinh nghiệm, xem giới thiệu/liên kết/giờ của PT; không sửa thay các phần PT tự quản lý.

Giờ Việt Nam; ca không được trùng hoặc qua nửa đêm. Ngày không khai báo không hiển thị. **Giờ tham khảo không thể hiện chỗ trống**, không chặn đặt lịch ngoài ca và không tự dời/hủy lịch tập đã có; lịch tập vẫn cần PT xác nhận và kiểm tra chống trùng hiện hành. availability giữ luồng cũ. Không migration/seed tài khoản PT mới cho task này; Manager có thể cấp tài khoản PT bằng luồng Tiếp nhận PT hiện có.

Kiểm chứng: `npm run test:trainer-profile -w apps/api` và `npm run test:trainer-profile -w apps/web`. Báo cáo: [TRAINER_PROFILE_VERIFICATION.md](docs/TRAINER_PROFILE_VERIFICATION.md).


### Đánh giá Gym/PT (REV-01)

Customer đăng nhập → mở chi tiết Gym hoặc hồ sơ PT công khai → **Đánh giá**. Gym cần thẻ ACTIVE/EXPIRED đã bắt đầu; PT cần thêm ít nhất một buổi COMPLETED với đúng PT đó. Thẻ demo được dùng. Mỗi người một đánh giá mỗi Gym/PT (kể cả đã bị ẩn), 1–5 sao và nhận xét tùy chọn tối đa 2.000 ký tự. Không sửa/xóa, không ảnh. Nhân sự không đánh giá Gym/PT tại Gym đang phụ trách.

Chưa đủ điều kiện thì trang giải thích; đã gửi thì hiển thị bản của mình. Khách xem danh sách và điểm trung bình của đánh giá VISIBLE. Khi mất mạng/409, **Tải lại đánh giá** để đối chiếu trước gửi tiếp. Admin moderation UI thuộc REV-02.

Kiểm tra: `npm run test:reviews -w apps/api`, `npm run test:reviews -w apps/web`. Báo cáo: [REVIEW_VERIFICATION.md](docs/REVIEW_VERIFICATION.md). Tests sử dụng database tạm; không tạo buổi COMPLETED hoặc review giả trong database vận hành để mở quyền.


### Admin quản lý đánh giá (REV-02)

Admin đăng nhập → **Quản lý đánh giá** (`/admin/reviews`). Chọn loại Gym/PT, tìm và chọn Gym (gồm cơ sở INACTIVE), lọc Công khai/Đã ẩn. Danh sách hiển thị nội dung gốc, hội viên, sao/ngày và lịch sử ẩn.

**Ẩn đánh giá** → nhập lý do → **Tiếp tục** → **Xác nhận ẩn**. Chỉ xử lý nội dung vi phạm; không ẩn vì đánh giá thấp hoặc góp ý về dịch vụ. Nội dung gốc vẫn giữ, server lưu người/thời điểm/lý do; không có sửa/xóa/khôi phục. Khi mất mạng/409, tải lại danh sách để đối chiếu; không gửi tự động lần nữa. Nếu danh sách trống, dùng Customer đủ điều kiện gửi đánh giá theo hướng dẫn REV-01 trước.

Kiểm tra: `npm run test:review-moderation -w apps/api`, `npm run test:review-moderation -w apps/web`. Báo cáo: [REVIEW_MODERATION_VERIFICATION.md](docs/REVIEW_MODERATION_VERIFICATION.md). Không thêm package/schema/migration hoặc đánh giá giả trong database vận hành.


## Admin quản lý tài khoản (ADM-01)

Admin đăng nhập → **Quản lý tài khoản** (`/admin/users`): tìm tên/email, lọc vai trò và trạng thái, xem Gym đang phụ trách. Chọn **Khóa tạm tài khoản** hoặc **Mở lại tài khoản**, kiểm tra thông tin rồi xác nhận. Khóa dừng truy cập; thẻ, lịch tập, vai trò và phân công hiện có được giữ. Màn này bảo vệ mọi tài khoản Admin.

Chọn **Xem vai trò hệ thống** để tra cứu bốn vai trò; danh mục chỉ đọc. Nếu khóa Manager, việc bổ nhiệm người tiếp quản vẫn thực hiện tại màn quản trị Gym.

Kiểm thử bằng `npm run test:admin-users -w apps/api` và `npm run test:admin-users -w apps/web` (database tạm). Xem [báo cáo nghiệm thu](docs/ADMIN_USERS_VERIFICATION.md).

## Kiểm tra bảo mật QA-01

```bash
npm run test:qa01 -w apps/api
npm run test:security -w apps/web
```

Bộ QA-01 chạy bảo vệ HTTP/Auth và hồi quy các nghiệp vụ demo; database/ảnh kiểm thử riêng được tạo rồi dọn, không reset dữ liệu vận hành. Browser kiểm tra nguồn giả mạo cùng site và đăng xuất hợp lệ. Xem [QA_01_VERIFICATION.md](docs/QA_01_VERIFICATION.md) cho bằng chứng và giới hạn.

Khi mở web ở địa chỉ mới, cấu hình `CORS_ORIGIN` đúng scheme/host/port, không thêm dấu `/` cuối; request ghi từ nguồn ngoài danh sách sẽ bị chặn. Sau 10 lượt đăng nhập sai mỗi phút/IP, chờ theo Retry-After rồi thử lại. Qua proxy, không tự bật `trust proxy` toàn cục; cần xác định proxy tin cậy trước để limiter không dùng IP giả.

## Kiểm tra giao diện QA-02

```bash
npm run lint
npm run typecheck:e2e --workspace @multi-gym/web
npm run test:auth --workspace @multi-gym/web
npm run test:accessibility --workspace @multi-gym/web
npm run test:qa02
```

`npm run test:qa02` ở root chạy lint, typecheck/build, kiểm tra kiểu test, hồi quy backend và 17 bộ browser test trong hai vòng, không retry. `npm run test:e2e --workspace @multi-gym/web` chạy một vòng browser. Các cấu hình dùng database tạm hoặc API mock; test Auth không ghi vào database demo. Cần PostgreSQL đang chạy, DATABASE_URL hợp lệ trong `.env`, Chromium của Playwright đã cài và các cổng 3103–3105/4103 còn trống. Log/kết quả/ảnh nằm trong `apps/web/.qa-artifacts/` (không đưa vào Git). Xem [QA_02_VERIFICATION.md](docs/QA_02_VERIFICATION.md) cho phạm vi và kết quả.

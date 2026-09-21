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

### Email & Password Admin
admin@multigym.com
Admin123
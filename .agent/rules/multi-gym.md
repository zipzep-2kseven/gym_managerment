# Multi-Gym Project Rules & Architectural Guidelines

This document defines the core architecture, business domain rules, authorization standards, and development behaviors for the Multi-Gym platform. All agents and developers working in this workspace must adhere strictly to these guidelines.

---

## 1. Project Overview & Multi-Branch Model

Multi-Gym is a centralized platform where multiple gyms and branches operate within a shared web application.

- **System Model:** The application is explicitly a multi-gym platform, **NOT** a single-gym management website.
- **Gym Isolation:** Each Gym/Branch is a discrete operational unit with dedicated management, staff, packages, and reports.

---

## 2. Actors & Roles

The system recognizes five distinct actors:

| Actor | Description | Scope |
| :--- | :--- | :--- |
| **Guest** | Unauthenticated visitor browsing public gym listings, packages, and trainers. | Public |
| **Customer** | Registered end-user who can browse, register packages, book PTs, and submit reports. | Platform-wide user; gym-scoped memberships |
| **PT (Personal Trainer)** | Trainer assigned to a specific Gym offering training sessions to members. | Gym-specific |
| **Manager** | Operational administrator assigned to manage a single specific Gym. | Gym-specific |
| **Admin** | System-wide administrator overseeing the platform. | Global |

---

## 3. User & Role Model

The user lifecycle and role hierarchy follows:

$$\text{User} \longrightarrow \text{Role} \longrightarrow \text{User\_Profile}$$

1. **Registration Flow:**
   - The user account (`User`) is created first during authentication/registration.
   - Upon successful registration/login, the user completes their personal profile (`User_Profile`).
2. **Trainer Assignment (`PT`):**
   - Personal Trainers are **not** global freelance entities.
   - A Gym searches for an existing system `User` and grants that user the PT role (`Gym_Trainer`) specifically for that Gym.
3. **Customer Memberships:**
   - A `Customer` becomes an active `Membership` of a specific Gym upon purchasing/registering a `Package` offered by that Gym.

---

## 4. Authorization & Scope Enforcement

The mandatory authorization pipeline is:

$$\text{User} \longrightarrow \text{Authentication} \longrightarrow \text{Role} \longrightarrow \mathbf{\text{Gym Scope}} \longrightarrow \text{Authorization} \longrightarrow \text{Business Data}$$

### Core Authorization Rules:
- **Never rely solely on Role:** Never authorize gym-specific data access using only the user's role (e.g., checking `role == 'Manager'` is insufficient).
- **Mandatory Gym Scope Validation:** Every request to view, modify, or delete gym-scoped resources must explicitly verify that the authenticated user has rights to that specific `gym_id`.
- **Manager Boundary:** Every Manager is tied to a specific Gym (`Gym_Manager`). A Manager must only access and manage records belonging to their assigned Gym.
- **Trainer Boundary:** A PT must only access appointments, clients, and schedules within the Gym they are assigned to (`Gym_Trainer`).

---

## 5. Domain Entities

The relational database model centers around these 12 approved domain entities:

1. `User`
2. `User_Profile`
3. `Role`
4. `User_Role`
5. `Gym`
6. `Gym_Manager`
7. `Gym_Trainer`
8. `Package`
9. `Membership`
10. `PT_Registration`
11. `PT_Appointment`
12. `Gym_Report`

> [!IMPORTANT]
> Do **not** invent or introduce new business entities unless they are strictly necessary and explicitly justified.

### Gym Report Specifications
Customers can submit incident reports directly to a specific Gym (`Gym_Report`):
- **Allowed fields:** One image, text content, Gym association (`gym_id`), reporting user (`user_id`), status, and audit timestamps.
- **Restriction:** Do **not** create equipment-specific reporting entities or complex asset tracking sub-models.

---

## 6. Scope Exclusions (Out of Scope)

The following features and technologies are strictly outside the current scope:
- No AI / ML / DL integrations.
- No workout auto-generation or automated workout plans.
- No workout goals or workout routing.
- No body metrics or fitness progress tracking systems.
- No equipment or inventory management modules.

Do **not** introduce or scaffold any of the above unless explicitly instructed.

---

## 7. Database & Persistence Standards

- **Engine:** PostgreSQL exclusively. Do not introduce NoSQL or alternative databases.
- **Relational Integrity:** Maintain strict foreign-key relationships, indexes, constraints, and cascades.
- **Gym Scope Awareness:** Ensure all queries touching gym-specific tables filter on or validate the relevant `gym_id`.
- **Schema Changes:** Never modify database schemas or run migrations without clearly explaining the impact beforehand.

---

## 8. Architectural Boundaries

Maintain clean separation of concerns:
- **Frontend:** Presentation, UI components, and state management.
- **Backend / API:** Route handlers, request validation, business logic, and error handling.
- **Authentication:** Identity verification, password hashing, and session/token generation.
- **Authorization:** Role checks, gym-scope verification, and resource permissions.
- **Database:** Relational schema, integrity constraints, and query execution.

Do not introduce new frameworks, ORMs, or major external technologies without discussing and obtaining confirmation first.

---

## 9. Development Workflow & AI-Assisted Coding Standards

Before implementing any non-trivial feature or change:

1. **Understand the requirement** thoroughly.
2. **Inspect the existing structure** to locate existing patterns and components.
3. **Check related business rules** and verify database entities.
4. **Assess authorization implications** (especially role and gym scope).
5. **Draft a concise plan** outlining the changes.
6. **Implement the smallest appropriate change** without unnecessary complexity.
7. **Test the change** thoroughly.
8. **Verify existing functionality** remains intact.
9. **Review and verify with concrete evidence** before declaring completion.

### Code Quality Rules for AI Code:
- **Avoid Over-Abstraction:** Prefer straightforward, readable code over premature abstractions or speculative patterns.
- **Prevent Duplication:** Reuse existing helpers, middleware, and components instead of rewriting them.
- **File Organization & Sizing:** Prefer small, focused, cohesive files. Avoid unnecessarily large files, but do not split files solely to satisfy an arbitrary line-count limit.
- **No Silent Changes:** Never modify or delete unrelated code or configuration files.
- **Evidence-Based Completion:** Never claim a feature or fix works without executing fresh tests or verification steps.

---

## 10. Communication & Conflict Resolution

When a new requirement conflicts with the established architecture, database schema, or multi-gym scoping rules:
1. Identify and state the conflict clearly.
2. Explain the trade-offs or technical risks briefly.
3. Propose the minimal viable solution that preserves architectural integrity.
4. Pause and await explicit confirmation before altering core architecture or database schemas.

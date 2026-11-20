# Orbit Workspace Setup & Development Roadmap

This document defines the target repository structure for **Orbit** and the **Phase 1 UI-First & Mockup** execution plan.

---

## 1. Target Monorepo Workspace Structure

```text
orbit/
├── README.md
├── AGENTS.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CODING_STANDARDS.md
│   ├── DESIGN_SYSTEM.md
│   ├── LIMITS_AND_SLAS.md
│   └── ROADMAP_AND_WORKSPACE.md
├── ponytail/                  # Mandatory code governance & cleanup agent/config
├── infra/
│   └── docker/                # Multi-stage Dockerfiles & local compose (Postgres, Redis)
├── frontend/                  # ReactTS + Tailwind + Outfit + lucide-react
│   ├── src/
│   │   ├── app/               # Router, providers, app shell
│   │   ├── components/        # Shared minimal UI primitives (0px radius)
│   │   ├── modules/           # Feature modules (git, mail, docs, sheets, ppt, markdown)
│   │   ├── services/          # Service interfaces + Phase 1 mock adapters
│   │   ├── mocks/             # Typed realistic mock datasets
│   │   └── styles/            # Tailwind config, Outfit font, CSS variables
│   ├── Dockerfile
│   └── package.json
├── backend/                   # Spring Boot 3.x (Java 21, PostgreSQL, Redis)
│   ├── Dockerfile
│   └── pom.xml
└── packages/                  # Shared contracts / OpenAPI / design tokens (optional)
```

> **Note:** Every source code file (`.ts`, `.tsx`, `.css`, `.mjs`, `.java`) inside `frontend/`, `backend/`, `ponytail/`, and `packages/` must stay strictly **< 200 LOC**.

---

## 2. Phase 1: UI-First & Mockup Roadmap (Current Focus)

**Goal:** Lock down all user flows, layout ergonomics, and feature scope using interactive mockups before writing real backend logic.

### Milestone 1.1 — Workspace & Design System Foundation
- Initialize `frontend/` (`Vite` + `React` + `TypeScript` + `Tailwind CSS`).
- Configure Google Font **`Outfit`**, Black/Green color tokens, `rounded-none` (`0px`) defaults, and `lucide-react`.
- Initialize `ponytail` ruleset (`< 200 LOC`, zero-emoji, no rounded corners).
- Build core UI primitives: `Button`, `Input`, `Panel`, `Table`, `Modal`, `Tabs`, `CommandPalette` (all `< 200 LOC`).

### Milestone 1.2 — App Shell & Navigation
- Left primary module rail for switching between workspace areas.
- Top header bar and collapsible secondary context sidebar.

### Milestone 1.3 — Module UI Mockups (Scope Pending Sign-Off)
- The workspace structure is signed off in [WORKSPACE_SPEC.md](WORKSPACE_SPEC.md): Workspaces contain Projects, each enabling the **Git**, **Docs**, **Sheets**, and **Chat** modules, while **Mails** is a global module in the Header Bar.
- Workspaces, Projects, roles, invitations, and Chat already run on the real backend. Mails and social account linking use typed mock adapters.
- The internal features of Git, Docs, and Sheets are not finalized yet. Each will be prototyped with interactive UI and typed mock adapters, reviewed with stakeholders, and adjusted before any backend implementation.

### Milestone 1.4 — Feature Freeze & Sign-Off
- Review finalized UI mockups and lock feature scope.
- Define Spring Boot API DTO contracts and transition to Phase 2 (`backend/`).

---

## 3. Phase 2 & 3 (Post-UI Freeze)

- **Phase 2:** Scaffold `backend/` (Dockerized Spring Boot 3.x, Java 21, PostgreSQL, Redis, Kafka) and replace `Mock*Service` with `Http*Service`.
- **Phase 3:** Deploy to **AWS** via Docker containers, load test to **10,000+ CCU**, tune HikariCP/PgBouncer and ElastiCache Redis, enable CloudFront CDN caching, and verify all SLAs in [docs/LIMITS_AND_SLAS.md](file:///d:/orbit/docs/LIMITS_AND_SLAS.md).

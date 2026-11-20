# Orbit

**Orbit** is a production-grade **Developer Workspace Platform** unifying core engineering and collaboration tools into a single minimal, high-performance environment: workspaces and projects with **Git**, **Docs**, **Sheets**, and **Chat** modules, plus a global **Mails** client.

Designed from day one to scale to **10,000+ concurrent users (CCU)** and beyond, Orbit enforces strict architectural boundaries, UI consistency, and code maintainability standards for both human engineers and AI agents.

---

## Workspaces, Projects and Modules

Orbit is a multi-workspace collaboration platform:

- A user owns or joins many **Workspaces**; each Workspace contains many **Projects**.
- **Modules** (`git`, `docs`, `sheets`, `chat`) are enabled per Workspace, and each Project picks from the modules its Workspace enabled. Enabled modules appear in the Sidebar.
- **Roles** are custom permission sets, defined independently for Workspaces and for Projects. The backend checks permission keys, never role names.
- **Mails** is a global module in the Header Bar that connects your own mailbox (Gmail, Outlook or IMAP). It does not belong to any Workspace.
- Members join by email invitation or reusable invite link. Deleting a Workspace is a soft delete, restorable for 30 days.

The full specification is in [docs/WORKSPACE_SPEC.md](docs/WORKSPACE_SPEC.md) and the API contract in [docs/API_WORKSPACE.md](docs/API_WORKSPACE.md). Mails and social account linking run on typed mock services in this round.

---

## Running and Testing

```powershell
# Backend unit and integration tests (integration tests start PostgreSQL through Docker and skip without it)
cd backend; mvn test

# Frontend typecheck, tests, production build, and the repository governance check
cd frontend; npm run typecheck; npm test; npm run build; npm run ponytail
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React + TypeScript (`ReactTS`), Tailwind CSS |
| **Typography** | Google Font: `Outfit` |
| **Iconography** | `lucide-react` (strictly no emojis anywhere in UI, code, logs, or docs) |
| **Backend (Production Target)** | Spring Boot (Java 21+, modular services / API gateway) |
| **Primary Database** | PostgreSQL |
| **Cache & Sessions** | Redis |
| **Containerization & Cloud** | Docker on AWS (ECS/EKS, RDS, ElastiCache, S3, CloudFront) |
| **Async Messaging & Storage** | Kafka (or RabbitMQ), AWS S3 |
| **Governance & Cleanup** | `ponytail` agent / repository |
| **Language Standard** | English only across all docs, code, comments, and commits |

---

## Development Strategy: Phase-First Execution

Orbit follows a **UI-First & Mockup-Driven** rollout before full backend implementation:

1. **Phase 1 — Documentation, Workspace Setup & UI Mockup Lock**
   - Establish workspace structure, design tokens, and strict engineering guardrails.
   - Build complete, interactive UI flows using typed **mock data and mock service adapters**.
   - Validate UX, navigation, and feature scope across Git, Mail, and Document modules before writing production backend logic.
2. **Phase 2 — Core Backend & Real-Time Integration**
   - Swap mock adapters for Spring Boot REST/WebSocket APIs without rewriting UI components.
   - Implement authentication, RBAC, persistence, and async workers.
3. **Phase 3 — Production Hardening (10k+ CCU)**
   - Load testing, caching layers, database partitioning/replicas, observability, and SLA enforcement.

---

## Documentation Index

All contributors (human developers and AI agents) must read and follow these specifications:

- [AGENTS.md](file:///d:/orbit/AGENTS.md) — Mandatory rules, hard limits, and verification checklist for AI agents and developers
- [docs/DESIGN_SYSTEM.md](file:///d:/orbit/docs/DESIGN_SYSTEM.md) — Minimal Black & Green theme, `Outfit` font, square borders (`0px` radius), zero-emoji icon policy
- [docs/CODING_STANDARDS.md](file:///d:/orbit/docs/CODING_STANDARDS.md) — Strict `< 200 LOC` file limit, modular splitting, ReactTS/Spring Boot rules, and `ponytail` governance
- [docs/ARCHITECTURE.md](file:///d:/orbit/docs/ARCHITECTURE.md) — Platform architecture for 10k+ CCU and Mock-to-Production adapter boundaries
- [docs/LIMITS_AND_SLAS.md](file:///d:/orbit/docs/LIMITS_AND_SLAS.md) — Hard technical limits, latency budgets, rate limits, and scalability targets
- [docs/ROADMAP_AND_WORKSPACE.md](file:///d:/orbit/docs/ROADMAP_AND_WORKSPACE.md) — Workspace directory layout, setup blueprint, and Phase 1 UI mockup milestones
- [docs/WORKSPACE_SPEC.md](docs/WORKSPACE_SPEC.md) — Workspace, Project, module, role, invitation and chat specification with implementation notes
- [docs/API_WORKSPACE.md](docs/API_WORKSPACE.md) — Binding REST and STOMP contract for the workspace platform


# AGENTS.md — Mandatory Rules for AI Agents & Developers

This file is the **single source of truth for operational compliance** in the Orbit repository. Every AI agent (including `ponytail`) and human developer must follow these rules without exception.

---

## 1. Non-Negotiable Hard Rules

### 1.1 Code Size & Modularity
- **HARD LIMIT: Every source code file MUST be strictly under 200 lines of code (`< 200 LOC`).**
  - Blank lines and comments count toward total file lines unless your configured linter specifies otherwise; target **<= 180 lines** as a safe buffer.
  - If a file approaches 180 lines, **split it immediately** by single responsibility (e.g., separate UI subcomponents, custom hooks, API/mock adapters, types, formatters, validators).
- **Single Responsibility Principle:** One file = one clear purpose. Never bundle multiple unrelated components, services, or utilities into a single file.

### 1.2 Visual & UI Constraints
- **Zero-Emoji Policy:** Emojis are **strictly forbidden** in UI components, mock data, comments, commit messages, logs, and documentation.
  - Use icons from the approved icon library (`lucide-react`) only.
- **Typography:** Use Google Font **`Outfit`** as the primary font family. Use monospace (`JetBrains Mono` or system mono) strictly for code blocks, git diffs, and tabular numbers where appropriate.
- **Color Palette:** Minimal **Black + Green** aesthetic (reference: `nhatprx.com`). Do not introduce off-palette accent colors (no purple, orange, pink, or random gradients).
- **Square Borders Only:** All UI containers, buttons, inputs, cards, modals, badges, status indicators, and tables **must use square corners (`border-radius: 0px` / Tailwind `rounded-none`)**. Rounded pills, cards, or circular dots (`rounded-md`, `rounded-lg`, `rounded-full`) are prohibited everywhere; use `6px x 6px` square blocks for status indicators.

### 1.3 Tech Stack, Persistence & Infrastructure
- **Frontend:** React + TypeScript (`ReactTS`), Tailwind CSS.
- **Backend (Production Target):** Spring Boot (Java 21+).
- **Primary Database:** **PostgreSQL** (mandatory; do not introduce MySQL, MongoDB, or other primary RDBMS).
- **Cache & Session Store:** **Redis** (mandatory for distributed sessions, token revocation, rate limiting, and hot-path caching).
- **Containerization & Cloud:** **Docker** containers deployed on **AWS**.
- **English-Only Policy:** All project documentation, code, comments, identifiers, logs, and commit messages **must be written strictly in English**. Non-English text is forbidden in the repository.

### 1.4 Phase 1 Development Scope (UI-First & Mockup)
- During Phase 1, **do not build real backend persistence, SMTP/IMAP servers, or real Git daemon engines** unless explicitly instructed.
- Build **realistic, interactive UI** backed by **typed mock repositories/adapters** (`src/mocks/` or `services/mock/`).
- Every UI feature must consume data through a **clean service interface** so Phase 2 can swap `MockService` for `HttpApiService` with zero UI component rewrites.

### 1.5 Governance via `ponytail`
- The **`ponytail`** agent/repository is mandatory for codebase management, structural auditing, dead-code removal, and `< 200 LOC` enforcement.
- Any new module or refactor must remain compatible with `ponytail` automated cleanup and lint checks.

---

## 2. Architecture & Scale Guardrails (10k+ CCU Target)

Even in Phase 1 UI work, code must respect production scale constraints:
- **No unbounded lists:** Always design UI tables, lists, trees, and data grids with pagination, virtual scrolling, or explicit slice limits.
- **No N+1 state/fetch patterns:** Batch or normalize client state; avoid firing per-row requests.
- **Strict TypeScript:** `strict: true` is mandatory. No `any`, no `@ts-ignore`, no silent type assertions without validation.
- **Backend (Spring Boot) readiness:** API contracts defined in frontend types must align with RESTful/WebSocket pagination, cursoring, and standard error envelopes defined in [docs/ARCHITECTURE.md](file:///d:/orbit/docs/ARCHITECTURE.md).

---

## 3. Pre-Completion Checklist

Before marking any task complete, verify:
1. Every created or modified source file is **< 200 LOC**.
2. Zero emojis exist in any added or modified file.
3. All documentation, code, comments, and commit messages are written strictly in **English**.
4. All UI components use `Outfit`, Black/Green minimal tokens, and `rounded-none` (`0px` border radius).
5. Iconography uses `lucide-react` consistently.
6. Mock data and services are cleanly isolated behind interfaces (Phase 1).
7. Build, typecheck, and `ponytail` compliance checks pass with zero errors.

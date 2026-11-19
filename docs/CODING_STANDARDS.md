# Orbit Coding Standards & Ponytail Governance

This document defines mandatory code organization, style, and quality enforcement rules for **Orbit**.

---

## 1. The `< 200 LOC` Hard Rule

Every source code file across Frontend (`ReactTS`) and Backend (`Spring Boot`) **must contain fewer than 200 lines of code (`< 200 LOC`)**.

### Why
- Forces clean separation of concerns.
- Makes codebases fast to read, review, and test for both humans and AI agents.
- Prevents monolithic "god components" and "god services" as Orbit scales.

### How to Split Files Properly
When a file approaches **160–180 lines**, split it along functional boundaries:

**Frontend (`ReactTS` + Tailwind):**
- `FeaturePage.tsx` — Page layout & composition only (`< 120 LOC`)
- `FeatureToolbar.tsx` / `FeatureList.tsx` / `FeatureRow.tsx` — Focused UI components
- `useFeatureState.ts` — Custom hook for state, effects, and actions
- `feature.types.ts` — TypeScript interfaces and types
- `feature.service.ts` — API / Mock adapter calls
- `feature.utils.ts` — Pure helper functions and formatters

**Backend (`Spring Boot`):**
- `*Controller.java` — Thin HTTP/WebSocket mapping and validation only
- `*Service.java` — Single-use-case or cohesive domain service
- `*Repository.java` — Spring Data / custom query interface
- `*Mapper.java` — DTO <-> Entity mapping
- `dto/*.java` — Small immutable request/response records

---

## 2. `ponytail` Agent & Repository Governance

Orbit requires **`ponytail`** (dedicated agent/repo) to continuously govern codebase hygiene.

### Responsibilities of `ponytail`
1. **LOC Enforcement:** Scan all tracked source files and flag/block any file `>= 200 LOC`.
2. **Dead Code & Import Cleanup:** Detect unused exports, orphaned components, unused CSS/Tailwind classes, and stale mock fixtures.
3. **Design Token Compliance:** Flag forbidden Tailwind classes (e.g., `rounded-md`, `rounded-lg`, `rounded-full`, off-palette colors) and detect any emoji characters in source/markdown files.
4. **Structural Refactoring:** Propose or execute safe file splits when modules grow beyond threshold.

### Workflow Rule
- Every feature branch or agent task must pass `ponytail` checks before merge.
- No manual suppression comments (`eslint-disable`, `@SuppressWarnings`) are allowed to bypass `< 200 LOC` or type safety.

---

## 3. Frontend Standards (`ReactTS` + Tailwind)

- **TypeScript Strict Mode:** `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`.
- **Component Style:** Functional components only; explicit prop interfaces (`interface FooProps`).
- **State Management:**
  - Server/async state: TanStack Query (or clean service-hook boundary in Phase 1).
  - Global UI state (active workspace, sidebar, theme): lightweight Zustand store, split by slice.
- **Styling:** Tailwind utility classes only; no inline `style={{}}` except for dynamic coordinates (e.g., virtualized row/item positioning).
- **No Barrel Abuse:** Avoid deep `index.ts` re-export chains that hurt tree-shaking and cause circular dependencies.

---

## 4. Backend Standards (`Spring Boot`)

- **Java 21+ / Spring Boot 3.x:** Use Java `record`s for DTOs, virtual threads (`spring.threads.virtual.enabled=true`) for high-concurrency I/O.
- **Stateless Services:** Never store session state in JVM memory; use Redis / JWT.
- **Transaction Boundaries:** Keep `@Transactional` methods short; never hold DB transactions open across external HTTP calls, object storage uploads, or Kafka publishes.
- **Standard Error Envelope:** All endpoints return consistent JSON errors (`code`, `message`, `traceId`, `timestamp`, `details`).

---

## 5. Naming & Git Conventions

- **Files:**
  - React components: `PascalCase.tsx` (e.g., `WorkspaceItemList.tsx`)
  - Hooks: `camelCase.ts` starting with `use` (e.g., `useWorkspaceItems.ts`)
  - Utilities/services/types: `kebab-case.ts` or `dot.notation.ts` (e.g., `workspace.service.ts`, `workspace.types.ts`)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`), **no emojis**.

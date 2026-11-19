# Orbit Limits, Budgets & SLAs (10k+ CCU Production Standard)

All architecture, UI designs, and backend implementations must respect these hard operational boundaries.

---

## 1. Scale & Availability Targets

| Metric | Target |
| :--- | :--- |
| **Concurrent Users (CCU)** | `>= 10,000` active concurrent connections (designed to scale horizontally to `50,000+`) |
| **Platform Availability (SLA)** | `99.9%` monthly uptime (<= 43.2 min downtime/month) |
| **API Error Rate (5xx)** | `< 0.1%` of total requests |
| **WebSocket Reconnect Recovery** | `< 3s` with exponential backoff + jitter |

---

## 2. Latency Budgets

| Operation | p50 | p95 | p99 |
| :--- | :--- | :--- | :--- |
| **Standard REST Read** (list/detail) | `<= 40ms` | `<= 150ms` | `<= 300ms` |
| **Standard REST Write** (create/update) | `<= 80ms` | `<= 250ms` | `<= 500ms` |
| **Search / Query Endpoints** | `<= 100ms` | `<= 350ms` | `<= 700ms` |
| **Real-Time WebSocket Events** | `<= 50ms` | `<= 120ms` | `<= 250ms` |

---

## 3. Frontend Performance Budgets (`ReactTS`)

| Metric | Hard Limit |
| :--- | :--- |
| **Initial JS Bundle (gzipped)** | `<= 250 KB` (route-based code splitting required per workspace area) |
| **Largest Contentful Paint (LCP)** | `<= 1.8s` |
| **Interaction to Next Paint (INP)** | `<= 100ms` |
| **Cumulative Layout Shift (CLS)** | `<= 0.05` |
| **List Rendering** | Virtualization required for any list/table `> 100` rows |

---

## 4. API, Payload & Rate Limits

| Resource | Hard Limit |
| :--- | :--- |
| **Default API Rate Limit** | `120 req/min` per user; `1,000 req/min` per workspace (burst via token bucket in Redis) |
| **JSON Request Body** | `<= 1 MB` (larger binary uploads must use pre-signed AWS S3 URLs) |
| **Pagination Page Size** | Default `25`, Max `100` items per request (cursor-based pagination preferred for large feeds) |
| **Direct File / Object Upload** | Module-specific limits to be defined after Phase 1 feature lock |

---

## 5. Database & Infrastructure Guardrails

- **Max Query Execution Time:** `2,000ms` statement timeout on OLTP PostgreSQL connections.
- **Connection Pooling:** HikariCP sized per pod + PgBouncer in transaction pooling mode to protect PostgreSQL at 10k+ CCU.
- **No Unbounded Queries:** `SELECT` without `LIMIT` or pagination is forbidden in production repositories.
- **No Synchronous Heavy Work:** Exports, background indexing, and batch notifications must be asynchronous.
- **Schema Migrations (Flyway):** All PostgreSQL schema changes must use versioned Flyway migrations (`V*__*.sql`) with backward-compatible, zero-downtime rollout rules (expand-and-contract).
- **Backup & Disaster Recovery:** Multi-AZ RDS PostgreSQL with automated daily snapshots, Point-in-Time Recovery (PITR), **`RPO <= 5 minutes`**, and **`RTO <= 30 minutes`**.

---

## 6. WebSocket Scale Limits (10k+ CCU)

| Parameter | Hard Limit |
| :--- | :--- |
| **Max Concurrent WS Connections** | `<= 3` active sockets per user session; `<= 2,500` per API pod |
| **Heartbeat / Idle Timeout** | `25s` ping/pong heartbeat; disconnect idle sockets after `90s` without pong |
| **Max Frame / Message Payload** | `<= 64 KB` per WebSocket frame (large payloads must use REST + S3) |
| **Pub/Sub Fan-Out** | Bounded Redis Pub/Sub channels scoped by `workspace_id` with per-client send buffer cap |

---

## 7. 10k+ CCU Load Testing & Verification Gates

- **Pre-Production Gate:** Run automated load tests (k6 / Gatling) simulating `10,000+` concurrent users (mixed REST + WebSocket traffic) before Phase 3 release.
- **Pass Criteria:** Sustained `>= 10,000` CCU for `30+ minutes` with zero pod OOMs, `p95`/`p99` within Section 2 budgets, and 5xx error rate `< 0.1%`.

---

## 8. Codebase Structural Limit

- **Max Source File Length:** **`< 200 LOC`** (enforced by `ponytail`).

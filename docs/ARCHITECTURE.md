# Orbit Platform Architecture (10k+ CCU Target)

This document defines the production architecture for **Orbit** to reliably support **10,000+ concurrent users (CCU)**, alongside the **Phase 1 Mockup Adapter** pattern so UI development proceeds immediately without rework.

---

## 1. High-Level System Architecture (AWS + Docker)

All production services are packaged as immutable **Docker** containers and deployed on **AWS** (ECS/EKS behind ALB + CloudFront/WAF, RDS PostgreSQL, ElastiCache Redis, S3).

```text
[ ReactTS + Tailwind SPA / PWA ]
               |
      HTTPS / WSS (TLS 1.3)
               |
      [ AWS CloudFront + WAF ]
               |
      [ AWS ALB / API Gateway ]  (Rate Limiting, JWT Auth, Routing)
        /      |       \
       v       v        v
  [ Core / Auth ]  [ Module Services ]  [ Realtime Gateway ]
        \      |       /   (Dockerized Spring Boot 3.x Services)
         v     v      v
  +----------------------------------+
  | AWS ElastiCache (Redis Cluster)  |  (Sessions, Cache, Pub/Sub, Rate Limit)
  | AWS RDS PostgreSQL (Primary+RO)  |  (Metadata, Users, Workspaces, Module Records)
  | Kafka / Event Bus                |  (Async Indexing, Notifications, Webhooks)
  | AWS S3                           |  (Binary Assets, Attachments, Snapshots)
  +----------------------------------+
```

---

## 2. Phase 1 Strategy: Mock-to-Production Adapter Boundary

During **Phase 1**, the frontend runs without a live Spring Boot backend, **but all data access must go through strict service interfaces**:

```text
[ UI Components ] ---> [ Service Interface (e.g., IModuleService) ]
                              |
              +---------------+---------------+
              |                               |
     [ Phase 1: MockModuleService ]  [ Phase 2: HttpModuleService ]
     (In-memory / LocalStorage)      (Spring Boot REST / WS)
```

### Rules for Phase 1 Mockups
1. UI components **never** import raw mock JSON directly. They call hooks (`useWorkspaceItems()`) backed by the service interface.
2. Mock services must simulate **realistic async latency** (e.g., `150ms–400ms`), **pagination**, **empty states**, and **error states**.
3. Mock data structures must match the exact DTO contracts planned for Spring Boot.

---

## 3. Infrastructure & Data Layer Boundaries

Specific module-level domain flows and features are **not yet finalized** (pending Phase 1 UI mockup sign-off). However, all future modules must adhere to these platform-level storage and compute boundaries:

| Layer | Production Standard |
| :--- | :--- |
| **Auth & Multi-Tenancy** | Spring Security + OAuth2/OIDC + JWT (short-lived access + Redis refresh rotation); strict `workspace_id` isolation on every query and cache key. |
| **Relational Data** | AWS RDS PostgreSQL (Primary + Read Replicas) for structured metadata and transactional records. |
| **Cache & Sessions** | AWS ElastiCache (Redis Cluster) for distributed sessions, rate limiting, Pub/Sub, and hot-path caching. |
| **Object & Binary Storage** | AWS S3 for large binary assets, attachments, and snapshots (accessed via pre-signed URLs). |
| **Async & Real-Time** | Kafka / Event Bus for background jobs and indexing; WebSocket gateway backed by Redis Pub/Sub for real-time updates when required. |

---

## 4. Scaling & Concurrency Patterns (10k+ CCU)

1. **Horizontal Statelessness:** Spring Boot API instances are 100% stateless and auto-scaled behind a load balancer.
2. **Java 21 Virtual Threads:** Enabled for high-throughput non-blocking I/O without reactive complexity.
3. **Read/Write Splitting:** PostgreSQL primary for writes; read replicas for heavy read paths (workspace listings, item feeds, revision history).
4. **Multi-Layer Caching:**
   - Edge CDN for static React assets.
   - Redis for hot workspace permissions, session state, and frequently accessed read payloads.
5. **Backpressure & Async Offloading:** Heavy background jobs (exports, indexing, bulk processing) are offloaded to async workers via Kafka—never executed synchronously on HTTP request threads.
6. **Multi-Tenant Isolation:** Every database table and cache key is scoped by `workspace_id` to prevent cross-tenant data leakage and noisy-neighbor issues.

---

## 5. API Pagination & Standard Error Envelope Contracts

All Phase 1 mock adapters and Phase 2 Spring Boot endpoints must share identical response contracts:

### Cursor / Page Pagination Envelope
```json
{
  "items": [],
  "nextCursor": "eyJpZCI6IjEwMCJ9",
  "hasMore": true,
  "limit": 25
}
```
- Use opaque cursor-based pagination (`cursor`, `limit`) for feeds and large lists (default `25`, max `100`).

### Standard Error Envelope
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error summary",
  "traceId": "0192b8f4-7c3a-7d12-9f0a-123456789abc",
  "timestamp": "2026-01-01T00:00:00Z",
  "details": [
    { "field": "workspaceId", "reason": "must not be blank" }
  ]
}
```
- Map domain/validation failures to standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `429`, `500`, `503`).

---

## 6. Observability & Operations

- **Structured Logging:** Emit JSON logs with `traceId`, `workspaceId` (never PII/secrets), `service`, and `latencyMs`.
- **Distributed Tracing:** Propagate W3C `traceparent` via OpenTelemetry across ALB, Spring Boot services, PostgreSQL, Redis, and Kafka.
- **Metrics & Health Probes:** Expose `/actuator/health/liveness`, `/actuator/health/readiness`, and Prometheus/Micrometer metrics (`http_server_requests`, HikariCP pool saturation, Redis latency, WS active connections) with alerts tied to the `99.9%` SLA and `< 0.1%` 5xx budget.

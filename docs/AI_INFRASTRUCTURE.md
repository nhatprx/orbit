# Orbit — AI Chat Infrastructure Specification

> **Purpose:** Authoritative technical specification for Orbit's cloud-native AI Chat, 3-Tier Memory, Qdrant Cloud Vector Store, RBAC-enforced Live Tools, and Admin-configurable LLM Gateway.
> **Scope:** Phase A (Core AI Chat, Streaming SSE, Working & Long-Term Memory, Live Workspace/Cloud Tools, Web Search, Admin Provider Switcher).

---

## 1. Core Architectural Principles

1. **Cloud & Third-Party Only:** All LLM inference, embeddings, vector storage, and web search run strictly on cloud or managed third-party services. No local LLM runtimes or local vector DB containers are deployed in Orbit.
2. **Primary + Switchable LLM Gateway:**
   - Primary provider: **AWS Bedrock** (Converse API + Titan Embed v2).
   - Switchable provider: **OpenRouter** (OpenAI-compatible streaming SSE + tool calling + `:online` web search).
   - Platform **Admins** can switch the active provider (`BEDROCK` or `OPENROUTER`), configure model IDs per tier (`orbit-fast`, `orbit-pro`, `orbit-coder`), and toggle web search at runtime via `/api/v1/admin/ai/config`.
3. **RBAC-First Data Isolation:** Every live tool call and memory lookup is scoped to the authenticated user's `userId`, `workspaceId`, `projectId`, and live permission keys. AI never bypasses Workspace, Project, Chat, or Cloud Files authorization.
4. **10k+ CCU Readiness:**
   - Java 21 Virtual Threads handle SSE streaming connections without blocking platform threads.
   - Redis enforces per-user sliding-window rate limits (fails open if Redis is unavailable).
   - Bounded message history, bounded tool loop (max 4 rounds), and capped file reads (64 KB text window).

---

## 2. Three-Tier Memory Architecture

| Tier | Storage | Behavior |
| :--- | :--- | :--- |
| **Tier 1: Working Memory** | PostgreSQL (`ai_threads`, `ai_messages`) | Sliding window of recent messages (up to 16 turns) plus a rolling summary stored on `ai_threads.rolling_summary` when threads grow long. |
| **Tier 2: Long-Term Semantic Memory** | PostgreSQL (`ai_memories`) + **Qdrant Cloud** | Stores scoped facts, decisions, and preferences (`USER`, `WORKSPACE`, `PROJECT`). Uniform **1024-dim Cosine** vectors (`amazon.titan-embed-text-v2:0` on Bedrock; `openai/text-embedding-3-small` with `dimensions=1024` on OpenRouter) allow switching providers without re-indexing. Falls back gracefully to PostgreSQL keyword/recency recall when Qdrant Cloud is not configured. |
| **Tier 3: Workspace Live Tools & Web Search** | Live Orbit Services + Tavily / OpenRouter | Real-time tool calls: `get_workspace_overview`, `list_projects`, `search_cloud_files`, `read_cloud_file`, `search_chat_history`, and `web_search`. |

---

## 3. REST & SSE API Contract

- `GET /api/v1/ai/threads?scopeType=&workspaceId=&projectId=` — List user's AI threads (bounded).
- `POST /api/v1/ai/threads` — Create a new AI thread bound to a scope and model tier.
- `DELETE /api/v1/ai/threads/{threadId}` — Delete a thread owned by the current user.
- `GET /api/v1/ai/threads/{threadId}/messages` — List messages in a thread.
- `POST /api/v1/ai/threads/{threadId}/messages/stream` — Stream AI response via `text/event-stream` (`token`, `tool_start`, `tool_end`, `done`, `error` events).
- `GET /api/v1/ai/memories?scopeType=&workspaceId=&projectId=` — List long-term memories visible to the user in that scope.
- `POST /api/v1/ai/memories` — Explicitly save a memory item (indexed in Qdrant Cloud when configured).
- `DELETE /api/v1/ai/memories/{memoryId}` — Delete a memory item from PostgreSQL and Qdrant Cloud.
- `GET /api/v1/admin/ai/config` — Read current AI provider configuration (Admin only).
- `PUT /api/v1/admin/ai/config` — Update active provider, models, and web search setting (Admin only).

---

## 4. Environment Variables

| Variable | Description |
| :--- | :--- |
| `ORBIT_AI_PROVIDER` | Default provider (`BEDROCK` or `OPENROUTER`) |
| `ORBIT_AI_BEDROCK_REGION` | AWS Bedrock region (default `us-east-1`) |
| `ORBIT_AI_BEDROCK_FAST_MODEL` | Bedrock model ID for `orbit-fast` |
| `ORBIT_AI_BEDROCK_PRO_MODEL` | Bedrock model ID for `orbit-pro` |
| `ORBIT_AI_BEDROCK_CODER_MODEL` | Bedrock model ID for `orbit-coder` |
| `ORBIT_AI_BEDROCK_EMBED_MODEL` | Bedrock embedding model (default `amazon.titan-embed-text-v2:0`) |
| `ORBIT_AI_OPENROUTER_API_KEY` | OpenRouter API key |
| `ORBIT_AI_OPENROUTER_BASE_URL` | OpenRouter base URL (`https://openrouter.ai/api/v1`) |
| `ORBIT_AI_QDRANT_URL` | Qdrant Cloud HTTPS endpoint |
| `ORBIT_AI_QDRANT_API_KEY` | Qdrant Cloud API key |
| `ORBIT_AI_QDRANT_COLLECTION` | Qdrant collection name (`orbit_ai_memories`) |
| `ORBIT_AI_TAVILY_API_KEY` | Tavily API key for external web search |

---

## 5. Phase B (Next Milestone)

- Asynchronous background indexing of uploaded Cloud Files (PDF, DOCX, Markdown, source code) into a dedicated Qdrant Cloud collection (`orbit_file_chunks`) with hybrid search and citation page numbers.

# Orbit — Workspace Restructure API Contract & Implementation Plan

> **Status:** Binding contract for all backend (`be-workspace`, `be-access`, `be-chat`) and frontend (`fe-shell`, `fe-settings`, `fe-collab`) workers.

---

## 1. Common Conventions

### Authentication
- All endpoints under `/api/v1/**` require `Authorization: Bearer <jwt>` unless explicitly marked **Public**.
- Current user is resolved from `@AuthenticationPrincipal AuthenticatedUserPrincipal` (`userId` UUID).

### Error Envelope (Matches `com.orbit.common.ApiErrorResponse`)
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message.",
  "traceId": "uuid",
  "timestamp": "2026-11-20T00:00:00Z",
  "details": [{ "field": "name", "reason": "must not be blank" }]
}
```

### Rule Violation Status & Error Codes
| Rule | Condition | HTTP Status | Error Code |
|---|---|---|---|
| BR-02 | Enable project module not enabled on workspace | `400` | `MODULE_NOT_ENABLED_IN_WORKSPACE` |
| BR-03 | Create workspace with empty `moduleKeys` | `400` | `VALIDATION_ERROR` |
| BR-04 / BR-14 | Access a soft-deleted workspace (except restore/list) | `404` | `WORKSPACE_NOT_FOUND` |
| BR-07 | Owner attempts to leave or change own role without transfer | `409` | `OWNER_TRANSFER_REQUIRED` |
| BR-08 | Non-owner attempts to delete workspace | `403` | `FORBIDDEN` |
| BR-08 | Delete workspace `confirmName` does not match workspace `name` | `400` | `CONFIRMATION_NAME_MISMATCH` |
| BR-10 | Invite token expired | `410` | `INVITATION_EXPIRED` |
| BR-10 | Invite token revoked | `410` | `INVITATION_REVOKED` |
| BR-10 | Email invite already accepted/declined | `409` | `INVITATION_ALREADY_USED` |
| BR-11 | Delete role currently assigned to >= 1 member | `409` | `ROLE_IN_USE` |
| BR-11 | Edit or delete immutable `Owner` system role | `403` | `SYSTEM_ROLE_IMMUTABLE` |
| Authz | Caller lacks required permission key | `403` | `FORBIDDEN` |
| Missing | Resource not found or user not a member | `404` | `NOT_FOUND` |

### Pagination Envelopes (Bounded: `size`/`limit` default `25`, min `1`, max `100`)
- **Offset-based (`PageResponse<T>`):** used by Workspaces, Projects, Members, Roles, Invitations.
```json
{
  "items": [],
  "page": 0,
  "size": 25,
  "totalElements": 1,
  "totalPages": 1,
  "hasMore": false
}
```
- **Cursor-based (`CursorPageResponse<T>`):** used by Chat message history.
```json
{
  "items": [],
  "nextCursor": "opaque-cursor-or-null",
  "hasMore": false,
  "limit": 25
}
```

---

## 2. REST API Contract

### 2.1 Workspaces (`/api/v1/workspaces`) — Owned by `be-workspace`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces?includeDeleted=false&page=0&size=25` | Authenticated | List workspaces where user is a member (`includeDeleted=true` includes soft-deleted workspaces owned by caller). |
| `POST` | `/api/v1/workspaces` | Authenticated | Create workspace (wizard submit). Seeds Owner/Admin/Member roles, assigns creator as Owner, enables `moduleKeys` (min 1, BR-03), optionally creates initial email invites and default chat channel if `chat` is enabled. Returns `201`. |
| `GET` | `/api/v1/workspaces/{workspaceId}` | `workspace.view` | Get active workspace details including caller's effective permission keys. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}` | `workspace.edit` | Update `name`, `description`, `avatarUrl`. |
| `DELETE` | `/api/v1/workspaces/{workspaceId}` | `workspace.delete` | Soft-delete workspace. Request body: `{ "confirmName": "..." }` (BR-08). Sets `deletedAt = now`, `purgeAfter = now + 30d`. Returns `200` with updated `WorkspaceDto`. |
| `POST` | `/api/v1/workspaces/{workspaceId}/restore` | Owner only | Restore soft-deleted workspace if `now < purgeAfter`. Returns `200` with `WorkspaceDto`. |
| `POST` | `/api/v1/workspaces/{workspaceId}/transfer-ownership` | `workspace.transfer_owner` | Transfer Owner role to target workspace member (`{ "targetUserId": "uuid" }`). Demotes previous owner to `Admin`. Returns `200`. |

**`CreateWorkspaceRequest`:**
```json
{
  "name": "Acme Engineering",
  "description": "Core platform team",
  "avatarUrl": "https://...",
  "moduleKeys": ["git", "docs", "chat"],
  "inviteEmails": ["alice@example.com"]
}
```
**`WorkspaceDto`:**
```json
{
  "id": "uuid",
  "name": "Acme Engineering",
  "slug": "acme-engineering",
  "description": "Core platform team",
  "avatarUrl": null,
  "ownerId": "uuid",
  "memberCount": 4,
  "projectCount": 2,
  "enabledModules": ["git", "docs", "chat"],
  "myPermissions": ["workspace.view", "workspace.edit"],
  "createdAt": "2026-11-20T00:00:00Z",
  "updatedAt": "2026-11-20T00:00:00Z",
  "deletedAt": null,
  "purgeAfter": null
}
```

### 2.2 Projects (`/api/v1/workspaces/{workspaceId}/projects` & `/api/v1/projects`) — Owned by `be-workspace`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspaceId}/projects?page=0&size=25` | `workspace.view` | List projects in workspace visible to caller (all projects if caller has `project.view_all`, else only projects where caller is a project member). |
| `GET` | `/api/v1/projects/mine?page=0&size=50` | Authenticated | List all projects across all active workspaces visible to caller (for Profile grouped-by-workspace view, O-08). |
| `POST` | `/api/v1/workspaces/{workspaceId}/projects` | `project.create` | Create project. Seeds project roles (Owner/Admin/Member), assigns creator as project Owner, copies all enabled workspace modules (O-11), creates default project chat channel if `chat` is enabled. Returns `201`. |
| `GET` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}` | `project.view` (or `project.view_all`) | Get project details + caller's project permission keys. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}` | `project.edit` | Update `name`, `description`. |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}` | `project.delete` | Soft-delete project. Returns `204`. |

**`CreateProjectRequest`:** `{ "name": "Orbit Core", "description": "Main repo" }`
**`ProjectDto`:**
```json
{
  "id": "uuid",
  "workspaceId": "uuid",
  "workspaceName": "Acme Engineering",
  "name": "Orbit Core",
  "slug": "orbit-core",
  "description": "Main repo",
  "memberCount": 3,
  "enabledModules": ["git", "docs", "chat"],
  "myPermissions": ["project.view", "project.edit"],
  "createdAt": "2026-11-20T00:00:00Z",
  "updatedAt": "2026-11-20T00:00:00Z"
}
```

### 2.3 Modules — Owned by `be-workspace`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/modules` | Authenticated | List module catalog (`git`, `docs`, `sheets`, `chat`). |
| `GET` | `/api/v1/workspaces/{workspaceId}/modules` | `workspace.view` | List workspace modules with `enabled` flag and `activeProjectCount`. |
| `PUT` | `/api/v1/workspaces/{workspaceId}/modules/{moduleKey}` | `module.enable` (if `enabled=true`) / `module.disable` (if `enabled=false`) | Toggle module at workspace level (`{ "enabled": true }`). Disabling preserves data (BR-09). |
| `GET` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/modules` | `project.view` (or `project.view_all`) | List project modules with `enabledInWorkspace`, `enabledInProject`, `effectiveEnabled`. |
| `PUT` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/modules/{moduleKey}` | `pmodule.select` | Toggle module on project (`{ "enabled": true }`). Fails with `400 MODULE_NOT_ENABLED_IN_WORKSPACE` if `enabled=true` and disabled on workspace (BR-02). |
| `GET` | `/api/v1/workspaces/{workspaceId}/effective-modules?projectId={optionalUuid}` | `workspace.view` (plus `project.view` if `projectId` set) | Returns `{ "scope": "WORKSPACE"|"PROJECT", "modules": [ModuleCatalogItemDto] }` for Sidebar rendering. |

### 2.4 Custom Roles — Owned by `be-access`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspaceId}/roles` | `role.view` | List workspace roles with permission keys and `memberCount`. |
| `POST` | `/api/v1/workspaces/{workspaceId}/roles` | `role.create` | Create custom workspace role `{ "name": "QA", "permissions": ["workspace.view", ...] }`. Returns `201`. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}/roles/{roleId}` | `role.edit` | Update name/permissions. Fails `403 SYSTEM_ROLE_IMMUTABLE` on `Owner`. |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/roles/{roleId}` | `role.delete` | Delete role. Fails `403 SYSTEM_ROLE_IMMUTABLE` on system `Owner`; fails `409 ROLE_IN_USE` if `memberCount > 0` (BR-11). |
| `GET` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/roles` | `project.view` (or `project.view_all`) | List project roles. |
| `POST` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/roles` | `prole.create` | Create custom project role. Returns `201`. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/roles/{roleId}` | `prole.edit` | Update project role (`403 SYSTEM_ROLE_IMMUTABLE` on `Owner`). |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/roles/{roleId}` | `prole.delete` | Delete project role (`409 ROLE_IN_USE` if assigned, BR-11). |

**`RoleDto`:** `{ "id": "uuid", "scope": "WORKSPACE"|"PROJECT", "name": "Admin", "system": true, "immutable": false, "permissions": ["..."], "memberCount": 2, "createdAt": "..." }`

### 2.5 Members — Owned by `be-access`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspaceId}/members?page=0&size=25` | `member.view` | Paginated workspace members. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}/members/{userId}/role` | `member.assign_role` | Assign role `{ "roleId": "uuid" }`. Cannot reassign Owner (BR-07 -> `409 OWNER_TRANSFER_REQUIRED`) or assign Owner role directly (use transfer-ownership). |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/members/{userId}` | `member.remove` (or self-leave) | Remove member or leave workspace. Owner cannot leave without transfer (BR-07 -> `409 OWNER_TRANSFER_REQUIRED`). Returns `204`. |
| `GET` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members?page=0&size=25` | `project.view` (or `project.view_all`) | Paginated project members. |
| `POST` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members` | `pmember.invite` | Add existing workspace member to project `{ "userId": "uuid", "roleId": "uuid" }`. Returns `201`. |
| `PATCH` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members/{userId}/role` | `pmember.assign_role` | Change project member role. |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members/{userId}` | `pmember.remove` (or self-leave) | Remove project member. Returns `204`. |

**`MemberDto`:** `{ "userId": "uuid", "username": "alice", "displayName": "Alice", "email": "alice@example.com", "roleId": "uuid", "roleName": "Admin", "isOwner": false, "joinedAt": "..." }`

### 2.6 Invitations & Pending Invite Flow — Owned by `be-access`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspaceId}/invitations?page=0&size=25` | `member.invite` | List workspace email invites and active/revoked invite links. |
| `POST` | `/api/v1/workspaces/{workspaceId}/invitations/email` | `member.invite` | Create email invite `{ "email": "...", "roleId": "optional-uuid", "projectId": "optional-uuid" }` (defaults to `Member` role, 7d expiry). Returns `201`. |
| `POST` | `/api/v1/workspaces/{workspaceId}/invitations/link` | `member.invite` | Create reusable invite link `{ "roleId": "optional-uuid", "projectId": "optional-uuid" }` (defaults to `Member`, 7d expiry, unlimited uses until revoked, BR-10). Returns `201`. |
| `DELETE` | `/api/v1/workspaces/{workspaceId}/invitations/{invitationId}` | `member.invite` | Revoke invitation (`status = REVOKED`). Returns `204`. |
| `GET` | `/api/v1/invitations/{token}` | **Public** | Preview invite metadata (`workspaceName`, `projectName`, `roleName`, `type`, `status`, `expiresAt`, `invitedEmail`). |
| `POST` | `/api/v1/invitations/{token}/accept` | Authenticated | Accept invite and join workspace (and optional project). Returns `AcceptInvitationResponse { workspaceId, projectId, roleName, alreadyMember }`. |
| `POST` | `/api/v1/invitations/{token}/decline` | Authenticated | Decline email invitation (`status = DECLINED`). Returns `204`. |

**Pending Invite Token Flow (O-09):**
1. Invitee opens `/invite/{token}` in browser. Frontend calls public `GET /api/v1/invitations/{token}` to show invite preview.
2. If unauthenticated, frontend saves `token` in `sessionStorage` (`orbit_pending_invite_token`) and navigates to Register (or Login / OAuth).
3. Immediately after successful `register()`, `login()`, or `exchangeOAuthCode()`, `fe-shell` checks `orbit_pending_invite_token`, calls `POST /api/v1/invitations/{token}/accept`, clears storage, selects the joined `workspaceId`, and opens the workspace.

### 2.7 Chat REST & WebSocket (STOMP) — Owned by `be-chat`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspaceId}/chat/channels` | `chat.read` | List workspace channels (auto-creates `#general` if workspace has `chat` module enabled and none exists). |
| `GET` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/chat/channels` | `pchat.read` | List project channels (auto-creates `#general` if project has effective `chat` module enabled). |
| `GET` | `/api/v1/chat/channels/{channelId}/messages?cursor=&limit=25` | `chat.read` / `pchat.read` | Cursor-paginated message history (newest-first or chronological page with `nextCursor`, `hasMore`, `limit`). |
| `POST` | `/api/v1/chat/channels/{channelId}/messages` | `chat.write` / `pchat.write` | Send message over REST (also broadcasts to STOMP topic). Body: `{ "content": "Hello" }`. Returns `201`. |

**STOMP / WebSocket Contract:**
- **Endpoint:** `/ws` (native WebSocket + SockJS fallback disabled or optional; support standard WebSocket at `ws://host/ws` with JWT in STOMP `CONNECT` header `Authorization: Bearer <token>` and optional `?token=<jwt>` query param for browser compatibility).
- **App Prefix:** `/app`; **Broker Prefix:** `/topic`.
- **Subscribe:** `/topic/chat.{channelId}` (receives `ChatMessageDto` JSON).
- **Send:** `/app/chat.{channelId}.send` with payload `{ "content": "Hello" }`.
- **Validation:** Channel interceptor authenticates JWT on `CONNECT`, checks `chat.read`/`pchat.read` on `SUBSCRIBE`, and `chat.write`/`pchat.write` on `SEND`.
- **Redis:** Publish channel messages via Redis Pub/Sub (`orbit:chat:messages`) or relay so multi-instance nodes fan out to local STOMP sessions.

**`ChatChannelDto`:** `{ "id": "uuid", "scopeType": "WORKSPACE"|"PROJECT", "scopeId": "uuid", "name": "general", "description": "Default channel", "createdAt": "..." }`
**`ChatMessageDto`:** `{ "id": "uuid", "channelId": "uuid", "senderId": "uuid", "senderName": "Alice", "senderUsername": "alice", "content": "Hello", "createdAt": "..." }`

---

## 3. Backend Implementation Plan & Ownership

### Package Layout (`backend/src/main/java/com/orbit/`)
- `com.orbit.workspace` (owned by `be-workspace`): entities, repositories, DTOs, services, controllers for Workspaces & Modules, scheduled 30-day purge job, plus `com.orbit.workspace.permission.WorkspacePermissionEvaluator` (shared `@Component` used by `be-workspace`, `be-access`, `be-chat`).
- `com.orbit.project` (owned by `be-workspace`): entities, repositories, DTOs, services, controllers for Projects and Project Modules.
- `com.orbit.access` (owned by `be-access`): entities, repositories, DTOs, services, controllers for Custom Roles (Workspace & Project), Members (Workspace & Project), and Invitations.
- `com.orbit.chat` (owned by `be-chat`): entities, repositories, DTOs, services, REST controller, WebSocket STOMP config & channel interceptor, Redis Pub/Sub broadcaster.

### Shared Permission Evaluator Contract (`com.orbit.workspace.permission.WorkspacePermissionEvaluator`)
`be-workspace` implements and exposes:
- `void requireWorkspacePermission(UUID userId, UUID workspaceId, String permissionKey)`
- `boolean hasWorkspacePermission(UUID userId, UUID workspaceId, String permissionKey)`
- `Set<String> getWorkspacePermissions(UUID userId, UUID workspaceId)`
- `void requireProjectPermission(UUID userId, UUID workspaceId, UUID projectId, String permissionKey)`
- `boolean hasProjectPermission(UUID userId, UUID workspaceId, UUID projectId, String permissionKey)`
- `Set<String> getProjectPermissions(UUID userId, UUID workspaceId, UUID projectId)`
- `void requireWorkspaceOwner(UUID userId, UUID workspaceId)`

### Flyway Migration Ownership (`backend/src/main/resources/db/migration/`)
- **`V2__workspace_core.sql`** — owned by `be-workspace`:
  - `workspaces (id, name, slug, description, avatar_url, owner_id, created_at, updated_at, deleted_at, purge_after)`
  - `workspace_roles (id, workspace_id, name, is_system, is_immutable, created_at)`
  - `workspace_members (workspace_id, user_id, role_id, joined_at)`
  - `projects (id, workspace_id, name, slug, description, created_at, updated_at, deleted_at)`
  - `project_roles (id, project_id, name, is_system, is_immutable, created_at)`
  - `project_members (project_id, user_id, role_id, joined_at)`
  - `role_permissions (id, role_id, role_scope, permission_key)` (`role_scope IN ('WORKSPACE','PROJECT')`)
  - `modules (module_key, name, description, scope)` seeded with `('git','Git','Source repositories and pull requests','BOTH')`, `('docs','Docs','Collaborative documents','BOTH')`, `('sheets','Sheets','Structured spreadsheets','BOTH')`, `('chat','Chat','Real-time workspace and project messaging','BOTH')`
  - `workspace_modules (workspace_id, module_key, enabled, updated_at)`
  - `project_modules (project_id, module_key, enabled, updated_at)`
- **`V3__invitations.sql`** — owned by `be-access`:
  - `invitations (id, workspace_id, project_id, type, email, token, role_id, invited_by, status, expires_at, created_at, updated_at)`
- **`V4__chat.sql`** — owned by `be-chat`:
  - `chat_channels (id, scope_type, scope_id, name, description, created_at)` with unique `(scope_type, scope_id, name)`
  - `chat_messages (id, channel_id, sender_id, content, created_at)` with index `(channel_id, created_at DESC, id DESC)`

### Shared Infrastructure Files Ownership
- **`backend/pom.xml`** and **`backend/src/main/java/com/orbit/config/SecurityConfig.java`** — owned exclusively by `be-chat`:
  - Add `spring-boot-starter-websocket` to `pom.xml`.
  - Permit `/ws/**` and `GET /api/v1/invitations/*` in `SecurityConfig.java` (so `be-access`'s public invite preview works without merge conflicts).

---

## 4. Frontend Implementation Plan & Ownership

### Shared Contracts (Already Committed in Phase A)
- Types: `frontend/src/types/workspace.types.ts` (re-exporting `workspace-access.types.ts` and `workspace-collab.types.ts`).
- Service interfaces: `frontend/src/services/workspace/workspace.service.ts`.

### Strict Directory & File Ownership
1. **`fe-shell`** (ONLY worker allowed to edit `frontend/src/App.tsx` and routing/shell):
   - `frontend/src/App.tsx` (wires `/invite/:token` route, pending invite token auto-accept after auth, and global Mails route/view)
   - `frontend/src/modules/dashboard/**` (DashboardShell, DashboardSidebar with Workspace switcher & dynamic effective modules, DashboardHeader with Mails button, removing Mails from Project UI)
   - `frontend/src/modules/workspace/CreateWorkspaceWizard*.tsx` and `CreateProjectModal.tsx`
   - `frontend/src/store/workspaceStore.ts` (active workspace/project state + `localStorage` last-selected memory)
   - `frontend/src/services/workspace/httpClient.ts` (shared authenticated fetch helper)
   - `frontend/src/services/workspace/httpWorkspace.service.ts` (HTTP implementations of `WorkspaceService`, `ProjectService`, `ModuleService`)
2. **`fe-settings`** (DO NOT edit `App.tsx` or `modules/dashboard/**`; export components for `fe-shell` to wire):
   - `frontend/src/modules/profile/**` (Profile workspace list + projects grouped by workspace + Settings entry)
   - `frontend/src/modules/settings/**` (WorkspaceSettingsPage tabs: General, Members, Roles permission matrix, Invites email/link, Modules, Integrations slot, Danger Zone delete-by-name & restore banner; ProjectSettingsPage tabs; permission-gating helper `usePermissions.ts`)
   - `frontend/src/modules/invite/**` (`InviteAcceptPage.tsx` for `/invite/:token`)
   - `frontend/src/services/workspace/httpAccess.service.ts` (HTTP implementations of `RoleService`, `MemberService`, `InvitationService`)
3. **`fe-collab`** (DO NOT edit `App.tsx` or `modules/dashboard/**`; export components for `fe-shell` to wire):
   - `frontend/src/modules/mail/**` (Global Mails UI: Connect Gmail/Outlook/IMAP, Account management, Inbox, Preview, Compose, Reply/Forward)
   - `frontend/src/mocks/mailAccount.mock.ts` + `frontend/src/services/workspace/mockMail.service.ts` (`MailService` mock implementation)
   - `frontend/src/modules/chat/**` (Workspace & Project Chat UI wired to STOMP + REST `ChatService`)
   - `frontend/src/services/workspace/httpChat.service.ts` (REST + native WebSocket STOMP client implementing `ChatService`)
   - `frontend/src/modules/integrations/**` (`SocialAccountsPanel.tsx` for user-level Google/GitHub linking)
   - `frontend/src/mocks/linkedAccount.mock.ts` + `frontend/src/services/workspace/mockLinkedAccount.service.ts` (`LinkedAccountService` mock implementation)

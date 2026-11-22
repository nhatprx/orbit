# Admin User Management API

Platform administrators manage every account through `/api/v1/admin/users`. The frontend contract lives in
`frontend/src/types/admin.types.ts`; the page is `frontend/src/modules/admin/AdminUsersPage.tsx`.

---

## 1. Authorization

Every endpoint requires a bearer token **and** an active administrator in the database.

- The role claim inside the token is never trusted. The user row is read on each request, so a demoted or
  disabled administrator loses access on the next call even with an unexpired token.
- No token: `401 UNAUTHORIZED`. Signed in but not an active admin: `403 ADMIN_REQUIRED`.

---

## 2. Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/users` | Paginated, filtered list of `AdminUserSummary` |
| GET | `/api/v1/admin/users/stats` | Totals: `total`, `admins`, `disabled`, `newLast7Days` |
| GET | `/api/v1/admin/users/{userId}` | `AdminUserDetail` with linked sign-ins and workspaces |
| PATCH | `/api/v1/admin/users/{userId}/role` | Body `{"role":"user"\|"admin"}`; also signs the user out |
| POST | `/api/v1/admin/users/{userId}/disable` | Optional body `{"reason":"..."}` (max 255 characters) |
| POST | `/api/v1/admin/users/{userId}/enable` | Allows the user to sign in again |
| POST | `/api/v1/admin/users/{userId}/revoke-sessions` | Ends every session; `204 No Content` |

### List query parameters

| Parameter | Rules |
| --- | --- |
| `q` | Case-insensitive substring of username, email, or display name. At most 100 characters. `%`, `_` and `\` match literally. |
| `role` | `user` or `admin` (any case). |
| `status` | `active` or `disabled` (any case). |
| `sort` | `field` or `field,direction`. Fields: `createdAt`, `username`, `email`, `displayName`, `role`. Directions: `asc` (default) or `desc`. Default `createdAt,desc`. Text fields sort case-insensitively; `id` breaks ties. |
| `page` | Zero-based; negative values become 0. |
| `size` | Default 25, clamped to 1..100. |

The response is the shared `PageResponse` envelope (`items`, `page`, `size`, `totalElements`, `totalPages`, `hasMore`).
Workspace counts for a page come from one grouped query, never one query per row.

Responses never contain password hashes, two-factor secrets or backup codes, or the provider-side id of a linked
social account.

---

## 3. Errors

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Unknown role, status, or sort; search text over 100 characters; reason over 255 characters; malformed JSON or id |
| 401 | `UNAUTHORIZED` | Missing or revoked session |
| 403 | `ADMIN_REQUIRED` | Caller is not an active administrator |
| 403 | `ACCOUNT_DISABLED` | Returned by sign-in (password, OAuth exchange, two-factor step) for a disabled account |
| 404 | `USER_NOT_FOUND` | Unknown target user |
| 409 | `SELF_ACTION_NOT_ALLOWED` | Role change, disable, or session revocation aimed at the caller's own account |
| 409 | `LAST_ADMIN` | Demoting or disabling would leave no other active administrator |

---

## 4. Invariants and side effects

- **Self protection.** An administrator never changes their own role, disables themselves, or revokes their own
  sessions through this API.
- **Last administrator.** Removing an administrator (demote or disable) first row-locks all active administrators in
  a stable order, then requires another active one. Two administrators demoting each other at the same moment cannot
  leave the platform without one.
- **Idempotence.** Repeating the current role, disabling a disabled account, and enabling an active account all
  succeed without changes. Disabling again keeps the original timestamp, actor, and reason.
- **Role changes sign the user out.** The next sign-in carries the new role in its token.
- **Disabling** stores `disabled_at`, `disabled_by`, and `disabled_reason` on the user (migration `V19`), blocks every
  sign-in path with `403 ACCOUNT_DISABLED`, and ends all sessions. The account and all its data are kept; there is no
  hard delete because workspaces, issues, and files reference users.
- **Audit.** Each change logs `Admin action: actor=... action=... target=...` at INFO level.

### How sessions are revoked

A session value in Redis is `userId|createdAtMillis`. Revoking stores `orbit:auth:valid_after:{userId}`; any session
created at or before that instant is rejected, a later login is not. Sessions that existed before this mechanism
(value holds only the user id) count as created at time zero, so the first revocation ends them too.

Limits worth knowing:

- A WebSocket connection that is already open keeps running until it reconnects; new connections are refused.
- While Redis is unavailable the marker lives in memory of the instance that handled the admin action only.

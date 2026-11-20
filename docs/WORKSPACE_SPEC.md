# Orbit — Workspace Restructure Specification

> **Purpose:** Authoritative English specification for restructuring Orbit from a single-level Project manager into a multi-Workspace collaboration platform.
> **Version:** 1.0 (All open questions O-01 through O-13 resolved; business rules BR-01 through BR-14 accepted.)

---

## 1. Context & Objectives

### Previous State
- Orbit managed standalone **Projects** with modules (Git, Docs, Sheets, Mails) embedded inside each Project.

### Target Architecture
1. Users create and manage multiple **Workspaces**; each Workspace contains multiple **Projects**.
2. **Modules** (`git`, `docs`, `sheets`, `chat`) are enabled at the **Workspace** level and selected per **Project** from the Workspace's enabled set. Enabled modules render dynamically in the Sidebar.
3. **Mails** is a global, user-level bridge module accessible from the **Header Bar** (connecting Gmail, Outlook, or IMAP accounts). Orbit does not operate an email server.
4. Users manage their Workspaces, Projects, members, custom roles, modules, and linked social accounts from **Profile** and dedicated Settings views.

### Scope of Current Implementation Round
- **Real Backend + Frontend (Phases 1-3):**
  - Workspace core: CRUD, Sidebar switcher with last-selected persistence, 30-day soft-delete and restore, scheduled permanent purge job.
  - Project core: CRUD scoped to a Workspace, default module inheritance on creation.
  - Two-level Custom Roles & Permissions: Workspace roles and Project roles with seeded system roles (`Owner`, `Admin`, `Member`), permission-key enforcement at every API endpoint.
  - Members & Invitations: Workspace and Project member management, email invitations, reusable invite links (7-day expiry, revocable, default role Member), pending invite token flow through registration/login/OAuth.
  - Two-level Module Management + Dynamic Sidebar rendering.
  - Basic real-time Chat module at both Workspace and Project scopes (1 default channel per scope, schema supports multiple channels later, STOMP over WebSocket + REST history, Redis-backed where applicable).
- **UI on Typed Mock Services (No Backend This Round):**
  - **Mails (Global):** Header entry, Gmail/Outlook/IMAP connect flows, Inbox, Preview, Compose, Reply/Forward, disconnect — backed by a typed mock `MailService`.
  - **Social Linking (User-level):** Connect/list/disconnect Google and GitHub accounts — backed by a typed mock `LinkedAccountService`.

---

## 2. Finalized Decisions

| ID | Topic | Decision |
|---|---|---|
| D-01 | Workspace / Project hierarchy | A Workspace contains many Projects; each Project belongs to exactly 1 Workspace. |
| D-02 | Module management levels | Managed at both Workspace and Project levels. |
| D-03 | Project module constraint | A Project may only enable modules currently enabled on its parent Workspace. |
| D-04 | Workspace creation wizard | Only Workspace name and module selection (min 1) are mandatory; integrations and invites are optional with Skip. |
| D-05 / O-01 | Social linking | User-level social account linking for login/identity (`google`, `github`). UI mocked this round. |
| D-06 / D-07 / D-08 / D-09 | Global Mails | Global user-level module in Header Bar (Gmail, Outlook, IMAP); partial metadata cache only; removed from Project UI. UI mocked this round. |
| D-10 / O-08 | Profile navigation | Profile lists all Workspaces the user belongs to, and lists Projects from every Workspace grouped by Workspace. |
| D-11 / O-02 | Soft delete & restore | Soft-deleted Workspaces remain restorable for **30 days**, after which a scheduled purge job permanently deletes them. |
| D-12 / D-13 | Custom roles | Custom roles are defined independently at Workspace level and Project level. Backend checks permission keys, never role names. |
| D-14 / O-09 | Invitations | Email invites and invite links. Links expire after **7 days**, allow unlimited uses until revoked, and default to the `Member` role. Invitees without an account are directed to Register and auto-join after signing up (token preserved across registration/login). |
| D-15 / O-12 | Chat module | Enabled/disabled like any other module at both Workspace and Project levels. One default channel per scope initially; schema supports multiple channels per scope. Real-time via WebSocket (STOMP). |
| D-16 | Quotas | No hard-coded limits on Workspace/Project/member counts in the database schema. |
| O-04 | Workspace-to-Project access | Workspace permission `project.view_all` grants access to every Project in the Workspace (`Owner` and `Admin` system roles have it). All other users must be explicitly added to a Project. |
| O-10 | Ownership invariant | Every Workspace always has **exactly 1 Owner**. The Owner must transfer ownership before leaving. The `Owner` system role cannot be edited or deleted. |
| O-11 | New Project modules | A newly created Project copies all modules currently enabled on its parent Workspace; users can disable them afterward. |
| O-13 | Moving Projects | Moving a Project between Workspaces is out of scope. |

---

## 3. High-Level Navigation Structure

```text
ORBIT PLATFORM
├── Header Bar
│   └── [Mails] (Global user-level module)
├── Profile
│   ├── My Workspaces -> Workspace Settings (General, Members, Roles, Invites, Modules, Integrations, Danger Zone)
│   ├── My Projects (grouped by Workspace) -> Project Settings (General, Members, Roles, Modules, Danger Zone)
│   └── Connected Accounts (Social linking: Google, GitHub)
└── Active Workspace (selected via Sidebar dropdown)
    ├── Workspace Modules (Git, Docs, Sheets, Chat — only enabled modules shown)
    └── Projects
        └── Active Project
            └── Project Modules (subset of Workspace enabled modules)
```

---

## 4. Functional Requirements

### FR-01 — Workspace Management
- **WS-01 Create Workspace:** Multi-step wizard from Sidebar dropdown:
  1. Workspace Information: name (required), description, avatar URL.
  2. Select Modules (required, minimum 1 module).
  3. Connect Integrations (optional, Skip button).
  4. Invite Teammates (optional, Skip button; email or invite link).
  5. Initialize: creates Workspace, assigns creator as `Owner`, seeds default roles, enables selected modules, creates default Chat channel if `chat` is enabled.
  - Exiting mid-wizard leaves no partial Workspace on the server (creation occurs on final submit).
- **WS-02 Switch Workspace:** Dropdown in Sidebar; persists last-selected Workspace per user in client storage.
- **WS-03 Edit Workspace:** Update name, description, avatar URL.
- **WS-04 Soft Delete Workspace:** Owner-only, requires typing exact Workspace name to confirm; sets `deleted_at` and `purge_after = deleted_at + 30 days`.
- **WS-05 Restore Workspace:** Restorable by Owner within 30 days; clears `deleted_at` and restores visibility of Projects/members/data.
- **WS-06 Scheduled Purge:** Background scheduled job permanently removes Workspaces where `deleted_at IS NOT NULL AND purge_after <= NOW()`.
- **WS-07 List Workspaces:** Active and soft-deleted (restorable) Workspaces shown in Profile.

### FR-02 — Module Management (Two-Level)
- **MOD-01 Workspace Modules:** Enable/disable `git`, `docs`, `sheets`, `chat` at Workspace level.
- **MOD-02 Project Modules:** Select modules for a Project from the Workspace's enabled modules. On Project creation, all Workspace-enabled modules are enabled by default.
- **MOD-03 Effective Modules & Sidebar Rendering:** Sidebar queries effective modules for the active Workspace or active Project.
- **MOD-04 Cascade Rule (BR-09):** Disabling a module at Workspace level immediately hides it from effective modules of all Projects in that Workspace without deleting underlying module data. Re-enabling restores visibility.
- **MOD-05 Disable Warning:** UI warns when disabling a module used by one or more Projects.

### FR-03 — Global Mails Module (UI + Mock Service)
- Accessible from Header Bar; removed from Project navigation and settings.
- Supports connecting Gmail (OAuth), Outlook (OAuth), and IMAP (host/port/username/password).
- Supports account list/disconnect (disconnect clears local mock cache and credentials), Inbox, Preview, Compose, Reply, Forward.

### FR-04 — Settings (Workspace & Project)
- **Workspace Settings Tabs:** General, Members, Roles (permission matrix), Invites (email + invite links), Modules, Integrations, Danger Zone (transfer ownership, soft delete with name confirmation, restore banner when deleted).
- **Project Settings Tabs:** General, Members, Roles (project-scoped permission matrix), Modules (filtered by Workspace enabled modules), Danger Zone (delete Project).

### FR-05 — Chat Module & Social Linking
- **Chat:** Real-time messaging per scope (`WORKSPACE` or `PROJECT`) over WebSocket STOMP + REST paginated history, gated by module enablement and `chat.read`/`chat.write` or `pchat.read`/`pchat.write`.
- **Social Linking:** User-level Google/GitHub connection list, connect, and disconnect in Profile / Workspace Integrations tab (mock service this round).

---

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Every Project belongs to exactly 1 Workspace. |
| BR-02 | A Project can only enable modules currently enabled on its parent Workspace. |
| BR-03 | Creating a Workspace requires at least 1 selected module; integrations and invites are optional. |
| BR-04 | Deleting a Workspace is a soft delete with a 30-day restore window before scheduled permanent purge. |
| BR-05 | Mails belong to the User and are unaffected by Workspace/Project deletion. |
| BR-06 | Workspace custom roles and Project custom roles are completely independent. |
| BR-07 | Every Workspace has exactly 1 Owner; the Owner must transfer ownership before leaving or being reassigned. |
| BR-08 | Only the Owner can delete a Workspace, confirmed by re-entering the exact Workspace name. |
| BR-09 | Disabling a module on a Workspace hides it in all Projects while preserving stored data. |
| BR-10 | Invite links expire after 7 days, support unlimited uses until revoked, and default to `Member`. |
| BR-11 | A role currently assigned to one or more members cannot be deleted until those members are reassigned. System role `Owner` cannot be edited or deleted. |
| BR-12 | Disconnecting a mail account deletes its stored credentials and cached headers. |
| BR-13 | Database schema imposes no hard-coded limits on counts of Workspaces, Projects, or members. |
| BR-14 | Soft-deleting a Workspace hides all child Projects, members, and data; restoring restores them atomically. |

---

## 6. Permission Model

Authorization is evaluated strictly by **permission key**, never by role name.

### Workspace Permission Keys
- **Workspace:** `workspace.view`, `workspace.edit`, `workspace.delete`, `workspace.transfer_owner`
- **Members:** `member.view`, `member.invite`, `member.remove`, `member.assign_role`
- **Roles:** `role.view`, `role.create`, `role.edit`, `role.delete`
- **Modules:** `module.enable`, `module.disable`
- **Integrations:** `integration.manage`
- **Projects:** `project.create`, `project.view_all`
- **Chat:** `chat.read`, `chat.write`, `chat.manage`

### Workspace System Roles (Seeded per Workspace)
- **Owner** (`is_system = true`, immutable): All 19 Workspace permission keys.
- **Admin** (`is_system = true`): All Workspace permission keys except `workspace.delete` and `workspace.transfer_owner`.
- **Member** (`is_system = true`): `workspace.view`, `member.view`, `role.view`, `project.create`, `chat.read`, `chat.write`.

### Project Permission Keys
- **Project:** `project.view`, `project.edit`, `project.delete`
- **Members:** `pmember.invite`, `pmember.remove`, `pmember.assign_role`
- **Roles:** `prole.create`, `prole.edit`, `prole.delete`
- **Modules:** `pmodule.select`
- **Chat:** `pchat.read`, `pchat.write`, `pchat.manage`

### Project System Roles (Seeded per Project)
- **Owner** (`is_system = true`, immutable): All 13 Project permission keys.
- **Admin** (`is_system = true`): All Project permission keys except `project.delete`.
- **Member** (`is_system = true`): `project.view`, `pchat.read`, `pchat.write`.

### Workspace-to-Project Access Rule (O-04)
- A Workspace member whose Workspace role includes `project.view_all` has read access (`project.view`, `pchat.read`) to every Project in that Workspace even without an explicit `project_members` row.
- Explicit Project mutations (`project.edit`, `project.delete`, `pmember.*`, `prole.*`, `pmodule.select`, `pchat.write`, `pchat.manage`) require the corresponding Project permission, OR Workspace `workspace.edit` for Workspace Owners/Admins acting as fallback administrators (Workspace Owner always passes Project admin checks for their Workspace's Projects).

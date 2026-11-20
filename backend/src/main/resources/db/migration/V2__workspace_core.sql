CREATE TABLE modules (
    module_key VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'BOTH',
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_modules_scope CHECK (scope IN ('WORKSPACE', 'PROJECT', 'BOTH'))
);

INSERT INTO modules (module_key, name, description, scope, sort_order) VALUES
    ('git', 'Git', 'Source repositories and pull requests', 'BOTH', 1),
    ('docs', 'Docs', 'Collaborative documents', 'BOTH', 2),
    ('sheets', 'Sheets', 'Structured spreadsheets', 'BOTH', 3),
    ('chat', 'Chat', 'Real-time workspace and project messaging', 'BOTH', 4);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    avatar_url VARCHAR(500),
    owner_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    purge_after TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_workspaces_slug ON workspaces (LOWER(slug));
CREATE INDEX idx_workspaces_owner ON workspaces (owner_id);
CREATE INDEX idx_workspaces_purge_after ON workspaces (purge_after) WHERE deleted_at IS NOT NULL;

CREATE TABLE workspace_roles (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_workspace_roles_name ON workspace_roles (workspace_id, LOWER(name));

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES workspace_roles (id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members (role_id);

CREATE TABLE projects (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_projects_workspace_slug ON projects (workspace_id, LOWER(slug));
CREATE INDEX idx_projects_workspace_active ON projects (workspace_id) WHERE deleted_at IS NULL;

CREATE TABLE project_roles (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_project_roles_name ON project_roles (project_id, LOWER(name));

CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES project_roles (id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members (user_id);
CREATE INDEX idx_project_members_role ON project_members (role_id);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL,
    role_scope VARCHAR(16) NOT NULL,
    permission_key VARCHAR(64) NOT NULL,
    CONSTRAINT ck_role_permissions_scope CHECK (role_scope IN ('WORKSPACE', 'PROJECT')),
    CONSTRAINT uq_role_permissions UNIQUE (role_id, role_scope, permission_key)
);

CREATE TABLE workspace_modules (
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    module_key VARCHAR(32) NOT NULL REFERENCES modules (module_key),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, module_key)
);

CREATE TABLE project_modules (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    module_key VARCHAR(32) NOT NULL REFERENCES modules (module_key),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, module_key)
);

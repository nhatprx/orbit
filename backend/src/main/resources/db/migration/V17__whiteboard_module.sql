INSERT INTO modules (module_key, name, description, scope, sort_order)
VALUES ('whiteboard', 'Whiteboard', 'Collaborative infinite canvas and diagramming boards', 'BOTH', 8)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), wr.id, 'WORKSPACE', p.permission_key
FROM workspace_roles wr
CROSS JOIN (
    VALUES ('whiteboard.read'), ('whiteboard.write'), ('whiteboard.delete'), ('whiteboard.manage')
) AS p(permission_key)
WHERE wr.is_system = TRUE
  AND (
      LOWER(wr.name) IN ('owner', 'admin')
      OR (LOWER(wr.name) = 'member' AND p.permission_key IN ('whiteboard.read', 'whiteboard.write'))
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), pr.id, 'PROJECT', p.permission_key
FROM project_roles pr
CROSS JOIN (
    VALUES ('pwhiteboard.read'), ('pwhiteboard.write'), ('pwhiteboard.delete'), ('pwhiteboard.manage')
) AS p(permission_key)
WHERE pr.is_system = TRUE
  AND (
      LOWER(pr.name) IN ('owner', 'admin')
      OR (LOWER(pr.name) = 'member' AND p.permission_key IN ('pwhiteboard.read', 'pwhiteboard.write'))
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

CREATE TABLE whiteboards (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    scene_json JSONB NOT NULL DEFAULT '{"type":"excalidraw","version":2,"elements":[],"appState":{}}'::jsonb,
    element_count INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_whiteboards_element_count CHECK (element_count >= 0),
    CONSTRAINT ck_whiteboards_version CHECK (version >= 1)
);

CREATE INDEX idx_whiteboards_scope_updated
    ON whiteboards (workspace_id, project_id, updated_at DESC);

CREATE INDEX idx_whiteboards_workspace_title
    ON whiteboards (workspace_id, LOWER(title));

CREATE TABLE whiteboard_assets (
    id UUID PRIMARY KEY,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards (id) ON DELETE CASCADE,
    file_id VARCHAR(128) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    data_url TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_whiteboard_assets_byte_size CHECK (byte_size >= 0),
    CONSTRAINT uq_whiteboard_assets_board_file UNIQUE (whiteboard_id, file_id)
);

CREATE INDEX idx_whiteboard_assets_board_created
    ON whiteboard_assets (whiteboard_id, created_at ASC);

INSERT INTO modules (module_key, name, description, scope, sort_order)
VALUES ('cloud', 'Cloud Files', 'Structured cloud file storage and sharing', 'BOTH', 5)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), wr.id, 'WORKSPACE', p.permission_key
FROM workspace_roles wr
CROSS JOIN (
    VALUES ('files.read'), ('files.write'), ('files.delete'), ('files.manage')
) AS p(permission_key)
WHERE wr.is_system = TRUE
  AND (
      LOWER(wr.name) IN ('owner', 'admin')
      OR (LOWER(wr.name) = 'member' AND p.permission_key <> 'files.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), pr.id, 'PROJECT', p.permission_key
FROM project_roles pr
CROSS JOIN (
    VALUES ('pfiles.read'), ('pfiles.write'), ('pfiles.delete'), ('pfiles.manage')
) AS p(permission_key)
WHERE pr.is_system = TRUE
  AND (
      LOWER(pr.name) IN ('owner', 'admin')
      OR (LOWER(pr.name) = 'member' AND p.permission_key <> 'pfiles.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

CREATE TABLE cloud_nodes (
    id UUID PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    workspace_id UUID REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    parent_id UUID REFERENCES cloud_nodes (id) ON DELETE CASCADE,
    node_type VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_key VARCHAR(512),
    etag VARCHAR(128),
    checksum_sha256 VARCHAR(128),
    upload_status VARCHAR(16) NOT NULL DEFAULT 'READY',
    starred BOOLEAN NOT NULL DEFAULT FALSE,
    depth INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users (id),
    updated_by UUID NOT NULL REFERENCES users (id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users (id),
    purge_after TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_cloud_nodes_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_cloud_nodes_type CHECK (node_type IN ('FOLDER', 'FILE')),
    CONSTRAINT ck_cloud_nodes_status CHECK (upload_status IN ('PENDING', 'READY', 'FAILED')),
    CONSTRAINT ck_cloud_nodes_size CHECK (size_bytes >= 0),
    CONSTRAINT ck_cloud_nodes_depth CHECK (depth >= 0 AND depth <= 20)
);

CREATE UNIQUE INDEX uq_cloud_nodes_active_sibling
    ON cloud_nodes (
        scope_type,
        scope_id,
        COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
        name_normalized
    )
    WHERE deleted_at IS NULL AND upload_status <> 'FAILED';

CREATE INDEX idx_cloud_nodes_scope_parent_name
    ON cloud_nodes (scope_type, scope_id, parent_id, node_type, name_normalized, id)
    WHERE deleted_at IS NULL AND upload_status = 'READY';

CREATE INDEX idx_cloud_nodes_scope_parent_updated
    ON cloud_nodes (scope_type, scope_id, parent_id, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL AND upload_status = 'READY';

CREATE INDEX idx_cloud_nodes_scope_parent_size
    ON cloud_nodes (scope_type, scope_id, parent_id, size_bytes DESC, id DESC)
    WHERE deleted_at IS NULL AND upload_status = 'READY';

CREATE INDEX idx_cloud_nodes_scope_starred
    ON cloud_nodes (scope_type, scope_id, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL AND upload_status = 'READY' AND starred = TRUE;

CREATE INDEX idx_cloud_nodes_scope_trash
    ON cloud_nodes (scope_type, scope_id, deleted_at DESC, id DESC)
    WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_cloud_nodes_purge_after
    ON cloud_nodes (purge_after)
    WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_cloud_nodes_name_search
    ON cloud_nodes (scope_type, scope_id, name_normalized varchar_pattern_ops)
    WHERE deleted_at IS NULL AND upload_status = 'READY';

CREATE INDEX idx_cloud_nodes_parent
    ON cloud_nodes (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX idx_cloud_nodes_workspace
    ON cloud_nodes (workspace_id)
    WHERE workspace_id IS NOT NULL;

CREATE INDEX idx_cloud_nodes_project
    ON cloud_nodes (project_id)
    WHERE project_id IS NOT NULL;

CREATE TABLE cloud_upload_sessions (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES cloud_nodes (id) ON DELETE CASCADE,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    strategy VARCHAR(16) NOT NULL,
    s3_upload_id VARCHAR(255),
    expected_size_bytes BIGINT NOT NULL,
    part_size_bytes BIGINT NOT NULL,
    total_parts INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    created_by UUID NOT NULL REFERENCES users (id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_cloud_upload_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_cloud_upload_strategy CHECK (strategy IN ('SINGLE', 'MULTIPART')),
    CONSTRAINT ck_cloud_upload_status CHECK (status IN ('OPEN', 'COMPLETED', 'ABORTED', 'EXPIRED')),
    CONSTRAINT ck_cloud_upload_sizes CHECK (expected_size_bytes >= 0 AND part_size_bytes > 0 AND total_parts >= 1)
);

CREATE INDEX idx_cloud_upload_sessions_open_exp
    ON cloud_upload_sessions (expires_at)
    WHERE status = 'OPEN';

CREATE INDEX idx_cloud_upload_sessions_node
    ON cloud_upload_sessions (node_id);

CREATE TABLE cloud_storage_quotas (
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    used_bytes BIGINT NOT NULL DEFAULT 0,
    quota_bytes BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope_type, scope_id),
    CONSTRAINT ck_cloud_quotas_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_cloud_quotas_values CHECK (used_bytes >= 0 AND quota_bytes > 0)
);

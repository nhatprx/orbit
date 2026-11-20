CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    type VARCHAR(8) NOT NULL,
    email VARCHAR(255),
    token VARCHAR(64) NOT NULL,
    role_id UUID NOT NULL,
    invited_by UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invitations_token UNIQUE (token),
    CONSTRAINT ck_invitations_type CHECK (type IN ('EMAIL', 'LINK')),
    CONSTRAINT ck_invitations_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED')),
    CONSTRAINT ck_invitations_email CHECK (
        (type = 'EMAIL' AND email IS NOT NULL) OR (type = 'LINK' AND email IS NULL)
    )
);

CREATE INDEX idx_invitations_workspace ON invitations (workspace_id, created_at DESC);
CREATE INDEX idx_invitations_email ON invitations (LOWER(email)) WHERE type = 'EMAIL';

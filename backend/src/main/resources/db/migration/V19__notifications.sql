CREATE TABLE app_notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    issue_id UUID,
    issue_key VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_app_notifications_recipient_created
    ON app_notifications (recipient_id, created_at DESC);

CREATE INDEX idx_app_notifications_recipient_unread
    ON app_notifications (recipient_id) WHERE read_at IS NULL;

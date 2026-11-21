INSERT INTO modules (module_key, name, description, scope, sort_order)
VALUES ('issues', 'Issues & Sprints', 'Agile issue tracking, epics, sprints, and lifecycle boards', 'BOTH', 6)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), wr.id, 'WORKSPACE', p.permission_key
FROM workspace_roles wr
CROSS JOIN (
    VALUES ('issues.read'), ('issues.write'), ('issues.delete'), ('issues.manage')
) AS p(permission_key)
WHERE wr.is_system = TRUE
  AND (
      LOWER(wr.name) IN ('owner', 'admin')
      OR (LOWER(wr.name) = 'member' AND p.permission_key <> 'issues.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), pr.id, 'PROJECT', p.permission_key
FROM project_roles pr
CROSS JOIN (
    VALUES ('pissues.read'), ('pissues.write'), ('pissues.delete'), ('pissues.manage')
) AS p(permission_key)
WHERE pr.is_system = TRUE
  AND (
      LOWER(pr.name) IN ('owner', 'admin')
      OR (LOWER(pr.name) = 'member' AND p.permission_key <> 'pissues.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

CREATE TABLE issue_sprints (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    goal VARCHAR(500),
    status VARCHAR(16) NOT NULL DEFAULT 'PLANNED',
    start_date DATE,
    end_date DATE,
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_issue_sprints_status CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED'))
);

CREATE INDEX idx_issue_sprints_project_status
    ON issue_sprints (project_id, status, created_at DESC);

CREATE INDEX idx_issue_sprints_workspace_status
    ON issue_sprints (workspace_id, status);

CREATE TABLE project_issues (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    issue_number INTEGER NOT NULL,
    issue_key VARCHAR(32) NOT NULL,
    type VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    story_points INTEGER,
    sprint_id UUID REFERENCES issue_sprints (id) ON DELETE SET NULL,
    parent_id UUID REFERENCES project_issues (id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users (id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES users (id),
    labels VARCHAR(500),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_project_issues_type CHECK (type IN ('EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK')),
    CONSTRAINT ck_project_issues_status CHECK (status IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')),
    CONSTRAINT ck_project_issues_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ck_project_issues_story_points CHECK (story_points IS NULL OR (story_points >= 0 AND story_points <= 100)),
    CONSTRAINT uq_project_issues_number UNIQUE (project_id, issue_number),
    CONSTRAINT uq_project_issues_key UNIQUE (project_id, issue_key)
);

CREATE INDEX idx_project_issues_project_status
    ON project_issues (project_id, status, updated_at DESC);

CREATE INDEX idx_project_issues_project_sprint
    ON project_issues (project_id, sprint_id);

CREATE INDEX idx_project_issues_project_parent
    ON project_issues (project_id, parent_id);

CREATE INDEX idx_project_issues_workspace_updated
    ON project_issues (workspace_id, updated_at DESC);

CREATE TABLE issue_comments (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES project_issues (id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users (id),
    body VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_issue_created
    ON issue_comments (issue_id, created_at ASC);

CREATE TABLE issue_activities (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES project_issues (id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users (id),
    action VARCHAR(64) NOT NULL,
    field_name VARCHAR(64),
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_activities_issue_created
    ON issue_activities (issue_id, created_at DESC);

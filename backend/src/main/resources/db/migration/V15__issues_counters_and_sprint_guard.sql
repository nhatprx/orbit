CREATE TABLE project_issue_counters (
    project_id UUID PRIMARY KEY REFERENCES projects (id) ON DELETE CASCADE,
    last_issue_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_project_issue_counters_non_negative CHECK (last_issue_number >= 0)
);

INSERT INTO project_issue_counters (project_id, last_issue_number, updated_at)
SELECT p.id, COALESCE(MAX(i.issue_number), 0), NOW()
FROM projects p
LEFT JOIN project_issues i ON i.project_id = p.id
GROUP BY p.id
ON CONFLICT (project_id) DO UPDATE
SET last_issue_number = GREATEST(project_issue_counters.last_issue_number, EXCLUDED.last_issue_number),
    updated_at = NOW();

CREATE UNIQUE INDEX uq_issue_sprints_single_active
    ON issue_sprints (project_id)
    WHERE status = 'ACTIVE';

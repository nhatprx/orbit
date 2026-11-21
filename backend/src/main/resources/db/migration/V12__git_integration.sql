INSERT INTO modules (module_key, name, description, scope, sort_order)
VALUES ('git', 'Git', 'GitHub repository integration, code browser, commit history, and pull requests', 'BOTH', 2)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), wr.id, 'WORKSPACE', p.permission_key
FROM workspace_roles wr
CROSS JOIN (
    VALUES ('git.read'), ('git.write'), ('git.delete'), ('git.manage')
) AS p(permission_key)
WHERE wr.is_system = TRUE
  AND (
      LOWER(wr.name) IN ('owner', 'admin')
      OR (LOWER(wr.name) = 'member' AND p.permission_key <> 'git.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, role_scope, permission_key)
SELECT gen_random_uuid(), pr.id, 'PROJECT', p.permission_key
FROM project_roles pr
CROSS JOIN (
    VALUES ('pgit.read'), ('pgit.write'), ('pgit.delete'), ('pgit.manage')
) AS p(permission_key)
WHERE pr.is_system = TRUE
  AND (
      LOWER(pr.name) IN ('owner', 'admin')
      OR (LOWER(pr.name) = 'member' AND p.permission_key <> 'pgit.manage')
  )
ON CONFLICT (role_id, role_scope, permission_key) DO NOTHING;

CREATE TABLE git_repositories (
    id UUID PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'GITHUB',
    repo_owner VARCHAR(120) NOT NULL,
    repo_name VARCHAR(120) NOT NULL,
    default_branch VARCHAR(120) NOT NULL DEFAULT 'main',
    visibility VARCHAR(16) NOT NULL DEFAULT 'PRIVATE',
    clone_url VARCHAR(500) NOT NULL,
    html_url VARCHAR(500) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    token_hint VARCHAR(32) NOT NULL,
    connected_by UUID NOT NULL REFERENCES users (id),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_git_repos_scope CHECK (scope_type IN ('WORKSPACE', 'PROJECT')),
    CONSTRAINT uq_git_repos_scope UNIQUE (scope_type, scope_id)
);

CREATE INDEX idx_git_repos_workspace
    ON git_repositories (workspace_id);

CREATE INDEX idx_git_repos_project
    ON git_repositories (project_id)
    WHERE project_id IS NOT NULL;

CREATE TABLE git_commit_cache (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES git_repositories (id) ON DELETE CASCADE,
    branch VARCHAR(120) NOT NULL,
    sha VARCHAR(64) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    committed_at TIMESTAMPTZ NOT NULL,
    files_changed INTEGER NOT NULL DEFAULT 0,
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    html_url VARCHAR(500),
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_git_commit_cache UNIQUE (repository_id, branch, sha)
);

CREATE INDEX idx_git_commit_cache_repo_branch
    ON git_commit_cache (repository_id, branch, committed_at DESC);

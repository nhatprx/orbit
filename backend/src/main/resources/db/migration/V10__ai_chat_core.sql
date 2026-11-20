CREATE TABLE ai_provider_config (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    active_provider VARCHAR(24) NOT NULL DEFAULT 'BEDROCK',
    bedrock_region VARCHAR(64) NOT NULL DEFAULT 'us-east-1',
    fast_model VARCHAR(160) NOT NULL,
    pro_model VARCHAR(160) NOT NULL,
    coder_model VARCHAR(160) NOT NULL,
    embed_model VARCHAR(160) NOT NULL,
    web_search_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_config_single_row CHECK (id = 1),
    CONSTRAINT ck_ai_config_provider CHECK (active_provider IN ('BEDROCK', 'OPENROUTER'))
);

CREATE TABLE ai_threads (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scope_type VARCHAR(16) NOT NULL DEFAULT 'USER',
    workspace_id UUID REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    model_tier VARCHAR(32) NOT NULL DEFAULT 'orbit-pro',
    rolling_summary TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_threads_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_ai_threads_model CHECK (model_tier IN ('orbit-fast', 'orbit-pro', 'orbit-coder'))
);

CREATE INDEX idx_ai_threads_user_updated
    ON ai_threads (user_id, updated_at DESC);

CREATE INDEX idx_ai_threads_workspace
    ON ai_threads (workspace_id)
    WHERE workspace_id IS NOT NULL;

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES ai_threads (id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    model_used VARCHAR(160),
    provider_used VARCHAR(24),
    tool_traces_json TEXT,
    citations_json TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_messages_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_ai_messages_thread_created
    ON ai_messages (thread_id, created_at ASC, id ASC);

CREATE TABLE ai_memories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scope_type VARCHAR(16) NOT NULL DEFAULT 'USER',
    workspace_id UUID REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    category VARCHAR(24) NOT NULL DEFAULT 'FACT',
    content TEXT NOT NULL,
    qdrant_point_id VARCHAR(64),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_memories_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_ai_memories_category CHECK (category IN ('FACT', 'DECISION', 'PREFERENCE'))
);

CREATE INDEX idx_ai_memories_user_scope
    ON ai_memories (user_id, scope_type, updated_at DESC);

CREATE INDEX idx_ai_memories_workspace
    ON ai_memories (workspace_id, updated_at DESC)
    WHERE workspace_id IS NOT NULL;

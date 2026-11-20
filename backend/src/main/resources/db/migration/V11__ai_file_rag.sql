CREATE TABLE ai_document_index_status (
    node_id UUID PRIMARY KEY REFERENCES cloud_nodes (id) ON DELETE CASCADE,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    workspace_id UUID,
    project_id UUID,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    chunk_count INTEGER NOT NULL DEFAULT 0,
    error_message VARCHAR(500),
    indexed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_doc_idx_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT')),
    CONSTRAINT ck_ai_doc_idx_status CHECK (status IN ('PENDING', 'INDEXING', 'READY', 'UNSUPPORTED', 'FAILED'))
);

CREATE INDEX idx_ai_doc_idx_scope
    ON ai_document_index_status (scope_type, scope_id, updated_at DESC);

CREATE TABLE ai_document_chunks (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES cloud_nodes (id) ON DELETE CASCADE,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    workspace_id UUID,
    project_id UUID,
    filename VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    content TEXT NOT NULL,
    qdrant_point_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ai_doc_chunks_scope CHECK (scope_type IN ('USER', 'WORKSPACE', 'PROJECT'))
);

CREATE INDEX idx_ai_doc_chunks_node
    ON ai_document_chunks (node_id, chunk_index ASC);

CREATE INDEX idx_ai_doc_chunks_scope
    ON ai_document_chunks (scope_type, scope_id);

CREATE INDEX idx_ai_doc_chunks_fts
    ON ai_document_chunks USING GIN (to_tsvector('simple', content));

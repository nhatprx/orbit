CREATE TABLE chat_channels (
    id UUID PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_id UUID NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_chat_channels_scope CHECK (scope_type IN ('WORKSPACE', 'PROJECT')),
    CONSTRAINT uq_chat_channels_scope_name UNIQUE (scope_type, scope_id, name)
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_channel_created ON chat_messages (channel_id, created_at DESC, id DESC);

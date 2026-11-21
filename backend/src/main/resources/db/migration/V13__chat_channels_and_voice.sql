ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS channel_type VARCHAR(16) NOT NULL DEFAULT 'TEXT',
    ADD COLUMN IF NOT EXISTS category VARCHAR(64) NOT NULL DEFAULT 'TEXT CHANNELS',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE chat_channels
    DROP CONSTRAINT IF EXISTS ck_chat_channels_type;

ALTER TABLE chat_channels
    ADD CONSTRAINT ck_chat_channels_type CHECK (channel_type IN ('TEXT', 'VOICE'));

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reply_to_sender_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS reply_to_snippet VARCHAR(240),
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(1024);

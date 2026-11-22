ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pinned_by UUID;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_pinned
    ON chat_messages (channel_id, pinned_at DESC)
    WHERE pinned = TRUE;

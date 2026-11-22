ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS parent_channel_id UUID REFERENCES chat_channels (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_channels_parent
    ON chat_channels (parent_channel_id) WHERE parent_channel_id IS NOT NULL;

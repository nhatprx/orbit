ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS ck_chat_channels_type;

ALTER TABLE chat_channels
    ADD CONSTRAINT ck_chat_channels_type CHECK (channel_type IN ('TEXT', 'VOICE', 'FORUM'));

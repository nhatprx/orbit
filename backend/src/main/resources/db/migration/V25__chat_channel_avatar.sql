ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);

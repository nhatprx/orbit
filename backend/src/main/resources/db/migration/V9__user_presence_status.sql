ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_status VARCHAR(16) NOT NULL DEFAULT 'ONLINE';

UPDATE users
SET active_status = 'OFFLINE'
WHERE active_status_enabled = FALSE;

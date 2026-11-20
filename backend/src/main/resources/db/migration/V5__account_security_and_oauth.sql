ALTER TABLE oauth_accounts
    ADD COLUMN IF NOT EXISTS provider_display_name VARCHAR(255);

ALTER TABLE oauth_accounts
    ADD CONSTRAINT uq_oauth_user_provider UNIQUE (user_id, provider);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(128),
    ADD COLUMN IF NOT EXISTS totp_pending_secret VARCHAR(128),
    ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT;

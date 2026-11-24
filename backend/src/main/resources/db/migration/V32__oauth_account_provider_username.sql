ALTER TABLE oauth_accounts ADD COLUMN IF NOT EXISTS provider_username VARCHAR(191);

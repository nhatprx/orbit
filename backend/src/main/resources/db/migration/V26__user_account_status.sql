-- Account status for admin user management. A NULL disabled_at means the account is active.
ALTER TABLE users
    ADD COLUMN disabled_at TIMESTAMPTZ,
    ADD COLUMN disabled_reason VARCHAR(255),
    ADD COLUMN disabled_by UUID REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_users_disabled_at ON users (disabled_at) WHERE disabled_at IS NOT NULL;

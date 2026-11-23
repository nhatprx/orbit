ALTER TABLE ai_provider_config
    ADD COLUMN IF NOT EXISTS openrouter_api_key_enc TEXT,
    ADD COLUMN IF NOT EXISTS openrouter_mgmt_key_enc TEXT,
    ADD COLUMN IF NOT EXISTS default_monthly_budget_usd NUMERIC(12, 6) NOT NULL DEFAULT 10.000000;

ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(14, 8) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS generation_id VARCHAR(128);

CREATE TABLE IF NOT EXISTS ai_user_openrouter_keys (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    personal_api_key_enc TEXT,
    provisioned_key_enc TEXT,
    provisioned_key_hash VARCHAR(128),
    monthly_budget_usd NUMERIC(12, 6),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_id UUID REFERENCES ai_threads (id) ON DELETE SET NULL,
    message_id UUID REFERENCES ai_messages (id) ON DELETE SET NULL,
    provider_used VARCHAR(24) NOT NULL,
    model_used VARCHAR(160) NOT NULL,
    generation_id VARCHAR(128),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(14, 8) NOT NULL DEFAULT 0,
    key_source VARCHAR(24) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_user_created
    ON ai_usage_ledger (user_id, created_at DESC);

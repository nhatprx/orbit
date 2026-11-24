ALTER TABLE git_commit_cache
    ADD COLUMN IF NOT EXISTS parent_shas VARCHAR(512);

UPDATE git_commit_cache
SET synced_at = TIMESTAMP '2000-01-01 00:00:00+00'
WHERE parent_shas IS NULL;

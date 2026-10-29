-- Recovery leaves the old proof valid until the replacement key is acknowledged.
CREATE TABLE IF NOT EXISTS sync_recoveries (
  profile_id TEXT PRIMARY KEY REFERENCES sync_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  old_hash TEXT NOT NULL,
  new_hash TEXT NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  confirmation_id TEXT NOT NULL DEFAULT '',
  confirmed_at INTEGER
);
CREATE INDEX IF NOT EXISTS sync_recoveries_expiry ON sync_recoveries(expires_at);

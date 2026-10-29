-- Private metadata only. No publisher bodies, excerpts, images or PDF files.
CREATE TABLE IF NOT EXISTS sync_budget (
  key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK(requests BETWEEN 0 AND 10000),
  operations INTEGER NOT NULL DEFAULT 0 CHECK(operations BETWEEN 0 AND 5000),
  bytes INTEGER NOT NULL DEFAULT 0 CHECK(bytes BETWEEN 0 AND 209715200),
  salt TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO sync_budget(key) VALUES('storage');
CREATE TABLE IF NOT EXISTS sync_profiles (
  id TEXT PRIMARY KEY,
  recovery_hash TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0 CHECK(bytes BETWEEN 0 AND 5242880),
  records INTEGER NOT NULL DEFAULT 0 CHECK(records BETWEEN 0 AND 5000),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_devices (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES sync_profiles(id) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_seq INTEGER NOT NULL DEFAULT 0,
  last_batch TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_devices_profile ON sync_devices(profile_id);
CREATE TABLE IF NOT EXISTS sync_records (
  profile_id TEXT NOT NULL REFERENCES sync_profiles(id) ON DELETE CASCADE,
  record_key TEXT NOT NULL,
  value TEXT,
  deleted INTEGER NOT NULL,
  changed_at INTEGER NOT NULL,
  writer TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  PRIMARY KEY(profile_id,record_key)
);
CREATE INDEX IF NOT EXISTS sync_records_revision ON sync_records(profile_id,revision);
CREATE TRIGGER IF NOT EXISTS sync_record_insert AFTER INSERT ON sync_records BEGIN
  UPDATE sync_profiles SET bytes=bytes+LENGTH(CAST(NEW.record_key AS BLOB))*3+COALESCE(LENGTH(CAST(NEW.value AS BLOB)),0)+256,records=records+1 WHERE id=NEW.profile_id;
  UPDATE sync_budget SET bytes=bytes+LENGTH(CAST(NEW.record_key AS BLOB))*3+COALESCE(LENGTH(CAST(NEW.value AS BLOB)),0)+256 WHERE key='storage';
END;
CREATE TRIGGER IF NOT EXISTS sync_record_update AFTER UPDATE ON sync_records BEGIN
  UPDATE sync_profiles SET bytes=bytes+COALESCE(LENGTH(CAST(NEW.value AS BLOB)),0)-COALESCE(LENGTH(CAST(OLD.value AS BLOB)),0) WHERE id=NEW.profile_id;
  UPDATE sync_budget SET bytes=bytes+COALESCE(LENGTH(CAST(NEW.value AS BLOB)),0)-COALESCE(LENGTH(CAST(OLD.value AS BLOB)),0) WHERE key='storage';
END;
CREATE TRIGGER IF NOT EXISTS sync_record_delete AFTER DELETE ON sync_records BEGIN
  UPDATE sync_profiles SET bytes=bytes-LENGTH(CAST(OLD.record_key AS BLOB))*3-COALESCE(LENGTH(CAST(OLD.value AS BLOB)),0)-256,records=records-1 WHERE id=OLD.profile_id;
  UPDATE sync_budget SET bytes=bytes-LENGTH(CAST(OLD.record_key AS BLOB))*3-COALESCE(LENGTH(CAST(OLD.value AS BLOB)),0)-256 WHERE key='storage';
END;
CREATE TABLE IF NOT EXISTS sync_pairings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES sync_profiles(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES sync_devices(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS sync_pairings_profile ON sync_pairings(profile_id,expires_at);
CREATE INDEX IF NOT EXISTS sync_pairings_expiry ON sync_pairings(expires_at);
CREATE TABLE IF NOT EXISTS sync_pair_requests (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES sync_pairings(id) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  approved_device_id TEXT REFERENCES sync_devices(id) ON DELETE SET NULL,
  redeemed_at INTEGER
);
CREATE INDEX IF NOT EXISTS sync_requests_pair ON sync_pair_requests(pair_id,expires_at);
CREATE TABLE IF NOT EXISTS sync_rate (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_rate_expiry ON sync_rate(expires_at);

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';

const dir = path.dirname(env.localDbPath);
fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(env.localDbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS response_cache (
    cache_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entity_list_cache (
    module_key TEXT NOT NULL,
    table_name TEXT NOT NULL,
    farm_id INTEGER NOT NULL,
    query_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(module_key, table_name, farm_id, query_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_entity_list_recent
    ON entity_list_cache(module_key, table_name, farm_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS entity_record_cache (
    module_key TEXT NOT NULL,
    table_name TEXT NOT NULL,
    farm_id INTEGER NOT NULL,
    record_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(module_key, table_name, farm_id, record_id)
  );

  CREATE INDEX IF NOT EXISTS idx_entity_record_recent
    ON entity_record_cache(module_key, table_name, farm_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS outbox (
    outbox_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    farm_id INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox(status, created_at);

  CREATE TABLE IF NOT EXISTS sync_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    detail_json TEXT,
    created_at INTEGER NOT NULL
  );
`);

const stmtCacheGet = sqlite.prepare('SELECT payload_json, updated_at FROM response_cache WHERE cache_key = ? LIMIT 1');
const stmtCachePut = sqlite.prepare(`
  INSERT INTO response_cache(cache_key, payload_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(cache_key) DO UPDATE SET
    payload_json = excluded.payload_json,
    updated_at = excluded.updated_at
`);

const stmtEntityListGet = sqlite.prepare(`
  SELECT payload_json, updated_at
  FROM entity_list_cache
  WHERE module_key = ?
    AND table_name = ?
    AND farm_id = ?
    AND query_hash = ?
  LIMIT 1
`);

const stmtEntityListLatest = sqlite.prepare(`
  SELECT payload_json, updated_at
  FROM entity_list_cache
  WHERE module_key = ?
    AND table_name = ?
    AND farm_id = ?
  ORDER BY updated_at DESC
  LIMIT 1
`);

const stmtEntityListPut = sqlite.prepare(`
  INSERT INTO entity_list_cache(module_key, table_name, farm_id, query_hash, payload_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(module_key, table_name, farm_id, query_hash) DO UPDATE SET
    payload_json = excluded.payload_json,
    updated_at = excluded.updated_at
`);

const stmtEntityRecordGet = sqlite.prepare(`
  SELECT payload_json, updated_at
  FROM entity_record_cache
  WHERE module_key = ?
    AND table_name = ?
    AND farm_id = ?
    AND record_id = ?
  LIMIT 1
`);

const stmtEntityRecordPut = sqlite.prepare(`
  INSERT INTO entity_record_cache(module_key, table_name, farm_id, record_id, payload_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(module_key, table_name, farm_id, record_id) DO UPDATE SET
    payload_json = excluded.payload_json,
    updated_at = excluded.updated_at
`);

const stmtEntityRecordDelete = sqlite.prepare(`
  DELETE FROM entity_record_cache
  WHERE module_key = ?
    AND table_name = ?
    AND farm_id = ?
    AND record_id = ?
`);

const stmtEntityListCount = sqlite.prepare('SELECT COUNT(*) AS total_count FROM entity_list_cache');
const stmtEntityRecordCount = sqlite.prepare('SELECT COUNT(*) AS total_count FROM entity_record_cache');
const stmtResponseCount = sqlite.prepare('SELECT COUNT(*) AS total_count FROM response_cache');
const stmtSyncLogCount = sqlite.prepare('SELECT COUNT(*) AS total_count FROM sync_log');

const stmtOutboxInsert = sqlite.prepare(`
  INSERT INTO outbox(action_key, payload_json, user_id, farm_id, attempts, status, last_error, created_at, updated_at)
  VALUES (?, ?, ?, ?, 0, 'PENDING', NULL, ?, ?)
`);

const stmtOutboxPending = sqlite.prepare(`
  SELECT outbox_id, action_key, payload_json, user_id, farm_id, attempts, status, last_error, created_at, updated_at
  FROM outbox
  WHERE status IN ('PENDING', 'FAILED')
  ORDER BY created_at ASC
  LIMIT ?
`);

const stmtOutboxDone = sqlite.prepare(`
  UPDATE outbox
  SET status = 'DONE', attempts = attempts + 1, last_error = NULL, updated_at = ?
  WHERE outbox_id = ?
`);

const stmtOutboxFailed = sqlite.prepare(`
  UPDATE outbox
  SET status = 'FAILED', attempts = attempts + 1, last_error = ?, updated_at = ?
  WHERE outbox_id = ?
`);

const stmtOutboxCount = sqlite.prepare(`
  SELECT
    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done_count,
    COUNT(*) AS total_count
  FROM outbox
`);

const stmtLogInsert = sqlite.prepare(`
  INSERT INTO sync_log(event_type, detail_json, created_at)
  VALUES (?, ?, ?)
`);

function hashValue(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function normalizeModule(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeTable(value) {
  return String(value || '').trim();
}

function normalizeRecordId(value) {
  return String(value ?? '').trim();
}

function normalizeFarmId(value) {
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
}

function stableSortObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const output = {};
  for (const key of Object.keys(input).sort()) {
    const value = input[key];
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? stableSortObject(value)
      : value;
  }
  return output;
}

function readJsonRow(row, maxAgeSeconds) {
  if (!row) return null;
  const ageMs = Date.now() - Number(row.updated_at || 0);
  if (ageMs > Number(maxAgeSeconds || 0) * 1000) {
    return null;
  }
  return safeParseJson(row.payload_json, null);
}

export function queryHash(query = {}) {
  return hashValue(JSON.stringify(stableSortObject(query || {})));
}

export function cacheGet(cacheKey, maxAgeSeconds = env.cacheTtlSeconds) {
  const row = stmtCacheGet.get(cacheKey);
  return readJsonRow(row, maxAgeSeconds);
}

export function cachePut(cacheKey, payload) {
  stmtCachePut.run(cacheKey, JSON.stringify(payload), Date.now());
}

export function entityListPut({ moduleKey, table, farmId, query = {}, payload }) {
  stmtEntityListPut.run(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId),
    queryHash(query),
    JSON.stringify(payload || {}),
    Date.now()
  );
}

export function entityListGet({ moduleKey, table, farmId, query = {}, maxAgeSeconds = env.cacheTtlSeconds }) {
  const row = stmtEntityListGet.get(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId),
    queryHash(query)
  );
  return readJsonRow(row, maxAgeSeconds);
}

export function entityListGetLatest({ moduleKey, table, farmId, maxAgeSeconds = env.cacheTtlSeconds }) {
  const row = stmtEntityListLatest.get(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId)
  );
  return readJsonRow(row, maxAgeSeconds);
}

export function entityRecordPut({ moduleKey, table, farmId, recordId, payload }) {
  const normalizedRecordId = normalizeRecordId(recordId);
  if (!normalizedRecordId) return;

  stmtEntityRecordPut.run(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId),
    normalizedRecordId,
    JSON.stringify(payload || {}),
    Date.now()
  );
}

export function entityRecordGet({ moduleKey, table, farmId, recordId, maxAgeSeconds = env.cacheTtlSeconds }) {
  const normalizedRecordId = normalizeRecordId(recordId);
  if (!normalizedRecordId) return null;

  const row = stmtEntityRecordGet.get(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId),
    normalizedRecordId
  );
  return readJsonRow(row, maxAgeSeconds);
}

export function entityRecordDelete({ moduleKey, table, farmId, recordId }) {
  const normalizedRecordId = normalizeRecordId(recordId);
  if (!normalizedRecordId) return;

  stmtEntityRecordDelete.run(
    normalizeModule(moduleKey),
    normalizeTable(table),
    normalizeFarmId(farmId),
    normalizedRecordId
  );
}

export function localCacheStats() {
  const fileSizeBytes = fs.existsSync(env.localDbPath) ? fs.statSync(env.localDbPath).size : 0;
  const responseCount = Number(stmtResponseCount.get()?.total_count || 0);
  const listSnapshotCount = Number(stmtEntityListCount.get()?.total_count || 0);
  const recordSnapshotCount = Number(stmtEntityRecordCount.get()?.total_count || 0);
  const syncLogCount = Number(stmtSyncLogCount.get()?.total_count || 0);

  return {
    file_path: env.localDbPath,
    file_size_bytes: fileSizeBytes,
    response_cache_count: responseCount,
    entity_list_snapshot_count: listSnapshotCount,
    entity_record_snapshot_count: recordSnapshotCount,
    sync_log_count: syncLogCount
  };
}

export function outboxEnqueue({ actionKey, payload, userId, farmId }) {
  const now = Date.now();
  const result = stmtOutboxInsert.run(
    String(actionKey || ''),
    JSON.stringify(payload || {}),
    Number(userId || 0),
    Number(farmId || 0),
    now,
    now
  );

  logSyncEvent('ENQUEUE', {
    outboxId: result.lastInsertRowid,
    actionKey,
    userId,
    farmId
  });

  return Number(result.lastInsertRowid || 0);
}

export function outboxPending(limit = 100) {
  const rows = stmtOutboxPending.all(Number(limit));
  return rows.map((row) => ({
    outboxId: Number(row.outbox_id),
    actionKey: String(row.action_key),
    payload: safeParseJson(row.payload_json),
    userId: Number(row.user_id),
    farmId: Number(row.farm_id),
    attempts: Number(row.attempts),
    status: String(row.status),
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at)
  }));
}

export function outboxMarkDone(outboxId) {
  stmtOutboxDone.run(Date.now(), Number(outboxId));
}

export function outboxMarkFailed(outboxId, errorMessage) {
  stmtOutboxFailed.run(String(errorMessage || 'Unknown sync error'), Date.now(), Number(outboxId));
}

export function outboxStats() {
  const row = stmtOutboxCount.get() || {};
  return {
    pendingCount: Number(row.pending_count || 0),
    failedCount: Number(row.failed_count || 0),
    doneCount: Number(row.done_count || 0),
    totalCount: Number(row.total_count || 0)
  };
}

export function logSyncEvent(eventType, detail = {}) {
  stmtLogInsert.run(String(eventType), JSON.stringify(detail || {}), Date.now());
}

export function safeParseJson(raw, fallback = {}) {
  try {
    return JSON.parse(String(raw || '{}'));
  } catch {
    return fallback;
  }
}

export function getLocalDbFile() {
  return env.localDbPath;
}

import {
  entityListPut,
  entityRecordPut,
  localCacheStats,
  logSyncEvent,
  outboxMarkDone,
  outboxMarkFailed,
  outboxPending,
  outboxStats
} from '../db/cache.js';
import { withMysql } from '../db/mysql.js';
import { fetchUserModules } from './authService.js';
import { getModuleDefinitions } from '../config/modules.js';
import { createRecord, deleteRecord, listRecords, updateRecord } from './moduleDataService.js';

async function runOutboxAction(conn, item) {
  const payload = item.payload || {};
  const actionKey = String(item.actionKey || '').toUpperCase();

  if (actionKey === 'MODULE_CREATE') {
    const result = await createRecord(conn, {
      moduleKey: payload.module_key,
      table: payload.table,
      farmId: item.farmId,
      userId: item.userId,
      payload: payload.data || {}
    });

    if (!result || result.error) {
      throw new Error(result?.error || 'Create action failed');
    }
    return result;
  }

  if (actionKey === 'MODULE_UPDATE') {
    const result = await updateRecord(conn, {
      moduleKey: payload.module_key,
      table: payload.table,
      farmId: item.farmId,
      userId: item.userId,
      recordId: payload.record_id,
      payload: payload.data || {}
    });

    if (!result || result.error) {
      throw new Error(result?.error || 'Update action failed');
    }
    return result;
  }

  if (actionKey === 'MODULE_DELETE') {
    const result = await deleteRecord(conn, {
      moduleKey: payload.module_key,
      table: payload.table,
      farmId: item.farmId,
      recordId: payload.record_id
    });

    if (!result || result.error) {
      throw new Error(result?.error || 'Delete action failed');
    }
    return result;
  }

  throw new Error(`Unsupported outbox action: ${actionKey}`);
}

export async function replayOutbox(limit = 50) {
  const pending = outboxPending(limit);
  if (pending.length === 0) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      stats: outboxStats()
    };
  }

  let succeeded = 0;
  let failed = 0;

  await withMysql(async (conn) => {
    for (const item of pending) {
      try {
        await runOutboxAction(conn, item);
        outboxMarkDone(item.outboxId);
        logSyncEvent('REPLAY_OK', { outboxId: item.outboxId, actionKey: item.actionKey });
        succeeded += 1;
      } catch (error) {
        outboxMarkFailed(item.outboxId, error?.message || 'Replay failed');
        logSyncEvent('REPLAY_FAIL', {
          outboxId: item.outboxId,
          actionKey: item.actionKey,
          error: error?.message || 'Replay failed'
        });
        failed += 1;
      }
    }
  });

  return {
    attempted: pending.length,
    succeeded,
    failed,
    stats: outboxStats()
  };
}

export async function pullEntitySnapshots({
  userId,
  farmId,
  moduleKeys = [],
  pageSize = 100
}) {
  const requestedModuleKeys = Array.isArray(moduleKeys)
    ? new Set(moduleKeys.map((item) => String(item || '').toUpperCase()).filter(Boolean))
    : new Set();

  const perEntityLimit = Math.max(10, Math.min(250, Number(pageSize || 100)));

  return withMysql(async (conn) => {
    const userModules = await fetchUserModules(conn, { userId, farmId });
    const allowedSet = new Set(userModules.map((row) => String(row.module_key || '').toUpperCase()));

    const targetModules = getModuleDefinitions().filter((moduleDef) => {
      if (!allowedSet.has(moduleDef.moduleKey)) return false;
      if (requestedModuleKeys.size === 0) return true;
      return requestedModuleKeys.has(moduleDef.moduleKey);
    });

    let entitiesSynced = 0;
    let rowsCached = 0;
    let failures = 0;

    const failedEntities = [];

    for (const moduleDef of targetModules) {
      for (const entity of moduleDef.entities) {
        try {
          const result = await listRecords(conn, {
            moduleKey: moduleDef.moduleKey,
            table: entity.table,
            farmId,
            query: { page: 1, page_size: perEntityLimit }
          });

          if (!result?.data) continue;

          const payload = result.data;
          entitiesSynced += 1;
          rowsCached += Number(payload.rows?.length || 0);

          entityListPut({
            moduleKey: moduleDef.moduleKey,
            table: entity.table,
            farmId,
            query: { page: 1, page_size: perEntityLimit },
            payload
          });

          const primaryKey = String(payload.primary_key || '').trim();
          if (primaryKey) {
            for (const row of payload.rows || []) {
              const recordId = row?.[primaryKey];
              if (recordId === undefined || recordId === null) continue;

              entityRecordPut({
                moduleKey: moduleDef.moduleKey,
                table: entity.table,
                farmId,
                recordId,
                payload: {
                  module_key: moduleDef.moduleKey,
                  table: entity.table,
                  primary_key: primaryKey,
                  record: row
                }
              });
            }
          }
        } catch (error) {
          failures += 1;
          failedEntities.push({
            module_key: moduleDef.moduleKey,
            table: entity.table,
            error: error?.message || 'Snapshot pull failed'
          });
          logSyncEvent('PULL_FAIL', {
            module_key: moduleDef.moduleKey,
            table: entity.table,
            error: error?.message || 'Snapshot pull failed'
          });
        }
      }
    }

    logSyncEvent('PULL_DONE', {
      user_id: userId,
      farm_id: farmId,
      modules_considered: targetModules.length,
      entities_synced: entitiesSynced,
      rows_cached: rowsCached,
      failures
    });

    return {
      modules_considered: targetModules.length,
      entities_synced: entitiesSynced,
      rows_cached: rowsCached,
      failures,
      failed_entities: failedEntities.slice(0, 200),
      cache: localCacheStats(),
      outbox: outboxStats()
    };
  });
}

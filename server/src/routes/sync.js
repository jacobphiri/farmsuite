import express from 'express';
import { getLocalDbFile, localCacheStats, outboxStats } from '../db/cache.js';
import { checkMysql } from '../db/mysql.js';
import { requireAuth } from '../middleware/auth.js';
import { pullEntitySnapshots, replayOutbox } from '../services/syncService.js';
import { fail, ok, toInt } from '../utils/http.js';

const router = express.Router();

router.get('/status', requireAuth, async (_req, res) => {
  let mysqlAvailable = false;

  try {
    await checkMysql();
    mysqlAvailable = true;
  } catch {
    mysqlAvailable = false;
  }

  return ok(res, {
    mysql_available: mysqlAvailable,
    local_db_file: getLocalDbFile(),
    outbox: outboxStats(),
    local_cache: localCacheStats()
  });
});

router.post('/push', requireAuth, async (req, res) => {
  const limit = Math.min(250, Math.max(1, toInt(req.body?.limit, 50)));

  try {
    const result = await replayOutbox(limit);
    return ok(res, result);
  } catch (error) {
    return fail(res, 503, 'Failed to push offline outbox.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/run', requireAuth, async (req, res) => {
  const limit = Math.min(250, Math.max(1, toInt(req.body?.limit, 50)));

  try {
    const result = await replayOutbox(limit);
    return ok(res, {
      mode: 'manual',
      ...result
    });
  } catch (error) {
    return fail(res, 503, 'Sync run failed.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/pull', requireAuth, async (req, res) => {
  const pageSize = Math.min(250, Math.max(10, toInt(req.body?.page_size || req.body?.pageSize, 100)));

  const moduleKeys = Array.isArray(req.body?.module_keys || req.body?.moduleKeys)
    ? (req.body?.module_keys || req.body?.moduleKeys)
    : String(req.body?.module_keys || req.body?.moduleKeys || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  try {
    const result = await pullEntitySnapshots({
      userId: req.auth.userId,
      farmId: req.auth.farmId,
      moduleKeys,
      pageSize
    });

    return ok(res, {
      mode: 'pull',
      page_size: pageSize,
      module_keys: moduleKeys,
      ...result
    });
  } catch (error) {
    return fail(res, 503, 'Snapshot pull failed.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

export default router;

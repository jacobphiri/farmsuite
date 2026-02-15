import express from 'express';
import { cacheGet, cachePut } from '../db/cache.js';
import { isMysqlUnavailableError, withMysql } from '../db/mysql.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchDashboardOverview } from '../services/dashboardService.js';
import { fail, ok } from '../utils/http.js';

const router = express.Router();

function cacheKey(req) {
  return `dashboard:overview:${req.auth.userId}:${req.auth.farmId}`;
}

router.get('/overview', requireAuth, async (req, res) => {
  const key = cacheKey(req);

  try {
    const payload = await withMysql((conn) => fetchDashboardOverview(conn, {
      farmId: req.auth.farmId
    }));

    cachePut(key, payload);

    return ok(res, {
      source: 'mysql',
      stale: false,
      dashboard: payload
    });
  } catch (error) {
    if (isMysqlUnavailableError(error)) {
      const fallback = cacheGet(key, 60 * 60 * 24 * 30);
      if (fallback) {
        return ok(res, {
          source: 'cache',
          stale: true,
          dashboard: fallback
        });
      }
    }

    return fail(res, 503, 'Unable to load dashboard overview.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

export default router;

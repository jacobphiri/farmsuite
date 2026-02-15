import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { cacheGet, cachePut } from '../db/cache.js';
import { isMysqlUnavailableError, withMysql } from '../db/mysql.js';
import { getModuleDefinitions } from '../config/modules.js';
import { fail, ok } from '../utils/http.js';
import { fetchUserModules, fetchUserProfile } from '../services/authService.js';

const router = express.Router();

function cacheKey(req) {
  return `system:bootstrap:${req.auth.userId}:${req.auth.farmId}`;
}

router.get('/bootstrap', requireAuth, async (req, res) => {
  const key = cacheKey(req);

  try {
    const payload = await withMysql(async (conn) => {
      const profile = await fetchUserProfile(conn, {
        userId: req.auth.userId,
        farmId: req.auth.farmId
      });

      const modules = await fetchUserModules(conn, {
        userId: req.auth.userId,
        farmId: req.auth.farmId
      });

      const [portfolioRows] = await conn.query(
        `SELECT
          f.farm_id,
          f.name,
          f.location,
          f.status,
          r.role_key,
          fu.is_active
        FROM farm_users fu
        INNER JOIN farms f ON f.farm_id = fu.farm_id
        INNER JOIN roles r ON r.role_id = fu.role_id
        WHERE fu.user_id = ?
        ORDER BY fu.farm_id ASC`,
        [req.auth.userId]
      );

      return {
        profile,
        modules,
        module_catalog: getModuleDefinitions(),
        farm_portfolio: portfolioRows
      };
    });

    cachePut(key, payload);

    return ok(res, {
      source: 'mysql',
      stale: false,
      ...payload
    });
  } catch (error) {
    if (isMysqlUnavailableError(error)) {
      const fallback = cacheGet(key, 60 * 60 * 24 * 30);
      if (fallback) {
        return ok(res, {
          source: 'cache',
          stale: true,
          ...fallback
        });
      }
    }

    return fail(res, 503, 'Unable to load bootstrap data.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

export default router;

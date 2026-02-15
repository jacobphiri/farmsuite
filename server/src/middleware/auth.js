import { verifyAccessToken } from '../services/authService.js';
import { fail, toInt } from '../utils/http.js';

export function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) {
    return fail(res, 401, 'Missing bearer token.');
  }

  const token = header.slice(7).trim();
  if (!token) {
    return fail(res, 401, 'Missing bearer token.');
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: toInt(payload.user_id),
      farmId: toInt(payload.farm_id),
      roleKey: String(payload.role_key || 'WORKER')
    };
    return next();
  } catch {
    return fail(res, 401, 'Invalid or expired token.');
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import express from 'express';
import multer from 'multer';
import { withMysql } from '../db/mysql.js';
import { requireAuth } from '../middleware/auth.js';
import { fail, ok, toInt } from '../utils/http.js';
import { fetchUserModules, fetchUserProfile, loginWithPassword, signAccessToken } from '../services/authService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '../../../../');

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const AVATAR_ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const DOC_ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'text/plain': 'txt'
};

const DOCUMENT_TYPES = new Set(['NRC', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'MEDICAL', 'OTHER']);
const THEME_MODES = new Set(['light', 'neon', 'forest-light', 'forest-dark', 'sunrise', 'cobalt', 'ember']);
const TEXT_MODES = new Set(['balanced', 'high-contrast', 'soft']);
const BUTTON_STYLES = new Set(['default', 'pill', 'outline', 'soft']);
const GLOW_INTENSITIES = new Set(['subtle', 'medium', 'strong']);
const CARD_BORDERS = new Set(['1', '2', '3']);
const CARD_RADII = new Set(['compact', 'default', 'rounded', 'soft']);

function decodePreferenceValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return '';
  const raw = String(rawValue).trim();
  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return '';
    if (typeof parsed === 'object') {
      if (Object.prototype.hasOwnProperty.call(parsed, 'value')) {
        return String(parsed.value ?? '');
      }
      return JSON.stringify(parsed);
    }
    return String(parsed);
  } catch {
    return raw;
  }
}

function normalizeThemeMode(value) {
  let candidate = String(value || '').trim().toLowerCase();
  if (candidate === 'dark' || candidate === 'ocean') candidate = 'neon';
  if (candidate === 'forest') candidate = 'forest-dark';
  if (!THEME_MODES.has(candidate)) return 'light';
  return candidate;
}

function cleanUploadPath(raw, prefix) {
  const value = String(raw || '').replace(/^\/+/, '');
  if (!value.startsWith(prefix)) return '';
  return value;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function removeUploadIfExists(relativePath, prefix) {
  const clean = cleanUploadPath(relativePath, prefix);
  if (!clean) return;
  const fullPath = path.resolve(appRoot, clean);
  try {
    await fs.promises.unlink(fullPath);
  } catch {
    // Ignore missing/locked files.
  }
}

function randomToken(size = 8) {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 2 + size)}`;
}

async function upsertPreference(conn, { userId, farmId, key, value }) {
  await conn.query(
    `INSERT INTO ui_preferences (user_id, farm_id, pref_key, value_json, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [toInt(userId), toInt(farmId), String(key), JSON.stringify(String(value))]
  );
}

async function fetchPreference(conn, { userId, farmId, key }) {
  const [rows] = await conn.query(
    `SELECT value_json
     FROM ui_preferences
     WHERE user_id = ? AND farm_id = ? AND pref_key = ?
     LIMIT 1`,
    [toInt(userId), toInt(farmId), String(key)]
  );

  return decodePreferenceValue(rows?.[0]?.value_json || '');
}

async function loadPasswordPolicy(conn, farmId) {
  const [rows] = await conn.query(
    `SELECT config_key, config_value
     FROM system_configs
     WHERE farm_id = ? AND config_key IN ('security_min_password_length', 'security_require_symbol')`,
    [toInt(farmId)]
  );

  const configMap = {};
  for (const row of rows || []) {
    const key = String(row?.config_key || '').trim();
    if (!key) continue;
    configMap[key] = String(row?.config_value || '').trim();
  }

  const minLength = Math.max(8, toInt(configMap.security_min_password_length || 10, 10));
  const requireSymbol = String(configMap.security_require_symbol || '1') === '1';

  return { minLength, requireSymbol };
}

function passwordMeetsPolicy(password, policy) {
  const candidate = String(password || '');
  if (candidate.length < policy.minLength) return false;
  if (!/[A-Z]/.test(candidate) || !/[a-z]/.test(candidate) || !/\d/.test(candidate)) return false;
  if (policy.requireSymbol && !/[^a-zA-Z0-9]/.test(candidate)) return false;
  return true;
}

function runMulter(middleware, req, res) {
  return new Promise((resolve, reject) => {
    middleware(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const farmId = toInt(req.body?.farm_id || req.body?.farmId, 0);

  try {
    const result = await withMysql((conn) => loginWithPassword(conn, { email, password, farmId }));
    if (!result.ok) {
      return fail(res, result.status, result.message || 'Authentication failed.');
    }

    return ok(res, result.data);
  } catch (error) {
    return fail(res, 503, 'Authentication service is unavailable.', {
      detail: error?.message || 'Unable to connect to database.'
    });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await withMysql((conn) => fetchUserProfile(conn, {
      userId: req.auth.userId,
      farmId: req.auth.farmId
    }));

    if (!profile) {
      return fail(res, 404, 'User profile not found in selected farm context.');
    }

    return ok(res, profile);
  } catch (error) {
    return fail(res, 503, 'Failed to load profile.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/update', requireAuth, async (req, res) => {
  const fullName = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) {
    return fail(res, 400, 'Valid name and email are required.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const [conflictRows] = await conn.query(
        `SELECT user_id FROM users WHERE email = ? AND user_id <> ? LIMIT 1`,
        [email, req.auth.userId]
      );
      if (conflictRows?.length) {
        return { error: 'Email already in use by another account.' };
      }

      await conn.query(
        `UPDATE users
         SET full_name = ?, email = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [fullName, email, req.auth.userId]
      );

      return { user: { full_name: fullName, email } };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to update profile.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/theme', requireAuth, async (req, res) => {
  const themeMode = normalizeThemeMode(req.body?.theme_mode || 'light');
  const glowIntensityInput = String(req.body?.glow_intensity || 'medium').trim().toLowerCase();
  const textColorModeInput = String(req.body?.text_color_mode || 'balanced').trim().toLowerCase();
  const buttonStyleInput = String(req.body?.button_style || 'default').trim().toLowerCase();
  const cardBorderSizeInput = String(req.body?.card_border_size || '1').trim();
  const cardRadiusModeInput = String(req.body?.card_radius_mode || 'default').trim().toLowerCase();

  const glowIntensity = GLOW_INTENSITIES.has(glowIntensityInput) ? glowIntensityInput : 'medium';
  const textColorMode = TEXT_MODES.has(textColorModeInput) ? textColorModeInput : 'balanced';
  const buttonStyle = BUTTON_STYLES.has(buttonStyleInput) ? buttonStyleInput : 'default';
  const cardBorderSize = CARD_BORDERS.has(cardBorderSizeInput) ? cardBorderSizeInput : '1';
  const cardRadiusMode = CARD_RADII.has(cardRadiusModeInput) ? cardRadiusModeInput : 'default';
  const glassEffect = req.body?.glass_effect ? '1' : '0';

  const prefs = {
    theme_mode: themeMode,
    glass_effect: glassEffect,
    glow_intensity: glowIntensity,
    text_color_mode: textColorMode,
    button_style: buttonStyle,
    card_border_size: cardBorderSize,
    card_radius_mode: cardRadiusMode
  };

  try {
    await withMysql(async (conn) => {
      for (const [key, value] of Object.entries(prefs)) {
        await upsertPreference(conn, {
          userId: req.auth.userId,
          farmId: req.auth.farmId,
          key,
          value
        });
      }
    });

    return ok(res, { preferences: prefs });
  } catch (error) {
    return fail(res, 503, 'Unable to update display preferences.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.current_password || '');
  const newPassword = String(req.body?.new_password || '');
  const confirmPassword = String(req.body?.confirm_password || '');

  if (newPassword !== confirmPassword) {
    return fail(res, 400, 'New password confirmation does not match.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const policy = await loadPasswordPolicy(conn, req.auth.farmId);
      if (!passwordMeetsPolicy(newPassword, policy)) {
        return {
          error: `Password must be at least ${policy.minLength} chars and include upper/lowercase letters, a number${policy.requireSymbol ? ', and a symbol' : ''}.`
        };
      }

      const [rows] = await conn.query(
        `SELECT password_hash FROM users WHERE user_id = ? LIMIT 1`,
        [req.auth.userId]
      );

      const existingHash = String(rows?.[0]?.password_hash || '');
      if (!existingHash || !(await bcrypt.compare(currentPassword, existingHash.startsWith('$2y$') ? `$2a$${existingHash.slice(4)}` : existingHash))) {
        return { error: 'Current password is incorrect.' };
      }

      const nextHash = await bcrypt.hash(newPassword, 10);
      await conn.query(
        `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?`,
        [nextHash, req.auth.userId]
      );

      return { ok: true };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, { updated: true });
  } catch (error) {
    return fail(res, 503, 'Unable to update password.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.get('/profile/documents', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT document_id, document_type, document_title, original_filename, stored_path, mime_type, file_size, uploaded_at
         FROM user_documents
         WHERE farm_id = ? AND user_id = ?
         ORDER BY document_id DESC
         LIMIT 200`,
        [req.auth.farmId, req.auth.userId]
      );

      return rows || [];
    });

    return ok(res, { documents: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load documents.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.get('/profile/activity', requireAuth, async (req, res) => {
  const limit = Math.min(120, Math.max(10, toInt(req.query?.limit, 20)));
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT action_key, entity_table, created_at
         FROM audit_log
         WHERE farm_id = ? AND user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [req.auth.farmId, req.auth.userId, limit]
      );
      return rows || [];
    });

    return ok(res, { activity: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load recent activity.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/avatar', requireAuth, async (req, res) => {
  try {
    await runMulter(profileUpload.single('avatar_file'), req, res);
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return fail(res, 400, error.code === 'LIMIT_FILE_SIZE' ? 'Avatar exceeds the 25MB upload limit.' : 'Avatar upload failed.');
    }
    return fail(res, 400, 'Avatar upload failed.');
  }

  const removeAvatar = String(req.body?.remove_avatar || '') === '1' || String(req.body?.remove_avatar || '').toLowerCase() === 'true';

  try {
    const payload = await withMysql(async (conn) => {
      const existingPath = await fetchPreference(conn, {
        userId: req.auth.userId,
        farmId: req.auth.farmId,
        key: 'avatar_path'
      });

      if (removeAvatar && !req.file) {
        await upsertPreference(conn, {
          userId: req.auth.userId,
          farmId: req.auth.farmId,
          key: 'avatar_path',
          value: ''
        });

        await removeUploadIfExists(existingPath, 'assets/uploads/avatars/');
        return { avatar_path: '' };
      }

      if (!req.file) {
        return { error: 'Select an image to upload.' };
      }

      const extension = AVATAR_ALLOWED_MIME[req.file.mimetype];
      if (!extension) {
        return { error: 'Unsupported image type. Use JPG, PNG, WEBP, or GIF.' };
      }

      const uploadDir = path.resolve(appRoot, 'assets/uploads/avatars');
      await ensureDir(uploadDir);

      const filename = `avatar_u${req.auth.userId}_f${req.auth.farmId}_${randomToken(10)}.${extension}`;
      const relativePath = `assets/uploads/avatars/${filename}`;
      const fullPath = path.resolve(uploadDir, filename);
      await fs.promises.writeFile(fullPath, req.file.buffer);
      await fs.promises.chmod(fullPath, 0o664).catch(() => {});

      await upsertPreference(conn, {
        userId: req.auth.userId,
        farmId: req.auth.farmId,
        key: 'avatar_path',
        value: relativePath
      });

      if (existingPath && existingPath !== relativePath) {
        await removeUploadIfExists(existingPath, 'assets/uploads/avatars/');
      }

      return { avatar_path: relativePath };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to update avatar.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/document/upload', requireAuth, async (req, res) => {
  try {
    await runMulter(profileUpload.single('document_file'), req, res);
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return fail(res, 400, error.code === 'LIMIT_FILE_SIZE' ? 'Document exceeds the 25MB upload limit.' : 'Document upload failed.');
    }
    return fail(res, 400, 'Document upload failed.');
  }

  const typeInput = String(req.body?.document_type || 'OTHER').trim().toUpperCase();
  const documentType = DOCUMENT_TYPES.has(typeInput) ? typeInput : 'OTHER';
  const title = String(req.body?.document_title || '').trim().slice(0, 190);

  if (!req.file) {
    return fail(res, 400, 'Select a valid file to upload.');
  }

  const extension = DOC_ALLOWED_MIME[req.file.mimetype];
  if (!extension) {
    return fail(res, 400, 'Unsupported file type. Use PDF, DOC, DOCX, XLS, XLSX, TXT, or image formats.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const uploadDir = path.resolve(appRoot, 'assets/uploads/documents');
      await ensureDir(uploadDir);

      const safeOriginalName = String(req.file.originalname || `document.${extension}`).trim().slice(0, 255) || `document.${extension}`;
      const filename = `doc_u${req.auth.userId}_f${req.auth.farmId}_${randomToken(12)}.${extension}`;
      const relativePath = `assets/uploads/documents/${filename}`;
      const fullPath = path.resolve(uploadDir, filename);

      await fs.promises.writeFile(fullPath, req.file.buffer);
      await fs.promises.chmod(fullPath, 0o664).catch(() => {});

      const [result] = await conn.query(
        `INSERT INTO user_documents
          (farm_id, user_id, document_type, document_title, original_filename, stored_path, mime_type, file_size, uploaded_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.auth.farmId,
          req.auth.userId,
          documentType,
          title || null,
          safeOriginalName,
          relativePath,
          req.file.mimetype,
          toInt(req.file.size, 0)
        ]
      );

      const documentId = toInt(result?.insertId, 0);

      return {
        document_id: documentId,
        document_type: documentType,
        document_title: title || null,
        original_filename: safeOriginalName,
        stored_path: relativePath,
        mime_type: req.file.mimetype,
        file_size: toInt(req.file.size, 0)
      };
    });

    return ok(res, { document: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to upload document.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/profile/document/delete', requireAuth, async (req, res) => {
  const documentId = toInt(req.body?.document_id || req.body?.documentId, 0);
  if (documentId < 1) {
    return fail(res, 400, 'Invalid document selected.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT document_id, stored_path
         FROM user_documents
         WHERE document_id = ? AND farm_id = ? AND user_id = ?
         LIMIT 1`,
        [documentId, req.auth.farmId, req.auth.userId]
      );

      const target = rows?.[0] || null;
      if (!target) {
        return { error: 'Document not found.' };
      }

      await conn.query(
        `DELETE FROM user_documents
         WHERE document_id = ? AND farm_id = ? AND user_id = ?
         LIMIT 1`,
        [documentId, req.auth.farmId, req.auth.userId]
      );

      await removeUploadIfExists(target.stored_path, 'assets/uploads/documents/');
      return { document_id: documentId };
    });

    if (payload.error) {
      return fail(res, 404, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to remove document.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

router.post('/switch-farm', requireAuth, async (req, res) => {
  const requestedFarmId = toInt(req.body?.farm_id || req.body?.farmId, 0);
  if (requestedFarmId < 1) {
    return fail(res, 400, 'A valid farm_id is required.');
  }

  try {
    const response = await withMysql(async (conn) => {
      const [membershipRows] = await conn.query(
        `SELECT
           fu.farm_id,
           r.role_key,
           f.name AS farm_name,
           f.location AS farm_location
         FROM farm_users fu
         INNER JOIN roles r ON r.role_id = fu.role_id
         INNER JOIN farms f ON f.farm_id = fu.farm_id
         WHERE fu.user_id = ? AND fu.farm_id = ? AND fu.is_active = 1
         LIMIT 1`,
        [req.auth.userId, requestedFarmId]
      );

      const membership = membershipRows?.[0] || null;
      if (!membership) {
        return { error: 'You are not assigned to the selected farm.' };
      }

      const modules = await fetchUserModules(conn, {
        userId: req.auth.userId,
        farmId: requestedFarmId
      });

      const token = signAccessToken({
        user_id: req.auth.userId,
        farm_id: requestedFarmId,
        role_key: String(membership.role_key || 'WORKER')
      });

      return {
        token,
        farm: {
          farm_id: toInt(membership.farm_id),
          name: String(membership.farm_name || ''),
          location: String(membership.farm_location || '')
        },
        role_key: String(membership.role_key || 'WORKER'),
        modules
      };
    });

    if (response.error) {
      return fail(res, 403, response.error);
    }

    return ok(res, response);
  } catch (error) {
    return fail(res, 503, 'Unable to switch farm right now.', {
      detail: error?.message || 'Database is unavailable.'
    });
  }
});

export default router;

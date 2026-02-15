import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import express from 'express';
import multer from 'multer';
import {
  canAssignRole,
  canCreateFarms,
  canManageMemberships,
  normalizeRoleKey,
  roleModel
} from '../config/roles.js';
import { isMysqlUnavailableError, withMysql } from '../db/mysql.js';
import { requireAuth } from '../middleware/auth.js';
import { fail, ok, toDecimal, toInt } from '../utils/http.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '../../../../');

const iconUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const FARM_SIZE_OPTIONS = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500];
const FARM_UNIT_OPTIONS = ['acre', 'hectare'];
const FARM_UNIT_ALIASES = {
  acre: 'acre',
  acres: 'acre',
  hectare: 'hectare',
  hectares: 'hectare',
  ha: 'hectare'
};

const THEME_MODES = new Set(['light', 'neon', 'forest-light', 'forest-dark', 'sunrise', 'cobalt', 'ember']);
const TEXT_MODES = new Set(['balanced', 'high-contrast', 'soft']);
const BUTTON_STYLES = new Set(['default', 'pill', 'outline', 'soft']);
const GLOW_INTENSITIES = new Set(['subtle', 'medium', 'strong']);
const CARD_BORDERS = new Set(['1', '2', '3']);
const CARD_RADII = new Set(['compact', 'default', 'rounded', 'soft']);

const ICON_ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const MODULE_CONFIG_SCHEMA = {
  INVENTORY: {
    label: 'Inventory',
    fields: {
      default_feed_unit: {
        label: 'Default feed unit',
        type: 'select',
        options: { KG: 'Kilograms (kg)', BAG_25: '25kg bag', BAG_50: '50kg bag' },
        default: 'BAG_50'
      },
      default_medication_unit: {
        label: 'Default medication unit',
        type: 'select',
        options: { BOTTLE: 'Bottle', VIAL: 'Vial', PACK: 'Pack', LITER: 'Liter' },
        default: 'BOTTLE'
      },
      default_vaccine_unit: {
        label: 'Default vaccine unit',
        type: 'select',
        options: { VIAL: 'Vial', BOTTLE: 'Bottle', DOSE: 'Dose', PACK: 'Pack' },
        default: 'VIAL'
      },
      default_supply_unit: {
        label: 'Default supply unit',
        type: 'select',
        options: { UNIT: 'Unit', PACK: 'Pack', KG: 'Kilograms (kg)', LITER: 'Liter' },
        default: 'UNIT'
      },
      default_equipment_unit: {
        label: 'Default equipment unit',
        type: 'select',
        options: { UNIT: 'Unit', SET: 'Set', PIECE: 'Piece' },
        default: 'UNIT'
      },
      custom_feed_units: {
        label: 'Custom feed unit codes (optional)',
        type: 'text',
        default: '',
        placeholder: 'e.g. BAG_10, BAG_40',
        help: 'Comma-separated unit codes added to feed dropdowns.'
      },
      custom_medication_units: {
        label: 'Custom medication unit codes (optional)',
        type: 'text',
        default: '',
        placeholder: 'e.g. SACHET, TABLET',
        help: 'Comma-separated unit codes added to medication dropdowns.'
      },
      custom_vaccine_units: {
        label: 'Custom vaccine unit codes (optional)',
        type: 'text',
        default: '',
        placeholder: 'e.g. AMP, STRIP',
        help: 'Comma-separated unit codes added to vaccine dropdowns.'
      },
      custom_supply_units: {
        label: 'Custom supply unit codes (optional)',
        type: 'text',
        default: '',
        placeholder: 'e.g. BALE, ROLL',
        help: 'Comma-separated unit codes added to supply dropdowns.'
      },
      custom_equipment_units: {
        label: 'Custom equipment unit codes (optional)',
        type: 'text',
        default: '',
        placeholder: 'e.g. KIT, PAIR',
        help: 'Comma-separated unit codes added to equipment dropdowns.'
      }
    }
  },
  BROILERS: {
    label: 'Broilers',
    fields: {
      default_feed_mode: {
        label: 'Default feed entry mode',
        type: 'select',
        options: { KG: 'Kilograms', BAG_25: '25kg bag', BAG_50: '50kg bag' },
        default: 'BAG_50'
      },
      default_weight_unit: {
        label: 'Default bird weight unit',
        type: 'select',
        options: { KG: 'Kilograms (kg)', G: 'Grams (g)', LB: 'Pounds (lb)' },
        default: 'KG'
      }
    }
  },
  LAYERS: {
    label: 'Layers',
    fields: {
      default_feed_mode: {
        label: 'Default feed entry mode',
        type: 'select',
        options: { KG: 'Kilograms', BAG_25: '25kg bag', BAG_50: '50kg bag' },
        default: 'KG'
      },
      default_egg_sales_unit: {
        label: 'Default egg sales unit',
        type: 'select',
        options: { TRAY: 'Tray', DOZEN: 'Dozen', PIECE: 'Piece' },
        default: 'TRAY'
      }
    }
  },
  PIGS: {
    label: 'Pigs',
    fields: {
      default_feed_mode: {
        label: 'Default feed entry mode',
        type: 'select',
        options: { KG: 'Kilograms', BAG_25: '25kg bag', BAG_50: '50kg bag' },
        default: 'KG'
      },
      default_weight_unit: {
        label: 'Default pig weight unit',
        type: 'select',
        options: { KG: 'Kilograms (kg)', LB: 'Pounds (lb)' },
        default: 'KG'
      }
    }
  },
  CROPS: {
    label: 'Crops',
    fields: {
      projected_yield_bag_size_kg: {
        label: 'Projected yield bag size (kg)',
        type: 'number',
        min: 1,
        max: 200,
        step: 1,
        default: '50'
      },
      default_sale_unit: {
        label: 'Default crop sale unit',
        type: 'select',
        options: { BAG: 'Bag', KG: 'Kilograms (kg)', TONNE: 'Tonne' },
        default: 'BAG'
      }
    }
  },
  AQUACULTURE: {
    label: 'Aquaculture',
    fields: {
      default_feed_mode: {
        label: 'Default feed entry mode',
        type: 'select',
        options: { KG: 'Kilograms', BAG_25: '25kg bag', BAG_50: '50kg bag' },
        default: 'KG'
      },
      default_biomass_unit: {
        label: 'Default biomass unit',
        type: 'select',
        options: { KG: 'Kilograms (kg)', G: 'Grams (g)' },
        default: 'KG'
      }
    }
  },
  FINANCE: {
    label: 'Finance',
    fields: {
      default_invoice_due_days: {
        label: 'Default invoice due days',
        type: 'number',
        min: 0,
        max: 365,
        step: 1,
        default: '30'
      },
      default_tax_rate_pct: {
        label: 'Default tax rate (%)',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.01,
        default: '0'
      }
    }
  }
};

const SYNC_MODES = new Set(['bidirectional', 'pull', 'push']);
const CURRENCY_MAP = {
  USD: { name: 'US Dollar', symbol: '$' },
  ZMW: { name: 'Zambian Kwacha', symbol: 'K' },
  EUR: { name: 'Euro', symbol: 'EUR' },
  GBP: { name: 'British Pound', symbol: 'GBP' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
  NGN: { name: 'Nigerian Naira', symbol: 'NGN' },
  ZAR: { name: 'South African Rand', symbol: 'R' }
};

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

function randomToken(size = 8) {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 2 + size)}`;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function upsertPreference(conn, { userId, farmId, key, value }) {
  await conn.query(
    `INSERT INTO ui_preferences (user_id, farm_id, pref_key, value_json, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [toInt(userId), toInt(farmId), String(key), JSON.stringify(String(value))]
  );
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

function cleanUploadPath(raw, prefix) {
  const value = String(raw || '').replace(/^\/+/, '');
  if (!value.startsWith(prefix)) return '';
  return value;
}

async function removeUploadIfExists(relativePath, prefix) {
  const clean = cleanUploadPath(relativePath, prefix);
  if (!clean) return;
  const fullPath = path.resolve(appRoot, clean);
  try {
    await fs.promises.unlink(fullPath);
  } catch {
    // Ignore missing file.
  }
}

function moduleConfigKey(moduleKey, fieldKey) {
  return `module.${String(moduleKey).trim().toLowerCase()}.${String(fieldKey).trim()}`;
}

function sanitizeModuleConfigValue(fieldCfg, rawInput) {
  const type = String(fieldCfg?.type || 'select');
  const raw = String(rawInput ?? '').trim();
  const fallback = String(fieldCfg?.default ?? '');

  if (type === 'number') {
    if (!raw || Number.isNaN(Number(raw))) return fallback;
    let num = Number(raw);
    if (fieldCfg?.min !== undefined) num = Math.max(num, Number(fieldCfg.min));
    if (fieldCfg?.max !== undefined) num = Math.min(num, Number(fieldCfg.max));
    return String(num);
  }

  if (type === 'text') {
    return String(raw.toUpperCase().replace(/[^A-Z0-9_,\-\s]/g, '')).trim();
  }

  const options = Object.keys(fieldCfg?.options || {});
  const candidate = raw.toUpperCase();
  if (options.length && options.includes(candidate)) {
    return candidate;
  }
  return fallback;
}

async function moduleConfigValues(conn, farmId) {
  const values = {};

  for (const [moduleKey, moduleCfg] of Object.entries(MODULE_CONFIG_SCHEMA)) {
    values[moduleKey] = {};
    for (const [fieldKey, fieldCfg] of Object.entries(moduleCfg?.fields || {})) {
      values[moduleKey][fieldKey] = String(fieldCfg?.default ?? '');
    }
  }

  const [rows] = await conn.query(
    `SELECT config_key, config_value
     FROM system_configs
     WHERE farm_id = ? AND config_key LIKE 'module.%'`,
    [toInt(farmId)]
  );

  for (const row of rows || []) {
    const configKey = String(row?.config_key || '');
    const match = configKey.match(/^module\.([a-z0-9_]+)\.([a-z0-9_]+)$/);
    if (!match) continue;

    const moduleKey = String(match[1] || '').toUpperCase();
    const fieldKey = String(match[2] || '');
    const fieldCfg = MODULE_CONFIG_SCHEMA?.[moduleKey]?.fields?.[fieldKey];
    if (!fieldCfg) continue;

    values[moduleKey][fieldKey] = sanitizeModuleConfigValue(fieldCfg, row?.config_value ?? '');
  }

  return values;
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

router.get('/hierarchy', requireAuth, async (req, res) => {
  return ok(res, {
    hierarchy: roleModel(),
    actor: {
      role_key: normalizeRoleKey(req.auth.roleKey),
      can_create_farms: canCreateFarms(req.auth.roleKey),
      can_manage_memberships: canManageMemberships(req.auth.roleKey)
    },
    farm_size_options: FARM_SIZE_OPTIONS,
    farm_unit_options: FARM_UNIT_OPTIONS
  });
});

router.get('/users', requireAuth, async (_req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT user_id, full_name, email, phone, is_active
         FROM users
         ORDER BY full_name ASC`
      );

      return rows;
    });

    return ok(res, {
      users: payload
    });
  } catch (error) {
    return fail(res, 503, 'Unable to load users.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/roles', requireAuth, async (_req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT role_id, role_key, name
         FROM roles
         ORDER BY name ASC`
      );
      return rows || [];
    });

    return ok(res, { roles: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load roles.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/users/farm', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          fu.farm_user_id,
          fu.user_id,
          fu.is_active AS farm_user_active,
          u.full_name,
          u.email,
          u.phone,
          u.is_active,
          r.role_id,
          r.role_key,
          r.name AS role_name,
          COALESCE(pref.value_json, '') AS avatar_pref_json
         FROM farm_users fu
         INNER JOIN users u ON u.user_id = fu.user_id
         INNER JOIN roles r ON r.role_id = fu.role_id
         LEFT JOIN ui_preferences pref
           ON pref.user_id = fu.user_id
          AND pref.farm_id = fu.farm_id
          AND pref.pref_key = 'avatar_path'
         WHERE fu.farm_id = ?
         ORDER BY u.full_name ASC`,
        [req.auth.farmId]
      );

      return (rows || []).map((row) => ({
        ...row,
        avatar_path: decodePreferenceValue(row.avatar_pref_json || '')
      }));
    });

    return ok(res, { users: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load farm users.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/farm-portfolio', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          fu.farm_user_id,
          fu.farm_id,
          fu.user_id,
          fu.is_active,
          f.name AS farm_name,
          f.location,
          f.status AS farm_status,
          r.role_id,
          r.role_key,
          r.name AS role_name,
          u.full_name,
          u.email
         FROM farm_users fu
         INNER JOIN farms f ON f.farm_id = fu.farm_id
         INNER JOIN roles r ON r.role_id = fu.role_id
         INNER JOIN users u ON u.user_id = fu.user_id
         WHERE fu.farm_id = ?
         ORDER BY fu.is_active DESC, r.role_key ASC, u.full_name ASC`,
        [req.auth.farmId]
      );

      return rows;
    });

    return ok(res, {
      memberships: payload,
      farm_id: req.auth.farmId
    });
  } catch (error) {
    return fail(res, 503, 'Unable to load farm portfolio.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/modules', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          m.module_key,
          m.name,
          m.icon,
          m.sort_order,
          m.is_active,
          COALESCE(fm.enabled, 0) AS enabled
         FROM modules m
         LEFT JOIN farm_modules fm
           ON fm.module_key = m.module_key
          AND fm.farm_id = ?
         ORDER BY m.sort_order ASC, m.name ASC`,
        [req.auth.farmId]
      );

      return rows || [];
    });

    return ok(res, { modules: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load module configuration.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/modules', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update farm modules.');
  }

  const enabledKeys = Array.isArray(req.body?.modules)
    ? req.body.modules.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean)
    : [];

  try {
    const payload = await withMysql(async (conn) => {
      const [moduleRows] = await conn.query(
        `SELECT module_key FROM modules ORDER BY sort_order ASC, name ASC`
      );

      const allKeys = (moduleRows || []).map((row) => String(row.module_key || '').toUpperCase()).filter(Boolean);
      const enabledSet = new Set(enabledKeys);

      await conn.beginTransaction();
      try {
        for (const moduleKey of allKeys) {
          const enabled = enabledSet.has(moduleKey) ? 1 : 0;
          await conn.query(
            `INSERT INTO farm_modules (farm_id, module_key, enabled, config_json, updated_at)
             VALUES (?, ?, ?, NULL, NOW())
             ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = NOW()`,
            [req.auth.farmId, moduleKey, enabled]
          );
        }

        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      }

      return {
        farm_id: req.auth.farmId,
        enabled_modules: allKeys.filter((moduleKey) => enabledSet.has(moduleKey))
      };
    });

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to update module configuration.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/ui', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT pref_key, value_json
         FROM ui_preferences
         WHERE user_id = ? AND farm_id = ? AND pref_key IN ('sidebar_collapsed','last_module','footer_hidden','footer_text','theme_mode','glass_effect','glow_intensity','text_color_mode','button_style','card_border_size','card_radius_mode')`,
        [req.auth.userId, req.auth.farmId]
      );

      const prefs = {};
      for (const row of rows || []) {
        const key = String(row?.pref_key || '').trim();
        if (!key) continue;
        prefs[key] = decodePreferenceValue(row?.value_json);
      }

      return prefs;
    });

    return ok(res, { preferences: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load UI preferences.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/ui', requireAuth, async (req, res) => {
  const footerRaw = String(req.body?.footer_text || '').replace(/\s+/g, ' ').trim();
  const footerText = (footerRaw || `© ${new Date().getFullYear()} FarmSuite ERP`).slice(0, 160);

  const prefs = {
    sidebar_collapsed: req.body?.sidebar_collapsed ? '1' : '0',
    last_module: String(req.body?.last_module || 'dashboard').trim() || 'dashboard',
    footer_hidden: req.body?.footer_hidden ? '1' : '0',
    footer_text: footerText
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
    return fail(res, 503, 'Unable to save layout preferences.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/theming', requireAuth, async (req, res) => {
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
    return fail(res, 503, 'Unable to save theme settings.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/system-configs', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT config_id, config_key, config_value, updated_by, updated_at
         FROM system_configs
         WHERE farm_id = ?
         ORDER BY config_key ASC`,
        [req.auth.farmId]
      );
      return rows || [];
    });

    return ok(res, { configs: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load system configuration.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/system-configs', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update system configuration.');
  }

  const configKey = String(req.body?.config_key || '').trim();
  const configValue = String(req.body?.config_value || '').trim();

  if (!configKey) {
    return fail(res, 400, 'Configuration key is required.');
  }

  try {
    await withMysql(async (conn) => {
      await conn.query(
        `INSERT INTO system_configs (farm_id, config_key, config_value, updated_by, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = NOW()`,
        [req.auth.farmId, configKey, configValue, req.auth.userId]
      );
    });

    return ok(res, {
      config_key: configKey,
      config_value: configValue
    });
  } catch (error) {
    return fail(res, 503, 'Unable to update system configuration.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/system-configs/currency', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update currency settings.');
  }

  let currencyCode = String(req.body?.currency_code || 'USD').trim().toUpperCase();
  let currencyPosition = String(req.body?.currency_position || 'BEFORE').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(CURRENCY_MAP, currencyCode)) {
    currencyCode = 'USD';
  }
  if (!['BEFORE', 'AFTER'].includes(currencyPosition)) {
    currencyPosition = 'BEFORE';
  }

  const rows = {
    currency_code: currencyCode,
    currency_name: CURRENCY_MAP[currencyCode].name,
    currency_symbol: CURRENCY_MAP[currencyCode].symbol,
    currency_position: currencyPosition
  };

  try {
    await withMysql(async (conn) => {
      for (const [key, value] of Object.entries(rows)) {
        await conn.query(
          `INSERT INTO system_configs (farm_id, config_key, config_value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = NOW()`,
          [req.auth.farmId, key, String(value), req.auth.userId]
        );
      }
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, 503, 'Unable to update currency settings.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/audit-logs', requireAuth, async (req, res) => {
  const limit = Math.min(200, Math.max(20, toInt(req.query?.limit, 120)));
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT action_key, entity_table, entity_id, created_at
         FROM audit_log
         WHERE farm_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [req.auth.farmId, limit]
      );
      return rows || [];
    });

    return ok(res, { logs: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load audit logs.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/notification-configs', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          n.notification_config_id,
          n.user_id,
          n.alert_type,
          n.channel,
          n.is_enabled,
          n.threshold_value,
          n.updated_at,
          u.full_name
         FROM notification_configs n
         INNER JOIN users u ON u.user_id = n.user_id
         WHERE n.farm_id = ?
         ORDER BY n.alert_type ASC, n.channel ASC, n.notification_config_id DESC`,
        [req.auth.farmId]
      );
      return rows || [];
    });

    return ok(res, { notification_configs: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load notification rules.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/notification-configs', requireAuth, async (req, res) => {
  const userId = toInt(req.body?.user_id, req.auth.userId);
  const alertType = String(req.body?.alert_type || 'GENERAL').trim().toUpperCase();
  const channel = String(req.body?.channel || 'IN_APP').trim().toUpperCase();
  const isEnabled = req.body?.is_enabled ? 1 : 0;
  const thresholdRaw = String(req.body?.threshold_value ?? '').trim();
  const thresholdValue = thresholdRaw === '' ? null : Number(thresholdRaw);

  if (!['IN_APP', 'EMAIL', 'SMS'].includes(channel)) {
    return fail(res, 400, 'Invalid notification channel.');
  }
  if (thresholdRaw !== '' && (Number.isNaN(thresholdValue) || !Number.isFinite(thresholdValue))) {
    return fail(res, 400, 'Invalid threshold value.');
  }

  try {
    await withMysql(async (conn) => {
      await conn.query(
        `INSERT INTO notification_configs (farm_id, user_id, alert_type, channel, is_enabled, threshold_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), threshold_value = VALUES(threshold_value), updated_at = NOW()`,
        [req.auth.farmId, userId, alertType || 'GENERAL', channel, isEnabled, thresholdValue]
      );
    });

    return ok(res, {
      user_id: userId,
      alert_type: alertType || 'GENERAL',
      channel,
      is_enabled: isEnabled,
      threshold_value: thresholdValue
    });
  } catch (error) {
    return fail(res, 503, 'Unable to save notification rule.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/sync-config', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT config_key, config_value
         FROM system_configs
         WHERE farm_id = ? AND config_key IN ('sync_mode','sync_interval_seconds','sync_auto_enabled','sync_wifi_only','sync_batch_size','sync_last_sync_at')`,
        [req.auth.farmId]
      );

      const map = {};
      for (const row of rows || []) {
        const key = String(row?.config_key || '').trim();
        if (!key) continue;
        map[key] = String(row?.config_value || '').trim();
      }

      const mode = SYNC_MODES.has(String(map.sync_mode || '').toLowerCase()) ? String(map.sync_mode).toLowerCase() : 'bidirectional';
      const interval = Math.min(3600, Math.max(10, toInt(map.sync_interval_seconds || 30, 30)));
      const batchSize = Math.min(200, Math.max(1, toInt(map.sync_batch_size || 15, 15)));

      return {
        mode,
        interval_seconds: interval,
        auto_enabled: String(map.sync_auto_enabled || '1') === '1' ? '1' : '0',
        wifi_only: String(map.sync_wifi_only || '0') === '1' ? '1' : '0',
        batch_size: batchSize,
        last_sync_at: String(map.sync_last_sync_at || '')
      };
    });

    return ok(res, { sync_config: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load sync settings.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/sync-config', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update sync settings.');
  }

  let mode = String(req.body?.sync_mode || 'bidirectional').trim().toLowerCase();
  if (!SYNC_MODES.has(mode)) mode = 'bidirectional';

  let interval = toInt(req.body?.sync_interval_seconds, 30);
  if (interval < 10) interval = 10;
  if (interval > 3600) interval = 3600;

  let batchSize = toInt(req.body?.sync_batch_size, 15);
  if (batchSize < 1) batchSize = 1;
  if (batchSize > 200) batchSize = 200;

  const rows = {
    sync_mode: mode,
    sync_interval_seconds: String(interval),
    sync_auto_enabled: req.body?.sync_auto_enabled ? '1' : '0',
    sync_wifi_only: req.body?.sync_wifi_only ? '1' : '0',
    sync_batch_size: String(batchSize),
    sync_policy_updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  try {
    await withMysql(async (conn) => {
      for (const [key, value] of Object.entries(rows)) {
        await conn.query(
          `INSERT INTO system_configs (farm_id, config_key, config_value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = NOW()`,
          [req.auth.farmId, key, String(value), req.auth.userId]
        );
      }
    });

    return ok(res, {
      sync_config: {
        mode,
        interval_seconds: interval,
        auto_enabled: rows.sync_auto_enabled,
        wifi_only: rows.sync_wifi_only,
        batch_size: batchSize
      }
    });
  } catch (error) {
    return fail(res, 503, 'Unable to save sync settings.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/module-config', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => moduleConfigValues(conn, req.auth.farmId));
    return ok(res, {
      schema: MODULE_CONFIG_SCHEMA,
      values: payload
    });
  } catch (error) {
    return fail(res, 503, 'Unable to load module configuration schema.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/module-config', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update module config.');
  }

  const input = typeof req.body?.module_config === 'object' && req.body?.module_config !== null
    ? req.body.module_config
    : {};

  try {
    const payload = await withMysql(async (conn) => {
      const savedValues = {};
      for (const [moduleKey, moduleCfg] of Object.entries(MODULE_CONFIG_SCHEMA)) {
        const moduleInput = typeof input[moduleKey] === 'object' && input[moduleKey] !== null ? input[moduleKey] : {};
        savedValues[moduleKey] = {};

        for (const [fieldKey, fieldCfg] of Object.entries(moduleCfg.fields || {})) {
          const nextValue = sanitizeModuleConfigValue(fieldCfg, moduleInput[fieldKey] ?? '');
          await conn.query(
            `INSERT INTO system_configs (farm_id, config_key, config_value, updated_by, updated_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = NOW()`,
            [req.auth.farmId, moduleConfigKey(moduleKey, fieldKey), nextValue, req.auth.userId]
          );
          savedValues[moduleKey][fieldKey] = nextValue;
        }
      }

      return savedValues;
    });

    return ok(res, { values: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to save module configuration.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const payload = await withMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT alert_id, alert_type, title, description, created_at, resolved_at
         FROM alerts
         WHERE farm_id = ?
         ORDER BY alert_id DESC
         LIMIT 120`,
        [req.auth.farmId]
      );
      return rows || [];
    });

    return ok(res, { alerts: payload });
  } catch (error) {
    return fail(res, 503, 'Unable to load alerts.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/alerts/:alertId/resolve', requireAuth, async (req, res) => {
  const alertId = toInt(req.params.alertId, 0);
  if (alertId < 1) {
    return fail(res, 400, 'Invalid alert id.');
  }

  try {
    await withMysql(async (conn) => {
      await conn.query(
        `UPDATE alerts
         SET resolved_at = NOW()
         WHERE alert_id = ? AND farm_id = ?`,
        [alertId, req.auth.farmId]
      );
    });

    return ok(res, { alert_id: alertId, resolved: true });
  } catch (error) {
    return fail(res, 503, 'Unable to resolve alert.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/farm-icon', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update farm branding.');
  }

  try {
    await runMulter(iconUpload.single('farm_icon_file'), req, res);
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return fail(res, 400, error.code === 'LIMIT_FILE_SIZE' ? 'Farm icon exceeds the 10MB upload limit.' : 'Farm icon upload failed.');
    }
    return fail(res, 400, 'Farm icon upload failed.');
  }

  const removeIcon = String(req.body?.remove_farm_icon || '') === '1' || String(req.body?.remove_farm_icon || '').toLowerCase() === 'true';

  try {
    const payload = await withMysql(async (conn) => {
      const [existingRows] = await conn.query(
        `SELECT value_json
         FROM ui_preferences
         WHERE farm_id = ? AND pref_key = 'farm_icon_path'
         ORDER BY updated_at DESC, preference_id DESC
         LIMIT 1`,
        [req.auth.farmId]
      );
      const existingPath = decodePreferenceValue(existingRows?.[0]?.value_json || '');

      if (removeIcon && !req.file) {
        await upsertPreference(conn, {
          userId: req.auth.userId,
          farmId: req.auth.farmId,
          key: 'farm_icon_path',
          value: ''
        });

        await removeUploadIfExists(existingPath, 'assets/uploads/farm-icons/');
        return { farm_icon_path: '' };
      }

      if (!req.file) {
        return { error: 'Select a valid image to upload.' };
      }

      const extension = ICON_ALLOWED_MIME[req.file.mimetype];
      if (!extension) {
        return { error: 'Unsupported image type. Use JPG, PNG, WEBP, or GIF.' };
      }

      const uploadDir = path.resolve(appRoot, 'assets/uploads/farm-icons');
      await ensureDir(uploadDir);

      const filename = `farm_icon_f${req.auth.farmId}_${randomToken(10)}.${extension}`;
      const relativePath = `assets/uploads/farm-icons/${filename}`;
      const fullPath = path.resolve(uploadDir, filename);

      await fs.promises.writeFile(fullPath, req.file.buffer);
      await fs.promises.chmod(fullPath, 0o664).catch(() => {});

      await upsertPreference(conn, {
        userId: req.auth.userId,
        farmId: req.auth.farmId,
        key: 'farm_icon_path',
        value: relativePath
      });

      if (existingPath && existingPath !== relativePath) {
        await removeUploadIfExists(existingPath, 'assets/uploads/farm-icons/');
      }

      return { farm_icon_path: relativePath };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to update farm icon.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/farms', requireAuth, async (req, res) => {
  if (!canCreateFarms(req.auth.roleKey)) {
    return fail(res, 403, 'Only SUPER_ADMIN, TENANT, OWNER, or ORG_ADMIN can create farms.');
  }

  const name = String(req.body?.name || req.body?.farm_name || '').trim();
  const location = String(req.body?.location || '').trim();
  const unitInput = String(req.body?.unit || 'acre').trim().toLowerCase();
  const unit = FARM_UNIT_ALIASES[unitInput] || '';
  const size = toDecimal(req.body?.size, 0);

  if (!name) {
    return fail(res, 400, 'Farm name is required.');
  }

  if (!FARM_SIZE_OPTIONS.includes(size)) {
    return fail(res, 400, `Farm size must be one of: ${FARM_SIZE_OPTIONS.join(', ')}`);
  }

  if (!unit) {
    return fail(res, 400, 'Farm unit must be Acres or Hectares.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const [userRows] = await conn.query(
        `SELECT org_id FROM users WHERE user_id = ? LIMIT 1`,
        [req.auth.userId]
      );

      const orgId = toInt(userRows?.[0]?.org_id, 0);
      if (orgId < 1) {
        return { error: 'Cannot resolve organization for current user.' };
      }

      const [farmResult] = await conn.query(
        `INSERT INTO farms(org_id, name, location, size, unit, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [orgId, name, location || null, size, unit]
      );

      const farmId = toInt(farmResult?.insertId, 0);
      if (farmId < 1) {
        return { error: 'Failed to create farm.' };
      }

      const actorRoleKey = normalizeRoleKey(req.auth.roleKey);
      const [roleRows] = await conn.query(
        `SELECT role_id FROM roles WHERE UPPER(role_key) = ? LIMIT 1`,
        [actorRoleKey]
      );
      const fallbackRole = await conn.query(
        `SELECT role_id FROM roles WHERE role_key IN ('TENANT', 'SUPER_ADMIN', 'ADMIN') ORDER BY role_id DESC LIMIT 1`
      );

      const actorRoleId = toInt(roleRows?.[0]?.role_id, 0) || toInt(fallbackRole?.[0]?.[0]?.role_id, 0);

      if (actorRoleId > 0) {
        await conn.query(
          `INSERT INTO farm_users(farm_id, user_id, role_id, is_active)
           VALUES (?, ?, ?, 1)`,
          [farmId, req.auth.userId, actorRoleId]
        );
      }

      await conn.query(
        `INSERT INTO farm_modules(farm_id, module_key, enabled)
         SELECT ?, module_key, is_active
         FROM modules
         WHERE is_active = 1`,
        [farmId]
      );

      const [farmRows] = await conn.query(
        `SELECT farm_id, org_id, name, location, size, unit, status, created_at
         FROM farms
         WHERE farm_id = ?
         LIMIT 1`,
        [farmId]
      );

      return {
        farm: farmRows?.[0] || null,
        actor_role_key: actorRoleKey
      };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    if (isMysqlUnavailableError(error)) {
      return fail(res, 503, 'Farm creation requires active database connection.');
    }

    return fail(res, 500, 'Failed to create farm.', {
      detail: error?.message || 'Unexpected server error.'
    });
  }
});

router.post('/farm-memberships', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot assign farm memberships.');
  }

  const userId = toInt(req.body?.user_id, 0);
  const farmId = toInt(req.body?.farm_id, req.auth.farmId);
  const roleId = toInt(req.body?.role_id, 0);
  const roleKeyInput = normalizeRoleKey(req.body?.role_key || '');

  if (userId < 1 || farmId < 1) {
    return fail(res, 400, 'Valid user_id and farm_id are required.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const roleRow = roleId > 0
        ? await conn.query('SELECT role_id, role_key FROM roles WHERE role_id = ? LIMIT 1', [roleId])
        : await conn.query('SELECT role_id, role_key FROM roles WHERE UPPER(role_key) = ? LIMIT 1', [roleKeyInput]);

      const chosenRole = roleRow?.[0]?.[0] || null;
      if (!chosenRole) {
        return { error: 'Selected role was not found.' };
      }

      if (!canAssignRole({ actorRole: req.auth.roleKey, targetRole: chosenRole.role_key })) {
        return { error: 'You cannot assign this role.' };
      }

      const [existingRows] = await conn.query(
        `SELECT farm_user_id FROM farm_users WHERE farm_id = ? AND user_id = ? LIMIT 1`,
        [farmId, userId]
      );

      if (existingRows?.length) {
        await conn.query(
          `UPDATE farm_users SET role_id = ?, is_active = 1 WHERE farm_user_id = ?`,
          [chosenRole.role_id, existingRows[0].farm_user_id]
        );
      } else {
        await conn.query(
          `INSERT INTO farm_users(farm_id, user_id, role_id, is_active)
           VALUES (?, ?, ?, 1)`,
          [farmId, userId, chosenRole.role_id]
        );
      }

      const [rows] = await conn.query(
        `SELECT
          fu.farm_user_id,
          fu.farm_id,
          fu.user_id,
          fu.is_active,
          r.role_id,
          r.role_key,
          u.full_name,
          u.email
         FROM farm_users fu
         INNER JOIN roles r ON r.role_id = fu.role_id
         INNER JOIN users u ON u.user_id = fu.user_id
         WHERE fu.farm_id = ? AND fu.user_id = ?
         LIMIT 1`,
        [farmId, userId]
      );

      return { membership: rows?.[0] || null };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 500, 'Failed to assign farm membership.', {
      detail: error?.message || 'Unexpected server error.'
    });
  }
});

router.post('/users/create', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot create users.');
  }

  const fullName = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const roleIdInput = toInt(req.body?.role_id, 0);
  const roleKeyInput = normalizeRoleKey(req.body?.role_key || '');

  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !password) {
    return fail(res, 400, 'Valid full name, email, and password are required.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const policy = await loadPasswordPolicy(conn, req.auth.farmId);
      if (!passwordMeetsPolicy(password, policy)) {
        return {
          error: `Password must be at least ${policy.minLength} chars and include upper/lowercase letters, a number${policy.requireSymbol ? ', and a symbol' : ''}.`
        };
      }

      const [existingUsers] = await conn.query(
        `SELECT user_id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
      );
      if (existingUsers?.length) {
        return { error: 'Email already exists.' };
      }

      const roleRow = roleIdInput > 0
        ? await conn.query('SELECT role_id, role_key, name FROM roles WHERE role_id = ? LIMIT 1', [roleIdInput])
        : await conn.query('SELECT role_id, role_key, name FROM roles WHERE UPPER(role_key) = ? LIMIT 1', [roleKeyInput]);
      const role = roleRow?.[0]?.[0] || null;

      if (!role) {
        return { error: 'Selected role was not found.' };
      }
      if (!canAssignRole({ actorRole: req.auth.roleKey, targetRole: role.role_key })) {
        return { error: 'You cannot assign this role.' };
      }

      const [actorRows] = await conn.query(
        `SELECT org_id
         FROM users
         WHERE user_id = ?
         LIMIT 1`,
        [req.auth.userId]
      );
      const actorOrgId = toInt(actorRows?.[0]?.org_id, 0);
      if (actorOrgId < 1) {
        return { error: 'Unable to resolve organization for current user.' };
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await conn.beginTransaction();
      try {
        const [userInsert] = await conn.query(
          `INSERT INTO users (org_id, full_name, email, password_hash, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [actorOrgId, fullName, email, passwordHash]
        );

        const userId = toInt(userInsert?.insertId, 0);
        if (userId < 1) {
          throw new Error('Unable to create user.');
        }

        await conn.query(
          `INSERT INTO farm_users (farm_id, user_id, role_id, is_active, created_at)
           VALUES (?, ?, ?, 1, NOW())`,
          [req.auth.farmId, userId, role.role_id]
        );

        await conn.commit();

        return {
          user: {
            user_id: userId,
            full_name: fullName,
            email,
            role_id: toInt(role.role_id),
            role_key: String(role.role_key || ''),
            role_name: String(role.name || ''),
            is_active: 1
          }
        };
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to create user.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.post('/users/password', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update user passwords.');
  }

  const targetUserId = toInt(req.body?.user_id || req.body?.target_user_id, 0);
  const password = String(req.body?.password || '');

  if (targetUserId < 1 || !password) {
    return fail(res, 400, 'Valid target user and password are required.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const [membershipRows] = await conn.query(
        `SELECT fu.farm_user_id, r.role_key
         FROM farm_users fu
         INNER JOIN roles r ON r.role_id = fu.role_id
         WHERE fu.farm_id = ? AND fu.user_id = ?
         LIMIT 1`,
        [req.auth.farmId, targetUserId]
      );
      const membership = membershipRows?.[0] || null;
      if (!membership) {
        return { error: 'Selected user is not assigned to this farm.' };
      }

      if (!canAssignRole({ actorRole: req.auth.roleKey, targetRole: membership.role_key })) {
        return { error: 'You do not have permission to update this account password.' };
      }

      const policy = await loadPasswordPolicy(conn, req.auth.farmId);
      if (!passwordMeetsPolicy(password, policy)) {
        return {
          error: `Password must be at least ${policy.minLength} chars and include upper/lowercase letters, a number${policy.requireSymbol ? ', and a symbol' : ''}.`
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await conn.query(
        `UPDATE users
         SET password_hash = ?, updated_at = NOW()
         WHERE user_id = ?
         LIMIT 1`,
        [passwordHash, targetUserId]
      );

      return { user_id: targetUserId, updated: true };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 503, 'Unable to update user password.', {
      detail: error?.message || 'Database unavailable.'
    });
  }
});

router.put('/farm-memberships/:farmUserId', requireAuth, async (req, res) => {
  if (!canManageMemberships(req.auth.roleKey)) {
    return fail(res, 403, 'Your role cannot update farm memberships.');
  }

  const farmUserId = toInt(req.params.farmUserId, 0);
  const nextRoleId = toInt(req.body?.role_id, 0);
  const nextRoleKey = normalizeRoleKey(req.body?.role_key || '');
  const isActive = req.body?.is_active;

  if (farmUserId < 1) {
    return fail(res, 400, 'Invalid farm membership id.');
  }

  try {
    const payload = await withMysql(async (conn) => {
      const [membershipRows] = await conn.query(
        `SELECT fu.farm_user_id, fu.farm_id, fu.user_id, fu.role_id, fu.is_active, r.role_key
         FROM farm_users fu
         INNER JOIN roles r ON r.role_id = fu.role_id
         WHERE fu.farm_user_id = ?
         LIMIT 1`,
        [farmUserId]
      );

      const membership = membershipRows?.[0] || null;
      if (!membership) {
        return { error: 'Farm membership not found.' };
      }

      let roleIdToApply = membership.role_id;
      if (nextRoleId > 0 || nextRoleKey) {
        const roleRows = nextRoleId > 0
          ? await conn.query('SELECT role_id, role_key FROM roles WHERE role_id = ? LIMIT 1', [nextRoleId])
          : await conn.query('SELECT role_id, role_key FROM roles WHERE UPPER(role_key) = ? LIMIT 1', [nextRoleKey]);

        const role = roleRows?.[0]?.[0] || null;
        if (!role) {
          return { error: 'Requested role was not found.' };
        }

        if (!canAssignRole({ actorRole: req.auth.roleKey, targetRole: role.role_key })) {
          return { error: 'You cannot elevate or demote to this role.' };
        }

        roleIdToApply = role.role_id;
      }

      const updates = [];
      const params = [];

      if (roleIdToApply !== membership.role_id) {
        updates.push('role_id = ?');
        params.push(roleIdToApply);
      }

      if (isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(toInt(isActive, 0) ? 1 : 0);
      }

      if (updates.length === 0) {
        return { error: 'No membership changes were provided.' };
      }

      params.push(farmUserId);

      await conn.query(
        `UPDATE farm_users SET ${updates.join(', ')} WHERE farm_user_id = ?`,
        params
      );

      const [rows] = await conn.query(
        `SELECT
          fu.farm_user_id,
          fu.farm_id,
          fu.user_id,
          fu.is_active,
          r.role_id,
          r.role_key,
          r.name AS role_name,
          u.full_name,
          u.email
         FROM farm_users fu
         INNER JOIN roles r ON r.role_id = fu.role_id
         INNER JOIN users u ON u.user_id = fu.user_id
         WHERE fu.farm_user_id = ?
         LIMIT 1`,
        [farmUserId]
      );

      return { membership: rows?.[0] || null };
    });

    if (payload.error) {
      return fail(res, 400, payload.error);
    }

    return ok(res, payload);
  } catch (error) {
    return fail(res, 500, 'Failed to update farm membership.', {
      detail: error?.message || 'Unexpected server error.'
    });
  }
});

export default router;

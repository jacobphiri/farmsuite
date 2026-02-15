import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { toInt } from '../utils/http.js';

const PROFILE_PREF_KEYS = [
  'sidebar_collapsed',
  'theme_mode',
  'glass_effect',
  'avatar_path',
  'text_color_mode',
  'button_style',
  'glow_intensity',
  'card_border_size',
  'card_radius_mode',
  'footer_hidden',
  'footer_text'
];

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
  const candidate = String(value || '').trim().toLowerCase();
  if (candidate === 'dark' || candidate === 'ocean') return 'neon';
  if (candidate === 'forest') return 'forest-dark';
  if (['light', 'neon', 'forest-light', 'forest-dark', 'sunrise', 'cobalt', 'ember'].includes(candidate)) {
    return candidate;
  }
  return 'light';
}

function normalizeBcryptHash(rawHash) {
  const hash = String(rawHash || '');
  if (hash.startsWith('$2y$')) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export async function loginWithPassword(conn, { email, password, farmId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, status: 400, message: 'Email and password are required.' };
  }

  const [users] = await conn.query(
    `SELECT user_id, org_id, full_name, email, password_hash, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = users[0];
  if (!user || Number(user.is_active) !== 1) {
    return { ok: false, status: 401, message: 'Invalid credentials.' };
  }

  const passwordMatch = await bcrypt.compare(String(password), normalizeBcryptHash(user.password_hash));
  if (!passwordMatch) {
    return { ok: false, status: 401, message: 'Invalid credentials.' };
  }

  const [memberships] = await conn.query(
    `SELECT
        fu.farm_id,
        f.name AS farm_name,
        f.location AS farm_location,
        f.status AS farm_status,
        r.role_key,
        r.name AS role_name,
        fu.role_id
     FROM farm_users fu
     INNER JOIN farms f ON f.farm_id = fu.farm_id
     INNER JOIN roles r ON r.role_id = fu.role_id
     WHERE fu.user_id = ? AND fu.is_active = 1
     ORDER BY fu.farm_id ASC`,
    [user.user_id]
  );

  if (!memberships || memberships.length === 0) {
    return { ok: false, status: 403, message: 'No active farm membership found for this user.' };
  }

  let selectedFarm = memberships[0];
  const requestedFarmId = toInt(farmId, 0);
  if (requestedFarmId > 0) {
    const match = memberships.find((row) => toInt(row.farm_id) === requestedFarmId);
    if (match) {
      selectedFarm = match;
    }
  }

  const modules = await fetchUserModules(conn, {
    farmId: toInt(selectedFarm.farm_id),
    userId: toInt(user.user_id)
  });

  const tokenPayload = {
    user_id: toInt(user.user_id),
    farm_id: toInt(selectedFarm.farm_id),
    role_key: String(selectedFarm.role_key || 'WORKER')
  };

  const token = signAccessToken(tokenPayload);

  return {
    ok: true,
    status: 200,
    data: {
      token,
      user: {
        user_id: toInt(user.user_id),
        full_name: String(user.full_name || ''),
        email: String(user.email || ''),
        role_key: String(selectedFarm.role_key || 'WORKER')
      },
      farm: {
        farm_id: toInt(selectedFarm.farm_id),
        name: String(selectedFarm.farm_name || ''),
        location: String(selectedFarm.farm_location || '')
      },
      memberships: memberships.map((row) => ({
        farm_id: toInt(row.farm_id),
        farm_name: String(row.farm_name || ''),
        role_key: String(row.role_key || '')
      })),
      modules
    }
  };
}

export async function fetchUserProfile(conn, { userId, farmId }) {
  const [users] = await conn.query(
    `SELECT user_id, full_name, email, is_active, created_at, updated_at
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  const user = users[0];
  if (!user || Number(user.is_active) !== 1) {
    return null;
  }

  const [farmRows] = await conn.query(
    `SELECT
        fu.farm_id,
        f.name AS farm_name,
        f.location AS farm_location,
        r.role_key,
        r.name AS role_name
     FROM farm_users fu
     INNER JOIN farms f ON f.farm_id = fu.farm_id
     INNER JOIN roles r ON r.role_id = fu.role_id
     WHERE fu.user_id = ? AND fu.farm_id = ? AND fu.is_active = 1
     LIMIT 1`,
    [userId, farmId]
  );

  const farm = farmRows[0];
  if (!farm) {
    return null;
  }

  const modules = await fetchUserModules(conn, { userId, farmId });
  const prefMap = {};
  let farmIconPath = '';

  try {
    const [prefRows] = await conn.query(
      `SELECT pref_key, value_json
       FROM ui_preferences
       WHERE user_id = ? AND farm_id = ? AND pref_key IN (${PROFILE_PREF_KEYS.map(() => '?').join(',')})`,
      [userId, farmId, ...PROFILE_PREF_KEYS]
    );

    for (const row of prefRows || []) {
      const key = String(row?.pref_key || '').trim();
      if (!key) continue;
      prefMap[key] = decodePreferenceValue(row?.value_json);
    }

    const [farmIconRows] = await conn.query(
      `SELECT value_json
       FROM ui_preferences
       WHERE farm_id = ? AND pref_key = 'farm_icon_path'
       ORDER BY updated_at DESC, preference_id DESC
       LIMIT 1`,
      [farmId]
    );
    farmIconPath = decodePreferenceValue(farmIconRows?.[0]?.value_json || '');
  } catch {
    farmIconPath = '';
  }

  farmIconPath = String(farmIconPath || '').replace(/^\/+/, '');
  if (!farmIconPath.startsWith('assets/uploads/')) {
    farmIconPath = '';
  }

  let avatarPath = String(prefMap.avatar_path || '').replace(/^\/+/, '');
  if (!avatarPath.startsWith('assets/uploads/')) {
    avatarPath = '';
  }

  let notificationRows = [];
  let notificationUnreadCount = 0;
  let messageUnreadCount = 0;
  let pendingTaskRows = [];

  try {
    const [notificationQueryRows] = await conn.query(
      `SELECT notification_id, notification_type, title, message, link_url, is_read, created_at
       FROM user_notifications
       WHERE farm_id = ? AND recipient_user_id = ?
       ORDER BY notification_id DESC
       LIMIT 8`,
      [farmId, userId]
    );
    notificationRows = notificationQueryRows || [];

    const [notificationCountRows] = await conn.query(
      `SELECT COUNT(*) AS unread_count
       FROM user_notifications
       WHERE farm_id = ? AND recipient_user_id = ? AND is_read = 0`,
      [farmId, userId]
    );
    notificationUnreadCount = toInt(notificationCountRows?.[0]?.unread_count || 0, 0);

    const [messageCountRows] = await conn.query(
      `SELECT COUNT(*) AS unread_count
       FROM user_messages
       WHERE farm_id = ? AND recipient_user_id = ? AND is_read = 0`,
      [farmId, userId]
    );
    messageUnreadCount = toInt(messageCountRows?.[0]?.unread_count || 0, 0);

    const [taskRows] = await conn.query(
      `SELECT task_id, module_key, title, priority, due_date, status
       FROM tasks
       WHERE farm_id = ? AND assigned_to = ? AND status IN ('PENDING', 'IN_PROGRESS')
       ORDER BY
         CASE priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
         COALESCE(due_date, '9999-12-31') ASC,
         task_id DESC
       LIMIT 40`,
      [farmId, userId]
    );
    pendingTaskRows = taskRows || [];
  } catch {
    notificationRows = [];
    notificationUnreadCount = 0;
    messageUnreadCount = 0;
    pendingTaskRows = [];
  }

  const textColorMode = ['balanced', 'high-contrast', 'soft'].includes(String(prefMap.text_color_mode || '').toLowerCase())
    ? String(prefMap.text_color_mode).toLowerCase()
    : 'balanced';
  const buttonStyle = ['default', 'pill', 'outline', 'soft'].includes(String(prefMap.button_style || '').toLowerCase())
    ? String(prefMap.button_style).toLowerCase()
    : 'default';
  const glowIntensity = ['subtle', 'medium', 'strong'].includes(String(prefMap.glow_intensity || '').toLowerCase())
    ? String(prefMap.glow_intensity).toLowerCase()
    : 'medium';
  const cardBorderSize = ['1', '2', '3'].includes(String(prefMap.card_border_size || ''))
    ? String(prefMap.card_border_size)
    : '1';
  const cardRadiusMode = ['compact', 'default', 'rounded', 'soft'].includes(String(prefMap.card_radius_mode || '').toLowerCase())
    ? String(prefMap.card_radius_mode).toLowerCase()
    : 'default';
  const sidebarCollapsed = String(prefMap.sidebar_collapsed || '') === '1';
  const glassEffect = String(prefMap.glass_effect || '1') === '0' ? '0' : '1';
  const footerHidden = String(prefMap.footer_hidden || '') === '1';
  const footerTextRaw = String(prefMap.footer_text || '').replace(/\s+/g, ' ').trim();
  const footerText = (footerTextRaw || `© ${new Date().getFullYear()} FarmSuite ERP`).slice(0, 160);
  const themeMode = normalizeThemeMode(prefMap.theme_mode);

  return {
    user: {
      user_id: toInt(user.user_id),
      full_name: String(user.full_name || ''),
      email: String(user.email || ''),
      role_key: String(farm.role_key || 'WORKER'),
      avatar_path: avatarPath,
      is_active: toInt(user.is_active, 0),
      created_at: user.created_at || null,
      updated_at: user.updated_at || null
    },
    farm: {
      farm_id: toInt(farm.farm_id),
      name: String(farm.farm_name || ''),
      location: String(farm.farm_location || ''),
      farm_icon_path: farmIconPath
    },
    modules,
    notifications: notificationRows,
    notification_unread_count: notificationUnreadCount,
    message_unread_count: messageUnreadCount,
    pending_tasks: pendingTaskRows,
    ui_preferences: {
      sidebar_collapsed: sidebarCollapsed,
      theme_mode: themeMode,
      glass_effect: glassEffect,
      text_color_mode: textColorMode,
      button_style: buttonStyle,
      glow_intensity: glowIntensity,
      card_border_size: cardBorderSize,
      card_radius_mode: cardRadiusMode,
      footer_hidden: footerHidden,
      footer_text: footerText
    }
  };
}

export async function fetchUserModules(conn, { userId, farmId }) {
  const [rows] = await conn.query(
    `SELECT
        m.module_key,
        m.name,
        m.icon,
        m.sort_order,
        m.is_active,
        COALESCE(fm.enabled, 0) AS farm_enabled,
        COALESCE(uma.can_view, NULL) AS user_can_view,
        COALESCE(uma.can_edit, NULL) AS user_can_edit,
        COALESCE(uma.can_approve, NULL) AS user_can_approve,
        COALESCE(uma.is_active, 0) AS user_access_active
     FROM modules m
     LEFT JOIN farm_modules fm
       ON fm.module_key = m.module_key
      AND fm.farm_id = ?
     LEFT JOIN user_module_access uma
       ON uma.farm_id = ?
      AND uma.user_id = ?
      AND uma.module_key = m.module_key
     WHERE m.is_active = 1
     ORDER BY m.sort_order ASC, m.name ASC`,
    [farmId, farmId, userId]
  );

  return rows
    .map((row) => {
      const farmEnabled = Number(row.farm_enabled) === 1;
      const hasUserAccess = Number(row.user_access_active) === 1;
      const canView = hasUserAccess ? Number(row.user_can_view || 0) : (farmEnabled ? 1 : 0);
      const canEdit = hasUserAccess ? Number(row.user_can_edit || 0) : 0;
      const canApprove = hasUserAccess ? Number(row.user_can_approve || 0) : 0;

      return {
        module_key: String(row.module_key || '').toUpperCase(),
        name: String(row.name || ''),
        icon: String(row.icon || 'fa-cube'),
        sort_order: toInt(row.sort_order),
        enabled: farmEnabled ? 1 : 0,
        can_view: canView,
        can_edit: canEdit,
        can_approve: canApprove
      };
    })
    .filter((row) => row.enabled === 1 && row.can_view === 1);
}

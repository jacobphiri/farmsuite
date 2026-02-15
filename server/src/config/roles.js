const ROLE_ORDER = [
  'SUPER_ADMIN',
  'TENANT',
  'OWNER',
  'ORG_ADMIN',
  'ADMIN',
  'FARM_ADMIN',
  'FARM_MANAGER',
  'OPERATOR',
  'WORKER',
  'FEEDER',
  'GENERAL'
];

const ROLE_RANK = ROLE_ORDER.reduce((acc, roleKey, idx) => {
  acc[roleKey] = ROLE_ORDER.length - idx;
  return acc;
}, {});

function normalizeRole(roleKey) {
  const key = String(roleKey || '').trim().toUpperCase();
  if (!key) return 'GENERAL';
  if (key === 'GENERAL WORKER') return 'GENERAL';
  return key;
}

export function roleRank(roleKey) {
  const normalized = normalizeRole(roleKey);
  return Number(ROLE_RANK[normalized] || 0);
}

export function hasAtLeast(roleKey, minimumRole) {
  return roleRank(roleKey) >= roleRank(minimumRole);
}

export function canCreateFarms(roleKey) {
  const normalized = normalizeRole(roleKey);
  return ['SUPER_ADMIN', 'TENANT', 'OWNER', 'ORG_ADMIN'].includes(normalized);
}

export function canManageMemberships(roleKey) {
  const normalized = normalizeRole(roleKey);
  return ['SUPER_ADMIN', 'TENANT', 'OWNER', 'ORG_ADMIN', 'ADMIN', 'FARM_ADMIN'].includes(normalized);
}

export function canDeleteRecords(roleKey) {
  return hasAtLeast(roleKey, 'ADMIN');
}

export function canWriteRecords(roleKey) {
  return hasAtLeast(roleKey, 'OPERATOR');
}

export function canReadRecords(roleKey) {
  return hasAtLeast(roleKey, 'GENERAL');
}

export function canAssignRole({ actorRole, targetRole }) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);

  if (['SUPER_ADMIN', 'TENANT'].includes(actor)) {
    return true;
  }

  return roleRank(actor) > roleRank(target);
}

export function roleModel() {
  return ROLE_ORDER.map((role, idx) => ({
    role_key: role,
    position: idx + 1,
    rank: roleRank(role),
    can_create_farms: canCreateFarms(role),
    can_manage_memberships: canManageMemberships(role),
    can_delete: canDeleteRecords(role)
  }));
}

export function normalizeRoleKey(roleKey) {
  return normalizeRole(roleKey);
}

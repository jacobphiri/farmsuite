import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  createFarm,
  createFarmUser,
  getAlerts,
  getAuditLogs,
  getFarmPortfolio,
  getFarmUsers,
  getHierarchy,
  getModuleConfig,
  getNotificationConfigs,
  getRoles,
  getSettingsModules,
  getSyncConfig,
  getSyncStatus,
  getSystemConfigs,
  getUiPreferences,
  getUsers,
  pullSyncSnapshots,
  resetFarmUserPassword,
  resolveAlert,
  runSync,
  saveCurrencyConfig,
  saveModuleConfig,
  saveNotificationConfig,
  saveSettingsModules,
  saveSyncConfig,
  saveSystemConfig,
  saveTheming,
  saveUiPreferences,
  updateMembership,
  uploadFarmIcon
} from '../api/endpoints.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const SETTINGS_TABS = [
  { to: '/settings', label: 'Overview', key: 'overview' },
  { to: '/settings/users', label: 'Users', key: 'users' },
  { to: '/settings/theming', label: 'Theming', key: 'theming' },
  { to: '/settings/roles', label: 'Roles', key: 'roles' },
  { to: '/settings/farm-settings', label: 'Farm Settings', key: 'farm-settings' },
  { to: '/settings/module-config', label: 'Module Config', key: 'module-config' },
  { to: '/settings/system-config', label: 'System Config', key: 'system-config' },
  { to: '/settings/sync', label: 'Sync', key: 'sync' },
  { to: '/settings/backup', label: 'Backup', key: 'backup' }
];

function toAssetUrl(path) {
  const clean = String(path || '').trim().replace(/^\/+/, '');
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (typeof window === 'undefined') return `/${clean}`;
  return `${window.location.protocol}//${window.location.hostname}/${clean}`;
}

function initialsFromName(name) {
  const chunks = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!chunks.length) return 'U';
  return chunks.slice(0, 2).map((item) => item[0]?.toUpperCase() || '').join('');
}

function sortByName(items) {
  return [...(items || [])].sort((a, b) => String(a?.full_name || '').localeCompare(String(b?.full_name || '')));
}

async function safeCall(call, fallback = null) {
  try {
    const response = await call();
    return response?.ok ? response : fallback;
  } catch {
    return fallback;
  }
}

function SettingsPage({ section = 'overview' }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [farmSizeOptions, setFarmSizeOptions] = useState([0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500]);
  const [farmUnitOptions, setFarmUnitOptions] = useState(['acre', 'hectare']);

  const [roles, setRoles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [farmUsers, setFarmUsers] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState(new Set());
  const [alerts, setAlerts] = useState([]);
  const [systemConfigs, setSystemConfigs] = useState([]);
  const [notificationConfigs, setNotificationConfigs] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncPolicy, setSyncPolicy] = useState({
    sync_mode: 'bidirectional',
    sync_interval_seconds: 30,
    sync_batch_size: 15,
    sync_auto_enabled: true,
    sync_wifi_only: false
  });
  const [moduleConfigSchema, setModuleConfigSchema] = useState({});
  const [moduleConfigValues, setModuleConfigValues] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);

  const [farmForm, setFarmForm] = useState({ name: '', location: '', size: '1', unit: 'acre' });
  const [uiForm, setUiForm] = useState({
    sidebar_collapsed: false,
    last_module: 'dashboard',
    footer_hidden: false,
    footer_text: `© ${new Date().getFullYear()} FarmSuite ERP`
  });
  const [themeForm, setThemeForm] = useState({
    theme_mode: 'light',
    text_color_mode: 'balanced',
    button_style: 'default',
    glow_intensity: 'medium',
    card_border_size: '1',
    card_radius_mode: 'default',
    glass_effect: true
  });
  const [farmIconForm, setFarmIconForm] = useState({
    farm_icon_file: null,
    remove_farm_icon: false
  });

  const [createUserForm, setCreateUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: ''
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    user_id: '',
    password: ''
  });
  const [currencyForm, setCurrencyForm] = useState({
    currency_code: 'USD',
    currency_position: 'BEFORE'
  });
  const [systemConfigForm, setSystemConfigForm] = useState({
    config_key: '',
    config_value: ''
  });
  const [notificationForm, setNotificationForm] = useState({
    user_id: '',
    alert_type: 'GENERAL',
    channel: 'IN_APP',
    threshold_value: '',
    is_enabled: true
  });

  const farmIconUrl = useMemo(() => toAssetUrl(auth.bootstrap?.profile?.farm?.farm_icon_path || ''), [auth.bootstrap?.profile?.farm?.farm_icon_path]);
  const unresolvedAlerts = useMemo(
    () => (alerts || []).filter((row) => !row?.resolved_at),
    [alerts]
  );
  const roleOptions = useMemo(() => roles || [], [roles]);
  const activeSection = section || 'overview';
  const isOverviewLike = activeSection === 'overview' || activeSection === 'farm-settings';
  const configMap = useMemo(() => {
    const map = {};
    for (const row of systemConfigs || []) {
      map[String(row?.config_key || '')] = String(row?.config_value || '');
    }
    return map;
  }, [systemConfigs]);

  async function refreshBootstrapContext() {
    try {
      await auth.refreshBootstrap();
    } catch {
      // Ignore post-save refresh failures.
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [
        hierarchyRes,
        rolesRes,
        usersRes,
        farmUsersRes,
        portfolioRes,
        modulesRes,
        uiRes,
        alertsRes,
        configsRes,
        notificationRes,
        syncConfigRes,
        moduleConfigRes,
        auditRes,
        syncStatusRes
      ] = await Promise.all([
        safeCall(() => getHierarchy(), {}),
        safeCall(() => getRoles(), {}),
        safeCall(() => getUsers(), {}),
        safeCall(() => getFarmUsers(), {}),
        safeCall(() => getFarmPortfolio(), {}),
        safeCall(() => getSettingsModules(), {}),
        safeCall(() => getUiPreferences(), {}),
        safeCall(() => getAlerts(), {}),
        safeCall(() => getSystemConfigs(), {}),
        safeCall(() => getNotificationConfigs(), {}),
        safeCall(() => getSyncConfig(), {}),
        safeCall(() => getModuleConfig(), {}),
        safeCall(() => getAuditLogs({ limit: 120 }), {}),
        safeCall(() => getSyncStatus(), {})
      ]);

      const sizeOptions = hierarchyRes?.farm_size_options || [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500];
      const unitOptions = hierarchyRes?.farm_unit_options || ['acre', 'hectare'];
      setFarmSizeOptions(sizeOptions);
      setFarmUnitOptions(unitOptions);
      setRoles(rolesRes?.roles || []);
      setAllUsers(usersRes?.users || []);
      setFarmUsers(sortByName(farmUsersRes?.users || []));
      setPortfolio(portfolioRes?.memberships || []);
      setModules(modulesRes?.modules || []);
      setSelectedModules(new Set((modulesRes?.modules || []).filter((item) => Number(item?.enabled || 0) === 1).map((item) => String(item?.module_key || '').toUpperCase())));
      setAlerts(alertsRes?.alerts || []);
      setSystemConfigs(configsRes?.configs || []);
      setNotificationConfigs(notificationRes?.notification_configs || []);
      setSyncStatus(syncStatusRes || null);
      setAuditLogs(auditRes?.logs || []);

      const prefs = uiRes?.preferences || {};
      setUiForm({
        sidebar_collapsed: String(prefs.sidebar_collapsed || '0') === '1',
        last_module: String(prefs.last_module || 'dashboard'),
        footer_hidden: String(prefs.footer_hidden || '0') === '1',
        footer_text: String(prefs.footer_text || `© ${new Date().getFullYear()} FarmSuite ERP`)
      });
      setThemeForm({
        theme_mode: String(prefs.theme_mode || 'light'),
        text_color_mode: String(prefs.text_color_mode || 'balanced'),
        button_style: String(prefs.button_style || 'default'),
        glow_intensity: String(prefs.glow_intensity || 'medium'),
        card_border_size: String(prefs.card_border_size || '1'),
        card_radius_mode: String(prefs.card_radius_mode || 'default'),
        glass_effect: String(prefs.glass_effect || '1') === '1'
      });

      const syncCfg = syncConfigRes?.sync_config || {};
      setSyncPolicy({
        sync_mode: String(syncCfg.mode || 'bidirectional'),
        sync_interval_seconds: Number(syncCfg.interval_seconds || 30),
        sync_batch_size: Number(syncCfg.batch_size || 15),
        sync_auto_enabled: String(syncCfg.auto_enabled || '1') === '1',
        sync_wifi_only: String(syncCfg.wifi_only || '0') === '1'
      });

      setModuleConfigSchema(moduleConfigRes?.schema || {});
      setModuleConfigValues(moduleConfigRes?.values || {});

      setCurrencyForm({
        currency_code: String(configsRes?.configs?.find((row) => row.config_key === 'currency_code')?.config_value || 'USD').toUpperCase(),
        currency_position: String(configsRes?.configs?.find((row) => row.config_key === 'currency_position')?.config_value || 'BEFORE').toUpperCase()
      });

      setNotificationForm((prev) => ({
        ...prev,
        user_id: prev.user_id || String((farmUsersRes?.users || [])[0]?.user_id || '')
      }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  const runAction = async (action, successMessage, refreshBootstrap = false) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await action();
      if (!response?.ok) throw new Error(response?.message || 'Action failed.');
      if (successMessage) setNotice(successMessage);
      await loadData();
      if (refreshBootstrap) await refreshBootstrapContext();
      return response;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Action failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submitModules = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveSettingsModules({ modules: [...selectedModules] }),
      'Module access updated.',
      true
    );
  };

  const submitFarm = async (event) => {
    event.preventDefault();
    await runAction(
      () => createFarm(farmForm),
      'Farm created successfully.',
      true
    );
    setFarmForm({ name: '', location: '', size: '1', unit: 'acre' });
  };

  const submitFarmIcon = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    if (farmIconForm.farm_icon_file) formData.append('farm_icon_file', farmIconForm.farm_icon_file);
    if (farmIconForm.remove_farm_icon) formData.append('remove_farm_icon', '1');

    await runAction(
      () => uploadFarmIcon(formData),
      'Farm icon updated.',
      true
    );
    setFarmIconForm({ farm_icon_file: null, remove_farm_icon: false });
  };

  const submitUi = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveUiPreferences(uiForm),
      'UI preferences saved.',
      true
    );
  };

  const submitTheme = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveTheming(themeForm),
      'Theming saved.',
      true
    );
  };

  const submitCreateUser = async (event) => {
    event.preventDefault();
    await runAction(
      () => createFarmUser({
        ...createUserForm,
        role_id: Number(createUserForm.role_id)
      }),
      'User created.'
    );
    setCreateUserForm({ full_name: '', email: '', password: '', role_id: '' });
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    await runAction(
      () => resetFarmUserPassword({
        user_id: Number(resetPasswordForm.user_id),
        password: resetPasswordForm.password
      }),
      'User password updated.'
    );
    setResetPasswordForm((prev) => ({ ...prev, password: '' }));
  };

  const submitCurrency = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveCurrencyConfig(currencyForm),
      'Currency settings updated.'
    );
  };

  const submitSystemConfig = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveSystemConfig(systemConfigForm),
      'System config saved.'
    );
    setSystemConfigForm({ config_key: '', config_value: '' });
  };

  const submitNotificationRule = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveNotificationConfig({
        ...notificationForm,
        user_id: Number(notificationForm.user_id)
      }),
      'Notification rule saved.'
    );
  };

  const submitSyncPolicy = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveSyncConfig(syncPolicy),
      'Sync settings updated.'
    );
  };

  const submitModuleConfig = async (event) => {
    event.preventDefault();
    await runAction(
      () => saveModuleConfig({ module_config: moduleConfigValues }),
      'Module configuration updated.'
    );
  };

  const handleResolveAlert = async (alertId) => {
    await runAction(
      () => resolveAlert(alertId),
      'Alert resolved.'
    );
  };

  const handlePushOutbox = async () => {
    await runAction(
      () => runSync(120),
      'Sync push completed.'
    );
  };

  const handlePullSnapshots = async () => {
    await runAction(
      () => pullSyncSnapshots({ page_size: 100 }),
      'Snapshots pulled.'
    );
  };

  const toggleMembershipActive = async (row) => {
    await runAction(
      () => updateMembership(row.farm_user_id, { is_active: Number(row.is_active) ? 0 : 1 }),
      'Membership updated.',
      true
    );
  };

  const updateModuleConfigValue = (moduleKey, fieldKey, value) => {
    setModuleConfigValues((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [fieldKey]: value
      }
    }));
  };

  return (
    <div className="vstack gap-3">
      <div>
        <h3 className="mb-0">System Settings</h3>
        <div className="text-secondary">Users, roles, module access, alerts, notifications, and system configuration</div>
      </div>

      <ul className="nav nav-pills mb-0 gap-2">
        {SETTINGS_TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <NavLink end={tab.to === '/settings'} to={tab.to} className="nav-link">
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {error ? <div className="alert alert-danger py-2 mb-0">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2 mb-0">{notice}</div> : null}

      {isOverviewLike ? (
        <>
          <div className="row g-3 mb-0">
            <div className="col-lg-7">
              <div className="card">
                <div className="card-header">Farm Modules</div>
                <div className="card-body">
                  <form onSubmit={submitModules}>
                    <div className="row g-2">
                      {(modules || []).map((moduleRow) => {
                        const moduleKey = String(moduleRow.module_key || '').toUpperCase();
                        const checked = selectedModules.has(moduleKey);
                        return (
                          <div className="col-md-6" key={moduleKey}>
                            <label className="d-flex align-items-center gap-2 p-2 border rounded">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setSelectedModules((prev) => {
                                    const next = new Set(prev);
                                    if (event.target.checked) next.add(moduleKey);
                                    else next.delete(moduleKey);
                                    return next;
                                  });
                                }}
                              />
                              <span>{String(moduleRow.name || moduleKey)} ({moduleKey})</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 d-flex justify-content-end">
                      <button className="btn btn-primary" disabled={busy || loading}>Save Modules</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card mb-3">
                <div className="card-header">Farm Portfolio</div>
                <div className="card-body">
                  {!portfolio.length ? (
                    <div className="text-secondary">No active farms linked to your account.</div>
                  ) : (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Farm</th>
                            <th>Role</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.map((row) => (
                            <tr key={row.farm_user_id}>
                              <td>
                                <div className="fw-semibold">{String(row.farm_name || 'Farm')}</div>
                                <div className="small text-secondary">{String(row.location || '')}</div>
                              </td>
                              <td><span className="badge text-bg-secondary">{String(row.role_key || '')}</span></td>
                              <td className="text-end">
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleMembershipActive(row)} disabled={busy}>
                                  {Number(row.is_active) ? 'Disable' : 'Enable'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <form className="vstack gap-2" onSubmit={submitFarm}>
                    <div className="small text-secondary">Create a new farm and keep operations isolated by farm context.</div>
                    <input className="form-control" placeholder="Farm name" value={farmForm.name} onChange={(event) => setFarmForm((prev) => ({ ...prev, name: event.target.value }))} required />
                    <input className="form-control" placeholder="Location (optional)" value={farmForm.location} onChange={(event) => setFarmForm((prev) => ({ ...prev, location: event.target.value }))} />
                    <div className="row g-2">
                      <div className="col-6">
                        <select className="form-select" value={farmForm.size} onChange={(event) => setFarmForm((prev) => ({ ...prev, size: event.target.value }))} required>
                          {farmSizeOptions.map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <select className="form-select" value={farmForm.unit} onChange={(event) => setFarmForm((prev) => ({ ...prev, unit: event.target.value }))} required>
                          {farmUnitOptions.map((unit) => (
                            <option key={unit} value={unit}>{unit === 'hectare' ? 'Hectares' : 'Acres'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary" disabled={busy || loading}>Add Farm</button>
                  </form>
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header">Farm Branding</div>
                <div className="card-body">
                  <form className="vstack gap-2" onSubmit={submitFarmIcon}>
                    {farmIconUrl ? (
                      <div className="d-flex align-items-center gap-2">
                        <img src={farmIconUrl} alt="Farm icon" width={56} height={56} className="rounded border" />
                        <div className="small text-secondary">Current icon used by web sidebar and mobile toolbar.</div>
                      </div>
                    ) : (
                      <div className="small text-secondary">No farm icon uploaded. A default icon is currently used.</div>
                    )}
                    <input className="form-control" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setFarmIconForm((prev) => ({ ...prev, farm_icon_file: event.target.files?.[0] || null }))} />
                    <label className="form-check-label d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" checked={farmIconForm.remove_farm_icon} onChange={(event) => setFarmIconForm((prev) => ({ ...prev, remove_farm_icon: event.target.checked }))} />
                      Remove current farm icon
                    </label>
                    <button className="btn btn-primary" disabled={busy || loading}>Save Farm Icon</button>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header">UI Preferences</div>
                <div className="card-body">
                  <form className="vstack gap-3" onSubmit={submitUi}>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="sidebar_collapsed" checked={uiForm.sidebar_collapsed} onChange={(event) => setUiForm((prev) => ({ ...prev, sidebar_collapsed: event.target.checked }))} />
                      <label className="form-check-label" htmlFor="sidebar_collapsed">Collapse sidebar by default</label>
                    </div>
                    <div>
                      <label className="form-label">Last module</label>
                      <select className="form-select" value={uiForm.last_module} onChange={(event) => setUiForm((prev) => ({ ...prev, last_module: event.target.value }))}>
                        <option value="dashboard">Dashboard</option>
                        {(modules || []).map((moduleRow) => {
                          const rawKey = String(moduleRow.module_key || '').toLowerCase();
                          const routeKey = rawKey === 'hr_access' ? 'hr-access' : rawKey;
                          return (
                            <option key={moduleRow.module_key} value={routeKey}>
                              {String(moduleRow.name || routeKey)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="footer_hidden" checked={uiForm.footer_hidden} onChange={(event) => setUiForm((prev) => ({ ...prev, footer_hidden: event.target.checked }))} />
                      <label className="form-check-label" htmlFor="footer_hidden">Hide footer</label>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="footer_text">Footer text</label>
                      <input id="footer_text" className="form-control" maxLength={160} value={uiForm.footer_text} onChange={(event) => setUiForm((prev) => ({ ...prev, footer_text: event.target.value }))} placeholder="Footer text" />
                    </div>
                    <div className="small text-secondary">Theme colors and button styles are in the Theming tab.</div>
                    <button className="btn btn-primary" disabled={busy || loading}>Save Preferences</button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Open Alerts</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!unresolvedAlerts.length ? (
                      <tr><td colSpan={5} className="text-secondary">No unresolved alerts.</td></tr>
                    ) : unresolvedAlerts.map((alert) => (
                      <tr key={alert.alert_id}>
                        <td>{String(alert.created_at || '-')}</td>
                        <td>{String(alert.alert_type || '-')}</td>
                        <td>{String(alert.title || '-')}</td>
                        <td>{String(alert.description || '-')}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleResolveAlert(alert.alert_id)} disabled={busy}>Resolve</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeSection === 'users' ? (
        <div className="row g-3">
          <div className="col-lg-7">
            <div className="card">
              <div className="card-header">Farm Users</div>
              <div className="card-body">
                {!farmUsers.length ? (
                  <div className="text-secondary">No farm users available.</div>
                ) : (
                  <div className="row g-3">
                    {farmUsers.map((farmUser) => {
                      const avatarUrl = toAssetUrl(farmUser?.avatar_path || '');
                      const userName = String(farmUser?.full_name || 'User');
                      return (
                        <div className="col-xl-6" key={farmUser.farm_user_id}>
                          <div className="border rounded-3 p-3 h-100">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="user-avatar user-avatar-md">
                                  {avatarUrl ? <img className="avatar-img" src={avatarUrl} alt={userName} /> : <span className="avatar-initials">{initialsFromName(userName)}</span>}
                                </span>
                                <div>
                                  <div className="fw-semibold">{userName}</div>
                                  <div className="small text-secondary">{String(farmUser.email || '')}</div>
                                </div>
                              </div>
                              <span className={`badge ${Number(farmUser.farm_user_active) === 1 ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                {Number(farmUser.farm_user_active) === 1 ? 'Access Granted' : 'Access Revoked'}
                              </span>
                            </div>
                            <div className="small mt-2">
                              <span className="text-secondary">Role:</span> {String(farmUser.role_name || farmUser.role_key || '-')}<br />
                              <span className="text-secondary">Account:</span> {Number(farmUser.is_active) === 1 ? 'Active' : 'Inactive'}
                            </div>
                            <div className="mt-3 d-flex justify-content-end">
                              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setResetPasswordForm({ user_id: String(farmUser.user_id), password: '' })}>
                                Reset Password
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card mb-3">
              <div className="card-header">Add User</div>
              <div className="card-body">
                <form className="vstack gap-2" onSubmit={submitCreateUser}>
                  <input className="form-control" placeholder="Full name" value={createUserForm.full_name} onChange={(event) => setCreateUserForm((prev) => ({ ...prev, full_name: event.target.value }))} required />
                  <input className="form-control" type="email" placeholder="Email" value={createUserForm.email} onChange={(event) => setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))} required />
                  <input className="form-control" type="password" placeholder="Temporary password" value={createUserForm.password} onChange={(event) => setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))} required />
                  <select className="form-select" value={createUserForm.role_id} onChange={(event) => setCreateUserForm((prev) => ({ ...prev, role_id: event.target.value }))} required>
                    <option value="">Select role</option>
                    {roleOptions.map((role) => (
                      <option key={role.role_id} value={role.role_id}>{String(role.name || role.role_key)} ({String(role.role_key || '')})</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" disabled={busy || loading}>Create User</button>
                </form>
              </div>
            </div>
            <div className="card">
              <div className="card-header">Reset User Password</div>
              <div className="card-body">
                <form className="vstack gap-2" onSubmit={submitResetPassword}>
                  <select className="form-select" value={resetPasswordForm.user_id} onChange={(event) => setResetPasswordForm((prev) => ({ ...prev, user_id: event.target.value }))} required>
                    <option value="">Select user</option>
                    {farmUsers.map((user) => (
                      <option key={user.user_id} value={user.user_id}>{String(user.full_name || '')} ({String(user.email || '')})</option>
                    ))}
                  </select>
                  <input className="form-control" type="password" placeholder="New password" value={resetPasswordForm.password} onChange={(event) => setResetPasswordForm((prev) => ({ ...prev, password: event.target.value }))} required />
                  <button className="btn btn-primary" disabled={busy || loading}>Update Password</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'roles' ? (
        <div className="card">
          <div className="card-header">Roles Directory</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Role Key</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {!roles.length ? (
                    <tr><td colSpan={2} className="text-secondary">No roles configured.</td></tr>
                  ) : roles.map((role) => (
                    <tr key={role.role_id}>
                      <td>{String(role.role_key || '')}</td>
                      <td>{String(role.name || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'theming' ? (
        <div className="card">
          <div className="card-header">Theming</div>
          <div className="card-body">
            <form className="row g-3" onSubmit={submitTheme}>
              <div className="col-md-6">
                <label className="form-label">Theme Palette</label>
                <select className="form-select" value={themeForm.theme_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, theme_mode: event.target.value }))}>
                  <option value="light">Light (Default)</option>
                  <option value="neon">Dark Neon</option>
                  <option value="forest-light">Forest Light</option>
                  <option value="forest-dark">Forest Dark</option>
                  <option value="sunrise">Sunrise</option>
                  <option value="cobalt">Cobalt Night</option>
                  <option value="ember">Ember Dusk</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Text Color Mode</label>
                <select className="form-select" value={themeForm.text_color_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, text_color_mode: event.target.value }))}>
                  <option value="balanced">Balanced</option>
                  <option value="high-contrast">High Contrast</option>
                  <option value="soft">Soft</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Style</label>
                <select className="form-select" value={themeForm.button_style} onChange={(event) => setThemeForm((prev) => ({ ...prev, button_style: event.target.value }))}>
                  <option value="default">Default</option>
                  <option value="pill">Pill</option>
                  <option value="outline">Outline</option>
                  <option value="soft">Soft</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Glow Intensity (Neon)</label>
                <select className="form-select" value={themeForm.glow_intensity} onChange={(event) => setThemeForm((prev) => ({ ...prev, glow_intensity: event.target.value }))}>
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Card Border Size</label>
                <select className="form-select" value={themeForm.card_border_size} onChange={(event) => setThemeForm((prev) => ({ ...prev, card_border_size: event.target.value }))}>
                  <option value="1">1px (Default)</option>
                  <option value="2">2px</option>
                  <option value="3">3px</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Card Corner Radius</label>
                <select className="form-select" value={themeForm.card_radius_mode} onChange={(event) => setThemeForm((prev) => ({ ...prev, card_radius_mode: event.target.value }))}>
                  <option value="compact">Compact</option>
                  <option value="default">Default</option>
                  <option value="rounded">Rounded</option>
                  <option value="soft">Soft</option>
                </select>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" checked={themeForm.glass_effect} onChange={(event) => setThemeForm((prev) => ({ ...prev, glass_effect: event.target.checked }))} id="theming_glass_effect" />
                  <label className="form-check-label" htmlFor="theming_glass_effect">Enable glass effects (blur/translucency)</label>
                </div>
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-primary" disabled={busy || loading}>Save Theming</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeSection === 'module-config' ? (
        <div className="card">
          <div className="card-header">Granular Module Configuration</div>
          <div className="card-body">
            <form className="vstack gap-3" onSubmit={submitModuleConfig}>
              {!Object.keys(moduleConfigSchema || {}).length ? (
                <div className="text-secondary">No module configuration schema available.</div>
              ) : Object.entries(moduleConfigSchema).map(([moduleKey, moduleCfg]) => (
                <div className="border rounded p-3" key={moduleKey}>
                  <div className="fw-semibold mb-2">{String(moduleCfg.label || moduleKey)} ({moduleKey})</div>
                  <div className="row g-2">
                    {Object.entries(moduleCfg.fields || {}).map(([fieldKey, fieldCfg]) => {
                      const fieldType = String(fieldCfg.type || 'select');
                      const fieldValue = String(moduleConfigValues?.[moduleKey]?.[fieldKey] ?? fieldCfg.default ?? '');
                      return (
                        <div className="col-md-6" key={`${moduleKey}-${fieldKey}`}>
                          <label className="form-label">{String(fieldCfg.label || fieldKey)}</label>
                          {fieldType === 'number' ? (
                            <input
                              className="form-control"
                              type="number"
                              value={fieldValue}
                              min={fieldCfg.min}
                              max={fieldCfg.max}
                              step={fieldCfg.step}
                              onChange={(event) => updateModuleConfigValue(moduleKey, fieldKey, event.target.value)}
                            />
                          ) : fieldType === 'text' ? (
                            <input
                              className="form-control"
                              type="text"
                              value={fieldValue}
                              placeholder={String(fieldCfg.placeholder || '')}
                              onChange={(event) => updateModuleConfigValue(moduleKey, fieldKey, event.target.value)}
                            />
                          ) : (
                            <select className="form-select" value={fieldValue} onChange={(event) => updateModuleConfigValue(moduleKey, fieldKey, event.target.value)}>
                              {Object.entries(fieldCfg.options || {}).map(([optionKey, optionLabel]) => (
                                <option key={optionKey} value={optionKey}>{String(optionLabel)}</option>
                              ))}
                            </select>
                          )}
                          {fieldCfg.help ? <div className="small text-secondary mt-1">{String(fieldCfg.help)}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="small text-secondary">These defaults are used by module forms so users select values instead of typing repeatedly.</div>
              <div className="d-flex justify-content-end">
                <button className="btn btn-primary" disabled={busy || loading}>Save Module Config</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeSection === 'system-config' ? (
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card h-100">
              <div className="card-header">System Config Values</div>
              <div className="card-body">
                {!systemConfigs.length ? (
                  <div className="text-secondary">No configs saved.</div>
                ) : (
                  <div className="vstack gap-2">
                    {systemConfigs.map((cfg) => (
                      <div className="border rounded-3 p-3" key={cfg.config_id}>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <div className="fw-semibold">{String(cfg.config_key || '')}</div>
                            <div className="small text-secondary text-break">{String(cfg.config_value || '')}</div>
                          </div>
                          <div className="small text-secondary">{String(cfg.updated_at || '')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card-body border-top border-secondary-subtle">
                <form className="row g-2 mb-3" onSubmit={submitCurrency}>
                  <div className="col-md-6">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={currencyForm.currency_code} onChange={(event) => setCurrencyForm((prev) => ({ ...prev, currency_code: event.target.value }))}>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="ZMW">Zambian Kwacha (ZMW)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                      <option value="KES">Kenyan Shilling (KES)</option>
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="ZAR">South African Rand (ZAR)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Symbol Position</label>
                    <select className="form-select" value={currencyForm.currency_position} onChange={(event) => setCurrencyForm((prev) => ({ ...prev, currency_position: event.target.value }))}>
                      <option value="BEFORE">Before amount</option>
                      <option value="AFTER">After amount</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary btn-sm" disabled={busy || loading}>Save Currency</button>
                  </div>
                </form>

                <form className="row g-2" onSubmit={submitSystemConfig}>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="config_key" value={systemConfigForm.config_key} onChange={(event) => setSystemConfigForm((prev) => ({ ...prev, config_key: event.target.value }))} required />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="config_value" value={systemConfigForm.config_value} onChange={(event) => setSystemConfigForm((prev) => ({ ...prev, config_value: event.target.value }))} />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary btn-sm" disabled={busy || loading}>Save Config</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card h-100">
              <div className="card-header">Notification Rules</div>
              <div className="card-body">
                {!notificationConfigs.length ? (
                  <div className="text-secondary">No notification rules.</div>
                ) : (
                  <div className="vstack gap-2">
                    {notificationConfigs.map((cfg) => (
                      <div className="border rounded-3 p-3" key={cfg.notification_config_id}>
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <div className="fw-semibold">{String(cfg.full_name || 'User')}</div>
                          <span className={`badge ${Number(cfg.is_enabled) === 1 ? 'text-bg-success' : 'text-bg-secondary'}`}>
                            {Number(cfg.is_enabled) === 1 ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="small">
                          <span className="text-secondary">Alert Type:</span> {String(cfg.alert_type || '')}<br />
                          <span className="text-secondary">Channel:</span> {String(cfg.channel || '')}<br />
                          <span className="text-secondary">Threshold:</span> {String(cfg.threshold_value ?? '-')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card-body border-top border-secondary-subtle">
                <form className="row g-2" onSubmit={submitNotificationRule}>
                  <div className="col-md-4">
                    <select className="form-select" value={notificationForm.user_id} onChange={(event) => setNotificationForm((prev) => ({ ...prev, user_id: event.target.value }))} required>
                      <option value="">Select user</option>
                      {(allUsers || []).map((u) => (
                        <option key={u.user_id} value={u.user_id}>{String(u.full_name || '')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <input className="form-control" placeholder="Alert type" value={notificationForm.alert_type} onChange={(event) => setNotificationForm((prev) => ({ ...prev, alert_type: event.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <select className="form-select" value={notificationForm.channel} onChange={(event) => setNotificationForm((prev) => ({ ...prev, channel: event.target.value }))}>
                      <option value="IN_APP">IN_APP</option>
                      <option value="EMAIL">EMAIL</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <input className="form-control" type="number" step="0.01" placeholder="Threshold" value={notificationForm.threshold_value} onChange={(event) => setNotificationForm((prev) => ({ ...prev, threshold_value: event.target.value }))} />
                  </div>
                  <div className="col-md-4 d-flex align-items-center">
                    <label className="form-check-label d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" checked={notificationForm.is_enabled} onChange={(event) => setNotificationForm((prev) => ({ ...prev, is_enabled: event.target.checked }))} />
                      Enabled
                    </label>
                  </div>
                  <div className="col-md-4">
                    <button className="btn btn-primary btn-sm w-100" disabled={busy || loading}>Save Rule</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'sync' ? (
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header">Mobile Sync Policy</div>
              <div className="card-body">
                <div className="small text-secondary mb-3">Configure how mobile clients mirror data locally and synchronize updates back to the server.</div>
                <form className="row g-3" onSubmit={submitSyncPolicy}>
                  <div className="col-md-6">
                    <label className="form-label">Sync Mode</label>
                    <select className="form-select" value={syncPolicy.sync_mode} onChange={(event) => setSyncPolicy((prev) => ({ ...prev, sync_mode: event.target.value }))}>
                      <option value="bidirectional">Bidirectional (pull + push)</option>
                      <option value="pull">Pull only (server to app)</option>
                      <option value="push">Push only (app to server)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Auto Sync Interval (seconds)</label>
                    <input className="form-control" type="number" min="10" max="3600" value={syncPolicy.sync_interval_seconds} onChange={(event) => setSyncPolicy((prev) => ({ ...prev, sync_interval_seconds: Number(event.target.value || 30) }))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Push Batch Size</label>
                    <input className="form-control" type="number" min="1" max="200" value={syncPolicy.sync_batch_size} onChange={(event) => setSyncPolicy((prev) => ({ ...prev, sync_batch_size: Number(event.target.value || 15) }))} required />
                  </div>
                  <div className="col-md-6 d-flex flex-column justify-content-center gap-2">
                    <label className="form-check-label d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" checked={syncPolicy.sync_auto_enabled} onChange={(event) => setSyncPolicy((prev) => ({ ...prev, sync_auto_enabled: event.target.checked }))} />
                      Enable auto-sync on mobile
                    </label>
                    <label className="form-check-label d-flex align-items-center gap-2">
                      <input className="form-check-input" type="checkbox" checked={syncPolicy.sync_wifi_only} onChange={(event) => setSyncPolicy((prev) => ({ ...prev, sync_wifi_only: event.target.checked }))} />
                      Prefer Wi-Fi only synchronization
                    </label>
                  </div>
                  <div className="col-12 d-flex align-items-center justify-content-between">
                    <div className="small text-secondary">
                      {configMap.sync_last_sync_at ? `Last recorded sync: ${configMap.sync_last_sync_at}` : 'No sync timestamp recorded yet.'}
                    </div>
                    <button className="btn btn-primary" disabled={busy || loading}>Save Sync Settings</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header">Sync Engine</div>
              <div className="card-body">
                <div className="small text-secondary mb-2">MySQL: {syncStatus?.mysql_available ? 'Online' : 'Offline'}</div>
                <div className="small text-secondary mb-1">Outbox pending: {syncStatus?.outbox?.pendingCount || 0}</div>
                <div className="small text-secondary mb-1">Outbox failed: {syncStatus?.outbox?.failedCount || 0}</div>
                <div className="small text-secondary mb-1">Local list snapshots: {syncStatus?.local_cache?.entity_list_snapshot_count || 0}</div>
                <div className="small text-secondary mb-3">Local record snapshots: {syncStatus?.local_cache?.entity_record_snapshot_count || 0}</div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={handlePushOutbox} disabled={busy || loading}>Push Outbox</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={handlePullSnapshots} disabled={busy || loading}>Pull Snapshots</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'backup' ? (
        <>
          <div className="card mb-0">
            <div className="card-header">Backup & Restore</div>
            <div className="card-body">
              <p className="mb-2">Use built-in export endpoints for operational data and database-level snapshots for full backup.</p>
              <ul className="mb-0">
                <li>Inventory CSV export: <a href="/inventory/export/items">/inventory/export/items</a></li>
                <li>Logs and uploads should be archived from `logs/` and `assets/uploads/` directories.</li>
                <li>Schedule daily SQL dumps at server level for disaster recovery.</li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Audit Trail</div>
            <div className="card-body">
              {!auditLogs.length ? (
                <div className="text-secondary">No audit logs available.</div>
              ) : (
                <div className="vstack gap-2">
                  {auditLogs.map((log, index) => (
                    <div className="border rounded-3 p-3" key={`audit-${log.created_at || ''}-${log.action_key || ''}-${index}`}>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                        <div className="fw-semibold">{String(log.action_key || '-')}</div>
                        <div className="small text-secondary">{String(log.created_at || '-')}</div>
                      </div>
                      <div className="small">
                        <span className="text-secondary">Entity:</span> {String(log.entity_table || '-')}<br />
                        <span className="text-secondary">ID:</span> {String(log.entity_id || '-')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default SettingsPage;

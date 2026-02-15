import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  LEGACY_MODULE_ROUTES,
  LEGACY_SETTINGS_ROUTES
} from '../config/legacyRoutes.js';

const ROOT_PAGE_TITLE_MAP = {
  dashboard: 'Dashboard',
  broilers: 'Broilers',
  layers: 'Layers',
  pigs: 'Pigs',
  crops: 'Crops',
  aquaculture: 'Aquaculture',
  inventory: 'Inventory',
  finance: 'Finance Hub',
  sales: 'Finance Hub',
  reports: 'Reports',
  issues: 'Issue Reporting',
  messages: 'Messaging',
  notifications: 'Notifications',
  settings: 'Settings',
  profile: 'Profile',
  logout: 'Logout',
  'hr-access': 'HR Access'
};

const MODULE_PAGE_TITLE_MAP = {
  BROILERS: 'Broilers',
  LAYERS: 'Layers',
  PIGS: 'Pigs',
  CROPS: 'Crops',
  AQUACULTURE: 'Aquaculture',
  INVENTORY: 'Inventory',
  FINANCE: 'Finance Hub',
  SALES: 'Finance Hub',
  REPORTS: 'Reports',
  ISSUES: 'Issue Reporting',
  MESSAGES: 'Messaging',
  SETTINGS: 'Settings',
  HR_ACCESS: 'HR Access'
};

const PHP_MENU_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: 'fi-sr-stats' },
  { label: 'Broilers', to: '/broilers', icon: 'fi-sr-drumstick', moduleKey: 'BROILERS' },
  { label: 'Layers', to: '/layers', icon: 'fi-sr-egg', moduleKey: 'LAYERS' },
  { label: 'Pigs', to: '/pigs', icon: 'fi-sr-paw', moduleKey: 'PIGS' },
  { label: 'Crops', to: '/crops', icon: 'fi-sr-wheat', moduleKey: 'CROPS' },
  { label: 'Aquaculture', to: '/aquaculture', icon: 'fi-sr-fish', moduleKey: 'AQUACULTURE' },
  { label: 'Inventory', to: '/inventory', icon: 'fi-sr-boxes', moduleKey: 'INVENTORY' },
  { label: 'Finance', to: '/finance', icon: 'fi-sr-document-signed', moduleKey: 'FINANCE' },
  { label: 'Issues', to: '/issues', icon: 'fi-sr-bug', moduleKey: 'ISSUES' },
  { label: 'Messages', to: '/messages', icon: 'fi-sr-comments', moduleKey: 'MESSAGES' },
  { label: 'Reports', to: '/reports', icon: 'fi-sr-chart-line-up', moduleKey: 'REPORTS' },
  { label: 'HR', to: '/hr-access', icon: 'fi-sr-users-gear', moduleKey: 'HR_ACCESS' }
];

const BUTTON_STYLE_CLASSES = [
  'btn-style-default',
  'btn-style-pill',
  'btn-style-outline',
  'btn-style-soft'
];

const TEXT_MODE_CLASSES = [
  'text-mode-balanced',
  'text-mode-high-contrast',
  'text-mode-soft'
];

function normalizePath(pathname) {
  const clean = String(pathname || '/').split('?')[0].trim();
  if (!clean || clean === '/') return '/';
  return `/${clean.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function textTitle(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function firstPathSegment(path) {
  return String(path || '').replace(/^\/+/, '').split('/').filter(Boolean)[0] || '';
}

function moduleKeyFromPath(pathname) {
  const root = firstPathSegment(pathname).toLowerCase();
  if (!root) return '';
  const match = LEGACY_MODULE_ROUTES.find((routeItem) => firstPathSegment(routeItem.path).toLowerCase() === root);
  if (match?.moduleKey) return String(match.moduleKey).toUpperCase();
  return '';
}

function initialsFromName(name) {
  const chunks = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!chunks.length) return 'U';
  return chunks.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
}

function toAssetUrl(path) {
  const clean = String(path || '').trim().replace(/^\/+/, '');
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (typeof window === 'undefined') return `/${clean}`;
  return `${window.location.protocol}//${window.location.hostname}/${clean}`;
}

function ShellLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('farmreact:sidebar-collapsed') === '1'
  );
  const [switchingFarm, setSwitchingFarm] = useState(false);
  const [topbarScrolled, setTopbarScrolled] = useState(false);

  const profile = auth.bootstrap?.profile || {};
  const uiPreferences = profile.ui_preferences || {};
  const moduleRows = useMemo(() => {
    const rows = profile.modules || auth.bootstrap?.modules || [];
    return [...rows].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [auth.bootstrap?.modules, profile.modules]);
  const moduleKeySet = useMemo(
    () => new Set(moduleRows.map((row) => String(row.module_key || '').toUpperCase())),
    [moduleRows]
  );

  const sidebarMenuRows = useMemo(() => (
    PHP_MENU_ITEMS.filter((item) => !item.moduleKey || moduleKeySet.has(item.moduleKey))
  ), [moduleKeySet]);

  const farmPortfolio = auth.bootstrap?.farm_portfolio || [];
  const currentFarmId = Number(profile?.farm?.farm_id || auth.bootstrap?.farm?.farm_id || 0);
  const activeFarm = profile?.farm || auth.bootstrap?.farm || null;
  const profileName = String(profile?.user?.full_name || 'User').trim() || 'User';
  const profileEmail = String(profile?.user?.email || '').trim();
  const messageUnreadCount = Number(profile?.message_unread_count || 0);
  const notificationUnreadCount = Number(profile?.notification_unread_count || 0);
  const notificationRows = Array.isArray(profile?.notifications) ? profile.notifications : [];
  const pendingTaskRows = Array.isArray(profile?.pending_tasks) ? profile.pending_tasks : [];
  const avatarUrl = toAssetUrl(profile?.user?.avatar_path || '');
  const farmIconUrl = toAssetUrl(activeFarm?.farm_icon_path || '');

  const showSettingsLink = moduleKeySet.has('SETTINGS');
  const showReportsLink = moduleKeySet.has('REPORTS');
  const showHrAccessLink = moduleKeySet.has('HR_ACCESS');

  const currentPath = useMemo(
    () => normalizePath(location.pathname),
    [location.pathname]
  );
  const currentPathModuleKey = useMemo(
    () => moduleKeyFromPath(currentPath),
    [currentPath]
  );
  const moduleTaskRows = useMemo(() => {
    if (!currentPathModuleKey) return [];
    return pendingTaskRows
      .filter((row) => String(row?.module_key || '').toUpperCase() === currentPathModuleKey)
      .slice(0, 8);
  }, [currentPathModuleKey, pendingTaskRows]);

  const topbarTitle = useMemo(() => {
    if (currentPath === '/' || currentPath === '') return 'Dashboard';

    const parts = currentPath.replace(/^\/+/, '').split('/').filter(Boolean);
    const root = String(parts[0] || '').toLowerCase();

    if (root === 'modules') {
      const moduleKey = String(parts[1] || '').toUpperCase();
      if (MODULE_PAGE_TITLE_MAP[moduleKey]) return MODULE_PAGE_TITLE_MAP[moduleKey];
      return textTitle(parts[1] || 'Module');
    }

    if (ROOT_PAGE_TITLE_MAP[root]) return ROOT_PAGE_TITLE_MAP[root];

    const legacy = LEGACY_MODULE_ROUTES.find((routeItem) => normalizePath(routeItem.path) === currentPath);
    if (legacy) {
      const routeRoot = firstPathSegment(currentPath);
      return ROOT_PAGE_TITLE_MAP[routeRoot] || legacy.title || textTitle(routeRoot);
    }

    const legacySetting = LEGACY_SETTINGS_ROUTES.find((routeItem) => normalizePath(routeItem.path) === currentPath);
    if (legacySetting?.section) return textTitle(legacySetting.section);

    if (!parts.length) return 'Dashboard';
    return textTitle(parts[parts.length - 1]);
  }, [currentPath]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('sidebar-backdrop-open', sidebarOpen);
    return () => {
      document.body.classList.remove('sidebar-backdrop-open');
    };
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('farmreact:sidebar-collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const themeMode = String(uiPreferences.theme_mode || 'light');
    const glassEffect = String(uiPreferences.glass_effect || '1');
    const buttonStyle = String(uiPreferences.button_style || 'default');
    const textMode = String(uiPreferences.text_color_mode || 'balanced');
    const glowIntensity = String(uiPreferences.glow_intensity || 'medium');
    const cardBorderSize = String(uiPreferences.card_border_size || '1');
    const cardRadiusMode = String(uiPreferences.card_radius_mode || 'default');

    body.dataset.theme = themeMode;
    body.dataset.glass = glassEffect;
    body.dataset.glowIntensity = glowIntensity;
    body.dataset.textMode = textMode;
    body.dataset.buttonStyle = buttonStyle;
    body.dataset.cardBorder = cardBorderSize;
    body.dataset.cardRadius = cardRadiusMode;

    body.classList.toggle('glass-off', glassEffect === '0');
    body.classList.remove(...BUTTON_STYLE_CLASSES);
    body.classList.remove(...TEXT_MODE_CLASSES);
    body.classList.add(`btn-style-${buttonStyle}`);
    body.classList.add(`text-mode-${textMode}`);
  }, [uiPreferences]);

  useEffect(() => {
    const onScroll = () => {
      setTopbarScrolled((window.scrollY || 0) > 6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const hasStoredPreference = localStorage.getItem('farmreact:sidebar-collapsed');
    if (hasStoredPreference !== null) return;
    if (typeof uiPreferences.sidebar_collapsed === 'boolean') {
      setSidebarCollapsed(uiPreferences.sidebar_collapsed);
    }
  }, [uiPreferences.sidebar_collapsed]);

  const switchFarm = async (farmId) => {
    const nextFarm = Number(farmId || 0);
    if (!nextFarm || nextFarm === currentFarmId) return;

    setSwitchingFarm(true);
    try {
      await auth.switchFarmContext(nextFarm);
      navigate('/dashboard');
    } catch (error) {
      window.alert(error?.message || 'Unable to switch farm.');
    } finally {
      setSwitchingFarm(false);
    }
  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setSidebarOpen((prev) => !prev);
      return;
    }
    setSidebarCollapsed((prev) => !prev);
  };

  const footerHidden = Boolean(uiPreferences.footer_hidden);
  const footerText = String(uiPreferences.footer_text || `© ${new Date().getFullYear()} FarmSuite ERP`);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'mobile-sidebar-open' : ''} ${String(uiPreferences.glass_effect || '1') === '0' ? 'glass-off' : ''}`} id="appShell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} id="appSidebar">
        <div className="brand">
          {farmIconUrl ? (
            <img className="brand-icon-image" src={farmIconUrl} alt={`${String(activeFarm?.name || 'Farm')} icon`} />
          ) : (
            <i className="fi fi-sr-leaf" />
          )}
          <div className="brand-text">
            <h1>FarmSuite ERP</h1>
            <small>Multi-Farm Operations</small>
          </div>
        </div>

        <button
          type="button"
          className="btn sidebar-toggle"
          id="sidebarToggle"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          onClick={toggleSidebar}
        >
          <i className={`fi ${sidebarCollapsed ? 'fi-sr-angle-right' : 'fi-sr-angle-left'}`} />
        </button>

        <nav className="sidebar-scroll">
          {sidebarMenuRows.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link" onClick={() => setSidebarOpen(false)}>
              <i className={`fi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {activeFarm ? (
          <div className="farm-chip">
            <strong>{String(activeFarm.name || activeFarm.farm_name || `Farm ${activeFarm.farm_id || ''}`)}</strong>
            <small>{String(activeFarm.location || '-')}</small>
          </div>
        ) : null}
      </aside>

      <div className="sidebar-backdrop" id="sidebarBackdrop" onClick={() => setSidebarOpen(false)} />

      <main className="main-content">
        <header className={`topbar ${topbarScrolled ? 'topbar-scrolled' : ''}`}>
          <div className="d-flex align-items-center gap-2 min-w-0">
            <button
              type="button"
              className="btn mobile-sidebar-toggle"
              id="mobileSidebarToggle"
              aria-label="Open menu"
              title="Open menu"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <i className="fi fi-sr-menu-burger" />
            </button>
            <div className="topbar-title">
              <h2>{topbarTitle}</h2>
              <small>{profileName}</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 topbar-actions">
            {farmPortfolio.length > 1 ? (
              <div className="dropdown topbar-farm-dropdown">
                <button
                  className="btn btn-sm btn-outline-info topbar-icon-btn"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  title="Switch farm"
                >
                  <i className="fi fi-sr-house-building" />
                </button>
                <ul className="dropdown-menu dropdown-menu-end app-dropdown-menu topbar-farm-dropdown-menu">
                  <li className="dropdown-header">Switch Farm</li>
                  {farmPortfolio.map((farm) => {
                    const farmId = Number(farm.farm_id || 0);
                    const active = farmId === currentFarmId;
                    const farmName = String(farm.name || farm.farm_name || `Farm ${farmId}`);
                    return (
                      <li key={`farm-switch-${farmId}`}>
                        <button
                          className={`dropdown-item d-flex align-items-center justify-content-between gap-2 topbar-farm-option ${active ? 'active' : ''}`}
                          disabled={switchingFarm || active}
                          onClick={() => {
                            if (farmId > 0) {
                              switchFarm(farmId);
                            }
                          }}
                        >
                          <span className="text-truncate">{farmName}</span>
                          {active ? <i className="fi fi-sr-check" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <NavLink to="/messages" className="btn btn-sm btn-outline-info position-relative topbar-icon-btn" title="Messages">
              <i className="fi fi-sr-comments" />
              {messageUnreadCount > 0 ? (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">{messageUnreadCount}</span>
              ) : null}
            </NavLink>

            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-info position-relative topbar-icon-btn"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="Notifications"
              >
                <i className="fi fi-sr-bell" />
                {notificationUnreadCount > 0 ? (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">{notificationUnreadCount}</span>
                ) : null}
              </button>
              <ul className="dropdown-menu dropdown-menu-end app-dropdown-menu" style={{ minWidth: 320 }}>
                <li className="px-3 py-2 d-flex justify-content-between align-items-center notification-row-header">
                  <span className="fw-semibold">Notifications</span>
                  <NavLink to="/notifications" className="btn btn-sm btn-outline-info">Mark all read</NavLink>
                </li>
                <li><hr className="dropdown-divider" /></li>
                {!notificationRows.length ? (
                  <li className="px-3 py-2 text-secondary">No notifications</li>
                ) : notificationRows.map((notification, index) => (
                  <li key={`notification-row-${notification.notification_id || notification.created_at || index}`} className="px-3 py-2 border-bottom border-secondary-subtle notification-row-item">
                    <div className="small text-secondary">
                      {String(notification.notification_type || 'INFO')} • {String(notification.created_at || '')}
                    </div>
                    <div className="fw-semibold">{String(notification.title || 'Notification')}</div>
                    <div className="small">{String(notification.message || '')}</div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      {String(notification.link_url || '').trim() ? (
                        <NavLink className="small" to={`/${String(notification.link_url).replace(/^\/+/, '')}`}>Open</NavLink>
                      ) : (
                        <span />
                      )}
                      {Number(notification.is_read || 0) === 0 ? (
                        <button className="btn btn-sm btn-outline-info" onClick={() => navigate('/notifications')}>Read</button>
                      ) : (
                        <span className="small text-secondary">Read</span>
                      )}
                    </div>
                  </li>
                ))}
                <li><hr className="dropdown-divider" /></li>
                <li><NavLink className="dropdown-item" to="/notifications">View all notifications</NavLink></li>
              </ul>
            </div>

            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-info dropdown-toggle topbar-avatar-btn"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span className="user-avatar user-avatar-sm me-1">
                  {avatarUrl ? (
                    <img className="avatar-img" src={avatarUrl} alt={profileName} />
                  ) : (
                    <span className="avatar-initials">{initialsFromName(profileName)}</span>
                  )}
                </span>
                <span className="d-none d-md-inline ms-1">{profileName}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end app-dropdown-menu">
                <li className="px-2 py-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="user-avatar user-avatar-md">
                      {avatarUrl ? (
                        <img className="avatar-img" src={avatarUrl} alt={profileName} />
                      ) : (
                        <span className="avatar-initials">{initialsFromName(profileName)}</span>
                      )}
                    </span>
                    <div>
                      <div className="fw-semibold">{profileName}</div>
                      <div className="small text-secondary">{profileEmail || 'No email'}</div>
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><NavLink className="dropdown-item" to="/profile"><i className="fi fi-sr-id-badge me-2" />Profile</NavLink></li>
                {showSettingsLink ? (
                  <li><NavLink className="dropdown-item" to="/settings"><i className="fi fi-sr-settings me-2" />Settings</NavLink></li>
                ) : null}
                {showReportsLink ? (
                  <li><NavLink className="dropdown-item" to="/reports"><i className="fi fi-sr-stats me-2" />Reports</NavLink></li>
                ) : null}
                {showHrAccessLink ? (
                  <li><NavLink className="dropdown-item" to="/hr-access"><i className="fi fi-sr-users-gear me-2" />HR Module</NavLink></li>
                ) : null}
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <NavLink className="dropdown-item text-danger" to="/logout">
                    <i className="fi fi-sr-exit me-2" />Logout
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <section className="page-content">
          {moduleTaskRows.length ? (
            <div className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>
                  My Pending Tasks
                  {currentPathModuleKey ? (
                    <span className="text-secondary"> for {currentPathModuleKey}</span>
                  ) : null}
                </span>
                <NavLink className="btn btn-sm btn-outline-info" to="/hr-access/tasks">Open Task Board</NavLink>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Priority</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th className="text-end">Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleTaskRows.map((taskRow) => (
                        <tr key={`task-row-${taskRow.task_id}`}>
                          <td>{String(taskRow.title || 'Task')}</td>
                          <td>{String(taskRow.priority || 'MEDIUM')}</td>
                          <td>{String(taskRow.due_date || '-')}</td>
                          <td>{String(taskRow.status || 'PENDING')}</td>
                          <td className="text-end">
                            <NavLink className="btn btn-sm btn-outline-info" to="/hr-access/tasks">Open</NavLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
          <Outlet />
        </section>

        {!footerHidden ? (
          <footer className="app-footer">
            <span>{footerText}</span>
          </footer>
        ) : null}
      </main>
    </div>
  );
}

export default ShellLayout;

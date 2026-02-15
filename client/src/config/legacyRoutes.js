export const MODULE_BASE_PATH_BY_KEY = {
  BROILERS: '/broilers',
  LAYERS: '/layers',
  PIGS: '/pigs',
  CROPS: '/crops',
  AQUACULTURE: '/aquaculture',
  INVENTORY: '/inventory',
  FINANCE: '/finance',
  SALES: '/sales',
  REPORTS: '/reports',
  ISSUES: '/issues',
  MESSAGES: '/messages',
  SETTINGS: '/settings',
  HR_ACCESS: '/hr-access',
  TASKS: '/modules/TASKS',
  EQUIPMENT: '/modules/EQUIPMENT',
  EXPENSES: '/modules/EXPENSES'
};

export const MODULE_ICON_BY_KEY = {
  BROILERS: 'bi-egg-fried',
  LAYERS: 'bi-egg',
  PIGS: 'bi-piggy-bank',
  CROPS: 'bi-flower1',
  AQUACULTURE: 'bi-water',
  INVENTORY: 'bi-box-seam',
  FINANCE: 'bi-currency-dollar',
  SALES: 'bi-cart-check',
  REPORTS: 'bi-bar-chart-line',
  ISSUES: 'bi-exclamation-triangle',
  MESSAGES: 'bi-chat-dots',
  SETTINGS: 'bi-sliders',
  HR_ACCESS: 'bi-people',
  TASKS: 'bi-list-check',
  EQUIPMENT: 'bi-tools',
  EXPENSES: 'bi-wallet2'
};

export const LEGACY_MODULE_ROUTES = [
  // Broilers (labels from modules/broilers/index.php)
  { path: 'broilers', moduleKey: 'BROILERS', table: 'broiler_batches', title: 'Overview' },
  { path: 'broilers/add-batch', moduleKey: 'BROILERS', table: 'broiler_batches', title: 'Batch Center' },
  { path: 'broilers/daily-entry', moduleKey: 'BROILERS', table: 'broiler_daily_logs', title: 'Daily Ops' },
  { path: 'broilers/feed-management', moduleKey: 'BROILERS', table: 'broiler_feed_logs', title: 'Feed' },
  { path: 'broilers/health-records', moduleKey: 'BROILERS', table: 'broiler_vaccinations', title: 'Health' },
  { path: 'broilers/harvest', moduleKey: 'BROILERS', table: 'broiler_harvests', title: 'Harvest' },
  { path: 'broilers/housing', moduleKey: 'BROILERS', table: 'housing_units', title: 'Housing' },
  { path: 'broilers/view-batch', moduleKey: 'BROILERS', table: 'broiler_batches', title: 'Batch View' },
  { path: 'broilers/estimates', moduleKey: 'BROILERS', table: 'broiler_projections', title: 'Estimates' },
  { path: 'broilers/reports', moduleKey: 'BROILERS', table: 'broiler_harvests', title: 'Reports' },

  // Layers (labels from modules/layers/index.php)
  { path: 'layers', moduleKey: 'LAYERS', table: 'layer_flocks', title: 'Overview' },
  { path: 'layers/add-flock', moduleKey: 'LAYERS', table: 'layer_flocks', title: 'Flocks' },
  { path: 'layers/daily-production', moduleKey: 'LAYERS', table: 'layer_daily_logs', title: 'Daily Production' },
  { path: 'layers/view-flock', moduleKey: 'LAYERS', table: 'layer_flocks', title: 'View Flock' },
  { path: 'layers/quality-control', moduleKey: 'LAYERS', table: 'health_records', title: 'Health & Quality' },
  { path: 'layers/egg-sales', moduleKey: 'LAYERS', table: 'layer_sales', title: 'Egg Sales' },
  { path: 'layers/reports', moduleKey: 'LAYERS', table: 'layer_flocks', title: 'Reports' },

  // Pigs (labels from modules/pigs/index.php)
  { path: 'pigs', moduleKey: 'PIGS', table: 'pig_groups', title: 'Overview' },
  { path: 'pigs/breeding-stock', moduleKey: 'PIGS', table: 'pig_groups', title: 'Groups' },
  { path: 'pigs/housing', moduleKey: 'PIGS', table: 'housing_units', title: 'Housing' },
  { path: 'pigs/breeding-records', moduleKey: 'PIGS', table: 'pig_breeding_records', title: 'Breeding' },
  { path: 'pigs/growers', moduleKey: 'PIGS', table: 'pig_growth_logs', title: 'Growth' },
  { path: 'pigs/individuals', moduleKey: 'PIGS', table: 'pig_animals', title: 'Individuals' },
  { path: 'pigs/health-records', moduleKey: 'PIGS', table: 'health_records', title: 'Health' },
  { path: 'pigs/sales', moduleKey: 'PIGS', table: 'pig_sales', title: 'Sales' },
  { path: 'pigs/reports', moduleKey: 'PIGS', table: 'pig_groups', title: 'Reports' },
  // Route exists as standalone page file; include for direct parity access.
  { path: 'pigs/farrowing', moduleKey: 'PIGS', table: 'pig_breeding_records', title: 'Farrowing', showInTabs: false },

  // Crops
  { path: 'crops', moduleKey: 'CROPS', table: 'crop_batches', title: 'Overview' },
  { path: 'crops/fields', moduleKey: 'CROPS', table: 'crop_fields', title: 'Fields' },
  { path: 'crops/batches', moduleKey: 'CROPS', table: 'crop_batches', title: 'Batches' },
  { path: 'crops/operations', moduleKey: 'CROPS', table: 'crop_operations', title: 'Operations' },
  { path: 'crops/harvest', moduleKey: 'CROPS', table: 'crop_harvests', title: 'Harvest' },
  { path: 'crops/estimates', moduleKey: 'CROPS', table: 'crop_projections', title: 'Estimates' },
  { path: 'crops/reports', moduleKey: 'CROPS', table: 'crop_batches', title: 'Reports' },

  // Aquaculture (no "Feeding" tab in PHP nav; keep route for direct access only)
  { path: 'aquaculture', moduleKey: 'AQUACULTURE', table: 'aquaculture_ponds', title: 'Overview' },
  { path: 'aquaculture/ponds', moduleKey: 'AQUACULTURE', table: 'aquaculture_ponds', title: 'Ponds' },
  { path: 'aquaculture/stocking', moduleKey: 'AQUACULTURE', table: 'aquaculture_stockings', title: 'Stocking' },
  { path: 'aquaculture/daily-monitoring', moduleKey: 'AQUACULTURE', table: 'aquaculture_daily_logs', title: 'Daily Monitoring' },
  { path: 'aquaculture/water-quality', moduleKey: 'AQUACULTURE', table: 'aquaculture_daily_logs', title: 'Water Quality' },
  { path: 'aquaculture/sampling', moduleKey: 'AQUACULTURE', table: 'aquaculture_sampling_logs', title: 'Sampling' },
  { path: 'aquaculture/harvest', moduleKey: 'AQUACULTURE', table: 'aquaculture_harvests', title: 'Harvest' },
  { path: 'aquaculture/reports', moduleKey: 'AQUACULTURE', table: 'aquaculture_ponds', title: 'Reports' },
  { path: 'aquaculture/feeding', moduleKey: 'AQUACULTURE', table: 'aquaculture_daily_logs', title: 'Feeding', showInTabs: false },

  // Inventory
  { path: 'inventory', moduleKey: 'INVENTORY', table: 'items', title: 'Overview' },
  { path: 'inventory/feed', moduleKey: 'INVENTORY', table: 'inventory_feed_assignments', title: 'Feed' },
  { path: 'inventory/medications', moduleKey: 'INVENTORY', table: 'items', title: 'Medications/Vaccines' },
  { path: 'inventory/supplies', moduleKey: 'INVENTORY', table: 'items', title: 'Supplies/Equipment' },
  { path: 'inventory/purchases', moduleKey: 'INVENTORY', table: 'purchase_orders', title: 'Purchases' },
  { path: 'inventory/stock-adjustment', moduleKey: 'INVENTORY', table: 'stock_transactions', title: 'Stock Movements' },
  { path: 'inventory/reports', moduleKey: 'INVENTORY', table: 'stock_transactions', title: 'Reports' },
  { path: 'inventory/export/items', moduleKey: 'INVENTORY', table: 'items', title: 'Export Items CSV', showInTabs: false },

  // Finance
  { path: 'finance', moduleKey: 'FINANCE', table: 'invoices', title: 'Overview' },
  { path: 'finance/sales-hub', moduleKey: 'FINANCE', table: 'module_sales', title: 'Sales Hub' },
  { path: 'finance/pos', moduleKey: 'FINANCE', table: 'sales_pos_orders', title: 'POS Station' },
  { path: 'finance/transactions', moduleKey: 'FINANCE', table: 'finance_transactions', title: 'Transactions' },
  { path: 'finance/accounts', moduleKey: 'FINANCE', table: 'chart_accounts', title: 'Accounts' },
  { path: 'finance/budgets', moduleKey: 'FINANCE', table: 'budgets', title: 'Budgets' },
  { path: 'finance/payroll', moduleKey: 'FINANCE', table: 'payroll_runs', title: 'Payroll' },
  { path: 'finance/reports', moduleKey: 'FINANCE', table: 'finance_transactions', title: 'Reports' },
  { path: 'finance/statements', moduleKey: 'FINANCE', table: 'finance_transactions', title: 'Statements' },

  { path: 'sales', moduleKey: 'SALES', table: 'sales_pos_orders', title: 'Sales' },

  // Reports
  { path: 'reports', moduleKey: 'REPORTS', table: 'report_schedules', title: 'Overview' },
  { path: 'reports/production', moduleKey: 'REPORTS', table: 'module_benchmarks', title: 'Production' },
  { path: 'reports/financial', moduleKey: 'REPORTS', table: 'finance_transactions', title: 'Financial' },
  { path: 'reports/inventory', moduleKey: 'REPORTS', table: 'stock_transactions', title: 'Inventory' },
  { path: 'reports/custom-reports', moduleKey: 'REPORTS', table: 'report_schedules', title: 'Custom' },
  { path: 'reports/export', moduleKey: 'REPORTS', table: 'report_schedules', title: 'Export' },

  // Issues
  { path: 'issues', moduleKey: 'ISSUES', table: 'issue_reports', title: 'Overview' },

  // Messaging
  { path: 'messages', moduleKey: 'MESSAGES', table: 'user_messages', title: 'Messages' },
  { path: 'notifications', moduleKey: 'MESSAGES', table: 'user_notifications', title: 'Notifications' },

  // HR Access
  { path: 'hr-access', moduleKey: 'HR_ACCESS', table: 'employees', title: 'Overview' },
  { path: 'hr-access/workers', moduleKey: 'HR_ACCESS', table: 'employees', title: 'Workers' },
  { path: 'hr-access/accounts', moduleKey: 'HR_ACCESS', table: 'employees', title: 'Accounts' },
  { path: 'hr-access/module-access', moduleKey: 'HR_ACCESS', table: 'user_module_access', title: 'Module Access' },
  { path: 'hr-access/roles', moduleKey: 'HR_ACCESS', table: 'roles', title: 'Roles' },
  { path: 'hr-access/tasks', moduleKey: 'HR_ACCESS', table: 'tasks', title: 'Tasks' },
  { path: 'hr-access/payroll', moduleKey: 'HR_ACCESS', table: 'payroll_runs', title: 'Payroll' },
  { path: 'hr-access/approvals', moduleKey: 'HR_ACCESS', table: 'approval_requests', title: 'Approvals' },

];

export const LEGACY_SETTINGS_ROUTES = [
  { path: 'settings', section: 'overview' },
  { path: 'settings/users', section: 'users' },
  { path: 'settings/theming', section: 'theming' },
  { path: 'settings/roles', section: 'roles' },
  { path: 'settings/farm-settings', section: 'farm-settings' },
  { path: 'settings/module-config', section: 'module-config' },
  { path: 'settings/system-config', section: 'system-config' },
  { path: 'settings/sync', section: 'sync' },
  { path: 'settings/backup', section: 'backup' }
];

const moduleDefinitions = [
  {
    moduleKey: 'BROILERS',
    name: 'Broilers',
    route: 'broilers',
    icon: 'fa-drumstick-bite',
    entities: [
      { table: 'broiler_batches', label: 'Batches' },
      { table: 'broiler_daily_logs', label: 'Daily Logs' },
      { table: 'broiler_feed_logs', label: 'Feed Logs' },
      { table: 'health_records', label: 'Health Records' },
      { table: 'broiler_vaccinations', label: 'Vaccinations' },
      { table: 'broiler_harvests', label: 'Harvests' },
      { table: 'broiler_misc_costs', label: 'Misc Costs' },
      { table: 'broiler_projections', label: 'Projections' },
      { table: 'housing_units', label: 'Housing Units' }
    ]
  },
  {
    moduleKey: 'LAYERS',
    name: 'Layers',
    route: 'layers',
    icon: 'fa-egg',
    entities: [
      { table: 'layer_flocks', label: 'Flocks' },
      { table: 'layer_daily_logs', label: 'Daily Logs' },
      { table: 'layer_sales', label: 'Sales' },
      { table: 'health_records', label: 'Health Records' }
    ]
  },
  {
    moduleKey: 'PIGS',
    name: 'Pigs',
    route: 'pigs',
    icon: 'fa-piggy-bank',
    entities: [
      { table: 'pig_groups', label: 'Groups' },
      { table: 'pig_animals', label: 'Animals' },
      { table: 'pig_growth_logs', label: 'Growth Logs' },
      { table: 'pig_breeding_records', label: 'Breeding Records' },
      { table: 'pig_individual_weights', label: 'Individual Weights' },
      { table: 'pig_sales', label: 'Sales' },
      { table: 'pig_individual_sales', label: 'Individual Sales' },
      { table: 'health_records', label: 'Health Records' },
      { table: 'housing_units', label: 'Housing Units' }
    ]
  },
  {
    moduleKey: 'AQUACULTURE',
    name: 'Aquaculture',
    route: 'aquaculture',
    icon: 'fa-fish',
    entities: [
      { table: 'aquaculture_ponds', label: 'Ponds' },
      { table: 'aquaculture_stockings', label: 'Stockings' },
      { table: 'aquaculture_daily_logs', label: 'Daily Logs' },
      { table: 'aquaculture_sampling_logs', label: 'Sampling Logs' },
      { table: 'aquaculture_harvests', label: 'Harvests' }
    ]
  },
  {
    moduleKey: 'CROPS',
    name: 'Crops',
    route: 'crops',
    icon: 'fa-seedling',
    entities: [
      { table: 'crop_fields', label: 'Fields' },
      { table: 'crop_batches', label: 'Batches' },
      { table: 'crop_operations', label: 'Operations' },
      { table: 'crop_harvests', label: 'Harvests' },
      { table: 'crop_projections', label: 'Projections' }
    ]
  },
  {
    moduleKey: 'INVENTORY',
    name: 'Inventory',
    route: 'inventory',
    icon: 'fa-boxes-stacked',
    entities: [
      { table: 'items', label: 'Items' },
      { table: 'stock_transactions', label: 'Stock Transactions' },
      { table: 'purchase_orders', label: 'Purchase Orders' },
      { table: 'purchase_order_items', label: 'Purchase Order Items' },
      { table: 'suppliers', label: 'Suppliers' },
      { table: 'inventory_feed_assignments', label: 'Feed Assignments' },
      { table: 'inventory_item_assignments', label: 'Item Assignments' }
    ]
  },
  {
    moduleKey: 'SALES',
    name: 'Sales POS',
    route: 'sales',
    icon: 'fa-cash-register',
    entities: [
      { table: 'sales_pos_orders', label: 'POS Orders' },
      { table: 'module_sales', label: 'Module Sales' },
      { table: 'invoices', label: 'Invoices' },
      { table: 'invoice_items', label: 'Invoice Items' },
      { table: 'customers', label: 'Customers' }
    ]
  },
  {
    moduleKey: 'EXPENSES',
    name: 'Expenses',
    route: 'expenses',
    icon: 'fa-file-invoice-dollar',
    entities: [{ table: 'expenses', label: 'Expenses' }]
  },
  {
    moduleKey: 'TASKS',
    name: 'Tasks',
    route: 'tasks',
    icon: 'fa-list-check',
    entities: [{ table: 'tasks', label: 'Tasks' }]
  },
  {
    moduleKey: 'FINANCE',
    name: 'Finance',
    route: 'finance',
    icon: 'fa-chart-line',
    entities: [
      { table: 'finance_transactions', label: 'Transactions' },
      { table: 'chart_accounts', label: 'Chart Accounts' },
      { table: 'budgets', label: 'Budgets' },
      { table: 'payroll_runs', label: 'Payroll Runs' },
      { table: 'payroll_items', label: 'Payroll Items' },
      { table: 'invoices', label: 'Invoices' },
      { table: 'module_sales', label: 'Module Sales' },
      { table: 'sales_pos_orders', label: 'POS Orders' }
    ]
  },
  {
    moduleKey: 'EQUIPMENT',
    name: 'Equipment',
    route: 'equipment',
    icon: 'fa-screwdriver-wrench',
    entities: [
      { table: 'equipment', label: 'Equipment' },
      { table: 'housing_units', label: 'Housing Units' }
    ]
  },
  {
    moduleKey: 'REPORTS',
    name: 'Reports',
    route: 'reports',
    icon: 'fa-chart-pie',
    entities: [
      { table: 'report_schedules', label: 'Report Schedules' },
      { table: 'module_benchmarks', label: 'Benchmarks' },
      { table: 'module_goals', label: 'Goals' },
      { table: 'module_risks', label: 'Risks' },
      { table: 'module_ideas', label: 'Improvement Ideas' },
      { table: 'module_idea_votes', label: 'Idea Votes' },
      { table: 'finance_transactions', label: 'Finance Transactions' },
      { table: 'stock_transactions', label: 'Stock Transactions' },
      { table: 'audit_log', label: 'Audit Log' }
    ]
  },
  {
    moduleKey: 'ISSUES',
    name: 'Issue Reporting',
    route: 'issues',
    icon: 'fa-triangle-exclamation',
    entities: [
      { table: 'issue_reports', label: 'Issue Reports' },
      { table: 'issue_report_events', label: 'Issue Events' },
      { table: 'issue_report_media', label: 'Issue Media' }
    ]
  },
  {
    moduleKey: 'MESSAGES',
    name: 'Messaging',
    route: 'messages',
    icon: 'fa-comments',
    entities: [
      { table: 'user_messages', label: 'Messages' },
      { table: 'user_notifications', label: 'Notifications' },
      { table: 'notification_configs', label: 'Notification Configs' }
    ]
  },
  {
    moduleKey: 'SETTINGS',
    name: 'Settings',
    route: 'settings',
    icon: 'fa-gears',
    entities: [
      { table: 'farms', label: 'Farms' },
      { table: 'farm_users', label: 'Farm Users' },
      { table: 'farm_modules', label: 'Farm Modules' },
      { table: 'ui_preferences', label: 'UI Preferences' },
      { table: 'system_configs', label: 'System Configs' },
      { table: 'organizations', label: 'Organizations' },
      { table: 'alerts', label: 'Alerts' },
      { table: 'module_automations', label: 'Module Automations' }
    ]
  },
  {
    moduleKey: 'HR_ACCESS',
    name: 'HR Access',
    route: 'hr-access',
    icon: 'fa-user-gear',
    entities: [
      { table: 'employees', label: 'Employees' },
      { table: 'payroll_runs', label: 'Payroll Runs' },
      { table: 'payroll_items', label: 'Payroll Items' },
      { table: 'user_documents', label: 'User Documents' },
      { table: 'user_module_access', label: 'User Module Access' },
      { table: 'tasks', label: 'Tasks' },
      { table: 'roles', label: 'Roles' },
      { table: 'approval_requests', label: 'Approval Requests' },
      { table: 'mobile_module_access_overrides', label: 'Mobile Access Overrides' }
    ]
  }
];

const tableToModule = {};
for (const moduleDef of moduleDefinitions) {
  for (const entity of moduleDef.entities) {
    tableToModule[entity.table] = moduleDef.moduleKey;
  }
}

export function getModuleDefinitions() {
  return moduleDefinitions;
}

export function getModuleByKey(moduleKey) {
  const normalized = String(moduleKey || '').toUpperCase();
  return moduleDefinitions.find((moduleDef) => moduleDef.moduleKey === normalized) || null;
}

export function getEntityByTable(moduleKey, tableName) {
  const moduleDef = getModuleByKey(moduleKey);
  if (!moduleDef) return null;
  return moduleDef.entities.find((entity) => entity.table === tableName) || null;
}

export function getTableToModuleMap() {
  return { ...tableToModule };
}

export function isAllowedTable(tableName) {
  return Object.prototype.hasOwnProperty.call(tableToModule, tableName);
}

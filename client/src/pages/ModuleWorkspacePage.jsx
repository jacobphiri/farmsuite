import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  createRecord,
  deleteRecord,
  getEntities,
  getRecords,
  updateRecord,
  getModuleDataset
} from '../api/endpoints.js';
import { LEGACY_MODULE_ROUTES, MODULE_BASE_PATH_BY_KEY } from '../config/legacyRoutes.js';
import RecordEditorModal from '../components/RecordEditorModal.jsx';
import { withCache } from '../utils/cache.js';

const MODULE_HEADER_COPY = {
  broilers: {
    title: 'Broiler Management',
    subtitle: 'Batches, daily operations, feed, health, harvest, and profitability in one workflow.'
  },
  layers: {
    title: 'Layer Management',
    subtitle: 'Flocks, daily egg production, quality checks, and egg sales.'
  },
  pigs: {
    title: 'Pig Management',
    subtitle: 'Breeding groups, growth monitoring, health records, and sales.'
  },
  crops: {
    title: 'Crops Management',
    subtitle: 'Field registry, crop batches, operations, harvest tracking, and yield estimates.'
  },
  aquaculture: {
    title: 'Aquaculture Management',
    subtitle: 'Pond registry, water quality, sampling, harvesting, and sales.'
  },
  inventory: {
    title: 'Inventory Management',
    subtitle: 'Feed, medication, vaccines, equipment, supplies, purchasing, and stock movement.'
  },
  finance: {
    title: 'Finance Hub',
    subtitle: 'Sales stream, POS station, invoices, expenses, budgets, payroll, and statements.'
  },
  reports: {
    title: 'Reporting & Analytics',
    subtitle: 'Production, financial, inventory, and custom reports.'
  },
  'hr-access': {
    title: 'HR Management',
    subtitle: 'Workers, accounts, salaries, module assignment, and payroll administration.'
  },
  issues: {
    title: 'Issue Reporting',
    subtitle: 'Report and track operational issues with image/video evidence.'
  },
  messages: {
    title: 'Messaging',
    subtitle: 'Private communication between farm users.'
  },
  sales: {
    title: 'Sales POS',
    subtitle: 'POS station and module sales stream.'
  }
};

const MODULE_ACTION_LINKS = {
  broilers: [
    { to: '/broilers/add-batch', label: 'New Batch', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/broilers/daily-entry', label: 'Daily Entry', icon: 'fa-solid fa-clipboard-list', variant: 'outline-info' },
    { to: '/broilers/feed-management', label: 'Feed Log', icon: 'fa-solid fa-wheat-awn', variant: 'outline-info' }
  ],
  layers: [
    { to: '/layers/add-flock', label: 'New Flock', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/layers/daily-production', label: 'Daily Entry', icon: 'fa-solid fa-clipboard-list', variant: 'outline-info' }
  ],
  pigs: [
    { to: '/pigs/breeding-stock', label: 'New Group', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/pigs/individuals', label: 'New Pig', icon: 'fa-solid fa-tag', variant: 'outline-primary' },
    { to: '/pigs/growers', label: 'Growth Log', icon: 'fa-solid fa-scale-balanced', variant: 'outline-info' }
  ],
  crops: [
    { to: '/crops/fields', label: 'New Field', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/crops/batches', label: 'New Batch', icon: 'fa-solid fa-seedling', variant: 'outline-info' },
    { to: '/crops/operations', label: 'Operation', icon: 'fa-solid fa-screwdriver-wrench', variant: 'outline-info' }
  ],
  aquaculture: [
    { to: '/aquaculture/ponds', label: 'New Pond', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/aquaculture/daily-monitoring', label: 'Daily Log', icon: 'fa-solid fa-flask-vial', variant: 'outline-info' }
  ],
  inventory: [
    { to: '/inventory', label: 'Add Item', icon: 'fa-solid fa-plus', variant: 'primary' },
    { to: '/inventory/feed', label: 'Assign Feed', icon: 'fa-solid fa-share-nodes', variant: 'outline-success' },
    { to: '/inventory/medications', label: 'Assign Vaccine/Equipment', icon: 'fa-solid fa-syringe', variant: 'outline-warning' },
    { to: '/inventory/stock-adjustment', label: 'Stock Tx', icon: 'fa-solid fa-arrow-right-arrow-left', variant: 'outline-info' },
    { to: '/inventory/purchases', label: 'Supplier', icon: 'fa-solid fa-truck', variant: 'outline-info' },
    { to: '/inventory/purchases', label: 'PO', icon: 'fa-solid fa-file-invoice', variant: 'outline-info' }
  ],
  finance: [
    { to: '/finance', label: 'Invoice', icon: 'fa-solid fa-file-circle-plus', variant: 'primary' },
    { to: '/finance/sales-hub', label: 'Record Sale', icon: 'fa-solid fa-cart-plus', variant: 'outline-success' },
    { to: '/finance/pos', label: 'POS Station', icon: 'fa-solid fa-cash-register', variant: 'outline-info' }
  ],
  reports: [],
  'hr-access': [],
  issues: []
};

const BROILER_TAB_ICON_BY_PATH = {
  '/broilers': 'fa-gauge-high',
  '/broilers/add-batch': 'fa-layer-group',
  '/broilers/daily-entry': 'fa-clipboard-list',
  '/broilers/feed-management': 'fa-wheat-awn',
  '/broilers/health-records': 'fa-kit-medical',
  '/broilers/harvest': 'fa-truck-ramp-box',
  '/broilers/housing': 'fa-warehouse',
  '/broilers/view-batch': 'fa-binoculars',
  '/broilers/estimates': 'fa-calculator',
  '/broilers/reports': 'fa-chart-line'
};

const LEGACY_SECTION_CARD_BY_PATH = {
  'broilers/add-batch': { title: 'Batch Management', actionLabel: 'Add Batch', actionType: 'create' },
  'broilers/daily-entry': { title: 'Daily Operations', actionLabel: 'Add Daily Entry', actionType: 'create' },
  'broilers/feed-management': { title: 'Broiler Feed Management', actionLabel: 'Add Feed Log', actionType: 'create' },
  'broilers/health-records': { title: 'Health Records', actionLabel: 'Add Health Record', actionType: 'create' },
  'broilers/harvest': { title: 'Harvest & Sales', actionLabel: 'Record Harvest', actionType: 'create' },
  'broilers/housing': { title: 'Broiler Housing Management', actionLabel: 'Add Housing', actionType: 'create' },
  'broilers/view-batch': { title: 'Select Batch' },
  'broilers/estimates': { title: 'Smart Estimate Breakdown' },
  'broilers/reports': { title: 'Broiler Report Builder' },
  'pigs': { title: 'Pig Groups' },
  'pigs/breeding-stock': { title: 'Breeding Stock / Groups', actionLabel: 'Add Group', actionType: 'create' },
  'pigs/housing': { title: 'Pig Housing Management', actionLabel: 'Add Housing', actionType: 'create' },
  'pigs/breeding-records': { title: 'Breeding & Reproduction', actionLabel: 'Add Breeding Record', actionType: 'create' },
  'pigs/growers': { title: 'Growth Logs', actionLabel: 'Add Growth Log', actionType: 'create' },
  'pigs/individuals': { title: 'Individual Pig Registry', actionLabel: 'Add Pig', actionType: 'create' },
  'pigs/health-records': { title: 'Pig Health Records', actionLabel: 'Add Health Record', actionType: 'create' },
  'pigs/sales': { title: 'Pig Sales', actionLabel: 'Record Sale', actionType: 'create' },
  'crops': { title: 'Current Crop Batches' },
  'crops/fields': { title: 'Field Registry', actionLabel: 'Add Field', actionType: 'create' },
  'crops/batches': { title: 'Crop Batches', actionLabel: 'Add Batch', actionType: 'create' },
  'crops/operations': { title: 'Field Operations', actionLabel: 'Add Operation', actionType: 'create' },
  'crops/harvest': { title: 'Crop Harvest Logs', actionLabel: 'Record Harvest', actionType: 'create' },
  'crops/estimates': { title: 'Harvest Estimate Calculator' },
  'hr-access': { title: 'Quick Actions', actionLabel: 'Manage Workers', actionTo: '/hr-access/workers' },
  'hr-access/workers': { title: 'Workers Directory', actionLabel: 'Add Worker', actionType: 'create' },
  'hr-access/accounts': { title: 'Worker Accounts' },
  'hr-access/module-access': { title: 'Module Permission Matrix', actionLabel: 'Save Module Access', actionType: 'create' },
  'hr-access/roles': { title: 'Roles Directory' },
  'hr-access/tasks': { title: 'Task Board', actionLabel: 'Assign Task', actionType: 'create' },
  'hr-access/payroll': { title: 'Recent Payroll Runs', actionLabel: 'Run Payroll', actionType: 'create' },
  'hr-access/approvals': { title: 'Pending And Recent Change Requests' },
  'aquaculture': { title: 'Pond Overview' },
  'aquaculture/ponds': { title: 'Pond Registry', actionLabel: 'Add Pond', actionType: 'create' },
  'aquaculture/stocking': { title: 'Stocking Records', actionLabel: 'Add Stocking', actionType: 'create' },
  'aquaculture/daily-monitoring': { title: 'Daily Monitoring & Water Quality', actionLabel: 'Add Daily Log', actionType: 'create' },
  'aquaculture/water-quality': { title: 'Daily Monitoring & Water Quality', actionLabel: 'Add Daily Log', actionType: 'create' },
  'aquaculture/sampling': { title: 'Growth Sampling', actionLabel: 'Add Sampling', actionType: 'create' },
  'aquaculture/harvest': { title: 'Harvest Records', actionLabel: 'Record Harvest', actionType: 'create' },
  'layers': { title: 'Active Flocks' },
  'layers/add-flock': { title: 'Flock Registry', actionLabel: 'Add Flock', actionType: 'create' },
  'layers/daily-production': { title: 'Daily Production Logs', actionLabel: 'Add Daily Log', actionType: 'create' },
  'layers/quality-control': { title: 'Layer Health & Quality Logs', actionLabel: 'Add Health Record', actionType: 'create' },
  'layers/egg-sales': { title: 'Egg Sales', actionLabel: 'Record Sale', actionType: 'create' }
};

const LEGACY_WORKER_CARD_BY_PATH = {
  pigs: 'Assigned Workers (Module / Group)',
  crops: 'Assigned Workers (Module / Batch)',
  layers: 'Assigned Workers (Module / Flock)'
};

const OVERVIEW_BUNDLE_BY_ROOT = {
  broilers: [
    { title: 'Active Batches', table: 'broiler_batches', columns: ['batch_code', 'start_date', 'current_count', 'status'], limit: 8 },
    { title: 'Batch Summary', table: 'broiler_batches', columns: ['batch_code', 'current_count', 'expected_harvest_date', 'status'], limit: 8 },
    { title: 'Daily Ops Snapshot', table: 'broiler_daily_logs', columns: ['log_date', 'batch_id', 'feed_kg', 'mortality_count'], limit: 8 },
    { title: 'Feed Logs', table: 'broiler_feed_logs', columns: ['feed_date', 'batch_id', 'quantity_kg', 'total_cost'], limit: 8 },
    { title: 'Upcoming Harvests', table: 'broiler_batches', columns: ['batch_code', 'expected_harvest_date', 'current_count', 'status'], limit: 8, query: { sort_by: 'expected_harvest_date', sort_dir: 'ASC' } },
    { title: 'Action Queue', table: 'broiler_vaccinations', columns: ['vaccine_name', 'batch_id', 'status', 'days_to_due'], limit: 8, query: { status: 'DUE' } },
    { title: 'Recent Harvests', table: 'broiler_harvests', columns: ['harvest_date', 'batch_id', 'birds_harvested', 'total_amount'], limit: 8 }
  ],
  layers: [
    { title: 'Flocks', table: 'layer_flocks', columns: ['flock_code', 'start_date', 'bird_count', 'status'], limit: 8 },
    { title: 'Daily Production', table: 'layer_daily_logs', columns: ['log_date', 'flock_id', 'egg_count', 'mortality_count'], limit: 8 },
    { title: 'Egg Sales', table: 'layer_sales', columns: ['sale_date', 'flock_id', 'quantity', 'total_amount'], limit: 8 }
  ],
  pigs: [
    { title: 'Groups', table: 'pig_groups', columns: ['group_code', 'stage', 'count_heads', 'status'], limit: 8 },
    { title: 'Growth Logs', table: 'pig_growth_logs', columns: ['log_date', 'group_id', 'avg_weight_kg', 'feed_kg'], limit: 8 },
    { title: 'Sales', table: 'pig_sales', columns: ['sale_date', 'group_id', 'quantity', 'total_amount'], limit: 8 }
  ],
  crops: [
    { title: 'Crop Batches', table: 'crop_batches', columns: ['batch_code', 'crop_name', 'planting_date', 'status'], limit: 8 },
    { title: 'Operations', table: 'crop_operations', columns: ['operation_date', 'batch_id', 'operation_type', 'total_cost'], limit: 8 },
    { title: 'Harvests', table: 'crop_harvests', columns: ['harvest_date', 'batch_id', 'quantity_kg', 'total_amount'], limit: 8 }
  ],
  aquaculture: [
    { title: 'Ponds', table: 'aquaculture_ponds', columns: ['pond_name', 'species', 'area', 'status'], limit: 8 },
    { title: 'Daily Monitoring', table: 'aquaculture_daily_logs', columns: ['log_date', 'pond_id', 'feed_kg', 'mortality_count'], limit: 8 },
    { title: 'Harvests', table: 'aquaculture_harvests', columns: ['harvest_date', 'pond_id', 'fish_count', 'total_amount'], limit: 8 }
  ],
  inventory: [
    { title: 'Items', table: 'items', columns: ['item_type', 'name', 'unit', 'stock_balance'], limit: 8 },
    { title: 'Stock Movements', table: 'stock_transactions', columns: ['tx_date', 'item_id', 'tx_type', 'quantity'], limit: 8 },
    { title: 'Purchase Orders', table: 'purchase_orders', columns: ['po_number', 'supplier_id', 'status', 'total_amount'], limit: 8 }
  ],
  finance: [
    { title: 'Transactions', table: 'finance_transactions', columns: ['transaction_date', 'entry_type', 'amount', 'status'], limit: 8 },
    { title: 'Accounts', table: 'chart_accounts', columns: ['account_code', 'account_name', 'category', 'is_active'], limit: 8 },
    { title: 'Budgets', table: 'budgets', columns: ['budget_name', 'module_key', 'budget_amount', 'status'], limit: 8 }
  ],
  reports: [
    { title: 'Report Schedules', table: 'report_schedules', columns: ['name', 'schedule_type', 'is_active', 'created_at'], limit: 8 },
    { title: 'Benchmarks', table: 'module_benchmarks', columns: ['module_key', 'metric_key', 'target_value', 'created_at'], limit: 8 },
    { title: 'Audit Log', table: 'audit_log', columns: ['created_at', 'action_key', 'entity_name', 'actor_user_id'], limit: 8 }
  ],
  'hr-access': [
    { title: 'Employees', table: 'employees', columns: ['full_name', 'role_title', 'monthly_salary', 'is_active'], limit: 8 },
    { title: 'Payroll Runs', table: 'payroll_runs', columns: ['period_start', 'period_end', 'status', 'net_pay'], limit: 8 },
    { title: 'Approvals', table: 'approval_requests', columns: ['request_type', 'status', 'requested_at', 'requested_by'], limit: 8 }
  ],
  sales: [
    { title: 'POS Orders', table: 'sales_pos_orders', columns: ['created_at', 'invoice_id', 'payment_method', 'total'], limit: 8 },
    { title: 'Sales Stream', table: 'module_sales', columns: ['sale_date', 'module_key', 'quantity', 'total_amount'], limit: 8 },
    { title: 'Customers', table: 'customers', columns: ['name', 'phone', 'email', 'status'], limit: 8 }
  ],
  messages: [
    { title: 'Messages', table: 'user_messages', columns: ['created_at', 'sender_user_id', 'subject', 'is_read'], limit: 8 },
    { title: 'Notifications', table: 'user_notifications', columns: ['created_at', 'title', 'status', 'channel'], limit: 8 }
  ]
};

const REPORT_BUNDLE_BY_ROOT = {
  broilers: [
    { title: 'Broiler Projections', table: 'broiler_projections', columns: ['created_at', 'batch_id', 'estimated_revenue', 'cost_of_production', 'estimated_profit'], limit: 12 },
    { title: 'Harvest Performance', table: 'broiler_harvests', columns: ['harvest_date', 'batch_id', 'birds_harvested', 'total_weight_kg', 'total_amount'], limit: 12 },
    { title: 'Daily Health Signals', table: 'broiler_daily_logs', columns: ['log_date', 'batch_id', 'mortality_count', 'feed_kg', 'avg_weight_kg'], limit: 12 }
  ],
  layers: [
    { title: 'Daily Production Trend', table: 'layer_daily_logs', columns: ['log_date', 'flock_id', 'egg_count', 'mortality_count'], limit: 12 },
    { title: 'Egg Sales Trend', table: 'layer_sales', columns: ['sale_date', 'flock_id', 'quantity', 'total_amount'], limit: 12 },
    { title: 'Flock State', table: 'layer_flocks', columns: ['flock_code', 'active_birds', 'today_eggs', 'status'], limit: 12 }
  ],
  pigs: [
    { title: 'Growth Performance', table: 'pig_growth_logs', columns: ['log_date', 'group_id', 'avg_weight_kg', 'feed_kg', 'mortality_count'], limit: 12 },
    { title: 'Breeding Records', table: 'pig_breeding_records', columns: ['event_date', 'group_id', 'record_type', 'status'], limit: 12 },
    { title: 'Sales Performance', table: 'pig_sales', columns: ['sale_date', 'group_id', 'heads_sold', 'total_amount'], limit: 12 }
  ],
  crops: [
    { title: 'Crop Projections', table: 'crop_projections', columns: ['created_at', 'batch_id', 'projected_yield_kg', 'expected_revenue', 'expected_profit'], limit: 12 },
    { title: 'Harvest Output', table: 'crop_harvests', columns: ['harvest_date', 'batch_id', 'quantity_kg', 'total_amount'], limit: 12 },
    { title: 'Operations Cost', table: 'crop_operations', columns: ['operation_date', 'batch_id', 'operation_type', 'total_cost'], limit: 12 }
  ],
  aquaculture: [
    { title: 'Pond Production', table: 'aquaculture_sampling_logs', columns: ['sample_date', 'pond_id', 'biomass_kg', 'survival_pct'], limit: 12 },
    { title: 'Water Quality Logs', table: 'aquaculture_daily_logs', columns: ['log_date', 'pond_id', 'ph_level', 'dissolved_oxygen_mg_l', 'mortality_count'], limit: 12 },
    { title: 'Harvest Revenue', table: 'aquaculture_harvests', columns: ['harvest_date', 'pond_id', 'total_weight_kg', 'total_amount'], limit: 12 }
  ],
  inventory: [
    { title: 'Inventory Items', table: 'items', columns: ['item_type', 'name', 'stock_balance', 'reorder_level'], limit: 12 },
    { title: 'Stock Movements', table: 'stock_transactions', columns: ['tx_date', 'item_id', 'tx_type', 'quantity', 'unit_cost'], limit: 12 },
    { title: 'Purchase Orders', table: 'purchase_orders', columns: ['po_number', 'order_date', 'status', 'total_amount'], limit: 12 }
  ],
  finance: [
    { title: 'Financial Transactions', table: 'finance_transactions', columns: ['transaction_date', 'entry_type', 'reference_type', 'amount', 'status'], limit: 12 },
    { title: 'Module Sales Stream', table: 'module_sales', columns: ['sale_date', 'module_key', 'quantity', 'total_amount'], limit: 12 },
    { title: 'POS Orders', table: 'sales_pos_orders', columns: ['created_at', 'invoice_id', 'payment_method', 'total'], limit: 12 }
  ],
  'hr-access': [
    { title: 'Employee Directory', table: 'employees', columns: ['full_name', 'role_title', 'monthly_salary', 'is_active'], limit: 12 },
    { title: 'Payroll Runs', table: 'payroll_runs', columns: ['period_start', 'period_end', 'status', 'net_pay'], limit: 12 },
    { title: 'Approval Requests', table: 'approval_requests', columns: ['request_type', 'status', 'requested_at', 'requested_by'], limit: 12 }
  ]
};

const TABLE_SORT_OVERRIDES = {
  broiler_batches: { sort_by: 'batch_id', sort_dir: 'DESC' },
  layer_flocks: { sort_by: 'flock_id', sort_dir: 'DESC' },
  pig_groups: { sort_by: 'group_id', sort_dir: 'DESC' },
  crop_batches: { sort_by: 'batch_id', sort_dir: 'DESC' },
  aquaculture_ponds: { sort_by: 'pond_id', sort_dir: 'DESC' },
  items: { sort_by: 'item_id', sort_dir: 'DESC' },
  finance_transactions: { sort_by: 'transaction_id', sort_dir: 'DESC' },
  employees: { sort_by: 'employee_id', sort_dir: 'DESC' }
};

const TABLE_COLUMN_OVERRIDES = {
  broiler_batches: ['batch_code', 'start_date', 'initial_count', 'current_count', 'buy_price_per_bird', 'status'],
  broiler_daily_logs: ['log_date', 'batch_id', 'avg_weight_kg', 'feed_kg', 'mortality_count', 'temperature_c'],
  broiler_feed_logs: ['feed_date', 'batch_id', 'feed_name', 'quantity_kg', 'unit_cost', 'total_cost'],
  broiler_vaccinations: ['vaccine_name', 'batch_id', 'scheduled_date', 'status', 'administered_at'],
  broiler_harvests: ['harvest_date', 'batch_id', 'birds_harvested', 'total_weight_kg', 'buyer_name', 'total_amount'],
  broiler_projections: ['created_at', 'batch_id', 'mode', 'price_basis', 'estimated_revenue', 'cost_of_production', 'estimated_profit'],
  layer_flocks: ['flock_code', 'start_date', 'bird_count', 'active_birds', 'today_eggs', 'status'],
  layer_daily_logs: ['log_date', 'flock_id', 'egg_count', 'mortality_count', 'feed_kg', 'status'],
  layer_sales: ['sale_date', 'flock_id', 'quantity', 'unit_price', 'total_amount', 'customer_name'],
  pig_groups: ['group_code', 'stage', 'count_heads', 'remaining_heads', 'status', 'created_at'],
  pig_growth_logs: ['log_date', 'group_id', 'avg_weight_kg', 'feed_kg', 'mortality_count', 'created_at'],
  pig_breeding_records: ['event_date', 'group_id', 'record_type', 'sow_tag', 'boar_tag', 'status'],
  pig_animals: ['tag_no', 'group_id', 'sex', 'breed', 'birth_date', 'status'],
  pig_sales: ['sale_date', 'group_id', 'heads_sold', 'avg_weight_kg', 'total_amount', 'buyer_name'],
  health_records: ['recorded_at', 'module_key', 'target_type', 'target_id', 'diagnosis', 'treatment', 'medication'],
  crop_fields: ['field_code', 'field_name', 'crop_type', 'area_ha', 'soil_type', 'status'],
  crop_batches: ['batch_code', 'field_id', 'crop_name', 'planting_date', 'expected_harvest_date', 'status'],
  crop_operations: ['operation_date', 'batch_id', 'operation_type', 'quantity', 'unit', 'total_cost'],
  crop_harvests: ['harvest_date', 'batch_id', 'quantity_kg', 'price_per_kg', 'total_amount', 'buyer_name'],
  crop_projections: ['created_at', 'batch_id', 'projected_harvest_date', 'projected_yield_kg', 'expected_revenue', 'running_cost', 'expected_profit'],
  aquaculture_ponds: ['pond_name', 'species', 'area', 'depth_m', 'capacity_count', 'status'],
  aquaculture_stockings: ['stocking_date', 'pond_id', 'species', 'fingerling_count', 'avg_weight_g', 'density_per_m2'],
  aquaculture_daily_logs: ['log_date', 'pond_id', 'feed_kg', 'mortality_count', 'temperature_c', 'ph_level'],
  aquaculture_sampling_logs: ['sample_date', 'pond_id', 'sample_count', 'avg_weight_g', 'biomass_kg', 'survival_pct'],
  aquaculture_harvests: ['harvest_date', 'pond_id', 'harvest_type', 'fish_count', 'total_weight_kg', 'total_amount'],
  items: ['item_type', 'name', 'unit', 'stock_balance', 'reorder_level', 'is_active'],
  inventory_feed_assignments: ['assignment_date', 'item_id', 'module_key', 'target_label', 'quantity', 'total_cost'],
  inventory_item_assignments: ['assignment_date', 'item_id', 'module_key', 'target_label', 'quantity', 'total_cost'],
  purchase_orders: ['po_number', 'supplier_id', 'order_date', 'status', 'total_amount', 'created_at'],
  stock_transactions: ['tx_date', 'item_id', 'tx_type', 'quantity', 'unit_cost', 'reference'],
  finance_transactions: ['transaction_date', 'entry_type', 'reference_type', 'amount', 'status', 'created_at'],
  chart_accounts: ['account_code', 'account_name', 'category', 'account_type', 'is_active'],
  budgets: ['budget_name', 'module_key', 'budget_amount', 'period_start', 'period_end', 'status'],
  payroll_runs: ['period_start', 'period_end', 'status', 'gross_pay', 'net_pay', 'created_at'],
  sales_pos_orders: ['created_at', 'invoice_id', 'payment_method', 'amount_paid', 'change_due', 'total'],
  module_sales: ['sale_date', 'module_key', 'batch_reference', 'quantity', 'unit_price', 'total_amount'],
  invoices: ['invoice_number', 'module_key', 'customer_name', 'status', 'subtotal', 'total'],
  report_schedules: ['name', 'schedule_type', 'report_type', 'is_active', 'created_at'],
  module_benchmarks: ['module_key', 'metric_key', 'target_value', 'current_value', 'created_at'],
  audit_log: ['created_at', 'action_key', 'entity_name', 'entity_id', 'actor_user_id'],
  employees: ['full_name', 'employee_no', 'role_title', 'monthly_salary', 'is_active'],
  approval_requests: ['request_type', 'request_title', 'requested_by', 'status', 'requested_at'],
  tasks: ['title', 'module_key', 'priority', 'status', 'due_date', 'assigned_to'],
  user_messages: ['created_at', 'sender_user_id', 'recipient_user_id', 'subject', 'is_read'],
  user_notifications: ['created_at', 'title', 'status', 'channel', 'priority']
};

const QUICK_FILTER_FIELDS_BY_TABLE = {
  broiler_batches: ['status', 'housing_id'],
  broiler_daily_logs: ['batch_id'],
  broiler_feed_logs: ['batch_id'],
  broiler_vaccinations: ['batch_id', 'status'],
  broiler_harvests: ['batch_id'],
  broiler_misc_costs: ['batch_id'],
  layer_flocks: ['status', 'production_phase'],
  layer_daily_logs: ['flock_id'],
  layer_sales: ['flock_id', 'grade'],
  pig_groups: ['status', 'stage'],
  pig_growth_logs: ['group_id'],
  pig_breeding_records: ['group_id', 'record_type', 'status'],
  pig_sales: ['group_id'],
  crop_batches: ['status', 'field_id', 'crop_name'],
  crop_operations: ['batch_id', 'operation_type'],
  crop_harvests: ['batch_id'],
  aquaculture_ponds: ['status', 'species'],
  aquaculture_daily_logs: ['pond_id'],
  aquaculture_sampling_logs: ['pond_id'],
  aquaculture_harvests: ['pond_id', 'harvest_type'],
  items: ['item_type', 'is_active'],
  stock_transactions: ['item_id', 'tx_type'],
  purchase_orders: ['status'],
  finance_transactions: ['status', 'entry_type'],
  sales_pos_orders: ['payment_method'],
  module_sales: ['module_key'],
  invoices: ['module_key', 'status'],
  employees: ['is_active'],
  approval_requests: ['status'],
  health_records: ['module_key', 'target_type', 'target_id']
};

const REPORT_TABLE_BY_ROOT = {
  broilers: {
    title: 'Broiler Performance Report',
    columns: ['batch_code', 'start_date', 'initial_count', 'current_count', 'fcr', 'adg_g', 'mortality_rate', 'cost_of_production', 'harvest_revenue', 'profitability', 'status']
  },
  layers: {
    title: 'Layer Performance Report',
    columns: ['flock_code', 'active_birds', 'today_eggs', 'hen_day_pct', 'feed_per_dozen', 'cracked_eggs', 'sales_amount', 'status']
  },
  pigs: {
    title: 'Pig Performance Report',
    columns: ['group_code', 'stage', 'remaining_heads', 'latest_weight_kg', 'mortality_rate', 'fcr', 'sales_amount', 'status']
  },
  crops: {
    title: 'Crop Performance Report',
    columns: ['batch_code', 'crop_name', 'planting_date', 'expected_harvest_date', 'actual_harvest_kg', 'sales_amount', 'status']
  },
  aquaculture: {
    title: 'Pond Performance Report',
    columns: ['pond_name', 'species', 'stock_count', 'avg_weight_g', 'survival_pct', 'feed_conversion_ratio', 'status']
  },
  inventory: {
    title: 'Inventory Report',
    columns: ['item_type', 'name', 'unit', 'stock_balance', 'reorder_level', 'stock_value']
  },
  finance: {
    title: 'Financial Report',
    columns: ['transaction_date', 'entry_type', 'reference_type', 'amount', 'status']
  },
  reports: {
    title: 'System Reports',
    columns: ['module_key', 'metric_key', 'target_value', 'current_value', 'created_at']
  },
  'hr-access': {
    title: 'HR Report',
    columns: ['full_name', 'role_title', 'monthly_salary', 'is_active']
  }
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCell(value) {
  if (value === null || value === undefined) return '—';
  const raw = String(value);
  if (raw.length > 56) return `${raw.slice(0, 56)}...`;
  return raw;
}

function formatMoney(value) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMetric(value) {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return '0';
  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function normalizeDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString().slice(0, 10);
}

function ymdNow() {
  return new Date().toISOString().slice(0, 10);
}

function ymdDaysAgo(days) {
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
  const ms = Date.now() - (safeDays * 24 * 60 * 60 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

function makeDefaultBroilerReportFilters() {
  return {
    mode: 'FULL',
    from: ymdDaysAgo(30),
    to: ymdNow(),
    batchIds: []
  };
}

function pickDateField(columns = []) {
  const preferred = [
    'log_date',
    'harvest_date',
    'sale_date',
    'operation_date',
    'transaction_date',
    'feed_date',
    'recorded_at',
    'created_at',
    'start_date'
  ];

  for (const candidate of preferred) {
    if (columns.includes(candidate)) return candidate;
  }
  return '';
}

function rowPassesDateRange(row, dateField, fromDate, toDate) {
  if (!dateField) return true;
  const parsed = normalizeDateInput(row?.[dateField]);
  if (!parsed) return true;
  if (fromDate && parsed < fromDate) return false;
  if (toDate && parsed > toDate) return false;
  return true;
}

function resolveRowViewRoute(table, row) {
  if (!table || !row) return '';

  if (table === 'broiler_batches') {
    const id = toInt(row.batch_id);
    return id > 0 ? `/broilers/view-batch?id=${id}` : '';
  }

  if (table === 'layer_flocks') {
    const id = toInt(row.flock_id);
    return id > 0 ? `/layers/view-flock?id=${id}` : '';
  }

  if (table === 'pig_groups') {
    const id = toInt(row.group_id);
    return id > 0 ? `/pigs/reports?id=${id}` : '';
  }

  if (table === 'crop_batches') {
    const id = toInt(row.batch_id);
    return id > 0 ? `/crops/estimates?id=${id}` : '';
  }

  if (table === 'aquaculture_ponds') {
    const id = toInt(row.pond_id);
    return id > 0 ? `/aquaculture/reports?id=${id}` : '';
  }

  return '';
}

function normalizeViewTitle(viewTitle, routeViewKey) {
  if (viewTitle) return viewTitle;
  if (!routeViewKey) return '';
  return String(routeViewKey)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function firstPathSegment(routePath) {
  return String(routePath || '')
    .replace(/^\/+/, '')
    .split('/')[0] || '';
}

function labelFromPath(routePath) {
  const trimmed = String(routePath || '').replace(/^\/+/, '');
  const segment = trimmed.split('/').pop() || trimmed;
  if (!segment) return 'Overview';
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function routeUrl(routePath) {
  return `/${String(routePath || '').replace(/^\/+/, '')}`;
}

function relativePath(pathname) {
  return String(pathname || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function buildRouteContext({
  moduleKey,
  moduleName,
  routePathKey,
  viewTitle
}) {
  const [root = '', subRaw = 'index'] = String(routePathKey || '').split('/');
  const sub = subRaw || 'index';
  const headerConfig = MODULE_HEADER_COPY[root] || {
    title: moduleName || moduleKey || 'Module',
    subtitle: 'Operations workspace'
  };
  const headline = viewTitle || labelFromPath(routePathKey) || 'Overview';
  const actions = MODULE_ACTION_LINKS[root] || [];

  return {
    root,
    sub,
    title: headerConfig.title,
    subtitle: headerConfig.subtitle,
    headline,
    actions
  };
}

function buildEstimateFormSeed(selectedBatchId, projectionId) {
  return `${selectedBatchId || 0}:${projectionId || 0}`;
}

function makeEstimateForm({ batch, projection }) {
  const fromProjection = projection || {};

  const defaultBirds = toInt(fromProjection.birds || batch?.estimate_birds || batch?.current_count || batch?.initial_count || 0);
  const defaultWeight = toNumber(fromProjection.weight_per_bird_kg || batch?.estimate_weight_per_bird_kg || 0);

  return {
    mode: String(fromProjection.mode || batch?.estimate_mode || 'LIVE'),
    price_basis: String(fromProjection.price_basis || batch?.estimate_price_basis || 'PER_BIRD'),
    birds: defaultBirds > 0 ? String(defaultBirds) : '0',
    weight_per_bird_kg: defaultWeight > 0 ? String(defaultWeight) : '0',
    sale_price_per_bird: String(toNumber(fromProjection.sale_price_per_bird || batch?.estimate_sale_price_per_bird || 0)),
    price_per_kg: String(toNumber(fromProjection.price_per_kg || batch?.estimate_live_price_per_kg || 0)),
    processing_cost_per_bird: String(toNumber(batch?.estimate_processing_cost_per_bird || 0)),
    purchase_cost: String(toNumber(fromProjection.purchase_cost || (toNumber(batch?.buy_price_per_bird) * toNumber(batch?.initial_count)))),
    feed_cost: String(toNumber(fromProjection.feed_cost || 0)),
    misc_input_cost: String(toNumber(fromProjection.misc_input_cost || batch?.misc_input_cost || 0)),
    inventory_item_cost: String(toNumber(fromProjection.inventory_item_cost || batch?.inventory_item_cost || 0)),
    include_vaccine_cost: toInt(fromProjection.include_vaccine_cost || batch?.estimate_include_vaccine_cost || 1) === 1,
    include_labor_cost: toInt(fromProjection.include_labor_cost || batch?.estimate_include_labor_cost || 0) === 1,
    vaccine_cost: String(toNumber(fromProjection.vaccine_cost || 0)),
    labor_cost: String(toNumber(fromProjection.labor_cost || batch?.estimate_manual_labor_cost || 0))
  };
}

function computeEstimatePreview(form) {
  const birds = Math.max(0, toInt(form.birds));
  const weightPerBird = Math.max(0, toNumber(form.weight_per_bird_kg));
  const basis = String(form.price_basis || 'PER_BIRD').toUpperCase();

  const inputSalePerBird = Math.max(0, toNumber(form.sale_price_per_bird));
  const inputPricePerKg = Math.max(0, toNumber(form.price_per_kg));

  const salePricePerBirdUsed = basis === 'PER_BIRD'
    ? inputSalePerBird
    : (weightPerBird > 0 ? inputPricePerKg * weightPerBird : 0);

  const pricePerKgUsed = basis === 'PER_KG'
    ? inputPricePerKg
    : (weightPerBird > 0 ? inputSalePerBird / weightPerBird : 0);

  const revenue = basis === 'PER_BIRD'
    ? birds * salePricePerBirdUsed
    : birds * weightPerBird * pricePerKgUsed;

  const purchaseCost = Math.max(0, toNumber(form.purchase_cost));
  const feedCost = Math.max(0, toNumber(form.feed_cost));
  const miscCost = Math.max(0, toNumber(form.misc_input_cost));
  const inventoryCost = Math.max(0, toNumber(form.inventory_item_cost));
  const vaccineCost = form.include_vaccine_cost ? Math.max(0, toNumber(form.vaccine_cost)) : 0;
  const laborCost = form.include_labor_cost ? Math.max(0, toNumber(form.labor_cost)) : 0;
  const processingCostPerBird = Math.max(0, toNumber(form.processing_cost_per_bird));
  const processingTotal = birds * processingCostPerBird;

  const cop = purchaseCost + feedCost + miscCost + inventoryCost + vaccineCost + laborCost + processingTotal;
  const profit = revenue - cop;

  const scale = Math.max(Math.abs(revenue), Math.abs(cop), 1);
  const ratio = Math.max(-1, Math.min(1, profit / scale));
  const indicatorLeft = (ratio + 1) * 50;

  return {
    birds,
    weightPerBird,
    salePricePerBirdUsed,
    pricePerKgUsed,
    revenue,
    cop,
    profit,
    processingTotal,
    inventoryCost,
    indicatorLeft
  };
}

function makeCropEstimateForm({ batch, projection }) {
  const fromProjection = projection || {};
  const runningCostBaseline = toNumber(batch?.running_cost)
    || (toNumber(batch?.seed_cost) + toNumber(batch?.input_cost) + toNumber(batch?.labor_cost) + toNumber(batch?.misc_cost));

  return {
    projected_harvest_date: String(fromProjection.projected_harvest_date || ''),
    projected_yield_kg: String(toNumber(fromProjection.projected_yield_kg || batch?.projected_yield_kg || 0)),
    expected_price_per_kg: String(toNumber(fromProjection.expected_price_per_kg || batch?.expected_price_per_kg || 0)),
    running_cost: String(toNumber(fromProjection.running_cost || runningCostBaseline)),
    notes: String(fromProjection.notes || '')
  };
}

function computeCropEstimatePreview(form) {
  const projectedYieldKg = Math.max(0, toNumber(form.projected_yield_kg));
  const expectedPricePerKg = Math.max(0, toNumber(form.expected_price_per_kg));
  const runningCost = Math.max(0, toNumber(form.running_cost));
  const expectedRevenue = projectedYieldKg * expectedPricePerKg;
  const expectedProfit = expectedRevenue - runningCost;
  const scale = Math.max(Math.abs(expectedRevenue), Math.abs(runningCost), 1);
  const ratio = Math.max(-1, Math.min(1, expectedProfit / scale));
  const indicatorLeft = (ratio + 1) * 50;

  return {
    projectedYieldKg,
    expectedPricePerKg,
    runningCost,
    expectedRevenue,
    expectedProfit,
    indicatorLeft
  };
}

function pickRowColumns(rows, preferred = [], fallbackCount = 4) {
  const firstRow = rows[0] || {};
  const keys = Object.keys(firstRow);
  const selected = preferred.filter((column) => keys.includes(column));
  if (selected.length) return selected;
  return keys.slice(0, fallbackCount);
}

function csvSafe(value) {
  const text = String(value ?? '');
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv({ rows, columns, fileName }) {
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(columns) || !columns.length) {
    return;
  }

  const header = columns.map((column) => csvSafe(column)).join(',');
  const lines = rows.map((row) => columns.map((column) => csvSafe(row?.[column])).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'export.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ModuleWorkspacePage({ moduleKeyOverride = '', defaultTable = '', viewTitle = '' }) {
  const params = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const normalizedModule = String(moduleKeyOverride || params.moduleKey || '').toUpperCase();
  const resolvedViewTitle = normalizeViewTitle(viewTitle, params.viewKey);
  const routePathKey = relativePath(location.pathname);

  const matchedLegacyRoute = useMemo(
    () => LEGACY_MODULE_ROUTES.find((routeItem) => relativePath(routeUrl(routeItem.path)) === routePathKey),
    [routePathKey]
  );

  const isLegacyScreen = Boolean(matchedLegacyRoute);
  const isBroilerOverview = routePathKey === 'broilers';
  const isBroilerEstimates = routePathKey === 'broilers/estimates';
  const isBroilerReports = routePathKey === 'broilers/reports';
  const isBroilerDailyEntry = routePathKey === 'broilers/daily-entry';
  const isBroilerHarvest = routePathKey === 'broilers/harvest';
  const isBroilerHealthRecords = routePathKey === 'broilers/health-records';
  const isLayerQualityControl = routePathKey === 'layers/quality-control';
  const isLayerReports = routePathKey === 'layers/reports';
  const isPigIndividuals = routePathKey === 'pigs/individuals';
  const isPigHealthRecords = routePathKey === 'pigs/health-records';
  const isPigReports = routePathKey === 'pigs/reports';
  const isCropsReports = routePathKey === 'crops/reports';
  const isAquacultureReports = routePathKey === 'aquaculture/reports';
  const isCropsEstimates = routePathKey === 'crops/estimates';
  const isBroilerBatchView = routePathKey === 'broilers/view-batch';
  const isLayerFlockView = routePathKey === 'layers/view-flock';
  const isLegacyReportScreen = isLegacyScreen
    && (routePathKey.endsWith('/reports') || routePathKey === 'reports' || routePathKey.startsWith('reports/'));

  const [meta, setMeta] = useState(null);
  const [selectedTable, setSelectedTable] = useState(defaultTable || '');
  const [listState, setListState] = useState({ rows: [], page: 1, totalPages: 1, totalCount: 0 });
  const [search, setSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState({});
  const [reportFilters, setReportFilters] = useState({
    mode: 'FULL',
    from: '',
    to: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [source, setSource] = useState({
    transport: 'remote',
    data: 'mysql',
    stale: false
  });

  const [broilerBatches, setBroilerBatches] = useState([]);
  const [broilerReportDraft, setBroilerReportDraft] = useState(makeDefaultBroilerReportFilters());
  const [broilerReportApplied, setBroilerReportApplied] = useState(makeDefaultBroilerReportFilters());
  const [broilerReportRows, setBroilerReportRows] = useState({
    batches: [],
    daily: [],
    feed: [],
    health: [],
    vaccinations: [],
    harvests: []
  });
  const [broilerReportLoading, setBroilerReportLoading] = useState(false);
  const [estimateForm, setEstimateForm] = useState(makeEstimateForm({ batch: null, projection: null }));
  const [estimateSeed, setEstimateSeed] = useState('');
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [cropBatches, setCropBatches] = useState([]);
  const [cropEstimateForm, setCropEstimateForm] = useState(makeCropEstimateForm({ batch: null, projection: null }));
  const [cropEstimateSeed, setCropEstimateSeed] = useState('');
  const [cropEstimateSaving, setCropEstimateSaving] = useState(false);
  const [overviewPanels, setOverviewPanels] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [broilerTotals, setBroilerTotals] = useState(null);
  const [broilerViewRows, setBroilerViewRows] = useState({
    logs: [],
    miscCosts: [],
    vaccinations: [],
    harvests: []
  });
  const [broilerHealthRows, setBroilerHealthRows] = useState({
    records: [],
    vaccinations: []
  });
  const [layerFlocks, setLayerFlocks] = useState([]);
  const [layerViewRows, setLayerViewRows] = useState({
    logs: [],
    sales: []
  });
  const [pigGroups, setPigGroups] = useState([]);
  const [pigReportRows, setPigReportRows] = useState({
    growth: [],
    breeding: [],
    health: [],
    sales: []
  });
  const [pigIndividualRows, setPigIndividualRows] = useState({
    weights: [],
    sales: [],
    health: []
  });

  const selectedEntity = useMemo(
    () => (meta?.entities || []).find((entity) => entity.table === selectedTable) || null,
    [meta, selectedTable]
  );
  const metaModuleKey = useMemo(
    () => String(meta?.module?.moduleKey || meta?.module?.module_key || '').toUpperCase(),
    [meta]
  );

  const columns = useMemo(() => {
    const fields = selectedEntity?.fields || [];
    const available = fields.map((field) => field.name);
    const tablePreferred = TABLE_COLUMN_OVERRIDES[selectedTable] || [];
    const preferred = tablePreferred.filter((column) => available.includes(column));
    if (preferred.length) return preferred.slice(0, 9);
    return fields.slice(0, 9).map((field) => field.name);
  }, [selectedEntity, selectedTable]);

  const canEditDelete = Boolean(selectedEntity?.primary_key);

  const quickFilterFields = useMemo(() => {
    const available = new Set((selectedEntity?.fields || []).map((field) => field.name));
    const wanted = QUICK_FILTER_FIELDS_BY_TABLE[selectedTable] || [];
    return wanted.filter((column) => available.has(column)).slice(0, 3);
  }, [selectedEntity, selectedTable]);

  const quickFilterOptions = useMemo(() => {
    const output = {};
    for (const field of quickFilterFields) {
      const values = Array.from(new Set((listState.rows || [])
        .map((row) => row?.[field])
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .map((value) => String(value))
      )).slice(0, 120);
      output[field] = values;
    }
    return output;
  }, [listState.rows, quickFilterFields]);

  const routeContext = useMemo(() => buildRouteContext({
    moduleKey: normalizedModule,
    moduleName: meta?.module?.name || normalizedModule,
    routePathKey,
    viewTitle: resolvedViewTitle
  }), [meta?.module?.name, normalizedModule, routePathKey, resolvedViewTitle]);
  const sectionCardSpec = LEGACY_SECTION_CARD_BY_PATH[routePathKey] || null;

  const broilerReportBatchKey = useMemo(
    () => (broilerReportApplied.batchIds || []).join(','),
    [broilerReportApplied.batchIds]
  );

  const selectedLayerHealthFlockId = useMemo(() => {
    if (!isLayerQualityControl) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && layerFlocks.some((row) => toInt(row?.flock_id) === paramId)) {
      return paramId;
    }
    return 0;
  }, [isLayerQualityControl, searchParams, layerFlocks]);

  const selectedPigHealthGroupId = useMemo(() => {
    if (!isPigHealthRecords) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && pigGroups.some((row) => toInt(row?.group_id) === paramId)) {
      return paramId;
    }
    return 0;
  }, [isPigHealthRecords, searchParams, pigGroups]);

  const selectedPigReportGroupId = useMemo(() => {
    if (!isPigReports) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && pigGroups.some((row) => toInt(row?.group_id) === paramId)) {
      return paramId;
    }
    return toInt(pigGroups[0]?.group_id);
  }, [isPigReports, searchParams, pigGroups]);

  const overviewBundleDefs = useMemo(() => {
    if (!isLegacyScreen) return [];
    if (routeContext.sub !== 'index') return [];
    return OVERVIEW_BUNDLE_BY_ROOT[routeContext.root] || [];
  }, [isLegacyScreen, routeContext.root, routeContext.sub]);

  const reportBundleDefs = useMemo(() => {
    if (!isLegacyScreen) return [];
    if (routeContext.sub !== 'reports') return [];
    return REPORT_BUNDLE_BY_ROOT[routeContext.root] || [];
  }, [isLegacyScreen, routeContext.root, routeContext.sub]);

  const activePanelDefs = useMemo(() => {
    if (overviewBundleDefs.length) return overviewBundleDefs;
    if (reportBundleDefs.length && !isLegacyReportScreen) return reportBundleDefs;
    return [];
  }, [overviewBundleDefs, reportBundleDefs, isLegacyReportScreen]);

  const moduleTabs = useMemo(() => {
    const currentRoot = firstPathSegment(location.pathname);
    const rootMatched = LEGACY_MODULE_ROUTES.filter((routeItem) => firstPathSegment(routeItem.path) === currentRoot);
    const moduleMatched = LEGACY_MODULE_ROUTES.filter((routeItem) => String(routeItem.moduleKey || '').toUpperCase() === normalizedModule);

    const selected = rootMatched.length ? rootMatched : moduleMatched;
    const deduped = [];
    const seen = new Set();

    for (const routeItem of selected) {
      if (routeItem.showInTabs === false) continue;
      const key = String(routeItem.path || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(routeItem);
    }

    if (deduped.length) {
      return deduped.map((routeItem) => ({
        to: routeUrl(routeItem.path),
        label: routeItem.title || labelFromPath(routeItem.path)
      }));
    }

    const fallbackPath = MODULE_BASE_PATH_BY_KEY[normalizedModule] || `/modules/${normalizedModule}`;
    return [{
      to: fallbackPath,
      label: meta?.module?.name || normalizedModule
    }];
  }, [location.pathname, meta?.module?.name, normalizedModule]);

  const reportLayout = useMemo(
    () => REPORT_TABLE_BY_ROOT[routeContext.root] || null,
    [routeContext.root]
  );

  const reportColumns = useMemo(() => {
    if (!isLegacyReportScreen) return columns;
    const preferred = reportLayout?.columns || columns;
    const available = new Set(columns);
    const chosen = preferred.filter((column) => available.has(column));
    return chosen.length ? chosen : columns;
  }, [isLegacyReportScreen, reportLayout, columns]);

  const reportDateField = useMemo(() => (
    isLegacyReportScreen ? pickDateField(reportColumns) : ''
  ), [isLegacyReportScreen, reportColumns]);
  const legacyTableHeading = sectionCardSpec?.title || selectedEntity?.entity_label || selectedTable || 'Records';
  const createButtonLabel = (sectionCardSpec?.actionType === 'create' && sectionCardSpec?.actionLabel)
    ? sectionCardSpec.actionLabel
    : 'Create';

  const reportStatusOptions = useMemo(() => (
    Array.from(new Set((listState.rows || [])
      .map((row) => row?.status)
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
      .map((value) => String(value))
    ))
  ), [listState.rows]);

  const reportRows = useMemo(() => {
    if (!isLegacyReportScreen) return listState.rows || [];
    const fromDate = normalizeDateInput(reportFilters.from);
    const toDate = normalizeDateInput(reportFilters.to);
    const status = String(reportFilters.status || '');
    const rows = (listState.rows || []).filter((row) => {
      if (status && String(row?.status || '') !== status) return false;
      return rowPassesDateRange(row, reportDateField, fromDate, toDate);
    });

    if (String(reportFilters.mode || 'FULL').toUpperCase() === 'PARTIAL') {
      return rows.slice(0, 30);
    }
    return rows;
  }, [isLegacyReportScreen, listState.rows, reportFilters.from, reportFilters.to, reportFilters.status, reportFilters.mode, reportDateField]);

  const reportKpis = useMemo(() => {
    const rows = reportRows || [];
    const totalAmount = rows.reduce((acc, row) => (
      acc
      + toNumber(row?.amount)
      + toNumber(row?.total_amount)
      + toNumber(row?.sales_amount)
      + toNumber(row?.profitability)
    ), 0);
    const avgAmount = rows.length ? totalAmount / rows.length : 0;
    const statusTagged = rows.filter((row) => String(row?.status || '').trim() !== '').length;

    return [
      { label: 'Rows', value: formatMetric(rows.length) },
      { label: 'Total Value', value: formatMoney(totalAmount) },
      { label: 'Average Value', value: formatMoney(avgAmount) },
      { label: 'Status Tagged', value: formatMetric(statusTagged) }
    ];
  }, [reportRows]);

  useEffect(() => {
    setSelectedTable(defaultTable || '');
    setListState({ rows: [], page: 1, totalPages: 1, totalCount: 0 });
    setSearch('');
    setQuickFilters({});
    setReportFilters({ mode: 'FULL', from: '', to: '', status: '' });
    setBroilerReportDraft(makeDefaultBroilerReportFilters());
    setBroilerReportApplied(makeDefaultBroilerReportFilters());
    setBroilerReportRows({
      batches: [],
      daily: [],
      feed: [],
      health: [],
      vaccinations: [],
      harvests: []
    });
    setError('');
  }, [normalizedModule, defaultTable, resolvedViewTitle]);

  useEffect(() => {
    setQuickFilters({});
  }, [selectedTable]);

  useEffect(() => {
    if (!isLegacyScreen) return;
    if (!matchedLegacyRoute?.table) return;
    setSelectedTable(matchedLegacyRoute.table);
  }, [isLegacyScreen, matchedLegacyRoute?.table]);

  async function loadEntities() {
    if (!normalizedModule) return;

    const cacheKey = `module:${normalizedModule}:entities`;
    const result = await withCache(
      cacheKey,
      async () => {
        const response = await getEntities(normalizedModule);
        if (!response?.ok) throw new Error(response?.message || 'Unable to load module entities.');
        return response;
      },
      { maxAgeMs: 1000 * 60 * 60 * 24 * 7 }
    );

    setMeta(result.payload);
    setSource({
      transport: result.source,
      data: result.payload?.source || 'mysql',
      stale: Boolean(result.stale || result.payload?.stale)
    });

    const availableTables = (result.payload?.entities || []).map((entity) => entity.table);
    const forcedTable = matchedLegacyRoute?.table || defaultTable;
    const preferredTable = availableTables.includes(forcedTable)
      ? forcedTable
      : availableTables[0] || '';

    setSelectedTable((prev) => {
      if (isLegacyScreen && preferredTable) return preferredTable;
      if (prev && availableTables.includes(prev)) return prev;
      return preferredTable;
    });
  }

  async function loadRecords(page = 1, searchTerm = search, filterState = quickFilters) {
    if (!normalizedModule || !selectedTable) return;
    if (!metaModuleKey || metaModuleKey !== normalizedModule) return;
    if (isLegacyScreen && matchedLegacyRoute?.table && selectedTable !== matchedLegacyRoute.table) return;

    setLoading(true);
    setError('');

    try {
      const pageSize = (isBroilerEstimates || isCropsEstimates || isLegacyReportScreen) ? 1000 : 20;
      const sortOverride = TABLE_SORT_OVERRIDES[selectedTable] || {};
      const query = {
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        sort_by: (isBroilerEstimates || isCropsEstimates) ? 'created_at' : (sortOverride.sort_by || undefined),
        sort_dir: (isBroilerEstimates || isCropsEstimates) ? 'DESC' : (sortOverride.sort_dir || undefined)
      };

      for (const [filterKey, filterValue] of Object.entries(filterState || {})) {
        if (filterValue === undefined || filterValue === null || String(filterValue).trim() === '') continue;
        query[`filter_${filterKey}`] = filterValue;
      }

      const cacheKey = `module:${normalizedModule}:${selectedTable}:p${page}:s${searchTerm}:ps${pageSize}:f${JSON.stringify(filterState || {})}`;
      const result = await withCache(
        cacheKey,
        async () => {
          const response = await getRecords(normalizedModule, selectedTable, query);

          if (!response?.ok) {
            throw new Error(response?.message || 'Unable to load records.');
          }

          return response;
        },
        { maxAgeMs: 1000 * 60 * 60 * 24 * 7 }
      );

      setListState({
        rows: result.payload.rows || [],
        page: result.payload.page || 1,
        totalPages: result.payload.total_pages || 1,
        totalCount: result.payload.total_count || 0
      });

      setSource({
        transport: result.source,
        data: result.payload?.source || 'mysql',
        stale: Boolean(result.stale || result.payload?.stale)
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntities().catch((err) => {
      setError(err?.response?.data?.message || err?.message || 'Failed to load module metadata.');
    });
  }, [normalizedModule, defaultTable, matchedLegacyRoute?.table, isLegacyScreen]);

  useEffect(() => {
    if (!selectedTable) return;
    loadRecords(1, '').catch(() => {});
  }, [normalizedModule, selectedTable, metaModuleKey, isLegacyScreen, matchedLegacyRoute?.table, isBroilerEstimates, isCropsEstimates, isLegacyReportScreen]);

  useEffect(() => {
    if (!(isLayerQualityControl || isPigHealthRecords)) return;
    if (selectedTable !== 'health_records') return;

    const targetFilters = isLayerQualityControl
      ? {
          module_key: 'LAYERS',
          target_type: 'LAYER_FLOCK',
          target_id: selectedLayerHealthFlockId > 0 ? String(selectedLayerHealthFlockId) : ''
        }
      : {
          module_key: 'PIGS',
          target_type: 'PIG_GROUP',
          target_id: selectedPigHealthGroupId > 0 ? String(selectedPigHealthGroupId) : ''
        };

    const current = {
      module_key: String(quickFilters.module_key || ''),
      target_type: String(quickFilters.target_type || ''),
      target_id: String(quickFilters.target_id || '')
    };

    if (
      current.module_key === targetFilters.module_key
      && current.target_type === targetFilters.target_type
      && current.target_id === targetFilters.target_id
    ) {
      return;
    }

    setQuickFilters({
      module_key: targetFilters.module_key,
      target_type: targetFilters.target_type,
      target_id: targetFilters.target_id
    });

    loadRecords(1, '', {
      module_key: targetFilters.module_key,
      target_type: targetFilters.target_type,
      target_id: targetFilters.target_id
    }).catch(() => {});
  }, [
    isLayerQualityControl,
    isPigHealthRecords,
    selectedTable,
    selectedLayerHealthFlockId,
    selectedPigHealthGroupId,
    quickFilters
  ]);

  useEffect(() => {
    if (!activePanelDefs.length || isBroilerEstimates || isCropsEstimates) {
      setOverviewPanels([]);
      setOverviewLoading(false);
      return;
    }

    // When showing broiler overview, also fetch module dataset totals (mirrors legacy PHP overview)
    if (isBroilerOverview) {
      (async () => {
        try {
          const response = await getModuleDataset('BROILERS');
          if (response?.ok) {
            setBroilerTotals(response.payload?.totals || null);
          }
        } catch (err) {
          // ignore silently — don't block panels
        }
      })();
    }

    let cancelled = false;

    const run = async () => {
      setOverviewLoading(true);
      try {
        const panels = await Promise.all(activePanelDefs.map(async (panelDef) => {
          const moduleKeyForPanel = String(panelDef.moduleKey || normalizedModule).toUpperCase();
          const sortOverride = TABLE_SORT_OVERRIDES[panelDef.table] || {};
          const query = {
            page: 1,
            page_size: panelDef.limit || 8,
            sort_by: sortOverride.sort_by || 'created_at',
            sort_dir: sortOverride.sort_dir || 'DESC'
          };

          // Merge optional query override from panel definition (e.g., filter by status)
          if (panelDef.query && typeof panelDef.query === 'object') {
            Object.assign(query, panelDef.query);
          }

          const cacheKey = `bundle:${moduleKeyForPanel}:${panelDef.table}:${JSON.stringify(query)}`;
          const result = await withCache(
            cacheKey,
            async () => {
              const response = await getRecords(moduleKeyForPanel, panelDef.table, query);
              if (!response?.ok) throw new Error(response?.message || `Unable to load ${panelDef.table}.`);
              return response;
            },
            { maxAgeMs: 1000 * 60 * 10 }
          );

          return {
            ...panelDef,
            rows: result.payload?.rows || [],
            source: result.payload?.source || 'mysql',
            stale: Boolean(result.payload?.stale || result.stale)
          };
        }));

        if (!cancelled) {
          setOverviewPanels(panels);
        }
      } catch {
        if (!cancelled) {
          setOverviewPanels([]);
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    };

    run().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activePanelDefs, normalizedModule, isBroilerEstimates, isCropsEstimates]);

  useEffect(() => {
    const isBroilerBatchCenter = routePathKey === 'broilers/add-batch';
    const needsBroilerBatchList = isBroilerEstimates
      || isBroilerBatchView
      || isBroilerHealthRecords
      || isBroilerDailyEntry
      || isBroilerHarvest
      || isBroilerOverview
      || isBroilerReports
      || isBroilerBatchCenter;
    if (!needsBroilerBatchList) {
      setBroilerBatches([]);
    } else {
      const run = async () => {
        const result = await withCache(
          'module:BROILERS:broiler_batches:estimate-picker',
          async () => {
            const response = await getRecords('BROILERS', 'broiler_batches', {
              page: 1,
              page_size: 300,
              sort_by: 'created_at',
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || 'Unable to load broiler batches.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 5 }
        );
        setBroilerBatches(result.payload?.rows || []);
      };

      run().catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load estimate batches.');
      });
    }

    if (!isBroilerEstimates) {
      setEstimateForm(makeEstimateForm({ batch: null, projection: null }));
      setEstimateSeed('');
    }

    if (!isCropsEstimates) {
      setCropBatches([]);
      setCropEstimateForm(makeCropEstimateForm({ batch: null, projection: null }));
      setCropEstimateSeed('');
    } else {
      const runCrop = async () => {
        const result = await withCache(
          'module:CROPS:crop_batches:estimate-picker',
          async () => {
            const response = await getRecords('CROPS', 'crop_batches', {
              page: 1,
              page_size: 300,
              sort_by: 'created_at',
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || 'Unable to load crop batches.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 5 }
        );
        setCropBatches(result.payload?.rows || []);
      };

      runCrop().catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load crop estimate batches.');
      });
    }

    const needsLayerFlockList = isLayerFlockView || isLayerQualityControl;
    if (!needsLayerFlockList) {
      setLayerFlocks([]);
    } else {
      const runFlocks = async () => {
        const result = await withCache(
          'module:LAYERS:layer_flocks:view-picker',
          async () => {
            const response = await getRecords('LAYERS', 'layer_flocks', {
              page: 1,
              page_size: 300,
              sort_by: 'created_at',
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || 'Unable to load flocks.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 5 }
        );
        setLayerFlocks(result.payload?.rows || []);
      };

      runFlocks().catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load flock list.');
      });
    }

    if (!(isPigHealthRecords || isPigReports)) {
      setPigGroups([]);
    } else {
      const runGroups = async () => {
        const result = await withCache(
          'module:PIGS:pig_groups:health-picker',
          async () => {
            const response = await getRecords('PIGS', 'pig_groups', {
              page: 1,
              page_size: 300,
              sort_by: 'created_at',
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || 'Unable to load pig groups.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 5 }
        );
        setPigGroups(result.payload?.rows || []);
      };

      runGroups().catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load pig groups.');
      });
    }

    if (!isPigReports) {
      setPigReportRows({
        growth: [],
        breeding: [],
        health: [],
        sales: []
      });
    }
    if (!isPigIndividuals) {
      setPigIndividualRows({
        weights: [],
        sales: [],
        health: []
      });
    } else {
      const runIndividuals = async () => {
        const [weightsRes, salesRes, healthRes] = await Promise.all([
          withCache(
            'module:PIGS:pig_individual_weights:list',
            async () => getRecords('PIGS', 'pig_individual_weights', {
              page: 1,
              page_size: 120,
              sort_by: 'log_date',
              sort_dir: 'DESC'
            }),
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            'module:PIGS:pig_individual_sales:list',
            async () => getRecords('PIGS', 'pig_individual_sales', {
              page: 1,
              page_size: 120,
              sort_by: 'sale_date',
              sort_dir: 'DESC'
            }),
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            'module:PIGS:health_records:individual',
            async () => getRecords('PIGS', 'health_records', {
              page: 1,
              page_size: 120,
              sort_by: 'recorded_at',
              sort_dir: 'DESC',
              module_key: 'PIGS',
              target_type: 'PIG'
            }),
            { maxAgeMs: 1000 * 60 * 3 }
          )
        ]);

        setPigIndividualRows({
          weights: weightsRes?.payload?.rows || [],
          sales: salesRes?.payload?.rows || [],
          health: healthRes?.payload?.rows || []
        });
      };

      runIndividuals().catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load individual pig records.');
      });
    }
    if (!isBroilerHealthRecords) {
      setBroilerHealthRows({
        records: [],
        vaccinations: []
      });
    }
  }, [
    isBroilerEstimates,
    isCropsEstimates,
    isBroilerBatchView,
    isLayerFlockView,
    isBroilerHealthRecords,
    isBroilerDailyEntry,
    isBroilerHarvest,
    isBroilerOverview,
    isBroilerReports,
    isLayerQualityControl,
    isPigIndividuals,
    isPigHealthRecords,
    isPigReports
  ]);

  const latestProjectionByBatch = useMemo(() => {
    const rows = [...(listState.rows || [])].sort((a, b) => {
      const timeA = Date.parse(String(a?.created_at || '')) || 0;
      const timeB = Date.parse(String(b?.created_at || '')) || 0;
      if (timeB !== timeA) return timeB - timeA;
      return toInt(b?.projection_id) - toInt(a?.projection_id);
    });

    const map = new Map();
    for (const row of rows) {
      const batchId = toInt(row?.batch_id);
      if (batchId < 1 || map.has(batchId)) continue;
      map.set(batchId, row);
    }
    return map;
  }, [listState.rows]);

  const selectedBatchId = useMemo(() => {
    if (!isBroilerEstimates) return 0;

    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && broilerBatches.some((row) => toInt(row?.batch_id) === paramId)) {
      return paramId;
    }

    return toInt(broilerBatches[0]?.batch_id);
  }, [isBroilerEstimates, searchParams, broilerBatches]);

  useEffect(() => {
    if (!isBroilerEstimates || selectedBatchId < 1) return;
    const currentId = toInt(searchParams.get('id'));
    if (currentId === selectedBatchId) return;
    const next = new URLSearchParams(searchParams);
    next.set('id', String(selectedBatchId));
    setSearchParams(next, { replace: true });
  }, [isBroilerEstimates, selectedBatchId, searchParams, setSearchParams]);

  const selectedBatch = useMemo(
    () => broilerBatches.find((row) => toInt(row?.batch_id) === selectedBatchId) || null,
    [broilerBatches, selectedBatchId]
  );

  const selectedProjection = useMemo(
    () => latestProjectionByBatch.get(selectedBatchId) || null,
    [latestProjectionByBatch, selectedBatchId]
  );

  const selectedCropBatchId = useMemo(() => {
    if (!isCropsEstimates) return 0;

    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && cropBatches.some((row) => toInt(row?.batch_id) === paramId)) {
      return paramId;
    }

    return toInt(cropBatches[0]?.batch_id);
  }, [isCropsEstimates, searchParams, cropBatches]);

  useEffect(() => {
    if (!isCropsEstimates || selectedCropBatchId < 1) return;
    const currentId = toInt(searchParams.get('id'));
    if (currentId === selectedCropBatchId) return;
    const next = new URLSearchParams(searchParams);
    next.set('id', String(selectedCropBatchId));
    setSearchParams(next, { replace: true });
  }, [isCropsEstimates, selectedCropBatchId, searchParams, setSearchParams]);

  const selectedCropBatch = useMemo(
    () => cropBatches.find((row) => toInt(row?.batch_id) === selectedCropBatchId) || null,
    [cropBatches, selectedCropBatchId]
  );

  const selectedCropProjection = useMemo(
    () => latestProjectionByBatch.get(selectedCropBatchId) || null,
    [latestProjectionByBatch, selectedCropBatchId]
  );

  const selectedViewBatchId = useMemo(() => {
    if (!isBroilerBatchView) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && broilerBatches.some((row) => toInt(row?.batch_id) === paramId)) {
      return paramId;
    }
    return toInt(broilerBatches[0]?.batch_id);
  }, [isBroilerBatchView, searchParams, broilerBatches]);

  const selectedViewBatch = useMemo(
    () => broilerBatches.find((row) => toInt(row?.batch_id) === selectedViewBatchId) || null,
    [broilerBatches, selectedViewBatchId]
  );

  const selectedHealthBatchId = useMemo(() => {
    if (!isBroilerHealthRecords) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && broilerBatches.some((row) => toInt(row?.batch_id) === paramId)) {
      return paramId;
    }
    return 0;
  }, [isBroilerHealthRecords, searchParams, broilerBatches]);

  useEffect(() => {
    if (!isBroilerBatchView || selectedViewBatchId < 1) return;
    const currentId = toInt(searchParams.get('id'));
    if (currentId === selectedViewBatchId) return;
    const next = new URLSearchParams(searchParams);
    next.set('id', String(selectedViewBatchId));
    setSearchParams(next, { replace: true });
  }, [isBroilerBatchView, selectedViewBatchId, searchParams, setSearchParams]);

  const selectedViewFlockId = useMemo(() => {
    if (!isLayerFlockView) return 0;
    const paramId = toInt(searchParams.get('id'));
    if (paramId > 0 && layerFlocks.some((row) => toInt(row?.flock_id) === paramId)) {
      return paramId;
    }
    return toInt(layerFlocks[0]?.flock_id);
  }, [isLayerFlockView, searchParams, layerFlocks]);

  const selectedViewFlock = useMemo(
    () => layerFlocks.find((row) => toInt(row?.flock_id) === selectedViewFlockId) || null,
    [layerFlocks, selectedViewFlockId]
  );

  const selectedPigReportGroup = useMemo(
    () => pigGroups.find((row) => toInt(row?.group_id) === selectedPigReportGroupId) || null,
    [pigGroups, selectedPigReportGroupId]
  );

  useEffect(() => {
    if (!isLayerFlockView || selectedViewFlockId < 1) return;
    const currentId = toInt(searchParams.get('id'));
    if (currentId === selectedViewFlockId) return;
    const next = new URLSearchParams(searchParams);
    next.set('id', String(selectedViewFlockId));
    setSearchParams(next, { replace: true });
  }, [isLayerFlockView, selectedViewFlockId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isPigReports || selectedPigReportGroupId < 1) return;
    const currentId = toInt(searchParams.get('id'));
    if (currentId === selectedPigReportGroupId) return;
    const next = new URLSearchParams(searchParams);
    next.set('id', String(selectedPigReportGroupId));
    setSearchParams(next, { replace: true });
  }, [isPigReports, selectedPigReportGroupId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isBroilerBatchView || selectedViewBatchId < 1) {
      setBroilerViewRows({
        logs: [],
        miscCosts: [],
        vaccinations: [],
        harvests: []
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const fetchFilteredRows = async (table, sortBy = 'created_at') => {
        const cacheKey = `broiler:view:${table}:${selectedViewBatchId}`;
        const result = await withCache(
          cacheKey,
          async () => {
            const response = await getRecords('BROILERS', table, {
              page: 1,
              page_size: 120,
              filter_batch_id: selectedViewBatchId,
              sort_by: sortBy,
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || `Unable to load ${table}.`);
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        );
        return result.payload?.rows || [];
      };

      const [logs, miscCosts, vaccinations, harvests] = await Promise.all([
        fetchFilteredRows('broiler_daily_logs', 'log_date'),
        fetchFilteredRows('broiler_misc_costs', 'cost_date'),
        fetchFilteredRows('broiler_vaccinations', 'scheduled_date'),
        fetchFilteredRows('broiler_harvests', 'harvest_date')
      ]);

      if (!cancelled) {
        setBroilerViewRows({
          logs,
          miscCosts,
          vaccinations,
          harvests
        });
      }
    };

    run().catch((err) => {
      if (!cancelled) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load batch view details.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isBroilerBatchView, selectedViewBatchId]);

  useEffect(() => {
    if (!isBroilerHealthRecords) {
      setBroilerHealthRows({
        records: [],
        vaccinations: []
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const queryHealth = {
        page: 1,
        page_size: 220,
        filter_module_key: 'BROILERS',
        filter_target_type: 'BROILER_BATCH',
        sort_by: 'recorded_at',
        sort_dir: 'DESC'
      };

      if (selectedHealthBatchId > 0) {
        queryHealth.filter_target_id = selectedHealthBatchId;
      }

      const queryVaccinations = {
        page: 1,
        page_size: 220,
        sort_by: 'scheduled_date',
        sort_dir: 'DESC'
      };

      if (selectedHealthBatchId > 0) {
        queryVaccinations.filter_batch_id = selectedHealthBatchId;
      }

      const [healthResult, vaccinationResult] = await Promise.all([
        withCache(
          `broiler:health-records:${JSON.stringify(queryHealth)}`,
          async () => {
            const response = await getRecords('BROILERS', 'health_records', queryHealth);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load broiler health records.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        ),
        withCache(
          `broiler:vaccinations:${JSON.stringify(queryVaccinations)}`,
          async () => {
            const response = await getRecords('BROILERS', 'broiler_vaccinations', queryVaccinations);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load vaccinations.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        )
      ]);

      if (!cancelled) {
        setBroilerHealthRows({
          records: healthResult.payload?.rows || [],
          vaccinations: vaccinationResult.payload?.rows || []
        });
      }
    };

    run().catch((err) => {
      if (!cancelled) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load broiler health data.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isBroilerHealthRecords, selectedHealthBatchId]);

  useEffect(() => {
    if (!isLayerFlockView || selectedViewFlockId < 1) {
      setLayerViewRows({
        logs: [],
        sales: []
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const fetchFilteredRows = async (table, sortBy = 'created_at') => {
        const cacheKey = `layers:view:${table}:${selectedViewFlockId}`;
        const result = await withCache(
          cacheKey,
          async () => {
            const response = await getRecords('LAYERS', table, {
              page: 1,
              page_size: 120,
              filter_flock_id: selectedViewFlockId,
              sort_by: sortBy,
              sort_dir: 'DESC'
            });
            if (!response?.ok) throw new Error(response?.message || `Unable to load ${table}.`);
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        );
        return result.payload?.rows || [];
      };

      const [logs, sales] = await Promise.all([
        fetchFilteredRows('layer_daily_logs', 'log_date'),
        fetchFilteredRows('layer_sales', 'sale_date')
      ]);

      if (!cancelled) {
        setLayerViewRows({
          logs,
          sales
        });
      }
    };

    run().catch((err) => {
      if (!cancelled) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load flock view details.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLayerFlockView, selectedViewFlockId]);

  useEffect(() => {
    if (!isBroilerReports) {
      setBroilerReportRows({
        batches: [],
        daily: [],
        feed: [],
        health: [],
        vaccinations: [],
        harvests: []
      });
      setBroilerReportLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setBroilerReportLoading(true);
      try {
        const selectedBatchIds = (broilerReportApplied.batchIds || [])
          .map((value) => toInt(value))
          .filter((value) => value > 0);
        const singleBatchId = selectedBatchIds.length === 1 ? selectedBatchIds[0] : 0;

        const [batchesResult, dailyResult, feedResult, healthResult, vaccinationResult, harvestResult] = await Promise.all([
          withCache(
            `broilers:report:batches:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 600,
                sort_by: 'batch_id',
                sort_dir: 'DESC'
              };
              if (singleBatchId > 0) {
                query.filter_batch_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'broiler_batches', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load broiler batches report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            `broilers:report:daily:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 1200,
                sort_by: 'log_date',
                sort_dir: 'DESC'
              };
              if (singleBatchId > 0) {
                query.filter_batch_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'broiler_daily_logs', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load daily logs report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            `broilers:report:feed:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 1200,
                sort_by: 'feed_date',
                sort_dir: 'DESC'
              };
              if (singleBatchId > 0) {
                query.filter_batch_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'broiler_feed_logs', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load feed logs report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            `broilers:report:health:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 1200,
                sort_by: 'recorded_at',
                sort_dir: 'DESC',
                filter_module_key: 'BROILERS',
                filter_target_type: 'BROILER_BATCH'
              };
              if (singleBatchId > 0) {
                query.filter_target_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'health_records', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load health report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            `broilers:report:vaccinations:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 1200,
                sort_by: 'scheduled_date',
                sort_dir: 'DESC'
              };
              if (singleBatchId > 0) {
                query.filter_batch_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'broiler_vaccinations', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load vaccination report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          ),
          withCache(
            `broilers:report:harvests:${singleBatchId || 'all'}`,
            async () => {
              const query = {
                page: 1,
                page_size: 1200,
                sort_by: 'harvest_date',
                sort_dir: 'DESC'
              };
              if (singleBatchId > 0) {
                query.filter_batch_id = singleBatchId;
              }
              const response = await getRecords('BROILERS', 'broiler_harvests', query);
              if (!response?.ok) throw new Error(response?.message || 'Unable to load harvest report rows.');
              return response;
            },
            { maxAgeMs: 1000 * 60 * 3 }
          )
        ]);

        if (!cancelled) {
          setBroilerReportRows({
            batches: batchesResult.payload?.rows || [],
            daily: dailyResult.payload?.rows || [],
            feed: feedResult.payload?.rows || [],
            health: healthResult.payload?.rows || [],
            vaccinations: vaccinationResult.payload?.rows || [],
            harvests: harvestResult.payload?.rows || []
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load broiler report data.');
        }
      } finally {
        if (!cancelled) {
          setBroilerReportLoading(false);
        }
      }
    };

    run().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    isBroilerReports,
    broilerReportApplied.mode,
    broilerReportApplied.from,
    broilerReportApplied.to,
    broilerReportBatchKey
  ]);

  useEffect(() => {
    if (!isPigReports || selectedPigReportGroupId < 1) {
      setPigReportRows({
        growth: [],
        breeding: [],
        health: [],
        sales: []
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const queryGrowth = {
        page: 1,
        page_size: 120,
        filter_group_id: selectedPigReportGroupId,
        sort_by: 'log_date',
        sort_dir: 'DESC'
      };

      const queryBreeding = {
        page: 1,
        page_size: 120,
        filter_group_id: selectedPigReportGroupId,
        sort_by: 'event_date',
        sort_dir: 'DESC'
      };

      const queryHealth = {
        page: 1,
        page_size: 120,
        filter_module_key: 'PIGS',
        filter_target_type: 'PIG_GROUP',
        filter_target_id: selectedPigReportGroupId,
        sort_by: 'recorded_at',
        sort_dir: 'DESC'
      };

      const querySales = {
        page: 1,
        page_size: 120,
        filter_group_id: selectedPigReportGroupId,
        sort_by: 'sale_date',
        sort_dir: 'DESC'
      };

      const [growthResult, breedingResult, healthResult, salesResult] = await Promise.all([
        withCache(
          `pigs:reports:growth:${selectedPigReportGroupId}`,
          async () => {
            const response = await getRecords('PIGS', 'pig_growth_logs', queryGrowth);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load pig growth logs.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        ),
        withCache(
          `pigs:reports:breeding:${selectedPigReportGroupId}`,
          async () => {
            const response = await getRecords('PIGS', 'pig_breeding_records', queryBreeding);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load pig breeding records.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        ),
        withCache(
          `pigs:reports:health:${selectedPigReportGroupId}`,
          async () => {
            const response = await getRecords('PIGS', 'health_records', queryHealth);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load pig health records.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        ),
        withCache(
          `pigs:reports:sales:${selectedPigReportGroupId}`,
          async () => {
            const response = await getRecords('PIGS', 'pig_sales', querySales);
            if (!response?.ok) throw new Error(response?.message || 'Unable to load pig sales.');
            return response;
          },
          { maxAgeMs: 1000 * 60 * 3 }
        )
      ]);

      if (!cancelled) {
        setPigReportRows({
          growth: growthResult.payload?.rows || [],
          breeding: breedingResult.payload?.rows || [],
          health: healthResult.payload?.rows || [],
          sales: salesResult.payload?.rows || []
        });
      }
    };

    run().catch((err) => {
      if (!cancelled) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load pig report details.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isPigReports, selectedPigReportGroupId]);

  useEffect(() => {
    if (!isBroilerEstimates || selectedBatchId < 1) return;

    const nextSeed = buildEstimateFormSeed(selectedBatchId, toInt(selectedProjection?.projection_id));
    if (nextSeed === estimateSeed) return;

    setEstimateForm(makeEstimateForm({
      batch: selectedBatch,
      projection: selectedProjection
    }));
    setEstimateSeed(nextSeed);
  }, [
    isBroilerEstimates,
    selectedBatchId,
    selectedBatch,
    selectedProjection,
    estimateSeed
  ]);

  useEffect(() => {
    if (!isCropsEstimates || selectedCropBatchId < 1) return;

    const nextSeed = buildEstimateFormSeed(selectedCropBatchId, toInt(selectedCropProjection?.projection_id));
    if (nextSeed === cropEstimateSeed) return;

    setCropEstimateForm(makeCropEstimateForm({
      batch: selectedCropBatch,
      projection: selectedCropProjection
    }));
    setCropEstimateSeed(nextSeed);
  }, [
    isCropsEstimates,
    selectedCropBatchId,
    selectedCropBatch,
    selectedCropProjection,
    cropEstimateSeed
  ]);

  const estimatePreview = useMemo(
    () => computeEstimatePreview(estimateForm),
    [estimateForm]
  );

  const cropEstimatePreview = useMemo(
    () => computeCropEstimatePreview(cropEstimateForm),
    [cropEstimateForm]
  );

  const priceSnapshot = useMemo(() => {
    const rows = [...(listState.rows || [])];
    const sorted = rows.sort((a, b) => {
      const timeA = Date.parse(String(a?.created_at || '')) || 0;
      const timeB = Date.parse(String(b?.created_at || '')) || 0;
      return timeB - timeA;
    });

    const latest = sorted[0] || null;
    const thirtyDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 30);
    const recentRows = sorted.filter((row) => {
      const time = Date.parse(String(row?.created_at || ''));
      return Number.isFinite(time) && time >= thirtyDaysAgo;
    });

    const avg = (dataset, key) => {
      if (!dataset.length) return 0;
      const total = dataset.reduce((acc, row) => acc + toNumber(row?.[key]), 0);
      return total / dataset.length;
    };

    return {
      latest_price_per_bird: toNumber(latest?.sale_price_per_bird),
      latest_price_per_kg: toNumber(latest?.price_per_kg),
      avg_30d_price_per_bird: avg(recentRows, 'sale_price_per_bird'),
      avg_30d_price_per_kg: avg(recentRows, 'price_per_kg')
    };
  }, [listState.rows]);

  const allBatchSnapshotRows = useMemo(
    () => Array.from(latestProjectionByBatch.values()),
    [latestProjectionByBatch]
  );

  const selectedBatchProjectionRows = useMemo(
    () => (listState.rows || [])
      .filter((row) => toInt(row?.batch_id) === selectedBatchId)
      .sort((a, b) => {
        const timeA = Date.parse(String(a?.created_at || '')) || 0;
        const timeB = Date.parse(String(b?.created_at || '')) || 0;
        if (timeB !== timeA) return timeB - timeA;
        return toInt(b?.projection_id) - toInt(a?.projection_id);
      }),
    [listState.rows, selectedBatchId]
  );

  const selectedCropProjectionRows = useMemo(
    () => (listState.rows || [])
      .filter((row) => toInt(row?.batch_id) === selectedCropBatchId)
      .sort((a, b) => {
        const timeA = Date.parse(String(a?.created_at || '')) || 0;
        const timeB = Date.parse(String(b?.created_at || '')) || 0;
        if (timeB !== timeA) return timeB - timeA;
        return toInt(b?.projection_id) - toInt(a?.projection_id);
      }),
    [listState.rows, selectedCropBatchId]
  );

  const batchCodeById = useMemo(() => {
    const map = new Map();
    for (const row of broilerBatches) {
      map.set(toInt(row?.batch_id), String(row?.batch_code || `Batch ${toInt(row?.batch_id)}`));
    }
    return map;
  }, [broilerBatches]);

  const cropBatchCodeById = useMemo(() => {
    const map = new Map();
    for (const row of cropBatches) {
      map.set(toInt(row?.batch_id), String(row?.batch_code || `Batch ${toInt(row?.batch_id)}`));
    }
    return map;
  }, [cropBatches]);

  const flockCodeById = useMemo(() => {
    const map = new Map();
    for (const row of layerFlocks) {
      map.set(toInt(row?.flock_id), String(row?.flock_code || `Flock ${toInt(row?.flock_id)}`));
    }
    return map;
  }, [layerFlocks]);

  const pigGroupCodeById = useMemo(() => {
    const map = new Map();
    for (const row of pigGroups) {
      map.set(toInt(row?.group_id), String(row?.group_code || `Group ${toInt(row?.group_id)}`));
    }
    return map;
  }, [pigGroups]);

  const broilerViewSummary = useMemo(() => {
    if (!selectedViewBatch) {
      return {
        vaccinationsDue: 0,
        vaccinationsOverdue: 0,
        totalRevenue: 0,
        totalFeedKg: 0
      };
    }

    const today = normalizeDateInput(new Date().toISOString());
    const vaccinationsDue = broilerViewRows.vaccinations.filter((row) => String(row?.status || '').toUpperCase() === 'DUE').length;
    const vaccinationsOverdue = broilerViewRows.vaccinations.filter((row) => {
      const status = String(row?.status || '').toUpperCase();
      if (status === 'DONE') return false;
      const dueDate = normalizeDateInput(row?.scheduled_date);
      return dueDate !== '' && dueDate < today;
    }).length;
    const totalRevenue = broilerViewRows.harvests.reduce((acc, row) => acc + toNumber(row?.total_amount), 0);
    const totalFeedKg = broilerViewRows.logs.reduce((acc, row) => acc + toNumber(row?.feed_kg), 0);

    return {
      vaccinationsDue,
      vaccinationsOverdue,
      totalRevenue,
      totalFeedKg
    };
  }, [selectedViewBatch, broilerViewRows.harvests, broilerViewRows.logs, broilerViewRows.vaccinations]);

  const layerViewSummary = useMemo(() => {
    if (!selectedViewFlock) {
      return {
        eggsTotal: 0,
        salesTotal: 0,
        avgShellQuality: 0
      };
    }

    const eggsTotal = layerViewRows.logs.reduce((acc, row) => acc + toNumber(row?.egg_count || row?.eggs_total), 0);
    const salesTotal = layerViewRows.sales.reduce((acc, row) => acc + toNumber(row?.total_amount), 0);
    const avgShellQuality = layerViewRows.logs.length
      ? layerViewRows.logs.reduce((acc, row) => acc + toNumber(row?.shell_quality_score), 0) / layerViewRows.logs.length
      : 0;

    return {
      eggsTotal,
      salesTotal,
      avgShellQuality
    };
  }, [selectedViewFlock, layerViewRows.logs, layerViewRows.sales]);

  const broilerHealthSummary = useMemo(() => {
    const today = normalizeDateInput(new Date().toISOString());
    const upcomingLimit = normalizeDateInput(new Date(Date.now() + (1000 * 60 * 60 * 24 * 30)).toISOString());

    let dueCount = 0;
    let overdueCount = 0;
    let doneCount = 0;

    for (const row of broilerHealthRows.vaccinations || []) {
      const status = String(row?.status || '').toUpperCase();
      if (status === 'DONE') {
        doneCount += 1;
        continue;
      }
      const dueDate = normalizeDateInput(row?.scheduled_date);
      if (dueDate && dueDate < today) {
        overdueCount += 1;
      } else {
        dueCount += 1;
      }
    }

    const grouped = new Map();
    for (const row of broilerHealthRows.vaccinations || []) {
      const status = String(row?.status || '').toUpperCase();
      const scheduledDate = normalizeDateInput(row?.scheduled_date);
      if (status === 'DONE' || !scheduledDate || scheduledDate < today || scheduledDate > upcomingLimit) continue;
      const key = scheduledDate;
      const entry = grouped.get(key) || {
        date: key,
        count: 0,
        batches: new Set(),
        vaccines: new Set()
      };
      entry.count += 1;
      entry.batches.add(batchCodeById.get(toInt(row?.batch_id)) || `Batch ${toInt(row?.batch_id)}`);
      entry.vaccines.add(String(row?.vaccine_name || 'Vaccination'));
      grouped.set(key, entry);
    }

    const calendarRows = Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        date: entry.date,
        count: entry.count,
        batches: Array.from(entry.batches).join(', '),
        vaccines: Array.from(entry.vaccines).join(', ')
      }));

    return {
      recordsCount: (broilerHealthRows.records || []).length,
      dueCount,
      overdueCount,
      doneCount,
      calendarRows
    };
  }, [broilerHealthRows.records, broilerHealthRows.vaccinations, batchCodeById]);

  const broilerDailySummary = useMemo(() => {
    const rows = listState.rows || [];
    const totalFeedKg = rows.reduce((acc, row) => acc + toNumber(row?.feed_kg), 0);
    const totalMortality = rows.reduce((acc, row) => acc + toNumber(row?.mortality_count), 0);
    const avgWeightKg = rows.length
      ? rows.reduce((acc, row) => acc + toNumber(row?.avg_weight_kg), 0) / rows.length
      : 0;

    return {
      rowsCount: rows.length,
      totalFeedKg,
      totalMortality,
      avgWeightKg
    };
  }, [listState.rows]);

  const broilerHarvestSummary = useMemo(() => {
    const rows = listState.rows || [];
    const birdsHarvested = rows.reduce((acc, row) => acc + toNumber(row?.birds_harvested), 0);
    const totalWeightKg = rows.reduce((acc, row) => acc + toNumber(row?.total_weight_kg), 0);
    const totalAmount = rows.reduce((acc, row) => acc + toNumber(row?.total_amount), 0);

    return {
      rowsCount: rows.length,
      birdsHarvested,
      totalWeightKg,
      totalAmount
    };
  }, [listState.rows]);

  const broilerOverviewSummary = useMemo(() => {
    const rows = broilerBatches.length ? broilerBatches : (listState.rows || []);
    const activeRows = rows.filter((row) => String(row?.status || '').toUpperCase() === 'ACTIVE');
    const closedRows = rows.filter((row) => String(row?.status || '').toUpperCase() === 'CLOSED');
    const urgentRows = rows.filter((row) => (
      toNumber(row?.mortality_rate) >= 5
      || toNumber(row?.profitability) < 0
      || toNumber(row?.current_count) <= 0
    ));
    const watchRows = rows.filter((row) => (
      !urgentRows.includes(row) && (
        toNumber(row?.mortality_rate) >= 2
        || toNumber(row?.fcr) >= 2
        || toNumber(row?.profitability) < 1000
      )
    ));
    const radarRows = [...rows]
      .map((row) => {
        const score = (
          (toNumber(row?.mortality_rate) * 10)
          + (toNumber(row?.fcr) * 8)
          + (toNumber(row?.profitability) < 0 ? 30 : 0)
        );
        return {
          ...row,
          radar_score: score
        };
      })
      .sort((a, b) => toNumber(b?.radar_score) - toNumber(a?.radar_score))
      .slice(0, 8);

    return {
      rows,
      activeRows,
      closedRows,
      urgentRows,
      watchRows,
      radarRows
    };
  }, [broilerBatches, listState.rows]);

  const healthRouteSummary = useMemo(() => {
    const rows = listState.rows || [];
    const diagnosisTagged = rows.filter((row) => String(row?.diagnosis || '').trim() !== '').length;
    const treatmentTagged = rows.filter((row) => String(row?.treatment || '').trim() !== '').length;
    const medicationTagged = rows.filter((row) => String(row?.medication || '').trim() !== '').length;
    return {
      rowsCount: rows.length,
      diagnosisTagged,
      treatmentTagged,
      medicationTagged
    };
  }, [listState.rows]);

  const pigReportSummary = useMemo(() => {
    const latestGrowth = pigReportRows.growth[0] || null;
    return {
      remainingHeads: toInt(selectedPigReportGroup?.remaining_heads || selectedPigReportGroup?.count_heads),
      latestWeightKg: toNumber(selectedPigReportGroup?.latest_weight_kg || latestGrowth?.avg_weight_kg),
      mortalityRate: toNumber(selectedPigReportGroup?.mortality_rate),
      fcr: toNumber(selectedPigReportGroup?.fcr),
      breedingRecords: pigReportRows.breeding.length,
      healthRecords: pigReportRows.health.length,
      salesRecords: pigReportRows.sales.length
    };
  }, [selectedPigReportGroup, pigReportRows.breeding, pigReportRows.growth, pigReportRows.health, pigReportRows.sales]);

  const broilerReportSelectedBatchSet = useMemo(() => (
    new Set((broilerReportApplied.batchIds || [])
      .map((value) => toInt(value))
      .filter((value) => value > 0))
  ), [broilerReportApplied.batchIds]);

  const broilerReportFilteredRows = useMemo(() => {
    if (!isBroilerReports) {
      return {
        batches: [],
        daily: [],
        feed: [],
        health: [],
        vaccinations: [],
        harvests: []
      };
    }

    const hasBatchFilter = broilerReportSelectedBatchSet.size > 0;
    const fromDate = normalizeDateInput(broilerReportApplied.from);
    const toDate = normalizeDateInput(broilerReportApplied.to);

    const hasBatch = (batchId) => {
      if (!hasBatchFilter) return true;
      return broilerReportSelectedBatchSet.has(toInt(batchId));
    };

    const filterRows = (rows, dateField, batchField = 'batch_id') => (
      (rows || []).filter((row) => (
        hasBatch(row?.[batchField]) && rowPassesDateRange(row, dateField, fromDate, toDate)
      ))
    );

    return {
      batches: (broilerReportRows.batches || []).filter((row) => hasBatch(row?.batch_id)),
      daily: filterRows(broilerReportRows.daily, 'log_date'),
      feed: filterRows(broilerReportRows.feed, 'feed_date'),
      health: filterRows(broilerReportRows.health, 'recorded_at', 'target_id'),
      vaccinations: filterRows(broilerReportRows.vaccinations, 'scheduled_date'),
      harvests: filterRows(broilerReportRows.harvests, 'harvest_date')
    };
  }, [
    isBroilerReports,
    broilerReportRows.batches,
    broilerReportRows.daily,
    broilerReportRows.feed,
    broilerReportRows.health,
    broilerReportRows.vaccinations,
    broilerReportRows.harvests,
    broilerReportApplied.from,
    broilerReportApplied.to,
    broilerReportSelectedBatchSet
  ]);

  const broilerReportSummary = useMemo(() => {
    const filtered = broilerReportFilteredRows;
    const batchRows = filtered.batches || [];
    const dailyRows = filtered.daily || [];
    const feedRows = filtered.feed || [];
    const harvestRows = filtered.harvests || [];

    const runningRevenueFromBatches = batchRows.reduce((acc, row) => acc + toNumber(row?.harvest_revenue), 0);
    const runningRevenueFromHarvests = harvestRows.reduce((acc, row) => acc + toNumber(row?.total_amount), 0);
    const runningRevenue = runningRevenueFromBatches > 0 ? runningRevenueFromBatches : runningRevenueFromHarvests;
    const runningCop = batchRows.reduce((acc, row) => acc + toNumber(row?.cost_of_production), 0);
    const runningVaccineCost = batchRows.reduce((acc, row) => acc + toNumber(row?.vaccine_cost_used), 0);
    const runningLaborCost = batchRows.reduce((acc, row) => acc + toNumber(row?.labor_cost_used), 0);
    const adjustedCop = runningCop + runningVaccineCost + runningLaborCost;
    const periodFeedCost = (
      feedRows.reduce((acc, row) => acc + toNumber(row?.total_cost), 0)
      + dailyRows.reduce((acc, row) => acc + toNumber(row?.feed_cost), 0)
    );

    const avgOf = (rows, key) => {
      if (!rows.length) return 0;
      return rows.reduce((acc, row) => acc + toNumber(row?.[key]), 0) / rows.length;
    };

    return {
      batchCount: batchRows.length,
      birdsCurrent: batchRows.reduce((acc, row) => acc + toInt(row?.current_count), 0),
      runningCop,
      runningVaccineCost,
      runningLaborCost,
      adjustedCop,
      runningRevenue,
      runningProfit: runningRevenue - runningCop,
      runningProfitAdjusted: runningRevenue - adjustedCop,
      avgFcr: avgOf(batchRows, 'fcr'),
      avgAdgG: avgOf(batchRows, 'adg_g'),
      avgMortalityRate: avgOf(batchRows, 'mortality_rate'),
      periodFeedKg: (
        feedRows.reduce((acc, row) => acc + toNumber(row?.quantity_kg), 0)
        || dailyRows.reduce((acc, row) => acc + toNumber(row?.feed_kg), 0)
      ),
      periodFeedCost,
      periodHarvestBirds: harvestRows.reduce((acc, row) => acc + toInt(row?.birds_harvested), 0),
      periodHarvestRevenue: harvestRows.reduce((acc, row) => acc + toNumber(row?.total_amount), 0)
    };
  }, [broilerReportFilteredRows]);

  const broilerReportSelectedBatchSummary = useMemo(() => {
    if (!broilerReportApplied.batchIds?.length) return 'All batches';
    const labels = broilerReportApplied.batchIds
      .map((value) => {
        const id = toInt(value);
        return batchCodeById.get(id) || `#${id}`;
      })
      .filter((label) => String(label || '').trim() !== '');
    return labels.length ? labels.join(', ') : 'All batches';
  }, [broilerReportApplied.batchIds, batchCodeById]);

  const broilerReportTrendRows = useMemo(() => {
    const grouped = new Map();
    for (const row of broilerReportFilteredRows.daily || []) {
      const day = normalizeDateInput(row?.log_date);
      if (!day) continue;
      const entry = grouped.get(day) || {
        date: day,
        feedKg: 0,
        mortality: 0,
        avgWeightAccumulator: 0,
        avgWeightCount: 0
      };
      entry.feedKg += toNumber(row?.feed_kg);
      entry.mortality += toInt(row?.mortality_count);
      entry.avgWeightAccumulator += toNumber(row?.avg_weight_kg);
      entry.avgWeightCount += 1;
      grouped.set(day, entry);
    }
    return Array.from(grouped.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14)
      .map((row) => ({
        date: row.date,
        feedKg: row.feedKg,
        mortality: row.mortality,
        avgWeightKg: row.avgWeightCount ? (row.avgWeightAccumulator / row.avgWeightCount) : 0
      }));
  }, [broilerReportFilteredRows.daily]);

  const broilerReportMortalityCauseRows = useMemo(() => {
    const grouped = new Map();
    for (const row of broilerReportFilteredRows.daily || []) {
      const cause = String(row?.mortality_cause || '').trim() || 'UNSPECIFIED';
      const value = toInt(row?.mortality_count);
      if (value < 1) continue;
      grouped.set(cause, (grouped.get(cause) || 0) + value);
    }
    return Array.from(grouped.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [broilerReportFilteredRows.daily]);

  const broilerReportHarvestTrendRows = useMemo(() => {
    const grouped = new Map();
    for (const row of broilerReportFilteredRows.harvests || []) {
      const day = normalizeDateInput(row?.harvest_date);
      if (!day) continue;
      grouped.set(day, (grouped.get(day) || 0) + toNumber(row?.total_amount));
    }
    return Array.from(grouped.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
  }, [broilerReportFilteredRows.harvests]);

  const broilerReportBatchProfitRows = useMemo(() => (
    (broilerReportFilteredRows.batches || [])
      .map((row) => {
        const revenue = toNumber(row?.harvest_revenue);
        const cop = toNumber(row?.cost_of_production);
        return {
          batchCode: String(row?.batch_code || `#${toInt(row?.batch_id)}`),
          revenue,
          cost: cop,
          profit: revenue - cop
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20)
  ), [broilerReportFilteredRows.batches]);

  const displayedRows = useMemo(() => (
    isLegacyReportScreen ? reportRows : (listState.rows || [])
  ), [isLegacyReportScreen, reportRows, listState.rows]);

  const displayedColumns = useMemo(() => (
    isLegacyReportScreen ? reportColumns : columns
  ), [isLegacyReportScreen, reportColumns, columns]);

  const openCreate = () => {
    setEditingRow(null);
    setEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingRow(null);
  };

  const handleSave = async (payload) => {
    if (!selectedEntity) return;

    setSaving(true);
    try {
      let response;
      if (editingRow) {
        response = await updateRecord(normalizedModule, selectedTable, editingRow[selectedEntity.primary_key], payload);
      } else {
        response = await createRecord(normalizedModule, selectedTable, payload);
      }

      if (!response?.ok) {
        throw new Error(response?.message || 'Save failed.');
      }

      if (response?.queued) {
        window.alert('Remote DB offline: action queued for sync.');
      }

      closeEditor();
      await loadRecords(listState.page || 1, search, quickFilters);
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!selectedEntity?.primary_key) return;

    const confirmed = window.confirm('Delete this record?');
    if (!confirmed) return;

    try {
      const response = await deleteRecord(normalizedModule, selectedTable, row[selectedEntity.primary_key]);
      if (!response?.ok) throw new Error(response?.message || 'Delete failed.');
      if (response?.queued) {
        window.alert('Remote DB offline: delete queued for sync.');
      }
      await loadRecords(listState.page || 1, search, quickFilters);
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Failed to delete record.');
    }
  };

  const handleEstimateSave = async (event) => {
    event.preventDefault();
    if (selectedBatchId < 1) {
      window.alert('Select a batch first.');
      return;
    }

    setEstimateSaving(true);
    try {
      const includeVaccine = estimateForm.include_vaccine_cost ? 1 : 0;
      const includeLabor = estimateForm.include_labor_cost ? 1 : 0;

      const batchPayload = {
        estimate_mode: String(estimateForm.mode || 'LIVE').toUpperCase(),
        estimate_price_basis: String(estimateForm.price_basis || 'PER_BIRD').toUpperCase(),
        estimate_birds: estimatePreview.birds,
        estimate_weight_per_bird_kg: estimatePreview.weightPerBird,
        estimate_sale_price_per_bird: estimatePreview.salePricePerBirdUsed,
        estimate_live_price_per_kg: estimatePreview.pricePerKgUsed,
        estimate_processing_cost_per_bird: toNumber(estimateForm.processing_cost_per_bird),
        estimate_include_vaccine_cost: includeVaccine,
        estimate_include_labor_cost: includeLabor,
        estimate_manual_labor_cost: toNumber(estimateForm.labor_cost)
      };

      await updateRecord('BROILERS', 'broiler_batches', selectedBatchId, batchPayload);

      const projectionPayload = {
        batch_id: selectedBatchId,
        mode: String(estimateForm.mode || 'LIVE').toUpperCase(),
        price_basis: String(estimateForm.price_basis || 'PER_BIRD').toUpperCase(),
        birds: estimatePreview.birds,
        weight_per_bird_kg: estimatePreview.weightPerBird,
        sale_price_per_bird: estimatePreview.salePricePerBirdUsed,
        price_per_kg: estimatePreview.pricePerKgUsed,
        sale_price_per_bird_source: 'manual',
        price_per_kg_source: 'manual',
        purchase_cost: toNumber(estimateForm.purchase_cost),
        feed_cost: toNumber(estimateForm.feed_cost),
        misc_input_cost: toNumber(estimateForm.misc_input_cost),
        inventory_item_cost: toNumber(estimateForm.inventory_item_cost),
        include_vaccine_cost: includeVaccine,
        include_labor_cost: includeLabor,
        vaccine_cost: toNumber(estimateForm.vaccine_cost),
        labor_cost: toNumber(estimateForm.labor_cost),
        labor_cost_source: 'manual',
        processing_cost_total: estimatePreview.processingTotal,
        cost_of_production: estimatePreview.cop,
        estimated_revenue: estimatePreview.revenue,
        estimated_profit: estimatePreview.profit
      };

      const response = await createRecord('BROILERS', 'broiler_projections', projectionPayload);
      if (!response?.ok) {
        throw new Error(response?.message || 'Failed to save projection.');
      }

      if (response?.queued) {
        window.alert('Remote DB offline: projection queued for sync.');
      } else {
        window.alert('Projection saved.');
      }

      setEstimateSeed('');
      await loadRecords(1, '');
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Failed to save estimate projection.');
    } finally {
      setEstimateSaving(false);
    }
  };

  const handleCropEstimateSave = async (event) => {
    event.preventDefault();
    if (selectedCropBatchId < 1) {
      window.alert('Select a crop batch first.');
      return;
    }

    setCropEstimateSaving(true);
    try {
      const payload = {
        batch_id: selectedCropBatchId,
        projected_harvest_date: cropEstimateForm.projected_harvest_date || null,
        projected_yield_kg: cropEstimatePreview.projectedYieldKg,
        expected_price_per_kg: cropEstimatePreview.expectedPricePerKg,
        expected_revenue: cropEstimatePreview.expectedRevenue,
        running_cost: cropEstimatePreview.runningCost,
        expected_profit: cropEstimatePreview.expectedProfit,
        notes: cropEstimateForm.notes || null
      };

      const response = await createRecord('CROPS', 'crop_projections', payload);
      if (!response?.ok) {
        throw new Error(response?.message || 'Failed to save crop projection.');
      }

      if (response?.queued) {
        window.alert('Remote DB offline: projection queued for sync.');
      } else {
        window.alert('Crop projection saved.');
      }

      setCropEstimateSeed('');
      await loadRecords(1, '');
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Failed to save crop estimate projection.');
    } finally {
      setCropEstimateSaving(false);
    }
  };

  const applyBroilerReportFilters = () => {
    setBroilerReportApplied({
      mode: String(broilerReportDraft.mode || 'FULL').toUpperCase() === 'PARTIAL' ? 'PARTIAL' : 'FULL',
      from: normalizeDateInput(broilerReportDraft.from) || ymdDaysAgo(30),
      to: normalizeDateInput(broilerReportDraft.to) || ymdNow(),
      batchIds: [...(broilerReportDraft.batchIds || [])]
        .map((value) => String(toInt(value)))
        .filter((value) => toInt(value) > 0)
    });
  };

  return (
    <div className="vstack gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
        <div>
          <h3 className="mb-1">{routeContext.title}</h3>
          <div className="text-secondary">{routeContext.subtitle}</div>
          <div className="small text-secondary mt-1">
            Transport: {source.transport} | Data: {source.data}{source.stale ? ' (cached)' : ''}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {routeContext.actions.map((action) => (
            <NavLink
              key={action.to}
              to={action.to}
              className={`btn btn-sm btn-${action.variant || 'outline-info'}`}
            >
              <i className={`${action.icon} me-1`} />{action.label}
            </NavLink>
          ))}
          {isLegacyScreen ? (
            <button
              className="btn btn-outline-info btn-sm"
              onClick={() => downloadCsv({
                rows: displayedRows,
                columns: displayedColumns,
                fileName: `${routePathKey.replace(/\//g, '-') || 'module'}-export.csv`
              })}
              disabled={!displayedRows.length || !displayedColumns.length}
            >
              <i className="fa-solid fa-file-csv me-1" />Export CSV
            </button>
          ) : null}
          {!isBroilerEstimates ? (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => loadRecords(listState.page || 1, search, quickFilters)} disabled={loading}>
              <i className="fa-solid fa-arrows-rotate me-1" />Refresh
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2 mb-0">{error}</div> : null}

      {moduleTabs.length > 1 ? (
        routeContext.root === 'broilers' ? (
          <div className="broiler-nav-grid mb-3">
            {moduleTabs.map((tab) => {
              const tabPathKey = relativePath(tab.to);
              const active = tabPathKey === routePathKey;
              const iconClass = BROILER_TAB_ICON_BY_PATH[tab.to] || 'fa-circle';
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to.split('/').filter(Boolean).length === 1}
                  className={`broiler-nav-link ${active ? 'is-active' : ''}`}
                >
                  <i className={`fa-solid ${iconClass}`} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        ) : (
          <ul className="nav nav-pills mb-3 gap-2 flex-nowrap overflow-auto">
            {moduleTabs.map((tab) => (
              <li key={tab.to} className="nav-item">
                <NavLink
                  to={tab.to}
                  end={tab.to.split('/').filter(Boolean).length === 1}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {sectionCardSpec?.title ? (
        <div className="card p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h6 className="mb-0">{sectionCardSpec.title}</h6>
            {sectionCardSpec.actionTo ? (
              <NavLink to={sectionCardSpec.actionTo} className="btn btn-sm btn-primary">{sectionCardSpec.actionLabel}</NavLink>
            ) : null}
            {sectionCardSpec.actionType === 'create' ? (
              <button
                className="btn btn-sm btn-primary"
                onClick={openCreate}
                disabled={!selectedEntity}
              >
                {sectionCardSpec.actionLabel || 'Add Record'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isBroilerOverview ? (
        <>
          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerOverviewSummary.rows.length)}</div><div className="label">Batches</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerOverviewSummary.activeRows.length)}</div><div className="label">Active</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerOverviewSummary.urgentRows.length)}</div><div className="label">Urgent</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerOverviewSummary.watchRows.length)}</div><div className="label">Watch</div></div></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Priority Queue</h6>
                  <div className="small text-secondary mb-2">Urgent: {broilerOverviewSummary.urgentRows.length} • Watch: {broilerOverviewSummary.watchRows.length}</div>
                  <div className="vstack gap-2">
                    {broilerOverviewSummary.radarRows.slice(0, 6).map((row) => (
                      <NavLink key={`broiler-priority-${row.batch_id}`} to={`/broilers/view-batch?id=${toInt(row.batch_id)}`} className="text-decoration-none">
                        <div className="border rounded-3 p-2">
                          <div className="fw-semibold">{row.batch_code || `Batch ${toInt(row.batch_id)}`}</div>
                          <div className="small text-secondary">
                            Mortality: {formatMetric(row.mortality_rate)}% | FCR: {formatMetric(row.fcr)} | P/L: {formatMoney(row.profitability)}
                          </div>
                        </div>
                      </NavLink>
                    ))}
                    {!broilerOverviewSummary.radarRows.length ? (
                      <div className="small text-secondary">No priority batches.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Performance Radar (Needs Attention)</h6>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0 fr-list-table">
                      <thead><tr><th>Batch</th><th>Mortality</th><th>FCR</th><th>P/L</th></tr></thead>
                      <tbody>
                        {broilerOverviewSummary.radarRows.slice(0, 8).map((row) => (
                          <tr key={`broiler-radar-${row.batch_id}`}>
                            <td>{row.batch_code || `#${toInt(row.batch_id)}`}</td>
                            <td>{formatMetric(row.mortality_rate)}%</td>
                            <td>{formatMetric(row.fcr)}</td>
                            <td className={toNumber(row.profitability) >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.profitability)}</td>
                          </tr>
                        ))}
                        {!broilerOverviewSummary.radarRows.length ? (
                          <tr><td colSpan={4} className="text-secondary">No radar data.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-2">Assigned Workers (Module / Batch)</h6>
                  <div className="small text-secondary mb-3">Assign workers from HR module and track tasks per batch.</div>
                  <div className="d-flex gap-2 flex-wrap">
                    <NavLink to="/hr-access/tasks" className="btn btn-sm btn-primary">Assign Worker</NavLink>
                    <NavLink to="/hr-access/module-access" className="btn btn-sm btn-outline-info">Module Access</NavLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Current Batches (Running Cost View)</span>
              <NavLink to="/broilers/add-batch" className="btn btn-sm btn-primary">Add Batch</NavLink>
            </div>
            <div className="card-body p-0">
              <div className="p-3">
                <div className="broiler-batch-grid">
                  {broilerOverviewSummary.rows.slice(0, 24).map((row) => {
                    const pct = Math.min(100, Math.round((toNumber(row.current_count) / Math.max(1, toNumber(row.initial_count))) * 100));
                    return (
                      <div key={`batch-card-overview-${row.batch_id || row.batch_code || Math.random()}`} className="broiler-batch-card">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="h6 mb-1" style={{ fontSize: '0.95rem' }}>{row.batch_code || `#${toInt(row.batch_id)}`}</div>
                            <div className="small text-secondary">{row.housing_label || row.housing || ''}</div>
                          </div>
                          <div className="text-end">
                            <div className="small text-secondary">Current</div>
                            <div className="h5 mb-0">{formatMetric(row.current_count)}</div>
                          </div>
                        </div>

                        <div className="mt-2 mini-grid">
                          <div>
                            <div className="label">Start</div>
                            <div className="value">{row.start_date || '-'}</div>
                          </div>
                          <div>
                            <div className="label">Expected</div>
                            <div className="value">{row.expected_harvest_date || '-'}</div>
                          </div>
                        </div>

                        <div className="mt-2 broiler-meter readiness" aria-hidden>
                          <span style={{ width: `${pct}%` }} />
                        </div>

                        <div className="mt-2 d-flex justify-content-between align-items-center">
                          <div className="broiler-metric-note">FCR: {formatMetric(row.fcr)}</div>
                          <div className="broiler-chip">{row.status || 'N/A'}</div>
                        </div>

                        <div className="mt-2 small-metrics d-flex justify-content-between align-items-center">
                          <div className="text-secondary small">Birds</div>
                          <div className="fw-semibold">{formatMetric(row.current_count)} / {formatMetric(row.initial_count)}</div>
                        </div>

                        <div className="mt-2 mini-grid three-cols">
                          <div>
                            <div className="label">FCR</div>
                            <div className="value">{formatMetric(row.fcr)}</div>
                          </div>
                          <div>
                            <div className="label">COP</div>
                            <div className="value">{formatMoney(row.cost_of_production ?? row.cop)}</div>
                          </div>
                          <div>
                            <div className="label">Revenue</div>
                            <div className="value">{formatMoney(row.harvest_revenue)}</div>
                          </div>
                        </div>

                        <div className="mt-2 broiler-metric-note d-flex justify-content-between"><span>Harvest Readiness</span><span>{formatMetric(row.harvest_readiness_pct ?? pct)}%</span></div>
                        <div className="broiler-meter readiness mb-2" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, Number(row.harvest_readiness_pct ?? pct)))}%` }} /></div>

                        <div className="broiler-metric-note d-flex justify-content-between"><span>Performance Score</span><span>{formatMetric(row.performance_score)} ({row.performance_label || 'Watch'})</span></div>
                        <div className="broiler-meter performance mb-2" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, Number(row.performance_score ?? 0)))}%` }} /></div>

                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <div>
                            {(() => {
                              const revenue = toNumber(row.harvest_revenue);
                              const cop = toNumber(row.cost_of_production ?? row.cop);
                              const profit = revenue - cop;
                              const scale = Math.max(Math.abs(revenue), Math.abs(cop), 1);
                              const ratio = Math.max(-1, Math.min(1, profit / scale));
                              const indicatorLeft = (ratio + 1) * 50;
                              return (
                                <div className="small">
                                  <div className={`fw-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(profit)}</div>
                                  <div className="text-secondary small">P/L</div>
                                  <div className="fr-estimate-meter mt-1" style={{ position: 'relative' }}>
                                    <div className="fr-estimate-meter-indicator" style={{ left: `${indicatorLeft}%` }} />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div>
                            <NavLink to={`/broilers/view-batch?id=${toInt(row.batch_id)}`} className="btn btn-sm btn-outline-info">Open Batch</NavLink>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!broilerOverviewSummary.rows.length ? <div className="text-secondary">No batches found.</div> : null}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : isBroilerEstimates ? (
        <>
          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-3">Select Batch & Market Price</h6>

                <label className="form-label small text-uppercase text-secondary">Batch</label>
                <select
                  className="form-select mb-3"
                  value={selectedBatchId || ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('id', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {broilerBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_code || `Batch ${batch.batch_id}`} ({toInt(batch.current_count)} birds)
                    </option>
                  ))}
                </select>

                <div className="fr-estimate-stat">
                  <span>Farm Latest Sale / Bird</span>
                  <strong>{formatMoney(priceSnapshot.latest_price_per_bird)}</strong>
                </div>
                <div className="fr-estimate-stat">
                  <span>Farm Latest Sale / kg</span>
                  <strong>{formatMoney(priceSnapshot.latest_price_per_kg)}</strong>
                </div>
                <div className="fr-estimate-stat">
                  <span>Farm Avg (30d) / Bird</span>
                  <strong>{formatMoney(priceSnapshot.avg_30d_price_per_bird)}</strong>
                </div>
                <div className="fr-estimate-stat">
                  <span>Farm Avg (30d) / kg</span>
                  <strong>{formatMoney(priceSnapshot.avg_30d_price_per_kg)}</strong>
                </div>

                {selectedBatch ? (
                  <>
                    <hr />
                    <div className="small text-secondary">Current birds: <span className="fw-semibold text-dark">{toInt(selectedBatch.current_count || selectedBatch.initial_count)}</span></div>
                    <div className="small text-secondary">Purchase cost baseline: <span className="fw-semibold text-dark">{formatMoney(toNumber(selectedBatch.buy_price_per_bird) * toNumber(selectedBatch.initial_count))}</span></div>
                    <div className="small text-secondary">Misc inputs: <span className="fw-semibold text-dark">{formatMoney(selectedBatch.misc_input_cost)}</span></div>
                  </>
                ) : (
                  <div className="alert alert-warning py-2 mt-2 mb-0">No batch available for estimate. Create a batch first.</div>
                )}
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card p-3">
                <h6 className="mb-3">Smart Batch Estimate Inputs</h6>
                <form onSubmit={handleEstimateSave}>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label">Estimate Type</label>
                      <select className="form-select" value={estimateForm.mode} onChange={(event) => setEstimateForm((prev) => ({ ...prev, mode: event.target.value }))}>
                        <option value="LIVE">LIVE</option>
                        <option value="DRESSED">DRESSED</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Revenue Basis</label>
                      <select className="form-select" value={estimateForm.price_basis} onChange={(event) => setEstimateForm((prev) => ({ ...prev, price_basis: event.target.value }))}>
                        <option value="PER_BIRD">Per Bird Sale Price</option>
                        <option value="PER_KG">Per kg Sale Price</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Estimated Birds</label>
                      <input className="form-control" type="number" min="0" value={estimateForm.birds} onChange={(event) => setEstimateForm((prev) => ({ ...prev, birds: event.target.value }))} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Amount per Bird (kg)</label>
                      <input className="form-control" type="number" step="0.001" min="0" value={estimateForm.weight_per_bird_kg} onChange={(event) => setEstimateForm((prev) => ({ ...prev, weight_per_bird_kg: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sale Price / Bird</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.sale_price_per_bird} onChange={(event) => setEstimateForm((prev) => ({ ...prev, sale_price_per_bird: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Calculated Amount / kg</label>
                      <div className="form-control bg-light text-muted" style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                        {formatMoney(estimatePreview.pricePerKgUsed)}
                      </div>
                      <small className="text-secondary">Based on price/bird ÷ weight/bird</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Price / kg (override)</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.price_per_kg} onChange={(event) => setEstimateForm((prev) => ({ ...prev, price_per_kg: event.target.value }))} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Processing Cost / Bird</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.processing_cost_per_bird} onChange={(event) => setEstimateForm((prev) => ({ ...prev, processing_cost_per_bird: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Purchase Cost</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.purchase_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, purchase_cost: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Feed Cost</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.feed_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, feed_cost: event.target.value }))} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Misc Inputs</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.misc_input_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, misc_input_cost: event.target.value }))} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Inventory Items Cost</label>
                      <div className="form-control bg-light text-muted" style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                        {formatMoney(toNumber(estimateForm.inventory_item_cost))}
                      </div>
                      <small className="text-secondary">Assigned from inventory module</small>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label d-flex justify-content-between align-items-center mb-1">
                        <span>Include Vaccine Cost</span>
                        <input className="form-check-input" type="checkbox" checked={estimateForm.include_vaccine_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, include_vaccine_cost: event.target.checked }))} />
                      </label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.vaccine_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, vaccine_cost: event.target.value }))} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label d-flex justify-content-between align-items-center mb-1">
                        <span>Include Labor Cost</span>
                        <input className="form-check-input" type="checkbox" checked={estimateForm.include_labor_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, include_labor_cost: event.target.checked }))} />
                      </label>
                      <input className="form-control" type="number" step="0.01" min="0" value={estimateForm.labor_cost} onChange={(event) => setEstimateForm((prev) => ({ ...prev, labor_cost: event.target.value }))} />
                    </div>
                  </div>

                  <div className="row g-2 mt-1">
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className="value">{formatMoney(estimatePreview.revenue)}</div><div className="label">Projection Revenue</div></div></div>
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className="value">{formatMoney(estimatePreview.cop)}</div><div className="label">Projection COP</div></div></div>
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className={`value ${estimatePreview.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(estimatePreview.profit)}</div><div className="label">Projection Profit/Loss</div></div></div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span>Loss</span>
                      <span>Break-even</span>
                      <span>Profit</span>
                    </div>
                    <div className="fr-estimate-meter" role="presentation" aria-hidden="true">
                      <div className="fr-estimate-meter-mid" />
                      <div className="fr-estimate-meter-indicator" style={{ left: `${estimatePreview.indicatorLeft}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 d-flex justify-content-end">
                    <button className="btn btn-primary" disabled={estimateSaving || !selectedBatchId}>Find & Save Projection</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">All Batch Estimate Snapshot</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 fr-list-table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Basis</th>
                      <th>Birds</th>
                      <th>Sale/Bird</th>
                      <th>Sale/kg</th>
                      <th>Revenue</th>
                      <th>COP</th>
                      <th>Profit/Loss</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBatchSnapshotRows.map((row) => (
                      <tr key={`snap-${row.projection_id}`}>
                        <td>{batchCodeById.get(toInt(row.batch_id)) || `Batch ${toInt(row.batch_id)}`}</td>
                        <td>{row.price_basis || 'PER_BIRD'}</td>
                        <td>{formatMetric(row.birds)}</td>
                        <td>{formatMoney(row.sale_price_per_bird)}</td>
                        <td>{formatMoney(row.price_per_kg)}</td>
                        <td>{formatMoney(row.estimated_revenue)}</td>
                        <td>{formatMoney(row.cost_of_production)}</td>
                        <td className={toNumber(row.estimated_profit) >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.estimated_profit)}</td>
                        <td>{row.created_at || '-'}</td>
                      </tr>
                    ))}
                    {!allBatchSnapshotRows.length ? (
                      <tr><td colSpan={9} className="text-secondary">No estimates available.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Saved Projections {selectedBatch ? `(${selectedBatch.batch_code || `Batch ${selectedBatchId}`})` : ''}</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 fr-list-table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Mode</th>
                      <th>Basis</th>
                      <th>Birds</th>
                      <th>Sale/Bird</th>
                      <th>Sale/kg</th>
                      <th>Revenue</th>
                      <th>COP</th>
                      <th>Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                  {selectedBatchProjectionRows.map((row) => (
                    <tr key={`saved-${row.projection_id}`}>
                      <td>{row.created_at || '-'}</td>
                      <td>{row.mode || 'LIVE'}</td>
                      <td>{row.price_basis || 'PER_BIRD'}</td>
                      <td>{formatMetric(row.birds)}</td>
                      <td>{formatMoney(row.sale_price_per_bird)}</td>
                      <td>{formatMoney(row.price_per_kg)}</td>
                      <td>{formatMoney(row.estimated_revenue)}</td>
                      <td>{formatMoney(row.cost_of_production)}</td>
                      <td className={toNumber(row.estimated_profit) >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.estimated_profit)}</td>
                    </tr>
                  ))}
                  {!selectedBatchProjectionRows.length ? (
                    <tr><td colSpan={9} className="text-secondary">No saved projections yet. Use Find & Save Projection.</td></tr>
                  ) : null}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : isBroilerReports ? (
        <>
          <div className="card p-3 report-builder-controls">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <h6 className="mb-0">Broiler Report Builder</h6>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
                <i className="fa-solid fa-print me-1" />Print / Save PDF
              </button>
            </div>
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label">Report Mode</label>
                <select
                  className="form-select"
                  value={broilerReportDraft.mode}
                  onChange={(event) => setBroilerReportDraft((prev) => ({ ...prev, mode: event.target.value }))}
                >
                  <option value="FULL">Full</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">From</label>
                <input
                  type="date"
                  className="form-control"
                  value={broilerReportDraft.from}
                  onChange={(event) => setBroilerReportDraft((prev) => ({ ...prev, from: event.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">To</label>
                <input
                  type="date"
                  className="form-control"
                  value={broilerReportDraft.to}
                  onChange={(event) => setBroilerReportDraft((prev) => ({ ...prev, to: event.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Batches (multi-select)</label>
                <select
                  multiple
                  size={4}
                  className="form-select"
                  value={broilerReportDraft.batchIds}
                  onChange={(event) => {
                    const selectedValues = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setBroilerReportDraft((prev) => ({ ...prev, batchIds: selectedValues }));
                  }}
                >
                  {broilerBatches.map((batch) => (
                    <option key={`report-batch-${batch.batch_id}`} value={batch.batch_id}>
                      {batch.batch_code || `Batch ${batch.batch_id}`} ({batch.status || 'ACTIVE'})
                    </option>
                  ))}
                </select>
                <div className="small text-secondary mt-1">Leave this blank to include every batch in the selected period.</div>
              </div>
              <div className="col-md-2 d-grid">
                <button className="btn btn-primary" type="button" onClick={applyBroilerReportFilters} disabled={broilerReportLoading}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <div className="h5 mb-1">Broiler Performance Report</div>
                <div className="text-secondary small">
                  Scope: {broilerReportSelectedBatchSummary} | Period: {broilerReportApplied.from} to {broilerReportApplied.to} | Mode: {broilerReportApplied.mode}
                </div>
              </div>
              <div className="small text-secondary">Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.batchCount)}</div><div className="label">Batches</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.birdsCurrent)}</div><div className="label">Birds in Stock</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.runningCop)}</div><div className="label">Running COP</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.runningVaccineCost)}</div><div className="label">Vaccine Cost (Opt)</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.runningLaborCost)}</div><div className="label">Labor Cost (Opt)</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.adjustedCop)}</div><div className="label">Adjusted COP</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.runningRevenue)}</div><div className="label">Running Revenue</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className={`value ${broilerReportSummary.runningProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(broilerReportSummary.runningProfit)}</div><div className="label">Running Profit/Loss</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className={`value ${broilerReportSummary.runningProfitAdjusted >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(broilerReportSummary.runningProfitAdjusted)}</div><div className="label">Adjusted Profit/Loss</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.avgFcr)}</div><div className="label">Avg FCR</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.avgAdgG)}g</div><div className="label">Avg ADG</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.avgMortalityRate)}%</div><div className="label">Avg Mortality</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.periodFeedKg)}</div><div className="label">Period Feed (kg)</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.periodFeedCost)}</div><div className="label">Period Feed Cost</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerReportSummary.periodHarvestBirds)}</div><div className="label">Harvested Birds</div></div></div>
            <div className="col-xl-2 col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerReportSummary.periodHarvestRevenue)}</div><div className="label">Period Harvest Revenue</div></div></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Production Trend (Feed, Mortality, Avg Weight)</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Feed (kg)</th><th>Mortality</th><th>Avg Weight (kg)</th></tr></thead>
                    <tbody>
                      {broilerReportTrendRows.map((row) => (
                        <tr key={`broiler-trend-${row.date}`}>
                          <td>{row.date}</td>
                          <td>{formatMetric(row.feedKg)}</td>
                          <td>{formatMetric(row.mortality)}</td>
                          <td>{formatMetric(row.avgWeightKg)}</td>
                        </tr>
                      ))}
                      {!broilerReportTrendRows.length ? <tr><td colSpan={4} className="text-secondary">No trend data.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Mortality Cause Mix</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Cause</th><th>Count</th></tr></thead>
                    <tbody>
                      {broilerReportMortalityCauseRows.map((row, idx) => (
                        <tr key={`broiler-cause-${idx}`}>
                          <td>{row.cause}</td>
                          <td>{formatMetric(row.count)}</td>
                        </tr>
                      ))}
                      {!broilerReportMortalityCauseRows.length ? <tr><td colSpan={2} className="text-secondary">No mortality causes.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Harvest Revenue Trend</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {broilerReportHarvestTrendRows.map((row) => (
                        <tr key={`broiler-harvest-trend-${row.date}`}>
                          <td>{row.date}</td>
                          <td>{formatMoney(row.revenue)}</td>
                        </tr>
                      ))}
                      {!broilerReportHarvestTrendRows.length ? <tr><td colSpan={2} className="text-secondary">No harvest trend data.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Batch Profitability Comparison</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Batch</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
                    <tbody>
                      {broilerReportBatchProfitRows.map((row) => (
                        <tr key={`broiler-profit-${row.batchCode}`}>
                          <td>{row.batchCode}</td>
                          <td>{formatMoney(row.revenue)}</td>
                          <td>{formatMoney(row.cost)}</td>
                          <td className={row.profit >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.profit)}</td>
                        </tr>
                      ))}
                      {!broilerReportBatchProfitRows.length ? <tr><td colSpan={4} className="text-secondary">No profitability rows.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">Batch Summary</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>Batch</th><th>Start</th><th>Initial</th><th>Current</th><th>Feed kg</th><th>COP</th><th>Vaccine</th><th>Labor</th><th>Adj COP</th><th>FCR</th><th>ADG (g)</th><th>Mortality %</th><th>Revenue</th><th>Profit/Loss</th><th>Adj Profit/Loss</th></tr></thead>
                <tbody>
                  {broilerReportFilteredRows.batches.map((row) => {
                    const revenue = toNumber(row.harvest_revenue);
                    const cop = toNumber(row.cost_of_production);
                    const vaccine = toNumber(row.vaccine_cost_used);
                    const labor = toNumber(row.labor_cost_used);
                    const adjusted = cop + vaccine + labor;
                    const profit = revenue - cop;
                    const adjustedProfit = revenue - adjusted;
                    return (
                      <tr key={`broiler-report-batch-${row.batch_id}`}>
                        <td>{row.batch_code || `#${toInt(row.batch_id)}`}</td>
                        <td>{row.start_date || '-'}</td>
                        <td>{formatMetric(row.initial_count)}</td>
                        <td>{formatMetric(row.current_count)}</td>
                        <td>{formatMetric(row.total_feed_kg)}</td>
                        <td>{formatMoney(cop)}</td>
                        <td>{formatMoney(vaccine)}</td>
                        <td>{formatMoney(labor)}</td>
                        <td>{formatMoney(adjusted)}</td>
                        <td>{formatMetric(row.fcr)}</td>
                        <td>{formatMetric(row.adg_g)}</td>
                        <td>{formatMetric(row.mortality_rate)}%</td>
                        <td>{formatMoney(revenue)}</td>
                        <td className={profit >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(profit)}</td>
                        <td className={adjustedProfit >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(adjustedProfit)}</td>
                      </tr>
                    );
                  })}
                  {!broilerReportFilteredRows.batches.length ? (
                    <tr><td colSpan={15} className="text-secondary">No report rows for selected filters.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {broilerReportApplied.mode === 'FULL' ? (
            <>
              <div className="card p-3">
                <h6 className="mb-2">Daily Operations Detail</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Batch</th><th>Avg Wt (kg)</th><th>Feed (kg)</th><th>Feed Cost</th><th>Water (L)</th><th>Mortality</th><th>Cause</th><th>Temp</th><th>Humidity</th></tr></thead>
                    <tbody>
                      {broilerReportFilteredRows.daily.map((row, idx) => (
                        <tr key={`broiler-report-daily-${idx}`}>
                          <td>{row.log_date || '-'}</td>
                          <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                          <td>{formatMetric(row.avg_weight_kg)}</td>
                          <td>{formatMetric(row.feed_kg)}</td>
                          <td>{formatMoney(row.feed_cost)}</td>
                          <td>{formatMetric(row.water_liters)}</td>
                          <td>{formatMetric(row.mortality_count)}</td>
                          <td>{row.mortality_cause || '-'}</td>
                          <td>{row.temperature_c !== null && row.temperature_c !== undefined ? formatMetric(row.temperature_c) : '-'}</td>
                          <td>{row.humidity_pct !== null && row.humidity_pct !== undefined ? formatMetric(row.humidity_pct) : '-'}</td>
                        </tr>
                      ))}
                      {!broilerReportFilteredRows.daily.length ? <tr><td colSpan={10} className="text-secondary">No daily logs in selected period.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-3">
                <h6 className="mb-2">Feed & Input Logs</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Batch</th><th>Feed</th><th>Qty (kg)</th><th>Unit Cost</th><th>Total Cost</th><th>Notes</th></tr></thead>
                    <tbody>
                      {broilerReportFilteredRows.feed.map((row, idx) => (
                        <tr key={`broiler-report-feed-${idx}`}>
                          <td>{row.feed_date || '-'}</td>
                          <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                          <td>{row.feed_name || '-'}</td>
                          <td>{formatMetric(row.quantity_kg)}</td>
                          <td>{formatMoney(row.unit_cost)}</td>
                          <td>{formatMoney(row.total_cost)}</td>
                          <td>{row.notes || ''}</td>
                        </tr>
                      ))}
                      {!broilerReportFilteredRows.feed.length ? <tr><td colSpan={7} className="text-secondary">No feed logs in selected period.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-lg-7">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Health Records</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 fr-list-table">
                        <thead><tr><th>When</th><th>Batch</th><th>Diagnosis</th><th>Treatment</th><th>Medication</th></tr></thead>
                        <tbody>
                          {broilerReportFilteredRows.health.map((row, idx) => (
                            <tr key={`broiler-report-health-${idx}`}>
                              <td>{row.recorded_at || '-'}</td>
                              <td>{batchCodeById.get(toInt(row.target_id)) || `#${toInt(row.target_id)}`}</td>
                              <td>{row.diagnosis || '-'}</td>
                              <td>{row.treatment || '-'}</td>
                              <td>{row.medication || '-'}</td>
                            </tr>
                          ))}
                          {!broilerReportFilteredRows.health.length ? <tr><td colSpan={5} className="text-secondary">No health records in selected period.</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Vaccination Logs</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 fr-list-table">
                        <thead><tr><th>Batch</th><th>Vaccine</th><th>Scheduled</th><th>Status</th></tr></thead>
                        <tbody>
                          {broilerReportFilteredRows.vaccinations.map((row, idx) => (
                            <tr key={`broiler-report-vax-${idx}`}>
                              <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                              <td>{row.vaccine_name || '-'}</td>
                              <td>{row.scheduled_date || '-'}</td>
                              <td>{row.status || '-'}</td>
                            </tr>
                          ))}
                          {!broilerReportFilteredRows.vaccinations.length ? <tr><td colSpan={4} className="text-secondary">No vaccination records in selected period.</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-3">
                <h6 className="mb-2">Harvest Transactions</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Batch</th><th>Birds</th><th>Weight (kg)</th><th>Price/kg</th><th>Total</th><th>Buyer</th></tr></thead>
                    <tbody>
                      {broilerReportFilteredRows.harvests.map((row, idx) => (
                        <tr key={`broiler-report-harvest-${idx}`}>
                          <td>{row.harvest_date || '-'}</td>
                          <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                          <td>{formatMetric(row.birds_harvested)}</td>
                          <td>{formatMetric(row.total_weight_kg)}</td>
                          <td>{formatMoney(row.price_per_kg)}</td>
                          <td>{formatMoney(row.total_amount)}</td>
                          <td>{row.buyer_name || '-'}</td>
                        </tr>
                      ))}
                      {!broilerReportFilteredRows.harvests.length ? <tr><td colSpan={7} className="text-secondary">No harvest records in selected period.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-3">
              <h6 className="mb-2">Partial Snapshot (Recent Operations)</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 fr-list-table">
                  <thead><tr><th>Date</th><th>Batch</th><th>Feed (kg)</th><th>Mortality</th><th>Avg Weight (kg)</th><th>Notes</th></tr></thead>
                  <tbody>
                    {broilerReportFilteredRows.daily.slice(0, 30).map((row, idx) => (
                      <tr key={`broiler-report-partial-${idx}`}>
                        <td>{row.log_date || '-'}</td>
                        <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                        <td>{formatMetric(row.feed_kg)}</td>
                        <td>{formatMetric(row.mortality_count)}</td>
                        <td>{formatMetric(row.avg_weight_kg)}</td>
                        <td>{row.notes || ''}</td>
                      </tr>
                    ))}
                    {!broilerReportFilteredRows.daily.length ? <tr><td colSpan={6} className="text-secondary">No daily logs in selected period.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : isBroilerDailyEntry ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div>
                <label className="form-label small text-uppercase text-secondary mb-1">Filter by Batch</label>
                <select
                  className="form-select form-select-sm"
                  value={String(quickFilters.batch_id || '')}
                  onChange={(event) => {
                    const nextFilters = {
                      ...quickFilters,
                      batch_id: event.target.value
                    };
                    setQuickFilters(nextFilters);
                    loadRecords(1, search, nextFilters).catch(() => {});
                  }}
                >
                  <option value="">All Batches</option>
                  {broilerBatches.map((batch) => (
                    <option key={`daily-batch-${batch.batch_id}`} value={batch.batch_id}>{batch.batch_code || `Batch ${batch.batch_id}`}</option>
                  ))}
                </select>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => loadRecords(1, search, quickFilters)}>Refresh</button>
                <NavLink to="/broilers/health-records" className="btn btn-outline-info btn-sm">Health</NavLink>
              </div>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerDailySummary.rowsCount)}</div><div className="label">Daily Logs</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerDailySummary.totalFeedKg)}</div><div className="label">Feed (kg)</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerDailySummary.totalMortality)}</div><div className="label">Mortality</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerDailySummary.avgWeightKg)}</div><div className="label">Avg Weight (kg)</div></div></div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">Daily Operations Logs</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>Date</th><th>Batch</th><th>Weight</th><th>Feed</th><th>Mortality</th><th>Temp</th><th>Humidity</th><th>Notes</th></tr></thead>
                <tbody>
                  {(listState.rows || []).map((row, idx) => (
                    <tr key={`broiler-daily-${idx}`}>
                      <td>{row.log_date || '-'}</td>
                      <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                      <td>{toNumber(row.avg_weight_kg) > 0 ? `${formatMetric(row.avg_weight_kg)} kg` : '-'}</td>
                      <td>{formatMetric(row.feed_kg)}</td>
                      <td>{formatMetric(row.mortality_count)}</td>
                      <td>{toNumber(row.temperature_c) ? formatMetric(row.temperature_c) : '-'}</td>
                      <td>{toNumber(row.humidity_pct) ? formatMetric(row.humidity_pct) : '-'}</td>
                      <td>{row.notes || ''}</td>
                    </tr>
                  ))}
                  {!loading && !(listState.rows || []).length ? (
                    <tr><td colSpan={8} className="text-secondary">No daily logs recorded.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : isBroilerHealthRecords ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div className="d-flex gap-2 align-items-end flex-wrap">
                <div>
                  <label className="form-label small text-uppercase text-secondary mb-1">Filter by Batch</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedHealthBatchId > 0 ? String(selectedHealthBatchId) : ''}
                    onChange={(event) => {
                      const next = new URLSearchParams(searchParams);
                      if (String(event.target.value || '').trim()) {
                        next.set('id', event.target.value);
                      } else {
                        next.delete('id');
                      }
                      setSearchParams(next, { replace: true });
                    }}
                  >
                    <option value="">All Batches</option>
                    {broilerBatches.map((batch) => (
                      <option key={`health-batch-${batch.batch_id}`} value={batch.batch_id}>{batch.batch_code || `Batch ${batch.batch_id}`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <NavLink to="/broilers/add-batch" className="btn btn-outline-info btn-sm">Batch Center</NavLink>
                <NavLink to="/broilers/view-batch" className="btn btn-outline-primary btn-sm">Batch View</NavLink>
              </div>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHealthSummary.recordsCount)}</div><div className="label">Health Records</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHealthSummary.dueCount)}</div><div className="label">Vaccinations Due</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHealthSummary.overdueCount)}</div><div className="label">Vaccinations Overdue</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHealthSummary.doneCount)}</div><div className="label">Vaccinations Done</div></div></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-7">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Health Records</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>When</th><th>Batch</th><th>Diagnosis</th><th>Treatment</th><th>Medication</th><th>Notes</th></tr></thead>
                    <tbody>
                      {broilerHealthRows.records.map((row, idx) => (
                        <tr key={`broiler-health-record-${idx}`}>
                          <td>{row.recorded_at || '-'}</td>
                          <td>{batchCodeById.get(toInt(row.target_id)) || `#${toInt(row.target_id)}`}</td>
                          <td>{row.diagnosis || '-'}</td>
                          <td>{row.treatment || '-'}</td>
                          <td>{row.medication || '-'}</td>
                          <td>{row.notes || ''}</td>
                        </tr>
                      ))}
                      {!broilerHealthRows.records.length ? (
                        <tr><td colSpan={6} className="text-secondary">No health records logged.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Vaccination Schedule</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Batch</th><th>Vaccine</th><th>Status</th></tr></thead>
                    <tbody>
                      {broilerHealthRows.vaccinations.map((row, idx) => {
                        const today = normalizeDateInput(new Date().toISOString());
                        const dueDate = normalizeDateInput(row.scheduled_date);
                        const daysToDue = dueDate ? Math.round((Date.parse(dueDate) - Date.parse(today)) / (1000 * 60 * 60 * 24)) : 0;
                        const status = String(row.status || 'DUE').toUpperCase();
                        const statusClass = status === 'DONE'
                          ? 'text-success'
                          : (daysToDue < 0 ? 'text-danger' : (daysToDue <= 3 ? 'text-warning' : ''));
                        return (
                          <tr key={`broiler-health-vax-${idx}`}>
                            <td>
                              {row.scheduled_date || '-'}
                              {status !== 'DONE' ? (
                                <div className={`small ${statusClass}`}>
                                  {daysToDue < 0 ? `Overdue ${Math.abs(daysToDue)}d` : (daysToDue === 0 ? 'Due today' : `In ${daysToDue}d`)}
                                </div>
                              ) : null}
                            </td>
                            <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                            <td>{row.vaccine_name || '-'}</td>
                            <td className={statusClass}>{status}</td>
                          </tr>
                        );
                      })}
                      {!broilerHealthRows.vaccinations.length ? (
                        <tr><td colSpan={4} className="text-secondary">No vaccinations scheduled.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">30-Day Vaccination Calendar</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>Date</th><th>Doses</th><th>Batches</th><th>Vaccines</th></tr></thead>
                <tbody>
                  {broilerHealthSummary.calendarRows.map((row) => (
                    <tr key={`broiler-calendar-${row.date}`}>
                      <td>{row.date}</td>
                      <td>{formatMetric(row.count)}</td>
                      <td>{row.batches}</td>
                      <td>{row.vaccines}</td>
                    </tr>
                  ))}
                  {!broilerHealthSummary.calendarRows.length ? (
                    <tr><td colSpan={4} className="text-secondary">No due vaccinations in the next 30 days.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : isBroilerHarvest ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div>
                <label className="form-label small text-uppercase text-secondary mb-1">Filter by Batch</label>
                <select
                  className="form-select form-select-sm"
                  value={String(quickFilters.batch_id || '')}
                  onChange={(event) => {
                    const nextFilters = {
                      ...quickFilters,
                      batch_id: event.target.value
                    };
                    setQuickFilters(nextFilters);
                    loadRecords(1, search, nextFilters).catch(() => {});
                  }}
                >
                  <option value="">All Batches</option>
                  {broilerBatches.map((batch) => (
                    <option key={`harvest-batch-${batch.batch_id}`} value={batch.batch_id}>{batch.batch_code || `Batch ${batch.batch_id}`}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadRecords(1, search, quickFilters)}>Refresh</button>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHarvestSummary.rowsCount)}</div><div className="label">Harvest Events</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHarvestSummary.birdsHarvested)}</div><div className="label">Birds Harvested</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(broilerHarvestSummary.totalWeightKg)}</div><div className="label">Weight (kg)</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(broilerHarvestSummary.totalAmount)}</div><div className="label">Revenue</div></div></div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">Harvest & Sales</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>Date</th><th>Batch</th><th>Birds</th><th>Weight kg</th><th>Buyer</th><th>Total</th><th>Invoice</th></tr></thead>
                <tbody>
                  {(listState.rows || []).map((row, idx) => (
                    <tr key={`broiler-harvest-${idx}`}>
                      <td>{row.harvest_date || '-'}</td>
                      <td>{batchCodeById.get(toInt(row.batch_id)) || `#${toInt(row.batch_id)}`}</td>
                      <td>{formatMetric(row.birds_harvested)}</td>
                      <td>{formatMetric(row.total_weight_kg)}</td>
                      <td>{row.buyer_name || '-'}</td>
                      <td>{formatMoney(row.total_amount)}</td>
                      <td>{row.invoice_id ? `#${row.invoice_id}` : '-'}</td>
                    </tr>
                  ))}
                  {!loading && !(listState.rows || []).length ? (
                    <tr><td colSpan={7} className="text-secondary">No harvest records yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : isBroilerBatchView ? (
        <>
          <div className="card p-3">
            <div className="row g-3 align-items-end">
              <div className="col-lg-5">
                <label className="form-label small text-uppercase text-secondary">Select Batch</label>
                <select
                  className="form-select"
                  value={selectedViewBatchId || ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('id', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {broilerBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_code || `Batch ${batch.batch_id}`} ({toInt(batch.current_count || batch.initial_count)} birds)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedViewBatch ? (
            <div className="alert alert-warning py-2 mb-0">No batch found. Add a batch from Batch Center.</div>
          ) : (
            <>
              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <h6 className="mb-1">Batch Details: {selectedViewBatch.batch_code || `Batch ${selectedViewBatchId}`}</h6>
                    <div className="small text-secondary">Housing: {selectedViewBatch.housing_name || selectedViewBatch.housing_code || 'Unassigned'}</div>
                    <div className="small text-secondary">Status: {selectedViewBatch.status || 'ACTIVE'}</div>
                  </div>
                  <NavLink to={`/broilers/add-batch?id=${selectedViewBatchId}`} className="btn btn-sm btn-outline-warning">
                    Edit Batch
                  </NavLink>
                </div>
                <div className="row g-2 mt-1">
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.current_count || selectedViewBatch.initial_count)}</div><div className="label">Current Birds</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.mortality_rate)}%</div><div className="label">Mortality Rate</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.fcr)}</div><div className="label">FCR</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.adg_g)}g</div><div className="label">ADG</div></div></div>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMoney(selectedViewBatch.purchase_cost || (toNumber(selectedViewBatch.buy_price_per_bird) * toNumber(selectedViewBatch.initial_count)))}</div><div className="label">Initial Bird Cost</div></div></div>
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMoney(selectedViewBatch.total_feed_cost || broilerViewSummary.totalFeedKg)}</div><div className="label">Running Feed Cost</div></div></div>
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMoney(selectedViewBatch.misc_input_cost)}</div><div className="label">Running Misc Cost</div></div></div>
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMoney(selectedViewBatch.cost_of_production)}</div><div className="label">Running COP</div></div></div>
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.harvest_readiness_pct)}%</div><div className="label">Harvest Readiness</div></div></div>
                <div className="col-md-2 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewBatch.performance_score)}</div><div className="label">Performance</div></div></div>
              </div>

              <div className="row g-3">
                <div className="col-lg-7">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Recent Daily Logs</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 fr-list-table">
                        <thead><tr><th>Date</th><th>Weight</th><th>Feed</th><th>Mortality</th></tr></thead>
                        <tbody>
                          {broilerViewRows.logs.slice(0, 10).map((row, idx) => (
                            <tr key={`broiler-view-log-${idx}`}>
                              <td>{row.log_date || '-'}</td>
                              <td>{row.avg_weight_kg ? `${formatMetric(row.avg_weight_kg)} kg` : '-'}</td>
                              <td>{formatMetric(row.feed_kg)}</td>
                              <td>{formatMetric(row.mortality_count)}</td>
                            </tr>
                          ))}
                          {!broilerViewRows.logs.length ? (
                            <tr><td colSpan={4} className="text-secondary">No logs for this batch.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Health & Harvest Summary</h6>
                    <p className="mb-2"><strong>Vaccinations Due:</strong> {broilerViewSummary.vaccinationsDue}</p>
                    <p className="mb-2"><strong>Vaccinations Overdue:</strong> <span className={broilerViewSummary.vaccinationsOverdue > 0 ? 'text-danger fw-semibold' : ''}>{broilerViewSummary.vaccinationsOverdue}</span></p>
                    <p className="mb-2"><strong>Harvest Events:</strong> {broilerViewRows.harvests.length}</p>
                    <p className="mb-0"><strong>Revenue:</strong> {formatMoney(broilerViewSummary.totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Misc Inputs (Charcoal, Sawdust, etc.)</h6>
                  <NavLink to={`/broilers/add-batch?id=${selectedViewBatchId}`} className="btn btn-sm btn-primary">Add Misc Cost</NavLink>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Notes</th></tr></thead>
                    <tbody>
                      {broilerViewRows.miscCosts.map((row, idx) => (
                        <tr key={`broiler-view-misc-${idx}`}>
                          <td>{row.cost_date || '-'}</td>
                          <td>{row.item_name || '-'}</td>
                          <td>{formatMoney(row.amount)}</td>
                          <td>{row.notes || ''}</td>
                        </tr>
                      ))}
                      {!broilerViewRows.miscCosts.length ? (
                        <tr><td colSpan={4} className="text-secondary">No misc costs recorded for this batch.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      ) : isLayerFlockView ? (
        <>
          <div className="card p-3">
            <div className="row g-3 align-items-end">
              <div className="col-lg-5">
                <label className="form-label small text-uppercase text-secondary">Select Flock</label>
                <select
                  className="form-select"
                  value={selectedViewFlockId || ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('id', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {layerFlocks.map((flock) => (
                    <option key={flock.flock_id} value={flock.flock_id}>
                      {flock.flock_code || `Flock ${flock.flock_id}`} ({toInt(flock.active_birds || flock.bird_count)} birds)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedViewFlock ? (
            <div className="alert alert-warning py-2 mb-0">No flock available. Add one from the Flocks tab.</div>
          ) : (
            <>
              <div className="card p-3">
                <h6 className="mb-1">Flock: {selectedViewFlock.flock_code || `Flock ${selectedViewFlockId}`}</h6>
                <div className="small text-secondary mb-2">Housing: {selectedViewFlock.housing_name || selectedViewFlock.housing_code || 'Unassigned'}</div>
                <div className="row g-2">
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewFlock.active_birds || selectedViewFlock.bird_count)}</div><div className="label">Active Birds</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewFlock.hen_day_pct)}%</div><div className="label">Hen-Day</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(selectedViewFlock.feed_per_dozen)}</div><div className="label">Feed/Dozen</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMoney(layerViewSummary.salesTotal)}</div><div className="label">Sales</div></div></div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-lg-7">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Recent Production</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 fr-list-table">
                        <thead><tr><th>Date</th><th>Eggs</th><th>Feed</th><th>Quality</th></tr></thead>
                        <tbody>
                          {layerViewRows.logs.slice(0, 12).map((row, idx) => (
                            <tr key={`layer-view-log-${idx}`}>
                              <td>{row.log_date || '-'}</td>
                              <td>{formatMetric(row.egg_count || row.eggs_total)}</td>
                              <td>{formatMetric(row.feed_kg)}</td>
                              <td>{formatMetric(row.shell_quality_score)} / {formatMetric(row.internal_quality_score)}</td>
                            </tr>
                          ))}
                          {!layerViewRows.logs.length ? (
                            <tr><td colSpan={4} className="text-secondary">No logs for this flock.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Sales & Health Summary</h6>
                    <p className="mb-2"><strong>Egg Sales Records:</strong> {layerViewRows.sales.length}</p>
                    <p className="mb-2"><strong>Production Logs:</strong> {layerViewRows.logs.length}</p>
                    <p className="mb-2"><strong>Total Eggs:</strong> {formatMetric(layerViewSummary.eggsTotal)}</p>
                    <p className="mb-0"><strong>Avg Shell Quality:</strong> {formatMetric(layerViewSummary.avgShellQuality)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : isLayerQualityControl ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div>
                <label className="form-label small text-uppercase text-secondary mb-1">Filter by Flock</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedLayerHealthFlockId > 0 ? String(selectedLayerHealthFlockId) : ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (String(event.target.value || '').trim()) {
                      next.set('id', event.target.value);
                    } else {
                      next.delete('id');
                    }
                    setSearchParams(next, { replace: true });
                  }}
                >
                  <option value="">All Flocks</option>
                  {layerFlocks.map((flock) => (
                    <option key={`quality-flock-${flock.flock_id}`} value={flock.flock_id}>{flock.flock_code || `Flock ${flock.flock_id}`}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadRecords(1, '', quickFilters)}>Refresh</button>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.rowsCount)}</div><div className="label">Health Records</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.diagnosisTagged)}</div><div className="label">Diagnosis Tagged</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.treatmentTagged)}</div><div className="label">Treatment Tagged</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.medicationTagged)}</div><div className="label">Medication Tagged</div></div></div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">Layer Health & Quality Logs</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>When</th><th>Flock</th><th>Diagnosis</th><th>Treatment</th><th>Medication</th><th>Notes</th></tr></thead>
                <tbody>
                  {(listState.rows || []).map((row, idx) => (
                    <tr key={`layer-health-${idx}`}>
                      <td>{row.recorded_at || '-'}</td>
                      <td>{flockCodeById.get(toInt(row.target_id)) || `#${toInt(row.target_id)}`}</td>
                      <td>{row.diagnosis || '-'}</td>
                      <td>{row.treatment || '-'}</td>
                      <td>{row.medication || '-'}</td>
                      <td>{row.notes || ''}</td>
                    </tr>
                  ))}
                  {!loading && !(listState.rows || []).length ? (
                    <tr><td colSpan={6} className="text-secondary">No health records.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : isPigIndividuals ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h6 className="mb-0">Individual Pig Registry</h6>
              <button className="btn btn-sm btn-primary" onClick={openCreate} disabled={!selectedEntity}>Add Pig</button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Actions</h6>
                <div className="d-flex flex-wrap gap-2">
                  <NavLink className="btn btn-sm btn-outline-info" to="/pigs/growers">Log Weight</NavLink>
                  <NavLink className="btn btn-sm btn-outline-info" to="/pigs/health-records">Log Health</NavLink>
                  <NavLink className="btn btn-sm btn-outline-info" to="/pigs/sales">Record Sale</NavLink>
                </div>
                <div className="small text-secondary mt-3">
                  Use group-level health and sales tabs to record transactions tied to individual pigs.
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Individual Health Logs</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>When</th><th>Pig</th><th>Diagnosis</th></tr></thead>
                    <tbody>
                      {pigIndividualRows.health.slice(0, 8).map((row, idx) => (
                        <tr key={`pig-individual-health-${idx}`}>
                          <td>{row.recorded_at || '-'}</td>
                          <td>{row.target_id ? `#${toInt(row.target_id)}` : '-'}</td>
                          <td>{row.diagnosis || '-'}</td>
                        </tr>
                      ))}
                      {!pigIndividualRows.health.length ? (
                        <tr><td colSpan={3} className="text-secondary">No individual health logs.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-2">Individual Sales</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 fr-list-table">
                    <thead><tr><th>Date</th><th>Pig</th><th>Total</th></tr></thead>
                    <tbody>
                      {pigIndividualRows.sales.slice(0, 8).map((row, idx) => (
                        <tr key={`pig-individual-sale-${idx}`}>
                          <td>{row.sale_date || '-'}</td>
                          <td>{row.pig_id ? `#${toInt(row.pig_id)}` : '-'}</td>
                          <td>{formatMoney(row.total_amount)}</td>
                        </tr>
                      ))}
                      {!pigIndividualRows.sales.length ? (
                        <tr><td colSpan={3} className="text-secondary">No individual sales logs.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : isPigReports ? (
        <>
          <div className="card p-3">
            <div className="row g-3 align-items-end">
              <div className="col-lg-5">
                <label className="form-label small text-uppercase text-secondary">Select Group</label>
                <select
                  className="form-select"
                  value={selectedPigReportGroupId || ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('id', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {pigGroups.map((group) => (
                    <option key={`reports-group-${group.group_id}`} value={group.group_id}>
                      {group.group_code || `Group ${group.group_id}`} ({toInt(group.remaining_heads || group.count_heads)} heads)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedPigReportGroup ? (
            <div className="alert alert-warning py-2 mb-0">No group data available.</div>
          ) : (
            <>
              <div className="card p-3">
                <h6 className="mb-1">Group Performance: {selectedPigReportGroup.group_code || `Group ${selectedPigReportGroupId}`}</h6>
                <div className="small text-secondary mb-2">Housing: {selectedPigReportGroup.housing_name || selectedPigReportGroup.housing_code || 'Unassigned'}</div>
                <div className="row g-2">
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(pigReportSummary.remainingHeads)}</div><div className="label">Remaining Heads</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(pigReportSummary.latestWeightKg)} kg</div><div className="label">Latest Weight</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(pigReportSummary.mortalityRate)}%</div><div className="label">Mortality</div></div></div>
                  <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(pigReportSummary.fcr)}</div><div className="label">FCR</div></div></div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-lg-6">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Growth Trend</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 fr-list-table">
                        <thead><tr><th>Date</th><th>Weight</th><th>Feed</th></tr></thead>
                        <tbody>
                          {pigReportRows.growth.slice(0, 12).map((row, idx) => (
                            <tr key={`pig-report-growth-${idx}`}>
                              <td>{row.log_date || '-'}</td>
                              <td>{formatMetric(row.avg_weight_kg)} kg</td>
                              <td>{formatMetric(row.feed_kg)}</td>
                            </tr>
                          ))}
                          {!pigReportRows.growth.length ? (
                            <tr><td colSpan={3} className="text-secondary">No growth logs.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="card p-3 h-100">
                    <h6 className="mb-2">Breeding & Sales Summary</h6>
                    <p className="mb-2"><strong>Breeding Records:</strong> {formatMetric(pigReportSummary.breedingRecords)}</p>
                    <p className="mb-2"><strong>Health Records:</strong> {formatMetric(pigReportSummary.healthRecords)}</p>
                    <p className="mb-0"><strong>Sales Records:</strong> {formatMetric(pigReportSummary.salesRecords)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : isPigHealthRecords ? (
        <>
          <div className="card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div>
                <label className="form-label small text-uppercase text-secondary mb-1">Filter by Group</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedPigHealthGroupId > 0 ? String(selectedPigHealthGroupId) : ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (String(event.target.value || '').trim()) {
                      next.set('id', event.target.value);
                    } else {
                      next.delete('id');
                    }
                    setSearchParams(next, { replace: true });
                  }}
                >
                  <option value="">All Groups</option>
                  {pigGroups.map((group) => (
                    <option key={`health-group-${group.group_id}`} value={group.group_id}>{group.group_code || `Group ${group.group_id}`}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadRecords(1, '', quickFilters)}>Refresh</button>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.rowsCount)}</div><div className="label">Health Records</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.diagnosisTagged)}</div><div className="label">Diagnosis Tagged</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.treatmentTagged)}</div><div className="label">Treatment Tagged</div></div></div>
            <div className="col-md-3 col-6"><div className="kpi"><div className="value">{formatMetric(healthRouteSummary.medicationTagged)}</div><div className="label">Medication Tagged</div></div></div>
          </div>

          <div className="card p-3">
            <h6 className="mb-2">Pig Health Records</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead><tr><th>When</th><th>Group</th><th>Diagnosis</th><th>Treatment</th><th>Medication</th><th>Notes</th></tr></thead>
                <tbody>
                  {(listState.rows || []).map((row, idx) => (
                    <tr key={`pig-health-${idx}`}>
                      <td>{row.recorded_at || '-'}</td>
                      <td>{pigGroupCodeById.get(toInt(row.target_id)) || `#${toInt(row.target_id)}`}</td>
                      <td>{row.diagnosis || '-'}</td>
                      <td>{row.treatment || '-'}</td>
                      <td>{row.medication || '-'}</td>
                      <td>{row.notes || ''}</td>
                    </tr>
                  ))}
                  {!loading && !(listState.rows || []).length ? (
                    <tr><td colSpan={6} className="text-secondary">No health records.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : isLayerReports ? (
        <div className="card p-3">
          <h6 className="mb-2">Layer Performance Report</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 fr-list-table">
              <thead><tr><th>Flock</th><th>Total Eggs</th><th>Today Eggs</th><th>Hen-Day %</th><th>Feed/Dozen</th><th>Cracked Eggs</th><th>Sales</th></tr></thead>
              <tbody>
                {(listState.rows || []).map((row, idx) => (
                  <tr key={`layer-report-${idx}`}>
                    <td>{row.flock_code || `#${toInt(row.flock_id)}`}</td>
                    <td>{formatMetric(row.total_eggs)}</td>
                    <td>{formatMetric(row.today_eggs)}</td>
                    <td>{formatMetric(row.hen_day_pct)}%</td>
                    <td>{formatMetric(row.feed_per_dozen)}</td>
                    <td>{formatMetric(row.cracked_eggs)}</td>
                    <td>{formatMoney(row.sales_amount)}</td>
                  </tr>
                ))}
                {!loading && !(listState.rows || []).length ? (
                  <tr><td colSpan={7} className="text-secondary">No report data.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : isCropsReports ? (
        <div className="card p-3">
          <h6 className="mb-2">Crop Performance Report</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 fr-list-table">
              <thead><tr><th>Batch</th><th>Crop</th><th>Planting Date</th><th>ETA</th><th>Harvest (kg)</th><th>Sales</th><th>Status</th></tr></thead>
              <tbody>
                {(listState.rows || []).map((row, idx) => (
                  <tr key={`crop-report-${idx}`}>
                    <td>{row.batch_code || `#${toInt(row.batch_id)}`}</td>
                    <td>{row.crop_name || '-'}</td>
                    <td>{row.planting_date || '-'}</td>
                    <td>{row.expected_harvest_date || '-'}</td>
                    <td>{formatMetric(row.harvest_qty_kg || row.actual_harvest_kg)}</td>
                    <td>{formatMoney(row.harvest_revenue || row.sales_amount)}</td>
                    <td>{row.status || '-'}</td>
                  </tr>
                ))}
                {!loading && !(listState.rows || []).length ? (
                  <tr><td colSpan={7} className="text-secondary">No report data.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : isAquacultureReports ? (
        <div className="card p-3">
          <h6 className="mb-2">Aquaculture Performance Report</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 fr-list-table">
              <thead><tr><th>Pond</th><th>Stocked</th><th>Mortality</th><th>ABW (g)</th><th>Survival %</th><th>Biomass (kg)</th><th>Feed (kg)</th><th>FCR</th><th>Revenue</th></tr></thead>
              <tbody>
                {(listState.rows || []).map((row, idx) => (
                  <tr key={`aqua-report-${idx}`}>
                    <td>{row.pond_name || `#${toInt(row.pond_id)}`}</td>
                    <td>{formatMetric(row.stocked_count)}</td>
                    <td>{formatMetric(row.total_mortality)}</td>
                    <td>{formatMetric(row.latest_abw_g)}</td>
                    <td>{formatMetric(row.survival_pct)}%</td>
                    <td>{formatMetric(row.biomass_kg)}</td>
                    <td>{formatMetric(row.total_feed_kg)}</td>
                    <td>{formatMetric(row.fcr)}</td>
                    <td>{formatMoney(row.total_revenue)}</td>
                  </tr>
                ))}
                {!loading && !(listState.rows || []).length ? (
                  <tr><td colSpan={9} className="text-secondary">No report data.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : isCropsEstimates ? (
        <>
          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card p-3 h-100">
                <h6 className="mb-3">Select Batch</h6>
                <label className="form-label small text-uppercase text-secondary">Batch</label>
                <select
                  className="form-select mb-3"
                  value={selectedCropBatchId || ''}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('id', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {cropBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_code || `Batch ${batch.batch_id}`} ({batch.crop_name || 'Crop'})
                    </option>
                  ))}
                </select>

                {selectedCropBatch ? (
                  <>
                    <div className="fr-estimate-stat">
                      <span>Crop</span>
                      <strong>{selectedCropBatch.crop_name || '-'}</strong>
                    </div>
                    <div className="fr-estimate-stat">
                      <span>Planted Area (ha)</span>
                      <strong>{formatMetric(selectedCropBatch.planted_area_ha)}</strong>
                    </div>
                    <div className="fr-estimate-stat">
                      <span>Seed Cost</span>
                      <strong>{formatMoney(selectedCropBatch.seed_cost)}</strong>
                    </div>
                    <div className="fr-estimate-stat">
                      <span>Input Cost</span>
                      <strong>{formatMoney(selectedCropBatch.input_cost)}</strong>
                    </div>
                    <div className="fr-estimate-stat">
                      <span>Labor Cost</span>
                      <strong>{formatMoney(selectedCropBatch.labor_cost)}</strong>
                    </div>
                    <div className="fr-estimate-stat">
                      <span>Misc Cost</span>
                      <strong>{formatMoney(selectedCropBatch.misc_cost)}</strong>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-warning py-2 mt-2 mb-0">No crop batch available for estimate.</div>
                )}
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card p-3">
                <h6 className="mb-3">Crop Estimate Inputs</h6>
                <form onSubmit={handleCropEstimateSave}>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label">Projected Harvest Date</label>
                      <input className="form-control" type="date" value={cropEstimateForm.projected_harvest_date} onChange={(event) => setCropEstimateForm((prev) => ({ ...prev, projected_harvest_date: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Projected Yield (kg)</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={cropEstimateForm.projected_yield_kg} onChange={(event) => setCropEstimateForm((prev) => ({ ...prev, projected_yield_kg: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Expected Price / kg</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={cropEstimateForm.expected_price_per_kg} onChange={(event) => setCropEstimateForm((prev) => ({ ...prev, expected_price_per_kg: event.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Running Cost</label>
                      <input className="form-control" type="number" step="0.01" min="0" value={cropEstimateForm.running_cost} onChange={(event) => setCropEstimateForm((prev) => ({ ...prev, running_cost: event.target.value }))} />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Notes</label>
                      <input className="form-control" value={cropEstimateForm.notes} onChange={(event) => setCropEstimateForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional notes for this projection" />
                    </div>
                  </div>

                  <div className="row g-2 mt-1">
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className="value">{formatMoney(cropEstimatePreview.expectedRevenue)}</div><div className="label">Expected Revenue</div></div></div>
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className="value">{formatMoney(cropEstimatePreview.runningCost)}</div><div className="label">Running Cost</div></div></div>
                    <div className="col-md-4"><div className="fr-estimate-kpi"><div className={`value ${cropEstimatePreview.expectedProfit < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(cropEstimatePreview.expectedProfit)}</div><div className="label">Expected Profit/Loss</div></div></div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span>Loss</span>
                      <span>Break-even</span>
                      <span>Profit</span>
                    </div>
                    <div className="fr-estimate-meter" role="presentation" aria-hidden="true">
                      <div className="fr-estimate-meter-mid" />
                      <div className="fr-estimate-meter-indicator" style={{ left: `${cropEstimatePreview.indicatorLeft}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 d-flex justify-content-end">
                    <button className="btn btn-primary" disabled={cropEstimateSaving || !selectedCropBatchId}>Find & Save Projection</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <h6 className="mb-3">All Crop Estimate Snapshot</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Projected Date</th>
                    <th>Yield (kg)</th>
                    <th>Price/kg</th>
                    <th>Revenue</th>
                    <th>Running Cost</th>
                    <th>Profit/Loss</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allBatchSnapshotRows.map((row) => (
                    <tr key={`crop-snap-${row.projection_id}`}>
                      <td>{cropBatchCodeById.get(toInt(row.batch_id)) || `Batch ${toInt(row.batch_id)}`}</td>
                      <td>{row.projected_harvest_date || '-'}</td>
                      <td>{formatMetric(row.projected_yield_kg)}</td>
                      <td>{formatMoney(row.expected_price_per_kg)}</td>
                      <td>{formatMoney(row.expected_revenue)}</td>
                      <td>{formatMoney(row.running_cost)}</td>
                      <td className={toNumber(row.expected_profit) >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.expected_profit)}</td>
                      <td>{row.created_at || '-'}</td>
                    </tr>
                  ))}
                  {!allBatchSnapshotRows.length ? (
                    <tr><td colSpan={8} className="text-secondary">No crop estimates available.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-3">
            <h6 className="mb-3">Saved Projections {selectedCropBatch ? `(${selectedCropBatch.batch_code || `Batch ${selectedCropBatchId}`})` : ''}</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 fr-list-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Projected Date</th>
                    <th>Yield (kg)</th>
                    <th>Price/kg</th>
                    <th>Revenue</th>
                    <th>Running Cost</th>
                    <th>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCropProjectionRows.map((row) => (
                    <tr key={`crop-saved-${row.projection_id}`}>
                      <td>{row.created_at || '-'}</td>
                      <td>{row.projected_harvest_date || '-'}</td>
                      <td>{formatMetric(row.projected_yield_kg)}</td>
                      <td>{formatMoney(row.expected_price_per_kg)}</td>
                      <td>{formatMoney(row.expected_revenue)}</td>
                      <td>{formatMoney(row.running_cost)}</td>
                      <td className={toNumber(row.expected_profit) >= 0 ? 'text-success' : 'text-danger'}>{formatMoney(row.expected_profit)}</td>
                    </tr>
                  ))}
                  {!selectedCropProjectionRows.length ? (
                    <tr><td colSpan={7} className="text-secondary">No saved crop projections yet. Use Find & Save Projection.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-3">
          {activePanelDefs.length ? (
            <div className="row g-3 mb-3">
              {isBroilerOverview && broilerTotals ? (
                <div className="col-12">
                  <section className="broiler-stage mb-3">
                    <div className="broiler-stage-top">
                      <div>
                        <div className="dash-eyebrow">Broiler Command Center</div>
                        <h3 className="mb-1">Broiler Management</h3>
                        <div className="text-secondary">Batches, daily operations, feed, health, harvest and profitability in one workflow.</div>
                      </div>
                      <div className="d-flex gap-2">
                        <a className="btn btn-primary btn-sm" href={routeUrl('broilers/add-batch')}><i className="fa-solid fa-plus me-1"/>New Batch</a>
                        <a className="btn btn-outline-info btn-sm" href={routeUrl('broilers/daily-entry')}><i className="fa-solid fa-clipboard-list me-1"/>Daily Entry</a>
                        <a className="btn btn-outline-info btn-sm" href={routeUrl('broilers/feed-management')}><i className="fa-solid fa-wheat-awn me-1"/>Feed Log</a>
                      </div>
                    </div>
                    <div className="broiler-stage-kpis">
                      <div className="broiler-stage-pill kpi">
                        <div className="label">Active Batches</div>
                        <div className="value">{broilerTotals.batches ?? 0}</div>
                      </div>
                      <div className="broiler-stage-pill kpi">
                        <div className="label">Birds in Stock</div>
                        <div className="value">{broilerTotals.birds_in_stock ?? 0}</div>
                      </div>
                      <div className="broiler-stage-pill kpi">
                        <div className="label">Birds Placed</div>
                        <div className="value">{broilerTotals.birds_placed ?? 0}</div>
                      </div>
                      <div className="broiler-stage-pill kpi">
                        <div className="label">Urgent Signals</div>
                        <div className={`value ${((broilerTotals.harvest_overdue ?? 0) + (broilerTotals.vaccination_overdue ?? 0)) > 0 ? 'text-danger' : ''}`}>
                          {(broilerTotals.harvest_overdue ?? 0) + (broilerTotals.vaccination_overdue ?? 0)}
                        </div>
                      </div>
                      <div className="broiler-stage-pill kpi">
                        <div className="label">Due Soon</div>
                        <div className="value">{(broilerTotals.harvest_due_7d ?? 0) + (broilerTotals.vaccination_due ?? 0)}</div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}

              {overviewPanels.map((panel) => {
                const columns = pickRowColumns(panel.rows, panel.columns, 4);

                // Render broiler batch panels as card grid (pixel-parity with PHP legacy view)
                if (panel.table === 'broiler_batches') {
                  return (
                    <div key={`${panel.table}-${panel.title}`} className="col-xl-4 col-md-6">
                      <div className="card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <span>{panel.title}</span>
                          <div className="small text-secondary">{panel.rows.length} rows{panel.stale ? ' (cached)' : ''}</div>
                        </div>
                        <div className="card-body p-0">
                          <div className="p-3">
                            <div className="broiler-batch-grid">
                              {panel.rows.slice(0, panel.limit || 8).map((row) => {
                                const pct = Math.min(100, Math.round((toNumber(row.current_count) / Math.max(1, toNumber(row.initial_count))) * 100));
                                return (
                                  <div key={`batch-card-${row.batch_id || row.batch_code || Math.random()}`} className="broiler-batch-card">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <div className="h6 mb-1" style={{fontSize: '0.95rem'}}>{row.batch_code || `#${toInt(row.batch_id)}`}</div>
                                        <div className="small text-secondary">{row.housing_label || row.housing || ''}</div>
                                      </div>
                                      <div className="text-end">
                                        <div className="small text-secondary">Current</div>
                                        <div className="h5 mb-0">{formatMetric(row.current_count)}</div>
                                      </div>
                                    </div>

                                    <div className="mt-2 mini-grid">
                                      <div>
                                        <div className="label">Start</div>
                                        <div className="value">{row.start_date || '-'}</div>
                                      </div>
                                      <div>
                                        <div className="label">Expected</div>
                                        <div className="value">{row.expected_harvest_date || '-'}</div>
                                      </div>
                                    </div>

                                    <div className="mt-2 broiler-meter readiness" aria-hidden>
                                      <span style={{ width: `${pct}%` }} />
                                    </div>

                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                      <div className="broiler-metric-note">FCR: {formatMetric(row.fcr)}</div>
                                      <div className="broiler-chip">{row.status || 'N/A'}</div>
                                    </div>

                                    <div className="mt-2 small-metrics d-flex justify-content-between align-items-center">
                                      <div className="text-secondary small">Birds</div>
                                      <div className="fw-semibold">{formatMetric(row.current_count)} / {formatMetric(row.initial_count)}</div>
                                    </div>

                                    <div className="mt-2 mini-grid three-cols">
                                      <div>
                                        <div className="label">FCR</div>
                                        <div className="value">{formatMetric(row.fcr)}</div>
                                      </div>
                                      <div>
                                        <div className="label">COP</div>
                                        <div className="value">{formatMoney(row.cost_of_production ?? row.cop)}</div>
                                      </div>
                                      <div>
                                        <div className="label">Revenue</div>
                                        <div className="value">{formatMoney(row.harvest_revenue)}</div>
                                      </div>
                                    </div>

                                    {/* Harvest readiness + performance */}
                                    <div className="mt-2 broiler-metric-note d-flex justify-content-between"><span>Harvest Readiness</span><span>{formatMetric(row.harvest_readiness_pct ?? pct)}%</span></div>
                                    <div className="broiler-meter readiness mb-2" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, Number(row.harvest_readiness_pct ?? pct)))}%` }} /></div>

                                    <div className="broiler-metric-note d-flex justify-content-between"><span>Performance Score</span><span>{formatMetric(row.performance_score)} ({row.performance_label || 'Watch'})</span></div>
                                    <div className="broiler-meter performance mb-2" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, Number(row.performance_score ?? 0)))}%` }} /></div>

                                    {/* Profit / Loss */}
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                      <div>
                                        {(() => {
                                          const revenue = toNumber(row.harvest_revenue);
                                          const cop = toNumber(row.cost_of_production ?? row.cop);
                                          const profit = revenue - cop;
                                          const scale = Math.max(Math.abs(revenue), Math.abs(cop), 1);
                                          const ratio = Math.max(-1, Math.min(1, profit / scale));
                                          const indicatorLeft = (ratio + 1) * 50;
                                          return (
                                            <div className="small">
                                              <div className={`fw-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(profit)}</div>
                                              <div className="text-secondary small">P/L</div>
                                              <div className="fr-estimate-meter mt-1" style={{ position: 'relative' }}>
                                                <div className="fr-estimate-meter-indicator" style={{ left: `${indicatorLeft}%` }} />
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div>
                                        <a className="btn btn-sm btn-outline-info" href={routeUrl(`broilers/view-batch?batch_id=${row.batch_id}`)}>Open Batch</a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {!panel.rows.length ? <div className="text-secondary">No batches found.</div> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default: render as table (existing behaviour)
                return (
                  <div key={`${panel.table}-${panel.title}`} className="col-xl-4 col-md-6">
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <span>{panel.title}</span>
                        <div className="small text-secondary">{panel.rows.length} rows{panel.stale ? ' (cached)' : ''}</div>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table table-sm mb-0 fr-list-table">
                            <thead>
                              <tr>
                                {columns.map((column) => <th key={`${panel.table}-${column}`}>{column}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {panel.rows.slice(0, panel.limit || 8).map((row, rowIndex) => (
                                <tr key={`${panel.table}-${rowIndex}`}>
                                  {columns.map((column) => <td key={`${panel.table}-${rowIndex}-${column}`}>{formatCell(row?.[column])}</td>)}
                                </tr>
                              ))}
                              {!panel.rows.length ? (
                                <tr><td colSpan={Math.max(columns.length, 1)} className="text-secondary">No records found.</td></tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {overviewLoading && !overviewPanels.length ? (
                <div className="col-12"><div className="small text-secondary">Loading module overview panels...</div></div>
              ) : null}
            </div>
          ) : null}

          {isLegacyReportScreen ? (
            <div className="fr-report-shell p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <h6 className="mb-0">{reportLayout?.title || 'Report Builder'}</h6>
                <div className="small text-secondary">
                  Dataset: {selectedEntity?.entity_label || selectedTable || '-'}
                </div>
              </div>
              <div className="row g-2 align-items-end">
                <div className="col-md-2">
                  <label className="form-label small text-uppercase text-secondary">Mode</label>
                  <select
                    className="form-select"
                    value={reportFilters.mode}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, mode: event.target.value }))}
                  >
                    <option value="FULL">Full</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small text-uppercase text-secondary">From</label>
                  <input
                    className="form-control"
                    type="date"
                    value={reportFilters.from}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, from: event.target.value }))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small text-uppercase text-secondary">To</label>
                  <input
                    className="form-control"
                    type="date"
                    value={reportFilters.to}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, to: event.target.value }))}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-uppercase text-secondary">Status</label>
                  <select
                    className="form-select"
                    value={reportFilters.status}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="">All</option>
                    {reportStatusOptions.map((statusValue) => (
                      <option key={`report-status-${statusValue}`} value={statusValue}>{statusValue}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 d-grid">
                  <button className="btn btn-outline-secondary" onClick={() => loadRecords(1, search, quickFilters)}>Reload Dataset</button>
                </div>
              </div>

              <div className="row g-2 mt-1">
                {reportKpis.map((metric) => (
                  <div key={`report-kpi-${metric.label}`} className="col-xl-3 col-md-6">
                    <div className="kpi">
                      <div className="value">{metric.value}</div>
                      <div className="label">{metric.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isLegacyReportScreen ? (
            <>
              <div className="row g-2 align-items-end mb-3">
                {!isLegacyScreen ? (
                  <div className="col-md-4">
                    <label className="form-label small text-uppercase text-secondary">Entity</label>
                    <select className="form-select" value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)}>
                      {(meta?.entities || []).map((entity) => (
                        <option key={entity.table} value={entity.table}>{entity.entity_label || entity.table}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="col-md-4">
                    <label className="form-label small text-uppercase text-secondary">Dataset</label>
                    <input className="form-control" value={selectedEntity?.entity_label || selectedTable || ''} readOnly />
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label small text-uppercase text-secondary">Search</label>
                  <input
                    className="form-control"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        loadRecords(1, search, quickFilters).catch(() => {});
                      }
                    }}
                    placeholder="Search records..."
                  />
                </div>

                <div className="col-md-2 d-grid">
                  <button className="btn btn-outline-secondary" onClick={() => loadRecords(1, search, quickFilters)}>Apply</button>
                </div>
              </div>

              {quickFilterFields.length ? (
                <div className="row g-2 mb-3">
                  {quickFilterFields.map((field) => (
                    <div key={`quick-filter-${field}`} className="col-md-4">
                      <label className="form-label small text-uppercase text-secondary">{field}</label>
                      <select
                        className="form-select"
                        value={String(quickFilters[field] || '')}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setQuickFilters((prev) => ({
                            ...prev,
                            [field]: nextValue
                          }));
                        }}
                      >
                        <option value="">All</option>
                        {(quickFilterOptions[field] || []).map((value) => (
                          <option key={`quick-filter-${field}-${value}`} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <div>
              <h6 className="mb-0">{legacyTableHeading}</h6>
              <div className="small text-secondary">{isLegacyReportScreen ? displayedRows.length : listState.totalCount} records</div>
            </div>
            {!isLegacyReportScreen ? (
              <button className="btn btn-primary btn-sm" onClick={openCreate} disabled={!selectedEntity}>{createButtonLabel}</button>
            ) : null}
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle fr-list-table">
              <thead>
                <tr>
                  {displayedColumns.map((column) => <th key={column}>{column}</th>)}
                  {!isLegacyReportScreen ? <th className="text-end">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, rowIndex) => (
                  <tr key={row[selectedEntity?.primary_key] || rowIndex}>
                    {displayedColumns.map((column) => <td key={`${rowIndex}-${column}`}>{formatCell(row[column])}</td>)}
                    {!isLegacyReportScreen ? (
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {resolveRowViewRoute(selectedTable, row) ? (
                            <NavLink className="btn btn-outline-info" to={resolveRowViewRoute(selectedTable, row)}>View</NavLink>
                          ) : null}
                          <button className="btn btn-outline-secondary" onClick={() => openEdit(row)} disabled={!canEditDelete}>Edit</button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(row)} disabled={!canEditDelete}>Delete</button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!loading && !displayedRows.length ? (
                  <tr><td colSpan={Math.max(displayedColumns.length + (isLegacyReportScreen ? 0 : 1), 1)} className="text-secondary">No records found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!isLegacyReportScreen ? (
            <div className="d-flex align-items-center justify-content-end gap-2 mt-2">
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={listState.page <= 1 || loading}
                  onClick={() => loadRecords(listState.page - 1, search, quickFilters)}
                >Previous</button>
                <button className="btn btn-outline-secondary" disabled>
                  {listState.page} / {listState.totalPages}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={listState.page >= listState.totalPages || loading}
                  onClick={() => loadRecords(listState.page + 1, search, quickFilters)}
                >Next</button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!(isBroilerEstimates || isCropsEstimates) ? (
        <RecordEditorModal
          schema={selectedEntity}
          record={editingRow}
          open={editorOpen}
          saving={saving}
          onClose={closeEditor}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  );
}

export default ModuleWorkspacePage;

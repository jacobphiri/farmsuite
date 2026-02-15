import dayjs from 'dayjs';
import { getModuleDefinitions } from '../config/modules.js';
import { sanitizeIdentifier } from './schemaService.js';
import { toDecimal, toInt } from '../utils/http.js';

async function scalar(conn, sql, params = {}) {
  const [rows] = await conn.query(sql, params);
  const row = rows?.[0] || {};
  const firstKey = Object.keys(row)[0];
  return row[firstKey] ?? 0;
}

async function safeCount(conn, table, farmId, whereSql = '', extraParams = {}) {
  try {
    const value = await scalar(
      conn,
      `SELECT COUNT(*) AS total_count
       FROM ${sanitizeIdentifier(table)}
       WHERE farm_id = :farmId ${whereSql}`,
      { farmId, ...extraParams }
    );
    return toInt(value, 0);
  } catch {
    return 0;
  }
}

async function safeSum(conn, table, column, farmId, whereSql = '', extraParams = {}) {
  try {
    const value = await scalar(
      conn,
      `SELECT COALESCE(SUM(${sanitizeIdentifier(column)}), 0) AS total_value
       FROM ${sanitizeIdentifier(table)}
       WHERE farm_id = :farmId ${whereSql}`,
      { farmId, ...extraParams }
    );
    return toDecimal(value, 0);
  } catch {
    return 0;
  }
}

async function moduleSnapshot(conn, farmId) {
  const modules = getModuleDefinitions();
  const snapshots = [];

  for (const moduleDef of modules) {
    const firstEntity = moduleDef.entities[0];
    if (!firstEntity) continue;

    const total = await safeCount(conn, firstEntity.table, farmId);
    snapshots.push({
      module_key: moduleDef.moduleKey,
      module_name: moduleDef.name,
      icon: moduleDef.icon,
      table: firstEntity.table,
      total
    });
  }

  return snapshots;
}

async function lastSevenDaysSales(conn, farmId) {
  const fromDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
  try {
    const [rows] = await conn.query(
      `SELECT DATE(created_at) AS day_key, COALESCE(SUM(amount_paid), 0) AS total_value
       FROM sales_pos_orders
       WHERE farm_id = :farmId AND DATE(created_at) >= :fromDate
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      { farmId, fromDate }
    );

    const map = new Map(rows.map((row) => [String(row.day_key), toDecimal(row.total_value, 0)]));
    return Array.from({ length: 7 }).map((_, offset) => {
      const day = dayjs(fromDate).add(offset, 'day').format('YYYY-MM-DD');
      return {
        date: day,
        value: map.get(day) || 0
      };
    });
  } catch {
    return [];
  }
}

export async function fetchDashboardOverview(conn, { farmId }) {
  const pendingTasks = await safeCount(conn, 'tasks', farmId, "AND status IN ('PENDING','IN_PROGRESS')");
  const openIssues = await safeCount(conn, 'issue_reports', farmId, "AND status IN ('OPEN','IN_PROGRESS')");
  const unreadMessages = await safeCount(conn, 'user_messages', farmId, 'AND is_read = 0');

  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const salesThisMonth = await safeSum(
    conn,
    'sales_pos_orders',
    'amount_paid',
    farmId,
    'AND DATE(created_at) >= :monthStart',
    { monthStart }
  );

  const expensesThisMonth = await safeSum(
    conn,
    'expenses',
    'amount',
    farmId,
    'AND expense_date >= :monthStart',
    { monthStart }
  );

  const activeBroilers = await safeSum(conn, 'broiler_batches', 'current_count', farmId, "AND status = 'ACTIVE'");
  const activeLayers = await safeSum(conn, 'layer_flocks', 'bird_count', farmId, "AND status = 'ACTIVE'");
  const activePigs = await safeCount(conn, 'pig_animals', farmId, "AND status = 'ACTIVE'");

  const moduleCounts = await moduleSnapshot(conn, farmId);
  const salesTrend = await lastSevenDaysSales(conn, farmId);

  const [recentTasks] = await conn.query(
    `SELECT task_id, module_key, title, status, priority, due_date, updated_at
     FROM tasks
     WHERE farm_id = :farmId
     ORDER BY updated_at DESC
     LIMIT 6`,
    { farmId }
  );

  const [recentIssues] = await conn.query(
    `SELECT issue_id, module_key, title, status, priority, updated_at
     FROM issue_reports
     WHERE farm_id = :farmId
     ORDER BY updated_at DESC
     LIMIT 6`,
    { farmId }
  );

  return {
    cards: [
      { key: 'active_livestock', label: 'Active Livestock', value: toInt(activeBroilers + activeLayers + activePigs) },
      { key: 'pending_tasks', label: 'Pending Tasks', value: pendingTasks },
      { key: 'open_issues', label: 'Open Issues', value: openIssues },
      { key: 'unread_messages', label: 'Unread Messages', value: unreadMessages },
      { key: 'sales_this_month', label: 'Sales This Month', value: salesThisMonth },
      { key: 'expenses_this_month', label: 'Expenses This Month', value: expensesThisMonth }
    ],
    sales_trend: salesTrend,
    modules: moduleCounts,
    recent_tasks: recentTasks,
    recent_issues: recentIssues,
    generated_at: new Date().toISOString(),
    context: {
      farm_id: toInt(farmId),
      month_start: monthStart
    }
  };
}

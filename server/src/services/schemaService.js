import { isAllowedTable } from '../config/modules.js';

const schemaCache = new Map();

function parseEnumValues(columnType) {
  const raw = String(columnType || '');
  if (!raw.startsWith('enum(')) return [];
  const inside = raw.slice(5, -1);
  return inside
    .split(',')
    .map((part) => part.trim().replace(/^'/, '').replace(/'$/, ''))
    .filter(Boolean);
}

function toFieldType(dataType) {
  const value = String(dataType || '').toLowerCase();
  if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(value)) return 'number';
  if (['decimal', 'double', 'float'].includes(value)) return 'decimal';
  if (['date'].includes(value)) return 'date';
  if (['datetime', 'timestamp'].includes(value)) return 'datetime';
  if (['text', 'mediumtext', 'longtext'].includes(value)) return 'text';
  if (['json'].includes(value)) return 'json';
  return 'string';
}

function inferReadOnly(column) {
  if (column.isAutoIncrement) return true;
  if (['created_at', 'updated_at'].includes(column.name)) return true;
  if (column.name === 'password_hash') return true;
  return false;
}

export async function getTableSchema(conn, tableName) {
  const table = String(tableName || '').trim();
  if (!table || !isAllowedTable(table)) {
    return null;
  }

  if (schemaCache.has(table)) {
    return schemaCache.get(table);
  }

  const [rows] = await conn.query(
    `SELECT
      COLUMN_NAME,
      COLUMN_TYPE,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMN_KEY,
      COLUMN_DEFAULT,
      EXTRA,
      ORDINAL_POSITION
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION ASC`,
    [table]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const columns = rows.map((row) => {
    const column = {
      name: String(row.COLUMN_NAME),
      columnType: String(row.COLUMN_TYPE || ''),
      dataType: String(row.DATA_TYPE || '').toLowerCase(),
      fieldType: toFieldType(row.DATA_TYPE),
      nullable: String(row.IS_NULLABLE || '') === 'YES',
      key: String(row.COLUMN_KEY || ''),
      defaultValue: row.COLUMN_DEFAULT,
      isAutoIncrement: String(row.EXTRA || '').toLowerCase().includes('auto_increment'),
      isPrimary: String(row.COLUMN_KEY || '') === 'PRI',
      enumValues: parseEnumValues(row.COLUMN_TYPE),
      readOnly: false
    };

    column.readOnly = inferReadOnly(column);
    return column;
  });

  const columnsByName = columns.reduce((acc, column) => {
    acc[column.name] = column;
    return acc;
  }, {});

  const primaryKey = (columns.find((column) => column.isPrimary) || {}).name || null;

  const schema = {
    table,
    primaryKey,
    hasFarmId: Boolean(columnsByName.farm_id),
    hasOrgId: Boolean(columnsByName.org_id),
    columns,
    columnsByName,
    readableColumns: columns.filter((column) => column.name !== 'password_hash').map((column) => column.name),
    writableColumns: columns.filter((column) => !column.readOnly).map((column) => column.name)
  };

  schemaCache.set(table, schema);
  return schema;
}

export function sanitizeIdentifier(value) {
  const raw = String(value || '').trim();
  if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
    throw new Error(`Invalid identifier: ${value}`);
  }
  return `\`${raw}\``;
}

export function clearSchemaCache() {
  schemaCache.clear();
}

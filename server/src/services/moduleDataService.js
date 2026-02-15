import crypto from 'node:crypto';
import { getEntityByTable, getModuleByKey } from '../config/modules.js';
import { getTableSchema, sanitizeIdentifier } from './schemaService.js';
import { toDateInput, toDecimal, toInt } from '../utils/http.js';

function makeCacheKey(prefix, value) {
  const hash = crypto.createHash('sha1').update(String(value || '')).digest('hex');
  return `${prefix}:${hash}`;
}

function coerceColumnValue(column, rawValue) {
  if (rawValue === undefined) return undefined;
  if (rawValue === null) return null;

  if (typeof rawValue === 'string' && rawValue.trim() === '') {
    return column.nullable ? null : rawValue;
  }

  if (column.fieldType === 'number') {
    if (column.dataType === 'tinyint' && typeof rawValue === 'boolean') {
      return rawValue ? 1 : 0;
    }
    return toInt(rawValue, 0);
  }

  if (column.fieldType === 'decimal') {
    return toDecimal(rawValue, 0);
  }

  if (column.fieldType === 'date') {
    return toDateInput(rawValue);
  }

  if (column.fieldType === 'datetime') {
    return String(rawValue);
  }

  if (column.fieldType === 'json') {
    if (typeof rawValue === 'string') return rawValue;
    return JSON.stringify(rawValue);
  }

  return String(rawValue);
}

function applyActorDefaults({ payload, schema, userId, farmId }) {
  const draft = { ...payload };

  if (schema.hasFarmId) {
    draft.farm_id = toInt(draft.farm_id || farmId, farmId);
  }

  const actorColumns = ['created_by', 'updated_by', 'assigned_by', 'reported_by', 'sender_user_id'];
  for (const columnName of actorColumns) {
    if (schema.columnsByName[columnName] && draft[columnName] === undefined) {
      draft[columnName] = userId;
    }
  }

  if (schema.columnsByName.source_channel && draft.source_channel === undefined) {
    draft.source_channel = 'API';
  }

  return draft;
}

function sanitizePayload({ schema, payload, mode, userId, farmId }) {
  const draft = applyActorDefaults({ payload: payload || {}, schema, userId, farmId });
  const output = {};

  for (const columnName of schema.writableColumns) {
    const column = schema.columnsByName[columnName];
    if (!column) continue;

    if (mode === 'update' && columnName === schema.primaryKey) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(draft, columnName)) {
      continue;
    }

    const coerced = coerceColumnValue(column, draft[columnName]);

    if (column.enumValues.length > 0 && coerced !== null && coerced !== undefined) {
      const normalized = String(coerced).toUpperCase();
      const allowed = column.enumValues.map((value) => String(value).toUpperCase());
      if (!allowed.includes(normalized)) {
        continue;
      }
      output[columnName] = column.enumValues.find((value) => String(value).toUpperCase() === normalized) || coerced;
    } else {
      output[columnName] = coerced;
    }
  }

  return output;
}

function buildSearchClause({ schema, search, params }) {
  const term = String(search || '').trim();
  if (!term) return null;

  const searchable = schema.columns
    .filter((column) => ['string', 'text'].includes(column.fieldType) || column.dataType === 'enum')
    .filter((column) => column.name !== 'password_hash')
    .slice(0, 8);

  if (searchable.length === 0) {
    return null;
  }

  params.search = `%${term}%`;

  return `(${searchable.map((column) => `${sanitizeIdentifier(column.name)} LIKE :search`).join(' OR ')})`;
}

function buildFilterClauses({ schema, filters, params }) {
  const clauses = [];
  const input = filters && typeof filters === 'object' ? filters : {};

  for (const [key, rawValue] of Object.entries(input)) {
    const column = schema.columnsByName[key];
    if (!column) continue;
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const paramName = `f_${key}`;
    params[paramName] = coerceColumnValue(column, rawValue);
    clauses.push(`${sanitizeIdentifier(key)} = :${paramName}`);
  }

  return clauses;
}

function parseFilters(query) {
  const output = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (!key.startsWith('filter_')) continue;
    output[key.slice(7)] = value;
  }
  return output;
}

export async function getEntityMeta(conn, { moduleKey, table }) {
  const moduleDef = getModuleByKey(moduleKey);
  if (!moduleDef) return null;

  const entity = getEntityByTable(moduleKey, table);
  if (!entity) return null;

  const schema = await getTableSchema(conn, table);
  if (!schema) return null;

  return {
    module: moduleDef,
    entity,
    schema
  };
}

export async function listRecords(conn, { moduleKey, table, farmId, query = {} }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { schema } = meta;

  const page = Math.max(1, toInt(query.page, 1));
  // Allow larger datasets for parity report screens and module-level analytics.
  const pageSize = Math.min(1000, Math.max(1, toInt(query.page_size || query.pageSize, 20)));

  const params = {};
  const clauses = [];

  if (schema.hasFarmId) {
    clauses.push('`farm_id` = :farmId');
    params.farmId = toInt(farmId);
  }

  const searchClause = buildSearchClause({ schema, search: query.search, params });
  if (searchClause) clauses.push(searchClause);

  const filterClauses = buildFilterClauses({ schema, filters: parseFilters(query), params });
  clauses.push(...filterClauses);

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sortByRaw = String(query.sort_by || query.sortBy || schema.primaryKey || schema.columns[0].name);
  const sortBy = schema.columnsByName[sortByRaw] ? sortByRaw : (schema.primaryKey || schema.columns[0].name);
  const sortDir = String(query.sort_dir || query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  params.limit = pageSize;
  params.offset = (page - 1) * pageSize;

  const columnsSql = schema.readableColumns.map((columnName) => sanitizeIdentifier(columnName)).join(', ');

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total_count
     FROM ${sanitizeIdentifier(schema.table)}
     ${whereSql}`,
    params
  );

  const [rows] = await conn.query(
    `SELECT ${columnsSql}
     FROM ${sanitizeIdentifier(schema.table)}
     ${whereSql}
     ORDER BY ${sanitizeIdentifier(sortBy)} ${sortDir}
     LIMIT :limit OFFSET :offset`,
    params
  );

  const totalCount = toInt(countRows?.[0]?.total_count, 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const cacheKey = makeCacheKey('list', `${moduleKey}:${table}:${farmId}:${JSON.stringify(query || {})}`);

  return {
    cacheKey,
    data: {
      module_key: moduleKey,
      table,
      primary_key: schema.primaryKey,
      page,
      page_size: pageSize,
      total_count: totalCount,
      total_pages: totalPages,
      rows
    }
  };
}

export async function getRecordById(conn, { moduleKey, table, farmId, recordId }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { schema } = meta;
  if (!schema.primaryKey) return null;

  const params = {
    id: toInt(recordId)
  };

  const clauses = [`${sanitizeIdentifier(schema.primaryKey)} = :id`];
  if (schema.hasFarmId) {
    clauses.push('`farm_id` = :farmId');
    params.farmId = toInt(farmId);
  }

  const columnsSql = schema.readableColumns.map((columnName) => sanitizeIdentifier(columnName)).join(', ');

  const [rows] = await conn.query(
    `SELECT ${columnsSql}
     FROM ${sanitizeIdentifier(schema.table)}
     WHERE ${clauses.join(' AND ')}
     LIMIT 1`,
    params
  );

  const row = rows[0] || null;
  const cacheKey = makeCacheKey('detail', `${moduleKey}:${table}:${farmId}:${recordId}`);

  return {
    cacheKey,
    data: {
      module_key: moduleKey,
      table,
      primary_key: schema.primaryKey,
      record: row
    }
  };
}

export async function createRecord(conn, { moduleKey, table, farmId, userId, payload }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { schema } = meta;
  const sanitized = sanitizePayload({
    schema,
    payload,
    mode: 'create',
    userId,
    farmId
  });

  const columns = Object.keys(sanitized);
  if (columns.length === 0) {
    return { error: 'No writable fields were provided.' };
  }

  const placeholders = columns.map((columnName) => `:${columnName}`);

  const [result] = await conn.query(
    `INSERT INTO ${sanitizeIdentifier(schema.table)}
      (${columns.map((columnName) => sanitizeIdentifier(columnName)).join(', ')})
      VALUES (${placeholders.join(', ')})`,
    sanitized
  );

  const recordId = toInt(result?.insertId, 0);
  const details = recordId > 0
    ? await getRecordById(conn, { moduleKey, table, farmId, recordId })
    : { data: { module_key: moduleKey, table, record: null } };

  return {
    data: {
      ...details.data,
      inserted_id: recordId
    }
  };
}

export async function updateRecord(conn, { moduleKey, table, farmId, userId, recordId, payload }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { schema } = meta;
  if (!schema.primaryKey) {
    return { error: 'This table does not have a primary key.' };
  }

  const sanitized = sanitizePayload({
    schema,
    payload,
    mode: 'update',
    userId,
    farmId
  });

  if (Object.keys(sanitized).length === 0) {
    return { error: 'No writable fields were provided for update.' };
  }

  const setSql = Object.keys(sanitized)
    .map((columnName) => `${sanitizeIdentifier(columnName)} = :${columnName}`)
    .join(', ');

  const params = {
    ...sanitized,
    id: toInt(recordId)
  };

  const clauses = [`${sanitizeIdentifier(schema.primaryKey)} = :id`];
  if (schema.hasFarmId) {
    clauses.push('`farm_id` = :farmId');
    params.farmId = toInt(farmId);
  }

  const [result] = await conn.query(
    `UPDATE ${sanitizeIdentifier(schema.table)}
     SET ${setSql}
     WHERE ${clauses.join(' AND ')}`,
    params
  );

  if (toInt(result?.affectedRows, 0) < 1) {
    return { error: 'No matching record found for update.' };
  }

  const details = await getRecordById(conn, { moduleKey, table, farmId, recordId });

  return {
    data: {
      ...details.data,
      updated_id: toInt(recordId)
    }
  };
}

export async function deleteRecord(conn, { moduleKey, table, farmId, recordId }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { schema } = meta;
  if (!schema.primaryKey) {
    return { error: 'This table does not have a primary key.' };
  }

  const params = {
    id: toInt(recordId)
  };

  const clauses = [`${sanitizeIdentifier(schema.primaryKey)} = :id`];
  if (schema.hasFarmId) {
    clauses.push('`farm_id` = :farmId');
    params.farmId = toInt(farmId);
  }

  const [result] = await conn.query(
    `DELETE FROM ${sanitizeIdentifier(schema.table)}
     WHERE ${clauses.join(' AND ')}
     LIMIT 1`,
    params
  );

  return {
    data: {
      module_key: moduleKey,
      table,
      deleted_id: toInt(recordId),
      affected_rows: toInt(result?.affectedRows, 0)
    }
  };
}

export async function getEntitySchema(conn, { moduleKey, table }) {
  const meta = await getEntityMeta(conn, { moduleKey, table });
  if (!meta) return null;

  const { module, entity, schema } = meta;

  return {
    module_key: module.moduleKey,
    module_name: module.name,
    table: schema.table,
    entity_label: entity.label,
    primary_key: schema.primaryKey,
    has_farm_id: schema.hasFarmId,
    fields: schema.columns
      .filter((column) => column.name !== 'password_hash')
      .map((column) => ({
        name: column.name,
        field_type: column.fieldType,
        data_type: column.dataType,
        column_type: column.columnType,
        nullable: column.nullable,
        is_primary: column.isPrimary,
        read_only: column.readOnly,
        enum_values: column.enumValues
      }))
  };
}

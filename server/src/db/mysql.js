import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  socketPath: env.mysql.socketPath,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  namedPlaceholders: true
});

export async function withMysql(fn) {
  const conn = await pool.getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}

export async function checkMysql() {
  return withMysql(async (conn) => {
    await conn.query('SELECT 1');
    return true;
  });
}

export async function closeMysql() {
  await pool.end();
}

export function isMysqlUnavailableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  return (
    [
      'ECONNREFUSED',
      'PROTOCOL_CONNECTION_LOST',
      'ER_ACCESS_DENIED_ERROR',
      'ER_CON_COUNT_ERROR',
      'ER_HOST_IS_BLOCKED',
      'ENOTFOUND',
      'ETIMEDOUT'
    ].includes(code) ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('socket')
  );
}

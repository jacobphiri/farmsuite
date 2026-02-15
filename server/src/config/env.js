import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  jwtSecret: process.env.JWT_SECRET || 'farmreacterp-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 45),
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'farmsuite',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    socketPath: process.env.DB_SOCKET || '/opt/lampp/var/mysql/mysql.sock'
  },
  localDbPath: path.resolve(rootDir, process.env.LOCAL_DB_PATH || 'server/data/farmreact_local_cache.sqlite')
};

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { localCacheStats, outboxStats } from './db/cache.js';
import { checkMysql, closeMysql } from './db/mysql.js';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import moduleRoutes from './routes/modules.js';
import settingsRoutes from './routes/settings.js';
import syncRoutes from './routes/sync.js';
import systemRoutes from './routes/system.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const clientDistDir = path.resolve(rootDir, 'client/dist');

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/api/health', async (_req, res) => {
  let mysqlAvailable = false;

  try {
    await checkMysql();
    mysqlAvailable = true;
  } catch {
    mysqlAvailable = false;
  }

  return res.json({
    ok: true,
    service: 'farmreacterp-api',
    env: env.nodeEnv,
    mysql_available: mysqlAvailable,
    outbox: outboxStats(),
    local_cache: localCacheStats(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sync', syncRoutes);

if (env.nodeEnv === 'production') {
  app.use(express.static(clientDistDir, {
    maxAge: '7d',
    index: false
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.resolve(clientDistDir, 'index.html'));
  });
}

app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[farmreacterp] server running on http://localhost:${env.port}`);
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`[farmreacterp] port ${env.port} is already in use. Stop the existing process or set a different PORT.`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error('[farmreacterp] server failed to start:', error?.message || error);
  process.exit(1);
});

async function shutdown() {
  server.close(async () => {
    await closeMysql();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

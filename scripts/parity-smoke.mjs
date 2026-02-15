import { chromium } from 'playwright';
import { LEGACY_MODULE_ROUTES } from '../client/src/config/legacyRoutes.js';

const BASE_URL = process.env.PARITY_BASE_URL || 'http://localhost:5174';
const API_URL = process.env.PARITY_API_URL || 'http://localhost:8080';
const LOGIN_EMAIL = process.env.PARITY_EMAIL || 'superadmin@farmsuite.com';
const LOGIN_PASSWORD = process.env.PARITY_PASSWORD || 'admin123';
const WAIT_MS = Number(process.env.PARITY_WAIT_MS || 450);

function uniquePaths() {
  return Array.from(new Set([
    '/dashboard',
    ...LEGACY_MODULE_ROUTES.map((route) => `/${String(route.path || '').replace(/^\/+/, '')}`),
    '/profile',
    '/settings',
    '/settings/users',
    '/settings/theming',
    '/settings/roles',
    '/settings/farm-settings',
    '/settings/module-config',
    '/settings/system-config',
    '/settings/sync',
    '/settings/backup'
  ]));
}

function dedupeErrors(errors) {
  const seen = new Set();
  const out = [];

  for (const err of errors) {
    const key = JSON.stringify([
      err.type || '',
      err.path || '',
      err.status || '',
      err.url || '',
      String(err.message || '').slice(0, 200)
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(err);
  }

  return out;
}

function printSummary({ testedCount, errors }) {
  // eslint-disable-next-line no-console
  console.log(`ROUTES_TESTED ${testedCount}`);
  // eslint-disable-next-line no-console
  console.log(`ERRORS_FOUND ${errors.length}`);
  for (const err of errors) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(err));
  }
}

async function login() {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || !payload?.token) {
    throw new Error(`Login failed (${response.status}): ${payload?.message || 'unknown error'}`);
  }

  return payload.token;
}

async function run() {
  const token = await login();
  const paths = uniquePaths();
  const errors = [];
  let currentPath = '';

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(20000);

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', path: currentPath, message: err.message });
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('/api/')) return;
    const message = request.failure()?.errorText || 'requestfailed';
    if (message.includes('ERR_ABORTED')) return;
    errors.push({ type: 'requestfailed', path: currentPath, url, message });
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/') || response.status() < 400) return;

    let message = '';
    try {
      const payload = await response.json();
      message = payload?.message || '';
    } catch {
      message = '';
    }

    errors.push({
      type: 'apierror',
      path: currentPath,
      status: response.status(),
      url,
      message
    });
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => localStorage.setItem('farmreact:token', value), token);

  for (const path of paths) {
    currentPath = path;
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(WAIT_MS);
    } catch (err) {
      errors.push({
        type: 'navigation',
        path,
        message: err?.message || 'navigation failed'
      });
    }
  }

  await browser.close();

  const dedupedErrors = dedupeErrors(errors);
  printSummary({
    testedCount: paths.length,
    errors: dedupedErrors
  });

  if (dedupedErrors.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`PARITY_SMOKE_FAILED ${err?.message || err}`);
  process.exit(1);
});

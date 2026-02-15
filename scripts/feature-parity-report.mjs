import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const mainSystemRoot = path.resolve(appRoot, '..');

const mainRoutesFile = path.resolve(mainSystemRoot, 'config/routes.php');
const outputFile = path.resolve(appRoot, 'FEATURE_PARITY.md');
const legacyConfigFile = path.resolve(appRoot, 'client/src/config/legacyRoutes.js');

const legacyModule = await import(pathToFileURL(legacyConfigFile).href);

const legacyModuleRoutes = legacyModule.LEGACY_MODULE_ROUTES || [];
const legacySettingsRoutes = legacyModule.LEGACY_SETTINGS_ROUTES || [];

const mainRoutesSource = fs.readFileSync(mainRoutesFile, 'utf8');

const getRoutes = [...mainRoutesSource.matchAll(/\['GET',\s*'([^']+)'\]/g)]
  .map((match) => match[1])
  .filter((route) => !route.startsWith('/api/'));

const postRoutes = [...mainRoutesSource.matchAll(/\['POST',\s*'([^']+)'\]/g)]
  .map((match) => match[1])
  .filter((route) => !route.startsWith('/api/'));

const coveredSet = new Set([
  '/login',
  '/logout',
  '/dashboard',
  '/profile',
  '/modules/:moduleKey',
  '/modules/:moduleKey/:viewKey',
  ...legacyModuleRoutes.map((item) => `/${String(item.path || '').replace(/^\/+/, '')}`),
  ...legacySettingsRoutes.map((item) => `/${String(item.path || '').replace(/^\/+/, '')}`)
]);

const analyzed = getRoutes.map((route) => ({
  route,
  covered: coveredSet.has(route)
}));

const uncovered = analyzed.filter((item) => !item.covered).map((item) => item.route);
const coveredCount = analyzed.length - uncovered.length;
const coveragePct = analyzed.length ? ((coveredCount / analyzed.length) * 100).toFixed(1) : '0.0';

const lines = [];
lines.push('# React Rebuild Feature Parity Report');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Main system GET routes (non-API): **${analyzed.length}**`);
lines.push(`- Covered by React routes: **${coveredCount}**`);
lines.push(`- Not yet covered: **${uncovered.length}**`);
lines.push(`- Route parity: **${coveragePct}%**`);
lines.push(`- Main system POST routes (non-API): **${postRoutes.length}**`);
lines.push('- Data mutation parity strategy: React uses generic module CRUD API + offline outbox sync.');
lines.push('');

if (uncovered.length) {
  lines.push('## Uncovered GET Routes');
  lines.push('');
  for (const route of uncovered) {
    lines.push(`- \`${route}\``);
  }
  lines.push('');
} else {
  lines.push('## Uncovered GET Routes');
  lines.push('');
  lines.push('None.');
  lines.push('');
}

lines.push('## Coverage Matrix');
lines.push('');
lines.push('| Route | Covered |');
lines.push('| --- | --- |');
for (const item of analyzed) {
  lines.push(`| \`${item.route}\` | ${item.covered ? 'Yes' : 'No'} |`);
}
lines.push('');

fs.writeFileSync(outputFile, `${lines.join('\n')}\n`);
console.log(`Wrote parity report: ${outputFile}`);

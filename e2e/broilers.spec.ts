import { test, expect } from '@playwright/test';

const CANDIDATE_BASES = [process.env.TEST_BASE_URL, 'http://localhost:5174', 'http://localhost'];

async function findBase(request) {
  for (const base of CANDIDATE_BASES) {
    if (!base) continue;
    try {
      const res = await request.get(`${base.replace(/\/$/, '')}/api/modules/BROILERS`);
      if (res && res.ok()) return base.replace(/\/$/, '');
    } catch (e) {
      // continue trying
    }
  }
  throw new Error('Unable to find a running app at any candidate base URL. Set TEST_BASE_URL to override.');
}

test('api: /api/modules/BROILERS includes harvest/vaccination totals', async ({ request }) => {
  const base = await findBase(request);
  const res = await request.get(`${base}/api/modules/BROILERS`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  // The payload shape may vary; normalized access
  const totals = body?.payload?.totals || body?.totals || (body?.payload && body.payload.totals) || null;
  expect(totals).not.toBeNull();

  // Required fields
  const required = ['harvest_due_7d', 'harvest_overdue', 'vaccination_due', 'vaccination_overdue'];
  for (const key of required) {
    expect(Object.prototype.hasOwnProperty.call(totals, key)).toBeTruthy();
    const val = Number(totals[key]);
    expect(Number.isFinite(val)).toBeTruthy();
    expect(val).toBeGreaterThanOrEqual(0);
  }
});

test('ui: broilers overview renders Broiler Command Center and KPI pills', async ({ page, request }) => {
  const base = await findBase(request);
  await page.goto(`${base}/broilers`);

  await expect(page.getByText('Broiler Command Center')).toBeVisible();

  const pillFor = async (label) => {
    const container = page.locator('.broiler-stage-pill', { hasText: label });
    await expect(container).toBeVisible();
    const valueText = await container.locator('.value').innerText();
    return valueText.trim();
  };

  const activeBatches = await pillFor('Active Batches');
  expect(Number.parseInt(activeBatches.replace(/[^0-9-]/g, ''), 10)).not.toBeNaN();

  const urgent = await pillFor('Urgent Signals');
  expect(Number.parseInt(urgent.replace(/[^0-9-]/g, ''), 10)).not.toBeNaN();

  const dueSoon = await pillFor('Due Soon');
  expect(Number.parseInt(dueSoon.replace(/[^0-9-]/g, ''), 10)).not.toBeNaN();
});

test('ui: broilers overview renders batch cards (pixel parity)', async ({ page, request }) => {
  const base = await findBase(request);
  await page.goto(`${base}/broilers`);

  // Ensure batch card grid is visible and contains at least one card
  const grid = page.locator('.broiler-batch-grid');
  await expect(grid).toBeVisible();
  const cardCount = await grid.locator('.broiler-batch-card').count();
  expect(cardCount).toBeGreaterThan(0);

  // Basic content checks
  const first = grid.locator('.broiler-batch-card').first();
  await expect(first.getByText(/Current/i)).toBeVisible();
  await expect(first.locator('.mini-grid .label')).toHaveCount(2);

  // New parity fields: birds, performance score, and P/L
  await expect(first.getByText(/Birds/i)).toBeVisible();
  await expect(first.getByText(/Performance Score/i)).toBeVisible();
  await expect(first.getByText(/P\/L|Profit|Loss/i)).toBeVisible();

  // Visual snapshot to lock layout (first-run will record baseline)
  await expect(grid).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });
});

test('ui: broiler batch cards — mobile layout snapshot', async ({ page, request }) => {
  const base = await findBase(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/broilers`);
  const grid = page.locator('.broiler-batch-grid');
  await expect(grid).toBeVisible();
  await expect(grid).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });
});

test('ui: broiler batch card — hover state snapshot', async ({ page, request }) => {
  const base = await findBase(request);
  await page.goto(`${base}/broilers`);
  const first = page.locator('.broiler-batch-card').first();
  await expect(first).toBeVisible();
  await first.hover();
  // small delay to allow hover transition
  await page.waitForTimeout(150);
  await expect(first).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });
});

// Batch Center should also render the same card grid (parity with legacy PHP)
test('ui: batch center shows broiler cards', async ({ page, request }) => {
  const base = await findBase(request);
  await page.goto(`${base}/broilers/add-batch`);
  const grid = page.locator('.broiler-batch-grid');
  await expect(grid).toBeVisible();
  const count = await grid.locator('.broiler-batch-card').count();
  expect(count).toBeGreaterThanOrEqual(1);
});
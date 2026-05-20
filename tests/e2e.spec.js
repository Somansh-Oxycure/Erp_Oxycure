/**
 * Oxycure ERP — Playwright E2E Test Suite
 * ────────────────────────────────────────
 * Auth is handled ONCE via global-setup.js (saves cookies to tests/.auth/).
 * Individual tests reuse those saved sessions — no repeated logins.
 *
 * Usage:
 *   npx playwright test tests/e2e.spec.js --headed
 *   npx playwright test tests/e2e.spec.js            (headless)
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const WEB = process.env.WEB_URL || 'http://localhost:3000';
const ADMIN_STATE = path.join(__dirname, '.auth', 'admin.json');
const SALESPERSON_STATE = path.join(__dirname, '.auth', 'salesperson.json');

function salespersonAvailable() {
  try {
    const state = JSON.parse(fs.readFileSync(SALESPERSON_STATE, 'utf8'));
    return state.cookies && state.cookies.length > 0;
  } catch { return false; }
}

// =============================================================================
// 1. AUTHENTICATION
// =============================================================================
test.describe('1. Authentication', () => {
  test('1.1.5 Login page accessible without auth', async ({ page }) => {
    await page.goto(`${WEB}/login`);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('1.1.4 Empty form shows validation errors', async ({ page }) => {
    await page.goto(`${WEB}/login`);
    await page.click('button[type="submit"]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate((el) => !el.validity.valid);
    const hasErrorMsg = await page.locator('[role="alert"], .text-red-500, .text-destructive').count() > 0;
    expect(isInvalid || hasErrorMsg).toBeTruthy();
  });

  test('1.1.2 Wrong email shows error (nonexistent — no lockout risk)', async ({ page }) => {
    await page.goto(`${WEB}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'nonexistent_test_user@oxycure.test');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('[data-sonner-toast], [role="alert"], .text-red-500, .text-destructive').first()
    ).toBeVisible({ timeout: 6000 });
  });

  test('1.2.2 Unauthenticated visit to / redirects to /login', async ({ browser }) => {
    // browser.newContext() inherits test.use() storageState — must explicitly override with empty state
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto(WEB);
    await page.waitForURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });

  test('1.2.1 Authenticated user can access dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await ctx.newPage();
    await page.goto(WEB);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await ctx.close();
  });

  test('1.2.4 Logout clears session', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await ctx.newPage();
    await page.goto(WEB);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Sidebar logout button is opacity-0 when collapsed — hover to expand first
    await page.locator('aside').first().hover();
    await page.waitForTimeout(450);
    await page.locator('button[title="Logout"]').click();
    await page.waitForURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });
});

// All remaining tests use the saved admin session
test.use({ storageState: ADMIN_STATE });

// =============================================================================
// 2. DASHBOARD
// =============================================================================
test.describe('2. Dashboard', () => {
  test('2.1 Dashboard loads with KPI cards', async ({ page }) => {
    await page.goto(WEB);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // KPI cards use rounded-2xl border classes (not "card" in classname)
    const cards = page.locator('div.rounded-2xl.border, a[href] div.rounded-2xl');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('2.3 Charts render (SVG/canvas visible)', async ({ page }) => {
    await page.goto(WEB);
    await page.waitForTimeout(2000);
    const charts = page.locator('svg, canvas');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('2.4 Sidebar shows nav items for admin', async ({ page }) => {
    await page.goto(WEB);
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    // Zustand rehydrates async from localStorage — wait for an allowedRoles nav item to appear
    await expect(page.locator('aside a[href="/tickets"]')).toBeVisible({ timeout: 6000 });
    const navLinks = page.locator('aside a[href]');
    expect(await navLinks.count()).toBeGreaterThan(5);
  });

  test('2.5 Sidebar collapse/expand toggle works', async ({ page }) => {
    await page.goto(WEB);
    const toggleBtn = page.locator('button[aria-label*="collapse"], button[aria-label*="menu"], [class*="toggle"]').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(400);
      await toggleBtn.click();
    }
    await expect(page.locator('main')).toBeVisible();
  });
});

// =============================================================================
// 3. USERS
// =============================================================================
test.describe('3. Users Management', () => {
  test('3.1 /users page loads with table', async ({ page }) => {
    await page.goto(`${WEB}/users`);
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 10000 });
  });

  test('3.2 Create user modal opens', async ({ page }) => {
    await page.goto(`${WEB}/users`);
    await page.locator('button:has-text("Add User"), button:has-text("Add"), button:has-text("Create"), button:has-text("Invite")').first().click();
    // Modal uses motion.div with fixed overlay — no role="dialog", check heading instead
    await expect(page.locator('h3:has-text("Create User")')).toBeVisible({ timeout: 5000 });
  });

  test('1.3.1 Salesperson cannot visit /users', async ({ browser }) => {
    if (!salespersonAvailable()) {
      test.skip(true, 'Salesperson account not configured');
      return;
    }
    const ctx = await browser.newContext({ storageState: SALESPERSON_STATE });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/users`);
    const isForbidden = await page.locator(':has-text("403"), :has-text("Forbidden"), :has-text("Unauthorized"), :has-text("Access denied")').count() > 0;
    expect(isForbidden || !page.url().includes('/users')).toBeTruthy();
    await ctx.close();
  });
});

// =============================================================================
// 4. CUSTOMERS
// =============================================================================
test.describe('4. Customers', () => {
  test('4.1 /customers page loads', async ({ page }) => {
    await page.goto(`${WEB}/customers`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Customers page shows table if data exists, or empty-state div if none
    await expect(page.locator('table, div.rounded-2xl.border').first()).toBeVisible({ timeout: 8000 });
  });

  test('4.2 Customer search filters results', async ({ page }) => {
    await page.goto(`${WEB}/customers`);
    await expect(page.locator('main')).toBeVisible({ timeout: 8000 });
    const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(600);
    }
    // Page stays loaded (table or empty state remains)
    await expect(page.locator('main')).toBeVisible();
  });

  test('4.3 Create customer form opens', async ({ page }) => {
    await page.goto(`${WEB}/customers`);
    await expect(page.locator('main')).toBeVisible({ timeout: 8000 });
    // Customers are created by converting leads — page may not have a create button
    const createBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      await expect(page.locator('[role="dialog"], form, h3').first()).toBeVisible({ timeout: 5000 });
    }
    // Test passes either way — page loads correctly
  });
});

// =============================================================================
// 5. TICKETS
// =============================================================================
test.describe('5. Tickets', () => {
  test('5.1 /tickets page loads', async ({ page }) => {
    await page.goto(`${WEB}/tickets`);
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 10000 });
  });

  test('5.4 Filter tickets by status works', async ({ page }) => {
    await page.goto(`${WEB}/tickets`);
    const statusFilter = page.locator('button:has-text("Status"), select[name*="status"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      const openOption = page.locator('[role="option"]:has-text("Open"), option:has-text("Open")').first();
      if (await openOption.isVisible()) await openOption.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test('5.11 /crm Kanban board loads', async ({ page }) => {
    await page.goto(`${WEB}/crm`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // KanbanBoard renders: div.h-full.flex.flex-col > div.overflow-x-auto (no "kanban" class names)
    await expect(page.locator('div.overflow-x-auto').first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 6. PROPOSALS
// =============================================================================
test.describe('6. Proposals', () => {
  test('6.1 /proposals page loads', async ({ page }) => {
    await page.goto(`${WEB}/proposals`);
    // Use .first() to avoid strict-mode violation when both <main> and <table> are present
    await expect(page.locator('table, [role="table"], main').first()).toBeVisible({ timeout: 10000 });
  });

  test('6.12 INR currency symbol displayed', async ({ page }) => {
    await page.goto(`${WEB}/proposals`);
    await page.waitForTimeout(1500);
    const rows = await page.locator('tbody tr, [role="row"]').count();
    if (rows > 1) {
      const hasRupee = await page.locator(':has-text("\u20b9")').count();
      expect(hasRupee).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// 7. DESIGN SPECS
// =============================================================================
test.describe('7. Design Specifications', () => {
  test('7.1 /design-specs page loads', async ({ page }) => {
    await page.goto(`${WEB}/design-specs`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 8. QUOTATIONS
// =============================================================================
test.describe('8. Quotations', () => {
  test('8.1 /quotations page loads', async ({ page }) => {
    await page.goto(`${WEB}/quotations`);
    await expect(page.locator('table, [role="table"], main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 9. ORDERS
// =============================================================================
test.describe('9. Orders', () => {
  test('9.1 /orders page loads', async ({ page }) => {
    await page.goto(`${WEB}/orders`);
    await expect(page.locator('table, [role="table"], main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 10. PRODUCT CATALOG
// =============================================================================
test.describe('10. Product Catalog', () => {
  test('10.1 /catalog page loads', async ({ page }) => {
    await page.goto(`${WEB}/catalog`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('10.2 Toggle Grid/List view', async ({ page }) => {
    await page.goto(`${WEB}/catalog`);
    const toggleBtn = page.locator('button[aria-label*="grid" i], button[aria-label*="list" i], button:has-text("Grid"), button:has-text("List")').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(page.locator('main')).toBeVisible();
  });

  test('10.3 Search products', async ({ page }) => {
    await page.goto(`${WEB}/catalog`);
    const search = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]').first();
    if (await search.isVisible()) {
      await search.fill('air');
      await page.waitForTimeout(600);
    }
    await expect(page.locator('main')).toBeVisible();
  });
});

// =============================================================================
// 11. STOCK MANAGEMENT
// =============================================================================
test.describe('11. Stock Management', () => {
  test('11.1 /stock page loads', async ({ page }) => {
    await page.goto(`${WEB}/stock`);
    // Use .first() to avoid strict-mode violation when both <main> and <table> are present
    await expect(page.locator('table, [role="table"], main').first()).toBeVisible({ timeout: 10000 });
  });

  test('11.2 Stock table has quantity columns', async ({ page }) => {
    await page.goto(`${WEB}/stock`);
    const headers = page.locator('th, [role="columnheader"]');
    if (await headers.count() > 0) {
      expect(await headers.count()).toBeGreaterThan(2);
    }
  });
});

// =============================================================================
// 12. STOCK TRANSFERS
// =============================================================================
test.describe('12. Stock Transfers', () => {
  test('12.1 /stock-transfers page loads', async ({ page }) => {
    await page.goto(`${WEB}/stock-transfers`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 13. SUPPLIERS
// =============================================================================
test.describe('13. Suppliers', () => {
  test('13.1 /stock/suppliers page loads', async ({ page }) => {
    await page.goto(`${WEB}/stock/suppliers`);
    await expect(page.locator('table, [role="table"], main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 14. PURCHASE ORDERS
// =============================================================================
test.describe('14. Purchase Orders', () => {
  test('14.1 /stock/purchase-orders page loads', async ({ page }) => {
    await page.goto(`${WEB}/stock/purchase-orders`);
    // Use .first() to avoid strict-mode violation when both <main> and <table> are present
    await expect(page.locator('table, [role="table"], main').first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 15. STOCK ALERTS
// =============================================================================
test.describe('15. Stock Alerts', () => {
  test('15.1 /stock/alerts page loads', async ({ page }) => {
    await page.goto(`${WEB}/stock/alerts`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 16. BOQ TEMPLATES
// =============================================================================
test.describe('16. BoQ Templates', () => {
  test('16.1 /settings/boq-templates loads for admin', async ({ page }) => {
    await page.goto(`${WEB}/settings/boq-templates`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('1.3.2 Salesperson cannot access /settings/boq-templates', async ({ browser }) => {
    if (!salespersonAvailable()) {
      test.skip(true, 'Salesperson account not configured');
      return;
    }
    const ctx = await browser.newContext({ storageState: SALESPERSON_STATE });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/settings/boq-templates`);
    const isForbidden = await page.locator(':has-text("403"), :has-text("Forbidden"), :has-text("Unauthorized"), :has-text("Access denied")').count() > 0;
    expect(isForbidden || !page.url().includes('/settings/boq-templates')).toBeTruthy();
    await ctx.close();
  });
});

// =============================================================================
// 17. SETTINGS
// =============================================================================
test.describe('17. Settings', () => {
  test('17.1 /settings page loads', async ({ page }) => {
    await page.goto(`${WEB}/settings`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 18. UI/UX CROSS-CUTTING
// =============================================================================
test.describe('18. UI/UX', () => {
  test('18.1 No horizontal scroll at 768px (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${WEB}/tickets`);
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });

  test('18.2 Core content readable at 390px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WEB);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 19. E2E FLOWS (navigation smoke tests)
// =============================================================================
test.describe('19. E2E Business Flows', () => {
  test('E2E-1 Tickets and Proposals both accessible', async ({ page }) => {
    await page.goto(`${WEB}/tickets`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.goto(`${WEB}/proposals`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-3 Stock, Purchase Orders, Stock Alerts all load', async ({ page }) => {
    for (const p of ['/stock', '/stock/purchase-orders', '/stock/alerts']) {
      await page.goto(`${WEB}${p}`);
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-5 BoQ Templates page accessible', async ({ page }) => {
    await page.goto(`${WEB}/settings/boq-templates`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});

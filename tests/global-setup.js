/**
 * Playwright Global Setup
 * ──────────────────────────────────────────────────────────────────────────
 * Strategy:
 *   1. Call the NestJS login API directly (no browser form → no lockout risk).
 *   2. The API sets httpOnly cookies (access_token, refresh_token) on the
 *      response.  We inject those cookies manually into a browser context.
 *   3. Seed the Zustand auth-store in localStorage so DashboardLayout sees
 *      isAuthenticated=true and skips the extra fetchMe() on page mount
 *      (which would consume/rotate the refresh token inside every test).
 *   4. Navigate to a real dashboard page and wait for it to settle.
 *   5. Save the resulting storageState — it now has fresh cookies AND the
 *      correct localStorage state, so individual tests can restore it without
 *      triggering an unnecessary token refresh.
 *
 * Why this matters:
 *   The API uses single-use rotating refresh tokens.  If every Playwright
 *   context calls fetchMe() → 401 → refresh on page mount, each test burns
 *   the refresh token that the next test was about to reuse (they all start
 *   from the same stored state).  Seeding isAuthenticated=true breaks that
 *   cycle — pages load immediately and only perform authenticated API calls
 *   for the data they actually need, not an auth probe.
 */

const { chromium, request } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const API  = process.env.API_URL  || 'http://localhost:3001';
const WEB  = process.env.WEB_URL  || 'http://localhost:3000';

const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@oxycure.com';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'Admin@2026';
const SALESPERSON_EMAIL    = process.env.SALESPERSON_EMAIL    || 'sales@oxycure.com';
const SALESPERSON_PASSWORD = process.env.SALESPERSON_PASSWORD || 'sales123';

const STORAGE_DIR = path.join(__dirname, '.auth');

/** Parse a single Set-Cookie header string into a Playwright cookie object. */
function parseSetCookie(header) {
  const parts = header.split(';').map((p) => p.trim());
  const [nameVal, ...attrs] = parts;
  const eqIdx = nameVal.indexOf('=');
  const name  = nameVal.slice(0, eqIdx).trim();
  const value = nameVal.slice(eqIdx + 1).trim();

  const obj = { name, value, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' };

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly')  { obj.httpOnly = true; continue; }
    if (lower === 'secure')    { obj.secure   = true; continue; }
    if (lower.startsWith('samesite=')) { obj.sameSite = attr.split('=')[1].trim(); continue; }
    if (lower.startsWith('path='))     { obj.path     = attr.split('=')[1].trim(); continue; }
    if (lower.startsWith('domain='))   { obj.domain   = attr.split('=')[1].trim().replace(/^\./, ''); continue; }
    if (lower.startsWith('max-age='))  {
      const seconds = parseInt(attr.split('=')[1]);
      if (!isNaN(seconds)) obj.expires = Math.floor(Date.now() / 1000) + seconds;
      continue;
    }
    if (lower.startsWith('expires=')) {
      const ts = Date.parse(attr.split('=')[1]);
      if (!isNaN(ts)) obj.expires = Math.floor(ts / 1000);
      continue;
    }
  }

  return obj;
}

/**
 * Log in via the NestJS API, then build a browser storageState that:
 *   - has the httpOnly cookies set by the API
 *   - has Zustand's persisted state set so isAuthenticated=true
 */
async function buildSession(email, password, filePath) {
  // ── 1. API login ──────────────────────────────────────────────────────────
  const apiCtx = await request.newContext({ baseURL: API });
  // Use postData + explicit JSON.stringify to avoid Playwright serialisation
  // quirks when Content-Type is set manually alongside the data option.
  const loginRes = await apiCtx.post('/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login failed for ${email}: ${loginRes.status()} ${body}`);
  }

  const body = await loginRes.json();
  const userData = body?.data?.user;

  // Collect Set-Cookie headers
  const rawHeaders = loginRes.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
  const cookies = rawHeaders.map((h) => parseSetCookie(h.value));

  await apiCtx.dispose();

  if (cookies.length === 0) {
    throw new Error(`No Set-Cookie headers returned for ${email}. Check CORS/cookie config.`);
  }

  // ── 2. Build browser context with injected cookies ────────────────────────
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Inject cookies for the API origin (localhost:3001) and Web origin (localhost:3000).
  // Since domain is 'localhost' (no port in cookie domain), both origins receive them.
  await context.addCookies(cookies);

  // ── 3. Seed Zustand localStorage so DashboardLayout skips fetchMe() ───────
  const zustandState = JSON.stringify({
    state: {
      user: userData || { email },
      isAuthenticated: true,
      isLoading: false,
    },
    version: 0,
  });

  // Navigate to web root first so we can access localStorage for that origin
  const page = await context.newPage();
  await page.goto(`${WEB}/login`);  // lightweight page, no auth redirect
  await page.evaluate((val) => {
    localStorage.setItem('oxycure-auth', val);
  }, zustandState);

  // ── 4. Navigate to dashboard and wait for the page to settle ─────────────
  await page.goto(`${WEB}/tickets`, { waitUntil: 'networkidle', timeout: 30000 });

  // Must be on a dashboard URL (not redirected back to /login)
  const finalUrl = page.url();
  if (finalUrl.includes('/login')) {
    throw new Error(`Session not valid after seeding — still on login page (${finalUrl})`);
  }

  // ── 5. Save storageState (fresh cookies + seeded localStorage) ───────────
  await context.storageState({ path: filePath });
  await context.close();
  await browser.close();

  console.log(`  ✅ Saved session for ${email} → ${filePath}`);
}

module.exports = async function globalSetup() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

  // Admin session (required)
  await buildSession(ADMIN_EMAIL, ADMIN_PASSWORD, path.join(STORAGE_DIR, 'admin.json'));

  // Salesperson session (optional)
  try {
    await buildSession(SALESPERSON_EMAIL, SALESPERSON_PASSWORD, path.join(STORAGE_DIR, 'salesperson.json'));
  } catch (err) {
    console.log(`  ⏭️  Salesperson login skipped: ${err.message}`);
    fs.writeFileSync(path.join(STORAGE_DIR, 'salesperson.json'), JSON.stringify({ cookies: [], origins: [] }));
  }
};

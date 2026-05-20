// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  globalSetup: './tests/global-setup.js', // logs in once, saves cookies to tests/.auth/
  timeout: 30000,
  retries: 0,
  workers: 1, // Run tests sequentially (state depends on login)
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

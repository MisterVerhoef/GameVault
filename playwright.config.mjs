import { defineConfig } from "@playwright/test";

// Playwright smoke test configuration.
// The app is built and started via the webServer below; no separate
// dev-server step is needed. Runs against the checked-in catalogue in
// public/catalog/, so no IGDB credentials are required.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      IGDB_MOCK: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});

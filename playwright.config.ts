import { defineConfig, devices } from "@playwright/test";
const basePath = process.env.FYLOGIA_BASE_PATH || "/";
const pagesRuntime = process.env.FYLOGIA_PAGES_RUNTIME !== "0";
const origin = pagesRuntime ? "http://127.0.0.1:8788" : "http://127.0.0.1:4173";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.FYLOGIA_TEST_URL || origin + basePath,
    trace: "retain-on-failure",
    // Keep existing list-specific regressions exercising the supported List
    // presentation. news-feed.spec.ts overrides this to test the new default.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(process.env.FYLOGIA_TEST_URL || origin).origin,
          localStorage: [{ name: "fylogia.news.view", value: "list" }],
        },
      ],
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" },
    },
    {
      name: "ipad-webkit",
      use: { ...devices["iPad Pro 11"], defaultBrowserType: "webkit" },
    },
  ],
  webServer: process.env.FYLOGIA_TEST_URL
    ? undefined
    : {
        command: pagesRuntime
          ? "node scripts/test-pages-runtime.mjs"
          : "npm run preview -- --host 127.0.0.1",
        url: origin + basePath,
        reuseExistingServer: !process.env.CI,
      },
});

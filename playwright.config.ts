import { defineConfig, devices } from "@playwright/test";
const basePath = process.env.FYLLORA_BASE_PATH || "/Folio/";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.FYLLORA_TEST_URL || "http://127.0.0.1:4173" + basePath,
    trace: "retain-on-failure",
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
  webServer: process.env.FYLLORA_TEST_URL
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1",
        url: "http://127.0.0.1:4173" + basePath,
        reuseExistingServer: !process.env.CI,
      },
});

import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "ui.spec.js",
  workers: 1,
  timeout: 30000,
  use: {
    headless: true,
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    },
    screenshot: "only-on-failure",
  },
  reporter: [["list"]],
  outputDir: "test-results",
});

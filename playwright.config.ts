import { defineConfig } from "@playwright/test";

// E2E for Pineapple AI. Local: builds must exist in dist/ (run `npm run build` first;
// the webServer below serves them). Live: E2E_BASE_URL=https://pineapple-ai.pages.dev.
// Local Chromium without download: PLAYWRIGHT_CHROME_PATH=/path/to/chrome.
export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4321",
    ...(process.env.PLAYWRIGHT_CHROME_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } }
      : {}),
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Plain static server for dist/ (astro preview daemonizes and exits,
        // which Playwright reads as a crash). Build first: `npm run build`.
        command: "python3 -m http.server 4321 --directory dist",
        url: "http://127.0.0.1:4321",
        reuseExistingServer: true,
        timeout: 60000,
      },
});

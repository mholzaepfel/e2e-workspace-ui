import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for OneCX E2E tests
 *
 * Environment Variables:
 * - BASE_URL: Target URL (for example: http://onecx.localhost/onecx-shell/admin/workspace)
 * - ONECX_USER: Keycloak test username (default: onecx)
 * - ONECX_PASSWORD: Keycloak test password (default: onecx)
 * - LOCALE: Browser locale for tests (default: en-US)
 * - UI_LANGUAGE: Accept-Language header value (default: en-US,en;q=0.9)
 * - CI: Set to 'true' in CI pipelines (enables 2 retries)
 * - OUTPUT_DIR: Test output directory (default: ./artifacts/runs/<runId>/e2e-results or /e2e-results)
 * - EXPECT_TIMEOUT: Assertion timeout in ms (default: 10000)
 * - TEST_TIMEOUT: Per-test timeout in ms (default: 30000)
 */

const baseURL =
  process.env.BASE_URL || "http://onecx.localhost/onecx-shell/admin/workspace";
const artifactsRoot = process.env.artifacts_ROOT || "./artifacts";
const runId = process.env.RUN_ID || "local";
const defaultOutputDir = `${artifactsRoot}/runs/${runId}/e2e-results`;
const outputDir = process.env.OUTPUT_DIR || defaultOutputDir;

// Auth storage state path (use /tmp in container, outputDir locally)
const authStoragePath = `${outputDir}/.auth/user.json`;

// Trace, Video, Screenshot modes (configurable via env)
const traceMode = (process.env.TRACE_MODE || "on-first-retry") as
  | "on"
  | "off"
  | "on-first-retry";
const screenshotMode = (process.env.SCREENSHOT_MODE || "only-on-failure") as
  | "on"
  | "off"
  | "only-on-failure";

// Timeouts (configurable via env)
const expectTimeout = parseInt(process.env.EXPECT_TIMEOUT || "10000", 10);
const testTimeout = parseInt(process.env.TEST_TIMEOUT || "30000", 10);
const navigationTimeout = parseInt(
  process.env.NAVIGATION_TIMEOUT || "15000",
  10,
);
const actionTimeout = parseInt(process.env.ACTION_TIMEOUT || "10000", 10);
const browserLocale = process.env.LOCALE || "en-US";
const uiLanguage = process.env.UI_LANGUAGE || "en-US,en;q=0.9";

export default defineConfig({
  // Test directory
  testDir: "./tests",

  // Authentication setup project
  globalSetup: undefined,

  // Disable full parallel mode for stable E2E behavior
  fullyParallel: false,
  workers: 1,

  // Retries
  retries: process.env.CI ? 2 : 0,

  // Reporters
  reporter: [
    ["html", { outputFolder: `${outputDir}/playwright-report`, open: "never" }],
    ["json", { outputFile: `${outputDir}/test-results.json` }],
    ["list"],
  ],

  // Global timeouts
  timeout: testTimeout,
  expect: {
    timeout: expectTimeout,
  },

  // Output directory for traces/screenshots
  outputDir: `${outputDir}/test-artifacts`,

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL,

    // Tracing mode
    trace: traceMode,

    // Screenshot mode
    screenshot: screenshotMode,

    // HAR is already included in Playwright trace artifacts

    // Viewport
    viewport: { width: 1920, height: 1080 },

    // Navigation timeout
    navigationTimeout,

    // Action timeout
    actionTimeout,

    // Ignore HTTPS errors (useful for local environments)
    ignoreHTTPSErrors: true,

    // Locale for tests
    locale: browserLocale,

    // Helps the app pick the expected translation by default
    extraHTTPHeaders: {
      "Accept-Language": uiLanguage,
    },

    // Timezone
    timezoneId: "Europe/Berlin",
  },

  // Projects / browser
  projects: [
    // Setup project for authentication
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // Main Chromium project
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Reuse authentication state from setup project
        storageState: authStoragePath,
      },
      dependencies: ["setup"],
    },
  ],

  // No web server startup (target is provided externally)
  webServer: undefined,
});

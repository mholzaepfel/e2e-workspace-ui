import { test, expect } from "@playwright/test";
import * as fs from "fs";
import { WorkspaceSearchHarness } from "../harnesses";

/**
 * E2E tests for workspace management
 *
 * These tests validate the workspace management page:
 * - Page layout and header
 * - Breadcrumb navigation
 * - Workspace search and list
 * - Pagination
 */

const artifactsRoot = process.env.artifacts_ROOT || "./artifacts";
const runId = process.env.RUN_ID || "local";
const outputDir =
  process.env.OUTPUT_DIR || `${artifactsRoot}/runs/${runId}/e2e-results`;

fs.mkdirSync(`${outputDir}/screenshots`, { recursive: true });

test.describe("Workspace Management", () => {
  let loggerName = "[Workspace Management]";
  let workspaceHarness: WorkspaceSearchHarness;

  test.beforeEach(async ({ page, baseURL }) => {
    workspaceHarness = new WorkspaceSearchHarness(page, loggerName);

    // Navigate using baseURL from playwright.config.ts
    if (!baseURL) {
      throw new Error("baseURL is not configured in Playwright config.");
    }
    await workspaceHarness.navigateToWorkspace(baseURL);

    // Wait for domcontentloaded
    await workspaceHarness.waitForDomReady();

    // If we were redirected to Keycloak, authentication failed
    if (workspaceHarness.isRedirectedToKeycloak()) {
      throw new Error(
        `Authentication failed - redirected to Keycloak: ${workspaceHarness.getCurrentUrl()}`,
      );
    }

    // Wait for page to be ready
    await workspaceHarness.waitForPage();
  });

  test.describe("Page Header", () => {
    test("should display the expected page title", async () => {
      const title = await workspaceHarness.getPageTitle();
      expect(title).toBe("Workspace Management");
    });

    test("should display the expected page subtitle", async () => {
      const subtitle = await workspaceHarness.getPageSubtitle();
      expect(
        /^Creation and editing of Workspaces$/i.test(subtitle),
      ).toBeTruthy();
    });

    test("should show the page header", async () => {
      const isVisible = await workspaceHarness.isHeaderVisible();
      expect(isVisible).toBe(true);
    });

    test("should have action buttons in the toolbar", async () => {
      const buttonCount = await workspaceHarness.getActionButtonCount();
      expect(buttonCount > 0).toBeTruthy();
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("should display breadcrumb", async () => {
      const isVisible = await workspaceHarness.breadcrumb.isVisible();
      expect(isVisible).toBe(true);
    });

    test("should contain a home link in breadcrumb", async () => {
      const isVisible = await workspaceHarness.breadcrumbHome.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Workspace List", () => {
    test("should display DataView", async () => {
      const isVisible = await workspaceHarness.isDataViewVisible();
      expect(isVisible).toBe(true);
    });

    test("should display at least one workspace", async () => {
      await workspaceHarness.waitForSearchResults();
      const count = await workspaceHarness.getWorkspaceCardCount();
      expect(count >= 1).toBeTruthy();
    });

    test("should display workspace names", async () => {
      await workspaceHarness.waitForSearchResults();
      const names = await workspaceHarness.getWorkspaceNames();
      expect(names.length > 0).toBeTruthy();
      console.log("Found workspaces:", names);
    });
  });

  test.describe("Pagination", () => {
    test("should display paginator", async () => {
      const isVisible = await workspaceHarness.isPaginatorVisible();
      expect(isVisible).toBe(true);
    });

    test("should display paginator info", async () => {
      const info = await workspaceHarness.getPaginatorInfo();
      expect(/\d+\s*-\s*\d+\s*(von|of)\s*\d+/i.test(info)).toBeTruthy();
    });
  });

  test.describe("Screenshots and Documentation", () => {
    test("should create a screenshot of the workspace page", async () => {
      // Wait for page load
      await workspaceHarness.waitForPageFullyLoaded();
      await workspaceHarness.waitForSearchResults();

      // Create screenshot
      await workspaceHarness.captureFullPageScreenshot(
        `${outputDir}/screenshots/workspace-search-page.png`,
      );
    });

    test("should create a screenshot of the header", async () => {
      await workspaceHarness.captureHeaderScreenshot(
        `${outputDir}/screenshots/workspace-header.png`,
      );
    });
  });
});

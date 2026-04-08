import { test as setup } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { KeycloakLoginHarness } from "../harnesses";

/**
 * Authentication setup for OneCX E2E tests.
 *
 * This setup test signs in through Keycloak and stores authentication state
 * (cookies, local/session storage) for dependent test projects.
 *
 * Environment variables:
 * - BASE_URL: target URL
 * - ONECX_USER: username
 * - ONECX_PASSWORD: password
 * - OUTPUT_DIR: output directory for auth state
 */

const artifactsRoot = process.env.artifacts_ROOT || "./artifacts";
const runId = process.env.RUN_ID || "local";
const outputDir =
  process.env.OUTPUT_DIR || `${artifactsRoot}/runs/${runId}/e2e-results`;
const authFile = `${outputDir}/.auth/user.json`;
const authDir = path.dirname(authFile);

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

setup("Keycloak Authentication", async ({ page, baseURL }) => {
  const username = process.env.ONECX_USER || "onecx";
  const password = process.env.ONECX_PASSWORD || "onecx";
  const targetUrl =
    baseURL || "http://onecx.localhost/onecx-shell/admin/workspace";

  const waitForRealmRedirect = async (timeoutMs = 7000): Promise<boolean> => {
    try {
      await page.waitForURL((url) => url.href.includes("/realms/"), {
        timeout: timeoutMs,
      });
      return true;
    } catch {
      return page.url().includes("/realms/");
    }
  };

  console.log("\n[Auth Setup] ========================================");
  console.log("[Auth Setup] Starting Keycloak authentication");
  console.log(`[Auth Setup] URL: ${targetUrl}`);
  console.log(`[Auth Setup] User: ${username}`);
  console.log(`[Auth Setup] Auth storage: ${authFile}`);
  console.log("[Auth Setup] ========================================\n");

  try {
    const keycloakHarness = new KeycloakLoginHarness(page);

    await keycloakHarness.navigateTo(targetUrl);
    const redirectedToRealm = await waitForRealmRedirect();
    const loginPageVisible = await keycloakHarness.isVisible();

    if (
      redirectedToRealm ||
      loginPageVisible ||
      keycloakHarness.isInRealmFlow()
    ) {
      await keycloakHarness.waitForPage();
      console.log("[Auth Setup] Keycloak login page detected");

      const realmName = await keycloakHarness.getRealmName();
      console.log(`[Auth Setup] Realm: ${realmName}`);

      console.log("[Auth Setup] Performing login...");
      await keycloakHarness.login(username, password);

      try {
        await keycloakHarness.waitForRedirectAfterLogin();
        console.log(
          `[Auth Setup] Redirect successful, URL: ${keycloakHarness.getCurrentUrl()}`,
        );
      } catch {
        const userError = await keycloakHarness.getUsernameErrorText();
        const passwordError = await keycloakHarness.getPasswordErrorText();
        throw new Error(
          `Login required but redirect did not happen. Current URL: ${keycloakHarness.getCurrentUrl()} | usernameError: ${userError || "-"} | passwordError: ${passwordError || "-"}`,
        );
      }

      try {
        await keycloakHarness.waitForOAuthProcessing();
        console.log("[Auth Setup] OAuth code processed");
      } catch {
        console.log(
          "[Auth Setup] OAuth code processing timed out (continuing)",
        );
      }

      await keycloakHarness.waitForAppReady();
      console.log(
        `[Auth Setup] Login successful, final URL: ${keycloakHarness.getCurrentUrl()}`,
      );
    } else {
      console.log(
        "[Auth Setup] Keycloak login not required on initial navigation",
      );
      console.log(
        `[Auth Setup] Current URL: ${keycloakHarness.getCurrentUrl()}`,
      );
      await keycloakHarness.waitForAppReady();
    }

    // Hard validation: an authenticated state must not redirect to Keycloak anymore.
    await keycloakHarness.navigateTo(targetUrl);
    const redirectedAfterSetup = await waitForRealmRedirect();
    if (redirectedAfterSetup || keycloakHarness.isInRealmFlow()) {
      throw new Error(
        `Authentication state is invalid - still redirected to Keycloak: ${keycloakHarness.getCurrentUrl()}`,
      );
    }

    await keycloakHarness.waitForAppReady();
    await page.waitForTimeout(1000);

    console.log("[Auth Setup] Saving authentication state...");
    await page.context().storageState({ path: authFile });
    console.log(`[Auth Setup] Auth state saved: ${authFile}`);
    console.log("[Auth Setup] Authentication successful\n");
  } catch (error) {
    console.error(`[Auth Setup] Authentication failed: ${error}`);
    console.error(`[Auth Setup] URL: ${page.url()}`);
    console.error(
      "[Auth Setup] Auth state will still be written for diagnostics\n",
    );

    try {
      await page.context().storageState({ path: authFile });
    } catch (storageError) {
      console.error(`[Auth Setup] Auth state save failed: ${storageError}`);
    }

    throw error;
  }
});

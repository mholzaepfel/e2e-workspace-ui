import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import { KeycloakLoginHarness } from "../harnesses";

/**
 * Authentication Setup für OneCX Tests
 *
 * Loggt sich über Keycloak ein und speichert den Authentication State.
 *
 * Environment Variables:
 * - KEYCLOAK_USER: Benutzername (default: onecx)
 * - KEYCLOAK_PASSWORD: Passwort (default: onecx)
 * - OUTPUT_DIR: Verzeichnis für Auth-State (default: /e2e-results)
 */

const outputDir = process.env.OUTPUT_DIR || "/e2e-results";
const authFile = `${outputDir}/.auth/user.json`;
const diagnosticsFile = `${outputDir}/logs/auth-diagnostics.log`;

fs.mkdirSync(`${outputDir}/.auth`, { recursive: true });
fs.mkdirSync(`${outputDir}/logs`, { recursive: true });

function appendDiagnostic(line: string): void {
  fs.appendFileSync(diagnosticsFile, `${line}\n`);
}

async function captureRuntimeAuthDiagnostics(
  page: Parameters<typeof setup>[1] extends never ? never : any,
  baseUrl: string,
): Promise<void> {
  try {
    const origin = new URL(baseUrl).origin;
    const envUrl = `${origin}/assets/env.json`;
    const envResponse = await page.request.get(envUrl);
    const envBody = await envResponse.text();

    appendDiagnostic(
      `[auth-diag] env.json status=${envResponse.status()} url=${envUrl}`,
    );

    let keycloakUrl = "";
    let keycloakRealm = "onecx";

    try {
      const envJson = JSON.parse(envBody);
      keycloakUrl = String(envJson.KEYCLOAK_URL || "");
      keycloakRealm = String(envJson.KEYCLOAK_REALM || keycloakRealm);
      appendDiagnostic(`[auth-diag] env.json KEYCLOAK_URL=${keycloakUrl}`);
      appendDiagnostic(`[auth-diag] env.json KEYCLOAK_REALM=${keycloakRealm}`);
    } catch {
      appendDiagnostic("[auth-diag] env.json parse failed");
      appendDiagnostic(`[auth-diag] env.json body=${envBody.slice(0, 500)}`);
    }

    if (keycloakUrl) {
      const discoveryUrl = `${keycloakUrl.replace(/\/$/, "")}/realms/${keycloakRealm}/.well-known/openid-configuration`;
      const discoveryResponse = await page.request.get(discoveryUrl);
      const discoveryText = await discoveryResponse.text();
      appendDiagnostic(
        `[auth-diag] discovery status=${discoveryResponse.status()} url=${discoveryUrl}`,
      );

      try {
        const discovery = JSON.parse(discoveryText);
        appendDiagnostic(
          `[auth-diag] discovery issuer=${String(discovery.issuer || "")}`,
        );
        appendDiagnostic(
          `[auth-diag] discovery authorization_endpoint=${String(discovery.authorization_endpoint || "")}`,
        );
        appendDiagnostic(
          `[auth-diag] discovery token_endpoint=${String(discovery.token_endpoint || "")}`,
        );
      } catch {
        appendDiagnostic("[auth-diag] discovery parse failed");
        appendDiagnostic(
          `[auth-diag] discovery body=${discoveryText.slice(0, 500)}`,
        );
      }
    }
  } catch (error) {
    appendDiagnostic(
      `[auth-diag] failed to capture diagnostics: ${String(error)}`,
    );
  }
}

setup("Keycloak Authentication", async ({ page }) => {
  const username = process.env.KEYCLOAK_USER || "onecx";
  const password = process.env.KEYCLOAK_PASSWORD || "onecx";
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    throw new Error("[Auth Setup] BASE_URL is not set");
  }

  // baseURL is defined once in playwright.config.ts from process.env.BASE_URL
  console.log(`[Auth Setup] Navigiere zu: ${baseUrl}`);
  console.log(`[Auth Setup] Benutzer: ${username}`);

  // Navigiere zur Anwendung - wird zu Keycloak weitergeleitet
  await page.goto(baseUrl);
  await page.waitForLoadState("domcontentloaded");
  console.log(`[Auth Setup] Nach goto('/'), aktuelle URL: ${page.url()}`);
  await captureRuntimeAuthDiagnostics(page, baseUrl);

  // Warte auf Keycloak Login-Seite
  const keycloakHarness = new KeycloakLoginHarness(page);

  // Prüfe ob wir auf der Keycloak-Seite sind
  try {
    await keycloakHarness.waitForPage();
    console.log("[Auth Setup] Keycloak Login-Seite geladen");

    // Realm-Name loggen
    const realmName = await keycloakHarness.getRealmName();
    console.log(`[Auth Setup] Realm: ${realmName}`);

    // Login durchführen
    console.log("[Auth Setup] Führe Login durch...");
    await keycloakHarness.login(username, password);

    // Warte auf Weiterleitung zur Anwendung
    // Nach erfolgreichem Login sollte die URL nicht mehr Keycloak enthalten
    await page.waitForURL((url) => !url.href.includes("/realms/"), {
      timeout: 30000,
    });

    console.log(`[Auth Setup] Redirect erfolgt, URL: ${page.url()}`);

    // WICHTIG: Warte bis die App den OAuth-Code verarbeitet hat
    // Die URL enthält noch #code=... - warte bis das Fragment weg ist oder die App geladen ist
    await page.waitForFunction(
      () => {
        // Prüfe ob die App geladen ist (kein code im Hash oder App-Element sichtbar)
        const hash = window.location.hash;
        const hasCode = hash.includes("code=");
        const appLoaded =
          document.querySelector("ocx-shell") ||
          document.querySelector("app-root");
        return !hasCode || appLoaded;
      },
      { timeout: 15000 },
    );

    // Warte auf vollständiges Laden
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Kurze Pause für SPA-Initialisierung

    console.log(`[Auth Setup] Login erfolgreich, finale URL: ${page.url()}`);
  } catch (error) {
    // Falls wir bereits eingeloggt sind (kein Keycloak-Redirect)
    console.log(
      "[Auth Setup] Kein Keycloak-Login erforderlich oder bereits eingeloggt",
    );
    console.log(`[Auth Setup] Error: ${error}`);
  }

  // Warte auf domcontentloaded (networkidle kann bei Polling/WebSockets hängen)
  await page.waitForLoadState("domcontentloaded");

  // Zusätzliche Wartezeit für finale Initialisierung
  await page.waitForTimeout(3000);

  // Speichere den Authentication State
  await page.context().storageState({ path: authFile });
  console.log(`[Auth Setup] Auth-State gespeichert: ${authFile}`);
});

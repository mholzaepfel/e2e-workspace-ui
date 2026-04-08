import { Page, Locator } from "@playwright/test";

/**
 * Harness for the Keycloak login page
 * Based on the Keycloak PF5 login template structure
 */
export class KeycloakLoginHarness {
  readonly page: Page;

  // Header elements
  readonly header: Locator;
  readonly headerWrapper: Locator;

  // Form elements
  readonly loginForm: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly showPasswordButton: Locator;

  // Labels
  readonly usernameLabel: Locator;
  readonly passwordLabel: Locator;

  // Error containers
  readonly usernameErrorContainer: Locator;
  readonly passwordErrorContainer: Locator;

  // Page Title
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.header = page.locator("#kc-header");
    this.headerWrapper = page.locator("#kc-header-wrapper");

    // Form
    this.loginForm = page.locator("#kc-form-login");
    this.usernameInput = page.locator("#username");
    this.passwordInput = page.locator("#password");
    this.signInButton = page.locator("#kc-login");
    this.showPasswordButton = page.locator("[data-password-toggle]");

    // Labels
    this.usernameLabel = page.locator('label[for="username"]');
    this.passwordLabel = page.locator('label[for="password"]');

    // Error Containers
    this.usernameErrorContainer = page.locator(
      "#input-error-container-username",
    );
    this.passwordErrorContainer = page.locator(
      "#input-error-container-password",
    );

    // Page Title
    this.pageTitle = page.locator("#kc-page-title");
  }

  /**
   * Checks whether the Keycloak login page is visible
   */
  async isVisible(): Promise<boolean> {
    return this.loginForm.isVisible();
  }

  /**
   * Waits for the Keycloak login page
   */
  async waitForPage(): Promise<void> {
    await this.loginForm.waitFor({ state: "visible" });
  }

  /**
   * Navigates to target URL and waits for initial document load
   */
  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  /**
   * Checks whether current URL is still in Keycloak realm flow
   */
  isInRealmFlow(): boolean {
    return this.page.url().includes("/realms/");
  }

  /**
   * Performs login
   * @param username Username or email
   * @param password Password
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Waits until login redirects away from Keycloak realm
   */
  async waitForRedirectAfterLogin(): Promise<void> {
    await this.page.waitForURL((url) => !url.href.includes("/realms/"), {
      timeout: 30000,
    });
  }

  /**
   * Waits until OAuth fragment is processed by the SPA
   */
  async waitForOAuthProcessing(): Promise<void> {
    await this.page.waitForFunction(() => {
      const hash = window.location.hash;
      const hasCode = hash.includes("code=");
      const appLoaded =
        document.querySelector("ocx-shell") ||
        document.querySelector("app-root");
      return !hasCode || appLoaded;
    });
  }

  /**
   * Waits for app readiness after redirect
   */
  async waitForAppReady(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Returns current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Returns current header text (realm name)
   */
  async getRealmName(): Promise<string> {
    return this.headerWrapper.innerText();
  }

  /**
   * Returns the page title
   */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }

  /**
   * Checks whether username error messages are shown
   */
  async hasUsernameError(): Promise<boolean> {
    const content = await this.usernameErrorContainer.textContent();
    return content !== null && content.trim().length > 0;
  }

  /**
   * Returns username error text
   */
  async getUsernameErrorText(): Promise<string> {
    const content = await this.usernameErrorContainer.textContent();
    return content?.trim() || "";
  }

  /**
   * Checks whether password error messages are shown
   */
  async hasPasswordError(): Promise<boolean> {
    const content = await this.passwordErrorContainer.textContent();
    return content !== null && content.trim().length > 0;
  }

  /**
   * Returns password error text
   */
  async getPasswordErrorText(): Promise<string> {
    const content = await this.passwordErrorContainer.textContent();
    return content?.trim() || "";
  }

  /**
   * Toggles password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click();
  }

  /**
   * Checks whether the password is visible (type="text" instead of type="password")
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute("type");
    return type === "text";
  }
}

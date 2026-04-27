import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Base harness for shared navigation, error handling and logging
 * All specialized harnesses should use these helper methods
 */
export class BaseHarness {
  protected page: Page;
  private outputDir: string;
  private logger: Logger;

  constructor(page: Page, loggerName: string, outputDir?: string) {
    this.page = page;
    this.outputDir = outputDir || process.env.OUTPUT_DIR || "./artifacts";
    this.logger = new Logger(loggerName);
    this.ensureOutputDirectory();
  }

  /**
   * Ensure that the output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Logger getter
   */
  protected log(): Logger {
    return this.logger;
  }

  /**
   * Navigate to a URL with error handling
   */
  async navigateTo(url: string, waitForElement?: string): Promise<void> {
    this.logger.info(`Navigating to: ${url}`);

    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
      this.logger.info(`Navigation successful`);

      if (waitForElement) {
        await this.page.locator(waitForElement).waitFor();
        this.logger.info(`Element visible: ${waitForElement}`);
      }
    } catch (error) {
      this.logger.error(`Navigation failed: ${error}`);
      await this.captureErrorState(`navigation-failed`);
      throw error;
    }
  }

  /**
   * Wait until an element is visible
   */
  async waitForElement(selector: string): Promise<void> {
    try {
      await this.page.locator(selector).waitFor({ state: "visible" });
      this.logger.info(`Element visible: ${selector}`);
    } catch (error) {
      this.logger.error(`Element not visible: ${selector}`);
      await this.captureErrorState(
        `element-not-found-${selector.replace(/[^a-z0-9]/gi, "-")}`,
      );
      throw error;
    }
  }

  /**
   * Wait for URL change (for example after redirects)
   */
  async waitForURLChange(timeout: number = 10000): Promise<string> {
    const startUrl = this.page.url();
    this.logger.info(`Waiting for URL change from: ${startUrl}`);

    try {
      await this.page.waitForFunction(
        (prevUrl) => window.location.href !== prevUrl,
        startUrl,
        { timeout },
      );
      await this.page.waitForLoadState("domcontentloaded");
      const newUrl = this.page.url();
      this.logger.info(`URL changed to: ${newUrl}`);
      return newUrl;
    } catch (error) {
      this.logger.error(`URL change timeout (${timeout}ms)`);
      await this.captureErrorState(`url-change-timeout`);
      throw error;
    }
  }

  /**
   * Wait until a URL pattern is matched
   */
  async waitForURL(
    urlPattern: string | RegExp,
    timeout: number = 10000,
  ): Promise<void> {
    this.logger.info(`Waiting for URL pattern: ${urlPattern}`);
    try {
      if (typeof urlPattern === "string") {
        await this.page.waitForURL(new RegExp(urlPattern), { timeout });
      } else {
        await this.page.waitForURL(urlPattern, { timeout });
      }
      this.logger.info(`URL pattern matched: ${this.page.url()}`);
    } catch (error) {
      this.logger.error(`URL pattern not reached: ${urlPattern}`);
      await this.captureErrorState(`url-pattern-timeout`);
      throw error;
    }
  }

  /**
   * Wait until the page is fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    this.logger.info(`Waiting for page load...`);
    try {
      await this.page.waitForLoadState("networkidle");
      this.logger.info(`Page fully loaded`);
    } catch {
      // networkidle can hang with WebSockets - fallback to domcontentloaded
      this.logger.warn(`NetworkIdle timeout, falling back to domcontentloaded`);
      await this.page.waitForLoadState("domcontentloaded");
    }
  }

  /**
   * Check if error toast/alert is present on the page
   */
  async checkForErrors(): Promise<string[]> {
    const errors: string[] = [];

    // PrimeNG toast errors
    const toastErrors = await this.page
      .locator(".p-toast-message.ng-severity-error")
      .all();
    for (const toast of toastErrors) {
      const text = await toast.innerText();
      errors.push(`Toast: ${text}`);
    }

    // Angular error containers
    const errorDivs = await this.page.locator("[role='alert']").all();
    for (const div of errorDivs) {
      const text = await div.innerText();
      if (text.toLowerCase().includes("error")) {
        errors.push(`Alert: ${text}`);
      }
    }

    // Collect console errors
    const consoleErrors: string[] = [];
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    if (errors.length > 0) {
      this.logger.warn(`Errors found on page: ${errors.join(", ")}`);
      return errors;
    }

    return [];
  }

  /**
   * Save screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const screenshotPath = path.join(
      this.outputDir,
      `screenshot-${name}-${timestamp}.png`,
    );

    try {
      await this.page.screenshot({ path: screenshotPath });
      this.logger.info(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      this.logger.error(`Screenshot failed: ${error}`);
    }
  }

  /**
   * Capture Error State: Screenshot + Page Content + Console Logs
   */
  async captureErrorState(context: string): Promise<void> {
    this.logger.error(`Capturing error state: ${context}`);

    try {
      // Screenshot
      await this.takeScreenshot(context);

      // HTML dump
      const htmlPath = path.join(
        this.outputDir,
        `error-${context}-${Date.now()}.html`,
      );
      const html = await this.page.content();
      fs.writeFileSync(htmlPath, html);
      this.logger.info(`HTML dump saved: ${htmlPath}`);

      // URL + Title
      this.logger.error(`URL: ${this.page.url()}`);
      this.logger.error(`Title: ${await this.page.title()}`);

      // Errors collected
      const pageErrors = await this.checkForErrors();
      if (pageErrors.length > 0) {
        this.logger.error(`Page Errors: ${pageErrors.join(" | ")}`);
      }
    } catch (captureError) {
      this.logger.error(`Error during error capture: ${captureError}`);
    }
  }

  /**
   * Assertion helper with improved error messages
   */
  async assertVisible(selector: string, message?: string): Promise<void> {
    try {
      await expect(this.page.locator(selector)).toBeVisible();
      this.logger.info(`✓ Assertion confirmed: ${selector}`);
    } catch (error) {
      this.logger.error(
        `✗ Assertion failed: ${selector} - ${message || error}`,
      );
      await this.captureErrorState(
        `assertion-failed-${selector.replace(/[^a-z0-9]/gi, "-")}`,
      );
      throw error;
    }
  }

  /**
   * Wait for multiple elements (all visible)
   */
  async waitForAllElements(selectors: string[]): Promise<void> {
    this.logger.info(`Waiting for ${selectors.length} elements...`);
    try {
      for (const selector of selectors) {
        await this.page.locator(selector).waitFor({ state: "visible" });
      }
      this.logger.info(`All elements are visible`);
    } catch (error) {
      this.logger.error(`Not all elements were found: ${error}`);
      await this.captureErrorState(`all-elements-timeout`);
      throw error;
    }
  }

  /**
   * Getter for page object (for specialized harnesses)
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Getter for output directory
   */
  getOutputDir(): string {
    return this.outputDir;
  }
}

/**
 * Simple logger class for consistent logging
 */
export class Logger {
  private prefix: string;

  constructor(prefix: string = "[Test]") {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(`${this.prefix} ℹ️  ${message}`);
  }

  warn(message: string): void {
    console.warn(`${this.prefix} ⚠️  ${message}`);
  }

  error(message: string): void {
    console.error(`${this.prefix} ❌ ${message}`);
  }

  success(message: string): void {
    console.log(`${this.prefix} ✅ ${message}`);
  }

  debug(message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(`${this.prefix} 🐛 ${message}`);
    }
  }
}

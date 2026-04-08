import { Page, Locator } from "@playwright/test";
import { BaseHarness } from "./base.harness";

/**
 * Harness for the OneCX workspace management page
 * Specialized for workspace search, display, and navigation
 * Inherits from BaseHarness for consistent error handling
 */
export class WorkspaceSearchHarness extends BaseHarness {
  // Main Container
  readonly workspaceComponent: Locator;
  readonly portalPage: Locator;

  // Page header elements
  readonly pageHeader: Locator;
  readonly pageHeaderWrapper: Locator;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly titleSection: Locator;

  // Breadcrumb
  readonly breadcrumb: Locator;
  readonly breadcrumbHome: Locator;
  readonly breadcrumbItems: Locator;

  // Action buttons (toolbar)
  readonly toolbar: Locator;
  readonly actionButtons: Locator;

  // DataView / search results
  readonly dataView: Locator;
  readonly dataViewControls: Locator;
  readonly searchResults: Locator;
  readonly workspaceCards: Locator;

  // Paginator
  readonly paginator: Locator;
  readonly paginatorInfo: Locator;
  readonly paginatorFirstButton: Locator;
  readonly paginatorPrevButton: Locator;
  readonly paginatorNextButton: Locator;
  readonly paginatorLastButton: Locator;

  // Search Input
  readonly searchInput: Locator;

  // Dialogs
  readonly createDialog: Locator;
  readonly importDialog: Locator;

  constructor(page: Page, loggerName: string) {
    super(page, loggerName);

    // Main Container
    this.workspaceComponent = page.locator("ocx-workspace-component");
    this.portalPage = page.locator("ocx-portal-page");

    // Page Header
    this.pageHeader = page.locator("ocx-page-header");
    this.pageHeaderWrapper = page.locator('[name="ocx-page-header-wrapper"]');
    this.pageTitle = page.locator("#page-header");
    this.pageSubtitle = page.locator("#page-subheader");
    this.titleSection = page.locator(
      'section.header[aria-label="Page Header"]',
    );

    // Breadcrumb
    this.breadcrumb = page.locator("p-breadcrumb");
    this.breadcrumbHome = page.locator(".p-breadcrumb-home");
    this.breadcrumbItems = page.locator(".p-breadcrumb-list li.p-element");

    // Toolbar / Actions
    this.toolbar = page.locator(".toolbar");
    this.actionButtons = page.locator(".action-button");

    // DataView
    this.dataView = page.locator("#ws_search_dataview");
    this.dataViewControls = page.locator("ocx-data-view-controls");
    this.searchResults = page.locator(
      'section[aria-label*="Workspaces" i]',
    );
    this.workspaceCards = page.locator('article[aria-label^="Workspace:"]');

    // Paginator
    this.paginator = page.locator("p-paginator");
    this.paginatorInfo = page.locator(".p-paginator-current");
    this.paginatorFirstButton = page.locator(".p-paginator-first");
    this.paginatorPrevButton = page.locator(".p-paginator-prev");
    this.paginatorNextButton = page.locator(".p-paginator-next");
    this.paginatorLastButton = page.locator(".p-paginator-last");

    // Search
    this.searchInput = page.locator('.p-inputgroup input[type="text"]');

    // Dialogs
    this.createDialog = page.locator("app-workspace-create p-dialog");
    this.importDialog = page.locator("app-workspace-import p-dialog");
  }

  /**
   * Navigates to workspace target URL
   */
  async navigateToWorkspace(url: string): Promise<void> {
    await this.navigateTo(url);
  }

  /**
   * Waits for initial document load
   */
  async waitForDomReady(): Promise<void> {
    await this.getPage().waitForLoadState("domcontentloaded");
  }

  /**
   * Checks whether current URL points to Keycloak realm flow
   */
  isRedirectedToKeycloak(): boolean {
    return this.getPage().url().includes("/realms/");
  }

  /**
   * Returns current URL
   */
  getCurrentUrl(): string {
    return this.getPage().url();
  }

  /**
   * Checks whether the workspace page is visible
   */
  async isVisible(): Promise<boolean> {
    return this.workspaceComponent.isVisible();
  }

  /**
   * Waits for the workspace page with improved error handling
   */
  async waitForPage(): Promise<void> {
    this.log().info("Waiting for workspace page...");
    try {
      // Workspace component must be visible
      await this.workspaceComponent.waitFor({ state: "visible" });

      // Page header must be loaded
      await this.pageHeader.waitFor({ state: "visible" });

      this.log().success("Workspace page loaded");
    } catch (error) {
      this.log().error("Workspace page could not be loaded");
      await this.captureErrorState("workspace-page-load-failed");
      throw error;
    }
  }

  /**
   * Returns page title
   */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }

  /**
   * Returns page subtitle
   */
  async getPageSubtitle(): Promise<string> {
    return this.pageSubtitle.innerText();
  }

  /**
   * Checks whether page header is visible
   */
  async isHeaderVisible(): Promise<boolean> {
    return this.pageHeader.isVisible();
  }

  /**
   * Returns breadcrumb items as an array
   */
  async getBreadcrumbItems(): Promise<string[]> {
    const items = await this.breadcrumbItems.allInnerTexts();
    return items.filter((item) => item.trim().length > 0);
  }

  /**
   * Returns number of visible workspace cards
   */
  async getWorkspaceCardCount(): Promise<number> {
    return this.workspaceCards.count();
  }

  /**
   * Returns all workspace names from cards
   */
  async getWorkspaceNames(): Promise<string[]> {
    const cards = await this.workspaceCards.all();
    const names: string[] = [];
    for (const card of cards) {
      const ariaLabel = await card.getAttribute("aria-label");
      if (ariaLabel) {
        // Format: "Workspace: OneCX Admin"
        const name = ariaLabel.replace("Workspace: ", "");
        names.push(name);
      }
    }
    return names;
  }

  /**
   * Clicks a workspace card by name
   */
  async clickWorkspace(name: string): Promise<void> {
    const card = this.page.locator(`article[aria-label="Workspace: ${name}"]`);
    await card.click();
  }

  /**
   * Returns paginator info (for example: "1 - 1 of 1")
   */
  async getPaginatorInfo(): Promise<string> {
    return this.paginatorInfo.innerText();
  }

  /**
   * Checks whether paginator is visible
   */
  async isPaginatorVisible(): Promise<boolean> {
    return this.paginator.isVisible();
  }

  /**
   * Returns number of action buttons in toolbar
   */
  async getActionButtonCount(): Promise<number> {
    return this.actionButtons.count();
  }

  /**
   * Clicks the first action button (usually "New Workspace")
   */
  async clickFirstActionButton(): Promise<void> {
    await this.actionButtons.first().click();
  }

  /**
   * Searches for workspaces
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Trigger search (Enter or automatic)
    await this.searchInput.press("Enter");
  }

  /**
   * Checks whether DataView is visible
   */
  async isDataViewVisible(): Promise<boolean> {
    return this.dataView.isVisible();
  }

  /**
   * Waits for search results
   */
  async waitForSearchResults(): Promise<void> {
    try {
      await this.searchResults.first().waitFor({ state: "visible" });
      return;
    } catch {
      // Fallback for locale/theme variants without expected aria-label values
      await this.workspaceCards.first().waitFor({ state: "visible" });
    }
  }

  /**
   * Waits for page to be fully loaded (networkidle fallback handled in BaseHarness)
   */
  async waitForPageFullyLoaded(): Promise<void> {
    await this.waitForPageLoad();
  }

  /**
   * Captures full page screenshot at provided path
   */
  async captureFullPageScreenshot(path: string): Promise<void> {
    await this.getPage().screenshot({ path, fullPage: true });
  }

  /**
   * Captures header screenshot at provided path
   */
  async captureHeaderScreenshot(path: string): Promise<void> {
    await this.pageHeader.screenshot({ path });
  }
}

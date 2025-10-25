import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  }

  /**
   * Navigate to a specific page
   */
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Fill a form field by test ID
   */
  async fillField(testId: string, value: string) {
    const field = this.page.getByTestId(testId);
    await field.clear();
    await field.fill(value);
  }

  /**
   * Click a button by test ID
   */
  async clickButton(testId: string) {
    await this.page.getByTestId(testId).click();
  }

  /**
   * Wait for an element to be visible by test ID
   */
  async waitForElement(testId: string, timeout = 5000) {
    await this.page.getByTestId(testId).waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if an element exists by test ID
   */
  async elementExists(testId: string): Promise<boolean> {
    try {
      await this.page.getByTestId(testId).waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(testId: string, filePath: string) {
    const fileInput = this.page.getByTestId(testId);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Wait for a WebSocket connection to be established
   */
  async waitForWebSocketConnection() {
    // Wait for connection status to show as connected
    await this.page.waitForSelector('[data-testid="connection-status"][data-status="connected"]', { timeout: 10000 });
  }

  /**
   * Mock API responses using page.route
   */
  async mockApiResponse(url: string, response: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for a specific text to appear on the page
   */
  async waitForText(text: string, timeout = 5000) {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }
}


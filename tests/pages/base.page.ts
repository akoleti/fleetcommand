import { Page, expect } from '@playwright/test';

/**
 * BasePage: Common page object functionality
 * All page objects should extend this class
 */

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  // Element interactions
  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async clickButton(text: string) {
    await this.page.click(`button:has-text("${text}")`);
  }

  async typeText(selector: string, text: string) {
    await this.page.locator(selector).type(text, { delay: 50 });
  }

  async selectDropdown(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  // Assertions
  async expectVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern);
  }

  // Waiting
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForNavigation(callback: () => Promise<void>) {
    await Promise.all([
      this.page.waitForNavigation(),
      callback(),
    ]);
  }

  // Utilities
  async getPageTitle() {
    return this.page.title();
  }

  async currentPath() {
    return this.page.url().split(this.page.context().baseURL || '')[1];
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}

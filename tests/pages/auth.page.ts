import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * AuthPage: Login and registration pages
 */

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get emailInput() {
    return 'input[name="email"]';
  }

  get passwordInput() {
    return 'input[name="password"]';
  }

  get submitButton() {
    return 'button[type="submit"]';
  }

  get errorMessage() {
    return '[data-testid="error-message"]';
  }

  get registerLink() {
    return 'a:has-text("Register")';
  }

  get loginLink() {
    return 'a:has-text("Login")';
  }

  // Actions
  async login(email: string, password: string) {
    await this.goto('/login');
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  async register(email: string, password: string, confirmPassword: string) {
    await this.goto('/register');
    await this.fillInput('input[name="email"]', email);
    await this.fillInput('input[name="password"]', password);
    await this.fillInput('input[name="confirmPassword"]', confirmPassword);
    await this.click(this.submitButton);
  }

  async logout() {
    await this.click('button[data-testid="logout-button"]');
    await this.expectUrl('/login');
  }

  async expectLoginError(errorText: string) {
    await this.expectText(this.errorMessage, errorText);
  }

  async navigateToRegister() {
    await this.click(this.registerLink);
    await this.expectUrl('/register');
  }

  async navigateToLogin() {
    await this.click(this.loginLink);
    await this.expectUrl('/login');
  }
}

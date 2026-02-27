import { test, expect } from './fixtures/auth';
import { AuthPage } from './pages/auth.page';

test.describe('Authentication Pages', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe('Login Page', () => {
    test('should load login page', async ({ page }) => {
      await authPage.goto('/login');
      await authPage.expectVisible('h1:has-text("Login")');
      await authPage.expectVisible(authPage.emailInput);
      await authPage.expectVisible(authPage.passwordInput);
    });

    test('should login with valid credentials', async ({ page }) => {
      await authPage.login('owner@fleetcommand.local', 'Owner@12345');
      await authPage.expectUrl('/dashboard');
      await authPage.expectVisible('[data-testid="fleet-status-card"]');
    });

    test('should show error with invalid email', async ({ page }) => {
      await authPage.goto('/login');
      await authPage.fillInput(authPage.emailInput, 'invalid@email.com');
      await authPage.fillInput(authPage.passwordInput, 'password123');
      await authPage.click(authPage.submitButton);
      
      await authPage.expectText('[data-testid="error-message"]', /Invalid|error/i);
    });

    test('should show error with wrong password', async ({ page }) => {
      await authPage.goto('/login');
      await authPage.fillInput(authPage.emailInput, 'owner@fleetcommand.local');
      await authPage.fillInput(authPage.passwordInput, 'WrongPassword123');
      await authPage.click(authPage.submitButton);
      
      await authPage.expectText('[data-testid="error-message"]', /Invalid|error/i);
    });

    test('should enforce rate limiting after failed attempts', async ({ page }) => {
      await authPage.goto('/login');
      
      // Try 5 failed logins
      for (let i = 0; i < 5; i++) {
        await authPage.fillInput(authPage.emailInput, 'owner@fleetcommand.local');
        await authPage.fillInput(authPage.passwordInput, 'WrongPassword');
        await authPage.click(authPage.submitButton);
        await page.waitForTimeout(500);
      }

      // Should be locked out
      await authPage.expectText('[data-testid="error-message"]', /locked|rate limit/i);
    });

    test('should navigate to register page', async ({ page }) => {
      await authPage.goto('/login');
      await authPage.navigateToRegister();
      await authPage.expectUrl('/register');
    });
  });

  test.describe('Register Page', () => {
    test('should load register page', async ({ page }) => {
      await authPage.goto('/register');
      await authPage.expectVisible('h1:has-text("Register")');
      await authPage.expectVisible(authPage.emailInput);
      await authPage.expectVisible(authPage.passwordInput);
    });

    test('should register with valid data', async ({ page }) => {
      const randomEmail = `test-${Date.now()}@fleetcommand.local`;
      await authPage.register(randomEmail, 'TestPass@123', 'TestPass@123');
      
      await authPage.expectUrl('/dashboard');
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await authPage.goto('/register');
      await authPage.fillInput(authPage.emailInput, `test-${Date.now()}@fleetcommand.local`);
      await authPage.fillInput(authPage.passwordInput, 'TestPass@123');
      await authPage.fillInput('input[name="confirmPassword"]', 'DifferentPass@123');
      await authPage.click(authPage.submitButton);
      
      await authPage.expectText('[data-testid="error-message"]', /match|password/i);
    });

    test('should navigate to login page', async ({ page }) => {
      await authPage.goto('/register');
      await authPage.navigateToLogin();
      await authPage.expectUrl('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user to login', async ({ page }) => {
      await page.goto('/dashboard');
      await authPage.expectUrl('/login');
    });

    test('should redirect unauthenticated user from trucks page', async ({ page }) => {
      await page.goto('/trucks');
      await authPage.expectUrl('/login');
    });
  });

  test.describe('Logout', () => {
    test('should logout authenticated user', async ({ ownerPage }) => {
      // Owner is already authenticated
      await ownerPage.goto('/dashboard');
      
      const authPageOwner = new AuthPage(ownerPage);
      await authPageOwner.logout();
      
      await authPageOwner.expectUrl('/login');
    });
  });
});

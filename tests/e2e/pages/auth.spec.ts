import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test.describe('Login Page', () => {
    test('should render login form', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      
      expect(await page.title()).toContain('FleetCommand');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should display validation errors on empty submit', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should show error on invalid email', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('input[type="password"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Invalid email')).toBeVisible();
    });

    test('should show error on short password', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      await page.locator('input[type="email"]').fill('test@example.com');
      await page.locator('input[type="password"]').fill('pass');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should submit form with valid credentials', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
      await page.locator('input[type="password"]').fill('owner123');
      await page.locator('button[type="submit"]').click();
      
      // Should redirect to dashboard
      await page.waitForURL(`${baseUrl}/dashboard`);
      expect(page.url()).toContain('/dashboard');
    });

    test('should show error on invalid credentials', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should have register link', async ({ page }) => {
      await page.goto(`${baseUrl}/login`);
      
      const registerLink = page.locator('a[href="/register"]');
      await expect(registerLink).toBeVisible();
    });
  });

  test.describe('Register Page', () => {
    test('should render registration form', async ({ page }) => {
      await page.goto(`${baseUrl}/register`);
      
      await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('select')).toBeVisible(); // Role selector
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should display validation errors on empty submit', async ({ page }) => {
      await page.goto(`${baseUrl}/register`);
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should show error on duplicate email', async ({ page }) => {
      await page.goto(`${baseUrl}/register`);
      await page.locator('input[placeholder="Full Name"]').fill('Test User');
      await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
      await page.locator('input[type="password"]').fill('password123');
      await page.locator('select').selectOption('owner');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('text=Email already registered')).toBeVisible();
    });

    test('should successfully register new user', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      await page.goto(`${baseUrl}/register`);
      await page.locator('input[placeholder="Full Name"]').fill('New User');
      await page.locator('input[type="email"]').fill(uniqueEmail);
      await page.locator('input[type="password"]').fill('password123');
      await page.locator('select').selectOption('driver');
      await page.locator('button[type="submit"]').click();
      
      // Should redirect to dashboard
      await page.waitForURL(`${baseUrl}/dashboard`);
      expect(page.url()).toContain('/dashboard');
    });

    test('should have login link', async ({ page }) => {
      await page.goto(`${baseUrl}/register`);
      
      const loginLink = page.locator('a[href="/login"]');
      await expect(loginLink).toBeVisible();
    });
  });
});

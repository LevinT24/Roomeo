import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title to contain "Roomio" or whatever your app title is
  await expect(page).toHaveTitle(/.*Roomio.*/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Add specific tests for your app's navigation
  // For example:
  // await page.click('[data-testid="login-button"]');
  // await expect(page).toHaveURL('/login');
});
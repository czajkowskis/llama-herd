import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Settings Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateTo('/');
  });

  test('should change theme and persist preference', async ({ page }) => {
    // Navigate to settings
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Change to light theme
    await helpers.clickButton('theme-light-button');
    
    // Verify theme is applied
    await expect(page.locator('html')).toHaveClass(/light/);
    
    // Change to dark theme
    await helpers.clickButton('theme-dark-button');
    
    // Verify theme is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Change to system theme
    await helpers.clickButton('theme-system-button');
    
    // Verify system theme is selected
    await expect(page.getByTestId('theme-system-button')).toHaveClass(/bg-purple-600/);
  });

  test('should toggle compact mode', async ({ page }) => {
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Toggle compact mode
    await helpers.clickButton('compact-mode-toggle');
    
    // Verify compact mode is applied
    await expect(page.locator('html')).toHaveClass(/compact-mode/);
    
    // Toggle off
    await helpers.clickButton('compact-mode-toggle');
    
    // Verify compact mode is removed
    await expect(page.locator('html')).not.toHaveClass(/compact-mode/);
  });

  test('should change message density', async ({ page }) => {
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Change to sparse density
    const slider = page.getByTestId('message-density-slider');
    await slider.fill('0');
    
    // Verify density is applied
    await expect(page.locator('html')).toHaveClass(/density-sparse/);
    await expect(page.getByTestId('current-density')).toHaveText('sparse');
    
    // Change to normal density
    await slider.fill('1');
    
    // Verify density is applied
    await expect(page.locator('html')).toHaveClass(/density-normal/);
    await expect(page.getByTestId('current-density')).toHaveText('normal');
    
    // Change to dense density
    await slider.fill('2');
    
    // Verify density is applied
    await expect(page.locator('html')).toHaveClass(/density-dense/);
    await expect(page.getByTestId('current-density')).toHaveText('dense');
  });

  test('should change time format preference', async ({ page }) => {
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Change to 12h format
    await helpers.clickButton('time-format-12h');
    
    // Verify 12h format is selected
    await expect(page.getByTestId('time-format-12h')).toHaveClass(/bg-purple-600/);
    await expect(page.getByTestId('current-time-format')).toHaveText('12h');
    
    // Verify preview shows AM/PM
    const preview = page.getByTestId('time-format-preview');
    await expect(preview).toContainText(/am|pm/i);
    
    // Change to 24h format
    await helpers.clickButton('time-format-24h');
    
    // Verify 24h format is selected
    await expect(page.getByTestId('time-format-24h')).toHaveClass(/bg-purple-600/);
    await expect(page.getByTestId('current-time-format')).toHaveText('24h');
    
    // Verify preview doesn't show AM/PM
    await expect(preview).not.toContainText(/am|pm/i);
  });

  test('should persist all settings across page reload', async ({ page }) => {
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Set all preferences
    await helpers.clickButton('theme-light-button');
    await helpers.clickButton('compact-mode-toggle');
    const slider = page.getByTestId('message-density-slider');
    await slider.fill('2'); // dense
    await helpers.clickButton('time-format-12h');

    // Reload page
    await page.reload();
    await helpers.waitForElement('settings-page');

    // Verify all preferences are persisted
    await expect(page.getByTestId('theme-light-button')).toHaveClass(/bg-purple-600/);
    await expect(page.getByTestId('compact-mode-toggle')).toHaveClass(/bg-purple-600/);
    await expect(page.getByTestId('current-density')).toHaveText('dense');
    await expect(page.getByTestId('time-format-12h')).toHaveClass(/bg-purple-600/);
    
    // Verify DOM classes are applied
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.locator('html')).toHaveClass(/compact-mode/);
    await expect(page.locator('html')).toHaveClass(/density-dense/);
  });

  test('should show preview of settings changes', async ({ page }) => {
    await helpers.clickButton('settings-button');
    await helpers.waitForElement('settings-page');

    // Verify preview area exists
    await expect(page.getByTestId('preview-area')).toBeVisible();
    
    // Verify preview messages are shown
    const previewMessages = page.locator('.preview-message');
    await expect(previewMessages).toHaveCount(2); // At least 2 preview messages
    
    // Verify preview shows different settings
    await helpers.clickButton('compact-mode-toggle');
    await expect(page.locator('.preview-message')).toHaveClass(/compact/);
    
    const slider = page.getByTestId('message-density-slider');
    await slider.fill('0'); // sparse
    await expect(page.locator('.preview-message')).toHaveClass(/sparse/);
  });
});

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import mockData from '../fixtures/mock-experiment-data.json';

test.describe('Experiment Creation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateTo('/');
  });

  test('should create and start a new experiment', async ({ page }) => {
    // Mock API responses
    await helpers.mockApiResponse('**/api/models/list', { models: [{ name: 'llama2' }] });
    await helpers.mockApiResponse('**/api/experiments/start', { 
      experimentId: 'test-exp-1',
      status: 'running'
    });

    // Navigate to new experiment page
    await helpers.clickButton('new-experiment-button');
    await helpers.waitForElement('new-experiment-page');

    // Create a task
    await helpers.clickButton('create-task-button');
    await helpers.fillField('task-prompt-input', 'Discuss renewable energy benefits');
    await helpers.fillField('task-description-input', 'A conversation about renewable energy');
    await helpers.clickButton('save-task-button');

    // Add first agent
    await helpers.clickButton('add-agent-button');
    await helpers.fillField('agent-name-input', 'Energy Expert');
    await helpers.fillField('agent-prompt-input', 'You are an expert in renewable energy');
    await page.selectOption('[data-testid="agent-model-select"]', 'llama2');
    await helpers.clickButton('save-agent-button');

    // Add second agent
    await helpers.clickButton('add-agent-button');
    await helpers.fillField('agent-name-input', 'Environmental Advocate');
    await helpers.fillField('agent-prompt-input', 'You advocate for environmental protection');
    await page.selectOption('[data-testid="agent-model-select"]', 'llama2');
    await helpers.clickButton('save-agent-button');

    // Start the experiment
    await helpers.waitForElement('start-experiment-button');
    await helpers.clickButton('start-experiment-button');

    // Verify experiment started
    await helpers.waitForText('Experiment started successfully');
    await helpers.waitForElement('live-experiment-view');
  });

  test('should validate required fields', async ({ page }) => {
    await helpers.clickButton('new-experiment-button');
    await helpers.waitForElement('new-experiment-page');

    // Try to create task without required fields
    await helpers.clickButton('create-task-button');
    await helpers.clickButton('save-task-button');
    
    // Should show validation errors
    await expect(page.getByText('Task prompt is required')).toBeVisible();
    await expect(page.getByText('Task description is required')).toBeVisible();

    // Try to add agent without required fields
    await helpers.clickButton('add-agent-button');
    await helpers.clickButton('save-agent-button');
    
    // Should show validation errors
    await expect(page.getByText('Agent name is required')).toBeVisible();
    await expect(page.getByText('Agent prompt is required')).toBeVisible();
  });

  test('should prevent duplicate agent names', async ({ page }) => {
    await helpers.mockApiResponse('**/api/models/list', { models: [{ name: 'llama2' }] });
    
    await helpers.clickButton('new-experiment-button');
    await helpers.waitForElement('new-experiment-page');

    // Create first agent
    await helpers.clickButton('add-agent-button');
    await helpers.fillField('agent-name-input', 'Test Agent');
    await helpers.fillField('agent-prompt-input', 'Test prompt');
    await page.selectOption('[data-testid="agent-model-select"]', 'llama2');
    await helpers.clickButton('save-agent-button');

    // Try to create second agent with same name
    await helpers.clickButton('add-agent-button');
    await helpers.fillField('agent-name-input', 'Test Agent');
    await helpers.fillField('agent-prompt-input', 'Another prompt');
    await page.selectOption('[data-testid="agent-model-select"]', 'llama2');
    await helpers.clickButton('save-agent-button');

    // Should show duplicate name error
    await expect(page.getByText('Agent name already exists')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/models/list', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await helpers.clickButton('new-experiment-button');
    await helpers.waitForElement('new-experiment-page');

    // Should show error message
    await expect(page.getByText('Failed to load models')).toBeVisible();
  });
});


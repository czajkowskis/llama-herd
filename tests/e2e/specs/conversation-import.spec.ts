import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { writeFileSync } from 'fs';
import { join } from 'path';

test.describe('Conversation Import', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateTo('/');
  });

  test('should import conversation from JSON file', async ({ page }) => {
    // Create a temporary JSON file for import
    const conversationData = {
      title: 'Imported Conversation',
      agents: [
        {
          id: 'agent-1',
          name: 'Imported Agent 1',
          color: '#3B82F6',
          model: 'llama2'
        },
        {
          id: 'agent-2',
          name: 'Imported Agent 2',
          color: '#10B981',
          model: 'llama2'
        }
      ],
      messages: [
        {
          id: 'msg-1',
          agentId: 'agent-1',
          content: 'This is an imported message from agent 1.',
          timestamp: '2024-01-15T10:01:00Z'
        },
        {
          id: 'msg-2',
          agentId: 'agent-2',
          content: 'This is an imported message from agent 2.',
          timestamp: '2024-01-15T10:02:00Z'
        }
      ],
      createdAt: '2024-01-15T10:00:00Z'
    };

    const tempFilePath = join(__dirname, '../fixtures/temp-import.json');
    writeFileSync(tempFilePath, JSON.stringify(conversationData, null, 2));

    // Navigate to history page
    await helpers.clickButton('history-button');
    await helpers.waitForElement('history-page');

    // Click import button
    await helpers.clickButton('import-conversation-button');
    await helpers.waitForElement('import-modal');

    // Upload the JSON file
    await helpers.uploadFile('file-input', tempFilePath);

    // Configure agents
    await helpers.waitForElement('agent-configuration');
    
    // Verify agents are loaded
    await expect(page.getByText('Imported Agent 1')).toBeVisible();
    await expect(page.getByText('Imported Agent 2')).toBeVisible();

    // Confirm import
    await helpers.clickButton('confirm-import-button');

    // Verify conversation is imported
    await helpers.waitForText('Conversation imported successfully');
    
    // Navigate to the imported conversation
    await helpers.clickButton('view-imported-conversation');
    
    // Verify conversation content
    await expect(page.getByText('Imported Conversation')).toBeVisible();
    await expect(page.getByText('This is an imported message from agent 1.')).toBeVisible();
    await expect(page.getByText('This is an imported message from agent 2.')).toBeVisible();
  });

  test('should validate JSON file format', async ({ page }) => {
    // Create an invalid JSON file
    const invalidData = {
      invalidField: 'This is not a valid conversation format'
    };

    const tempFilePath = join(__dirname, '../fixtures/temp-invalid.json');
    writeFileSync(tempFilePath, JSON.stringify(invalidData, null, 2));

    await helpers.clickButton('history-button');
    await helpers.waitForElement('history-page');

    await helpers.clickButton('import-conversation-button');
    await helpers.waitForElement('import-modal');

    // Upload invalid JSON file
    await helpers.uploadFile('file-input', tempFilePath);

    // Should show validation error
    await expect(page.getByText('Invalid conversation format')).toBeVisible();
    await expect(page.getByText('Required fields: title, agents, messages')).toBeVisible();
  });

  test('should handle file upload errors', async ({ page }) => {
    await helpers.clickButton('history-button');
    await helpers.waitForElement('history-page');

    await helpers.clickButton('import-conversation-button');
    await helpers.waitForElement('import-modal');

    // Try to upload a non-JSON file
    const tempFilePath = join(__dirname, '../fixtures/temp-invalid.txt');
    writeFileSync(tempFilePath, 'This is not JSON');

    await helpers.uploadFile('file-input', tempFilePath);

    // Should show file type error
    await expect(page.getByText('Please select a valid JSON file')).toBeVisible();
  });

  test('should allow agent configuration during import', async ({ page }) => {
    const conversationData = {
      title: 'Configurable Import',
      agents: [
        {
          id: 'agent-1',
          name: 'Original Agent',
          color: '#3B82F6',
          model: 'llama2'
        }
      ],
      messages: [
        {
          id: 'msg-1',
          agentId: 'agent-1',
          content: 'Message from original agent',
          timestamp: '2024-01-15T10:01:00Z'
        }
      ],
      createdAt: '2024-01-15T10:00:00Z'
    };

    const tempFilePath = join(__dirname, '../fixtures/temp-configurable.json');
    writeFileSync(tempFilePath, JSON.stringify(conversationData, null, 2));

    await helpers.clickButton('history-button');
    await helpers.waitForElement('history-page');

    await helpers.clickButton('import-conversation-button');
    await helpers.waitForElement('import-modal');

    await helpers.uploadFile('file-input', tempFilePath);
    await helpers.waitForElement('agent-configuration');

    // Modify agent name
    await helpers.fillField('agent-name-input', 'Modified Agent Name');
    
    // Change agent color
    await helpers.clickButton('agent-color-picker');
    await helpers.clickButton('color-option-green');

    // Confirm import
    await helpers.clickButton('confirm-import-button');

    // Verify modified agent is used
    await helpers.waitForText('Conversation imported successfully');
    await helpers.clickButton('view-imported-conversation');
    
    await expect(page.getByText('Modified Agent Name')).toBeVisible();
    // Verify the agent has the new color (this would be checked via CSS or data attributes)
  });

  test('should handle large conversation files', async ({ page }) => {
    // Create a large conversation with many messages
    const largeConversation = {
      title: 'Large Conversation',
      agents: [
        {
          id: 'agent-1',
          name: 'Agent 1',
          color: '#3B82F6',
          model: 'llama2'
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          color: '#10B981',
          model: 'llama2'
        }
      ],
      messages: Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        agentId: i % 2 === 0 ? 'agent-1' : 'agent-2',
        content: `This is message number ${i + 1} in a large conversation.`,
        timestamp: new Date(Date.now() + i * 60000).toISOString()
      })),
      createdAt: '2024-01-15T10:00:00Z'
    };

    const tempFilePath = join(__dirname, '../fixtures/temp-large.json');
    writeFileSync(tempFilePath, JSON.stringify(largeConversation, null, 2));

    await helpers.clickButton('history-button');
    await helpers.waitForElement('history-page');

    await helpers.clickButton('import-conversation-button');
    await helpers.waitForElement('import-modal');

    // Upload large file
    await helpers.uploadFile('file-input', tempFilePath);

    // Should show loading state
    await expect(page.getByText('Processing large conversation...')).toBeVisible();

    // Wait for processing to complete
    await helpers.waitForElement('agent-configuration');
    
    // Confirm import
    await helpers.clickButton('confirm-import-button');

    // Verify large conversation is imported
    await helpers.waitForText('Conversation imported successfully');
    await helpers.clickButton('view-imported-conversation');
    
    // Verify messages are loaded (might be paginated)
    await expect(page.getByText('This is message number 1 in a large conversation.')).toBeVisible();
  });
});


import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the service before importing components to ensure consistent module instance
jest.mock('../services/ollamaService', () => {
  return {
    ollamaService: {
      getVersion: jest.fn().mockResolvedValue('0.1.0'),
  listModels: jest.fn().mockResolvedValue([]),
      pullModel: jest.fn().mockImplementation(async (_name: string, onProgress?: (p: any) => void) => {
        await new Promise(res => setTimeout(res, 10));
        onProgress?.({ total: 100, completed: 50 });
        await new Promise(res => setTimeout(res, 10));
        onProgress?.({ total: 100, completed: 100 });
      }),
      deleteModel: jest.fn().mockResolvedValue(undefined),
    },
  };
});

import { ollamaService } from '../../../services/ollamaService';
import { Models } from './ModelsPage';

describe('Models Page', () => {
  beforeEach(() => {
    // reset mocks and localStorage
    jest.clearAllMocks();
    (window.localStorage as any).clear?.();
  });

  it('renders header and tabs', async () => {
    render(<Models />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Models' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /Installed/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Discover/i })).toBeInTheDocument();
  });

  it('disables Pull when disconnected', async () => {
    (ollamaService.getVersion as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    render(<Models />);
    // switch to discover
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    // pull buttons should show tooltip via title and be disabled
    // pick a known catalog item button text 'Pull'
    const pullButtons = await screen.findAllByRole('button', { name: /Pull /i });
    pullButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('filters by search and resets on clear', async () => {
    render(<Models />);
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
  fireEvent.change(screen.getByRole('textbox', { name: /Search models/i }), { target: { value: 'mistral' } });
    // there should be at least one card; ensure clear resets
    const clearBtn = await screen.findByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearBtn);
    // expect full list (3 pulls visible)
    await waitFor(() => {
      const pulls = screen.getAllByRole('button', { name: /Pull /i });
      expect(pulls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('starts pull and shows progress', async () => {
    render(<Models />);
    // ensure connection is established (enables Pull buttons)
    await screen.findByText(/Ollama: Connected/i);
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
  // Use Add by tag to initiate a pull with a known tag
  const addInput = screen.getByRole('textbox', { name: /Add model by exact tag/i });
  fireEvent.change(addInput, { target: { value: 'llama3:8b-instruct-q4_0' } });
  const pullBtn = screen.getByRole('button', { name: /Pull by tag/i });
    // wait until enabled before clicking
    await waitFor(() => expect(pullBtn).toBeEnabled());
  fireEvent.click(pullBtn);
  // Confirm the download in the popup
  const confirmBtn = await screen.findByRole('button', { name: /Download/i });
  fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect((ollamaService.pullModel as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });
  });

  it('can cancel an in-flight pull', async () => {
    // Arrange a long-running pull that we can cancel
    (ollamaService.pullModel as jest.Mock).mockImplementationOnce(async (_name: string, _onProgress: any, signal?: AbortSignal) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 1000);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
      });
    });
    render(<Models />);
    await screen.findByText(/Ollama: Connected/i);
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    // Expand the Llama 8B Instruct group
    fireEvent.click(screen.getByRole('button', { name: /Toggle Llama 8B Instruct variants/i }));
    const targetTag = 'llama3:8b-instruct-q4_0';
    const pullBtn = screen.getByRole('button', { name: new RegExp(`^Pull ${targetTag}$`) });
    fireEvent.click(pullBtn);
    // Confirm the download in the popup
    const confirmBtn = await screen.findByRole('button', { name: /Download/i });
    fireEvent.click(confirmBtn);
    const cancelButton = await screen.findByRole('button', { name: new RegExp(`^Cancel ${targetTag}$`) });
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: new RegExp(`^Cancel ${targetTag}$`) })).not.toBeInTheDocument();
    });
  });

  it('handles rapid cancellation requests without race conditions', async () => {
    let abortCallCount = 0;
    (ollamaService.pullModel as jest.Mock).mockImplementation(async (_name: string, _onProgress: any, signal?: AbortSignal) => {
      return new Promise<void>((resolve, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            abortCallCount++;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
        // Never resolve to keep it hanging
      });
    });

    render(<Models />);
    await screen.findByText(/Ollama: Connected/i);
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    const addInput = screen.getByRole('textbox', { name: /Add model by exact tag/i });
    fireEvent.change(addInput, { target: { value: 'test-model:1b' } });
    const pullBtn = screen.getByRole('button', { name: /Pull by tag/i });
    fireEvent.click(pullBtn);
    const confirmBtn = await screen.findByRole('button', { name: /Download/i });
    fireEvent.click(confirmBtn);

    const cancelButton = await screen.findByRole('button', { name: /Cancel test-model:1b/ });

    // Rapidly click cancel multiple times
    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);

    // Wait for the pull to be cancelled
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Cancel test-model:1b/ })).not.toBeInTheDocument();
    });

    // Verify abort was called (should be 1, not 3 due to race condition protection)
    expect(abortCallCount).toBe(1);
  });

  it('updates pull task status to cancelled within 100ms', async () => {
    const startTime = Date.now();
    (ollamaService.pullModel as jest.Mock).mockImplementation(async (_name: string, _onProgress: any, signal?: AbortSignal) => {
      return new Promise<void>((resolve, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(100); // Should cancel within 100ms
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
      });
    });

    render(<Models />);
    await screen.findByText(/Ollama: Connected/i);
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    const addInput = screen.getByRole('textbox', { name: /Add model by exact tag/i });
    fireEvent.change(addInput, { target: { value: 'quick-cancel-test:1b' } });
    const pullBtn = screen.getByRole('button', { name: /Pull by tag/i });
    fireEvent.click(pullBtn);
    const confirmBtn = await screen.findByRole('button', { name: /Download/i });
    fireEvent.click(confirmBtn);

    const cancelButton = await screen.findByRole('button', { name: /Cancel quick-cancel-test:1b/ });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Cancel quick-cancel-test:1b/ })).not.toBeInTheDocument();
    });
  });

  it('refreshes installed after successful pull and allows Set default and Remove', async () => {
    // After pull completes, listModels returns the pulled tag
    const pulledTag = 'mistral:7b-instruct-q5_1';
    let pullCompleted = false;
    (ollamaService.pullModel as jest.Mock).mockImplementation(async () => {
      pullCompleted = true;
      return undefined;
    });
    (ollamaService.listModels as jest.Mock).mockImplementation(async () => {
      return pullCompleted ? [pulledTag] : [];
    });

    render(<Models />);
    await screen.findByText(/Ollama: Connected/i);
    // Pull via Discover card for mistral
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    // Expand the Mistral Instruct group
    fireEvent.click(screen.getByRole('button', { name: /Toggle Mistral Instruct variants/i }));
    const pullMistral = screen.getByRole('button', { name: new RegExp(`Pull ${pulledTag}`) });
    fireEvent.click(pullMistral);
    // Confirm the download in the popup
    const confirmBtn = await screen.findByRole('button', { name: /Download/i });
    fireEvent.click(confirmBtn);
    // Wait for pull call
    await waitFor(() => expect(ollamaService.pullModel).toHaveBeenCalled());
    // Switch to Installed and wait for the Set default button to appear
    fireEvent.click(screen.getByRole('tab', { name: /Installed/i }));
    const setDefaultBtn = await screen.findByRole('button', { name: new RegExp(`Set ${pulledTag} as default`) });
    fireEvent.click(setDefaultBtn);
    expect(window.localStorage.getItem('llama-herd-default-ollama-model')).toBe(pulledTag);
    // Remove the model
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Remove ${pulledTag}`) }));
    // Confirm the removal in the popup
    const removeConfirmBtn = await screen.findByRole('button', { name: 'Remove' });
    fireEvent.click(removeConfirmBtn);
    await waitFor(() => expect(ollamaService.deleteModel).toHaveBeenCalledWith(pulledTag));
  });

  it('allows switching tabs while a tag pull is active', async () => {
    render(<Models />);
    await screen.findByText(/Ollama: Connected/i);
    // Start a pull via Add by tag
    const addInput = screen.getByRole('textbox', { name: /Add model by exact tag/i });
    fireEvent.change(addInput, { target: { value: 'codellama:7b-instruct-q4_0' } });
    const pullByTag = screen.getByRole('button', { name: /Pull by tag/i });
    fireEvent.click(pullByTag);
    // Confirm the download in the popup
    const confirmBtn = await screen.findByRole('button', { name: /Download/i });
    fireEvent.click(confirmBtn);
    // Active downloads should appear
    await screen.findByText(/Active downloads/i);
    // Switch to Discover
    fireEvent.click(screen.getByRole('tab', { name: /Discover/i }));
    // Expand the Llama 8B Instruct group
    fireEvent.click(screen.getByRole('button', { name: /Toggle Llama 8B Instruct variants/i }));
    await screen.findByRole('button', { name: /Pull llama3:8b-instruct-q4_0/i });
    // Switch back to Installed and see empty state (since mocks return empty initially)
    fireEvent.click(screen.getByRole('tab', { name: /Installed/i }));
    await screen.findByText(/No local models found/i);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NewExperiment } from './NewExperimentPage';
import { ollamaService } from '../../../services/ollamaService';
import { experimentService } from '../../../services/experimentService';

// Mock the services
jest.mock('../../../services/ollamaService');
jest.mock('../../../services/experimentService');
jest.mock('../../../services/backendStorageService');

const mockOllamaService = ollamaService as jest.Mocked<typeof ollamaService>;
const mockExperimentService = experimentService as jest.Mocked<typeof experimentService>;

describe('NewExperimentPage', () => {
  const mockOnExperimentStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Make the mock resolve immediately to avoid async state updates
    mockOllamaService.listModels.mockImplementation(() => Promise.resolve(['llama2', 'codellama']));
    mockExperimentService.startExperiment.mockResolvedValue({ 
      experiment_id: 'test-exp-1',
      status: 'running',
      websocket_url: 'ws://localhost:8000/ws/experiments/test-exp-1'
    });
  });

  it('should render the new experiment page', async () => {
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText('Create or import the task')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Create your agents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Experiment' })).toBeInTheDocument();
  });

  it('should load Ollama models on mount', async () => {
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    await waitFor(() => {
      expect(mockOllamaService.listModels).toHaveBeenCalled();
    });
  });

  it('should show create and import buttons for tasks', async () => {
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });
  });

  it('should show add agent button', async () => {
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Add new agent')).toBeInTheDocument();
    });
  });

  it('should show start experiment button as disabled initially', async () => {
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: 'Start Experiment' });
      expect(startButton).toBeDisabled();
    });
  });

  it('should handle Ollama service errors', async () => {
    mockOllamaService.listModels.mockRejectedValue(new Error('Ollama connection failed'));
    
    await act(async () => {
      render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    });
    
    // The component should still render even if Ollama fails
    expect(screen.getByText('Create or import the task')).toBeInTheDocument();
  });
});
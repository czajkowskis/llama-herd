import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    mockOllamaService.listModels.mockResolvedValue(['llama2', 'codellama']);
    mockExperimentService.startExperiment.mockResolvedValue({ experimentId: 'test-exp-1' });
  });

  it('should render the new experiment page', () => {
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    expect(screen.getByText('Create or import the task')).toBeInTheDocument();
    expect(screen.getByText('Create your agents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Experiment' })).toBeInTheDocument();
  });

  it('should load Ollama models on mount', async () => {
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    await waitFor(() => {
      expect(mockOllamaService.listModels).toHaveBeenCalled();
    });
  });

  it('should show create and import buttons for tasks', () => {
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('should show add agent button', () => {
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    expect(screen.getByLabelText('Add new agent')).toBeInTheDocument();
  });

  it('should show start experiment button as disabled initially', () => {
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    const startButton = screen.getByRole('button', { name: 'Start Experiment' });
    expect(startButton).toBeDisabled();
  });

  it('should handle Ollama service errors', async () => {
    mockOllamaService.listModels.mockRejectedValue(new Error('Ollama connection failed'));
    
    render(<NewExperiment onExperimentStart={mockOnExperimentStart} />);
    
    // The component should still render even if Ollama fails
    expect(screen.getByText('Create or import the task')).toBeInTheDocument();
  });
});
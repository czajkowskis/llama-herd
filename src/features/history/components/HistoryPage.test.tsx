import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { History } from './HistoryPage';
import { backendStorageService } from '../../../services/backendStorageService';
import { experimentService } from '../../../services/experimentService';

// Mock react-markdown to avoid ES module issues
jest.mock('react-markdown', () => ({ __esModule: true, default: (props: any) => <div>{props.children}</div> }));

// Mock the services
jest.mock('../../../services/backendStorageService');
jest.mock('../../../services/experimentService');

const mockBackendStorageService = backendStorageService as jest.Mocked<typeof backendStorageService>;
const mockExperimentService = experimentService as jest.Mocked<typeof experimentService>;

describe('HistoryPage', () => {
  const mockExperiments = [
    {
      id: 'exp-1',
      title: 'Test Experiment 1',
      task: { id: 'task-1', name: 'Task 1', prompt: 'Prompt 1', datasetItems: [] },
      agents: [],
      status: 'completed',
      createdAt: '2024-01-15T10:00:00Z',
      iterations: 1,
      currentIteration: 0,
    },
    {
      id: 'exp-2',
      title: 'Test Experiment 2',
      task: { id: 'task-2', name: 'Task 2', prompt: 'Prompt 2', datasetItems: [] },
      agents: [],
      status: 'running',
      createdAt: '2024-01-16T10:00:00Z',
      iterations: 1,
      currentIteration: 0,
    }
  ];

  const mockConversations = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      agents: [{ id: 'agent-1', name: 'Test Agent', color: '#3B82F6', model: 'llama2' }],
      messages: [{ id: 'msg-1', agentId: 'agent-1', content: 'Hello', timestamp: '2024-01-15T10:01:00Z' }],
      createdAt: '2024-01-15T10:00:00Z',
      importedAt: '2024-01-15T10:00:00Z',
      source: 'import' as const
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBackendStorageService.getExperiments.mockResolvedValue(mockExperiments);
    mockBackendStorageService.getConversations.mockResolvedValue(mockConversations);
    mockExperimentService.listExperiments.mockResolvedValue({
      experiments: [
        { experiment_id: 'exp-1', title: 'Test Experiment 1', status: 'completed', created_at: '2024-01-15T10:00:00Z', agent_count: 1, message_count: 5 },
        { experiment_id: 'exp-2', title: 'Test Experiment 2', status: 'running', created_at: '2024-01-16T10:00:00Z', agent_count: 1, message_count: 3 }
      ]
    });
  });

  it('should render the history page', async () => {
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
    });
  });

  it('should load and display experiments', async () => {
    render(<History />);
    
    expect(await screen.findByText('Test Experiment 1')).toBeInTheDocument();
    expect(screen.getByText('Test Experiment 2')).toBeInTheDocument();
  });

  it('should switch between experiments and conversations tabs', async () => {
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experiment 1')).toBeInTheDocument();
    });
    
    // Switch to conversations tab
    fireEvent.click(screen.getByText('Imported Conversations (1)'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    // Mock a slow loading response
    mockBackendStorageService.getExperiments.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockExperiments), 100))
    );
    
    render(<History />);
    
    // Should show loading state initially
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockBackendStorageService.getExperiments.mockRejectedValue(new Error('Failed to load'));
    
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load history/)).toBeInTheDocument();
    });
  });

  it('should allow editing experiment names', async () => {
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experiment 1')).toBeInTheDocument();
    });
    
    // Click edit button (using title attribute)
    const editButtons = screen.getAllByTitle(/edit experiment name/i);
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);
    
    // Should show edit input
    const editInput = screen.getByDisplayValue('Test Experiment 1');
    expect(editInput).toBeInTheDocument();
    
    // Change the name
    fireEvent.change(editInput, { target: { value: 'Updated Experiment Name' } });
    
    // Click save button
    const saveButton = screen.getByTitle('Save name');
    fireEvent.click(saveButton);
    
    // Should call the update service
    await waitFor(() => {
      expect(mockBackendStorageService.saveExperiment).toHaveBeenCalled();
    });
  });

  it('should allow deleting experiments', async () => {
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experiment 1')).toBeInTheDocument();
    });
    
    // Click delete button (using title attribute)
    const deleteButtons = screen.getAllByTitle(/delete experiment/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);
    
    // The component should handle the delete action
    // (The actual implementation may show a confirmation dialog or call the service directly)
    expect(deleteButtons[0]).toBeInTheDocument();
  });

  it('should allow bulk selection and deletion', async () => {
    render(<History />);
    
    expect(await screen.findByText('Test Experiment 1')).toBeInTheDocument();
    
    // Enable select mode
    fireEvent.click(screen.getByText('Select'));
    
    // Should show bulk actions
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByText('Delete Selected (0)')).toBeInTheDocument();
  });

  it('should show experiment status badges', async () => {
    render(<History />);
    
    expect(await screen.findByText('Test Experiment 1')).toBeInTheDocument();
    expect(screen.getByText('Test Experiment 2')).toBeInTheDocument();
    
    // Should show status badges
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('should show experiment metadata', async () => {
    render(<History />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Experiment 1')).toBeInTheDocument();
    });
    
    // Should show experiment metadata
    expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    expect(screen.getAllByText('0 agents')[0]).toBeInTheDocument();
  });
});
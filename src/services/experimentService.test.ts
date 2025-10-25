import { experimentService } from './experimentService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('experimentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startExperiment', () => {
    it('should start an experiment successfully', async () => {
      const mockResponse = {
        experiment_id: 'test-exp-1',
        status: 'running',
        websocket_url: 'ws://localhost:8000/ws/experiments/test-exp-1'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const task = {
        id: 'task-1',
        prompt: 'Test task',
        description: 'Test description'
      };

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          model: 'llama2',
          systemPrompt: 'Test prompt',
          color: '#3B82F6'
        }
      ];

      const result = await experimentService.startExperiment(task, agents);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/experiments/start'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task,
            agents,
            iterations: 1
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const task = {
        id: 'task-1',
        prompt: 'Test task',
        description: 'Test description'
      };

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          model: 'llama2',
          systemPrompt: 'Test prompt',
          color: '#3B82F6'
        }
      ];

      await expect(experimentService.startExperiment(task, agents))
        .rejects.toThrow('Failed to start experiment: Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const task = {
        id: 'task-1',
        prompt: 'Test task',
        description: 'Test description'
      };

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          model: 'llama2',
          systemPrompt: 'Test prompt',
          color: '#3B82F6'
        }
      ];

      await expect(experimentService.startExperiment(task, agents))
        .rejects.toThrow('Network error');
    });
  });

  describe('getExperiment', () => {
    it('should get experiment successfully', async () => {
      const mockResponse = {
        experiment_id: 'test-exp-1',
        status: 'running',
        conversation: {
          id: 'conv-1',
          messages: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await experimentService.getExperiment('test-exp-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/experiments/test-exp-1')
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle experiment not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(experimentService.getExperiment('non-existent'))
        .rejects.toThrow('Failed to get experiment: Not Found');
    });
  });

  describe('listExperiments', () => {
    it('should list experiments successfully', async () => {
      const mockResponse = {
        experiments: [
          {
            experiment_id: 'exp-1',
            title: 'Test Experiment 1',
            status: 'completed',
            created_at: '2024-01-15T10:00:00Z',
            agent_count: 2
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await experimentService.listExperiments();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/experiments')
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
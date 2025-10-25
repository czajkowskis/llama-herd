import { backendStorageService } from './backendStorageService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('backendStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExperiments', () => {
    it('should fetch experiments successfully', async () => {
      const mockApiResponse = {
        experiments: [
          {
            experiment_id: 'exp-1',
            title: 'Test Experiment',
            agents: [{ id: 'agent-1', name: 'Test Agent', model: 'llama2', prompt: 'Test prompt', color: '#3B82F6' }],
            status: 'completed',
            created_at: '2024-01-15T10:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await backendStorageService.getExperiments();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/experiments');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('exp-1');
      expect(result[0].title).toBe('Test Experiment');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await backendStorageService.getExperiments();
      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await backendStorageService.getExperiments();
      expect(result).toEqual([]);
    });
  });

  describe('getConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          agents: [{ id: 'agent-1', name: 'Test Agent', color: '#3B82F6', model: 'llama2' }],
          messages: [{ id: 'msg-1', agentId: 'agent-1', content: 'Hello', timestamp: '2024-01-15T10:01:00Z' }],
          createdAt: '2024-01-15T10:00:00Z',
          importedAt: '2024-01-15T10:00:00Z',
          source: 'import' as const
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversations: mockConversations }),
      } as Response);

      const result = await backendStorageService.getConversations();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/conversations');

      expect(result).toEqual(mockConversations);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await backendStorageService.getConversations();
      expect(result).toEqual([]);
    });
  });

  describe('saveExperiment', () => {
    it('should save experiment successfully', async () => {
      const mockExperiment = {
        id: 'exp-1',
        title: 'Test Experiment',
        task: { id: 'task-1', prompt: 'Test task', description: 'Test description' },
        agents: [{ id: 'agent-1', name: 'Test Agent', model: 'llama2', prompt: 'Test prompt', color: '#3B82F6' }],
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        iterations: 1,
        currentIteration: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await backendStorageService.saveExperiment(mockExperiment);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/experiments/exp-1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockExperiment),
        })
      );

      expect(result).toBe(true);
    });

    it('should handle 404 as success (experiment not yet in storage)', async () => {
      const mockExperiment = {
        id: 'exp-1',
        title: 'Test Experiment',
        task: { id: 'task-1', prompt: 'Test task', description: 'Test description' },
        agents: [{ id: 'agent-1', name: 'Test Agent', model: 'llama2', prompt: 'Test prompt', color: '#3B82F6' }],
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        iterations: 1,
        currentIteration: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await backendStorageService.saveExperiment(mockExperiment);

      expect(result).toBe(true);
    });

    it('should handle other API errors', async () => {
      const mockExperiment = {
        id: 'exp-1',
        title: 'Test Experiment',
        task: { id: 'task-1', prompt: 'Test task', description: 'Test description' },
        agents: [{ id: 'agent-1', name: 'Test Agent', model: 'llama2', prompt: 'Test prompt', color: '#3B82F6' }],
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        iterations: 1,
        currentIteration: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await backendStorageService.saveExperiment(mockExperiment);

      expect(result).toBe(false);
    });
  });

  describe('deleteExperiment', () => {
    it('should delete experiment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await backendStorageService.deleteExperiment('exp-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/experiments/exp-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBe(true);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await backendStorageService.deleteExperiment('exp-1');
      expect(result).toBe(false);
    });
  });

  describe('saveConversation', () => {
    it('should save conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        agents: [{ id: 'agent-1', name: 'Test Agent', color: '#3B82F6', model: 'llama2' }],
        messages: [{ id: 'msg-1', agentId: 'agent-1', content: 'Hello', timestamp: '2024-01-15T10:01:00Z' }],
        createdAt: '2024-01-15T10:00:00Z',
        importedAt: '2024-01-15T10:00:00Z',
        source: 'import' as const
      };

      // Mock the getConversation call first (returns null for new conversation)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      // Mock the POST call
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await backendStorageService.saveConversation(mockConversation);

      expect(result).toBe(true);
    });

    it('should handle API errors', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        agents: [{ id: 'agent-1', name: 'Test Agent', color: '#3B82F6', model: 'llama2' }],
        messages: [{ id: 'msg-1', agentId: 'agent-1', content: 'Hello', timestamp: '2024-01-15T10:01:00Z' }],
        createdAt: '2024-01-15T10:00:00Z',
        importedAt: '2024-01-15T10:00:00Z',
        source: 'import' as const
      };

      // Mock the getConversation call first
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      // Mock the POST call to fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await backendStorageService.saveConversation(mockConversation);

      expect(result).toBe(false);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await backendStorageService.deleteConversation('conv-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/conversations/conv-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBe(true);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await backendStorageService.deleteConversation('conv-1');
      expect(result).toBe(false);
    });
  });
});

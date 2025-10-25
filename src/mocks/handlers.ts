import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Ollama API
  http.get('*/api/models/list', () => {
    return HttpResponse.json({
      models: [
        { name: 'llama2', size: 3825819519, digest: 'sha256:abc123', modified_at: '2024-01-15T10:00:00Z' },
        { name: 'codellama', size: 3825819519, digest: 'sha256:def456', modified_at: '2024-01-15T10:00:00Z' },
        { name: 'mistral', size: 4100000000, digest: 'sha256:ghi789', modified_at: '2024-01-15T10:00:00Z' }
      ]
    });
  }),

  // Mock experiment API
  http.post('*/api/experiments/start', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      experimentId: 'test-exp-1',
      status: 'running',
      message: 'Experiment started successfully'
    });
  }),

  http.get('*/api/experiments/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      experimentId: id,
      status: 'running',
      conversation: {
        id: 'conv-1',
        title: 'Test Conversation',
        agents: [
          {
            id: 'agent-1',
            name: 'Test Agent 1',
            color: '#3B82F6',
            model: 'llama2'
          },
          {
            id: 'agent-2',
            name: 'Test Agent 2',
            color: '#10B981',
            model: 'llama2'
          }
        ],
        messages: [
          {
            id: 'msg-1',
            agentId: 'agent-1',
            content: 'Hello, this is a test message.',
            timestamp: '2024-01-15T10:01:00Z'
          },
          {
            id: 'msg-2',
            agentId: 'agent-2',
            content: 'This is a response message.',
            timestamp: '2024-01-15T10:02:00Z'
          }
        ],
        createdAt: '2024-01-15T10:00:00Z'
      }
    });
  }),

  http.post('*/api/experiments/:id/stop', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      experimentId: id,
      status: 'stopped',
      message: 'Experiment stopped successfully'
    });
  }),

  http.get('*/api/experiments', () => {
    return HttpResponse.json({
      experiments: [
        {
          id: 'exp-1',
          name: 'Test Experiment 1',
          status: 'completed',
          createdAt: '2024-01-15T10:00:00Z',
          task: {
            prompt: 'Test task 1',
            description: 'Test description 1'
          },
          agents: [
            {
              name: 'Agent 1',
              model: 'llama2',
              color: '#3B82F6'
            }
          ]
        },
        {
          id: 'exp-2',
          name: 'Test Experiment 2',
          status: 'running',
          createdAt: '2024-01-16T10:00:00Z',
          task: {
            prompt: 'Test task 2',
            description: 'Test description 2'
          },
          agents: [
            {
              name: 'Agent 2',
              model: 'codellama',
              color: '#10B981'
            }
          ]
        }
      ]
    });
  }),

  // Mock conversation API
  http.get('*/api/conversations', () => {
    return HttpResponse.json({
      conversations: [
        {
          id: 'conv-1',
          title: 'Test Conversation 1',
          agents: [
            {
              id: 'agent-1',
              name: 'Test Agent 1',
              color: '#3B82F6',
              model: 'llama2'
            }
          ],
          messages: [
            {
              id: 'msg-1',
              agentId: 'agent-1',
              content: 'Test message content',
              timestamp: '2024-01-15T10:01:00Z'
            }
          ],
          createdAt: '2024-01-15T10:00:00Z'
        }
      ]
    });
  }),

  http.post('*/api/conversations/import', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      conversationId: 'imported-conv-1',
      message: 'Conversation imported successfully'
    });
  }),

  // Mock WebSocket connection (for integration tests)
  http.get('*/ws/experiments/:id', () => {
    return new HttpResponse(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    });
  }),

  // Mock error responses for testing error handling
  http.get('*/api/error-test', () => {
    return HttpResponse.json(
      { error: 'Test error message' },
      { status: 500 }
    );
  }),

  http.post('*/api/error-test', () => {
    return HttpResponse.json(
      { error: 'Test error message' },
      { status: 400 }
    );
  }),
];

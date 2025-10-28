import { ExportService, Message, ConversationAgent, CanvasRenderer } from './exportService';

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockClick = jest.fn();
const mockToDataURL = jest.fn();

// Mock Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toDataURL: mockToDataURL
};

const mockContext = {
  scale: jest.fn(),
  fillStyle: '',
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  roundRect: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  textAlign: 'left',
  textBaseline: 'alphabetic',
  font: '',
  fillText: jest.fn(),
  measureText: jest.fn()
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

// Mock document.fonts
Object.defineProperty(document, 'fonts', {
  value: {
    load: jest.fn().mockResolvedValue(undefined)
  },
  writable: true,
});

describe('ExportService', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      agentId: 'agent-1',
      content: 'Hello from Agent 1',
      timestamp: '2024-01-01T10:00:00Z'
    },
    {
      id: 'msg-2',
      agentId: 'agent-2',
      content: 'Hello from Agent 2',
      timestamp: '2024-01-01T10:01:00Z'
    }
  ];

  const mockAgents: ConversationAgent[] = [
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
      model: 'codellama'
    }
  ];

  const mockGetAgentById = jest.fn((id: string) => {
    const agent = mockAgents.find(agent => agent.id === id);
    console.log(`getAgentById called with ${id}, found:`, agent);
    return agent;
  });

  const mockFormatTimestamp = jest.fn((timestamp: string) => 
    new Date(timestamp).toLocaleString()
  );

  const mockStyle = {
    theme: 'dark' as const,
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    messageBackgroundColor: '#374151',
    borderRadius: 12,
    padding: 24,
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    showTimestamps: true,
    showModels: true,
    showAgentAvatars: true,
    scale: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock canvas creation
    mockCreateElement.mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      if (tagName === 'a') {
        return {
          download: '',
          href: '',
          click: mockClick
        };
      }
      return {};
    });

    // Mock canvas context
    mockCanvas.getContext.mockReturnValue(mockContext);
    mockToDataURL.mockReturnValue('data:image/png;base64,mockdata');
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    
    // Mock text measurement
    mockContext.measureText.mockReturnValue({ width: 100 });
    
    // Reset mock functions
    mockContext.fillRect.mockClear();
    mockContext.fillText.mockClear();
    mockContext.beginPath.mockClear();
    mockContext.fill.mockClear();
    
    // Reset getAgentById mock
    mockGetAgentById.mockClear();
    mockGetAgentById.mockImplementation((id: string) => {
      const agent = mockAgents.find(agent => agent.id === id);
      return agent;
    });
  });

  describe('CanvasRenderer', () => {
    it('should create canvas renderer with correct options', () => {
      const renderer = new CanvasRenderer({
        messages: mockMessages,
        agents: mockAgents,
        style: mockStyle,
        getAgentById: mockGetAgentById,
        formatTimestamp: mockFormatTimestamp
      });

      expect(renderer).toBeInstanceOf(CanvasRenderer);
    });

    it('should render canvas with messages', async () => {
      const renderer = new CanvasRenderer({
        messages: mockMessages,
        agents: mockAgents,
        style: mockStyle,
        getAgentById: mockGetAgentById,
        formatTimestamp: mockFormatTimestamp
      });

      const canvas = await renderer.render();

      expect(canvas).toBe(mockCanvas);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should call progress callback during rendering', async () => {
      const progressCallback = jest.fn();
      const renderer = new CanvasRenderer({
        messages: mockMessages,
        agents: mockAgents,
        style: mockStyle,
        getAgentById: mockGetAgentById,
        formatTimestamp: mockFormatTimestamp,
        onProgress: progressCallback
      });

      await renderer.render();

      expect(progressCallback).toHaveBeenCalledWith(50); // First message
      expect(progressCallback).toHaveBeenCalledWith(100); // Second message
    });

    it('should handle cancellation', async () => {
      const abortController = new AbortController();
      const renderer = new CanvasRenderer({
        messages: mockMessages,
        agents: mockAgents,
        style: mockStyle,
        getAgentById: mockGetAgentById,
        formatTimestamp: mockFormatTimestamp,
        abortController
      });

      // Abort before rendering
      abortController.abort();

      await expect(renderer.render()).rejects.toThrow('Export cancelled');
    });

    it('should strip markdown from content', () => {
      const renderer = new CanvasRenderer({
        messages: [{ ...mockMessages[0], content: '**Bold** and `code`' }],
        agents: mockAgents,
        style: mockStyle,
        getAgentById: mockGetAgentById,
        formatTimestamp: mockFormatTimestamp
      });

      // Access private method for testing
      const stripMarkdown = (renderer as any).stripMarkdown;
      const result = stripMarkdown('**Bold** and `code`');
      
      expect(result).toBe('Bold and code');
    });
  });

  describe('exportAsPNG', () => {
    it('should export PNG using CanvasRenderer', async () => {
      await ExportService.exportAsPNG(
        mockMessages,
        mockAgents,
        mockStyle,
        'test-conversation',
        mockGetAgentById,
        mockFormatTimestamp
      );

      expect(mockCreateElement).toHaveBeenCalledWith('canvas');
      expect(mockToDataURL).toHaveBeenCalledWith('image/png');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle progress callbacks', async () => {
      const progressCallback = jest.fn();
      
      await ExportService.exportAsPNG(
        mockMessages,
        mockAgents,
        mockStyle,
        'test-conversation',
        mockGetAgentById,
        mockFormatTimestamp,
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle cancellation', async () => {
      const abortController = new AbortController();
      
      // Abort before export
      abortController.abort();

      await expect(
        ExportService.exportAsPNG(
          mockMessages,
          mockAgents,
          mockStyle,
          'test-conversation',
          mockGetAgentById,
          mockFormatTimestamp,
          undefined,
          abortController
        )
      ).rejects.toThrow('Export cancelled');
    });

    it('should handle rendering errors', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      await expect(
        ExportService.exportAsPNG(
          mockMessages,
          mockAgents,
          mockStyle,
          'test-conversation',
          mockGetAgentById,
          mockFormatTimestamp
        )
      ).rejects.toThrow('Failed to export as PNG');
    });
  });

  describe('exportAsJSON', () => {
    it('should export conversation to JSON format', () => {
      ExportService.exportAsJSON(mockMessages, mockAgents, 'test-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle empty conversation', () => {
      ExportService.exportAsJSON([], [], 'empty-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle conversation with special characters', () => {
      const specialCharMessages: Message[] = [
        {
          id: 'msg-1',
          agentId: 'agent-1',
          content: 'Message with "quotes" & <tags>',
          timestamp: '2024-01-01T10:00:00Z'
        }
      ];

      const specialCharAgents: ConversationAgent[] = [
        {
          id: 'agent-1',
          name: 'Agent with "quotes"',
          color: '#3B82F6',
          model: 'llama2'
        }
      ];

      ExportService.exportAsJSON(specialCharMessages, specialCharAgents, 'special-chars');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportAsMarkdown', () => {
    it('should export conversation to Markdown format', () => {
      ExportService.exportAsMarkdown(mockMessages, mockAgents, 'test-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle markdown content in messages', () => {
      const markdownMessages: Message[] = [
        {
          id: 'msg-1',
          agentId: 'agent-1',
          content: 'Here is some **bold** text and `code`.',
          timestamp: '2024-01-01T10:00:00Z'
        }
      ];

      ExportService.exportAsMarkdown(markdownMessages, mockAgents, 'markdown-test');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle empty conversation', () => {
      ExportService.exportAsMarkdown([], [], 'empty-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportAsText', () => {
    it('should export conversation to text format', () => {
      ExportService.exportAsText(mockMessages, mockAgents, 'test-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle empty conversation', () => {
      ExportService.exportAsText([], [], 'empty-conversation');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('generateCustomCSS', () => {
    it('should generate custom CSS with provided style', () => {
      const customStyle = {
        theme: 'dark' as const,
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        messageBackgroundColor: '#374151',
        borderRadius: 12,
        padding: 24,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        showTimestamps: true,
        showModels: true,
        showAgentAvatars: true,
        customCSS: '.custom { color: red; }'
      };

      const css = ExportService.generateCustomCSS(customStyle);

      expect(css).toContain('font-family: Inter, sans-serif');
      expect(css).toContain('background-color: #1f2937');
      expect(css).toContain('color: #ffffff');
      expect(css).toContain('font-size: 14px');
    });
  });
});
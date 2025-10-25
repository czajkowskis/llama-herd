import { ExportService, Message, ConversationAgent } from './exportService';

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockClick = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock link element
    const mockLink = {
      download: '',
      href: '',
      click: mockClick
    };
    
    mockCreateElement.mockReturnValue(mockLink);
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
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
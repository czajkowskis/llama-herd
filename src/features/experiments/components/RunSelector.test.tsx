import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RunSelector } from './RunSelector';
import { Conversation } from '../../../types/index.d';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper to create mock conversations
const createMockConversation = (
  id: string,
  title: string,
  timestamp: string,
  messageCount: number = 5,
  experimentId: string = 'exp-1'
): Conversation => ({
  id,
  title,
  createdAt: timestamp,
  experiment_id: experimentId,
  agents: [
    { id: 'agent-1', name: 'Agent 1', color: '#FF0000', model: 'llama2' },
    { id: 'agent-2', name: 'Agent 2', color: '#00FF00', model: 'llama2' },
  ],
  messages: Array.from({ length: messageCount }, (_, i) => ({
    id: `msg-${i}`,
    agentId: i % 2 === 0 ? 'agent-1' : 'agent-2',
    content: `Message ${i + 1} content`,
    timestamp: new Date(Date.parse(timestamp) + i * 1000).toISOString(),
  })),
});

describe('RunSelector', () => {
  const mockOnSelectRun = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Basic rendering', () => {
    it('should render basic header and in-progress indicator when applicable', () => {
      const conversations: Conversation[] = [];
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={true}
          status="running"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      expect(screen.getByText('Browse runs:')).toBeInTheDocument();
      expect(screen.getByText('Run 1 (in progress)')).toBeInTheDocument();
    });

    it('should show "Run 1 (in progress)" when no completed runs and status is running', () => {
      const conversations: Conversation[] = [];
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={true}
          status="running"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      expect(screen.getByText('Run 1 (in progress)')).toBeInTheDocument();
    });

    it('should not show dropdown when there are no completed conversations', () => {
      const conversations: Conversation[] = [];
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={true}
          status="running"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      expect(screen.queryByText(/Runs \(/)).not.toBeInTheDocument();
    });

    it('should show dropdown button when there are completed conversations', () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      expect(screen.getByText('Runs (1)')).toBeInTheDocument();
    });
  });

  describe('Dropdown behavior', () => {
    it('should open dropdown when clicking the runs button', () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      const dropdownButton = screen.getByText('Runs (1)');
      fireEvent.click(dropdownButton);

      expect(screen.getByPlaceholderText('Search by title or timestamp...')).toBeInTheDocument();
      expect(screen.getByText('Run 1')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      ];
      
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <RunSelector
            completedConversations={conversations}
            selectedConversation={null}
            isViewingLive={false}
            status="completed"
            liveConversation={null}
            onSelectRun={mockOnSelectRun}
          />
        </div>
      );

      // Open dropdown
      const dropdownButton = screen.getByText('Runs (1)');
      fireEvent.click(dropdownButton);
      expect(screen.getByPlaceholderText('Search by title or timestamp...')).toBeInTheDocument();

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search by title or timestamp...')).not.toBeInTheDocument();
      });
    });

    it('should display runs sorted newest-first', () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
        createMockConversation('2', 'Run 2', '2023-10-18T11:00:00Z'),
        createMockConversation('3', 'Run 3', '2023-10-18T09:00:00Z'),
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      const runElements = screen.getAllByText(/Run \d/);
      expect(runElements[0]).toHaveTextContent('Run 2'); // Newest
      expect(runElements[1]).toHaveTextContent('Run 1');
      expect(runElements[2]).toHaveTextContent('Run 3'); // Oldest
    });
  });

  describe('Search functionality', () => {
    const conversations = [
      createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      createMockConversation('2', 'Alpha Test', '2023-10-18T11:00:00Z'),
      createMockConversation('3', 'Beta Test', '2023-10-18T12:00:00Z'),
    ];

    it('should filter runs by title (case-insensitive)', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));
      
      const searchInput = screen.getByPlaceholderText('Search by title or timestamp...');
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      expect(screen.getByText(/Alpha/)).toBeInTheDocument();
      expect(screen.getByText(/Test/)).toBeInTheDocument();
      expect(screen.queryByText(/Run 1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Beta/)).not.toBeInTheDocument();
    });

    it('should filter runs by title substring', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));
      
      const searchInput = screen.getByPlaceholderText('Search by title or timestamp...');
      // Search by a word unique to Run 1
      fireEvent.change(searchInput, { target: { value: 'Run' } });

      // Should not show Alpha or Beta
      expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Beta/)).not.toBeInTheDocument();
      // Footer should show 1 of 3
      expect(screen.getByText('1 of 3 runs')).toBeInTheDocument();
    });

    it('should highlight matching text in search results', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));
      
      const searchInput = screen.getByPlaceholderText('Search by title or timestamp...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const highlights = document.querySelectorAll('mark');
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0]).toHaveTextContent('Test');
    });

    it('should show "No runs found" when search returns no results', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));
      
      const searchInput = screen.getByPlaceholderText('Search by title or timestamp...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No runs found')).toBeInTheDocument();
    });
  });

  describe('Pin/star functionality', () => {
    const conversations = [
      createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      createMockConversation('2', 'Run 2', '2023-10-18T11:00:00Z'),
      createMockConversation('3', 'Run 3', '2023-10-18T12:00:00Z'),
    ];

    it('should pin a run when clicking the star button', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      const starButtons = screen.getAllByTitle('Pin run');
      fireEvent.click(starButtons[0]);

      // Check that it's marked as pinned (title changes)
      expect(screen.getByTitle('Unpin run')).toBeInTheDocument();
    });

    it('should unpin a run when clicking the star button again', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      const starButtons = screen.getAllByTitle('Pin run');
      fireEvent.click(starButtons[0]); // Pin
      fireEvent.click(screen.getByTitle('Unpin run')); // Unpin

      // All should be unpinned again
      const pinnedButtons = screen.queryAllByTitle('Unpin run');
      expect(pinnedButtons.length).toBe(0);
    });

    it('should persist pinned runs to localStorage', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      const starButtons = screen.getAllByTitle('Pin run');
      fireEvent.click(starButtons[0]);

      const stored = localStorage.getItem('llama-herd-pinned-runs');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed['exp-1']).toContain('3'); // Run 3 (newest, first in list)
    });

    it('should load pinned runs from localStorage on mount', () => {
      // Pre-populate localStorage
      localStorage.setItem('llama-herd-pinned-runs', JSON.stringify({
        'exp-1': ['2'],
      }));

      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      // Run 2 should be pinned
      expect(screen.getByTitle('Unpin run')).toBeInTheDocument();
    });

    it('should display pinned runs at the top of the list', () => {
      // Pin Run 1 (oldest)
      localStorage.setItem('llama-herd-pinned-runs', JSON.stringify({
        'exp-1': ['1'],
      }));

      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      const runElements = screen.getAllByText(/Run \d/);
      expect(runElements[0]).toHaveTextContent('Run 1'); // Pinned, so first
      expect(runElements[1]).toHaveTextContent('Run 3'); // Newest unpinned
      expect(runElements[2]).toHaveTextContent('Run 2'); // Older unpinned
    });

    it('should show pinned count in footer', () => {
      localStorage.setItem('llama-herd-pinned-runs', JSON.stringify({
        'exp-1': ['1', '2'],
      }));

      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (3)'));

      expect(screen.getByText(/2 pinned/)).toBeInTheDocument();
    });
  });

  describe('Run selection', () => {
    const conversations = [
      createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'),
      createMockConversation('2', 'Run 2', '2023-10-18T11:00:00Z'),
    ];

    // Live button removed: selection is controlled via header CTA and dropdown

    it('should call onSelectRun when clicking a run in the dropdown', () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (2)'));
      fireEvent.click(screen.getByText('Run 1'));

      expect(mockOnSelectRun).toHaveBeenCalledWith(conversations[0], false);
    });

    it('should close dropdown after selecting a run', async () => {
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (2)'));
      expect(screen.getByPlaceholderText('Search by title or timestamp...')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Run 1'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search by title or timestamp...')).not.toBeInTheDocument();
      });
    });

    it('should highlight selected run in dropdown', () => {
      const selectedConv = conversations[0];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={selectedConv}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Run 1'));

      // Selected run should have a bullet indicator
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('should show selected run title in dropdown button', () => {
      const selectedConv = conversations[0];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={selectedConv}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      expect(screen.getByText('Run 1')).toBeInTheDocument();
    });
  });

  describe('Tooltip preview', () => {
    it('should show message count for each run', () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z', 5),
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (1)'));

      expect(screen.getByText('5 msgs')).toBeInTheDocument();
    });

    it('should show singular "msg" for 1 message', () => {
      const conversations = [
        createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z', 1),
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (1)'));

      expect(screen.getByText('1 msg')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle conversations without experiment_id', () => {
      const conversations = [
        { ...createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'), experiment_id: undefined },
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (1)'));

      // Should still render
      expect(screen.getByText('Run 1')).toBeInTheDocument();
    });

    it('should handle empty messages array', () => {
      const conversations = [
        { ...createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z', 0), messages: [] },
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (1)'));

      expect(screen.getByText('0 msgs')).toBeInTheDocument();
    });

    it('should not break when clicking pin without experiment_id', () => {
      const conversations = [
        { ...createMockConversation('1', 'Run 1', '2023-10-18T10:00:00Z'), experiment_id: undefined },
      ];
      
      render(
        <RunSelector
          completedConversations={conversations}
          selectedConversation={null}
          isViewingLive={false}
          status="completed"
          liveConversation={null}
          onSelectRun={mockOnSelectRun}
        />
      );

      fireEvent.click(screen.getByText('Runs (1)'));

      const starButton = screen.getByTitle('Pin run');
      fireEvent.click(starButton);

      // Should not crash
      expect(screen.getByTitle('Pin run')).toBeInTheDocument();
    });
  });
});

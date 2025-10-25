import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageActions, CopyButton } from './MessageActions';
import { Message, ConversationAgent } from '../../../types/index.d';

describe('CopyButton', () => {
  it('renders the copy button', () => {
    const onCopyText = jest.fn();
    render(<CopyButton onCopyText={onCopyText} />);
    
    const button = screen.getByRole('button', { name: /copy message text/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onCopyText when clicked', () => {
    const onCopyText = jest.fn();
    render(<CopyButton onCopyText={onCopyText} />);
    
    const button = screen.getByRole('button', { name: /copy message text/i });
    fireEvent.click(button);
    
    expect(onCopyText).toHaveBeenCalledTimes(1);
  });
});

describe('MessageActions', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    agentId: 'agent-1',
    content: 'Test message content',
    timestamp: '2025-10-18T10:30:00Z',
    model: 'llama2:7b',
  };

  const mockAgent: ConversationAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    color: '#EF4444',
    model: 'llama2:7b',
  };

  const mockHandlers = {
    onViewRawJSON: jest.fn(),
    onStarMessage: jest.fn(),
    onCreateExportSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the actions button', () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    expect(button).toBeInTheDocument();
  });

  it('shows dropdown menu when button is clicked', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('View raw JSON')).toBeInTheDocument();
      expect(screen.getByText('Star message')).toBeInTheDocument();
      expect(screen.getByText('Create export selection')).toBeInTheDocument();
    });
  });

  it('calls onViewRawJSON when View raw JSON is clicked', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      const viewJsonButton = screen.getByText('View raw JSON');
      fireEvent.click(viewJsonButton);
      expect(mockHandlers.onViewRawJSON).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onStarMessage when Star message is clicked', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      const starButton = screen.getByText('Star message');
      fireEvent.click(starButton);
      expect(mockHandlers.onStarMessage).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCreateExportSelection when Create export selection is clicked', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      const exportButton = screen.getByText('Create export selection');
      fireEvent.click(exportButton);
      expect(mockHandlers.onCreateExportSelection).toHaveBeenCalledTimes(1);
    });
  });

  it('closes menu after an action is clicked', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const viewJsonButton = screen.getByText('View raw JSON');
    fireEvent.click(viewJsonButton);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes menu when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <MessageActions
          message={mockMessage}
          agent={mockAgent}
          {...mockHandlers}
        />
      </div>
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes menu when Escape key is pressed', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes', () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when menu is opened', async () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        {...mockHandlers}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('renders without optional handlers', () => {
    render(
      <MessageActions
        message={mockMessage}
        agent={mockAgent}
        onViewRawJSON={mockHandlers.onViewRawJSON}
      />
    );

    const button = screen.getByRole('button', { name: /message actions/i });
    fireEvent.click(button);

    expect(screen.getByText('View raw JSON')).toBeInTheDocument();
    expect(screen.queryByText('Star message')).not.toBeInTheDocument();
    expect(screen.queryByText('Create export selection')).not.toBeInTheDocument();
  });
});

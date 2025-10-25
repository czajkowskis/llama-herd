import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RawJSONModal } from './RawJSONModal';
import { Message, ConversationAgent } from '../../types/index.d';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('RawJSONModal', () => {
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

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with message metadata', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Message Raw JSON')).toBeInTheDocument();
    expect(screen.getAllByText(/msg-1/).length).toBeGreaterThan(0);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getAllByText(/llama2:7b/).length).toBeGreaterThan(0);
  });

  it('displays the JSON content', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const jsonContent = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'pre' && content.includes('"id": "msg-1"');
    });
    expect(jsonContent).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Close button in footer is clicked', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /^close$/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking on backdrop', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking modal content', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const modalContent = screen.getByText('Message Raw JSON').closest('div');
    if (modalContent) {
      fireEvent.click(modalContent);
    }

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes when Escape key is pressed', async () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('copies JSON to clipboard when Copy JSON button is clicked', async () => {
    const writeTextMock = navigator.clipboard.writeText as jest.Mock;
    writeTextMock.mockResolvedValue(undefined);

    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy json/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('"id": "msg-1"'));
    });
  });

  it('shows success message after copying', async () => {
    const writeTextMock = navigator.clipboard.writeText as jest.Mock;
    writeTextMock.mockResolvedValue(undefined);

    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy json/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('handles missing agent gracefully', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={undefined}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'raw-json-modal-title');
  });

  it('displays formatted timestamp', () => {
    render(
      <RawJSONModal
        message={mockMessage}
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );

    // The timestamp should be formatted by toLocaleString
    const timestamp = new Date(mockMessage.timestamp).toLocaleString();
    expect(screen.getByText(timestamp)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebugPanel, DebugMessage } from './DebugPanel';

describe('DebugPanel', () => {
  const mockMessages: DebugMessage[] = [
    {
      timestamp: '2025-10-18T10:00:00Z',
      type: 'sent',
      content: 'Ping message sent',
      data: { type: 'ping' },
    },
    {
      timestamp: '2025-10-18T10:00:01Z',
      type: 'received',
      content: 'message',
      data: { type: 'message', data: { content: 'Hello' } },
    },
    {
      timestamp: '2025-10-18T10:00:02Z',
      type: 'error',
      content: 'Connection error',
      data: { error: 'Network failure' },
    },
    {
      timestamp: '2025-10-18T10:00:03Z',
      type: 'info',
      content: 'Connection state: reconnecting',
    },
  ];

  it('renders collapsed by default', () => {
    render(<DebugPanel messages={mockMessages} />);
    
    expect(screen.getByText(/Debug Panel/)).toBeInTheDocument();
    expect(screen.getByText(/\(4 messages\)/)).toBeInTheDocument();
    expect(screen.queryByText('Ping message sent')).not.toBeInTheDocument();
  });

  it('expands and shows messages when clicked', () => {
    render(<DebugPanel messages={mockMessages} />);
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Ping message sent')).toBeInTheDocument();
    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(screen.getByText(/Connection state: reconnecting/)).toBeInTheDocument();
  });

  it('shows server error in expanded view', () => {
    render(
      <DebugPanel
        messages={mockMessages}
        serverError="Internal server error"
      />
    );
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(screen.getAllByText('Server Error').length).toBeGreaterThan(0);
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
  });

  it('displays server error badge when collapsed', () => {
    render(
      <DebugPanel
        messages={mockMessages}
        serverError="Internal server error"
      />
    );
    
    expect(screen.getByText('Server Error')).toBeInTheDocument();
  });

  it('shows message type indicators', () => {
    render(<DebugPanel messages={mockMessages} />);
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Check that all message types are displayed
    expect(screen.getByText('Ping message sent')).toBeInTheDocument();
    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(screen.getByText(/Connection state: reconnecting/)).toBeInTheDocument();
  });

  it('expands message to show raw data when clicked', () => {
    render(<DebugPanel messages={mockMessages} />);
    
    // Expand panel
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Click on first message
    const firstMessage = screen.getByText('Ping message sent');
    fireEvent.click(firstMessage);
    
    // Should show raw data
    expect(screen.getByText('Raw Data:')).toBeInTheDocument();
    expect(screen.getByText(/"type": "ping"/)).toBeInTheDocument();
  });

  it('limits messages to maxMessages', () => {
    const manyMessages: DebugMessage[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: `2025-10-18T10:00:${i.toString().padStart(2, '0')}Z`,
      type: 'info' as const,
      content: `Message ${i}`,
    }));
    
    render(<DebugPanel messages={manyMessages} maxMessages={10} />);
    
    expect(screen.getByText(/\(10 messages\)/)).toBeInTheDocument();
  });

  it('shows "No messages yet" when empty', () => {
    render(<DebugPanel messages={[]} />);
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('handles singular message count correctly', () => {
    const singleMessage: DebugMessage[] = [
      {
        timestamp: '2025-10-18T10:00:00Z',
        type: 'info',
        content: 'Single message',
      },
    ];
    
    render(<DebugPanel messages={singleMessage} />);
    
    expect(screen.getByText(/\(1 message\)/)).toBeInTheDocument();
  });

  it('copies message data to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
    
    render(<DebugPanel messages={mockMessages} />);
    
    // Expand panel
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Click on first message to expand
    const firstMessage = screen.getByText('Ping message sent');
    fireEvent.click(firstMessage);
    
    // Click copy button
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' }, null, 2)
    );
  });

  it('collapses message when clicked again', () => {
    render(<DebugPanel messages={mockMessages} />);
    
    // Expand panel
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Click on first message to expand
    const firstMessage = screen.getByText('Ping message sent');
    fireEvent.click(firstMessage);
    expect(screen.getByText('Raw Data:')).toBeInTheDocument();
    
    // Click again to collapse
    fireEvent.click(firstMessage);
    expect(screen.queryByText('Raw Data:')).not.toBeInTheDocument();
  });
});

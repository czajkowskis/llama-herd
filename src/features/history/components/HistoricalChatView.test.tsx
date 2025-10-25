import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the UI preferences service BEFORE importing the component
jest.mock('../../../services/uiPreferencesService', () => ({
  getStarredMessages: jest.fn(() => new Set(['msg-1'])),
  toggleStarredMessage: jest.fn(),
}));

// Mock ReactMarkdown
jest.mock('react-markdown', () => ({ __esModule: true, default: (props: any) => <div>{props.children}</div> }));

// Mock the date time service
jest.mock('../../../services/dateTimeService', () => ({
  formatTimeShort: jest.fn((timestamp: string) => new Date(timestamp).toLocaleTimeString()),
  formatDateLabel: jest.fn((timestamp: string) => new Date(timestamp).toLocaleDateString()),
  isSameLocalDate: jest.fn(() => false),
}));

// Now import the component after mocks are set up
import { HistoricalChatView } from './HistoricalChatView';
import { StoredConversation } from '../../../services/backendStorageService';

describe('HistoricalChatView', () => {
  const mockConversation: StoredConversation = {
    id: 'conv-1',
    title: 'Test Conversation',
    agents: [
      {
        id: 'agent-1',
        name: 'Test Agent 1',
        model: 'llama2',
        systemPrompt: 'Test prompt 1',
        color: '#3B82F6'
      }
    ],
    messages: [],
    createdAt: '2024-01-01T09:59:00Z',
    importedAt: '2024-01-01T09:59:00Z',
    source: 'import',
  };

  it('should handle empty conversation', () => {
    render(<HistoricalChatView conversation={mockConversation} />);
    
    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
  });

  it('should render without crashing with empty messages', () => {
    expect(() => {
      render(<HistoricalChatView conversation={mockConversation} />);
    }).not.toThrow();
  });
});
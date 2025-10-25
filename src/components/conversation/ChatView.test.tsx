import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatView } from './ChatView';
import { Conversation, ConversationAgent, Message } from '../../types/index.d';

// Mock ReactMarkdown to avoid parsing overhead
jest.mock('react-markdown', () => ({ __esModule: true, default: (props: any) => <div>{props.children}</div> }));

// Stub navigator.clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn() },
});

const agents: ConversationAgent[] = [
  { id: 'u', name: 'User', color: '#888888', model: 'User' },
  { id: 'a', name: 'Alpha', color: '#3366ff', model: 'alpha' },
];

const baseConv = (messages: Message[]): Conversation => ({
  id: 'conv-1',
  title: 'Test',
  agents,
  createdAt: new Date('2025-10-18T10:00:00Z').toISOString(),
  messages,
});

const getAgentById = (id: string) => agents.find(a => a.id === id);
const getContrastColor = () => '#fff';
const formatTimestampPassthrough = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

describe('ChatView - date separators and time formatting', () => {
  it('inserts a date separator when day changes', () => {
    const messages: Message[] = [
      { id: 'm1', agentId: 'a', content: 'Day 1', timestamp: '2025-10-18T12:00:00.000Z' },
      { id: 'm2', agentId: 'u', content: 'Day 2', timestamp: '2025-10-19T12:00:00.000Z' },
    ];
    render(
      <ChatView
        conversation={baseConv(messages)}
        onBackToList={() => {}}
        getAgentById={getAgentById}
        getContrastColor={getContrastColor}
        formatTimestamp={formatTimestampPassthrough}
      />
    );
    // With new rule, only one separator appears at the date change (not at start)
    const separators = document.querySelectorAll('.date-separator');
    expect(separators.length).toBe(1);
  });

  it('respects 12/24h preference through dateTimeService', () => {
    jest.resetModules();
    // Mock getTimeFormatPreference to force 24h
    jest.doMock('../../services/uiPreferencesService', () => ({
      getTimeFormatPreference: () => '24h',
      getStarredMessages: () => new Set<string>(),
      toggleStarredMessage: () => true,
    }));
    const { formatTimeShort } = require('../../services/dateTimeService');
    const s = formatTimeShort('2025-10-18T13:05:00.000Z');
    // 24h format should not contain AM/PM
    expect(/am|pm/i.test(s)).toBe(false);
  });
});

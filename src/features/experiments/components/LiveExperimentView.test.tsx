import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as experimentServiceModule from '../../../services/experimentService';
import { ExperimentStatusResponse, Conversation } from '../../../types/index.d';

// Mock ESM-only modules before component import
jest.mock('react-markdown', () => ({ __esModule: true, default: (props: any) => <div>{props.children}</div> }));

// Now import component under test
import { LiveExperimentView } from './LiveExperimentView';

// Basic fake data
const agents = [
  { id: 'a1', name: 'Alpha', color: '#3366ff', model: 'gpt-alpha' },
  { id: 'a2', name: 'Beta', color: '#ff6633', model: 'gpt-beta' },
  { id: 'u1', name: 'User', color: '#888888', model: 'User' },
  { id: 's1', name: 'System', color: '#555555', model: 'System' },
];

const baseConversation: Conversation = {
  id: 'conv-1',
  title: 'Test Conversation',
  agents,
  createdAt: new Date().toISOString(),
  messages: [
    { id: 'm1', agentId: 'a1', content: 'Hello world', timestamp: new Date().toISOString() },
    { id: 'm2', agentId: 'a2', content: 'Reply message', timestamp: new Date().toISOString() },
    { id: 'm3', agentId: 'u1', content: 'User says hi', timestamp: new Date().toISOString() },
    { id: 'm4', agentId: 's1', content: 'System note', timestamp: new Date().toISOString() },
  ],
};

const experimentStatus: ExperimentStatusResponse = {
  experiment_id: 'exp-1',
  status: 'running',
  conversation: baseConversation,
  conversations: [],
};

// Mock experimentService
jest.mock('../../services/experimentService');

const mockConnect = jest.fn();

beforeEach(() => {
  (experimentServiceModule.experimentService.getExperiment as jest.Mock).mockResolvedValue(experimentStatus);
  mockConnect.mockReturnValue(() => {});
  (experimentServiceModule.experimentService.connectToExperiment as unknown as jest.Mock).mockImplementation((_id: string, _cb: any) => mockConnect());
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('LiveExperimentView - alternating backgrounds', () => {
  it('renders message containers and content with structure enabling alternation', async () => {
    render(<LiveExperimentView experimentId="exp-1" onBack={() => {}} />);

    // Wait for title as a simple ready signal
    const title = await screen.findByText('Test Conversation');
    expect(title).toBeInTheDocument();

    // Outer list container
    const list = document.querySelector('.message-list');
    expect(list).toBeTruthy();

    // Each message wrapper should have .message-container
  const wrappers = list!.querySelectorAll('.message-container');
  // System message is hidden; expect 3 visible
  expect(wrappers.length).toBe(3);

    // Inner content should be present with class .message-content to receive bg
    wrappers.forEach(w => {
      const content = w.querySelector('.message-content');
      expect(content).toBeTruthy();
    });
  });

  it('starring a message does not change ordering or count and shows star badge', async () => {
    render(<LiveExperimentView experimentId="exp-1" onBack={() => {}} />);

    // Wait for load
    await screen.findByText('Test Conversation');

    const list = document.querySelector('.message-list')!;
  const beforeCount = list.querySelectorAll('.message-container').length;
  expect(beforeCount).toBe(3);

    // Open actions of the second message (index 1)
    const actionButtons = list.querySelectorAll('button[aria-label="Message actions"]');
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(actionButtons[1] ?? actionButtons[0]);

    // Click "Star message"
    const starItem = await screen.findByText('Star message');
    fireEvent.click(starItem);

    // Badge appears
    const starredBadges = await screen.findAllByTitle('Starred message');
    expect(starredBadges.length).toBe(1);

    // Count and order remain
    const afterWrappers = list.querySelectorAll('.message-container');
  expect(afterWrappers.length).toBe(3);
  });

  it('aligns User/System messages to the right and agents to the left', async () => {
    render(<LiveExperimentView experimentId="exp-1" onBack={() => {}} />);

    await screen.findByText('Test Conversation');

    const list = document.querySelector('.message-list')!;
    const wrappers = Array.from(list.querySelectorAll('.message-container')) as HTMLElement[];

    // Agent messages (first two) should not be reversed
    expect(wrappers[0].className).not.toContain('flex-row-reverse');
    expect(wrappers[1].className).not.toContain('flex-row-reverse');

    // User message (now last visible) should be right-aligned (reversed)
    expect(wrappers[2].className).toContain('flex-row-reverse');
  });
});

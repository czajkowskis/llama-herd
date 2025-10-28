import React, { useRef, useEffect } from 'react';
import { Message, ConversationAgent } from '../../types/index.d';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  agents: ConversationAgent[];
  isViewingLive: boolean;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  newlyArrivedMessages: Set<string>;
  starredMessages: Set<string>;
  exportSelection: Set<string>;
  onCopyText: (message: Message) => void;
  onViewRawJSON: (message: Message) => void;
  onStarMessage: (messageId: string) => void;
  onCreateExportSelection: (messageId: string) => void;
}

/**
 * Message list container with filtering, scrolling, and message rendering
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  agents,
  isViewingLive,
  isFollowing,
  onFollowChange,
  newlyArrivedMessages,
  starredMessages,
  exportSelection,
  onCopyText,
  onViewRawJSON,
  onStarMessage,
  onCreateExportSelection
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change (only in live view)
  useEffect(() => {
    if (isViewingLive && isFollowing) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isViewingLive, isFollowing]);

  // Handle user scrolling to determine if they are following
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Allow a small tolerance
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 5;
      if (isFollowing !== isAtBottom) {
        onFollowChange(isAtBottom);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onFollowChange, isFollowing]);

  // Filter out System messages from display
  const displayMessages = messages.filter((m) => {
    const agent = agents.find(a => a.id === m.agentId);
    if (!agent) return false;
    const name = (agent.name || '').toLowerCase();
    const model = (agent.model || '').toLowerCase();
    return !(name === 'system' || model === 'system');
  });

  const getAgentById = (agentId: string): ConversationAgent | undefined => {
    return agents.find(agent => agent.id === agentId);
  };

  return (
    <div ref={scrollContainerRef} className={`message-list rounded-xl p-4 h-[600px] overflow-y-auto space-y-4 ${!isViewingLive ? 'historical-view-dimmed' : ''}`} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
      {displayMessages.map((message, index) => {
        const agent = getAgentById(message.agentId);
        if (!agent) return null;

        const isStarred = starredMessages.has(message.id);
        const isInExportSelection = exportSelection.has(message.id);
        const isNewlyArrived = isViewingLive && newlyArrivedMessages.has(message.id);
        const previousMessage = index > 0 ? displayMessages[index - 1] : undefined;

        return (
          <MessageItem
            key={message.id}
            message={message}
            agent={agent}
            index={index}
            previousMessage={previousMessage}
            isStarred={isStarred}
            isInExportSelection={isInExportSelection}
            isNewlyArrived={isNewlyArrived}
            isViewingLive={isViewingLive}
            onCopyText={onCopyText}
            onViewRawJSON={onViewRawJSON}
            onStarMessage={onStarMessage}
            onCreateExportSelection={onCreateExportSelection}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ConversationAgent } from '../../types/index.d';
import { Icon } from '../ui/Icon';
import { MessageActions, CopyButton } from '../../features/history/components/MessageActions';
import { getContrastColor, formatTimestamp } from '../../utils/messageUtils';
import { markdownComponents } from '../../config/markdownConfig';
import { formatDateLabel, isSameLocalDate } from '../../services/dateTimeService';

interface MessageItemProps {
  message: Message;
  agent: ConversationAgent;
  index: number;
  previousMessage?: Message;
  isStarred: boolean;
  isInExportSelection: boolean;
  isNewlyArrived: boolean;
  isViewingLive: boolean;
  onCopyText: (message: Message) => void;
  onViewRawJSON: (message: Message) => void;
  onStarMessage: (messageId: string) => void;
  onCreateExportSelection: (messageId: string) => void;
}

/**
 * Individual message component with avatar, content, and actions
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  agent,
  index,
  previousMessage,
  isStarred,
  isInExportSelection,
  isNewlyArrived,
  isViewingLive,
  onCopyText,
  onViewRawJSON,
  onStarMessage,
  onCreateExportSelection
}) => {
  const textColor = getContrastColor(agent.color);
  
  // Role-based alignment: user/system on the right, agents on the left
  const agentName = (agent.name || '').toLowerCase();
  const agentModel = (agent.model || '').toLowerCase();
  const isRightAligned = agentName === 'user' || agentName === 'system' || agentModel === 'user' || agentModel === 'system';
  
  const showDateSeparator = index > 0 && previousMessage && !isSameLocalDate(previousMessage.timestamp, message.timestamp);

  return (
    <React.Fragment key={`wrap-${message.id}`}>
      {showDateSeparator && (
        <div className="w-full">
          <div className="date-separator" role="separator" aria-label={formatDateLabel(message.timestamp)}>
            <span className="date-separator-label">{formatDateLabel(message.timestamp)}</span>
          </div>
        </div>
      )}
      <div className={`message-container flex space-x-3 group ${isNewlyArrived ? 'animate-message-arrive' : ''} ${isRightAligned ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className="flex-shrink-0">
          <div
            className="agent-avatar w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: agent.color, color: textColor }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 message-content-wrapper">
          <div className={`flex items-center justify-between mb-1 message-header ${isRightAligned ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</span>
              <span className="message-timestamp" style={{ color: 'var(--color-text-secondary)' }}>{formatTimestamp(message.timestamp)}</span>
              <span className="message-model-badge" style={{ color: 'var(--color-text-tertiary)' }}>{agent.model}</span>
              {isStarred && (
                <span className="ml-2 text-yellow-400" title="Starred message">
                  <Icon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </Icon>
                </span>
              )}
              {isInExportSelection && (
                <span className="ml-2 text-purple-400" title="Selected for export">
                  <Icon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </Icon>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <CopyButton onCopyText={() => onCopyText(message)} />
              <MessageActions
                message={message}
                agent={agent}
                onViewRawJSON={() => onViewRawJSON(message)}
                onStarMessage={() => onStarMessage(message.id)}
                onCreateExportSelection={() => onCreateExportSelection(message.id)}
              />
            </div>
          </div>
          <div className="rounded-lg p-4 message-content" style={{ color: 'var(--color-text-secondary)' }}>
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

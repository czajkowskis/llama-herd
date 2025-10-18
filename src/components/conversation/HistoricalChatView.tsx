import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../ui/Icon';
import { StoredConversation } from '../../services/backendStorageService';
import { MessageActions, CopyButton } from './MessageActions';
import { RawJSONModal } from './RawJSONModal';
import { CodeBlock } from './CodeBlock';
import { getStarredMessages, toggleStarredMessage } from '../../services/uiPreferencesService';
import { formatTimeShort, formatDateLabel, isSameLocalDate } from '../../services/dateTimeService';

interface HistoricalChatViewProps {
  conversation: StoredConversation;
}

export const HistoricalChatView: React.FC<HistoricalChatViewProps> = ({
  conversation
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRawJSONModal, setShowRawJSONModal] = useState(false);
  const [selectedMessageForJSON, setSelectedMessageForJSON] = useState<any | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(() => getStarredMessages(conversation.id));

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Message action handlers
  const handleCopyText = async (message: any) => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleViewRawJSON = (message: any) => {
    setSelectedMessageForJSON(message);
    setShowRawJSONModal(true);
  };

  const handleStarMessage = (messageId: string) => {
    toggleStarredMessage(conversation.id, messageId);
    // Update local state to reflect the change
    setStarredMessages(getStarredMessages(conversation.id));
  };

  const getAgentById = (agentId: string) => {
    return conversation.agents.find(a => a.id === agentId);
  };

  const getContrastColor = (backgroundColor: string): string => {
    // Simple contrast calculation - return white for dark backgrounds, black for light
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className="text-purple-400 text-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </Icon>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{conversation.title}</h2>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="message-list rounded-xl p-4 flex-1 overflow-y-auto space-y-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {(() => {
          const displayMessages = conversation.messages.filter((m) => {
            const a = getAgentById(m.agentId);
            if (!a) return false;
            const name = (a.name || '').toLowerCase();
            const model = (a.model || '').toLowerCase();
            return !(name === 'system' || model === 'system');
          });
          return displayMessages.map((message, index) => {
            const agent = getAgentById(message.agentId);
            if (!agent) return null;

            const textColor = getContrastColor(agent.color);
            const isStarred = starredMessages.has(message.id);
            // Role-based alignment: user/system on the right, agents on the left
            const agentName = (agent.name || '').toLowerCase();
            const agentModel = (agent.model || '').toLowerCase();
            const isRightAligned = agentName === 'user' || agentName === 'system' || agentModel === 'user' || agentModel === 'system';

            const showDateSeparator = index > 0 && !isSameLocalDate(displayMessages[index - 1].timestamp, message.timestamp);
            return (
              <React.Fragment key={`wrap-${message.id}`}>
                {showDateSeparator && (
                  <div className="w-full">
                    <div className="date-separator" role="separator" aria-label={formatDateLabel(message.timestamp)}>
                      <span className="date-separator-label">{formatDateLabel(message.timestamp)}</span>
                    </div>
                  </div>
                )}
                <div className={`message-container flex space-x-3 group ${isRightAligned ? 'flex-row-reverse space-x-reverse' : ''}`}>
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
                        <span className="message-timestamp">{formatTimeShort(message.timestamp)}</span>
                        <span className="message-model-badge">{agent.model}</span>
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
                      </div>
                      <div className="flex items-center space-x-1">
                        <CopyButton onCopyText={() => handleCopyText(message)} />
                        <MessageActions
                          message={message}
                          agent={agent}
                          onViewRawJSON={() => handleViewRawJSON(message)}
                          onStarMessage={() => handleStarMessage(message.id)}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg p-4 message-content" style={{ color: 'var(--color-text-secondary)' }}>
                      <ReactMarkdown
                        components={{
                          h1: (props: any) => (
                            <h1 className="text-xl font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                          ),
                          h2: (props: any) => (
                            <h2 className="text-lg font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                          ),
                          h3: (props: any) => (
                            <h3 className="text-base font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                          ),
                          p: (props: any) => (
                            <p className="mb-2 leading-relaxed" {...props} />
                          ),
                          ul: (props: any) => (
                            <ul className="list-disc ml-6 mb-2 space-y-1" {...props} />
                          ),
                          ol: (props: any) => (
                            <ol className="list-decimal ml-6 mb-2 space-y-1" {...props} />
                          ),
                          li: (props: any) => (
                            <li className="mb-1" {...props} />
                          ),
                          a: (props: any) => (
                            <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" {...props} />
                          ),
                          hr: (props: any) => (
                            <hr className="my-4" style={{ borderColor: 'var(--color-border)' }} {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => (
                            <CodeBlock inline={inline} className={className}>
                              {children}
                            </CodeBlock>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Raw JSON Modal */}
      {showRawJSONModal && selectedMessageForJSON && (
        <RawJSONModal
          message={selectedMessageForJSON}
          agent={getAgentById(selectedMessageForJSON.agentId)}
          onClose={() => {
            setShowRawJSONModal(false);
            setSelectedMessageForJSON(null);
          }}
        />
      )}
    </div>
  );
};
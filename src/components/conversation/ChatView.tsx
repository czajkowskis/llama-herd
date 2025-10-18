import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Conversation, ConversationAgent, Message } from '../../types/index.d';
import { ExportPanel } from './ExportPanel';
import { MessageActions, CopyButton } from './MessageActions';
import { RawJSONModal } from './RawJSONModal';
import { CodeBlock } from './CodeBlock';
import { getStarredMessages, toggleStarredMessage } from '../../services/uiPreferencesService';

interface ChatViewProps {
  conversation: Conversation;
  onBackToList: () => void;
  getAgentById: (agentId: string) => ConversationAgent | undefined;
  getContrastColor: (backgroundColor: string) => string;
  formatTimestamp: (timestamp: string) => string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onBackToList,
  getAgentById,
  getContrastColor,
  formatTimestamp
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRawJSONModal, setShowRawJSONModal] = useState(false);
  const [selectedMessageForJSON, setSelectedMessageForJSON] = useState<Message | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(() => getStarredMessages(conversation.id));
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Message action handlers
  const handleCopyText = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleViewRawJSON = (message: Message) => {
    setSelectedMessageForJSON(message);
    setShowRawJSONModal(true);
  };

  const handleStarMessage = (messageId: string) => {
    toggleStarredMessage(conversation.id, messageId);
    // Update local state to reflect the change
    setStarredMessages(getStarredMessages(conversation.id));
  };

  const handleCreateExportSelection = (messageId: string) => {
    setExportSelection(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{conversation.title}</h2>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={() => setShowExportPanel(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Icon className="mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </Icon>
              Export
            </Button>
            <Button 
              onClick={onBackToList}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Back to List
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="rounded-xl p-4 h-[600px] overflow-y-auto space-y-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          {conversation.messages.map((message, index) => {
            const agent = getAgentById(message.agentId);
            if (!agent) return null;

            const textColor = getContrastColor(agent.color);
            const isStarred = starredMessages.has(message.id);
            const isInExportSelection = exportSelection.has(message.id);
            const isOddMessage = index % 2 === 1;
            
            return (
              <div key={message.id} className={`message-container flex space-x-3 group ${isOddMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  <div
                    className="agent-avatar w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: agent.color, color: textColor }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 message-content-wrapper">
                  <div className={`flex items-center justify-between mb-1 message-header ${isOddMessage ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</span>
                      <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
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
                      <CopyButton onCopyText={() => handleCopyText(message)} />
                      <MessageActions
                        message={message}
                        agent={agent}
                        onViewRawJSON={() => handleViewRawJSON(message)}
                        onStarMessage={() => handleStarMessage(message.id)}
                        onCreateExportSelection={() => handleCreateExportSelection(message.id)}
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
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Export Panel */}
      {showExportPanel && (
        <ExportPanel
          messages={conversation.messages}
          agents={conversation.agents}
          getAgentById={getAgentById}
          formatTimestamp={formatTimestamp}
          onClose={() => setShowExportPanel(false)}
          preselectedMessages={exportSelection}
        />
      )}

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
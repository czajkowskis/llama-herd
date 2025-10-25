import React, { useState } from 'react';
import { Icon } from './Icon';

export interface DebugMessage {
  timestamp: string;
  type: 'sent' | 'received' | 'error' | 'info';
  content: string;
  data?: any;
}

export interface DebugPanelProps {
  messages: DebugMessage[];
  serverError?: string;
  maxMessages?: number;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  messages,
  serverError,
  maxMessages = 50,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DebugMessage | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const displayedMessages = messages.slice(-maxMessages);

  const getMessageTypeColor = (type: DebugMessage['type']) => {
    switch (type) {
      case 'sent':
        return 'text-blue-400 bg-blue-900/20';
      case 'received':
        return 'text-green-400 bg-green-900/20';
      case 'error':
        return 'text-red-400 bg-red-900/20';
      case 'info':
        return 'text-gray-400 bg-gray-700/20';
      default:
        return 'text-gray-400';
    }
  };

  const getMessageTypeIcon = (type: DebugMessage['type']) => {
    switch (type) {
      case 'sent':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        );
      case 'received':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'info':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      default:
        return null;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Icon className="text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </Icon>
          <span className="text-sm font-medium text-white">Debug Panel</span>
          <span className="text-xs text-gray-400">
            ({displayedMessages.length} message{displayedMessages.length !== 1 ? 's' : ''})
          </span>
          {serverError && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Server Error
            </span>
          )}
        </div>
        <Icon className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Icon>
      </button>

      {isOpen && (
        <div className="bg-gray-900 border-t border-gray-700">
          {serverError && (
            <div className="p-4 bg-red-900/20 border-b border-red-900/50">
              <div className="flex items-start space-x-2">
                <Icon className="text-red-400 flex-shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </Icon>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-400 mb-1">Server Error</h4>
                  <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-words">
                    {serverError}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {displayedMessages.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No messages yet
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {displayedMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 hover:bg-gray-800/50 transition-colors cursor-pointer ${getMessageTypeColor(msg.type)}`}
                    onClick={() => setSelectedMessage(selectedMessage?.timestamp === msg.timestamp ? null : msg)}
                  >
                    <div className="flex items-start space-x-2">
                      <Icon className="flex-shrink-0 mt-0.5">
                        {getMessageTypeIcon(msg.type)}
                      </Icon>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs font-mono text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-xs font-semibold uppercase">
                            {msg.type}
                          </span>
                        </div>
                        <div className="text-sm font-mono break-words">
                          {msg.content}
                        </div>
                        {selectedMessage?.timestamp === msg.timestamp && msg.data && (
                          <div className="mt-2 p-2 bg-black/30 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Raw Data:</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(JSON.stringify(msg.data, null, 2));
                                  setCopiedFor(msg.timestamp);
                                  window.setTimeout(() => setCopiedFor((cur) => (cur === msg.timestamp ? null : cur)), 2000);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                {copiedFor === msg.timestamp ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                              {JSON.stringify(msg.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

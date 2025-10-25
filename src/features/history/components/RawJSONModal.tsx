import React, { useState } from 'react';
import { Message, ConversationAgent } from '../../../types/index.d';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

export interface RawJSONModalProps {
  message: Message;
  agent?: ConversationAgent;
  onClose: () => void;
}

export const RawJSONModal: React.FC<RawJSONModalProps> = ({
  message,
  agent,
  onClose,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const messageData = {
    id: message.id,
    agentId: message.agentId,
    agentName: agent?.name || 'Unknown',
    model: message.model || agent?.model || 'Unknown',
    timestamp: message.timestamp,
    content: message.content,
  };

  const jsonString = JSON.stringify(messageData, null, 2);

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-json-modal-title"
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M10 12h4" />
                <path d="M10 16h2" />
              </svg>
            </Icon>
            <h2 id="raw-json-modal-title" className="text-xl font-semibold text-white">
              Message Raw JSON
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-150"
            aria-label="Close modal"
          >
            <Icon>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Icon>
          </button>
        </div>

        {/* Message Metadata */}
        <div className="p-6 border-b border-gray-700 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">ID:</span>
              <span className="ml-2 text-gray-200 font-mono">{message.id}</span>
            </div>
            <div>
              <span className="text-gray-400">Timestamp:</span>
              <span className="ml-2 text-gray-200">{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Agent:</span>
              <span className="ml-2 text-gray-200">{agent?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="ml-2 text-gray-200 font-mono">{message.model || agent?.model || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* JSON Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap break-words">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <Button
            onClick={handleCopyJSON}
            className={`${
              copySuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            } transition-colors duration-150`}
          >
            <Icon className="mr-2">
              {copySuccess ? (
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
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
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2 2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </Icon>
            {copySuccess ? 'Copied!' : 'Copy JSON'}
          </Button>
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

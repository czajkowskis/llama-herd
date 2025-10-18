import React, { useState, useRef, useEffect } from 'react';
import { Message, ConversationAgent } from '../../types/index.d';
import { Icon } from '../ui/Icon';

export interface CopyButtonProps {
  onCopyText: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ onCopyText }) => {
  return (
    <button
      onClick={onCopyText}
      className="p-1 rounded hover:bg-gray-700 transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
      aria-label="Copy message text"
      title="Copy text"
    >
      <Icon>
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
          className="text-gray-400"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </Icon>
    </button>
  );
};

export interface MessageActionsProps {
  message: Message;
  agent?: ConversationAgent;
  onViewRawJSON: () => void;
  onStarMessage?: () => void;
  onCreateExportSelection?: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  agent,
  onViewRawJSON,
  onStarMessage,
  onCreateExportSelection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
    return undefined;
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-gray-700 transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Message actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Message actions"
      >
        <Icon>
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
            className="text-gray-400"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </Icon>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-56 rounded-lg bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-10 py-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="message-actions-menu"
        >
          <button
            onClick={() => handleAction(onViewRawJSON)}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center space-x-3 transition-colors duration-150"
            role="menuitem"
          >
            <Icon>
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
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M10 12h4" />
                <path d="M10 16h2" />
              </svg>
            </Icon>
            <span>View raw JSON</span>
          </button>

          {onStarMessage && (
            <button
              onClick={() => handleAction(onStarMessage)}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center space-x-3 transition-colors duration-150"
              role="menuitem"
            >
              <Icon>
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
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </Icon>
              <span>Star message</span>
            </button>
          )}

          {onCreateExportSelection && (
            <button
              onClick={() => handleAction(onCreateExportSelection)}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center space-x-3 transition-colors duration-150"
              role="menuitem"
            >
              <Icon>
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </Icon>
              <span>Create export selection</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Input } from '../../../components/ui/Input';
import { Conversation } from '../../../types/index.d';

interface ConversationTileProps {
  conversation: Conversation;
  index: number;
  editingTitleIndex: number;
  editingTitle: string;
  onConversationSelect: (index: number) => void;
  onStartEditTitle: (index: number) => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onDeleteConversation: (index: number) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyPress: (e: React.KeyboardEvent) => void;
  formatTimestamp: (timestamp: string) => string;
}

export const ConversationTile: React.FC<ConversationTileProps> = ({
  conversation,
  index,
  editingTitleIndex,
  editingTitle,
  onConversationSelect,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onDeleteConversation,
  onTitleChange,
  onTitleKeyPress,
  formatTimestamp
}) => {
  return (
    <div
      className="conversation-tile p-4 rounded-xl transition-all duration-200 cursor-pointer border group"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
      onClick={() => onConversationSelect(index)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {editingTitleIndex === index ? (
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  value={editingTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  onKeyDown={onTitleKeyPress}
                  onBlur={onSaveTitle}
                  className="text-sm pr-16"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveTitle();
                    }}
                    className="text-green-400 hover:text-green-300 p-1.5 rounded-full transition-colors duration-200"
                    title="Save title"
                  >
                    <Icon>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </Icon>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelEditTitle();
                    }}
                    style={{ color: 'var(--color-text-tertiary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                    className="p-1.5 rounded-full transition-colors duration-200"
                    title="Cancel edit"
                  >
                    <Icon>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                        <path d="M18 6 6 18"/>
                        <path d="m6 6 12 12"/>
                      </svg>
                    </Icon>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{conversation.title}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditTitle(index);
                }}
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#a855f7'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                className="p-1.5 rounded-full transition-all duration-200 hover:bg-purple-500/20 hover:scale-110 hover:shadow-lg"
                title="Edit title"
              >
                <Icon>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                  </svg>
                </Icon>
              </button>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConversation(index);
          }}
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
          className="p-1.5 rounded-full transition-all duration-200 hover:bg-red-500/20 hover:scale-110 hover:shadow-lg"
          title="Delete conversation"
        >
          <Icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </Icon>
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          <Icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </Icon>
          <span>{conversation.agents.length} agents</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          <Icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </Icon>
          <span>{conversation.messages.length} messages</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          <Icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar">
              <path d="M8 2v4"/>
              <path d="M16 2v4"/>
              <rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/>
            </svg>
          </Icon>
          <span>{new Date(conversation.createdAt).toLocaleDateString()} {formatTimestamp(conversation.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}; 
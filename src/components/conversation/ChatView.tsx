import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Conversation, ConversationAgent } from '../../types/index.d';

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold text-white">{conversation.title}</h2>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={onBackToList}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Back to List
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-gray-900 rounded-xl p-4 h-[600px] overflow-y-auto space-y-4">
          {conversation.messages.map((message) => {
            const agent = getAgentById(message.agentId);
            if (!agent) return null;

            const textColor = getContrastColor(agent.color);
            
            return (
              <div key={message.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: agent.color, color: textColor }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white">{agent.name}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</span>
                    <span className="text-xs text-gray-500">• {agent.model}</span>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}; 
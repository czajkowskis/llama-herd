import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
                  <div className="flex items-center mb-1">
                    <span className="font-semibold text-white">{agent.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatTimestamp(message.timestamp)}</span>
                    <span className="text-xs text-gray-500 ml-2">• {agent.model}</span>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-200">
                    <ReactMarkdown
                      components={{
                        h1: (props: any) => (
                          <h1 className="text-xl font-semibold text-white mt-2 mb-2" {...props} />
                        ),
                        h2: (props: any) => (
                          <h2 className="text-lg font-semibold text-white mt-2 mb-2" {...props} />
                        ),
                        h3: (props: any) => (
                          <h3 className="text-base font-semibold text-white mt-2 mb-2" {...props} />
                        ),
                        p: (props: any) => (
                          <p className="mb-2" {...props} />
                        ),
                        ul: (props: any) => (
                          <ul className="list-disc ml-6 mb-2" {...props} />
                        ),
                        ol: (props: any) => (
                          <ol className="list-decimal ml-6 mb-2" {...props} />
                        ),
                        li: (props: any) => (
                          <li className="mb-1" {...props} />
                        ),
                        a: (props: any) => (
                          <a className="text-blue-400 underline" target="_blank" rel="noreferrer" {...props} />
                        ),
                        hr: (props: any) => (
                          <hr className="border-gray-700 my-3" {...props} />
                        ),
                        code: ({ node, inline, className, children, ...props }: any) => {
                          if (inline) {
                            return (
                              <code className="bg-gray-900 rounded px-1 py-0.5 text-sm" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return (
                            <pre className="bg-gray-900 rounded-md p-3 overflow-x-auto text-sm">
                              <code className={className} {...props}>{children}</code>
                            </pre>
                          );
                        },
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
    </div>
  );
}; 
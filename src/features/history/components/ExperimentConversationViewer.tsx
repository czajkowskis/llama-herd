import React, { useState, useEffect } from 'react';
import { ChatView } from './ChatView';
import { backendStorageService, StoredConversation } from '../../../services/backendStorageService';

interface ExperimentConversationViewerProps {
  conversationId: string;
  onBackToList: () => void;
}

export const ExperimentConversationViewer: React.FC<ExperimentConversationViewerProps> = ({
  conversationId,
  onBackToList
}) => {
  const [conversation, setConversation] = useState<StoredConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const conv = await backendStorageService.getConversation(conversationId);
        if (conv) {
          setConversation(conv);
        } else {
          setError('Conversation not found');
        }
      } catch (err) {
        setError('Failed to load conversation');
        console.error('Error fetching conversation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-300">Loading conversation...</div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-400">{error || 'Conversation not found'}</div>
      </div>
    );
  }

  return (
    <ChatView
      conversation={{
        id: conversation.id,
        title: conversation.title,
        agents: conversation.agents,
        messages: conversation.messages,
        createdAt: conversation.createdAt
      }}
      onBackToList={onBackToList}
      getAgentById={(agentId) => conversation.agents.find(a => a.id === agentId)}
      getContrastColor={(color) => '#ffffff'}
      formatTimestamp={(timestamp) => new Date(timestamp).toLocaleTimeString()}
    />
  );
};

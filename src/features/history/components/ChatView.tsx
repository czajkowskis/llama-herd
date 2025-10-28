import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { Conversation, ConversationAgent, Message } from '../../../types/index.d';
import { ExportPanel } from './ExportPanel';
import { RawJSONModal } from './RawJSONModal';
import { getStarredMessages, toggleStarredMessage } from '../../../services/uiPreferencesService';
import { MessageList } from '../../../components/messages/MessageList';
import { ChatHeader } from './ChatHeader';
import { getContrastColor, formatTimestamp } from '../utils/conversationParser';

interface ChatViewProps {
  conversation: Conversation;
  onBackToList: () => void;
  getAgentById: (agentId: string) => ConversationAgent | undefined;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onBackToList,
  getAgentById
}) => {
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRawJSONModal, setShowRawJSONModal] = useState(false);
  const [selectedMessageForJSON, setSelectedMessageForJSON] = useState<Message | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(() => getStarredMessages(conversation.id));
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());

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
        <ChatHeader
          conversationTitle={conversation.title}
          onShowExportPanel={() => setShowExportPanel(true)}
          onBackToList={onBackToList}
        />

        {/* Chat Messages */}
        <MessageList
          messages={conversation.messages}
          agents={conversation.agents}
          isViewingLive={false}
          isFollowing={false}
          onFollowChange={() => {}}
          newlyArrivedMessages={new Set()}
          starredMessages={starredMessages}
          exportSelection={exportSelection}
          onCopyText={handleCopyText}
          onViewRawJSON={handleViewRawJSON}
          onStarMessage={handleStarMessage}
          onCreateExportSelection={handleCreateExportSelection}
        />
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
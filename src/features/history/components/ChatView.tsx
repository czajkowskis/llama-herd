import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { Conversation, ConversationAgent, Message } from '../../../types/index.d';
import { ExportPanel } from './ExportPanel';
import { RawJSONModal } from './RawJSONModal';
import { getStarredMessages, toggleStarredMessage } from '../../../services/uiPreferencesService';
import { MessageList } from '../../../components/messages/MessageList';

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
        <MessageList
          messages={conversation.messages}
          agents={conversation.agents}
          isViewingLive={false}
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
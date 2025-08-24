import React from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { ConversationTile } from './ConversationTile';
import { Conversation } from '../../types/index.d';

interface ConversationListProps {
  conversations: Conversation[];
  editingTitleIndex: number;
  editingTitle: string;
  onConversationSelect: (index: number) => void;
  onStartEditTitle: (index: number) => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onDeleteConversation: (index: number) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyPress: (e: React.KeyboardEvent) => void;
  onShowUploadInterface: () => void;
  formatTimestamp: (timestamp: string) => string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  editingTitleIndex,
  editingTitle,
  onConversationSelect,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onDeleteConversation,
  onTitleChange,
  onTitleKeyPress,
  onShowUploadInterface,
  formatTimestamp
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-200">Your Conversations</h3>
        <Button 
          onClick={onShowUploadInterface}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Add More
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conversations.map((conversation, index) => (
          <ConversationTile
            key={conversation.id}
            conversation={conversation}
            index={index}
            editingTitleIndex={editingTitleIndex}
            editingTitle={editingTitle}
            onConversationSelect={onConversationSelect}
            onStartEditTitle={onStartEditTitle}
            onSaveTitle={onSaveTitle}
            onCancelEditTitle={onCancelEditTitle}
            onDeleteConversation={onDeleteConversation}
            onTitleChange={onTitleChange}
            onTitleKeyPress={onTitleKeyPress}
            formatTimestamp={formatTimestamp}
          />
        ))}
      </div>
    </div>
  );
}; 
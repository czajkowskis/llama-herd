import React from 'react';
import { StoredConversation } from '../../../services/backendStorageService';
import { ConversationTile } from '../../../components/lists/ConversationTile';

interface ConversationListProps {
  conversations: StoredConversation[];
  selectedItems: Set<string>;
  editingConversationId: string | null;
  editingConversationName: string;
  selectMode: boolean;
  editingExperimentId: string | null;
  handleSelectItem: (id: string) => void;
  handleViewConversation: (conversation: StoredConversation) => void;
  handleStartEditConversationName: (conversation: StoredConversation) => void;
  handleDeleteConversation: (conversation: StoredConversation) => void;
  handleSaveConversationName: () => void;
  handleCancelEditConversationName: () => void;
  setEditingConversationName: (name: string) => void;
  handleConversationNameKeyPress: (e: React.KeyboardEvent) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedItems,
  editingConversationId,
  editingConversationName,
  selectMode,
  editingExperimentId,
  handleSelectItem,
  handleViewConversation,
  handleStartEditConversationName,
  handleDeleteConversation,
  handleSaveConversationName,
  handleCancelEditConversationName,
  setEditingConversationName,
  handleConversationNameKeyPress,
}) => {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
        No imported conversations found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <ConversationTile
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedItems.has(conversation.id)}
          isEditing={editingConversationId === conversation.id}
          editingName={editingConversationName}
          selectMode={selectMode}
          isEditDisabled={editingConversationId !== null || editingExperimentId !== null}
          onSelect={handleSelectItem}
          onView={() => handleViewConversation(conversation)}
          onEdit={() => handleStartEditConversationName(conversation)}
          onDelete={() => handleDeleteConversation(conversation)}
          onSaveEdit={handleSaveConversationName}
          onCancelEdit={handleCancelEditConversationName}
          onNameChange={setEditingConversationName}
          onKeyPress={handleConversationNameKeyPress}
        />
      ))}
    </div>
  );
}; 
import React from 'react';
import { StoredConversation } from '../../../services/backendStorageService';
import { ConversationViewerHeader } from './ConversationViewerHeader';
import { ConversationList } from './ConversationList';
import { UploadInterface } from '../../../components/common/UploadInterface';

interface ConversationListViewProps {
  conversations: StoredConversation[];
  showUploadInterface: boolean;
  isConfiguring: boolean;
  isUploading: boolean;
  uploadError: string | null;
  editingConversationId: string | null;
  editingConversationName: string;
  onToggleUploadInterface: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewConversation: (conversation: StoredConversation) => void;
  onStartEditConversationName: (conversation: StoredConversation) => void;
  onSaveConversationName: () => void;
  onCancelEditConversationName: () => void;
  onDeleteConversation: (conversation: StoredConversation) => void;
  onSetEditingConversationName: (name: string) => void;
  onConversationNameKeyPress: (e: React.KeyboardEvent) => void;
}

export const ConversationListView: React.FC<ConversationListViewProps> = ({
  conversations,
  showUploadInterface,
  isConfiguring,
  isUploading,
  uploadError,
  editingConversationId,
  editingConversationName,
  onToggleUploadInterface,
  onFileUpload,
  onViewConversation,
  onStartEditConversationName,
  onSaveConversationName,
  onCancelEditConversationName,
  onDeleteConversation,
  onSetEditingConversationName,
  onConversationNameKeyPress,
}) => {
  return (
    <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <ConversationViewerHeader
        conversationsCount={conversations.length}
        showUploadInterface={showUploadInterface}
        onToggleUploadInterface={onToggleUploadInterface}
      />

      {conversations.length === 0 || showUploadInterface ? (
        <UploadInterface
          conversations={conversations}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={onFileUpload}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          editingConversationId={editingConversationId}
          editingConversationName={editingConversationName}
          handleViewConversation={onViewConversation}
          handleStartEditConversationName={onStartEditConversationName}
          handleSaveConversationName={onSaveConversationName}
          handleCancelEditConversationName={onCancelEditConversationName}
          handleDeleteConversation={onDeleteConversation}
          setEditingConversationName={onSetEditingConversationName}
          handleConversationNameKeyPress={onConversationNameKeyPress}
          selectedItems={new Set<string>()}
          selectMode={false}
          editingExperimentId={null}
          handleSelectItem={() => {}}
        />
      )}
    </div>
  );
};

import React from 'react';
import { Icon } from '../../../components/ui/Icon';
import { TitleEditor } from './TitleEditor';

interface ConfigurationHeaderProps {
  pendingConversations: any[];
  pendingConversationIndex: number;
  isEditingConversationTitle: boolean;
  editingConversationTitle: string;
  onStartEditConversationTitle: () => void;
  onSaveConversationTitle: () => void;
  onCancelEditConversationTitle: () => void;
  onConversationTitleChange: (title: string) => void;
  onConversationTitleKeyPress: (e: React.KeyboardEvent) => void;
}

export const ConfigurationHeader: React.FC<ConfigurationHeaderProps> = ({
  pendingConversations,
  pendingConversationIndex,
  isEditingConversationTitle,
  editingConversationTitle,
  onStartEditConversationTitle,
  onSaveConversationTitle,
  onCancelEditConversationTitle,
  onConversationTitleChange,
  onConversationTitleKeyPress,
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <Icon className="text-purple-400 text-xl">
          <svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </Icon>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Configure Agents</h2>
        {pendingConversations.length > 1 && (
          <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            ({pendingConversationIndex + 1} of {pendingConversations.length})
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <TitleEditor
          isEditing={isEditingConversationTitle}
          title={pendingConversations[pendingConversationIndex]?.title || ''}
          editingTitle={editingConversationTitle}
          onStartEdit={onStartEditConversationTitle}
          onSave={onSaveConversationTitle}
          onCancel={onCancelEditConversationTitle}
          onChange={onConversationTitleChange}
          onKeyPress={onConversationTitleKeyPress}
        />
      </div>
    </div>
  );
};

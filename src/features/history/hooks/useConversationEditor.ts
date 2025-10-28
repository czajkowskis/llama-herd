import { useState } from 'react';
import { StoredConversation } from '../../../services/backendStorageService';

export interface UseConversationEditorReturn {
  editingConversationId: string | null;
  editingConversationName: string;
  editingConversationTitle: string;
  isEditingConversationTitle: boolean;
  startEditConversationName: (conversation: StoredConversation) => void;
  saveConversationName: () => void;
  cancelEditConversationName: () => void;
  setEditingConversationName: (name: string) => void;
  handleConversationNameKeyPress: (e: React.KeyboardEvent) => void;
  startEditConversationTitle: (title: string) => void;
  saveConversationTitle: () => void;
  cancelEditConversationTitle: () => void;
  setEditingConversationTitle: (title: string) => void;
  handleConversationTitleKeyPress: (e: React.KeyboardEvent) => void;
}

export const useConversationEditor = (): UseConversationEditorReturn => {
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingConversationName, setEditingConversationName] = useState<string>('');
  const [editingConversationTitle, setEditingConversationTitle] = useState<string>('');
  const [isEditingConversationTitle, setIsEditingConversationTitle] = useState<boolean>(false);

  const startEditConversationName = (conversation: StoredConversation) => {
    setEditingConversationId(conversation.id);
    setEditingConversationName(conversation.title);
  };

  const saveConversationName = () => {
    // This will be handled by the parent component with actual save logic
    setEditingConversationId(null);
    setEditingConversationName('');
  };

  const cancelEditConversationName = () => {
    setEditingConversationId(null);
    setEditingConversationName('');
  };

  const handleConversationNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveConversationName();
    } else if (e.key === 'Escape') {
      cancelEditConversationName();
    }
  };

  const startEditConversationTitle = (title: string) => {
    setEditingConversationTitle(title);
    setIsEditingConversationTitle(true);
  };

  const saveConversationTitle = () => {
    setIsEditingConversationTitle(false);
  };

  const cancelEditConversationTitle = () => {
    setIsEditingConversationTitle(false);
    setEditingConversationTitle('');
  };

  const handleConversationTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveConversationTitle();
    } else if (e.key === 'Escape') {
      cancelEditConversationTitle();
    }
  };

  return {
    editingConversationId,
    editingConversationName,
    editingConversationTitle,
    isEditingConversationTitle,
    startEditConversationName,
    saveConversationName,
    cancelEditConversationName,
    setEditingConversationName,
    handleConversationNameKeyPress,
    startEditConversationTitle,
    saveConversationTitle,
    cancelEditConversationTitle,
    setEditingConversationTitle,
    handleConversationTitleKeyPress,
  };
};

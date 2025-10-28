import { useState } from 'react';
import { StoredConversation } from '../../../services/backendStorageService';

export interface ConversationToDelete {
  index: number;
  conversation: StoredConversation;
}

export interface UseConversationDeletionReturn {
  showDeleteConfirmation: boolean;
  conversationToDelete: ConversationToDelete | null;
  requestDeleteConversation: (conversation: StoredConversation, index: number) => void;
  confirmDeleteConversation: () => void;
  cancelDeleteConversation: () => void;
}

export const useConversationDeletion = (): UseConversationDeletionReturn => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<ConversationToDelete | null>(null);

  const requestDeleteConversation = (conversation: StoredConversation, index: number) => {
    setConversationToDelete({ index, conversation });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteConversation = () => {
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

  const cancelDeleteConversation = () => {
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

  return {
    showDeleteConfirmation,
    conversationToDelete,
    requestDeleteConversation,
    confirmDeleteConversation,
    cancelDeleteConversation,
  };
};

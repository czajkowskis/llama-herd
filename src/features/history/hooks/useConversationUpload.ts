import { useState } from 'react';
import { StoredConversation } from '../../../services/backendStorageService';
import { parseConversationFile } from '../utils/conversationParser';

export interface UseConversationUploadReturn {
  isUploading: boolean;
  uploadError: string | null;
  pendingConversations: StoredConversation[];
  pendingConversationIndex: number;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setPendingConversations: (conversations: StoredConversation[]) => void;
  setPendingConversationIndex: (index: number) => void;
  clearPendingConversations: () => void;
}

export const useConversationUpload = (): UseConversationUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingConversations, setPendingConversations] = useState<StoredConversation[]>([]);
  const [pendingConversationIndex, setPendingConversationIndex] = useState<number>(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const newConversations: StoredConversation[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsedConversation = await parseConversationFile(file);
        newConversations.push(parsedConversation);
      }

      // Store conversations as pending and show configuration
      setPendingConversations(newConversations);
      setPendingConversationIndex(0);

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to parse conversation file');
    } finally {
      setIsUploading(false);
    }
  };

  const clearPendingConversations = () => {
    setPendingConversations([]);
    setPendingConversationIndex(0);
  };

  return {
    isUploading,
    uploadError,
    pendingConversations,
    pendingConversationIndex,
    handleFileUpload,
    setPendingConversations,
    setPendingConversationIndex,
    clearPendingConversations,
  };
};

import { useState, useEffect } from 'react';
import { StoredConversation } from '../../../services/backendStorageService';

export interface UseConversationStorageReturn {
  conversations: StoredConversation[];
  isLoading: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  saveConversation: (conversation: StoredConversation) => Promise<boolean>;
  updateConversation: (conversation: StoredConversation) => Promise<boolean>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
}

export const useConversationStorage = (): UseConversationStorageReturn => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { backendStorageService } = await import('../../../services/backendStorageService');
      const backendConversations = await backendStorageService.getConversations('import');
      console.log('useConversationStorage: All backend conversations:', backendConversations);
      
      const importedConversations: StoredConversation[] = backendConversations
        .filter(c => c.source === 'import')
        .map(c => ({
          id: c.id,
          title: c.title,
          agents: c.agents,
          messages: c.messages,
          createdAt: c.createdAt,
          source: c.source,
          importedAt: c.importedAt,
        }));
      
      console.log('useConversationStorage: Filtered imported conversations:', importedConversations);
      setConversations(importedConversations);
    } catch (err) {
      console.error('useConversationStorage: Failed to load conversations from backend:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (conversation: StoredConversation): Promise<boolean> => {
    try {
      const { backendStorageService } = await import('../../../services/backendStorageService');
      const backendConversation = {
        id: conversation.id,
        title: conversation.title,
        agents: conversation.agents,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        importedAt: new Date().toISOString(),
        source: 'import' as const,
      };
      
      console.log('useConversationStorage: Saving conversation to backend storage:', backendConversation);
      const success = await backendStorageService.saveConversation(backendConversation);
      
      if (success) {
        console.log('useConversationStorage: Successfully saved to backend storage');
        // Update local state
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c.id === conversation.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = conversation;
            return updated;
          } else {
            return [...prev, conversation];
          }
        });
        return true;
      } else {
        console.error('useConversationStorage: Failed to save to backend storage');
        return false;
      }
    } catch (err) {
      console.error('useConversationStorage: Error saving to backend storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to save conversation');
      return false;
    }
  };

  const updateConversation = async (conversation: StoredConversation): Promise<boolean> => {
    return saveConversation(conversation); // Same logic for save/update
  };

  const deleteConversation = async (conversationId: string): Promise<boolean> => {
    try {
      const { backendStorageService } = await import('../../../services/backendStorageService');
      const success = await backendStorageService.deleteConversation(conversationId);
      
      if (success) {
        console.log('useConversationStorage: Successfully deleted from backend storage');
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        return true;
      } else {
        console.error('useConversationStorage: Failed to delete from backend storage');
        return false;
      }
    } catch (err) {
      console.error('useConversationStorage: Error deleting from backend storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      return false;
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    saveConversation,
    updateConversation,
    deleteConversation,
  };
};

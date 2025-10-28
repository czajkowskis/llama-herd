import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadInterface } from '../../../components/common/UploadInterface';
import { ChatView } from './ChatView';
import { Button } from '../../../components/ui/Button';
import { backendStorageService, StoredConversation } from '../../../services/backendStorageService';

export const ConversationViewer: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<StoredConversation | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const importedConversations = await backendStorageService.getConversations('import');
      setConversations(importedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setUploadError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const content = await readFileContent(file);
        const conversationData = JSON.parse(content);
        
        // Ensure the conversation has the required structure
        const conversation: StoredConversation = {
          id: conversationData.id || `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: conversationData.title || file.name.replace('.json', ''),
          agents: conversationData.agents || [],
          messages: conversationData.messages || [],
          createdAt: conversationData.createdAt || new Date().toISOString(),
          importedAt: new Date().toISOString(),
          source: 'import'
        };

        return backendStorageService.saveConversation(conversation);
      });

      await Promise.all(uploadPromises);
      await loadConversations(); // Reload conversations after upload
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload conversations. Please check the file format.');
    } finally {
      setIsUploading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleViewConversation = (conversation: StoredConversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const handleBackToHistory = () => {
    navigate('/history');
  };

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Loading conversations...</div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-between mb-6">
            <Button onClick={handleBackToList}>
              ← Back to Conversations
            </Button>
            <Button onClick={handleBackToHistory} variant="secondary">
              Back to History
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatView
              conversation={{
                id: selectedConversation.id,
                title: selectedConversation.title,
                agents: selectedConversation.agents,
                messages: selectedConversation.messages,
                createdAt: selectedConversation.createdAt
              }}
              onBackToList={handleBackToList}
              getAgentById={(agentId) => selectedConversation.agents.find((a: any) => a.id === agentId)}
              getContrastColor={() => '#ffffff'}
              formatTimestamp={(timestamp) => new Date(timestamp).toLocaleTimeString()}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Conversation Viewer</h1>
          <Button onClick={handleBackToHistory} variant="secondary">
            Back to History
          </Button>
        </div>

        {conversations.length === 0 ? (
          <UploadInterface
            conversations={conversations}
            isUploading={isUploading}
            uploadError={uploadError}
            onFileUpload={handleFileUpload}
          />
        ) : (
          <div className="space-y-6">
            <UploadInterface
              conversations={conversations}
              isUploading={isUploading}
              uploadError={uploadError}
              onFileUpload={handleFileUpload}
            />
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Imported Conversations ({conversations.length})
              </h2>
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)', 
                      borderColor: 'var(--color-border)' 
                    }}
                    onClick={() => handleViewConversation(conversation)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {conversation.title}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{conversation.agents.length} agents</span>
                          <span>{conversation.messages.length} messages</span>
                          <span>Imported {new Date(conversation.importedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button onClick={() => handleViewConversation(conversation)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

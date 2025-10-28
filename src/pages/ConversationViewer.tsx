import React, { useState } from 'react';
import { ConversationAgent } from '../types/index.d';
import { AgentConfiguration } from '../features/experiments/components/AgentConfiguration';
import { ChatView } from '../features/history/components/ChatView';
import { ConversationListView } from '../features/history/components/ConversationListView';
import { ConfirmationPopup } from '../components/ui/ConfirmationPopup';
import { useConversationStorage } from '../features/history/hooks/useConversationStorage';
import { useConversationUpload } from '../features/history/hooks/useConversationUpload';
import { useAgentConfiguration } from '../features/history/hooks/useAgentConfiguration';
import { useConversationEditor } from '../features/history/hooks/useConversationEditor';
import { useConversationDeletion } from '../features/history/hooks/useConversationDeletion';

export const ConversationViewer: React.FC = () => {
  // View state
  const [currentConversationIndex, setCurrentConversationIndex] = useState<number>(-1);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showUploadInterface, setShowUploadInterface] = useState<boolean>(false);

  // Custom hooks
  const storage = useConversationStorage();
  const upload = useConversationUpload();
  const agentConfig = useAgentConfiguration();
  const editor = useConversationEditor();
  const deletion = useConversationDeletion();

  const currentConversation = currentConversationIndex >= 0 ? storage.conversations[currentConversationIndex] : null;

  const handleConfirmConfiguration = async () => {
    // Validate agents
    const { hasDuplicateColors, hasDuplicateNames } = agentConfig.validateAgents();

    if (hasDuplicateColors) {
      agentConfig.setColorError('Please ensure all agents have unique colors.');
      return;
    }

    if (hasDuplicateNames) {
      agentConfig.setNameError('Please ensure all agents have unique names.');
      return;
    }

    if (upload.pendingConversations.length === 0) return;

    // Update conversation with configured agents
    const currentPending = upload.pendingConversations[upload.pendingConversationIndex];
    const updatedConversation = {
      ...currentPending,
      agents: agentConfig.agents
    };
    
    // Save to backend storage
    const success = await storage.saveConversation(updatedConversation);
    if (!success) {
      console.error('Failed to save conversation');
      return;
    }

    // Move to next pending conversation or finish
    if (upload.pendingConversationIndex < upload.pendingConversations.length - 1) {
      const nextIndex = upload.pendingConversationIndex + 1;
      upload.setPendingConversationIndex(nextIndex);
      agentConfig.setAgents(upload.pendingConversations[nextIndex].agents);
      agentConfig.clearErrors();
    } else {
      // All conversations configured - return to conversation selection view
      upload.clearPendingConversations();
      agentConfig.setAgents([]);
      setIsConfiguring(false);
      setCurrentConversationIndex(-1);
      setShowUploadInterface(false);
    }
  };

  const handleViewConversation = (conversation: any) => {
    const index = storage.conversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
        setCurrentConversationIndex(index);
      agentConfig.setAgents(conversation.agents);
        setIsConfiguring(false);
    }
  };

  const handleDeleteConversation = async (conversation: any) => {
    const index = storage.conversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
      deletion.requestDeleteConversation(conversation, index);
    }
  };

  const confirmDeleteConversation = async () => {
    if (!deletion.conversationToDelete) return;
    
    const { index, conversation } = deletion.conversationToDelete;
    
    // Delete from backend storage
    const success = await storage.deleteConversation(conversation.id);
    if (!success) {
      console.error('Failed to delete conversation');
      return;
    }
    
    // If we're deleting the current conversation, select the next one or go back to list
    if (index === currentConversationIndex) {
      if (storage.conversations.length > 1) {
        const newIndex = index === 0 ? 0 : index - 1;
        setCurrentConversationIndex(newIndex);
        agentConfig.setAgents(storage.conversations[newIndex].agents);
      } else {
        setCurrentConversationIndex(-1);
        agentConfig.setAgents([]);
      }
    } else if (index < currentConversationIndex) {
      // Adjust current index if we deleted a conversation before the current one
      setCurrentConversationIndex(currentConversationIndex - 1);
    }
    
    deletion.confirmDeleteConversation();
  };

  const handleSaveConversationName = async () => {
    if (editor.editingConversationName.trim() && editor.editingConversationId) {
      const updatedConversations = storage.conversations.map((conv) =>
        conv.id === editor.editingConversationId ? { ...conv, title: editor.editingConversationName.trim() } : conv
      );
      
      // Update local state
      const updatedConversation = updatedConversations.find(c => c.id === editor.editingConversationId);
      if (updatedConversation) {
        await storage.updateConversation(updatedConversation);
      }
    }
    editor.saveConversationName();
  };

  const handleSaveConversationTitle = () => {
    if (editor.editingConversationTitle.trim()) {
      const updatedConversations = [...upload.pendingConversations];
      updatedConversations[upload.pendingConversationIndex] = {
        ...updatedConversations[upload.pendingConversationIndex],
        title: editor.editingConversationTitle.trim()
      };
      upload.setPendingConversations(updatedConversations);
      editor.saveConversationTitle();
    }
  };

  const getAgentById = (agentId: string): ConversationAgent | undefined => {
    return currentConversation?.agents.find(agent => agent.id === agentId);
  };

  // Handle file upload and start configuration
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await upload.handleFileUpload(event);
    if (upload.pendingConversations.length > 0) {
      agentConfig.setAgents(upload.pendingConversations[0].agents);
      setIsConfiguring(true);
      setShowUploadInterface(false);
    }
  };

  // Render configuration window
  if (isConfiguring) {
    return (
      <AgentConfiguration
        agents={agentConfig.agents}
        pendingConversations={upload.pendingConversations}
        pendingConversationIndex={upload.pendingConversationIndex}
        isEditingConversationTitle={editor.isEditingConversationTitle}
        editingConversationTitle={editor.editingConversationTitle}
        colorError={agentConfig.colorError}
        nameError={agentConfig.nameError}
        showColorPicker={agentConfig.showColorPicker}
        editingAgentId={agentConfig.editingAgentId}
        onAgentUpdate={agentConfig.handleAgentUpdate}
        onConfirmConfiguration={handleConfirmConfiguration}
        onStartEditConversationTitle={() => editor.startEditConversationTitle(upload.pendingConversations[upload.pendingConversationIndex].title)}
        onSaveConversationTitle={handleSaveConversationTitle}
        onCancelEditConversationTitle={editor.cancelEditConversationTitle}
        onConversationTitleChange={editor.setEditingConversationTitle}
        onConversationTitleKeyPress={editor.handleConversationTitleKeyPress}
        onColorPickerToggle={(agentId) => {
          agentConfig.setShowColorPicker(!agentConfig.showColorPicker);
          agentConfig.setEditingAgentId(agentId);
        }}
        onColorSelect={(color) => {
          agentConfig.handleAgentUpdate(agentConfig.editingAgentId, { color });
          agentConfig.setShowColorPicker(false);
        }}
        isColorUsed={agentConfig.isColorUsedFn}
        getAvailableColorsCount={agentConfig.getAvailableColorsCountFn}
        isNameUsed={agentConfig.isNameUsedFn}
      />
    );
  }

  // Render chat view
  if (currentConversationIndex >= 0) {
    return (
      <ChatView
        conversation={currentConversation!}
        onBackToList={() => setCurrentConversationIndex(-1)}
        getAgentById={getAgentById}
      />
    );
  }

  // Render conversation list or upload interface
  return (
    <>
      <div className="p-8 space-y-6 animate-fade-in">
        <ConversationListView
          conversations={storage.conversations}
          showUploadInterface={showUploadInterface}
          isConfiguring={isConfiguring}
          isUploading={upload.isUploading}
          uploadError={upload.uploadError}
          editingConversationId={editor.editingConversationId}
          editingConversationName={editor.editingConversationName}
          onToggleUploadInterface={() => setShowUploadInterface(!showUploadInterface)}
              onFileUpload={handleFileUpload}
          onViewConversation={handleViewConversation}
          onStartEditConversationName={editor.startEditConversationName}
          onSaveConversationName={handleSaveConversationName}
          onCancelEditConversationName={editor.cancelEditConversationName}
          onDeleteConversation={handleDeleteConversation}
          onSetEditingConversationName={editor.setEditingConversationName}
          onConversationNameKeyPress={editor.handleConversationNameKeyPress}
        />
      </div>

      <ConfirmationPopup
        isOpen={deletion.showDeleteConfirmation}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${deletion.conversationToDelete?.conversation.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteConversation}
        onCancel={deletion.cancelDeleteConversation}
        type="danger"
      />
    </>
  );
};
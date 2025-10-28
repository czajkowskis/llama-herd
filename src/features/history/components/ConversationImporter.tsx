import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadInterface } from '../../../components/common/UploadInterface';
import { backendStorageService } from '../../../services/backendStorageService';
import { ImportHeader } from './ImportHeader';
import { useConversationUpload } from '../hooks/useConversationUpload';
import { useAgentConfiguration } from '../hooks/useAgentConfiguration';
import { AgentConfiguration } from '../../experiments/components/AgentConfiguration';

export const ConversationImporter: React.FC = () => {
  const navigate = useNavigate();
  const upload = useConversationUpload();
  const agentConfig = useAgentConfiguration();
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await upload.handleFileUpload(event);
    if (upload.pendingConversations.length > 0) {
      agentConfig.setAgents(upload.pendingConversations[0].agents);
      setIsConfiguring(true);
    }
  };

  const handleConfirmConfiguration = async () => {
    const { hasDuplicateColors, hasDuplicateNames } = agentConfig.validateAgents();
    if (hasDuplicateColors || hasDuplicateNames) {
      return;
    }
    const currentPending = upload.pendingConversations[upload.pendingConversationIndex];
    const updatedConversation = { ...currentPending, agents: agentConfig.agents };
    
    const success = await backendStorageService.saveConversation(updatedConversation);

    if (!success) {
      console.error("Failed to save conversation");
      return;
    }
    
    if (upload.pendingConversationIndex < upload.pendingConversations.length - 1) {
      const nextIndex = upload.pendingConversationIndex + 1;
      upload.setPendingConversationIndex(nextIndex);
      agentConfig.setAgents(upload.pendingConversations[nextIndex].agents);
    } else {
      setIsConfiguring(false);
      upload.clearPendingConversations();
      navigate('/history', { state: { activeTab: 'conversations' } });
    }
  };

  if (isConfiguring) {
    return (
      <AgentConfiguration
        agents={agentConfig.agents}
        pendingConversations={upload.pendingConversations}
        pendingConversationIndex={upload.pendingConversationIndex}
        isEditingConversationTitle={false}
        editingConversationTitle=""
        colorError={agentConfig.colorError}
        nameError={agentConfig.nameError}
        showColorPicker={agentConfig.showColorPicker}
        editingAgentId={agentConfig.editingAgentId}
        onAgentUpdate={agentConfig.handleAgentUpdate}
        onConfirmConfiguration={handleConfirmConfiguration}
        onStartEditConversationTitle={() => {}}
        onSaveConversationTitle={() => {}}
        onCancelEditConversationTitle={() => {}}
        onConversationTitleChange={() => {}}
        onConversationTitleKeyPress={() => {}}
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

  return (
    <div className="p-8 animate-fade-in">
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <ImportHeader conversationsCount={0} />
        <UploadInterface
          conversations={[]}
          isUploading={upload.isUploading}
          uploadError={upload.uploadError}
          onFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
};

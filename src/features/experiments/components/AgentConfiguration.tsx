import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ColorPicker } from '../../../components/ui/ColorPicker';
import { ErrorDisplay } from '../../../components/common/ErrorDisplay';
import { ConversationAgent } from '../../../types/index.d';
import { AgentItem } from './AgentItem';
import { ConfigurationHeader } from './ConfigurationHeader';

interface AgentConfigurationProps {
  agents: ConversationAgent[];
  pendingConversations: any[];
  pendingConversationIndex: number;
  isEditingConversationTitle: boolean;
  editingConversationTitle: string;
  colorError: string;
  nameError: string;
  showColorPicker: boolean;
  editingAgentId: string;
  onAgentUpdate: (agentId: string, updates: Partial<ConversationAgent>) => void;
  onConfirmConfiguration: () => void;
  onStartEditConversationTitle: () => void;
  onSaveConversationTitle: () => void;
  onCancelEditConversationTitle: () => void;
  onConversationTitleChange: (title: string) => void;
  onConversationTitleKeyPress: (e: React.KeyboardEvent) => void;
  onColorPickerToggle: (agentId: string) => void;
  onColorSelect: (color: string) => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
  isNameUsed: (name: string, excludeAgentId?: string) => boolean;
}

export const AgentConfiguration: React.FC<AgentConfigurationProps> = ({
  agents,
  pendingConversations,
  pendingConversationIndex,
  isEditingConversationTitle,
  editingConversationTitle,
  colorError,
  nameError,
  showColorPicker,
  editingAgentId,
  onAgentUpdate,
  onConfirmConfiguration,
  onStartEditConversationTitle,
  onSaveConversationTitle,
  onCancelEditConversationTitle,
  onConversationTitleChange,
  onConversationTitleKeyPress,
  onColorPickerToggle,
  onColorSelect,
  isColorUsed,
  getAvailableColorsCount,
  isNameUsed
}) => {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <ConfigurationHeader
          pendingConversations={pendingConversations}
          pendingConversationIndex={pendingConversationIndex}
          isEditingConversationTitle={isEditingConversationTitle}
          editingConversationTitle={editingConversationTitle}
          onStartEditConversationTitle={onStartEditConversationTitle}
          onSaveConversationTitle={onSaveConversationTitle}
          onCancelEditConversationTitle={onCancelEditConversationTitle}
          onConversationTitleChange={onConversationTitleChange}
          onConversationTitleKeyPress={onConversationTitleKeyPress}
        />

        <ErrorDisplay colorError={colorError} nameError={nameError} />

        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              colorError={colorError}
              nameError={nameError}
              showColorPicker={showColorPicker}
              editingAgentId={editingAgentId}
              onAgentUpdate={onAgentUpdate}
              onColorPickerToggle={onColorPickerToggle}
              onColorSelect={onColorSelect}
              isColorUsed={isColorUsed}
              getAvailableColorsCount={getAvailableColorsCount}
              isNameUsed={isNameUsed}
            />
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={onConfirmConfiguration}
            disabled={!!(colorError || nameError)}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Finish Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}; 
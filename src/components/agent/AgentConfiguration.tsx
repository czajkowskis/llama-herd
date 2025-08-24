import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ConversationAgent } from '../../types/index.d';

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
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold text-white">Configure Agents</h2>
            {pendingConversations.length > 1 && (
              <span className="text-sm text-gray-400">
                ({pendingConversationIndex + 1} of {pendingConversations.length})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isEditingConversationTitle ? (
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 text-sm">Title:</span>
                <div className="relative">
                  <Input
                    value={editingConversationTitle}
                    onChange={(e) => onConversationTitleChange(e.target.value)}
                    onKeyDown={onConversationTitleKeyPress}
                    onBlur={onSaveConversationTitle}
                    className="bg-gray-600 border-gray-500 text-white text-sm w-64 pr-16"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button
                      onClick={onSaveConversationTitle}
                      className="text-green-400 hover:text-green-300 p-1.5 rounded-full transition-colors duration-200"
                      title="Save title"
                    >
                      <Icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      </Icon>
                    </button>
                    <button
                      onClick={onCancelEditConversationTitle}
                      className="text-gray-400 hover:text-red-400 p-1.5 rounded-full transition-colors duration-200"
                      title="Cancel edit"
                    >
                      <Icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                          <path d="M18 6 6 18"/>
                          <path d="m6 6 12 12"/>
                        </svg>
                      </Icon>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 text-sm">Title:</span>
                <Input
                  value={pendingConversations[pendingConversationIndex]?.title || ''}
                  readOnly
                  className="bg-gray-600 border-gray-500 text-white text-sm w-64 cursor-pointer hover:bg-gray-500"
                  onClick={onStartEditConversationTitle}
                />
              </div>
            )}
          </div>
        </div>

        <ErrorDisplay colorError={colorError} nameError={nameError} />

        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-xl">
              <div className="relative color-picker-container">
                <button
                  onClick={() => onColorPickerToggle(agent.id)}
                  className={`w-12 h-12 rounded border-2 transition-all duration-200 ${
                    colorError && isColorUsed(agent.color, agent.id) ? 'border-red-500' : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: agent.color }}
                  aria-label="Select agent color"
                />
                <ColorPicker
                  isVisible={showColorPicker && editingAgentId === agent.id}
                  agentId={agent.id}
                  currentColor={agent.color}
                  onColorSelect={onColorSelect}
                  onClose={() => onColorPickerToggle(agent.id)}
                  isColorUsed={isColorUsed}
                  getAvailableColorsCount={getAvailableColorsCount}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <Input
                  value={agent.name}
                  onChange={(e) => onAgentUpdate(agent.id, { name: e.target.value })}
                  placeholder="Agent name"
                  className={`bg-gray-600 border-gray-500 w-full ${nameError && isNameUsed(agent.name, agent.id) ? 'border-red-500' : ''}`}
                />
                {nameError && isNameUsed(agent.name, agent.id) && (
                  <p className="text-red-400 text-sm mt-1">{nameError}</p>
                )}
              </div>
              <div className="text-sm text-gray-400 flex-shrink-0">
                {agent.model}
              </div>
            </div>
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
import { useState, useEffect } from 'react';
import { ConversationAgent } from '../../../types/index.d';
import { 
  isColorUsed, 
  isNameUsed, 
  getAvailableColorsCount 
} from '../utils/agentColorUtils';

export interface UseAgentConfigurationReturn {
  agents: ConversationAgent[];
  colorError: string;
  nameError: string;
  showColorPicker: boolean;
  editingAgentId: string;
  setAgents: (agents: ConversationAgent[]) => void;
  handleAgentUpdate: (agentId: string, updates: Partial<ConversationAgent>) => void;
  setShowColorPicker: (show: boolean) => void;
  setEditingAgentId: (id: string) => void;
  clearErrors: () => void;
  validateAgents: () => { hasDuplicateColors: boolean; hasDuplicateNames: boolean };
  isColorUsedFn: (color: string, excludeAgentId?: string) => boolean;
  isNameUsedFn: (name: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCountFn: (excludeAgentId?: string) => number;
  setColorError: (error: string) => void;
  setNameError: (error: string) => void;
}

export const useAgentConfiguration = (initialAgents: ConversationAgent[] = []): UseAgentConfigurationReturn => {
  const [agents, setAgents] = useState<ConversationAgent[]>(initialAgents);
  const [colorError, setColorError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [editingAgentId, setEditingAgentId] = useState<string>('');

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const handleAgentUpdate = (agentId: string, updates: Partial<ConversationAgent>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...updates } : agent
    ));

    // Clear previous errors
    setColorError('');
    setNameError('');

    // Validate color uniqueness
    if (updates.color) {
      if (isColorUsed(agents, updates.color, agentId)) {
        const existingAgent = agents.find(agent => 
          agent.color === updates.color && agent.id !== agentId
        );
        setColorError(`This color is already used by agent "${existingAgent?.name}". Please choose a different color.`);
      }
    }

    // Validate name uniqueness
    if (updates.name) {
      if (isNameUsed(agents, updates.name, agentId)) {
        const existingAgent = agents.find(agent => 
          agent.name.toLowerCase() === updates.name?.toLowerCase() && agent.id !== agentId
        );
        setNameError(`This name is already used by agent "${existingAgent?.name}". Please choose a different name.`);
      }
    }
  };

  const clearErrors = () => {
    setColorError('');
    setNameError('');
  };

  const validateAgents = () => {
    const hasDuplicateColors = agents.some((agent, index) => 
      agents.some((otherAgent, otherIndex) => 
        index !== otherIndex && agent.color === otherAgent.color
      )
    );

    const hasDuplicateNames = agents.some((agent, index) => 
      agents.some((otherAgent, otherIndex) => 
        index !== otherIndex && agent.name.toLowerCase() === otherAgent.name.toLowerCase()
      )
    );

    return { hasDuplicateColors, hasDuplicateNames };
  };

  const isColorUsedFn = (color: string, excludeAgentId?: string): boolean => {
    return isColorUsed(agents, color, excludeAgentId);
  };

  const isNameUsedFn = (name: string, excludeAgentId?: string): boolean => {
    return isNameUsed(agents, name, excludeAgentId);
  };

  const getAvailableColorsCountFn = (excludeAgentId?: string) => {
    return getAvailableColorsCount(agents, excludeAgentId);
  };

  return {
    agents,
    colorError,
    nameError,
    showColorPicker,
    editingAgentId,
    setAgents,
    handleAgentUpdate,
    setShowColorPicker,
    setEditingAgentId,
    clearErrors,
    validateAgents,
    isColorUsedFn,
    isNameUsedFn,
    getAvailableColorsCountFn,
    setColorError,
    setNameError,
  };
};

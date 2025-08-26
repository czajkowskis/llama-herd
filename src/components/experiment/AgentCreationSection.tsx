import React from 'react';
import { Icon } from '../ui/Icon';
import { AgentList } from '../agent/AgentList';
import { AgentForm } from '../agent/AgentForm';
import { Agent } from '../../types/index.d';

interface AgentCreationSectionProps {
  agents: Agent[];
  agentCreationStep: 'list' | 'create' | 'edit';
  editingAgent: Agent | null;
  ollamaModels: string[];
  isLoadingOllamaModels: boolean;
  ollamaError: string | null;
  onAgentCreationStepChange: (step: 'list' | 'create' | 'edit') => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onSaveAgent: (agent: Omit<Agent, 'id'>) => void;
  onCancelEdit: () => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  isNameUsed: (name: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
}

export const AgentCreationSection: React.FC<AgentCreationSectionProps> = ({
  agents,
  agentCreationStep,
  editingAgent,
  ollamaModels,
  isLoadingOllamaModels,
  ollamaError,
  onAgentCreationStepChange,
  onEditAgent,
  onDeleteAgent,
  onSaveAgent,
  onCancelEdit,
  isColorUsed,
  isNameUsed,
  getAvailableColorsCount
}) => {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="text-purple-400 text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </Icon>
        <h2 className="text-xl font-semibold text-white">Create your agents</h2>
      </div>

      {agentCreationStep === 'list' && (
        <AgentList
          agents={agents}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
          onAddAgent={() => onAgentCreationStepChange('create')}
        />
      )}

      {(agentCreationStep === 'create' || agentCreationStep === 'edit') && (
        <AgentForm
          editingAgent={editingAgent}
          agents={agents}
          ollamaModels={ollamaModels}
          isLoadingOllamaModels={isLoadingOllamaModels}
          ollamaError={ollamaError}
          onSaveAgent={onSaveAgent}
          onCancel={onCancelEdit}
          isColorUsed={isColorUsed}
          isNameUsed={isNameUsed}
          getAvailableColorsCount={getAvailableColorsCount}
        />
      )}
    </div>
  );
}; 
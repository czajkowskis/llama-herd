import React from 'react';
import { Input } from '../../../components/ui/Input';
import { ColorPicker } from '../../../components/ui/ColorPicker';
import { ConversationAgent } from '../../../types/index.d';

interface AgentItemProps {
  agent: ConversationAgent;
  colorError: string;
  nameError: string;
  showColorPicker: boolean;
  editingAgentId: string;
  onAgentUpdate: (agentId: string, updates: Partial<ConversationAgent>) => void;
  onColorPickerToggle: (agentId: string) => void;
  onColorSelect: (color: string) => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
  isNameUsed: (name: string, excludeAgentId?: string) => boolean;
}

export const AgentItem: React.FC<AgentItemProps> = ({
  agent,
  colorError,
  nameError,
  showColorPicker,
  editingAgentId,
  onAgentUpdate,
  onColorPickerToggle,
  onColorSelect,
  isColorUsed,
  getAvailableColorsCount,
  isNameUsed,
}) => {
  return (
    <div className="flex items-center space-x-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
      <div className="relative color-picker-container">
        <button
          onClick={() => onColorPickerToggle(agent.id)}
          className={`w-12 h-12 rounded border-2 transition-all duration-200 ${
            colorError && isColorUsed(agent.color, agent.id) ? 'border-red-500' : ''
          }`}
          style={{ 
            backgroundColor: agent.color,
            borderColor: colorError && isColorUsed(agent.color, agent.id) ? '#ef4444' : 'var(--color-border)'
          }}
          onMouseEnter={(e) => {
            if (!(colorError && isColorUsed(agent.color, agent.id))) {
              e.currentTarget.style.borderColor = 'var(--color-text-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!(colorError && isColorUsed(agent.color, agent.id))) {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }
          }}
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
          className={`w-full ${nameError && isNameUsed(agent.name, agent.id) ? 'border-red-500' : ''}`}
        />
        {nameError && isNameUsed(agent.name, agent.id) && (
          <p className="text-red-400 text-sm mt-1">{nameError}</p>
        )}
      </div>
      <div className="text-sm flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
        {agent.model}
      </div>
    </div>
  );
};

import React from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Agent, ChatRules } from '../../../types/index.d';

interface AgentListProps {
  agents: Agent[];
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onAddAgent: () => void;
  chatRules: ChatRules;
  onChatRulesChange: (rules: ChatRules) => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  onEditAgent,
  onDeleteAgent,
  onAddAgent,
  chatRules,
  onChatRulesChange
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);

  if (agents.length === 0) {
    return (
      <div className="py-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
        <p>No agents created yet. Click the '+' button to add your first agent.</p>
        <button
          onClick={onAddAgent}
          className="mt-6 p-4 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 shadow-lg"
          aria-label="Add new agent"
        >
          <Icon className="text-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </Icon>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center p-4 rounded-xl shadow-md transition-transform duration-200 hover:scale-[1.01]"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div
            className="w-12 h-12 rounded-lg mr-4 flex-shrink-0"
            style={{ backgroundColor: agent.color }}
          ></div>
          <span className="flex-grow font-medium" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</span>
          <button
            onClick={() => onEditAgent(agent)}
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#a855f7'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
            className="p-2 rounded-full transition-colors duration-200"
            aria-label={`Edit ${agent.name}`}
          >
            <Icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
            </Icon>
          </button>
          <button
            onClick={() => onDeleteAgent(agent)}
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
            className="p-2 rounded-full transition-colors duration-200 ml-2"
            aria-label={`Delete ${agent.name}`}
          >
            <Icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </Icon>
          </button>
        </div>
      ))}
      <div className="flex justify-center mt-6">
        <button
          onClick={onAddAgent}
          className="p-4 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 shadow-lg"
          aria-label="Add new agent"
        >
          <Icon className="text-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </Icon>
        </button>
      </div>

      <div className="mb-8"></div>

      {/* Chat Rules Configuration */}
      <div className="pt-6 mt-6">
        <h3 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>Chat Configuration</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-base font-medium mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              Max Rounds
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={chatRules.maxRounds}
              onChange={(e) => onChatRulesChange({ ...chatRules, maxRounds: parseInt(e.target.value) || 8 })}
              className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                fontSize: '1rem'
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-base font-medium mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              Speaker Selection
            </label>
            <select
              value={chatRules.teamType}
              onChange={(e) => {
                const newTeamType = e.target.value;
                onChatRulesChange({ 
                  ...chatRules, 
                  teamType: newTeamType as ChatRules['teamType'],
                });
              }}
              className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                fontSize: '1rem'
              }}
            >
              <option value="round_robin" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>Round Robin</option>
              <option value="selector" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>Selector</option>
            </select>
          </div>
        </div>
        
        {/* Selector Prompt Configuration - only show when Selector is selected */}
        {chatRules.teamType === 'selector' && (
          <div className="mt-6">
            <div className="mb-4">
              <label className="block text-base font-medium mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                Selector Prompt
              </label>
              <div className="text-sm mt-2 ml-0" style={{ color: 'var(--color-text-tertiary)' }}>
                Customize how the AI selects the next speaker to respond. Available placeholders:
              </div>
              <div className="text-sm mt-2 ml-4" style={{ color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                • {'{'}&#123;roles&#125;{'}'} - Agent names and their role descriptions<br/>
                • {'{'}&#123;participants&#125;{'}'} - List of available agents<br/>
                • {'{'}&#123;history&#125;{'}'} - Full conversation history
              </div>
            </div>
            <textarea
              value={chatRules.selectorPrompt || ''}
              onChange={(e) => onChatRulesChange({ ...chatRules, selectorPrompt: e.target.value })}
              rows={8}
              className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                fontFamily: 'monospace',
                fontSize: '0.95rem'
              }}
            />
          </div>
        )}
        
        {/* Advanced Chat Settings */}
        <div className="mt-6">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full p-4 transition-all duration-200 hover:bg-opacity-50"
            >
              <h4 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>Advanced Settings</h4>
              <Icon className="transition-transform duration-200" style={{ transform: showAdvancedSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </Icon>
            </button>

            {showAdvancedSettings && (
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {/* Allow Consecutive Messages Checkbox */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="allow-repeat-speaker"
              checked={chatRules.allowRepeatSpeaker || false}
              onChange={(e) => onChatRulesChange({ ...chatRules, allowRepeatSpeaker: e.target.checked })}
              className="w-5 h-5 rounded border-purple-600 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="allow-repeat-speaker" className="text-base" style={{ color: 'var(--color-text-primary)' }}>
              Allow Consecutive Messages
            </label>
            <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Allow the same agent to respond multiple times in a row
            </span>
          </div>
          
          {/* Termination Condition */}
          <div>
            <label className="block text-base font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Termination Phrase
            </label>
            <input
              type="text"
              value={chatRules.terminationCondition || ''}
              onChange={(e) => onChatRulesChange({ ...chatRules, terminationCondition: e.target.value })}
              placeholder="e.g., TERMINATE, DONE, FINISHED"
              className="w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                fontSize: '1rem'
              }}
            />
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Stop the conversation when this phrase appears in a message (case-sensitive)
            </p>
          </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
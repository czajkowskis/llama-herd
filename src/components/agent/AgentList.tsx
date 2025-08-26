import React from 'react';
import { Icon } from '../ui/Icon';
import { Agent } from '../../types/index.d';

interface AgentListProps {
  agents: Agent[];
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onAddAgent: () => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  onEditAgent,
  onDeleteAgent,
  onAddAgent
}) => {
  if (agents.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
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
          className="flex items-center bg-gray-700 p-4 rounded-xl shadow-md transition-transform duration-200 hover:scale-[1.01]"
        >
          <div
            className="w-12 h-12 rounded-lg mr-4 flex-shrink-0"
            style={{ backgroundColor: agent.color }}
          ></div>
          <span className="flex-grow text-white font-medium">{agent.name}</span>
          <button
            onClick={() => onEditAgent(agent)}
            className="text-gray-400 hover:text-purple-400 p-2 rounded-full transition-colors duration-200"
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
            className="text-gray-400 hover:text-red-400 p-2 rounded-full transition-colors duration-200 ml-2"
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
    </div>
  );
}; 
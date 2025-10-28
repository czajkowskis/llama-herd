import { AGENT_COLORS } from '../constants/agentColors';
import { ConversationAgent } from '../../../types/index.d';

export const generateRandomColor = (): string => {
  return AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
};

export const generateUniqueColors = (count: number): string[] => {
  const shuffledColors = [...AGENT_COLORS].sort(() => Math.random() - 0.5);
  return shuffledColors.slice(0, count);
};

export const generateUniqueColorsForAgents = (agentNames: string[]): string[] => {
  const shuffledColors = [...AGENT_COLORS].sort(() => Math.random() - 0.5);
  const uniqueColors: string[] = [];
  
  for (let i = 0; i < agentNames.length; i++) {
    // Find the first unused color
    const availableColor = shuffledColors.find(color => 
      !uniqueColors.includes(color)
    );
    
    if (availableColor) {
      uniqueColors.push(availableColor);
    } else {
      // Fallback: generate a random color if we run out of predefined ones
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
      uniqueColors.push(randomColor);
    }
  }
  
  return uniqueColors;
};

export const isColorUsed = (agents: ConversationAgent[], color: string, excludeAgentId?: string): boolean => {
  return agents.some(agent => 
    agent.color === color && agent.id !== excludeAgentId
  );
};

export const isNameUsed = (agents: ConversationAgent[], name: string, excludeAgentId?: string): boolean => {
  return agents.some(agent => 
    agent.name.toLowerCase() === name.toLowerCase() && agent.id !== excludeAgentId
  );
};

export const getAvailableColorsCount = (agents: ConversationAgent[], excludeAgentId?: string) => {
  return AGENT_COLORS.length - agents.filter(agent => agent.id !== excludeAgentId).length;
};

export const getContrastColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

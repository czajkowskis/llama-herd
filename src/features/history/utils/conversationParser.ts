import { ConversationAgent, Message } from '../../../types/index.d';
import { StoredConversation } from '../../../services/backendStorageService';
import { generateUniqueColorsForAgents, getContrastColor } from './agentColorUtils';

export interface ParsedConversationData {
  title: string;
  messages: any[];
}

export const validateConversationStructure = (data: any, fileName: string): void => {
  if (!data.messages || !Array.isArray(data.messages)) {
    throw new Error(`Invalid JSON structure in ${fileName}: missing or invalid messages array`);
  }
};

export const extractAgentsFromMessages = (messages: any[]): Map<string, { name: string; model: string }> => {
  const uniqueAgents = new Map<string, { name: string; model: string }>();
  
  messages.forEach((msg: any) => {
    if (msg.agent && msg.agent.name) {
      const model = msg.agent.model || msg.model || 'Unknown Model';
      uniqueAgents.set(msg.agent.name, { 
        name: msg.agent.name, 
        model: model 
      });
    }
  });
  
  return uniqueAgents;
};

export const createConversationAgents = (agentData: Map<string, { name: string; model: string }>): ConversationAgent[] => {
  const agentNames = Array.from(agentData.values()).map(a => a.name);
  const uniqueColors = generateUniqueColorsForAgents(agentNames);
  
  return Array.from(agentData.values()).map((agentData, index) => ({
    id: `agent-${index}`,
    name: agentData.name,
    color: uniqueColors[index],
    originalName: agentData.name,
    model: agentData.model
  }));
};

export const createConversationMessages = (messages: any[], agentMap: Map<string, string>): Message[] => {
  return messages.map((msg: any, index: number) => ({
    id: `msg-${index}`,
    agentId: agentMap.get(msg.agent?.name) || 'unknown',
    content: msg.content || msg.message || '',
    timestamp: msg.timestamp || new Date().toISOString(),
    model: msg.agent?.model || msg.model
  }));
};

export const parseConversationFile = async (file: File): Promise<StoredConversation> => {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate the JSON structure
  validateConversationStructure(data, file.name);

  let conversationAgents: ConversationAgent[];
  let messages: Message[];

  // Check if agents array exists in the JSON (new format)
  if (data.agents && Array.isArray(data.agents) && data.agents.length > 0) {
    // Use agents from the JSON directly
    conversationAgents = data.agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      color: agent.color,
      originalName: agent.originalName || agent.name,
      model: agent.model
    }));

    // Create agent ID mapping for messages
    const agentIdMap = new Map<string, string>();
    conversationAgents.forEach(agent => {
      agentIdMap.set(agent.id, agent.id); // Map existing IDs to themselves
    });

    // Convert messages using agentId references
    messages = data.messages.map((msg: any, index: number) => ({
      id: msg.id || `msg-${index}`,
      agentId: msg.agentId,
      content: msg.content || msg.message || '',
      timestamp: msg.timestamp || new Date().toISOString(),
      model: msg.model
    }));
  } else {
    // Legacy format: Extract agents from messages (backward compatibility)
    const uniqueAgents = extractAgentsFromMessages(data.messages);
    conversationAgents = createConversationAgents(uniqueAgents);

    // Create agent mapping for messages (legacy format uses agent.name)
    const agentMap = new Map<string, string>();
    conversationAgents.forEach(agent => {
      agentMap.set(agent.originalName!, agent.id);
    });

    messages = createConversationMessages(data.messages, agentMap);
  }

  return {
    id: data.id || `conv-${Date.now()}-${Math.random()}`,
    title: data.title || file.name.replace('.json', ''),
    agents: conversationAgents,
    messages: messages,
    createdAt: data.createdAt || new Date().toISOString(),
    importedAt: data.importedAt || new Date().toISOString(),
    source: data.source || 'import'
  };
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Re-export getContrastColor for convenience
export { getContrastColor };

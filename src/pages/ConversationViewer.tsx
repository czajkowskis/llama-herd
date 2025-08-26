import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationAgent, Message } from '../types/index.d';
import { AgentConfiguration } from '../components/agent/AgentConfiguration';
import { ConversationList } from '../components/conversation/ConversationList';
import { ChatView } from '../components/conversation/ChatView';
import { UploadInterface } from '../components/common/UploadInterface';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { ConfirmationPopup } from '../components/ui/ConfirmationPopup';
import { backendStorageService } from '../services/backendStorageService';

// Available colors for agents
const AGENT_COLORS = [
  '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', 
  '#06B6D4', '#8B5CF6', '#F97316', '#84CC16', '#F43F5E',
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#F97316'
];

export const ConversationViewer: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [agents, setAgents] = useState<ConversationAgent[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number>(-1);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [showUploadInterface, setShowUploadInterface] = useState<boolean>(false);
  const [editingConversationTitle, setEditingConversationTitle] = useState<string>('');
  const [isEditingConversationTitle, setIsEditingConversationTitle] = useState<boolean>(false);
  const [pendingConversations, setPendingConversations] = useState<Conversation[]>([]);
  const [pendingConversationIndex, setPendingConversationIndex] = useState<number>(0);
  const [colorError, setColorError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [editingAgentId, setEditingAgentId] = useState<string>('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ index: number; conversation: Conversation } | null>(null);

  // Load conversations from backend storage on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const backendConversations = await backendStorageService.getConversations('import');
        console.log('ConversationViewer: All backend conversations:', backendConversations);
        
        const importedConversations: Conversation[] = backendConversations
          .filter(c => c.source === 'import')
          .map(c => ({
            id: c.id,
            title: c.title,
            agents: c.agents,
            messages: c.messages,
            createdAt: c.createdAt
          }));
        
        console.log('ConversationViewer: Filtered imported conversations:', importedConversations);
        setConversations(importedConversations);
      } catch (error) {
        console.error('ConversationViewer: Failed to load conversations from backend:', error);
        setConversations([]);
      }
    };
    
    loadConversations();
  }, []);

  const currentConversation = currentConversationIndex >= 0 ? conversations[currentConversationIndex] : null;

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

  const generateRandomColor = (): string => {
    return AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
  };

  const generateUniqueColors = (count: number): string[] => {
    const shuffledColors = [...AGENT_COLORS].sort(() => Math.random() - 0.5);
    return shuffledColors.slice(0, count);
  };

  const generateUniqueColorsForAgents = (agentNames: string[]): string[] => {
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

  const isColorUsed = (color: string, excludeAgentId?: string): boolean => {
    return agents.some(agent => 
      agent.color === color && agent.id !== excludeAgentId
    );
  };

  const isNameUsed = (name: string, excludeAgentId?: string): boolean => {
    return agents.some(agent => 
      agent.name.toLowerCase() === name.toLowerCase() && agent.id !== excludeAgentId
    );
  };

  const getAvailableColorsCount = (excludeAgentId?: string) => {
    return AGENT_COLORS.length - agents.filter(agent => agent.id !== excludeAgentId).length;
  };

  const getContrastColor = (backgroundColor: string): string => {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const newConversations: Conversation[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the JSON structure
        if (!data.messages || !Array.isArray(data.messages)) {
          throw new Error(`Invalid JSON structure in ${file.name}: missing or invalid messages array`);
        }

        // Extract unique agents from messages with their models
        const uniqueAgents = new Map<string, { name: string; model: string }>();
        data.messages.forEach((msg: any) => {
          if (msg.agent && msg.agent.name) {
            const model = msg.agent.model || msg.model || 'Unknown Model';
            uniqueAgents.set(msg.agent.name, { 
              name: msg.agent.name, 
              model: model 
            });
          }
        });

        // Create conversation agents with unique colors
        const uniqueColors = generateUniqueColorsForAgents(Array.from(uniqueAgents.values()).map(a => a.name));
        const conversationAgents: ConversationAgent[] = Array.from(uniqueAgents.values()).map((agentData, index) => ({
          id: `agent-${index}`,
          name: agentData.name,
          color: uniqueColors[index],
          originalName: agentData.name,
          model: agentData.model
        }));

        // Create agent mapping for messages
        const agentMap = new Map<string, string>();
        conversationAgents.forEach(agent => {
          agentMap.set(agent.originalName!, agent.id);
        });

        // Convert messages to our format
        const messages: Message[] = data.messages.map((msg: any, index: number) => ({
          id: `msg-${index}`,
          agentId: agentMap.get(msg.agent?.name) || 'unknown',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          model: msg.agent?.model || msg.model
        }));

        const newConversation: Conversation = {
          id: `conv-${Date.now()}-${i}`,
          title: data.title || file.name.replace('.json', ''),
          agents: conversationAgents,
          messages: messages,
          createdAt: new Date().toISOString()
        };

        newConversations.push(newConversation);
      }

      // Store conversations as pending and show configuration
      setPendingConversations(newConversations);
      setPendingConversationIndex(0);
      setAgents(newConversations[0].agents);
      setIsConfiguring(true);

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to parse conversation file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAgentUpdate = (agentId: string, updates: Partial<ConversationAgent>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...updates } : agent
    ));

    // Clear previous errors
    setColorError('');
    setNameError('');

    // Validate color uniqueness
    if (updates.color) {
      if (isColorUsed(updates.color, agentId)) {
        const existingAgent = agents.find(agent => 
          agent.color === updates.color && agent.id !== agentId
        );
        setColorError(`This color is already used by agent "${existingAgent?.name}". Please choose a different color.`);
      }
    }

    // Validate name uniqueness
    if (updates.name) {
      if (isNameUsed(updates.name, agentId)) {
        const existingAgent = agents.find(agent => 
          agent.name.toLowerCase() === updates.name?.toLowerCase() && agent.id !== agentId
        );
        setNameError(`This name is already used by agent "${existingAgent?.name}". Please choose a different name.`);
      }
    }
  };

  const handleConfirmConfiguration = async () => {
    // Check for duplicate colors or names
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

    if (hasDuplicateColors) {
      setColorError('Please ensure all agents have unique colors.');
      return;
    }

    if (hasDuplicateNames) {
      setNameError('Please ensure all agents have unique names.');
      return;
    }

    if (pendingConversations.length === 0) return;

    // Update conversation with configured agents
    const currentPending = pendingConversations[pendingConversationIndex];
    const updatedConversation: Conversation = {
      ...currentPending,
      agents: agents
    };

    // Add to conversations list
    setConversations(prev => [...prev, updatedConversation]);
    
    // Save to backend storage only
    const storedConversation = {
      id: updatedConversation.id,
      title: updatedConversation.title,
      agents: updatedConversation.agents,
      messages: updatedConversation.messages,
      createdAt: updatedConversation.createdAt,
      importedAt: new Date().toISOString(),
      source: 'import' as const,
    };
    
    // Save to backend storage - convert to snake_case for backend
    const backendConversation = {
      ...storedConversation,
      imported_at: storedConversation.importedAt, // Backend expects snake_case
    };
    console.log('ConversationViewer: Saving conversation to backend storage:', backendConversation);
    console.log('ConversationViewer: Using backendStorageService.saveConversation...');
    try {
      const backendSuccess = await backendStorageService.saveConversation(backendConversation);
      console.log('ConversationViewer: Backend save result:', backendSuccess);
      if (backendSuccess) {
        console.log('ConversationViewer: Successfully saved to backend storage');
      } else {
        console.error('ConversationViewer: Failed to save to backend storage');
      }
    } catch (error) {
      console.error('ConversationViewer: Error saving to backend storage:', error);
      console.error('ConversationViewer: Error details:', error);
    }

    // Move to next pending conversation or finish
    if (pendingConversationIndex < pendingConversations.length - 1) {
      const nextIndex = pendingConversationIndex + 1;
      setPendingConversationIndex(nextIndex);
      setAgents(pendingConversations[nextIndex].agents);
      setColorError('');
      setNameError('');
    } else {
      // All conversations configured - return to conversation selection view
      setPendingConversations([]);
      setPendingConversationIndex(0);
      setAgents([]);
      setIsConfiguring(false);
      setCurrentConversationIndex(-1); // Ensure user stays in selection view
      setShowUploadInterface(false); // Ensure upload interface is hidden
    }
  };

  const handleConversationSelect = (index: number) => {
    setCurrentConversationIndex(index);
    const conversation = conversations[index];
    setAgents(conversation.agents);
    setIsConfiguring(false);
  };

  const handleDeleteConversation = async (index: number) => {
    setConversationToDelete({ index, conversation: conversations[index] });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    const { index, conversation } = conversationToDelete;
    
    // Delete from backend storage
    try {
      const backendSuccess = await backendStorageService.deleteConversation(conversation.id);
      if (backendSuccess) {
        console.log('ConversationViewer: Successfully deleted from backend storage');
        
        // Remove from local state only after successful backend deletion
        setConversations(prev => prev.filter((_, i) => i !== index));
      } else {
        console.error('ConversationViewer: Failed to delete from backend storage');
      }
    } catch (error) {
      console.error('ConversationViewer: Error deleting from backend storage:', error);
    }
    
    // If we're deleting the current conversation, select the next one or go back to list
    if (index === currentConversationIndex) {
      if (conversations.length > 1) {
        const newIndex = index === 0 ? 0 : index - 1;
        setCurrentConversationIndex(newIndex);
        setAgents(conversations[newIndex].agents);
      } else {
        setCurrentConversationIndex(-1);
        setAgents([]);
      }
    } else if (index < currentConversationIndex) {
      // Adjust current index if we deleted a conversation before the current one
      setCurrentConversationIndex(currentConversationIndex - 1);
    }
    
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

  const cancelDeleteConversation = () => {
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

  const handleStartEditTitle = (index: number) => {
    setEditingTitleIndex(index);
    setEditingTitle(conversations[index].title);
  };

  const handleSaveTitle = async () => {
    if (editingTitle.trim()) {
      const updatedConversations = conversations.map((conv, index) => 
        index === editingTitleIndex ? { ...conv, title: editingTitle.trim() } : conv
      );
      
      // Update local state
      setConversations(updatedConversations);
      
      // Save updated conversation to both localStorage and backend storage
      const updatedConversation = updatedConversations[editingTitleIndex];
      if (updatedConversation) {
        const storedConversation = {
          id: updatedConversation.id,
          title: updatedConversation.title,
          agents: updatedConversation.agents,
          messages: updatedConversation.messages,
          createdAt: updatedConversation.createdAt,
          importedAt: new Date().toISOString(),
          source: 'import' as const,
        };
        // Save to backend storage - convert to snake_case for backend
        const backendConversation = {
          ...storedConversation,
          imported_at: storedConversation.importedAt, // Backend expects snake_case
        };
        try {
          const backendSuccess = await backendStorageService.saveConversation(backendConversation);
          if (backendSuccess) {
            console.log('ConversationViewer: Successfully updated title in backend storage');
          } else {
            console.error('ConversationViewer: Failed to update title in backend storage');
          }
        } catch (error) {
          console.error('ConversationViewer: Error updating title in backend storage:', error);
        }
      }
    }
    setEditingTitleIndex(-1);
    setEditingTitle('');
  };

  const handleCancelEditTitle = () => {
    setEditingTitleIndex(-1);
    setEditingTitle('');
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  const handleStartEditConversationTitle = () => {
    const currentPending = pendingConversations[pendingConversationIndex];
    setEditingConversationTitle(currentPending.title);
    setIsEditingConversationTitle(true);
  };

  const handleSaveConversationTitle = () => {
    if (editingConversationTitle.trim()) {
      const updatedConversations = [...pendingConversations];
      updatedConversations[pendingConversationIndex] = {
        ...updatedConversations[pendingConversationIndex],
        title: editingConversationTitle.trim()
      };
      setPendingConversations(updatedConversations);
      setIsEditingConversationTitle(false);
    }
  };

  const handleCancelEditConversationTitle = () => {
    setIsEditingConversationTitle(false);
    setEditingConversationTitle('');
  };

  const handleConversationTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveConversationTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditConversationTitle();
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAgentById = (agentId: string): ConversationAgent | undefined => {
    return currentConversation?.agents.find(agent => agent.id === agentId);
  };

  // Render configuration window
  if (isConfiguring) {
    return (
      <AgentConfiguration
        agents={agents}
        pendingConversations={pendingConversations}
        pendingConversationIndex={pendingConversationIndex}
        isEditingConversationTitle={isEditingConversationTitle}
        editingConversationTitle={editingConversationTitle}
        colorError={colorError}
        nameError={nameError}
        showColorPicker={showColorPicker}
        editingAgentId={editingAgentId}
        onAgentUpdate={handleAgentUpdate}
        onConfirmConfiguration={handleConfirmConfiguration}
        onStartEditConversationTitle={handleStartEditConversationTitle}
        onSaveConversationTitle={handleSaveConversationTitle}
        onCancelEditConversationTitle={handleCancelEditConversationTitle}
        onConversationTitleChange={setEditingConversationTitle}
        onConversationTitleKeyPress={handleConversationTitleKeyPress}
        onColorPickerToggle={(agentId) => {
          setShowColorPicker(!showColorPicker);
          setEditingAgentId(agentId);
        }}
        onColorSelect={(color) => {
          handleAgentUpdate(editingAgentId, { color });
          setShowColorPicker(false);
        }}
        isColorUsed={isColorUsed}
        getAvailableColorsCount={getAvailableColorsCount}
        isNameUsed={isNameUsed}
      />
    );
  }

  // Render chat view
  if (currentConversationIndex >= 0) {
    return (
      <ChatView
        conversation={currentConversation!}
        onBackToList={() => setCurrentConversationIndex(-1)}
        getAgentById={getAgentById}
        getContrastColor={getContrastColor}
        formatTimestamp={formatTimestamp}
      />
    );
  }

  // Render conversation list or upload interface
  return (
    <>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-3">
              <Icon className="text-purple-400 text-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </Icon>
              <h2 className="text-xl font-semibold text-white">Conversation Viewer</h2>
            </div>
            {conversations.length > 0 && showUploadInterface && (
              <Button 
                onClick={() => setShowUploadInterface(false)}
                className="bg-gray-600 hover:bg-gray-700 text-sm px-3 py-1 flex items-center"
              >
                <Icon className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
                    <path d="m12 19-7-7 7-7"/>
                    <path d="M19 12H5"/>
                  </svg>
                </Icon>
                Back to Conversations
              </Button>
            )}
          </div>

          {conversations.length > 0 && !showUploadInterface && !isConfiguring ? (
            <ConversationList
              conversations={conversations}
              editingTitleIndex={editingTitleIndex}
              editingTitle={editingTitle}
              onConversationSelect={handleConversationSelect}
              onStartEditTitle={handleStartEditTitle}
              onSaveTitle={handleSaveTitle}
              onCancelEditTitle={handleCancelEditTitle}
              onDeleteConversation={handleDeleteConversation}
              onTitleChange={setEditingTitle}
              onTitleKeyPress={handleTitleKeyPress}
              onShowUploadInterface={() => setShowUploadInterface(true)}
              formatTimestamp={formatTimestamp}
            />
          ) : (
            <UploadInterface
              conversations={conversations}
              isUploading={isUploading}
              uploadError={uploadError}
              onFileUpload={handleFileUpload}
            />
          )}
        </div>
      </div>

      <ConfirmationPopup
        isOpen={showDeleteConfirmation}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${conversationToDelete?.conversation.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteConversation}
        onCancel={cancelDeleteConversation}
        type="danger"
      />
    </>
  );
}; 
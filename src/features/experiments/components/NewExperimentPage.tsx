import React, { useState, useEffect } from 'react';
import { Agent, Task, ChatRules } from '../../../types/index.d';
import { ollamaService } from '../../../services/ollamaService';
import { experimentService } from '../../../services/experimentService';
import { backendStorageService } from '../../../services/backendStorageService';
import { ConfirmationPopup } from '../../../components/ui/ConfirmationPopup';
import { TaskCreationSection } from './TaskCreationSection';
import { AgentCreationSection } from './AgentCreationSection';
import { ExperimentStatus } from './ExperimentStatus';

interface NewExperimentProps {
  onExperimentStart: (experimentId: string) => void;
}

// This page component manages the creation of new experiments.
export const NewExperiment: React.FC<NewExperimentProps> = ({ onExperimentStart }) => {
  const [taskCreationStep, setTaskCreationStep] = useState<'initial' | 'create' | 'import'>('initial');
  const [agentCreationStep, setAgentCreationStep] = useState<'list' | 'create' | 'edit'>('list');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isExperimentReady, setIsExperimentReady] = useState<boolean>(false);
  const [currentExperimentId, setCurrentExperimentId] = useState<string | null>(null);
  const [isStartingExperiment, setIsStartingExperiment] = useState<boolean>(false);
  const [experimentError, setExperimentError] = useState<string | null>(null);

  const [experimentName, setExperimentName] = useState<string>('');
  const [showDeleteAgentConfirmation, setShowDeleteAgentConfirmation] = useState<boolean>(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [chatRules, setChatRules] = useState<ChatRules>({ 
    maxRounds: 8, 
    teamType: 'round_robin',
    selectorPrompt: "Available roles:\n{roles}\n\nCurrent conversation history:\n{history}\n\nPlease select the most appropriate agent for the next message."
  });

  // Fetch Ollama models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingOllamaModels(true);
      setOllamaError(null);
      try {
        const models = await ollamaService.listModels();
        setOllamaModels(models);
      } catch (err: any) {
        setOllamaError(err.message || 'Failed to fetch Ollama models.');
      } finally {
        setIsLoadingOllamaModels(false);
      }
    };
    fetchModels();
  }, []);

  // Update experiment ready state when task or agents change
  useEffect(() => {
    setIsExperimentReady(currentTask !== null && agents.length > 0);
  }, [currentTask, agents]);

  const isColorUsed = (color: string, excludeAgentId?: string) => {
    return agents.some(agent => 
      agent.color === color && agent.id !== excludeAgentId
    );
  };

  const isNameUsed = (name: string, excludeAgentId?: string) => {
    return agents.some(agent => 
      agent.name.toLowerCase() === name.toLowerCase() && agent.id !== excludeAgentId
    );
  };

  const getAvailableColorsCount = (excludeAgentId?: string) => {
    return 9 - agents.filter(agent => agent.id !== excludeAgentId).length;
  };

  const getExperimentStatusMessage = () => {
    if (!currentTask && agents.length === 0) {
      return 'Create a task and add at least one agent to start the experiment.';
    } else if (!currentTask) {
      return 'Create a task to start the experiment.';
    } else if (agents.length === 0) {
      return 'Add at least one agent to start the experiment.';
    } else if (!experimentName.trim()) {
      return 'Give your experiment a name to start.';
    }
    return 'Ready to start experiment.';
  };

  const handleStartExperiment = async () => {
    if (isExperimentReady && currentTask) {
      setIsStartingExperiment(true);
      setExperimentError(null);
      
      try {
        const iterations = currentTask.iterations || 1;
        const response = await experimentService.startExperiment(currentTask, agents, iterations, chatRules);
        
        // Only update the title if user provided a custom experiment name
        // The backend already saves the experiment with a default title
        if (experimentName.trim()) {
          const customTitle = experimentName.trim();
          // Wait a bit to ensure the backend has finished creating the experiment
          setTimeout(async () => {
            try {
              const storedExperiment = {
                id: response.experiment_id,
                title: customTitle,
                task: currentTask,
                agents: agents,
                status: 'running',
                createdAt: new Date().toISOString(),
                iterations: currentTask.iterations || 1,
                currentIteration: 0
              };
              await backendStorageService.saveExperiment(storedExperiment);
            } catch (err) {
              console.warn('Failed to update experiment title:', err);
            }
          }, 500);
        }
        
        onExperimentStart(response.experiment_id);
      } catch (err: any) {
        setExperimentError(err.message || 'Failed to start experiment');
      } finally {
        setIsStartingExperiment(false);
      }
    }
  };

  const handleTaskEdit = (updatedTask: Task) => {
    setCurrentTask(updatedTask);
  };

  const handleTaskDelete = () => {
    setCurrentTask(null);
    setExperimentName('');
  };

  const handleTaskCreate = (task: Task) => {
    setCurrentTask(task);
    setTaskCreationStep('initial');
  };

  const handleTaskImport = (task: Task) => {
    setCurrentTask(task);
    setTaskCreationStep('initial');
  };

  const handleSaveAgent = (agentData: Omit<Agent, 'id'>) => {
    if (editingAgent) {
      // Update existing agent
      setAgents(prev => prev.map(agent => 
        agent.id === editingAgent.id 
          ? { ...agent, ...agentData }
          : agent
      ));
      setEditingAgent(null);
    } else {
      // Create new agent
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        ...agentData
      };
      setAgents(prev => [...prev, newAgent]);
    }
    setAgentCreationStep('list');
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentCreationStep('edit');
  };

  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteAgentConfirmation(true);
  };

  const confirmDeleteAgent = () => {
    if (agentToDelete) {
      setAgents(prev => prev.filter(agent => agent.id !== agentToDelete.id));
      setShowDeleteAgentConfirmation(false);
      setAgentToDelete(null);
    }
  };

  const cancelDeleteAgent = () => {
    setShowDeleteAgentConfirmation(false);
    setAgentToDelete(null);
  };

  const handleCancelEdit = () => {
    setAgentCreationStep('list');
    setEditingAgent(null);
  };

  // Removed unused function

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <TaskCreationSection
        currentTask={currentTask}
        taskCreationStep={taskCreationStep}
        onTaskCreationStepChange={setTaskCreationStep}
        onTaskEdit={handleTaskEdit}
        onTaskDelete={handleTaskDelete}
        onTaskCreate={handleTaskCreate}
        onTaskImport={handleTaskImport}
      />
      
      <AgentCreationSection
        agents={agents}
        agentCreationStep={agentCreationStep}
        editingAgent={editingAgent}
        ollamaModels={ollamaModels}
        isLoadingOllamaModels={isLoadingOllamaModels}
        ollamaError={ollamaError}
        onAgentCreationStepChange={setAgentCreationStep}
        onEditAgent={handleEditAgent}
        onDeleteAgent={handleDeleteAgent}
        onSaveAgent={handleSaveAgent}
        onCancelEdit={handleCancelEdit}
        isColorUsed={isColorUsed}
        isNameUsed={isNameUsed}
        getAvailableColorsCount={getAvailableColorsCount}
        chatRules={chatRules}
        onChatRulesChange={setChatRules}
      />
      
      <ExperimentStatus
        isExperimentReady={isExperimentReady}
        currentTask={currentTask}
        agents={agents}
        onStartExperiment={handleStartExperiment}
        getExperimentStatusMessage={getExperimentStatusMessage}
        isStartingExperiment={isStartingExperiment}
        experimentError={experimentError}
        experimentName={experimentName}
        onExperimentNameChange={setExperimentName}
      />

      <ConfirmationPopup
        isOpen={showDeleteAgentConfirmation}
        title="Delete Agent"
        message={`Are you sure you want to delete "${agentToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteAgent}
        onCancel={cancelDeleteAgent}
        type="danger"
      />
    </div>
  );
};
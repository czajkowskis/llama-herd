import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { ColorPicker } from '../../../components/ui/ColorPicker';
import { ErrorDisplay } from '../../../components/common/ErrorDisplay';
import { ErrorPopup } from '../../../components/ui/ErrorPopup';
import { Agent } from '../../../types/index.d';
import { validateTemperature, validateAgentName, validateAgentPrompt } from '../../../utils/validation';

// Predefined colors from ColorPicker component
const PREDEFINED_COLORS = [
  '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899',
  '#06B6D4', '#8B5CF6', '#F97316'
];

// Function to get the first available color
const getFirstAvailableColor = (agents: Agent[], excludeAgentId?: string): string => {
  for (const color of PREDEFINED_COLORS) {
    if (!agents.some(agent => agent.color === color && agent.id !== excludeAgentId)) {
      return color;
    }
  }
  // Fallback to first color if all are used
  return PREDEFINED_COLORS[0];
};

interface AgentFormProps {
  editingAgent: Agent | null;
  agents: Agent[];
  ollamaModels: string[];
  isLoadingOllamaModels: boolean;
  ollamaError: string | null;
  onSaveAgent: (agent: Omit<Agent, 'id'>) => void;
  onCancel: () => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  isNameUsed: (name: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
}

export const AgentForm: React.FC<AgentFormProps> = ({
  editingAgent,
  agents,
  ollamaModels,
  isLoadingOllamaModels,
  ollamaError,
  onSaveAgent,
  onCancel,
  isColorUsed,
  isNameUsed,
  getAvailableColorsCount
}) => {
  const [agentName, setAgentName] = useState<string>('');
  const [agentPrompt, setAgentPrompt] = useState<string>('');
  const [agentColor, setAgentColor] = useState<string>('');
  const [agentModel, setAgentModel] = useState<string>('');
  const [agentTemperature, setAgentTemperature] = useState<number>(0.7);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [colorError, setColorError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [temperatureError, setTemperatureError] = useState<string>('');
  const [promptError, setPromptError] = useState<string>('');
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>('');

  // Initialize form with editing agent data
  useEffect(() => {
    if (editingAgent) {
      setAgentName(editingAgent.name);
      setAgentPrompt(editingAgent.prompt);
      setAgentColor(editingAgent.color);
      setAgentModel(editingAgent.model);
      setAgentTemperature(editingAgent.temperature ?? 0.7);
    } else {
      // If user has a saved default model, use it when creating a new agent
      const savedDefault = localStorage.getItem('llama-herd-default-ollama-model') || '';
      setAgentName('');
      setAgentPrompt('');
      setAgentColor(getFirstAvailableColor(agents));
      setAgentModel(savedDefault);
      setAgentTemperature(0.7);
    }
    setColorError('');
    setNameError('');
    setTemperatureError('');
    setPromptError('');
  }, [editingAgent, agents]);

  // Initialize color when component mounts or agents change
  useEffect(() => {
    if (!editingAgent && !agentColor) {
      setAgentColor(getFirstAvailableColor(agents));
    }
  }, [agents, editingAgent, agentColor]);

  const handleSave = () => {
    // Clear previous errors
    setColorError('');
    setNameError('');
    setTemperatureError('');
    setPromptError('');

    // Validate agent name
    const nameValidation = validateAgentName(agentName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || 'Invalid agent name');
      return;
    }

    // Validate agent prompt
    const promptValidation = validateAgentPrompt(agentPrompt);
    if (!promptValidation.isValid) {
      setPromptError(promptValidation.error || 'Invalid agent prompt');
      return;
    }

    // Validate temperature
    const temperatureValidation = validateTemperature(agentTemperature);
    if (!temperatureValidation.isValid) {
      setTemperatureError(temperatureValidation.error || 'Invalid temperature');
      return;
    }

    if (!agentModel) {
      setErrorPopupMessage('Please select a model.');
      setShowErrorPopup(true);
      return;
    }

    // Validate color uniqueness
    if (isColorUsed(agentColor, editingAgent?.id)) {
      const existingAgent = agents.find(agent => 
        agent.color === agentColor && agent.id !== editingAgent?.id
      );
      setColorError(`This color is already used by agent "${existingAgent?.name}". Please choose a different color.`);
      return;
    }

    // Validate name uniqueness
    if (isNameUsed(agentName, editingAgent?.id)) {
      const existingAgent = agents.find(agent => 
        agent.name.toLowerCase() === agentName.toLowerCase() && agent.id !== editingAgent?.id
      );
      setNameError(`An agent named "${existingAgent?.name}" already exists. Please choose a different name.`);
      return;
    }

    // Save agent
    onSaveAgent({
      name: agentName.trim(),
      prompt: agentPrompt.trim(),
      color: agentColor,
      model: agentModel,
      temperature: agentTemperature
    });
  };

  const handleColorSelect = (color: string) => {
    setAgentColor(color);
    setShowColorPicker(false);
    
    // Real-time validation
    if (isColorUsed(color, editingAgent?.id)) {
      const existingAgent = agents.find(agent => 
        agent.color === color && agent.id !== editingAgent?.id
      );
      setColorError(`This color is already used by agent "${existingAgent?.name}". Please choose a different color.`);
    } else {
      setColorError('');
    }
  };

  const handleNameChange = (name: string) => {
    setAgentName(name);
    
    // Real-time validation - first check format
    const nameValidation = validateAgentName(name);
    if (!nameValidation.isValid) {
      const errorMessage = nameValidation.error || 'Invalid agent name';
      // Only set error if it's different from current error
      if (nameError !== errorMessage) {
        setNameError(errorMessage);
      }
    } else {
      // Format is valid, check uniqueness
      if (isNameUsed(name, editingAgent?.id)) {
        const existingAgent = agents.find(agent => 
          agent.name.toLowerCase() === name.toLowerCase() && agent.id !== editingAgent?.id
        );
        const errorMessage = `An agent named "${existingAgent?.name}" already exists. Please choose a different name.`;
        // Only set error if it's different from current error
        if (nameError !== errorMessage) {
          setNameError(errorMessage);
        }
      } else {
        // Clear error only if there was one
        if (nameError) {
          setNameError('');
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {editingAgent ? 'Edit Agent' : 'Name of an agent'}
      </h3>
      
      <div className="flex items-center space-x-3">
        <div className="relative color-picker-container">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
              colorError ? 'border-red-500' : ''
            }`}
            style={{ 
              backgroundColor: agentColor,
              borderColor: colorError ? '#ef4444' : 'var(--color-border)'
            }}
            onMouseEnter={(e) => {
              if (!colorError) {
                e.currentTarget.style.borderColor = 'var(--color-text-tertiary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!colorError) {
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }
            }}
            aria-label="Select agent color"
          />
          <ColorPicker
            isVisible={showColorPicker}
            agentId={editingAgent?.id || ''}
            currentColor={agentColor}
            onColorSelect={handleColorSelect}
            onClose={() => setShowColorPicker(false)}
            isColorUsed={isColorUsed}
            getAvailableColorsCount={getAvailableColorsCount}
          />
        </div>
        
        <div className="flex-1">
          <Input
            value={agentName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Agent name"
            className={nameError ? 'border-red-500' : ''}
          />
        </div>
        
        <div className="flex-1">
          <select
            value={agentModel}
            onChange={(e) => setAgentModel(e.target.value)}
            className="custom-themed w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>Select a model</option>
            {isLoadingOllamaModels ? (
              <option disabled style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>Loading models...</option>
            ) : ollamaError ? (
              <option disabled style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>Error loading models</option>
            ) : ollamaModels.length > 0 ? (
              ollamaModels.map((model, index) => (
                <option key={index} value={model} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>{model}</option>
              ))
            ) : (
              <option disabled style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>No models available</option>
            )}
          </select>
        </div>
      </div>

      <ErrorDisplay 
        colorError={colorError} 
        nameError={nameError} 
        temperatureError={temperatureError}
        promptError={promptError}
      />

      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>Temperature</h3>
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={agentTemperature}
          onChange={(e) => setAgentTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{agentTemperature.toFixed(2)}</div>
      </div>

      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>Prompt</h3>
      <Textarea
        rows={10}
        placeholder="You are the Coordinator responsible for guiding the team..."
        value={agentPrompt}
        onChange={(e) => setAgentPrompt(e.target.value)}
      />

      <div className="flex justify-end space-x-4">
        <Button onClick={onCancel} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} className="hover:opacity-80">
          Close
        </Button>
        <Button onClick={handleSave}>
          {editingAgent ? 'Update Agent' : 'Add an agent'}
        </Button>
      </div>
      
      <ErrorPopup
        isOpen={showErrorPopup}
        title="Validation Error"
        message={errorPopupMessage}
        onClose={() => setShowErrorPopup(false)}
        type="error"
      />
    </div>
  );
}; 
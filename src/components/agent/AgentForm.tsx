import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ColorPicker } from '../ui/ColorPicker';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Agent } from '../../types/index.d';

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
  const [agentColor, setAgentColor] = useState<string>('#EF4444');
  const [agentModel, setAgentModel] = useState<string>('');
  const [agentTemperature, setAgentTemperature] = useState<number>(0.7);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [colorError, setColorError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  // Initialize form with editing agent data
  useEffect(() => {
    if (editingAgent) {
      setAgentName(editingAgent.name);
      setAgentPrompt(editingAgent.prompt);
      setAgentColor(editingAgent.color);
      setAgentModel(editingAgent.model);
      setAgentTemperature(editingAgent.temperature ?? 0.7);
    } else {
      setAgentName('');
      setAgentPrompt('');
      setAgentColor('#EF4444');
      setAgentModel('');
      setAgentTemperature(0.7);
    }
    setColorError('');
    setNameError('');
  }, [editingAgent]);

  const handleSave = () => {
    // Validate required fields
    if (!agentName.trim()) {
      alert('Please enter an agent name.');
      return;
    }
    if (!agentPrompt.trim()) {
      alert('Please enter an agent prompt.');
      return;
    }
    if (!agentModel) {
      alert('Please select a model.');
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
    
    // Real-time validation
    if (isNameUsed(name, editingAgent?.id)) {
      const existingAgent = agents.find(agent => 
        agent.name.toLowerCase() === name.toLowerCase() && agent.id !== editingAgent?.id
      );
      setNameError(`An agent named "${existingAgent?.name}" already exists. Please choose a different name.`);
    } else {
      setNameError('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-lg font-medium text-gray-200">
        {editingAgent ? 'Edit Agent' : 'Name of an agent'}
      </h3>
      
      <div className="flex items-center space-x-3">
        <div className="relative color-picker-container">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
              colorError ? 'border-red-500' : 'border-gray-600 hover:border-gray-400'
            }`}
            style={{ backgroundColor: agentColor }}
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
          {nameError && (
            <p className="text-red-400 text-sm mt-1">{nameError}</p>
          )}
        </div>
        
        <div className="flex-1">
          <select
            value={agentModel}
            onChange={(e) => setAgentModel(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
          >
            <option value="">Select a model</option>
            {isLoadingOllamaModels ? (
              <option disabled>Loading models...</option>
            ) : ollamaError ? (
              <option disabled>Error loading models</option>
            ) : ollamaModels.length > 0 ? (
              ollamaModels.map((model, index) => (
                <option key={index} value={model}>{model}</option>
              ))
            ) : (
              <option disabled>No models available</option>
            )}
          </select>
        </div>
      </div>

      <ErrorDisplay colorError={colorError} nameError={nameError} />

      <h3 className="text-lg font-medium text-gray-200">Temperature</h3>
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
        <div className="text-sm text-gray-300">{agentTemperature.toFixed(2)}</div>
      </div>

      <h3 className="text-lg font-medium text-gray-200">Prompt</h3>
      <Textarea
        rows={10}
        placeholder="You are the Coordinator responsible for guiding the team..."
        value={agentPrompt}
        onChange={(e) => setAgentPrompt(e.target.value)}
      />

      <div className="flex justify-end space-x-4">
        <Button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700">
          Close
        </Button>
        <Button onClick={handleSave}>
          {editingAgent ? 'Update Agent' : 'Add an agent'}
        </Button>
      </div>
    </div>
  );
}; 
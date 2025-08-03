import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Icon } from '../components/Icon';
import { Agent, Task } from '../types/index.d';
import { ollamaService } from '../services/ollamaService';

// This page component manages the creation of new experiments.
export const NewExperiment: React.FC = () => {
  const [taskCreationStep, setTaskCreationStep] = useState<'initial' | 'create' | 'import'>('initial');
  const [agentCreationStep, setAgentCreationStep] = useState<'list' | 'create' | 'edit'>('list');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [newTaskPrompt, setNewTaskPrompt] = useState<string>('');
  const [importedTaskFile, setImportedTaskFile] = useState<File | null>(null);
  const [expectedSolutionRegex, setExpectedSolutionRegex] = useState<string>('');
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentPrompt, setNewAgentPrompt] = useState<string>('');
  const [newAgentColor, setNewAgentColor] = useState<string>('#EF4444');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [colorError, setColorError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isExperimentReady, setIsExperimentReady] = useState<boolean>(false);

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



  const handleImportTask = async () => {
    if (importedTaskFile) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsedTask = JSON.parse(content);
            if (Array.isArray(parsedTask) && parsedTask.every(t => t.task && t.answer)) {
              const taskId = `imported-task-${Date.now()}`;
              setCurrentTask({
                id: taskId,
                prompt: `Imported task with ${parsedTask.length} items.`,
              });
              setTaskCreationStep('initial');
              alert('Task imported successfully!');
            } else {
              alert('Invalid JSON structure. Expected an array of objects with "task" and "answer" properties.');
            }
          } catch (jsonError) {
            alert('Error parsing JSON file. Please ensure it is valid JSON.');
            console.error('JSON parsing error:', jsonError);
          }
        };
        reader.readAsText(importedTaskFile);
      } catch (fileError) {
        alert('Error reading file.');
        console.error('File reading error:', fileError);
      }
    } else {
      alert('Please select a file to import.');
    }
  };



  // Check if color is already used by another agent
  const isColorUsed = (color: string, excludeAgentId?: string) => {
    return agents.some(agent => 
      agent.color === color && agent.id !== excludeAgentId
    );
  };

  // Check if name is already used by another agent
  const isNameUsed = (name: string, excludeAgentId?: string) => {
    return agents.some(agent => 
      agent.name.toLowerCase() === name.toLowerCase() && agent.id !== excludeAgentId
    );
  };

  // Get available colors (excluding used ones)
  const getAvailableColors = (excludeAgentId?: string) => {
    const allColors = [
      '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4',
      '#8B5CF6', '#F97316', '#84CC16', '#06D6A0', '#3B82F6', '#F43F5E',
      '#A855F7', '#FB7185', '#14B8A6', '#F59E0B', '#84CC16', '#EF4444',
      '#8B5CF6', '#F97316', '#06D6A0', '#3B82F6', '#F43F5E', '#A855F7'
    ];
    return allColors.filter(color => !isColorUsed(color, excludeAgentId));
  };

  // Handle agent creation/editing
  const handleSaveAgent = () => {
    // Clear previous errors
    setColorError('');
    setNameError('');

    // Validate inputs
    if (!newAgentName.trim() || !newAgentPrompt.trim()) {
      alert('Agent name and prompt cannot be empty.');
      return;
    }

    // Check for duplicate name
    if (isNameUsed(newAgentName, editingAgent?.id)) {
      setNameError('An agent with this name already exists.');
      return;
    }

    // Check for duplicate color
    if (isColorUsed(newAgentColor, editingAgent?.id)) {
      setColorError('This color is already used by another agent.');
      return;
    }

    if (editingAgent) {
      setAgents(agents.map(agent =>
        agent.id === editingAgent.id
          ? { ...agent, name: newAgentName, prompt: newAgentPrompt, color: newAgentColor }
          : agent
      ));
      setEditingAgent(null);
    } else {
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: newAgentName,
        prompt: newAgentPrompt,
        color: newAgentColor,
      };
      setAgents([...agents, newAgent]);
    }
    setNewAgentName('');
    setNewAgentPrompt('');
    setNewAgentColor('#EF4444');
    setAgentCreationStep('list');
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setNewAgentName(agent.name);
    setNewAgentPrompt(agent.prompt);
    setNewAgentColor(agent.color);
    setColorError('');
    setNameError('');
    setAgentCreationStep('edit');
  };

  const handleDeleteAgent = (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      setAgents(agents.filter(agent => agent.id !== agentId));
    }
  };

  const renderTaskCreationSection = () => (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></Icon>
        <h2 className="text-xl font-semibold text-white">Create or import the task</h2>
      </div>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setTaskCreationStep('create')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${taskCreationStep === 'create' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Create
        </button>
        <button
          onClick={() => setTaskCreationStep('import')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${taskCreationStep === 'import' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Import
        </button>
      </div>

      {taskCreationStep === 'create' && (
        <div className="space-y-6 animate-fade-in-up">
          <h3 className="text-lg font-medium text-gray-200">Task prompt</h3>
          <Textarea
            rows={10}
            placeholder="Enter your task prompt here..."
            value={newTaskPrompt}
            onChange={(e) => setNewTaskPrompt(e.target.value)}
          />
          <div className="flex justify-end space-x-4">
          </div>
        </div>
      )}

      {taskCreationStep === 'import' && (
        <div className="space-y-8 animate-fade-in-up p-6 mb-8">
          <p className="text-gray-300 mb-6 leading-relaxed">
            You can import the dataset as a json file. It should include the list of objects with two properties -
            task and answer. If you want the results to be automatically computed enter the expected format of
            the solution (as a regex) that could be found in the last message in the conversation. Make sure too
            specify the output format for your agents so it can be retrived automatically.
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex-1 p-12 border-2 border-dashed border-gray-600 rounded-xl text-center cursor-pointer hover:border-purple-500 transition-all duration-200">
              <label htmlFor="file-upload" className="block text-purple-400 text-lg font-semibold cursor-pointer">
                Import the task
                <Icon className="mt-2 mx-auto text-3xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg></Icon>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".json"
                  onChange={(e) => setImportedTaskFile(e.target.files ? e.target.files[0] : null)}
                />
              </label>
              {importedTaskFile && <p className="text-sm text-gray-400 mt-2">Selected: {importedTaskFile.name}</p>}
            </div>
            <div className="flex-1 p-4">
              <label htmlFor="regex-input" className="block text-gray-300 text-sm mb-3 font-medium">Expected solution format (regex)</label>
              <Input
                id="regex-input"
                placeholder="e.g., ^FINAL SOLUTION:.*$"
                value={expectedSolutionRegex}
                onChange={(e) => setExpectedSolutionRegex(e.target.value)}
                className="p-4"
              />
            </div>
          </div>

        </div>
      )}

      {taskCreationStep === 'initial' && (
        <div className="text-center py-12 text-gray-400 animate-fade-in">
          <p>Select 'Create' to define a new task or 'Import' to load from a JSON file.</p>
          {currentTask && (
            <p className="mt-4 text-purple-300">Current Task: {currentTask.prompt.substring(0, 100)}...</p>
          )}
        </div>
      )}
    </div>
  );

  const renderAgentCreationSection = () => (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="text-purple-400 text-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></Icon>
        <h2 className="text-xl font-semibold text-white">Create your agents</h2>
      </div>

      {agentCreationStep === 'list' && (
        <div className="space-y-4 animate-fade-in-up">
          {agents.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <p>No agents created yet. Click the '+' button to add your first agent.</p>
              <button
                onClick={() => setAgentCreationStep('create')}
                className="mt-6 p-4 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 shadow-lg"
                aria-label="Add new agent"
              >
                <Icon className="text-2xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M12 5v14"/><path d="M5 12h14"/></svg></Icon>
              </button>
            </div>
          ) : (
            <>
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
                    onClick={() => handleEditAgent(agent)}
                    className="text-gray-400 hover:text-purple-400 p-2 rounded-full transition-colors duration-200"
                    aria-label={`Edit ${agent.name}`}
                  >
                    <Icon><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></Icon>
                  </button>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="text-gray-400 hover:text-red-400 p-2 rounded-full transition-colors duration-200 ml-2"
                    aria-label={`Delete ${agent.name}`}
                  >
                    <Icon><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></Icon>
                  </button>
                </div>
              ))}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setAgentCreationStep('create')}
                  className="p-4 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 shadow-lg"
                  aria-label="Add new agent"
                >
                  <Icon className="text-2xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M12 5v14"/><path d="M5 12h14"/></svg></Icon>
                </button>
              </div>
            </>
          )}

        </div>
      )}

      {(agentCreationStep === 'create' || agentCreationStep === 'edit') && (
        <div className="space-y-6 animate-fade-in-up">
          <h3 className="text-lg font-medium text-gray-200">{editingAgent ? 'Edit Agent' : 'Name of an agent'}</h3>
          <div className="flex items-center space-x-3">
            <div className="relative color-picker-container">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
                  colorError ? 'border-red-500' : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: newAgentColor }}
                aria-label="Select agent color"
              />
              {showColorPicker && (
                <div className="absolute top-10 left-0 z-50 bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700 animate-fade-in-up color-picker-container">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4'].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setNewAgentColor(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                          newAgentColor === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-300 text-sm">Custom:</span>
                    <input
                      type="color"
                      value={newAgentColor}
                      onChange={(e) => setNewAgentColor(e.target.value)}
                      className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <Input
                placeholder="e.g., Coordinator"
                value={newAgentName}
                onChange={(e) => {
                  setNewAgentName(e.target.value);
                  setNameError('');
                }}
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && (
                <p className="text-red-400 text-sm mt-1">{nameError}</p>
              )}
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-200">Prompt</h3>
          <Textarea
            rows={10}
            placeholder="You are the Coordinator responsible for guiding the team..."
            value={newAgentPrompt}
            onChange={(e) => setNewAgentPrompt(e.target.value)}
          />
          <div className="text-gray-300 text-sm">
            <p className="mb-2">Available Ollama Models:</p>
            {isLoadingOllamaModels ? (
              <p>Loading models...</p>
            ) : ollamaError ? (
              <p className="text-red-400">{ollamaError}</p>
            ) : ollamaModels.length > 0 ? (
              <ul className="list-disc list-inside">
                {ollamaModels.map((model, index) => (
                  <li key={index}>{model}</li>
                ))}
              </ul>
            ) : (
              <p>No Ollama models found. Ensure Ollama is running and models are downloaded.</p>
            )}
          </div>
          <div className="flex justify-end space-x-4">
            <Button onClick={() => {
              setAgentCreationStep('list');
              setEditingAgent(null);
              setNewAgentName('');
              setNewAgentPrompt('');
              setNewAgentColor('#EF4444');
              setColorError('');
              setNameError('');
            }} className="bg-gray-600 hover:bg-gray-700">Close</Button>
            <Button onClick={handleSaveAgent}>{editingAgent ? 'Update Agent' : 'Add an agent'}</Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {renderTaskCreationSection()}
      {renderAgentCreationSection()}
      
      {/* Start Experiment Button */}
      {isExperimentReady && (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Ready to Start Experiment</h2>
              <p className="text-gray-300">
                Task: {currentTask?.prompt.substring(0, 50)}... | Agents: {agents.length}
              </p>
            </div>
            <Button 
              onClick={() => {
                alert('Starting experiment with ' + agents.length + ' agents!');
                // TODO: Implement experiment execution
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              Start Experiment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

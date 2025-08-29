import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { ErrorPopup } from '../ui/ErrorPopup';
import { Task } from '../../types/index.d';

interface TaskCreateFormProps {
  onTaskCreate: (task: Task) => void;
}

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({ onTaskCreate }) => {
  const [taskPrompt, setTaskPrompt] = useState<string>('');
  const [iterations, setIterations] = useState<number>(1);
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);

  const handleCreateTask = () => {
    if (!taskPrompt.trim()) {
      setShowErrorPopup(true);
      return;
    }
    
    const taskId = `task-${Date.now()}`;
    onTaskCreate({ id: taskId, prompt: taskPrompt, iterations });
    setTaskPrompt('');
    setIterations(1);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-lg font-medium text-gray-200">Task prompt</h3>
      <Textarea
        rows={10}
        placeholder="Enter your task prompt here..."
        value={taskPrompt}
        onChange={(e) => setTaskPrompt(e.target.value)}
      />
      
      <div className="space-y-2">
        <label htmlFor="iterations" className="block text-sm font-medium text-gray-300">
          Number of iterations
        </label>
        <input
          id="iterations"
          type="number"
          min="1"
          max="100"
          value={iterations}
          onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500">
          How many times to repeat the experiment with the same task.
        </p>
      </div>
      
      <div className="flex justify-end space-x-4">
        <Button 
          onClick={handleCreateTask}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Create Task
        </Button>
      </div>
      
      <ErrorPopup
        isOpen={showErrorPopup}
        title="Validation Error"
        message="Please enter a task prompt."
        onClose={() => setShowErrorPopup(false)}
        type="error"
      />
    </div>
  );
}; 
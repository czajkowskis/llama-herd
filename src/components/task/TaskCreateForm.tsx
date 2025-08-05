import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Task } from '../../types/index.d';

interface TaskCreateFormProps {
  onTaskCreate: (task: Task) => void;
}

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({ onTaskCreate }) => {
  const [taskPrompt, setTaskPrompt] = useState<string>('');

  const handleCreateTask = () => {
    if (!taskPrompt.trim()) {
      alert('Please enter a task prompt.');
      return;
    }
    
    const confirmed = window.confirm(
      `Confirm task creation?\n\n` +
      `Task Prompt: ${taskPrompt.substring(0, 100)}${taskPrompt.length > 100 ? '...' : ''}\n\n` +
      `Click OK to confirm or Cancel to abort.`
    );
    
    if (confirmed) {
      const taskId = `task-${Date.now()}`;
      onTaskCreate({ id: taskId, prompt: taskPrompt });
      setTaskPrompt('');
    }
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
      <div className="flex justify-end space-x-4">
        <Button 
          onClick={handleCreateTask}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Create Task
        </Button>
      </div>
    </div>
  );
}; 
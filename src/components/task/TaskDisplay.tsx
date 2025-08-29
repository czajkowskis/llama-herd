import React, { useState } from 'react';
import { Task } from '../../types/index.d';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Icon } from '../ui/Icon';
import { ConfirmationPopup } from '../ui/ConfirmationPopup';

interface TaskDisplayProps {
  task: Task;
  onEdit: (updatedTask: Task) => void;
  onDelete: () => void;
}

export const TaskDisplay: React.FC<TaskDisplayProps> = ({ task, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(task.prompt);
  const [editIterations, setEditIterations] = useState(task.iterations || 1);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleSave = () => {
    if (editPrompt.trim()) {
      // For imported tasks with dataset, keep the original iterations
      const updatedTask = { ...task, prompt: editPrompt };
      if (!task.datasetItems || task.datasetItems.length === 0) {
        updatedTask.iterations = editIterations;
      }
      onEdit(updatedTask);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditPrompt(task.prompt);
    if (!task.datasetItems || task.datasetItems.length === 0) {
      setEditIterations(task.iterations || 1);
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirmation(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <div className="bg-gray-700 p-6 rounded-xl shadow-md border border-gray-600">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className="text-purple-400 text-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M10 9H8"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
            </svg>
          </Icon>
          <h3 className="text-lg font-semibold text-white">Current Task</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-blue-400 p-2 rounded-full transition-colors duration-200"
            title="Edit task"
          >
            <Icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
            </Icon>
          </button>
          <button
            onClick={handleDeleteClick}
            className="text-red-400 hover:text-red-300 p-2 rounded-full transition-colors duration-200 bg-red-500/10 hover:bg-red-500/20"
            title="Delete task"
          >
            <Icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" x2="10" y1="11" y2="17"/>
                <line x1="14" x2="14" y1="11" y2="17"/>
              </svg>
            </Icon>
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4 animate-fade-in-up">
          <Textarea
            rows={8}
            placeholder="Enter your task prompt here..."
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
          />
          
          {!task.datasetItems || task.datasetItems.length === 0 ? (
            <div className="space-y-2">
              <label htmlFor="edit-iterations" className="block text-sm font-medium text-gray-300">
                Number of iterations
              </label>
              <input
                id="edit-iterations"
                type="number"
                min="1"
                max="100"
                value={editIterations}
                onChange={(e) => setEditIterations(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Number of iterations
              </label>
              <div className="text-gray-400 text-sm">
                {task.iterations || 1} (automatically set from dataset - cannot be edited)
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {task.prompt}
            </p>
          </div>
          
                  {(!task.datasetItems || task.datasetItems.length === 0) && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Icon className="text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </Icon>
            <span>Iterations: {task.iterations || 1}</span>
          </div>
        )}
        </div>
      )}

      {showDeleteConfirmation && (
        <ConfirmationPopup
          isOpen={showDeleteConfirmation}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          type="danger"
        />
      )}
    </div>
  );
}; 
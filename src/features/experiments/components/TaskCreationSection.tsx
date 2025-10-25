import React from 'react';
import { Icon } from '../../../components/ui/Icon';
import { TaskDisplay } from './TaskDisplay';
import { TaskCreateForm } from './TaskCreateForm';
import { TaskImportForm } from './TaskImportForm';
import { Task } from '../../../types/index.d';
import { Input } from '../../../components/ui/Input';

interface TaskCreationSectionProps {
  currentTask: Task | null;
  taskCreationStep: 'initial' | 'create' | 'import';
  onTaskCreationStepChange: (step: 'initial' | 'create' | 'import') => void;
  onTaskEdit: (updatedTask: Task) => void;
  onTaskDelete: () => void;
  onTaskCreate: (task: Task) => void;
  onTaskImport: (task: Task) => void;
}

export const TaskCreationSection: React.FC<TaskCreationSectionProps> = ({
  currentTask,
  taskCreationStep,
  onTaskCreationStepChange,
  onTaskEdit,
  onTaskDelete,
  onTaskCreate,
  onTaskImport
}) => {
  return (
    <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="text-purple-400 text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            <path d="M10 9H8"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
          </svg>
        </Icon>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create or import the task</h2>
      </div>

      {currentTask ? (
        <div className="animate-fade-in-up">
          <TaskDisplay 
            task={currentTask}
            onEdit={onTaskEdit}
            onDelete={onTaskDelete}
          />
        </div>
      ) : (
        <>
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => onTaskCreationStepChange('create')}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              style={{
                backgroundColor: taskCreationStep === 'create' ? '#9333ea' : 'var(--color-bg-tertiary)',
                color: taskCreationStep === 'create' ? 'white' : 'var(--color-text-secondary)'
              }}
              onMouseEnter={(e) => {
                if (taskCreationStep !== 'create') {
                  e.currentTarget.style.backgroundColor = 'var(--color-border)';
                }
              }}
              onMouseLeave={(e) => {
                if (taskCreationStep !== 'create') {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }
              }}
            >
              Create
            </button>
            <button
              onClick={() => onTaskCreationStepChange('import')}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              style={{
                backgroundColor: taskCreationStep === 'import' ? '#9333ea' : 'var(--color-bg-tertiary)',
                color: taskCreationStep === 'import' ? 'white' : 'var(--color-text-secondary)'
              }}
              onMouseEnter={(e) => {
                if (taskCreationStep !== 'import') {
                  e.currentTarget.style.backgroundColor = 'var(--color-border)';
                }
              }}
              onMouseLeave={(e) => {
                if (taskCreationStep !== 'import') {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }
              }}
            >
              Import
            </button>
          </div>

          {taskCreationStep === 'initial' && (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
              <p>Define the task that your agents will work on. You can either create a new task by writing a prompt, 
              or import an existing task from a JSON file. The task should clearly describe what you want your 
              multi-agent team to accomplish.</p>
            </div>
          )}

          {taskCreationStep === 'create' && (
            <TaskCreateForm onTaskCreate={onTaskCreate} />
          )}

          {taskCreationStep === 'import' && (
            <TaskImportForm onTaskImport={onTaskImport} />
          )}
        </>
      )}
    </div>
  );
}; 

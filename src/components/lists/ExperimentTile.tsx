import React from 'react';
import { StoredExperiment } from '../../services/backendStorageService';
import { Button } from '../ui/Button';

interface ExperimentTileProps {
  experiment: StoredExperiment;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onView: (experiment: StoredExperiment) => void;
  onEdit: (experiment: StoredExperiment) => void;
  onDelete: (experiment: StoredExperiment) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

/**
 * Reusable experiment tile component for history page
 */
export const ExperimentTile: React.FC<ExperimentTileProps> = ({
  experiment,
  isSelected,
  isEditing,
  editingName,
  selectMode,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onNameChange,
  onKeyPress
}) => {
  return (
    <div
      className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      }`}
      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        {selectMode && (
          <div className="flex items-center mr-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(experiment.id)}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={onSaveEdit}
                  onKeyPress={onKeyPress}
                  autoFocus
                  className="rounded px-2 py-1 text-lg font-semibold focus:outline-none focus:border-purple-400"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    borderWidth: '1px',
                    color: 'var(--color-text-primary)'
                  }}
                />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={onSaveEdit}
                    className="text-green-400 hover:text-green-300 p-1 rounded-full transition-colors duration-200"
                    title="Save name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="text-gray-400 hover:text-red-400 p-1 rounded-full transition-colors duration-200"
                    title="Cancel edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              experiment.title
            )}
          </h3>
          <div className="flex items-center space-x-4 mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="inline-flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{new Date(experiment.createdAt).toLocaleDateString()}</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              <span>{experiment.agents.length} agents</span>
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              experiment.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
              experiment.status === 'completed' ? 'bg-green-100 text-green-800' :
              experiment.status === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {experiment.status}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => onView(experiment)}>
            View Conversations
          </Button>
          <button
            onClick={() => onEdit(experiment)}
            className="text-gray-400 hover:text-purple-400 p-1.5 rounded-full transition-all duration-200 hover:bg-purple-500/20 hover:scale-110 hover:shadow-lg"
            title="Edit experiment name"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(experiment)}
            className="text-gray-400 hover:text-red-400 p-1.5 rounded-full transition-all duration-200 hover:bg-red-500/20 hover:scale-110 hover:shadow-lg"
            title="Delete experiment"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

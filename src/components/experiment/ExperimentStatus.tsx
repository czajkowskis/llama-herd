import React from 'react';
import { Button } from '../ui/Button';
import { Task, Agent } from '../../types/index.d';

interface ExperimentStatusProps {
  isExperimentReady: boolean;
  currentTask: Task | null;
  agents: Agent[];
  onStartExperiment: () => void;
  getExperimentStatusMessage: () => string;
  isStartingExperiment?: boolean;
  experimentError?: string | null;
  experimentName?: string;
  onExperimentNameChange?: (name: string) => void;
}

export const ExperimentStatus: React.FC<ExperimentStatusProps> = ({
  isExperimentReady,
  currentTask,
  agents,
  onStartExperiment,
  getExperimentStatusMessage,
  isStartingExperiment = false,
  experimentError = null,
  experimentName = '',
  onExperimentNameChange
}) => {
  return (
    <div className={`p-6 rounded-2xl shadow-xl animate-fade-in-up ${
      isExperimentReady ? 'bg-gray-800 border border-green-500/20' : 'bg-gray-700 border border-gray-600'
    }`}>
      <div className="flex items-center justify-between">
        {/* Left Section - Title and Status */}
        <div className="space-y-3 flex-1">
          <h2 className={`text-xl font-semibold ${
            isExperimentReady ? 'text-white' : 'text-gray-400'
          }`}>
            {isExperimentReady ? 'Ready to Start Experiment' : 'Start Experiment'}
          </h2>
          <p className={`text-sm ${
            isExperimentReady ? 'text-gray-300' : 'text-gray-500'
          }`}>
            {isExperimentReady 
              ? `Task: ${currentTask?.prompt.substring(0, 30)}... | Agents: ${agents.length}`
              : getExperimentStatusMessage()
            }
          </p>
        </div>

        {/* Right Section - Input and Button */}
        <div className="flex items-center space-x-4 ml-8">
          {onExperimentNameChange && (
            <div className="w-80">
              <input
                type="text"
                value={experimentName}
                onChange={(e) => onExperimentNameChange(e.target.value)}
                placeholder="Experiment name..."
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          <div className="flex flex-col items-end space-y-3">
            {experimentError && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/50 rounded px-3 py-1">
                {experimentError}
              </div>
            )}
            <Button 
              onClick={onStartExperiment}
              className={`px-8 py-3 transition-all duration-200 ${
                isExperimentReady 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed'
              }`}
              disabled={!isExperimentReady || isStartingExperiment}
            >
              {isStartingExperiment ? 'Starting...' : 'Start Experiment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
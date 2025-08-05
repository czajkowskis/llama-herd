import React from 'react';
import { Button } from '../ui/Button';
import { Task, Agent } from '../../types/index.d';

interface ExperimentStatusProps {
  isExperimentReady: boolean;
  currentTask: Task | null;
  agents: Agent[];
  onStartExperiment: () => void;
  getExperimentStatusMessage: () => string;
}

export const ExperimentStatus: React.FC<ExperimentStatusProps> = ({
  isExperimentReady,
  currentTask,
  agents,
  onStartExperiment,
  getExperimentStatusMessage
}) => {
  return (
    <div className={`p-6 rounded-2xl shadow-xl animate-fade-in-up ${
      isExperimentReady ? 'bg-gray-800 border border-green-500/20' : 'bg-gray-700 border border-gray-600'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold mb-2 ${
            isExperimentReady ? 'text-white' : 'text-gray-400'
          }`}>
            {isExperimentReady ? 'Ready to Start Experiment' : 'Start Experiment'}
          </h2>
          <p className={`${
            isExperimentReady ? 'text-gray-300' : 'text-gray-500'
          }`}>
            {isExperimentReady 
              ? `Task: ${currentTask?.prompt.substring(0, 50)}... | Agents: ${agents.length}`
              : getExperimentStatusMessage()
            }
          </p>
        </div>
        <Button 
          onClick={onStartExperiment}
          className={`px-8 py-3 transition-all duration-200 ${
            isExperimentReady 
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
              : 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed'
          }`}
          disabled={!isExperimentReady}
        >
          Start Experiment
        </Button>
      </div>
    </div>
  );
}; 
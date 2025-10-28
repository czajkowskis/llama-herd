import React from 'react';
import { StoredExperiment } from '../../../services/backendStorageService';
import { ExperimentTile } from '../../../components/lists/ExperimentTile';

interface ExperimentListProps {
  experiments: StoredExperiment[];
  selectedItems: Set<string>;
  editingExperimentId: string | null;
  editingExperimentName: string;
  selectMode: boolean;
  handleSelectItem: (id: string) => void;
  handleViewExperiment: (experiment: StoredExperiment) => void;
  handleStartEditExperimentName: (experiment: StoredExperiment) => void;
  handleDeleteExperiment: (experiment: StoredExperiment) => void;
  handleSaveExperimentName: () => void;
  handleCancelEditExperimentName: () => void;
  setEditingExperimentName: (name: string) => void;
  handleExperimentNameKeyPress: (e: React.KeyboardEvent) => void;
}

export const ExperimentList: React.FC<ExperimentListProps> = ({
  experiments,
  selectedItems,
  editingExperimentId,
  editingExperimentName,
  selectMode,
  handleSelectItem,
  handleViewExperiment,
  handleStartEditExperimentName,
  handleDeleteExperiment,
  handleSaveExperimentName,
  handleCancelEditExperimentName,
  setEditingExperimentName,
  handleExperimentNameKeyPress,
}) => {
  if (experiments.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
        No experiments found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experiments.map((experiment) => (
        <ExperimentTile
          key={experiment.id}
          experiment={experiment}
          isSelected={selectedItems.has(experiment.id)}
          isEditing={editingExperimentId === experiment.id}
          editingName={editingExperimentName}
          selectMode={selectMode}
          onSelect={handleSelectItem}
          onView={handleViewExperiment}
          onEdit={handleStartEditExperimentName}
          onDelete={handleDeleteExperiment}
          onSaveEdit={handleSaveExperimentName}
          onCancelEdit={handleCancelEditExperimentName}
          onNameChange={setEditingExperimentName}
          onKeyPress={handleExperimentNameKeyPress}
        />
      ))}
    </div>
  );
};

import React from 'react';
import { ChatView } from './ChatView';
import { Button } from '../../../components/ui/Button';
import { ConfirmationPopup } from '../../../components/ui/ConfirmationPopup';
import { ExperimentConversationViewer } from './ExperimentConversationViewer';
import { HistoricalExperimentView } from '../../experiments/components/HistoricalExperimentView';
import { HistoryToolbar } from '../../../components/lists/HistoryToolbar';
import { useHistory } from '../hooks/useHistory';
import { ExperimentList } from './ExperimentList';
import { ConversationList } from './ConversationList';

export const History: React.FC = () => {
  const {
    experiments,
    conversations,
    selectedItem,
    viewingExperimentConversations,
    activeTab,
    loading,
    editingExperimentId,
    editingExperimentName,
    editingConversationId,
    editingConversationName,
    showDeleteExperimentConfirmation,
    experimentToDelete,
    showDeleteConversationConfirmation,
    conversationToDelete,
    error,
    selectMode,
    selectedItems,
    showBulkDeleteConfirmation,
    setActiveTab,
    setEditingExperimentName,
    setEditingConversationName,
    handleViewExperiment,
    handleViewConversation,
    handleBackToList,
    handleBackToExperiments,
    handleDeleteExperiment,
    confirmDeleteExperiment,
    cancelDeleteExperiment,
    handleStartEditExperimentName,
    handleSaveExperimentName,
    handleCancelEditExperimentName,
    handleExperimentNameKeyPress,
    handleStartEditConversationName,
    handleSaveConversationName,
    handleCancelEditConversationName,
    handleConversationNameKeyPress,
    handleDeleteConversation,
    confirmDeleteConversation,
    cancelDeleteConversation,
    handleSelectItem,
    handleSelectAll,
    handleBulkDelete,
    confirmBulkDelete,
    cancelBulkDelete,
    setSelectMode,
    setSelectedItems,
  } = useHistory();

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Loading history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="bg-red-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-red-100">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedItem) {
    if (selectedItem.source === 'experiment') {
      return (
        <div className="p-8 animate-fade-in">
          <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center justify-between mb-6">
              <Button onClick={handleBackToList}>
                ← Back to History
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ExperimentConversationViewer
                conversationId={selectedItem.id}
                onBackToList={handleBackToList}
              />
            </div>
          </div>
        </div>
      );
    } else {
      const foundConversation = conversations.find(c => c.id === selectedItem.id);
      if (!foundConversation) return null;

      return (
        <div className="p-8 animate-fade-in">
          <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center justify-between mb-6">
              <Button onClick={handleBackToList}>
                ← Back to History
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatView
                conversation={{
                  id: foundConversation.id,
                  title: foundConversation.title,
                  agents: foundConversation.agents,
                  messages: foundConversation.messages,
                  createdAt: foundConversation.createdAt
                }}
                onBackToList={handleBackToList}
                getAgentById={(agentId) => foundConversation.agents.find(a => a.id === agentId)}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  if (viewingExperimentConversations) {
    const experiment = experiments.find(e => e.id === viewingExperimentConversations);
    if (!experiment) return null;

    return (
      <div className="h-full animate-fade-in">
        <HistoricalExperimentView
          experimentId={viewingExperimentConversations}
          experiment={experiment}
          onBack={handleBackToExperiments}
        />
      </div>
    );
  }

  return (
    <>
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <HistoryToolbar
            activeTab={activeTab}
            experimentsCount={experiments.length}
            conversationsCount={conversations.length}
            selectMode={selectMode}
            selectedCount={selectedItems.size}
            onTabChange={setActiveTab}
            onToggleSelectMode={() => {
              setSelectMode(!selectMode);
              if (selectMode) {
                setSelectedItems(new Set());
              }
            }}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
          />

          <div className="space-y-4">
            {activeTab === 'experiments' ? (
              <ExperimentList
                experiments={experiments}
                selectedItems={selectedItems}
                editingExperimentId={editingExperimentId}
                editingExperimentName={editingExperimentName}
                selectMode={selectMode}
                handleSelectItem={handleSelectItem}
                handleViewExperiment={handleViewExperiment}
                handleStartEditExperimentName={handleStartEditExperimentName}
                handleDeleteExperiment={handleDeleteExperiment}
                handleSaveExperimentName={handleSaveExperimentName}
                handleCancelEditExperimentName={handleCancelEditExperimentName}
                setEditingExperimentName={setEditingExperimentName}
                handleExperimentNameKeyPress={handleExperimentNameKeyPress}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                selectedItems={selectedItems}
                editingConversationId={editingConversationId}
                editingConversationName={editingConversationName}
                selectMode={selectMode}
                editingExperimentId={editingExperimentId}
                handleSelectItem={handleSelectItem}
                handleViewConversation={handleViewConversation}
                handleStartEditConversationName={handleStartEditConversationName}
                handleDeleteConversation={handleDeleteConversation}
                handleSaveConversationName={handleSaveConversationName}
                handleCancelEditConversationName={handleCancelEditConversationName}
                setEditingConversationName={setEditingConversationName}
                handleConversationNameKeyPress={handleConversationNameKeyPress}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmationPopup
        isOpen={showDeleteExperimentConfirmation}
        title="Delete Experiment"
        message={`Are you sure you want to delete "${experimentToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteExperiment}
        onCancel={cancelDeleteExperiment}
        type="danger"
      />

      <ConfirmationPopup
        isOpen={showDeleteConversationConfirmation}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${conversationToDelete?.conversation.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteConversation}
        onCancel={cancelDeleteConversation}
        type="danger"
      />

      <ConfirmationPopup
        isOpen={showBulkDeleteConfirmation}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${selectedItems.size} selected ${activeTab === 'experiments' ? 'experiment' : 'conversation'}${selectedItems.size === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={confirmBulkDelete}
        onCancel={cancelBulkDelete}
        type="danger"
      />
    </>
  );
};

import { useState, useEffect } from 'react';
import { backendStorageService, StoredExperiment, StoredConversation } from '../../../services/backendStorageService';
import { experimentService } from '../../../services/experimentService';

export const useHistory = () => {
  const [experiments, setExperiments] = useState<StoredExperiment[]>([]);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'experiment' | 'conversation'; id: string; source?: 'import' | 'experiment' } | null>(null);
  const [viewingExperimentConversations, setViewingExperimentConversations] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'experiments' | 'conversations'>('experiments');
  const [loading, setLoading] = useState(true);
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(null);
  const [editingExperimentName, setEditingExperimentName] = useState<string>('');
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingConversationName, setEditingConversationName] = useState<string>('');
  const [showDeleteExperimentConfirmation, setShowDeleteExperimentConfirmation] = useState<boolean>(false);
  const [experimentToDelete, setExperimentToDelete] = useState<StoredExperiment | null>(null);
  const [showDeleteConversationConfirmation, setShowDeleteConversationConfirmation] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ conversation: StoredConversation; source?: 'import' | 'experiment' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    console.log('History: conversations state updated:', conversations);
  }, [conversations]);

  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendExperiments = await backendStorageService.getExperiments();
      const liveExperiments = await experimentService.listExperiments();
      const mergedExperiments = backendExperiments.map(exp => {
        const liveExp = liveExperiments.experiments.find(le => le.experiment_id === exp.id);
        return liveExp ? { ...exp, status: liveExp.status } : exp;
      });
      setExperiments(mergedExperiments);

      try {
        console.log('Loading conversations from backend...');
        let backendConversations = await backendStorageService.getConversations('import');
        console.log('Backend imported conversations:', backendConversations);
        backendConversations = backendConversations.map((conv: any) => ({
          ...conv,
          importedAt: conv.importedAt || conv.createdAt,
        }));
        console.log('Backend conversations after conversion:', backendConversations);
        const importedConversations = backendConversations.filter(c => c.source === 'import');
        console.log('Final imported conversations:', importedConversations);
        console.log('Final conversations count:', importedConversations.length);
        setConversations(importedConversations);
      } catch (error: any) {
        console.error('Failed to load conversations from backend:', error);
        setError('Failed to load conversations.');
        setConversations([]);
      }
    } catch (error: any) {
      console.error('Failed to load history:', error);
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewExperiment = (experiment: StoredExperiment) => {
    setViewingExperimentConversations(experiment.id);
    setSelectedItem(null);
  };

  const handleViewConversation = (conversation: StoredConversation, source: 'import' | 'experiment' = 'import') => {
    setSelectedItem({ type: 'conversation', id: conversation.id, source });
    setViewingExperimentConversations(null);
  };

  const handleBackToList = () => {
    setSelectedItem(null);
    setViewingExperimentConversations(null);
  };

  const handleBackToExperiments = () => {
    setViewingExperimentConversations(null);
  };

  const handleDeleteExperiment = (experiment: StoredExperiment) => {
    setExperimentToDelete(experiment);
    setShowDeleteExperimentConfirmation(true);
  };

  const confirmDeleteExperiment = async () => {
    if (!experimentToDelete) return;
    try {
      await backendStorageService.deleteExperiment(experimentToDelete.id);
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete experiment:', error);
      setError('Failed to delete experiment. Please try again later.');
    }
    setShowDeleteExperimentConfirmation(false);
    setExperimentToDelete(null);
  };

  const cancelDeleteExperiment = () => {
    setShowDeleteExperimentConfirmation(false);
    setExperimentToDelete(null);
  };

  const handleStartEditExperimentName = (experiment: StoredExperiment) => {
    setEditingExperimentId(experiment.id);
    setEditingExperimentName(experiment.title);
  };

  const handleSaveExperimentName = async () => {
    if (editingExperimentName.trim() && editingExperimentId) {
      try {
        const updatedExperiments = experiments.map(exp =>
          exp.id === editingExperimentId
            ? { ...exp, title: editingExperimentName.trim() }
            : exp
        );
        setExperiments(updatedExperiments);
        const updatedExperiment = updatedExperiments.find(exp => exp.id === editingExperimentId);
        if (updatedExperiment) {
          await backendStorageService.saveExperiment(updatedExperiment);
        }
      } catch (error) {
        console.error('Failed to save experiment name:', error);
        setError('Failed to save experiment name. Please try again later.');
      }
    }
    setEditingExperimentId(null);
    setEditingExperimentName('');
  };

  const handleCancelEditExperimentName = () => {
    setEditingExperimentId(null);
    setEditingExperimentName('');
  };

  const handleExperimentNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveExperimentName();
    } else if (e.key === 'Escape') {
      handleCancelEditExperimentName();
    }
  };

  const handleStartEditConversationName = (conversation: StoredConversation) => {
    setEditingConversationId(conversation.id);
    setEditingConversationName(conversation.title);
  };

  const handleSaveConversationName = async () => {
    if (editingConversationName.trim() && editingConversationId) {
      try {
        const updatedConversations = conversations.map(conv =>
          conv.id === editingConversationId
            ? { ...conv, title: editingConversationName.trim() }
            : conv
        );
        setConversations(updatedConversations);
        const updatedConversation = updatedConversations.find(conv => conv.id === editingConversationId);
        if (updatedConversation) {
          await backendStorageService.saveConversation(updatedConversation);
        }
      } catch (error) {
        console.error('Failed to save conversation name:', error);
        setError('Failed to save conversation name. Please try again later.');
      }
    }
    setEditingConversationId(null);
    setEditingConversationName('');
  };

  const handleCancelEditConversationName = () => {
    setEditingConversationId(null);
    setEditingConversationName('');
  };

  const handleConversationNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveConversationName();
    } else if (e.key === 'Escape') {
      handleCancelEditConversationName();
    }
  };

  const handleDeleteConversation = (conversation: StoredConversation, source?: 'import' | 'experiment') => {
    setConversationToDelete({ conversation, source });
    setShowDeleteConversationConfirmation(true);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      await backendStorageService.deleteConversation(conversationToDelete.conversation.id);
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError('Failed to delete conversation. Please try again later.');
    }
    setShowDeleteConversationConfirmation(false);
    setConversationToDelete(null);
  };

  const cancelDeleteConversation = () => {
    setShowDeleteConversationConfirmation(false);
    setConversationToDelete(null);
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const currentItems = activeTab === 'experiments' ? experiments : conversations;
    if (selectedItems.size === currentItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentItems.map(item => item.id)));
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirmation(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedItems).map(id =>
        activeTab === 'experiments'
          ? backendStorageService.deleteExperiment(id)
          : backendStorageService.deleteConversation(id)
      );
      await Promise.all(deletePromises);
      setSelectedItems(new Set());
      setSelectMode(false);
      await loadHistory();
    } catch (error) {
      console.error('Failed to bulk delete items:', error);
      setError('Failed to delete selected items. Please try again later.');
    }
    setShowBulkDeleteConfirmation(false);
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirmation(false);
  };

  return {
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
  };
};

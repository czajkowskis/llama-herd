import React, { useState, useEffect } from 'react';
import { ChatView } from '../components/conversation/ChatView';
import { Button } from '../components/ui/Button';
import { ConfirmationPopup } from '../components/ui/ConfirmationPopup';
import { backendStorageService, StoredExperiment, StoredConversation } from '../services/backendStorageService';
import { experimentService } from '../services/experimentService';
import { ExperimentConversationViewer } from '../components/conversation/ExperimentConversationViewer';

export const History: React.FC = () => {
  const [experiments, setExperiments] = useState<StoredExperiment[]>([]);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'experiment' | 'conversation'; id: string; source?: 'import' | 'experiment' } | null>(null);
  const [viewingExperimentConversations, setViewingExperimentConversations] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'experiments' | 'conversations'>('experiments');
  const [loading, setLoading] = useState(true);
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(null);
  const [editingExperimentName, setEditingExperimentName] = useState<string>('');
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

  // Debug logging for conversations state
  useEffect(() => {
    console.log('History: conversations state updated:', conversations);
  }, [conversations]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load experiments from backend storage
      const backendExperiments = await backendStorageService.getExperiments();
      
      // Get live experiment statuses from backend
      const liveExperiments = await experimentService.listExperiments();
      
      // Merge backend data with live statuses
      const mergedExperiments = backendExperiments.map(exp => {
        const liveExp = liveExperiments.experiments.find(le => le.experiment_id === exp.id);
        if (liveExp) {
          return { ...exp, status: liveExp.status };
        }
        return exp;
      });
      
      setExperiments(mergedExperiments);
      
      // Load imported conversations from backend storage only
      let backendConversations: StoredConversation[] = [];
      
      try {
        console.log('Loading conversations from backend...');
        backendConversations = await backendStorageService.getConversations('import');
        console.log('Backend imported conversations:', backendConversations);
        
        // Convert backend conversations from snake_case to camelCase for frontend compatibility
        backendConversations = backendConversations.map((conv: any) => {
          const converted = {
            ...conv,
            importedAt: conv.imported_at || conv.importedAt || conv.createdAt,
          };
          console.log('Converting conversation:', { original: conv, converted });
          return converted;
        });
        console.log('Backend conversations after conversion:', backendConversations);
        
        // Filter to only show imported conversations
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

  const handleDeleteExperiment = async (experiment: StoredExperiment) => {
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
        
        // Save updated experiment to backend storage
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

  const handleDeleteConversation = async (conversation: StoredConversation, source?: 'import' | 'experiment') => {
    setConversationToDelete({ conversation, source });
    setShowDeleteConversationConfirmation(true);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // Delete from backend storage for all conversations
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
      const deletePromises = Array.from(selectedItems).map(async (id) => {
        if (activeTab === 'experiments') {
          await backendStorageService.deleteExperiment(id);
        } else {
          await backendStorageService.deleteConversation(id);
        }
      });
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

  const getExperimentConversations = async (experimentId: string): Promise<StoredConversation[]> => {
    try {
      return await backendStorageService.getExperimentConversations(experimentId);
    } catch (error) {
      console.error('Failed to get experiment conversations:', error);
      setError('Failed to load experiment conversations. Please try again later.');
      return [];
    }
  };

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

  // Show error message if exists
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

  // Show selected conversation
  if (selectedItem) {
    let conversation: StoredConversation | null = null;
    
    if (selectedItem.source === 'experiment') {
      // For experiment conversations, we need to fetch from backend
      // This will be handled by a new component that fetches the conversation
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
      // For imported conversations, use the existing logic
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
                getContrastColor={(color) => '#ffffff'}
                formatTimestamp={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  // Show experiment conversations
  if (viewingExperimentConversations) {
    const experiment = experiments.find(e => e.id === viewingExperimentConversations);
    if (!experiment) return null;

    return (
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-between mb-6">
            <Button onClick={handleBackToExperiments}>
              ← Back to Experiments
            </Button>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{experiment.title}</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <ExperimentConversationsList 
              experimentId={viewingExperimentConversations}
              getExperimentConversations={getExperimentConversations}
              onViewConversation={handleViewConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main history view
  return (
    <>
      <div className="p-8 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>History</h1>
            <div className="flex items-center space-x-4">
              {selectMode && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedItems.size} selected
                  </span>
                  <Button
                    onClick={handleSelectAll}
                    variant="secondary"
                  >
                    {selectedItems.size === (activeTab === 'experiments' ? experiments.length : conversations.length) ? 'Clear All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedItems.size === 0}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Selected ({selectedItems.size})
                  </Button>
                </div>
              )}
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  if (selectMode) {
                    setSelectedItems(new Set());
                  }
                }}
                className="px-3 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: selectMode ? '#dc2626' : 'var(--color-bg-tertiary)',
                  color: selectMode ? 'white' : 'var(--color-text-secondary)'
                }}
                title={selectMode ? 'Exit selection mode' : 'Enter selection mode'}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('experiments')}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === 'experiments' ? '#9333ea' : 'var(--color-bg-tertiary)',
                    color: activeTab === 'experiments' ? 'white' : 'var(--color-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'experiments') {
                      e.currentTarget.style.backgroundColor = 'var(--color-border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'experiments') {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }
                  }}
                >
                  Experiments ({experiments.length})
                </button>
                <button
                  onClick={() => setActiveTab('conversations')}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === 'conversations' ? '#9333ea' : 'var(--color-bg-tertiary)',
                    color: activeTab === 'conversations' ? 'white' : 'var(--color-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'conversations') {
                      e.currentTarget.style.backgroundColor = 'var(--color-border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'conversations') {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }
                  }}
                >
                  Imported Conversations ({conversations.length})
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === 'experiments' ? (
              <div className="space-y-4">
                {experiments.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
                    No experiments found
                  </div>
                ) : (
                  experiments.map((experiment) => (
                    <div
                      key={experiment.id}
                      className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
                        selectedItems.has(experiment.id) ? 'ring-2 ring-purple-500' : ''
                      }`}
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        {selectMode && (
                          <div className="flex items-center mr-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(experiment.id)}
                              onChange={() => handleSelectItem(experiment.id)}
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {editingExperimentId === experiment.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editingExperimentName}
                                  onChange={(e) => setEditingExperimentName(e.target.value)}
                                  onBlur={handleSaveExperimentName}
                                  onKeyPress={handleExperimentNameKeyPress}
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
                                    onClick={handleSaveExperimentName}
                                    className="text-green-400 hover:text-green-300 p-1 rounded-full transition-colors duration-200"
                                    title="Save name"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                                      <path d="M20 6 9 17l-5-5"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleCancelEditExperimentName}
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
                          <Button onClick={() => handleViewExperiment(experiment)}>
                            View Conversations
                          </Button>
                          <button
                            onClick={() => handleStartEditExperimentName(experiment)}
                            className="text-gray-400 hover:text-purple-400 p-1.5 rounded-full transition-all duration-200 hover:bg-purple-500/20 hover:scale-110 hover:shadow-lg"
                            title="Edit experiment name"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteExperiment(experiment)}
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
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
                    No imported conversations found
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
                        selectedItems.has(conversation.id) ? 'ring-2 ring-purple-500' : ''
                      }`}
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        {selectMode && (
                          <div className="flex items-center mr-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(conversation.id)}
                              onChange={() => handleSelectItem(conversation.id)}
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {conversation.title}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="inline-flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span>{new Date(conversation.importedAt).toLocaleDateString()}</span>
                            </span>
                            <span className="inline-flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                              </svg>
                              <span>{conversation.agents.length} agents</span>
                            </span>
                            <span className="inline-flex items-center space-x-1 text-sm text-green-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span>Imported</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => handleViewConversation(conversation)}>
                            View
                          </Button>
                          <button
                            onClick={() => handleDeleteConversation(conversation, 'import')}
                            className="text-gray-400 hover:text-red-400 p-1.5 rounded-full transition-all duration-200 hover:bg-red-500/20 hover:scale-110 hover:shadow-lg"
                            title="Delete conversation"
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
                  ))
                )}
              </div>
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

// Component for displaying experiment conversations
interface ExperimentConversationsListProps {
  experimentId: string;
  getExperimentConversations: (experimentId: string) => Promise<StoredConversation[]>;
  onViewConversation: (conversation: StoredConversation, source?: 'import' | 'experiment') => void;
  onDeleteConversation: (conversation: StoredConversation, source?: 'import' | 'experiment') => void;
}

const ExperimentConversationsList: React.FC<ExperimentConversationsListProps> = ({
  experimentId,
  getExperimentConversations,
  onViewConversation,
  onDeleteConversation
}) => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const convs = await getExperimentConversations(experimentId);
        setConversations(convs);
      } catch (error) {
        console.error('Failed to load experiment conversations:', error);
        setError('Failed to load conversations.');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [experimentId, getExperimentConversations]);

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>Loading conversations...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-400">{error}</div>;
  }

  if (conversations.length === 0) {
    return <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No conversations found for this experiment</div>;
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className="rounded-lg border p-4 hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {conversation.title}
              </h3>
              <div className="flex items-center space-x-4 mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="inline-flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <span>{conversation.agents.length} agents</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-sm text-blue-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" clipRule="evenodd" />
                  </svg>
                  <span>Experiment</span>
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => onViewConversation(conversation, 'experiment')}>
                View
              </Button>
              <button
                onClick={() => onDeleteConversation(conversation, 'experiment')}
                className="text-gray-400 hover:text-red-400 p-1.5 rounded-full transition-all duration-200 hover:bg-red-500/20 hover:scale-110 hover:shadow-lg"
                title="Delete conversation"
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
      ))}
    </div>
  );
};
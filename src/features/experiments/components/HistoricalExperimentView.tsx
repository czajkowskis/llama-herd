import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { HistoricalRunSelector } from './HistoricalRunSelector';
import { HistoricalChatView } from '../../history/components/HistoricalChatView';
import { ExportPanel } from '../../history/components/ExportPanel';
import { backendStorageService, StoredExperiment, StoredConversation } from '../../../services/backendStorageService';

interface HistoricalExperimentViewProps {
  experimentId: string;
  experiment: StoredExperiment;
  onBack: () => void;
}

export const HistoricalExperimentView: React.FC<HistoricalExperimentViewProps> = ({
  experimentId,
  experiment,
  onBack
}) => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<StoredConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Load all conversations for this experiment
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        const convs = await backendStorageService.getExperimentConversations(experimentId);
        setConversations(convs);
        // Auto-select first conversation if available
        if (convs.length > 0) {
          setSelectedConversation(convs[0]);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, [experimentId]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-red-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold text-white">{experiment.title}</h2>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-700 text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Completed</span>
            </div>
            <div className="text-xs text-gray-400 ml-4">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} • Created {formatDate(experiment.createdAt)}
            </div>
          </div>
          <div className="flex space-x-3">
            {/* Only show export button if there are conversations */}
            {selectedConversation && (
              <Button 
                onClick={() => setShowExportPanel(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Icon className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </Icon>
                Export
              </Button>
            )}
            <Button onClick={onBack} className="bg-gray-600 hover:bg-gray-700">
              Back
            </Button>
          </div>
        </div>

        {/* Historical Run Selector */}
        <HistoricalRunSelector
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />

        {/* Conversation Display */}
        <div className="message-list bg-gray-900 rounded-xl p-4 h-[600px] overflow-y-auto space-y-4">
          {selectedConversation ? (
            <HistoricalChatView
              conversation={selectedConversation}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-lg mb-2 text-gray-400">No conversations found</div>
                <div className="text-sm text-gray-500">This experiment doesn't have any stored conversations yet.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Panel */}
      {showExportPanel && selectedConversation && (
        <ExportPanel
          messages={selectedConversation.messages}
          agents={selectedConversation.agents}
          getAgentById={(agentId) => selectedConversation.agents.find(a => a.id === agentId)}
          formatTimestamp={(timestamp) => new Date(timestamp).toLocaleTimeString()}
          onClose={() => setShowExportPanel(false)}
          preselectedMessages={new Set()}
        />
      )}
    </div>
  );
};
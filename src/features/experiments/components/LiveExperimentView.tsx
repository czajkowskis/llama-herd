import React, { useState, useEffect, useRef } from 'react';
import { Conversation, ConversationAgent, Message, ExperimentStatusResponse } from '../../../types/index.d';
import { experimentService } from '../../../services/experimentService';
import { WebSocketMessage, isMessageData, isStatusData, isConversationData } from '../../../types/api';
import { backendStorageService } from '../../../services/backendStorageService';
import { getStarredMessages, toggleStarredMessage } from '../../../services/uiPreferencesService';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ExportPanel } from '../../history/components/ExportPanel';
import { RunSelector } from './RunSelector';
import { RawJSONModal } from '../../history/components/RawJSONModal';
import { ConnectionStatusType } from '../../../components/ui/ConnectionStatus';
import { DebugPanel, DebugMessage } from '../../../components/ui/DebugPanel';
import { HistoricalViewBanner } from './ViewModeIndicator';
import { usePullTasks } from '../../../hooks/usePullTasks';
import { PullNotification } from '../../../components/ui/PullNotification';
import { ExperimentHeader } from '../../../components/experiments/ExperimentHeader';
import { MessageList } from '../../../components/messages/MessageList';
import { formatTimestamp } from '../../../utils/messageUtils';

interface LiveExperimentViewProps {
  experimentId: string;
  onBack: () => void;
}

export const LiveExperimentView: React.FC<LiveExperimentViewProps> = ({
  experimentId,
  onBack
}) => {
  const [liveConversation, setLiveConversation] = useState<Conversation | null>(null);
  const [viewConversation, setViewConversation] = useState<Conversation | null>(null);
  const [completedConversations, setCompletedConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [reconnectIn, setReconnectIn] = useState<number>(0);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState<number | undefined>(undefined);
  const [serverError, setServerError] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  // Removed agentInfos state as it's no longer used
  const [isViewingLive, setIsViewingLive] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRawJSONModal, setShowRawJSONModal] = useState(false);
  const [selectedMessageForJSON, setSelectedMessageForJSON] = useState<Message | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());
  const [newlyArrivedMessages, setNewlyArrivedMessages] = useState<Set<string>>(new Set());
  const [totalIterations, setTotalIterations] = useState<number>(1);
  const [currentIteration, setCurrentIteration] = useState<number>(0);

  // Refs for state values to avoid stale closures in WebSocket handler
  const isFollowingRef = useRef(isFollowing);
  useEffect(() => { isFollowingRef.current = isFollowing; }, [isFollowing]);

  const isViewingLiveRef = useRef(isViewingLive);
  useEffect(() => { isViewingLiveRef.current = isViewingLive; }, [isViewingLive]);

  const liveConversationRef = useRef(liveConversation);
  useEffect(() => { liveConversationRef.current = liveConversation; }, [liveConversation]);

  // Track active model pulls
  const { activePulls } = usePullTasks();
  const pendingMessagesRef = useRef<Message[]>([]);
  const previousMessageCountRef = useRef<number>(0);

  // Load starred messages when conversation changes
  useEffect(() => {
    if (viewConversation) {
      const starred = getStarredMessages(viewConversation.id);
      setStarredMessages(starred);
    }
  }, [viewConversation]);

  // Track newly arrived messages for animation (only in live view)
  useEffect(() => {
    if (isViewingLive && viewConversation) {
      const currentCount = viewConversation.messages.length;
      const previousCount = previousMessageCountRef.current;
      
      if (currentCount > previousCount) {
        // New messages arrived - mark them for animation
        const newMessages = viewConversation.messages.slice(previousCount);
        const newIds = new Set(newMessages.map(m => m.id));
        setNewlyArrivedMessages(newIds);
        
        // Clear the animation class after animation completes
        setTimeout(() => {
          setNewlyArrivedMessages(new Set());
        }, 1500);
      }
      
      previousMessageCountRef.current = currentCount;
    }
  }, [viewConversation?.messages, isViewingLive]);

  useEffect(() => {
    let mounted = true;

    const loadExperiment = async () => {
      try {
        const experimentData: ExperimentStatusResponse = await experimentService.getExperiment(experimentId);
        if (!mounted) return;

        // Set initial conversation/status/error
        const base = experimentData.conversation as Conversation | null;
        const merged: Conversation | null = base && pendingMessagesRef.current.length > 0
          ? { ...base, messages: [...base.messages, ...pendingMessagesRef.current] }
          : base;
        pendingMessagesRef.current = [];
        
        const initialCompleted = experimentData.conversations || [];
        setCompletedConversations(initialCompleted);
        
        // For completed experiments with no live conversation, show the most recent completed conversation
        if (!merged && initialCompleted.length > 0) {
          setLiveConversation(null);
          setViewConversation(initialCompleted[initialCompleted.length - 1]);
          setIsViewingLive(false);
        } else {
          setLiveConversation(merged);
          setViewConversation(merged);
          setIsViewingLive(true);
        }
        
        setStatus(experimentData.status);
        setError(experimentData.error || null);
        
        // Update iteration information
        setTotalIterations(experimentData.iterations || 1);
        setCurrentIteration(experimentData.current_iteration || 0);
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
        }
      }
    };

    const addDebugMessage = (type: DebugMessage['type'], content: string, data?: any) => {
      const debugMsg: DebugMessage = {
        timestamp: new Date().toISOString(),
        type,
        content,
        data,
      };
      setDebugMessages(prev => [...prev, debugMsg].slice(-50)); // Keep last 50 messages
    };

    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (!mounted) return;

      // Log received message to debug panel
      addDebugMessage('received', `${message.type}`, message);

      switch (message.type) {
        case 'message':
          setLiveConversation(prev => {
            if (prev) {
              const updated = { ...prev, messages: [...prev.messages, message.data as Message] };
              if (isViewingLiveRef.current && isFollowingRef.current) {
                setViewConversation(updated);
              }
              return updated;
            }
            // Buffer until conversation is loaded
            if (isMessageData(message.data)) {
              pendingMessagesRef.current.push(message.data as Message);
            }
            return prev;
          });
          break;
        case 'status':
          if (isStatusData(message.data)) {
            setStatus(message.data.status);
            
            // Update iteration information if provided
            if (message.data.current_iteration !== undefined) {
              setCurrentIteration(message.data.current_iteration);
            }
            
            // If experiment completed, update local storage
            if (message.data.status === 'completed' && liveConversationRef.current) {
              backendStorageService.saveExperiment({
                id: experimentId,
                title: `Experiment: ${liveConversationRef.current.title}`,
                task: { id: '', prompt: liveConversationRef.current.title, datasetItems: [] },
                agents: liveConversationRef.current.agents.map(agent => ({
                  id: agent.id,
                  name: agent.name,
                  prompt: '',
                  color: agent.color,
                  model: agent.model
                })),
                status: 'completed',
                createdAt: liveConversationRef.current.createdAt,
                completedAt: new Date().toISOString(),
                iterations: totalIterations,
                currentIteration: currentIteration
              });
            }
          }
          break;
        case 'error':
          if (typeof message.data === 'object' && message.data !== null && 'error' in message.data) {
            const errorMsg = (message.data as { error: string }).error;
            setError(errorMsg);
            setServerError(errorMsg);
            addDebugMessage('error', `Server error: ${errorMsg}`, message.data);
          }
          break;
        case 'conversation':
          if (isConversationData(message.data)) {
            const incoming = message.data as Conversation;
            const isStartSignal = Array.isArray(incoming.messages) && incoming.messages.length === 0;

            if (isStartSignal) {
              // Conversation start for a new run/iteration: switch context to this new live conversation
              setLiveConversation(incoming);
              if (isViewingLiveRef.current && isFollowingRef.current) {
                setViewConversation(incoming);
              }
              // Clear any pending/buffered messages and reset counters to avoid cross-run mixing
              pendingMessagesRef.current = [];
              previousMessageCountRef.current = 0;
              setNewlyArrivedMessages(new Set());
              addDebugMessage('info', 'Switched to new live conversation (start signal)', incoming);
            } else {
              // Completed snapshot conversation - append to list
              setCompletedConversations(prev => {
                const updated = [...prev, incoming];
                // When first completed run arrives, switch the view chips on
                if (prev.length === 0 && !isViewingLiveRef.current && liveConversationRef.current && isFollowingRef.current) {
                  setViewConversation(updated[updated.length - 1]);
                }
                // Note: Experiment conversations are automatically saved by the backend
                // via save_experiment_conversation, so we don't need to save them here
                return updated;
              });
            }
          }
          break;
        // Note: 'agents' message type is not sent by backend, so this case is removed
      }
    };

    // Load initial experiment data
    loadExperiment();

    // Connect to WebSocket for real-time updates
    const unsubscribe = experimentService.connectToExperiment(experimentId, handleWebSocketMessage);
    
    // Get the WebSocket connection to subscribe to state changes
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/experiments/${experimentId}`;
    const conn = experimentService['connections'].get(experimentId);
    
    let unsubscribeState: (() => void) | undefined;
    if (conn) {
      setMaxReconnectAttempts(conn.getMaxReconnectAttempts());
      unsubscribeState = conn.onStateChange((state, attempts, delaySeconds) => {
        if (!mounted) return;
        
        addDebugMessage('info', `Connection state: ${state}, attempt: ${attempts}, next in: ${delaySeconds}s`);
        
        switch (state) {
          case 'connected':
            setConnectionStatus('connected');
            setReconnectAttempt(0);
            break;
          case 'reconnecting':
            setConnectionStatus('reconnecting');
            setReconnectAttempt(attempts);
            setReconnectIn(delaySeconds);
            break;
          case 'disconnected':
            setConnectionStatus('disconnected');
            setReconnectAttempt(attempts);
            break;
        }
      });
    }

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeState?.();
    };
  }, [experimentId]);

  const getAgentById = (agentId: string): ConversationAgent | undefined => {
    return viewConversation?.agents.find(agent => agent.id === agentId);
  };

  // Message action handlers
  const handleCopyText = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleViewRawJSON = (message: Message) => {
    setSelectedMessageForJSON(message);
    setShowRawJSONModal(true);
  };

  const handleStarMessage = (messageId: string) => {
    if (viewConversation) {
      toggleStarredMessage(viewConversation.id, messageId);
      // Update local state to reflect the change
      setStarredMessages(getStarredMessages(viewConversation.id));
    }
  };

  const handleCreateExportSelection = (messageId: string) => {
    setExportSelection(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleResumeLive = () => {
    if (liveConversation) {
      setIsViewingLive(true);
      setViewConversation(liveConversation);
      // Reset message count to enable animations for any new messages
      previousMessageCountRef.current = liveConversation.messages.length;
      setIsFollowing(true);
    }
  };

  if (error) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Icon className="text-red-400 text-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </Icon>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Experiment Error</h2>
            </div>
            <Button onClick={onBack} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} className="hover:opacity-80">
              Back
            </Button>
          </div>
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!viewConversation) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <PullNotification activePulls={activePulls} />
      <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <ExperimentHeader
          conversation={viewConversation}
          status={status}
          connectionStatus={connectionStatus}
              reconnectAttempt={reconnectAttempt}
              maxReconnectAttempts={maxReconnectAttempts}
              reconnectIn={reconnectIn}
          serverError={serverError}
          isViewingLive={isViewingLive}
          completedConversations={completedConversations}
          onBack={onBack}
          onShowExport={() => setShowExportPanel(true)}
              onRetry={() => {
                const conn = experimentService['connections'].get(experimentId);
                conn?.retry();
              }}
            />

        {/* Run selector (also visible during first run) */}
        <RunSelector
          completedConversations={completedConversations}
          selectedConversation={viewConversation}
          isViewingLive={isViewingLive}
          status={status}
          liveConversation={liveConversation}
          onSelectRun={(conversation, isLive) => {
            setIsViewingLive(isLive);
            setViewConversation(conversation);
            setIsFollowing(isLive);
          }}
          totalIterations={totalIterations}
          currentIteration={currentIteration}
        />

        {/* Agents debug info removed - no longer available */}

        {/* Debug Panel - only show in live view */}
        {debugMessages.length > 0 && isViewingLive && (
          <div className="mb-4">
            <DebugPanel
              messages={debugMessages}
              serverError={serverError || undefined}
            />
          </div>
        )}

        {/* Historical View Banner */}
        {!isViewingLive && liveConversation && (
          <HistoricalViewBanner
            runTitle={viewConversation.title}
            onResumeLive={handleResumeLive}
          />
        )}

  {/* Chat Messages */}
        <MessageList
          messages={viewConversation.messages}
          agents={viewConversation.agents}
          isViewingLive={isViewingLive}
          isFollowing={isFollowing}
          onFollowChange={setIsFollowing}
          newlyArrivedMessages={newlyArrivedMessages}
          starredMessages={starredMessages}
          exportSelection={exportSelection}
          onCopyText={handleCopyText}
          onViewRawJSON={handleViewRawJSON}
          onStarMessage={handleStarMessage}
          onCreateExportSelection={handleCreateExportSelection}
        />
      </div>
      
      {/* Export Panel */}
      {showExportPanel && viewConversation && (
        <ExportPanel
          messages={viewConversation.messages}
          agents={viewConversation.agents}
          getAgentById={getAgentById}
          formatTimestamp={formatTimestamp}
          onClose={() => setShowExportPanel(false)}
          preselectedMessages={exportSelection}
        />
      )}

      {/* Raw JSON Modal */}
      {showRawJSONModal && selectedMessageForJSON && (
        <RawJSONModal
          message={selectedMessageForJSON}
          agent={getAgentById(selectedMessageForJSON.agentId)}
          onClose={() => {
            setShowRawJSONModal(false);
            setSelectedMessageForJSON(null);
          }}
        />
      )}
    </div>
  );
}; 
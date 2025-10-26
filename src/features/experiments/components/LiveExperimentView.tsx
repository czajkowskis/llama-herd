import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Conversation, ConversationAgent, Message, ExperimentStatusResponse } from '../../../types/index.d';
import { experimentService } from '../../../services/experimentService';
import { WebSocketMessage, isMessageData, isStatusData, isConversationData } from '../../../types/api';
import { backendStorageService } from '../../../services/backendStorageService';
import { getStarredMessages, toggleStarredMessage } from '../../../services/uiPreferencesService';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ExportPanel } from '../../history/components/ExportPanel';
import { RunSelector } from './RunSelector';
import { MessageActions, CopyButton } from '../../history/components/MessageActions';
import { RawJSONModal } from '../../history/components/RawJSONModal';
import { CodeBlock } from '../../history/components/CodeBlock';
import { ConnectionStatus, ConnectionStatusType } from '../../../components/ui/ConnectionStatus';
import { DebugPanel, DebugMessage } from '../../../components/ui/DebugPanel';
import { ViewModeIndicator, HistoricalViewBanner } from './ViewModeIndicator';
import { formatDateLabel, isSameLocalDate } from '../../../services/dateTimeService';
import { usePullTasks } from '../../../hooks/usePullTasks';
import { PullNotification } from '../../../components/ui/PullNotification';

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
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showRawJSONModal, setShowRawJSONModal] = useState(false);
  const [selectedMessageForJSON, setSelectedMessageForJSON] = useState<Message | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());
  const [newlyArrivedMessages, setNewlyArrivedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change (only in live view)
  useEffect(() => {
    if (isViewingLive) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewConversation?.messages, isViewingLive]);

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
              if (isViewingLive) {
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
            
            // If experiment completed, update local storage
            if (message.data.status === 'completed' && liveConversation) {
              backendStorageService.saveExperiment({
                id: experimentId,
                title: `Experiment: ${liveConversation.title}`,
                task: { id: '', prompt: liveConversation.title, datasetItems: [] },
                agents: liveConversation.agents.map(agent => ({
                  id: agent.id,
                  name: agent.name,
                  prompt: '',
                  color: agent.color,
                  model: agent.model
                })),
                status: 'completed',
                createdAt: liveConversation.createdAt,
                completedAt: new Date().toISOString(),
                iterations: 1,
                currentIteration: 1
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
              if (isViewingLive) {
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
                if (prev.length === 0 && !isViewingLive && liveConversation) {
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

  const getContrastColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const formatTimestamp = (timestamp: string): string => {
    // Respect user preference or locale
    try {
      // lazy import to avoid circular issues in tests
      const { formatTimeShort } = require('../../services/dateTimeService');
      return formatTimeShort(timestamp);
    } catch {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
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
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        );
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        );
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon className="text-purple-400 text-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </Icon>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{viewConversation.title}</h2>
            <ViewModeIndicator
              isViewingLive={isViewingLive}
              viewTitle={viewConversation.title}
              onResumeLive={!isViewingLive ? handleResumeLive : undefined}
            />
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(status)}`} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
              {getStatusIcon(status)}
              <span className="text-sm font-medium capitalize">{status}</span>
            </div>
            <ConnectionStatus
              status={connectionStatus}
              reconnectAttempt={reconnectAttempt}
              maxReconnectAttempts={maxReconnectAttempts}
              reconnectIn={reconnectIn}
              errorMessage={serverError || undefined}
              onRetry={() => {
                const conn = experimentService['connections'].get(experimentId);
                conn?.retry();
              }}
            />
          </div>
          <div className="flex space-x-3">
            {/* Only show export button for completed experiments or when viewing completed conversations */}
            {(status === 'completed' || (!isViewingLive && viewConversation && completedConversations.some(conv => conv.id === viewConversation.id))) && (
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
            <Button onClick={onBack} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} className="hover:opacity-80">
              Back
            </Button>
          </div>
        </div>

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
          }}
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
  <div className={`message-list rounded-xl p-4 h-[600px] overflow-y-auto space-y-4 ${!isViewingLive ? 'historical-view-dimmed' : ''}`} style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
          {(() => {
            // Filter out System messages from display
            const displayMessages = viewConversation.messages.filter((m) => {
              const a = getAgentById(m.agentId);
              if (!a) return false;
              const name = (a.name || '').toLowerCase();
              const model = (a.model || '').toLowerCase();
              return !(name === 'system' || model === 'system');
            });
            return displayMessages.map((message, index) => {
              const agent = getAgentById(message.agentId);
            if (!agent) return null;

            const textColor = getContrastColor(agent.color);
            const isStarred = starredMessages.has(message.id);
            const isInExportSelection = exportSelection.has(message.id);
            const isNewlyArrived = isViewingLive && newlyArrivedMessages.has(message.id);
            // Role-based alignment: user/system on the right, agents on the left
            const agentName = (agent.name || '').toLowerCase();
            const agentModel = (agent.model || '').toLowerCase();
            const isRightAligned = agentName === 'user' || agentName === 'system' || agentModel === 'user' || agentModel === 'system';
            
            const showDateSeparator = index > 0 && !isSameLocalDate(displayMessages[index - 1].timestamp, message.timestamp);
            return (
              <React.Fragment key={`wrap-${message.id}`}>
                {showDateSeparator && (
                  <div className="w-full">
                    <div className="date-separator" role="separator" aria-label={formatDateLabel(message.timestamp)}>
                      <span className="date-separator-label">{formatDateLabel(message.timestamp)}</span>
                    </div>
                  </div>
                )}
              <div className={`message-container flex space-x-3 group ${isNewlyArrived ? 'animate-message-arrive' : ''} ${isRightAligned ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  <div
                    className="agent-avatar w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: agent.color, color: textColor }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 message-content-wrapper">
                  <div className={`flex items-center justify-between mb-1 message-header ${isRightAligned ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</span>
                      <span className="message-timestamp" style={{ color: 'var(--color-text-secondary)' }}>{formatTimestamp(message.timestamp)}</span>
                      <span className="message-model-badge" style={{ color: 'var(--color-text-tertiary)' }}>{agent.model}</span>
                      {isStarred && (
                        <span className="ml-2 text-yellow-400" title="Starred message">
                          <Icon>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </Icon>
                        </span>
                      )}
                      {isInExportSelection && (
                        <span className="ml-2 text-purple-400" title="Selected for export">
                          <Icon>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </Icon>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <CopyButton onCopyText={() => handleCopyText(message)} />
                      <MessageActions
                        message={message}
                        agent={agent}
                        onViewRawJSON={() => handleViewRawJSON(message)}
                        onStarMessage={() => handleStarMessage(message.id)}
                        onCreateExportSelection={() => handleCreateExportSelection(message.id)}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg p-4 message-content" style={{ color: 'var(--color-text-secondary)' }}>
                    <ReactMarkdown
                      components={{
                        h1: (props: any) => (
                          <h1 className="text-xl font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                        ),
                        h2: (props: any) => (
                          <h2 className="text-lg font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                        ),
                        h3: (props: any) => (
                          <h3 className="text-base font-semibold mt-2 mb-2" style={{ color: 'var(--color-text-primary)' }} {...props} />
                        ),
                        p: (props: any) => (
                          <p className="mb-2 leading-relaxed" {...props} />
                        ),
                        ul: (props: any) => (
                          <ul className="list-disc ml-6 mb-2 space-y-1" {...props} />
                        ),
                        ol: (props: any) => (
                          <ol className="list-decimal ml-6 mb-2 space-y-1" {...props} />
                        ),
                        li: (props: any) => (
                          <li className="mb-1" {...props} />
                        ),
                        a: (props: any) => (
                          <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" {...props} />
                        ),
                        hr: (props: any) => (
                          <hr className="my-4" style={{ borderColor: 'var(--color-border)' }} {...props} />
                        ),
                        code: ({ node, inline, className, children, ...props }: any) => (
                          <CodeBlock inline={inline} className={className}>
                            {children}
                          </CodeBlock>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              </React.Fragment>
            );
          });
          })()}
          <div ref={messagesEndRef} />
        </div>
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
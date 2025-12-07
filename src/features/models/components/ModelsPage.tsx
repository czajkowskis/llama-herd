import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ollamaService } from '../../../services/ollamaService';
import { usePullTasks } from '../../../hooks/usePullTasks';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ConfirmationPopup } from '../../../components/ui/ConfirmationPopup';
import { useOllamaConnection } from '../hooks/useOllamaConnection';
import { useModelPulling } from '../hooks/useModelPulling';
import { InstalledModels } from './InstalledModels';
import { DiscoverModels } from './DiscoverModels';
import { API_BASE_URL } from '../../../config';
import { ActiveDownloadsPanel } from '../../../components/models/ActiveDownloadsPanel';
import { ModelTabs } from '../../../components/models/ModelTabs';
import { CatalogItem, deriveModelName, groupModelsByBaseName } from '../../../data/modelCatalog';
import { ModelsHeader } from './ModelsHeader';
import { ModelDownloadProgress } from './ModelDownloadProgress';

type TabKey = 'installed' | 'discover';

export const Models: React.FC = () => {
  const [active, setActive] = useState<TabKey>('installed');
  const [installed, setInstalled] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem('llama-herd-default-ollama-model') || '');
  const { pulling, startPull, cancelPull, dismissNotification, dismissAllNotifications } = useModelPulling();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [quant, setQuant] = useState('');
  const [resetCounter, setResetCounter] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [pendingPull, setPendingPull] = useState<{ tag: string; sizeHint?: number } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  // Use the connection hook
  const { connected, version, connectionError, isRetrying, manualRetry } = useOllamaConnection();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogUpdating, setCatalogUpdating] = useState(false);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const models = await ollamaService.getModelCatalog();
      setCatalog(models);
    } catch (error) {
      console.error("Failed to load model catalog", error);
      setCatalog([]); // Fallback to empty list on error
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleUpdateCatalog = async () => {
    setCatalogUpdating(true);
    try {
      const result = await ollamaService.updateModelCatalog();
      if (result.success) {
        // Reload catalog after successful update
        await loadCatalog();
        // Show success message (you could add a toast notification here)
        console.log(result.message);
      } else {
        console.error("Catalog update failed:", result.message);
        // Show error message (you could add a toast notification here)
      }
    } catch (error) {
      console.error("Error updating catalog:", error);
    } finally {
      setCatalogUpdating(false);
    }
  };



  // Installed models
  useEffect(() => {
    if (!connected) {
      setInstalled([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const models = await ollamaService.listModels();
        if (!mounted) return;
        setInstalled(Array.isArray(models) ? models : []);
        
      } catch (e) {
        // keep installed empty when disconnected
      }
    })();
    return () => { mounted = false; };
  }, [connected]);

  // Persist default model
  useEffect(() => {
    if (defaultModel) localStorage.setItem('llama-herd-default-ollama-model', defaultModel);
    else localStorage.removeItem('llama-herd-default-ollama-model');
  }, [defaultModel]);


  // Merge PullTasksContext (server-backed + websocket-updated) into the local pulling state
  const { pullTasks, dismissByModelName, dismissAllErrors, dismissTask } = usePullTasks();

  // On mount (and when connection is available), fetch server-side persisted pull tasks
  // and merge them into the local `pulling` state so persisted tasks are visible in the UI.
  useEffect(() => {
    let mounted = true;
    if (!connected) return;

    (async () => {
      try {
        // We now consume server-side persisted tasks via the PullTasksContext so
        // that websocket progress updates are handled centrally. If that context
        // is available we will merge its tasks into the local pulling state below.
        // Keep this block empty to avoid duplicate fetches here.
        if (!mounted) return;
      } catch (e) {
        // ignore - we still rely on local cache
      }
    })();

    return () => { mounted = false; };
  }, [connected]);


  const handleStartPull = (tag: string, sizeHint?: number) => {
    // Prevent duplicate pull if the model is already installed according to
    // the live-installed list or annotated in the backend catalog.
    if (installed.includes(tag) || (catalog.find(c => c.tag === tag) as any)?.installed) return; // prevent duplicate pull
    if (!connected) return;
    
    // Get size from catalog if sizeHint not provided
    const catalogItem = catalog.find(c => c.tag === tag);
    const modelSize = sizeHint ?? catalogItem?.size;
    
    // Show confirmation popup with storage requirements
    setPendingPull({ tag, sizeHint: modelSize });
    setShowConfirmPopup(true);
  };

  const confirmPull = () => {
    if (!pendingPull) return;
    
    const { tag, sizeHint } = pendingPull;
    setShowConfirmPopup(false);
    setPendingPull(null);
    
    // Use the hook's startPull function
    startPull(tag, sizeHint);
  };

  const cancelConfirmPull = () => {
    setShowConfirmPopup(false);
    setPendingPull(null);
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;

    const tag = pendingRemoval;
    setShowConfirmPopup(false);
    setPendingRemoval(null);

    try {
      await ollamaService.deleteModel(tag);
      const models = await ollamaService.listModels();
      setInstalled(Array.isArray(models) ? models : []);
      if (defaultModel === tag) setDefaultModel('');
    } catch (error) {
      console.error('Failed to remove model:', error);
      // Could add error handling UI here if needed
    }
  };

  const cancelRemoval = () => {
    setShowConfirmPopup(false);
    setPendingRemoval(null);
  };


  const removeModel = (tag: string) => {
    setPendingRemoval(tag);
    setShowConfirmPopup(true);
  };

  // Toggle expanded state of a group
  const toggleGroupExpanded = (baseName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseName)) {
        newSet.delete(baseName);
      } else {
        newSet.add(baseName);
      }
      return newSet;
    });
  };


  // UI helpers
  const renderProgress = (tag: string, opts?: { showCancel?: boolean }) => {
    return (
      <ModelDownloadProgress
        tag={tag}
        pulling={pulling}
        startPull={startPull}
        cancelPull={cancelPull}
        dismissNotification={dismissNotification}
        showCancel={opts?.showCancel}
      />
    );
  };

  return (
    <div className="p-4 animate-fade-in">
      <ModelsHeader
        connected={connected}
        version={version}
        connectionError={connectionError}
        isRetrying={isRetrying}
        manualRetry={manualRetry}
      />
      <ModelTabs
        activeTab={active}
        onTabChange={setActive}
      />
      <ActiveDownloadsPanel
        pulling={pulling}
        onCancelPull={cancelPull}
        onDismissAllNotifications={dismissAllNotifications}
      />
      <div
        role="tabpanel"
        id="panel-installed"
        aria-labelledby="tab-installed"
        hidden={active !== 'installed'}
      >
        <InstalledModels
          installed={installed}
          defaultModel={defaultModel}
          onSetDefaultModel={setDefaultModel}
          onRemoveModel={removeModel}
          catalog={catalog}
          deriveModelName={deriveModelName}
        />
      </div>
      <div
        role="tabpanel"
        id="panel-discover"
        aria-labelledby="tab-discover"
        hidden={active !== 'discover'}
      >
        <DiscoverModels
          catalog={catalog}
          installed={installed}
          pulling={pulling}
          connected={connected}
          onStartPull={handleStartPull}
          onRenderProgress={renderProgress}
          groupModelsByBaseName={groupModelsByBaseName}
          expandedGroups={expandedGroups}
          onToggleGroupExpanded={toggleGroupExpanded}
          query={query}
          setQuery={setQuery}
          family={family}
          setFamily={setFamily}
          quant={quant}
          setQuant={setQuant}
          resetCounter={resetCounter}
          setResetCounter={setResetCounter}
          onUpdateCatalog={handleUpdateCatalog}
          catalogUpdating={catalogUpdating}
        />
      </div>
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        // Only show the global confirmation popup when there's an active pending action
        isOpen={showConfirmPopup && (pendingPull !== null || pendingRemoval !== null)}
        title={pendingPull ? "Confirm Model Download" : "Confirm Model Removal"}
        message={
          pendingPull 
            ? `This will download the model and use approximately ${(pendingPull.sizeHint ? (pendingPull.sizeHint / (1024**3)).toFixed(1) : 'unknown')} GB of storage. Continue?`
            : pendingRemoval 
              ? `This action will permanently delete the model "${pendingRemoval}" from your system. This cannot be undone. Continue?`
              : ''
        }
        onConfirm={pendingPull ? confirmPull : confirmRemoval}
        onCancel={pendingPull ? cancelConfirmPull : cancelRemoval}
        confirmText={pendingPull ? "Download" : "Remove"}
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default Models;

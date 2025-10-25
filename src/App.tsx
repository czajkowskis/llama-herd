import React, { useState, createContext, useContext } from 'react';
import './App.css';
import { BrowserRouter, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './components/common/Sidebar';
import { LiveExperimentView } from './components/experiment/LiveExperimentView';
import { useUIPreferences } from './hooks/useUIPreferences';
import { PullTasksProvider } from './contexts/PullTasksContext';
import { AppRoutes, ROUTES } from './routes';

// Create a context for navigation callbacks
interface NavigationCallbacks {
  handleExperimentStart: (experimentId: string) => void;
  handleOpenExperiment: (id: string) => void;
}

const NavigationCallbacksContext = createContext<NavigationCallbacks | null>(null);

export const useNavigationCallbacks = () => {
  const context = useContext(NavigationCallbacksContext);
  if (!context) {
    throw new Error('useNavigationCallbacks must be used within NavigationCallbacksProvider');
  }
  return context;
};


// Component to render individual experiment view
export const ExperimentView: React.FC = () => {
  const navigate = useNavigate();
  const { experimentId } = useParams<{ experimentId: string }>();

  if (!experimentId) {
    return <div>Experiment not found</div>;
  }

  return (
    <LiveExperimentView
      experimentId={experimentId}
      onBack={() => {
        navigate(ROUTES.LIVE_EXPERIMENTS);
      }}
    />
  );
};

// Inner component that has access to router hooks
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const navigationCallbacks: NavigationCallbacks = {
    handleExperimentStart: (experimentId: string) => {
      navigate(`/experiment/${experimentId}`);
    },
    handleOpenExperiment: (id: string) => {
      navigate(`/experiment/${id}`);
    }
  };

  return (
    <NavigationCallbacksContext.Provider value={navigationCallbacks}>
      <PullTasksProvider>
        <div className="App h-screen font-inter flex overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
          {/* The Sidebar is now a direct child of the flex container to ensure it takes full height. */}
          {/* The onMouseEnter and onMouseLeave events are now applied directly to the component. */}
          <Sidebar
            isExpanded={isSidebarExpanded}
            onMouseEnter={() => setIsSidebarExpanded(true)}
            onMouseLeave={() => setIsSidebarExpanded(false)}
          />
          
          {/* Main Content Area */}
          <main className="flex-grow p-6 overflow-y-auto">
            <header className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>LLaMa-Herd</h1>
              {/* Placeholder for user profile/notifications */}
              <div style={{ color: 'var(--color-text-tertiary)' }}>
                {/* <Icon className="text-2xl"><svg>...</svg></Icon> */}
              </div>
            </header>
            <div className="rounded-3xl p-4 shadow-inner" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
              <AppRoutes />
            </div>
          </main>
        </div>
      </PullTasksProvider>
    </NavigationCallbacksContext.Provider>
  );
};

const App: React.FC = () => {
  // Initialize UI preferences (applies theme/mode classes to DOM)
  useUIPreferences();

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;

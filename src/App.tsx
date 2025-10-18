import React, { useState } from 'react';
import './App.css';
import { Sidebar } from './components/common/Sidebar';
import { NewExperiment } from './pages/NewExperiment';
import { ConversationViewer } from './pages/ConversationViewer';
import { About } from './pages/About';
import { Settings } from './pages/Settings';
import { LiveExperimentView } from './components/experiment/LiveExperimentView';
import { History } from './pages/History';
import { useUIPreferences } from './hooks/useUIPreferences';

const App: React.FC = () => {
  // Initialize UI preferences (applies theme/mode classes to DOM)
  useUIPreferences();

  const [currentPage, setCurrentPage] = useState<'newExperiment' | 'history' | 'explore' | 'conversations' | 'settings' | 'about' | 'liveExperiment'>('newExperiment');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentExperimentId, setCurrentExperimentId] = useState<string | null>(null);

  const renderContent = () => {
    switch (currentPage) {
      case 'newExperiment':
        return <NewExperiment onExperimentStart={(experimentId) => {
          setCurrentExperimentId(experimentId);
          setCurrentPage('liveExperiment');
        }} />;
      case 'history':
        return <History />;
      case 'explore':
        return (
          <div className="p-8 text-center text-gray-400 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4">Explore Community Experiments</h2>
            <p>Discover and share experiments from the community.</p>
          </div>
        );
      case 'conversations':
        return <ConversationViewer />;
      case 'liveExperiment':
        return currentExperimentId ? (
          <LiveExperimentView
            experimentId={currentExperimentId}
            onBack={() => {
              setCurrentExperimentId(null);
              setCurrentPage('newExperiment');
            }}
          />
        ) : null;
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return null;
    }
  };

  return (
    <div className="App h-screen font-inter flex overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* The Sidebar is now a direct child of the flex container to ensure it takes full height. */}
      {/* The onMouseEnter and onMouseLeave events are now applied directly to the component. */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
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
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;

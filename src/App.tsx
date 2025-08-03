import React, { useState } from 'react';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { NewExperiment } from './pages/NewExperiment';
import { About } from './pages/About';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'newExperiment' | 'history' | 'explore' | 'settings' | 'about'>('newExperiment');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const renderContent = () => {
    switch (currentPage) {
      case 'newExperiment':
        return <NewExperiment />;
      case 'history':
        return (
          <div className="p-8 text-center text-gray-400 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4">Experiment History</h2>
            <p>Your past experiments will appear here.</p>
          </div>
        );
      case 'explore':
        return (
          <div className="p-8 text-center text-gray-400 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4">Explore Community Experiments</h2>
            <p>Discover and share experiments from the community.</p>
          </div>
        );
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return null;
    }
  };

  return (
    <div className="App min-h-screen bg-gray-900 text-white font-inter flex">
      {/* The Sidebar is now a direct child of the flex container to ensure it takes full height. */}
      {/* The onMouseEnter and onMouseLeave events are now applied directly to the component. */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isExpanded={isSidebarExpanded || currentPage === 'about'}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      />
      
      {/* Main Content Area */}
      <main className="flex-grow p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">LLaMa-Herd</h1>
          {/* Placeholder for user profile/notifications */}
          <div className="text-gray-400">
            {/* <Icon className="text-2xl"><svg>...</svg></Icon> */}
          </div>
        </header>
        <div className="bg-gray-900 rounded-3xl p-4 min-h-[calc(100vh-120px)] shadow-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;

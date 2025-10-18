import React from 'react';
import { Icon } from '../ui/Icon';

// This component represents the main navigation sidebar.
interface SidebarProps {
  currentPage: 'newExperiment' | 'history' | 'explore' | 'conversations' | 'settings' | 'about' | 'liveExperiment' | 'models';
  setCurrentPage: (page: 'newExperiment' | 'history' | 'explore' | 'conversations' | 'settings' | 'about' | 'liveExperiment' | 'models') => void;
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isExpanded, onMouseEnter, onMouseLeave }) => {
  const linkClass = (pageName: string) => `
    flex items-center p-3 rounded-xl transition-all duration-200 ease-in-out
    ${currentPage === pageName ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-opacity-10 hover:bg-white'}
    ${isExpanded ? 'w-full space-x-4' : 'justify-center'}
  `;

  const linkStyle = (pageName: string) => currentPage !== pageName ? { color: 'var(--color-text-tertiary)' } : {};

  return (
    <aside
      className={`
        ${isExpanded ? 'w-64 px-4' : 'w-20 px-4 items-center'}
        h-screen flex flex-col py-6 shadow-2xl transition-all duration-300 ease-in-out
        ${isExpanded ? 'min-w-64 max-w-64' : 'min-w-20 max-w-20'}
      `}
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <nav className={`flex flex-col space-y-6 flex-grow`}>
        <button onClick={() => { setCurrentPage('newExperiment'); window.location.hash = ''; }} className={linkClass('newExperiment')} style={linkStyle('newExperiment')} title="New Experiment">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-square"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>New Experiment</span>
        </button>
        <button onClick={() => { setCurrentPage('history'); window.location.hash = '#/history'; }} className={linkClass('history')} style={linkStyle('history')} title="History">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-text"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>History</span>
        </button>
        <button onClick={() => { setCurrentPage('explore'); window.location.hash = '#/explore'; }} className={linkClass('explore')} style={linkStyle('explore')} title="Explore">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-compass"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Explore</span>
        </button>
        <button onClick={() => { setCurrentPage('conversations'); window.location.hash = '#/conversations'; }} className={linkClass('conversations')} style={linkStyle('conversations')} title="Conversations">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Conversations</span>
        </button>
      </nav>
      <div className={`mt-auto flex flex-col space-y-6`}>
        <button onClick={() => { setCurrentPage('models'); window.location.hash = '#/models'; }} className={linkClass('models')} style={linkStyle('models')} title="Models">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Models</span>
        </button>
        <button onClick={() => { setCurrentPage('settings'); window.location.hash = '#/settings'; }} className={linkClass('settings')} style={linkStyle('settings')} title="Settings">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.09.15a2 2 0 0 1 0 2.73l-.09.15a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.09-.15a2 2 0 0 1 0-2.73l.09-.15a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Settings</span>
        </button>
        <button onClick={() => { setCurrentPage('about'); window.location.hash = '#/about'; }} className={linkClass('about')} style={linkStyle('about')} title="About LLaMa-Herd">
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>About</span>
        </button>
      </div>
    </aside>
  );
};

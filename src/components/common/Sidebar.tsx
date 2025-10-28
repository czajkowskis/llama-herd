import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { ROUTES } from '../../routes';

// This component represents the main navigation sidebar.
interface SidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, onMouseEnter, onMouseLeave }) => {

  const getLinkClass = (isActive: boolean) => `
    flex items-center p-3 rounded-xl transition-all duration-200 ease-in-out
    ${isActive ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-opacity-10 hover:bg-white'}
    ${isExpanded ? 'w-full space-x-4' : 'justify-center'}
  `;

  const getLinkStyle = (isActive: boolean) => !isActive ? { color: 'var(--color-text-tertiary)' } : {};

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
        <NavLink 
          to={ROUTES.NEW_EXPERIMENT} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="New Experiment"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-square"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>New Experiment</span>
        </NavLink>
        <NavLink 
          to={ROUTES.LIVE_EXPERIMENTS} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="Live Experiments"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Live Experiments</span>
        </NavLink>
        <NavLink 
          to={ROUTES.HISTORY} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="History"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-text"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>History</span>
        </NavLink>
        <NavLink 
          to={ROUTES.EXPLORE} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="Explore"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-compass"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Explore</span>
        </NavLink>
      </nav>
      <div className={`mt-auto flex flex-col space-y-6`}>
        <NavLink 
          to={ROUTES.MODELS} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="Models"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>Models</span>
        </NavLink>
        <NavLink 
          to={ROUTES.SETTINGS} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="Settings"
        >
          <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg></Icon>
          <span className="truncate">Settings</span>
        </NavLink>
        <NavLink 
          to={ROUTES.ABOUT} 
          className={({ isActive }) => getLinkClass(isActive)} 
          style={({ isActive }) => getLinkStyle(isActive)} 
          title="About LLaMa-Herd"
        >
          <Icon className="text-xl shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></Icon>
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-left ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>About</span>
        </NavLink>
      </div>
    </aside>
  );
};

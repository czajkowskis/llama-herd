import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

interface ErrorPopupProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
  isOpen,
  title,
  message,
  onClose,
  type = 'error'
}) => {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch (type) {
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-red-400';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </svg>
        );
      case 'info':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Icon className={`${getIconColor()} text-xl`}>
              {getIcon()}
            </Icon>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          
          <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>
          
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

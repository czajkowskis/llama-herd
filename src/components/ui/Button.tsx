import React from 'react';

// This component provides a reusable button with consistent styling.
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, className, disabled = false }) => {
  // Check if this is a secondary button (contains gray-600 or gray-700)
  const isSecondary = className && (className.includes('bg-gray-600') || className.includes('bg-gray-700'));
  
  // Only apply default primary styling if this is not a secondary button
  const defaultClasses = !isSecondary && !disabled 
    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg' 
    : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ease-in-out
        ${disabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : defaultClasses}
        ${className || ''}`}
    >
      {children}
    </button>
  );
};

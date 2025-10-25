import React from 'react';

// This component provides a reusable button with consistent styling.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, className, disabled = false, variant, ...rest }) => {
  // Determine button styling based on variant
  const isSecondary = variant === 'secondary' || (className && (className.includes('bg-gray-600') || className.includes('bg-gray-700')));
  
  const baseClasses = 'px-6 py-3 rounded-xl font-semibold transition-all duration-200 ease-in-out';
  const variantClasses = !disabled && !isSecondary 
    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg' 
    : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className || ''}`}
      {...rest}
    >
      {children}
    </button>
  );
};

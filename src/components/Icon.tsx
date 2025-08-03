import React from 'react';

// This component provides a container for icons to ensure consistent styling.
interface IconProps {
  children: React.ReactNode;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ children, className }) => {
  return (
    <span className={`flex items-center justify-center ${className}`}>
      {children}
    </span>
  );
};

import React from 'react';

// This component provides a reusable input field with consistent styling.
// Uses CSS variables for automatic theme switching
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const { className, style, ...restProps } = props;
  
  return (
    <input
      className={`custom-themed w-full p-3 rounded-xl transition-all duration-200 border ${className || ''}`}
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-primary)',
        borderColor: 'var(--color-border)',
        ...style
      }}
      {...restProps}
    />
  );
};

import React from 'react';

// This component provides a reusable textarea field with consistent styling.
// Uses CSS variables for automatic theme switching
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const { className, ...restProps } = props;
  
  return (
    <textarea
      className={`custom-themed w-full p-3 rounded-xl transition-all duration-200 resize-y border ${className || ''}`}
      {...restProps}
    />
  );
};

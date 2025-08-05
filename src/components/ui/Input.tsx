import React from 'react';

// This component provides a reusable input field with consistent styling.
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const { className, ...restProps } = props;
  return (
    <input
      className={`w-full p-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ${className || ''}`}
      {...restProps}
    />
  );
};

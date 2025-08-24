import React from 'react';

interface ErrorDisplayProps {
  colorError?: string;
  nameError?: string;
  uploadError?: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  colorError,
  nameError,
  uploadError
}) => {
  if (!colorError && !nameError && !uploadError) return null;

  return (
    <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
      {colorError && <p className="text-red-400 text-sm mb-2">{colorError}</p>}
      {nameError && <p className="text-red-400 text-sm mb-2">{nameError}</p>}
      {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
    </div>
  );
}; 
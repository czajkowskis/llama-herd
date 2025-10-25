import React from 'react';

interface ErrorDisplayProps {
  colorError?: string;
  nameError?: string;
  temperatureError?: string;
  promptError?: string;
  uploadError?: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  colorError,
  nameError,
  temperatureError,
  promptError,
  uploadError
}) => {
  if (!colorError && !nameError && !temperatureError && !promptError && !uploadError) return null;

  return (
    <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
      {colorError && <p className="text-red-400 text-sm mb-2">{colorError}</p>}
      {nameError && <p className="text-red-400 text-sm mb-2">{nameError}</p>}
      {temperatureError && <p className="text-red-400 text-sm mb-2">{temperatureError}</p>}
      {promptError && <p className="text-red-400 text-sm mb-2">{promptError}</p>}
      {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
    </div>
  );
}; 
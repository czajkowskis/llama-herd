import React, { useState } from 'react';
import { Icon } from './Icon';

interface ColorPickerProps {
  isVisible: boolean;
  agentId: string;
  currentColor: string;
  onColorSelect: (color: string) => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
}

const PREDEFINED_COLORS = [
  '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', 
  '#06B6D4', '#8B5CF6', '#F97316', '#84CC16'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  isVisible,
  agentId,
  currentColor,
  onColorSelect,
  isColorUsed,
  getAvailableColorsCount
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-0 z-50 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-600 min-w-64">
      <div className="text-xs text-gray-400 mb-2">
        Available colors: {getAvailableColorsCount(agentId)}/9 (used colors are dimmed)
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {PREDEFINED_COLORS.map((color) => {
          const isUsed = isColorUsed(color, agentId);
          const existingAgent = isUsed ? 'Unknown' : '';
          
          return (
            <button
              key={color}
              onClick={() => {
                if (!isUsed) {
                  onColorSelect(color);
                }
              }}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                currentColor === color ? 'border-white scale-110' :
                isUsed ? 'border-red-500 opacity-50' : 'border-gray-600 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              disabled={isUsed}
              title={isUsed ? `Used by ${existingAgent}` : `Select ${color}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-gray-400">
        Custom colors can be added in the future
      </div>
    </div>
  );
}; 
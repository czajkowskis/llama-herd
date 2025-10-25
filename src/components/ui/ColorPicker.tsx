import React, { useRef } from 'react';

interface ColorPickerProps {
  isVisible: boolean;
  agentId: string;
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  isColorUsed: (color: string, excludeAgentId?: string) => boolean;
  getAvailableColorsCount: (excludeAgentId?: string) => number;
}

// 8 default colors; the 9th circle is a custom color picker
const PREDEFINED_COLORS = [
  '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899',
  '#06B6D4', '#8B5CF6', '#F97316'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  isVisible,
  agentId,
  currentColor,
  onColorSelect,
  onClose,
  isColorUsed,
  getAvailableColorsCount
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isCustomSelected = !PREDEFINED_COLORS.includes(currentColor);

  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-0 z-50 p-4 rounded-xl shadow-xl border min-w-40" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-start pb-2 mb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={onClose}
          aria-label="Close color picker"
          className="w-8 h-8 rounded-md border-2 flex items-center justify-center"
          style={{ 
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-text-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">

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
                isUsed ? 'border-red-500 opacity-50' : ''
              }`}
              style={{ 
                backgroundColor: color,
                borderColor: currentColor === color ? 'white' : isUsed ? '#ef4444' : 'var(--color-border)'
              }}
              onMouseEnter={(e) => {
                if (!isUsed && currentColor !== color) {
                  e.currentTarget.style.borderColor = 'var(--color-text-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUsed && currentColor !== color) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }
              }}
              disabled={isUsed}
              title={isUsed ? `Used by ${existingAgent}` : `Select ${color}`}
            />
          );
        })}

        {/* Custom color circle */}
        <button
          onClick={() => colorInputRef.current?.click()}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
            isCustomSelected ? 'border-white scale-110' : ''
          }`}
          style={{ 
            backgroundColor: isCustomSelected ? currentColor : 'transparent',
            borderColor: isCustomSelected ? 'white' : 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
          onMouseEnter={(e) => {
            if (!isCustomSelected) {
              e.currentTarget.style.borderColor = 'var(--color-text-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCustomSelected) {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }
          }}
          title={isCustomSelected ? `Custom: ${currentColor}` : 'Choose custom color'}
        >
          {!isCustomSelected && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          )}
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.value;
            if (!isColorUsed(chosen, agentId)) {
              onColorSelect(chosen);
            }
          }}
          aria-label="Custom color picker"
        />
      </div>
    </div>
  );
}; 
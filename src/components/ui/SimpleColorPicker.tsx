import React, { useRef } from 'react';

interface SimpleColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export const SimpleColorPicker: React.FC<SimpleColorPickerProps> = ({
  color,
  onChange,
  label
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center space-x-3">
      <div
        className="w-8 h-8 rounded border-2 cursor-pointer"
        style={{ backgroundColor: color, borderColor: 'var(--color-border)' }}
        onClick={() => colorInputRef.current?.click()}
        title={label || 'Click to change color'}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
        aria-label={label || 'Color picker'}
      />
      <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>{color}</span>
    </div>
  );
}; 
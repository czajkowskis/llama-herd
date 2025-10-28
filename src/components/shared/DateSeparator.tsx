import React from 'react';
import { formatDateLabel } from '../../services/dateTimeService';

interface DateSeparatorProps {
  timestamp: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ timestamp }) => {
  return (
    <div className="w-full">
      <div className="date-separator" role="separator" aria-label={formatDateLabel(timestamp)}>
        <span className="date-separator-label">{formatDateLabel(timestamp)}</span>
      </div>
    </div>
  );
};


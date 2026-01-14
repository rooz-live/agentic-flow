import React from 'react';

interface TemporalPivotProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: Array<{
    id: string;
    date: Date;
    title: string;
  }>;
}

export const TemporalPivot: React.FC<TemporalPivotProps> = ({
  selectedDate,
  onDateSelect,
  events = []
}) => {
  return (
    <div>
      <h3>Temporal Pivot</h3>
      <p>Date: {selectedDate?.toLocaleDateString() ?? 'No date selected'}</p>
      <p>Events: {events.length}</p>
    </div>
  );
};

export default TemporalPivot;

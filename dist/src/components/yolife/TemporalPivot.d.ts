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
export declare const TemporalPivot: React.FC<TemporalPivotProps>;
export default TemporalPivot;
//# sourceMappingURL=TemporalPivot.d.ts.map
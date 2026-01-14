import React from 'react';
interface Activity {
    id: string;
    timestamp: Date;
    title: string;
    description?: string;
    type?: string;
}
interface CircleActivityTimelineProps {
    activities?: Activity[];
    onActivitySelect?: (activity: Activity) => void;
}
export declare const CircleActivityTimeline: React.FC<CircleActivityTimelineProps>;
export default CircleActivityTimeline;
//# sourceMappingURL=CircleActivityTimeline.d.ts.map
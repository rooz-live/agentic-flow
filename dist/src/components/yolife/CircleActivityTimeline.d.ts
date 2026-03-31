import React from 'react';
interface Circle {
    name: string;
    episodes: number;
    percentage: number;
    color: string;
}
interface Activity {
    id: string;
    timestamp: Date;
    title: string;
    description?: string;
    type?: string;
}
interface CircleActivityTimelineProps {
    circles?: Circle[];
    activities?: Activity[];
    onActivitySelect?: (activity: Activity) => void;
}
export declare const CircleActivityTimeline: React.FC<CircleActivityTimelineProps>;
export default CircleActivityTimeline;
//# sourceMappingURL=CircleActivityTimeline.d.ts.map
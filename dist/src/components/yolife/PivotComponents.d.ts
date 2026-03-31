/**
 * Pivot View Components for yo.life Cockpit
 * Temporal, Spatial, and Dimensional analysis views
 */
import React from 'react';
interface Circle {
    name: string;
    color: string;
    episodes: number;
    percentage: number;
    lastActivity?: string;
}
export declare const TemporalPivot: React.FC;
interface SpatialPivotProps {
    circles: Circle[];
}
export declare const SpatialPivot: React.FC<SpatialPivotProps>;
export declare const DimensionalPivot: React.FC;
interface CircleActivityTimelineProps {
    circles: Circle[];
}
export declare const CircleActivityTimeline: React.FC<CircleActivityTimelineProps>;
export {};
//# sourceMappingURL=PivotComponents.d.ts.map
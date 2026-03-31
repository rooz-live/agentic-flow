import React from 'react';
interface Circle {
    name: string;
    episodes: number;
    percentage: number;
    color: string;
}
interface SpatialPivotProps {
    circles?: Circle[];
    location?: {
        lat: number;
        lng: number;
    };
    onLocationChange?: (location: {
        lat: number;
        lng: number;
    }) => void;
}
export declare const SpatialPivot: React.FC<SpatialPivotProps>;
export default SpatialPivot;
//# sourceMappingURL=SpatialPivot.d.ts.map
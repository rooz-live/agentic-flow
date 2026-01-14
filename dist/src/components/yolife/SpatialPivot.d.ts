import React from 'react';
interface SpatialPivotProps {
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
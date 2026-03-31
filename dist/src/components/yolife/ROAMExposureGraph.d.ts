/**
 * ROAM Exposure Radar Chart Component
 * Visualizes Risk, Obstacle, Assumption, Mitigation metrics
 */
import React from 'react';
interface ROAMMetrics {
    risk: number;
    obstacle: number;
    assumption: number;
    mitigation: number;
    exposureScore: number;
}
interface ROAMExposureGraphProps {
    metrics: ROAMMetrics;
}
export declare const ROAMExposureGraph: React.FC<ROAMExposureGraphProps>;
export default ROAMExposureGraph;
//# sourceMappingURL=ROAMExposureGraph.d.ts.map
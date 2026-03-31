/**
 * 4-Layer Deck.gl Swarm Visualization with WSJF Auto-Selection
 *
 * Layer Architecture:
 * - Layer 1 (Queen): Aggregate swarm state visualization
 * - Layer 2 (Specialists): Agent ROAM metrics as 3D points
 * - Layer 3 (Memory): Vector search results as arc connections
 * - Layer 4 (Execution): Real-time WebGL streaming updates
 *
 * WSJF Auto-Selection: Chooses optimal visualization based on:
 * - Data volume (MCP factors)
 * - Interaction requirements (MPP)
 * - Performance constraints
 * - User context
 */
import React from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
interface WSJFFactors {
    dataVolume: number;
    interactionNeed: number;
    performanceRequired: number;
    userSkillLevel: number;
}
interface VisualizationOption {
    name: 'deck.gl' | 'three.js' | 'babylon.js' | 'cesium' | 'webgpu';
    costOfDelay: number;
    jobSize: number;
    wsjfScore?: number;
}
declare function calculateWSJF(factors: WSJFFactors): VisualizationOption;
interface SwarmDeckGLProps {
    wsjfFactors?: WSJFFactors;
    viewState?: any;
    mapStyle?: string;
}
declare const SwarmDeckGL: React.FC<SwarmDeckGLProps>;
export default SwarmDeckGL;
export { calculateWSJF, type WSJFFactors, type VisualizationOption };
//# sourceMappingURL=swarm-deckgl-4layer.d.ts.map
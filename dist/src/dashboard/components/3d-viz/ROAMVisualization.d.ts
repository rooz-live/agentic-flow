/**
 * ROAM Metrics 3D Visualization with Deck.gl
 * GPU-powered rendering with Hierarchical Mesh Sparse Attention
 *
 * 4-Layer Architecture:
 *   Layer 1 (Queen): HexagonLayer - Aggregate swarm state density
 *   Layer 2 (Specialists): ScatterplotLayer - Agent ROAM metrics as 3D points
 *   Layer 3 (Memory): ArcLayer - Vector search results as connections
 *   Layer 4 (Execution): PathLayer (StreamLayer) - Real-time WebGL updates
 */
import React from 'react';
export interface ROAMMetric {
    reach: number;
    optimize: number;
    automate: number;
    monitor: number;
    timestamp: number;
    agentId: string;
    health: 'healthy' | 'warning' | 'critical';
}
export interface VectorConnection {
    source: [number, number, number];
    target: [number, number, number];
    similarity: number;
}
export interface StreamUpdate {
    path: Array<[number, number, number]>;
    timestamp: number;
}
interface Props {
    data: ROAMMetric[];
    vectorConnections?: VectorConnection[];
    streamData?: StreamUpdate[];
    enableLayers?: {
        hexagon?: boolean;
        scatter?: boolean;
        arc?: boolean;
        stream?: boolean;
    };
}
export declare const ROAMVisualization: React.FC<Props>;
/**
 * Example usage with sample data
 */
export declare function ROAMVisualizationExample(): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ROAMVisualization.d.ts.map
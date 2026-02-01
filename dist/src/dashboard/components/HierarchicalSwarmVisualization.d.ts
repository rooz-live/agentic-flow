/**
 * Hierarchical-Mesh Swarm Visualization with 4-Layer Architecture
 *
 * Layer 1 (Queen): Aggregate swarm state visualization
 * Layer 2 (Specialists): Agent ROAM metrics as 3D points
 * Layer 3 (Memory): Vector search results as arc connections
 * Layer 4 (Execution): Real-time WebGL streaming updates
 *
 * Uses Deck.gl GPU-powered rendering for 60fps real-time updates
 */
interface SwarmVisualizationProps {
    apiEndpoint: string;
    refreshInterval?: number;
    showLayers?: {
        queen: boolean;
        agents: boolean;
        memory: boolean;
        execution: boolean;
    };
}
export default function HierarchicalSwarmVisualization({ apiEndpoint, refreshInterval, showLayers }: SwarmVisualizationProps): import("react/jsx-runtime").JSX.Element;
export declare function createProductionVisualization(deployment: 'starlingx' | 'cpanel' | 'localhost'): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=HierarchicalSwarmVisualization.d.ts.map
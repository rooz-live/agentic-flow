import React from 'react';
/**
 * WSJF-Driven 4-Layer Hierarchical Swarm Visualization
 *
 * Layer Strategy (WSJF Auto-Selection):
 * - Layer 1 (Queen): Aggregate swarm state (HexagonLayer for density)
 * - Layer 2 (Specialists): Agent ROAM metrics (ScatterplotLayer with 3D elevation)
 * - Layer 3 (Memory): Vector search results (ArcLayer for connections)
 * - Layer 4 (Execution): Real-time updates (ColumnLayer for task flow)
 *
 * MCP/MPP Protocol Factors:
 * - Memory Context Protocol: Vector embeddings → arc connections
 * - Method Pattern Protocol: Task execution → column heights
 * - Performance: GPU-accelerated WebGL2 with 64-bit precision
 */
interface AgentMetric {
    id: string;
    position: [number, number];
    elevation: number;
    roam: {
        risks: number;
        opportunities: number;
        aspirations: number;
        measurements: number;
    };
    wsjf: number;
    circle: string;
    status: 'active' | 'idle' | 'busy';
}
interface MemoryConnection {
    source: [number, number];
    target: [number, number];
    similarity: number;
    namespace: string;
}
interface TaskExecution {
    position: [number, number];
    height: number;
    completionRate: number;
    priority: number;
}
interface SwarmState {
    queenMetrics: {
        totalAgents: number;
        avgWSJF: number;
        healthScore: number;
        convergence: number;
    };
    agents: AgentMetric[];
    memoryConnections: MemoryConnection[];
    tasks: TaskExecution[];
}
interface DeckGLSwarmVizProps {
    data: SwarmState;
    viewState?: {
        longitude: number;
        latitude: number;
        zoom: number;
        pitch: number;
        bearing: number;
    };
    onAgentClick?: (agent: AgentMetric) => void;
    mcpContext?: {
        vectorSearchEnabled: boolean;
        hnswActive: boolean;
    };
}
export declare const DeckGLSwarmViz: React.FC<DeckGLSwarmVizProps>;
export default DeckGLSwarmViz;
//# sourceMappingURL=deckgl-swarm-viz.d.ts.map
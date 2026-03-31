/**
 * Cosmograph Visualization for Agent Swarm Data
 *
 * Visualizes swarm coordination data from agentic-synth-examples
 * with interactive graph showing agent relationships and metrics.
 */
import React from 'react';
interface AgentNode {
    id: string;
    agent_id: string;
    role: 'coordinator' | 'worker' | 'analyzer' | 'optimizer';
    status: 'active' | 'idle' | 'terminated';
    tasks_completed: number;
    success_rate: number;
    coordination_score: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
}
interface SwarmCosmographProps {
    swarmData: AgentNode[];
    width?: number;
    height?: number;
    showLabels?: boolean;
}
export declare const SwarmCosmograph: React.FC<SwarmCosmographProps>;
export declare const SwarmVisualization: React.FC;
export default SwarmVisualization;
//# sourceMappingURL=SwarmCosmograph.d.ts.map
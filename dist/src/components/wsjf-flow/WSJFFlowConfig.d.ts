/**
 * ReactFlow Configuration for WSJF Workflow Visualization
 * npm i reactflow @reactflow/node-toolbar
 *
 * Visualizes:
 * - WSJF prioritization flow
 * - Method pattern tiers
 * - GOAP planning phases
 * - SFT/RL testing methodology
 */
import type { Node, Edge } from 'reactflow';
export interface WSJFNodeData {
    label: string;
    wsjfScore?: number;
    cod?: number;
    jobSize?: number;
    tier?: 1 | 2 | 3;
    phase?: 'spectrum' | 'signal' | 'goap' | 'FOUNDATION' | 'LEARNING' | 'TRANSFER' | 'OPTIMIZATION' | 'EMERGENCE';
    status?: 'pending' | 'in_progress' | 'completed';
    circle?: string;
}
export interface GOAPNodeData {
    label: string;
    phase: 'FOUNDATION' | 'LEARNING' | 'TRANSFER' | 'OPTIMIZATION' | 'EMERGENCE';
    cost: number;
    preconditions: string[];
    effects: string[];
}
export interface TestingNodeData {
    label: string;
    type: 'sft' | 'rl' | 'mgpo' | 'backtest' | 'forward';
    passAtK?: number;
    sharpeRatio?: number;
    entropy?: number;
}
export declare const NODE_COLORS: {
    wsjf: {
        high: string;
        medium: string;
        low: string;
    };
    tier: {
        1: string;
        2: string;
        3: string;
    };
    goap: {
        FOUNDATION: string;
        LEARNING: string;
        TRANSFER: string;
        OPTIMIZATION: string;
        EMERGENCE: string;
    };
    testing: {
        sft: string;
        rl: string;
        mgpo: string;
        backtest: string;
        forward: string;
    };
    status: {
        pending: string;
        in_progress: string;
        completed: string;
    };
};
export declare const defaultWSJFNodes: Node<WSJFNodeData>[];
export declare const defaultWSJFEdges: Edge[];
export declare const goapFlowNodes: Node<GOAPNodeData>[];
export declare const goapFlowEdges: Edge[];
export declare const testingFlowNodes: Node<TestingNodeData>[];
export declare const testingFlowEdges: Edge[];
export declare const flowConfigs: {
    wsjf: {
        nodes: Node<WSJFNodeData>[];
        edges: Edge[];
    };
    goap: {
        nodes: Node<GOAPNodeData>[];
        edges: Edge[];
    };
    testing: {
        nodes: Node<TestingNodeData>[];
        edges: Edge[];
    };
};
//# sourceMappingURL=WSJFFlowConfig.d.ts.map
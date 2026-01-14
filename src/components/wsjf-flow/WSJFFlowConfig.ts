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

import type { Node, Edge, NodeTypes, EdgeTypes } from 'reactflow';

// Node Types for WSJF Flow
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

// Color schemes for different node types
export const NODE_COLORS = {
  wsjf: {
    high: '#22c55e',      // green - high priority
    medium: '#eab308',    // yellow - medium priority
    low: '#6b7280',       // gray - low priority
  },
  tier: {
    1: '#3b82f6',         // blue - tier 1
    2: '#8b5cf6',         // purple - tier 2
    3: '#ec4899',         // pink - tier 3
  },
  goap: {
    FOUNDATION: '#6366f1',
    LEARNING: '#8b5cf6',
    TRANSFER: '#a855f7',
    OPTIMIZATION: '#d946ef',
    EMERGENCE: '#ec4899',
  },
  testing: {
    sft: '#22d3ee',       // cyan - spectrum phase
    rl: '#f97316',        // orange - signal phase
    mgpo: '#ef4444',      // red - MGPO
    backtest: '#14b8a6',  // teal - backtest
    forward: '#84cc16',   // lime - forward test
  },
  status: {
    pending: '#9ca3af',
    in_progress: '#3b82f6',
    completed: '#22c55e',
  }
};

// Default WSJF Flow Nodes
export const defaultWSJFNodes: Node<WSJFNodeData>[] = [
  // Input nodes
  {
    id: 'input-ubv',
    type: 'input',
    position: { x: 0, y: 0 },
    data: { label: 'User Business Value (UBV)', tier: 1 },
  },
  {
    id: 'input-tc',
    type: 'input',
    position: { x: 200, y: 0 },
    data: { label: 'Time Criticality (TC)', tier: 1 },
  },
  {
    id: 'input-rr',
    type: 'input',
    position: { x: 400, y: 0 },
    data: { label: 'Risk Reduction (RR)', tier: 1 },
  },
  // Processing nodes
  {
    id: 'calc-cod',
    type: 'default',
    position: { x: 200, y: 100 },
    data: { label: 'Calculate CoD', cod: 0 },
  },
  {
    id: 'input-size',
    type: 'input',
    position: { x: 0, y: 200 },
    data: { label: 'Job Size', jobSize: 0 },
  },
  {
    id: 'calc-wsjf',
    type: 'default',
    position: { x: 200, y: 200 },
    data: { label: 'WSJF = CoD / Size', wsjfScore: 0 },
  },
  // Output nodes
  {
    id: 'output-rank',
    type: 'output',
    position: { x: 200, y: 300 },
    data: { label: 'Prioritized Ranking', status: 'completed' },
  },
];

// Default WSJF Flow Edges
export const defaultWSJFEdges: Edge[] = [
  { id: 'e-ubv-cod', source: 'input-ubv', target: 'calc-cod', animated: true },
  { id: 'e-tc-cod', source: 'input-tc', target: 'calc-cod', animated: true },
  { id: 'e-rr-cod', source: 'input-rr', target: 'calc-cod', animated: true },
  { id: 'e-cod-wsjf', source: 'calc-cod', target: 'calc-wsjf' },
  { id: 'e-size-wsjf', source: 'input-size', target: 'calc-wsjf' },
  { id: 'e-wsjf-rank', source: 'calc-wsjf', target: 'output-rank', animated: true },
];

// GOAP Planning Flow Nodes
export const goapFlowNodes: Node<GOAPNodeData>[] = [
  {
    id: 'goap-start',
    type: 'input',
    position: { x: 300, y: 0 },
    data: { 
      label: 'Initial State',
      phase: 'FOUNDATION',
      cost: 0,
      preconditions: [],
      effects: []
    },
  },
  // Phase 1: Foundation
  {
    id: 'goap-fleet',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Initialize Fleet',
      phase: 'FOUNDATION',
      cost: 5,
      preconditions: ['fleet_ready: false'],
      effects: ['fleet_ready: true']
    },
  },
  {
    id: 'goap-agentdb',
    type: 'default',
    position: { x: 500, y: 100 },
    data: { 
      label: 'Setup AgentDB',
      phase: 'FOUNDATION',
      cost: 3,
      preconditions: ['agentdb_ready: false'],
      effects: ['agentdb_ready: true']
    },
  },
  // Phase 2: Learning
  {
    id: 'goap-dream',
    type: 'default',
    position: { x: 100, y: 200 },
    data: { 
      label: 'Activate Dream Engine',
      phase: 'LEARNING',
      cost: 4,
      preconditions: ['fleet_ready: true'],
      effects: ['dream_active: true']
    },
  },
  // Phase 3: Transfer
  {
    id: 'goap-share',
    type: 'default',
    position: { x: 500, y: 200 },
    data: { 
      label: 'Enable Knowledge Sharing',
      phase: 'TRANSFER',
      cost: 3,
      preconditions: ['agentdb_ready: true'],
      effects: ['sharing_enabled: true']
    },
  },
  // Phase 4: Optimization
  {
    id: 'goap-optimize',
    type: 'default',
    position: { x: 300, y: 300 },
    data: { 
      label: 'Optimize Transfer Paths',
      phase: 'OPTIMIZATION',
      cost: 3,
      preconditions: ['sharing_enabled: true'],
      effects: ['transfer_optimized: true']
    },
  },
  // Phase 5: Emergence
  {
    id: 'goap-collective',
    type: 'default',
    position: { x: 100, y: 400 },
    data: { 
      label: 'Collective Dreaming',
      phase: 'EMERGENCE',
      cost: 5,
      preconditions: ['dream_active: true', 'sharing_enabled: true'],
      effects: ['collective_dream: true']
    },
  },
  {
    id: 'goap-swarm',
    type: 'output',
    position: { x: 300, y: 500 },
    data: { 
      label: 'Swarm Intelligence',
      phase: 'EMERGENCE',
      cost: 8,
      preconditions: ['collective_dream: true', 'transfer_optimized: true'],
      effects: ['swarm_active: true']
    },
  },
];

export const goapFlowEdges: Edge[] = [
  { id: 'e-start-fleet', source: 'goap-start', target: 'goap-fleet' },
  { id: 'e-start-agentdb', source: 'goap-start', target: 'goap-agentdb' },
  { id: 'e-fleet-dream', source: 'goap-fleet', target: 'goap-dream', animated: true },
  { id: 'e-agentdb-share', source: 'goap-agentdb', target: 'goap-share', animated: true },
  { id: 'e-share-optimize', source: 'goap-share', target: 'goap-optimize' },
  { id: 'e-dream-collective', source: 'goap-dream', target: 'goap-collective' },
  { id: 'e-share-collective', source: 'goap-share', target: 'goap-collective', style: { stroke: '#a855f7' } },
  { id: 'e-collective-swarm', source: 'goap-collective', target: 'goap-swarm', animated: true },
  { id: 'e-optimize-swarm', source: 'goap-optimize', target: 'goap-swarm', animated: true },
];

// SFT + RL Testing Flow Nodes
export const testingFlowNodes: Node<TestingNodeData>[] = [
  // Spectrum Phase (SFT)
  {
    id: 'test-input',
    type: 'input',
    position: { x: 300, y: 0 },
    data: { label: 'Strategy Parameters', type: 'sft' },
  },
  {
    id: 'test-spectrum',
    type: 'default',
    position: { x: 300, y: 80 },
    data: { label: 'Spectrum Phase (SFT)', type: 'sft', passAtK: 0.99 },
  },
  {
    id: 'test-diverse',
    type: 'default',
    position: { x: 100, y: 160 },
    data: { label: 'Generate Diverse Solutions', type: 'sft' },
  },
  {
    id: 'test-backtest',
    type: 'default',
    position: { x: 500, y: 160 },
    data: { label: 'Backtest All Paths', type: 'backtest', sharpeRatio: 2.5 },
  },
  // Signal Phase (RL)
  {
    id: 'test-signal',
    type: 'default',
    position: { x: 300, y: 240 },
    data: { label: 'Signal Phase (RL)', type: 'rl' },
  },
  {
    id: 'test-mgpo',
    type: 'default',
    position: { x: 300, y: 320 },
    data: { label: 'MGPO Ranking', type: 'mgpo', entropy: 0.3 },
  },
  {
    id: 'test-forward',
    type: 'default',
    position: { x: 300, y: 400 },
    data: { label: 'Forward Test Top N', type: 'forward' },
  },
  {
    id: 'test-output',
    type: 'output',
    position: { x: 300, y: 480 },
    data: { label: 'Recommended Strategy', type: 'forward' },
  },
];

export const testingFlowEdges: Edge[] = [
  { id: 'e-input-spectrum', source: 'test-input', target: 'test-spectrum', animated: true },
  { id: 'e-spectrum-diverse', source: 'test-spectrum', target: 'test-diverse' },
  { id: 'e-spectrum-backtest', source: 'test-spectrum', target: 'test-backtest' },
  { id: 'e-diverse-signal', source: 'test-diverse', target: 'test-signal' },
  { id: 'e-backtest-signal', source: 'test-backtest', target: 'test-signal' },
  { id: 'e-signal-mgpo', source: 'test-signal', target: 'test-mgpo', animated: true },
  { id: 'e-mgpo-forward', source: 'test-mgpo', target: 'test-forward' },
  { id: 'e-forward-output', source: 'test-forward', target: 'test-output', animated: true },
];

// Export all configurations
export const flowConfigs = {
  wsjf: { nodes: defaultWSJFNodes, edges: defaultWSJFEdges },
  goap: { nodes: goapFlowNodes, edges: goapFlowEdges },
  testing: { nodes: testingFlowNodes, edges: testingFlowEdges },
};

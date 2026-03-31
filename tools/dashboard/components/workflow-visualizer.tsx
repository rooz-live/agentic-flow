/**
 * Workflow Visualizer with ReactFlow
 * 
 * Visualizes WSJF workflow, circle dependencies, and pattern flows
 */
import React from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowVisualizerProps {
  workflowType: 'wsjf' | 'circles' | 'patterns';
}

const wsjfNodes: Node[] = [
  {
    id: '1',
    data: { label: '📊 WSJF Calculation' },
    position: { x: 0, y: 0 },
    style: { background: '#3b82f6', color: 'white', padding: 16 }
  },
  {
    id: '2',
    data: { label: '🔍 Pattern Discovery' },
    position: { x: 250, y: 0 },
    style: { background: '#10b981', color: 'white', padding: 16 }
  },
  {
    id: '3',
    data: { label: '⚠️ Risk Analytics' },
    position: { x: 500, y: 0 },
    style: { background: '#f59e0b', color: 'white', padding: 16 }
  },
  {
    id: '4',
    data: { label: '✅ Execution' },
    position: { x: 250, y: 100 },
    style: { background: '#8b5cf6', color: 'white', padding: 16 }
  },
];

const wsjfEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
];

export function WorkflowVisualizer({ workflowType }: WorkflowVisualizerProps) {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={wsjfNodes}
        edges={wsjfEdges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

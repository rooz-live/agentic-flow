/**
 * ReactFlow Component for WSJF Workflow Visualization
 * Modern UI with HeroUI styling patterns
 */

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  flowConfigs,
  NODE_COLORS,
  WSJFNodeData,
  GOAPNodeData,
  TestingNodeData,
} from './WSJFFlowConfig';

// Custom Node Components
const WSJFNode = ({ data }: { data: WSJFNodeData }) => {
  const bgColor = data.wsjfScore 
    ? data.wsjfScore > 7 ? NODE_COLORS.wsjf.high 
    : data.wsjfScore > 4 ? NODE_COLORS.wsjf.medium 
    : NODE_COLORS.wsjf.low
    : data.tier ? NODE_COLORS.tier[data.tier] : '#6b7280';

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
      border: `2px solid ${bgColor}`,
      minWidth: '140px',
      textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.label}</div>
      {data.wsjfScore !== undefined && (
        <div style={{ fontSize: '0.85em', color: bgColor }}>
          WSJF: {data.wsjfScore.toFixed(1)}
        </div>
      )}
      {data.cod !== undefined && (
        <div style={{ fontSize: '0.8em', opacity: 0.8 }}>CoD: {data.cod}</div>
      )}
      {data.status && (
        <div style={{
          marginTop: '4px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: NODE_COLORS.status[data.status],
          color: 'white',
          fontSize: '0.75em',
        }}>
          {data.status.replace('_', ' ')}
        </div>
      )}
    </div>
  );
};

const GOAPNode = ({ data }: { data: GOAPNodeData }) => {
  const bgColor = NODE_COLORS.goap[data.phase];

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
      border: `2px solid ${bgColor}`,
      minWidth: '160px',
    }}>
      <div style={{ 
        fontWeight: 600, 
        marginBottom: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{data.label}</span>
        <span style={{ 
          fontSize: '0.75em', 
          padding: '2px 6px',
          background: bgColor,
          color: 'white',
          borderRadius: '4px',
        }}>
          {data.phase}
        </span>
      </div>
      <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Cost: {data.cost}</div>
      {data.preconditions.length > 0 && (
        <div style={{ fontSize: '0.7em', marginTop: '4px', color: '#9ca3af' }}>
          Pre: {data.preconditions.join(', ')}
        </div>
      )}
    </div>
  );
};

const TestingNode = ({ data }: { data: TestingNodeData }) => {
  const bgColor = NODE_COLORS.testing[data.type];

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
      border: `2px solid ${bgColor}`,
      minWidth: '150px',
      textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.label}</div>
      <div style={{
        fontSize: '0.75em',
        padding: '2px 6px',
        background: bgColor,
        color: 'white',
        borderRadius: '4px',
        display: 'inline-block',
      }}>
        {data.type.toUpperCase()}
      </div>
      {data.passAtK !== undefined && (
        <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
          Pass@K: {(data.passAtK * 100).toFixed(1)}%
        </div>
      )}
      {data.sharpeRatio !== undefined && (
        <div style={{ fontSize: '0.8em', marginTop: '2px' }}>
          Sharpe: {data.sharpeRatio.toFixed(2)}
        </div>
      )}
      {data.entropy !== undefined && (
        <div style={{ fontSize: '0.8em', marginTop: '2px' }}>
          Entropy: {data.entropy.toFixed(2)}
        </div>
      )}
    </div>
  );
};

// Flow type selector
type FlowType = 'wsjf' | 'goap' | 'testing';

// Union type for all node data types
type FlowNodeData = WSJFNodeData | GOAPNodeData | TestingNodeData;

interface WSJFFlowProps {
  flowType?: FlowType;
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
}

export const WSJFFlowComponent: React.FC<WSJFFlowProps> = ({
  flowType = 'wsjf',
  onNodeClick,
  onEdgeClick,
}) => {
  const config = flowConfigs[flowType];
  // Use type assertion to handle the union type
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(config.nodes as Node<FlowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(config.edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const nodeTypes = useMemo(() => ({
    wsjf: WSJFNode,
    goap: GOAPNode,
    testing: TestingNode,
  }), []);

  const minimapStyle = {
    height: 100,
    backgroundColor: '#1a1a2e',
  };

  return (
    <div style={{ width: '100%', height: '600px', background: '#0f0f1a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        onEdgeClick={(_, edge) => onEdgeClick?.(edge)}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap style={minimapStyle} zoomable pannable />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
        
        <Panel position="top-left">
          <div style={{
            background: 'rgba(15, 15, 26, 0.9)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #333',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              {flowType === 'wsjf' && '📊 WSJF Prioritization Flow'}
              {flowType === 'goap' && '🎯 GOAP Planning Flow'}
              {flowType === 'testing' && '🧪 SFT + RL Testing Flow'}
            </div>
            <div style={{ fontSize: '0.85em', color: '#9ca3af' }}>
              {flowType === 'wsjf' && 'CoD = UBV + TC + RR | WSJF = CoD / Size'}
              {flowType === 'goap' && '5 Phases: Foundation → Emergence'}
              {flowType === 'testing' && 'Spectrum Phase → Signal Phase → MGPO'}
            </div>
          </div>
        </Panel>

        <Panel position="top-right">
          <div style={{
            background: 'rgba(15, 15, 26, 0.9)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #333',
            display: 'flex',
            gap: '4px',
          }}>
            {(['wsjf', 'goap', 'testing'] as FlowType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  const newConfig = flowConfigs[type];
                  setNodes(newConfig.nodes as Node<FlowNodeData>[]);
                  setEdges(newConfig.edges);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: flowType === type ? '2px solid #3b82f6' : '1px solid #444',
                  background: flowType === type ? '#3b82f620' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                }}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default WSJFFlowComponent;

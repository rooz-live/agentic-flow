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
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  flowConfigs,
  NODE_COLORS,
  WSJFNodeData,
  GOAPNodeData,
  TestingNodeData,
  GovernanceNodeData,
} from '../components/wsjf-flow/WSJFFlowConfig';

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
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
        {data.label.includes('.') ? (
          <a 
            href={`https://${data.label.replace(/^\(|\);?$/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            className="hover:text-white hover:underline cursor-pointer"
          >
            {data.label}
          </a>
        ) : (
          data.label
        )}
      </div>
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
      <Handle type="target" position={Position.Top} className="w-16 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="w-16 !bg-transparent" />
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
      <Handle type="target" position={Position.Top} className="w-16 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="w-16 !bg-transparent" />
    </div>
  );
};

const GovernanceNode = ({ data }: { data: GovernanceNodeData }) => {
  const bgColor = NODE_COLORS.governance[data.phase];

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
      border: `2px solid ${bgColor}`,
      minWidth: '180px',
      textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.label}</div>
      <div style={{
        fontSize: '0.75em',
        padding: '2px 8px',
        background: bgColor,
        color: 'white',
        borderRadius: '4px',
        display: 'inline-block',
        marginBottom: '6px'
      }}>
        {data.status.toUpperCase()}
      </div>
      {data.owner && (
        <div style={{ fontSize: '0.8em', opacity: 0.9 }}>Owner: {data.owner}</div>
      )}
      {data.duration && (
        <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Duration: {data.duration}</div>
      )}
      {data.phase !== 'STANDUP' && <Handle type="target" position={Position.Top} className="w-16 !bg-transparent" />}
      {data.phase !== 'COMMIT' && <Handle type="source" position={Position.Bottom} className="w-16 !bg-transparent" />}
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
      <Handle type="target" position={Position.Top} className="w-16 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="w-16 !bg-transparent" />
    </div>
  );
};

// Flow type selector
type FlowType = 'wsjf' | 'goap' | 'testing' | 'governance';

// Union type for all node data types
type FlowNodeData = WSJFNodeData | GOAPNodeData | TestingNodeData | GovernanceNodeData;

interface WSJFFlowProps {
  flowType?: FlowType;
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
}

export const WSJFNowNextLater: React.FC<WSJFFlowProps> = ({
  flowType = 'wsjf',
  onNodeClick,
  onEdgeClick,
}) => {
  const config = flowConfigs[flowType];
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(config.nodes as Node<FlowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(config.edges);

  React.useEffect(() => {
    // 1. Initial Static Node Scaffold
    if (flowType === 'wsjf') {
      const fetchAdapter = async () => {
        try {
          const res = await fetch('/api/legal-matrix');
          if (res.ok) {
            const matrixData = await res.json();
            const domains: string[] = matrixData?.layer_4?.raw_ingestion_layer?.extracted_domains || [];

            if (domains.length > 0) {
              const COLUMNS = [
                'Now', 'Next', 'Later Today', 'Tomorrow', 'This Week', 'Next Week', 
                'This Month', 'Next Month', 'This Season', 'Next Season', 'This Year', 'Next Year'
              ];

              // Generate static column headers
              const headerNodes: Node<FlowNodeData>[] = COLUMNS.map((col, i) => ({
                id: `header-${i}`,
                type: 'default',
                position: { x: i * 220, y: -80 },
                data: { label: col, status: 'completed' },
                draggable: false,
                style: { backgroundColor: '#1e1e2d', color: '#a78bfa', fontWeight: 'bold', border: '1px solid #4c1d95', width: 180, textAlign: 'center' }
              }));

              const dynamicNodes: Node<FlowNodeData>[] = domains.map((domain, i) => {
                const colIndex = i % 12; // Spread evenly across exactly 12 required time horizons
                const rowScale = Math.floor(i / 12);
                
                const wsjfValue = (domain.length % 10) + 1; 

                return {
                  id: `domain-${i}`,
                  type: 'wsjf', 
                  position: { x: colIndex * 220, y: (rowScale * 120) + 30 },
                  data: {
                    label: domain,
                    wsjfScore: wsjfValue,
                    tier: ((i % 3) + 1) as 1 | 2 | 3,
                    status: wsjfValue > 7 ? 'in_progress' : 'pending'
                  }
                } as Node<FlowNodeData>;
              });

              setNodes([...headerNodes, ...dynamicNodes]);
              setEdges([]);
            }
          }
        } catch (e) {
          console.warn('WSJF Adapter fetch blocked: ', e);
        }
      };
      fetchAdapter();
    }
  }, [flowType, setNodes, setEdges, config]);

  // 2. Physical Swarm Matrix Reactivity 
  React.useEffect(() => {
    if (flowType !== 'wsjf') return;

    // @ts-ignore
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot.on('telemetry:stream', (data: any) => {
        if (data.wsjf_swarm) {
          setNodes((currentNodes) => currentNodes.map(node => {
            if (node.type === 'wsjf' && node.data.label) {
              const liveScore = data.wsjf_swarm[node.data.label as string];
              if (liveScore) {
                 // Remap geographical x column mapping cleanly to WSJF physical integer loop
                 const newColIndex = (liveScore - 1) % 12; 
                 return {
                   ...node,
                   position: { ...node.position, x: newColIndex * 220 },
                   data: { ...node.data, wsjfScore: liveScore }
                 };
              }
            }
            return node;
          }));
        }
      });
    }

    return () => {
      // @ts-ignore
      if (import.meta.hot) import.meta.hot.off('telemetry:stream');
    };
  }, [flowType, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const nodeTypes = useMemo(() => ({
    wsjf: WSJFNode,
    goap: GOAPNode,
    testing: TestingNode,
    governance: GovernanceNode,
  }), []);

  const minimapStyle = {
    height: 100,
    backgroundColor: '#1a1a2e',
  };

  return (
    <div style={{ width: '100%', height: '600px', background: '#0f0f1a' }}>
      {/* @ts-ignore - Bypass React 18 ReactFlow prop inheritance clash */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
        {/* @ts-ignore: React 18 / ReactFlow 11 prop discrepancy drift */}
        <Panel position="top-left">
          <div style={{
            background: 'rgba(15, 15, 26, 0.9)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #333',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              {flowType === 'wsjf' && '📊 WSJF Prioritization Flow'}
              {flowType === 'governance' && '⚙️ Core Governance Execution Cycle'}
              {flowType === 'goap' && '🎯 GOAP Planning Flow'}
              {flowType === 'testing' && '🧪 SFT + RL Testing Flow'}
            </div>
            <div style={{ fontSize: '0.85em', color: '#9ca3af' }}>
              {flowType === 'wsjf' && 'CoD = UBV + TC + RR | WSJF = CoD / Size'}
              {flowType === 'governance' && 'Cycle: STANDUP → WSJF SELECT → DoR → EXECUTE → VERIFY → COMMIT'}
              {flowType === 'goap' && '5 Phases: Foundation → Emergence'}
              {flowType === 'testing' && 'Spectrum Phase → Signal Phase → MGPO'}
            </div>
          </div>
        </Panel>

        {/* @ts-ignore: React 18 / ReactFlow 11 prop discrepancy drift */}
        <Panel position="top-right">
          <div style={{
            background: 'rgba(15, 15, 26, 0.9)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #333',
            display: 'flex',
            gap: '4px',
          }}>
            {(['wsjf', 'governance', 'goap', 'testing'] as FlowType[]).map((type) => (
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

export default WSJFNowNextLater;

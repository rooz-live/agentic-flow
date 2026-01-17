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

import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { 
  ScatterplotLayer, 
  ArcLayer, 
  TextLayer, 
  PolygonLayer,
  IconLayer,
  PathLayer,
  ColumnLayer
} from '@deck.gl/layers';
import { OrbitView, COORDINATE_SYSTEM } from '@deck.gl/core';

// Layer 1: Queen (Aggregate State)
interface QueenState {
  position: [number, number, number];
  health: number;           // 0-100
  tasksCompleted: number;
  totalAgents: number;
  swarmCoherence: number;   // 0-1
  hnswEnabled: boolean;
  wsjfScore: number;
}

// Layer 2: Specialist Agents
interface AgentMetrics {
  id: string;
  name: string;
  type: 'coder' | 'tester' | 'reviewer' | 'architect' | 'security' | 'optimizer';
  position: [number, number, number];
  roam: {
    resolved: number;
    owned: number;
    accepted: number;
    mitigated: number;
  };
  status: 'idle' | 'active' | 'blocked' | 'completing';
  taskLoad: number;         // 0-100
  mymScore: {
    manthra: number;        // Method consistency
    yasna: number;          // Practice alignment
    mithra: number;         // Protocol adherence
  };
}

// Layer 3: Memory/Vector Search
interface MemoryConnection {
  source: [number, number, number];
  target: [number, number, number];
  strength: number;         // 0-1
  type: 'hnsw' | 'semantic' | 'pattern';
  latency: number;          // ms
}

// Layer 4: Real-time Execution
interface ExecutionEvent {
  timestamp: number;
  agentId: string;
  position: [number, number, number];
  eventType: 'task_start' | 'task_complete' | 'decision' | 'coordination';
  intensity: number;        // 0-1
}

interface SwarmVisualizationProps {
  apiEndpoint: string;      // Real subdomain (e.g., 'https://swarm.rooz.live')
  refreshInterval?: number; // ms
  showLayers?: {
    queen: boolean;
    agents: boolean;
    memory: boolean;
    execution: boolean;
  };
}

const COLORS = {
  queen: [255, 215, 0, 255],          // Gold
  coder: [0, 150, 255, 200],
  tester: [255, 100, 100, 200],
  reviewer: [150, 255, 150, 200],
  architect: [200, 150, 255, 200],
  security: [255, 50, 50, 220],
  optimizer: [50, 255, 150, 200],
  hnsw: [0, 255, 255, 150],
  semantic: [255, 255, 0, 120],
  pattern: [255, 150, 255, 120],
  execution: [255, 255, 255, 200]
};

export default function HierarchicalSwarmVisualization({
  apiEndpoint,
  refreshInterval = 1000,
  showLayers = { queen: true, agents: true, memory: true, execution: true }
}: SwarmVisualizationProps) {
  const [viewState, setViewState] = useState({
    target: [0, 0, 0],
    rotationX: 30,
    rotationOrbit: 45,
    zoom: 1,
    minZoom: -3,
    maxZoom: 8
  });

  const [queenState, setQueenState] = useState<QueenState | null>(null);
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [memoryConnections, setMemoryConnections] = useState<MemoryConnection[]>([]);
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch real-time data from API endpoints
  useEffect(() => {
    const fetchSwarmData = async () => {
      try {
        // Fetch queen state
        const queenResponse = await fetch(`${apiEndpoint}/api/swarm/queen`);
        if (queenResponse.ok) {
          const queenData = await queenResponse.json();
          setQueenState(queenData);
        }

        // Fetch agent metrics
        const agentsResponse = await fetch(`${apiEndpoint}/api/swarm/agents`);
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAgents(agentsData);
        }

        // Fetch memory connections
        const memoryResponse = await fetch(`${apiEndpoint}/api/swarm/memory`);
        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json();
          setMemoryConnections(memoryData);
        }
      } catch (error) {
        console.error('Failed to fetch swarm data:', error);
      }
    };

    fetchSwarmData();
    const interval = setInterval(fetchSwarmData, refreshInterval);

    return () => clearInterval(interval);
  }, [apiEndpoint, refreshInterval]);

  // WebSocket for real-time execution events (Layer 4)
  useEffect(() => {
    const ws = new WebSocket(apiEndpoint.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/execution');
    
    ws.onopen = () => {
      setIsStreaming(true);
    };

    ws.onmessage = (event) => {
      const eventData: ExecutionEvent = JSON.parse(event.data);
      setExecutionEvents(prev => [...prev.slice(-100), eventData]); // Keep last 100 events
    };

    ws.onerror = () => {
      setIsStreaming(false);
    };

    return () => {
      ws.close();
    };
  }, [apiEndpoint]);

  // Generate agent positions in hierarchical mesh pattern
  const positionedAgents = useMemo(() => {
    if (!queenState) return agents;

    return agents.map((agent, idx) => {
      const angle = (idx / agents.length) * 2 * Math.PI;
      const radius = 50;
      const tier = Math.floor(idx / 5); // Multiple tiers
      
      return {
        ...agent,
        position: [
          Math.cos(angle) * (radius + tier * 20),
          Math.sin(angle) * (radius + tier * 20),
          agent.taskLoad * 0.5 // Height based on task load
        ] as [number, number, number]
      };
    });
  }, [agents, queenState]);

  // Layers
  const layers = [
    // Layer 1: Queen (Central coordinator)
    showLayers.queen && queenState && new ScatterplotLayer({
      id: 'queen-layer',
      data: [queenState],
      getPosition: d => d.position,
      getRadius: 15,
      getFillColor: COLORS.queen,
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 3,
      radiusMinPixels: 10,
      radiusMaxPixels: 30,
      pickable: true,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Queen health ring
    showLayers.queen && queenState && new PathLayer({
      id: 'queen-health-ring',
      data: [{
        path: Array.from({ length: 64 }, (_, i) => {
          const angle = (i / 64) * 2 * Math.PI * (queenState.health / 100);
          return [Math.cos(angle) * 20, Math.sin(angle) * 20, 10];
        })
      }],
      getPath: d => d.path,
      getColor: queenState.health > 70 ? [0, 255, 0, 200] : [255, 100, 0, 200],
      getWidth: 5,
      widthMinPixels: 3,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Layer 2: Specialist Agents (ROAM metrics as 3D columns)
    showLayers.agents && new ColumnLayer({
      id: 'agents-layer',
      data: positionedAgents,
      diskResolution: 20,
      radius: 4,
      extruded: true,
      getPosition: d => d.position,
      getFillColor: d => COLORS[d.type],
      getLineColor: [255, 255, 255, 100],
      getElevation: d => {
        const roamTotal = d.roam.resolved + d.roam.owned + d.roam.accepted + d.roam.mitigated;
        return roamTotal * 2;
      },
      elevationScale: 1,
      pickable: true,
      updateTriggers: {
        getPosition: [positionedAgents],
        getElevation: [positionedAgents]
      },
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Agent status indicators (small spheres above columns)
    showLayers.agents && new ScatterplotLayer({
      id: 'agent-status',
      data: positionedAgents,
      getPosition: d => {
        const roamTotal = d.roam.resolved + d.roam.owned + d.roam.accepted + d.roam.mitigated;
        return [d.position[0], d.position[1], d.position[2] + roamTotal * 2 + 5];
      },
      getRadius: 2,
      getFillColor: d => {
        const avgMym = (d.mymScore.manthra + d.mymScore.yasna + d.mymScore.mithra) / 3;
        return [
          Math.round(avgMym * 255),
          Math.round((1 - avgMym) * 255),
          100,
          200
        ];
      },
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      pickable: true,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Layer 3: Memory Connections (HNSW arcs)
    showLayers.memory && new ArcLayer({
      id: 'memory-connections',
      data: memoryConnections,
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getSourceColor: d => COLORS[d.type],
      getTargetColor: d => COLORS[d.type],
      getWidth: d => d.strength * 3,
      getHeight: d => d.strength * 0.3,
      widthMinPixels: 1,
      pickable: true,
      updateTriggers: {
        data: [memoryConnections]
      },
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Layer 4: Real-time Execution Events (particle effects)
    showLayers.execution && new ScatterplotLayer({
      id: 'execution-events',
      data: executionEvents.slice(-50), // Recent 50 events
      getPosition: d => d.position,
      getRadius: d => d.intensity * 5,
      getFillColor: d => {
        const age = Date.now() - d.timestamp;
        const alpha = Math.max(0, 255 - (age / 2000) * 255); // Fade over 2s
        return [...COLORS.execution.slice(0, 3), alpha];
      },
      radiusMinPixels: 2,
      radiusMaxPixels: 10,
      updateTriggers: {
        data: [executionEvents],
        getFillColor: [Date.now()]
      },
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    }),

    // Agent labels
    showLayers.agents && new TextLayer({
      id: 'agent-labels',
      data: positionedAgents,
      getPosition: d => {
        const roamTotal = d.roam.resolved + d.roam.owned + d.roam.accepted + d.roam.mitigated;
        return [d.position[0], d.position[1], d.position[2] + roamTotal * 2 + 10];
      },
      getText: d => d.name,
      getSize: 14,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      getColor: [255, 255, 255, 255],
      getPixelOffset: [0, 0],
      background: true,
      backgroundPadding: [4, 2],
      getBackgroundColor: [0, 0, 0, 180],
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
    })
  ].filter(Boolean);

  return (
    <div style={{ position: 'relative', width: '100%', height: '800px', backgroundColor: '#0a0a0f' }}>
      <DeckGL
        views={new OrbitView()}
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        parameters={{
          clearColor: [0.04, 0.04, 0.06, 1]
        }}
      />
      
      {/* Real-time Stats HUD */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '20px',
        borderRadius: '12px',
        color: '#00ff88',
        fontSize: '14px',
        fontFamily: 'monospace',
        border: '1px solid #00ff88',
        minWidth: '250px'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#ffd700' }}>
          ◆ HIERARCHICAL-MESH SWARM
        </div>
        
        {queenState && (
          <>
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #333' }}>
              <div>Queen Health: <span style={{ color: queenState.health > 70 ? '#00ff88' : '#ff6644' }}>{queenState.health}%</span></div>
              <div>HNSW: <span style={{ color: queenState.hnswEnabled ? '#00ffff' : '#666' }}>{queenState.hnswEnabled ? 'ACTIVE' : 'INACTIVE'}</span></div>
              <div>Coherence: {(queenState.swarmCoherence * 100).toFixed(1)}%</div>
              <div>WSJF: {queenState.wsjfScore.toFixed(2)}</div>
            </div>
            
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #333' }}>
              <div>Agents: {queenState.totalAgents}</div>
              <div>Active: {agents.filter(a => a.status === 'active').length}</div>
              <div>Tasks: {queenState.tasksCompleted}</div>
            </div>
          </>
        )}
        
        <div>
          <div>Memory Arcs: {memoryConnections.length}</div>
          <div>Events: {executionEvents.length}</div>
          <div>Streaming: <span style={{ color: isStreaming ? '#00ff88' : '#ff6644' }}>{isStreaming ? '●' : '○'}</span></div>
        </div>
      </div>
      
      {/* Layer Toggle */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Layers</div>
        <div>🟡 Layer 1: Queen</div>
        <div>🔵 Layer 2: Agents</div>
        <div>🟢 Layer 3: Memory</div>
        <div>⚪ Layer 4: Execution</div>
      </div>
      
      {/* Endpoint Display */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '10px',
        borderRadius: '8px',
        color: '#888',
        fontSize: '11px',
        fontFamily: 'monospace'
      }}>
        Endpoint: {apiEndpoint}
      </div>
    </div>
  );
}

// Factory function to create visualization with real endpoints
export function createProductionVisualization(deployment: 'starlingx' | 'cpanel' | 'localhost') {
  const endpoints = {
    starlingx: 'https://swarm.stx.rooz.live',
    cpanel: 'https://swarm.cpanel.rooz.live',
    localhost: 'http://localhost:3000'
  };

  return (
    <HierarchicalSwarmVisualization 
      apiEndpoint={endpoints[deployment]}
      refreshInterval={1000}
    />
  );
}

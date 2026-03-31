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
import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, PathLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';

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

export const ROAMVisualization: React.FC<Props> = ({
  data,
  vectorConnections = [],
  streamData = [],
  enableLayers = { hexagon: true, scatter: true, arc: true, stream: true },
}) => {
  const [hoveredObject, setHoveredObject] = useState<any>(null);

  // Layer 1: HexagonLayer - Queen/Aggregate swarm state
  const hexagonLayer = enableLayers.hexagon
    ? new HexagonLayer({
        id: 'layer1-queen-hexagon',
        data,
        getPosition: (d: ROAMMetric) => [d.reach, d.optimize, d.automate],
        radius: 5,
        elevationScale: 4,
        elevationRange: [0, 3000],
        extruded: true,
        pickable: true,
        colorRange: [
          [1, 152, 189],
          [73, 227, 206],
          [216, 254, 181],
          [254, 237, 177],
          [254, 173, 84],
          [209, 55, 78],
        ],
        opacity: 0.6,
        onHover: (info: any) => setHoveredObject(info.object),
      })
    : null;

  // Layer 2: ScatterplotLayer - Specialists/Agent ROAM metrics
  const scatterplotLayer = enableLayers.scatter
    ? new ScatterplotLayer({
        id: 'layer2-specialists-scatter',
        data,
        getPosition: (d: ROAMMetric) => [d.reach, d.optimize, d.automate],
        getRadius: (d: ROAMMetric) => d.monitor * 10,
        getFillColor: (d: ROAMMetric) => {
          switch (d.health) {
            case 'healthy':
              return [80, 210, 0, 200];
            case 'warning':
              return [255, 140, 0, 200];
            case 'critical':
              return [255, 0, 0, 200];
            default:
              return [128, 128, 128, 200];
          }
        },
        pickable: true,
        radiusMinPixels: 3,
        radiusMaxPixels: 30,
        onHover: (info: any) => setHoveredObject(info.object),
      })
    : null;

  // Layer 3: ArcLayer - Memory/Vector search connections
  const arcLayer = enableLayers.arc
    ? new ArcLayer({
        id: 'layer3-memory-arc',
        data: vectorConnections,
        getSourcePosition: (d: VectorConnection) => d.source,
        getTargetPosition: (d: VectorConnection) => d.target,
        getSourceColor: [80, 210, 0, 150],
        getTargetColor: [255, 140, 0, 150],
        getWidth: (d: VectorConnection) => d.similarity * 5,
        pickable: true,
        onHover: (info: any) => setHoveredObject(info.object),
      })
    : null;

  // Layer 4: PathLayer - Execution/Real-time stream updates
  const pathLayer = enableLayers.stream
    ? new PathLayer({
        id: 'layer4-execution-stream',
        data: streamData,
        getPath: (d: StreamUpdate) => d.path,
        getColor: [0, 150, 255, 200],
        getWidth: 2,
        widthMinPixels: 1,
        pickable: true,
        billboard: false,
        onHover: (info: any) => setHoveredObject(info.object),
      })
    : null;

  const layers = [hexagonLayer, scatterplotLayer, arcLayer, pathLayer].filter(
    (layer) => layer !== null
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      <DeckGL
        initialViewState={{
          longitude: 50,
          latitude: 50,
          zoom: 5,
          pitch: 45,
          bearing: 0,
        }}
        controller={true}
        layers={layers}
        getTooltip={(info: any) => {
          if (info.object) {
            return {
              html: `<div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
                <strong>Agent ID:</strong> ${info.object.agentId || 'N/A'}<br/>
                <strong>Reach:</strong> ${info.object.reach || 'N/A'}<br/>
                <strong>Optimize:</strong> ${info.object.optimize || 'N/A'}<br/>
                <strong>Automate:</strong> ${info.object.automate || 'N/A'}<br/>
                <strong>Monitor:</strong> ${info.object.monitor || 'N/A'}<br/>
                <strong>Health:</strong> ${info.object.health || 'N/A'}
              </div>`,
              style: { zIndex: 1 },
            };
          }
          return null;
        }}
      />
      
      {/* Layer Legend */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Hierarchical Mesh Sparse Attention
        </div>
        {enableLayers.hexagon && (
          <div>🔶 Layer 1 (Queen): Swarm Density</div>
        )}
        {enableLayers.scatter && (
          <div>🔴 Layer 2 (Specialists): Agent Metrics</div>
        )}
        {enableLayers.arc && (
          <div>🌐 Layer 3 (Memory): Vector Connections</div>
        )}
        {enableLayers.stream && (
          <div>⚡ Layer 4 (Execution): Real-time Streams</div>
        )}
      </div>
    </div>
  );
};

/**
 * Example usage with sample data
 */
export function ROAMVisualizationExample() {
  // Sample ROAM metrics
  const sampleData: ROAMMetric[] = Array.from({ length: 100 }, (_, i) => ({
    reach: Math.random() * 100,
    optimize: Math.random() * 100,
    automate: Math.random() * 100,
    monitor: Math.random() * 10,
    timestamp: Date.now(),
    agentId: `agent-${i}`,
    health: ['healthy', 'warning', 'critical'][Math.floor(Math.random() * 3)] as any,
  }));

  // Sample vector connections
  const sampleConnections: VectorConnection[] = Array.from({ length: 50 }, () => ({
    source: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
    target: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
    similarity: Math.random(),
  }));

  // Sample stream data
  const sampleStreams: StreamUpdate[] = Array.from({ length: 20 }, () => ({
    path: Array.from({ length: 10 }, () => [
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100,
    ]),
    timestamp: Date.now(),
  }));

  return (
    <ROAMVisualization
      data={sampleData}
      vectorConnections={sampleConnections}
      streamData={sampleStreams}
    />
  );
}

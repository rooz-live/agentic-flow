#!/usr/bin/env tsx
/**
 * Deck.gl Visualization Layers for Swarm State
 * Hierarchical mesh sparse attention visualization
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SwarmState {
  queen: {
    state: Record<string, any>;
    metrics: Record<string, number>;
  };
  specialists: Array<{
    id: string;
    roam: Record<string, any>;
    metrics: Record<string, number>;
    position: [number, number, number];
  }>;
  memory: Array<{
    query: string;
    results: Array<{
      id: string;
      similarity: number;
      from: [number, number];
      to: [number, number];
    }>;
  }>;
  execution: Array<{
    id: string;
    status: string;
    stream: Array<{
      timestamp: number;
      data: any;
    }>;
  }>;
}

export class DeckGLVisualization {
  private projectRoot: string;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }
  
  /**
   * Generate visualization configuration
   */
  generateVisualizationConfig(state: SwarmState): string {
    return `
import { Deck } from '@deck.gl/core';
import { HexagonLayer, ScatterplotLayer, ArcLayer, StreamLayer } from '@deck.gl/layers';

// Layer 1: Queen - Aggregate swarm state visualization
const queenLayer = new HexagonLayer({
  id: 'queen-layer',
  data: ${JSON.stringify(this.prepareQueenData(state.queen))},
  getPosition: d => d.position,
  getElevationWeight: d => d.metrics.aggregate || 0,
  elevationScale: 100,
  radius: 1000,
  coverage: 1,
  upperPercentile: 100
});

// Layer 2: Specialists - Agent ROAM metrics as 3D points
const specialistsLayer = new ScatterplotLayer({
  id: 'specialists-layer',
  data: ${JSON.stringify(state.specialists)},
  getPosition: d => d.position,
  getRadius: d => Math.sqrt(d.metrics.performance || 1) * 10,
  getFillColor: d => this.getColorForMetrics(d.metrics),
  radiusMinPixels: 2,
  radiusMaxPixels: 50
});

// Layer 3: Memory - Vector search results as ArcLayer connections
const memoryLayer = new ArcLayer({
  id: 'memory-layer',
  data: ${JSON.stringify(this.prepareMemoryData(state.memory))},
  getSourcePosition: d => d.from,
  getTargetPosition: d => d.to,
  getSourceColor: d => [255, 0, 0],
  getTargetColor: d => [0, 255, 0],
  getWidth: d => d.similarity * 5,
  widthMinPixels: 1,
  widthMaxPixels: 10
});

// Layer 4: Execution - Real-time WebGL streaming updates
const executionLayer = new StreamLayer({
  id: 'execution-layer',
  data: ${JSON.stringify(this.prepareExecutionData(state.execution))},
  getPosition: d => d.position,
  getColor: d => this.getColorForStatus(d.status),
  getRadius: d => d.intensity || 1,
  radiusMinPixels: 1,
  radiusMaxPixels: 20,
  trailLength: 100
});

// Create deck
const deck = new Deck({
  initialViewState: {
    longitude: 0,
    latitude: 0,
    zoom: 2,
    pitch: 45,
    bearing: 0
  },
  controller: true,
  layers: [
    queenLayer,
    specialistsLayer,
    memoryLayer,
    executionLayer
  ]
});
`;
  }
  
  private prepareQueenData(queen: SwarmState['queen']): Array<{ position: [number, number]; metrics: Record<string, number> }> {
    // Convert queen state to hexagon data
    return Object.entries(queen.metrics).map(([key, value], index) => ({
      position: [index * 0.1, index * 0.1] as [number, number],
      metrics: { aggregate: value }
    }));
  }
  
  private prepareMemoryData(memory: SwarmState['memory']): Array<{ from: [number, number]; to: [number, number]; similarity: number }> {
    const arcs: Array<{ from: [number, number]; to: [number, number]; similarity: number }> = [];
    
    for (const mem of memory) {
      for (const result of mem.results) {
        arcs.push({
          from: result.from,
          to: result.to,
          similarity: result.similarity
        });
      }
    }
    
    return arcs;
  }
  
  private prepareExecutionData(execution: SwarmState['execution']): Array<{ position: [number, number]; status: string; intensity: number }> {
    return execution.map((exec, index) => ({
      position: [index * 0.1, index * 0.1] as [number, number],
      status: exec.status,
      intensity: exec.stream.length / 100
    }));
  }
  
  private getColorForMetrics(metrics: Record<string, number>): [number, number, number] {
    const performance = metrics.performance || 0;
    if (performance > 80) return [0, 255, 0]; // Green
    if (performance > 50) return [255, 255, 0]; // Yellow
    return [255, 0, 0]; // Red
  }
  
  private getColorForStatus(status: string): [number, number, number] {
    switch (status) {
      case 'success': return [0, 255, 0];
      case 'running': return [0, 0, 255];
      case 'error': return [255, 0, 0];
      default: return [128, 128, 128];
    }
  }
  
  /**
   * Save visualization to file
   */
  saveVisualization(state: SwarmState, outputPath: string): void {
    const config = this.generateVisualizationConfig(state);
    fs.writeFileSync(outputPath, config, 'utf-8');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const viz = new DeckGLVisualization();
  
  // Sample swarm state
  const sampleState: SwarmState = {
    queen: {
      state: { aggregate: 'active' },
      metrics: { aggregate: 85, performance: 90 }
    },
    specialists: [
      {
        id: 'coder-1',
        roam: { status: 'active' },
        metrics: { performance: 88 },
        position: [0, 0, 0]
      }
    ],
    memory: [],
    execution: []
  };
  
  const outputPath = path.join(process.cwd(), 'tooling/visualizations/swarm-viz.ts');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  viz.saveVisualization(sampleState, outputPath);
  console.log(`Visualization saved to ${outputPath}`);
}

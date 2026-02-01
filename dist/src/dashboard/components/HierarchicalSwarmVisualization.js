import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// @ts-nocheck
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
import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, TextLayer, PathLayer, ColumnLayer } from '@deck.gl/layers';
import { OrbitView, COORDINATE_SYSTEM } from '@deck.gl/core';
const COLORS = {
    queen: [255, 215, 0, 255], // Gold
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
export default function HierarchicalSwarmVisualization({ apiEndpoint, refreshInterval = 1000, showLayers = { queen: true, agents: true, memory: true, execution: true } }) {
    const [viewState, setViewState] = useState({
        target: [0, 0, 0],
        rotationX: 30,
        rotationOrbit: 45,
        zoom: 1,
        minZoom: -3,
        maxZoom: 8
    });
    const [queenState, setQueenState] = useState(null);
    const [agents, setAgents] = useState([]);
    const [memoryConnections, setMemoryConnections] = useState([]);
    const [executionEvents, setExecutionEvents] = useState([]);
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
            }
            catch (error) {
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
            const eventData = JSON.parse(event.data);
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
        if (!queenState)
            return agents;
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
                ]
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
    return (_jsxs("div", { style: { position: 'relative', width: '100%', height: '800px', backgroundColor: '#0a0a0f' }, children: [_jsx(DeckGL, { views: new OrbitView(), viewState: viewState, onViewStateChange: ({ viewState }) => setViewState(viewState), controller: true, layers: layers, parameters: {
                    clearColor: [0.04, 0.04, 0.06, 1]
                } }), _jsxs("div", { style: {
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
                }, children: [_jsx("div", { style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#ffd700' }, children: "\u25C6 HIERARCHICAL-MESH SWARM" }), queenState && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #333' }, children: [_jsxs("div", { children: ["Queen Health: ", _jsxs("span", { style: { color: queenState.health > 70 ? '#00ff88' : '#ff6644' }, children: [queenState.health, "%"] })] }), _jsxs("div", { children: ["HNSW: ", _jsx("span", { style: { color: queenState.hnswEnabled ? '#00ffff' : '#666' }, children: queenState.hnswEnabled ? 'ACTIVE' : 'INACTIVE' })] }), _jsxs("div", { children: ["Coherence: ", (queenState.swarmCoherence * 100).toFixed(1), "%"] }), _jsxs("div", { children: ["WSJF: ", queenState.wsjfScore.toFixed(2)] })] }), _jsxs("div", { style: { marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #333' }, children: [_jsxs("div", { children: ["Agents: ", queenState.totalAgents] }), _jsxs("div", { children: ["Active: ", agents.filter(a => a.status === 'active').length] }), _jsxs("div", { children: ["Tasks: ", queenState.tasksCompleted] })] })] })), _jsxs("div", { children: [_jsxs("div", { children: ["Memory Arcs: ", memoryConnections.length] }), _jsxs("div", { children: ["Events: ", executionEvents.length] }), _jsxs("div", { children: ["Streaming: ", _jsx("span", { style: { color: isStreaming ? '#00ff88' : '#ff6644' }, children: isStreaming ? '●' : '○' })] })] })] }), _jsxs("div", { style: {
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    padding: '15px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }, children: [_jsx("div", { style: { fontWeight: 'bold', marginBottom: '10px' }, children: "Layers" }), _jsx("div", { children: "\uD83D\uDFE1 Layer 1: Queen" }), _jsx("div", { children: "\uD83D\uDD35 Layer 2: Agents" }), _jsx("div", { children: "\uD83D\uDFE2 Layer 3: Memory" }), _jsx("div", { children: "\u26AA Layer 4: Execution" })] }), _jsxs("div", { style: {
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    padding: '10px',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                }, children: ["Endpoint: ", apiEndpoint] })] }));
}
// Factory function to create visualization with real endpoints
export function createProductionVisualization(deployment) {
    const endpoints = {
        starlingx: 'https://swarm.stx.rooz.live',
        cpanel: 'https://swarm.cpanel.rooz.live',
        localhost: 'http://localhost:3000'
    };
    return (_jsx(HierarchicalSwarmVisualization, { apiEndpoint: endpoints[deployment], refreshInterval: 1000 }));
}
//# sourceMappingURL=HierarchicalSwarmVisualization.js.map
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
// @ts-expect-error - Type incompatibility requires refactoring
import { HexagonLayer, ScatterplotLayer, ArcLayer, PointCloudLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Swarm Visualization Dashboard with Deck.gl
 * 
 * 4-Layer Architecture:
 * - Layer 1 (Queen): Aggregate swarm state (HexagonLayer)
 * - Layer 2 (Agents): ROAM metrics (ScatterplotLayer 3D)
 * - Layer 3 (Memory): Vector search connections (ArcLayer)
 * - Layer 4 (Execution): Real-time streaming (PointCloudLayer)
 * 
 * WSJF Auto-selection based on MCP/MPP factors
 */

interface QueenState {
    position: [number, number, number];
    health: number;
    tasksCompleted: number;
    totalAgents: number;
    swarmCoherence: number;
    hnswEnabled: boolean;
    wsjfScore: number;
}

interface Agent {
    id: string;
    name: string;
    type: string;
    position: [number, number, number];
    roam: {
        resolved: number;
        owned: number;
        accepted: number;
        mitigated: number;
    };
    status: string;
    taskLoad: number;
    mymScore: {
        manthra: number;
        yasna: number;
        mithra: number;
    };
}

interface MemoryConnection {
    source: [number, number, number];
    target: [number, number, number];
    strength: number;
    type: string;
    latency: number;
}

interface ExecutionEvent {
    timestamp: number;
    agentId: string;
    position: [number, number, number];
    eventType: string;
    intensity: number;
}

interface WsjfItem {
    id: string;
    title: string;
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    wsjfScore: number;
    mcpFactor: number;
    mppFactor: number;
    selected: boolean;
    type: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const WS_URL = API_BASE_URL.replace('http', 'ws');

export const SwarmDashboard: React.FC = () => {
    const [queenState, setQueenState] = useState<QueenState | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [memoryConnections, setMemoryConnections] = useState<MemoryConnection[]>([]);
    const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([]);
    const [wsjfItems, setWsjfItems] = useState<WsjfItem[]>([]);
    const [viewState, setViewState] = useState({
        longitude: 0,
        latitude: 0,
        zoom: 0.5,
        pitch: 45,
        bearing: 0,
        minZoom: 0,
        maxZoom: 20
    });

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [queenRes, agentsRes, memoryRes, wsjfRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/swarm/queen`),
                    fetch(`${API_BASE_URL}/api/swarm/agents`),
                    fetch(`${API_BASE_URL}/api/swarm/memory`),
                    fetch(`${API_BASE_URL}/api/wsjf/items`)
                ]);

                const [queen, agentList, memory, wsjf] = await Promise.all([
                    queenRes.json(),
                    agentsRes.json(),
                    memoryRes.json(),
                    wsjfRes.json()
                ]);

                setQueenState(queen);
                setAgents(agentList);
                setMemoryConnections(memory);
                setWsjfItems(wsjf);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5s

        return () => clearInterval(interval);
    }, []);

    // WebSocket for real-time execution events
    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/ws/execution`);

        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type !== 'connected') {
                    setExecutionEvents(prev => [...prev.slice(-100), data]);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    // Layer 1: Queen State Visualization
    const queenLayer = queenState ? new ScatterplotLayer({
        id: 'queen-layer',
        data: [queenState],
        getPosition: (d: QueenState) => d.position,
        getRadius: 8000,
        getFillColor: d => {
            const health = d.health;
            if (health >= 80) return [0, 255, 0, 220]; // Green
            if (health >= 60) return [255, 215, 0, 220]; // Gold
            if (health >= 40) return [255, 165, 0, 220]; // Orange
            return [255, 0, 0, 220]; // Red
        },
        radiusScale: 1,
        radiusMinPixels: 30,
        radiusMaxPixels: 80,
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 2,
        getLineColor: [255, 255, 255, 200]
    }) : null;

    // Layer 2: Agent ROAM Metrics (3D Scatterplot)
    const agentsLayer = new ScatterplotLayer({
        id: 'agents-layer',
        data: agents,
        getPosition: (d: Agent) => {
            // Calculate position based on agent type and metrics
            const index = agents.indexOf(d);
            const angle = (index / agents.length) * Math.PI * 2;
            const radius = 40;
            
            // Height based on MYM score
            const mymHeight = d.mymScore
                ? (d.mymScore.manthra + d.mymScore.yasna + d.mymScore.mithra) * 10
                : 5;
            
            return [
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                mymHeight
            ];
        },
        getRadius: (d: Agent) => {
            // Size based on task load
            return Math.max(1000, d.taskLoad * 2000 + 1000);
        },
        getFillColor: (d: Agent) => {
            // Color based on status
            const statusColors: Record<string, [number, number, number, number]> = {
                'active': [0, 255, 0, 220],
                'busy': [255, 165, 0, 220],
                'idle': [128, 128, 128, 180],
                'error': [255, 0, 0, 220]
            };
            return statusColors[d.status] || [128, 128, 128, 180];
        },
        pickable: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 40,
        stroked: true,
        lineWidthMinPixels: 1,
        getLineColor: [255, 255, 255, 150]
    });

    // Layer 3: Memory Connections (ArcLayer)
    const memoryLayer = new ArcLayer({
        id: 'memory-layer',
        data: memoryConnections,
        getSourcePosition: (d: MemoryConnection) => d.source,
        getTargetPosition: (d: MemoryConnection) => d.target,
        getSourceColor: (d: MemoryConnection) => {
            // Color by connection type
            const typeColors: Record<string, [number, number, number, number]> = {
                'hnsw': [0, 128, 255, 150],
                'semantic': [128, 0, 255, 150],
                'pattern': [255, 128, 0, 150]
            };
            return typeColors[d.type] || [128, 128, 128, 150];
        },
        getTargetColor: [255, 255, 255, 100],
        getWidth: (d: MemoryConnection) => d.strength * 8,
        pickable: true,
        getTilt: 0,
        getHeight: 0.3
    });

    // Layer 4: Execution Events (PointCloudLayer for real-time streaming)
    const executionLayer = new PointCloudLayer({
        id: 'execution-layer',
        data: executionEvents,
        getPosition: (d: ExecutionEvent) => d.position,
        getNormal: [0, 0, 1],
        getColor: (d: ExecutionEvent) => {
            const eventColors: Record<string, [number, number, number, number]> = {
                'task_start': [0, 255, 0, 255],
                'task_complete': [0, 128, 255, 255],
                'decision': [255, 255, 0, 255],
                'coordination': [255, 128, 255, 255]
            };
            return eventColors[d.eventType] || [255, 255, 255, 255];
        },
        pointSize: 4,
        pickable: true,
        opacity: 0.8
    });

    const layers = [queenLayer, agentsLayer, memoryLayer, executionLayer].filter(Boolean);

    // Tooltip
    const getTooltip = useCallback(({ object }: any) => {
        if (!object) return null;

        if (object.health !== undefined) {
            // Queen state
            return {
                html: `
                    <div class="deck-tooltip">
                        <strong>Swarm Queen</strong><br/>
                        Health: ${object.health}%<br/>
                        Tasks Completed: ${object.tasksCompleted}<br/>
                        Total Agents: ${object.totalAgents}<br/>
                        Coherence: ${(object.swarmCoherence * 100).toFixed(1)}%<br/>
                        HNSW: ${object.hnswEnabled ? '✅' : '❌'}<br/>
                        WSJF Score: ${object.wsjfScore.toFixed(2)}
                    </div>
                `,
                style: {
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #00ff00',
                    fontSize: '14px',
                    maxWidth: '300px'
                }
            };
        } else if (object.roam) {
            // Agent
            return {
                html: `
                    <div class="deck-tooltip">
                        <strong>${object.name}</strong> (${object.type})<br/>
                        Status: ${object.status}<br/>
                        Task Load: ${(object.taskLoad * 100).toFixed(0)}%<br/>
                        <br/>
                        <strong>ROAM Metrics:</strong><br/>
                        Resolved: ${object.roam.resolved}<br/>
                        Owned: ${object.roam.owned}<br/>
                        Accepted: ${object.roam.accepted}<br/>
                        Mitigated: ${object.roam.mitigated}<br/>
                        <br/>
                        <strong>MYM Scores:</strong><br/>
                        Manthra: ${(object.mymScore.manthra * 100).toFixed(0)}%<br/>
                        Yasna: ${(object.mymScore.yasna * 100).toFixed(0)}%<br/>
                        Mithra: ${(object.mymScore.mithra * 100).toFixed(0)}%
                    </div>
                `,
                style: {
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #ffaa00',
                    fontSize: '14px',
                    maxWidth: '300px'
                }
            };
        } else if (object.eventType) {
            // Execution event
            return {
                html: `
                    <div class="deck-tooltip">
                        <strong>Event: ${object.eventType}</strong><br/>
                        Agent: ${object.agentId}<br/>
                        Time: ${new Date(object.timestamp).toLocaleTimeString()}<br/>
                        Intensity: ${(object.intensity * 100).toFixed(0)}%
                    </div>
                `,
                style: {
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #00aaff',
                    fontSize: '14px',
                    maxWidth: '300px'
                }
            };
        } else if (object.strength !== undefined) {
            // Memory connection
            return {
                html: `
                    <div class="deck-tooltip">
                        <strong>Memory Connection</strong><br/>
                        Type: ${object.type}<br/>
                        Strength: ${(object.strength * 100).toFixed(0)}%<br/>
                        Latency: ${object.latency.toFixed(2)}ms
                    </div>
                `,
                style: {
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #aa00ff',
                    fontSize: '14px',
                    maxWidth: '300px'
                }
            };
        }

        return null;
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as any)}
                controller={true}
                layers={layers}
                getTooltip={getTooltip}
            >
                <Map
                    mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    attributionControl={false}
                />
            </DeckGL>

            {/* Overlay UI */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #00ff00',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '14px',
                maxWidth: '350px',
                backdropFilter: 'blur(10px)'
            }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
                    🎯 YOLIFE Swarm Monitor
                </h2>
                
                {queenState && (
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Queen Health</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: queenState.health >= 80 ? '#00ff00' : '#ffaa00' }}>
                            {queenState.health}%
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>
                            {queenState.totalAgents} agents • {queenState.tasksCompleted} tasks completed
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '20px', fontSize: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>🔵 Layer 1:</strong> Queen State
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>🟢 Layer 2:</strong> {agents.length} Agents (ROAM)
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>🟣 Layer 3:</strong> {memoryConnections.length} Connections
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>🔴 Layer 4:</strong> {executionEvents.length} Events
                    </div>
                </div>

                {wsjfItems.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ fontSize: '12px', marginBottom: '10px', opacity: 0.8 }}>
                            <strong>WSJF Auto-Selection</strong>
                        </div>
                        {wsjfItems.filter(item => item.selected).map(item => (
                            <div key={item.id} style={{ fontSize: '11px', marginBottom: '6px' }}>
                                <div>{item.title}</div>
                                <div style={{ opacity: 0.6 }}>
                                    Score: {item.wsjfScore.toFixed(1)} • 
                                    MCP: {item.mcpFactor.toFixed(2)} • 
                                    MPP: {item.mppFactor.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: '15px',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '11px',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Status Colors</div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#00ff00', marginRight: '8px', borderRadius: '2px' }} />
                    Active / Healthy
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ffaa00', marginRight: '8px', borderRadius: '2px' }} />
                    Busy / Warning
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#808080', marginRight: '8px', borderRadius: '2px' }} />
                    Idle
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ff0000', marginRight: '8px', borderRadius: '2px' }} />
                    Error
                </div>
            </div>
        </div>
    );
};

export default SwarmDashboard;

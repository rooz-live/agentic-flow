import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
/**
 * 4-Layer Deck.gl Swarm Visualization with WSJF Auto-Selection
 *
 * Layer Architecture:
 * - Layer 1 (Queen): Aggregate swarm state visualization
 * - Layer 2 (Specialists): Agent ROAM metrics as 3D points
 * - Layer 3 (Memory): Vector search results as arc connections
 * - Layer 4 (Execution): Real-time WebGL streaming updates
 *
 * WSJF Auto-Selection: Chooses optimal visualization based on:
 * - Data volume (MCP factors)
 * - Interaction requirements (MPP)
 * - Performance constraints
 * - User context
 */
import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, HeatmapLayer, PointCloudLayer } from '@deck.gl/layers';
// @ts-expect-error - Type incompatibility requires refactoring
import { Map } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
function calculateWSJF(factors) {
    const options = [
        {
            name: 'deck.gl',
            costOfDelay: (factors.dataVolume * 0.4 + factors.performanceRequired * 0.6),
            jobSize: 3 // Low implementation cost, React-friendly
        },
        {
            name: 'three.js',
            costOfDelay: (factors.interactionNeed * 0.5 + factors.userSkillLevel * 0.5),
            jobSize: 5 // Medium implementation cost, more control
        },
        {
            name: 'babylon.js',
            costOfDelay: (factors.interactionNeed * 0.7 + factors.performanceRequired * 0.3),
            jobSize: 6 // Medium-high cost, game engine features
        },
        {
            name: 'cesium',
            costOfDelay: (factors.dataVolume * 0.8 + factors.performanceRequired * 0.2),
            jobSize: 7 // High cost, best for geospatial
        },
        {
            name: 'webgpu',
            costOfDelay: (factors.performanceRequired * 0.9 + factors.dataVolume * 0.1),
            jobSize: 9 // Very high cost, cutting edge
        }
    ];
    // Calculate WSJF = Cost of Delay / Job Size
    options.forEach(opt => {
        opt.wsjfScore = opt.costOfDelay / opt.jobSize;
    });
    // Select highest WSJF score
    const selected = options.reduce((best, current) => (current.wsjfScore > best.wsjfScore) ? current : best);
    console.log('🎯 WSJF Visualization Selection:', selected.name, `(score: ${selected.wsjfScore.toFixed(2)})`);
    return selected;
}
function createQueenLayer(swarmState) {
    const data = [{
            position: swarmState.position,
            size: 50 + swarmState.totalAgents * 5,
            color: [
                Math.min(255, 100 + swarmState.avgROAM * 2.55), // R increases with ROAM
                Math.min(255, 200), // G constant
                Math.min(255, 100 + swarmState.activeQueries * 25), // B increases with activity
                200
            ]
        }];
    return new ScatterplotLayer({
        id: 'queen-layer',
        data,
        pickable: true,
        opacity: 0.8,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 20,
        radiusMaxPixels: 100,
        lineWidthMinPixels: 2,
        getPosition: d => d.position,
        getRadius: d => d.size,
        getFillColor: d => d.color,
        getLineColor: [255, 255, 255, 100],
        onHover: info => console.log('Queen State:', info.object)
    });
}
function createSpecialistsLayer(agents) {
    return new PointCloudLayer({
        id: 'specialists-layer',
        data: agents,
        pickable: true,
        coordinateSystem: 1, // COORDINATE_SYSTEM.IDENTITY
        pointSize: 5,
        getPosition: d => d.position,
        getColor: d => {
            // Color by role
            const roleColors = {
                analyzer: [66, 135, 245], // Blue
                executor: [76, 175, 80], // Green
                validator: [255, 152, 0], // Orange
                coordinator: [156, 39, 176] // Purple
            };
            const base = roleColors[d.role];
            const alpha = Math.floor(d.roamScore * 2.55); // 0-100 -> 0-255
            return [...base, alpha];
        },
        onHover: info => {
            if (info.object) {
                console.log('Agent:', info.object.id, `ROAM: ${info.object.roamScore}`, `Role: ${info.object.role}`);
            }
        }
    });
}
function createMemoryLayer(connections) {
    return new ArcLayer({
        id: 'memory-layer',
        data: connections,
        pickable: true,
        getWidth: d => d.similarity * 5,
        getSourcePosition: d => d.source,
        getTargetPosition: d => d.target,
        getSourceColor: [100, 200, 255, 180],
        getTargetColor: d => [
            255,
            Math.floor(d.similarity * 255),
            100,
            Math.floor(d.similarity * 255)
        ],
        onHover: info => {
            if (info.object) {
                console.log('Vector Connection:', `Similarity: ${(info.object.similarity * 100).toFixed(1)}%`, `Query: ${info.object.queryId}`);
            }
        }
    });
}
function createExecutionLayer(events) {
    return new HeatmapLayer({
        id: 'execution-layer',
        data: events,
        getPosition: d => d.position,
        getWeight: d => d.weight,
        radiusPixels: 50,
        intensity: 1,
        threshold: 0.03,
        colorRange: [
            [0, 25, 76, 120], // Dark blue (low activity)
            [0, 152, 255, 150], // Blue
            [76, 175, 80, 180], // Green
            [255, 235, 59, 200], // Yellow
            [255, 152, 0, 220], // Orange
            [244, 67, 54, 255] // Red (high activity)
        ]
    });
}
const SwarmDeckGL = ({ wsjfFactors = {
    dataVolume: 8,
    interactionNeed: 7,
    performanceRequired: 9,
    userSkillLevel: 6
}, viewState: initialViewState, mapStyle = 'mapbox://styles/mapbox/dark-v11' }) => {
    // WSJF Auto-selection
    const selectedViz = useMemo(() => calculateWSJF(wsjfFactors), [wsjfFactors]);
    // View state
    const [viewState, setViewState] = useState(initialViewState || {
        longitude: -122.4,
        latitude: 37.8,
        zoom: 12,
        pitch: 60,
        bearing: 0
    });
    // Mock data - replace with real swarm data
    const [swarmState, setSwarmState] = useState({
        totalAgents: 8,
        activeQueries: 12,
        avgROAM: 65,
        vectorSearchRate: 150,
        position: [-122.4, 37.8, 100]
    });
    const [agents, setAgents] = useState([
        {
            id: 'agent-001',
            position: [-122.41, 37.81, 50],
            roamScore: 75,
            mantraScore: 80,
            yasnaScore: 70,
            mithraScore: 75,
            role: 'analyzer'
        },
        {
            id: 'agent-002',
            position: [-122.39, 37.79, 50],
            roamScore: 82,
            mantraScore: 85,
            yasnaScore: 78,
            mithraScore: 83,
            role: 'executor'
        },
        // Add more agents as needed
    ]);
    const [connections, setConnections] = useState([
        {
            source: [-122.41, 37.81, 50],
            target: [-122.39, 37.79, 50],
            similarity: 0.87,
            queryId: 'query-001'
        }
    ]);
    const [events, setEvents] = useState([]);
    // Real-time event generation
    useEffect(() => {
        const interval = setInterval(() => {
            const newEvent = {
                position: [
                    -122.4 + (Math.random() - 0.5) * 0.1,
                    37.8 + (Math.random() - 0.5) * 0.1
                ],
                weight: Math.random() * 10,
                timestamp: Date.now()
            };
            setEvents(prev => [...prev.slice(-100), newEvent]); // Keep last 100 events
        }, 500);
        return () => clearInterval(interval);
    }, []);
    // Create layers
    const layers = [
        createExecutionLayer(events),
        createMemoryLayer(connections),
        createSpecialistsLayer(agents),
        createQueenLayer(swarmState)
    ];
    // Show fallback if not deck.gl
    if (selectedViz.name !== 'deck.gl') {
        return (_jsxs("div", { style: { padding: 20, textAlign: 'center' }, children: [_jsxs("h2", { children: ["\uD83C\uDFAF WSJF Selected: ", selectedViz.name] }), _jsxs("p", { children: ["WSJF Score: ", selectedViz.wsjfScore.toFixed(2)] }), _jsxs("p", { children: ["Redirecting to ", selectedViz.name, " implementation..."] }), _jsxs("p", { style: { fontSize: 12, marginTop: 20 }, children: ["Factors: Volume=", wsjfFactors.dataVolume, ", Interaction=", wsjfFactors.interactionNeed, ", Performance=", wsjfFactors.performanceRequired, ", Skill=", wsjfFactors.userSkillLevel] })] }));
    }
    return (_jsxs("div", { style: { width: '100%', height: '100vh', position: 'relative' }, children: [_jsx(DeckGL, { viewState: viewState, onViewStateChange: ({ viewState }) => setViewState(viewState), controller: true, layers: layers, getTooltip: ({ object }) => object && JSON.stringify(object, null, 2), children: _jsx(Map, { mapStyle: mapStyle, mapboxAccessToken: process.env.REACT_APP_MAPBOX_TOKEN || '' }) }), _jsxs("div", { style: {
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: 15,
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 12
                }, children: [_jsxs("div", { children: [_jsx("strong", { children: "\uD83D\uDC51 Queen Layer:" }), " ", swarmState.totalAgents, " agents, ROAM ", swarmState.avgROAM] }), _jsxs("div", { children: [_jsx("strong", { children: "\uD83C\uDFAF Specialists:" }), " ", agents.length, " active"] }), _jsxs("div", { children: [_jsx("strong", { children: "\uD83E\uDDE0 Memory:" }), " ", connections.length, " vector connections"] }), _jsxs("div", { children: [_jsx("strong", { children: "\u26A1 Execution:" }), " ", events.length, " recent events"] }), _jsxs("div", { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #444' }, children: [_jsx("strong", { children: "WSJF:" }), " ", selectedViz.name, " (score: ", selectedViz.wsjfScore.toFixed(2), ")"] })] })] }));
};
export default SwarmDeckGL;
export { calculateWSJF };
//# sourceMappingURL=swarm-deckgl-4layer.js.map
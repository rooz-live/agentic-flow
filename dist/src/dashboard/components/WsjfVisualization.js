import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * WSJF (Weighted Shortest Job First) 3D Visualization
 *
 * Uses Deck.gl for GPU-powered rendering of:
 * - MCP (Model Context Protocol) factors
 * - MPP (Method Pattern Protocol) factors
 * - WSJF scores with auto-selection
 * - Hierarchical-mesh topology overlay
 * - Real-time priority heatmap
 */
import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ColumnLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import { OrbitView, COORDINATE_SYSTEM } from '@deck.gl/core';
const COLORS = {
    feature: [0, 150, 255, 200],
    bug: [255, 70, 70, 200],
    'tech-debt': [255, 200, 50, 200],
    spike: [150, 100, 255, 200],
    selected: [0, 255, 150, 255],
    mesh: [100, 100, 100, 100]
};
function calculateWsjf(bv, tc, rr, size) {
    return (bv + tc + rr) / Math.max(size, 1);
}
function generatePositions(items) {
    return items.map((item, idx) => {
        // Position based on WSJF factors
        // X-axis: Business Value + Time Criticality
        const x = (item.businessValue + item.timeCriticality) * 5 - 50;
        // Y-axis: Risk Reduction
        const y = item.riskReduction * 10 - 50;
        // Z-axis: WSJF Score (height)
        const z = item.wsjfScore * 5;
        return {
            ...item,
            position: [x, y, z]
        };
    });
}
function createMeshTopology(items) {
    const paths = [];
    // Create hierarchical connections between high-WSJF items
    const sorted = [...items].sort((a, b) => b.wsjfScore - a.wsjfScore);
    for (let i = 0; i < Math.min(sorted.length - 1, 10); i++) {
        for (let j = i + 1; j < Math.min(sorted.length, 10); j++) {
            paths.push({
                path: [
                    sorted[i].position,
                    sorted[j].position
                ],
                color: COLORS.mesh
            });
        }
    }
    return paths;
}
export default function WsjfVisualization({ items, onItemSelect, autoSelectTop = 5, showMeshTopology = true }) {
    const [viewState, setViewState] = useState({
        target: [0, 0, 0],
        rotationX: 45,
        rotationOrbit: 30,
        zoom: 0,
        minZoom: -5,
        maxZoom: 5
    });
    const [hoveredItem, setHoveredItem] = useState(null);
    // Calculate WSJF scores and positions
    const processedItems = useMemo(() => {
        const withScores = items.map(item => ({
            ...item,
            wsjfScore: item.wsjfScore || calculateWsjf(item.businessValue, item.timeCriticality, item.riskReduction, item.jobSize)
        }));
        // Auto-select top N items
        const sorted = [...withScores].sort((a, b) => b.wsjfScore - a.wsjfScore);
        const topIds = new Set(sorted.slice(0, autoSelectTop).map(i => i.id));
        return generatePositions(withScores.map(item => ({
            ...item,
            selected: topIds.has(item.id)
        })));
    }, [items, autoSelectTop]);
    // Generate mesh topology
    const meshPaths = useMemo(() => {
        return showMeshTopology ? createMeshTopology(processedItems) : [];
    }, [processedItems, showMeshTopology]);
    // Layers
    const layers = [
        // Mesh topology connections
        new PathLayer({
            id: 'mesh-topology',
            data: meshPaths,
            getPath: d => d.path,
            getColor: d => d.color,
            getWidth: 2,
            widthMinPixels: 1,
            pickable: false,
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
        }),
        // WSJF columns (height = score)
        new ColumnLayer({
            id: 'wsjf-columns',
            data: processedItems,
            diskResolution: 20,
            radius: 3,
            extruded: true,
            getPosition: d => d.position,
            getFillColor: d => d.selected ? COLORS.selected : COLORS[d.type],
            getLineColor: [255, 255, 255, 100],
            getElevation: d => d.wsjfScore * 5,
            elevationScale: 1,
            pickable: true,
            onHover: info => setHoveredItem(info.object?.id || null),
            onClick: info => info.object && onItemSelect?.(info.object),
            updateTriggers: {
                getFillColor: [processedItems]
            },
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
        }),
        // MCP/MPP factor indicators (small spheres)
        new ScatterplotLayer({
            id: 'mcp-mpp-factors',
            data: processedItems.filter(d => d.mcpFactor || d.mppFactor),
            getPosition: d => [d.position[0], d.position[1], d.position[2] + d.wsjfScore * 5 + 5],
            getRadius: 2,
            getFillColor: d => [
                Math.round((d.mcpFactor || 0) * 255),
                Math.round((d.mppFactor || 0) * 255),
                150,
                200
            ],
            pickable: true,
            radiusMinPixels: 2,
            radiusMaxPixels: 10,
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
        }),
        // Labels for top items
        new TextLayer({
            id: 'wsjf-labels',
            data: processedItems.filter(d => d.selected || d.id === hoveredItem),
            getPosition: d => [d.position[0], d.position[1], d.position[2] + d.wsjfScore * 5 + 8],
            getText: d => `${d.title}\nWSJF: ${d.wsjfScore.toFixed(2)}`,
            getSize: 16,
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
    ];
    return (_jsxs("div", { style: { position: 'relative', width: '100%', height: '600px' }, children: [_jsx(DeckGL, { views: new OrbitView(), viewState: viewState, onViewStateChange: ({ viewState }) => setViewState(viewState), controller: true, layers: layers, parameters: {
                    clearColor: [0.1, 0.1, 0.15, 1]
                } }), _jsxs("div", { style: {
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '15px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }, children: [_jsx("div", { style: { fontWeight: 'bold', marginBottom: '10px' }, children: "WSJF Visualization" }), _jsx("div", { children: "\uD83D\uDD35 Feature" }), _jsx("div", { children: "\uD83D\uDD34 Bug" }), _jsx("div", { children: "\uD83D\uDFE1 Tech Debt" }), _jsx("div", { children: "\uD83D\uDFE3 Spike" }), _jsxs("div", { children: ["\uD83D\uDFE2 Auto-Selected (Top ", autoSelectTop, ")"] }), _jsxs("div", { style: { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }, children: [_jsx("div", { children: "Height = WSJF Score" }), _jsx("div", { children: "X = Value + Criticality" }), _jsx("div", { children: "Y = Risk Reduction" })] })] }), _jsxs("div", { style: {
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '15px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }, children: [_jsxs("div", { children: ["Total Items: ", processedItems.length] }), _jsxs("div", { children: ["Auto-Selected: ", processedItems.filter(i => i.selected).length] }), _jsxs("div", { children: ["Avg WSJF: ", (processedItems.reduce((sum, i) => sum + i.wsjfScore, 0) / processedItems.length).toFixed(2)] }), _jsxs("div", { children: ["Max WSJF: ", Math.max(...processedItems.map(i => i.wsjfScore)).toFixed(2)] })] })] }));
}
// Example usage data generator
export function generateSampleWsjfData() {
    const types = ['feature', 'bug', 'tech-debt', 'spike'];
    const titles = [
        'Flash Attention Implementation',
        'HNSW Vector Indexing',
        'Background Workers',
        'TypeScript Error Fixes',
        'AISP Integration',
        'QE Fleet Setup',
        'Yolife Deployment',
        'Test Coverage 80%',
        'Deck.gl Visualization',
        'ROAM Audit Script'
    ];
    return titles.map((title, idx) => ({
        id: `wsjf-${idx}`,
        title,
        businessValue: Math.floor(Math.random() * 8) + 3,
        timeCriticality: Math.floor(Math.random() * 8) + 3,
        riskReduction: Math.floor(Math.random() * 8) + 3,
        jobSize: Math.floor(Math.random() * 7) + 2,
        wsjfScore: 0, // Will be calculated
        position: [0, 0, 0],
        mcpFactor: Math.random() * 0.5 + 0.5,
        mppFactor: Math.random() * 0.5 + 0.5,
        selected: false,
        type: types[idx % types.length]
    }));
}
//# sourceMappingURL=WsjfVisualization.js.map
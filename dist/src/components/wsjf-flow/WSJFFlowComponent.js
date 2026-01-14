import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ReactFlow Component for WSJF Workflow Visualization
 * Modern UI with HeroUI styling patterns
 */
import { useCallback, useMemo } from 'react';
import ReactFlow, { Controls, Background, MiniMap, useNodesState, useEdgesState, addEdge, BackgroundVariant, Panel, } from 'reactflow';
import 'reactflow/dist/style.css';
import { flowConfigs, NODE_COLORS, } from './WSJFFlowConfig';
// Custom Node Components
const WSJFNode = ({ data }) => {
    const bgColor = data.wsjfScore
        ? data.wsjfScore > 7 ? NODE_COLORS.wsjf.high
            : data.wsjfScore > 4 ? NODE_COLORS.wsjf.medium
                : NODE_COLORS.wsjf.low
        : data.tier ? NODE_COLORS.tier[data.tier] : '#6b7280';
    return (_jsxs("div", { style: {
            padding: '12px 16px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
            border: `2px solid ${bgColor}`,
            minWidth: '140px',
            textAlign: 'center',
        }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: '4px' }, children: data.label }), data.wsjfScore !== undefined && (_jsxs("div", { style: { fontSize: '0.85em', color: bgColor }, children: ["WSJF: ", data.wsjfScore.toFixed(1)] })), data.cod !== undefined && (_jsxs("div", { style: { fontSize: '0.8em', opacity: 0.8 }, children: ["CoD: ", data.cod] })), data.status && (_jsx("div", { style: {
                    marginTop: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: NODE_COLORS.status[data.status],
                    color: 'white',
                    fontSize: '0.75em',
                }, children: data.status.replace('_', ' ') }))] }));
};
const GOAPNode = ({ data }) => {
    const bgColor = NODE_COLORS.goap[data.phase];
    return (_jsxs("div", { style: {
            padding: '12px 16px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
            border: `2px solid ${bgColor}`,
            minWidth: '160px',
        }, children: [_jsxs("div", { style: {
                    fontWeight: 600,
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }, children: [_jsx("span", { children: data.label }), _jsx("span", { style: {
                            fontSize: '0.75em',
                            padding: '2px 6px',
                            background: bgColor,
                            color: 'white',
                            borderRadius: '4px',
                        }, children: data.phase })] }), _jsxs("div", { style: { fontSize: '0.8em', opacity: 0.8 }, children: ["Cost: ", data.cost] }), data.preconditions.length > 0 && (_jsxs("div", { style: { fontSize: '0.7em', marginTop: '4px', color: '#9ca3af' }, children: ["Pre: ", data.preconditions.join(', ')] }))] }));
};
const TestingNode = ({ data }) => {
    const bgColor = NODE_COLORS.testing[data.type];
    return (_jsxs("div", { style: {
            padding: '12px 16px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}40)`,
            border: `2px solid ${bgColor}`,
            minWidth: '150px',
            textAlign: 'center',
        }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: '4px' }, children: data.label }), _jsx("div", { style: {
                    fontSize: '0.75em',
                    padding: '2px 6px',
                    background: bgColor,
                    color: 'white',
                    borderRadius: '4px',
                    display: 'inline-block',
                }, children: data.type.toUpperCase() }), data.passAtK !== undefined && (_jsxs("div", { style: { fontSize: '0.8em', marginTop: '4px' }, children: ["Pass@K: ", (data.passAtK * 100).toFixed(1), "%"] })), data.sharpeRatio !== undefined && (_jsxs("div", { style: { fontSize: '0.8em', marginTop: '2px' }, children: ["Sharpe: ", data.sharpeRatio.toFixed(2)] })), data.entropy !== undefined && (_jsxs("div", { style: { fontSize: '0.8em', marginTop: '2px' }, children: ["Entropy: ", data.entropy.toFixed(2)] }))] }));
};
export const WSJFFlowComponent = ({ flowType = 'wsjf', onNodeClick, onEdgeClick, }) => {
    const config = flowConfigs[flowType];
    // Use type assertion to handle the union type
    const [nodes, setNodes, onNodesChange] = useNodesState(config.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(config.edges);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
    const nodeTypes = useMemo(() => ({
        wsjf: WSJFNode,
        goap: GOAPNode,
        testing: TestingNode,
    }), []);
    const minimapStyle = {
        height: 100,
        backgroundColor: '#1a1a2e',
    };
    return (_jsx("div", { style: { width: '100%', height: '600px', background: '#0f0f1a' }, children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: (_, node) => onNodeClick?.(node), onEdgeClick: (_, edge) => onEdgeClick?.(edge), fitView: true, attributionPosition: "bottom-left", children: [_jsx(Controls, {}), _jsx(MiniMap, { style: minimapStyle, zoomable: true, pannable: true }), _jsx(Background, { variant: BackgroundVariant.Dots, gap: 16, size: 1, color: "#333" }), _jsx(Panel, { position: "top-left", children: _jsxs("div", { style: {
                            background: 'rgba(15, 15, 26, 0.9)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                        }, children: [_jsxs("div", { style: { fontWeight: 600, marginBottom: '8px', color: '#fff' }, children: [flowType === 'wsjf' && '📊 WSJF Prioritization Flow', flowType === 'goap' && '🎯 GOAP Planning Flow', flowType === 'testing' && '🧪 SFT + RL Testing Flow'] }), _jsxs("div", { style: { fontSize: '0.85em', color: '#9ca3af' }, children: [flowType === 'wsjf' && 'CoD = UBV + TC + RR | WSJF = CoD / Size', flowType === 'goap' && '5 Phases: Foundation → Emergence', flowType === 'testing' && 'Spectrum Phase → Signal Phase → MGPO'] })] }) }), _jsx(Panel, { position: "top-right", children: _jsx("div", { style: {
                            background: 'rgba(15, 15, 26, 0.9)',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            display: 'flex',
                            gap: '4px',
                        }, children: ['wsjf', 'goap', 'testing'].map((type) => (_jsx("button", { onClick: () => {
                                const newConfig = flowConfigs[type];
                                setNodes(newConfig.nodes);
                                setEdges(newConfig.edges);
                            }, style: {
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: flowType === type ? '2px solid #3b82f6' : '1px solid #444',
                                background: flowType === type ? '#3b82f620' : 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                            }, children: type.toUpperCase() }, type))) }) })] }) }));
};
export default WSJFFlowComponent;
//# sourceMappingURL=WSJFFlowComponent.js.map
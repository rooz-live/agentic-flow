import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ReactFlow, { Background, Controls, MiniMap, } from 'reactflow';
import 'reactflow/dist/style.css';
const wsjfNodes = [
    {
        id: '1',
        data: { label: '📊 WSJF Calculation' },
        position: { x: 0, y: 0 },
        style: { background: '#3b82f6', color: 'white', padding: 16 }
    },
    {
        id: '2',
        data: { label: '🔍 Pattern Discovery' },
        position: { x: 250, y: 0 },
        style: { background: '#10b981', color: 'white', padding: 16 }
    },
    {
        id: '3',
        data: { label: '⚠️ Risk Analytics' },
        position: { x: 500, y: 0 },
        style: { background: '#f59e0b', color: 'white', padding: 16 }
    },
    {
        id: '4',
        data: { label: '✅ Execution' },
        position: { x: 250, y: 100 },
        style: { background: '#8b5cf6', color: 'white', padding: 16 }
    },
];
const wsjfEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' },
];
export function WorkflowVisualizer({ workflowType }) {
    return (_jsx("div", { style: { width: '100%', height: '500px' }, children: _jsxs(ReactFlow, { nodes: wsjfNodes, edges: wsjfEdges, fitView: true, children: [_jsx(Background, {}), _jsx(Controls, {}), _jsx(MiniMap, {})] }) }));
}
//# sourceMappingURL=workflow-visualizer.js.map
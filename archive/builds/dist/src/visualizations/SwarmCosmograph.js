import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Cosmograph Visualization for Agent Swarm Data
 *
 * Visualizes swarm coordination data from agentic-synth-examples
 * with interactive graph showing agent relationships and metrics.
 */
import { Cosmograph, CosmographProvider } from '@cosmograph/react';
import React, { useCallback, useMemo } from 'react';
// Color mapping for agent roles
const ROLE_COLORS = {
    coordinator: '#FF6B6B', // Red
    worker: '#4ECDC4', // Teal
    analyzer: '#45B7D1', // Blue
    optimizer: '#96CEB4', // Green
};
// Status opacity mapping
const STATUS_OPACITY = {
    active: 1.0,
    idle: 0.6,
    terminated: 0.3,
};
export const SwarmCosmograph = ({ swarmData, width = 800, height = 600, showLabels = true, }) => {
    // Transform swarm data into graph nodes and links
    const { nodes, links } = useMemo(() => {
        const graphNodes = swarmData.map((agent) => ({
            id: agent.agent_id,
            ...agent,
            // Node size based on tasks completed
            size: Math.max(5, Math.min(30, agent.tasks_completed / 50)),
            // Color based on role
            color: ROLE_COLORS[agent.role] || '#999',
            // Opacity based on status
            opacity: STATUS_OPACITY[agent.status] || 0.5,
        }));
        // Create links based on coordination scores
        const graphLinks = [];
        const coordinators = graphNodes.filter(n => n.role === 'coordinator');
        const workers = graphNodes.filter(n => n.role !== 'coordinator');
        coordinators.forEach(coord => {
            workers.forEach(worker => {
                if (worker.coordination_score > 0.7) {
                    graphLinks.push({
                        source: coord.id,
                        target: worker.id,
                        weight: worker.coordination_score,
                    });
                }
            });
        });
        return { nodes: graphNodes, links: graphLinks };
    }, [swarmData]);
    // Handle node click
    const handleNodeClick = useCallback((node) => {
        console.log('Agent clicked:', node);
        alert(`Agent: ${node.agent_id}\nRole: ${node.role}\nTasks: ${node.tasks_completed}\nSuccess Rate: ${(node.success_rate * 100).toFixed(1)}%`);
    }, []);
    return (_jsx(CosmographProvider, { nodes: nodes, links: links, children: _jsxs("div", { style: { width, height, position: 'relative' }, children: [_jsx(Cosmograph, { nodeColor: (n) => n.color, nodeSize: (n) => n.size, linkWidth: (l) => l.weight * 2, linkColor: () => 'rgba(255,255,255,0.3)', showLabels: showLabels, onClick: handleNodeClick, backgroundColor: "#1a1a2e", simulationGravity: 0.3, simulationRepulsion: 1.5 }), _jsxs("div", { style: {
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                        background: 'rgba(0,0,0,0.7)',
                        padding: '10px',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                    }, children: [_jsx("div", { style: { fontWeight: 'bold', marginBottom: '8px' }, children: "Agent Roles" }), Object.entries(ROLE_COLORS).map(([role, color]) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', background: color } }), _jsx("span", { children: role })] }, role)))] }), _jsxs("div", { style: {
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.7)',
                        padding: '10px',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                    }, children: [_jsx("div", { style: { fontWeight: 'bold', marginBottom: '8px' }, children: "Swarm Stats" }), _jsxs("div", { children: ["Total Agents: ", nodes.length] }), _jsxs("div", { children: ["Active: ", nodes.filter(n => n.status === 'active').length] }), _jsxs("div", { children: ["Connections: ", links.length] }), _jsxs("div", { children: ["Total Tasks: ", nodes.reduce((sum, n) => sum + n.tasks_completed, 0)] })] })] }) }));
};
// Main component with data loading
export const SwarmVisualization = () => {
    const [swarmData, setSwarmData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        // Load swarm data from agentic-data
        fetch('./agentic-data/swarm-coordination.json')
            .then(res => res.json())
            .then(json => {
            setSwarmData(json.data);
            setLoading(false);
        })
            .catch(err => {
            console.error('Failed to load swarm data:', err);
            setLoading(false);
        });
    }, []);
    if (loading) {
        return _jsx("div", { style: { color: '#fff', padding: 20 }, children: "Loading swarm data..." });
    }
    return (_jsxs("div", { style: {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            minHeight: '100vh',
            padding: '20px',
        }, children: [_jsx("h1", { style: { color: '#fff', marginBottom: '20px' }, children: "\uD83E\uDD16 Agent Swarm Visualization" }), _jsx(SwarmCosmograph, { swarmData: swarmData, width: window.innerWidth - 40, height: window.innerHeight - 120 })] }));
};
export default SwarmVisualization;
//# sourceMappingURL=SwarmCosmograph.js.map
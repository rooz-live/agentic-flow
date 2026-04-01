/**
 * Cosmograph Visualization for Agent Swarm Data
 *
 * Visualizes swarm coordination data from agentic-synth-examples
 * with interactive graph showing agent relationships and metrics.
 */

import { Cosmograph, CosmographProvider } from '@cosmograph/react';
import React, { useCallback, useMemo } from 'react';

// Types for swarm agent data
interface AgentNode {
  id: string;
  agent_id: string;
  role: 'coordinator' | 'worker' | 'analyzer' | 'optimizer';
  status: 'active' | 'idle' | 'terminated';
  tasks_completed: number;
  success_rate: number;
  coordination_score: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

interface AgentLink {
  source: string;
  target: string;
  weight: number;
}

// Color mapping for agent roles
const ROLE_COLORS: Record<string, string> = {
  coordinator: '#FF6B6B',  // Red
  worker: '#4ECDC4',       // Teal
  analyzer: '#45B7D1',     // Blue
  optimizer: '#96CEB4',    // Green
};

// Status opacity mapping
const STATUS_OPACITY: Record<string, number> = {
  active: 1.0,
  idle: 0.6,
  terminated: 0.3,
};

interface SwarmCosmographProps {
  swarmData: AgentNode[];
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const SwarmCosmograph: React.FC<SwarmCosmographProps> = ({
  swarmData,
  width = 800,
  height = 600,
  showLabels = true,
}) => {
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
    const graphLinks: AgentLink[] = [];
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
  const handleNodeClick = useCallback((node: AgentNode) => {
    console.log('Agent clicked:', node);
    alert(`Agent: ${node.agent_id}\nRole: ${node.role}\nTasks: ${node.tasks_completed}\nSuccess Rate: ${(node.success_rate * 100).toFixed(1)}%`);
  }, []);

  return (

    <CosmographProvider nodes={nodes} links={links}>
      <div style={{ width, height, position: 'relative' }}>
        <Cosmograph
          {...{
            nodeColor: (n: any) => (n as any).color || '#999',
            nodeSize: (n: any) => (n as any).size || 5,
            linkWidth: 2,
            linkColor: 'rgba(255,255,255,0.3)',
            showLabels,
            onClick: (index: number) => {
              const node = nodes[index];
              if (node) handleNodeClick(node as any);
            },
            backgroundColor: '#1a1a2e',
            simulationGravity: 0.3,
            simulationRepulsion: 1.5,
          } as any}
        />

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Agent Roles</div>
          {Object.entries(ROLE_COLORS).map(([role, color]) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
              <span>{role}</span>
            </div>
          ))}
        </div>

        {/* Stats panel */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Swarm Stats</div>
          <div>Total Agents: {nodes.length}</div>
          <div>Active: {nodes.filter(n => n.status === 'active').length}</div>
          <div>Connections: {links.length}</div>
          <div>Total Tasks: {nodes.reduce((sum, n) => sum + n.tasks_completed, 0)}</div>
        </div>
      </div>
    </CosmographProvider>
  );
};

// Main component with data loading
export const SwarmVisualization: React.FC = () => {
  const [swarmData, setSwarmData] = React.useState<AgentNode[]>([]);
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
    return <div style={{ color: '#fff', padding: 20 }}>Loading swarm data...</div>;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>
        🤖 Agent Swarm Visualization
      </h1>
      <SwarmCosmograph
        swarmData={swarmData}
        width={window.innerWidth - 40}
        height={window.innerHeight - 120}
      />
    </div>
  );
};

export default SwarmVisualization;

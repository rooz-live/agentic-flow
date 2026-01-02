/**
 * MCP Tool Dependency Graph - P2-A: ToolOrchestra Integration
 * Implements visual dependency mapping for MCP servers
 *
 * Maps relationships between:
 * - claude-flow@alpha (SPARC methodology, swarm coordination)
 * - ruv-swarm (Multi-agent swarm orchestration)
 * - flow-nexus (Cloud features, sandbox execution)
 * - claude-flow (Primary SPARC interface)
 * - agentic-qe (Quality engineering agents)
 */
import * as fs from 'fs';
import * as path from 'path';
// P2-A: MCP Server Registry based on current configuration
export const MCP_SERVERS = [
    {
        name: 'claude-flow@alpha',
        command: 'npx claude-flow@alpha mcp start',
        purpose: 'SPARC methodology, swarm coordination',
        capabilities: ['sparc_phases', 'swarm_init', 'task_orchestrate', 'memory_store'],
        dependencies: [],
        provides: ['sparc_coordination', 'swarm_topology', 'task_planning']
    },
    {
        name: 'ruv-swarm',
        command: 'npx ruv-swarm mcp start',
        purpose: 'Multi-agent swarm orchestration',
        capabilities: ['agent_spawn', 'swarm_scale', 'consensus_build'],
        dependencies: ['claude-flow@alpha'],
        provides: ['multi_agent_execution', 'parallel_tasks', 'agent_coordination']
    },
    {
        name: 'flow-nexus',
        command: 'npx flow-nexus@latest mcp start',
        purpose: 'Cloud features, sandbox execution',
        capabilities: ['sandbox_create', 'sandbox_execute', 'storage_upload', 'realtime_subscribe'],
        dependencies: [],
        provides: ['cloud_execution', 'sandboxed_code', 'cloud_storage']
    },
    {
        name: 'claude-flow',
        command: 'npx claude-flow@alpha mcp start',
        purpose: 'Primary SPARC interface',
        capabilities: ['sparc_phases', 'hooks_integration', 'session_management'],
        dependencies: ['claude-flow@alpha'],
        provides: ['sparc_workflow', 'hook_automation', 'session_context']
    },
    {
        name: 'agentic-qe',
        command: 'npx aqe-mcp',
        purpose: 'Quality engineering agents',
        capabilities: ['test_generate', 'coverage_analyze', 'quality_gate', 'flaky_detect'],
        dependencies: ['claude-flow@alpha'],
        provides: ['automated_testing', 'coverage_reports', 'quality_metrics']
    }
];
// P2-A: Dependency edges derived from server relationships
export const DEPENDENCY_EDGES = [
    { from: 'ruv-swarm', to: 'claude-flow@alpha', type: 'requires', description: 'Swarm needs SPARC coordination' },
    { from: 'claude-flow', to: 'claude-flow@alpha', type: 'requires', description: 'Primary interface wraps alpha' },
    { from: 'agentic-qe', to: 'claude-flow@alpha', type: 'requires', description: 'QE agents use SPARC phases' },
    { from: 'ruv-swarm', to: 'flow-nexus', type: 'enhances', description: 'Swarm can use cloud sandboxes' },
    { from: 'agentic-qe', to: 'ruv-swarm', type: 'optional', description: 'QE can orchestrate via swarm' },
    { from: 'flow-nexus', to: 'agentic-qe', type: 'enhances', description: 'Cloud execution for isolated tests' }
];
/**
 * Build the complete dependency graph
 */
export function buildDependencyGraph() {
    return {
        servers: MCP_SERVERS,
        edges: DEPENDENCY_EDGES,
        generated: new Date().toISOString()
    };
}
/**
 * Generate Mermaid diagram for visualization
 */
export function generateMermaidDiagram() {
    const lines = [
        'graph TD',
        '    subgraph "MCP Server Ecosystem"',
        '    CF[claude-flow@alpha<br/>SPARC + Swarm]',
        '    RS[ruv-swarm<br/>Multi-Agent]',
        '    FN[flow-nexus<br/>Cloud/Sandbox]',
        '    CF2[claude-flow<br/>Primary Interface]',
        '    AQE[agentic-qe<br/>Quality Engineering]',
        '    end',
        '',
        '    %% Required dependencies',
        '    RS -->|requires| CF',
        '    CF2 -->|requires| CF',
        '    AQE -->|requires| CF',
        '',
        '    %% Enhancement relationships',
        '    RS -.->|enhances| FN',
        '    FN -.->|enhances| AQE',
        '',
        '    %% Optional relationships',
        '    AQE -.->|optional| RS',
        '',
        '    style CF fill:#4a90d9,stroke:#2d5a8a,color:#fff',
        '    style RS fill:#7b68ee,stroke:#483d8b,color:#fff',
        '    style FN fill:#20b2aa,stroke:#008b8b,color:#fff',
        '    style CF2 fill:#4a90d9,stroke:#2d5a8a,color:#fff',
        '    style AQE fill:#ff6b6b,stroke:#c92a2a,color:#fff'
    ];
    return lines.join('\n');
}
/**
 * Save dependency graph to .goalie/research
 */
export async function saveDependencyGraph(goalieDir = '.goalie') {
    const graph = buildDependencyGraph();
    const outputPath = path.join(goalieDir, 'research', 'mcp_dependency_graph.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
    // Also save Mermaid diagram
    const mermaidPath = path.join(goalieDir, 'research', 'mcp_dependency_graph.mmd');
    fs.writeFileSync(mermaidPath, generateMermaidDiagram());
    return outputPath;
}
export default { buildDependencyGraph, generateMermaidDiagram, saveDependencyGraph, MCP_SERVERS, DEPENDENCY_EDGES };
//# sourceMappingURL=mcp_dependency_graph.js.map
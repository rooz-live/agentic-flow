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
export interface MCPServer {
    name: string;
    command: string;
    purpose: string;
    capabilities: string[];
    dependencies: string[];
    provides: string[];
}
export interface DependencyEdge {
    from: string;
    to: string;
    type: 'requires' | 'enhances' | 'optional';
    description: string;
}
export interface DependencyGraph {
    servers: MCPServer[];
    edges: DependencyEdge[];
    generated: string;
}
export declare const MCP_SERVERS: MCPServer[];
export declare const DEPENDENCY_EDGES: DependencyEdge[];
/**
 * Build the complete dependency graph
 */
export declare function buildDependencyGraph(): DependencyGraph;
/**
 * Generate Mermaid diagram for visualization
 */
export declare function generateMermaidDiagram(): string;
/**
 * Save dependency graph to .goalie/research
 */
export declare function saveDependencyGraph(goalieDir?: string): Promise<string>;
declare const _default: {
    buildDependencyGraph: typeof buildDependencyGraph;
    generateMermaidDiagram: typeof generateMermaidDiagram;
    saveDependencyGraph: typeof saveDependencyGraph;
    MCP_SERVERS: MCPServer[];
    DEPENDENCY_EDGES: DependencyEdge[];
};
export default _default;
//# sourceMappingURL=mcp_dependency_graph.d.ts.map
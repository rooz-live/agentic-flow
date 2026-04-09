#!/usr/bin/env tsx
/**
 * Claude-Flow v3alpha Integration
 * Hierarchical mesh topology with sparse attention
 */
export interface ClaudeFlowConfig {
    topology: 'hierarchical' | 'mesh' | 'star';
    maxAgents: number;
    sparseAttention: boolean;
    mcpEnabled: boolean;
}
export declare class ClaudeFlowIntegration {
    private projectRoot;
    private config;
    constructor(projectRoot?: string);
    private loadConfig;
    /**
     * Initialize Claude-Flow with hierarchical mesh
     */
    initialize(): Promise<void>;
    /**
     * Start MCP server
     */
    startMCP(): Promise<void>;
    /**
     * Start daemon
     */
    startDaemon(): Promise<void>;
    /**
     * Initialize hierarchical swarm
     */
    initSwarm(): Promise<void>;
    /**
     * Spawn agents
     */
    spawnAgents(types?: string[]): Promise<void>;
    /**
     * Store pattern in memory
     */
    storePattern(key: string, value: string, namespace?: string): Promise<void>;
    /**
     * Search patterns (HNSW-indexed)
     */
    searchPatterns(query: string, namespace?: string): Promise<string>;
    /**
     * Check status
     */
    checkStatus(): Promise<void>;
    /**
     * Full setup
     */
    setup(): Promise<void>;
}
//# sourceMappingURL=claude-flow-integration.d.ts.map
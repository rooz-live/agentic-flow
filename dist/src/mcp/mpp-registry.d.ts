/**
 * Model-Pattern-Protocol (MPP) Registry
 *
 * P0-2 (WSJF 6.2): MCP Server Integration Enhancement
 * P0-3: MPP Registry and Context Persistence
 *
 * Features:
 * - Model routing based on complexity
 * - Pattern matching for tool selection
 * - Protocol versioning for compatibility
 * - Context persistence across sessions
 * - Health monitoring and diagnostics
 * - Server lifecycle management
 */
export interface ModelCapability {
    name: string;
    maxTokens: number;
    costPer1kTokens: number;
    latency: number;
    capabilities: string[];
    useCase: 'simple' | 'moderate' | 'complex';
}
export interface Pattern {
    id: string;
    name: string;
    description: string;
    tools: string[];
    requiredCapabilities: string[];
    complexity: 'low' | 'medium' | 'high';
    successRate: number;
}
export interface Protocol {
    version: string;
    name: string;
    methods: string[];
    compatibility: string[];
    deprecated: boolean;
}
export interface MCPServer {
    id: string;
    name: string;
    url: string;
    protocol: string;
    status: 'healthy' | 'degraded' | 'down';
    lastHealthCheck: string;
    version: string;
    capabilities: string[];
}
export interface ContextSession {
    sessionId: string;
    startedAt: string;
    lastActivity: string;
    swarmId?: string;
    modelUsed: string;
    tokensUsed: number;
    context: Record<string, any>;
}
export declare class MPPRegistry {
    private registryPath;
    private models;
    private patterns;
    private protocols;
    private servers;
    private sessions;
    constructor(baseDir?: string);
    /**
     * Initialize default models, patterns, and protocols
     */
    private initializeDefaults;
    /**
     * Register a model
     */
    registerModel(model: ModelCapability): void;
    /**
     * Register a pattern
     */
    registerPattern(pattern: Pattern): void;
    /**
     * Register a protocol
     */
    registerProtocol(protocol: Protocol): void;
    /**
     * Register an MCP server
     */
    registerServer(server: MCPServer): void;
    /**
     * Route task to optimal model based on complexity
     */
    routeToModel(taskDescription: string, taskComplexity?: 'low' | 'medium' | 'high'): ModelCapability;
    /**
     * Assess task complexity from description
     */
    private assessComplexity;
    /**
     * Match task to pattern
     */
    matchPattern(taskDescription: string): Pattern | null;
    /**
     * Verify protocol compatibility
     */
    verifyProtocol(serverVersion: string, clientVersion: string): boolean;
    /**
     * Health check all registered servers
     */
    healthCheckServers(): Promise<Map<string, 'healthy' | 'degraded' | 'down'>>;
    /**
     * Create or restore context session
     */
    createSession(sessionId?: string, swarmId?: string): ContextSession;
    /**
     * Update session context
     */
    updateSession(sessionId: string, context: Record<string, any>, tokensUsed?: number): void;
    /**
     * Get session context
     */
    getSession(sessionId: string): ContextSession | null;
    /**
     * Calculate cost savings from routing
     */
    calculateCostSavings(): {
        totalTokens: number;
        estimatedCost: number;
        savingsVsOpus: number;
        savingsPercentage: number;
    };
    /**
     * Get registry statistics
     */
    getStats(): {
        models: number;
        patterns: number;
        protocols: number;
        servers: number;
        sessions: number;
        healthyServers: number;
    };
    /**
     * Save registry to disk
     */
    private saveToDisk;
    /**
     * Load registry from disk
     */
    private loadFromDisk;
}
export default MPPRegistry;
//# sourceMappingURL=mpp-registry.d.ts.map
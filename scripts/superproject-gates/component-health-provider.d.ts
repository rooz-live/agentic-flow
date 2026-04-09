/**
 * Component Health Metrics Provider
 *
 * Provides real health metrics for system components
 * with fallback to TRM-based bounded reasoning for unavailable metrics
 */
export interface ComponentHealthMetrics<T = Record<string, number>> {
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    metrics: T;
    source: 'real' | 'simulated';
}
export interface AgentDBMetrics {
    hitRate: number;
    responseTime: number;
    memoryUsage: number;
    indexSize: number;
}
export interface MCPProtocolMetrics {
    connectedServers: number;
    availableTools: number;
    messageLatency: number;
    errorRate: number;
}
export interface GovernanceSystemMetrics {
    wsjfCalculations: number;
    patternEvents: number;
    riskAssessments: number;
    governanceActions: number;
}
export interface MonitoringStackMetrics {
    prometheusHealth: number;
    grafanaConnectivity: number;
    alertRules: number;
    dataRetention: number;
}
export declare class ComponentHealthProvider {
    private checkIteration;
    private useRealMetrics;
    private componentEndpoints;
    constructor(config?: {
        useRealMetrics?: boolean;
        endpoints?: Record<string, string>;
    });
    setCheckIteration(iteration: number): void;
    /**
     * Check HTTP endpoint health
     */
    private checkHTTPEndpoint;
    /**
     * Get real AgentDB metrics
     */
    private getRealAgentDBMetrics;
    /**
     * Get real MCP Protocol metrics
     */
    private getRealMCPProtocolMetrics;
    /**
     * Get real Governance System metrics
     */
    private getRealGovernanceSystemMetrics;
    /**
     * Get real Monitoring Stack metrics
     */
    private getRealMonitoringStackMetrics;
    /**
     * Get AgentDB health metrics
     */
    getAgentDBMetrics(): Promise<ComponentHealthMetrics<AgentDBMetrics>>;
    /**
     * Get MCP Protocol health metrics
     */
    getMCPProtocolMetrics(): Promise<ComponentHealthMetrics<MCPProtocolMetrics>>;
    /**
     * Get Governance System health metrics
     */
    getGovernanceSystemMetrics(): Promise<ComponentHealthMetrics<GovernanceSystemMetrics>>;
    /**
     * Get Monitoring Stack health metrics
     */
    getMonitoringStackMetrics(): Promise<ComponentHealthMetrics<MonitoringStackMetrics>>;
    /**
     * Simulated AgentDB metrics (fallback)
     */
    private getSimulatedAgentDBMetrics;
    /**
     * Simulated MCP Protocol metrics (fallback)
     */
    private getSimulatedMCPProtocolMetrics;
    /**
     * Simulated Governance System metrics (fallback)
     */
    private getSimulatedGovernanceSystemMetrics;
    /**
     * Simulated Monitoring Stack metrics (fallback)
     */
    private getSimulatedMonitoringStackMetrics;
    /**
     * Determine component status based on metrics
     */
    private determineStatus;
    /**
     * Enable or disable real metrics collection
     */
    setRealMetricsEnabled(enabled: boolean): void;
    /**
     * Check if real metrics are enabled
     */
    isRealMetricsEnabled(): boolean;
    /**
     * Set component endpoint for health checks
     */
    setComponentEndpoint(component: string, endpoint: string): void;
}
//# sourceMappingURL=component-health-provider.d.ts.map
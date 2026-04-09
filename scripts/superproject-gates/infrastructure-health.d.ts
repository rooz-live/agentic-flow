export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    reachable: boolean;
    latency?: number;
    lastCheck?: Date;
    details?: string;
    host?: string;
}
export interface InfrastructureMetrics {
    ssh: HealthStatus;
    services?: ServiceStatus[];
    resources?: ResourceMetrics;
    overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
    lastCheckTime?: Date;
}
export interface ServiceStatus {
    name: string;
    running: boolean;
    status: string;
}
export interface ResourceMetrics {
    cpu: number;
    memory: number;
    disk: number;
}
export interface RecommendedAction {
    key: number;
    description: string;
    command: string;
    args: string[];
    wsjfScore: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    causalInsight?: string;
}
export declare class InfrastructureHealthChecker {
    private projectRoot;
    constructor(projectRoot?: string);
    /**
     * Check SSH connectivity to the infrastructure host
     */
    checkSSHConnectivity(host?: string): Promise<HealthStatus>;
    /**
     * Get cached health status if available and recent
     */
    private getCachedHealth;
    /**
     * Cache health metrics for future use
     */
    private cacheHealth;
    /**
     * Get overall infrastructure health metrics
     */
    getOverallHealth(forceRefresh?: boolean): Promise<InfrastructureMetrics>;
    /**
     * Calculate overall health status from individual metrics
     */
    private calculateOverallHealth;
    /**
     * Get recommended actions based on infrastructure health
     */
    getRecommendedActions(): Promise<RecommendedAction[]>;
    /**
     * Get a human-readable status icon
     */
    getStatusIcon(status: string): string;
    /**
     * Get a human-readable time ago string
     */
    getTimeAgo(date?: Date): string;
    /**
     * Run SSH probe and store episode for causal learning
     */
    runSSHProbeWithEpisode(): Promise<{
        success: boolean;
        episodeFile?: string;
    }>;
}
//# sourceMappingURL=infrastructure-health.d.ts.map
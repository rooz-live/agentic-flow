/**
 * Real-time System Metrics Provider
 *
 * Provides real system metrics using Node.js built-in modules
 * with fallback to TRM-based bounded reasoning for unavailable metrics
 */
export interface SystemMetrics {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    uptime: number;
    source: 'real' | 'simulated';
}
export interface NetworkMetrics {
    latency: number;
    source: 'real' | 'simulated';
}
export declare class SystemMetricsProvider {
    private checkIteration;
    private useRealMetrics;
    constructor(config?: {
        useRealMetrics?: boolean;
    });
    setCheckIteration(iteration: number): void;
    /**
     * Get real CPU usage percentage
     */
    private getRealCPUUsage;
    /**
     * Get real memory usage percentage
     */
    private getRealMemoryUsage;
    /**
     * Get real disk usage percentage
     */
    private getRealDiskUsage;
    /**
     * Get real network latency (ping to reliable endpoint)
     */
    private getRealNetworkLatency;
    /**
     * Get real system uptime
     */
    private getRealUptime;
    /**
     * Get all system metrics
     */
    getSystemMetrics(): Promise<SystemMetrics>;
    /**
     * Get network metrics only
     */
    getNetworkMetrics(): Promise<NetworkMetrics>;
    /**
     * Enable or disable real metrics collection
     */
    setRealMetricsEnabled(enabled: boolean): void;
    /**
     * Check if real metrics are enabled
     */
    isRealMetricsEnabled(): boolean;
}
//# sourceMappingURL=system-metrics-provider.d.ts.map
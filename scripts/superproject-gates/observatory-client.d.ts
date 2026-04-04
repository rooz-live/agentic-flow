/**
 * LLM Observatory SDK Integration
 *
 * Wrapper for distributed metrics collection from pattern logger and decision audit.
 * Integrates with @llm-observatory/sdk for comprehensive observability.
 */
interface ObservatoryConfig {
    projectRoot: string;
    endpoint?: string;
    apiKey?: string;
    enablePatternLogging?: boolean;
    enableDecisionAudit?: boolean;
    enableSkillTracking?: boolean;
    batchSize?: number;
    flushInterval?: number;
}
export declare class ObservatoryClient {
    private config;
    private decisionDb?;
    private skillsDb?;
    private metricsBuffer;
    private flushTimer?;
    constructor(config: ObservatoryConfig);
    private initDatabases;
    private startAutoFlush;
    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number, labels?: Record<string, string>, metadata?: Record<string, any>): void;
    /**
     * Collect governance metrics
     */
    collectGovernanceMetrics(): void;
    /**
     * Collect skill metrics
     */
    collectSkillMetrics(): void;
    /**
     * Collect pattern log metrics
     */
    collectPatternMetrics(): void;
    /**
     * Collect all metrics
     */
    collectAll(): void;
    /**
     * Flush metrics buffer
     */
    flush(): Promise<void>;
    /**
     * Generate metrics report
     */
    generateReport(): string;
    /**
     * Shutdown and cleanup
     */
    shutdown(): Promise<void>;
}
export default ObservatoryClient;
//# sourceMappingURL=observatory-client.d.ts.map
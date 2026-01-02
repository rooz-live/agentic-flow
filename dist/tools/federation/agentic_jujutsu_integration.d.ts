/**
 * Agentic-Jujutsu Integration for Federation
 *
 * Provides integration with agentic-jujutsu status and analyze commands
 * Logs results to .goalie/metrics_log.jsonl for federation tracking
 */
export interface JujutsuStatusResult {
    governanceStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastCheck: string;
    issues: string[];
    recommendations: string[];
    metrics?: {
        totalPatterns: number;
        activePatterns: number;
        riskLevel: number;
        complianceScore: number;
    };
}
export interface JujutsuAnalysisResult {
    analysisType: 'comprehensive' | 'focused' | 'trend';
    timestamp: string;
    findings: {
        critical: string[];
        warnings: string[];
        info: string[];
    };
    recommendations: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    };
    economicImpact?: {
        costOfDelay: number;
        potentialSavings: number;
        priorityScore: number;
    };
}
export declare class AgenticJujutsuIntegration {
    private goalieDir;
    private metricsLogPath;
    constructor(goalieDir: string, useMock?: boolean);
    /**
     * Run agentic-jujutsu status command and log results
     */
    runStatusCheck(): Promise<JujutsuStatusResult>;
    /**
     * Run agentic-jujutsu analyze command and log results
     */
    runAnalysis(analysisType?: 'comprehensive' | 'focused' | 'trend'): Promise<JujutsuAnalysisResult>;
    /**
     * Run agentic-jujutsu command with arguments
     */
    private runCommand;
    /**
     * Parse governance status from command output
     */
    private parseGovernanceStatus;
    /**
     * Extract issues from command output
     */
    private extractIssues;
    /**
     * Extract recommendations from command output
     */
    private extractRecommendations;
    /**
     * Parse findings from analysis output
     */
    private parseFindings;
    /**
     * Parse recommendations from analysis output
     */
    private parseRecommendations;
    /**
     * Extract economic impact from analysis output
     */
    private extractEconomicImpact;
    /**
     * Extract metrics from status output
     */
    private extractMetrics;
    /**
     * Log status result to metrics log
     */
    private logStatusResult;
    /**
     * Log analysis result to metrics log
     */
    private logAnalysisResult;
    /**
     * Write entry to metrics log
     */
    private writeToMetricsLog;
}
/**
 * Main function for standalone execution
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=agentic_jujutsu_integration.d.ts.map
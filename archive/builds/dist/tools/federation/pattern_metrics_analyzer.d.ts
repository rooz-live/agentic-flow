#!/usr/bin/env node
/**
 * Pattern Metrics Analyzer for Federation Agents
 *
 * Consumes .goalie/pattern_metrics.jsonl and identifies:
 * - Anomalies in pattern behavior
 * - Governance parameter adjustment recommendations
 * - Auto-generated retro questions based on pattern triggers
 */
interface Anomaly {
    type: 'pattern_overuse' | 'pattern_underuse' | 'mutation_spike' | 'behavioral_drift' | 'economic_degradation';
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: any;
    recommendation: string;
}
interface GovernanceAdjustment {
    parameter: string;
    current_value: any;
    suggested_value: any;
    reason: string;
    pattern_trigger: string;
}
interface RetroQuestion {
    category: 'learning' | 'process' | 'technical' | 'governance';
    question: string;
    context: string;
    triggered_by: string[];
}
declare class PatternMetricsAnalyzer {
    private goalieDir;
    private metrics;
    private anomalies;
    private adjustments;
    private retroQuestions;
    private jsonMode;
    constructor(goalieDir: string, jsonMode?: boolean);
    analyze(): Promise<void>;
    private loadMetrics;
    private detectAnomalies;
    private proposeGovernanceAdjustments;
    private generateRetroQuestions;
    private groupByPattern;
    getReport(): any;
    writeReport(outputPath?: string): Promise<void>;
}
export { PatternMetricsAnalyzer, Anomaly, GovernanceAdjustment, RetroQuestion };
//# sourceMappingURL=pattern_metrics_analyzer.d.ts.map
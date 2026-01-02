import type { PatternEvent } from './shared_utils.js';
/**
 * Multi-dimensional Analytics System
 *
 * This system provides comprehensive analytics across multiple dimensions:
 * - Cost dimension (economic impact, ROI, cost trends)
 * - Risk dimension (risk levels, risk factors, mitigation effectiveness)
 * - Impact dimension (business impact, workload impact, improvement rates)
 * - Time dimension (resolution time, cycle time, efficiency metrics)
 * - Performance dimension (success rates, quality metrics, trend analysis)
 */
export interface CostDimension {
    /** Total cost of delay across all items */
    totalCostOfDelay: number;
    /** Average cost per pattern */
    avgCostPerPattern: number;
    /** Cost breakdown by category */
    costByCategory: Record<string, number>;
    /** Cost trend over time */
    costTrend: 'increasing' | 'decreasing' | 'stable';
    /** High-cost patterns requiring attention */
    highCostPatterns: Array<{
        pattern: string;
        cost: number;
        category: string;
    }>;
}
export interface RiskDimension {
    /** Overall risk score (1-10) */
    overallRiskScore: number;
    /** Risk distribution by level */
    riskDistribution: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    /** Risk breakdown by category */
    riskByCategory: Record<string, number>;
    /** Patterns with highest risk */
    highRiskPatterns: Array<{
        pattern: string;
        riskLevel: number;
        factors: string[];
    }>;
    /** Effectiveness of risk mitigation strategies */
    riskMitigationEffectiveness: number;
}
export interface ImpactDimension {
    /** Total economic impact score */
    totalEconomicImpact: number;
    /** Impact breakdown by workload type */
    impactByWorkload: Record<string, number>;
    /** Patterns with highest business impact */
    highImpactPatterns: Array<{
        pattern: string;
        impact: number;
        recommendation: string;
    }>;
    /** Rate of improvement implementation */
    improvementRate: number;
}
export interface TimeDimension {
    /** Average time to resolve issues */
    avgResolutionTime: number;
    /** Time breakdown by complexity */
    timeByComplexity: Record<string, number>;
    /** Identified bottlenecks */
    bottlenecks: string[];
    /** Overall efficiency score */
    efficiency: number;
}
export interface PerformanceDimension {
    /** Total items processed */
    totalItems: number;
    /** Success rate percentage */
    successRate: number;
    /** Quality metrics */
    qualityMetrics: {
        defectRate: number;
        reworkRate: number;
        customerSatisfaction: number;
    };
    /** Performance trends */
    trends: {
        costTrend: 'improving' | 'degrading' | 'stable';
        riskTrend: 'improving' | 'degrading' | 'stable';
        efficiencyTrend: 'improving' | 'degrading' | 'stable';
    };
}
export interface AnalyticsSummary {
    /** Analysis timestamp */
    timestamp: string;
    /** Cost dimension analysis */
    costDimension: CostDimension;
    /** Risk dimension analysis */
    riskDimension: RiskDimension;
    /** Impact dimension analysis */
    impactDimension: ImpactDimension;
    /** Time dimension analysis */
    timeDimension: TimeDimension;
    /** Performance dimension analysis */
    performanceDimension: PerformanceDimension;
    /** Overall health score (0-100) */
    overallHealthScore: number;
    /** Key recommendations */
    recommendations: string[];
    /** Data quality metrics */
    dataQuality: {
        completeness: number;
        accuracy: number;
        timeliness: number;
    };
}
export declare class MultiDimensionalAnalytics {
    private goalieDir;
    private wsjfCalculator;
    constructor(goalieDir: string);
    /**
     * Generate comprehensive multi-dimensional analytics
     */
    generateAnalytics(patterns: PatternEvent[], insights: any[], timeWindow?: number): Promise<AnalyticsSummary>;
    /**
     * Analyze cost dimension
     */
    private analyzeCostDimension;
    /**
     * Analyze risk dimension
     */
    private analyzeRiskDimension;
    /**
     * Analyze impact dimension
     */
    private analyzeImpactDimension;
    /**
     * Analyze time dimension
     */
    private analyzeTimeDimension;
    /**
     * Analyze performance dimension
     */
    private analyzePerformanceDimension;
    /**
     * Calculate overall health score
     */
    private calculateOverallHealthScore;
    /**
     * Generate comprehensive recommendations
     */
    private generateRecommendations;
    /**
     * Assess data quality
     */
    private assessDataQuality;
    /**
     * Determine cost trend
     */
    private determineCostTrend;
    /**
     * Save analytics results to file
     */
    saveAnalyticsResults(analytics: AnalyticsSummary): Promise<void>;
    /**
     * Load historical analytics for trend analysis
     */
    loadHistoricalAnalytics(): Promise<AnalyticsSummary[]>;
    /**
     * Generate trend analysis from historical data
     */
    generateTrendAnalysis(): Promise<{
        costTrend: string;
        riskTrend: string;
        performanceTrend: string;
    }>;
    /**
     * Compare trend values
     */
    private compareTrendValues;
    /**
     * Main execution function for analytics
     */
    executeAnalytics(timeWindow?: number): Promise<void>;
}
export { MultiDimensionalAnalytics, type AnalyticsSummary, type CostDimension, type ImpactDimension, type PerformanceDimension, type RiskDimension, type TimeDimension };
//# sourceMappingURL=multi_dimensional_analytics.d.ts.map
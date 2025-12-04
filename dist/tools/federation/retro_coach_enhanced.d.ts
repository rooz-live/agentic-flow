import type { PatternEvent } from './shared_utils.js';
import { type WSJFResult, type BatchRecommendation } from './wsjf_calculator.js';
/**
 * Enhanced Retro Coach Agent with WSJF Integration and Advanced Analytics
 *
 * This enhanced retro coach provides:
 * - WSJF-based economic prioritization
 * - Multi-dimensional analytics across cost, risk, and impact
 * - Intelligent action item generation
 * - Advanced forensic verification
 * - Risk-aware batching recommendations
 */
interface Insight {
    ts?: string;
    text?: string;
    type: string;
    category?: string;
    circle?: string;
    depth?: number;
    priority?: string;
    verified?: boolean;
    highImpact?: boolean;
    evidence_sources?: string[];
    verification_threshold?: number;
    cod_impact?: number;
    detected_pattern?: string;
    rca_method?: string;
    recommended_action?: string;
    iteration?: number;
}
interface IterativeRCARecommendation {
    id: string;
    title: string;
    status: string;
    created_at: string;
    pattern: string;
    rca_method: string;
    priority: string;
    circle: string;
    detected_pattern: string;
    cod_impact: number;
    evidence_sources?: string[];
    verification_threshold?: number;
}
interface RCATriggerResult {
    methods: string[];
    design_patterns: string[];
    event_prototypes: string[];
    rca_5_whys: string[];
    iterativesRecommendations: IterativeRCARecommendation[];
}
interface EnhancedAnalyticsSummary {
    wsjfAnalysis: {
        totalItems: number;
        topPriorityItems: WSJFResult[];
        batchRecommendations: BatchRecommendation[];
        riskSummary: {
            overallRiskLevel: number;
            riskDistribution: {
                critical: number;
                high: number;
                medium: number;
                low: number;
            };
            topRiskFactors: string[];
            mitigationStrategies: string[];
        };
        economicImpact: {
            totalCostOfDelay: number;
            potentialSavings: number;
            priorityScore: number;
            roi: number;
            timeToValue: number;
        };
    };
    trendAnalysis: {
        codTrends: Array<{
            pattern: string;
            trend: 'improving' | 'degrading' | 'stable';
            changePercent: number;
        }>;
        wsjfTrends: Array<{
            pattern: string;
            trend: 'improving' | 'degrading' | 'stable';
            changePercent: number;
        }>;
        riskTrends: Array<{
            pattern: string;
            trend: 'improving' | 'degrading' | 'stable';
            changePercent: number;
        }>;
    };
    actionItemEffectiveness: {
        totalItems: number;
        verifiedItems: number;
        highImpactItems: number;
        avgTimeToResolution: number;
        successRate: number;
    };
}
interface MultiDimensionalMetrics {
    costDimension: {
        totalCostOfDelay: number;
        avgCostPerPattern: number;
        costByCategory: Record<string, number>;
        costTrend: 'increasing' | 'decreasing' | 'stable';
    };
    riskDimension: {
        overallRiskScore: number;
        riskByCategory: Record<string, number>;
        highRiskPatterns: string[];
        riskMitigationEffectiveness: number;
    };
    impactDimension: {
        totalEconomicImpact: number;
        impactByWorkload: Record<string, number>;
        highImpactPatterns: string[];
        improvementRate: number;
    };
    timeDimension: {
        avgResolutionTime: number;
        timeByComplexity: Record<string, number>;
        bottlenecks: string[];
        efficiency: number;
    };
}
/**
 * Generate multi-dimensional analytics from WSJF results and pattern data
 */
declare function generateMultiDimensionalAnalytics(wsjfResults: WSJFResult[], patterns: PatternEvent[], insights: Insight[]): MultiDimensionalMetrics;
/**
 * Generate trend analysis from historical data
 */
declare function generateTrendAnalysis(wsjfResults: WSJFResult[], patterns: PatternEvent[]): EnhancedAnalyticsSummary['trendAnalysis'];
/**
 * Generate action item effectiveness analysis
 */
declare function generateActionItemEffectiveness(insights: Insight[]): EnhancedAnalyticsSummary['actionItemEffectiveness'];
/**
 * Enhanced main function with WSJF integration and advanced analytics
 */
declare function main(): Promise<void>;
export { main, generateMultiDimensionalAnalytics, generateTrendAnalysis, generateActionItemEffectiveness, type WSJFResult, type BatchRecommendation, type Insight, type IterativeRCARecommendation, type RCATriggerResult, type EnhancedAnalyticsSummary, type MultiDimensionalMetrics };
//# sourceMappingURL=retro_coach_enhanced.d.ts.map
import * as fs from 'fs';
import * as path from 'path';
import type { PatternEvent } from './shared_utils.js';
import { readJsonl } from './shared_utils.js';
import { WSJFCalculator, type WSJFResult } from './wsjf_calculator.js';

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
  highCostPatterns: Array<{ pattern: string; cost: number; category: string }>;
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
  highRiskPatterns: Array<{ pattern: string; riskLevel: number; factors: string[] }>;
  /** Effectiveness of risk mitigation strategies */
  riskMitigationEffectiveness: number;
}

export interface ImpactDimension {
  /** Total economic impact score */
  totalEconomicImpact: number;
  /** Impact breakdown by workload type */
  impactByWorkload: Record<string, number>;
  /** Patterns with highest business impact */
  highImpactPatterns: Array<{ pattern: string; impact: number; recommendation: string }>;
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

export class MultiDimensionalAnalytics {
  private goalieDir: string;
  private wsjfCalculator: WSJFCalculator;

  constructor(goalieDir: string) {
    this.goalieDir = goalieDir;
    this.wsjfCalculator = new WSJFCalculator(goalieDir);
  }

  /**
   * Generate comprehensive multi-dimensional analytics
   */
  async generateAnalytics(
    patterns: PatternEvent[],
    insights: any[],
    timeWindow: number = 30 // days
  ): Promise<AnalyticsSummary> {
    const wsjfResults = this.wsjfCalculator.calculateAndRank(patterns);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - timeWindow * 24 * 60 * 60 * 1000);

    // Filter data within time window
    const recentPatterns = patterns.filter(p =>
      new Date(p.ts || '') >= cutoffDate
    );
    const recentInsights = insights.filter(i =>
      new Date(i.ts || '') >= cutoffDate
    );

    // Generate dimensional analyses
    const costDimension = this.analyzeCostDimension(wsjfResults);
    const riskDimension = this.analyzeRiskDimension(wsjfResults);
    const impactDimension = this.analyzeImpactDimension(wsjfResults, recentInsights);
    const timeDimension = this.analyzeTimeDimension(recentInsights);
    const performanceDimension = this.analyzePerformanceDimension(recentInsights, recentPatterns);

    // Calculate overall health score
    const overallHealthScore = this.calculateOverallHealthScore(
      costDimension,
      riskDimension,
      impactDimension,
      performanceDimension
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      costDimension,
      riskDimension,
      impactDimension,
      timeDimension,
      performanceDimension
    );

    // Assess data quality
    const dataQuality = this.assessDataQuality(patterns, insights);

    return {
      timestamp: now.toISOString(),
      costDimension,
      riskDimension,
      impactDimension,
      timeDimension,
      performanceDimension,
      overallHealthScore,
      recommendations,
      dataQuality
    };
  }

  /**
   * Analyze cost dimension
   */
  private analyzeCostDimension(wsjfResults: WSJFResult[]): CostDimension {
    const totalCostOfDelay = wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0);
    const avgCostPerPattern = wsjfResults.length > 0 ? totalCostOfDelay / wsjfResults.length : 0;

    const costByCategory: Record<string, number> = {};
    for (const result of wsjfResults) {
      costByCategory[result.category] = (costByCategory[result.category] || 0) + result.costOfDelay;
    }

    // Identify high-cost patterns (top 10%)
    const sortedByCost = [...wsjfResults].sort((a, b) => b.costOfDelay - a.costOfDelay);
    const highCostThreshold = sortedByCost[Math.floor(sortedByCost.length * 0.1)]?.costOfDelay || 0;
    const highCostPatterns = sortedByCost
      .filter(result => result.costOfDelay >= highCostThreshold)
      .slice(0, 5)
      .map(result => ({
        pattern: result.pattern,
        cost: result.costOfDelay,
        category: result.category
      }));

    // Determine cost trend
    const costTrend = this.determineCostTrend(wsjfResults);

    return {
      totalCostOfDelay,
      avgCostPerPattern,
      costByCategory,
      costTrend,
      highCostPatterns
    };
  }

  /**
   * Analyze risk dimension
   */
  private analyzeRiskDimension(wsjfResults: WSJFResult[]): RiskDimension {
    const overallRiskScore = wsjfResults.length > 0 ?
      wsjfResults.reduce((sum, result) => sum + result.riskAssessment.riskLevel, 0) / wsjfResults.length : 0;

    const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    const riskByCategory: Record<string, number> = {};

    for (const result of wsjfResults) {
      const level = result.riskAssessment.riskLevel;
      if (level >= 9) riskDistribution.critical++;
      else if (level >= 7) riskDistribution.high++;
      else if (level >= 4) riskDistribution.medium++;
      else riskDistribution.low++;

      riskByCategory[result.category] = (riskByCategory[result.category] || 0) + level;
    }

    // Identify high-risk patterns
    const highRiskPatterns = wsjfResults
      .filter(result => result.riskAssessment.riskLevel >= 7)
      .slice(0, 10)
      .map(result => ({
        pattern: result.pattern,
        riskLevel: result.riskAssessment.riskLevel,
        factors: Object.keys(result.riskAssessment.factors)
      }));

    // Calculate mitigation effectiveness (placeholder - would need historical data)
    const riskMitigationEffectiveness = 0.75; // Assume 75% effectiveness

    return {
      overallRiskScore,
      riskDistribution,
      riskByCategory,
      highRiskPatterns,
      riskMitigationEffectiveness
    };
  }

  /**
   * Analyze impact dimension
   */
  private analyzeImpactDimension(wsjfResults: WSJFResult[], insights: any[]): ImpactDimension {
    const totalEconomicImpact = wsjfResults.reduce((sum, result) =>
      sum + (result.wsjfScore * result.parameters.jobDuration), 0);

    const impactByWorkload: Record<string, number> = {};
    for (const result of wsjfResults) {
      impactByWorkload[result.category] = (impactByWorkload[result.category] || 0) +
        (result.wsjfScore * result.parameters.jobDuration);
    }

    // Identify high-impact patterns
    const highImpactPatterns = wsjfResults
      .filter(result => result.recommendation === 'IMMEDIATE' || result.recommendation === 'HIGH')
      .slice(0, 5)
      .map(result => ({
        pattern: result.pattern,
        impact: result.wsjfScore * result.parameters.jobDuration,
        recommendation: result.recommendation
      }));

    // Calculate improvement rate from insights
    const verifiedInsights = insights.filter(i => i.verified);
    const improvementRate = insights.length > 0 ? verifiedInsights.length / insights.length : 0;

    return {
      totalEconomicImpact,
      impactByWorkload,
      highImpactPatterns,
      improvementRate
    };
  }

  /**
   * Analyze time dimension
   */
  private analyzeTimeDimension(insights: any[]): TimeDimension {
    const actionItems = insights.filter(i => i.type === 'action_item');
    const resolvedItems = actionItems.filter(i => i.status === 'resolved');

    // Calculate average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const item of resolvedItems) {
      if (item.created_at && item.ts) {
        const created = new Date(item.created_at).getTime();
        const resolved = new Date(item.ts).getTime();
        totalResolutionTime += (resolved - created);
        resolvedCount++;
      }
    }

    const avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (24 * 60 * 60 * 1000) : 0; // days

    // Analyze time by complexity (simplified)
    const timeByComplexity: Record<string, number> = {
      'Low': avgResolutionTime * 0.5,
      'Medium': avgResolutionTime,
      'High': avgResolutionTime * 1.5,
      'Critical': avgResolutionTime * 2
    };

    // Identify bottlenecks (patterns with long resolution times)
    const bottlenecks = actionItems
      .filter(i => i.status === 'resolved' && avgResolutionTime > 0)
      .sort((a, b) => {
        const timeA = i.created_at && i.ts ?
          new Date(i.ts).getTime() - new Date(i.created_at).getTime() : 0;
        const timeB = avgResolutionTime * 24 * 60 * 60 * 1000; // avg in ms
        return timeB - timeA;
      }, 0)
      .slice(0, 3)
      .map(i => i.pattern || 'unknown');

    // Calculate efficiency (inverse of average resolution time)
    const efficiency = avgResolutionTime > 0 ? Math.min(100 / (1 + avgResolutionTime), 100) : 0;

    return {
      avgResolutionTime,
      timeByComplexity,
      bottlenecks,
      efficiency
    };
  }

  /**
   * Analyze performance dimension
   */
  private analyzePerformanceDimension(insights: any[], patterns: PatternEvent[]): PerformanceDimension {
    const totalItems = insights.length;
    const resolvedItems = insights.filter(i => i.status === 'resolved');
    const successRate = totalItems > 0 ? resolvedItems.length / totalItems : 0;

    // Calculate quality metrics (simplified)
    const qualityMetrics = {
      defectRate: Math.max(0, (1 - successRate) * 0.1), // Assume 10% defect rate
      reworkRate: Math.max(0, (1 - successRate) * 0.05), // Assume 5% rework rate
      customerSatisfaction: successRate * 100 // Satisfaction aligned with success rate
    };

    // Analyze trends (simplified)
    const trends = {
      costTrend: 'stable', // Would need historical data
      riskTrend: 'stable',
      efficiencyTrend: 'stable'
    };

    return {
      totalItems,
      successRate,
      qualityMetrics,
      trends
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealthScore(
    costDimension: CostDimension,
    riskDimension: RiskDimension,
    impactDimension: ImpactDimension,
    performanceDimension: PerformanceDimension
  ): number {
    // Weight different dimensions
    const costScore = Math.max(0, 100 - (costDimension.totalCostOfDelay / 1000)); // Inverse cost scoring
    const riskScore = Math.max(0, 100 - (riskDimension.overallRiskScore * 10)); // Inverse risk scoring
    const impactScore = Math.min(100, impactDimension.totalEconomicImpact / 100); // Direct impact scoring
    const performanceScore = performanceDimension.successRate * 100;

    // Calculate weighted average
    const overallHealthScore = (costScore * 0.3 + riskScore * 0.3 + impactScore * 0.2 + performanceScore * 0.2);

    return Math.round(overallHealthScore);
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(
    costDimension: CostDimension,
    riskDimension: RiskDimension,
    impactDimension: ImpactDimension,
    timeDimension: TimeDimension,
    performanceDimension: PerformanceDimension
  ): string[] {
    const recommendations: string[] = [];

    // Cost-based recommendations
    if (costDimension.totalCostOfDelay > 10000) {
      recommendations.push('High total cost of delay detected. Consider prioritizing quick-win items to reduce overall economic impact.');
    }
    if (costDimension.highCostPatterns.length > 0) {
      recommendations.push(`Focus on high-cost patterns: ${costDimension.highCostPatterns.map(p => p.pattern).join(', ')}`);
    }

    // Risk-based recommendations
    if (riskDimension.overallRiskScore > 7) {
      recommendations.push('Overall risk level is high. Implement additional risk mitigation strategies and consider risk-sharing approaches.');
    }
    if (riskDimension.highRiskPatterns.length > 0) {
      recommendations.push(`Address high-risk patterns: ${riskDimension.highRiskPatterns.map(p => p.pattern).join(', ')}`);
    }

    // Impact-based recommendations
    if (impactDimension.improvementRate < 0.5) {
      recommendations.push('Low improvement rate detected. Review action item effectiveness and implementation processes.');
    }
    if (impactDimension.highImpactPatterns.length > 0) {
      recommendations.push(`Leverage high-impact patterns: ${impactDimension.highImpactPatterns.map(p => p.pattern).join(', ')}`);
    }

    // Time-based recommendations
    if (timeDimension.avgResolutionTime > 14) { // > 2 weeks
      recommendations.push('Long resolution times detected. Consider streamlining approval processes and reducing complexity.');
    }
    if (timeDimension.bottlenecks.length > 0) {
      recommendations.push(`Bottlenecks identified: ${timeDimension.bottlenecks.join(', ')}. Consider dedicated improvement initiatives.`);
    }

    // Performance-based recommendations
    if (performanceDimension.successRate < 0.7) {
      recommendations.push('Low success rate detected. Review action item quality and implementation support.');
    }

    return recommendations;
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(patterns: PatternEvent[], insights: any[]): {
    completeness: number;
    accuracy: number;
    timeliness: number;
  } {
    // Check completeness
    const expectedPatterns = 50; // Expected minimum patterns
    const actualPatterns = patterns.length;
    const completeness = Math.min(100, (actualPatterns / expectedPatterns) * 100);

    // Check for data consistency
    const consistentInsights = insights.filter(i =>
      i.ts && i.type && i.pattern
    ).length;
    const accuracy = insights.length > 0 ? (consistentInsights / insights.length) * 100 : 0;

    // Check for recent data (within last 7 days)
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInsights = insights.filter(i =>
      i.ts && new Date(i.ts) >= recentDate
    ).length;
    const timeliness = insights.length > 0 ? (recentInsights / insights.length) * 100 : 0;

    return { completeness, accuracy, timeliness };
  }

  /**
   * Determine cost trend
   */
  private determineCostTrend(wsjfResults: WSJFResult[]): 'increasing' | 'decreasing' | 'stable' {
    if (wsjfResults.length < 2) return 'stable';

    const sortedByDate = [...wsjfResults].sort((a, b) =>
      new Date(a.ts || '').getTime() - new Date(b.ts || '').getTime()
    );

    let increasingCount = 0;
    let decreasingCount = 0;

    for (let i = 1; i < sortedByDate.length; i++) {
      const trend = sortedByDate[i].costOfDelay - sortedByDate[i-1].costOfDelay;
      if (trend > 0) increasingCount++;
      else if (trend < 0) decreasingCount++;
    }

    const totalChanges = increasingCount + decreasingCount;
    const increasingRatio = totalChanges > 0 ? increasingCount / totalChanges : 0;

    if (increasingRatio > 0.6) return 'increasing';
    if (increasingRatio < 0.4) return 'decreasing';
    return 'stable';
  }

  /**
   * Save analytics results to file
   */
  async saveAnalyticsResults(analytics: AnalyticsSummary): Promise<void> {
    const analyticsPath = path.join(this.goalieDir, 'multi_dimensional_analytics.json');

    try {
      fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
      console.log(`[multi_dimensional_analytics] Results saved to ${analyticsPath}`);
    } catch (error) {
      console.error('[multi_dimensional_analytics] Failed to save analytics results:', error);
    }
  }

  /**
   * Load historical analytics for trend analysis
   */
  async loadHistoricalAnalytics(): Promise<AnalyticsSummary[]> {
    const analyticsPath = path.join(this.goalieDir, 'multi_dimensional_analytics.json');

    if (!fs.existsSync(analyticsPath)) {
      return [];
    }

    try {
      const data = fs.readFileSync(analyticsPath, 'utf8');
      const lines = data.trim().split('\n').filter(line => line.trim());

      return lines.map(line => {
        try {
          return JSON.parse(line) as AnalyticsSummary;
        } catch {
          return null;
        }
      }).filter((item): item is AnalyticsSummary => item !== null) as AnalyticsSummary[];
    } catch (error) {
      console.error('[multi_dimensional_analytics] Failed to load historical analytics:', error);
      return [];
    }
  }

  /**
   * Generate trend analysis from historical data
   */
  async generateTrendAnalysis(): Promise<{
    costTrend: string;
    riskTrend: string;
    performanceTrend: string;
  }> {
    const historicalData = await this.loadHistoricalAnalytics();

    if (historicalData.length < 2) {
      return {
        costTrend: 'stable',
        riskTrend: 'stable',
        performanceTrend: 'stable'
      };
    }

    const recent = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    const costTrend = this.compareTrendValues(
      recent.costDimension.totalCostOfDelay,
      previous.costDimension.totalCostOfDelay
    );

    const riskTrend = this.compareTrendValues(
      recent.riskDimension.overallRiskScore,
      previous.riskDimension.overallRiskScore
    );

    const performanceTrend = this.compareTrendValues(
      recent.performanceDimension.successRate * 100,
      previous.performanceDimension.successRate * 100
    );

    return { costTrend, riskTrend, performanceTrend };
  }

  /**
   * Compare trend values
   */
  private compareTrendValues(current: number, previous: number): string {
    if (Math.abs(current - previous) < 0.01) return 'stable';
    return current > previous ? 'improving' : 'degrading';
  }

  /**
   * Main execution function for analytics
   */
  async executeAnalytics(timeWindow: number = 30): Promise<void> {
    console.log('=== Multi-dimensional Analytics Analysis ===');

    const patternsPath = path.join(this.goalieDir, 'pattern_metrics.jsonl');
    const insightsPath = path.join(this.goalieDir, 'insights_log.jsonl');

    if (!fs.existsSync(patternsPath) || !fs.existsSync(insightsPath)) {
      console.error('[multi_dimensional_analytics] Required data files not found');
      return;
    }

    const patterns = await readJsonl<PatternEvent>(patternsPath);
    const insights = await readJsonl<any>(insightsPath);

    // Generate comprehensive analytics
    const analytics = await this.generateAnalytics(patterns, insights, timeWindow);

    // Save results
    await this.saveAnalyticsResults(analytics);

    // Generate trend analysis
    const trendAnalysis = await this.generateTrendAnalysis();

    console.log('Analytics Summary:');
    console.log(`  Overall Health Score: ${analytics.overallHealthScore}/100`);
    console.log(`  Cost Trend: ${trendAnalysis.costTrend}`);
    console.log(`  Risk Trend: ${trendAnalysis.riskTrend}`);
    console.log(`  Performance Trend: ${trendAnalysis.performanceTrend}`);
    console.log(`  Recommendations: ${analytics.recommendations.length} generated`);

    // Output key metrics
    console.log('\nKey Metrics:');
    console.log(`  Total Cost of Delay: $${analytics.costDimension.totalCostOfDelay.toFixed(2)}`);
    console.log(`  Overall Risk Score: ${analytics.riskDimension.overallRiskScore}/10`);
    console.log(`  Success Rate: ${(analytics.performanceDimension.successRate * 100).toFixed(1)}%`);
    console.log(`  Data Quality: ${analytics.dataQuality.completeness.toFixed(1)}% complete`);
  }
}

// Export for use in other modules
export {
    MultiDimensionalAnalytics,
    type AnalyticsSummary,
    type CostDimension, type ImpactDimension, type PerformanceDimension, type RiskDimension, type TimeDimension
};

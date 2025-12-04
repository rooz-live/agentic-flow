import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
import type {
    PatternBaselineDelta,
    PatternEvent,
} from './shared_utils.js';
import {
    computeCodBaselineDeltas,
    getActionKeys,
    readJsonl,
    summarizePatterns,
} from './shared_utils.js';
import { publishStreamEvent, resolveStreamSocket } from './streamPublisher.js';
import { WSJFCalculator, type WSJFResult, type BatchRecommendation } from './wsjf_calculator.js';

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
    codTrends: Array<{ pattern: string; trend: 'improving' | 'degrading' | 'stable'; changePercent: number }>;
    wsjfTrends: Array<{ pattern: string; trend: 'improving' | 'degrading' | 'stable'; changePercent: number }>;
    riskTrends: Array<{ pattern: string; trend: 'improving' | 'degrading' | 'stable'; changePercent: number }>;
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

function getGoalieDirFromArgs(): string {
  const argIndex = process.argv.indexOf('--goalie-dir');
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    return path.resolve(process.argv[argIndex + 1]);
  }
  if (process.env.GOALIE_DIR) {
    return path.resolve(process.env.GOALIE_DIR);
  }
  return path.resolve(process.cwd(), 'investing/agentic-flow/.goalie');
}

function getIterationFromArgs(): { iteration: number; runId: string } {
  const iterArg = process.argv.find(arg => arg.startsWith('--iteration='));
  const iteration = iterArg ? parseInt(iterArg.split('=')[1], 10) : 0;
  const runId = process.env.AF_RUN_ID || `retro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return { iteration, runId };
}

/**
 * Generate multi-dimensional analytics from WSJF results and pattern data
 */
function generateMultiDimensionalAnalytics(
  wsjfResults: WSJFResult[],
  patterns: PatternEvent[],
  insights: Insight[]
): MultiDimensionalMetrics {
  // Cost Dimension Analysis
  const totalCostOfDelay = wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0);
  const avgCostPerPattern = wsjfResults.length > 0 ? totalCostOfDelay / wsjfResults.length : 0;
  
  const costByCategory: Record<string, number> = {};
  for (const result of wsjfResults) {
    costByCategory[result.category] = (costByCategory[result.category] || 0) + result.costOfDelay;
  }
  
  // Determine cost trend (simplified)
  const costTrend = wsjfResults.length > 1 ? 'stable' : 'stable';
  
  const costDimension = {
    totalCostOfDelay,
    avgCostPerPattern,
    costByCategory,
    costTrend
  };

  // Risk Dimension Analysis
  const overallRiskScore = wsjfResults.length > 0 ? 
    wsjfResults.reduce((sum, result) => sum + result.riskAssessment.riskLevel, 0) / wsjfResults.length : 0;
  
  const riskByCategory: Record<string, number> = {};
  const highRiskPatterns: string[] = [];
  
  for (const result of wsjfResults) {
    riskByCategory[result.category] = (riskByCategory[result.category] || 0) + result.riskAssessment.riskLevel;
    if (result.riskAssessment.riskLevel >= 7) {
      highRiskPatterns.push(result.pattern);
    }
  }
  
  const riskMitigationEffectiveness = insights.filter(i => i.verified).length / insights.length;
  
  const riskDimension = {
    overallRiskScore,
    riskByCategory,
    highRiskPatterns,
    riskMitigationEffectiveness
  };

  // Impact Dimension Analysis
  const totalEconomicImpact = wsjfResults.reduce((sum, result) => 
    sum + (result.wsjfScore * result.parameters.jobDuration), 0);
  
  const impactByWorkload: Record<string, number> = {};
  const highImpactPatterns: string[] = [];
  
  for (const result of wsjfResults) {
    impactByWorkload[result.category] = (impactByWorkload[result.category] || 0) + 
      (result.wsjfScore * result.parameters.jobDuration);
    if (result.recommendation === 'IMMEDIATE' || result.recommendation === 'HIGH') {
      highImpactPatterns.push(result.pattern);
    }
  }
  
  const verifiedInsights = insights.filter(i => i.verified);
  const improvementRate = verifiedInsights.length / insights.length;
  
  const impactDimension = {
    totalEconomicImpact,
    impactByWorkload,
    highImpactPatterns,
    improvementRate
  };

  // Time Dimension Analysis
  const actionItems = insights.filter(i => i.type === 'action_item');
  const resolvedItems = actionItems.filter(i => i.status === 'resolved');
  
  const avgResolutionTime = resolvedItems.length > 0 ? 
    resolvedItems.reduce((sum, item) => {
      const created = new Date(item.created_at || '').getTime();
      const resolved = new Date(item.ts || '').getTime();
      return sum + (resolved - created) / (24 * 60 * 60 * 1000); // days to ms
    }, 0) / resolvedItems.length : 0;

  // Identify bottlenecks (patterns with high avg resolution time)
  const bottlenecks = wsjfResults
    .filter(result => result.parameters.jobDuration > 10)
    .map(result => result.pattern);

  const efficiency = avgResolutionTime > 0 ? 100 / (1 + avgResolutionTime / 1000) : 0; // inverse of avg days

  const timeDimension = {
    avgResolutionTime,
    timeByComplexity: wsjfResults.reduce((acc, result) => {
      const complexity = result.parameters.jobDuration;
      acc[complexity <= 5 ? 'Low' : complexity <= 10 ? 'Medium' : 'High'] = 
        (acc[complexity <= 5 ? 'Low' : complexity <= 10 ? 'Medium' : 'High'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bottlenecks,
    efficiency
  };

  return {
    costDimension,
    riskDimension,
    impactDimension,
    timeDimension
  };
}

/**
 * Generate trend analysis from historical data
 */
function generateTrendAnalysis(
  wsjfResults: WSJFResult[],
  patterns: PatternEvent[]
): EnhancedAnalyticsSummary['trendAnalysis'] {
  // Analyze COD trends
  const codTrends = wsjfResults.map(result => {
    const recentPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-5);
    const olderPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-10, -5);
    
    const recentAvg = recentPatterns.length > 0 ? 
      recentPatterns.reduce((sum, p) => sum + ((p as any).economic?.cod || 0), 0) / recentPatterns.length : 0;
    const olderAvg = olderPatterns.length > 0 ?
      olderPatterns.reduce((sum, p) => sum + ((p as any).economic?.cod || 0), 0) / olderPatterns.length : 0;
    
    const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = changePercent > 5 ? 'improving' : changePercent < -5 ? 'degrading' : 'stable';
    
    return { pattern: result.pattern, trend, changePercent };
  });

  // Analyze WSJF trends
  const wsjfTrends = wsjfResults.map(result => {
    const recentPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-3);
    const olderPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-6, -3);
    
    const recentAvg = recentPatterns.length > 0 ?
      recentPatterns.reduce((sum, p) => sum + ((p as any).economic?.wsjf_score || 0), 0) / recentPatterns.length : 0;
    const olderAvg = olderPatterns.length > 0 ?
      olderPatterns.reduce((sum, p) => sum + ((p as any).economic?.wsjf_score || 0), 0) / olderPatterns.length : 0;
    
    const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = changePercent > 10 ? 'improving' : changePercent < -10 ? 'degrading' : 'stable';
    
    return { pattern: result.pattern, trend, changePercent };
  });

  // Analyze risk trends
  const riskTrends = wsjfResults.map(result => {
    const recentPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-5);
    const olderPatterns = patterns.filter(p => p.pattern === result.pattern).slice(-10, -5);
    
    const recentAvg = recentPatterns.length > 0 ?
      recentPatterns.reduce((sum, p) => sum + (p.riskAssessment?.riskLevel || 0), 0) / recentPatterns.length : 0;
    const olderAvg = olderPatterns.length > 0 ?
      olderPatterns.reduce((sum, p) => sum + (p.riskAssessment?.riskLevel || 0), 0) / olderPatterns.length : 0;
    
    const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = changePercent > 5 ? 'improving' : changePercent < -5 ? 'degrading' : 'stable';
    
    return { pattern: result.pattern, trend, changePercent };
  });

  return {
    codTrends,
    wsjfTrends,
    riskTrends
  };
}

/**
 * Generate action item effectiveness analysis
 */
function generateActionItemEffectiveness(insights: Insight[]): EnhancedAnalyticsSummary['actionItemEffectiveness'] {
  const actionItems = insights.filter(i => i.type === 'action_item');
  const totalItems = actionItems.length;
  
  const verifiedItems = actionItems.filter(i => i.verified).length;
  const highImpactItems = actionItems.filter(i => i.highImpact).length;
  
  // Calculate average time to resolution
  const resolvedItems = actionItems.filter(i => i.status === 'resolved');
  const avgTimeToResolution = resolvedItems.length > 0 ? 
    resolvedItems.reduce((sum, item) => {
      const created = new Date(item.created_at || '').getTime();
      const resolved = new Date(item.ts || '').getTime();
      return sum + (resolved - created) / (24 * 60 * 60 * 1000); // days to ms
    }, 0) / resolvedItems.length : 0;
  
  const successRate = totalItems > 0 ? verifiedItems / totalItems : 0;

  return {
    totalItems,
    verifiedItems,
    highImpactItems,
    avgTimeToResolution,
    successRate
  };
}

/**
 * Enhanced main function with WSJF integration and advanced analytics
 */
async function main() {
  const goalieDir = getGoalieDirFromArgs();
  const jsonMode = process.argv.includes('--json');
  const wsjfMode = process.argv.includes('--wsjf');
  const analyticsMode = process.argv.includes('--analytics');
  const { iteration, runId } = getIterationFromArgs();

  const insightsPath = path.join(goalieDir, 'insights_log.jsonl');
  const patternsPath = path.join(goalieDir, 'pattern_metrics.jsonl');

  const insights = await readJsonl<Insight>(insightsPath);
  const patterns = await readJsonl<PatternEvent>(patternsPath);

  if (!insights.length && !patterns.length) {
    console.error('retro_coach_enhanced: no insights or pattern metrics found in', goalieDir);
    process.exitCode = 1;
    return;
  }

  const actionKeys = getActionKeys(goalieDir);
  const gaps = await computeTopEconomicGaps(patterns, actionKeys);

  // Initialize WSJF Calculator for enhanced analysis
  const wsjfCalculator = new WSJFCalculator(goalieDir);
  const wsjfResults = wsjfCalculator.calculateAndRank(patterns);
  const batchRecommendations = wsjfCalculator.generateRiskAwareBatches(wsjfResults);

  // Generate enhanced analytics
  const multiDimensionalMetrics = generateMultiDimensionalAnalytics(wsjfResults, patterns, insights);
  const trendAnalysis = generateTrendAnalysis(wsjfResults, patterns);
  const actionItemEffectiveness = generateActionItemEffectiveness(insights);

  const enhancedAnalyticsSummary: EnhancedAnalyticsSummary = {
    wsjfAnalysis: {
      totalItems: wsjfResults.length,
      topPriorityItems: wsjfResults.slice(0, 10),
      batchRecommendations,
      riskSummary: {
        overallRiskLevel: Math.round(
          wsjfResults.reduce((sum, result) => sum + result.riskAssessment.riskLevel, 0) / wsjfResults.length
        ),
        riskDistribution: {
          critical: wsjfResults.filter(r => r.riskAssessment.riskLevel >= 9).length,
          high: wsjfResults.filter(r => r.riskAssessment.riskLevel >= 7 && r.riskAssessment.riskLevel < 9).length,
          medium: wsjfResults.filter(r => r.riskAssessment.riskLevel >= 4 && r.riskAssessment.riskLevel < 7).length,
          low: wsjfResults.filter(r => r.riskAssessment.riskLevel < 4).length,
        },
        topRiskFactors: wsjfResults.length > 0 ? 
          Array.from(
            wsjfResults.reduce((acc, result) => {
              for (const [factor, value] of Object.entries(result.riskAssessment.factors)) {
                acc.set(factor, (acc.get(factor) || 0) + value);
              }
              return acc;
            }, new Map<string, number>())
              .entries()
          )
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([factor]) => factor) : [],
        mitigationStrategies: wsjfResults.length > 0 ? 
          Array.from(
            new Set(
              wsjfResults.flatMap(result => result.riskAssessment.mitigationStrategies)
            )
          ).slice(0, 5) : [],
      },
      economicImpact: {
        totalCostOfDelay: wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0),
        potentialSavings: wsjfResults.reduce((sum, result) => 
          sum + (result.wsjfScore * result.parameters.jobDuration), 0),
        priorityScore: wsjfResults.length > 0 ? wsjfResults[0].wsjfScore : 0,
        roi: wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0) > 0 ? 
          (wsjfResults.reduce((sum, result) => sum + (result.wsjfScore * result.parameters.jobDuration), 0) / 
           wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0)) * 100 : 0,
        timeToValue: wsjfResults.length > 0 ? 
          wsjfResults.reduce((sum, result) => sum + result.parameters.jobDuration, 0) / wsjfResults.length : 0,
      },
    },
    trendAnalysis,
    actionItemEffectiveness
  };

  // Enhanced JSON output
  const retroJsonOutput = {
    goalieDir,
    runId,
    iteration,
    timestamp: new Date().toISOString(),
    insightsSummary: {
      totalInsights: insights.length,
      verifiedCount: insights.filter(i => i.verified).length,
      recentInsights: insights.slice(-10).map(ins => ({
        ts: ins.ts,
        text: ins.text ?? JSON.stringify(ins),
      })),
    },
    topEconomicGaps: gaps.map(gap => ({
      pattern: gap.pattern,
      circle: gap.circle,
      depth: gap.depth,
      count: gap.count,
      codAvg: gap.codAvg,
      wsjfAvg: wsjfResults.find(r => r.pattern === gap.pattern)?.wsjfScore,
      workloadTags: gap.workloadTags || [],
      codThreshold: gap.codThreshold || 0,
      frameworkHint: gap.frameworkHint,
      schedulerHint: gap.schedulerHint,
    })),
    enhancedAnalytics: enhancedAnalyticsSummary,
    wsjfRecommendations: batchRecommendations,
    exit_code: 0,
  };

  if (jsonMode) {
    console.log(JSON.stringify(retroJsonOutput, null, 2));
  } else {
    console.log('=== Enhanced Retro Coach Analysis ===');
    console.log(`Iteration: ${iteration}`);
    console.log(`Run ID: ${runId}`);
    console.log(`WSJF Analysis: ${wsjfResults.length} items processed`);
    console.log(`Top Priority: ${wsjfResults[0]?.pattern || 'none'} (WSJF: ${wsjfResults[0]?.wsjfScore?.toFixed(2) || 'N/A'})`);
    console.log(`Batch Recommendations: ${batchRecommendations.length} batches generated`);
    console.log(`Overall Risk Level: ${enhancedAnalyticsSummary.wsjfAnalysis.riskSummary.overallRiskLevel}/10`);
    console.log(`Total Economic Impact: $${enhancedAnalyticsSummary.wsjfAnalysis.economicImpact.totalCostOfDelay.toFixed(2)}`);
    console.log(`Potential Savings: $${enhancedAnalyticsSummary.wsjfAnalysis.economicImpact.potentialSavings.toFixed(2)}`);
    console.log(`ROI: ${enhancedAnalyticsSummary.wsjfAnalysis.economicImpact.roi.toFixed(1)}%`);
  }

  // Publish enhanced retro analysis to stream
  const streamSocketPath = process.env.AF_STREAM_SOCKET ? resolveStreamSocket(goalieDir) : undefined;
  if (streamSocketPath) {
    try {
      const retroPayload = {
        type: 'retro-enhanced-analysis',
        data: {
          iteration,
          wsjfResults: wsjfResults.slice(0, 5),
          analytics: enhancedAnalyticsSummary,
          timestamp: new Date().toISOString()
        }
      };
      await publishStreamEvent(streamSocketPath, retroPayload);
    } catch (err) {
      console.warn('[retro_coach_enhanced] Failed to publish enhanced retro analysis:', err);
    }
  }
}

// Export the enhanced retro coach for use as a module
export {
  main,
  generateMultiDimensionalAnalytics,
  generateTrendAnalysis,
  generateActionItemEffectiveness,
  type WSJFResult,
  type BatchRecommendation,
  type Insight,
  type IterativeRCARecommendation,
  type RCATriggerResult,
  type EnhancedAnalyticsSummary,
  type MultiDimensionalMetrics
};
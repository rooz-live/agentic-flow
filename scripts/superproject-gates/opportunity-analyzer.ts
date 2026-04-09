/**
 * Opportunity Analysis and Prioritization Engine
 * 
 * Implements opportunity identification, analysis, and prioritization
 * for ROAM risk assessment framework with advanced scoring algorithms
 */

import { EventEmitter } from 'events';
import {
  Opportunity,
  OpportunityCategory,
  Risk,
  RiskAssessmentEvent,
  OpportunityMetrics
} from './types';

export interface OpportunityIdentificationRequest {
  title: string;
  description: string;
  category: OpportunityCategory;
  estimatedValue?: number;
  valueConfidence?: number;
  estimatedEffort?: number;
  riskReduction?: number;
  relatedRisks?: string[];
  source?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface OpportunityPattern {
  id: string;
  name: string;
  description: string;
  category: OpportunityCategory;
  typicalValueRange: {
    min: number;
    max: number;
  };
  typicalEffortRange: {
    min: number;
    max: number;
  };
  riskReductionPotential: number; // 0-100
  keywords: string[];
  indicators: string[];
  scoringFactors: {
    valueWeight: number;
    effortWeight: number;
    riskReductionWeight: number;
    strategicWeight: number;
  };
  confidence: number; // 0-100
}

export interface OpportunityScoringConfig {
  valueWeight: number;
  effortWeight: number;
  riskReductionWeight: number;
  strategicWeight: number;
  confidenceWeight: number;
  timeToValueWeight: number;
  resourceAvailabilityWeight: number;
}

export interface AdvancedScoringConfig {
  enableMachineLearning: boolean;
  enableHistoricalAnalysis: boolean;
  enableMarketAnalysis: boolean;
  enableCompetitiveAnalysis: boolean;
  enableRiskAdjustment: boolean;
  enableTimeDecay: boolean;
  enableResourceConstraints: boolean;
  enableStrategicAlignment: boolean;
  customWeights?: Record<string, number>;
  mlModelPath?: string;
  historicalDataWindow: number; // in days
  marketDataSources?: string[];
  competitiveIntelligenceEnabled: boolean;
}

export interface OpportunityBatchRequest {
  opportunities: OpportunityIdentificationRequest[];
  batchSize?: number;
  parallelProcessing?: boolean;
  enableProgressTracking?: boolean;
}

export interface OpportunityBatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Opportunity[];
  errors: Array<{
    index: number;
    error: string;
    request: OpportunityIdentificationRequest;
  }>;
  processingTime: number; // in milliseconds
}

export interface HistoricalTrendAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  totalOpportunities: number;
  averageValue: number;
  averageScore: number;
  successRate: number; // implemented/completed vs total
  valueByCategory: Record<OpportunityCategory, number>;
  scoreByCategory: Record<OpportunityCategory, number>;
  trends: {
    increasingCategories: OpportunityCategory[];
    decreasingCategories: OpportunityCategory[];
    emergingPatterns: string[];
  };
  recommendations: string[];
}

export interface ResourceCapacityAnalysis {
  totalCapacity: number; // in story points or days
  availableCapacity: number;
  allocatedCapacity: number;
  utilizationRate: number; // 0-100
  bySkill: Record<string, {
    available: number;
    allocated: number;
    utilization: number;
  }>;
  byCircle: Record<string, {
    available: number;
    allocated: number;
    utilization: number;
  }>;
  constraints: string[];
  recommendations: string[];
}

export class OpportunityAnalyzer extends EventEmitter {
  private opportunityPatterns: Map<string, OpportunityPattern> = new Map();
  private scoringConfig: OpportunityScoringConfig;
  private advancedConfig: AdvancedScoringConfig;
  private identifiedOpportunities: Map<string, Opportunity> = new Map();
  private historicalData: Map<string, Opportunity[]> = new Map();
  private resourceCapacity: ResourceCapacityAnalysis;

  constructor(
    scoringConfig?: Partial<OpportunityScoringConfig>,
    advancedConfig?: Partial<AdvancedScoringConfig>
  ) {
    super();
    this.scoringConfig = {
      valueWeight: 0.35,
      effortWeight: 0.20,
      riskReductionWeight: 0.20,
      strategicWeight: 0.15,
      confidenceWeight: 0.10,
      timeToValueWeight: 0.15,
      resourceAvailabilityWeight: 0.10,
      ...scoringConfig
    };

    this.advancedConfig = {
      enableMachineLearning: false,
      enableHistoricalAnalysis: true,
      enableMarketAnalysis: false,
      enableCompetitiveAnalysis: false,
      enableRiskAdjustment: true,
      enableTimeDecay: true,
      enableResourceConstraints: true,
      enableStrategicAlignment: true,
      historicalDataWindow: 90,
      ...advancedConfig
    };

    this.resourceCapacity = {
      totalCapacity: 100,
      availableCapacity: 100,
      allocatedCapacity: 0,
      utilizationRate: 0,
      bySkill: {},
      byCircle: {},
      constraints: [],
      recommendations: []
    };

    this.initializeOpportunityPatterns();
  }

  private initializeOpportunityPatterns(): void {
    // Cost reduction opportunities
    this.addOpportunityPattern({
      id: 'automation-cost-reduction',
      name: 'Automation Cost Reduction',
      description: 'Automate manual processes to reduce operational costs',
      category: 'cost_reduction',
      typicalValueRange: { min: 10000, max: 100000 },
      typicalEffortRange: { min: 5, max: 20 },
      riskReductionPotential: 30,
      keywords: ['automation', 'manual', 'process', 'efficiency', 'cost'],
      indicators: ['manual workarounds', 'repetitive tasks', 'process bottlenecks'],
      scoringFactors: {
        valueWeight: 0.4,
        effortWeight: 0.3,
        riskReductionWeight: 0.2,
        strategicWeight: 0.1
      },
      confidence: 85
    });

    this.addOpportunityPattern({
      id: 'infrastructure-optimization',
      name: 'Infrastructure Optimization',
      description: 'Optimize infrastructure to reduce costs and improve performance',
      category: 'cost_reduction',
      typicalValueRange: { min: 5000, max: 50000 },
      typicalEffortRange: { min: 3, max: 15 },
      riskReductionPotential: 25,
      keywords: ['infrastructure', 'cloud', 'optimization', 'scaling', 'performance'],
      indicators: ['high infrastructure costs', 'performance issues', 'underutilized resources'],
      scoringFactors: {
        valueWeight: 0.35,
        effortWeight: 0.25,
        riskReductionWeight: 0.25,
        strategicWeight: 0.15
      },
      confidence: 80
    });

    // Revenue increase opportunities
    this.addOpportunityPattern({
      id: 'new-feature-development',
      name: 'New Feature Development',
      description: 'Develop new features to increase revenue',
      category: 'revenue_increase',
      typicalValueRange: { min: 20000, max: 200000 },
      typicalEffortRange: { min: 10, max: 40 },
      riskReductionPotential: 10,
      keywords: ['feature', 'revenue', 'market', 'customer', 'product'],
      indicators: ['customer requests', 'market gaps', 'competitive opportunities'],
      scoringFactors: {
        valueWeight: 0.45,
        effortWeight: 0.2,
        riskReductionWeight: 0.1,
        strategicWeight: 0.25
      },
      confidence: 75
    });

    // Efficiency improvement opportunities
    this.addOpportunityPattern({
      id: 'process-improvement',
      name: 'Process Improvement',
      description: 'Improve processes to increase efficiency',
      category: 'efficiency_improvement',
      typicalValueRange: { min: 5000, max: 30000 },
      typicalEffortRange: { min: 2, max: 10 },
      riskReductionPotential: 20,
      keywords: ['process', 'workflow', 'efficiency', 'productivity', 'improvement'],
      indicators: ['process delays', 'quality issues', 'customer complaints'],
      scoringFactors: {
        valueWeight: 0.3,
        effortWeight: 0.35,
        riskReductionWeight: 0.2,
        strategicWeight: 0.15
      },
      confidence: 85
    });

    // Risk reduction opportunities
    this.addOpportunityPattern({
      id: 'security-enhancement',
      name: 'Security Enhancement',
      description: 'Enhance security to reduce risks',
      category: 'risk_reduction',
      typicalValueRange: { min: 15000, max: 75000 },
      typicalEffortRange: { min: 5, max: 25 },
      riskReductionPotential: 80,
      keywords: ['security', 'vulnerability', 'compliance', 'audit', 'risk'],
      indicators: ['security findings', 'audit issues', 'compliance gaps'],
      scoringFactors: {
        valueWeight: 0.25,
        effortWeight: 0.25,
        riskReductionWeight: 0.4,
        strategicWeight: 0.1
      },
      confidence: 90
    });

    // Innovation opportunities
    this.addOpportunityPattern({
      id: 'technology-innovation',
      name: 'Technology Innovation',
      description: 'Implement new technologies for competitive advantage',
      category: 'innovation',
      typicalValueRange: { min: 25000, max: 250000 },
      typicalEffortRange: { min: 15, max: 60 },
      riskReductionPotential: 15,
      keywords: ['innovation', 'technology', 'research', 'emerging', 'future'],
      indicators: ['technology gaps', 'market trends', 'competitive pressure'],
      scoringFactors: {
        valueWeight: 0.3,
        effortWeight: 0.15,
        riskReductionWeight: 0.15,
        strategicWeight: 0.4
      },
      confidence: 70
    });

    // Strategic opportunities
    this.addOpportunityPattern({
      id: 'strategic-partnership',
      name: 'Strategic Partnership',
      description: 'Form strategic partnerships for growth',
      category: 'strategic',
      typicalValueRange: { min: 50000, max: 500000 },
      typicalEffortRange: { min: 20, max: 90 },
      riskReductionPotential: 20,
      keywords: ['partnership', 'strategic', 'alliance', 'collaboration', 'growth'],
      indicators: ['market expansion needs', 'resource gaps', 'synergy opportunities'],
      scoringFactors: {
        valueWeight: 0.35,
        effortWeight: 0.15,
        riskReductionWeight: 0.1,
        strategicWeight: 0.4
      },
      confidence: 75
    });
  }

  public addOpportunityPattern(pattern: OpportunityPattern): void {
    this.opportunityPatterns.set(pattern.id, pattern);
  }

  public getOpportunityPattern(id: string): OpportunityPattern | undefined {
    return this.opportunityPatterns.get(id);
  }

  public getAllOpportunityPatterns(): OpportunityPattern[] {
    return Array.from(this.opportunityPatterns.values());
  }

  public async identifyOpportunity(request: OpportunityIdentificationRequest): Promise<Opportunity> {
    console.log(`[OPPORTUNITY-ANALYZER] Identifying opportunity: ${request.title}`);

    // Generate unique opportunity ID
    const opportunityId = this.generateId('opportunity');

    // Analyze opportunity using pattern matching
    const pattern = this.matchOpportunityPattern(request);

    // Calculate scores using advanced algorithms
    const scores = await this.calculateAdvancedOpportunityScores(request, pattern);

    // Create opportunity object
    const opportunity: Opportunity = {
      id: opportunityId,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: this.calculatePriority(scores),
      value: request.estimatedValue || scores.estimatedValue,
      valueConfidence: request.valueConfidence || scores.valueConfidence,
      effort: request.estimatedEffort || scores.estimatedEffort,
      riskReduction: request.riskReduction || scores.riskReduction,
      status: 'identified',
      score: scores.overall,
      identifiedAt: new Date(),
      lastReviewed: new Date(),
      tags: request.tags || [],
      dependencies: [],
      relatedRisks: request.relatedRisks || [],
      relatedOpportunities: [],
      metadata: {
        ...request.metadata,
        source: request.source || 'manual',
        patternMatch: pattern?.id,
        patternConfidence: pattern?.confidence || 0,
        advancedScoring: scores,
        mlPrediction: scores.mlPrediction,
        marketAnalysis: scores.marketAnalysis,
        competitiveAnalysis: scores.competitiveAnalysis
      },
      metrics: {
        initialScore: scores.overall,
        currentScore: scores.overall,
        scoreHistory: [{
          timestamp: new Date(),
          score: scores.overall,
          reason: 'Initial opportunity identification'
        }],
        implementationProgress: 0,
        lastUpdated: new Date()
      }
    };

    // Store opportunity
    this.identifiedOpportunities.set(opportunityId, opportunity);

    // Add to historical data
    this.addToHistoricalData(opportunity);

    // Emit event
    this.emit('opportunityIdentified', {
      type: 'opportunity_identified',
      timestamp: new Date(),
      opportunityId,
      data: { opportunity, pattern, scores },
      description: `Opportunity identified: ${opportunity.title}`
    } as RiskAssessmentEvent);

    console.log(`[OPPORTUNITY-ANALYZER] Opportunity identified with ID: ${opportunityId}, Score: ${scores.overall}, Category: ${request.category}`);

    return opportunity;
  }

  public async identifyBatchOpportunities(request: OpportunityBatchRequest): Promise<OpportunityBatchResult> {
    console.log(`[OPPORTUNITY-ANALYZER] Processing batch of ${request.opportunities.length} opportunities`);
    const startTime = Date.now();

    const results: Opportunity[] = [];
    const errors: Array<{ index: number; error: string; request: OpportunityIdentificationRequest }> = [];
    let successful = 0;
    let failed = 0;

    const batchSize = request.batchSize || 10;
    const parallelProcessing = request.parallelProcessing !== false;

    if (parallelProcessing) {
      // Process in parallel batches
      for (let i = 0; i < request.opportunities.length; i += batchSize) {
        const batch = request.opportunities.slice(i, i + batchSize);
        
        try {
          const batchPromises = batch.map(async (oppRequest, index) => {
            try {
              const opportunity = await this.identifyOpportunity(oppRequest);
              return { success: true, opportunity, index: i + index };
            } catch (error) {
              return { success: false, error: error.message, request: oppRequest, index: i + index };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(result => {
            if (result.success) {
              results.push(result.opportunity);
              successful++;
            } else {
              errors.push({
                index: result.index,
                error: result.error,
                request: result.request
              });
              failed++;
            }
          });

          if (request.enableProgressTracking) {
            this.emit('batchProgress', {
              type: 'batch_progress',
              timestamp: new Date(),
              data: { 
                processed: Math.min(i + batchSize, request.opportunities.length),
                total: request.opportunities.length,
                successful,
                failed
              },
              description: `Batch processing progress: ${Math.min(i + batchSize, request.opportunities.length)}/${request.opportunities.length}`
            } as RiskAssessmentEvent);
          }

        } catch (error) {
          console.error(`[OPPORTUNITY-ANALYZER] Batch processing error:`, error);
          // Add all items in this batch to errors
          batch.forEach((oppRequest, index) => {
            errors.push({
              index: i + index,
              error: error.message,
              request: oppRequest
            });
            failed++;
          });
        }
      }
    } else {
      // Process sequentially
      for (let i = 0; i < request.opportunities.length; i++) {
        try {
          const opportunity = await this.identifyOpportunity(request.opportunities[i]);
          results.push(opportunity);
          successful++;
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            request: request.opportunities[i]
          });
          failed++;
        }

        if (request.enableProgressTracking && (i + 1) % batchSize === 0) {
          this.emit('batchProgress', {
            type: 'batch_progress',
            timestamp: new Date(),
            data: { 
              processed: i + 1,
              total: request.opportunities.length,
              successful,
              failed
            },
            description: `Batch processing progress: ${i + 1}/${request.opportunities.length}`
          } as RiskAssessmentEvent);
        }
      }
    }

    const processingTime = Date.now() - startTime;

    const batchResult: OpportunityBatchResult = {
      totalProcessed: request.opportunities.length,
      successful,
      failed,
      results,
      errors,
      processingTime
    };

    // Emit completion event
    this.emit('batchCompleted', {
      type: 'batch_completed',
      timestamp: new Date(),
      data: { batchResult },
      description: `Batch processing completed: ${successful}/${request.opportunities.length} successful`
    } as RiskAssessmentEvent);

    console.log(`[OPPORTUNITY-ANALYZER] Batch processing completed: ${successful}/${request.opportunities.length} successful in ${processingTime}ms`);

    return batchResult;
  }

  private async calculateAdvancedOpportunityScores(
    request: OpportunityIdentificationRequest, 
    pattern?: OpportunityPattern
  ): Promise<{
    overall: number;
    estimatedValue: number;
    valueConfidence: number;
    estimatedEffort: number;
    riskReduction: number;
    valueScore: number;
    effortScore: number;
    riskReductionScore: number;
    strategicScore: number;
    confidenceScore: number;
    timeToValueScore: number;
    resourceAvailabilityScore: number;
    mlPrediction?: number;
    marketAnalysis?: {
      marketSize: number;
      growthRate: number;
      competitionLevel: number;
      score: number;
    };
    competitiveAnalysis?: {
      competitiveAdvantage: number;
      marketPosition: number;
      differentiationScore: number;
      score: number;
    };
  }> {
    // Use pattern defaults if not provided
    const estimatedValue = request.estimatedValue || 
      pattern ? (pattern.typicalValueRange.min + pattern.typicalValueRange.max) / 2 : 25000;

    const valueConfidence = request.valueConfidence || 
      (pattern ? pattern.confidence : 70);

    const estimatedEffort = request.estimatedEffort || 
      pattern ? (pattern.typicalEffortRange.min + pattern.typicalEffortRange.max) / 2 : 15;

    const riskReduction = request.riskReduction || 
      (pattern ? pattern.riskReductionPotential : 25);

    // Normalize scores to 0-100 scale
    const maxValue = 500000; // Maximum expected value
    const maxEffort = 90; // Maximum expected effort in days

    const valueScore = Math.min(100, (estimatedValue / maxValue) * 100);
    const effortScore = Math.max(0, 100 - (estimatedEffort / maxEffort) * 100); // Lower effort = higher score
    const riskReductionScore = riskReduction;
    const confidenceScore = valueConfidence;
    
    // Strategic score based on category and pattern
    const strategicScore = this.calculateStrategicScore(request.category, pattern);

    // Time to value score (quicker is better)
    const timeToValueScore = this.calculateTimeToValueScore(estimatedEffort, request.category);

    // Resource availability score
    const resourceAvailabilityScore = this.calculateResourceAvailabilityScore(request);

    // Use pattern-specific weights if available, otherwise use global config
    const weights = pattern?.scoringFactors || this.scoringConfig;

    // Calculate weighted overall score
    let overall = Math.round(
      (valueScore * weights.valueWeight) +
      (effortScore * weights.effortWeight) +
      (riskReductionScore * weights.riskReductionWeight) +
      (strategicScore * weights.strategicWeight) +
      (confidenceScore * weights.confidenceWeight) +
      (timeToValueScore * this.scoringConfig.timeToValueWeight) +
      (resourceAvailabilityScore * this.scoringConfig.resourceAvailabilityWeight)
    );

    // Apply advanced scoring adjustments
    if (this.advancedConfig.enableRiskAdjustment && request.relatedRisks && request.relatedRisks.length > 0) {
      overall = this.applyRiskAdjustment(overall, request.relatedRisks.length);
    }

    if (this.advancedConfig.enableTimeDecay) {
      overall = this.applyTimeDecay(overall, request);
    }

    if (this.advancedConfig.enableStrategicAlignment) {
      overall = this.applyStrategicAlignment(overall, request);
    }

    let mlPrediction, marketAnalysis, competitiveAnalysis;

    if (this.advancedConfig.enableMachineLearning) {
      mlPrediction = await this.applyMachineLearningScoring(request, pattern);
      overall = this.adjustScoreWithML(overall, mlPrediction);
    }

    if (this.advancedConfig.enableMarketAnalysis) {
      marketAnalysis = await this.performMarketAnalysis(request);
      overall = this.adjustScoreWithMarketAnalysis(overall, marketAnalysis);
    }

    if (this.advancedConfig.enableCompetitiveAnalysis) {
      competitiveAnalysis = await this.performCompetitiveAnalysis(request);
      overall = this.adjustScoreWithCompetitiveAnalysis(overall, competitiveAnalysis);
    }

    return {
      overall: Math.min(100, Math.max(0, overall)),
      estimatedValue,
      valueConfidence,
      estimatedEffort,
      riskReduction,
      valueScore,
      effortScore,
      riskReductionScore,
      strategicScore,
      confidenceScore,
      timeToValueScore,
      resourceAvailabilityScore,
      mlPrediction,
      marketAnalysis,
      competitiveAnalysis
    };
  }

  private calculateStrategicScore(category: OpportunityCategory, pattern?: OpportunityPattern): number {
    const categoryStrategicValues: Record<OpportunityCategory, number> = {
      'strategic': 90,
      'innovation': 85,
      'revenue_increase': 80,
      'risk_reduction': 75,
      'efficiency_improvement': 70,
      'cost_reduction': 65
    };

    const baseScore = categoryStrategicValues[category] || 50;
    
    // Adjust based on pattern confidence
    if (pattern) {
      return baseScore * (pattern.confidence / 100);
    }
    
    return baseScore;
  }

  private calculateTimeToValueScore(effort: number, category: OpportunityCategory): number {
    // Different categories have different time-to-value expectations
    const categoryMultipliers: Record<OpportunityCategory, number> = {
      'cost_reduction': 1.2, // Quick wins are valued higher
      'efficiency_improvement': 1.1,
      'risk_reduction': 1.0,
      'revenue_increase': 0.9, // Longer time to value is acceptable
      'innovation': 0.8,
      'strategic': 0.7
    };

    const multiplier = categoryMultipliers[category] || 1.0;
    const baseScore = Math.max(0, 100 - (effort / 30) * 100); // Normalize to 30-day max
    
    return Math.min(100, baseScore * multiplier);
  }

  private calculateResourceAvailabilityScore(request: OpportunityIdentificationRequest): number {
    // Check resource capacity constraints
    if (!this.advancedConfig.enableResourceConstraints) {
      return 80; // Default score
    }

    const utilizationRate = this.resourceCapacity.utilizationRate;
    const availableCapacity = this.resourceCapacity.availableCapacity;

    // Higher score when more resources are available
    let score = 80;
    
    if (utilizationRate > 80) {
      score = 40; // Low availability
    } else if (utilizationRate > 60) {
      score = 60; // Medium availability
    } else if (utilizationRate > 40) {
      score = 80; // Good availability
    } else {
      score = 95; // Excellent availability
    }

    // Adjust based on effort required vs available capacity
    if (request.estimatedEffort && availableCapacity > 0) {
      const effortRatio = request.estimatedEffort / availableCapacity;
      if (effortRatio > 0.8) {
        score *= 0.7; // High effort relative to capacity
      } else if (effortRatio > 0.5) {
        score *= 0.85; // Medium effort relative to capacity
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  private applyRiskAdjustment(score: number, relatedRisksCount: number): number {
    // Opportunities that address more risks get higher scores
    const adjustmentFactor = 1 + (relatedRisksCount * 0.05); // 5% bonus per related risk
    return Math.min(100, score * adjustmentFactor);
  }

  private applyTimeDecay(score: number, request: OpportunityIdentificationRequest): number {
    // Apply time decay if opportunity is getting old
    const daysSinceIdentification = 0; // New opportunity, so no decay
    
    if (daysSinceIdentification > 30) {
      const decayFactor = Math.max(0.7, 1 - (daysSinceIdentification - 30) * 0.01);
      return score * decayFactor;
    }
    
    return score;
  }

  private applyStrategicAlignment(score: number, request: OpportunityIdentificationRequest): number {
    // Boost score for opportunities aligned with strategic priorities
    const strategicKeywords = ['strategic', 'innovation', 'transformation', 'growth', 'competitive'];
    const text = `${request.title} ${request.description}`.toLowerCase();
    
    const alignmentScore = strategicKeywords.reduce((count, keyword) => {
      return count + (text.includes(keyword) ? 1 : 0);
    }, 0);

    if (alignmentScore >= 2) {
      return Math.min(100, score * 1.15); // 15% boost for strong alignment
    } else if (alignmentScore >= 1) {
      return Math.min(100, score * 1.08); // 8% boost for moderate alignment
    }
    
    return score;
  }

  private async applyMachineLearningScoring(
    request: OpportunityIdentificationRequest, 
    pattern?: OpportunityPattern
  ): Promise<number | undefined> {
    // Placeholder for ML scoring
    // In a real implementation, this would call a trained ML model
    if (!this.advancedConfig.enableMachineLearning) {
      return undefined;
    }

    // Simulate ML prediction based on pattern and request
    const baseScore = pattern ? pattern.confidence : 70;
    const variance = (Math.random() - 0.5) * 20; // ±10 variance
    
    return Math.max(0, Math.min(100, baseScore + variance));
  }

  private adjustScoreWithML(score: number, mlPrediction?: number): number {
    if (!mlPrediction) {
      return score;
    }

    // Weight the ML prediction with the calculated score
    const mlWeight = 0.3; // 30% weight for ML prediction
    const calculatedWeight = 0.7; // 70% weight for calculated score
    
    return Math.min(100, (score * calculatedWeight) + (mlPrediction * mlWeight));
  }

  private async performMarketAnalysis(request: OpportunityIdentificationRequest): Promise<{
    marketSize: number;
    growthRate: number;
    competitionLevel: number;
    score: number;
  } | undefined> {
    if (!this.advancedConfig.enableMarketAnalysis) {
      return undefined;
    }

    // Simulate market analysis
    const marketSize = Math.random() * 1000000; // Random market size
    const growthRate = Math.random() * 20; // Random growth rate
    const competitionLevel = Math.random() * 100; // Random competition level
    
    // Calculate market score based on size, growth, and competition
    const marketScore = (marketSize / 1000000 * 40) + (growthRate / 20 * 30) + ((100 - competitionLevel) / 100 * 30);
    
    return {
      marketSize,
      growthRate,
      competitionLevel,
      score: Math.min(100, marketScore)
    };
  }

  private adjustScoreWithMarketAnalysis(score: number, marketAnalysis?: any): number {
    if (!marketAnalysis) {
      return score;
    }

    const marketWeight = 0.2; // 20% weight for market analysis
    const calculatedWeight = 0.8; // 80% weight for calculated score
    
    return Math.min(100, (score * calculatedWeight) + (marketAnalysis.score * marketWeight));
  }

  private async performCompetitiveAnalysis(request: OpportunityIdentificationRequest): Promise<{
    competitiveAdvantage: number;
    marketPosition: number;
    differentiationScore: number;
    score: number;
  } | undefined> {
    if (!this.advancedConfig.enableCompetitiveAnalysis) {
      return undefined;
    }

    // Simulate competitive analysis
    const competitiveAdvantage = Math.random() * 100;
    const marketPosition = Math.random() * 100;
    const differentiationScore = Math.random() * 100;
    
    // Calculate competitive score
    const competitiveScore = (competitiveAdvantage * 0.4) + (marketPosition * 0.3) + (differentiationScore * 0.3);
    
    return {
      competitiveAdvantage,
      marketPosition,
      differentiationScore,
      score: Math.min(100, competitiveScore)
    };
  }

  private adjustScoreWithCompetitiveAnalysis(score: number, competitiveAnalysis?: any): number {
    if (!competitiveAnalysis) {
      return score;
    }

    const competitiveWeight = 0.15; // 15% weight for competitive analysis
    const calculatedWeight = 0.85; // 85% weight for calculated score
    
    return Math.min(100, (score * calculatedWeight) + (competitiveAnalysis.score * competitiveWeight));
  }

  private matchOpportunityPattern(request: OpportunityIdentificationRequest): OpportunityPattern | undefined {
    let bestMatch: OpportunityPattern | undefined;
    let bestScore = 0;

    const text = `${request.title} ${request.description}`.toLowerCase();

    for (const pattern of this.opportunityPatterns.values()) {
      let score = 0;

      // Check category match
      if (pattern.category === request.category) {
        score += 30;
      }

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 15;
        }
      }

      // Apply confidence factor
      score = score * (pattern.confidence / 100);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }

    return bestMatch;
  }

  private calculatePriority(scores: any): number {
    // Convert score to priority (1-10, higher is more important)
    return Math.max(1, Math.min(10, Math.round(scores.overall / 10)));
  }

  private addToHistoricalData(opportunity: Opportunity): void {
    const today = new Date().toDateString();
    if (!this.historicalData.has(today)) {
      this.historicalData.set(today, []);
    }
    
    const todayData = this.historicalData.get(today)!;
    todayData.push(opportunity);
    
    // Keep only data within the historical window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.advancedConfig.historicalDataWindow);
    
    for (const [date, data] of this.historicalData.entries()) {
      const dataDate = new Date(date);
      if (dataDate < cutoffDate) {
        this.historicalData.delete(date);
      }
    }
  }

  public async analyzeHistoricalTrends(days: number = 90): Promise<HistoricalTrendAnalysis> {
    console.log(`[OPPORTUNITY-ANALYZER] Analyzing historical trends for last ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Collect historical data
    const historicalOpportunities: Opportunity[] = [];
    for (const [date, opportunities] of this.historicalData.entries()) {
      const dataDate = new Date(date);
      if (dataDate >= startDate && dataDate <= endDate) {
        historicalOpportunities.push(...opportunities);
      }
    }

    // Calculate statistics
    const totalOpportunities = historicalOpportunities.length;
    const averageValue = totalOpportunities > 0 ? 
      historicalOpportunities.reduce((sum, opp) => sum + opp.value, 0) / totalOpportunities : 0;
    const averageScore = totalOpportunities > 0 ? 
      historicalOpportunities.reduce((sum, opp) => sum + opp.score, 0) / totalOpportunities : 0;
    
    const successRate = totalOpportunities > 0 ? 
      historicalOpportunities.filter(opp => opp.status === 'implemented').length / totalOpportunities : 0;

    // Calculate by category
    const valueByCategory: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    const scoreByCategory: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    const categoryCounts: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    for (const opportunity of historicalOpportunities) {
      valueByCategory[opportunity.category] += opportunity.value;
      scoreByCategory[opportunity.category] += opportunity.score;
      categoryCounts[opportunity.category]++;
    }

    // Calculate averages by category
    for (const category of Object.keys(valueByCategory) as OpportunityCategory[]) {
      if (categoryCounts[category] > 0) {
        valueByCategory[category] /= categoryCounts[category];
        scoreByCategory[category] /= categoryCounts[category];
      }
    }

    // Analyze trends
    const trends = this.analyzeCategoryTrends(historicalOpportunities);

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(trends, valueByCategory, scoreByCategory);

    const analysis: HistoricalTrendAnalysis = {
      period: { start: startDate, end: endDate },
      totalOpportunities,
      averageValue,
      averageScore,
      successRate,
      valueByCategory,
      scoreByCategory,
      trends,
      recommendations
    };

    // Emit event
    this.emit('trendsAnalyzed', {
      type: 'trends_analyzed',
      timestamp: new Date(),
      data: { analysis },
      description: `Historical trend analysis completed for ${days} days`
    } as RiskAssessmentEvent);

    return analysis;
  }

  private analyzeCategoryTrends(opportunities: Opportunity[]): {
    increasingCategories: OpportunityCategory[];
    decreasingCategories: OpportunityCategory[];
    emergingPatterns: string[];
  } {
    // Simple trend analysis - in a real implementation, this would be more sophisticated
    const recentOpportunities = opportunities.filter(opp => {
      const daysSinceIdentified = (new Date().getTime() - opp.identifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceIdentified <= 30; // Last 30 days
    });

    const olderOpportunities = opportunities.filter(opp => {
      const daysSinceIdentified = (new Date().getTime() - opp.identifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceIdentified > 30 && daysSinceIdentified <= 60; // 30-60 days ago
    });

    const recentCategoryCounts: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    const olderCategoryCounts: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    for (const opportunity of recentOpportunities) {
      recentCategoryCounts[opportunity.category]++;
    }

    for (const opportunity of olderOpportunities) {
      olderCategoryCounts[opportunity.category]++;
    }

    const increasingCategories: OpportunityCategory[] = [];
    const decreasingCategories: OpportunityCategory[] = [];

    for (const category of Object.keys(recentCategoryCounts) as OpportunityCategory[]) {
      const recentCount = recentCategoryCounts[category];
      const olderCount = olderCategoryCounts[category];
      
      if (recentCount > olderCount * 1.2) { // 20% increase
        increasingCategories.push(category);
      } else if (recentCount < olderCount * 0.8) { // 20% decrease
        decreasingCategories.push(category);
      }
    }

    // Identify emerging patterns from keywords
    const emergingPatterns: string[] = [];
    const keywordCounts: Record<string, number> = {};

    for (const opportunity of recentOpportunities) {
      const keywords = opportunity.tags;
      for (const keyword of keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    // Find keywords that appear frequently but weren't common before
    const threshold = Math.max(2, Math.floor(recentOpportunities.length * 0.1));
    for (const [keyword, count] of Object.entries(keywordCounts)) {
      if (count >= threshold) {
        emergingPatterns.push(keyword);
      }
    }

    return {
      increasingCategories,
      decreasingCategories,
      emergingPatterns
    };
  }

  private generateTrendRecommendations(
    trends: any,
    valueByCategory: Record<OpportunityCategory, number>,
    scoreByCategory: Record<OpportunityCategory, number>
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations based on increasing categories
    if (trends.increasingCategories.length > 0) {
      recommendations.push(`Focus on emerging opportunities in: ${trends.increasingCategories.join(', ')}`);
    }

    // Recommendations based on decreasing categories
    if (trends.decreasingCategories.length > 0) {
      recommendations.push(`Review declining opportunity areas: ${trends.decreasingCategories.join(', ')}`);
    }

    // Recommendations based on emerging patterns
    if (trends.emergingPatterns.length > 0) {
      recommendations.push(`Monitor emerging patterns: ${trends.emergingPatterns.join(', ')}`);
    }

    // Recommendations based on value
    const highValueCategories = Object.entries(valueByCategory)
      .filter(([_, value]) => value > 50000)
      .map(([category, _]) => category as OpportunityCategory);

    if (highValueCategories.length > 0) {
      recommendations.push(`Prioritize high-value categories: ${highValueCategories.join(', ')}`);
    }

    // Recommendations based on scores
    const highScoreCategories = Object.entries(scoreByCategory)
      .filter(([_, score]) => score > 70)
      .map(([category, _]) => category as OpportunityCategory);

    if (highScoreCategories.length > 0) {
      recommendations.push(`Focus on high-scoring categories: ${highScoreCategories.join(', ')}`);
    }

    return recommendations;
  }

  public updateResourceCapacity(analysis: ResourceCapacityAnalysis): void {
    this.resourceCapacity = analysis;
    
    this.emit('resourceCapacityUpdated', {
      type: 'resource_capacity_updated',
      timestamp: new Date(),
      data: { analysis },
      description: 'Resource capacity analysis updated'
    } as RiskAssessmentEvent);
  }

  public getResourceCapacity(): ResourceCapacityAnalysis {
    return { ...this.resourceCapacity };
  }

  public async assessOpportunity(opportunityId: string): Promise<Opportunity | undefined> {
    const opportunity = this.identifiedOpportunities.get(opportunityId);
    if (!opportunity) {
      return undefined;
    }

    // Recalculate scores with current data
    const scores = await this.calculateAdvancedOpportunityScores({
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      estimatedValue: opportunity.value,
      valueConfidence: opportunity.valueConfidence,
      estimatedEffort: opportunity.effort,
      riskReduction: opportunity.riskReduction,
      relatedRisks: opportunity.relatedRisks
    });

    // Update opportunity
    const updatedOpportunity: Opportunity = {
      ...opportunity,
      score: scores.overall,
      priority: this.calculatePriority(scores),
      status: 'evaluating',
      assessedAt: new Date(),
      lastReviewed: new Date(),
      metadata: {
        ...opportunity.metadata,
        advancedScoring: scores,
        lastAssessment: new Date()
      },
      metrics: {
        ...opportunity.metrics,
        currentScore: scores.overall,
        scoreHistory: [
          ...opportunity.metrics.scoreHistory,
          {
            timestamp: new Date(),
            score: scores.overall,
            reason: 'Opportunity assessment completed'
          }
        ],
        lastUpdated: new Date()
      }
    };

    this.identifiedOpportunities.set(opportunityId, updatedOpportunity);

    // Emit event
    this.emit('opportunityAssessed', {
      type: 'opportunity_assessed',
      timestamp: new Date(),
      opportunityId,
      data: { opportunity: updatedOpportunity, scores },
      description: `Opportunity assessed: ${updatedOpportunity.title}`
    } as RiskAssessmentEvent);

    return updatedOpportunity;
  }

  public async prioritizeOpportunities(): Promise<Opportunity[]> {
    const opportunities = this.getAllOpportunities();
    
    // Sort by score (descending), then by priority (descending)
    const prioritized = opportunities.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.priority - a.priority;
    });

    // Update status for top opportunities
    const topCount = Math.max(1, Math.floor(prioritized.length * 0.3)); // Top 30%
    for (let i = 0; i < prioritized.length; i++) {
      const opportunity = prioritized[i];
      if (opportunity.status === 'evaluating') {
        opportunity.status = i < topCount ? 'prioritized' : 'evaluating';
        opportunity.lastReviewed = new Date();
        this.identifiedOpportunities.set(opportunity.id, opportunity);
      }
    }

    return prioritized;
  }

  public getOpportunity(id: string): Opportunity | undefined {
    return this.identifiedOpportunities.get(id);
  }

  public getAllOpportunities(): Opportunity[] {
    return Array.from(this.identifiedOpportunities.values());
  }

  public getOpportunitiesByCategory(category: OpportunityCategory): Opportunity[] {
    return this.getAllOpportunities().filter(opp => opp.category === category);
  }

  public getOpportunitiesByStatus(status: Opportunity['status']): Opportunity[] {
    return this.getAllOpportunities().filter(opp => opp.status === status);
  }

  public getOpportunitiesByRisk(riskId: string): Opportunity[] {
    return this.getAllOpportunities().filter(opp => opp.relatedRisks.includes(riskId));
  }

  public updateOpportunity(opportunityId: string, updates: Partial<Opportunity>): Opportunity | undefined {
    const opportunity = this.identifiedOpportunities.get(opportunityId);
    if (!opportunity) {
      return undefined;
    }

    const updatedOpportunity = { 
      ...opportunity, 
      ...updates, 
      lastReviewed: new Date(),
      metrics: {
        ...opportunity.metrics,
        lastUpdated: new Date()
      }
    };
    
    this.identifiedOpportunities.set(opportunityId, updatedOpportunity);

    // Emit update event
    this.emit('opportunityUpdated', {
      type: 'opportunity_updated',
      timestamp: new Date(),
      opportunityId,
      data: { updates, opportunity: updatedOpportunity },
      description: `Opportunity updated: ${updatedOpportunity.title}`
    } as RiskAssessmentEvent);

    return updatedOpportunity;
  }

  public deleteOpportunity(opportunityId: string): boolean {
    const deleted = this.identifiedOpportunities.delete(opportunityId);
    if (deleted) {
      this.emit('opportunityDeleted', {
        type: 'opportunity_deleted',
        timestamp: new Date(),
        opportunityId,
        data: { opportunityId },
        description: `Opportunity deleted: ${opportunityId}`
      } as RiskAssessmentEvent);
    }
    return deleted;
  }

  public getOpportunityStatistics(): {
    total: number;
    byCategory: Record<OpportunityCategory, number>;
    byStatus: Record<Opportunity['status'], number>;
    totalValue: number;
    averageScore: number;
    averageConfidence: number;
  } {
    const opportunities = this.getAllOpportunities();
    
    const byCategory: Record<OpportunityCategory, number> = {
      cost_reduction: 0,
      revenue_increase: 0,
      efficiency_improvement: 0,
      risk_reduction: 0,
      innovation: 0,
      strategic: 0
    };

    const byStatus: Record<Opportunity['status'], number> = {
      identified: 0,
      evaluating: 0,
      prioritized: 0,
      accepted: 0,
      rejected: 0,
      implemented: 0
    };

    let totalScore = 0;
    let totalValue = 0;
    let totalConfidence = 0;

    for (const opportunity of opportunities) {
      byCategory[opportunity.category]++;
      byStatus[opportunity.status]++;
      totalScore += opportunity.score;
      totalValue += opportunity.value;
      totalConfidence += opportunity.valueConfidence;
    }

    return {
      total: opportunities.length,
      byCategory,
      byStatus,
      totalValue,
      averageScore: opportunities.length > 0 ? Math.round(totalScore / opportunities.length) : 0,
      averageConfidence: opportunities.length > 0 ? Math.round(totalConfidence / opportunities.length) : 0
    };
  }

  public getScoringConfig(): OpportunityScoringConfig {
    return { ...this.scoringConfig };
  }

  public updateScoringConfig(config: Partial<OpportunityScoringConfig>): void {
    this.scoringConfig = { ...this.scoringConfig, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.scoringConfig },
      description: 'Opportunity scoring configuration updated'
    } as RiskAssessmentEvent);
  }

  public getAdvancedConfig(): AdvancedScoringConfig {
    return { ...this.advancedConfig };
  }

  public updateAdvancedConfig(config: Partial<AdvancedScoringConfig>): void {
    this.advancedConfig = { ...this.advancedConfig, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.advancedConfig },
      description: 'Advanced opportunity analysis configuration updated'
    } as RiskAssessmentEvent);
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}
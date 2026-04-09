/**
 * WSJF System Integration for ROAM
 * 
 * Integrates the ROAM risk assessment framework with the Weighted Shortest Job First
 * (WSJF) system, enabling risk-adjusted prioritization, opportunity bonus
 * calculation, and dynamic WSJF recalculation based on risk and opportunity data.
 */

import { EventEmitter } from 'events';
import { 
  Risk, 
  RiskAssessmentEvent,
  RiskAssessmentEventType,
  RiskLevel,
  RiskStatus,
  Opportunity,
  OpportunityLevel
} from '../types';
import { EventPublisher } from '../../core/event-system';
import { Logger } from '../../core/logging';

/**
 * Configuration for WSJF integration
 */
export interface WSJFIntegrationConfig {
  /** WSJF calculation parameters */
  wsjfParameters: {
    /** Cost of Delay (CoD) multiplier */
    costOfDelayMultiplier: number;
    
    /** Job Size weighting */
    jobSizeWeight: number;
    
    /** Criticality weighting */
    criticalityWeight: number;
    
    /** User Business Value weighting */
    userBusinessValueWeight: number;
    
    /** Time Criticality weighting */
    timeCriticalityWeight: number;
    
    /** Risk Reduction weighting */
    riskReductionWeight: number;
    
    /** Opportunity Enablement weighting */
    opportunityEnablementWeight: number;
  };
  
  /** Risk adjustment parameters */
  riskAdjustment: {
    /** Enable risk-based WSJF adjustment */
    enableRiskAdjustment: boolean;
    
    /** Risk penalty factors */
    riskPenalties: {
      negligible: number;
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    
    /** Risk multiplier for WSJF */
    riskMultiplier: number;
    
    /** Maximum risk adjustment percentage */
    maxRiskAdjustment: number;
  };
  
  /** Opportunity bonus parameters */
  opportunityBonus: {
    /** Enable opportunity bonus calculation */
    enableOpportunityBonus: boolean;
    
    /** Opportunity bonus factors */
    bonusFactors: {
      negligible: number;
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    
    /** Opportunity multiplier for WSJF */
    opportunityMultiplier: number;
    
    /** Maximum opportunity bonus percentage */
    maxOpportunityBonus: number;
  };
  
  /** Dynamic recalculation */
  dynamicRecalculation: {
    /** Enable automatic WSJF recalculation */
    enableAutoRecalculation: boolean;
    
    /** Recalculation triggers */
    triggers: Array<{
      type: 'risk_change' | 'opportunity_change' | 'time_elapsed' | 'stakeholder_feedback';
      threshold: number;
      enabled: boolean;
    }>;
    
    /** Recalculation frequency (hours) */
    frequency: number;
    
    /** Minimum change threshold for recalculation */
    minChangeThreshold: number;
  };
}

/**
 * WSJF calculation result
 */
export interface WSJFCalculation {
  /** Calculation identifier */
  id: string;
  
  /** Item information */
  item: {
    id: string;
    name: string;
    type: 'risk_mitigation' | 'opportunity_exploitation' | 'feature_development';
    category: string;
  };
  
  /** WSJF components */
  components: {
    /** User Business Value */
    userBusinessValue: number;
    
    /** Time Criticality */
    timeCriticality: number;
    
    /** Risk Reduction */
    riskReduction: number;
    
    /** Opportunity Enablement */
    opportunityEnablement: number;
    
    /** Job Size */
    jobSize: number;
    
    /** Criticality */
    criticality: number;
  };
  
  /** WSJF calculation */
  calculation: {
    /** Raw WSJF score */
    rawScore: number;
    
    /** Risk-adjusted WSJF */
    riskAdjustedScore: number;
    
    /** Opportunity-enhanced WSJF */
    opportunityEnhancedScore: number;
    
    /** Final WSJF */
    finalScore: number;
    
    /** Risk adjustment amount */
    riskAdjustment: number;
    
    /** Opportunity bonus amount */
    opportunityBonus: number;
  };
  
  /** Calculation metadata */
  metadata: {
    calculationDate: Date;
    riskLevel?: RiskLevel;
    opportunityLevel?: OpportunityLevel;
    riskAdjustmentApplied: boolean;
    opportunityBonusApplied: boolean;
    confidence: number; // 0-100
  };
}

/**
 * WSJF priority ranking
 */
export interface WSJFPriorityRanking {
  /** Ranking identifier */
  id: string;
  
  /** Ranking metadata */
  metadata: {
    calculationDate: Date;
    totalItems: number;
    rankingMethod: 'wsjf' | 'risk_adjusted_wsjf' | 'opportunity_enhanced_wsjf';
    sortBy: 'score' | 'risk_level' | 'opportunity_level';
  };
  
  /** Ranked items */
  rankedItems: Array<{
    rank: number;
    itemId: string;
    itemName: string;
    wsjfScore: number;
    riskLevel?: RiskLevel;
    opportunityLevel?: OpportunityLevel;
    riskAdjustment: number;
    opportunityBonus: number;
    finalScore: number;
    priority: 'highest' | 'high' | 'medium' | 'low';
  }>;
  
  /** Ranking analysis */
  analysis: {
    /** Score distribution */
    scoreDistribution: {
      mean: number;
      median: number;
      standardDeviation: number;
      min: number;
      max: number;
      quartiles: {
        q1: number;
        q2: number;
        q3: number;
      };
    };
    
    /** Risk distribution */
    riskDistribution: {
      negligible: number;
      low: number;
      medium: number;
      high: number;
      critical: number;
      percentages: {
        negligible: number;
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
    };
    
    /** Opportunity distribution */
    opportunityDistribution: {
      negligible: number;
      low: number;
      medium: number;
      high: number;
      critical: number;
      percentages: {
        negligible: number;
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
    };
  };
}

/**
 * WSJF Integration System
 */
export class WSJFIntegration extends EventEmitter {
  private config: WSJFIntegrationConfig;
  private eventPublisher: EventPublisher;
  private logger: Logger;
  private wsjfCalculations: Map<string, WSJFCalculation> = new Map();
  private priorityRankings: Map<string, WSJFPriorityRanking> = new Map();

  constructor(
    config: WSJFIntegrationConfig,
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    super();
    this.config = config;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
    
    this.setupEventListeners();
  }

  /**
   * Calculate WSJF score for an item
   */
  async calculateWSJF(
    item: {
      id: string;
      name: string;
      type: 'risk_mitigation' | 'opportunity_exploitation' | 'feature_development';
      category: string;
      userBusinessValue?: number;
      timeCriticality?: number;
      jobSize?: number;
      criticality?: string;
    },
    riskContext?: {
      riskLevel?: RiskLevel;
      riskReductionPotential?: number;
    },
    opportunityContext?: {
      opportunityLevel?: OpportunityLevel;
      enablementPotential?: number;
    }
  ): Promise<WSJFCalculation> {
    this.logger.info(`[WSJF_INTEGRATION] Calculating WSJF for item ${item.id}`, {
      itemId: item.id,
      itemType: item.type,
      riskLevel: riskContext?.riskLevel,
      opportunityLevel: opportunityContext?.opportunityLevel
    });

    // Calculate WSJF components
    const userBusinessValue = item.userBusinessValue || 1;
    const timeCriticality = item.timeCriticality || 1;
    const riskReduction = riskContext?.riskReductionPotential || 1;
    const opportunityEnablement = opportunityContext?.enablementPotential || 1;
    const jobSize = item.jobSize || 1;
    const criticality = this.calculateCriticalityScore(item.criticality);

    // Calculate raw WSJF score
    const rawScore = this.calculateRawWSJF(
      userBusinessValue,
      timeCriticality,
      riskReduction,
      opportunityEnablement,
      jobSize,
      criticality
    );

    // Apply risk adjustment
    let riskAdjustment = 0;
    let riskAdjustedScore = rawScore;
    
    if (this.config.riskAdjustment.enableRiskAdjustment && riskContext?.riskLevel) {
      riskAdjustment = this.calculateRiskAdjustment(riskContext.riskLevel);
      riskAdjustedScore = Math.max(0, rawScore - riskAdjustment);
    }

    // Apply opportunity bonus
    let opportunityBonus = 0;
    let opportunityEnhancedScore = riskAdjustedScore;
    
    if (this.config.opportunityBonus.enableOpportunityBonus && opportunityContext?.opportunityLevel) {
      opportunityBonus = this.calculateOpportunityBonus(opportunityContext.opportunityLevel);
      opportunityEnhancedScore = riskAdjustedScore + opportunityBonus;
    }

    const calculation: WSJFCalculation = {
      id: `wsjf-${item.id}-${Date.now()}`,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.category
      },
      components: {
        userBusinessValue,
        timeCriticality,
        riskReduction,
        opportunityEnablement,
        jobSize,
        criticality
      },
      calculation: {
        rawScore,
        riskAdjustedScore,
        opportunityEnhancedScore,
        finalScore: opportunityEnhancedScore,
        riskAdjustment,
        opportunityBonus
      },
      metadata: {
        calculationDate: new Date(),
        riskLevel: riskContext?.riskLevel,
        opportunityLevel: opportunityContext?.opportunityLevel,
        riskAdjustmentApplied: riskAdjustment > 0,
        opportunityBonusApplied: opportunityBonus > 0,
        confidence: this.calculateConfidence(userBusinessValue, timeCriticality, riskReduction, opportunityEnablement, jobSize)
      }
    };

    // Store calculation
    this.wsjfCalculations.set(calculation.id, calculation);

    // Publish event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.WSJF_CALCULATED,
      timestamp: new Date(),
      data: {
        calculationId: calculation.id,
        itemId: item.id,
        itemType: item.type,
        rawScore,
        riskAdjustedScore,
        opportunityEnhancedScore,
        finalScore: calculation.calculation.finalScore,
        calculationDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[WSJF_INTEGRATION] WSJF calculation completed`, {
      calculationId: calculation.id,
      itemId: item.id,
      rawScore,
      riskAdjustedScore,
      opportunityEnhancedScore,
      finalScore: calculation.calculation.finalScore
    });

    return calculation;
  }

  /**
   * Create priority ranking for multiple items
   */
  async createPriorityRanking(
    items: Array<{
      id: string;
      name: string;
      type: 'risk_mitigation' | 'opportunity_exploitation' | 'feature_development';
      category: string;
      wsjfScore?: number;
      riskLevel?: RiskLevel;
      opportunityLevel?: OpportunityLevel;
      riskAdjustment?: number;
      opportunityBonus?: number;
    }>,
    rankingOptions?: {
      sortBy?: 'score' | 'risk_level' | 'opportunity_level';
      includeRiskAdjustment?: boolean;
      includeOpportunityBonus?: boolean;
    }
  ): Promise<WSJFPriorityRanking> {
    this.logger.info(`[WSJF_INTEGRATION] Creating priority ranking`, {
      itemCount: items.length,
      sortBy: rankingOptions?.sortBy || 'score'
    });

    // Calculate WSJF for items that don't have it
    const itemsWithWSJF = await Promise.all(
      items.map(async item => {
        if (!item.wsjfScore) {
          const wsjfCalc = await this.calculateWSJF(item, {
            riskLevel: item.riskLevel,
            riskReductionPotential: this.estimateRiskReductionPotential(item)
          }, {
            opportunityLevel: item.opportunityLevel,
            enablementPotential: this.estimateOpportunityEnablementPotential(item)
          });
          
          return {
            ...item,
            wsjfScore: wsjfCalc.calculation.finalScore,
            riskAdjustment: wsjfCalc.calculation.riskAdjustment,
            opportunityBonus: wsjfCalc.calculation.opportunityBonus
          };
        }
        return item;
      })
    );

    // Sort items based on ranking criteria
    const sortedItems = itemsWithWSJF;
    
    switch (rankingOptions?.sortBy || 'score') {
      case 'score':
        sortedItems.sort((a, b) => (b.wsjfScore || 0) - (a.wsjfScore || 0));
        break;
        
      case 'risk_level':
        sortedItems.sort((a, b) => this.compareRiskLevels(a.riskLevel, b.riskLevel));
        break;
        
      case 'opportunity_level':
        sortedItems.sort((a, b) => this.compareOpportunityLevels(a.opportunityLevel, b.opportunityLevel));
        break;
    }

    // Assign ranks and priorities
    const rankedItems = sortedItems.map((item, index) => {
      const score = item.wsjfScore || 0;
      let priority: 'highest' | 'high' | 'medium' | 'low';
      
      if (index === 0) {
        priority = 'highest';
      } else if (index < sortedItems.length * 0.2) {
        priority = 'high';
      } else if (index < sortedItems.length * 0.5) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        rank: index + 1,
        itemId: item.id,
        itemName: item.name,
        wsjfScore: score,
        riskLevel: item.riskLevel,
        opportunityLevel: item.opportunityLevel,
        riskAdjustment: item.riskAdjustment || 0,
        opportunityBonus: item.opportunityBonus || 0,
        finalScore: score,
        priority
      };
    });

    // Calculate ranking analysis
    const scores = rankedItems.map(item => item.wsjfScore || 0);
    const scoreDistribution = this.calculateScoreDistribution(scores);
    const riskDistribution = this.calculateRiskDistribution(rankedItems);
    const opportunityDistribution = this.calculateOpportunityDistribution(rankedItems);

    const ranking: WSJFPriorityRanking = {
      id: `ranking-${Date.now()}`,
      metadata: {
        calculationDate: new Date(),
        totalItems: rankedItems.length,
        rankingMethod: rankingOptions?.sortBy || 'score',
        sortBy: rankingOptions?.sortBy || 'score'
      },
      rankedItems,
      analysis: {
        scoreDistribution,
        riskDistribution,
        opportunityDistribution
      }
    };

    // Store ranking
    this.priorityRankings.set(ranking.id, ranking);

    // Publish event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.PRIORITY_RANKING_CREATED,
      timestamp: new Date(),
      data: {
        rankingId: ranking.id,
        itemCount: rankedItems.length,
        rankingMethod: ranking.metadata.rankingMethod,
        creationDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[WSJF_INTEGRATION] Priority ranking created`, {
      rankingId: ranking.id,
      itemCount: rankedItems.length,
      topItem: rankedItems[0]?.itemName
    });

    return ranking;
  }

  /**
   * Recalculate WSJF scores based on changes
   */
  async recalculateWSJF(
    triggerType: 'risk_change' | 'opportunity_change' | 'time_elapsed' | 'stakeholder_feedback',
    itemIds: string[]
  ): Promise<WSJFCalculation[]> {
    this.logger.info(`[WSJF_INTEGRATION] Recalculating WSJF scores`, {
      triggerType,
      itemCount: itemIds.length
    });

    const recalculations: WSJFCalculation[] = [];

    for (const itemId of itemIds) {
      const existingCalc = Array.from(this.wsjfCalculations.values())
        .find(calc => calc.item.id === itemId);
      
      if (existingCalc) {
        // Get updated risk and opportunity context
        const updatedRiskContext = await this.getUpdatedRiskContext(itemId);
        const updatedOpportunityContext = await this.getUpdatedOpportunityContext(itemId);
        
        // Recalculate WSJF with updated context
        const recalculation = await this.calculateWSJF(
          {
            id: itemId,
            name: existingCalc.item.name,
            type: existingCalc.item.type,
            category: existingCalc.item.category,
            userBusinessValue: existingCalc.components.userBusinessValue,
            timeCriticality: existingCalc.components.timeCriticality,
            jobSize: existingCalc.components.jobSize,
            criticality: this.getCriticalityFromScore(existingCalc.components.criticality)
          },
          updatedRiskContext,
          updatedOpportunityContext
        );
        
        recalculations.push(recalculation);
      }
    }

    // Publish recalculation event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.WSJF_RECALCULATED,
      timestamp: new Date(),
      data: {
        triggerType,
        itemCount: itemIds.length,
        recalculations: recalculations.map(r => r.id),
        recalculationDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[WSJF_INTEGRATION] WSJF recalculation completed`, {
      triggerType,
      recalculatedCount: recalculations.length
    });

    return recalculations;
  }

  /**
   * Analyze WSJF effectiveness
   */
  async analyzeWSJFEffectiveness(
    rankingId: string,
    actualImplementation: Array<{
      itemId: string;
      implementationTime: number;
      effectiveness: number;
      stakeholderSatisfaction: number;
    }>
  ): Promise<any> {
    this.logger.info(`[WSJF_INTEGRATION] Analyzing WSJF effectiveness`, {
      rankingId,
      implementationCount: actualImplementation.length
    });

    const ranking = this.priorityRankings.get(rankingId);
    if (!ranking) {
      throw new Error(`Priority ranking not found: ${rankingId}`);
    }

    // Analyze effectiveness by WSJF score quartiles
    const quartileAnalysis = this.analyzeEffectivenessByQuartile(ranking, actualImplementation);
    
    // Analyze correlation between WSJF score and effectiveness
    const correlationAnalysis = this.analyzeScoreEffectivenessCorrelation(ranking, actualImplementation);
    
    const effectiveness = {
      quartileAnalysis,
      correlationAnalysis,
      recommendations: this.generateWSJFEffectivenessRecommendations(quartileAnalysis, correlationAnalysis),
      overallEffectiveness: actualImplementation.reduce((sum, impl) => sum + impl.effectiveness, 0) / actualImplementation.length
    };

    // Publish effectiveness analysis event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.WSJF_EFFECTIVENESS_ANALYZED,
      timestamp: new Date(),
      data: {
        rankingId,
        effectiveness,
        analysisDate: new Date()
      }
    } as RiskAssessmentEvent);

    return effectiveness;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for risk assessment events
    this.eventPublisher.on(RiskAssessmentEventType.RISK_LEVEL_CHANGED, async (event: RiskAssessmentEvent) => {
      if (this.config.dynamicRecalculation.enableAutoRecalculation) {
        const trigger = this.config.dynamicRecalculation.triggers.find(t => t.type === 'risk_change');
        if (trigger && trigger.enabled) {
          await this.recalculateWSJF('risk_change', [event.data.riskId as string]);
        }
      }
    });

    this.eventPublisher.on(RiskAssessmentEventType.OPPORTUNITY_LEVEL_CHANGED, async (event: RiskAssessmentEvent) => {
      if (this.config.dynamicRecalculation.enableAutoRecalculation) {
        const trigger = this.config.dynamicRecalculation.triggers.find(t => t.type === 'opportunity_change');
        if (trigger && trigger.enabled) {
          await this.recalculateWSJF('opportunity_change', [event.data.opportunityId as string]);
        }
      }
    });

    // Set up periodic recalculation
    if (this.config.dynamicRecalculation.enableAutoRecalculation) {
      setInterval(async () => {
        const trigger = this.config.dynamicRecalculation.triggers.find(t => t.type === 'time_elapsed');
        if (trigger && trigger.enabled) {
          const allItemIds = Array.from(this.wsjfCalculations.keys());
          await this.recalculateWSJF('time_elapsed', allItemIds);
        }
      }, this.config.dynamicRecalculation.frequency * 60 * 60 * 1000); // Convert hours to milliseconds
    }
  }

  /**
   * Calculate raw WSJF score
   */
  private calculateRawWSJF(
    userBusinessValue: number,
    timeCriticality: number,
    riskReduction: number,
    opportunityEnablement: number,
    jobSize: number,
    criticality: number
  ): number {
    const params = this.config.wsjfParameters;
    
    return (
      userBusinessValue * params.userBusinessValueWeight +
      timeCriticality * params.timeCriticalityWeight +
      riskReduction * params.riskReductionWeight +
      opportunityEnablement * params.opportunityEnablementWeight +
      jobSize * params.jobSizeWeight +
      criticality * params.criticalityWeight
    ) / (
      params.userBusinessValueWeight +
      params.timeCriticalityWeight +
      params.riskReductionWeight +
      params.opportunityEnablementWeight +
      params.jobSizeWeight +
      params.criticalityWeight
    );
  }

  /**
   * Calculate criticality score
   */
  private calculateCriticalityScore(criticality?: string): number {
    if (!criticality) return 1;
    
    switch (criticality.toLowerCase()) {
      case 'highest':
        return 5;
      case 'high':
        return 4;
      case 'medium':
        return 3;
      case 'low':
        return 2;
      case 'lowest':
        return 1;
      default:
        return 3; // Default to medium
    }
  }

  /**
   * Get criticality string from score
   */
  private getCriticalityFromScore(score: number): string {
    if (score >= 5) return 'highest';
    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    if (score >= 2) return 'low';
    return 'lowest';
  }

  /**
   * Calculate risk adjustment
   */
  private calculateRiskAdjustment(riskLevel?: RiskLevel): number {
    if (!riskLevel) return 0;
    
    const penalties = this.config.riskAdjustment.riskPenalties;
    const penalty = penalties[riskLevel] || 0;
    
    return penalty * this.config.riskAdjustment.riskMultiplier;
  }

  /**
   * Calculate opportunity bonus
   */
  private calculateOpportunityBonus(opportunityLevel?: OpportunityLevel): number {
    if (!opportunityLevel) return 0;
    
    const bonuses = this.config.opportunityBonus.bonusFactors;
    const bonus = bonuses[opportunityLevel] || 0;
    
    return bonus * this.config.opportunityBonus.opportunityMultiplier;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    userBusinessValue: number,
    timeCriticality: number,
    riskReduction: number,
    opportunityEnablement: number,
    jobSize: number
  ): number {
    // Simple confidence calculation based on input quality
    const hasAllInputs = userBusinessValue > 0 && timeCriticality > 0 && 
                          riskReduction > 0 && opportunityEnablement > 0 && jobSize > 0;
    
    if (hasAllInputs) {
      return 90; // High confidence with all inputs
    } else {
      const inputCount = [userBusinessValue, timeCriticality, riskReduction, opportunityEnablement, jobSize]
        .filter(val => val > 0).length;
      return Math.min(90, inputCount * 18); // Scale confidence based on input completeness
    }
  }

  /**
   * Compare risk levels for sorting
   */
  private compareRiskLevels(level1?: RiskLevel, level2?: RiskLevel): number {
    const levelOrder = {
      [RiskLevel.CRITICAL]: 5,
      [RiskLevel.HIGH]: 4,
      [RiskLevel.MEDIUM]: 3,
      [RiskLevel.LOW]: 2,
      [RiskLevel.NEGLIGIBLE]: 1
    };
    
    const score1 = level1 ? levelOrder[level1] : 0;
    const score2 = level2 ? levelOrder[level2] : 0;
    
    return score2 - score1; // Higher risk level comes first (negative for descending sort)
  }

  /**
   * Compare opportunity levels for sorting
   */
  private compareOpportunityLevels(level1?: OpportunityLevel, level2?: OpportunityLevel): number {
    const levelOrder = {
      [OpportunityLevel.CRITICAL]: 5,
      [OpportunityLevel.HIGH]: 4,
      [OpportunityLevel.MEDIUM]: 3,
      [OpportunityLevel.LOW]: 2,
      [OpportunityLevel.NEGLIGIBLE]: 1
    };
    
    const score1 = level1 ? levelOrder[level1] : 0;
    const score2 = level2 ? levelOrder[level2] : 0;
    
    return score2 - score1; // Higher opportunity level comes first (negative for descending sort)
  }

  /**
   * Estimate risk reduction potential
   */
  private estimateRiskReductionPotential(item: any): number {
    // Simple estimation based on item type
    switch (item.type) {
      case 'risk_mitigation':
        return 3; // High potential
      case 'opportunity_exploitation':
        return 1; // Low potential
      case 'feature_development':
        return 2; // Medium potential
      default:
        return 1;
    }
  }

  /**
   * Estimate opportunity enablement potential
   */
  private estimateOpportunityEnablementPotential(item: any): number {
    // Simple estimation based on item type
    switch (item.type) {
      case 'opportunity_exploitation':
        return 5; // High potential
      case 'risk_mitigation':
        return 2; // Medium potential
      case 'feature_development':
        return 3; // Medium potential
      default:
        return 1;
    }
  }

  /**
   * Get updated risk context
   */
  private async getUpdatedRiskContext(itemId: string): Promise<any> {
    // This would typically query from risk repository
    // For now, return placeholder
    return {
      riskLevel: RiskLevel.MEDIUM,
      riskReductionPotential: 2
    };
  }

  /**
   * Get updated opportunity context
   */
  private async getUpdatedOpportunityContext(itemId: string): Promise<any> {
    // This would typically query from opportunity repository
    // For now, return placeholder
    return {
      opportunityLevel: OpportunityLevel.MEDIUM,
      enablementPotential: 3
    };
  }

  /**
   * Calculate score distribution
   */
  private calculateScoreDistribution(scores: number[]): any {
    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);
    
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    return {
      mean,
      median: n % 2 === 0 ? (sorted[q2Index - 1] + sorted[q2Index]) / 2 : sorted[q2Index],
      standardDeviation,
      min: sorted[0],
      max: sorted[n - 1],
      quartiles: {
        q1: sorted[q1Index],
        q2: sorted[q2Index],
        q3: sorted[q3Index]
      }
    };
  }

  /**
   * Calculate risk distribution
   */
  private calculateRiskDistribution(rankedItems: any[]): any {
    const riskCounts = {
      negligible: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const total = rankedItems.length;
    
    for (const item of rankedItems) {
      if (item.riskLevel) {
        riskCounts[item.riskLevel]++;
      }
    }
    
    return {
      ...riskCounts,
      percentages: {
        negligible: (riskCounts.negligible / total) * 100,
        low: (riskCounts.low / total) * 100,
        medium: (riskCounts.medium / total) * 100,
        high: (riskCounts.high / total) * 100,
        critical: (riskCounts.critical / total) * 100
      }
    };
  }

  /**
   * Calculate opportunity distribution
   */
  private calculateOpportunityDistribution(rankedItems: any[]): any {
    const opportunityCounts = {
      negligible: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const total = rankedItems.length;
    
    for (const item of rankedItems) {
      if (item.opportunityLevel) {
        opportunityCounts[item.opportunityLevel]++;
      }
    }
    
    return {
      ...opportunityCounts,
      percentages: {
        negligible: (opportunityCounts.negligible / total) * 100,
        low: (opportunityCounts.low / total) * 100,
        medium: (opportunityCounts.medium / total) * 100,
        high: (opportunityCounts.high / total) * 100,
        critical: (opportunityCounts.critical / total) * 100
      }
    };
  }

  /**
   * Analyze effectiveness by quartile
   */
  private analyzeEffectivenessByQuartile(ranking: WSJFPriorityRanking, implementation: any[]): any {
    const quartiles = ranking.analysis.scoreDistribution.quartiles;
    const effectivenessByQuartile = {
      q1: [],
      q2: [],
      q3: [],
      q4: []
    };
    
    for (const impl of implementation) {
      const item = ranking.rankedItems.find(ranked => ranked.itemId === impl.itemId);
      if (!item) continue;
      
      const score = item.wsjfScore;
      
      if (score <= quartiles.q1) {
        effectivenessByQuartile.q1.push(impl);
      } else if (score <= quartiles.q2) {
        effectivenessByQuartile.q2.push(impl);
      } else if (score <= quartiles.q3) {
        effectivenessByQuartile.q3.push(impl);
      } else {
        effectivenessByQuartile.q4.push(impl);
      }
    }
    
    const avgEffectiveness = (quartile: string) => {
      const quartileData = effectivenessByQuartile[quartile];
      return quartileData.length > 0 ? 
        quartileData.reduce((sum, impl) => sum + impl.effectiveness, 0) / quartileData.length : 0;
    };
    
    return {
      q1: {
        items: effectivenessByQuartile.q1,
        averageEffectiveness: avgEffectiveness('q1'),
        wsjfRange: { min: 0, max: quartiles.q1 }
      },
      q2: {
        items: effectivenessByQuartile.q2,
        averageEffectiveness: avgEffectiveness('q2'),
        wsjfRange: { min: quartiles.q1, max: quartiles.q2 }
      },
      q3: {
        items: effectivenessByQuartile.q3,
        averageEffectiveness: avgEffectiveness('q3'),
        wsjfRange: { min: quartiles.q2, max: quartiles.q3 }
      },
      q4: {
        items: effectivenessByQuartile.q4,
        averageEffectiveness: avgEffectiveness('q4'),
        wsjfRange: { min: quartiles.q3, max: ranking.analysis.scoreDistribution.max }
      }
    };
  }

  /**
   * Analyze score-effectiveness correlation
   */
  private analyzeScoreEffectivenessCorrelation(ranking: WSJFPriorityRanking, implementation: any[]): any {
    const correlations = [];
    
    for (const impl of implementation) {
      const item = ranking.rankedItems.find(ranked => ranked.itemId === impl.itemId);
      if (!item) continue;
      
      correlations.push({
        itemId: impl.itemId,
        itemName: item.itemName,
        wsjfScore: item.wsjfScore,
        effectiveness: impl.effectiveness,
        stakeholderSatisfaction: impl.stakeholderSatisfaction,
        implementationTime: impl.implementationTime
      });
    }
    
    // Calculate correlation coefficient
    const scores = correlations.map(c => c.wsjfScore);
    const effectiveness = correlations.map(c => c.effectiveness);
    const correlation = this.calculateCorrelationCoefficient(scores, effectiveness);
    
    return {
      correlations,
      correlationCoefficient: correlation,
      interpretation: this.interpretCorrelation(correlation),
      recommendations: this.generateCorrelationRecommendations(correlation)
    };
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Interpret correlation
   */
  private interpretCorrelation(correlation: number): string {
    const abs = Math.abs(correlation);
    
    if (abs >= 0.8) return 'Strong positive correlation';
    if (abs >= 0.6) return 'Moderate positive correlation';
    if (abs >= 0.4) return 'Weak positive correlation';
    if (abs >= 0.2) return 'Very weak positive correlation';
    return 'No meaningful correlation';
  }

  /**
   * Generate correlation recommendations
   */
  private generateCorrelationRecommendations(correlation: number): string[] {
    const recommendations = [];
    const abs = Math.abs(correlation);
    
    if (abs < 0.4) {
      recommendations.push('WSJF scoring may not be effectively predicting implementation outcomes');
      recommendations.push('Consider adjusting WSJF weights or calculation method');
    }
    
    if (correlation < 0) {
      recommendations.push('Higher WSJF scores are correlating with lower effectiveness');
      recommendations.push('Review WSJF calculation parameters for potential biases');
    }
    
    return recommendations;
  }

  /**
   * Generate WSJF effectiveness recommendations
   */
  private generateWSJFEffectivenessRecommendations(quartileAnalysis: any, correlationAnalysis: any): string[] {
    const recommendations = [];
    
    // Analyze quartile performance
    const q1Effectiveness = quartileAnalysis.q1.averageEffectiveness;
    const q4Effectiveness = quartileAnalysis.q4.averageEffectiveness;
    
    if (q4Effectiveness < q1Effectiveness) {
      recommendations.push('Highest WSJF items showing lower effectiveness than expected');
      recommendations.push('Review WSJF calculation parameters for potential over-weighting');
    }
    
    if (correlationAnalysis.correlationCoefficient < 0.5) {
      recommendations.push('Weak correlation between WSJF scores and effectiveness');
      recommendations.push('Consider supplementing WSJF with additional prioritization criteria');
    }
    
    return recommendations;
  }

  /**
   * Get WSJF calculations
   */
  getWSJFCalculations(): Map<string, WSJFCalculation> {
    return new Map(this.wsjfCalculations);
  }

  /**
   * Get priority rankings
   */
  getPriorityRankings(): Map<string, WSJFPriorityRanking> {
    return new Map(this.priorityRankings);
  }

  /**
   * Clear WSJF calculation
   */
  clearWSJFCalculation(calculationId: string): void {
    this.wsjfCalculations.delete(calculationId);
  }

  /**
   * Clear priority ranking
   */
  clearPriorityRanking(rankingId: string): void {
    this.priorityRankings.delete(rankingId);
  }
}
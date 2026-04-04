/**
 * Circle Perspective Analyzer
 * 
 * Implements circle perspective analysis and decision lens tracking
 * with comprehensive analysis of circle roles, perspectives, and decision frameworks
 */

import { EventEmitter } from 'events';
import {
  TierLevel,
  CirclePerspective,
  DecisionLens,
  CircleCoverageMetrics,
  MaturityIndicators,
  ImprovementTrajectory,
  CoverageError
} from './types';
import { TierFramework } from './tier-framework';

export interface CircleProfile {
  circleId: string;
  circleName: string;
  primaryRole: string;
  secondaryRoles: string[];
  perspectiveType: 'strategic' | 'tactical' | 'operational' | 'analytical';
  characteristics: CircleCharacteristics;
  decisionFramework: DecisionFramework;
  maturityLevel: 'emerging' | 'developing' | 'mature' | 'optimizing' | 'innovating';
}

export interface CircleCharacteristics {
  focusAreas: string[];
  strengths: string[];
  challenges: string[];
  collaborationStyle: 'independent' | 'collaborative' | 'leading' | 'supporting';
  innovationLevel: 'conservative' | 'moderate' | 'progressive' | 'innovative';
  riskTolerance: 'low' | 'medium' | 'high';
  communicationStyle: 'formal' | 'structured' | 'flexible' | 'informal';
}

export interface DecisionFramework {
  primaryCriteria: string[];
  secondaryCriteria: string[];
  weightingFactors: Record<string, number>;
  approvalProcess: string[];
  escalationPaths: string[];
  stakeholderGroups: string[];
  decisionFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
}

export interface PerspectiveAnalysisConfig {
  enableHistoricalAnalysis: boolean;
  analysisWindow: number; // in days
  includeStakeholderFeedback: boolean;
  customPerspectiveTypes: string[];
  decisionTrackingEnabled: boolean;
  maturityAssessmentFrequency: number; // in days
}

export class CirclePerspectiveAnalyzer extends EventEmitter {
  private config: PerspectiveAnalysisConfig;
  private tierFramework: TierFramework;
  private circleProfiles: Map<string, CircleProfile> = new Map();
  private decisionHistory: Map<string, DecisionRecord[]> = new Map();
  private maturityHistory: Map<string, MaturitySnapshot[]> = new Map();

  constructor(
    tierFramework: TierFramework,
    config: Partial<PerspectiveAnalysisConfig> = {}
  ) {
    super();
    this.tierFramework = tierFramework;
    this.config = {
      enableHistoricalAnalysis: true,
      analysisWindow: 90, // 90 days
      includeStakeholderFeedback: true,
      customPerspectiveTypes: [],
      decisionTrackingEnabled: true,
      maturityAssessmentFrequency: 30, // 30 days
      ...config
    };

    this.initializeCircleProfiles();
  }

  /**
   * Initialize default circle profiles
   */
  private initializeCircleProfiles(): void {
    // Analyst Circle Profile
    this.circleProfiles.set('analyst', {
      circleId: 'analyst',
      circleName: 'Analyst Circle',
      primaryRole: 'data_analysis',
      secondaryRoles: ['pattern_recognition', 'performance_optimization', 'insights_generation'],
      perspectiveType: 'analytical',
      characteristics: {
        focusAreas: ['Data analysis', 'Pattern recognition', 'Performance metrics', 'Insights generation'],
        strengths: ['Analytical thinking', 'Data-driven decisions', 'Pattern identification', 'Detail-oriented'],
        challenges: ['Analysis paralysis', 'Over-reliance on data', 'Communication of complex insights'],
        collaborationStyle: 'collaborative',
        innovationLevel: 'moderate',
        riskTolerance: 'low',
        communicationStyle: 'structured'
      },
      decisionFramework: {
        primaryCriteria: ['data_quality', 'accuracy', 'relevance', 'timeliness'],
        secondaryCriteria: ['efficiency', 'scalability', 'maintainability'],
        weightingFactors: {
          data_quality: 0.3,
          accuracy: 0.25,
          relevance: 0.2,
          timeliness: 0.15,
          efficiency: 0.05,
          scalability: 0.03,
          maintainability: 0.02
        },
        approvalProcess: ['data_validation', 'peer_review', 'stakeholder_signoff'],
        escalationPaths: ['senior_analyst', 'data_governance', 'technical_lead'],
        stakeholderGroups: ['data_consumers', 'business_stakeholders', 'technical_teams'],
        decisionFrequency: 'weekly'
      },
      maturityLevel: 'mature'
    });

    // Assessor Circle Profile
    this.circleProfiles.set('assessor', {
      circleId: 'assessor',
      circleName: 'Assessor Circle',
      primaryRole: 'quality_assurance',
      secondaryRoles: ['compliance_monitoring', 'risk_assessment', 'quality_gates'],
      perspectiveType: 'operational',
      characteristics: {
        focusAreas: ['Quality assurance', 'Compliance monitoring', 'Risk assessment', 'Quality gates'],
        strengths: ['Attention to detail', 'Quality focus', 'Risk awareness', 'Compliance knowledge'],
        challenges: ['Bottleneck creation', 'Over-conservatism', 'Resistance to change'],
        collaborationStyle: 'supporting',
        innovationLevel: 'conservative',
        riskTolerance: 'low',
        communicationStyle: 'formal'
      },
      decisionFramework: {
        primaryCriteria: ['compliance', 'quality_standards', 'risk_mitigation', 'regulatory_requirements'],
        secondaryCriteria: ['efficiency', 'user_satisfaction', 'maintainability'],
        weightingFactors: {
          compliance: 0.35,
          quality_standards: 0.3,
          risk_mitigation: 0.2,
          regulatory_requirements: 0.1,
          efficiency: 0.03,
          user_satisfaction: 0.02
        },
        approvalProcess: ['quality_check', 'compliance_review', 'risk_assessment', 'final_approval'],
        escalationPaths: ['quality_manager', 'compliance_officer', 'risk_committee'],
        stakeholderGroups: ['regulators', 'quality_teams', 'business_owners', 'end_users'],
        decisionFrequency: 'bi-weekly'
      },
      maturityLevel: 'mature'
    });

    // Innovator Circle Profile
    this.circleProfiles.set('innovator', {
      circleId: 'innovator',
      circleName: 'Innovator Circle',
      primaryRole: 'innovation_development',
      secondaryRoles: ['research', 'prototyping', 'experimentation', 'new_technologies'],
      perspectiveType: 'strategic',
      characteristics: {
        focusAreas: ['Innovation development', 'Research', 'Prototyping', 'Experimentation', 'New technologies'],
        strengths: ['Creativity', 'Forward-thinking', 'Experimentation', 'Technology awareness'],
        challenges: ['Resource constraints', 'Uncertainty management', 'Stakeholder buy-in'],
        collaborationStyle: 'leading',
        innovationLevel: 'innovative',
        riskTolerance: 'high',
        communicationStyle: 'flexible'
      },
      decisionFramework: {
        primaryCriteria: ['innovation_potential', 'market_impact', 'technical_feasibility', 'strategic_alignment'],
        secondaryCriteria: ['resource_efficiency', 'time_to_market', 'scalability', 'competitive_advantage'],
        weightingFactors: {
          innovation_potential: 0.3,
          market_impact: 0.25,
          technical_feasibility: 0.2,
          strategic_alignment: 0.15,
          resource_efficiency: 0.05,
          time_to_market: 0.03,
          scalability: 0.02
        },
        approvalProcess: ['concept_review', 'feasibility_study', 'prototype_evaluation', 'go_no_go_decision'],
        escalationPaths: ['innovation_committee', 'executive_sponsor', 'technical_advisory_board'],
        stakeholderGroups: ['executives', 'investors', 'product_teams', 'customers'],
        decisionFrequency: 'monthly'
      },
      maturityLevel: 'developing'
    });

    // Intuitive Circle Profile
    this.circleProfiles.set('intuitive', {
      circleId: 'intuitive',
      circleName: 'Intuitive Circle',
      primaryRole: 'user_experience',
      secondaryRoles: ['interface_design', 'usability_testing', 'user_feedback', 'empathy_mapping'],
      perspectiveType: 'analytical',
      characteristics: {
        focusAreas: ['User experience', 'Interface design', 'Usability testing', 'User feedback', 'Empathy mapping'],
        strengths: ['User empathy', 'Design thinking', 'Intuition', 'Aesthetic sense'],
        challenges: ['Subjectivity', 'Quantification difficulty', 'Stakeholder alignment'],
        collaborationStyle: 'collaborative',
        innovationLevel: 'progressive',
        riskTolerance: 'medium',
        communicationStyle: 'flexible'
      },
      decisionFramework: {
        primaryCriteria: ['user_satisfaction', 'usability', 'accessibility', 'emotional_impact'],
        secondaryCriteria: ['aesthetic_appeal', 'performance', 'maintainability', 'learning_curve'],
        weightingFactors: {
          user_satisfaction: 0.35,
          usability: 0.3,
          accessibility: 0.15,
          emotional_impact: 0.1,
          aesthetic_appeal: 0.05,
          performance: 0.03,
          maintainability: 0.02
        },
        approvalProcess: ['user_testing', 'expert_review', 'accessibility_audit', 'stakeholder_feedback'],
        escalationPaths: ['ux_lead', 'product_manager', 'customer_advocate'],
        stakeholderGroups: ['users', 'design_team', 'product_team', 'accessibility_experts'],
        decisionFrequency: 'weekly'
      },
      maturityLevel: 'developing'
    });

    // Orchestrator Circle Profile
    this.circleProfiles.set('orchestrator', {
      circleId: 'orchestrator',
      circleName: 'Orchestrator Circle',
      primaryRole: 'coordination',
      secondaryRoles: ['workflow_management', 'resource_allocation', 'dependency_management', 'communication'],
      perspectiveType: 'operational',
      characteristics: {
        focusAreas: ['Coordination', 'Workflow management', 'Resource allocation', 'Dependency management', 'Communication'],
        strengths: ['Systems thinking', 'Coordination', 'Communication', 'Big picture view'],
        challenges: ['Complexity management', 'Bottleneck resolution', 'Resource conflicts'],
        collaborationStyle: 'leading',
        innovationLevel: 'moderate',
        riskTolerance: 'medium',
        communicationStyle: 'structured'
      },
      decisionFramework: {
        primaryCriteria: ['system_efficiency', 'resource_optimization', 'workflow_smoothness', 'dependency_resolution'],
        secondaryCriteria: ['stakeholder_satisfaction', 'timeline_adherence', 'quality_maintenance'],
        weightingFactors: {
          system_efficiency: 0.3,
          resource_optimization: 0.25,
          workflow_smoothness: 0.2,
          dependency_resolution: 0.15,
          stakeholder_satisfaction: 0.05,
          timeline_adherence: 0.03,
          quality_maintenance: 0.02
        },
        approvalProcess: ['impact_assessment', 'resource_review', 'stakeholder_consultation', 'final_coordination'],
        escalationPaths: ['project_manager', 'program_manager', 'executive_committee'],
        stakeholderGroups: ['all_circles', 'executives', 'external_partners', 'customers'],
        decisionFrequency: 'daily'
      },
      maturityLevel: 'mature'
    });

    // Seeker Circle Profile
    this.circleProfiles.set('seeker', {
      circleId: 'seeker',
      circleName: 'Seeker Circle',
      primaryRole: 'opportunity_identification',
      secondaryRoles: ['market_research', 'competitive_analysis', 'trend_monitoring', 'opportunity_evaluation'],
      perspectiveType: 'strategic',
      characteristics: {
        focusAreas: ['Opportunity identification', 'Market research', 'Competitive analysis', 'Trend monitoring', 'Opportunity evaluation'],
        strengths: ['Curiosity', 'Research skills', 'Pattern recognition', 'Strategic thinking'],
        challenges: ['Information overload', 'Validation difficulty', 'Timing uncertainty'],
        collaborationStyle: 'independent',
        innovationLevel: 'innovative',
        riskTolerance: 'high',
        communicationStyle: 'flexible'
      },
      decisionFramework: {
        primaryCriteria: ['market_potential', 'strategic_fit', 'competitive_advantage', 'timing'],
        secondaryCriteria: ['resource_requirements', 'risk_level', 'innovation_degree', 'scalability'],
        weightingFactors: {
          market_potential: 0.3,
          strategic_fit: 0.25,
          competitive_advantage: 0.2,
          timing: 0.15,
          resource_requirements: 0.05,
          risk_level: 0.03,
          innovation_degree: 0.02
        },
        approvalProcess: ['opportunity_validation', 'market_research', 'competitive_analysis', 'go_no_go_assessment'],
        escalationPaths: ['innovation_committee', 'strategy_team', 'executive_sponsor'],
        stakeholderGroups: ['executives', 'investors', 'product_teams', 'market_analysts'],
        decisionFrequency: 'weekly'
      },
      maturityLevel: 'emerging'
    });
  }

  /**
   * Analyze circle perspective
   */
  public async analyzeCirclePerspective(
    circleId: string,
    coverageMetrics: CircleCoverageMetrics,
    historicalData?: any
  ): Promise<CirclePerspective> {
    try {
      const profile = this.circleProfiles.get(circleId);
      if (!profile) {
        throw new CoverageError(
          'CIRCLE_NOT_FOUND',
          `Circle profile not found: ${circleId}`,
          { circleId }
        );
      }

      // Create decision lens based on profile and current metrics
      const decisionLens = this.createDecisionLens(profile, coverageMetrics);

      // Calculate maturity indicators
      const maturityIndicators = this.calculateMaturityIndicators(
        profile,
        coverageMetrics,
        historicalData
      );

      // Generate improvement trajectory
      const improvementTrajectory = this.generateImprovementTrajectory(
        profile,
        maturityIndicators,
        coverageMetrics
      );

      const perspective: CirclePerspective = {
        circleId,
        circleName: profile.circleName,
        perspectiveType: profile.perspectiveType,
        decisionLens,
        coverageMetrics,
        maturityIndicators,
        improvementTrajectory
      };

      this.emit('perspectiveAnalyzed', perspective);
      return perspective;

    } catch (error) {
      const analysisError = new CoverageError(
        'PERSPECTIVE_ANALYSIS_FAILED',
        `Failed to analyze perspective for circle: ${circleId}`,
        { 
          circleId,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      this.emit('analysisError', analysisError);
      throw analysisError;
    }
  }

  /**
   * Create decision lens based on profile and metrics
   */
  private createDecisionLens(
    profile: CircleProfile,
    coverageMetrics: CircleCoverageMetrics
  ): DecisionLens {
    // Adjust weighting factors based on current performance
    const adjustedWeightings = this.adjustWeightings(
      profile.decisionFramework.weightingFactors,
      coverageMetrics
    );

    // Determine risk tolerance based on maturity and performance
    const riskTolerance = this.calculateRiskTolerance(
      profile.characteristics.riskTolerance,
      coverageMetrics
    );

    // Determine innovation preference based on performance and trends
    const innovationPreference = this.calculateInnovationPreference(
      profile.characteristics.innovationLevel,
      coverageMetrics
    );

    return {
      primaryFocus: profile.decisionFramework.primaryCriteria,
      secondaryFocus: profile.decisionFramework.secondaryCriteria,
      decisionCriteria: [...profile.decisionFramework.primaryCriteria, ...profile.decisionFramework.secondaryCriteria],
      weightings: adjustedWeightings,
      riskTolerance,
      innovationPreference
    };
  }

  /**
   * Calculate maturity indicators
   */
  private calculateMaturityIndicators(
    profile: CircleProfile,
    coverageMetrics: CircleCoverageMetrics,
    historicalData?: any
  ): MaturityIndicators {
    // Base maturity on profile level and current performance
    const baseMaturity = this.getBaseMaturityScore(profile.maturityLevel);

    // Adjust based on coverage metrics
    const processMaturity = Math.min(100, baseMaturity + (coverageMetrics.processMaturity - 50) * 0.5);
    const qualityMaturity = Math.min(100, baseMaturity + (coverageMetrics.schemaCompliance - 50) * 0.3);
    const governanceMaturity = Math.min(100, baseMaturity + (coverageMetrics.tierDistribution['high-structure'] || 0) * 0.2);
    const innovationMaturity = Math.min(100, baseMaturity + (coverageMetrics.economicImpact - 50) * 0.4);

    const overallMaturity = (processMaturity + qualityMaturity + governanceMaturity + innovationMaturity) / 4;

    return {
      processMaturity: Math.round(processMaturity),
      qualityMaturity: Math.round(qualityMaturity),
      governanceMaturity: Math.round(governanceMaturity),
      innovationMaturity: Math.round(innovationMaturity),
      overallMaturity: Math.round(overallMaturity),
      maturityLevel: this.getMaturityLevelFromScore(overallMaturity)
    };
  }

  /**
   * Generate improvement trajectory
   */
  private generateImprovementTrajectory(
    profile: CircleProfile,
    maturityIndicators: MaturityIndicators,
    coverageMetrics: CircleCoverageMetrics
  ): ImprovementTrajectory {
    const currentScore = maturityIndicators.overallMaturity;
    
    // Calculate target score based on circle type and potential
    const targetScore = this.calculateTargetScore(profile, currentScore);
    
    // Project timeline based on current trajectory and resources
    const projectedTimeline = this.calculateProjectedTimeline(
      profile,
      currentScore,
      targetScore
    );

    // Identify key improvements needed
    const keyImprovements = this.identifyKeyImprovements(
      profile,
      maturityIndicators,
      coverageMetrics
    );

    // Identify potential blockers
    const potentialBlockers = this.identifyPotentialBlockers(profile, coverageMetrics);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(
      profile,
      keyImprovements,
      potentialBlockers
    );

    return {
      currentScore,
      targetScore,
      projectedTimeline,
      keyImprovements,
      potentialBlockers,
      recommendedActions
    };
  }

  /**
   * Adjust weightings based on performance
   */
  private adjustWeightings(
    baseWeightings: Record<string, number>,
    coverageMetrics: CircleCoverageMetrics
  ): Record<string, number> {
    const adjusted = { ...baseWeightings };

    // Increase weight for areas with lower performance
    if (coverageMetrics.processMaturity < 70) {
      adjusted.process_efficiency = (adjusted.process_efficiency || 0) + 0.1;
    }
    if (coverageMetrics.schemaCompliance < 70) {
      adjusted.quality_standards = (adjusted.quality_standards || 0) + 0.1;
    }
    if (coverageMetrics.wsjfAlignment < 70) {
      adjusted.strategic_alignment = (adjusted.strategic_alignment || 0) + 0.1;
    }

    // Normalize to ensure sum equals 1
    const total = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjusted).forEach(key => {
      adjusted[key] = adjusted[key] / total;
    });

    return adjusted;
  }

  /**
   * Calculate risk tolerance based on profile and performance
   */
  private calculateRiskTolerance(
    baseRiskTolerance: string,
    coverageMetrics: CircleCoverageMetrics
  ): 'low' | 'medium' | 'high' {
    // Adjust risk tolerance based on current performance
    const performanceScore = (coverageMetrics.processMaturity + coverageMetrics.schemaCompliance) / 2;

    if (performanceScore >= 80) {
      return baseRiskTolerance as 'low' | 'medium' | 'high';
    } else if (performanceScore >= 60) {
      return baseRiskTolerance === 'high' ? 'medium' : baseRiskTolerance;
    } else {
      return 'low'; // Reduce risk tolerance when performance is low
    }
  }

  /**
   * Calculate innovation preference based on profile and performance
   */
  private calculateInnovationPreference(
    baseInnovationLevel: string,
    coverageMetrics: CircleCoverageMetrics
  ): 'conservative' | 'moderate' | 'aggressive' {
    const performanceScore = coverageMetrics.economicImpact;

    if (performanceScore >= 80) {
      return baseInnovationLevel === 'innovative' ? 'aggressive' : 
             baseInnovationLevel === 'progressive' ? 'moderate' : 'conservative';
    } else if (performanceScore >= 60) {
      return baseInnovationLevel;
    } else {
      return 'conservative'; // Be more conservative when performance is low
    }
  }

  /**
   * Get base maturity score from maturity level
   */
  private getBaseMaturityScore(maturityLevel: string): number {
    const scores = {
      'emerging': 30,
      'developing': 50,
      'mature': 70,
      'optimizing': 85,
      'innovating': 95
    };
    return scores[maturityLevel] || 50;
  }

  /**
   * Get maturity level from score
   */
  private getMaturityLevelFromScore(score: number): string {
    if (score >= 90) return 'innovating';
    if (score >= 75) return 'optimizing';
    if (score >= 60) return 'mature';
    if (score >= 40) return 'developing';
    return 'emerging';
  }

  /**
   * Calculate target score based on profile and current performance
   */
  private calculateTargetScore(profile: CircleProfile, currentScore: number): number {
    // Different circles have different potential targets
    const targetMultipliers = {
      'analyst': 1.2,      // High potential for optimization
      'assessor': 1.1,     // Moderate improvement potential
      'innovator': 1.4,    // High innovation potential
      'intuitive': 1.3,      // High user experience potential
      'orchestrator': 1.15,  // Moderate optimization potential
      'seeker': 1.35         // High opportunity potential
    };

    const multiplier = targetMultipliers[profile.circleId] || 1.2;
    return Math.min(100, currentScore * multiplier);
  }

  /**
   * Calculate projected timeline
   */
  private calculateProjectedTimeline(
    profile: CircleProfile,
    currentScore: number,
    targetScore: number
  ): string {
    const gap = targetScore - currentScore;
    const improvementRate = this.getImprovementRate(profile);

    const monthsNeeded = Math.ceil(gap / improvementRate);
    
    if (monthsNeeded <= 3) return '3 months';
    if (monthsNeeded <= 6) return '6 months';
    if (monthsNeeded <= 12) return '12 months';
    return '18+ months';
  }

  /**
   * Get improvement rate based on circle characteristics
   */
  private getImprovementRate(profile: CircleProfile): number {
    const rates = {
      'analyst': 5,      // Steady, methodical improvement
      'assessor': 3,     // Conservative, gradual improvement
      'innovator': 8,    // Rapid, experimental improvement
      'intuitive': 6,      // Moderate, user-driven improvement
      'orchestrator': 4,  // Systematic, coordinated improvement
      'seeker': 7         // Fast, opportunity-driven improvement
    };
    return rates[profile.circleId] || 5;
  }

  /**
   * Identify key improvements needed
   */
  private identifyKeyImprovements(
    profile: CircleProfile,
    maturityIndicators: MaturityIndicators,
    coverageMetrics: CircleCoverageMetrics
  ): string[] {
    const improvements: string[] = [];

    // Process improvements
    if (maturityIndicators.processMaturity < 70) {
      improvements.push(`Improve ${profile.characteristics.focusAreas[0]} processes`);
    }

    // Quality improvements
    if (maturityIndicators.qualityMaturity < 70) {
      improvements.push('Enhance quality assurance and validation processes');
    }

    // Governance improvements
    if (maturityIndicators.governanceMaturity < 70) {
      improvements.push('Strengthen governance frameworks and compliance');
    }

    // Innovation improvements
    if (maturityIndicators.innovationMaturity < 70) {
      improvements.push('Increase innovation activities and experimentation');
    }

    // Coverage-specific improvements
    if (coverageMetrics.depthAchievement < 70) {
      improvements.push('Increase depth coverage across all areas');
    }

    if (coverageMetrics.telemetryCoverage < 70) {
      improvements.push('Enhance telemetry collection and analysis');
    }

    return improvements;
  }

  /**
   * Identify potential blockers
   */
  private identifyPotentialBlockers(
    profile: CircleProfile,
    coverageMetrics: CircleCoverageMetrics
  ): string[] {
    const blockers: string[] = [];

    // Resource blockers
    if (profile.characteristics.collaborationStyle === 'leading' && coverageMetrics.processMaturity < 60) {
      blockers.push('Resource constraints and coordination overhead');
    }

    // Risk tolerance blockers
    if (profile.characteristics.riskTolerance === 'high' && coverageMetrics.schemaCompliance < 60) {
      blockers.push('High risk tolerance conflicting with quality requirements');
    }

    // Innovation blockers
    if (profile.characteristics.innovationLevel === 'innovative' && coverageMetrics.economicImpact < 60) {
      blockers.push('Innovation not translating to economic value');
    }

    // Communication blockers
    if (profile.characteristics.communicationStyle === 'informal' && coverageMetrics.governanceMaturity < 70) {
      blockers.push('Informal communication hindering governance compliance');
    }

    return blockers;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(
    profile: CircleProfile,
    keyImprovements: string[],
    potentialBlockers: string[]
  ): string[] {
    const actions: string[] = [];

    // Actions for improvements
    keyImprovements.forEach(improvement => {
      if (improvement.includes('process')) {
        actions.push('Implement process optimization workshops');
        actions.push('Establish process metrics and monitoring');
      }
      if (improvement.includes('quality')) {
        actions.push('Enhance quality assurance frameworks');
        actions.push('Implement automated quality checks');
      }
      if (improvement.includes('governance')) {
        actions.push('Strengthen governance documentation');
        actions.push('Establish regular compliance reviews');
      }
      if (improvement.includes('innovation')) {
        actions.push('Create innovation time allocation');
        actions.push('Establish experimentation frameworks');
      }
    });

    // Actions for blockers
    potentialBlockers.forEach(blocker => {
      if (blocker.includes('Resource')) {
        actions.push('Optimize resource allocation and planning');
        actions.push('Implement resource monitoring and alerts');
      }
      if (blocker.includes('Risk')) {
        actions.push('Establish risk management frameworks');
        actions.push('Create risk mitigation strategies');
      }
      if (blocker.includes('Communication')) {
        actions.push('Standardize communication protocols');
        actions.push('Implement collaboration tools');
      }
    });

    // Remove duplicates and return unique actions
    return [...new Set(actions)];
  }

  /**
   * Record decision for tracking
   */
  public recordDecision(
    circleId: string,
    decision: DecisionRecord
  ): void {
    if (!this.config.decisionTrackingEnabled) {
      return;
    }

    if (!this.decisionHistory.has(circleId)) {
      this.decisionHistory.set(circleId, []);
    }

    const history = this.decisionHistory.get(circleId)!;
    history.push({
      ...decision,
      timestamp: new Date()
    });

    this.emit('decisionRecorded', { circleId, decision });
  }

  /**
   * Get decision history for a circle
   */
  public getDecisionHistory(circleId: string): DecisionRecord[] {
    return this.decisionHistory.get(circleId) || [];
  }

  /**
   * Analyze decision patterns
   */
  public async analyzeDecisionPatterns(
    circleId: string,
    timeWindow?: number
  ): Promise<{
    patterns: DecisionPattern[];
    insights: string[];
    recommendations: string[];
  }> {
    const history = this.getDecisionHistory(circleId);
    const window = timeWindow || this.config.analysisWindow;
    const cutoffDate = new Date(Date.now() - window * 24 * 60 * 60 * 1000);

    const recentDecisions = history.filter(d => d.timestamp >= cutoffDate);

    const patterns = this.identifyDecisionPatterns(recentDecisions);
    const insights = this.generateDecisionInsights(patterns, recentDecisions);
    const recommendations = this.generateDecisionRecommendations(patterns, insights);

    return {
      patterns,
      insights,
      recommendations
    };
  }

  /**
   * Identify decision patterns
   */
  private identifyDecisionPatterns(decisions: DecisionRecord[]): DecisionPattern[] {
    const patterns: DecisionPattern[] = [];

    // Time-based patterns
    const timePatterns = this.analyzeTimePatterns(decisions);
    patterns.push(...timePatterns);

    // Criteria-based patterns
    const criteriaPatterns = this.analyzeCriteriaPatterns(decisions);
    patterns.push(...criteriaPatterns);

    // Outcome-based patterns
    const outcomePatterns = this.analyzeOutcomePatterns(decisions);
    patterns.push(...outcomePatterns);

    return patterns;
  }

  /**
   * Analyze time patterns
   */
  private analyzeTimePatterns(decisions: DecisionRecord[]): DecisionPattern[] {
    const patterns: DecisionPattern[] = [];
    
    // Group decisions by hour of day
    const hourlyDecisions: Record<number, number> = {};
    decisions.forEach(decision => {
      const hour = decision.timestamp.getHours();
      hourlyDecisions[hour] = (hourlyDecisions[hour] || 0) + 1;
    });

    // Find peak hours
    const sortedHours = Object.entries(hourlyDecisions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    if (sortedHours.length > 0) {
      patterns.push({
        type: 'time_pattern',
        description: `Peak decision hours: ${sortedHours.join(', ')}`,
        frequency: sortedHours.length,
        confidence: 0.8,
        recommendations: ['Schedule important decisions during peak hours']
      });
    }

    return patterns;
  }

  /**
   * Analyze criteria patterns
   */
  private analyzeCriteriaPatterns(decisions: DecisionRecord[]): DecisionPattern[] {
    const patterns: DecisionPattern[] = [];
    
    // Analyze primary criteria usage
    const criteriaUsage: Record<string, number> = {};
    decisions.forEach(decision => {
      decision.primaryCriteria.forEach(criteria => {
        criteriaUsage[criteria] = (criteriaUsage[criteria] || 0) + 1;
      });
    });

    // Find most used criteria
    const sortedCriteria = Object.entries(criteriaUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([criteria]) => criteria);

    if (sortedCriteria.length > 0) {
      patterns.push({
        type: 'criteria_pattern',
        description: `Most used criteria: ${sortedCriteria.join(', ')}`,
        frequency: sortedCriteria.length,
        confidence: 0.9,
        recommendations: ['Focus on these criteria in decision frameworks']
      });
    }

    return patterns;
  }

  /**
   * Analyze outcome patterns
   */
  private analyzeOutcomePatterns(decisions: DecisionRecord[]): DecisionPattern[] {
    const patterns: DecisionPattern[] = [];
    
    // Analyze success rates
    const totalDecisions = decisions.length;
    const successfulDecisions = decisions.filter(d => d.outcome === 'successful').length;
    const successRate = (successfulDecisions / totalDecisions) * 100;

    patterns.push({
      type: 'outcome_pattern',
      description: `Decision success rate: ${successRate.toFixed(1)}%`,
      frequency: successfulDecisions,
      confidence: 1.0,
      recommendations: successRate < 70 ? ['Review decision criteria and process'] : ['Maintain current decision approach']
    });

    return patterns;
  }

  /**
   * Generate decision insights
   */
  private generateDecisionInsights(
    patterns: DecisionPattern[],
    decisions: DecisionRecord[]
  ): string[] {
    const insights: string[] = [];

    // Time-based insights
    const timePatterns = patterns.filter(p => p.type === 'time_pattern');
    if (timePatterns.length > 0) {
      insights.push('Decision making shows clear time-based patterns that can be leveraged for scheduling');
    }

    // Criteria-based insights
    const criteriaPatterns = patterns.filter(p => p.type === 'criteria_pattern');
    if (criteriaPatterns.length > 0) {
      insights.push('Clear criteria preferences emerge in decision making, indicating focused decision framework');
    }

    // Outcome-based insights
    const outcomePatterns = patterns.filter(p => p.type === 'outcome_pattern');
    if (outcomePatterns.length > 0) {
      const successRate = outcomePatterns[0]?.frequency || 0;
      if (successRate < 70) {
        insights.push('Decision success rate indicates need for process improvement');
      } else {
        insights.push('Decision success rate is healthy, indicating effective processes');
      }
    }

    return insights;
  }

  /**
   * Generate decision recommendations
   */
  private generateDecisionRecommendations(
    patterns: DecisionPattern[],
    insights: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Time-based recommendations
    const timePatterns = patterns.filter(p => p.type === 'time_pattern');
    if (timePatterns.length > 0) {
      recommendations.push('Optimize decision scheduling around peak performance times');
    }

    // Criteria-based recommendations
    const criteriaPatterns = patterns.filter(p => p.type === 'criteria_pattern');
    if (criteriaPatterns.length > 0) {
      recommendations.push('Formalize most-used criteria in decision frameworks');
    }

    // Outcome-based recommendations
    const outcomePatterns = patterns.filter(p => p.type === 'outcome_pattern');
    if (outcomePatterns.length > 0) {
      const successRate = outcomePatterns[0]?.frequency || 0;
      if (successRate < 70) {
        recommendations.push('Implement decision review and learning processes');
        recommendations.push('Enhance decision criteria and evaluation methods');
      }
    }

    return recommendations;
  }

  /**
   * Get circle profile
   */
  public getCircleProfile(circleId: string): CircleProfile | undefined {
    return this.circleProfiles.get(circleId);
  }

  /**
   * Update circle profile
   */
  public updateCircleProfile(circleId: string, updates: Partial<CircleProfile>): void {
    const existing = this.circleProfiles.get(circleId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.circleProfiles.set(circleId, updated);
      this.emit('profileUpdated', { circleId, profile: updated });
    }
  }

  /**
   * Get all circle profiles
   */
  public getAllCircleProfiles(): CircleProfile[] {
    return Array.from(this.circleProfiles.values());
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<PerspectiveAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Export perspective analysis to JSON
   */
  public exportPerspectiveAnalysis(perspective: CirclePerspective): string {
    return JSON.stringify(perspective, null, 2);
  }
}

// Additional interfaces for decision tracking
export interface DecisionRecord {
  id: string;
  title: string;
  description: string;
  primaryCriteria: string[];
  secondaryCriteria: string[];
  weightings: Record<string, number>;
  options: DecisionOption[];
  selectedOption: string;
  outcome: 'successful' | 'partially_successful' | 'unsuccessful' | 'pending';
  rationale: string;
  stakeholders: string[];
  timestamp: Date;
  impact: {
    expected: string;
    actual?: string;
    measurement: string;
  };
}

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  criteria: Record<string, number>;
  totalScore: number;
}

export interface DecisionPattern {
  type: 'time_pattern' | 'criteria_pattern' | 'outcome_pattern' | 'stakeholder_pattern';
  description: string;
  frequency: number;
  confidence: number;
  recommendations: string[];
}

export interface MaturitySnapshot {
  date: Date;
  overallMaturity: number;
  dimensionScores: Record<string, number>;
  keyEvents: string[];
  improvements: string[];
}
/**
 * Maturity Surface Analyzer
 * 
 * Implements maturity surface measurement framework with quantifiable metrics
 * and comprehensive maturity assessment capabilities
 */

import { EventEmitter } from 'events';
import {
  MaturitySurface,
  MaturityDimension,
  MaturitySubDimension,
  Assessment,
  MaturityGap,
  MaturityRecommendation,
  MaturityTrend,
  CoverageError,
  TierLevel
} from './types';
import { TierFramework } from './tier-framework';

export interface MaturityConfig {
  assessmentFrequency: number; // in days
  historicalDataWindow: number; // in days
  enablePredictiveAnalysis: boolean;
  customDimensions: MaturityDimension[];
  weightingStrategy: 'equal' | 'custom' | 'performance_based';
  assessmentMethods: Array<'automated' | 'manual' | 'peer' | 'external'>;
}

export interface MaturityAssessment {
  id: string;
  dimensionId: string;
  subDimensionId?: string;
  assessor: string;
  method: 'automated' | 'manual' | 'peer' | 'external';
  score: number;
  evidence: string[];
  comments: string;
  date: Date;
  confidence: number;
}

export interface MaturitySurfaceConfig {
  dimensions: MaturityDimension[];
  targetScores: Record<string, number>;
  assessmentWeights: Record<string, number>;
  maturityLevels: Array<{
    name: string;
    minScore: number;
    maxScore: number;
    description: string;
  }>;
}

export class MaturitySurfaceAnalyzer extends EventEmitter {
  private config: MaturityConfig;
  private tierFramework: TierFramework;
  private assessmentHistory: Map<string, MaturityAssessment[]> = new Map();
  private trendData: Map<string, MaturityTrend[]> = new Map();
  private surfaceConfig: MaturitySurfaceConfig;
  private isInitialized: boolean = false;

  constructor(
    tierFramework: TierFramework,
    config: Partial<MaturityConfig> = {}
  ) {
    super();
    this.tierFramework = tierFramework;
    this.config = {
      assessmentFrequency: 30, // 30 days
      historicalDataWindow: 90, // 90 days
      enablePredictiveAnalysis: true,
      customDimensions: [],
      weightingStrategy: 'custom',
      assessmentMethods: ['automated', 'manual', 'peer', 'external'],
      ...config
    };

    this.initializeSurfaceConfig();
  }

  /**
   * Initialize maturity surface configuration
   */
  private initializeSurfaceConfig(): void {
    const dimensions = this.config.customDimensions.length > 0 
      ? this.config.customDimensions 
      : this.getDefaultDimensions();

    const maturityLevels = [
      { name: 'initial', minScore: 0, maxScore: 20, description: 'Ad-hoc processes, no formal structure' },
      { name: 'developing', minScore: 21, maxScore: 40, description: 'Basic processes, limited standardization' },
      { name: 'defined', minScore: 41, maxScore: 60, description: 'Documented processes, some standardization' },
      { name: 'managed', minScore: 61, maxScore: 80, description: 'Comprehensive processes, good standardization' },
      { name: 'optimized', minScore: 81, maxScore: 95, description: 'Optimized processes, full standardization' },
      { name: 'innovating', minScore: 96, maxScore: 100, description: 'Continuously improving, innovation-focused' }
    ];

    this.surfaceConfig = {
      dimensions,
      targetScores: this.calculateTargetScores(dimensions),
      assessmentWeights: this.calculateAssessmentWeights(dimensions),
      maturityLevels
    };
  }

  /**
   * Get default maturity dimensions
   */
  private getDefaultDimensions(): MaturityDimension[] {
    return [
      {
        name: 'Process Maturity',
        weight: 0.25,
        currentScore: 0,
        targetScore: 80,
        subDimensions: [
          {
            name: 'Process Documentation',
            weight: 0.3,
            currentScore: 0,
            targetScore: 85,
            metrics: ['documentation_completeness', 'process_clarity', 'workflow_definition'],
            assessments: []
          },
          {
            name: 'Process Standardization',
            weight: 0.3,
            currentScore: 0,
            targetScore: 80,
            metrics: ['standard_adherence', 'consistency_score', 'automation_level'],
            assessments: []
          },
          {
            name: 'Process Optimization',
            weight: 0.2,
            currentScore: 0,
            targetScore: 75,
            metrics: ['efficiency_ratio', 'waste_reduction', 'cycle_time'],
            assessments: []
          },
          {
            name: 'Continuous Improvement',
            weight: 0.2,
            currentScore: 0,
            targetScore: 85,
            metrics: ['improvement_rate', 'learning_loops', 'feedback_integration'],
            assessments: []
          }
        ]
      },
      {
        name: 'Quality Maturity',
        weight: 0.2,
        currentScore: 0,
        targetScore: 85,
        subDimensions: [
          {
            name: 'Quality Assurance',
            weight: 0.4,
            currentScore: 0,
            targetScore: 90,
            metrics: ['defect_rate', 'quality_gates', 'test_coverage'],
            assessments: []
          },
          {
            name: 'Quality Control',
            weight: 0.3,
            currentScore: 0,
            targetScore: 80,
            metrics: ['control_effectiveness', 'variance_reduction', 'compliance_rate'],
            assessments: []
          },
          {
            name: 'Quality Metrics',
            weight: 0.3,
            currentScore: 0,
            targetScore: 85,
            metrics: ['metric_completeness', 'trend_analysis', 'predictive_accuracy'],
            assessments: []
          }
        ]
      },
      {
        name: 'Governance Maturity',
        weight: 0.2,
        currentScore: 0,
        targetScore: 75,
        subDimensions: [
          {
            name: 'Governance Structure',
            weight: 0.3,
            currentScore: 0,
            targetScore: 80,
            metrics: ['role_clarity', 'accountability_matrix', 'decision_framework'],
            assessments: []
          },
          {
            name: 'Compliance Management',
            weight: 0.4,
            currentScore: 0,
            targetScore: 85,
            metrics: ['compliance_rate', 'audit_results', 'risk_assessment'],
            assessments: []
          },
          {
            name: 'Policy Management',
            weight: 0.3,
            currentScore: 0,
            targetScore: 70,
            metrics: ['policy_coverage', 'policy_effectiveness', 'update_frequency'],
            assessments: []
          }
        ]
      },
      {
        name: 'Innovation Maturity',
        weight: 0.15,
        currentScore: 0,
        targetScore: 70,
        subDimensions: [
          {
            name: 'Innovation Process',
            weight: 0.4,
            currentScore: 0,
            targetScore: 75,
            metrics: ['idea_generation', 'experimentation_rate', 'innovation_pipeline'],
            assessments: []
          },
          {
            name: 'Learning Culture',
            weight: 0.3,
            currentScore: 0,
            targetScore: 80,
            metrics: ['learning_opportunities', 'knowledge_sharing', 'skill_development'],
            assessments: []
          },
          {
            name: 'Innovation Impact',
            weight: 0.3,
            currentScore: 0,
            targetScore: 65,
            metrics: ['innovation_success_rate', 'time_to_market', 'business_impact'],
            assessments: []
          }
        ]
      },
      {
        name: 'Capability Maturity',
        weight: 0.2,
        currentScore: 0,
        targetScore: 80,
        subDimensions: [
          {
            name: 'Technical Capability',
            weight: 0.3,
            currentScore: 0,
            targetScore: 85,
            metrics: ['technical_skills', 'tool_mastery', 'technology_adoption'],
            assessments: []
          },
          {
            name: 'Process Capability',
            weight: 0.3,
            currentScore: 0,
            targetScore: 80,
            metrics: ['process_expertise', 'methodology_knowledge', 'best_practice_adoption'],
            assessments: []
          },
          {
            name: 'Collaboration Capability',
            weight: 0.2,
            currentScore: 0,
            targetScore: 75,
            metrics: ['teamwork_effectiveness', 'communication_quality', 'stakeholder_engagement'],
            assessments: []
          },
          {
            name: 'Leadership Capability',
            weight: 0.2,
            currentScore: 0,
            targetScore: 70,
            metrics: ['leadership_effectiveness', 'decision_quality', 'team_development'],
            assessments: []
          }
        ]
      }
    ];
  }

  /**
   * Calculate target scores for dimensions
   */
  private calculateTargetScores(dimensions: MaturityDimension[]): Record<string, number> {
    const targetScores: Record<string, number> = {};
    
    dimensions.forEach(dimension => {
      targetScores[dimension.name] = dimension.targetScore;
    });

    return targetScores;
  }

  /**
   * Calculate assessment weights
   */
  private calculateAssessmentWeights(dimensions: MaturityDimension[]): Record<string, number> {
    const weights: Record<string, number> = {};
    
    if (this.config.weightingStrategy === 'equal') {
      dimensions.forEach(dimension => {
        weights[dimension.name] = 1 / dimensions.length;
      });
    } else {
      dimensions.forEach(dimension => {
        weights[dimension.name] = dimension.weight;
      });
    }

    return weights;
  }

  /**
   * Initialize analyzer
   */
  public async initialize(): Promise<void> {
    try {
      // Load historical assessment data
      await this.loadAssessmentHistory();
      
      // Load trend data
      await this.loadTrendData();
      
      this.isInitialized = true;
      this.emit('initialized', {
        dimensionsCount: this.surfaceConfig.dimensions.length,
        assessmentHistorySize: Array.from(this.assessmentHistory.values())
          .reduce((sum, assessments) => sum + assessments.length, 0)
      });
    } catch (error) {
      const initError = new CoverageError(
        'MATURITY_INITIALIZATION_FAILED',
        'Failed to initialize maturity surface analyzer',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.emit('initializationError', initError);
      throw initError;
    }
  }

  /**
   * Load assessment history
   */
  private async loadAssessmentHistory(): Promise<void> {
    // Mock implementation - in real system, this would load from database
    console.log('[MATURITY] Loading assessment history...');
  }

  /**
   * Load trend data
   */
  private async loadTrendData(): Promise<void> {
    // Mock implementation - in real system, this would load from database
    console.log('[MATURITY] Loading trend data...');
  }

  /**
   * Generate maturity surface analysis
   */
  public async generateMaturitySurface(
    circleId: string,
    tierLevel: TierLevel,
    assessments?: MaturityAssessment[]
  ): Promise<MaturitySurface> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Use provided assessments or load from history
      const relevantAssessments = assessments || this.getRelevantAssessments(circleId, tierLevel);
      
      // Calculate dimension scores
      const dimensions = this.calculateDimensionScores(relevantAssessments);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(dimensions);
      
      // Determine maturity level
      const maturityLevel = this.determineMaturityLevel(overallScore);
      
      // Calculate surface area and coverage
      const surfaceArea = this.calculateSurfaceArea(dimensions);
      const coveragePercentage = this.calculateCoveragePercentage(dimensions);
      
      // Identify gaps
      const gaps = this.identifyMaturityGaps(dimensions);
      
      // Generate recommendations
      const recommendations = this.generateMaturityRecommendations(gaps, dimensions, overallScore);
      
      // Get trend data
      const trendData = this.getTrendData(circleId);

      const surface: MaturitySurface = {
        dimensions,
        overallScore,
        maturityLevel,
        surfaceArea,
        coveragePercentage,
        gaps,
        recommendations,
        trendData
      };

      this.emit('maturitySurfaceGenerated', { circleId, tierLevel, surface });
      return surface;

    } catch (error) {
      const analysisError = new CoverageError(
        'MATURITY_ANALYSIS_FAILED',
        `Failed to generate maturity surface for ${circleId}`,
        { 
          circleId,
          tierLevel,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      this.emit('analysisError', analysisError);
      throw analysisError;
    }
  }

  /**
   * Get relevant assessments for circle and tier
   */
  private getRelevantAssessments(circleId: string, tierLevel: TierLevel): MaturityAssessment[] {
    const cutoffDate = new Date(Date.now() - this.config.historicalDataWindow * 24 * 60 * 60 * 1000);
    
    const allAssessments = Array.from(this.assessmentHistory.values())
      .flat()
      .filter(assessment => 
        assessment.date >= cutoffDate &&
        this.isAssessmentRelevant(assessment, circleId, tierLevel)
      );

    return allAssessments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Check if assessment is relevant for circle and tier
   */
  private isAssessmentRelevant(
    assessment: MaturityAssessment,
    circleId: string,
    tierLevel: TierLevel
  ): boolean {
    // In real implementation, this would check assessment metadata
    // For now, assume all assessments are relevant
    return true;
  }

  /**
   * Calculate dimension scores from assessments
   */
  private calculateDimensionScores(assessments: MaturityAssessment[]): MaturityDimension[] {
    const dimensions = this.surfaceConfig.dimensions.map(dimension => ({ ...dimension }));
    
    dimensions.forEach(dimension => {
      // Calculate scores for each sub-dimension
      dimension.subDimensions.forEach(subDimension => {
        const subDimensionAssessments = assessments.filter(a => 
          a.subDimensionId === subDimension.name ||
          a.dimensionId === dimension.name
        );
        
        if (subDimensionAssessments.length > 0) {
          // Calculate weighted average score
          const weightedSum = subDimensionAssessments.reduce((sum, a) => 
            sum + (a.score * a.confidence), 0
          );
          const totalWeight = subDimensionAssessments.reduce((sum, a) => sum + a.confidence, 0);
          subDimension.currentScore = weightedSum / totalWeight;
          subDimension.assessments = subDimensionAssessments.map(a => ({
            id: a.id,
            type: a.method,
            score: a.score,
            evidence: a.evidence,
            assessor: a.assessor,
            date: a.date,
            comments: a.comments
          }));
        }
      });
      
      // Calculate dimension score from sub-dimensions
      const weightedSum = dimension.subDimensions.reduce((sum, subDim) => 
        sum + (subDim.currentScore * subDim.weight), 0
      );
      const totalWeight = dimension.subDimensions.reduce((sum, subDim) => sum + subDim.weight, 0);
      dimension.currentScore = weightedSum / totalWeight;
    });

    return dimensions;
  }

  /**
   * Calculate overall maturity score
   */
  private calculateOverallScore(dimensions: MaturityDimension[]): number {
    const weightedSum = dimensions.reduce((sum, dimension) => 
      sum + (dimension.currentScore * dimension.weight), 0
    );
    const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Determine maturity level from score
   */
  private determineMaturityLevel(score: number): string {
    const levels = this.surfaceConfig.maturityLevels;
    
    for (const level of levels) {
      if (score >= level.minScore && score <= level.maxScore) {
        return level.name;
      }
    }
    
    return 'initial'; // Default if no level matches
  }

  /**
   * Calculate surface area
   */
  private calculateSurfaceArea(dimensions: MaturityDimension[]): number {
    // Surface area represents the "size" of maturity across all dimensions
    // Higher values indicate broader maturity coverage
    return dimensions.reduce((area, dimension) => {
      const dimensionArea = dimension.currentScore * dimension.weight;
      const subDimensionArea = dimension.subDimensions.reduce((subArea, subDim) => 
        subArea + (subDim.currentScore * subDim.weight), 0
      );
      return area + dimensionArea + (subDimensionArea * 0.1); // Weight sub-dimensions less
    }, 0);
  }

  /**
   * Calculate coverage percentage
   */
  private calculateCoveragePercentage(dimensions: MaturityDimension[]): number {
    const totalPossibleScore = dimensions.reduce((sum, dimension) => 
      sum + (dimension.targetScore * dimension.weight), 0
    );
    const totalActualScore = dimensions.reduce((sum, dimension) => 
      sum + (dimension.currentScore * dimension.weight), 0
    );
    
    return Math.round((totalActualScore / totalPossibleScore) * 100);
  }

  /**
   * Identify maturity gaps
   */
  private identifyMaturityGaps(dimensions: MaturityDimension[]): MaturityGap[] {
    const gaps: MaturityGap[] = [];
    
    dimensions.forEach(dimension => {
      const gapSize = dimension.targetScore - dimension.currentScore;
      
      if (gapSize > 5) { // Only consider significant gaps
        const priority = this.calculateGapPriority(gapSize, dimension.weight);
        const impact = this.identifyGapImpact(dimension);
        const remediation = this.suggestGapRemediation(dimension, gapSize);
        
        gaps.push({
          dimension: dimension.name,
          currentScore: dimension.currentScore,
          targetScore: dimension.targetScore,
          gapSize,
          priority,
          impact,
          remediation
        });
      }
      
      // Check sub-dimension gaps
      dimension.subDimensions.forEach(subDimension => {
        const subGapSize = subDimension.targetScore - subDimension.currentScore;
        
        if (subGapSize > 5) {
          const subPriority = this.calculateGapPriority(subGapSize, subDimension.weight);
          const subImpact = this.identifyGapImpact(subDimension);
          const subRemediation = this.suggestGapRemediation(subDimension, subGapSize);
          
          gaps.push({
            dimension: `${dimension.name} - ${subDimension.name}`,
            currentScore: subDimension.currentScore,
            targetScore: subDimension.targetScore,
            gapSize: subGapSize,
            priority: subPriority,
            impact: subImpact,
            remediation: subRemediation
          });
        }
      });
    });

    return gaps.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate gap priority
   */
  private calculateGapPriority(gapSize: number, weight: number): 'critical' | 'high' | 'medium' | 'low' {
    const weightedGap = gapSize * weight;
    
    if (weightedGap >= 30) return 'critical';
    if (weightedGap >= 20) return 'high';
    if (weightedGap >= 10) return 'medium';
    return 'low';
  }

  /**
   * Identify gap impact
   */
  private identifyGapImpact(dimension: MaturityDimension | MaturitySubDimension): string[] {
    const impacts: string[] = [];
    
    if (dimension.name.includes('Process')) {
      impacts.push('Reduced efficiency and productivity');
      impacts.push('Inconsistent workflows and outcomes');
    }
    
    if (dimension.name.includes('Quality')) {
      impacts.push('Lower quality outputs and customer satisfaction');
      impacts.push('Increased defects and rework');
    }
    
    if (dimension.name.includes('Governance')) {
      impacts.push('Compliance and regulatory risks');
      impacts.push('Poor decision making and accountability');
    }
    
    if (dimension.name.includes('Innovation')) {
      impacts.push('Reduced competitive advantage');
      impacts.push('Missed improvement opportunities');
    }
    
    if (dimension.name.includes('Capability')) {
      impacts.push('Skill gaps and performance issues');
      impacts.push('Reduced adaptability and growth');
    }
    
    return impacts;
  }

  /**
   * Suggest gap remediation
   */
  private suggestGapRemediation(
    dimension: MaturityDimension | MaturitySubDimension,
    gapSize: number
  ): string[] {
    const remediation: string[] = [];
    
    if (gapSize > 20) {
      remediation.push('Comprehensive improvement program required');
      remediation.push('External consulting or training recommended');
    } else if (gapSize > 10) {
      remediation.push('Structured improvement initiative needed');
      remediation.push('Dedicated resources and timeline required');
    } else {
      remediation.push('Continuous improvement activities');
      remediation.push('Best practice adoption recommended');
    }
    
    // Specific remediation based on dimension type
    if (dimension.name.includes('Process')) {
      remediation.push('Process mapping and optimization');
      remediation.push('Automation opportunities assessment');
    }
    
    if (dimension.name.includes('Quality')) {
      remediation.push('Quality management system implementation');
      remediation.push('Testing and validation enhancement');
    }
    
    if (dimension.name.includes('Governance')) {
      remediation.push('Governance framework development');
      remediation.push('Compliance program strengthening');
    }
    
    if (dimension.name.includes('Innovation')) {
      remediation.push('Innovation program establishment');
      remediation.push('Learning culture development');
    }
    
    if (dimension.name.includes('Capability')) {
      remediation.push('Skill development programs');
      remediation.push('Capability building initiatives');
    }
    
    return [...new Set(remediation)];
  }

  /**
   * Generate maturity recommendations
   */
  private generateMaturityRecommendations(
    gaps: MaturityGap[],
    dimensions: MaturityDimension[],
    overallScore: number
  ): MaturityRecommendation[] {
    const recommendations: MaturityRecommendation[] = [];
    
    // Generate recommendations for critical and high priority gaps
    const priorityGaps = gaps.filter(gap => 
      gap.priority === 'critical' || gap.priority === 'high'
    );

    priorityGaps.forEach((gap, index) => {
      const recommendation: MaturityRecommendation = {
        id: `rec_${index + 1}`,
        category: this.categorizeRecommendation(gap),
        title: `Address ${gap.dimension} Gap`,
        description: `Close the gap between current score (${gap.currentScore}) and target score (${gap.targetScore}) for ${gap.dimension}`,
        expectedImpact: Math.round(gap.gapSize * 0.8), // 80% of gap size as expected impact
        effort: this.estimateEffort(gap.gapSize),
        timeline: this.estimateTimeline(gap.gapSize),
        dependencies: this.identifyDependencies(gap),
        successMetrics: this.defineSuccessMetrics(gap)
      };
      
      recommendations.push(recommendation);
    });

    // Add overall improvement recommendations
    if (overallScore < 60) {
      recommendations.push({
        id: 'overall_improvement_1',
        category: 'process',
        title: 'Comprehensive Maturity Improvement Program',
        description: 'Implement organization-wide maturity improvement program focusing on all dimensions',
        expectedImpact: 25,
        effort: 'high',
        timeline: '12-18 months',
        dependencies: ['Executive sponsorship', 'Dedicated team', 'Budget allocation'],
        successMetrics: ['Overall maturity score increase', 'Dimension score improvements', 'Gap reduction']
      });
    }

    return recommendations;
  }

  /**
   * Categorize recommendation
   */
  private categorizeRecommendation(gap: MaturityGap): 'process' | 'tooling' | 'training' | 'governance' | 'measurement' {
    if (gap.dimension.includes('Process') || gap.dimension.includes('Quality')) {
      return 'process';
    }
    if (gap.dimension.includes('Capability') || gap.dimension.includes('Innovation')) {
      return 'training';
    }
    if (gap.dimension.includes('Governance')) {
      return 'governance';
    }
    return 'measurement';
  }

  /**
   * Estimate effort level
   */
  private estimateEffort(gapSize: number): 'low' | 'medium' | 'high' {
    if (gapSize > 25) return 'high';
    if (gapSize > 15) return 'medium';
    return 'low';
  }

  /**
   * Estimate timeline
   */
  private estimateTimeline(gapSize: number): string {
    if (gapSize > 25) return '6-12 months';
    if (gapSize > 15) return '3-6 months';
    return '1-3 months';
  }

  /**
   * Identify dependencies
   */
  private identifyDependencies(gap: MaturityGap): string[] {
    const dependencies: string[] = [];
    
    if (gap.dimension.includes('Process')) {
      dependencies.push('Process ownership and governance');
      dependencies.push('Change management capability');
    }
    
    if (gap.dimension.includes('Quality')) {
      dependencies.push('Quality management tools');
      dependencies.push('Testing infrastructure');
    }
    
    if (gap.dimension.includes('Governance')) {
      dependencies.push('Leadership commitment');
      dependencies.push('Compliance framework');
    }
    
    if (gap.dimension.includes('Innovation')) {
      dependencies.push('Innovation budget');
      dependencies.push('Learning culture');
    }
    
    if (gap.dimension.includes('Capability')) {
      dependencies.push('Training programs');
      dependencies.push('Skill assessment systems');
    }
    
    return dependencies;
  }

  /**
   * Define success metrics
   */
  private defineSuccessMetrics(gap: MaturityGap): string[] {
    const metrics: string[] = [];
    
    metrics.push(`${gap.dimension} score increase from ${gap.currentScore} to ${gap.targetScore}`);
    metrics.push('Gap size reduction');
    metrics.push('Assessment score improvement');
    
    if (gap.dimension.includes('Process')) {
      metrics.push('Process efficiency improvement');
      metrics.push('Workflow standardization');
    }
    
    if (gap.dimension.includes('Quality')) {
      metrics.push('Defect rate reduction');
      metrics.push('Quality gate compliance');
    }
    
    if (gap.dimension.includes('Governance')) {
      metrics.push('Compliance rate improvement');
      metrics.push('Decision effectiveness');
    }
    
    if (gap.dimension.includes('Innovation')) {
      metrics.push('Innovation pipeline health');
      metrics.push('Learning program participation');
    }
    
    if (gap.dimension.includes('Capability')) {
      metrics.push('Skill assessment improvement');
      metrics.push('Capability demonstration');
    }
    
    return metrics;
  }

  /**
   * Get trend data for circle
   */
  private getTrendData(circleId: string): MaturityTrend[] {
    return this.trendData.get(circleId) || [];
  }

  /**
   * Add assessment to history
   */
  public addAssessment(assessment: MaturityAssessment): void {
    const key = `${assessment.dimensionId}_${assessment.subDimensionId || 'main'}`;
    
    if (!this.assessmentHistory.has(key)) {
      this.assessmentHistory.set(key, []);
    }
    
    const history = this.assessmentHistory.get(key)!;
    history.push(assessment);
    
    // Keep only recent assessments within window
    const cutoffDate = new Date(Date.now() - this.config.historicalDataWindow * 24 * 60 * 60 * 1000);
    const recentAssessments = history.filter(a => a.date >= cutoffDate);
    this.assessmentHistory.set(key, recentAssessments);
    
    this.emit('assessmentAdded', assessment);
  }

  /**
   * Generate trend analysis
   */
  public async generateTrendAnalysis(
    circleId: string,
    timeWindow?: number
  ): Promise<{
    trends: MaturityTrend[];
    insights: string[];
    predictions: Array<{
      dimension: string;
      projectedScore: number;
      timeframe: string;
      confidence: number;
    }>;
  }> {
    const window = timeWindow || this.config.historicalDataWindow;
    const cutoffDate = new Date(Date.now() - window * 24 * 60 * 60 * 1000);
    
    // Get historical data
    const historicalData = this.getHistoricalData(circleId, cutoffDate);
    
    // Generate trends
    const trends = this.calculateTrends(historicalData);
    
    // Generate insights
    const insights = this.generateTrendInsights(trends);
    
    // Generate predictions
    const predictions = this.config.enablePredictiveAnalysis 
      ? this.generatePredictions(trends)
      : [];

    return {
      trends,
      insights,
      predictions
    };
  }

  /**
   * Get historical data
   */
  private getHistoricalData(circleId: string, cutoffDate: Date): MaturityTrend[] {
    const trends: MaturityTrend[] = [];
    
    // Generate mock historical data
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (date >= cutoffDate) {
        trends.push({
          date,
          overallScore: 50 + Math.random() * 30, // Random score between 50-80
          dimensionScores: {
            'Process Maturity': 45 + Math.random() * 35,
            'Quality Maturity': 50 + Math.random() * 30,
            'Governance Maturity': 40 + Math.random() * 40,
            'Innovation Maturity': 35 + Math.random() * 45,
            'Capability Maturity': 45 + Math.random() * 35
          },
          keyEvents: [`Event on ${date.toDateString()}`],
          improvements: [`Improvement on ${date.toDateString()}`]
        });
      }
    }
    
    return trends;
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(historicalData: MaturityTrend[]): MaturityTrend[] {
    return historicalData.map((trend, index) => {
      if (index === 0) return trend;
      
      const previous = historicalData[index - 1];
      const overallTrend = trend.overallScore > previous.overallScore ? 'improving' :
                         trend.overallScore < previous.overallScore ? 'declining' : 'stable';
      
      return {
        ...trend,
        overallTrend: overallTrend as any
      };
    });
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(trends: MaturityTrend[]): string[] {
    const insights: string[] = [];
    
    if (trends.length < 2) return insights;
    
    // Calculate overall trend
    const recentTrends = trends.slice(-10); // Last 10 data points
    const improvingCount = recentTrends.filter(t => t.overallScore > 60).length;
    const overallHealth = improvingCount / recentTrends.length;
    
    if (overallHealth > 0.7) {
      insights.push('Strong positive maturity trend observed');
    } else if (overallHealth > 0.5) {
      insights.push('Moderate positive maturity trend observed');
    } else if (overallHealth > 0.3) {
      insights.push('Maturity trend is stable with slight positive movement');
    } else {
      insights.push('Maturity trend needs attention - declining or stagnant');
    }
    
    return insights;
  }

  /**
   * Generate predictions
   */
  private generatePredictions(trends: MaturityTrend[]): Array<{
    dimension: string;
    projectedScore: number;
    timeframe: string;
    confidence: number;
  }> {
    const predictions: Array<{
      dimension: string;
      projectedScore: number;
      timeframe: string;
      confidence: number;
    }> = [];
    
    if (trends.length < 5) return predictions;
    
    // Simple linear projection for each dimension
    const recentTrends = trends.slice(-10);
    const dimensions = ['Process Maturity', 'Quality Maturity', 'Governance Maturity', 'Innovation Maturity', 'Capability Maturity'];
    
    dimensions.forEach(dimension => {
      const dimensionTrends = recentTrends.map(t => t.dimensionScores[dimension] || 50);
      const slope = this.calculateSlope(dimensionTrends);
      const latestScore = dimensionTrends[dimensionTrends.length - 1];
      const projectedScore = latestScore + (slope * 6); // 6-month projection
      
      predictions.push({
        dimension,
        projectedScore: Math.max(0, Math.min(100, projectedScore)),
        timeframe: '6 months',
        confidence: Math.max(0.3, Math.min(0.9, 1 - Math.abs(slope) / 10))
      });
    });
    
    return predictions;
  }

  /**
   * Calculate slope for trend analysis
   */
  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Export maturity surface to JSON
   */
  public exportMaturitySurface(surface: MaturitySurface): string {
    return JSON.stringify(surface, null, 2);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<MaturityConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get analyzer statistics
   */
  public getStatistics(): {
    assessmentHistorySize: number;
    trendDataSize: number;
    isInitialized: boolean;
    dimensionsCount: number;
    config: MaturityConfig;
  } {
    return {
      assessmentHistorySize: Array.from(this.assessmentHistory.values())
        .reduce((sum, assessments) => sum + assessments.length, 0),
      trendDataSize: Array.from(this.trendData.values())
        .reduce((sum, trends) => sum + trends.length, 0),
      isInitialized: this.isInitialized,
      dimensionsCount: this.surfaceConfig.dimensions.length,
      config: this.config
    };
  }
}
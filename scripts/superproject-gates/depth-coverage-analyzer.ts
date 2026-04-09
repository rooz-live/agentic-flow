/**
 * Depth Coverage Analyzer
 * 
 * Implements depth coverage analysis for execution patterns with configurable depth levels
 * and comprehensive gap analysis
 */

import { EventEmitter } from 'events';
import {
  TierLevel,
  DepthCoverage,
  DepthAnalysis,
  CoverageError,
  TierDefinition
} from './types';
import { TierFramework } from './tier-framework';

export interface DepthLevelDefinition {
  level: number;
  name: string;
  description: string;
  requiredElements: string[];
  validationCriteria: string[];
  weight: number;
}

export interface CoverageAnalysisConfig {
  enableDetailedLogging: boolean;
  includeRecommendations: boolean;
  gapAnalysisDepth: number;
  trendAnalysisWindow: number; // in days
  customDepthLevels?: DepthLevelDefinition[];
}

export class DepthCoverageAnalyzer extends EventEmitter {
  private config: CoverageAnalysisConfig;
  private tierFramework: TierFramework;
  private depthLevelDefinitions: Map<number, DepthLevelDefinition> = new Map();

  constructor(
    tierFramework: TierFramework,
    config: Partial<CoverageAnalysisConfig> = {}
  ) {
    super();
    this.tierFramework = tierFramework;
    this.config = {
      enableDetailedLogging: true,
      includeRecommendations: true,
      gapAnalysisDepth: 3,
      trendAnalysisWindow: 30,
      ...config
    };

    this.initializeDepthLevels();
  }

  /**
   * Initialize depth level definitions
   */
  private initializeDepthLevels(): void {
    // Use custom depth levels if provided, otherwise use defaults
    const customLevels = this.config.customDepthLevels;
    if (customLevels) {
      customLevels.forEach(level => {
        this.depthLevelDefinitions.set(level.level, level);
      });
    } else {
      // Default depth levels
      this.depthLevelDefinitions.set(1, {
        level: 1,
        name: 'Basic Coverage',
        description: 'Fundamental requirements and basic validation',
        requiredElements: [
          'purpose_statement',
          'basic_metadata',
          'minimal_documentation',
          'basic_validation'
        ],
        validationCriteria: [
          'Purpose statement is clearly defined',
          'Basic metadata is complete',
          'Minimal documentation exists',
          'Basic validation passes'
        ],
        weight: 0.2
      });

      this.depthLevelDefinitions.set(2, {
        level: 2,
        name: 'Standard Coverage',
        description: 'Standard requirements with moderate validation',
        requiredElements: [
          'purpose_statement',
          'domain_definition',
          'process_documentation',
          'basic_metrics',
          'validation_results'
        ],
        validationCriteria: [
          'Purpose statement is comprehensive',
          'Domain boundaries are clearly defined',
          'Process documentation is complete',
          'Basic metrics are tracked',
          'Validation results are documented'
        ],
        weight: 0.3
      });

      this.depthLevelDefinitions.set(3, {
        level: 3,
        name: 'Comprehensive Coverage',
        description: 'Comprehensive requirements with detailed validation',
        requiredElements: [
          'purpose_statement',
          'domain_definition',
          'accountability_matrix',
          'process_documentation',
          'quality_metrics',
          'validation_results',
          'feedback_mechanisms'
        ],
        validationCriteria: [
          'Purpose statement is comprehensive and measurable',
          'Domain boundaries and interfaces are defined',
          'Accountability matrix is complete',
          'Process documentation includes workflows',
          'Quality metrics are defined and tracked',
          'Validation results are comprehensive',
          'Feedback mechanisms are established'
        ],
        weight: 0.3
      });

      this.depthLevelDefinitions.set(4, {
        level: 4,
        name: 'Advanced Coverage',
        description: 'Advanced requirements with comprehensive validation and optimization',
        requiredElements: [
          'purpose_statement',
          'domain_definition',
          'accountability_matrix',
          'process_documentation',
          'quality_metrics',
          'performance_metrics',
          'validation_results',
          'feedback_mechanisms',
          'continuous_improvement',
          'risk_assessment'
        ],
        validationCriteria: [
          'Purpose statement includes success metrics',
          'Domain definition includes integration points',
          'Accountability matrix includes escalation paths',
          'Process documentation includes optimization',
          'Quality and performance metrics are comprehensive',
          'Validation includes automated and manual checks',
          'Feedback mechanisms include multiple channels',
          'Continuous improvement process is defined',
          'Risk assessment is comprehensive and updated'
        ],
        weight: 0.15
      });

      this.depthLevelDefinitions.set(5, {
        level: 5,
        name: 'Optimal Coverage',
        description: 'Optimal requirements with full validation, optimization, and innovation',
        requiredElements: [
          'purpose_statement',
          'domain_definition',
          'accountability_matrix',
          'process_documentation',
          'quality_metrics',
          'performance_metrics',
          'validation_results',
          'feedback_mechanisms',
          'continuous_improvement',
          'risk_assessment',
          'innovation_framework',
          'governance_integration',
          'economic_tracking',
          'trend_analysis'
        ],
        validationCriteria: [
          'Purpose statement includes innovation targets',
          'Domain definition includes ecosystem integration',
          'Accountability matrix includes cross-functional dependencies',
          'Process documentation includes automation opportunities',
          'Metrics include predictive analytics',
          'Validation includes real-time monitoring',
          'Feedback includes stakeholder integration',
          'Continuous improvement includes innovation pipeline',
          'Risk assessment includes proactive mitigation',
          'Innovation framework is established and active',
          'Governance integration is comprehensive',
          'Economic tracking includes ROI analysis',
          'Trend analysis includes predictive insights'
        ],
        weight: 0.05
      });
    }
  }

  /**
   * Analyze depth coverage for a circle
   */
  public async analyzeDepthCoverage(
    circleId: string,
    tierLevel: TierLevel,
    actualCoverage: Record<string, boolean>
  ): Promise<DepthAnalysis> {
    try {
      const tierDef = this.tierFramework.getTierDefinition(tierLevel);
      if (!tierDef) {
        throw new CoverageError(
          'TIER_NOT_FOUND',
          `Tier definition not found: ${tierLevel}`,
          { circleId, tierLevel }
        );
      }

      const maxDepth = tierDef.depthLevels;
      const depthCoverage: DepthCoverage[] = [];

      for (let level = 1; level <= maxDepth; level++) {
        const coverage = await this.analyzeDepthLevel(
          circleId,
          tierLevel,
          level,
          actualCoverage
        );
        depthCoverage.push(coverage);
      }

      const overallCoverage = this.calculateOverallCoverage(depthCoverage);
      const depthScore = this.calculateDepthScore(depthCoverage, maxDepth);
      const criticalGaps = this.identifyCriticalGaps(depthCoverage);
      const improvementAreas = this.identifyImprovementAreas(depthCoverage);

      const analysis: DepthAnalysis = {
        circleId,
        tierLevel,
        maxDepth,
        depthCoverage,
        overallCoverage,
        depthScore,
        criticalGaps,
        improvementAreas
      };

      if (this.config.enableDetailedLogging) {
        console.log(`[DEPTH_COVERAGE] Analysis completed for ${circleId}:`, {
          overallCoverage,
          depthScore,
          criticalGapsCount: criticalGaps.length
        });
      }

      this.emit('depthAnalysisCompleted', analysis);
      return analysis;

    } catch (error) {
      const coverageError = new CoverageError(
        'DEPTH_ANALYSIS_FAILED',
        `Failed to analyze depth coverage for ${circleId}`,
        { circleId, tierLevel, error: error instanceof Error ? error.message : String(error) }
      );
      this.emit('depthAnalysisError', coverageError);
      throw coverageError;
    }
  }

  /**
   * Analyze specific depth level
   */
  private async analyzeDepthLevel(
    circleId: string,
    tierLevel: TierLevel,
    level: number,
    actualCoverage: Record<string, boolean>
  ): Promise<DepthCoverage> {
    const levelDef = this.depthLevelDefinitions.get(level);
    if (!levelDef) {
      throw new CoverageError(
        'DEPTH_LEVEL_NOT_FOUND',
        `Depth level definition not found: ${level}`,
        { circleId, tierLevel, level }
      );
    }

    const requiredElements = levelDef.requiredElements;
    const coveredElements: string[] = [];
    const gaps: string[] = [];

    // Check each required element
    requiredElements.forEach(element => {
      if (actualCoverage[element]) {
        coveredElements.push(element);
      } else {
        gaps.push(element);
      }
    });

    const coveragePercentage = (coveredElements.length / requiredElements.length) * 100;
    const recommendations = this.config.includeRecommendations 
      ? this.generateRecommendations(level, gaps, tierLevel)
      : [];

    return {
      level,
      name: levelDef.name,
      description: levelDef.description,
      coveragePercentage,
      requiredElements,
      coveredElements,
      gaps,
      recommendations
    };
  }

  /**
   * Calculate overall coverage from depth levels
   */
  private calculateOverallCoverage(depthCoverage: DepthCoverage[]): number {
    if (depthCoverage.length === 0) return 0;

    const weightedSum = depthCoverage.reduce((sum, coverage) => {
      const levelDef = this.depthLevelDefinitions.get(coverage.level);
      const weight = levelDef?.weight || 1 / depthCoverage.length;
      return sum + (coverage.coveragePercentage * weight);
    }, 0);

    return Math.round(weightedSum * 100) / 100;
  }

  /**
   * Calculate depth score based on achieved depth levels
   */
  private calculateDepthScore(depthCoverage: DepthCoverage[], maxDepth: number): number {
    let score = 0;
    let achievedDepth = 0;

    for (const coverage of depthCoverage) {
      if (coverage.coveragePercentage >= 80) { // 80% threshold for achieving a level
        score += coverage.level;
        achievedDepth = coverage.level;
      } else {
        break; // Stop at first non-achieved level
      }
    }

    // Normalize to 0-100 scale
    const normalizedScore = (score / (maxDepth * (maxDepth + 1) / 2)) * 100;
    return Math.round(normalizedScore * 100) / 100;
  }

  /**
   * Identify critical gaps in depth coverage
   */
  private identifyCriticalGaps(depthCoverage: DepthCoverage[]): string[] {
    const criticalGaps: string[] = [];

    depthCoverage.forEach(coverage => {
      // Critical gaps are elements missing from lower levels
      if (coverage.level <= 2 && coverage.gaps.length > 0) {
        coverage.gaps.forEach(gap => {
          if (!criticalGaps.includes(gap)) {
            criticalGaps.push(gap);
          }
        });
      }
    });

    return criticalGaps;
  }

  /**
   * Identify improvement areas based on coverage gaps
   */
  private identifyImprovementAreas(depthCoverage: DepthCoverage[]): string[] {
    const improvementAreas: string[] = [];
    const gapFrequency: Record<string, number> = {};

    // Count frequency of gaps across all levels
    depthCoverage.forEach(coverage => {
      coverage.gaps.forEach(gap => {
        gapFrequency[gap] = (gapFrequency[gap] || 0) + 1;
      });
    });

    // Sort by frequency and take top areas
    const sortedGaps = Object.entries(gapFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    sortedGaps.forEach(([gap]) => {
      if (!improvementAreas.includes(gap)) {
        improvementAreas.push(gap);
      }
    });

    return improvementAreas;
  }

  /**
   * Generate recommendations for specific depth level
   */
  private generateRecommendations(
    level: number,
    gaps: string[],
    tierLevel: TierLevel
  ): string[] {
    const recommendations: string[] = [];

    // Generate recommendations based on missing elements
    gaps.forEach(gap => {
      switch (gap) {
        case 'purpose_statement':
          recommendations.push('Define a clear, measurable purpose statement with success criteria');
          break;
        case 'domain_definition':
          recommendations.push('Establish clear domain boundaries and interfaces');
          break;
        case 'accountability_matrix':
          recommendations.push('Create comprehensive accountability matrix with escalation paths');
          break;
        case 'process_documentation':
          recommendations.push('Document all processes with workflows and decision points');
          break;
        case 'quality_metrics':
          recommendations.push('Define and track quality metrics with targets and thresholds');
          break;
        case 'performance_metrics':
          recommendations.push('Implement performance monitoring with KPIs and benchmarks');
          break;
        case 'validation_results':
          recommendations.push('Establish validation processes with documented results');
          break;
        case 'feedback_mechanisms':
          recommendations.push('Create multi-channel feedback mechanisms with response processes');
          break;
        case 'continuous_improvement':
          recommendations.push('Implement continuous improvement cycle with regular reviews');
          break;
        case 'risk_assessment':
          recommendations.push('Conduct comprehensive risk assessment with mitigation plans');
          break;
        case 'innovation_framework':
          recommendations.push('Establish innovation framework with experiment tracking');
          break;
        case 'governance_integration':
          recommendations.push('Integrate with governance frameworks and compliance requirements');
          break;
        case 'economic_tracking':
          recommendations.push('Implement economic tracking with ROI analysis');
          break;
        case 'trend_analysis':
          recommendations.push('Establish trend analysis with predictive capabilities');
          break;
        default:
          recommendations.push(`Address missing element: ${gap.replace(/_/g, ' ')}`);
      }
    });

    // Add tier-specific recommendations
    if (tierLevel === 'high-structure' && level < 4) {
      recommendations.push('Consider upgrading to higher depth levels for high-structure tier compliance');
    }

    return recommendations;
  }

  /**
   * Compare depth coverage between circles
   */
  public async compareDepthCoverage(
    analyses: DepthAnalysis[]
  ): Promise<{
    comparison: Record<string, {
      score: number;
      coverage: number;
      maxDepth: number;
      rank: number;
    }>;
    insights: string[];
    recommendations: string[];
  }> {
    const comparison: Record<string, any> = {};
    const scores = analyses.map(a => ({ circleId: a.circleId, score: a.depthScore }));

    // Sort by score for ranking
    scores.sort((a, b) => b.score - a.score);

    analyses.forEach(analysis => {
      const rank = scores.findIndex(s => s.circleId === analysis.circleId) + 1;
      comparison[analysis.circleId] = {
        score: analysis.depthScore,
        coverage: analysis.overallCoverage,
        maxDepth: analysis.maxDepth,
        rank
      };
    });

    const insights = this.generateComparisonInsights(analyses);
    const recommendations = this.generateComparisonRecommendations(analyses);

    return {
      comparison,
      insights,
      recommendations
    };
  }

  /**
   * Generate insights from depth coverage comparison
   */
  private generateComparisonInsights(analyses: DepthAnalysis[]): string[] {
    const insights: string[] = [];
    
    const avgScore = analyses.reduce((sum, a) => sum + a.depthScore, 0) / analyses.length;
    const topPerformer = analyses.reduce((max, a) => a.depthScore > max.depthScore ? a : max);
    const bottomPerformer = analyses.reduce((min, a) => a.depthScore < min.depthScore ? a : min);

    insights.push(`Average depth score across all circles: ${avgScore.toFixed(1)}`);
    insights.push(`Top performing circle: ${topPerformer.circleId} (score: ${topPerformer.depthScore.toFixed(1)})`);
    insights.push(`Circle needing most improvement: ${bottomPerformer.circleId} (score: ${bottomPerformer.depthScore.toFixed(1)})`);

    // Analyze depth level distribution
    const depthDistribution = analyses.reduce((dist, a) => {
      dist[a.maxDepth] = (dist[a.maxDepth] || 0) + 1;
      return dist;
    }, {} as Record<number, number>);

    insights.push(`Depth level distribution: ${JSON.stringify(depthDistribution)}`);

    return insights;
  }

  /**
   * Generate recommendations from depth coverage comparison
   */
  private generateComparisonRecommendations(analyses: DepthAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    // Find common improvement areas
    const allImprovementAreas = analyses.flatMap(a => a.improvementAreas);
    const areaFrequency: Record<string, number> = {};
    
    allImprovementAreas.forEach(area => {
      areaFrequency[area] = (areaFrequency[area] || 0) + 1;
    });

    const commonAreas = Object.entries(areaFrequency)
      .filter(([, freq]) => freq >= Math.ceil(analyses.length / 2))
      .map(([area]) => area);

    if (commonAreas.length > 0) {
      recommendations.push(`Focus on common improvement areas: ${commonAreas.join(', ')}`);
    }

    // Recommend peer learning
    const topPerformers = analyses
      .filter(a => a.depthScore >= 80)
      .map(a => a.circleId);

    if (topPerformers.length > 0) {
      recommendations.push(`Establish peer learning programs with top performers: ${topPerformers.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Get depth level definitions
   */
  public getDepthLevelDefinitions(): DepthLevelDefinition[] {
    return Array.from(this.depthLevelDefinitions.values());
  }

  /**
   * Get specific depth level definition
   */
  public getDepthLevelDefinition(level: number): DepthLevelDefinition | undefined {
    return this.depthLevelDefinitions.get(level);
  }

  /**
   * Add custom depth level definition
   */
  public addDepthLevelDefinition(levelDef: DepthLevelDefinition): void {
    this.depthLevelDefinitions.set(levelDef.level, levelDef);
    this.emit('depthLevelAdded', levelDef);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CoverageAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Export depth analysis to JSON
   */
  public exportAnalysis(analysis: DepthAnalysis): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Import depth analysis from JSON
   */
  public importAnalysis(jsonData: string): DepthAnalysis {
    try {
      const analysis = JSON.parse(jsonData);
      // Validate structure
      if (!analysis.circleId || !analysis.tierLevel || !analysis.depthCoverage) {
        throw new CoverageError(
          'INVALID_ANALYSIS_FORMAT',
          'Invalid depth analysis format'
        );
      }
      return analysis as DepthAnalysis;
    } catch (error) {
      throw new CoverageError(
        'IMPORT_FAILED',
        'Failed to import depth analysis',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
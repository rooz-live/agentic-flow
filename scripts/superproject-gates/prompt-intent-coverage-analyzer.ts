/**
 * Prompt Intent Coverage Analyzer
 * 
 * Implements prompt intent coverage metric that maps to "pattern hit %"
 * and measures "intent atoms → required pattern hit%"
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CoveragePeriod,
  CoverageScope,
  TierType,
  CoverageItem
} from './types';

// Intent Atom Types
export type IntentAtomType = 
  | 'code_analysis'
  | 'code_generation'
  | 'code_refactoring'
  | 'debugging'
  | 'documentation'
  | 'testing'
  | 'performance_optimization'
  | 'security_analysis'
  | 'architecture_design'
  | 'data_analysis'
  | 'error_handling'
  | 'integration'
  | 'deployment'
  | 'monitoring'
  | 'configuration';

// Required Pattern Types
export type RequiredPatternType = 
  | 'schema_validation'
  | 'telemetry_coverage'
  | 'compliance_checking'
  | 'automated_testing'
  | 'documentation'
  | 'monitoring'
  | 'advanced_analytics'
  | 'custom_integrations'
  | 'basic_identification'
  | 'basic_coverage';

export interface IntentAtom {
  id: string;
  type: IntentAtomType;
  name: string;
  description: string;
  requiredPatterns: RequiredPatternType[];
  weight: number; // Relative importance (0-1)
  tierRequirements: Record<TierType, number>; // Minimum patterns required per tier
}

export interface PatternHitResult {
  patternType: RequiredPatternType;
  detected: boolean;
  confidence: number; // 0-1
  lastDetected?: Date;
  metadata?: Record<string, any>;
}

export interface IntentCoverageResult {
  intentAtom: IntentAtom;
  detectedPatterns: PatternHitResult[];
  requiredPatternCount: number;
  detectedPatternCount: number;
  coveragePercentage: number; // (detected / required) * 100
  weightedCoverage: number; // coverage * weight
  tierCompliance: Record<TierType, boolean>;
}

export interface PromptIntentCoverageMetrics {
  totalIntentAtoms: number;
  overallCoveragePercentage: number;
  weightedCoveragePercentage: number;
  intentBreakdown: Record<IntentAtomType, IntentCoverageResult>;
  tierCompliance: Record<TierType, number>;
  patternHitRate: number; // Overall pattern hit percentage
  confidenceScore: number; // Overall confidence in coverage assessment
  recommendations: IntentCoverageRecommendation[];
}

export interface IntentCoverageRecommendation {
  id: string;
  intentAtomType: IntentAtomType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  missingPatterns: RequiredPatternType[];
  expectedImpact: number; // Expected coverage improvement
  implementation: {
    steps: string[];
    estimatedEffort: number; // hours
    dependencies: string[];
  };
}

export interface PromptIntentCoverageReport {
  id: string;
  generatedAt: Date;
  period: CoveragePeriod;
  scope: CoverageScope;
  metrics: PromptIntentCoverageMetrics;
  summary: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    keyInsights: string[];
    improvementAreas: string[];
  };
}

export class PromptIntentCoverageAnalyzer extends EventEmitter {
  private intentAtoms: Map<IntentAtomType, IntentAtom> = new Map();
  private patternDetectionCache: Map<string, PatternHitResult[]> = new Map();
  private projectRoot: string;
  private goalieDir: string;

  constructor(projectRoot?: string) {
    super();
    this.projectRoot = projectRoot || process.cwd();
    this.goalieDir = path.join(this.projectRoot, '.goalie');
    this.initializeIntentAtoms();
  }

  /**
   * Initialize predefined intent atoms with their required patterns
   */
  private initializeIntentAtoms(): void {
    const intentAtoms: IntentAtom[] = [
      {
        id: 'code_analysis',
        type: 'code_analysis',
        name: 'Code Analysis',
        description: 'Analyze code for quality, structure, and potential issues',
        requiredPatterns: ['schema_validation', 'telemetry_coverage', 'automated_testing'],
        weight: 0.9,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'code_generation',
        type: 'code_generation',
        name: 'Code Generation',
        description: 'Generate new code based on specifications',
        requiredPatterns: ['schema_validation', 'telemetry_coverage', 'documentation'],
        weight: 0.95,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'code_refactoring',
        type: 'code_refactoring',
        name: 'Code Refactoring',
        description: 'Restructure existing code for better maintainability',
        requiredPatterns: ['schema_validation', 'automated_testing', 'documentation'],
        weight: 0.85,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'debugging',
        type: 'debugging',
        name: 'Debugging',
        description: 'Identify and fix issues in code',
        requiredPatterns: ['telemetry_coverage', 'monitoring'],
        weight: 0.8,
        tierRequirements: {
          'high-structure': 2,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'documentation',
        type: 'documentation',
        name: 'Documentation',
        description: 'Generate and maintain code documentation',
        requiredPatterns: ['documentation', 'schema_validation'],
        weight: 0.7,
        tierRequirements: {
          'high-structure': 2,
          'medium-structure': 1,
          'flexible': 1
        }
      },
      {
        id: 'testing',
        type: 'testing',
        name: 'Testing',
        description: 'Create and execute tests for code',
        requiredPatterns: ['automated_testing', 'telemetry_coverage', 'schema_validation'],
        weight: 0.9,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'performance_optimization',
        type: 'performance_optimization',
        name: 'Performance Optimization',
        description: 'Optimize code for better performance',
        requiredPatterns: ['telemetry_coverage', 'monitoring', 'advanced_analytics'],
        weight: 0.85,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'security_analysis',
        type: 'security_analysis',
        name: 'Security Analysis',
        description: 'Analyze code for security vulnerabilities',
        requiredPatterns: ['schema_validation', 'compliance_checking', 'monitoring'],
        weight: 0.95,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'architecture_design',
        type: 'architecture_design',
        name: 'Architecture Design',
        description: 'Design system architecture and components',
        requiredPatterns: ['schema_validation', 'documentation', 'advanced_analytics'],
        weight: 0.9,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'data_analysis',
        type: 'data_analysis',
        name: 'Data Analysis',
        description: 'Analyze data patterns and generate insights',
        requiredPatterns: ['telemetry_coverage', 'advanced_analytics'],
        weight: 0.75,
        tierRequirements: {
          'high-structure': 2,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'error_handling',
        type: 'error_handling',
        name: 'Error Handling',
        description: 'Implement robust error handling mechanisms',
        requiredPatterns: ['schema_validation', 'telemetry_coverage', 'monitoring'],
        weight: 0.8,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'integration',
        type: 'integration',
        name: 'Integration',
        description: 'Integrate with external systems and services',
        requiredPatterns: ['schema_validation', 'custom_integrations', 'telemetry_coverage'],
        weight: 0.85,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'deployment',
        type: 'deployment',
        name: 'Deployment',
        description: 'Deploy applications and infrastructure',
        requiredPatterns: ['schema_validation', 'monitoring', 'documentation'],
        weight: 0.8,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'monitoring',
        type: 'monitoring',
        name: 'Monitoring',
        description: 'Implement monitoring and observability',
        requiredPatterns: ['monitoring', 'telemetry_coverage', 'advanced_analytics'],
        weight: 0.85,
        tierRequirements: {
          'high-structure': 3,
          'medium-structure': 2,
          'flexible': 1
        }
      },
      {
        id: 'configuration',
        type: 'configuration',
        name: 'Configuration',
        description: 'Manage system configuration and settings',
        requiredPatterns: ['schema_validation', 'basic_identification'],
        weight: 0.6,
        tierRequirements: {
          'high-structure': 2,
          'medium-structure': 1,
          'flexible': 1
        }
      }
    ];

    for (const atom of intentAtoms) {
      this.intentAtoms.set(atom.type, atom);
    }
  }

  /**
   * Analyze prompt intent coverage for a given scope and period
   */
  public async analyzePromptIntentCoverage(
    period: CoveragePeriod,
    scope: CoverageScope,
    options: {
      includeHistoricalData?: boolean;
      confidenceThreshold?: number;
      customIntentAtoms?: IntentAtom[];
    } = {}
  ): Promise<PromptIntentCoverageReport> {
    console.log(`[INTENT-COVERAGE] Analyzing prompt intent coverage for period ${period.start.toISOString()} to ${period.end.toISOString()}`);

    const reportId = this.generateId('intent-coverage-report');
    
    try {
      // Get intent atoms to analyze (use custom if provided, otherwise use all)
      const intentAtomsToAnalyze = options.customIntentAtoms || Array.from(this.intentAtoms.values());
      
      // Collect pattern detection data
      const patternData = await this.collectPatternDetectionData(scope, period);
      
      // Analyze coverage for each intent atom
      const intentResults: Record<IntentAtomType, IntentCoverageResult> = {} as any;
      let totalWeightedCoverage = 0;
      let totalWeight = 0;
      
      for (const intentAtom of intentAtomsToAnalyze) {
        const result = await this.analyzeIntentAtomCoverage(intentAtom, patternData, scope);
        intentResults[intentAtom.type] = result;
        totalWeightedCoverage += result.weightedCoverage;
        totalWeight += intentAtom.weight;
      }
      
      // Calculate overall metrics
      const overallCoveragePercentage = this.calculateOverallCoverage(intentResults);
      const weightedCoveragePercentage = totalWeight > 0 ? totalWeightedCoverage / totalWeight : 0;
      const patternHitRate = this.calculatePatternHitRate(patternData);
      const confidenceScore = this.calculateConfidenceScore(intentResults, patternData);
      
      // Calculate tier compliance
      const tierCompliance = this.calculateTierCompliance(intentResults, scope.tiers);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(intentResults, scope);
      
      const metrics: PromptIntentCoverageMetrics = {
        totalIntentAtoms: intentAtomsToAnalyze.length,
        overallCoveragePercentage,
        weightedCoveragePercentage,
        intentBreakdown: intentResults,
        tierCompliance,
        patternHitRate,
        confidenceScore,
        recommendations
      };
      
      // Generate summary
      const summary = this.generateSummary(metrics);
      
      const report: PromptIntentCoverageReport = {
        id: reportId,
        generatedAt: new Date(),
        period,
        scope,
        metrics,
        summary
      };
      
      // Save report
      await this.saveIntentCoverageReport(report);
      
      this.emit('intent_coverage_analysis_complete', {
        reportId,
        metrics,
        success: true
      });
      
      return report;
      
    } catch (error) {
      console.error('[INTENT-COVERAGE] Error analyzing prompt intent coverage:', error);
      
      this.emit('intent_coverage_analysis_error', {
        reportId,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }

  /**
   * Analyze coverage for a specific intent atom
   */
  private async analyzeIntentAtomCoverage(
    intentAtom: IntentAtom,
    patternData: Map<RequiredPatternType, PatternHitResult[]>,
    scope: CoverageScope
  ): Promise<IntentCoverageResult> {
    const detectedPatterns: PatternHitResult[] = [];
    
    for (const requiredPattern of intentAtom.requiredPatterns) {
      const patternResults = patternData.get(requiredPattern) || [];
      const bestMatch = patternResults.length > 0 ? 
        patternResults.reduce((best, current) => current.confidence > best.confidence ? current : best) :
        { patternType: requiredPattern, detected: false, confidence: 0 };
      
      detectedPatterns.push(bestMatch);
    }
    
    const requiredPatternCount = intentAtom.requiredPatterns.length;
    const detectedPatternCount = detectedPatterns.filter(p => p.detected).length;
    const coveragePercentage = (detectedPatternCount / requiredPatternCount) * 100;
    const weightedCoverage = coveragePercentage * intentAtom.weight;
    
    // Calculate tier compliance
    const tierCompliance: Record<TierType, boolean> = {} as any;
    for (const tier of scope.tiers) {
      const requiredCount = intentAtom.tierRequirements[tier] || 1;
      tierCompliance[tier] = detectedPatternCount >= requiredCount;
    }
    
    return {
      intentAtom,
      detectedPatterns,
      requiredPatternCount,
      detectedPatternCount,
      coveragePercentage,
      weightedCoverage,
      tierCompliance
    };
  }

  /**
   * Collect pattern detection data from various sources
   */
  private async collectPatternDetectionData(
    scope: CoverageScope,
    period: CoveragePeriod
  ): Promise<Map<RequiredPatternType, PatternHitResult[]>> {
    const patternData = new Map<RequiredPatternType, PatternHitResult[]>();
    
    // Load pattern metrics from .goalie/pattern_metrics.jsonl
    const patternMetricsPath = path.join(this.goalieDir, 'pattern_metrics.jsonl');
    
    try {
      const exists = await fs.access(patternMetricsPath).then(() => true).catch(() => false);
      if (exists) {
        const content = await fs.readFile(patternMetricsPath, 'utf-8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const patternEvent = JSON.parse(line);
            const patternType = this.mapEventToPatternType(patternEvent);
            
            if (patternType && this.isInPeriod(patternEvent, period)) {
              const result: PatternHitResult = {
                patternType,
                detected: true,
                confidence: this.calculatePatternConfidence(patternEvent),
                lastDetected: new Date(patternEvent.timestamp || Date.now()),
                metadata: patternEvent
              };
              
              if (!patternData.has(patternType)) {
                patternData.set(patternType, []);
              }
              patternData.get(patternType)!.push(result);
            }
          } catch (parseError) {
            console.warn(`[INTENT-COVERAGE] Failed to parse pattern line: ${line}`, parseError);
          }
        }
      }
    } catch (error) {
      console.warn(`[INTENT-COVERAGE] Error loading pattern metrics: ${error}`);
    }
    
    // Ensure all required pattern types have entries
    const allPatternTypes: RequiredPatternType[] = [
      'schema_validation', 'telemetry_coverage', 'compliance_checking',
      'automated_testing', 'documentation', 'monitoring',
      'advanced_analytics', 'custom_integrations', 'basic_identification', 'basic_coverage'
    ];
    
    for (const patternType of allPatternTypes) {
      if (!patternData.has(patternType)) {
        patternData.set(patternType, []);
      }
    }
    
    return patternData;
  }

  /**
   * Map pattern event to required pattern type
   */
  private mapEventToPatternType(event: any): RequiredPatternType | null {
    const pattern = event.pattern || '';
    const tags = event.tags || [];
    
    // Map based on pattern names and tags
    if (pattern.includes('schema') || pattern.includes('validation')) {
      return 'schema_validation';
    }
    if (pattern.includes('telemetry') || pattern.includes('metrics')) {
      return 'telemetry_coverage';
    }
    if (pattern.includes('compliance') || pattern.includes('audit')) {
      return 'compliance_checking';
    }
    if (pattern.includes('test') || tags.includes('testing')) {
      return 'automated_testing';
    }
    if (pattern.includes('doc') || tags.includes('documentation')) {
      return 'documentation';
    }
    if (pattern.includes('monitor') || pattern.includes('observability')) {
      return 'monitoring';
    }
    if (pattern.includes('analytics') || pattern.includes('analysis')) {
      return 'advanced_analytics';
    }
    if (pattern.includes('integration') || pattern.includes('api')) {
      return 'custom_integrations';
    }
    if (pattern.includes('identification') || pattern.includes('id')) {
      return 'basic_identification';
    }
    if (pattern.includes('coverage')) {
      return 'basic_coverage';
    }
    
    return null;
  }

  /**
   * Check if event is within the specified period
   */
  private isInPeriod(event: any, period: CoveragePeriod): boolean {
    const eventTime = new Date(event.timestamp || Date.now());
    return eventTime >= period.start && eventTime <= period.end;
  }

  /**
   * Calculate confidence score for a pattern detection
   */
  private calculatePatternConfidence(event: any): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available data
    if (event.status === 'completed') confidence += 0.2;
    if (event.duration && event.duration > 0) confidence += 0.1;
    if (event.economic && event.economic.wsjf_score > 0) confidence += 0.1;
    if (event.tags && event.tags.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall coverage percentage
   */
  private calculateOverallCoverage(intentResults: Record<IntentAtomType, IntentCoverageResult>): number {
    const results = Object.values(intentResults);
    if (results.length === 0) return 0;
    
    const totalCoverage = results.reduce((sum, result) => sum + result.coveragePercentage, 0);
    return totalCoverage / results.length;
  }

  /**
   * Calculate pattern hit rate
   */
  private calculatePatternHitRate(patternData: Map<RequiredPatternType, PatternHitResult[]>): number {
    let totalPatterns = 0;
    let hitPatterns = 0;
    
    for (const [patternType, results] of patternData) {
      totalPatterns++;
      if (results.some(r => r.detected && r.confidence >= 0.7)) {
        hitPatterns++;
      }
    }
    
    return totalPatterns > 0 ? (hitPatterns / totalPatterns) * 100 : 0;
  }

  /**
   * Calculate confidence score for the overall coverage assessment
   */
  private calculateConfidenceScore(
    intentResults: Record<IntentAtomType, IntentCoverageResult>,
    patternData: Map<RequiredPatternType, PatternHitResult[]>
  ): number {
    let totalConfidence = 0;
    let totalPatterns = 0;
    
    for (const results of patternData.values()) {
      for (const result of results) {
        totalConfidence += result.confidence;
        totalPatterns++;
      }
    }
    
    const avgPatternConfidence = totalPatterns > 0 ? totalConfidence / totalPatterns : 0;
    
    // Factor in the number of intent atoms with good coverage
    const intentAtoms = Object.values(intentResults);
    const wellCoveredIntents = intentAtoms.filter(r => r.coveragePercentage >= 80).length;
    const intentCoverageFactor = intentAtoms.length > 0 ? wellCoveredIntents / intentAtoms.length : 0;
    
    return (avgPatternConfidence * 0.7) + (intentCoverageFactor * 0.3);
  }

  /**
   * Calculate tier compliance scores
   */
  private calculateTierCompliance(
    intentResults: Record<IntentAtomType, IntentCoverageResult>,
    tiers: TierType[]
  ): Record<TierType, number> {
    const tierCompliance: Record<TierType, number> = {} as any;
    
    for (const tier of tiers) {
      const intentAtoms = Object.values(intentResults);
      const compliantIntents = intentAtoms.filter(r => r.tierCompliance[tier]).length;
      
      tierCompliance[tier] = intentAtoms.length > 0 ? (compliantIntents / intentAtoms.length) * 100 : 0;
    }
    
    return tierCompliance;
  }

  /**
   * Generate recommendations based on coverage gaps
   */
  private async generateRecommendations(
    intentResults: Record<IntentAtomType, IntentCoverageResult>,
    scope: CoverageScope
  ): Promise<IntentCoverageRecommendation[]> {
    const recommendations: IntentCoverageRecommendation[] = [];
    
    for (const [intentType, result] of Object.entries(intentResults)) {
      const missingPatterns = result.detectedPatterns
        .filter(p => !p.detected)
        .map(p => p.patternType);
      
      if (missingPatterns.length > 0) {
        const priority = this.calculateRecommendationPriority(result.coveragePercentage);
        
        recommendations.push({
          id: this.generateId('rec'),
          intentAtomType: intentType as IntentAtomType,
          priority,
          title: `Improve ${result.intentAtom.name} Coverage`,
          description: `Missing patterns for ${result.intentAtom.name}: ${missingPatterns.join(', ')}`,
          missingPatterns,
          expectedImpact: missingPatterns.length * 10, // Simple estimation
          implementation: {
            steps: [
              `Implement ${missingPatterns.join(', ')} patterns`,
              `Add telemetry for ${result.intentAtom.name}`,
              `Create validation rules for ${result.intentAtom.name}`
            ],
            estimatedEffort: missingPatterns.length * 4, // 4 hours per pattern
            dependencies: ['pattern_detection_system', 'telemetry_infrastructure']
          }
        });
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate recommendation priority based on coverage percentage
   */
  private calculateRecommendationPriority(coveragePercentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (coveragePercentage < 25) return 'critical';
    if (coveragePercentage < 50) return 'high';
    if (coveragePercentage < 75) return 'medium';
    return 'low';
  }

  /**
   * Generate summary for the report
   */
  private generateSummary(metrics: PromptIntentCoverageMetrics): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    keyInsights: string[];
    improvementAreas: string[];
  } {
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (metrics.overallCoveragePercentage >= 90) status = 'excellent';
    else if (metrics.overallCoveragePercentage >= 75) status = 'good';
    else if (metrics.overallCoveragePercentage >= 50) status = 'fair';
    else status = 'poor';
    
    const keyInsights: string[] = [];
    const improvementAreas: string[] = [];
    
    keyInsights.push(`Overall intent coverage: ${metrics.overallCoveragePercentage.toFixed(1)}%`);
    keyInsights.push(`Pattern hit rate: ${metrics.patternHitRate.toFixed(1)}%`);
    keyInsights.push(`Confidence score: ${(metrics.confidenceScore * 100).toFixed(1)}%`);
    
    // Find low-coverage intent atoms
    const lowCoverageIntents = Object.entries(metrics.intentBreakdown)
      .filter(([_, result]) => result.coveragePercentage < 50)
      .map(([type, result]) => result.intentAtom.name);
    
    if (lowCoverageIntents.length > 0) {
      improvementAreas.push(`Low coverage intent atoms: ${lowCoverageIntents.join(', ')}`);
    }
    
    // Find tier compliance issues
    const lowComplianceTiers = Object.entries(metrics.tierCompliance)
      .filter(([_, compliance]) => compliance < 70)
      .map(([tier, _]) => tier);
    
    if (lowComplianceTiers.length > 0) {
      improvementAreas.push(`Low compliance tiers: ${lowComplianceTiers.join(', ')}`);
    }
    
    return {
      status,
      keyInsights,
      improvementAreas
    };
  }

  /**
   * Save intent coverage report to file
   */
  private async saveIntentCoverageReport(report: PromptIntentCoverageReport): Promise<void> {
    const reportPath = path.join(this.goalieDir, 'intent-coverage-reports.json');
    
    try {
      let reports: PromptIntentCoverageReport[] = [];
      
      try {
        const existingData = await fs.readFile(reportPath, 'utf-8');
        reports = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        reports = [];
      }
      
      reports.push(report);
      
      // Keep only last 100 reports
      if (reports.length > 100) {
        reports = reports.slice(-100);
      }
      
      await fs.writeFile(reportPath, JSON.stringify(reports, null, 2));
      
      console.log(`[INTENT-COVERAGE] Report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error('[INTENT-COVERAGE] Error saving report:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get all defined intent atoms
   */
  public getIntentAtoms(): IntentAtom[] {
    return Array.from(this.intentAtoms.values());
  }

  /**
   * Get intent atom by type
   */
  public getIntentAtom(type: IntentAtomType): IntentAtom | undefined {
    return this.intentAtoms.get(type);
  }

  /**
   * Add custom intent atom
   */
  public addIntentAtom(intentAtom: IntentAtom): void {
    this.intentAtoms.set(intentAtom.type, intentAtom);
  }

  /**
   * Get historical intent coverage reports
   */
  public async getHistoricalReports(limit?: number): Promise<PromptIntentCoverageReport[]> {
    const reportPath = path.join(this.goalieDir, 'intent-coverage-reports.json');
    
    try {
      const data = await fs.readFile(reportPath, 'utf-8');
      let reports: PromptIntentCoverageReport[] = JSON.parse(data);
      
      reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
      
      if (limit) {
        reports = reports.slice(0, limit);
      }
      
      return reports;
      
    } catch (error) {
      console.warn('[INTENT-COVERAGE] Error loading historical reports:', error);
      return [];
    }
  }
}
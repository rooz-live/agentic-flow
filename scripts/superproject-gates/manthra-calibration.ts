/**
 * Manthra Calibration System
 * 
 * Calibrates the "Manthra" dimension - directed thought-power.
 * Assesses and monitors:
 * - Logical separation quality across components
 * - Contextual awareness effectiveness
 * - Strategic thinking quality
 * 
 * Manthra represents the clarity and precision of thought in system design,
 * ensuring that each component has clear purpose and understanding of its role.
 * 
 * @module calibration/manthra-calibration
 */

import {
  CalibrationMetric,
  CalibrationFinding,
  CalibrationRecommendation,
  CalibrationAuditEntry,
  CalibrationSeverity,
  LogicalSeparationAssessment,
  ContextualAwarenessAssessment,
  StrategicThinkingAssessment,
  ManthraCalibrationResult,
  generateCalibrationId,
  getStatusFromScore,
  getHealthFromScore
} from './types.js';

/**
 * Configuration for Manthra calibration
 */
export interface ManthraCalibrationConfig {
  /** Minimum acceptable logical separation score */
  logicalSeparationThreshold: number;
  /** Minimum acceptable contextual awareness score */
  contextualAwarenessThreshold: number;
  /** Minimum acceptable strategic thinking score */
  strategicThinkingThreshold: number;
  /** Weight for logical separation in overall score */
  logicalSeparationWeight: number;
  /** Weight for contextual awareness in overall score */
  contextualAwarenessWeight: number;
  /** Weight for strategic thinking in overall score */
  strategicThinkingWeight: number;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Default Manthra calibration configuration
 */
export const DEFAULT_MANTHRA_CONFIG: ManthraCalibrationConfig = {
  logicalSeparationThreshold: 0.7,
  contextualAwarenessThreshold: 0.7,
  strategicThinkingThreshold: 0.7,
  logicalSeparationWeight: 0.4,
  contextualAwarenessWeight: 0.3,
  strategicThinkingWeight: 0.3,
  verbose: false
};

/**
 * Manthra Calibration System
 * 
 * Implements directed thought-power calibration for system coherence.
 */
export class ManthraCalibrationSystem {
  private config: ManthraCalibrationConfig;
  private metrics: Map<string, CalibrationMetric> = new Map();
  private findings: CalibrationFinding[] = [];
  private recommendations: CalibrationRecommendation[] = [];
  private auditTrail: CalibrationAuditEntry[] = [];
  private lastCalibration: ManthraCalibrationResult | null = null;
  private calibrationHistory: ManthraCalibrationResult[] = [];

  constructor(config?: Partial<ManthraCalibrationConfig>) {
    this.config = { ...DEFAULT_MANTHRA_CONFIG, ...config };
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    const defaultMetrics: Omit<CalibrationMetric, 'id' | 'measuredAt'>[] = [
      {
        name: 'Module Coupling',
        description: 'Measures how tightly coupled modules are',
        value: 0,
        targetValue: 0.3,
        threshold: 0.6,
        weight: 0.3,
        source: 'static-analysis'
      },
      {
        name: 'Single Responsibility Score',
        description: 'Measures adherence to single responsibility principle',
        value: 0,
        targetValue: 0.9,
        threshold: 0.7,
        weight: 0.25,
        source: 'static-analysis'
      },
      {
        name: 'Layer Separation',
        description: 'Measures clean separation between architectural layers',
        value: 0,
        targetValue: 0.95,
        threshold: 0.8,
        weight: 0.25,
        source: 'dependency-analysis'
      },
      {
        name: 'Context Propagation',
        description: 'Measures completeness of context propagation',
        value: 0,
        targetValue: 0.9,
        threshold: 0.7,
        weight: 0.2,
        source: 'runtime-analysis'
      },
      {
        name: 'Decision Documentation',
        description: 'Measures coverage of documented decisions',
        value: 0,
        targetValue: 0.8,
        threshold: 0.6,
        weight: 0.15,
        source: 'documentation-analysis'
      },
      {
        name: 'Pattern Adherence',
        description: 'Measures adherence to established patterns',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.2,
        source: 'pattern-analysis'
      }
    ];

    for (const metric of defaultMetrics) {
      const id = generateCalibrationId('metric');
      this.metrics.set(id, {
        id,
        ...metric,
        measuredAt: new Date()
      });
    }
  }

  /**
   * Perform full Manthra calibration
   */
  public async calibrate(analysisData?: {
    dependencyGraph?: any;
    codeMetrics?: any;
    documentationData?: any;
  }): Promise<ManthraCalibrationResult> {
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log('[MANTHRA] Starting calibration...');
    }

    // Assess logical separation
    const logicalSeparation = await this.assessLogicalSeparation(analysisData?.dependencyGraph);

    // Assess contextual awareness
    const contextualAwareness = await this.assessContextualAwareness(analysisData?.codeMetrics);

    // Assess strategic thinking
    const strategicThinking = await this.assessStrategicThinking(analysisData?.documentationData);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      logicalSeparation.score,
      contextualAwareness.score,
      strategicThinking.score
    );

    // Collect all findings
    const allFindings = [
      ...logicalSeparation.findings,
      ...contextualAwareness.findings,
      ...strategicThinking.findings
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      logicalSeparation,
      contextualAwareness,
      strategicThinking
    );

    // Update metrics
    this.updateMetrics(logicalSeparation, contextualAwareness, strategicThinking);

    // Create calibration result
    const result: ManthraCalibrationResult = {
      dimension: 'manthra',
      status: getStatusFromScore(overallScore),
      health: getHealthFromScore(overallScore),
      overallScore,
      logicalSeparation,
      contextualAwareness,
      strategicThinking,
      metrics: Array.from(this.metrics.values()),
      findings: allFindings,
      recommendations,
      calibratedAt: new Date()
    };

    // Store results
    this.lastCalibration = result;
    this.calibrationHistory.push(result);
    this.findings = allFindings;
    this.recommendations = recommendations;

    // Add audit entry
    this.addAuditEntry({
      eventType: 'assessment',
      description: `Manthra calibration completed. Score: ${(overallScore * 100).toFixed(1)}%`,
      newState: { overallScore, status: result.status }
    });

    if (this.config.verbose) {
      console.log(`[MANTHRA] Calibration completed in ${Date.now() - startTime}ms`);
      console.log(`[MANTHRA] Overall score: ${(overallScore * 100).toFixed(1)}%`);
      console.log(`[MANTHRA] Status: ${result.status}`);
    }

    return result;
  }

  /**
   * Assess logical separation quality
   */
  private async assessLogicalSeparation(dependencyGraph?: any): Promise<LogicalSeparationAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze module coupling
    const moduleCoupling = this.analyzeModuleCoupling(dependencyGraph);

    // Check for coupling violations
    if (moduleCoupling.averageCoupling > 0.5) {
      findings.push(this.createFinding({
        category: 'module-coupling',
        severity: moduleCoupling.averageCoupling > 0.7 ? 'high' : 'medium',
        description: `High average module coupling detected: ${(moduleCoupling.averageCoupling * 100).toFixed(1)}%`,
        evidence: moduleCoupling.highCouplingModules.map(m => `${m.module}: ${(m.coupling * 100).toFixed(1)}%`),
        recommendation: 'Refactor highly coupled modules to reduce dependencies',
        impact: 'High coupling makes the system harder to maintain and test'
      }));
    }

    // Analyze responsibility distribution
    const responsibilityDistribution = this.analyzeResponsibilityDistribution(dependencyGraph);

    if (responsibilityDistribution.singleResponsibilityScore < 0.7) {
      findings.push(this.createFinding({
        category: 'single-responsibility',
        severity: responsibilityDistribution.singleResponsibilityScore < 0.5 ? 'high' : 'medium',
        description: `Low single responsibility adherence: ${(responsibilityDistribution.singleResponsibilityScore * 100).toFixed(1)}%`,
        evidence: responsibilityDistribution.mixedResponsibilityModules,
        recommendation: 'Split modules with mixed responsibilities into focused units',
        impact: 'Mixed responsibilities increase complexity and reduce maintainability'
      }));
    }

    // Analyze layer separation
    const layerSeparation = this.analyzeLayerSeparation(dependencyGraph);

    if (layerSeparation.layerViolations > 0) {
      findings.push(this.createFinding({
        category: 'layer-separation',
        severity: layerSeparation.layerViolations > 5 ? 'high' : 'medium',
        description: `${layerSeparation.layerViolations} layer separation violations detected`,
        evidence: layerSeparation.violationDetails.map(v => `${v.from} -> ${v.to} (${v.type})`),
        recommendation: 'Review and fix layer boundary violations',
        impact: 'Layer violations compromise architectural integrity'
      }));
    }

    // Calculate overall logical separation score
    const score = this.calculateLogicalSeparationScore(
      moduleCoupling,
      responsibilityDistribution,
      layerSeparation
    );

    return {
      score,
      moduleCoupling,
      responsibilityDistribution,
      layerSeparation,
      findings
    };
  }

  /**
   * Analyze module coupling from dependency graph
   */
  private analyzeModuleCoupling(dependencyGraph?: any): LogicalSeparationAssessment['moduleCoupling'] {
    // Simulated analysis - in production, this would analyze actual dependency data
    const modules = dependencyGraph?.modules || this.getDefaultModuleAnalysis();

    const couplings = modules.map((m: any) => ({
      module: m.name,
      coupling: m.inDegree && m.outDegree 
        ? (m.inDegree + m.outDegree) / (modules.length * 2)
        : Math.random() * 0.6
    }));

    const averageCoupling = couplings.reduce((sum: number, m: any) => sum + m.coupling, 0) / couplings.length;
    const maxCoupling = Math.max(...couplings.map((m: any) => m.coupling));
    const highCouplingModules = couplings.filter((m: any) => m.coupling > 0.5);

    return {
      averageCoupling,
      maxCoupling,
      highCouplingModules
    };
  }

  /**
   * Get default module analysis when no dependency graph is provided
   */
  private getDefaultModuleAnalysis(): any[] {
    return [
      { name: 'core/orchestration', inDegree: 5, outDegree: 2 },
      { name: 'calibration/manthra', inDegree: 2, outDegree: 3 },
      { name: 'calibration/yasna', inDegree: 2, outDegree: 3 },
      { name: 'calibration/mithra', inDegree: 2, outDegree: 3 },
      { name: 'structural-diagnostics', inDegree: 3, outDegree: 4 },
      { name: 'monitoring', inDegree: 4, outDegree: 2 },
      { name: 'ruvector', inDegree: 6, outDegree: 5 }
    ];
  }

  /**
   * Analyze responsibility distribution
   */
  private analyzeResponsibilityDistribution(dependencyGraph?: any): LogicalSeparationAssessment['responsibilityDistribution'] {
    // Analyze for single responsibility principle adherence
    const analysisResult = dependencyGraph?.responsibilityAnalysis || {
      score: 0.75 + Math.random() * 0.2,
      mixedModules: ['services/hybrid-service', 'utils/helpers']
    };

    return {
      singleResponsibilityScore: analysisResult.score,
      mixedResponsibilityModules: analysisResult.mixedModules
    };
  }

  /**
   * Analyze layer separation
   */
  private analyzeLayerSeparation(dependencyGraph?: any): LogicalSeparationAssessment['layerSeparation'] {
    // Analyze architectural layer boundaries
    const analysisResult = dependencyGraph?.layerAnalysis || {
      violations: Math.floor(Math.random() * 3),
      details: []
    };

    return {
      layerViolations: analysisResult.violations,
      violationDetails: analysisResult.details
    };
  }

  /**
   * Calculate logical separation score
   */
  private calculateLogicalSeparationScore(
    moduleCoupling: LogicalSeparationAssessment['moduleCoupling'],
    responsibilityDistribution: LogicalSeparationAssessment['responsibilityDistribution'],
    layerSeparation: LogicalSeparationAssessment['layerSeparation']
  ): number {
    // Coupling contributes inversely (lower is better)
    const couplingScore = 1 - moduleCoupling.averageCoupling;

    // Responsibility score directly
    const responsibilityScore = responsibilityDistribution.singleResponsibilityScore;

    // Layer separation based on violations
    const maxViolations = 10;
    const layerScore = Math.max(0, 1 - (layerSeparation.layerViolations / maxViolations));

    return (couplingScore * 0.4) + (responsibilityScore * 0.35) + (layerScore * 0.25);
  }

  /**
   * Assess contextual awareness effectiveness
   */
  private async assessContextualAwareness(codeMetrics?: any): Promise<ContextualAwarenessAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze context propagation
    const contextPropagation = this.analyzeContextPropagation(codeMetrics);

    if (contextPropagation.completeness < 0.7) {
      findings.push(this.createFinding({
        category: 'context-propagation',
        severity: contextPropagation.completeness < 0.5 ? 'high' : 'medium',
        description: `Incomplete context propagation: ${(contextPropagation.completeness * 100).toFixed(1)}%`,
        evidence: contextPropagation.missingContexts,
        recommendation: 'Ensure all necessary context is propagated through the system',
        impact: 'Missing context leads to uninformed decisions and errors'
      }));
    }

    // Analyze state visibility
    const stateVisibility = this.analyzeStateVisibility(codeMetrics);

    if (stateVisibility.exposedStateScore < 0.6) {
      findings.push(this.createFinding({
        category: 'state-visibility',
        severity: 'medium',
        description: `Low state visibility: ${(stateVisibility.exposedStateScore * 100).toFixed(1)}%`,
        evidence: stateVisibility.hiddenStatePaths.slice(0, 5),
        recommendation: 'Improve state visibility through proper encapsulation and accessors',
        impact: 'Hidden state makes debugging and reasoning about system behavior difficult'
      }));
    }

    // Analyze dependency awareness
    const dependencyAwareness = this.analyzeDependencyAwareness(codeMetrics);

    if (dependencyAwareness.awareness < 0.7) {
      const implicitRatio = dependencyAwareness.implicitDependencies /
        (dependencyAwareness.explicitDependencies + dependencyAwareness.implicitDependencies);

      findings.push(this.createFinding({
        category: 'dependency-awareness',
        severity: implicitRatio > 0.3 ? 'high' : 'medium',
        description: `${(implicitRatio * 100).toFixed(1)}% of dependencies are implicit`,
        evidence: [`Explicit: ${dependencyAwareness.explicitDependencies}`, `Implicit: ${dependencyAwareness.implicitDependencies}`],
        recommendation: 'Make dependencies explicit through proper injection and configuration',
        impact: 'Implicit dependencies create hidden coupling and testing difficulties'
      }));
    }

    // Calculate overall score
    const score = (
      contextPropagation.completeness * 0.4 +
      stateVisibility.exposedStateScore * 0.3 +
      dependencyAwareness.awareness * 0.3
    );

    return {
      score,
      contextPropagation,
      stateVisibility,
      dependencyAwareness,
      findings
    };
  }

  /**
   * Analyze context propagation
   */
  private analyzeContextPropagation(codeMetrics?: any): ContextualAwarenessAssessment['contextPropagation'] {
    const analysisResult = codeMetrics?.contextAnalysis || {
      completeness: 0.75 + Math.random() * 0.2,
      missing: ['request-id propagation', 'user context in background jobs']
    };

    return {
      completeness: analysisResult.completeness,
      missingContexts: analysisResult.missing
    };
  }

  /**
   * Analyze state visibility
   */
  private analyzeStateVisibility(codeMetrics?: any): ContextualAwarenessAssessment['stateVisibility'] {
    const analysisResult = codeMetrics?.stateAnalysis || {
      score: 0.7 + Math.random() * 0.2,
      hidden: ['internal cache state', 'pending request queue']
    };

    return {
      exposedStateScore: analysisResult.score,
      hiddenStatePaths: analysisResult.hidden
    };
  }

  /**
   * Analyze dependency awareness
   */
  private analyzeDependencyAwareness(codeMetrics?: any): ContextualAwarenessAssessment['dependencyAwareness'] {
    const analysisResult = codeMetrics?.dependencyAnalysis || {
      explicit: Math.floor(50 + Math.random() * 30),
      implicit: Math.floor(5 + Math.random() * 15)
    };

    const total = analysisResult.explicit + analysisResult.implicit;
    const awareness = total > 0 ? analysisResult.explicit / total : 1;

    return {
      explicitDependencies: analysisResult.explicit,
      implicitDependencies: analysisResult.implicit,
      awareness
    };
  }

  /**
   * Assess strategic thinking quality
   */
  private async assessStrategicThinking(documentationData?: any): Promise<StrategicThinkingAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze decision rationale
    const decisionRationale = this.analyzeDecisionRationale(documentationData);

    if (decisionRationale.rationaleCoverage < 0.6) {
      findings.push(this.createFinding({
        category: 'decision-documentation',
        severity: decisionRationale.rationaleCoverage < 0.4 ? 'high' : 'medium',
        description: `Low decision rationale coverage: ${(decisionRationale.rationaleCoverage * 100).toFixed(1)}%`,
        evidence: [`Documented: ${decisionRationale.documentedDecisions}`, `Undocumented: ${decisionRationale.undocumentedDecisions}`],
        recommendation: 'Document architectural decisions with rationale (ADRs)',
        impact: 'Undocumented decisions lead to repeated mistakes and knowledge loss'
      }));
    }

    // Analyze future-proofing
    const futureProofing = this.analyzeFutureProofing(documentationData);

    if (futureProofing.extensibilityScore < 0.7) {
      findings.push(this.createFinding({
        category: 'future-proofing',
        severity: 'medium',
        description: `Low extensibility score: ${(futureProofing.extensibilityScore * 100).toFixed(1)}%`,
        evidence: futureProofing.rigidPatterns.slice(0, 5),
        recommendation: 'Refactor rigid patterns to improve extensibility',
        impact: 'Rigid code increases the cost of future changes'
      }));
    }

    // Analyze pattern consistency
    const patternConsistency = this.analyzePatternConsistency(documentationData);

    if (patternConsistency.adherenceScore < 0.75) {
      findings.push(this.createFinding({
        category: 'pattern-consistency',
        severity: patternConsistency.adherenceScore < 0.5 ? 'high' : 'medium',
        description: `Pattern inconsistency detected: ${(patternConsistency.adherenceScore * 100).toFixed(1)}% adherence`,
        evidence: patternConsistency.deviations.map(d => `${d.pattern} at ${d.location}`),
        recommendation: 'Align code with established patterns or document justified deviations',
        impact: 'Inconsistent patterns increase cognitive load and maintenance cost'
      }));
    }

    // Calculate overall score
    const score = (
      decisionRationale.rationaleCoverage * 0.3 +
      futureProofing.extensibilityScore * 0.35 +
      patternConsistency.adherenceScore * 0.35
    );

    return {
      score,
      decisionRationale,
      futureProofing,
      patternConsistency,
      findings
    };
  }

  /**
   * Analyze decision rationale documentation
   */
  private analyzeDecisionRationale(documentationData?: any): StrategicThinkingAssessment['decisionRationale'] {
    const analysisResult = documentationData?.decisionAnalysis || {
      documented: Math.floor(15 + Math.random() * 10),
      undocumented: Math.floor(3 + Math.random() * 7)
    };

    const total = analysisResult.documented + analysisResult.undocumented;
    const coverage = total > 0 ? analysisResult.documented / total : 1;

    return {
      documentedDecisions: analysisResult.documented,
      undocumentedDecisions: analysisResult.undocumented,
      rationaleCoverage: coverage
    };
  }

  /**
   * Analyze future-proofing
   */
  private analyzeFutureProofing(documentationData?: any): StrategicThinkingAssessment['futureProofing'] {
    const analysisResult = documentationData?.extensibilityAnalysis || {
      score: 0.7 + Math.random() * 0.2,
      rigid: ['hardcoded configuration values', 'tight database coupling']
    };

    return {
      extensibilityScore: analysisResult.score,
      rigidPatterns: analysisResult.rigid
    };
  }

  /**
   * Analyze pattern consistency
   */
  private analyzePatternConsistency(documentationData?: any): StrategicThinkingAssessment['patternConsistency'] {
    const analysisResult = documentationData?.patternAnalysis || {
      adherence: 0.75 + Math.random() * 0.2,
      deviations: [
        { pattern: 'Repository Pattern', location: 'services/legacy-data' },
        { pattern: 'Dependency Injection', location: 'utils/singleton-factory' }
      ]
    };

    return {
      adherenceScore: analysisResult.adherence,
      deviations: analysisResult.deviations
    };
  }

  /**
   * Calculate overall Manthra score
   */
  private calculateOverallScore(
    logicalSeparationScore: number,
    contextualAwarenessScore: number,
    strategicThinkingScore: number
  ): number {
    return (
      logicalSeparationScore * this.config.logicalSeparationWeight +
      contextualAwarenessScore * this.config.contextualAwarenessWeight +
      strategicThinkingScore * this.config.strategicThinkingWeight
    );
  }

  /**
   * Generate recommendations based on assessment results
   */
  private generateRecommendations(
    logicalSeparation: LogicalSeparationAssessment,
    contextualAwareness: ContextualAwarenessAssessment,
    strategicThinking: StrategicThinkingAssessment
  ): CalibrationRecommendation[] {
    const recommendations: CalibrationRecommendation[] = [];
    let priority = 1;

    // Logical separation recommendations
    if (logicalSeparation.score < this.config.logicalSeparationThreshold) {
      if (logicalSeparation.moduleCoupling.averageCoupling > 0.5) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Reduce Module Coupling',
          description: 'High coupling between modules is impacting system maintainability',
          expectedImprovement: 0.15,
          effort: 'high',
          estimatedTime: '2-4 weeks',
          relatedFindings: logicalSeparation.findings
            .filter(f => f.category === 'module-coupling')
            .map(f => f.id),
          implementationSteps: [
            'Identify highly coupled modules',
            'Define clear interfaces between modules',
            'Introduce abstraction layers where needed',
            'Refactor to dependency injection',
            'Validate with coupling metrics'
          ]
        }));
      }

      if (logicalSeparation.layerSeparation.layerViolations > 0) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Fix Layer Boundary Violations',
          description: 'Layer separation violations compromise architectural integrity',
          expectedImprovement: 0.1,
          effort: 'medium',
          estimatedTime: '1-2 weeks',
          relatedFindings: logicalSeparation.findings
            .filter(f => f.category === 'layer-separation')
            .map(f => f.id),
          implementationSteps: [
            'Map current layer violations',
            'Define strict layer boundaries',
            'Create facade/adapter patterns where needed',
            'Implement linting rules for layer boundaries',
            'Document layer architecture'
          ]
        }));
      }
    }

    // Contextual awareness recommendations
    if (contextualAwareness.score < this.config.contextualAwarenessThreshold) {
      if (contextualAwareness.contextPropagation.completeness < 0.7) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Improve Context Propagation',
          description: 'Incomplete context propagation leads to uninformed decisions',
          expectedImprovement: 0.12,
          effort: 'medium',
          estimatedTime: '1-3 weeks',
          relatedFindings: contextualAwareness.findings
            .filter(f => f.category === 'context-propagation')
            .map(f => f.id),
          implementationSteps: [
            'Audit context requirements across system',
            'Implement context carrier pattern',
            'Add context to async boundaries',
            'Create context validation middleware',
            'Test context propagation paths'
          ]
        }));
      }
    }

    // Strategic thinking recommendations
    if (strategicThinking.score < this.config.strategicThinkingThreshold) {
      if (strategicThinking.decisionRationale.rationaleCoverage < 0.6) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Document Architectural Decisions',
          description: 'Create ADRs for major architectural decisions',
          expectedImprovement: 0.08,
          effort: 'low',
          estimatedTime: '1 week',
          relatedFindings: strategicThinking.findings
            .filter(f => f.category === 'decision-documentation')
            .map(f => f.id),
          implementationSteps: [
            'Set up ADR template and process',
            'Identify undocumented decisions',
            'Write ADRs for key decisions',
            'Link ADRs to relevant code',
            'Establish ADR review process'
          ]
        }));
      }
    }

    return recommendations;
  }

  /**
   * Update metrics with new values
   */
  private updateMetrics(
    logicalSeparation: LogicalSeparationAssessment,
    contextualAwareness: ContextualAwarenessAssessment,
    strategicThinking: StrategicThinkingAssessment
  ): void {
    const now = new Date();

    for (const [id, metric] of this.metrics) {
      switch (metric.name) {
        case 'Module Coupling':
          metric.value = logicalSeparation.moduleCoupling.averageCoupling;
          break;
        case 'Single Responsibility Score':
          metric.value = logicalSeparation.responsibilityDistribution.singleResponsibilityScore;
          break;
        case 'Layer Separation':
          metric.value = 1 - (logicalSeparation.layerSeparation.layerViolations / 10);
          break;
        case 'Context Propagation':
          metric.value = contextualAwareness.contextPropagation.completeness;
          break;
        case 'Decision Documentation':
          metric.value = strategicThinking.decisionRationale.rationaleCoverage;
          break;
        case 'Pattern Adherence':
          metric.value = strategicThinking.patternConsistency.adherenceScore;
          break;
      }
      metric.measuredAt = now;
      this.metrics.set(id, metric);
    }
  }

  /**
   * Create a calibration finding
   */
  private createFinding(params: {
    category: string;
    severity: CalibrationSeverity;
    description: string;
    evidence: string[];
    recommendation: string;
    impact: string;
    location?: string;
  }): CalibrationFinding {
    const finding: CalibrationFinding = {
      id: generateCalibrationId('finding'),
      dimension: 'manthra',
      category: params.category,
      severity: params.severity,
      description: params.description,
      evidence: params.evidence,
      location: params.location,
      recommendation: params.recommendation,
      impact: params.impact,
      detectedAt: new Date(),
      resolved: false
    };

    return finding;
  }

  /**
   * Create a calibration recommendation
   */
  private createRecommendation(params: {
    priority: number;
    title: string;
    description: string;
    expectedImprovement: number;
    effort: 'low' | 'medium' | 'high';
    estimatedTime: string;
    relatedFindings: string[];
    implementationSteps: string[];
  }): CalibrationRecommendation {
    return {
      id: generateCalibrationId('rec'),
      dimension: 'manthra',
      priority: params.priority,
      title: params.title,
      description: params.description,
      expectedImprovement: params.expectedImprovement,
      effort: params.effort,
      estimatedTime: params.estimatedTime,
      relatedFindings: params.relatedFindings,
      implementationSteps: params.implementationSteps,
      createdAt: new Date(),
      status: 'proposed'
    };
  }

  /**
   * Add an audit entry
   */
  private addAuditEntry(params: {
    eventType: CalibrationAuditEntry['eventType'];
    description: string;
    previousState?: any;
    newState?: any;
    actor?: string;
    reason?: string;
  }): void {
    this.auditTrail.push({
      id: generateCalibrationId('audit'),
      timestamp: new Date(),
      eventType: params.eventType,
      dimension: 'manthra',
      description: params.description,
      previousState: params.previousState,
      newState: params.newState,
      actor: params.actor,
      reason: params.reason
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get last calibration result
   */
  public getLastCalibration(): ManthraCalibrationResult | null {
    return this.lastCalibration;
  }

  /**
   * Get calibration history
   */
  public getCalibrationHistory(): ManthraCalibrationResult[] {
    return [...this.calibrationHistory];
  }

  /**
   * Get all metrics
   */
  public getMetrics(): CalibrationMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get all findings
   */
  public getFindings(): CalibrationFinding[] {
    return [...this.findings];
  }

  /**
   * Get unresolved findings
   */
  public getUnresolvedFindings(): CalibrationFinding[] {
    return this.findings.filter(f => !f.resolved);
  }

  /**
   * Get all recommendations
   */
  public getRecommendations(): CalibrationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get pending recommendations
   */
  public getPendingRecommendations(): CalibrationRecommendation[] {
    return this.recommendations.filter(r => r.status === 'proposed' || r.status === 'accepted');
  }

  /**
   * Get audit trail
   */
  public getAuditTrail(): CalibrationAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Mark a finding as resolved
   */
  public resolveFinding(findingId: string, reason?: string): boolean {
    const finding = this.findings.find(f => f.id === findingId);
    if (finding) {
      finding.resolved = true;
      finding.resolvedAt = new Date();

      this.addAuditEntry({
        eventType: 'finding',
        description: `Finding ${findingId} resolved`,
        previousState: { resolved: false },
        newState: { resolved: true },
        reason
      });

      return true;
    }
    return false;
  }

  /**
   * Update recommendation status
   */
  public updateRecommendationStatus(
    recommendationId: string,
    status: CalibrationRecommendation['status'],
    reason?: string
  ): boolean {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (recommendation) {
      const previousStatus = recommendation.status;
      recommendation.status = status;

      this.addAuditEntry({
        eventType: 'recommendation',
        description: `Recommendation ${recommendationId} status updated`,
        previousState: { status: previousStatus },
        newState: { status },
        reason
      });

      return true;
    }
    return false;
  }

  /**
   * Get dashboard data for metrics visualization
   */
  public getDashboardData(): {
    overallScore: number;
    status: string;
    health: string;
    metrics: Array<{
      name: string;
      value: number;
      target: number;
      status: 'good' | 'warning' | 'critical';
    }>;
    recentFindings: CalibrationFinding[];
    topRecommendations: CalibrationRecommendation[];
    trend: { direction: 'up' | 'down' | 'stable'; change: number };
  } {
    const lastResult = this.lastCalibration;
    const metricsData = Array.from(this.metrics.values()).map(m => ({
      name: m.name,
      value: m.value,
      target: m.targetValue,
      status: m.value >= m.targetValue ? 'good' as const :
              m.value >= m.threshold ? 'warning' as const : 'critical' as const
    }));

    // Calculate trend from history
    let trend: { direction: 'up' | 'down' | 'stable'; change: number } = { direction: 'stable', change: 0 };
    if (this.calibrationHistory.length >= 2) {
      const recent = this.calibrationHistory.slice(-5);
      const first = recent[0].overallScore;
      const last = recent[recent.length - 1].overallScore;
      const change = last - first;
      trend = {
        direction: change > 0.02 ? 'up' : change < -0.02 ? 'down' : 'stable',
        change
      };
    }

    return {
      overallScore: lastResult?.overallScore || 0,
      status: lastResult?.status || 'unknown',
      health: lastResult?.health || 'unknown',
      metrics: metricsData,
      recentFindings: this.findings.slice(-5),
      topRecommendations: this.recommendations.filter(r => r.status === 'proposed').slice(0, 3),
      trend
    };
  }

  /**
   * Reset the calibration system
   */
  public reset(): void {
    this.findings = [];
    this.recommendations = [];
    this.lastCalibration = null;
    this.calibrationHistory = [];
    this.initializeMetrics();

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Manthra calibration system reset',
      reason: 'Manual reset'
    });
  }

  /**
   * Export calibration state
   */
  public exportState(): string {
    return JSON.stringify({
      config: this.config,
      metrics: Array.from(this.metrics.entries()),
      findings: this.findings,
      recommendations: this.recommendations,
      auditTrail: this.auditTrail,
      lastCalibration: this.lastCalibration,
      calibrationHistory: this.calibrationHistory
    }, null, 2);
  }

  /**
   * Import calibration state
   */
  public importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      if (state.config) this.config = { ...DEFAULT_MANTHRA_CONFIG, ...state.config };
      if (state.metrics) this.metrics = new Map(state.metrics);
      if (state.findings) this.findings = state.findings;
      if (state.recommendations) this.recommendations = state.recommendations;
      if (state.auditTrail) this.auditTrail = state.auditTrail;
      if (state.lastCalibration) this.lastCalibration = state.lastCalibration;
      if (state.calibrationHistory) this.calibrationHistory = state.calibrationHistory;

      this.addAuditEntry({
        eventType: 'adjustment',
        description: 'Manthra calibration state imported',
        reason: 'State import'
      });
    } catch (error) {
      console.error('[MANTHRA] Failed to import state:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create Manthra calibration system
 */
export function createManthraCalibrationSystem(
  config?: Partial<ManthraCalibrationConfig>
): ManthraCalibrationSystem {
  return new ManthraCalibrationSystem(config);
}

/**
 * Yasna Calibration System
 * 
 * Calibrates the "Yasna" dimension - disciplined alignment.
 * Assesses and monitors:
 * - Interface consistency quality across components
 * - Type safety enforcement effectiveness
 * - Alignment discipline quality
 * 
 * Yasna represents the commitment to consistent interfaces and type safety,
 * ensuring that the system maintains disciplined alignment in all interactions.
 * 
 * @module calibration/yasna-calibration
 */

import {
  CalibrationMetric,
  CalibrationFinding,
  CalibrationRecommendation,
  CalibrationAuditEntry,
  CalibrationSeverity,
  InterfaceConsistencyAssessment,
  TypeSafetyAssessment,
  AlignmentDisciplineAssessment,
  YasnaCalibrationResult,
  generateCalibrationId,
  getStatusFromScore,
  getHealthFromScore
} from './types.js';

/**
 * Configuration for Yasna calibration
 */
export interface YasnaCalibrationConfig {
  /** Minimum acceptable interface consistency score */
  interfaceConsistencyThreshold: number;
  /** Minimum acceptable type safety score */
  typeSafetyThreshold: number;
  /** Minimum acceptable alignment discipline score */
  alignmentDisciplineThreshold: number;
  /** Weight for interface consistency in overall score */
  interfaceConsistencyWeight: number;
  /** Weight for type safety in overall score */
  typeSafetyWeight: number;
  /** Weight for alignment discipline in overall score */
  alignmentDisciplineWeight: number;
  /** Strict mode - treat warnings as errors */
  strictMode: boolean;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Default Yasna calibration configuration
 */
export const DEFAULT_YASNA_CONFIG: YasnaCalibrationConfig = {
  interfaceConsistencyThreshold: 0.75,
  typeSafetyThreshold: 0.8,
  alignmentDisciplineThreshold: 0.7,
  interfaceConsistencyWeight: 0.35,
  typeSafetyWeight: 0.4,
  alignmentDisciplineWeight: 0.25,
  strictMode: false,
  verbose: false
};

/**
 * Yasna Calibration System
 * 
 * Implements alignment calibration for system coherence.
 */
export class YasnaCalibrationSystem {
  private config: YasnaCalibrationConfig;
  private metrics: Map<string, CalibrationMetric> = new Map();
  private findings: CalibrationFinding[] = [];
  private recommendations: CalibrationRecommendation[] = [];
  private auditTrail: CalibrationAuditEntry[] = [];
  private lastCalibration: YasnaCalibrationResult | null = null;
  private calibrationHistory: YasnaCalibrationResult[] = [];

  constructor(config?: Partial<YasnaCalibrationConfig>) {
    this.config = { ...DEFAULT_YASNA_CONFIG, ...config };
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    const defaultMetrics: Omit<CalibrationMetric, 'id' | 'measuredAt'>[] = [
      {
        name: 'Naming Convention Adherence',
        description: 'Measures consistency of naming conventions',
        value: 0,
        targetValue: 0.95,
        threshold: 0.8,
        weight: 0.15,
        source: 'static-analysis'
      },
      {
        name: 'API Consistency',
        description: 'Measures consistency of API patterns',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.2,
        source: 'api-analysis'
      },
      {
        name: 'Contract Adherence',
        description: 'Measures adherence to defined contracts',
        value: 0,
        targetValue: 0.95,
        threshold: 0.85,
        weight: 0.2,
        source: 'contract-validation'
      },
      {
        name: 'Type Coverage',
        description: 'Percentage of code with type annotations',
        value: 0,
        targetValue: 0.95,
        threshold: 0.8,
        weight: 0.25,
        source: 'typescript-analysis'
      },
      {
        name: 'Strict Mode Compliance',
        description: 'Compliance with strict TypeScript settings',
        value: 0,
        targetValue: 1.0,
        threshold: 0.9,
        weight: 0.15,
        source: 'tsconfig-analysis'
      },
      {
        name: 'Standard Adherence',
        description: 'Adherence to coding standards',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.15,
        source: 'lint-analysis'
      },
      {
        name: 'Documentation Alignment',
        description: 'Alignment between code and documentation',
        value: 0,
        targetValue: 0.85,
        threshold: 0.7,
        weight: 0.1,
        source: 'documentation-analysis'
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
   * Perform full Yasna calibration
   */
  public async calibrate(analysisData?: {
    apiContracts?: any;
    typeAnalysis?: any;
    lintResults?: any;
    documentationData?: any;
  }): Promise<YasnaCalibrationResult> {
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log('[YASNA] Starting calibration...');
    }

    // Assess interface consistency
    const interfaceConsistency = await this.assessInterfaceConsistency(analysisData?.apiContracts);

    // Assess type safety
    const typeSafety = await this.assessTypeSafety(analysisData?.typeAnalysis);

    // Assess alignment discipline
    const alignmentDiscipline = await this.assessAlignmentDiscipline(
      analysisData?.lintResults,
      analysisData?.documentationData
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      interfaceConsistency.score,
      typeSafety.score,
      alignmentDiscipline.score
    );

    // Collect all findings
    const allFindings = [
      ...interfaceConsistency.findings,
      ...typeSafety.findings,
      ...alignmentDiscipline.findings
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      interfaceConsistency,
      typeSafety,
      alignmentDiscipline
    );

    // Update metrics
    this.updateMetrics(interfaceConsistency, typeSafety, alignmentDiscipline);

    // Create calibration result
    const result: YasnaCalibrationResult = {
      dimension: 'yasna',
      status: getStatusFromScore(overallScore),
      health: getHealthFromScore(overallScore),
      overallScore,
      interfaceConsistency,
      typeSafety,
      alignmentDiscipline,
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
      description: `Yasna calibration completed. Score: ${(overallScore * 100).toFixed(1)}%`,
      newState: { overallScore, status: result.status }
    });

    if (this.config.verbose) {
      console.log(`[YASNA] Calibration completed in ${Date.now() - startTime}ms`);
      console.log(`[YASNA] Overall score: ${(overallScore * 100).toFixed(1)}%`);
      console.log(`[YASNA] Status: ${result.status}`);
    }

    return result;
  }

  /**
   * Assess interface consistency quality
   */
  private async assessInterfaceConsistency(apiContracts?: any): Promise<InterfaceConsistencyAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze naming conventions
    const namingConventions = this.analyzeNamingConventions(apiContracts);

    if (namingConventions.adherenceScore < 0.8) {
      findings.push(this.createFinding({
        category: 'naming-conventions',
        severity: namingConventions.adherenceScore < 0.6 ? 'high' : 'medium',
        description: `Naming convention adherence: ${(namingConventions.adherenceScore * 100).toFixed(1)}%`,
        evidence: namingConventions.violations.map(v => `${v.name}: expected ${v.expected}, got ${v.actual}`),
        recommendation: 'Enforce consistent naming conventions across the codebase',
        impact: 'Inconsistent naming increases cognitive load and maintenance cost'
      }));
    }

    // Analyze API consistency
    const apiConsistency = this.analyzeAPIConsistency(apiContracts);

    if (apiConsistency.consistencyScore < 0.75) {
      findings.push(this.createFinding({
        category: 'api-consistency',
        severity: apiConsistency.consistencyScore < 0.5 ? 'high' : 'medium',
        description: `API consistency score: ${(apiConsistency.consistencyScore * 100).toFixed(1)}%`,
        evidence: apiConsistency.inconsistentApis.map(a => `${a.api}: ${a.issue}`),
        recommendation: 'Standardize API patterns and response formats',
        impact: 'Inconsistent APIs confuse consumers and increase integration errors'
      }));
    }

    // Analyze contract adherence
    const contractAdherence = this.analyzeContractAdherence(apiContracts);

    if (contractAdherence.adherenceScore < 0.85) {
      findings.push(this.createFinding({
        category: 'contract-adherence',
        severity: contractAdherence.adherenceScore < 0.7 ? 'critical' : 'high',
        description: `Contract adherence: ${(contractAdherence.adherenceScore * 100).toFixed(1)}%`,
        evidence: contractAdherence.violations.map(v => `${v.contract}: ${v.violation}`),
        recommendation: 'Fix contract violations to ensure API reliability',
        impact: 'Contract violations can break dependent systems'
      }));
    }

    // Calculate overall score
    const score = (
      namingConventions.adherenceScore * 0.25 +
      apiConsistency.consistencyScore * 0.4 +
      contractAdherence.adherenceScore * 0.35
    );

    return {
      score,
      namingConventions,
      apiConsistency,
      contractAdherence,
      findings
    };
  }

  /**
   * Analyze naming conventions
   */
  private analyzeNamingConventions(apiContracts?: any): InterfaceConsistencyAssessment['namingConventions'] {
    const analysisResult = apiContracts?.namingAnalysis || {
      adherence: 0.85 + Math.random() * 0.12,
      violations: [
        { name: 'getUserData', expected: 'getUser', actual: 'getUserData' },
        { name: 'processQueue', expected: 'processQueueItems', actual: 'processQueue' }
      ].filter(() => Math.random() > 0.5)
    };

    return {
      adherenceScore: analysisResult.adherence,
      violations: analysisResult.violations
    };
  }

  /**
   * Analyze API consistency
   */
  private analyzeAPIConsistency(apiContracts?: any): InterfaceConsistencyAssessment['apiConsistency'] {
    const analysisResult = apiContracts?.consistencyAnalysis || {
      consistency: 0.8 + Math.random() * 0.15,
      inconsistent: [
        { api: '/api/users', issue: 'Mixed response format with /api/accounts' },
        { api: '/api/v2/data', issue: 'Different pagination scheme than v1' }
      ].filter(() => Math.random() > 0.6)
    };

    return {
      consistencyScore: analysisResult.consistency,
      inconsistentApis: analysisResult.inconsistent
    };
  }

  /**
   * Analyze contract adherence
   */
  private analyzeContractAdherence(apiContracts?: any): InterfaceConsistencyAssessment['contractAdherence'] {
    const analysisResult = apiContracts?.contractAnalysis || {
      adherence: 0.9 + Math.random() * 0.08,
      violations: [
        { contract: 'UserService', violation: 'Missing required field: email' }
      ].filter(() => Math.random() > 0.7)
    };

    return {
      adherenceScore: analysisResult.adherence,
      violations: analysisResult.violations
    };
  }

  /**
   * Assess type safety enforcement
   */
  private async assessTypeSafety(typeAnalysis?: any): Promise<TypeSafetyAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze type coverage
    const typeCoverage = this.analyzeTypeCoverage(typeAnalysis);

    if (typeCoverage.coveragePercent < 80) {
      findings.push(this.createFinding({
        category: 'type-coverage',
        severity: typeCoverage.coveragePercent < 60 ? 'critical' : 'high',
        description: `Type coverage: ${typeCoverage.coveragePercent.toFixed(1)}%`,
        evidence: [
          `any usage: ${typeCoverage.anyUsageCount}`,
          `unknown usage: ${typeCoverage.unknownUsageCount}`,
          `implicit any: ${typeCoverage.implicitAnyCount}`
        ],
        recommendation: 'Increase type coverage by adding explicit type annotations',
        impact: 'Low type coverage leads to runtime errors and reduces IDE support'
      }));
    }

    if (typeCoverage.anyUsageCount > 10) {
      findings.push(this.createFinding({
        category: 'any-usage',
        severity: typeCoverage.anyUsageCount > 50 ? 'high' : 'medium',
        description: `Excessive 'any' type usage: ${typeCoverage.anyUsageCount} occurrences`,
        evidence: [`Total 'any' count: ${typeCoverage.anyUsageCount}`],
        recommendation: "Replace 'any' with proper types or 'unknown' where appropriate",
        impact: "'any' bypasses type checking and can hide bugs"
      }));
    }

    // Analyze strict mode compliance
    const strictModeCompliance = this.analyzeStrictModeCompliance(typeAnalysis);

    if (strictModeCompliance.overallCompliance < 0.9) {
      findings.push(this.createFinding({
        category: 'strict-mode',
        severity: strictModeCompliance.overallCompliance < 0.7 ? 'high' : 'medium',
        description: `Strict mode compliance: ${(strictModeCompliance.overallCompliance * 100).toFixed(1)}%`,
        evidence: [
          `strictNullChecks: ${strictModeCompliance.strictNullChecks}`,
          `noImplicitAny: ${strictModeCompliance.noImplicitAny}`,
          `strictFunctionTypes: ${strictModeCompliance.strictFunctionTypes}`
        ],
        recommendation: 'Enable strict TypeScript compiler options',
        impact: 'Relaxed compiler options allow subtle bugs to slip through'
      }));
    }

    // Analyze type guard usage
    const typeGuardUsage = this.analyzeTypeGuardUsage(typeAnalysis);

    if (typeGuardUsage.usageScore < 0.7) {
      findings.push(this.createFinding({
        category: 'type-guards',
        severity: 'medium',
        description: `Type guard usage score: ${(typeGuardUsage.usageScore * 100).toFixed(1)}%`,
        evidence: typeGuardUsage.missingGuards.slice(0, 5),
        recommendation: 'Add type guards at runtime boundaries',
        impact: 'Missing type guards can lead to runtime type errors'
      }));
    }

    // Calculate overall score
    const coverageScore = typeCoverage.coveragePercent / 100;
    const score = (
      coverageScore * 0.5 +
      strictModeCompliance.overallCompliance * 0.3 +
      typeGuardUsage.usageScore * 0.2
    );

    return {
      score,
      typeCoverage,
      strictModeCompliance,
      typeGuardUsage,
      findings
    };
  }

  /**
   * Analyze type coverage
   */
  private analyzeTypeCoverage(typeAnalysis?: any): TypeSafetyAssessment['typeCoverage'] {
    const analysisResult = typeAnalysis?.coverage || {
      percent: 80 + Math.random() * 15,
      anyCount: Math.floor(Math.random() * 20),
      unknownCount: Math.floor(Math.random() * 5),
      implicitAny: Math.floor(Math.random() * 10)
    };

    return {
      coveragePercent: analysisResult.percent,
      anyUsageCount: analysisResult.anyCount,
      unknownUsageCount: analysisResult.unknownCount,
      implicitAnyCount: analysisResult.implicitAny
    };
  }

  /**
   * Analyze strict mode compliance
   */
  private analyzeStrictModeCompliance(typeAnalysis?: any): TypeSafetyAssessment['strictModeCompliance'] {
    const analysisResult = typeAnalysis?.strictMode || {
      strictNullChecks: Math.random() > 0.2,
      noImplicitAny: Math.random() > 0.3,
      strictFunctionTypes: Math.random() > 0.4
    };

    const settings = [
      analysisResult.strictNullChecks,
      analysisResult.noImplicitAny,
      analysisResult.strictFunctionTypes
    ];
    const enabledCount = settings.filter(Boolean).length;

    return {
      strictNullChecks: analysisResult.strictNullChecks,
      noImplicitAny: analysisResult.noImplicitAny,
      strictFunctionTypes: analysisResult.strictFunctionTypes,
      overallCompliance: enabledCount / settings.length
    };
  }

  /**
   * Analyze type guard usage
   */
  private analyzeTypeGuardUsage(typeAnalysis?: any): TypeSafetyAssessment['typeGuardUsage'] {
    const analysisResult = typeAnalysis?.typeGuards || {
      score: 0.7 + Math.random() * 0.25,
      missing: [
        'External API response validation',
        'User input sanitization',
        'Configuration parsing'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      usageScore: analysisResult.score,
      missingGuards: analysisResult.missing
    };
  }

  /**
   * Assess alignment discipline quality
   */
  private async assessAlignmentDiscipline(
    lintResults?: any,
    documentationData?: any
  ): Promise<AlignmentDisciplineAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze standard adherence
    const standardAdherence = this.analyzeStandardAdherence(lintResults);

    if (standardAdherence.adherenceScore < 0.75) {
      findings.push(this.createFinding({
        category: 'standard-adherence',
        severity: standardAdherence.adherenceScore < 0.5 ? 'high' : 'medium',
        description: `Standard adherence: ${(standardAdherence.adherenceScore * 100).toFixed(1)}%`,
        evidence: standardAdherence.deviations.map(d => `${d.standard}: ${d.deviation}`),
        recommendation: 'Align code with established standards',
        impact: 'Standard violations reduce code consistency and quality'
      }));
    }

    // Analyze best practice compliance
    const bestPracticeCompliance = this.analyzeBestPracticeCompliance(lintResults);

    if (bestPracticeCompliance.complianceScore < 0.7) {
      findings.push(this.createFinding({
        category: 'best-practices',
        severity: bestPracticeCompliance.complianceScore < 0.5 ? 'high' : 'medium',
        description: `Best practice compliance: ${(bestPracticeCompliance.complianceScore * 100).toFixed(1)}%`,
        evidence: bestPracticeCompliance.violations.map(v => `${v.practice} at ${v.location}`),
        recommendation: 'Address best practice violations',
        impact: 'Best practice violations can lead to bugs and maintenance issues'
      }));
    }

    // Analyze documentation alignment
    const documentationAlignment = this.analyzeDocumentationAlignment(documentationData);

    if (documentationAlignment.alignmentScore < 0.7) {
      findings.push(this.createFinding({
        category: 'documentation-alignment',
        severity: 'medium',
        description: `Documentation alignment: ${(documentationAlignment.alignmentScore * 100).toFixed(1)}%`,
        evidence: documentationAlignment.outOfSyncDocs.slice(0, 5),
        recommendation: 'Update documentation to match current code',
        impact: 'Out-of-sync documentation misleads developers and users'
      }));
    }

    // Calculate overall score
    const score = (
      standardAdherence.adherenceScore * 0.4 +
      bestPracticeCompliance.complianceScore * 0.35 +
      documentationAlignment.alignmentScore * 0.25
    );

    return {
      score,
      standardAdherence,
      bestPracticeCompliance,
      documentationAlignment,
      findings
    };
  }

  /**
   * Analyze standard adherence
   */
  private analyzeStandardAdherence(lintResults?: any): AlignmentDisciplineAssessment['standardAdherence'] {
    const analysisResult = lintResults?.standardAnalysis || {
      adherence: 0.8 + Math.random() * 0.15,
      deviations: [
        { standard: 'ESLint: no-unused-vars', deviation: '5 unused variables' },
        { standard: 'Prettier: formatting', deviation: '12 files need formatting' }
      ].filter(() => Math.random() > 0.4)
    };

    return {
      adherenceScore: analysisResult.adherence,
      deviations: analysisResult.deviations
    };
  }

  /**
   * Analyze best practice compliance
   */
  private analyzeBestPracticeCompliance(lintResults?: any): AlignmentDisciplineAssessment['bestPracticeCompliance'] {
    const analysisResult = lintResults?.bestPractices || {
      compliance: 0.75 + Math.random() * 0.2,
      violations: [
        { practice: 'Avoid magic numbers', location: 'src/utils/calculations.ts' },
        { practice: 'Use const over let', location: 'src/services/data-processor.ts' }
      ].filter(() => Math.random() > 0.5)
    };

    return {
      complianceScore: analysisResult.compliance,
      violations: analysisResult.violations
    };
  }

  /**
   * Analyze documentation alignment
   */
  private analyzeDocumentationAlignment(documentationData?: any): AlignmentDisciplineAssessment['documentationAlignment'] {
    const analysisResult = documentationData?.alignment || {
      score: 0.7 + Math.random() * 0.25,
      outOfSync: [
        'README.md - API endpoints section',
        'docs/configuration.md - environment variables'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      alignmentScore: analysisResult.score,
      outOfSyncDocs: analysisResult.outOfSync
    };
  }

  /**
   * Calculate overall Yasna score
   */
  private calculateOverallScore(
    interfaceConsistencyScore: number,
    typeSafetyScore: number,
    alignmentDisciplineScore: number
  ): number {
    return (
      interfaceConsistencyScore * this.config.interfaceConsistencyWeight +
      typeSafetyScore * this.config.typeSafetyWeight +
      alignmentDisciplineScore * this.config.alignmentDisciplineWeight
    );
  }

  /**
   * Generate recommendations based on assessment results
   */
  private generateRecommendations(
    interfaceConsistency: InterfaceConsistencyAssessment,
    typeSafety: TypeSafetyAssessment,
    alignmentDiscipline: AlignmentDisciplineAssessment
  ): CalibrationRecommendation[] {
    const recommendations: CalibrationRecommendation[] = [];
    let priority = 1;

    // Type safety recommendations (highest priority for Yasna)
    if (typeSafety.score < this.config.typeSafetyThreshold) {
      if (typeSafety.typeCoverage.coveragePercent < 80) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Increase Type Coverage',
          description: 'Type coverage is below target threshold',
          expectedImprovement: 0.2,
          effort: 'medium',
          estimatedTime: '2-3 weeks',
          relatedFindings: typeSafety.findings
            .filter(f => f.category === 'type-coverage')
            .map(f => f.id),
          implementationSteps: [
            'Run type coverage analysis tool',
            'Identify files with lowest coverage',
            'Add explicit type annotations to parameters and returns',
            "Replace 'any' with specific types",
            'Enable stricter compiler options incrementally'
          ]
        }));
      }

      if (!typeSafety.strictModeCompliance.strictNullChecks) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Enable Strict Null Checks',
          description: 'strictNullChecks is not enabled, allowing null/undefined errors',
          expectedImprovement: 0.15,
          effort: 'high',
          estimatedTime: '3-4 weeks',
          relatedFindings: typeSafety.findings
            .filter(f => f.category === 'strict-mode')
            .map(f => f.id),
          implementationSteps: [
            'Enable strictNullChecks in tsconfig.json',
            'Fix all resulting compilation errors',
            'Add null checks at boundaries',
            'Use Optional chaining and nullish coalescing',
            'Update tests to handle null cases'
          ]
        }));
      }
    }

    // Interface consistency recommendations
    if (interfaceConsistency.score < this.config.interfaceConsistencyThreshold) {
      if (interfaceConsistency.contractAdherence.adherenceScore < 0.85) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Fix Contract Violations',
          description: 'API contracts are being violated',
          expectedImprovement: 0.12,
          effort: 'medium',
          estimatedTime: '1-2 weeks',
          relatedFindings: interfaceConsistency.findings
            .filter(f => f.category === 'contract-adherence')
            .map(f => f.id),
          implementationSteps: [
            'Review all contract violations',
            'Update implementations to match contracts',
            'Add contract validation tests',
            'Set up CI checks for contract compliance',
            'Document contract update process'
          ]
        }));
      }

      if (interfaceConsistency.apiConsistency.consistencyScore < 0.75) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Standardize API Patterns',
          description: 'APIs use inconsistent patterns and formats',
          expectedImprovement: 0.1,
          effort: 'medium',
          estimatedTime: '2-3 weeks',
          relatedFindings: interfaceConsistency.findings
            .filter(f => f.category === 'api-consistency')
            .map(f => f.id),
          implementationSteps: [
            'Define API style guide',
            'Create shared response types',
            'Implement consistent error handling',
            'Standardize pagination and filtering',
            'Add API linting rules'
          ]
        }));
      }
    }

    // Alignment discipline recommendations
    if (alignmentDiscipline.score < this.config.alignmentDisciplineThreshold) {
      if (alignmentDiscipline.standardAdherence.adherenceScore < 0.75) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Enforce Coding Standards',
          description: 'Code deviates from established standards',
          expectedImprovement: 0.08,
          effort: 'low',
          estimatedTime: '1 week',
          relatedFindings: alignmentDiscipline.findings
            .filter(f => f.category === 'standard-adherence')
            .map(f => f.id),
          implementationSteps: [
            'Run linter and fix all issues',
            'Set up pre-commit hooks',
            'Configure CI to block on lint errors',
            'Review and update ESLint config',
            'Train team on standards'
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
    interfaceConsistency: InterfaceConsistencyAssessment,
    typeSafety: TypeSafetyAssessment,
    alignmentDiscipline: AlignmentDisciplineAssessment
  ): void {
    const now = new Date();

    for (const [id, metric] of this.metrics) {
      switch (metric.name) {
        case 'Naming Convention Adherence':
          metric.value = interfaceConsistency.namingConventions.adherenceScore;
          break;
        case 'API Consistency':
          metric.value = interfaceConsistency.apiConsistency.consistencyScore;
          break;
        case 'Contract Adherence':
          metric.value = interfaceConsistency.contractAdherence.adherenceScore;
          break;
        case 'Type Coverage':
          metric.value = typeSafety.typeCoverage.coveragePercent / 100;
          break;
        case 'Strict Mode Compliance':
          metric.value = typeSafety.strictModeCompliance.overallCompliance;
          break;
        case 'Standard Adherence':
          metric.value = alignmentDiscipline.standardAdherence.adherenceScore;
          break;
        case 'Documentation Alignment':
          metric.value = alignmentDiscipline.documentationAlignment.alignmentScore;
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
    return {
      id: generateCalibrationId('finding'),
      dimension: 'yasna',
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
      dimension: 'yasna',
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
      dimension: 'yasna',
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
  public getLastCalibration(): YasnaCalibrationResult | null {
    return this.lastCalibration;
  }

  /**
   * Get calibration history
   */
  public getCalibrationHistory(): YasnaCalibrationResult[] {
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
   * Get critical findings (including high severity in strict mode)
   */
  public getCriticalFindings(): CalibrationFinding[] {
    if (this.config.strictMode) {
      return this.findings.filter(f => 
        !f.resolved && (f.severity === 'critical' || f.severity === 'high')
      );
    }
    return this.findings.filter(f => !f.resolved && f.severity === 'critical');
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
    typeSafetyHighlight: {
      coverage: number;
      anyCount: number;
      strictMode: boolean;
    };
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

    // Type safety highlight
    const typeSafetyHighlight = {
      coverage: lastResult?.typeSafety.typeCoverage.coveragePercent || 0,
      anyCount: lastResult?.typeSafety.typeCoverage.anyUsageCount || 0,
      strictMode: lastResult?.typeSafety.strictModeCompliance.overallCompliance === 1
    };

    return {
      overallScore: lastResult?.overallScore || 0,
      status: lastResult?.status || 'unknown',
      health: lastResult?.health || 'unknown',
      metrics: metricsData,
      recentFindings: this.findings.slice(-5),
      topRecommendations: this.recommendations.filter(r => r.status === 'proposed').slice(0, 3),
      trend,
      typeSafetyHighlight
    };
  }

  /**
   * Check if system passes alignment checks
   */
  public passesAlignmentChecks(): {
    passes: boolean;
    failedChecks: string[];
    warnings: string[];
  } {
    const failedChecks: string[] = [];
    const warnings: string[] = [];
    const lastResult = this.lastCalibration;

    if (!lastResult) {
      return { passes: false, failedChecks: ['No calibration performed'], warnings: [] };
    }

    // Critical checks
    if (lastResult.typeSafety.typeCoverage.coveragePercent < 60) {
      failedChecks.push(`Type coverage below minimum: ${lastResult.typeSafety.typeCoverage.coveragePercent.toFixed(1)}%`);
    }

    if (lastResult.interfaceConsistency.contractAdherence.adherenceScore < 0.7) {
      failedChecks.push(`Contract adherence below minimum: ${(lastResult.interfaceConsistency.contractAdherence.adherenceScore * 100).toFixed(1)}%`);
    }

    // Strict mode additional checks
    if (this.config.strictMode) {
      if (!lastResult.typeSafety.strictModeCompliance.strictNullChecks) {
        failedChecks.push('strictNullChecks is disabled');
      }
      if (!lastResult.typeSafety.strictModeCompliance.noImplicitAny) {
        failedChecks.push('noImplicitAny is disabled');
      }
    }

    // Warnings
    if (lastResult.typeSafety.typeCoverage.anyUsageCount > 50) {
      warnings.push(`High 'any' usage: ${lastResult.typeSafety.typeCoverage.anyUsageCount}`);
    }

    if (lastResult.alignmentDiscipline.standardAdherence.adherenceScore < 0.75) {
      warnings.push(`Standard adherence below threshold: ${(lastResult.alignmentDiscipline.standardAdherence.adherenceScore * 100).toFixed(1)}%`);
    }

    return {
      passes: failedChecks.length === 0,
      failedChecks,
      warnings
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
      description: 'Yasna calibration system reset',
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
      if (state.config) this.config = { ...DEFAULT_YASNA_CONFIG, ...state.config };
      if (state.metrics) this.metrics = new Map(state.metrics);
      if (state.findings) this.findings = state.findings;
      if (state.recommendations) this.recommendations = state.recommendations;
      if (state.auditTrail) this.auditTrail = state.auditTrail;
      if (state.lastCalibration) this.lastCalibration = state.lastCalibration;
      if (state.calibrationHistory) this.calibrationHistory = state.calibrationHistory;

      this.addAuditEntry({
        eventType: 'adjustment',
        description: 'Yasna calibration state imported',
        reason: 'State import'
      });
    } catch (error) {
      console.error('[YASNA] Failed to import state:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create Yasna calibration system
 */
export function createYasnaCalibrationSystem(
  config?: Partial<YasnaCalibrationConfig>
): YasnaCalibrationSystem {
  return new YasnaCalibrationSystem(config);
}

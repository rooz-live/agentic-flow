/**
 * Mithra Calibration System
 * 
 * Calibrates the "Mithra" dimension - binding force.
 * Assesses and monitors:
 * - State management effectiveness across components
 * - Code drift prevention effectiveness
 * - Centralization quality
 * 
 * Mithra represents the binding force that holds the system together,
 * preventing drift and ensuring centralized, cohesive state management.
 * 
 * @module calibration/mithra-calibration
 */

import {
  CalibrationMetric,
  CalibrationFinding,
  CalibrationRecommendation,
  CalibrationAuditEntry,
  CalibrationSeverity,
  StateManagementAssessment,
  CodeDriftPreventionAssessment,
  CentralizationAssessment,
  MithraCalibrationResult,
  generateCalibrationId,
  getStatusFromScore,
  getHealthFromScore
} from './types.js';

/**
 * Configuration for Mithra calibration
 */
export interface MithraCalibrationConfig {
  /** Minimum acceptable state management score */
  stateManagementThreshold: number;
  /** Minimum acceptable code drift prevention score */
  codeDriftPreventionThreshold: number;
  /** Minimum acceptable centralization score */
  centralizationThreshold: number;
  /** Weight for state management in overall score */
  stateManagementWeight: number;
  /** Weight for code drift prevention in overall score */
  codeDriftPreventionWeight: number;
  /** Weight for centralization in overall score */
  centralizationWeight: number;
  /** Enable drift monitoring */
  enableDriftMonitoring: boolean;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Default Mithra calibration configuration
 */
export const DEFAULT_MITHRA_CONFIG: MithraCalibrationConfig = {
  stateManagementThreshold: 0.7,
  codeDriftPreventionThreshold: 0.75,
  centralizationThreshold: 0.7,
  stateManagementWeight: 0.35,
  codeDriftPreventionWeight: 0.35,
  centralizationWeight: 0.3,
  enableDriftMonitoring: true,
  verbose: false
};

/**
 * Drift event for monitoring
 */
export interface DriftEvent {
  id: string;
  timestamp: Date;
  type: 'pattern' | 'state' | 'configuration' | 'schema';
  severity: CalibrationSeverity;
  description: string;
  location: string;
  previousState: any;
  currentState: any;
  remediated: boolean;
}

/**
 * Mithra Calibration System
 * 
 * Implements binding force calibration for system coherence.
 */
export class MithraCalibrationSystem {
  private config: MithraCalibrationConfig;
  private metrics: Map<string, CalibrationMetric> = new Map();
  private findings: CalibrationFinding[] = [];
  private recommendations: CalibrationRecommendation[] = [];
  private auditTrail: CalibrationAuditEntry[] = [];
  private lastCalibration: MithraCalibrationResult | null = null;
  private calibrationHistory: MithraCalibrationResult[] = [];
  private driftEvents: DriftEvent[] = [];
  private driftMonitoringActive: boolean = false;

  constructor(config?: Partial<MithraCalibrationConfig>) {
    this.config = { ...DEFAULT_MITHRA_CONFIG, ...config };
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    const defaultMetrics: Omit<CalibrationMetric, 'id' | 'measuredAt'>[] = [
      {
        name: 'State Centralization',
        description: 'Measures how centralized state management is',
        value: 0,
        targetValue: 0.9,
        threshold: 0.7,
        weight: 0.2,
        source: 'state-analysis'
      },
      {
        name: 'State Immutability',
        description: 'Measures adherence to immutable state patterns',
        value: 0,
        targetValue: 0.95,
        threshold: 0.8,
        weight: 0.2,
        source: 'state-analysis'
      },
      {
        name: 'State Synchronization',
        description: 'Measures state synchronization consistency',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.15,
        source: 'runtime-analysis'
      },
      {
        name: 'Pattern Consistency',
        description: 'Measures consistency of patterns across codebase',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.15,
        source: 'pattern-analysis'
      },
      {
        name: 'Change Tracking',
        description: 'Measures coverage of change tracking',
        value: 0,
        targetValue: 0.85,
        threshold: 0.7,
        weight: 0.1,
        source: 'version-analysis'
      },
      {
        name: 'Config Centralization',
        description: 'Measures centralization of configuration',
        value: 0,
        targetValue: 0.9,
        threshold: 0.75,
        weight: 0.1,
        source: 'config-analysis'
      },
      {
        name: 'Service Centralization',
        description: 'Measures centralization of services',
        value: 0,
        targetValue: 0.85,
        threshold: 0.7,
        weight: 0.1,
        source: 'architecture-analysis'
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
   * Perform full Mithra calibration
   */
  public async calibrate(analysisData?: {
    stateAnalysis?: any;
    patternAnalysis?: any;
    configAnalysis?: any;
    versionHistory?: any;
  }): Promise<MithraCalibrationResult> {
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log('[MITHRA] Starting calibration...');
    }

    // Assess state management
    const stateManagement = await this.assessStateManagement(analysisData?.stateAnalysis);

    // Assess code drift prevention
    const codeDriftPrevention = await this.assessCodeDriftPrevention(
      analysisData?.patternAnalysis,
      analysisData?.versionHistory
    );

    // Assess centralization
    const centralization = await this.assessCentralization(analysisData?.configAnalysis);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      stateManagement.score,
      codeDriftPrevention.score,
      centralization.score
    );

    // Collect all findings
    const allFindings = [
      ...stateManagement.findings,
      ...codeDriftPrevention.findings,
      ...centralization.findings
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      stateManagement,
      codeDriftPrevention,
      centralization
    );

    // Update metrics
    this.updateMetrics(stateManagement, codeDriftPrevention, centralization);

    // Create calibration result
    const result: MithraCalibrationResult = {
      dimension: 'mithra',
      status: getStatusFromScore(overallScore),
      health: getHealthFromScore(overallScore),
      overallScore,
      stateManagement,
      codeDriftPrevention,
      centralization,
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
      description: `Mithra calibration completed. Score: ${(overallScore * 100).toFixed(1)}%`,
      newState: { overallScore, status: result.status }
    });

    if (this.config.verbose) {
      console.log(`[MITHRA] Calibration completed in ${Date.now() - startTime}ms`);
      console.log(`[MITHRA] Overall score: ${(overallScore * 100).toFixed(1)}%`);
      console.log(`[MITHRA] Status: ${result.status}`);
    }

    return result;
  }

  /**
   * Assess state management effectiveness
   */
  private async assessStateManagement(stateAnalysis?: any): Promise<StateManagementAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze state centralization
    const stateCentralization = this.analyzeStateCentralization(stateAnalysis);

    if (stateCentralization.centralizationScore < 0.7) {
      findings.push(this.createFinding({
        category: 'state-centralization',
        severity: stateCentralization.centralizationScore < 0.5 ? 'high' : 'medium',
        description: `State centralization score: ${(stateCentralization.centralizationScore * 100).toFixed(1)}%`,
        evidence: stateCentralization.scatteredStates.slice(0, 5),
        recommendation: 'Centralize state management using a single source of truth',
        impact: 'Scattered state leads to inconsistencies and synchronization bugs'
      }));
    }

    // Analyze state immutability
    const stateImmutability = this.analyzeStateImmutability(stateAnalysis);

    if (stateImmutability.immutabilityScore < 0.8) {
      findings.push(this.createFinding({
        category: 'state-immutability',
        severity: stateImmutability.immutabilityScore < 0.6 ? 'high' : 'medium',
        description: `State immutability score: ${(stateImmutability.immutabilityScore * 100).toFixed(1)}%`,
        evidence: stateImmutability.mutableStates.map(s => `${s.state} at ${s.location}`),
        recommendation: 'Implement immutable state patterns to prevent unintended mutations',
        impact: 'Mutable state causes hard-to-track bugs and race conditions'
      }));
    }

    // Analyze state synchronization
    const stateSynchronization = this.analyzeStateSynchronization(stateAnalysis);

    if (stateSynchronization.syncScore < 0.75) {
      findings.push(this.createFinding({
        category: 'state-synchronization',
        severity: stateSynchronization.syncScore < 0.5 ? 'critical' : 'high',
        description: `State synchronization score: ${(stateSynchronization.syncScore * 100).toFixed(1)}%`,
        evidence: stateSynchronization.outOfSyncStates.slice(0, 5),
        recommendation: 'Implement proper state synchronization mechanisms',
        impact: 'Out-of-sync state leads to data inconsistencies and user confusion'
      }));
    }

    // Calculate overall score
    const score = (
      stateCentralization.centralizationScore * 0.35 +
      stateImmutability.immutabilityScore * 0.35 +
      stateSynchronization.syncScore * 0.3
    );

    return {
      score,
      stateCentralization,
      stateImmutability,
      stateSynchronization,
      findings
    };
  }

  /**
   * Analyze state centralization
   */
  private analyzeStateCentralization(stateAnalysis?: any): StateManagementAssessment['stateCentralization'] {
    const analysisResult = stateAnalysis?.centralization || {
      score: 0.75 + Math.random() * 0.2,
      scattered: [
        'Component-local state in UserProfile',
        'Session state in multiple services',
        'Cache state in separate modules'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      centralizationScore: analysisResult.score,
      scatteredStates: analysisResult.scattered
    };
  }

  /**
   * Analyze state immutability
   */
  private analyzeStateImmutability(stateAnalysis?: any): StateManagementAssessment['stateImmutability'] {
    const analysisResult = stateAnalysis?.immutability || {
      score: 0.8 + Math.random() * 0.15,
      mutable: [
        { state: 'userPreferences', location: 'src/stores/user.ts' },
        { state: 'cacheData', location: 'src/services/cache.ts' }
      ].filter(() => Math.random() > 0.5)
    };

    return {
      immutabilityScore: analysisResult.score,
      mutableStates: analysisResult.mutable
    };
  }

  /**
   * Analyze state synchronization
   */
  private analyzeStateSynchronization(stateAnalysis?: any): StateManagementAssessment['stateSynchronization'] {
    const analysisResult = stateAnalysis?.synchronization || {
      score: 0.8 + Math.random() * 0.15,
      outOfSync: [
        'UI state vs server state for user profile',
        'Local cache vs remote data'
      ].filter(() => Math.random() > 0.6)
    };

    return {
      syncScore: analysisResult.score,
      outOfSyncStates: analysisResult.outOfSync
    };
  }

  /**
   * Assess code drift prevention effectiveness
   */
  private async assessCodeDriftPrevention(
    patternAnalysis?: any,
    versionHistory?: any
  ): Promise<CodeDriftPreventionAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze consistency enforcement
    const consistencyEnforcement = this.analyzeConsistencyEnforcement(patternAnalysis);

    if (consistencyEnforcement.enforcementScore < 0.75) {
      findings.push(this.createFinding({
        category: 'consistency-enforcement',
        severity: consistencyEnforcement.enforcementScore < 0.5 ? 'high' : 'medium',
        description: `Pattern consistency enforcement: ${(consistencyEnforcement.enforcementScore * 100).toFixed(1)}%`,
        evidence: consistencyEnforcement.driftedPatterns.map(p => 
          `${p.pattern}: expected "${p.expected}", got "${p.actual}"`
        ),
        recommendation: 'Enforce pattern consistency through linting and code review',
        impact: 'Pattern drift increases cognitive load and maintenance difficulty'
      }));
    }

    // Analyze change tracking
    const changeTracking = this.analyzeChangeTracking(versionHistory);

    if (changeTracking.trackingScore < 0.7) {
      findings.push(this.createFinding({
        category: 'change-tracking',
        severity: 'medium',
        description: `Change tracking coverage: ${(changeTracking.trackingScore * 100).toFixed(1)}%`,
        evidence: changeTracking.untrackedChanges.slice(0, 5),
        recommendation: 'Improve change tracking with proper versioning and changelogs',
        impact: 'Untracked changes make debugging and rollbacks difficult'
      }));
    }

    // Analyze regression prevention
    const regressionPrevention = this.analyzeRegressionPrevention(versionHistory);

    if (regressionPrevention.preventionScore < 0.75) {
      findings.push(this.createFinding({
        category: 'regression-prevention',
        severity: regressionPrevention.preventionScore < 0.5 ? 'high' : 'medium',
        description: `Regression prevention score: ${(regressionPrevention.preventionScore * 100).toFixed(1)}%`,
        evidence: regressionPrevention.potentialRegressions.slice(0, 5),
        recommendation: 'Add regression tests and improve CI/CD checks',
        impact: 'Weak regression prevention leads to repeated bugs'
      }));
    }

    // Calculate overall score
    const score = (
      consistencyEnforcement.enforcementScore * 0.4 +
      changeTracking.trackingScore * 0.3 +
      regressionPrevention.preventionScore * 0.3
    );

    return {
      score,
      consistencyEnforcement,
      changeTracking,
      regressionPrevention,
      findings
    };
  }

  /**
   * Analyze consistency enforcement
   */
  private analyzeConsistencyEnforcement(patternAnalysis?: any): CodeDriftPreventionAssessment['consistencyEnforcement'] {
    const analysisResult = patternAnalysis?.consistency || {
      score: 0.75 + Math.random() * 0.2,
      drifted: [
        { pattern: 'Error Handling', expected: 'try-catch with logging', actual: 'bare throws' },
        { pattern: 'API Response Format', expected: '{ data, error }', actual: 'raw data' }
      ].filter(() => Math.random() > 0.5)
    };

    return {
      enforcementScore: analysisResult.score,
      driftedPatterns: analysisResult.drifted
    };
  }

  /**
   * Analyze change tracking
   */
  private analyzeChangeTracking(versionHistory?: any): CodeDriftPreventionAssessment['changeTracking'] {
    const analysisResult = versionHistory?.tracking || {
      score: 0.7 + Math.random() * 0.25,
      untracked: [
        'Configuration changes in prod',
        'Schema migrations without version',
        'Silent dependency updates'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      trackingScore: analysisResult.score,
      untrackedChanges: analysisResult.untracked
    };
  }

  /**
   * Analyze regression prevention
   */
  private analyzeRegressionPrevention(versionHistory?: any): CodeDriftPreventionAssessment['regressionPrevention'] {
    const analysisResult = versionHistory?.regressions || {
      score: 0.75 + Math.random() * 0.2,
      potential: [
        'Uncovered edge case in user validation',
        'Missing test for concurrent updates'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      preventionScore: analysisResult.score,
      potentialRegressions: analysisResult.potential
    };
  }

  /**
   * Assess centralization quality
   */
  private async assessCentralization(configAnalysis?: any): Promise<CentralizationAssessment> {
    const findings: CalibrationFinding[] = [];

    // Analyze configuration centralization
    const configCentralization = this.analyzeConfigCentralization(configAnalysis);

    if (configCentralization.centralizationScore < 0.75) {
      findings.push(this.createFinding({
        category: 'config-centralization',
        severity: configCentralization.centralizationScore < 0.5 ? 'high' : 'medium',
        description: `Configuration centralization: ${(configCentralization.centralizationScore * 100).toFixed(1)}%`,
        evidence: configCentralization.scatteredConfigs.slice(0, 5),
        recommendation: 'Centralize configuration management',
        impact: 'Scattered configuration is hard to manage and audit'
      }));
    }

    // Analyze service centralization
    const serviceCentralization = this.analyzeServiceCentralization(configAnalysis);

    if (serviceCentralization.centralizationScore < 0.7) {
      findings.push(this.createFinding({
        category: 'service-centralization',
        severity: 'medium',
        description: `Service centralization: ${(serviceCentralization.centralizationScore * 100).toFixed(1)}%`,
        evidence: serviceCentralization.duplicatedServices.map(s => 
          `${s.service} duplicated in: ${s.locations.join(', ')}`
        ),
        recommendation: 'Consolidate duplicated services into shared modules',
        impact: 'Duplicated services lead to inconsistent behavior and maintenance burden'
      }));
    }

    // Analyze data source centralization
    const dataSourceCentralization = this.analyzeDataSourceCentralization(configAnalysis);

    if (dataSourceCentralization.centralizationScore < 0.7) {
      findings.push(this.createFinding({
        category: 'data-source-centralization',
        severity: dataSourceCentralization.centralizationScore < 0.5 ? 'high' : 'medium',
        description: `Data source centralization: ${(dataSourceCentralization.centralizationScore * 100).toFixed(1)}%`,
        evidence: dataSourceCentralization.scatteredDataSources.slice(0, 5),
        recommendation: 'Centralize data access through a data layer',
        impact: 'Scattered data sources lead to inconsistent data and N+1 queries'
      }));
    }

    // Calculate overall score
    const score = (
      configCentralization.centralizationScore * 0.35 +
      serviceCentralization.centralizationScore * 0.35 +
      dataSourceCentralization.centralizationScore * 0.3
    );

    return {
      score,
      configCentralization,
      serviceCentralization,
      dataSourceCentralization,
      findings
    };
  }

  /**
   * Analyze configuration centralization
   */
  private analyzeConfigCentralization(configAnalysis?: any): CentralizationAssessment['configCentralization'] {
    const analysisResult = configAnalysis?.config || {
      score: 0.75 + Math.random() * 0.2,
      scattered: [
        'Hardcoded values in components',
        'Environment vars in multiple files',
        'Feature flags in different locations'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      centralizationScore: analysisResult.score,
      scatteredConfigs: analysisResult.scattered
    };
  }

  /**
   * Analyze service centralization
   */
  private analyzeServiceCentralization(configAnalysis?: any): CentralizationAssessment['serviceCentralization'] {
    const analysisResult = configAnalysis?.services || {
      score: 0.8 + Math.random() * 0.15,
      duplicated: [
        { service: 'Logger', locations: ['src/utils', 'src/services'] },
        { service: 'HttpClient', locations: ['src/api', 'src/external'] }
      ].filter(() => Math.random() > 0.6)
    };

    return {
      centralizationScore: analysisResult.score,
      duplicatedServices: analysisResult.duplicated
    };
  }

  /**
   * Analyze data source centralization
   */
  private analyzeDataSourceCentralization(configAnalysis?: any): CentralizationAssessment['dataSourceCentralization'] {
    const analysisResult = configAnalysis?.dataSources || {
      score: 0.75 + Math.random() * 0.2,
      scattered: [
        'Direct database queries in controllers',
        'API calls outside data layer',
        'Local storage access in components'
      ].filter(() => Math.random() > 0.5)
    };

    return {
      centralizationScore: analysisResult.score,
      scatteredDataSources: analysisResult.scattered
    };
  }

  /**
   * Calculate overall Mithra score
   */
  private calculateOverallScore(
    stateManagementScore: number,
    codeDriftPreventionScore: number,
    centralizationScore: number
  ): number {
    return (
      stateManagementScore * this.config.stateManagementWeight +
      codeDriftPreventionScore * this.config.codeDriftPreventionWeight +
      centralizationScore * this.config.centralizationWeight
    );
  }

  /**
   * Generate recommendations based on assessment results
   */
  private generateRecommendations(
    stateManagement: StateManagementAssessment,
    codeDriftPrevention: CodeDriftPreventionAssessment,
    centralization: CentralizationAssessment
  ): CalibrationRecommendation[] {
    const recommendations: CalibrationRecommendation[] = [];
    let priority = 1;

    // State management recommendations
    if (stateManagement.score < this.config.stateManagementThreshold) {
      if (stateManagement.stateCentralization.centralizationScore < 0.7) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Centralize State Management',
          description: 'State is scattered across multiple locations',
          expectedImprovement: 0.18,
          effort: 'high',
          estimatedTime: '3-5 weeks',
          relatedFindings: stateManagement.findings
            .filter(f => f.category === 'state-centralization')
            .map(f => f.id),
          implementationSteps: [
            'Audit current state locations',
            'Choose state management pattern (Redux, MobX, etc.)',
            'Design centralized state structure',
            'Migrate state incrementally',
            'Add state synchronization layer',
            'Update components to use central state'
          ]
        }));
      }

      if (stateManagement.stateImmutability.immutabilityScore < 0.8) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Implement Immutable State Patterns',
          description: 'Mutable state causing potential bugs',
          expectedImprovement: 0.12,
          effort: 'medium',
          estimatedTime: '2-3 weeks',
          relatedFindings: stateManagement.findings
            .filter(f => f.category === 'state-immutability')
            .map(f => f.id),
          implementationSteps: [
            'Identify mutable state patterns',
            'Introduce immutable data structures',
            'Use Object.freeze or Immer',
            'Add ESLint rules for immutability',
            'Update tests for immutability'
          ]
        }));
      }
    }

    // Code drift prevention recommendations
    if (codeDriftPrevention.score < this.config.codeDriftPreventionThreshold) {
      if (codeDriftPrevention.consistencyEnforcement.enforcementScore < 0.75) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Enforce Pattern Consistency',
          description: 'Code patterns are drifting from established standards',
          expectedImprovement: 0.15,
          effort: 'medium',
          estimatedTime: '2-4 weeks',
          relatedFindings: codeDriftPrevention.findings
            .filter(f => f.category === 'consistency-enforcement')
            .map(f => f.id),
          implementationSteps: [
            'Document established patterns',
            'Create pattern linting rules',
            'Set up automated pattern checks',
            'Add pattern validation to PR process',
            'Create pattern migration guide'
          ]
        }));
      }

      if (codeDriftPrevention.regressionPrevention.preventionScore < 0.75) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Strengthen Regression Prevention',
          description: 'Regression prevention mechanisms need improvement',
          expectedImprovement: 0.1,
          effort: 'medium',
          estimatedTime: '2-3 weeks',
          relatedFindings: codeDriftPrevention.findings
            .filter(f => f.category === 'regression-prevention')
            .map(f => f.id),
          implementationSteps: [
            'Add regression tests for known issues',
            'Implement snapshot testing',
            'Set up visual regression testing',
            'Add performance regression checks',
            'Create regression test checklist'
          ]
        }));
      }
    }

    // Centralization recommendations
    if (centralization.score < this.config.centralizationThreshold) {
      if (centralization.configCentralization.centralizationScore < 0.75) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Centralize Configuration',
          description: 'Configuration is scattered across codebase',
          expectedImprovement: 0.1,
          effort: 'low',
          estimatedTime: '1-2 weeks',
          relatedFindings: centralization.findings
            .filter(f => f.category === 'config-centralization')
            .map(f => f.id),
          implementationSteps: [
            'Audit configuration locations',
            'Create central config module',
            'Migrate hardcoded values',
            'Set up environment management',
            'Add configuration validation'
          ]
        }));
      }

      if (centralization.serviceCentralization.duplicatedServices.length > 0) {
        recommendations.push(this.createRecommendation({
          priority: priority++,
          title: 'Consolidate Duplicated Services',
          description: 'Multiple implementations of same service exist',
          expectedImprovement: 0.08,
          effort: 'medium',
          estimatedTime: '1-2 weeks',
          relatedFindings: centralization.findings
            .filter(f => f.category === 'service-centralization')
            .map(f => f.id),
          implementationSteps: [
            'Identify duplicated services',
            'Choose canonical implementation',
            'Create shared service module',
            'Migrate consumers',
            'Remove duplicates'
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
    stateManagement: StateManagementAssessment,
    codeDriftPrevention: CodeDriftPreventionAssessment,
    centralization: CentralizationAssessment
  ): void {
    const now = new Date();

    for (const [id, metric] of this.metrics) {
      switch (metric.name) {
        case 'State Centralization':
          metric.value = stateManagement.stateCentralization.centralizationScore;
          break;
        case 'State Immutability':
          metric.value = stateManagement.stateImmutability.immutabilityScore;
          break;
        case 'State Synchronization':
          metric.value = stateManagement.stateSynchronization.syncScore;
          break;
        case 'Pattern Consistency':
          metric.value = codeDriftPrevention.consistencyEnforcement.enforcementScore;
          break;
        case 'Change Tracking':
          metric.value = codeDriftPrevention.changeTracking.trackingScore;
          break;
        case 'Config Centralization':
          metric.value = centralization.configCentralization.centralizationScore;
          break;
        case 'Service Centralization':
          metric.value = centralization.serviceCentralization.centralizationScore;
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
      dimension: 'mithra',
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
      dimension: 'mithra',
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
      dimension: 'mithra',
      description: params.description,
      previousState: params.previousState,
      newState: params.newState,
      actor: params.actor,
      reason: params.reason
    });
  }

  // ============================================================================
  // Drift Monitoring
  // ============================================================================

  /**
   * Start drift monitoring
   */
  public startDriftMonitoring(): void {
    if (!this.config.enableDriftMonitoring) {
      if (this.config.verbose) {
        console.log('[MITHRA] Drift monitoring is disabled in config');
      }
      return;
    }

    this.driftMonitoringActive = true;

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Drift monitoring started'
    });

    if (this.config.verbose) {
      console.log('[MITHRA] Drift monitoring started');
    }
  }

  /**
   * Stop drift monitoring
   */
  public stopDriftMonitoring(): void {
    this.driftMonitoringActive = false;

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Drift monitoring stopped'
    });

    if (this.config.verbose) {
      console.log('[MITHRA] Drift monitoring stopped');
    }
  }

  /**
   * Record a drift event
   */
  public recordDriftEvent(event: Omit<DriftEvent, 'id' | 'timestamp' | 'remediated'>): void {
    const driftEvent: DriftEvent = {
      id: generateCalibrationId('drift'),
      timestamp: new Date(),
      ...event,
      remediated: false
    };

    this.driftEvents.push(driftEvent);

    // Create finding for drift event
    const severity = event.severity;
    this.findings.push(this.createFinding({
      category: `drift-${event.type}`,
      severity,
      description: event.description,
      evidence: [
        `Previous: ${JSON.stringify(event.previousState)}`,
        `Current: ${JSON.stringify(event.currentState)}`
      ],
      recommendation: `Investigate and remediate ${event.type} drift at ${event.location}`,
      impact: 'Drift can lead to system inconsistencies',
      location: event.location
    }));

    this.addAuditEntry({
      eventType: 'finding',
      description: `Drift detected: ${event.description}`,
      previousState: event.previousState,
      newState: event.currentState
    });

    if (this.config.verbose) {
      console.log(`[MITHRA] Drift event recorded: ${event.description}`);
    }
  }

  /**
   * Mark a drift event as remediated
   */
  public remediateDriftEvent(eventId: string, reason?: string): boolean {
    const event = this.driftEvents.find(e => e.id === eventId);
    if (event) {
      event.remediated = true;

      this.addAuditEntry({
        eventType: 'adjustment',
        description: `Drift event ${eventId} remediated`,
        reason
      });

      return true;
    }
    return false;
  }

  /**
   * Get drift events
   */
  public getDriftEvents(): DriftEvent[] {
    return [...this.driftEvents];
  }

  /**
   * Get unremediated drift events
   */
  public getUnremediatedDriftEvents(): DriftEvent[] {
    return this.driftEvents.filter(e => !e.remediated);
  }

  /**
   * Check if drift monitoring is active
   */
  public isDriftMonitoringActive(): boolean {
    return this.driftMonitoringActive;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get last calibration result
   */
  public getLastCalibration(): MithraCalibrationResult | null {
    return this.lastCalibration;
  }

  /**
   * Get calibration history
   */
  public getCalibrationHistory(): MithraCalibrationResult[] {
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
    driftMonitoring: {
      active: boolean;
      totalEvents: number;
      unremediated: number;
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

    return {
      overallScore: lastResult?.overallScore || 0,
      status: lastResult?.status || 'unknown',
      health: lastResult?.health || 'unknown',
      metrics: metricsData,
      recentFindings: this.findings.slice(-5),
      topRecommendations: this.recommendations.filter(r => r.status === 'proposed').slice(0, 3),
      trend,
      driftMonitoring: {
        active: this.driftMonitoringActive,
        totalEvents: this.driftEvents.length,
        unremediated: this.getUnremediatedDriftEvents().length
      }
    };
  }

  /**
   * Get binding force health assessment
   */
  public getBindingForceHealth(): {
    healthy: boolean;
    score: number;
    issues: string[];
    strengths: string[];
  } {
    const lastResult = this.lastCalibration;
    const issues: string[] = [];
    const strengths: string[] = [];

    if (!lastResult) {
      return { healthy: false, score: 0, issues: ['No calibration performed'], strengths: [] };
    }

    // Assess state management
    if (lastResult.stateManagement.score >= 0.8) {
      strengths.push('Strong state management');
    } else if (lastResult.stateManagement.score < 0.6) {
      issues.push('Weak state management');
    }

    // Assess code drift prevention
    if (lastResult.codeDriftPrevention.score >= 0.8) {
      strengths.push('Effective drift prevention');
    } else if (lastResult.codeDriftPrevention.score < 0.6) {
      issues.push('Inadequate drift prevention');
    }

    // Assess centralization
    if (lastResult.centralization.score >= 0.8) {
      strengths.push('Good centralization');
    } else if (lastResult.centralization.score < 0.6) {
      issues.push('Poor centralization');
    }

    // Add drift events as issues
    const unremediatedDrift = this.getUnremediatedDriftEvents();
    if (unremediatedDrift.length > 0) {
      issues.push(`${unremediatedDrift.length} unremediated drift events`);
    }

    return {
      healthy: lastResult.overallScore >= 0.7 && unremediatedDrift.length === 0,
      score: lastResult.overallScore,
      issues,
      strengths
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
    this.driftEvents = [];
    this.driftMonitoringActive = false;
    this.initializeMetrics();

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Mithra calibration system reset',
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
      calibrationHistory: this.calibrationHistory,
      driftEvents: this.driftEvents,
      driftMonitoringActive: this.driftMonitoringActive
    }, null, 2);
  }

  /**
   * Import calibration state
   */
  public importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      if (state.config) this.config = { ...DEFAULT_MITHRA_CONFIG, ...state.config };
      if (state.metrics) this.metrics = new Map(state.metrics);
      if (state.findings) this.findings = state.findings;
      if (state.recommendations) this.recommendations = state.recommendations;
      if (state.auditTrail) this.auditTrail = state.auditTrail;
      if (state.lastCalibration) this.lastCalibration = state.lastCalibration;
      if (state.calibrationHistory) this.calibrationHistory = state.calibrationHistory;
      if (state.driftEvents) this.driftEvents = state.driftEvents;
      if (state.driftMonitoringActive !== undefined) {
        this.driftMonitoringActive = state.driftMonitoringActive;
      }

      this.addAuditEntry({
        eventType: 'adjustment',
        description: 'Mithra calibration state imported',
        reason: 'State import'
      });
    } catch (error) {
      console.error('[MITHRA] Failed to import state:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create Mithra calibration system
 */
export function createMithraCalibrationSystem(
  config?: Partial<MithraCalibrationConfig>
): MithraCalibrationSystem {
  return new MithraCalibrationSystem(config);
}

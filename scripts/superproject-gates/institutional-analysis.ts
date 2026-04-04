/**
 * Institutional Structure Failure Analysis
 *
 * Analyzes resilience against institutional structure failure patterns,
 * inspired by Bronze Age collapse scenarios. Implements detection systems
 * for cognitive crises, authority collapse, consensus failure, and institutional decay.
 *
 * @module collapse-resilience/institutional-analysis
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Types of institutional failure patterns
 */
export enum FailurePatternType {
  /** Cognitive crisis when moral/metaphysical frameworks stop mapping */
  COGNITIVE_CRISIS = 'cognitive_crisis',
  /** Authority collapse scenarios */
  AUTHORITY_COLLAPSE = 'authority_collapse',
  /** Consensus failure scenarios */
  CONSENSUS_FAILURE = 'consensus_failure',
  /** Institutional decay patterns */
  INSTITUTIONAL_DECAY = 'institutional_decay',
  /** Cascading institutional failures */
  CASCADE_FAILURE = 'cascade_failure'
}

/**
 * Severity level of a detected failure pattern
 */
export enum FailureSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EXISTENTIAL = 'existential'
}

/**
 * A detected failure pattern
 */
export interface FailurePattern {
  /** Unique identifier */
  id: string;
  /** Type of failure pattern */
  type: FailurePatternType;
  /** Severity level */
  severity: FailureSeverity;
  /** Description of the pattern */
  description: string;
  /** When the pattern was detected */
  detectedAt: Date;
  /** Confidence score (0-1) */
  confidence: number;
  /** Affected institutions/domains */
  affectedInstitutions: string[];
  /** Historical precedent (if any) */
  historicalPrecedent?: string;
  /** Recommended mitigations */
  recommendedMitigations: string[];
}

/**
 * Institutional structure configuration
 */
export interface InstitutionalStructure {
  /** Unique identifier */
  id: string;
  /** Name of the institution */
  name: string;
  /** Type of institution */
  type: 'governance' | 'knowledge' | 'economic' | 'military' | 'religious' | 'technical';
  /** Current health status */
  healthStatus: 'healthy' | 'degraded' | 'failing' | 'collapsed';
  /** Authority level within the system */
  authorityLevel: number;
  /** Dependencies on other institutions */
  dependencies: string[];
  /** Core metaphysical/moral framework */
  framework?: string;
  /** When last assessed */
  lastAssessed: Date;
}

/**
 * Cognitive framework mapping status
 */
export interface FrameworkMapping {
  /** Framework identifier */
  framework: string;
  /** How well the framework maps to reality (0-1) */
  mappingFidelity: number;
  /** Dissonance detected between framework and reality */
  dissonanceLevel: number;
  /** When the framework was last validated */
  lastValidated: Date;
  /** Signs of framework breakdown */
  breakdownSigns: string[];
}

/**
 * Authority structure status
 */
export interface AuthorityStructure {
  /** Authority identifier */
  id: string;
  /** Type of authority */
  type: 'hierarchical' | 'distributed' | 'hybrid';
  /** Current legitimacy score (0-1) */
  legitimacyScore: number;
  /** Compliance rate (0-1) */
  complianceRate: number;
  /** Challenge indicators */
  challengeIndicators: string[];
  /** When last evaluated */
  lastEvaluated: Date;
}

/**
 * Consensus mechanism status
 */
export interface ConsensusMechanism {
  /** Mechanism identifier */
  id: string;
  /** Type of consensus */
  type: 'unanimity' | 'majority' | 'supermajority' | 'delegated' | 'proof';
  /** Current success rate (0-1) */
  successRate: number;
  /** Time to reach consensus (milliseconds) */
  consensusTimeMs: number;
  /** Participation rate (0-1) */
  participationRate: number;
  /** Deadlock frequency */
  deadlockFrequency: number;
  /** When last measured */
  lastMeasured: Date;
}

/**
 * Institutional decay indicators
 */
export interface DecayIndicators {
  /** Institution identifier */
  institutionId: string;
  /** Overall decay score (0-1, higher = more decay) */
  decayScore: number;
  /** Specific decay indicators */
  indicators: {
    /** Loss of specialized knowledge */
    knowledgeErosion: number;
    /** Reduced institutional capacity */
    capacityReduction: number;
    /** Increased corruption */
    corruptionIncrease: number;
    /** Loss of public trust */
    trustErosion: number;
    /** Resource misallocation */
    resourceMisallocation: number;
  };
  /** When measured */
  measuredAt: Date;
}

/**
 * Analysis configuration
 */
export interface InstitutionalAnalysisConfig {
  /** Threshold for triggering failure pattern detection */
  failureThreshold: number;
  /** Window size for pattern detection (milliseconds) */
  detectionWindowMs: number;
  /** Minimum confidence for reporting */
  minConfidence: number;
  /** Whether to enable automatic mitigation suggestions */
  autoMitigation: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_INSTITUTIONAL_ANALYSIS_CONFIG: InstitutionalAnalysisConfig = {
  failureThreshold: 0.7,
  detectionWindowMs: 3600000, // 1 hour
  minConfidence: 0.6,
  autoMitigation: true
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * InstitutionalAnalysisManager analyzes institutional structure failure patterns
 * and provides early warning systems for collapse scenarios.
 */
export class InstitutionalAnalysisManager extends EventEmitter {
  private config: InstitutionalAnalysisConfig;
  private institutions: Map<string, InstitutionalStructure>;
  private failurePatterns: Map<string, FailurePattern>;
  private frameworkMappings: Map<string, FrameworkMapping>;
  private authorityStructures: Map<string, AuthorityStructure>;
  private consensusMechanisms: Map<string, ConsensusMechanism>;
  private decayIndicators: Map<string, DecayIndicators>;
  private analysisHistory: Array<{
    timestamp: Date;
    patterns: string[];
    severity: FailureSeverity;
  }>;
  private readonly maxHistory = 1000;

  /**
   * Create a new InstitutionalAnalysisManager
   * @param config - Analysis configuration
   */
  constructor(config?: Partial<InstitutionalAnalysisConfig>) {
    super();
    this.config = { ...DEFAULT_INSTITUTIONAL_ANALYSIS_CONFIG, ...config };
    this.institutions = new Map();
    this.failurePatterns = new Map();
    this.frameworkMappings = new Map();
    this.authorityStructures = new Map();
    this.consensusMechanisms = new Map();
    this.decayIndicators = new Map();
    this.analysisHistory = [];
  }

  // ============================================================================
  // Institution Management
  // ============================================================================

  /**
   * Register an institutional structure
   * @param institution - Institution to register
   */
  registerInstitution(institution: InstitutionalStructure): void {
    this.institutions.set(institution.id, { ...institution });
    this.emit('institutionRegistered', institution);
  }

  /**
   * Update institution health status
   * @param id - Institution ID
   * @param status - New health status
   */
  updateInstitutionHealth(id: string, status: InstitutionalStructure['healthStatus']): void {
    const institution = this.institutions.get(id);
    if (!institution) {
      throw new Error(`Institution not found: ${id}`);
    }

    const previousStatus = institution.healthStatus;
    institution.healthStatus = status;
    institution.lastAssessed = new Date();

    // Check for status degradation
    if (this.isStatusDegraded(previousStatus, status)) {
      this.analyzeFailurePotential(id, status);
    }

    this.emit('institutionHealthUpdated', { id, previousStatus, newStatus: status });
  }

  /**
   * Get an institution by ID
   * @param id - Institution ID
   * @returns Institution or null if not found
   */
  getInstitution(id: string): InstitutionalStructure | null {
    return this.institutions.get(id) || null;
  }

  /**
   * Get all institutions
   * @returns Map of all institutions
   */
  getAllInstitutions(): Map<string, InstitutionalStructure> {
    return new Map(this.institutions);
  }

  // ============================================================================
  // Cognitive Crisis Detection
  // ============================================================================

  /**
   * Register a cognitive framework mapping
   * @param mapping - Framework mapping to register
   */
  registerFrameworkMapping(mapping: FrameworkMapping): void {
    this.frameworkMappings.set(mapping.framework, { ...mapping });
    this.emit('frameworkMappingRegistered', mapping);

    // Check for cognitive crisis indicators
    this.checkCognitiveCrisis(mapping);
  }

  /**
   * Update framework mapping fidelity
   * @param framework - Framework identifier
   * @param mappingFidelity - New mapping fidelity
   */
  updateFrameworkFidelity(framework: string, mappingFidelity: number): void {
    const mapping = this.frameworkMappings.get(framework);
    if (!mapping) {
      throw new Error(`Framework mapping not found: ${framework}`);
    }

    const previousFidelity = mapping.mappingFidelity;
    mapping.mappingFidelity = mappingFidelity;
    mapping.lastValidated = new Date();

    // Check for significant fidelity loss
    if (previousFidelity - mappingFidelity > 0.2) {
      this.detectCognitiveCrisis(framework, mapping);
    }

    this.emit('frameworkFidelityUpdated', { framework, previousFidelity, newFidelity: mappingFidelity });
  }

  /**
   * Check for cognitive crisis indicators
   * @param mapping - Framework mapping to check
   */
  private checkCognitiveCrisis(mapping: FrameworkMapping): void {
    const crisisIndicators: string[] = [];

    // Low mapping fidelity
    if (mapping.mappingFidelity < 0.5) {
      crisisIndicators.push('Low framework-to-reality mapping fidelity');
    }

    // High dissonance
    if (mapping.dissonanceLevel > 0.7) {
      crisisIndicators.push('High framework dissonance with reality');
    }

    // Multiple breakdown signs
    if (mapping.breakdownSigns.length > 3) {
      crisisIndicators.push(`Multiple framework breakdown signs: ${mapping.breakdownSigns.length}`);
    }

    if (crisisIndicators.length >= 2) {
      this.detectCognitiveCrisis(mapping.framework, mapping);
    }
  }

  /**
   * Detect a cognitive crisis
   * @param framework - Framework identifier
   * @param mapping - Current framework mapping
   */
  private detectCognitiveCrisis(framework: string, mapping: FrameworkMapping): void {
    const severity = this.calculateCrisisSeverity(mapping);
    const confidence = 1 - mapping.mappingFidelity;

    const pattern: FailurePattern = {
      id: this.generatePatternId(),
      type: FailurePatternType.COGNITIVE_CRISIS,
      severity,
      description: `Cognitive crisis detected for framework '${framework}'. Framework no longer maps effectively to reality.`,
      detectedAt: new Date(),
      confidence,
      affectedInstitutions: this.findInstitutionsWithFramework(framework),
      historicalPrecedent: 'Bronze Age: Collapse of Mycenaean palatial civilization when Linear B script lost administrative utility',
      recommendedMitigations: [
        'Develop new framework that better maps to current reality',
        'Preserve institutional memory during framework transition',
        'Establish framework validation mechanisms',
        'Create fallback frameworks for critical operations'
      ]
    };

    this.recordFailurePattern(pattern);
    this.emit('cognitiveCrisisDetected', { framework, pattern });
  }

  // ============================================================================
  // Authority Collapse Detection
  // ============================================================================

  /**
   * Register an authority structure
   * @param authority - Authority structure to register
   */
  registerAuthorityStructure(authority: AuthorityStructure): void {
    this.authorityStructures.set(authority.id, { ...authority });
    this.emit('authorityStructureRegistered', authority);

    // Check for collapse indicators
    this.checkAuthorityCollapse(authority);
  }

  /**
   * Update authority legitimacy score
   * @param id - Authority ID
   * @param legitimacyScore - New legitimacy score
   */
  updateAuthorityLegitimacy(id: string, legitimacyScore: number): void {
    const authority = this.authorityStructures.get(id);
    if (!authority) {
      throw new Error(`Authority structure not found: ${id}`);
    }

    const previousScore = authority.legitimacyScore;
    authority.legitimacyScore = legitimacyScore;
    authority.lastEvaluated = new Date();

    // Check for legitimacy collapse
    if (previousScore > 0.5 && legitimacyScore < 0.3) {
      this.detectAuthorityCollapse(id, authority);
    }

    this.emit('authorityLegitimacyUpdated', { id, previousScore, newScore: legitimacyScore });
  }

  /**
   * Check for authority collapse indicators
   * @param authority - Authority structure to check
   */
  private checkAuthorityCollapse(authority: AuthorityStructure): void {
    const collapseIndicators: string[] = [];

    // Low legitimacy
    if (authority.legitimacyScore < 0.4) {
      collapseIndicators.push('Low authority legitimacy');
    }

    // Low compliance
    if (authority.complianceRate < 0.5) {
      collapseIndicators.push('Low compliance rate');
    }

    // Multiple challenge indicators
    if (authority.challengeIndicators.length > 3) {
      collapseIndicators.push('Multiple authority challenges detected');
    }

    if (collapseIndicators.length >= 2) {
      this.detectAuthorityCollapse(authority.id, authority);
    }
  }

  /**
   * Detect authority collapse
   * @param id - Authority ID
   * @param authority - Authority structure
   */
  private detectAuthorityCollapse(id: string, authority: AuthorityStructure): void {
    const severity = authority.legitimacyScore < 0.2 ? FailureSeverity.CRITICAL : FailureSeverity.HIGH;
    const confidence = 1 - authority.complianceRate;

    const pattern: FailurePattern = {
      id: this.generatePatternId(),
      type: FailurePatternType.AUTHORITY_COLLAPSE,
      severity,
      description: `Authority collapse detected for '${id}'. Legitimacy and compliance have fallen below critical thresholds.`,
      detectedAt: new Date(),
      confidence,
      affectedInstitutions: this.findInstitutionsWithAuthority(id),
      historicalPrecedent: 'Bronze Age: Collapse of Hittite Empire following rapid succession crises and loss of central authority',
      recommendedMitigations: [
        'Establish distributed authority structures',
        'Create legitimacy renewal mechanisms',
        'Implement authority succession protocols',
        'Develop authority-independent operational procedures'
      ]
    };

    this.recordFailurePattern(pattern);
    this.emit('authorityCollapseDetected', { id, pattern });
  }

  // ============================================================================
  // Consensus Failure Detection
  // ============================================================================

  /**
   * Register a consensus mechanism
   * @param mechanism - Consensus mechanism to register
   */
  registerConsensusMechanism(mechanism: ConsensusMechanism): void {
    this.consensusMechanisms.set(mechanism.id, { ...mechanism });
    this.emit('consensusMechanismRegistered', mechanism);

    // Check for failure indicators
    this.checkConsensusFailure(mechanism);
  }

  /**
   * Update consensus mechanism metrics
   * @param id - Mechanism ID
   * @param metrics - Updated metrics
   */
  updateConsensusMetrics(
    id: string,
    metrics: Partial<Pick<ConsensusMechanism, 'successRate' | 'consensusTimeMs' | 'participationRate' | 'deadlockFrequency'>>
  ): void {
    const mechanism = this.consensusMechanisms.get(id);
    if (!mechanism) {
      throw new Error(`Consensus mechanism not found: ${id}`);
    }

    Object.assign(mechanism, metrics);
    mechanism.lastMeasured = new Date();

    // Check for consensus failure
    if (mechanism.successRate < 0.5 || mechanism.deadlockFrequency > 0.3) {
      this.detectConsensusFailure(id, mechanism);
    }

    this.emit('consensusMetricsUpdated', { id, metrics });
  }

  /**
   * Check for consensus failure indicators
   * @param mechanism - Consensus mechanism to check
   */
  private checkConsensusFailure(mechanism: ConsensusMechanism): void {
    const failureIndicators: string[] = [];

    // Low success rate
    if (mechanism.successRate < 0.6) {
      failureIndicators.push('Low consensus success rate');
    }

    // High consensus time
    if (mechanism.consensusTimeMs > 60000) { // > 1 minute
      failureIndicators.push('Excessive consensus time');
    }

    // Low participation
    if (mechanism.participationRate < 0.5) {
      failureIndicators.push('Low participation rate');
    }

    // High deadlock frequency
    if (mechanism.deadlockFrequency > 0.2) {
      failureIndicators.push('High deadlock frequency');
    }

    if (failureIndicators.length >= 2) {
      this.detectConsensusFailure(mechanism.id, mechanism);
    }
  }

  /**
   * Detect consensus failure
   * @param id - Mechanism ID
   * @param mechanism - Consensus mechanism
   */
  private detectConsensusFailure(id: string, mechanism: ConsensusMechanism): void {
    const severity = mechanism.successRate < 0.3 ? FailureSeverity.CRITICAL : FailureSeverity.HIGH;
    const confidence = 1 - mechanism.successRate;

    const pattern: FailurePattern = {
      id: this.generatePatternId(),
      type: FailurePatternType.CONSENSUS_FAILURE,
      severity,
      description: `Consensus failure detected for mechanism '${id}'. Success rate and deadlock frequency indicate systemic issues.`,
      detectedAt: new Date(),
      confidence,
      affectedInstitutions: this.findInstitutionsWithConsensus(id),
      historicalPrecedent: 'Bronze Age: Late Bronze Age collapse marked by inability of palace economies to coordinate responses',
      recommendedMitigations: [
        'Implement alternative consensus mechanisms',
        'Establish deadlock resolution procedures',
        'Create fallback decision protocols',
        'Develop consensus-independent action capabilities'
      ]
    };

    this.recordFailurePattern(pattern);
    this.emit('consensusFailureDetected', { id, pattern });
  }

  // ============================================================================
  // Institutional Decay Detection
  // ============================================================================

  /**
   * Measure institutional decay indicators
   * @param institutionId - Institution ID
   * @returns Decay indicators
   */
  measureDecay(institutionId: string): DecayIndicators {
    const institution = this.institutions.get(institutionId);
    if (!institution) {
      throw new Error(`Institution not found: ${institutionId}`);
    }

    const indicators: DecayIndicators = {
      institutionId,
      decayScore: 0,
      indicators: {
        knowledgeErosion: Math.random() * 0.5,
        capacityReduction: Math.random() * 0.5,
        corruptionIncrease: Math.random() * 0.5,
        trustErosion: Math.random() * 0.5,
        resourceMisallocation: Math.random() * 0.5
      },
      measuredAt: new Date()
    };

    // Calculate overall decay score
    indicators.decayScore = (
      indicators.indicators.knowledgeErosion +
      indicators.indicators.capacityReduction +
      indicators.indicators.corruptionIncrease +
      indicators.indicators.trustErosion +
      indicators.indicators.resourceMisallocation
    ) / 5;

    this.decayIndicators.set(institutionId, indicators);

    // Check for critical decay
    if (indicators.decayScore > 0.6) {
      this.detectInstitutionalDecay(institutionId, indicators);
    }

    this.emit('decayMeasured', { institutionId, indicators });
    return indicators;
  }

  /**
   * Detect institutional decay
   * @param institutionId - Institution ID
   * @param indicators - Decay indicators
   */
  private detectInstitutionalDecay(institutionId: string, indicators: DecayIndicators): void {
    const severity = indicators.decayScore > 0.8 ? FailureSeverity.CRITICAL : FailureSeverity.HIGH;
    const confidence = indicators.decayScore;

    const pattern: FailurePattern = {
      id: this.generatePatternId(),
      type: FailurePatternType.INSTITUTIONAL_DECAY,
      severity,
      description: `Institutional decay detected for '${institutionId}'. Multiple indicators of systemic deterioration present.`,
      detectedAt: new Date(),
      confidence,
      affectedInstitutions: [institutionId],
      historicalPrecedent: 'Bronze Age: Gradual erosion of Mycenaean palatial administration over decades before final collapse',
      recommendedMitigations: [
        'Implement institutional renewal programs',
        'Create knowledge preservation systems',
        'Establish anti-corruption mechanisms',
        'Develop capacity restoration protocols',
        'Create trust-building initiatives'
      ]
    };

    this.recordFailurePattern(pattern);
    this.emit('institutionalDecayDetected', { institutionId, pattern });
  }

  // ============================================================================
  // Cascade Failure Analysis
  // ============================================================================

  /**
   * Analyze potential for cascade failure
   * @param triggerInstitution - Institution that might trigger cascade
   * @returns Cascade analysis
   */
  analyzeCascadePotential(triggerInstitution: string): {
    cascadePath: string[];
    cascadeDepth: number;
    affectedCount: number;
    mitigationActions: string[];
  } {
    const cascadePath: string[] = [triggerInstitution];
    const visited = new Set<string>([triggerInstitution]);
    let cascadeDepth = 0;

    // BFS to find cascade path
    const queue: string[] = [triggerInstitution];
    while (queue.length > 0) {
      const current = queue.shift()!;
      cascadeDepth = Math.max(cascadeDepth, cascadePath.indexOf(current));

      const institution = this.institutions.get(current);
      if (!institution) continue;

      for (const depId of institution.dependencies) {
        if (!visited.has(depId)) {
          visited.add(depId);
          cascadePath.push(depId);
          queue.push(depId);
        }
      }
    }

    // Generate mitigation actions
    const mitigationActions = this.generateCascadeMitigations(triggerInstitution, cascadePath);

    return {
      cascadePath,
      cascadeDepth,
      affectedCount: cascadePath.length - 1,
      mitigationActions
    };
  }

  /**
   * Generate cascade mitigation actions
   * @param trigger - Trigger institution
   * @param path - Cascade path
   * @returns Mitigation actions
   */
  private generateCascadeMitigations(trigger: string, path: string[]): string[] {
    const actions: string[] = [];

    actions.push(`Isolate trigger institution '${trigger}' to prevent cascade`);
    actions.push(`Establish firebreak between '${trigger}' and its dependents`);

    if (path.length > 3) {
      actions.push('Implement system-wide emergency protocols');
      actions.push('Activate minimal viable institutional framework');
    }

    for (const institution of path.slice(1, 4)) {
      actions.push(`Prepare fallback procedures for '${institution}'`);
    }

    return actions;
  }

  // ============================================================================
  // Failure Mode Detection System
  // ============================================================================

  /**
   * Run comprehensive failure mode detection
   * @returns Array of detected failure patterns
   */
  runFailureModeDetection(): FailurePattern[] {
    const detectedPatterns: FailurePattern[] = [];

    // Check all framework mappings for cognitive crisis
    for (const [framework, mapping] of this.frameworkMappings) {
      if (mapping.mappingFidelity < this.config.failureThreshold) {
        this.detectCognitiveCrisis(framework, mapping);
        const pattern = Array.from(this.failurePatterns.values())
          .find(p => p.type === FailurePatternType.COGNITIVE_CRISIS &&
                     p.affectedInstitutions.includes(framework));
        if (pattern) detectedPatterns.push(pattern);
      }
    }

    // Check all authority structures for collapse
    for (const [id, authority] of this.authorityStructures) {
      if (authority.legitimacyScore < this.config.failureThreshold ||
          authority.complianceRate < this.config.failureThreshold) {
        this.detectAuthorityCollapse(id, authority);
        const pattern = Array.from(this.failurePatterns.values())
          .find(p => p.type === FailurePatternType.AUTHORITY_COLLAPSE &&
                     p.affectedInstitutions.includes(id));
        if (pattern) detectedPatterns.push(pattern);
      }
    }

    // Check all consensus mechanisms for failure
    for (const [id, mechanism] of this.consensusMechanisms) {
      if (mechanism.successRate < this.config.failureThreshold ||
          mechanism.deadlockFrequency > (1 - this.config.failureThreshold)) {
        this.detectConsensusFailure(id, mechanism);
        const pattern = Array.from(this.failurePatterns.values())
          .find(p => p.type === FailurePatternType.CONSENSUS_FAILURE &&
                     p.affectedInstitutions.includes(id));
        if (pattern) detectedPatterns.push(pattern);
      }
    }

    // Check all decay indicators
    for (const [institutionId, indicators] of this.decayIndicators) {
      if (indicators.decayScore > this.config.failureThreshold) {
        this.detectInstitutionalDecay(institutionId, indicators);
        const pattern = Array.from(this.failurePatterns.values())
          .find(p => p.type === FailurePatternType.INSTITUTIONAL_DECAY &&
                     p.affectedInstitutions.includes(institutionId));
        if (pattern) detectedPatterns.push(pattern);
      }
    }

    // Record analysis
    this.recordAnalysis(detectedPatterns);

    return detectedPatterns;
  }

  // ============================================================================
  // Reporting and Statistics
  // ============================================================================

  /**
   * Get institutional health report
   * @returns Health report
   */
  getHealthReport(): {
    totalInstitutions: number;
    healthyInstitutions: number;
    degradedInstitutions: number;
    failingInstitutions: number;
    collapsedInstitutions: number;
    activeFailurePatterns: number;
    criticalPatterns: number;
    overallHealthScore: number;
  } {
    let healthy = 0, degraded = 0, failing = 0, collapsed = 0;

    for (const institution of this.institutions.values()) {
      switch (institution.healthStatus) {
        case 'healthy': healthy++; break;
        case 'degraded': degraded++; break;
        case 'failing': failing++; break;
        case 'collapsed': collapsed++; break;
      }
    }

    const activePatterns = Array.from(this.failurePatterns.values())
      .filter(p => Date.now() - p.detectedAt.getTime() < this.config.detectionWindowMs);
    const criticalPatterns = activePatterns.filter(p => p.severity === FailureSeverity.CRITICAL ||
                                                   p.severity === FailureSeverity.EXISTENTIAL);

    const overallHealthScore = (healthy + degraded * 0.5) / this.institutions.size;

    return {
      totalInstitutions: this.institutions.size,
      healthyInstitutions: healthy,
      degradedInstitutions: degraded,
      failingInstitutions: failing,
      collapsedInstitutions: collapsed,
      activeFailurePatterns: activePatterns.length,
      criticalPatterns: criticalPatterns.length,
      overallHealthScore
    };
  }

  /**
   * Get failure pattern history
   * @param filters - Optional filters
   * @returns Filtered failure patterns
   */
  getFailurePatterns(filters?: {
    type?: FailurePatternType;
    since?: Date;
    minSeverity?: FailureSeverity;
  }): FailurePattern[] {
    let result = Array.from(this.failurePatterns.values());

    if (filters?.type) {
      result = result.filter(p => p.type === filters.type);
    }

    if (filters?.since) {
      result = result.filter(p => p.detectedAt >= filters.since!);
    }

    if (filters?.minSeverity) {
      const severityOrder = [FailureSeverity.LOW, FailureSeverity.MEDIUM,
                          FailureSeverity.HIGH, FailureSeverity.CRITICAL, FailureSeverity.EXISTENTIAL];
      const minIndex = severityOrder.indexOf(filters.minSeverity);
      result = result.filter(p => severityOrder.indexOf(p.severity) >= minIndex);
    }

    return result.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Get analysis history
   * @returns Analysis history
   */
  getAnalysisHistory(): Array<{
    timestamp: Date;
    patterns: string[];
    severity: FailureSeverity;
  }> {
    return [...this.analysisHistory];
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): InstitutionalAnalysisConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<InstitutionalAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.institutions.clear();
    this.failurePatterns.clear();
    this.frameworkMappings.clear();
    this.authorityStructures.clear();
    this.consensusMechanisms.clear();
    this.decayIndicators.clear();
    this.analysisHistory = [];
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private recordFailurePattern(pattern: FailurePattern): void {
    this.failurePatterns.set(pattern.id, pattern);

    // Auto-suggest mitigations if enabled
    if (this.config.autoMitigation && pattern.severity === FailureSeverity.CRITICAL) {
      this.emit('mitigationSuggested', {
        pattern,
        mitigations: pattern.recommendedMitigations
      });
    }
  }

  private recordAnalysis(patterns: FailurePattern[]): void {
    const maxSeverity = patterns.length > 0
      ? patterns.reduce((max, p) =>
          this.compareSeverity(p.severity, max) > 0 ? p.severity : max,
          FailureSeverity.LOW)
      : FailureSeverity.LOW;

    this.analysisHistory.push({
      timestamp: new Date(),
      patterns: patterns.map(p => p.id),
      severity: maxSeverity
    });

    if (this.analysisHistory.length > this.maxHistory) {
      this.analysisHistory.shift();
    }
  }

  private analyzeFailurePotential(institutionId: string, status: InstitutionalStructure['healthStatus']): void {
    if (status === 'failing' || status === 'collapsed') {
      const cascade = this.analyzeCascadePotential(institutionId);
      if (cascade.affectedCount > 0) {
        this.emit('cascadeRiskDetected', {
          institutionId,
          cascade
        });
      }
    }
  }

  private calculateCrisisSeverity(mapping: FrameworkMapping): FailureSeverity {
    if (mapping.mappingFidelity < 0.2) return FailureSeverity.EXISTENTIAL;
    if (mapping.mappingFidelity < 0.4) return FailureSeverity.CRITICAL;
    if (mapping.mappingFidelity < 0.6) return FailureSeverity.HIGH;
    return FailureSeverity.MEDIUM;
  }

  private isStatusDegraded(previous: InstitutionalStructure['healthStatus'],
                            current: InstitutionalStructure['healthStatus']): boolean {
    const order = ['healthy', 'degraded', 'failing', 'collapsed'];
    return order.indexOf(current) > order.indexOf(previous);
  }

  private findInstitutionsWithFramework(framework: string): string[] {
    return Array.from(this.institutions.values())
      .filter(i => i.framework === framework)
      .map(i => i.id);
  }

  private findInstitutionsWithAuthority(authorityId: string): string[] {
    return Array.from(this.institutions.values())
      .filter(i => i.dependencies.includes(authorityId))
      .map(i => i.id);
  }

  private findInstitutionsWithConsensus(consensusId: string): string[] {
    return Array.from(this.institutions.values())
      .filter(i => i.dependencies.includes(consensusId))
      .map(i => i.id);
  }

  private compareSeverity(a: FailureSeverity, b: FailureSeverity): number {
    const order = [FailureSeverity.LOW, FailureSeverity.MEDIUM,
                    FailureSeverity.HIGH, FailureSeverity.CRITICAL, FailureSeverity.EXISTENTIAL];
    return order.indexOf(a) - order.indexOf(b);
  }

  private generatePatternId(): string {
    return `pattern-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create an InstitutionalAnalysisManager
 * @param config - Optional configuration
 * @returns Configured InstitutionalAnalysisManager instance
 */
export function createInstitutionalAnalysisManager(
  config?: Partial<InstitutionalAnalysisConfig>
): InstitutionalAnalysisManager {
  return new InstitutionalAnalysisManager(config);
}

/**
 * Technical Precision Under Pressure
 *
 * Maintains technical precision even when unpopular through
 * unpopular truth preservation, oversimplification resistance,
 * technical rigor preservation, and expert protection mechanisms.
 *
 * Inspired by Bronze Age patterns where technical knowledge survived
 * only where precision was maintained against social pressure.
 *
 * @module collapse-resilience/technical-precision
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type of technical assertion
 */
export enum AssertionType {
  EMPIRICAL = 'empirical',
  THEORETICAL = 'theoretical',
  PRACTICAL = 'practical',
  METHODOLOGICAL = 'methodological',
  DEFINITIONAL = 'definitional'
}

/**
 * Status of a truth preservation
 */
export enum PreservationStatus {
  ACTIVE = 'active',
  CHALLENGED = 'challenged',
  VERIFIED = 'verified',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

/**
 * Type of pressure source
 */
export enum PressureSourceType {
  SOCIAL = 'social',
  POLITICAL = 'political',
  ECONOMIC = 'economic',
  INSTITUTIONAL = 'institutional',
  TEMPORAL = 'temporal'
}

/**
 * An unpopular truth being preserved
 */
export interface UnpopularTruth {
  /** Unique identifier */
  id: string;
  /** Truth statement */
  statement: string;
  /** Type of assertion */
  type: AssertionType;
  /** Domain of knowledge */
  domain: string;
  /** Evidence supporting the truth */
  evidence: EvidenceRecord[];
  /** Current preservation status */
  status: PreservationStatus;
  /** Popularity score (-1 to 1, where -1 is very unpopular) */
  popularityScore: number;
  /** Pressure sources challenging the truth */
  pressureSources: PressureSource[];
  /** Preservation mechanisms active */
  preservationMechanisms: PreservationMechanism[];
  /** When the truth was recorded */
  recordedAt: Date;
  /** Last verification date */
  lastVerified: Date;
}

/**
 * Evidence supporting a truth
 */
export interface EvidenceRecord {
  /** Unique identifier */
  id: string;
  /** Type of evidence */
  type: 'experimental' | 'observational' | 'theoretical' | 'historical' | 'logical';
  /** Description */
  description: string;
  /** Source */
  source: string;
  /** Strength score (0-1) */
  strength: number;
  /** When evidence was collected */
  collectedAt: Date;
  /** Verification chain */
  verificationChain: string[];
}

/**
 * A source of pressure against truth
 */
export interface PressureSource {
  /** Unique identifier */
  id: string;
  /** Type of pressure */
  type: PressureSourceType;
  /** Description */
  description: string;
  /** Intensity (0-1) */
  intensity: number;
  /** Duration (days) */
  durationDays: number;
  /** When pressure started */
  startedAt: Date;
  /** Resistance strategies employed */
  resistanceStrategies: string[];
}

/**
 * A mechanism for preserving truth
 */
export interface PreservationMechanism {
  /** Type of mechanism */
  type: 'documentation' | 'redundancy' | 'encryption' | 'distribution' | 'expert_network';
  /** Description */
  description: string;
  /** Effectiveness score (0-1) */
  effectiveness: number;
  /** Active status */
  active: boolean;
}

/**
 * Technical rigor protocol
 */
export interface RigorProtocol {
  /** Unique identifier */
  id: string;
  /** Protocol name */
  name: string;
  /** Domain of application */
  domain: string;
  /** Required precision level */
  precisionLevel: 'high' | 'very_high' | 'extreme' | 'absolute';
  /** Verification requirements */
  verificationRequirements: VerificationRequirement[];
  /** Error tolerance */
  errorTolerance: number;
  /** Peer review requirements */
  peerReviewCount: number;
  /** When protocol was established */
  establishedAt: Date;
}

/**
 * Verification requirement for rigor
 */
export interface VerificationRequirement {
  /** Requirement type */
  type: string;
  /** Description */
  description: string;
  /** Mandatory status */
  mandatory: boolean;
  /** Frequency */
  frequency: 'per_assertion' | 'periodic' | 'random' | 'continuous';
}

/**
 * Expert protection record
 */
export interface ExpertProtection {
  /** Expert identifier */
  expertId: string;
  /** Expert name */
  name: string;
  /** Domains of expertise */
  domains: string[];
  /** Protection status */
  protectionStatus: 'active' | 'inactive' | 'under_threat';
  /** Protection mechanisms */
  protectionMechanisms: string[];
  /** Threat level (0-1) */
  threatLevel: number;
  /** When protection was established */
  establishedAt: Date;
  /** Last assessment date */
  lastAssessed: Date;
}

/**
 * Precision audit record
 */
export interface PrecisionAudit {
  /** Unique identifier */
  id: string;
  /** Domain audited */
  domain: string;
  /** Audit type */
  type: 'scheduled' | 'triggered' | 'random';
  /** Precision score (0-1) */
  precisionScore: number;
  /** Errors found */
  errorsFound: PrecisionError[];
  /** Recommendations */
  recommendations: string[];
  /** When audit was conducted */
  conductedAt: Date;
  /** Auditor identifier */
  auditorId: string;
}

/**
 * A precision error found during audit
 */
export interface PrecisionError {
  /** Error type */
  type: 'factual' | 'methodological' | 'definitional' | 'logical' | 'numerical';
  /** Description */
  description: string;
  /** Severity */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  /** Correction applied */
  correctionApplied: boolean;
  /** Correction description */
  correction?: string;
}

/**
 * Technical precision metrics
 */
export interface PrecisionMetrics {
  /** Overall precision score (0-1) */
  overallPrecision: number;
  /** Truth preservation rate (0-1) */
  truthPreservationRate: number;
  /** Oversimplification resistance (0-1) */
  oversimplificationResistance: number;
  /** Expert protection effectiveness (0-1) */
  expertProtectionEffectiveness: number;
  /** Audit compliance rate (0-1) */
  auditComplianceRate: number;
  /** When metrics were calculated */
  calculatedAt: Date;
}

/**
 * Technical precision configuration
 */
export interface TechnicalPrecisionConfig {
  /** Minimum precision score */
  minPrecisionScore: number;
  /** Minimum evidence strength */
  minEvidenceStrength: number;
  /** Audit interval (days) */
  auditIntervalDays: number;
  /** Required peer reviews */
  requiredPeerReviews: number;
  /** Expert protection threshold */
  expertProtectionThreshold: number;
  /** Enable automatic verification */
  autoVerification: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TECHNICAL_PRECISION_CONFIG: TechnicalPrecisionConfig = {
  minPrecisionScore: 0.9,
  minEvidenceStrength: 0.7,
  auditIntervalDays: 30,
  requiredPeerReviews: 3,
  expertProtectionThreshold: 0.5,
  autoVerification: true
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * TechnicalPrecisionManager maintains technical precision even under
 * social pressure through truth preservation, rigor protocols, and
 * expert protection mechanisms.
 */
export class TechnicalPrecisionManager extends EventEmitter {
  private config: TechnicalPrecisionConfig;
  private unpopularTruths: Map<string, UnpopularTruth>;
  private rigorProtocols: Map<string, RigorProtocol>;
  private expertProtections: Map<string, ExpertProtection>;
  private precisionAudits: Map<string, PrecisionAudit>;
  private precisionMetrics: PrecisionMetrics | null;
  private auditInterval: NodeJS.Timeout | null;

  /**
   * Create a new TechnicalPrecisionManager
   * @param config - Precision configuration
   */
  constructor(config?: Partial<TechnicalPrecisionConfig>) {
    super();
    this.config = { ...DEFAULT_TECHNICAL_PRECISION_CONFIG, ...config };
    this.unpopularTruths = new Map();
    this.rigorProtocols = new Map();
    this.expertProtections = new Map();
    this.precisionAudits = new Map();
    this.precisionMetrics = null;
    this.auditInterval = null;

    // Register default rigor protocols
    this.registerDefaultRigorProtocols();
  }

  // ============================================================================
  // Unpopular Truth Preservation
  // ============================================================================

  /**
   * Preserve an unpopular truth
   * @param truth - Truth to preserve
   * @returns Truth ID
   */
  preserveUnpopularTruth(truth: Omit<UnpopularTruth, 'id' | 'status' | 'recordedAt' | 'lastVerified'>): string {
    const truthId = this.generateTruthId();

    const unpopularTruth: UnpopularTruth = {
      id: truthId,
      ...truth,
      status: PreservationStatus.ACTIVE,
      recordedAt: new Date(),
      lastVerified: new Date()
    };

    // Validate evidence strength
    if (!this.validateEvidenceStrength(unpopularTruth.evidence)) {
      throw new Error(`Evidence does not meet minimum strength requirement: ${this.config.minEvidenceStrength}`);
    }

    this.unpopularTruths.set(truthId, unpopularTruth);
    this.emit('truthPreserved', unpopularTruth);
    return truthId;
  }

  /**
   * Add evidence to an unpopular truth
   * @param truthId - Truth ID
   * @param evidence - Evidence to add
   */
  addEvidence(truthId: string, evidence: Omit<EvidenceRecord, 'id' | 'collectedAt'>): void {
    const truth = this.unpopularTruths.get(truthId);
    if (!truth) {
      throw new Error(`Truth not found: ${truthId}`);
    }

    const evidenceRecord: EvidenceRecord = {
      id: this.generateEvidenceId(),
      ...evidence,
      collectedAt: new Date()
    };

    truth.evidence.push(evidenceRecord);
    this.emit('evidenceAdded', { truthId, evidence: evidenceRecord });
  }

  /**
   * Record pressure against a truth
   * @param truthId - Truth ID
   * @param pressure - Pressure source
   */
  recordPressure(truthId: string, pressure: Omit<PressureSource, 'id' | 'startedAt'>): void {
    const truth = this.unpopularTruths.get(truthId);
    if (!truth) {
      throw new Error(`Truth not found: ${truthId}`);
    }

    const pressureSource: PressureSource = {
      id: this.generatePressureId(),
      ...pressure,
      startedAt: new Date()
    };

    truth.pressureSources.push(pressureSource);

    // Update status if pressure is significant
    if (pressureSource.intensity > 0.7) {
      truth.status = PreservationStatus.CHALLENGED;
    }

    this.emit('pressureRecorded', { truthId, pressure: pressureSource });
  }

  /**
   * Verify a truth against challenges
   * @param truthId - Truth ID
   * @returns Verification result
   */
  verifyTruth(truthId: string): { verified: boolean; confidence: number; challenges: string[] } {
    const truth = this.unpopularTruths.get(truthId);
    if (!truth) {
      throw new Error(`Truth not found: ${truthId}`);
    }

    const challenges: string[] = [];
    let evidenceScore = 0;

    // Calculate evidence score
    for (const evidence of truth.evidence) {
      evidenceScore += evidence.strength;
    }
    evidenceScore = truth.evidence.length > 0 ? evidenceScore / truth.evidence.length : 0;

    // Calculate pressure score
    let pressureScore = 0;
    for (const pressure of truth.pressureSources) {
      pressureScore += pressure.intensity;
      if (pressure.intensity > 0.5) {
        challenges.push(`${pressure.type}: ${pressure.description}`);
      }
    }
    pressureScore = truth.pressureSources.length > 0 ? pressureScore / truth.pressureSources.length : 0;

    // Determine verification result
    const confidence = evidenceScore * (1 - pressureScore * 0.3);
    const verified = confidence >= this.config.minPrecisionScore;

    // Update truth status
    if (verified) {
      truth.status = PreservationStatus.VERIFIED;
    } else if (pressureScore > 0.8) {
      truth.status = PreservationStatus.CHALLENGED;
    }

    truth.lastVerified = new Date();
    this.emit('truthVerified', { truthId, verified, confidence, challenges });

    return { verified, confidence, challenges };
  }

  /**
   * Get an unpopular truth by ID
   * @param id - Truth ID
   * @returns Truth or null if not found
   */
  getUnpopularTruth(id: string): UnpopularTruth | null {
    return this.unpopularTruths.get(id) || null;
  }

  /**
   * Get all unpopular truths
   * @returns Map of all truths
   */
  getAllUnpopularTruths(): Map<string, UnpopularTruth> {
    return new Map(this.unpopularTruths);
  }

  /**
   * Get challenged truths
   * @returns Array of challenged truths
   */
  getChallengedTruths(): UnpopularTruth[] {
    return Array.from(this.unpopularTruths.values())
      .filter(t => t.status === PreservationStatus.CHALLENGED);
  }

  // ============================================================================
  // Oversimplification Resistance
  // ============================================================================

  /**
   * Check for oversimplification in a statement
   * @param statement - Statement to check
   * @param domain - Domain of knowledge
   * @returns Oversimplification analysis
   */
  checkOversimplification(statement: string, domain: string): {
    isOversimplified: boolean;
    complexityScore: number;
    missingNuances: string[];
    recommendations: string[];
  } {
    const missingNuances: string[] = [];
    const recommendations: string[] = [];

    // Check statement length (very short statements tend to be oversimplified)
    const wordCount = statement.split(/\s+/).length;
    let complexityScore = Math.min(wordCount / 50, 1);

    // Check for absolute terms (often indicators of oversimplification)
    const absoluteTerms = ['always', 'never', 'all', 'none', 'every', 'no one', 'everyone'];
    for (const term of absoluteTerms) {
      if (statement.toLowerCase().includes(term)) {
        complexityScore *= 0.9;
        missingNuances.push(`Contains absolute term: "${term}" - consider adding nuance`);
      }
    }

    // Check for qualifying terms (indicators of appropriate complexity)
    const qualifyingTerms = ['sometimes', 'often', 'may', 'can', 'typically', 'generally', 'depending'];
    let qualifierCount = 0;
    for (const term of qualifyingTerms) {
      if (statement.toLowerCase().includes(term)) {
        qualifierCount++;
      }
    }
    complexityScore = Math.min(complexityScore + qualifierCount * 0.1, 1);

    // Domain-specific complexity requirements
    const protocol = this.findProtocolForDomain(domain);
    if (protocol && protocol.precisionLevel === 'extreme' || protocol?.precisionLevel === 'absolute') {
      complexityScore *= 0.9; // Higher standards for high-precision domains
      recommendations.push('Consider additional technical qualifications for this domain');
    }

    const isOversimplified = complexityScore < 0.5;

    if (isOversimplified) {
      recommendations.push('Add qualifying conditions');
      recommendations.push('Specify domain of applicability');
      recommendations.push('Include exceptions and edge cases');
      recommendations.push('Reference supporting evidence');
    }

    this.emit('oversimplificationChecked', { statement, domain, isOversimplified, complexityScore });

    return { isOversimplified, complexityScore, missingNuances, recommendations };
  }

  /**
   * Register resistance to oversimplification
   * @param truthId - Truth ID
   * @param mechanism - Resistance mechanism
   */
  registerOversimplificationResistance(truthId: string, mechanism: PreservationMechanism): void {
    const truth = this.unpopularTruths.get(truthId);
    if (!truth) {
      throw new Error(`Truth not found: ${truthId}`);
    }

    truth.preservationMechanisms.push(mechanism);
    this.emit('oversimplificationResistanceAdded', { truthId, mechanism });
  }

  // ============================================================================
  // Technical Rigor Preservation
  // ============================================================================

  /**
   * Register a rigor protocol
   * @param protocol - Rigor protocol
   * @returns Protocol ID
   */
  registerRigorProtocol(protocol: Omit<RigorProtocol, 'id' | 'establishedAt'>): string {
    const protocolId = this.generateProtocolId();

    const rigorProtocol: RigorProtocol = {
      id: protocolId,
      ...protocol,
      establishedAt: new Date()
    };

    this.rigorProtocols.set(protocolId, rigorProtocol);
    this.emit('rigorProtocolRegistered', rigorProtocol);
    return protocolId;
  }

  /**
   * Apply rigor protocol to an assertion
   * @param assertionId - Assertion/Truth ID
   * @param protocolId - Protocol ID
   * @returns Compliance result
   */
  applyRigorProtocol(assertionId: string, protocolId: string): {
    compliant: boolean;
    score: number;
    unmetRequirements: string[];
  } {
    const protocol = this.rigorProtocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Rigor protocol not found: ${protocolId}`);
    }

    const truth = this.unpopularTruths.get(assertionId);
    if (!truth) {
      throw new Error(`Assertion not found: ${assertionId}`);
    }

    const unmetRequirements: string[] = [];
    let score = 1;

    // Check verification requirements
    for (const requirement of protocol.verificationRequirements) {
      if (requirement.mandatory) {
        const hasVerificationChain = truth.evidence.some(e => e.verificationChain.length >= this.config.requiredPeerReviews);
        if (!hasVerificationChain) {
          unmetRequirements.push(requirement.description);
          score -= 0.2;
        }
      }
    }

    // Check evidence count against peer review requirements
    if (truth.evidence.length < protocol.peerReviewCount) {
      unmetRequirements.push(`Insufficient evidence: ${truth.evidence.length} < ${protocol.peerReviewCount}`);
      score -= 0.3;
    }

    // Check precision level requirements
    const averageEvidenceStrength = truth.evidence.reduce((sum, e) => sum + e.strength, 0) / (truth.evidence.length || 1);
    if (averageEvidenceStrength < this.getPrecisionThreshold(protocol.precisionLevel)) {
      unmetRequirements.push(`Evidence strength below precision level requirement`);
      score -= 0.25;
    }

    score = Math.max(0, score);
    const compliant = unmetRequirements.length === 0;

    this.emit('rigorProtocolApplied', { assertionId, protocolId, compliant, score });

    return { compliant, score, unmetRequirements };
  }

  /**
   * Get a rigor protocol by ID
   * @param id - Protocol ID
   * @returns Protocol or null if not found
   */
  getRigorProtocol(id: string): RigorProtocol | null {
    return this.rigorProtocols.get(id) || null;
  }

  /**
   * Get all rigor protocols
   * @returns Map of all protocols
   */
  getAllRigorProtocols(): Map<string, RigorProtocol> {
    return new Map(this.rigorProtocols);
  }

  // ============================================================================
  // Expert Protection Mechanisms
  // ============================================================================

  /**
   * Register expert protection
   * @param expert - Expert protection configuration
   * @returns Expert ID
   */
  registerExpertProtection(expert: Omit<ExpertProtection, 'establishedAt' | 'lastAssessed'>): string {
    const expertProtection: ExpertProtection = {
      ...expert,
      establishedAt: new Date(),
      lastAssessed: new Date()
    };

    this.expertProtections.set(expert.expertId, expertProtection);
    this.emit('expertProtectionRegistered', expertProtection);
    return expert.expertId;
  }

  /**
   * Update expert threat level
   * @param expertId - Expert ID
   * @param threatLevel - New threat level (0-1)
   */
  updateExpertThreatLevel(expertId: string, threatLevel: number): void {
    const protection = this.expertProtections.get(expertId);
    if (!protection) {
      throw new Error(`Expert protection not found: ${expertId}`);
    }

    protection.threatLevel = Math.max(0, Math.min(1, threatLevel));
    protection.lastAssessed = new Date();

    // Update protection status based on threat level
    if (threatLevel > this.config.expertProtectionThreshold) {
      protection.protectionStatus = 'under_threat';
      this.emit('expertUnderThreat', { expertId, threatLevel });
    } else {
      protection.protectionStatus = 'active';
    }

    this.emit('expertThreatLevelUpdated', { expertId, threatLevel });
  }

  /**
   * Add protection mechanism for expert
   * @param expertId - Expert ID
   * @param mechanism - Protection mechanism
   */
  addProtectionMechanism(expertId: string, mechanism: string): void {
    const protection = this.expertProtections.get(expertId);
    if (!protection) {
      throw new Error(`Expert protection not found: ${expertId}`);
    }

    if (!protection.protectionMechanisms.includes(mechanism)) {
      protection.protectionMechanisms.push(mechanism);
      this.emit('protectionMechanismAdded', { expertId, mechanism });
    }
  }

  /**
   * Get expert protection by ID
   * @param expertId - Expert ID
   * @returns Expert protection or null if not found
   */
  getExpertProtection(expertId: string): ExpertProtection | null {
    return this.expertProtections.get(expertId) || null;
  }

  /**
   * Get experts under threat
   * @returns Array of experts under threat
   */
  getExpertsUnderThreat(): ExpertProtection[] {
    return Array.from(this.expertProtections.values())
      .filter(e => e.protectionStatus === 'under_threat');
  }

  // ============================================================================
  // Precision Audit System
  // ============================================================================

  /**
   * Start automatic auditing
   */
  startAutomaticAuditing(): void {
    if (this.auditInterval) {
      return;
    }

    this.auditInterval = setInterval(() => {
      this.runScheduledAudits();
    }, this.config.auditIntervalDays * 24 * 60 * 60 * 1000);

    this.emit('automaticAuditingStarted', { intervalDays: this.config.auditIntervalDays });
  }

  /**
   * Stop automatic auditing
   */
  stopAutomaticAuditing(): void {
    if (this.auditInterval) {
      clearInterval(this.auditInterval);
      this.auditInterval = null;
      this.emit('automaticAuditingStopped');
    }
  }

  /**
   * Run scheduled audits
   */
  runScheduledAudits(): void {
    const domains = new Set<string>();
    for (const truth of this.unpopularTruths.values()) {
      domains.add(truth.domain);
    }

    for (const domain of domains) {
      this.conductPrecisionAudit(domain, 'scheduled', 'system');
    }
  }

  /**
   * Conduct a precision audit
   * @param domain - Domain to audit
   * @param type - Audit type
   * @param auditorId - Auditor identifier
   * @returns Audit ID
   */
  conductPrecisionAudit(domain: string, type: PrecisionAudit['type'], auditorId: string): string {
    const auditId = this.generateAuditId();
    const errorsFound: PrecisionError[] = [];
    const recommendations: string[] = [];

    // Audit all truths in the domain
    const domainTruths = Array.from(this.unpopularTruths.values())
      .filter(t => t.domain === domain);

    let totalPrecision = 0;
    for (const truth of domainTruths) {
      // Check evidence quality
      for (const evidence of truth.evidence) {
        if (evidence.strength < this.config.minEvidenceStrength) {
          errorsFound.push({
            type: 'methodological',
            description: `Weak evidence in truth ${truth.id}: ${evidence.description}`,
            severity: evidence.strength < 0.5 ? 'major' : 'moderate',
            correctionApplied: false
          });
        }
      }

      // Check verification recency
      const daysSinceVerification = (Date.now() - truth.lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceVerification > this.config.auditIntervalDays * 2) {
        errorsFound.push({
          type: 'methodological',
          description: `Truth ${truth.id} not verified in ${Math.floor(daysSinceVerification)} days`,
          severity: daysSinceVerification > 180 ? 'major' : 'moderate',
          correctionApplied: false
        });
        recommendations.push(`Verify truth ${truth.id}`);
      }

      // Calculate precision contribution
      const evidenceStrength = truth.evidence.reduce((sum, e) => sum + e.strength, 0) / (truth.evidence.length || 1);
      totalPrecision += evidenceStrength;
    }

    const precisionScore = domainTruths.length > 0 ? totalPrecision / domainTruths.length : 0;

    // Generate recommendations based on errors
    if (errorsFound.filter(e => e.severity === 'major' || e.severity === 'critical').length > 0) {
      recommendations.push('Immediate attention required for major precision errors');
    }

    const audit: PrecisionAudit = {
      id: auditId,
      domain,
      type,
      precisionScore,
      errorsFound,
      recommendations,
      conductedAt: new Date(),
      auditorId
    };

    this.precisionAudits.set(auditId, audit);
    this.emit('precisionAuditConducted', audit);

    // Update metrics
    this.updatePrecisionMetrics();

    return auditId;
  }

  /**
   * Get a precision audit by ID
   * @param id - Audit ID
   * @returns Audit or null if not found
   */
  getPrecisionAudit(id: string): PrecisionAudit | null {
    return this.precisionAudits.get(id) || null;
  }

  /**
   * Get precision audit trail
   * @param domain - Optional domain filter
   * @returns Array of audits
   */
  getPrecisionAuditTrail(domain?: string): PrecisionAudit[] {
    let audits = Array.from(this.precisionAudits.values());
    if (domain) {
      audits = audits.filter(a => a.domain === domain);
    }
    return audits.sort((a, b) => b.conductedAt.getTime() - a.conductedAt.getTime());
  }

  // ============================================================================
  // Metrics and Reporting
  // ============================================================================

  /**
   * Update precision metrics
   */
  updatePrecisionMetrics(): void {
    const truths = Array.from(this.unpopularTruths.values());
    const audits = Array.from(this.precisionAudits.values());
    const experts = Array.from(this.expertProtections.values());

    // Calculate overall precision
    let totalPrecision = 0;
    for (const truth of truths) {
      const evidenceStrength = truth.evidence.reduce((sum, e) => sum + e.strength, 0) / (truth.evidence.length || 1);
      totalPrecision += evidenceStrength;
    }
    const overallPrecision = truths.length > 0 ? totalPrecision / truths.length : 0;

    // Calculate truth preservation rate
    const verifiedTruths = truths.filter(t => t.status === PreservationStatus.VERIFIED).length;
    const truthPreservationRate = truths.length > 0 ? verifiedTruths / truths.length : 0;

    // Calculate oversimplification resistance
    let totalResistance = 0;
    for (const truth of truths) {
      const mechanismEffectiveness = truth.preservationMechanisms.reduce((sum, m) => sum + m.effectiveness, 0);
      totalResistance += mechanismEffectiveness / (truth.preservationMechanisms.length || 1);
    }
    const oversimplificationResistance = truths.length > 0 ? totalResistance / truths.length : 0;

    // Calculate expert protection effectiveness
    const protectedExperts = experts.filter(e => e.protectionStatus !== 'under_threat').length;
    const expertProtectionEffectiveness = experts.length > 0 ? protectedExperts / experts.length : 1;

    // Calculate audit compliance rate
    const recentAudits = audits.filter(a => {
      const daysSinceAudit = (Date.now() - a.conductedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceAudit <= this.config.auditIntervalDays;
    });
    const auditComplianceRate = audits.length > 0 ? recentAudits.length / audits.length : 0;

    this.precisionMetrics = {
      overallPrecision,
      truthPreservationRate,
      oversimplificationResistance,
      expertProtectionEffectiveness,
      auditComplianceRate,
      calculatedAt: new Date()
    };

    this.emit('precisionMetricsUpdated', this.precisionMetrics);
  }

  /**
   * Get precision metrics
   * @returns Precision metrics or null if not calculated
   */
  getPrecisionMetrics(): PrecisionMetrics | null {
    return this.precisionMetrics;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTruths: number;
    verifiedTruths: number;
    challengedTruths: number;
    totalProtocols: number;
    totalExperts: number;
    expertsUnderThreat: number;
    totalAudits: number;
    overallPrecision: number | null;
  } {
    const truths = Array.from(this.unpopularTruths.values());
    const experts = Array.from(this.expertProtections.values());

    return {
      totalTruths: truths.length,
      verifiedTruths: truths.filter(t => t.status === PreservationStatus.VERIFIED).length,
      challengedTruths: truths.filter(t => t.status === PreservationStatus.CHALLENGED).length,
      totalProtocols: this.rigorProtocols.size,
      totalExperts: experts.length,
      expertsUnderThreat: experts.filter(e => e.protectionStatus === 'under_threat').length,
      totalAudits: this.precisionAudits.size,
      overallPrecision: this.precisionMetrics?.overallPrecision || null
    };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): TechnicalPrecisionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<TechnicalPrecisionConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auditing if interval changed
    if (config.auditIntervalDays !== undefined && this.auditInterval) {
      this.stopAutomaticAuditing();
      this.startAutomaticAuditing();
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopAutomaticAuditing();
    this.unpopularTruths.clear();
    this.rigorProtocols.clear();
    this.expertProtections.clear();
    this.precisionAudits.clear();
    this.precisionMetrics = null;
    this.registerDefaultRigorProtocols();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private registerDefaultRigorProtocols(): void {
    // High precision scientific protocol
    this.registerRigorProtocol({
      name: 'Scientific Method Protocol',
      domain: 'science',
      precisionLevel: 'very_high',
      verificationRequirements: [
        {
          type: 'peer_review',
          description: 'Independent peer review by domain experts',
          mandatory: true,
          frequency: 'per_assertion'
        },
        {
          type: 'replication',
          description: 'Independent replication of results',
          mandatory: true,
          frequency: 'per_assertion'
        },
        {
          type: 'methodology_review',
          description: 'Review of methodology and approach',
          mandatory: true,
          frequency: 'per_assertion'
        }
      ],
      errorTolerance: 0.05,
      peerReviewCount: 3
    });

    // Engineering precision protocol
    this.registerRigorProtocol({
      name: 'Engineering Precision Protocol',
      domain: 'engineering',
      precisionLevel: 'extreme',
      verificationRequirements: [
        {
          type: 'testing',
          description: 'Comprehensive testing under specified conditions',
          mandatory: true,
          frequency: 'continuous'
        },
        {
          type: 'safety_review',
          description: 'Safety and reliability review',
          mandatory: true,
          frequency: 'per_assertion'
        },
        {
          type: 'standards_compliance',
          description: 'Compliance with industry standards',
          mandatory: true,
          frequency: 'periodic'
        }
      ],
      errorTolerance: 0.01,
      peerReviewCount: 2
    });

    // Historical analysis protocol
    this.registerRigorProtocol({
      name: 'Historical Analysis Protocol',
      domain: 'history',
      precisionLevel: 'high',
      verificationRequirements: [
        {
          type: 'source_verification',
          description: 'Verification of primary sources',
          mandatory: true,
          frequency: 'per_assertion'
        },
        {
          type: 'cross_reference',
          description: 'Cross-referencing with multiple sources',
          mandatory: true,
          frequency: 'per_assertion'
        },
        {
          type: 'contextual_analysis',
          description: 'Analysis within historical context',
          mandatory: true,
          frequency: 'per_assertion'
        }
      ],
      errorTolerance: 0.1,
      peerReviewCount: 2
    });
  }

  private validateEvidenceStrength(evidence: EvidenceRecord[]): boolean {
    if (evidence.length === 0) return false;
    const averageStrength = evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length;
    return averageStrength >= this.config.minEvidenceStrength;
  }

  private findProtocolForDomain(domain: string): RigorProtocol | undefined {
    for (const protocol of this.rigorProtocols.values()) {
      if (protocol.domain === domain) {
        return protocol;
      }
    }
    return undefined;
  }

  private getPrecisionThreshold(level: RigorProtocol['precisionLevel']): number {
    switch (level) {
      case 'high': return 0.7;
      case 'very_high': return 0.85;
      case 'extreme': return 0.95;
      case 'absolute': return 0.99;
      default: return 0.7;
    }
  }

  private generateTruthId(): string {
    return `truth-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateEvidenceId(): string {
    return `evidence-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generatePressureId(): string {
    return `pressure-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateProtocolId(): string {
    return `protocol-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create a TechnicalPrecisionManager
 * @param config - Optional configuration
 * @returns Configured TechnicalPrecisionManager instance
 */
export function createTechnicalPrecisionManager(
  config?: Partial<TechnicalPrecisionConfig>
): TechnicalPrecisionManager {
  return new TechnicalPrecisionManager(config);
}

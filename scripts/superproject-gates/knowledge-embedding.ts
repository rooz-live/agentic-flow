/**
 * Knowledge Embedding in Individuals
 *
 * Implements patterns for embedding knowledge in trained individuals
 * through apprenticeship models, recognition systems, validation mechanisms,
 * and lineage reconnection protocols after disruption.
 *
 * Inspired by Bronze Age patterns where knowledge survived through
 * master-apprentice relationships rather than institutional storage.
 *
 * @module collapse-resilience/knowledge-embedding
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Status of an apprenticeship
 */
export enum ApprenticeshipStatus {
  INITIATED = 'initiated',
  IN_PROGRESS = 'in_progress',
  MASTERY_DEMONSTRATED = 'mastery_demonstrated',
  VALIDATED = 'validated',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

/**
 * Type of knowledge being transmitted
 */
export enum KnowledgeType {
  TECHNICAL = 'technical',
  PROCEDURAL = 'procedural',
  CULTURAL = 'cultural',
  PHILOSOPHICAL = 'philosophical',
  INSTITUTIONAL = 'institutional'
}

/**
 * An apprenticeship relationship
 */
export interface Apprenticeship {
  /** Unique identifier */
  id: string;
  /** Master identifier */
  masterId: string;
  /** Apprentice identifier */
  apprenticeId: string;
  /** Knowledge domain */
  knowledgeDomain: string;
  /** Type of knowledge */
  knowledgeType: KnowledgeType;
  /** Current status */
  status: ApprenticeshipStatus;
  /** Progress level (0-1) */
  progressLevel: number;
  /** When apprenticeship started */
  startedAt: Date;
  /** Estimated completion date */
  estimatedCompletion?: Date;
  /** Actual completion date */
  completedAt?: Date;
  /** Mastery demonstrations */
  masteryDemonstrations: MasteryDemonstration[];
  /** Validation results */
  validationResults: ValidationResult[];
  /** Lineage information */
  lineage: LineageInfo;
}

/**
 * A mastery demonstration
 */
export interface MasteryDemonstration {
  /** Unique identifier */
  id: string;
  /** Apprenticeship ID */
  apprenticeshipId: string;
  /** When demonstration occurred */
  timestamp: Date;
  /** Description of demonstration */
  description: string;
  /** Demonstrated skills */
  demonstratedSkills: string[];
  /** Assessment score (0-1) */
  assessmentScore: number;
  /** Assessor identifier */
  assessorId: string;
  /** Feedback provided */
  feedback: string;
}

/**
 * A validation result
 */
export interface ValidationResult {
  /** Unique identifier */
  id: string;
  /** Apprenticeship ID */
  apprenticeshipId: string;
  /** When validation occurred */
  timestamp: Date;
  /** Type of validation */
  validationType: 'peer_review' | 'practical_test' | 'oral_examination' | 'portfolio_review';
  /** Validation score (0-1) */
  score: number;
  /** Validator identifier */
  validatorId: string;
  /** Validation criteria met */
  criteriaMet: string[];
  /** Criteria not met */
  criteriaNotMet: string[];
  /** Comments */
  comments: string;
}

/**
 * Lineage information for knowledge transmission
 */
export interface LineageInfo {
  /** Lineage identifier */
  id: string;
  /** Name of the knowledge lineage */
  lineageName: string;
  /** Origin of the lineage */
  origin: string;
  /** Known masters in this lineage */
  masters: string[];
  /** Known apprentices in this lineage */
  apprentices: string[];
  /** Notable achievements */
  notableAchievements: string[];
  /** When lineage was established */
  establishedAt: Date;
}

/**
 * Knowledge recognition certificate
 */
export interface KnowledgeCertificate {
  /** Unique identifier */
  id: string;
  /** Recipient identifier */
  recipientId: string;
  /** Knowledge domain */
  knowledgeDomain: string;
  /** Type of knowledge */
  knowledgeType: KnowledgeType;
  /** Certification level */
  certificationLevel: 'novice' | 'apprentice' | 'journeyman' | 'master' | 'grandmaster';
  /** When certified */
  certifiedAt: Date;
  /** Certifying authority */
  certifyingAuthority: string;
  /** Certificate hash for verification */
  certificateHash: string;
  /** Expiration date (if any) */
  expiresAt?: Date;
  /** Skills certified */
  certifiedSkills: string[];
  /** Revocation status */
  revoked: boolean;
  /** Revocation reason (if revoked) */
  revocationReason?: string;
}

/**
 * Knowledge preservation strategy
 */
export interface KnowledgePreservationStrategy {
  /** Strategy identifier */
  id: string;
  /** Knowledge domain */
  knowledgeDomain: string;
  /** Type of preservation */
  preservationType: 'apprenticeship' | 'written' | 'oral' | 'ritual' | 'hybrid';
  /** Primary carriers */
  primaryCarriers: string[];
  /** Backup carriers */
  backupCarriers: string[];
  /** Preservation frequency */
  preservationFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'seasonal';
  /** Validation requirements */
  validationRequirements: string[];
  /** When strategy was established */
  establishedAt: Date;
  /** Last preservation activity */
  lastActivity?: Date;
}

/**
 * Lineage reconnection protocol
 */
export interface LineageReconnection {
  /** Unique identifier */
  id: string;
  /** Lineage to reconnect */
  lineageId: string;
  /** Disruption event that caused separation */
  disruptionEvent: string;
  /** When disruption occurred */
  disruptionDate: Date;
  /** Reconnection status */
  status: 'pending' | 'in_progress' | 'reconnected' | 'failed';
  /** Known surviving masters */
  survivingMasters: string[];
  /** Known surviving apprentices */
  survivingApprentices: string[];
  /** Lost knowledge domains */
  lostDomains: string[];
  /** Reconnection steps */
  reconnectionSteps: ReconnectionStep[];
  /** When reconnection initiated */
  initiatedAt: Date;
  /** Estimated completion */
  estimatedCompletion?: Date;
}

/**
 * A reconnection step
 */
export interface ReconnectionStep {
  /** Step identifier */
  id: string;
  /** Step description */
  description: string;
  /** Step status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Expected outcome */
  expectedOutcome: string;
  /** Actual outcome */
  actualOutcome?: string;
  /** When step was executed */
  executedAt?: Date;
}

/**
 * Knowledge embedding configuration
 */
export interface KnowledgeEmbeddingConfig {
  /** Minimum apprenticeship duration (days) */
  minApprenticeshipDays: number;
  /** Required mastery demonstrations */
  requiredMasteryDemonstrations: number;
  /** Required validations */
  requiredValidations: number;
  /** Minimum validation score */
  minValidationScore: number;
  /** Certificate validity period (days) */
  certificateValidityDays: number;
  /** Lineage verification frequency (days) */
  lineageVerificationDays: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_KNOWLEDGE_EMBEDDING_CONFIG: KnowledgeEmbeddingConfig = {
  minApprenticeshipDays: 365, // 1 year minimum
  requiredMasteryDemonstrations: 3,
  requiredValidations: 2,
  minValidationScore: 0.8,
  certificateValidityDays: 1825, // 5 years
  lineageVerificationDays: 90
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * KnowledgeEmbeddingManager manages apprenticeship models, recognition systems,
 * validation mechanisms, and lineage reconnection protocols.
 */
export class KnowledgeEmbeddingManager extends EventEmitter {
  private config: KnowledgeEmbeddingConfig;
  private apprenticeships: Map<string, Apprenticeship>;
  private certificates: Map<string, KnowledgeCertificate>;
  private lineages: Map<string, LineageInfo>;
  private preservationStrategies: Map<string, KnowledgePreservationStrategy>;
  private lineageReconnections: Map<string, LineageReconnection>;
  private knowledgeCarriers: Map<string, {
    id: string;
    name: string;
    domains: string[];
    certifications: string[];
  }>;

  /**
   * Create a new KnowledgeEmbeddingManager
   * @param config - Knowledge embedding configuration
   */
  constructor(config?: Partial<KnowledgeEmbeddingConfig>) {
    super();
    this.config = { ...DEFAULT_KNOWLEDGE_EMBEDDING_CONFIG, ...config };
    this.apprenticeships = new Map();
    this.certificates = new Map();
    this.lineages = new Map();
    this.preservationStrategies = new Map();
    this.lineageReconnections = new Map();
    this.knowledgeCarriers = new Map();
  }

  // ============================================================================
  // Apprenticeship Management
  // ============================================================================

  /**
   * Start a new apprenticeship
   * @param masterId - Master identifier
   * @param apprenticeId - Apprentice identifier
   * @param knowledgeDomain - Knowledge domain
   * @param knowledgeType - Type of knowledge
   * @returns Apprenticeship ID
   */
  startApprenticeship(
    masterId: string,
    apprenticeId: string,
    knowledgeDomain: string,
    knowledgeType: KnowledgeType
  ): string {
    const apprenticeshipId = this.generateApprenticeshipId();
    const lineageId = this.findOrCreateLineage(knowledgeDomain, masterId);

    const apprenticeship: Apprenticeship = {
      id: apprenticeshipId,
      masterId,
      apprenticeId,
      knowledgeDomain,
      knowledgeType,
      status: ApprenticeshipStatus.INITIATED,
      progressLevel: 0,
      startedAt: new Date(),
      masteryDemonstrations: [],
      validationResults: [],
      lineage: {
        id: lineageId,
        lineageName: this.lineages.get(lineageId)!.lineageName,
        origin: this.lineages.get(lineageId)!.origin,
        masters: [masterId],
        apprentices: [apprenticeId],
        notableAchievements: [],
        establishedAt: this.lineages.get(lineageId)!.establishedAt
      }
    };

    this.apprenticeships.set(apprenticeshipId, apprenticeship);
    this.updateLineageParticipants(lineageId, masterId, apprenticeId);
    this.registerKnowledgeCarrier(apprenticeId, knowledgeDomain);

    this.emit('apprenticeshipStarted', { apprenticeship, lineageId });
    return apprenticeshipId;
  }

  /**
   * Record a mastery demonstration
   * @param apprenticeshipId - Apprenticeship ID
   * @param demonstration - Mastery demonstration
   */
  recordMasteryDemonstration(
    apprenticeshipId: string,
    demonstration: Omit<MasteryDemonstration, 'id' | 'apprenticeshipId' | 'timestamp'>
  ): void {
    const apprenticeship = this.apprenticeships.get(apprenticeshipId);
    if (!apprenticeship) {
      throw new Error(`Apprenticeship not found: ${apprenticeshipId}`);
    }

    const masteryDemonstration: MasteryDemonstration = {
      id: this.generateDemonstrationId(),
      apprenticeshipId,
      timestamp: new Date(),
      ...demonstration
    };

    apprenticeship.masteryDemonstrations.push(masteryDemonstration);

    // Update progress based on demonstrations
    const requiredDemos = this.config.requiredMasteryDemonstrations;
    apprenticeship.progressLevel = Math.min(
      apprenticeship.masteryDemonstrations.length / requiredDemos,
      1
    );

    // Update status based on progress
    this.updateApprenticeshipStatus(apprenticeshipId);

    this.emit('masteryDemonstrated', { apprenticeshipId, demonstration: masteryDemonstration });
  }

  /**
   * Validate knowledge transmission
   * @param apprenticeshipId - Apprenticeship ID
   * @param validation - Validation result
   */
  validateKnowledge(
    apprenticeshipId: string,
    validation: Omit<ValidationResult, 'id' | 'apprenticeshipId' | 'timestamp'>
  ): void {
    const apprenticeship = this.apprenticeships.get(apprenticeshipId);
    if (!apprenticeship) {
      throw new Error(`Apprenticeship not found: ${apprenticeshipId}`);
    }

    const validationResult: ValidationResult = {
      id: this.generateValidationId(),
      apprenticeshipId,
      timestamp: new Date(),
      ...validation
    };

    apprenticeship.validationResults.push(validationResult);

    // Update status based on validation
    this.updateApprenticeshipStatus(apprenticeshipId);

    this.emit('knowledgeValidated', { apprenticeshipId, validation: validationResult });
  }

  /**
   * Complete an apprenticeship
   * @param apprenticeshipId - Apprenticeship ID
   * @returns Certificate ID if issued
   */
  completeApprenticeship(apprenticeshipId: string): string | null {
    const apprenticeship = this.apprenticeships.get(apprenticeshipId);
    if (!apprenticeship) {
      throw new Error(`Apprenticeship not found: ${apprenticeshipId}`);
    }

    // Check if requirements are met
    const daysSinceStart = (Date.now() - apprenticeship.startedAt.getTime()) / (1000 * 60 * 60 * 24);
    const timeRequirementMet = daysSinceStart >= this.config.minApprenticeshipDays;
    const demoRequirementMet = apprenticeship.masteryDemonstrations.length >= this.config.requiredMasteryDemonstrations;
    const validationRequirementMet = apprenticeship.validationResults.filter(v => v.score >= this.config.minValidationScore).length >= this.config.requiredValidations;

    if (!timeRequirementMet || !demoRequirementMet || !validationRequirementMet) {
      throw new Error(`Apprenticeship requirements not met. Time: ${timeRequirementMet}, Demos: ${demoRequirementMet}, Validations: ${validationRequirementMet}`);
    }

    apprenticeship.status = ApprenticeshipStatus.COMPLETED;
    apprenticeship.completedAt = new Date();

    // Issue certificate
    const certificateId = this.issueCertificate(
      apprenticeship.apprenticeId,
      apprenticeship.knowledgeDomain,
      apprenticeship.knowledgeType
    );

    // Update lineage
    this.updateLineageMastery(apprenticeship.lineage.id, apprenticeship.apprenticeId);

    this.emit('apprenticeshipCompleted', { apprenticeshipId, certificateId });
    return certificateId;
  }

  /**
   * Get an apprenticeship by ID
   * @param id - Apprenticeship ID
   * @returns Apprenticeship or null if not found
   */
  getApprenticeship(id: string): Apprenticeship | null {
    return this.apprenticeships.get(id) || null;
  }

  /**
   * Get apprenticeships by master
   * @param masterId - Master identifier
   * @returns Array of apprenticeships
   */
  getApprenticeshipsByMaster(masterId: string): Apprenticeship[] {
    return Array.from(this.apprenticeships.values())
      .filter(a => a.masterId === masterId);
  }

  /**
   * Get apprenticeships by apprentice
   * @param apprenticeId - Apprentice identifier
   * @returns Array of apprenticeships
   */
  getApprenticeshipsByApprentice(apprenticeId: string): Apprenticeship[] {
    return Array.from(this.apprenticeships.values())
      .filter(a => a.apprenticeId === apprenticeId);
  }

  // ============================================================================
  // Certificate Management
  // ============================================================================

  /**
   * Issue a knowledge certificate
   * @param recipientId - Recipient identifier
   * @param knowledgeDomain - Knowledge domain
   * @param knowledgeType - Type of knowledge
   * @returns Certificate ID
   */
  issueCertificate(
    recipientId: string,
    knowledgeDomain: string,
    knowledgeType: KnowledgeType
  ): string {
    const carrier = this.knowledgeCarriers.get(recipientId);
    const certifiedSkills = carrier?.domains.includes(knowledgeDomain)
      ? [knowledgeDomain]
      : [];

    const certificateId = this.generateCertificateId();
    const certificateHash = this.calculateCertificateHash(recipientId, knowledgeDomain, knowledgeType);
    const expiresAt = new Date(Date.now() + this.config.certificateValidityDays * 24 * 60 * 60 * 1000);

    const certificate: KnowledgeCertificate = {
      id: certificateId,
      recipientId,
      knowledgeDomain,
      knowledgeType,
      certificationLevel: this.determineCertificationLevel(recipientId, knowledgeDomain),
      certifiedAt: new Date(),
      certifyingAuthority: 'knowledge-embedding-system',
      certificateHash,
      expiresAt,
      certifiedSkills,
      revoked: false
    };

    this.certificates.set(certificateId, certificate);

    // Update carrier certifications
    if (carrier) {
      carrier.certifications.push(certificateId);
    }

    this.emit('certificateIssued', certificate);
    return certificateId;
  }

  /**
   * Verify a certificate
   * @param certificateId - Certificate ID
   * @returns Whether certificate is valid
   */
  verifyCertificate(certificateId: string): boolean {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) {
      return false;
    }

    // Check if revoked
    if (certificate.revoked) {
      return false;
    }

    // Check if expired
    if (certificate.expiresAt && new Date() > certificate.expiresAt) {
      return false;
    }

    // Verify hash
    const expectedHash = this.calculateCertificateHash(
      certificate.recipientId,
      certificate.knowledgeDomain,
      certificate.knowledgeType
    );
    return certificate.certificateHash === expectedHash;
  }

  /**
   * Revoke a certificate
   * @param certificateId - Certificate ID
   * @param reason - Revocation reason
   */
  revokeCertificate(certificateId: string, reason: string): void {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    certificate.revoked = true;
    certificate.revocationReason = reason;

    // Remove from carrier certifications
    const carrier = this.knowledgeCarriers.get(certificate.recipientId);
    if (carrier) {
      const index = carrier.certifications.indexOf(certificateId);
      if (index !== -1) {
        carrier.certifications.splice(index, 1);
      }
    }

    this.emit('certificateRevoked', { certificateId, reason });
  }

  /**
   * Get a certificate by ID
   * @param id - Certificate ID
   * @returns Certificate or null if not found
   */
  getCertificate(id: string): KnowledgeCertificate | null {
    return this.certificates.get(id) || null;
  }

  /**
   * Get certificates by recipient
   * @param recipientId - Recipient identifier
   * @returns Array of certificates
   */
  getCertificatesByRecipient(recipientId: string): KnowledgeCertificate[] {
    return Array.from(this.certificates.values())
      .filter(c => c.recipientId === recipientId && !c.revoked);
  }

  // ============================================================================
  // Lineage Management
  // ============================================================================

  /**
   * Create a knowledge lineage
   * @param lineageName - Name of the lineage
   * @param origin - Origin of the lineage
   * @returns Lineage ID
   */
  createLineage(lineageName: string, origin: string): string {
    const lineageId = this.generateLineageId();
    const lineage: LineageInfo = {
      id: lineageId,
      lineageName,
      origin,
      masters: [],
      apprentices: [],
      notableAchievements: [],
      establishedAt: new Date()
    };

    this.lineages.set(lineageId, lineage);
    this.emit('lineageCreated', lineage);
    return lineageId;
  }

  /**
   * Update lineage with notable achievement
   * @param lineageId - Lineage ID
   * @param achievement - Achievement description
   */
  recordLineageAchievement(lineageId: string, achievement: string): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) {
      throw new Error(`Lineage not found: ${lineageId}`);
    }

    lineage.notableAchievements.push(achievement);
    this.emit('lineageAchievementRecorded', { lineageId, achievement });
  }

  /**
   * Get a lineage by ID
   * @param id - Lineage ID
   * @returns Lineage or null if not found
   */
  getLineage(id: string): LineageInfo | null {
    return this.lineages.get(id) || null;
  }

  /**
   * Get all lineages
   * @returns Map of all lineages
   */
  getAllLineages(): Map<string, LineageInfo> {
    return new Map(this.lineages);
  }

  // ============================================================================
  // Preservation Strategy Management
  // ============================================================================

  /**
   * Create a knowledge preservation strategy
   * @param strategy - Preservation strategy
   */
  createPreservationStrategy(strategy: Omit<KnowledgePreservationStrategy, 'id' | 'establishedAt'>): string {
    const strategyId = this.generateStrategyId();
    const fullStrategy: KnowledgePreservationStrategy = {
      id: strategyId,
      ...strategy,
      establishedAt: new Date()
    };

    this.preservationStrategies.set(strategyId, fullStrategy);
    this.emit('preservationStrategyCreated', fullStrategy);
    return strategyId;
  }

  /**
   * Record preservation activity
   * @param strategyId - Strategy ID
   */
  recordPreservationActivity(strategyId: string): void {
    const strategy = this.preservationStrategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Preservation strategy not found: ${strategyId}`);
    }

    strategy.lastActivity = new Date();
    this.emit('preservationActivityRecorded', { strategyId });
  }

  /**
   * Get a preservation strategy by ID
   * @param id - Strategy ID
   * @returns Strategy or null if not found
   */
  getPreservationStrategy(id: string): KnowledgePreservationStrategy | null {
    return this.preservationStrategies.get(id) || null;
  }

  // ============================================================================
  // Lineage Reconnection
  // ============================================================================

  /**
   * Initiate lineage reconnection after disruption
   * @param lineageId - Lineage ID
   * @param disruptionEvent - Disruption event
   * @returns Reconnection ID
   */
  initiateLineageReconnection(lineageId: string, disruptionEvent: string): string {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) {
      throw new Error(`Lineage not found: ${lineageId}`);
    }

    const reconnectionId = this.generateReconnectionId();
    const reconnection: LineageReconnection = {
      id: reconnectionId,
      lineageId,
      disruptionEvent,
      disruptionDate: new Date(),
      status: 'pending',
      survivingMasters: [...lineage.masters],
      survivingApprentices: [...lineage.apprentices],
      lostDomains: this.identifyLostDomains(lineageId, disruptionEvent),
      reconnectionSteps: this.generateReconnectionSteps(lineageId, disruptionEvent),
      initiatedAt: new Date()
    };

    this.lineageReconnections.set(reconnectionId, reconnection);
    this.emit('lineageReconnectionInitiated', reconnection);
    return reconnectionId;
  }

  /**
   * Execute a reconnection step
   * @param reconnectionId - Reconnection ID
   * @param stepId - Step ID
   * @param outcome - Actual outcome
   */
  executeReconnectionStep(reconnectionId: string, stepId: string, outcome: string): void {
    const reconnection = this.lineageReconnections.get(reconnectionId);
    if (!reconnection) {
      throw new Error(`Reconnection not found: ${reconnectionId}`);
    }

    const step = reconnection.reconnectionSteps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Reconnection step not found: ${stepId}`);
    }

    step.status = 'completed';
    step.actualOutcome = outcome;
    step.executedAt = new Date();

    // Update reconnection status
    const allCompleted = reconnection.reconnectionSteps.every(s => s.status === 'completed');
    if (allCompleted) {
      reconnection.status = 'reconnected';
    } else {
      reconnection.status = 'in_progress';
    }

    this.emit('reconnectionStepExecuted', { reconnectionId, stepId, outcome });
  }

  /**
   * Get a reconnection by ID
   * @param id - Reconnection ID
   * @returns Reconnection or null if not found
   */
  getLineageReconnection(id: string): LineageReconnection | null {
    return this.lineageReconnections.get(id) || null;
  }

  // ============================================================================
  // Knowledge Carrier Management
  // ============================================================================

  /**
   * Register a knowledge carrier
   * @param carrierId - Carrier identifier
   * @param name - Carrier name
   * @param domains - Knowledge domains
   */
  registerKnowledgeCarrier(carrierId: string, name: string, domains: string[]): void {
    this.knowledgeCarriers.set(carrierId, {
      id: carrierId,
      name,
      domains,
      certifications: []
    });
    this.emit('knowledgeCarrierRegistered', { carrierId, name, domains });
  }

  /**
   * Get a knowledge carrier by ID
   * @param id - Carrier ID
   * @returns Carrier or null if not found
   */
  getKnowledgeCarrier(id: string): { id: string; name: string; domains: string[]; certifications: string[] } | null {
    return this.knowledgeCarriers.get(id) || null;
  }

  /**
   * Get carriers by knowledge domain
   * @param domain - Knowledge domain
   * @returns Array of carrier IDs
   */
  getCarriersByDomain(domain: string): string[] {
    const carriers: string[] = [];
    for (const [id, carrier] of this.knowledgeCarriers) {
      if (carrier.domains.includes(domain)) {
        carriers.push(id);
      }
    }
    return carriers;
  }

  // ============================================================================
  // Reporting and Statistics
  // ============================================================================

  /**
   * Get knowledge embedding statistics
   */
  getStatistics(): {
    totalApprenticeships: number;
    activeApprenticeships: number;
    completedApprenticeships: number;
    totalCertificates: number;
    validCertificates: number;
    totalLineages: number;
    totalCarriers: number;
    activeReconnections: number;
  } {
    let active = 0, completed = 0;
    for (const apprenticeship of this.apprenticeships.values()) {
      if (apprenticeship.status === ApprenticeshipStatus.IN_PROGRESS) {
        active++;
      } else if (apprenticeship.status === ApprenticeshipStatus.COMPLETED) {
        completed++;
      }
    }

    const validCertificates = Array.from(this.certificates.values())
      .filter(c => !c.revoked && (!c.expiresAt || new Date() < c.expiresAt)).length;
    const activeReconnections = Array.from(this.lineageReconnections.values())
      .filter(r => r.status === 'in_progress' || r.status === 'pending').length;

    return {
      totalApprenticeships: this.apprenticeships.size,
      activeApprenticeships: active,
      completedApprenticeships: completed,
      totalCertificates: this.certificates.size,
      validCertificates: validCertificates,
      totalLineages: this.lineages.size,
      totalCarriers: this.knowledgeCarriers.size,
      activeReconnections
    };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): KnowledgeEmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<KnowledgeEmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.apprenticeships.clear();
    this.certificates.clear();
    this.lineages.clear();
    this.preservationStrategies.clear();
    this.lineageReconnections.clear();
    this.knowledgeCarriers.clear();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private updateApprenticeshipStatus(apprenticeshipId: string): void {
    const apprenticeship = this.apprenticeships.get(apprenticeshipId);
    if (!apprenticeship) return;

    const daysSinceStart = (Date.now() - apprenticeship.startedAt.getTime()) / (1000 * 60 * 60 * 24);
    const timeRequirementMet = daysSinceStart >= this.config.minApprenticeshipDays;
    const demoRequirementMet = apprenticeship.masteryDemonstrations.length >= this.config.requiredMasteryDemonstrations;
    const validationRequirementMet = apprenticeship.validationResults.filter(v => v.score >= this.config.minValidationScore).length >= this.config.requiredValidations;

    if (timeRequirementMet && demoRequirementMet && validationRequirementMet) {
      if (apprenticeship.status !== ApprenticeshipStatus.COMPLETED) {
        apprenticeship.status = ApprenticeshipStatus.MASTERY_DEMONSTRATED;
      }
    } else if (apprenticeship.masteryDemonstrations.length >= this.config.requiredMasteryDemonstrations) {
      apprenticeship.status = ApprenticeshipStatus.VALIDATED;
    } else if (apprenticeship.masteryDemonstrations.length > 0) {
      apprenticeship.status = ApprenticeshipStatus.IN_PROGRESS;
    }
  }

  private findOrCreateLineage(knowledgeDomain: string, masterId: string): string {
    // Look for existing lineage for this domain
    for (const [id, lineage] of this.lineages) {
      if (lineage.lineageName === knowledgeDomain) {
        if (!lineage.masters.includes(masterId)) {
          lineage.masters.push(masterId);
        }
        return id;
      }
    }

    // Create new lineage
    return this.createLineage(knowledgeDomain, `Established by master ${masterId}`);
  }

  private updateLineageParticipants(lineageId: string, masterId: string, apprenticeId: string): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return;

    if (!lineage.masters.includes(masterId)) {
      lineage.masters.push(masterId);
    }
    if (!lineage.apprentices.includes(apprenticeId)) {
      lineage.apprentices.push(apprenticeId);
    }
  }

  private updateLineageMastery(lineageId: string, apprenticeId: string): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return;

    // Move apprentice from apprentices to masters
    const apprenticeIndex = lineage.apprentices.indexOf(apprenticeId);
    if (apprenticeIndex !== -1) {
      lineage.apprentices.splice(apprenticeIndex, 1);
    }

    if (!lineage.masters.includes(apprenticeId)) {
      lineage.masters.push(apprenticeId);
      this.recordLineageAchievement(lineageId, `${apprenticeId} achieved mastery`);
    }
  }

  private determineCertificationLevel(carrierId: string, domain: string): KnowledgeCertificate['certificationLevel'] {
    const carrier = this.knowledgeCarriers.get(carrierId);
    const domainCount = carrier?.domains.filter(d => d === domain).length || 0;

    if (domainCount >= 3) return 'grandmaster';
    if (domainCount >= 2) return 'master';
    if (domainCount >= 1) return 'journeyman';
    return 'apprentice';
  }

  private identifyLostDomains(lineageId: string, disruptionEvent: string): string[] {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return [];

    // Analyze disruption to identify potentially lost domains
    const lostDomains: string[] = [];

    if (lineage.masters.length === 0) {
      lostDomains.push('All master-level knowledge');
    }

    if (lineage.apprentices.length === 0) {
      lostDomains.push('Transmission mechanisms');
    }

    if (disruptionEvent.includes('catastrophic')) {
      lostDomains.push('Specialized knowledge not yet preserved');
    }

    return lostDomains;
  }

  private generateReconnectionSteps(lineageId: string, disruptionEvent: string): ReconnectionStep[] {
    const steps: ReconnectionStep[] = [];

    steps.push({
      id: this.generateStepId(),
      description: 'Identify surviving knowledge carriers',
      status: 'pending',
      expectedOutcome: 'List of masters and apprentices who survived disruption'
    });

    steps.push({
      id: this.generateStepId(),
      description: 'Assess knowledge loss',
      status: 'pending',
      expectedOutcome: 'Inventory of lost and preserved knowledge domains'
    });

    steps.push({
      id: this.generateStepId(),
      description: 'Re-establish transmission pathways',
      status: 'pending',
      expectedOutcome: 'New apprenticeship relationships initiated'
    });

    steps.push({
      id: this.generateStepId(),
      description: 'Validate knowledge integrity',
      status: 'pending',
      expectedOutcome: 'Verified knowledge transmission with validation ceremonies'
    });

    steps.push({
      id: this.generateStepId(),
      description: 'Document lineage continuity',
      status: 'pending',
      expectedOutcome: 'Formal recognition of lineage reconnection'
    });

    return steps;
  }

  private registerKnowledgeCarrier(carrierId: string, domain: string): void {
    const carrier = this.knowledgeCarriers.get(carrierId);
    if (!carrier) {
      this.knowledgeCarriers.set(carrierId, {
        id: carrierId,
        name: carrierId,
        domains: [domain],
        certifications: []
      });
    } else if (!carrier.domains.includes(domain)) {
      carrier.domains.push(domain);
    }
  }

  private calculateCertificateHash(recipientId: string, domain: string, type: KnowledgeType): string {
    const data = `${recipientId}:${domain}:${type}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private generateApprenticeshipId(): string {
    return `apprentice-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateDemonstrationId(): string {
    return `demo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateValidationId(): string {
    return `validation-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateCertificateId(): string {
    return `cert-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateLineageId(): string {
    return `lineage-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateStrategyId(): string {
    return `strategy-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateReconnectionId(): string {
    return `reconnect-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateStepId(): string {
    return `step-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create a KnowledgeEmbeddingManager
 * @param config - Optional configuration
 * @returns Configured KnowledgeEmbeddingManager instance
 */
export function createKnowledgeEmbeddingManager(
  config?: Partial<KnowledgeEmbeddingConfig>
): KnowledgeEmbeddingManager {
  return new KnowledgeEmbeddingManager(config);
}

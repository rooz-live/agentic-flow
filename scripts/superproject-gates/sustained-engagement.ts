/**
 * Sustained Engagement Practices
 *
 * Develops practices requiring sustained engagement with emphasis on
 * depth over breadth, commodification resistance, authentic engagement
 * verification, and engagement tracking across generations.
 *
 * Inspired by Bronze Age patterns where knowledge survived through
 * lifelong dedication rather than quick commodification.
 *
 * @module collapse-resilience/sustained-engagement
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Status of an engagement
 */
export enum EngagementStatus {
  INITIATED = 'initiated',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

/**
 * Type of engagement
 */
export enum EngagementType {
  APPRENTICESHIP = 'apprenticeship',
  STUDY = 'study',
  PRACTICE = 'practice',
  RESEARCH = 'research',
  CREATION = 'creation',
  TEACHING = 'teaching',
  MENTORSHIP = 'mentorship'
}

/**
 * Depth level of engagement
 */
export enum EngagementDepth {
  SURFACE = 'surface',
  INTERMEDIATE = 'intermediate',
  DEEP = 'deep',
  PROFOUND = 'profound',
  MASTER = 'master'
}

/**
 * An engagement practice
 */
export interface EngagementPractice {
  /** Unique identifier */
  id: string;
  /** Practice name */
  name: string;
  /** Type of engagement */
  type: EngagementType;
  /** Minimum engagement duration (days) */
  minDurationDays: number;
  /** Recommended engagement duration (days) */
  recommendedDurationDays: number;
  /** Depth level achieved */
  depthLevel: EngagementDepth;
  /** Knowledge domain */
  knowledgeDomain: string;
  /** Required commitment level */
  requiredCommitment: 'casual' | 'dedicated' | 'intensive' | 'lifelong';
  /** Quality metrics */
  qualityMetrics: QualityMetrics;
  /** Commodification resistance mechanisms */
  commodificationResistance: CommodificationResistance[];
  /** Authentic engagement verification requirements */
  verificationRequirements: VerificationRequirement[];
  /** When practice was created */
  createdAt: Date;
}

/**
 * Quality metrics for engagement
 */
export interface QualityMetrics {
  /** Depth score (0-1) */
  depthScore: number;
  /** Breadth score (0-1, lower is better for sustained engagement) */
  breadthScore: number;
  /** Consistency score (0-1) */
  consistencyScore: number;
  /** Authenticity score (0-1) */
  authenticityScore: number;
  /** Mastery score (0-1) */
  masteryScore: number;
}

/**
 * Commodification resistance mechanism
 */
export interface CommodificationResistance {
  /** Mechanism type */
  type: 'experiential' | 'contextual' | 'relational' | 'ceremonial' | 'lineage';
  /** Description */
  description: string;
  /** Implementation method */
  implementation: string;
  /** Effectiveness score (0-1) */
  effectiveness: number;
}

/**
 * Verification requirement for authentic engagement
 */
export interface VerificationRequirement {
  /** Requirement type */
  type: 'demonstration' | 'examination' | 'portfolio' | 'peer_review' | 'long_term_observation';
  /** Description */
  description: string;
  /** Minimum criteria */
  minCriteria: string[];
  /** Assessment method */
  assessmentMethod: string;
  /** Required duration (days) */
  requiredDurationDays: number;
}

/**
 * An engagement record
 */
export interface EngagementRecord {
  /** Unique identifier */
  id: string;
  /** Practice ID */
  practiceId: string;
  /** Individual ID */
  individualId: string;
  /** Current status */
  status: EngagementStatus;
  /** Start date */
  startedAt: Date;
  /** End date */
  endedAt?: Date;
  /** Total duration (days) */
  totalDurationDays: number;
  /** Depth achieved */
  depthAchieved: EngagementDepth;
  /** Quality metrics */
  qualityMetrics: QualityMetrics;
  /** Verification results */
  verificationResults: VerificationResult[];
  /** Commodification resistance effectiveness */
  commodificationResistanceScore: number;
  /** Authenticity score */
  authenticityScore: number;
  /** Notes */
  notes: string[];
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Unique identifier */
  id: string;
  /** Engagement record ID */
  engagementRecordId: string;
  /** Verification type */
  type: VerificationRequirement['type'];
  /** When verified */
  verifiedAt: Date;
  /** Verifier ID */
  verifierId: string;
  /** Pass/fail result */
  passed: boolean;
  /** Score (0-1) */
  score: number;
  /** Criteria met */
  criteriaMet: string[];
  /** Criteria not met */
  criteriaNotMet: string[];
  /** Comments */
  comments: string;
}

/**
 * Generational tracking data
 */
export interface GenerationalTracking {
  /** Individual ID */
  individualId: string;
  /** Generation number */
  generation: number;
  /** Lineage ID */
  lineageId: string;
  /** Knowledge domains mastered */
  masteredDomains: string[];
  /** Average depth achieved */
  averageDepth: EngagementDepth;
  /** Total engagement years */
  totalEngagementYears: number;
  /** Authenticity score across generations */
  authenticityScore: number;
  /** Knowledge transmission success rate */
  transmissionSuccessRate: number;
  /** When tracking started */
  trackedSince: Date;
}

/**
 * Engagement quality metrics dashboard
 */
export interface EngagementQualityDashboard {
  /** Total active engagements */
  totalActiveEngagements: number;
  /** Average depth score */
  averageDepthScore: number;
  /** Average authenticity score */
  averageAuthenticityScore: number;
  /** Average consistency score */
  averageConsistencyScore: number;
  /** Commodification resistance score */
  commodificationResistanceScore: number;
  /** Long-term engagement rate (engagements > 1 year) */
  longTermEngagementRate: number;
  /** Generational continuity score */
  generationalContinuityScore: number;
  /** When dashboard was calculated */
  calculatedAt: Date;
}

/**
 * Sustained engagement configuration
 */
export interface SustainedEngagementConfig {
  /** Minimum engagement duration (days) */
  minEngagementDays: number;
  /** Required depth for certification */
  requiredDepth: EngagementDepth;
  /** Minimum authenticity score */
  minAuthenticityScore: number;
  /** Minimum consistency score */
  minConsistencyScore: number;
  /** Maximum breadth score (lower is better) */
  maxBreadthScore: number;
  /** Verification interval (days) */
  verificationIntervalDays: number;
  /** Enable automatic quality assessment */
  autoQualityAssessment: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SUSTAINED_ENGAGEMENT_CONFIG: SustainedEngagementConfig = {
  minEngagementDays: 365, // 1 year minimum
  requiredDepth: EngagementDepth.DEEP,
  minAuthenticityScore: 0.7,
  minConsistencyScore: 0.6,
  maxBreadthScore: 0.4,
  verificationIntervalDays: 90,
  autoQualityAssessment: true
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * SustainedEngagementManager manages practices requiring sustained
 * engagement with depth over breadth emphasis and commodification resistance.
 */
export class SustainedEngagementManager extends EventEmitter {
  private config: SustainedEngagementConfig;
  private practices: Map<string, EngagementPractice>;
  private engagementRecords: Map<string, EngagementRecord>;
  private generationalTracking: Map<string, GenerationalTracking>;
  private verificationResults: Map<string, VerificationResult[]>;
  private qualityDashboard: EngagementQualityDashboard | null;
  private assessmentInterval: NodeJS.Timeout | null;

  /**
   * Create a new SustainedEngagementManager
   * @param config - Engagement configuration
   */
  constructor(config?: Partial<SustainedEngagementConfig>) {
    super();
    this.config = { ...DEFAULT_SUSTAINED_ENGAGEMENT_CONFIG, ...config };
    this.practices = new Map();
    this.engagementRecords = new Map();
    this.generationalTracking = new Map();
    this.verificationResults = new Map();
    this.qualityDashboard = null;
    this.assessmentInterval = null;

    // Register default practices
    this.registerDefaultPractices();
  }

  // ============================================================================
  // Practice Management
  // ============================================================================

  /**
   * Register an engagement practice
   * @param practice - Engagement practice configuration
   * @returns Practice ID
   */
  registerPractice(practice: Omit<EngagementPractice, 'id' | 'createdAt'>): string {
    const practiceId = this.generatePracticeId();

    const engagementPractice: EngagementPractice = {
      id: practiceId,
      ...practice,
      createdAt: new Date()
    };

    // Validate minimum duration
    if (engagementPractice.minDurationDays < this.config.minEngagementDays) {
      engagementPractice.minDurationDays = this.config.minEngagementDays;
    }

    this.practices.set(practiceId, engagementPractice);
    this.emit('practiceRegistered', engagementPractice);
    return practiceId;
  }

  /**
   * Start an engagement
   * @param practiceId - Practice ID
   * @param individualId - Individual ID
   * @returns Engagement record ID
   */
  startEngagement(practiceId: string, individualId: string): string {
    const practice = this.practices.get(practiceId);
    if (!practice) {
      throw new Error(`Practice not found: ${practiceId}`);
    }

    const engagementRecordId = this.generateEngagementRecordId();
    const engagementRecord: EngagementRecord = {
      id: engagementRecordId,
      practiceId,
      individualId,
      status: EngagementStatus.ACTIVE,
      startedAt: new Date(),
      totalDurationDays: 0,
      depthAchieved: EngagementDepth.SURFACE,
      qualityMetrics: this.initializeQualityMetrics(),
      verificationResults: [],
      commodificationResistanceScore: 0,
      authenticityScore: 0,
      notes: []
    };

    this.engagementRecords.set(engagementRecordId, engagementRecord);

    // Initialize verification results map
    this.verificationResults.set(engagementRecordId, []);

    this.emit('engagementStarted', { engagementRecordId, practiceId, individualId });
    return engagementRecordId;
  }

  /**
   * Record engagement progress
   * @param engagementRecordId - Engagement record ID
   * @param metrics - Updated quality metrics
   */
  recordEngagementProgress(
    engagementRecordId: string,
    metrics: Partial<QualityMetrics>
  ): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    Object.assign(record.qualityMetrics, metrics);

    // Update depth based on duration
    const duration = this.calculateDuration(record.startedAt, new Date());
    record.totalDurationDays = duration;
    record.depthAchieved = this.calculateDepthFromDuration(duration, record.qualityMetrics.depthScore);

    this.emit('engagementProgressRecorded', { engagementRecordId, metrics });
  }

  /**
   * Complete an engagement
   * @param engagementRecordId - Engagement record ID
   * @param notes - Completion notes
   */
  completeEngagement(engagementRecordId: string, notes: string[]): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    if (record.status === EngagementStatus.COMPLETED) {
      throw new Error(`Engagement already completed: ${engagementRecordId}`);
    }

    record.status = EngagementStatus.COMPLETED;
    record.endedAt = new Date();
    record.notes = notes;

    // Calculate final metrics
    const duration = this.calculateDuration(record.startedAt, record.endedAt!);
    record.totalDurationDays = duration;
    record.depthAchieved = this.calculateDepthFromDuration(duration, record.qualityMetrics.depthScore);
    record.commodificationResistanceScore = this.calculateCommodificationResistance(record.qualityMetrics);
    record.authenticityScore = this.calculateAuthenticityScore(record.qualityMetrics);

    this.emit('engagementCompleted', { engagementRecordId, duration, depthAchieved: record.depthAchieved });
  }

  /**
   * Pause an engagement
   * @param engagementRecordId - Engagement record ID
   */
  pauseEngagement(engagementRecordId: string): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    if (record.status === EngagementStatus.PAUSED) {
      throw new Error(`Engagement already paused: ${engagementRecordId}`);
    }

    record.status = EngagementStatus.PAUSED;
    this.emit('engagementPaused', engagementRecordId);
  }

  /**
   * Resume an engagement
   * @param engagementRecordId - Engagement record ID
   */
  resumeEngagement(engagementRecordId: string): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    if (record.status !== EngagementStatus.PAUSED) {
      throw new Error(`Engagement not paused: ${engagementRecordId}`);
    }

    record.status = EngagementStatus.ACTIVE;
    this.emit('engagementResumed', engagementRecordId);
  }

  /**
   * Abandon an engagement
   * @param engagementRecordId - Engagement record ID
   * @param reason - Abandonment reason
   */
  abandonEngagement(engagementRecordId: string, reason: string): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    record.status = EngagementStatus.ABANDONED;
    record.endedAt = new Date();
    record.notes.push(`Abandoned: ${reason}`);

    this.emit('engagementAbandoned', { engagementRecordId, reason });
  }

  /**
   * Get an engagement record by ID
   * @param id - Engagement record ID
   * @returns Engagement record or null if not found
   */
  getEngagementRecord(id: string): EngagementRecord | null {
    return this.engagementRecords.get(id) || null;
  }

  /**
   * Get engagements by individual
   * @param individualId - Individual ID
   * @returns Array of engagement records
   */
  getEngagementsByIndividual(individualId: string): EngagementRecord[] {
    return Array.from(this.engagementRecords.values())
      .filter(r => r.individualId === individualId);
  }

  /**
   * Get active engagements
   * @returns Array of active engagement records
   */
  getActiveEngagements(): EngagementRecord[] {
    return Array.from(this.engagementRecords.values())
      .filter(r => r.status === EngagementStatus.ACTIVE);
  }

  // ============================================================================
  // Verification
  // ============================================================================

  /**
   * Verify engagement authenticity
   * @param engagementRecordId - Engagement record ID
   * @param verification - Verification result
   */
  verifyEngagement(
    engagementRecordId: string,
    verification: Omit<VerificationResult, 'id' | 'engagementRecordId' | 'verifiedAt'>
  ): void {
    const record = this.engagementRecords.get(engagementRecordId);
    if (!record) {
      throw new Error(`Engagement record not found: ${engagementRecordId}`);
    }

    const verificationResult: VerificationResult = {
      id: this.generateVerificationId(),
      engagementRecordId,
      ...verification,
      verifiedAt: new Date()
    };

    const results = this.verificationResults.get(engagementRecordId) || [];
    results.push(verificationResult);
    this.verificationResults.set(engagementRecordId, results);

    // Update record authenticity score
    if (verification.passed) {
      record.authenticityScore = Math.max(record.authenticityScore, verification.score);
    }

    this.emit('engagementVerified', { engagementRecordId, verification: verificationResult });
  }

  /**
   * Get verification results for an engagement
   * @param engagementRecordId - Engagement record ID
   * @returns Array of verification results
   */
  getVerificationResults(engagementRecordId: string): VerificationResult[] {
    return this.verificationResults.get(engagementRecordId) || [];
  }

  // ============================================================================
  // Generational Tracking
  // ============================================================================

  /**
   * Track generational knowledge transmission
   * @param individualId - Individual ID
   * @param generation - Generation number
   * @param lineageId - Lineage ID
   * @param masteredDomains - Knowledge domains mastered
   */
  trackGeneration(
    individualId: string,
    generation: number,
    lineageId: string,
    masteredDomains: string[]
  ): void {
    const existingTracking = this.generationalTracking.get(individualId);

    const tracking: GenerationalTracking = {
      individualId,
      generation,
      lineageId,
      masteredDomains,
      averageDepth: EngagementDepth.SURFACE,
      totalEngagementYears: 0,
      authenticityScore: 0,
      transmissionSuccessRate: 1.0,
      trackedSince: new Date()
    };

    // Calculate from existing data if available
    if (existingTracking) {
      tracking.totalEngagementYears = existingTracking.totalEngagementYears;
      tracking.averageDepth = existingTracking.averageDepth;
      tracking.authenticityScore = existingTracking.authenticityScore;
    }

    this.generationalTracking.set(individualId, tracking);
    this.emit('generationTracked', { individualId, generation });
  }

  /**
   * Update generational metrics
   * @param individualId - Individual ID
   * @param metrics - Updated metrics
   */
  updateGenerationalMetrics(
    individualId: string,
    metrics: Partial<Pick<GenerationalTracking,
      'averageDepth' | 'totalEngagementYears' | 'authenticityScore' | 'transmissionSuccessRate'>>
  ): void {
    const tracking = this.generationalTracking.get(individualId);
    if (!tracking) {
      throw new Error(`Generational tracking not found for individual: ${individualId}`);
    }

    Object.assign(tracking, metrics);
    this.emit('generationalMetricsUpdated', { individualId, metrics });
  }

  /**
   * Calculate generational continuity score
   * @param lineageId - Lineage ID
   * @returns Continuity score (0-1)
   */
  calculateGenerationalContinuity(lineageId: string): number {
    const trackingData = Array.from(this.generationalTracking.values())
      .filter(t => t.lineageId === lineageId);

    if (trackingData.length === 0) return 0;

    // Calculate continuity based on consistent transmission
    let continuityScore = 0;
    for (let i = 1; i < trackingData.length; i++) {
      const current = trackingData[i];
      const previous = trackingData[i - 1];

      // Check for generation gap
      if (current.generation - previous.generation > 1) {
        continuityScore -= 0.2;
      }

      // Check for domain overlap
      const domainOverlap = this.calculateDomainOverlap(previous.masteredDomains, current.masteredDomains);
      continuityScore += domainOverlap * 0.1;
    }

    return Math.max(0, Math.min(1, continuityScore));
  }

  /**
   * Get generational tracking for an individual
   * @param individualId - Individual ID
   * @returns Generational tracking or null if not found
   */
  getGenerationalTracking(individualId: string): GenerationalTracking | null {
    return this.generationalTracking.get(individualId) || null;
  }

  // ============================================================================
  // Quality Dashboard
  // ============================================================================

  /**
   * Start automatic quality assessment
   */
  startQualityAssessment(): void {
    if (this.assessmentInterval) {
      return;
    }

    this.assessmentInterval = setInterval(() => {
      this.updateQualityDashboard();
    }, this.config.verificationIntervalDays * 24 * 60 * 60 * 1000);

    this.emit('qualityAssessmentStarted', { intervalDays: this.config.verificationIntervalDays });
  }

  /**
   * Stop automatic quality assessment
   */
  stopQualityAssessment(): void {
    if (this.assessmentInterval) {
      clearInterval(this.assessmentInterval);
      this.assessmentInterval = null;
      this.emit('qualityAssessmentStopped');
    }
  }

  /**
   * Update quality dashboard
   */
  updateQualityDashboard(): void {
    const activeEngagements = this.getActiveEngagements();
    const records = Array.from(this.engagementRecords.values());

    if (records.length === 0) {
      return;
    }

    // Calculate average metrics
    const totalDepthScore = records.reduce((sum, r) => sum + r.qualityMetrics.depthScore, 0);
    const averageDepthScore = totalDepthScore / records.length;

    const totalAuthenticityScore = records.reduce((sum, r) => sum + r.authenticityScore, 0);
    const averageAuthenticityScore = totalAuthenticityScore / records.length;

    const totalConsistencyScore = records.reduce((sum, r) => sum + r.qualityMetrics.consistencyScore, 0);
    const averageConsistencyScore = totalConsistencyScore / records.length;

    const totalBreadthScore = records.reduce((sum, r) => sum + r.qualityMetrics.breadthScore, 0);
    const averageBreadthScore = totalBreadthScore / records.length;

    // Calculate commodification resistance
    const commodificationResistanceScores = records.map(r => r.commodificationResistanceScore);
    const averageCommodificationResistance = commodificationResistanceScores.length > 0
      ? commodificationResistanceScores.reduce((sum, s) => sum + s, 0) / commodificationResistanceScores.length
      : 0;

    // Calculate long-term engagement rate
    const longTermEngagements = records.filter(r => r.totalDurationDays >= 365);
    const longTermEngagementRate = records.length > 0 ? longTermEngagements.length / records.length : 0;

    // Calculate generational continuity
    const lineageIds = new Set(records.map(r => this.getPracticeById(r.practiceId)?.knowledgeDomain || ''));
    let generationalContinuityScore = 0;
    for (const lineageId of lineageIds) {
      generationalContinuityScore += this.calculateGenerationalContinuity(lineageId);
    }
    generationalContinuityScore /= lineageIds.size || 1;

    this.qualityDashboard = {
      totalActiveEngagements: activeEngagements.length,
      averageDepthScore,
      averageAuthenticityScore,
      averageConsistencyScore,
      commodificationResistanceScore: averageCommodificationResistance,
      longTermEngagementRate,
      generationalContinuityScore,
      calculatedAt: new Date()
    };

    this.emit('qualityDashboardUpdated', this.qualityDashboard);
  }

  /**
   * Get quality dashboard
   * @returns Quality dashboard or null if not calculated
   */
  getQualityDashboard(): EngagementQualityDashboard | null {
    return this.qualityDashboard;
  }

  // ============================================================================
  // Reporting and Statistics
  // ============================================================================

  /**
   * Get engagement statistics
   */
  getStatistics(): {
    totalPractices: number;
    totalEngagementRecords: number;
    activeEngagements: number;
    completedEngagements: number;
    abandonedEngagements: number;
    averageEngagementDuration: number;
    averageDepthAchieved: EngagementDepth;
    averageAuthenticityScore: number;
    totalGenerationsTracked: number;
  } {
    const records = Array.from(this.engagementRecords.values());
    const active = records.filter(r => r.status === EngagementStatus.ACTIVE).length;
    const completed = records.filter(r => r.status === EngagementStatus.COMPLETED).length;
    const abandoned = records.filter(r => r.status === EngagementStatus.ABANDONED).length;

    const totalDuration = records.reduce((sum, r) => sum + r.totalDurationDays, 0);
    const averageDuration = records.length > 0 ? totalDuration / records.length : 0;

    const depthCounts = new Map<EngagementDepth, number>();
    for (const record of records) {
      const count = depthCounts.get(record.depthAchieved) || 0;
      depthCounts.set(record.depthAchieved, count + 1);
    }

    const maxDepthCount = Math.max(...depthCounts.values());
    const averageDepth = this.getAverageDepth(depthCounts);

    const totalAuthenticity = records.reduce((sum, r) => sum + r.authenticityScore, 0);
    const averageAuthenticity = records.length > 0 ? totalAuthenticity / records.length : 0;

    return {
      totalPractices: this.practices.size,
      totalEngagementRecords: records.length,
      activeEngagements: active,
      completedEngagements: completed,
      abandonedEngagements: abandoned,
      averageEngagementDuration: averageDuration,
      averageDepthAchieved: averageDepth,
      averageAuthenticityScore: averageAuthenticity,
      totalGenerationsTracked: this.generationalTracking.size
    };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): SustainedEngagementConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<SustainedEngagementConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart assessment if interval changed
    if (config.verificationIntervalDays !== undefined && this.assessmentInterval) {
      this.stopQualityAssessment();
      if (this.config.autoQualityAssessment) {
        this.startQualityAssessment();
      }
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopQualityAssessment();
    this.practices.clear();
    this.engagementRecords.clear();
    this.generationalTracking.clear();
    this.verificationResults.clear();
    this.qualityDashboard = null;
    this.registerDefaultPractices();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private registerDefaultPractices(): void {
    // Apprenticeship practice
    this.registerPractice({
      name: 'Traditional Apprenticeship',
      type: EngagementType.APPRENTICESHIP,
      minDurationDays: 365,
      recommendedDurationDays: 1825, // 5 years
      depthLevel: EngagementDepth.MASTER,
      knowledgeDomain: 'general',
      requiredCommitment: 'lifelong',
      qualityMetrics: this.initializeQualityMetrics(),
      commodificationResistance: [
        {
          type: 'experiential',
          description: 'Knowledge must be gained through direct experience',
          implementation: 'Hands-on practice under master guidance',
          effectiveness: 0.9
        },
        {
          type: 'contextual',
          description: 'Knowledge must be applied in context',
          implementation: 'Real-world problem solving with master oversight',
          effectiveness: 0.85
        },
        {
          type: 'relational',
          description: 'Knowledge transmission through relationship',
          implementation: 'Personal mentorship and guidance',
          effectiveness: 0.8
        }
      ],
      verificationRequirements: [
        {
          type: 'demonstration',
          description: 'Demonstrate mastery through practical application',
          minCriteria: ['Complete practical tasks', 'Show understanding of principles'],
          assessmentMethod: 'Master observation and testing',
          requiredDurationDays: 365
        },
        {
          type: 'peer_review',
          description: 'Peer assessment of knowledge and skills',
          minCriteria: ['Knowledge accuracy', 'Skill proficiency', 'Teaching ability'],
          assessmentMethod: 'Community evaluation',
          requiredDurationDays: 730
        },
        {
          type: 'long_term_observation',
          description: 'Extended observation of consistent practice',
          minCriteria: ['Consistent application over years', 'Mastery demonstrated repeatedly'],
          assessmentMethod: 'Community and master observation',
          requiredDurationDays: 1825
        }
      ]
    });

    // Deep study practice
    this.registerPractice({
      name: 'Deep Study',
      type: EngagementType.STUDY,
      minDurationDays: 730, // 2 years
      recommendedDurationDays: 3650, // 10 years
      depthLevel: EngagementDepth.PROFOUND,
      knowledgeDomain: 'specialized',
      requiredCommitment: 'intensive',
      qualityMetrics: this.initializeQualityMetrics(),
      commodificationResistance: [
        {
          type: 'experiential',
          description: 'Knowledge must be internalized through deep study',
          implementation: 'Extended reading, reflection, and contemplation',
          effectiveness: 0.85
        },
        {
          type: 'ceremonial',
          description: 'Knowledge transmission through ritual',
          implementation: 'Regular ceremonies and practices for knowledge reinforcement',
          effectiveness: 0.75
        }
      ],
      verificationRequirements: [
        {
          type: 'examination',
          description: 'Comprehensive examination of understanding',
          minCriteria: ['Explain complex concepts', 'Apply knowledge to novel situations', 'Defend positions'],
          assessmentMethod: 'Oral and written examination',
          requiredDurationDays: 730
        },
        {
          type: 'portfolio',
          description: 'Portfolio of work demonstrating depth',
          minCriteria: ['Original work', 'Complex projects', 'Long-term development'],
          assessmentMethod: 'Expert review',
          requiredDurationDays: 1825
        }
      ]
    });
  }

  private initializeQualityMetrics(): QualityMetrics {
    return {
      depthScore: 0,
      breadthScore: 0,
      consistencyScore: 0,
      authenticityScore: 0,
      masteryScore: 0
    };
  }

  private calculateDepthFromDuration(durationDays: number, depthScore: number): EngagementDepth {
    // Depth is primarily determined by quality metrics, but duration can influence it
    if (durationDays < 365) return EngagementDepth.SURFACE;
    if (durationDays < 1825) return EngagementDepth.INTERMEDIATE;
    if (durationDays < 3650) return EngagementDepth.DEEP;
    if (depthScore >= 0.8) return EngagementDepth.PROFOUND;
    return EngagementDepth.MASTER;
  }

  private calculateCommodificationResistance(metrics: QualityMetrics): number {
    // Higher depth and lower breadth = higher commodification resistance
    const depthWeight = 0.5;
    const breadthWeight = -0.3;
    const consistencyWeight = 0.2;

    return (metrics.depthScore * depthWeight) +
           (metrics.breadthScore * breadthWeight) +
           (metrics.consistencyScore * consistencyWeight);
  }

  private calculateAuthenticityScore(metrics: QualityMetrics): number {
    // Authenticity is based on depth, consistency, and mastery
    return (metrics.depthScore * 0.4 +
            metrics.consistencyScore * 0.3 +
            metrics.masteryScore * 0.3);
  }

  private calculateDuration(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateDomainOverlap(domains1: string[], domains2: string[]): number {
    if (domains1.length === 0 || domains2.length === 0) return 0;

    const set1 = new Set(domains1);
    const set2 = new Set(domains2);
    let overlap = 0;

    for (const domain of set1) {
      if (set2.has(domain)) {
        overlap++;
      }
    }

    return overlap / Math.max(domains1.length, domains2.length);
  }

  private getAverageDepth(counts: Map<EngagementDepth, number>): EngagementDepth {
    let weightedSum = 0;
    let totalCount = 0;

    const depthWeights = {
      [EngagementDepth.SURFACE]: 1,
      [EngagementDepth.INTERMEDIATE]: 2,
      [EngagementDepth.DEEP]: 3,
      [EngagementDepth.PROFOUND]: 4,
      [EngagementDepth.MASTER]: 5
    };

    for (const [depth, count] of counts) {
      weightedSum += count * depthWeights[depth];
      totalCount += count;
    }

    if (totalCount === 0) return EngagementDepth.SURFACE;

    const averageWeight = weightedSum / totalCount;

    // Find closest depth
    let closestDepth = EngagementDepth.SURFACE;
    let minDiff = Infinity;

    for (const [depth, weight] of Object.entries(depthWeights)) {
      const diff = Math.abs(weight - averageWeight);
      if (diff < minDiff) {
        minDiff = diff;
        closestDepth = depth as EngagementDepth;
      }
    }

    return closestDepth;
  }

  private getPracticeById(practiceId: string): EngagementPractice | undefined {
    return this.practices.get(practiceId);
  }

  private generatePracticeId(): string {
    return `practice-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateEngagementRecordId(): string {
    return `engagement-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateVerificationId(): string {
    return `verification-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create a SustainedEngagementManager
 * @param config - Optional configuration
 * @returns Configured SustainedEngagementManager instance
 */
export function createSustainedEngagementManager(
  config?: Partial<SustainedEngagementConfig>
): SustainedEngagementManager {
  return new SustainedEngagementManager(config);
}

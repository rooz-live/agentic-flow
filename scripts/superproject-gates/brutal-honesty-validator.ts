/**
 * Brutal Honesty Validator
 *
 * Validates recommendations for brutal honesty compliance, detecting
 * dilution, hedging language, and confidence manipulation
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BrutalHonestyRecommendation,
  BrutalHonestyPolicyConfig,
  ValidationResults,
  DeliveryStep,
  RecommendationDeliveryChain,
  DilutionIncident,
  HedgingIncident,
  ConfidencePoint,
  DilutionDetectionResult
} from './brutal-honesty-policy';

/**
 * Validator configuration
 */
export interface BrutalHonestyValidatorConfig {
  hedgingPhrases: string[];
  confidenceDeltaThreshold: number;
  criticalConfidenceDeltaThreshold: number;
  minimumConfidenceScore: number;
  textSimilarityThreshold: number;
  enableLogging: boolean;
}

/**
 * Dilution incident details
 */
export interface DilutionIncident {
  incidentId: string;
  timestamp: Date;
  type: 'text_modification' | 'priority_downgrade' | 'severity_reduction';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  before: string;
  after: string;
  actorId: string;
  actorRole: string;
}

/**
 * Hedging incident details
 */
export interface HedgingIncident {
  incidentId: string;
  timestamp: Date;
  hedgingPhrase: string;
  context: string;
  location: 'title' | 'description' | 'rationale';
  severity: 'low' | 'medium' | 'high';
}

/**
 * Confidence tracking point
 */
export interface ConfidencePoint {
  timestamp: Date;
  confidence: number;
  actorId: string;
  actorRole: string;
  reason?: string;
}

/**
 * Dilution detection result
 */
export interface DilutionDetectionResult {
  recommendationId: string;
  initialRecommendation: BrutalHonestyRecommendation;
  finalRecommendation: BrutalHonestyRecommendation;
  integrityScore: number;
  dilutionIncidents: DilutionIncident[];
  hedgingIncidents: HedgingIncident[];
  confidenceTrajectory: ConfidencePoint[];
  overallAssessment: 'integrity' | 'minor_dilution' | 'moderate_dilution' | 'severe_dilution';
}

/**
 * Recommendation integrity tracking
 */
export interface RecommendationIntegrity {
  recommendationId: string;
  initialConfidence: number;
  finalConfidence: number;
  confidenceDelta: number;
  modificationCount: number;
  modifications: Modification[];
  integrityScore: number;
  auditStatus: 'pending' | 'in_progress' | 'completed' | 'flagged';
  auditFindings?: AuditFinding[];
}

/**
 * Modification details
 */
export interface Modification {
  modificationId: string;
  timestamp: Date;
  actorId: string;
  actorRole: string;
  before: string;
  after: string;
  reason: string;
  confidenceChange?: number;
}

/**
 * Audit finding
 */
export interface AuditFinding {
  findingId: string;
  auditDate: Date;
  auditorId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'dilution' | 'hedging' | 'confidence_manipulation' | 'omission';
  description: string;
  recommendation: string;
  status: 'open' | 'in_review' | 'resolved' | 'escalated';
}

/**
 * Priority levels for comparison
 */
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Brutal Honesty Validator
 *
 * Validates recommendations for brutal honesty compliance
 */
export class BrutalHonestyValidator {
  private config: BrutalHonestyValidatorConfig;
  private validationHistory: Map<string, ValidationResults[]> = new Map();
  private integrityTracking: Map<string, RecommendationIntegrity> = new Map();
  private dilutionResults: Map<string, DilutionDetectionResult> = new Map();

  constructor(config?: Partial<BrutalHonestyValidatorConfig>) {
    this.config = {
      hedgingPhrases: [
        'consider',
        'possibly',
        'maybe',
        'perhaps',
        'might',
        'potentially',
        'could',
        'would',
        'should',
        'it may be worth',
        'one could argue',
        'it\'s possible that',
        'somewhat',
        'rather',
        'quite',
        'fairly',
        'it appears',
        'it seems',
        'looks like'
      ],
      confidenceDeltaThreshold: 0.10,
      criticalConfidenceDeltaThreshold: 0.25,
      minimumConfidenceScore: 0.3,
      textSimilarityThreshold: 0.85,
      enableLogging: true,
      ...config
    };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_VALIDATOR] Initialized with config:', {
        confidenceThreshold: this.config.confidenceDeltaThreshold,
        textSimilarityThreshold: this.config.textSimilarityThreshold
      });
    }
  }

  /**
   * Validate a recommendation for brutal honesty compliance
   */
  validateRecommendation(recommendation: BrutalHonestyRecommendation): ValidationResults {
    const results: ValidationResults = {
      isValid: true,
      hedgingDetected: false,
      hedgingPhrases: [],
      confidenceValid: true,
      contextComplete: true,
      missingElements: [],
      overallScore: 0,
      timestamp: new Date()
    };

    // Check for hedging language
    const hedgingCheck = this.detectHedging(recommendation);
    results.hedgingDetected = hedgingCheck.detected;
    results.hedgingPhrases = hedgingCheck.phrases;

    // Check confidence score
    results.confidenceValid = recommendation.confidence >= this.config.minimumConfidenceScore;

    // Check context completeness
    const contextCheck = this.checkContextCompleteness(recommendation);
    results.contextComplete = contextCheck.complete;
    results.missingElements = contextCheck.missing;

    // Calculate overall score
    results.overallScore = this.calculateValidationScore(results);

    // Determine if valid
    results.isValid = results.overallScore >= 0.8;

    // Store validation history
    const history = this.validationHistory.get(recommendation.id) || [];
    history.push(results);
    this.validationHistory.set(recommendation.id, history);

    // Initialize integrity tracking
    if (!this.integrityTracking.has(recommendation.id)) {
      this.integrityTracking.set(recommendation.id, {
        recommendationId: recommendation.id,
        initialConfidence: recommendation.confidence,
        finalConfidence: recommendation.confidence,
        confidenceDelta: 0,
        modificationCount: 0,
        modifications: [],
        integrityScore: results.overallScore,
        auditStatus: 'pending'
      });
    }

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_VALIDATOR] Validated ${recommendation.id}:`, {
        isValid: results.isValid,
        score: results.overallScore,
        hedgingDetected: results.hedgingDetected,
        confidenceValid: results.confidenceValid
      });
    }

    return results;
  }

  /**
   * Detect hedging language in recommendation
   */
  detectHedging(recommendation: BrutalHonestyRecommendation): {
    detected: boolean;
    phrases: string[];
  } {
    const detectedPhrases: string[] = [];

    // Check title
    this.checkTextForHedging(recommendation.title, 'title', detectedPhrases);

    // Check description
    this.checkTextForHedging(recommendation.description, 'description', detectedPhrases);

    // Check confidence rationale
    this.checkTextForHedging(recommendation.confidenceRationale, 'rationale', detectedPhrases);

    return {
      detected: detectedPhrases.length > 0,
      phrases: detectedPhrases
    };
  }

  /**
   * Check text for hedging phrases
   */
  private checkTextForHedging(
    text: string,
    location: 'title' | 'description' | 'rationale',
    detectedPhrases: string[]
  ): void {
    const lowerText = text.toLowerCase();

    for (const phrase of this.config.hedgingPhrases) {
      if (lowerText.includes(phrase.toLowerCase())) {
        detectedPhrases.push(phrase);
      }
    }
  }

  /**
   * Check context completeness
   */
  checkContextCompleteness(recommendation: BrutalHonestyRecommendation): {
    complete: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    if (!recommendation.context.evidence || recommendation.context.evidence.length === 0) {
      missing.push('evidence');
    }

    if (!recommendation.context.assumptions || recommendation.context.assumptions.length === 0) {
      missing.push('assumptions');
    }

    if (!recommendation.context.methodology || recommendation.context.methodology.trim() === '') {
      missing.push('methodology');
    }

    return {
      complete: missing.length === 0,
      missing
    };
  }

  /**
   * Calculate validation score (0-1)
   */
  private calculateValidationScore(results: ValidationResults): number {
    let score = 1.0;

    if (results.hedgingDetected) {
      score -= 0.3;
    }

    if (!results.confidenceValid) {
      score -= 0.2;
    }

    if (!results.contextComplete) {
      score -= 0.2 * results.missingElements.length;
    }

    return Math.max(0, score);
  }

  /**
   * Analyze delivery chain for dilution
   */
  analyzeDeliveryChain(chain: RecommendationDeliveryChain): DilutionDetectionResult {
    const result: DilutionDetectionResult = {
      recommendationId: chain.recommendationId,
      initialRecommendation: chain.initialRecommendation,
      finalRecommendation: chain.finalRecommendation,
      integrityScore: chain.integrityScore,
      dilutionIncidents: [],
      hedgingIncidents: [],
      confidenceTrajectory: [],
      overallAssessment: 'integrity'
    };

    // Build confidence trajectory
    result.confidenceTrajectory.push({
      timestamp: chain.initialRecommendation.timestamp,
      confidence: chain.initialRecommendation.confidence,
      actorId: chain.initialRecommendation.generatorId,
      actorRole: chain.initialRecommendation.generatorRole
    });

    // Analyze each delivery step
    for (const step of chain.deliverySteps) {
      // Track confidence changes
      if (step.modification?.confidenceChange !== undefined) {
        const lastPoint = result.confidenceTrajectory[result.confidenceTrajectory.length - 1];
        result.confidenceTrajectory.push({
          timestamp: step.timestamp,
          confidence: lastPoint.confidence + (step.modification.confidenceChange || 0),
          actorId: step.actorId,
          actorRole: step.actorRole,
          reason: step.modification.reason
        });
      }

      // Detect dilution incidents
      if (step.modification) {
        const dilutionIncident = this.detectDilutionIncident(step);
        if (dilutionIncident) {
          result.dilutionIncidents.push(dilutionIncident);
        }
      }
    }

    // Add final confidence point
    result.confidenceTrajectory.push({
      timestamp: new Date(),
      confidence: chain.finalRecommendation.confidence,
      actorId: 'final',
      actorRole: 'delivery'
    });

    // Detect hedging in final recommendation
    const hedgingCheck = this.detectHedging(chain.finalRecommendation);
    for (const phrase of hedgingCheck.phrases) {
      result.hedgingIncidents.push({
        incidentId: uuidv4(),
        timestamp: new Date(),
        hedgingPhrase: phrase,
        context: 'Final recommendation',
        location: 'description',
        severity: 'medium'
      });
    }

    // Calculate overall assessment
    result.overallAssessment = this.calculateOverallAssessment(result);

    // Store result
    this.dilutionResults.set(chain.recommendationId, result);

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_VALIDATOR] Analyzed delivery chain ${chain.recommendationId}:`, {
        integrityScore: result.integrityScore,
        dilutionIncidents: result.dilutionIncidents.length,
        hedgingIncidents: result.hedgingIncidents.length,
        assessment: result.overallAssessment
      });
    }

    return result;
  }

  /**
   * Detect dilution incident in delivery step
   */
  private detectDilutionIncident(step: DeliveryStep): DilutionIncident | null {
    if (!step.modification) {
      return null;
    }

    const { before, after, reason, confidenceChange } = step.modification;

    // Check for text dilution (shortening, softening)
    if (after.length < before.length * 0.8) {
      return {
        incidentId: uuidv4(),
        timestamp: step.timestamp,
        type: 'text_modification',
        description: 'Text significantly shortened, potential dilution',
        severity: 'high',
        before,
        after,
        actorId: step.actorId,
        actorRole: step.actorRole
      };
    }

    // Check for confidence downgrade
    if (confidenceChange && confidenceChange < 0) {
      const severity = Math.abs(confidenceChange) > this.config.criticalConfidenceDeltaThreshold
        ? 'critical'
        : Math.abs(confidenceChange) > this.config.confidenceDeltaThreshold
        ? 'high'
        : 'medium';

      return {
        incidentId: uuidv4(),
        timestamp: step.timestamp,
        type: 'text_modification',
        description: `Confidence downgraded by ${(confidenceChange * 100).toFixed(1)}%`,
        severity,
        before,
        after,
        actorId: step.actorId,
        actorRole: step.actorRole
      };
    }

    return null;
  }

  /**
   * Calculate overall assessment from dilution detection result
   */
  private calculateOverallAssessment(result: DilutionDetectionResult): 'integrity' | 'minor_dilution' | 'moderate_dilution' | 'severe_dilution' {
    const criticalIncidents = result.dilutionIncidents.filter(i => i.severity === 'critical').length;
    const highIncidents = result.dilutionIncidents.filter(i => i.severity === 'high').length;
    const hedgingCount = result.hedgingIncidents.length;

    if (criticalIncidents > 0 || result.integrityScore < 0.5) {
      return 'severe_dilution';
    }

    if (highIncidents > 0 || result.integrityScore < 0.7) {
      return 'moderate_dilution';
    }

    if (hedgingCount > 0 || result.integrityScore < 0.9) {
      return 'minor_dilution';
    }

    return 'integrity';
  }

  /**
   * Track recommendation integrity
   */
  trackIntegrity(
    recommendationId: string,
    modification: Modification
  ): void {
    const tracking = this.integrityTracking.get(recommendationId);
    if (!tracking) {
      return;
    }

    tracking.modificationCount++;
    tracking.modifications.push(modification);

    // Update final confidence if changed
    if (modification.confidenceChange !== undefined) {
      tracking.finalConfidence += modification.confidenceChange;
      tracking.confidenceDelta = tracking.finalConfidence - tracking.initialConfidence;
    }

    // Recalculate integrity score
    tracking.integrityScore = this.calculateIntegrityScore(tracking);

    // Update audit status if needed
    if (Math.abs(tracking.confidenceDelta) > this.config.confidenceDeltaThreshold) {
      tracking.auditStatus = 'flagged';
    }

    this.integrityTracking.set(recommendationId, tracking);

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_VALIDATOR] Tracked integrity for ${recommendationId}:`, {
        modificationCount: tracking.modificationCount,
        confidenceDelta: tracking.confidenceDelta,
        integrityScore: tracking.integrityScore,
        auditStatus: tracking.auditStatus
      });
    }
  }

  /**
   * Calculate integrity score
   */
  private calculateIntegrityScore(tracking: RecommendationIntegrity): number {
    let score = 1.0;

    // Penalize confidence changes
    const confidencePenalty = Math.abs(tracking.confidenceDelta) * 2;
    score -= confidencePenalty;

    // Penalize modifications
    const modificationPenalty = tracking.modificationCount * 0.05;
    score -= modificationPenalty;

    return Math.max(0, score);
  }

  /**
   * Get validation history for a recommendation
   */
  getValidationHistory(recommendationId: string): ValidationResults[] {
    return this.validationHistory.get(recommendationId) || [];
  }

  /**
   * Get integrity tracking for a recommendation
   */
  getIntegrityTracking(recommendationId: string): RecommendationIntegrity | undefined {
    return this.integrityTracking.get(recommendationId);
  }

  /**
   * Get dilution detection result
   */
  getDilutionResult(recommendationId: string): DilutionDetectionResult | undefined {
    return this.dilutionResults.get(recommendationId);
  }

  /**
   * Get all flagged recommendations
   */
  getFlaggedRecommendations(): RecommendationIntegrity[] {
    return Array.from(this.integrityTracking.values()).filter(
      tracking => tracking.auditStatus === 'flagged'
    );
  }

  /**
   * Get validator statistics
   */
  getStatistics(): {
    totalValidations: number;
    validRecommendations: number;
    invalidRecommendations: number;
    averageValidationScore: number;
    totalDilutionIncidents: number;
    totalHedgingIncidents: number;
    flaggedRecommendations: number;
  } {
    const allValidations = Array.from(this.validationHistory.values()).flat();
    const validCount = allValidations.filter(v => v.isValid).length;
    const avgScore = allValidations.length > 0
      ? allValidations.reduce((sum, v) => sum + v.overallScore, 0) / allValidations.length
      : 0;

    const allDilutionResults = Array.from(this.dilutionResults.values());
    const totalDilutionIncidents = allDilutionResults.reduce(
      (sum, r) => sum + r.dilutionIncidents.length,
      0
    );
    const totalHedgingIncidents = allDilutionResults.reduce(
      (sum, r) => sum + r.hedgingIncidents.length,
      0
    );

    return {
      totalValidations: allValidations.length,
      validRecommendations: validCount,
      invalidRecommendations: allValidations.length - validCount,
      averageValidationScore: avgScore,
      totalDilutionIncidents,
      totalHedgingIncidents,
      flaggedRecommendations: this.getFlaggedRecommendations().length
    };
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory.clear();
    this.integrityTracking.clear();
    this.dilutionResults.clear();

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_VALIDATOR] History cleared');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BrutalHonestyValidatorConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_VALIDATOR] Configuration updated:', updates);
    }
  }
}

/**
 * Create default validator
 */
export function createDefaultBrutalHonestyValidator(): BrutalHonestyValidator {
  return new BrutalHonestyValidator();
}

/**
 * Create validator from config
 */
export function createBrutalHonestyValidatorFromConfig(
  config: Partial<BrutalHonestyValidatorConfig>
): BrutalHonestyValidator {
  return new BrutalHonestyValidator(config);
}

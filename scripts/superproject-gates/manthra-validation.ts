/**
 * Manthra Validation System
 * 
 * Three-Dimensional Validation System comprising Manthra, Yasna, and Mithra
 * Ensures strict coherence between intentions, documentation, and implementation
 * 
 * Philosophical Foundation:
 * - Manthra: Directed thought-power and intentional instrumentation
 * - Yasna: Genuine alignment vs checkbox compliance
 * - Mithra: Binding force keeping thought, word, and deed coherent
 * 
 * This system provides the three-dimensional validation framework:
 * 1. Intentions (Manthra): What we intend to do
 * 2. Documentation (Yasna): How we document our approach
 * 3. Implementation (Mithra): What we actually implement
 */

import { SlopDetectionSystem, ContentAnalysis, SlopScore } from './slop-detection';
import { MithraCoherenceSystem, CoherenceResult } from './mithra-coherence';
import { YasnaAlignmentTracker, AlignmentMetrics, IntentionStatement } from './yasna-alignment';

export interface ManthraValidationConfig {
  /** Three-dimensional validation settings */
  threeDimensionalValidation: {
    intentions: {
      enabled: boolean;
      minWordCount: number;
      requireMeasurableCriteria: boolean;
    };
    documentation: {
      enabled: boolean;
      minWordCount: number;
      requireCodeExamples: boolean;
    };
    implementation: {
      enabled: boolean;
      requireTests: boolean;
      requireDocumentationComments: boolean;
    };
  };
  /** Minimum coherence threshold (0-1) */
  coherenceThreshold: number;
  /** Ritual enforcement settings */
  ritualEnforcement: {
    enabled: boolean;
    autoBlockViolations: boolean;
    requireManualOverride: boolean;
  };
  /** Enable interpretability logging */
  enableInterpretabilityLogging: boolean;
}

export interface ManthraValidationResult {
  /** Overall validation passed */
  passed: boolean;
  /** Manthra score (0-1) */
  manthraScore: number;
  /** Three-dimensional scores */
  dimensionalScores: {
    intentions: number;
    documentation: number;
    implementation: number;
  };
  /** Coherence verification across all dimensions */
  coherenceVerification: CoherenceVerification;
  /** Individual component results */
  components: {
    intentionScore: IntentionScore;
    documentationScore: DocumentationScore;
    implementationScore: ImplementationScore;
  };
  /** Ritual adherence */
  ritualAdherence: RitualAdherence;
  /** Remediation suggestions */
  remediation: string;
  /** Timestamp */
  timestamp: Date;
  /** Correlation ID */
  correlationId: string;
}

export interface IntentionScore {
  /** Intention statement quality score */
  qualityScore: number;
  /** Has measurable criteria */
  hasMeasurableCriteria: boolean;
  /** Word count */
  wordCount: number;
  /** Validated by Yasna */
  yasnaValidated: boolean;
  /** Issues detected */
  issues: string[];
}

export interface DocumentationScore {
  /** Documentation quality score */
  qualityScore: number;
  /** Has code examples */
  hasCodeExamples: boolean;
  /** Word count */
  wordCount: number;
  /** Clarity score */
  clarityScore: number;
  /** Issues detected */
  issues: string[];
}

export interface ImplementationScore {
  /** Implementation quality score */
  qualityScore: number;
  /** Has tests */
  hasTests: boolean;
  /** Has documentation comments */
  hasDocumentationComments: boolean;
  /** Code quality metrics */
  codeQuality: {
    complexity: number;
    maintainability: number;
    testCoverage: number;
  };
  /** Issues detected */
  issues: string[];
}

export interface CoherenceVerification {
  /** Overall coherence score */
  coherenceScore: number;
  /** Coherent across all dimensions */
  isCoherent: boolean;
  /** Dimension-to-dimension coherence */
  dimensionalCoherence: {
    intentionToDocumentation: number;
    documentationToImplementation: number;
    intentionToImplementation: number;
  };
  /** Misalignments detected */
  misalignments: string[];
}

export interface RitualAdherence {
  /** Rituals followed */
  ritualsFollowed: string[];
  /** Rituals violated */
  ritualsViolated: string[];
  /** Overall adherence score */
  adherenceScore: number;
  /** Requires manual override */
  requiresManualOverride: boolean;
}

const DEFAULT_CONFIG: ManthraValidationConfig = {
  threeDimensionalValidation: {
    intentions: {
      enabled: true,
      minWordCount: 50,
      requireMeasurableCriteria: true
    },
    documentation: {
      enabled: true,
      minWordCount: 100,
      requireCodeExamples: true
    },
    implementation: {
      enabled: true,
      requireTests: true,
      requireDocumentationComments: true
    }
  },
  coherenceThreshold: 0.85,
  ritualEnforcement: {
    enabled: true,
    autoBlockViolations: true,
    requireManualOverride: true
  },
  enableInterpretabilityLogging: true
};

/**
 * Manthra Validation System
 * 
 * Implements three-dimensional validation across intentions, documentation, and implementation
 */
export class ManthraValidation {
  private config: ManthraValidationConfig;
  private slopDetector: SlopDetectionSystem;
  private coherenceSystem: MithraCoherenceSystem;
  private yasnaTracker: YasnaAlignmentTracker;
  private validationHistory: ManthraValidationResult[] = [];

  constructor(config: Partial<ManthraValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.slopDetector = new SlopDetectionSystem({ enableInterpretabilityLogging: false });
    this.coherenceSystem = new MithraCoherenceSystem({ enableInterpretabilityLogging: false });
    this.yasnaTracker = new YasnaAlignmentTracker({ enableInterpretabilityLogging: false });
  }

  /**
   * Run comprehensive three-dimensional validation
   */
  public validate(
    intention: string,
    documentation: string,
    implementation: string,
    context?: {
      prDescription?: string;
      commitMessages?: string[];
      testCoverage?: number;
    }
  ): ManthraValidationResult {
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date();

    // Validate each dimension
    const intentionScore = this.validateIntention(intention);
    const documentationScore = this.validateDocumentation(documentation);
    const implementationScore = this.validateImplementation(implementation, context);

    // Calculate dimensional scores
    const dimensionalScores = {
      intentions: intentionScore.qualityScore,
      documentation: documentationScore.qualityScore,
      implementation: implementationScore.qualityScore
    };

    // Verify coherence across dimensions
    const coherenceVerification = this.verifyCoherence(
      intention,
      documentation,
      implementation,
      dimensionalScores
    );

    // Check ritual adherence
    const ritualAdherence = this.checkRitualAdherence(
      intentionScore,
      documentationScore,
      implementationScore,
      coherenceVerification
    );

    // Calculate overall Manthra score
    const manthraScore = this.calculateManthraScore(
      dimensionalScores,
      coherenceVerification,
      ritualAdherence
    );

    // Determine if passed
    const passed = this.determinePassed(manthraScore, coherenceVerification, ritualAdherence);

    // Generate remediation
    const remediation = this.generateRemediation(
      passed,
      intentionScore,
      documentationScore,
      implementationScore,
      coherenceVerification,
      ritualAdherence
    );

    const result: ManthraValidationResult = {
      passed,
      manthraScore,
      dimensionalScores,
      coherenceVerification,
      components: {
        intentionScore,
        documentationScore,
        implementationScore
      },
      ritualAdherence,
      remediation,
      timestamp,
      correlationId
    };

    // Log for interpretability
    if (this.config.enableInterpretabilityLogging) {
      this.logInterpretability(result);
    }

    // Store in history
    this.validationHistory.push(result);
    if (this.validationHistory.length > 100) {
      this.validationHistory = this.validationHistory.slice(-100);
    }

    return result;
  }

  /**
   * Validate intention statement (Manthra dimension)
   */
  private validateIntention(intention: string): IntentionScore {
    const issues: string[] = [];
    let qualityScore = 1.0;

    const wordCount = intention.split(/\s+/).length;

    // Check word count
    if (wordCount < this.config.threeDimensionalValidation.intentions.minWordCount) {
      issues.push(`Intention too brief (${wordCount} words, minimum ${this.config.threeDimensionalValidation.intentions.minWordCount})`);
      qualityScore *= 0.5;
    }

    // Check for measurable criteria
    const hasMeasurableCriteria = this.checkMeasurableCriteria(intention);
    if (!hasMeasurableCriteria && this.config.threeDimensionalValidation.intentions.requireMeasurableCriteria) {
      issues.push('Intention lacks measurable criteria');
      qualityScore *= 0.7;
    }

    // Validate with Yasna
    const yasnaValidation = this.yasnaTracker.validateIntention(intention);
    const yasnaValidated = yasnaValidation.isValid;
    if (!yasnaValidated) {
      issues.push(...yasnaValidation.issues);
      qualityScore *= 0.8;
    }

    // Check for slop
    const slopResult = this.slopDetector.calculateSlopScore({
      content: intention,
      contentType: 'pr_description'
    });
    if (slopResult.isSlop) {
      issues.push('Intention contains slop');
      qualityScore *= 0.6;
    }

    return {
      qualityScore: Math.max(0, qualityScore),
      hasMeasurableCriteria,
      wordCount,
      yasnaValidated,
      issues
    };
  }

  /**
   * Validate documentation (Yasna dimension)
   */
  private validateDocumentation(documentation: string): DocumentationScore {
    const issues: string[] = [];
    let qualityScore = 1.0;

    const wordCount = documentation.split(/\s+/).length;

    // Check word count
    if (wordCount < this.config.threeDimensionalValidation.documentation.minWordCount) {
      issues.push(`Documentation too brief (${wordCount} words, minimum ${this.config.threeDimensionalValidation.documentation.minWordCount})`);
      qualityScore *= 0.5;
    }

    // Check for code examples
    const hasCodeExamples = this.checkCodeExamples(documentation);
    if (!hasCodeExamples && this.config.threeDimensionalValidation.documentation.requireCodeExamples) {
      issues.push('Documentation lacks code examples');
      qualityScore *= 0.8;
    }

    // Calculate clarity score
    const clarityScore = this.calculateClarityScore(documentation);
    qualityScore *= clarityScore;

    // Check for slop
    const slopResult = this.slopDetector.calculateSlopScore({
      content: documentation,
      contentType: 'documentation'
    });
    if (slopResult.isSlop) {
      issues.push('Documentation contains slop');
      qualityScore *= 0.6;
    }

    return {
      qualityScore: Math.max(0, qualityScore),
      hasCodeExamples,
      wordCount,
      clarityScore,
      issues
    };
  }

  /**
   * Validate implementation (Mithra dimension)
   */
  private validateImplementation(
    implementation: string,
    context?: { testCoverage?: number }
  ): ImplementationScore {
    const issues: string[] = [];
    let qualityScore = 1.0;

    // Check for tests
    const hasTests = this.checkForTests(implementation);
    if (!hasTests && this.config.threeDimensionalValidation.implementation.requireTests) {
      issues.push('Implementation lacks tests');
      qualityScore *= 0.7;
    }

    // Check for documentation comments
    const hasDocumentationComments = this.checkForDocumentationComments(implementation);
    if (!hasDocumentationComments && this.config.threeDimensionalValidation.implementation.requireDocumentationComments) {
      issues.push('Implementation lacks documentation comments');
      qualityScore *= 0.8;
    }

    // Calculate code quality metrics
    const codeQuality = this.calculateCodeQuality(implementation, context?.testCoverage);
    qualityScore *= (codeQuality.complexity + codeQuality.maintainability + codeQuality.testCoverage) / 3;

    // Check for slop
    const slopResult = this.slopDetector.calculateSlopScore({
      content: implementation,
      contentType: 'code'
    });
    if (slopResult.isSlop) {
      issues.push('Implementation contains slop');
      qualityScore *= 0.6;
    }

    return {
      qualityScore: Math.max(0, qualityScore),
      hasTests,
      hasDocumentationComments,
      codeQuality,
      issues
    };
  }

  /**
   * Verify coherence across all dimensions
   */
  private verifyCoherence(
    intention: string,
    documentation: string,
    implementation: string,
    dimensionalScores: { intentions: number; documentation: number; implementation: number }
  ): CoherenceVerification {
    const misalignments: string[] = [];

    // Use Mithra coherence system
    const coherenceResult = this.coherenceSystem.measureCoherence(
      intention,
      implementation,
      [documentation],
      ['manthra-validation']
    );

    const dimensionalCoherence = {
      intentionToDocumentation: coherenceResult.alignmentScores.intentionToDocumentation,
      documentationToImplementation: coherenceResult.alignmentScores.documentationToImplementation,
      intentionToImplementation: coherenceResult.alignmentScores.intentionToImplementation
    };

    // Check for misalignments
    if (dimensionalCoherence.intentionToDocumentation < 0.7) {
      misalignments.push('Intention and documentation are not coherent');
    }
    if (dimensionalCoherence.documentationToImplementation < 0.7) {
      misalignments.push('Documentation and implementation are not coherent');
    }
    if (dimensionalCoherence.intentionToImplementation < 0.7) {
      misalignments.push('Intention and implementation are not coherent');
    }

    // Add Mithra misalignments
    for (const misalignment of coherenceResult.misalignments) {
      if (misalignment.severity === 'high' || misalignment.severity === 'critical') {
        misalignments.push(`${misalignment.type}: ${misalignment.description}`);
      }
    }

    const isCoherent = coherenceResult.isCoherent &&
                      coherenceResult.coherenceScore >= this.config.coherenceThreshold &&
                      misalignments.length === 0;

    return {
      coherenceScore: coherenceResult.coherenceScore,
      isCoherent,
      dimensionalCoherence,
      misalignments
    };
  }

  /**
   * Check ritual adherence
   */
  private checkRitualAdherence(
    intentionScore: IntentionScore,
    documentationScore: DocumentationScore,
    implementationScore: ImplementationScore,
    coherenceVerification: CoherenceVerification
  ): RitualAdherence {
    const ritualsFollowed: string[] = [];
    const ritualsViolated: string[] = [];

    // Check intention rituals
    if (intentionScore.yasnaValidated) {
      ritualsFollowed.push('yasna-intention-validation');
    } else {
      ritualsViolated.push('yasna-intention-validation');
    }

    if (intentionScore.hasMeasurableCriteria) {
      ritualsFollowed.push('measurable-criteria');
    } else {
      ritualsViolated.push('measurable-criteria');
    }

    // Check documentation rituals
    if (documentationScore.hasCodeExamples) {
      ritualsFollowed.push('code-examples');
    } else {
      ritualsViolated.push('code-examples');
    }

    // Check implementation rituals
    if (implementationScore.hasTests) {
      ritualsFollowed.push('test-coverage');
    } else {
      ritualsViolated.push('test-coverage');
    }

    if (implementationScore.hasDocumentationComments) {
      ritualsFollowed.push('documentation-comments');
    } else {
      ritualsViolated.push('documentation-comments');
    }

    // Check coherence rituals
    if (coherenceVerification.isCoherent) {
      ritualsFollowed.push('three-way-coherence');
    } else {
      ritualsViolated.push('three-way-coherence');
    }

    const totalRituals = ritualsFollowed.length + ritualsViolated.length;
    const adherenceScore = totalRituals > 0 ? ritualsFollowed.length / totalRituals : 1.0;

    const requiresManualOverride = this.config.ritualEnforcement.autoBlockViolations &&
                                   ritualsViolated.length > 0;

    return {
      ritualsFollowed,
      ritualsViolated,
      adherenceScore,
      requiresManualOverride
    };
  }

  /**
   * Calculate overall Manthra score
   */
  private calculateManthraScore(
    dimensionalScores: { intentions: number; documentation: number; implementation: number },
    coherenceVerification: CoherenceVerification,
    ritualAdherence: RitualAdherence
  ): number {
    // Weight the components
    const dimensionalWeight = 0.4;
    const coherenceWeight = 0.4;
    const ritualWeight = 0.2;

    const dimensionalAvg = (
      dimensionalScores.intentions +
      dimensionalScores.documentation +
      dimensionalScores.implementation
    ) / 3;

    const manthraScore =
      dimensionalWeight * dimensionalAvg +
      coherenceWeight * coherenceVerification.coherenceScore +
      ritualWeight * ritualAdherence.adherenceScore;

    return Math.max(0, Math.min(1, manthraScore));
  }

  /**
   * Determine if validation passed
   */
  private determinePassed(
    manthraScore: number,
    coherenceVerification: CoherenceVerification,
    ritualAdherence: RitualAdherence
  ): boolean {
    // Must meet coherence threshold
    if (!coherenceVerification.isCoherent) {
      return false;
    }

    // Must have reasonable Manthra score
    if (manthraScore < this.config.coherenceThreshold) {
      return false;
    }

    // If ritual enforcement is enabled, check adherence
    if (this.config.ritualEnforcement.enabled) {
      if (this.config.ritualEnforcement.autoBlockViolations && ritualAdherence.ritualsViolated.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate remediation suggestions
   */
  private generateRemediation(
    passed: boolean,
    intentionScore: IntentionScore,
    documentationScore: DocumentationScore,
    implementationScore: ImplementationScore,
    coherenceVerification: CoherenceVerification,
    ritualAdherence: RitualAdherence
  ): string {
    if (passed) {
      return 'Manthra validation passed. All three dimensions are coherent and rituals are followed.';
    }

    const suggestions: string[] = [];

    // Intention issues
    if (intentionScore.issues.length > 0) {
      suggestions.push(`Intention: ${intentionScore.issues.join('; ')}`);
    }

    // Documentation issues
    if (documentationScore.issues.length > 0) {
      suggestions.push(`Documentation: ${documentationScore.issues.join('; ')}`);
    }

    // Implementation issues
    if (implementationScore.issues.length > 0) {
      suggestions.push(`Implementation: ${implementationScore.issues.join('; ')}`);
    }

    // Coherence issues
    if (coherenceVerification.misalignments.length > 0) {
      suggestions.push(`Coherence: ${coherenceVerification.misalignments.join('; ')}`);
    }

    // Ritual violations
    if (ritualAdherence.ritualsViolated.length > 0) {
      suggestions.push(`Rituals violated: ${ritualAdherence.ritualsViolated.join(', ')}`);
    }

    return suggestions.length > 0
      ? `Manthra validation failed. Remediation: ${suggestions.join('. ')}`
      : 'Manthra validation failed. Please review all three dimensions.';
  }

  /**
   * Check for measurable criteria in text
   */
  private checkMeasurableCriteria(text: string): boolean {
    const patterns = [
      /\d+%/, // Percentage
      /\d+\s*(?:ms|seconds?|minutes?|hours?|days?)/i, // Time
      /\b(?:reduce|increase|decrease)\s+by\s+\d+/i, // Quantified change
      /\b(?:achieve|reach|attain)\s+\d+/i, // Quantified goal
      /\b(?:less than|greater than|more than|at least|at most)\s+\d+/i, // Thresholds
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Check for code examples in documentation
   */
  private checkCodeExamples(documentation: string): boolean {
    // Check for code blocks
    const codeBlockPatterns = [
      /```[\s\S]*?```/, // Markdown code blocks
      /`[^`]+`/, // Inline code
      /\/\/.*$/, // Single-line comments
      /\/\*[\s\S]*?\*\//, // Multi-line comments
    ];

    return codeBlockPatterns.some(pattern => pattern.test(documentation));
  }

  /**
   * Check for tests in implementation
   */
  private checkForTests(implementation: string): boolean {
    const testPatterns = [
      /\b(?:test|spec|it|describe)\b/i,
      /\b(?:expect|assert|should)\b/i,
      /\.test\.(ts|js|tsx|jsx)$/,
      /\.spec\.(ts|js|tsx|jsx)$/,
    ];

    return testPatterns.some(pattern => pattern.test(implementation));
  }

  /**
   * Check for documentation comments
   */
  private checkForDocumentationComments(implementation: string): boolean {
    const docCommentPatterns = [
      /\/\*\*[\s\S]*?\*\//, // JSDoc comments
      /\/\/\s*@[a-zA-Z]/, // JSDoc annotations
      /#.*$/, // Shell comments
    ];

    return docCommentPatterns.some(pattern => pattern.test(implementation));
  }

  /**
   * Calculate clarity score
   */
  private calculateClarityScore(text: string): number {
    // Simple clarity metrics
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const avgSentenceLength = text.split(/\s+/).length / sentences.length;
    
    // Ideal sentence length is 15-20 words
    let clarityScore = 1.0;
    if (avgSentenceLength > 30) {
      clarityScore *= 0.7;
    } else if (avgSentenceLength > 25) {
      clarityScore *= 0.85;
    } else if (avgSentenceLength < 10) {
      clarityScore *= 0.8;
    }

    return clarityScore;
  }

  /**
   * Calculate code quality metrics
   */
  private calculateCodeQuality(
    implementation: string,
    testCoverage?: number
  ): { complexity: number; maintainability: number; testCoverage: number } {
    // Simplified code quality metrics
    const lines = implementation.split('\n').filter(l => l.trim().length > 0);
    const complexity = Math.max(0, 1 - (lines.length / 1000)); // Fewer lines = better
    const maintainability = Math.max(0, 1 - (implementation.length / 10000)); // Shorter code = better
    const testCoverageValue = testCoverage ?? 0.5; // Default to 50% if not provided

    return {
      complexity,
      maintainability,
      testCoverage: testCoverageValue
    };
  }

  private generateCorrelationId(): string {
    return `manthra-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private logInterpretability(result: ManthraValidationResult): void {
    const logEntry = {
      timestamp: result.timestamp.toISOString(),
      pattern: 'interpretability',
      model_type: 'manthra_validation_v1',
      explanation_type: 'three_dimensional_validation',
      circle: 'quality-alignment',
      passed: result.passed,
      manthra_score: result.manthraScore,
      dimensional_scores: result.dimensionalScores,
      coherence_score: result.coherenceVerification.coherenceScore,
      ritual_adherence: result.ritualAdherence.adherenceScore,
      correlation_id: result.correlationId
    };

    console.log('[MANTHRA-VALIDATION]', JSON.stringify(logEntry));
  }

  /**
   * Get validation history
   */
  public getValidationHistory(): ManthraValidationResult[] {
    return [...this.validationHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ManthraValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create default Manthra validation instance
 */
export function createDefaultManthraValidation(): ManthraValidation {
  return new ManthraValidation();
}

/**
 * Create Manthra validation from config file
 */
export async function createManthraValidationFromConfig(
  configPath: string
): Promise<ManthraValidation> {
  // In a real implementation, this would read from a file
  // For now, return default
  return new ManthraValidation();
}

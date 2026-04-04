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
/**
 * Manthra Validation System
 *
 * Implements three-dimensional validation across intentions, documentation, and implementation
 */
export declare class ManthraValidation {
    private config;
    private slopDetector;
    private coherenceSystem;
    private yasnaTracker;
    private validationHistory;
    constructor(config?: Partial<ManthraValidationConfig>);
    /**
     * Run comprehensive three-dimensional validation
     */
    validate(intention: string, documentation: string, implementation: string, context?: {
        prDescription?: string;
        commitMessages?: string[];
        testCoverage?: number;
    }): ManthraValidationResult;
    /**
     * Validate intention statement (Manthra dimension)
     */
    private validateIntention;
    /**
     * Validate documentation (Yasna dimension)
     */
    private validateDocumentation;
    /**
     * Validate implementation (Mithra dimension)
     */
    private validateImplementation;
    /**
     * Verify coherence across all dimensions
     */
    private verifyCoherence;
    /**
     * Check ritual adherence
     */
    private checkRitualAdherence;
    /**
     * Calculate overall Manthra score
     */
    private calculateManthraScore;
    /**
     * Determine if validation passed
     */
    private determinePassed;
    /**
     * Generate remediation suggestions
     */
    private generateRemediation;
    /**
     * Check for measurable criteria in text
     */
    private checkMeasurableCriteria;
    /**
     * Check for code examples in documentation
     */
    private checkCodeExamples;
    /**
     * Check for tests in implementation
     */
    private checkForTests;
    /**
     * Check for documentation comments
     */
    private checkForDocumentationComments;
    /**
     * Calculate clarity score
     */
    private calculateClarityScore;
    /**
     * Calculate code quality metrics
     */
    private calculateCodeQuality;
    private generateCorrelationId;
    private logInterpretability;
    /**
     * Get validation history
     */
    getValidationHistory(): ManthraValidationResult[];
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ManthraValidationConfig>): void;
}
/**
 * Create default Manthra validation instance
 */
export declare function createDefaultManthraValidation(): ManthraValidation;
/**
 * Create Manthra validation from config file
 */
export declare function createManthraValidationFromConfig(configPath: string): Promise<ManthraValidation>;
//# sourceMappingURL=manthra-validation.d.ts.map
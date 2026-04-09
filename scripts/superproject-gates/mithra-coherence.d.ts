/**
 * Mithra Coherence Validation System
 *
 * Implements three-way alignment checking between:
 * - Intention (what we said we'd do - PR description, design docs)
 * - Documentation (how we said we'd do it - comments, docs)
 * - Implementation (what we actually did - code changes)
 *
 * Named after Mithra, the binding force in Zoroastrian philosophy that
 * keeps thought, word, and action coherent.
 *
 * This addresses the core philosophical tension between Truth and Time:
 * - Truth demands immediate clarity and exposure of misalignment
 * - Time demands continuity and systems that don't break under exposure
 */
export interface MithraBinding {
    /** What was stated as the intention (PR description, ticket) */
    statedIntention: string;
    /** How the approach was documented (design doc, comments) */
    documentedApproach: string;
    /** What was actually implemented (code diff summary) */
    actualImplementation: string;
    /** Hash of the implementation for verification */
    implementationHash?: string;
    /** Coherence score between all three (0-1) */
    coherenceScore: number;
    /** Who verified the coherence */
    bindingWitnesses: string[];
    /** Timestamp of verification */
    timestamp: Date;
    /** Correlation ID for tracking */
    correlationId: string;
}
export interface CoherenceResult {
    /** Overall coherence score (0-1) */
    coherenceScore: number;
    /** Whether the binding is valid */
    isCoherent: boolean;
    /** Confidence in the assessment */
    confidence: number;
    /** Detailed alignment scores */
    alignmentScores: {
        intentionToDocumentation: number;
        documentationToImplementation: number;
        intentionToImplementation: number;
    };
    /** Detected misalignments */
    misalignments: MisalignmentDetails[];
    /** Remediation message */
    remediation: string;
    /** The binding record */
    binding: MithraBinding;
}
export interface MisalignmentDetails {
    type: 'semantic_drift' | 'scope_creep' | 'missing_documentation' | 'undocumented_change' | 'contradictory_statements' | 'incomplete_implementation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedComponents: string[];
    suggestedFix: string;
}
export interface CoherenceConfig {
    /** Minimum coherence score to pass (0-1) */
    coherenceThreshold: number;
    /** Require at least this many witnesses */
    minWitnesses: number;
    /** Enable detailed interpretability logging */
    enableInterpretabilityLogging: boolean;
    /** Weight for intention-to-documentation alignment */
    intentionDocWeight: number;
    /** Weight for documentation-to-implementation alignment */
    docImplementationWeight: number;
    /** Weight for intention-to-implementation alignment */
    intentionImplementationWeight: number;
    /** Enable strict three-way validation */
    enableStrictValidation: boolean;
    /** Minimum word count for intention analysis */
    minIntentionWordCount: number;
    /** Minimum word count for documentation analysis */
    minDocumentationWordCount: number;
}
export declare class MithraCoherenceSystem {
    private config;
    private bindingHistory;
    private witnessRegistry;
    constructor(config?: Partial<CoherenceConfig>);
    /**
     * Measure coherence between intention, documentation, and implementation
     * This is the core Mithra function - binding thought, word, and deed
     */
    measureCoherence(prDescription: string, codeChanges: string, commitMessages: string[], witnesses?: string[]): CoherenceResult;
    /**
     * Determine if the changes are coherent based on strict validation rules
     */
    private determineCoherence;
    private generateCorrelationId;
    /**
     * Calculate semantic similarity between two texts
     * Uses concept extraction and overlap analysis
     */
    private calculateSemanticSimilarity;
    private extractConcepts;
    private extractKeyTerms;
    private calculateKeyTermOverlap;
    /**
     * Detect misalignments between intention, documentation, and implementation
     */
    private detectMisalignments;
    /**
     * Detect contradictions between two texts
     */
    private detectContradictions;
    /**
     * Detect if implementation appears incomplete
     */
    private detectIncompleteImplementation;
    /**
     * Generate hash of implementation for verification
     */
    private generateImplementationHash;
    private calculateConfidence;
    private generateRemediation;
    private logInterpretability;
    private storeBinding;
    /**
     * Register a witness for coherence verification
     */
    registerWitness(witnessId: string): void;
    /**
     * Get binding history
     */
    getBindingHistory(key?: string): MithraBinding[];
    /**
     * Update configuration
     */
    updateConfig(config: Partial<CoherenceConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<CoherenceConfig>;
    /**
     * Validate a specific binding record
     */
    validateBinding(binding: MithraBinding): boolean;
}
//# sourceMappingURL=mithra-coherence.d.ts.map
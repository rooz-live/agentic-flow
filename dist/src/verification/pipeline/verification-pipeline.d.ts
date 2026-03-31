/**
 * Verification Pipeline
 * Pre-output verification, real-time hallucination detection, post-output validation
 */
import { ConfidenceScore, MedicalCitation } from '../core/confidence-scorer';
export interface VerificationInput {
    claim: string;
    context?: Record<string, any>;
    citations?: MedicalCitation[];
    metadata?: VerificationMetadata;
}
export interface VerificationMetadata {
    agentId?: string;
    timestamp: number;
    source: string;
    category?: string;
    requiresProviderReview?: boolean;
}
export interface VerificationResult {
    verified: boolean;
    confidence: ConfidenceScore;
    hallucinations: HallucinationDetection[];
    warnings: string[];
    requiresReview: boolean;
    suggestions: string[];
    timestamp: number;
}
export interface HallucinationDetection {
    type: 'factual' | 'citation' | 'logical' | 'temporal' | 'quantitative';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
    suggestion?: string;
}
export interface ProviderReview {
    reviewerId: string;
    approved: boolean;
    corrections: string[];
    feedback: string;
    timestamp: number;
}
export declare class VerificationPipeline {
    private confidenceScorer;
    private hallucinationPatterns;
    private providerReviews;
    constructor();
    /**
     * Initialize common hallucination patterns
     */
    private initializeHallucinationPatterns;
    /**
     * Pre-output verification - check before generating output
     */
    preOutputVerification(input: VerificationInput): Promise<VerificationResult>;
    /**
     * Real-time hallucination detection
     */
    detectHallucinations(text: string, context?: Record<string, any>): Promise<HallucinationDetection[]>;
    /**
     * Pattern-based hallucination detection
     */
    private detectPatternHallucinations;
    /**
     * Detect logical inconsistencies
     */
    private detectLogicalInconsistencies;
    /**
     * Detect quantitative hallucinations
     */
    private detectQuantitativeHallucinations;
    /**
     * Detect temporal hallucinations
     */
    private detectTemporalHallucinations;
    /**
     * Post-output validation
     */
    postOutputValidation(output: string, originalInput: VerificationInput): Promise<VerificationResult>;
    /**
     * Check if output is faithful to input
     */
    private checkOutputFidelity;
    /**
     * Integrate provider review
     */
    addProviderReview(claimId: string, review: ProviderReview): Promise<void>;
    /**
     * Get provider reviews for a claim
     */
    getProviderReviews(claimId: string): ProviderReview[];
    /**
     * Generate suggestions for improvement
     */
    private generateSuggestions;
    /**
     * Get pipeline statistics
     */
    getStatistics(): {
        totalVerifications: number;
        verifiedCount: number;
        reviewCount: number;
        averageConfidence: number;
    };
}
//# sourceMappingURL=verification-pipeline.d.ts.map
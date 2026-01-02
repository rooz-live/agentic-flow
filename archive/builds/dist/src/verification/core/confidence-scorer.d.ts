/**
 * Confidence Scoring System
 * Statistical confidence metrics, citation strength, and medical literature validation
 */
export interface ConfidenceScore {
    overall: number;
    statistical: number;
    citationStrength: number;
    medicalAgreement: number;
    expertConsensus: number;
    contradictions: string[];
    metadata: ConfidenceMetadata;
}
export interface ConfidenceMetadata {
    sourceCount: number;
    peerReviewedSources: number;
    expertOpinions: number;
    conflictingEvidence: number;
    recencyScore: number;
    sampleSize?: number;
    confidenceInterval?: [number, number];
}
export interface MedicalCitation {
    id: string;
    type: 'peer-reviewed' | 'clinical-trial' | 'meta-analysis' | 'expert-opinion' | 'guideline';
    title: string;
    year: number;
    citationCount: number;
    impactFactor?: number;
    evidenceLevel: 'A' | 'B' | 'C' | 'D';
    doi?: string;
}
export declare class ConfidenceScorer {
    private readonly MIN_CONFIDENCE_THRESHOLD;
    private readonly CITATION_WEIGHTS;
    /**
     * Calculate overall confidence score
     */
    calculateConfidence(claim: string, citations: MedicalCitation[], context?: Record<string, any>): Promise<ConfidenceScore>;
    /**
     * Calculate statistical confidence based on sample size and quality
     */
    private calculateStatisticalConfidence;
    /**
     * Calculate citation strength based on quality and impact
     */
    private calculateCitationStrength;
    /**
     * Calculate medical literature agreement level
     */
    private calculateMedicalAgreement;
    /**
     * Calculate expert consensus level
     */
    private calculateExpertConsensus;
    /**
     * Detect contradictions in citations and claims
     */
    private detectContradictions;
    /**
     * Calculate overall weighted confidence score
     */
    private calculateOverallScore;
    /**
     * Build confidence metadata
     */
    private buildMetadata;
    /**
     * Check if confidence meets threshold
     */
    isConfident(score: ConfidenceScore): boolean;
    /**
     * Get confidence level description
     */
    getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'very-low';
}
//# sourceMappingURL=confidence-scorer.d.ts.map
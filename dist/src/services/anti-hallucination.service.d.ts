/**
 * Anti-Hallucination Service
 * Implements confidence scoring, citation verification, and hallucination detection
 */
import type { AnalysisResult, ConfidenceScore, Warning, MedicalKnowledgeBase } from '../types/medical.types';
export declare class AntiHallucinationService {
    private readonly CONFIDENCE_THRESHOLDS;
    private knowledgeBase;
    /**
     * Calculate comprehensive confidence score for analysis result
     */
    calculateConfidenceScore(analysis: AnalysisResult): ConfidenceScore;
    /**
     * Assess confidence in diagnosis based on multiple factors
     */
    private assessDiagnosisConfidence;
    /**
     * Verify citations against known sources
     */
    private verifyCitations;
    /**
     * Validate analysis against medical knowledge base
     */
    private validateAgainstKnowledgeBase;
    /**
     * Check for contradictions in analysis
     */
    private checkContradictions;
    /**
     * Generate warnings based on analysis quality
     */
    generateWarnings(analysis: AnalysisResult, confidenceScore: ConfidenceScore): Warning[];
    /**
     * Determine if analysis requires provider review
     */
    requiresProviderReview(confidenceScore: ConfidenceScore): boolean;
    private generateConfidenceExplanation;
    private areMutuallyExclusive;
    private areContradictoryRecommendations;
    /**
     * Load knowledge base entry
     */
    loadKnowledgeBase(entry: MedicalKnowledgeBase): void;
}
//# sourceMappingURL=anti-hallucination.service.d.ts.map
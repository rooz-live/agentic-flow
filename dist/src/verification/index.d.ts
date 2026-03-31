/**
 * Verification System Main Export
 * Comprehensive anti-hallucination and verification system
 */
export { ConfidenceScorer } from './core/confidence-scorer';
export type { ConfidenceScore, ConfidenceMetadata, MedicalCitation, } from './core/confidence-scorer';
export { VerificationPipeline } from './pipeline/verification-pipeline';
export type { VerificationInput, VerificationResult, VerificationMetadata, HallucinationDetection, ProviderReview, } from './pipeline/verification-pipeline';
export { LeanAgenticIntegration } from './integrations/lean-agentic-integration';
export type { CausalModel, CausalInferenceResult, StatisticalTest, PowerAnalysis, } from './integrations/lean-agentic-integration';
export { StrangeLoopsDetector } from './patterns/strange-loops-detector';
export type { LogicalPattern, CausalChain, RecursivePattern, } from './patterns/strange-loops-detector';
export { AgentDBIntegration } from './learning/agentdb-integration';
export type { LearningRecord, ProviderFeedback, Pattern, SourceReliability, } from './learning/agentdb-integration';
/**
 * Main Verification System Class
 * Orchestrates all verification components
 */
export declare class VerificationSystem {
    private confidenceScorer;
    private pipeline;
    private leanAgentic;
    private loopsDetector;
    private agentDB;
    constructor();
    /**
     * Perform comprehensive verification
     */
    verify(input: any): Promise<any>;
    /**
     * Get system statistics
     */
    getStatistics(): any;
}
//# sourceMappingURL=index.d.ts.map
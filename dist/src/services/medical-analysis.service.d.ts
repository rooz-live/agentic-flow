/**
 * Medical Analysis Service
 * Core service for medical condition analysis
 */
import type { AnalysisRequest, AnalysisResult } from '../types/medical.types';
export declare class MedicalAnalysisService {
    private analyses;
    /**
     * Analyze medical condition with symptoms
     */
    analyze(request: AnalysisRequest): Promise<AnalysisResult>;
    /**
     * Generate diagnosis from symptoms
     */
    private generateDiagnosis;
    /**
     * Generate recommendations based on diagnosis
     */
    private generateRecommendations;
    /**
     * Generate differential diagnoses
     */
    private generateDifferentials;
    /**
     * Extract evidence from patient context
     */
    private extractEvidence;
    /**
     * Generate citations for diagnosis
     */
    private generateCitations;
    /**
     * Infer condition from symptoms
     */
    private inferConditionFromSymptoms;
    /**
     * Get ICD-10 code for condition
     */
    private getICD10Code;
    /**
     * Get analysis by ID
     */
    getAnalysis(id: string): Promise<AnalysisResult | null>;
    /**
     * List all analyses
     */
    listAnalyses(): Promise<AnalysisResult[]>;
    /**
     * Update analysis status
     */
    updateAnalysisStatus(id: string, status: AnalysisResult['status']): Promise<void>;
}
//# sourceMappingURL=medical-analysis.service.d.ts.map
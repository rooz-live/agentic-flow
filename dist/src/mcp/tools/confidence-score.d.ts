/**
 * Confidence Score Tool
 * Calculates and reports confidence scores for medical analyses
 */
import type { MedicalAnalysis, MCPToolResponse } from '../types';
export declare class ConfidenceScoreTool {
    private readonly monitor;
    constructor();
    /**
     * Calculate confidence scores
     */
    execute(args: {
        analysis: MedicalAnalysis;
        detailedBreakdown?: boolean;
    }): Promise<MCPToolResponse>;
    /**
     * Calculate composite confidence score
     */
    private calculateCompositeScore;
    /**
     * Grade confidence level
     */
    private gradeConfidence;
    /**
     * Interpret confidence score
     */
    private interpretConfidence;
    /**
     * Generate detailed breakdown
     */
    private generateDetailedBreakdown;
    /**
     * Assess citation quality
     */
    private assessCitationQuality;
    /**
     * Assess completeness
     */
    private assessCompleteness;
    /**
     * Get severity range
     */
    private getSeverityRange;
    /**
     * Suggest mitigation for uncertainty
     */
    private suggestMitigation;
    /**
     * Interpret model agreement
     */
    private interpretModelAgreement;
    /**
     * Format confidence report
     */
    private formatConfidenceReport;
}
//# sourceMappingURL=confidence-score.d.ts.map
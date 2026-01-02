/**
 * Medical Verification Tool
 * Verifies medical analysis quality and accuracy
 */
import type { MedicalAnalysis, MCPToolResponse } from '../types';
export declare class MedicalVerifyTool {
    private readonly confidenceMonitor;
    private readonly citationValidator;
    constructor();
    /**
     * Verify medical analysis
     */
    execute(args: {
        analysisId: string;
        analysis: MedicalAnalysis;
        strictMode?: boolean;
    }): Promise<MCPToolResponse>;
    /**
     * Verify analysis comprehensively
     */
    private verifyAnalysis;
    /**
     * Perform consistency checks
     */
    private performConsistencyChecks;
    /**
     * Perform completeness checks
     */
    private performCompletenessChecks;
    /**
     * Perform safety checks
     */
    private performSafetyChecks;
    /**
     * Calculate verification confidence
     */
    private calculateVerificationConfidence;
    /**
     * Generate recommendations
     */
    private generateVerificationRecommendations;
    /**
     * Get maximum severity from conditions
     */
    private getMaxSeverity;
    /**
     * Check severity-urgency alignment
     */
    private checkSeverityUrgencyAlignment;
    /**
     * Format verification report
     */
    private formatVerificationReport;
}
//# sourceMappingURL=medical-verify.d.ts.map
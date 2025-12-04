/**
 * Medical Analysis Tool
 * Analyzes medical conditions with anti-hallucination safeguards
 */
import type { MCPToolResponse } from '../types';
export declare class MedicalAnalyzeTool {
    private readonly confidenceMonitor;
    private readonly citationValidator;
    private readonly emergencyHandler;
    constructor();
    /**
     * Analyze medical symptoms and conditions
     */
    execute(args: {
        symptoms: string[];
        patientHistory?: string;
        vitalSigns?: Record<string, number>;
        includeRecommendations?: boolean;
    }): Promise<MCPToolResponse>;
    /**
     * Analyze symptoms to determine conditions
     */
    private analyzeSymptoms;
    /**
     * Identify medical conditions from symptoms
     */
    private identifyConditions;
    /**
     * Determine severity based on vital signs and symptoms
     */
    private determineSeverity;
    /**
     * Find supporting citations
     */
    private findSupportingCitations;
    /**
     * Generate treatment recommendations
     */
    private generateRecommendations;
    /**
     * Determine urgency level
     */
    private determineUrgency;
    /**
     * Calculate overall confidence
     */
    private calculateOverallConfidence;
    /**
     * Determine if provider review required
     */
    private shouldRequireReview;
    /**
     * Generate warnings
     */
    private generateWarnings;
    /**
     * Format text response
     */
    private formatTextResponse;
}
//# sourceMappingURL=medical-analyze.d.ts.map
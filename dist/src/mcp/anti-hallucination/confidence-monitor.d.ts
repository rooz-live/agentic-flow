/**
 * Real-time Confidence Monitoring
 * Continuously monitors analysis confidence and flags low-confidence outputs
 */
import type { MedicalAnalysis, ConfidenceMetrics, ValidationIssue } from '../types';
export declare class ConfidenceMonitor {
    private readonly confidenceThreshold;
    private readonly criticalThreshold;
    constructor(confidenceThreshold?: number, criticalThreshold?: number);
    /**
     * Monitor confidence levels in real-time
     */
    monitorConfidence(analysis: MedicalAnalysis): ConfidenceMetrics;
    /**
     * Validate confidence levels and flag issues
     */
    validateConfidence(metrics: ConfidenceMetrics): ValidationIssue[];
    /**
     * Calculate diagnosis confidence
     */
    private calculateDiagnosisConfidence;
    /**
     * Calculate treatment confidence
     */
    private calculateTreatmentConfidence;
    /**
     * Calculate prognosis confidence
     */
    private calculatePrognosisConfidence;
    /**
     * Identify factors contributing to uncertainty
     */
    private identifyUncertaintyFactors;
    /**
     * Assess overall data quality
     */
    private assessDataQuality;
    /**
     * Check agreement across multiple models (simulated for now)
     */
    private checkModelAgreement;
    /**
     * Get most severe condition level
     */
    private getMostSevere;
    /**
     * Check if urgency aligns with severity
     */
    private checkUrgencyAlignment;
}
//# sourceMappingURL=confidence-monitor.d.ts.map
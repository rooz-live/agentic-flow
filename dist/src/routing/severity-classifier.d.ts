/**
 * Severity Classifier
 * Classifies patient query severity based on multiple factors
 */
import { SeverityScore } from './types';
import { PatientQuery } from '../providers/types';
export declare class SeverityClassifier {
    /**
     * Classify severity of patient query
     */
    classify(query: PatientQuery): SeverityScore;
    /**
     * Calculate symptom severity score
     */
    private calculateSymptomSeverity;
    /**
     * Calculate urgency score
     */
    private calculateUrgency;
    /**
     * Calculate risk factors score
     */
    private calculateRiskFactors;
    /**
     * Calculate patient history impact
     */
    private calculatePatientHistoryImpact;
    /**
     * Convert score to severity level
     */
    private scoreToLevel;
    /**
     * Get severity explanation
     */
    getExplanation(score: SeverityScore): string;
}
//# sourceMappingURL=severity-classifier.d.ts.map
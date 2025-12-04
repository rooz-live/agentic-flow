/**
 * Emergency Detector
 * Detects emergency conditions from patient queries
 */
import { EmergencyType, EmergencySignal } from './types';
import { PatientQuery } from '../providers/types';
export declare class EmergencyDetector {
    private emergencyKeywords;
    private urgentKeywords;
    constructor();
    /**
     * Initialize emergency and urgent keywords
     */
    private initializeKeywords;
    /**
     * Detect emergency type from query
     */
    detect(query: PatientQuery): EmergencyType;
    /**
     * Calculate keyword match score
     * Returns the maximum weight of any matched keyword (0-1 scale)
     */
    private calculateKeywordScore;
    /**
     * Get matched emergency signals
     */
    getMatchedSignals(query: PatientQuery): EmergencySignal[];
    /**
     * Add custom emergency keyword
     */
    addEmergencyKeyword(signal: EmergencySignal): void;
    /**
     * Add custom urgent keyword
     */
    addUrgentKeyword(signal: EmergencySignal): void;
}
//# sourceMappingURL=emergency-detector.d.ts.map
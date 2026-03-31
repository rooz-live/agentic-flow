import { PatientData, MedicalAnalysis } from '../types/medical';
export declare class MedicalAnalyzerService {
    private verificationService;
    private knowledgeBase;
    constructor();
    /**
     * Sanitize text to prevent XSS attacks
     */
    private sanitizeText;
    /**
     * Sanitize patient data inputs
     */
    private sanitizePatientData;
    analyzePatient(patientData: PatientData): Promise<MedicalAnalysis>;
    private performAnalysis;
    private generateDiagnosis;
    private findCitations;
    private generateRecommendations;
    private identifyRiskFactors;
    private runHallucinationChecks;
    private calculateConfidence;
    private generateAnalysisId;
}
//# sourceMappingURL=medical-analyzer.d.ts.map
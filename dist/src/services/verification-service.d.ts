import { VerificationResult, Citation, HallucinationCheck } from '../types/medical';
export declare class VerificationService {
    private readonly VERIFICATION_THRESHOLD;
    private readonly HALLUCINATION_THRESHOLD;
    verifyAnalysis(data: {
        analysis: string;
        diagnosis: string[];
        citations: Citation[];
        recommendations?: string[];
    }): Promise<VerificationResult>;
    calculateVerificationScore(data: {
        analysis: string;
        diagnosis: string[];
        citations: Citation[];
        hallucinationChecks: HallucinationCheck[];
    }): Promise<number>;
    private checkMedicalAccuracy;
    private checkCitationValidity;
    private checkLogicalConsistency;
    private checkGuidelineCompliance;
    private checkHallucinationFree;
    private identifyIssues;
    private computeScore;
}
//# sourceMappingURL=verification-service.d.ts.map
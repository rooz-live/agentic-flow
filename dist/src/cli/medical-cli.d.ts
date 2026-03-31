import { PatientData, MedicalAnalysis } from '../types/medical';
export declare class MedicalCLI {
    private analyzer;
    private notificationService;
    private verificationService;
    constructor();
    analyzeCommand(patientData: PatientData): Promise<MedicalAnalysis>;
    verifyCommand(analysis: MedicalAnalysis): Promise<void>;
    notifyCommand(analysisId: string, providerId: string): Promise<void>;
    statusCommand(notificationId: string): Promise<void>;
    helpCommand(): Promise<void>;
}
//# sourceMappingURL=medical-cli.d.ts.map
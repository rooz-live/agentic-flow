import { MedicalAnalysis, PatientData } from '../types/medical';
export declare class AgentDBIntegration {
    private learningEnabled;
    private patterns;
    recordAnalysis(patientData: PatientData, analysis: MedicalAnalysis): Promise<void>;
    applyLearning(patientData: PatientData): Promise<any>;
    trainFromFeedback(analysisId: string, feedback: {
        correct: boolean;
        improvements: string[];
    }): Promise<void>;
    enableLearning(): void;
    disableLearning(): void;
    isLearningEnabled(): boolean;
    private extractPattern;
    private storePattern;
    private findSimilarPatterns;
    private calculateSimilarity;
    private synthesizeLearning;
}
//# sourceMappingURL=agentdb-integration.d.ts.map
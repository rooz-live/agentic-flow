import { PatientData, MedicalAnalysis, MCPToolRequest, MCPToolResponse } from '../types/medical';
export declare class MedicalAPI {
    private analyzer;
    private notificationService;
    private verificationService;
    constructor();
    handleAnalyzeRequest(patientData: PatientData): Promise<{
        success: boolean;
        data?: MedicalAnalysis;
        error?: string;
    }>;
    handleVerifyRequest(analysisId: string, analysis: MedicalAnalysis): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    handleNotifyRequest(analysis: MedicalAnalysis, providerId: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    handleStatusRequest(notificationId: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    handleMCPToolRequest(request: MCPToolRequest): Promise<MCPToolResponse>;
    private mcpAnalyze;
    private mcpVerify;
    private mcpNotify;
    private mcpStatus;
}
//# sourceMappingURL=medical-api.d.ts.map
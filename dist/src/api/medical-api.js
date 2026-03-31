// Medical Analysis API Handlers
import { MedicalAnalyzerService } from '../services/medical-analyzer';
import { NotificationService } from '../services/notification-service';
import { VerificationService } from '../services/verification-service';
export class MedicalAPI {
    analyzer;
    notificationService;
    verificationService;
    constructor() {
        this.analyzer = new MedicalAnalyzerService();
        this.notificationService = new NotificationService();
        this.verificationService = new VerificationService();
    }
    async handleAnalyzeRequest(patientData) {
        try {
            const analysis = await this.analyzer.analyzePatient(patientData);
            return { success: true, data: analysis };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async handleVerifyRequest(analysisId, analysis) {
        try {
            const result = await this.verificationService.verifyAnalysis({
                analysis: analysis.analysis,
                diagnosis: analysis.diagnosis,
                citations: analysis.citations,
                recommendations: analysis.recommendations,
            });
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async handleNotifyRequest(analysis, providerId) {
        try {
            const notifications = await this.notificationService.notifyProvider(analysis, providerId);
            return { success: true, data: { notifications } };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async handleStatusRequest(notificationId) {
        try {
            const notification = await this.notificationService.getNotificationStatus(notificationId);
            if (!notification) {
                return { success: false, error: 'Notification not found' };
            }
            return { success: true, data: notification };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async handleMCPToolRequest(request) {
        try {
            switch (request.tool) {
                case 'medical-analyze':
                    return await this.mcpAnalyze(request.params);
                case 'medical-verify':
                    return await this.mcpVerify(request.params);
                case 'medical-notify':
                    return await this.mcpNotify(request.params);
                case 'medical-status':
                    return await this.mcpStatus(request.params);
                default:
                    return { success: false, error: `Unknown tool: ${request.tool}` };
            }
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async mcpAnalyze(params) {
        const result = await this.handleAnalyzeRequest(params.patientData);
        return result;
    }
    async mcpVerify(params) {
        const result = await this.handleVerifyRequest(params.analysisId, params.analysis);
        return result;
    }
    async mcpNotify(params) {
        const result = await this.handleNotifyRequest(params.analysis, params.providerId);
        return result;
    }
    async mcpStatus(params) {
        const result = await this.handleStatusRequest(params.notificationId);
        return result;
    }
}
//# sourceMappingURL=medical-api.js.map
/**
 * Provider Notification Tool
 * Notifies healthcare providers about analyses requiring review
 */
import type { MedicalAnalysis, MCPToolResponse } from '../types';
export declare class ProviderNotifyTool {
    private readonly workflow;
    constructor();
    /**
     * Notify provider about analysis
     */
    execute(args: {
        analysisId: string;
        analysis?: MedicalAnalysis;
        urgency?: 'low' | 'medium' | 'high' | 'critical';
        recipient?: string;
        channel?: 'email' | 'sms' | 'pager' | 'app';
        message?: string;
    }): Promise<MCPToolResponse>;
    /**
     * Create notification
     */
    private createNotification;
    /**
     * Send notification (simulated)
     */
    private sendNotification;
    /**
     * Determine urgency from analysis
     */
    private determineUrgency;
    /**
     * Select notification channel based on urgency
     */
    private selectChannel;
    /**
     * Generate notification message
     */
    private generateMessage;
    /**
     * Format notification summary
     */
    private formatNotificationSummary;
}
//# sourceMappingURL=provider-notify.d.ts.map
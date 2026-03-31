/**
 * Provider Approval Workflow
 * Manages provider review and approval of medical analyses
 */
import type { MedicalAnalysis, ProviderNotification } from '../types';
export declare class ProviderWorkflow {
    private readonly pendingReviews;
    private readonly approvedAnalyses;
    private readonly notifications;
    constructor();
    /**
     * Submit analysis for provider review
     */
    submitForReview(analysis: MedicalAnalysis): string;
    /**
     * Provider approves analysis
     */
    approveAnalysis(analysisId: string, providerNotes?: string): boolean;
    /**
     * Provider rejects analysis
     */
    rejectAnalysis(analysisId: string, reason: string): boolean;
    /**
     * Get pending reviews
     */
    getPendingReviews(): MedicalAnalysis[];
    /**
     * Get approved analyses
     */
    getApprovedAnalyses(): MedicalAnalysis[];
    /**
     * Get specific analysis
     */
    getAnalysis(analysisId: string): MedicalAnalysis | undefined;
    /**
     * Determine if analysis requires provider review
     */
    private requiresProviderReview;
    /**
     * Notify provider about pending review
     */
    private notifyProvider;
    /**
     * Map urgency level to notification urgency
     */
    private mapUrgencyLevel;
    /**
     * Format notification message
     */
    private formatNotificationMessage;
    /**
     * Get notification status
     */
    getNotification(notificationId: string): ProviderNotification | undefined;
    /**
     * Update notification status
     */
    updateNotificationStatus(notificationId: string, status: 'sent' | 'delivered' | 'acknowledged' | 'failed'): boolean;
}
//# sourceMappingURL=provider-workflow.d.ts.map
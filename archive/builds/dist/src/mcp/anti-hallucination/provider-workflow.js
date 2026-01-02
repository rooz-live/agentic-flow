/**
 * Provider Approval Workflow
 * Manages provider review and approval of medical analyses
 */
export class ProviderWorkflow {
    pendingReviews;
    approvedAnalyses;
    notifications;
    constructor() {
        this.pendingReviews = new Map();
        this.approvedAnalyses = new Map();
        this.notifications = new Map();
    }
    /**
     * Submit analysis for provider review
     */
    submitForReview(analysis) {
        // Determine if review is required
        const requiresReview = this.requiresProviderReview(analysis);
        if (!requiresReview) {
            // Auto-approve for low-risk, high-confidence analyses
            analysis.providerApproved = true;
            analysis.providerNotes = 'Auto-approved: Low risk, high confidence';
            this.approvedAnalyses.set(analysis.id, analysis);
            return 'auto-approved';
        }
        // Add to pending reviews
        analysis.requiresProviderReview = true;
        this.pendingReviews.set(analysis.id, analysis);
        // Notify provider
        this.notifyProvider(analysis);
        return 'pending-review';
    }
    /**
     * Provider approves analysis
     */
    approveAnalysis(analysisId, providerNotes) {
        const analysis = this.pendingReviews.get(analysisId);
        if (!analysis) {
            return false;
        }
        analysis.providerApproved = true;
        analysis.providerNotes = providerNotes || 'Approved by provider';
        this.pendingReviews.delete(analysisId);
        this.approvedAnalyses.set(analysisId, analysis);
        return true;
    }
    /**
     * Provider rejects analysis
     */
    rejectAnalysis(analysisId, reason) {
        const analysis = this.pendingReviews.get(analysisId);
        if (!analysis) {
            return false;
        }
        analysis.providerApproved = false;
        analysis.providerNotes = `Rejected: ${reason}`;
        this.pendingReviews.delete(analysisId);
        return true;
    }
    /**
     * Get pending reviews
     */
    getPendingReviews() {
        return Array.from(this.pendingReviews.values());
    }
    /**
     * Get approved analyses
     */
    getApprovedAnalyses() {
        return Array.from(this.approvedAnalyses.values());
    }
    /**
     * Get specific analysis
     */
    getAnalysis(analysisId) {
        return (this.pendingReviews.get(analysisId) ||
            this.approvedAnalyses.get(analysisId));
    }
    /**
     * Determine if analysis requires provider review
     */
    requiresProviderReview(analysis) {
        // Always require review for emergency cases
        if (analysis.urgencyLevel === 'emergency') {
            return true;
        }
        // Require review for critical severity conditions
        if (analysis.conditions.some(c => c.severity === 'critical')) {
            return true;
        }
        // Require review for low confidence
        if (analysis.confidence < 0.8) {
            return true;
        }
        // Require review if citations are not verified
        if (analysis.citations.some(c => !c.verified)) {
            return true;
        }
        // Require review for complex cases (multiple conditions)
        if (analysis.conditions.length > 3) {
            return true;
        }
        return false;
    }
    /**
     * Notify provider about pending review
     */
    notifyProvider(analysis) {
        const notification = {
            id: `notif-${analysis.id}`,
            timestamp: Date.now(),
            analysisId: analysis.id,
            urgency: this.mapUrgencyLevel(analysis.urgencyLevel),
            recipient: 'provider@medical.example.com', // Would be configured
            channel: analysis.urgencyLevel === 'emergency' ? 'pager' : 'app',
            status: 'sent',
            message: this.formatNotificationMessage(analysis),
        };
        this.notifications.set(notification.id, notification);
    }
    /**
     * Map urgency level to notification urgency
     */
    mapUrgencyLevel(urgency) {
        switch (urgency) {
            case 'routine':
                return 'low';
            case 'urgent':
                return 'high';
            case 'emergency':
                return 'critical';
            default:
                return 'medium';
        }
    }
    /**
     * Format notification message
     */
    formatNotificationMessage(analysis) {
        const conditionNames = analysis.conditions.map(c => c.name).join(', ');
        return `
Medical Analysis Pending Review

Analysis ID: ${analysis.id}
Urgency: ${analysis.urgencyLevel}
Conditions: ${conditionNames}
Confidence: ${(analysis.confidence * 100).toFixed(1)}%

Please review and approve/reject this analysis.
    `.trim();
    }
    /**
     * Get notification status
     */
    getNotification(notificationId) {
        return this.notifications.get(notificationId);
    }
    /**
     * Update notification status
     */
    updateNotificationStatus(notificationId, status) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            return false;
        }
        notification.status = status;
        return true;
    }
}
//# sourceMappingURL=provider-workflow.js.map
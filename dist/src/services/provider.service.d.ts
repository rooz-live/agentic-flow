/**
 * Provider Service
 * Manages healthcare provider interactions and notifications
 */
import type { Provider, ProviderReview, AnalysisResult } from '../types/medical.types';
interface PendingReview {
    analysisId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: Date;
    notified: boolean;
}
export declare class ProviderService {
    private providers;
    private pendingReviews;
    private reviews;
    constructor();
    /**
     * Add a healthcare provider
     */
    addProvider(provider: Provider): void;
    /**
     * Get provider by ID
     */
    getProvider(id: string): Provider | null;
    /**
     * Notify provider about analysis requiring review
     */
    notifyProvider(analysisId: string, analysis: AnalysisResult, urgent?: boolean): Promise<void>;
    /**
     * Submit provider review
     */
    submitReview(analysisId: string, reviewData: {
        decision: 'approved' | 'rejected' | 'modified';
        comments?: string;
        modifications?: string[];
    }): Promise<void>;
    /**
     * Get pending reviews
     */
    getPendingReviews(): Promise<PendingReview[]>;
    /**
     * Get review for analysis
     */
    getReview(analysisId: string): Promise<ProviderReview | null>;
    /**
     * Determine notification priority
     */
    private determinePriority;
    /**
     * Check if provider should be notified based on preferences
     */
    private shouldNotify;
    /**
     * Send notifications via configured channels
     */
    private sendNotifications;
    /**
     * Send email notification
     */
    private sendEmail;
    /**
     * Send SMS notification
     */
    private sendSMS;
    /**
     * Send push notification
     */
    private sendPushNotification;
    /**
     * List all providers
     */
    listProviders(): Provider[];
}
export {};
//# sourceMappingURL=provider.service.d.ts.map
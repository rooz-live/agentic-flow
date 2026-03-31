/**
 * Provider Review Interface
 * Handles provider review and approval of patient queries
 */
import { PatientQuery, QueryReview } from './types';
export declare class ReviewInterface {
    private reviews;
    private pendingReviews;
    constructor();
    /**
     * Assign query for review
     */
    assignForReview(query: PatientQuery, providerId: string): Promise<void>;
    /**
     * Submit review
     */
    submitReview(review: QueryReview, query: PatientQuery): Promise<void>;
    /**
     * Approve query with treatment plan
     */
    approveQuery(queryId: string, providerId: string, options: {
        diagnosis?: string;
        notes: string;
        recommendations?: string[];
        prescriptions?: any[];
        referrals?: any[];
        followUpRequired: boolean;
        followUpDate?: Date;
    }): Promise<QueryReview>;
    /**
     * Reject query with reason
     */
    rejectQuery(queryId: string, providerId: string, reason: string): Promise<QueryReview>;
    /**
     * Request additional information
     */
    requestAdditionalInfo(queryId: string, providerId: string, requestedInfo: string[]): Promise<QueryReview>;
    /**
     * Escalate query to specialist
     */
    escalateQuery(queryId: string, providerId: string, reason: string, targetSpecialization?: string): Promise<QueryReview>;
    /**
     * Get reviews for query
     */
    getReviewsForQuery(queryId: string): QueryReview[];
    /**
     * Get pending reviews for provider
     */
    getPendingReviewsForProvider(providerId: string): string[];
    /**
     * Get review history for provider
     */
    getProviderReviewHistory(providerId: string): QueryReview[];
    /**
     * Get review statistics
     */
    getReviewStats(providerId: string): {
        totalReviews: number;
        approvalRate: number;
        rejectionRate: number;
        escalationRate: number;
        averageReviewTime: number;
    };
}
//# sourceMappingURL=review-interface.d.ts.map
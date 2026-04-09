import { EventEmitter } from 'events';
interface SubscriptionData {
    userId: string;
    email: string;
    customerId?: string;
    subscriptionId?: string;
    status: 'active' | 'inactive' | 'past_due' | 'canceled';
    tier: 'free' | 'pro' | 'enterprise';
    startDate?: Date;
    endDate?: Date;
    circles: string[];
}
interface WebhookEvent {
    type: string;
    data: any;
    timestamp: Date;
}
export declare class RoozStripeIntegration extends EventEmitter {
    private stripe;
    private subscriptions;
    private webhookSecret;
    constructor(apiKey: string, webhookSecret: string);
    /**
     * Create checkout session for new subscription
     */
    createCheckoutSession(userId: string, email: string, tier: 'pro' | 'enterprise', successUrl: string, cancelUrl: string): Promise<{
        sessionId: string;
        url: string;
    }>;
    /**
     * Handle Stripe webhook events
     */
    handleWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
    /**
     * Get subscription status for a user
     */
    getSubscriptionStatus(userId: string): Promise<SubscriptionData>;
    /**
     * Cancel subscription
     */
    cancelSubscription(userId: string): Promise<void>;
    /**
     * Update subscription tier
     */
    updateSubscriptionTier(userId: string, newTier: 'pro' | 'enterprise'): Promise<void>;
    /**
     * Get customer portal URL
     */
    createCustomerPortalSession(userId: string, returnUrl: string): Promise<string>;
    /**
     * Private: Handle checkout completed
     */
    private handleCheckoutCompleted;
    /**
     * Private: Handle subscription created
     */
    private handleSubscriptionCreated;
    /**
     * Private: Handle subscription updated
     */
    private handleSubscriptionUpdated;
    /**
     * Private: Handle subscription deleted
     */
    private handleSubscriptionDeleted;
    /**
     * Private: Handle payment succeeded
     */
    private handlePaymentSucceeded;
    /**
     * Private: Handle payment failed
     */
    private handlePaymentFailed;
    /**
     * Private: Get Stripe price ID for tier
     */
    private getPriceIdForTier;
    /**
     * Private: Get circles for tier
     */
    private getCirclesForTier;
    /**
     * Get subscription statistics
     */
    getStatistics(): {
        totalSubscriptions: number;
        activeSubscriptions: number;
        byTier: Record<string, number>;
        revenue: {
            monthly: number;
            annual: number;
        };
    };
    /**
     * Export subscription data
     */
    exportSubscriptions(): SubscriptionData[];
    /**
     * Import subscription data (for testing/migration)
     */
    importSubscriptions(data: SubscriptionData[]): void;
}
export declare function initializeStripe(apiKey?: string, webhookSecret?: string): RoozStripeIntegration;
export declare function getStripeInstance(): RoozStripeIntegration | null;
export {};
//# sourceMappingURL=stripe-integration.d.ts.map
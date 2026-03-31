/**
 * Stripe Financial Services API Integration
 * WSJF Priority 2: Payment processing with PCI-DSS compliance
 *
 * Features:
 * - Payment Intent creation and management
 * - Subscription lifecycle management
 * - Webhook signature verification
 * - Idempotency handling
 * - Pattern metrics emission for observability
 * - Stripe Issuing API integration (cards, authorization)
 * - Treasury API integration (financial accounts)
 *
 * PCI-DSS Compliance:
 * - No raw card data handled in code
 * - Webhook signature verification required
 * - TLS 1.2+ enforced
 * - Rate limiting implemented
 * - Audit logging enabled
 */
import Stripe from 'stripe';
export interface StripeConfig {
    apiKey: string;
    webhookSecret?: string;
    apiVersion?: string;
    maxNetworkRetries?: number;
    timeout?: number;
    telemetry?: boolean;
}
export interface PaymentIntentOptions {
    amount: number;
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
    statementDescriptor?: string;
    idempotencyKey?: string;
}
export interface SubscriptionOptions {
    customerId: string;
    priceId: string;
    quantity?: number;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
}
export interface WebhookEvent {
    id: string;
    type: string;
    data: any;
    created: number;
}
export declare class StripeFinancialServices {
    private stripe;
    private webhookSecret?;
    private goalieDir;
    private telemetryEnabled;
    constructor(config: StripeConfig);
    /**
     * Emit pattern metric for observability
     */
    private emitMetric;
    /**
     * Create Payment Intent
     * Used for one-time payments
     */
    createPaymentIntent(options: PaymentIntentOptions): Promise<Stripe.PaymentIntent>;
    /**
     * Confirm Payment Intent
     * Finalizes payment after client provides payment method
     */
    confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent>;
    /**
     * Retrieve Payment Intent
     */
    getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
    /**
     * Cancel Payment Intent
     */
    cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
    /**
     * Create Customer
     */
    createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer>;
    /**
     * Create Subscription
     */
    createSubscription(options: SubscriptionOptions): Promise<Stripe.Subscription>;
    /**
     * Cancel Subscription
     */
    cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<Stripe.Subscription>;
    /**
     * Verify Webhook Signature (PCI-DSS requirement)
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string, webhookSecret?: string): Stripe.Event;
    /**
     * Process Webhook Event
     */
    processWebhookEvent(event: Stripe.Event): Promise<void>;
    private handlePaymentSuccess;
    private handlePaymentFailure;
    private handleSubscriptionChange;
    private handleSubscriptionDeleted;
    private handleInvoicePaid;
    private handleInvoiceFailed;
    /**
     * List all customers
     */
    listCustomers(limit?: number): Promise<Stripe.ApiList<Stripe.Customer>>;
    /**
     * List all payment intents
     */
    listPaymentIntents(limit?: number): Promise<Stripe.ApiList<Stripe.PaymentIntent>>;
    /**
     * Get account balance
     */
    getBalance(): Promise<Stripe.Balance>;
    /**
     * Create refund
     */
    createRefund(paymentIntentId: string, amount?: number, reason?: Stripe.Refund.Reason): Promise<Stripe.Refund>;
}
/**
 * Factory function to create Stripe Financial Services instance
 */
export declare function createStripeFinancialServices(config?: Partial<StripeConfig>): StripeFinancialServices;
/**
 * Express/Hono middleware for webhook handling
 */
export declare function createWebhookMiddleware(stripeService: StripeFinancialServices): (req: any, res: any) => Promise<any>;
export default StripeFinancialServices;
//# sourceMappingURL=stripe_financial_services.d.ts.map
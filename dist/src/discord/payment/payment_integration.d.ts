/**
 * Payment Integration System for Discord Bot
 * Comprehensive payment processing with Stripe integration
 *
 * Features:
 * - Multiple payment methods (cards, ACH, wire transfers)
 * - Subscription billing and recurring payments
 * - Transaction tracking and financial reporting
 * - Multi-currency processing and conversion
 * - PCI DSS compliance
 * - Fraud detection and prevention
 */
import { EventEmitter } from 'events';
import { DiscordBotConfig } from '../core/discord_config';
import { NotificationManager } from '../core/notification_manager';
export interface PaymentMethod {
    id: string;
    type: 'card' | 'bank_account' | 'wire_transfer';
    stripeId?: string;
    last4?: string;
    brand?: string;
    expiry?: string;
    bankName?: string;
    routingNumber?: string;
    isDefault: boolean;
    metadata?: Record<string, string>;
}
export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
    trialPeriodDays?: number;
    features: string[];
    metadata?: Record<string, string>;
    stripePriceId?: string;
    stripeProductId?: string;
}
export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId?: string;
    customerId?: string;
    metadata?: Record<string, string>;
}
export interface Transaction {
    id: string;
    userId: string;
    type: 'payment' | 'refund' | 'payout' | 'transfer';
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
    description: string;
    metadata?: Record<string, string>;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    createdAt: Date;
    updatedAt: Date;
    failureReason?: string;
}
export interface Invoice {
    id: string;
    userId: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
    dueDate?: Date;
    paidAt?: Date;
    stripeInvoiceId?: string;
    metadata?: Record<string, string>;
    lineItems?: InvoiceLineItem[];
}
export interface InvoiceLineItem {
    id: string;
    description: string;
    amount: number;
    currency: string;
    quantity: number;
    metadata?: Record<string, string>;
}
export interface PaymentIntent {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
    clientSecret?: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
    nextAction?: PaymentAction;
    stripePaymentIntentId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaymentAction {
    type: 'verify_card' | 'use_stripe_sdk' | 'redirect_to_url';
    redirectUrl?: string;
    sdkData?: any;
}
export interface Refund {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'expired_uncaptured_charge';
    status: 'pending' | 'succeeded' | 'failed' | 'canceled';
    stripeRefundId?: string;
    metadata?: Record<string, string>;
    createdAt: Date;
    processedAt?: Date;
}
export interface Payout {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    method: PaymentMethod['type'];
    status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
    destination: string;
    arrivalDate?: Date;
    stripePayoutId?: string;
    metadata?: Record<string, string>;
    createdAt: Date;
    processedAt?: Date;
}
export declare class PaymentIntegrationSystem extends EventEmitter {
    private stripe;
    private config;
    private notificationManager?;
    private plans;
    private subscriptions;
    private transactions;
    private paymentMethods;
    private invoices;
    constructor(config: DiscordBotConfig);
    /**
     * Initialize payment system
     */
    initialize(notificationManager?: NotificationManager): Promise<void>;
    /**
     * Initialize subscription plans
     */
    private initializePlans;
    /**
     * Create payment intent
     */
    createPaymentIntent(userId: string, amount: number, currency?: string, description?: string, metadata?: Record<string, string>): Promise<PaymentIntent>;
    /**
     * Confirm payment intent
     */
    confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
    /**
     * Create subscription
     */
    createSubscription(userId: string, planId: string, paymentMethodId?: string, trialPeriodDays?: number): Promise<Subscription>;
    /**
     * Cancel subscription
     */
    cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean, reason?: string): Promise<Subscription>;
    /**
     * Add payment method
     */
    addPaymentMethod(userId: string, paymentMethodType: PaymentMethod['type'], paymentMethodData: any): Promise<PaymentMethod>;
    /**
     * Get user payment methods
     */
    getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
    /**
     * Get user subscriptions
     */
    getSubscriptions(userId: string): Promise<Subscription[]>;
    /**
     * Get user transactions
     */
    getTransactions(userId: string, limit?: number, offset?: number): Promise<Transaction[]>;
    /**
     * Get user invoices
     */
    getInvoices(userId: string): Promise<Invoice[]>;
    /**
     * Get available plans
     */
    getPlans(): SubscriptionPlan[];
    /**
     * Get plan by ID
     */
    getPlan(planId: string): SubscriptionPlan | null;
    /**
     * Process refund
     */
    processRefund(transactionId: string, amount?: number, reason?: Refund['reason']): Promise<Refund>;
    /**
     * Get or create customer
     */
    private getOrCreateCustomer;
    /**
     * Create Stripe plan
     */
    private createStripePlan;
    /**
     * Setup webhook handlers
     */
    private setupWebhookHandlers;
    /**
     * Map Stripe status to local status
     */
    private mapStripeStatus;
    /**
     * Map Stripe subscription status
     */
    private mapStripeSubscriptionStatus;
    /**
     * Map Stripe refund status
     */
    private mapStripeRefundStatus;
    /**
     * Load subscriptions from storage
     */
    private loadSubscriptions;
    /**
     * Save subscription to storage
     */
    private saveSubscription;
    /**
     * Load transactions from storage
     */
    private loadTransactions;
    /**
     * Save transaction to storage
     */
    private saveTransaction;
    /**
     * Load payment methods from storage
     */
    private loadPaymentMethods;
    /**
     * Save payment methods to storage
     */
    private savePaymentMethods;
    /**
     * Load invoices from storage
     */
    private loadInvoices;
    /**
     * Save invoice to storage
     */
    private saveInvoice;
    /**
     * Get payment statistics
     */
    getStatistics(): any;
    /**
     * Shutdown payment system
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=payment_integration.d.ts.map
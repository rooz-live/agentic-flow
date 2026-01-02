/**
 * Stripe Affiliate Integration
 * @module integrations/stripe_affiliate
 *
 * Provides Stripe Connect integration for affiliate commission payments.
 * Implements tier-based commission rates and automated payout scheduling.
 */
import { EventEmitter } from 'events';
import Stripe from 'stripe';
import { AffiliateStateTracker } from '../affiliate/AffiliateStateTracker';
import { AffiliateTier } from '../affiliate/types';
export interface StripeAffiliateConfig {
    secretKey: string;
    webhookSecret?: string;
    apiVersion?: string;
    commissionRates?: CommissionRates;
    payoutSchedule?: 'daily' | 'weekly' | 'monthly';
}
export interface CommissionRates {
    standard: number;
    premium: number;
    enterprise: number;
}
export interface AffiliateStripeAccount {
    affiliateId: string;
    stripeAccountId: string;
    status: 'pending' | 'active' | 'restricted' | 'disabled';
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CommissionRecord {
    id: string;
    affiliateId: string;
    stripeAccountId: string;
    amount: number;
    currency: string;
    tier: AffiliateTier;
    commissionRate: number;
    transactionId: string;
    status: 'pending' | 'paid' | 'failed';
    createdAt: Date;
    paidAt?: Date;
}
export interface PayoutSummary {
    affiliateId: string;
    totalCommissions: number;
    pendingPayouts: number;
    completedPayouts: number;
    lastPayoutDate?: Date;
    nextPayoutDate?: Date;
}
export declare class StripeAffiliateClient extends EventEmitter {
    private stripe;
    private tracker;
    private config;
    private accounts;
    private commissions;
    constructor(tracker: AffiliateStateTracker, config: StripeAffiliateConfig);
    createConnectAccount(affiliateId: string, email: string): Promise<AffiliateStripeAccount>;
    getAccountOnboardingLink(affiliateId: string, returnUrl: string): Promise<string>;
    getAccount(affiliateId: string): Promise<AffiliateStripeAccount | null>;
    calculateCommission(amount: number, tier: AffiliateTier): {
        commission: number;
        rate: number;
    };
    createCommission(affiliateId: string, transactionAmount: number, transactionId: string): Promise<CommissionRecord>;
    processPayouts(affiliateId?: string): Promise<CommissionRecord[]>;
    getPayoutSummary(affiliateId: string): PayoutSummary;
    verifyWebhookSignature(payload: string, signature: string): Stripe.Event;
    handleWebhookEvent(event: Stripe.Event): Promise<void>;
    private handleAccountUpdated;
    private handlePaymentSucceeded;
    private handlePayoutPaid;
    private logActivity;
    getCommissionRates(): CommissionRates;
}
export declare function createStripeClient(tracker: AffiliateStateTracker, config: StripeAffiliateConfig): StripeAffiliateClient;
export declare function getStripeConfigFromEnv(): Partial<StripeAffiliateConfig>;
//# sourceMappingURL=stripe_affiliate.d.ts.map
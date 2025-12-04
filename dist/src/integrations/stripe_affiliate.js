/**
 * Stripe Affiliate Integration
 * @module integrations/stripe_affiliate
 *
 * Provides Stripe Connect integration for affiliate commission payments.
 * Implements tier-based commission rates and automated payout scheduling.
 */
import { EventEmitter } from 'events';
import Stripe from 'stripe';
const DEFAULT_COMMISSION_RATES = {
    standard: 0.05, // 5%
    premium: 0.10, // 10%
    enterprise: 0.15, // 15%
};
// =============================================================================
// Stripe Affiliate Client
// =============================================================================
export class StripeAffiliateClient extends EventEmitter {
    stripe;
    tracker;
    config;
    accounts = new Map();
    commissions = new Map();
    constructor(tracker, config) {
        super();
        this.tracker = tracker;
        this.config = {
            ...config,
            apiVersion: config.apiVersion || '2024-11-20.acacia',
            commissionRates: config.commissionRates || DEFAULT_COMMISSION_RATES,
            payoutSchedule: config.payoutSchedule || 'monthly',
            webhookSecret: config.webhookSecret || '',
        };
        this.stripe = new Stripe(this.config.secretKey, {
            apiVersion: this.config.apiVersion,
        });
    }
    // ===========================================================================
    // Stripe Connect Account Management
    // ===========================================================================
    async createConnectAccount(affiliateId, email) {
        const affiliate = this.tracker.getAffiliateById(affiliateId);
        if (!affiliate) {
            throw new Error(`Affiliate ${affiliateId} not found`);
        }
        const account = await this.stripe.accounts.create({
            type: 'express',
            email,
            metadata: {
                affiliateId,
                tier: affiliate.tier,
            },
            capabilities: {
                transfers: { requested: true },
            },
        });
        const affiliateAccount = {
            affiliateId,
            stripeAccountId: account.id,
            status: 'pending',
            payoutsEnabled: account.payouts_enabled || false,
            chargesEnabled: account.charges_enabled || false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.accounts.set(affiliateId, affiliateAccount);
        this.logActivity(affiliateId, 'stripe_account_created', { stripeAccountId: account.id });
        this.emit('account:created', affiliateAccount);
        return affiliateAccount;
    }
    async getAccountOnboardingLink(affiliateId, returnUrl) {
        const account = this.accounts.get(affiliateId);
        if (!account) {
            throw new Error(`No Stripe account for affiliate ${affiliateId}`);
        }
        const link = await this.stripe.accountLinks.create({
            account: account.stripeAccountId,
            refresh_url: returnUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });
        return link.url;
    }
    async getAccount(affiliateId) {
        return this.accounts.get(affiliateId) || null;
    }
    // ===========================================================================
    // Commission Management
    // ===========================================================================
    calculateCommission(amount, tier) {
        const rate = this.config.commissionRates[tier];
        const commission = Math.round(amount * rate * 100) / 100;
        return { commission, rate };
    }
    async createCommission(affiliateId, transactionAmount, transactionId) {
        const affiliate = this.tracker.getAffiliateById(affiliateId);
        if (!affiliate) {
            throw new Error(`Affiliate ${affiliateId} not found`);
        }
        const account = this.accounts.get(affiliateId);
        const { commission, rate } = this.calculateCommission(transactionAmount, affiliate.tier);
        const record = {
            id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            affiliateId,
            stripeAccountId: account?.stripeAccountId || '',
            amount: commission,
            currency: 'usd',
            tier: affiliate.tier,
            commissionRate: rate,
            transactionId,
            status: 'pending',
            createdAt: new Date(),
        };
        const existing = this.commissions.get(affiliateId) || [];
        existing.push(record);
        this.commissions.set(affiliateId, existing);
        this.logActivity(affiliateId, 'commission', {
            amount: commission,
            rate,
            transactionId
        });
        this.emit('commission:created', record);
        return record;
    }
    async processPayouts(affiliateId) {
        const processed = [];
        const targets = affiliateId
            ? [[affiliateId, this.commissions.get(affiliateId) || []]]
            : Array.from(this.commissions.entries());
        for (const [affId, records] of targets) {
            const account = this.accounts.get(affId);
            if (!account?.payoutsEnabled)
                continue;
            const pending = records.filter(r => r.status === 'pending');
            const totalAmount = pending.reduce((sum, r) => sum + r.amount, 0);
            if (totalAmount > 0) {
                try {
                    await this.stripe.transfers.create({
                        amount: Math.round(totalAmount * 100), // Convert to cents
                        currency: 'usd',
                        destination: account.stripeAccountId,
                        metadata: { affiliateId: affId, commissionCount: pending.length.toString() },
                    });
                    pending.forEach(r => {
                        r.status = 'paid';
                        r.paidAt = new Date();
                        processed.push(r);
                    });
                    this.logActivity(affId, 'payout', { amount: totalAmount, count: pending.length });
                    this.emit('payout:completed', { affiliateId: affId, amount: totalAmount });
                }
                catch (error) {
                    pending.forEach(r => r.status = 'failed');
                    this.emit('payout:failed', { affiliateId: affId, error });
                }
            }
        }
        return processed;
    }
    getPayoutSummary(affiliateId) {
        const records = this.commissions.get(affiliateId) || [];
        const pending = records.filter(r => r.status === 'pending');
        const completed = records.filter(r => r.status === 'paid');
        const lastPayout = completed.length > 0
            ? completed.reduce((latest, r) => r.paidAt && (!latest || r.paidAt > latest) ? r.paidAt : latest, null)
            : undefined;
        return {
            affiliateId,
            totalCommissions: records.reduce((sum, r) => sum + r.amount, 0),
            pendingPayouts: pending.reduce((sum, r) => sum + r.amount, 0),
            completedPayouts: completed.reduce((sum, r) => sum + r.amount, 0),
            lastPayoutDate: lastPayout || undefined,
        };
    }
    // ===========================================================================
    // Webhook Handling
    // ===========================================================================
    verifyWebhookSignature(payload, signature) {
        return this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
    }
    async handleWebhookEvent(event) {
        switch (event.type) {
            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;
            case 'payment_intent.succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
            case 'payout.paid':
                await this.handlePayoutPaid(event.data.object);
                break;
        }
        this.emit('webhook:received', { type: event.type, id: event.id });
    }
    async handleAccountUpdated(account) {
        const affiliateId = account.metadata?.affiliateId;
        if (!affiliateId)
            return;
        const existing = this.accounts.get(affiliateId);
        if (existing) {
            existing.payoutsEnabled = account.payouts_enabled || false;
            existing.chargesEnabled = account.charges_enabled || false;
            existing.status = account.payouts_enabled ? 'active' : 'restricted';
            existing.updatedAt = new Date();
            this.emit('account:updated', existing);
        }
    }
    async handlePaymentSucceeded(payment) {
        const affiliateId = payment.metadata?.affiliateId;
        if (affiliateId && payment.amount) {
            await this.createCommission(affiliateId, payment.amount / 100, payment.id);
        }
    }
    async handlePayoutPaid(payout) {
        this.emit('payout:confirmed', { payoutId: payout.id, amount: payout.amount / 100 });
    }
    // ===========================================================================
    // Helper Methods
    // ===========================================================================
    logActivity(affiliateId, type, payload) {
        this.tracker.logActivity({
            affiliateId,
            activityType: type,
            source: 'stripe',
            payload,
        });
    }
    getCommissionRates() {
        return { ...this.config.commissionRates };
    }
}
// =============================================================================
// Factory Functions
// =============================================================================
export function createStripeClient(tracker, config) {
    return new StripeAffiliateClient(tracker, config);
}
export function getStripeConfigFromEnv() {
    return {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
}
//# sourceMappingURL=stripe_affiliate.js.map
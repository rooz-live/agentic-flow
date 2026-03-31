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

// =============================================================================
// Configuration
// =============================================================================

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

const DEFAULT_COMMISSION_RATES: CommissionRates = {
  standard: 0.05,   // 5%
  premium: 0.10,    // 10%
  enterprise: 0.15, // 15%
};

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Stripe Affiliate Client
// =============================================================================

export class StripeAffiliateClient extends EventEmitter {
  private stripe: Stripe;
  private tracker: AffiliateStateTracker;
  private config: Required<StripeAffiliateConfig>;
  private accounts: Map<string, AffiliateStripeAccount> = new Map();
  private commissions: Map<string, CommissionRecord[]> = new Map();

  constructor(tracker: AffiliateStateTracker, config: StripeAffiliateConfig) {
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
      apiVersion: this.config.apiVersion as Stripe.LatestApiVersion,
    });
  }

  // ===========================================================================
  // Stripe Connect Account Management
  // ===========================================================================

  async createConnectAccount(affiliateId: string, email: string): Promise<AffiliateStripeAccount> {
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

    const affiliateAccount: AffiliateStripeAccount = {
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

  async getAccountOnboardingLink(affiliateId: string, returnUrl: string): Promise<string> {
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

  async getAccount(affiliateId: string): Promise<AffiliateStripeAccount | null> {
    return this.accounts.get(affiliateId) || null;
  }

  // ===========================================================================
  // Commission Management
  // ===========================================================================

  calculateCommission(amount: number, tier: AffiliateTier): { commission: number; rate: number } {
    const rate = this.config.commissionRates[tier];
    const commission = Math.round(amount * rate * 100) / 100;
    return { commission, rate };
  }

  async createCommission(
    affiliateId: string,
    transactionAmount: number,
    transactionId: string
  ): Promise<CommissionRecord> {
    const affiliate = this.tracker.getAffiliateById(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    const account = this.accounts.get(affiliateId);
    const { commission, rate } = this.calculateCommission(transactionAmount, affiliate.tier);

    const record: CommissionRecord = {
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

  async processPayouts(affiliateId?: string): Promise<CommissionRecord[]> {
    const processed: CommissionRecord[] = [];
    const targets = affiliateId
      ? [[affiliateId, this.commissions.get(affiliateId) || []]] as [string, CommissionRecord[]][]
      : Array.from(this.commissions.entries());

    for (const [affId, records] of targets) {
      const account = this.accounts.get(affId);
      if (!account?.payoutsEnabled) continue;

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
        } catch (error) {
          pending.forEach(r => r.status = 'failed');
          this.emit('payout:failed', { affiliateId: affId, error });
        }
      }
    }

    return processed;
  }

  getPayoutSummary(affiliateId: string): PayoutSummary {
    const records = this.commissions.get(affiliateId) || [];
    const pending = records.filter(r => r.status === 'pending');
    const completed = records.filter(r => r.status === 'paid');
    const lastPayout = completed.length > 0
      ? completed.reduce((latest, r) =>
          r.paidAt && (!latest || r.paidAt > latest) ? r.paidAt : latest,
          null as Date | null)
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

  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.webhookSecret
    );
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payout.paid':
        await this.handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
    }
    this.emit('webhook:received', { type: event.type, id: event.id });
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const affiliateId = account.metadata?.affiliateId;
    if (!affiliateId) return;

    const existing = this.accounts.get(affiliateId);
    if (existing) {
      existing.payoutsEnabled = account.payouts_enabled || false;
      existing.chargesEnabled = account.charges_enabled || false;
      existing.status = account.payouts_enabled ? 'active' : 'restricted';
      existing.updatedAt = new Date();
      this.emit('account:updated', existing);
    }
  }

  private async handlePaymentSucceeded(payment: Stripe.PaymentIntent): Promise<void> {
    const affiliateId = payment.metadata?.affiliateId;
    if (affiliateId && payment.amount) {
      await this.createCommission(affiliateId, payment.amount / 100, payment.id);
    }
  }

  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    this.emit('payout:confirmed', { payoutId: payout.id, amount: payout.amount / 100 });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private logActivity(affiliateId: string, type: string, payload: Record<string, unknown>): void {
    this.tracker.logActivity({
      affiliateId,
      activityType: type as any,
      source: 'stripe',
      payload,
    });
  }

  getCommissionRates(): CommissionRates {
    return { ...this.config.commissionRates };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createStripeClient(
  tracker: AffiliateStateTracker,
  config: StripeAffiliateConfig
): StripeAffiliateClient {
  return new StripeAffiliateClient(tracker, config);
}

export function getStripeConfigFromEnv(): Partial<StripeAffiliateConfig> {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  };
}

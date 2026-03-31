/**
 * Stripe Integration Tests
 * Tests for Stripe Connect, webhooks, and commission calculations
 */

import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import {
    CommissionRecord,
    createStripeClient,
    getStripeConfigFromEnv,
    StripeAffiliateClient
} from '../../src/integrations/stripe_affiliate';

// Mock Stripe SDK
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn().mockResolvedValue({
        id: 'acct_test_123',
        payouts_enabled: false,
        charges_enabled: false,
      }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({
        url: 'https://connect.stripe.com/onboarding/test',
      }),
    },
    transfers: {
      create: jest.fn().mockResolvedValue({ id: 'tr_test_123' }),
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((payload, sig, secret) => {
        if (sig === 'invalid') throw new Error('Invalid signature');
        return JSON.parse(payload);
      }),
    },
  }));
});

describe('Stripe Integration', () => {
  let tracker: AffiliateStateTracker;
  let client: StripeAffiliateClient;
  let affiliateId: string;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
    client = createStripeClient(tracker, {
      secretKey: 'sk_test_xxx',
      webhookSecret: 'whsec_test_xxx',
    });
    affiliateId = 'aff_test_123';
    tracker.createAffiliate({
      affiliateId,
      name: 'Test Affiliate',
      tier: 'standard',
    });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Commission Calculations', () => {
    it('should calculate 5% commission for standard tier', () => {
      const { commission, rate } = client.calculateCommission(100, 'standard');
      expect(rate).toBe(0.05);
      expect(commission).toBe(5);
    });

    it('should calculate 10% commission for premium tier', () => {
      const { commission, rate } = client.calculateCommission(100, 'premium');
      expect(rate).toBe(0.10);
      expect(commission).toBe(10);
    });

    it('should calculate 15% commission for enterprise tier', () => {
      const { commission, rate } = client.calculateCommission(100, 'enterprise');
      expect(rate).toBe(0.15);
      expect(commission).toBe(15);
    });

    it('should round commission to 2 decimal places', () => {
      const { commission } = client.calculateCommission(99.99, 'standard');
      expect(commission).toBe(5);
    });

    it('should return commission rates', () => {
      const rates = client.getCommissionRates();
      expect(rates.standard).toBe(0.05);
      expect(rates.premium).toBe(0.10);
      expect(rates.enterprise).toBe(0.15);
    });
  });

  describe('Stripe Connect Accounts', () => {
    it('should create Connect account for affiliate', async () => {
      const account = await client.createConnectAccount(affiliateId, 'test@test.com');
      expect(account.stripeAccountId).toBe('acct_test_123');
      expect(account.affiliateId).toBe(affiliateId);
      expect(account.status).toBe('pending');
    });

    it('should emit account:created event', async () => {
      const eventPromise = new Promise((resolve) => {
        client.on('account:created', resolve);
      });
      await client.createConnectAccount(affiliateId, 'test@test.com');
      const event = await eventPromise;
      expect(event).toBeDefined();
    });

    it('should get onboarding link', async () => {
      await client.createConnectAccount(affiliateId, 'test@test.com');
      const link = await client.getAccountOnboardingLink(affiliateId, 'https://example.com/return');
      expect(link).toBe('https://connect.stripe.com/onboarding/test');
    });

    it('should throw for non-existent affiliate', async () => {
      await expect(client.createConnectAccount('nonexistent', 'test@test.com'))
        .rejects.toThrow('Affiliate nonexistent not found');
    });
  });

  describe('Commission Records', () => {
    it('should create commission record', async () => {
      const commission = await client.createCommission(affiliateId, 100, 'txn_test_123');
      expect(commission.affiliateId).toBe(affiliateId);
      expect(commission.amount).toBe(5); // 5% of 100
      expect(commission.tier).toBe('standard');
      expect(commission.status).toBe('pending');
    });

    it('should emit commission:created event', async () => {
      const eventPromise = new Promise<CommissionRecord>((resolve) => {
        client.on('commission:created', resolve);
      });
      await client.createCommission(affiliateId, 200, 'txn_test_456');
      const record = await eventPromise;
      expect(record.amount).toBe(10);
    });

    it('should get payout summary', async () => {
      await client.createCommission(affiliateId, 100, 'txn_1');
      await client.createCommission(affiliateId, 200, 'txn_2');

      const summary = client.getPayoutSummary(affiliateId);
      expect(summary.totalCommissions).toBe(15); // 5 + 10
      expect(summary.pendingPayouts).toBe(15);
      expect(summary.completedPayouts).toBe(0);
    });
  });

  describe('Webhook Handling', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_1' });
      const event = client.verifyWebhookSignature(payload, 'valid_sig');
      expect(event.type).toBe('payment_intent.succeeded');
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ type: 'test' });
      expect(() => client.verifyWebhookSignature(payload, 'invalid'))
        .toThrow('Invalid signature');
    });

    it('should emit webhook:received event', async () => {
      const eventPromise = new Promise((resolve) => {
        client.on('webhook:received', resolve);
      });
      await client.handleWebhookEvent({ type: 'test.event', id: 'evt_123' } as any);
      const received = await eventPromise;
      expect(received).toEqual({ type: 'test.event', id: 'evt_123' });
    });
  });

  describe('Environment Configuration', () => {
    it('should get config from environment', () => {
      const config = getStripeConfigFromEnv();
      expect(config).toHaveProperty('secretKey');
      expect(config).toHaveProperty('webhookSecret');
    });
  });
});

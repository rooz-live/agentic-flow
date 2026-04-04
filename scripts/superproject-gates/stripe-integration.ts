import Stripe from 'stripe';
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

export class RoozStripeIntegration extends EventEmitter {
  private stripe: Stripe;
  private subscriptions: Map<string, SubscriptionData> = new Map();
  private webhookSecret: string;
  
  constructor(apiKey: string, webhookSecret: string) {
    super();
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover',
    });
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create checkout session for new subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    tier: 'pro' | 'enterprise',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const priceId = this.getPriceIdForTier(tier);
    
    const session = await this.stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: userId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
        source: 'rooz.yo.life',
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    });

    console.log(`[STRIPE] Created checkout session ${session.id} for user ${userId}`);
    
    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookEvent> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (err: any) {
      console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    console.log(`[STRIPE] Processing webhook event: ${event.type}`);

    const webhookEvent: WebhookEvent = {
      type: event.type,
      data: event.data.object,
      timestamp: new Date(),
    };

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[STRIPE] Unhandled event type: ${event.type}`);
    }

    this.emit('webhook', webhookEvent);
    return webhookEvent;
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionData> {
    const cached = this.subscriptions.get(userId);
    if (cached) {
      return cached;
    }

    // If not cached, return free tier
    return {
      userId,
      email: '',
      status: 'inactive',
      tier: 'free',
      circles: [],
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.subscriptionId) {
      throw new Error('No active subscription found');
    }

    await this.stripe.subscriptions.cancel(subscription.subscriptionId);
    
    subscription.status = 'canceled';
    subscription.endDate = new Date();
    this.subscriptions.set(userId, subscription);

    console.log(`[STRIPE] Canceled subscription for user ${userId}`);
    this.emit('subscription.canceled', { userId });
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(
    userId: string,
    newTier: 'pro' | 'enterprise'
  ): Promise<void> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.subscriptionId) {
      throw new Error('No active subscription found');
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.subscriptionId
    );

    const newPriceId = this.getPriceIdForTier(newTier);

    await this.stripe.subscriptions.update(subscription.subscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    subscription.tier = newTier;
    this.subscriptions.set(userId, subscription);

    console.log(`[STRIPE] Updated subscription for user ${userId} to ${newTier}`);
    this.emit('subscription.updated', { userId, tier: newTier });
  }

  /**
   * Get customer portal URL
   */
  async createCustomerPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<string> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.customerId) {
      throw new Error('No customer found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Private: Handle checkout completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.client_reference_id || session.metadata?.userId;
    if (!userId) {
      console.error('[STRIPE] No userId in checkout session');
      return;
    }

    const subscriptionData: SubscriptionData = {
      userId,
      email: session.customer_email || '',
      customerId: session.customer as string,
      subscriptionId: session.subscription as string,
      status: 'active',
      tier: (session.metadata?.tier as 'pro' | 'enterprise') || 'pro',
      startDate: new Date(),
      circles: this.getCirclesForTier((session.metadata?.tier as 'pro' | 'enterprise') || 'pro'),
    };

    this.subscriptions.set(userId, subscriptionData);
    console.log(`[STRIPE] Checkout completed for user ${userId}`);
    
    this.emit('subscription.activated', subscriptionData);
  }

  /**
   * Private: Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('[STRIPE] No userId in subscription metadata');
      return;
    }

    console.log(`[STRIPE] Subscription created for user ${userId}`);
    this.emit('subscription.created', { userId, subscriptionId: subscription.id });
  }

  /**
   * Private: Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const cached = this.subscriptions.get(userId);
    if (cached) {
      cached.status = subscription.status as any;
      this.subscriptions.set(userId, cached);
    }

    console.log(`[STRIPE] Subscription updated for user ${userId}: ${subscription.status}`);
    this.emit('subscription.status_changed', { userId, status: subscription.status });
  }

  /**
   * Private: Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const cached = this.subscriptions.get(userId);
    if (cached) {
      cached.status = 'canceled';
      cached.endDate = new Date();
      this.subscriptions.set(userId, cached);
    }

    console.log(`[STRIPE] Subscription deleted for user ${userId}`);
    this.emit('subscription.deleted', { userId });
  }

  /**
   * Private: Handle payment succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Get userId from subscription metadata if available
    let userId: string | undefined;
    const subscriptionId = invoice.lines?.data?.[0]?.subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.userId;
    }
    if (!userId) return;

    console.log(`[STRIPE] Payment succeeded for user ${userId}`);
    this.emit('payment.succeeded', { userId, amount: invoice.amount_paid });
  }

  /**
   * Private: Handle payment failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Get userId from subscription metadata if available
    let userId: string | undefined;
    const subscriptionId = invoice.lines?.data?.[0]?.subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.userId;
    }
    if (!userId) return;

    const cached = this.subscriptions.get(userId);
    if (cached) {
      cached.status = 'past_due';
      this.subscriptions.set(userId, cached);
    }

    console.log(`[STRIPE] Payment failed for user ${userId}`);
    this.emit('payment.failed', { userId, amount: invoice.amount_due });
  }

  /**
   * Private: Get Stripe price ID for tier
   */
  private getPriceIdForTier(tier: 'pro' | 'enterprise'): string {
    // These should be configured via environment variables
    const priceIds = {
      pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    };

    return priceIds[tier];
  }

  /**
   * Private: Get circles for tier
   */
  private getCirclesForTier(tier: 'free' | 'pro' | 'enterprise'): string[] {
    const circleMap = {
      free: ['public'],
      pro: ['public', 'orchestrator', 'analyst', 'innovator', 'assessor', 'seeker', 'intuitive'],
      enterprise: ['public', 'orchestrator', 'analyst', 'innovator', 'assessor', 'seeker', 'intuitive', 'enterprise'],
    };

    return circleMap[tier];
  }

  /**
   * Get subscription statistics
   */
  getStatistics(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    byTier: Record<string, number>;
    revenue: { monthly: number; annual: number };
  } {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: 0,
      byTier: { free: 0, pro: 0, enterprise: 0 },
      revenue: { monthly: 0, annual: 0 },
    };

    for (const sub of this.subscriptions.values()) {
      if (sub.status === 'active') {
        stats.activeSubscriptions++;
        stats.byTier[sub.tier]++;
        
        // Calculate revenue (simplified)
        if (sub.tier === 'pro') {
          stats.revenue.monthly += 29;
          stats.revenue.annual += 29 * 12;
        }
      }
    }

    return stats;
  }

  /**
   * Export subscription data
   */
  exportSubscriptions(): SubscriptionData[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Import subscription data (for testing/migration)
   */
  importSubscriptions(data: SubscriptionData[]): void {
    for (const sub of data) {
      this.subscriptions.set(sub.userId, sub);
    }
    console.log(`[STRIPE] Imported ${data.length} subscriptions`);
  }
}

/**
 * Singleton instance
 */
let stripeInstance: RoozStripeIntegration | null = null;

export function initializeStripe(apiKey?: string, webhookSecret?: string): RoozStripeIntegration {
  if (!stripeInstance) {
    const key = apiKey || process.env.STRIPE_SECRET_KEY;
    const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!key || !secret) {
      throw new Error('Stripe API key and webhook secret are required');
    }

    stripeInstance = new RoozStripeIntegration(key, secret);
    console.log('[STRIPE] Integration initialized');
  }

  return stripeInstance;
}

export function getStripeInstance(): RoozStripeIntegration | null {
  return stripeInstance;
}

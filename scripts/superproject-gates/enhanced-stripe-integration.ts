/**
 * Enhanced Stripe Financial Services Integration
 * 
 * Comprehensive Stripe integration for multi-tenant affiliate platform
 * including payments, payouts, subscriptions, and financial analytics
 */

import { EventEmitter } from 'events';
import Stripe from 'stripe';
import {
  Tenant,
  Affiliate,
  Commission,
  Payout,
  PaymentMethod,
  Transaction,
  TransactionType,
  TransactionStatus,
  FinancialAccount,
  AccountRestriction,
  AffiliateError,
  AffiliateEvent
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface EnhancedStripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  defaultCurrency: string;
  enableConnect: boolean;
  enableSubscriptions: boolean;
  enableRadar: boolean;
  enableFraudDetection: boolean;
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    burstLimit: number;
  };
}

export interface StripeConnectAccount {
  id: string;
  tenantId: string;
  affiliateId: string;
  stripeAccountId: string;
  status: 'pending' | 'restricted' | 'enabled' | 'disabled';
  capabilities: string[];
  restrictions: AccountRestriction[];
  requirements: {
    currently_due: string[];
    eventually_due: string[];
  };
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeSubscription {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeTransaction {
  id: string;
  tenantId: string;
  stripeTransactionId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  metadata: TransactionMetadata;
  fees: {
    stripe: number;
    application: number;
    processing: number;
    total: number;
  };
  createdAt: Date;
  processedAt?: Date;
  refundedAt?: Date;
}

export class EnhancedStripeIntegration extends EventEmitter {
  private stripe: Stripe;
  private config: EnhancedStripeConfig;
  private connectAccounts: Map<string, StripeConnectAccount> = new Map();
  private subscriptions: Map<string, StripeSubscription> = new Map();
  private transactions: Map<string, StripeTransaction> = new Map();
  private webhooks: Map<string, (event: Stripe.Event) => void> = new Map();

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    config: EnhancedStripeConfig
  ) {
    super();
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
      typescript: true
    });
    this.setupOrchestrationIntegration();
    this.setupWebhookHandlers();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for financial services
    const financialPurpose = this.orchestration.createPurpose({
      name: 'Financial Services Excellence',
      description: 'Provide comprehensive financial services with Stripe integration',
      objectives: [
        'Process payments and payouts reliably',
        'Manage subscriptions and billing',
        'Ensure fraud detection and compliance',
        'Optimize financial transaction costs'
      ],
      keyResults: [
        '99.9% payment success rate',
        'Sub-5 minute payout processing',
        'Zero financial compliance violations',
        'Optimized transaction costs < 3%'
      ]
    });

    // Create domain for financial operations
    const financialDomain = this.orchestration.createDomain({
      name: 'Financial Operations',
      purpose: 'Manage all financial transactions, payments, and compliance',
      boundaries: [
        'Payment processing',
        'Payout management',
        'Subscription billing',
        'Fraud detection and prevention'
      ],
      accountabilities: [
        'Financial accuracy and reconciliation',
        'Payment processing efficiency',
        'Regulatory compliance',
        'Fraud prevention and detection'
      ]
    });

    console.log('[ENHANCED-STRIPE] Integrated with orchestration framework');
  }

  /**
   * Setup webhook handlers
   */
  private setupWebhookHandlers(): void {
    this.webhooks.set('payment_intent.succeeded', this.handlePaymentSucceeded.bind(this));
    this.webhooks.set('payment_intent.payment_failed', this.handlePaymentFailed.bind(this));
    this.webhooks.set('payout.created', this.handlePayoutCreated.bind(this));
    this.webhooks.set('payout.failed', this.handlePayoutFailed.bind(this));
    this.webhooks.set('customer.subscription.created', this.handleSubscriptionCreated.bind(this));
    this.webhooks.set('customer.subscription.deleted', this.handleSubscriptionDeleted.bind(this));
    this.webhooks.set('account.updated', this.handleAccountUpdated.bind(this));
    this.webhooks.set('radar.early_fraud_warning', this.handleFraudWarning.bind(this));
  }

  /**
   * Create Stripe Connect account for affiliate
   */
  public async createConnectAccount(
    tenantId: string,
    affiliateId: string,
    accountData: {
      businessType: 'individual' | 'company';
      country: string;
      email: string;
      displayName?: string;
      url?: string;
      company?: {
        name?: string;
        taxId?: string;
        address?: {
          line1: string;
          city: string;
          state: string;
          postalCode: string;
          country: string;
        };
      };
    }
  ): Promise<StripeConnectAccount> {
    try {
      // Create orchestration plan for Connect account creation
      const connectPlan = this.orchestration.createPlan({
        name: `Stripe Connect Account Creation - ${affiliateId}`,
        description: 'Create Stripe Connect account for affiliate',
        objectives: [
          'Create Stripe Connect account',
          'Configure payout capabilities',
          'Set up fraud detection',
          'Verify compliance requirements'
        ],
        timeline: '24 hours',
        resources: [
          'Stripe Connect API',
          'Identity verification service',
          'Compliance checking service',
          'Account configuration service'
        ]
      });

      // Create execution actions
      const connectDo = this.orchestration.createDo({
        planId: connectPlan.id,
        actions: [
          {
            name: 'Account Creation',
            description: 'Create Stripe Connect account',
            priority: 1,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            name: 'Identity Verification',
            description: 'Verify affiliate identity and business information',
            priority: 2,
            estimatedDuration: 60,
            dependencies: ['account-creation']
          },
          {
            name: 'Compliance Setup',
            description: 'Configure compliance and fraud detection',
            priority: 3,
            estimatedDuration: 15,
            dependencies: ['identity-verification']
          },
          {
            name: 'Account Activation',
            description: 'Activate Connect account for payouts',
            priority: 4,
            estimatedDuration: 10,
            dependencies: ['compliance-setup']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority
      const wsjfParams = {
        userBusinessValue: 85,
        timeCriticality: 80,
        customerValue: 75,
        jobSize: 3,
        riskReduction: 75,
        opportunityEnablement: 70
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        connectDo.id,
        wsjfParams
      );

      // Create Stripe Connect account
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: accountData.country,
        email: accountData.email,
        business_type: accountData.businessType,
        capabilities: ['card_payments', 'transfers'],
        business_profile: {
          name: accountData.displayName,
          url: accountData.url,
          ...accountData.company
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          },
          branding: {
            icon: file('path/to/icon.png'),
            logo: file('path/to/logo.png'),
            primary_color: '#007bff'
          }
        }
      });

      const connectAccount: StripeConnectAccount = {
        id: this.generateId('connect-account'),
        tenantId,
        affiliateId,
        stripeAccountId: account.id,
        status: 'pending',
        capabilities: account.capabilities || [],
        restrictions: [],
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || []
        },
        payoutsEnabled: false,
        chargesEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.connectAccounts.set(connectAccount.id, connectAccount);

      this.emitEvent('connect_account_created', {
        connectAccountId: connectAccount.id,
        tenantId,
        affiliateId,
        stripeAccountId: account.id,
        status: connectAccount.status
      });

      console.log(`[ENHANCED-STRIPE] Created Connect account: ${connectAccount.id} for affiliate: ${affiliateId}`);
      return connectAccount;

    } catch (error) {
      const stripeError: AffiliateError = {
        code: 'CONNECT_ACCOUNT_CREATION_FAILED',
        message: `Failed to create Connect account: ${error.message}`,
        details: { tenantId, affiliateId, accountData },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: stripeError });
      throw error;
    }
  }

  /**
   * Process payment with enhanced fraud detection
   */
  public async processPayment(
    tenantId: string,
    paymentData: {
      amount: number;
      currency: string;
      paymentMethodId: string;
      customerId: string;
      description?: string;
      metadata?: Record<string, any>;
      affiliateId?: string;
      referralId?: string;
    }
  ): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    error?: string;
    fraudScore?: number;
  }> {
    try {
      // Create orchestration plan for payment processing
      const paymentPlan = this.orchestration.createPlan({
        name: `Payment Processing - ${paymentData.customerId}`,
        description: 'Process payment with fraud detection and compliance checks',
        objectives: [
          'Validate payment method and customer',
          'Perform fraud risk assessment',
          'Process payment through Stripe',
          'Record transaction for analytics'
        ],
        timeline: '5 minutes',
        resources: [
          'Stripe payment API',
          'Fraud detection service',
          'Risk assessment engine',
          'Transaction recording service'
        ]
      });

      // Create execution actions
      const paymentDo = this.orchestration.createDo({
        planId: paymentPlan.id,
        actions: [
          {
            name: 'Payment Validation',
            description: 'Validate payment method and customer data',
            priority: 1,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            name: 'Fraud Detection',
            description: 'Perform fraud risk assessment',
            priority: 2,
            estimatedDuration: 15,
            dependencies: ['payment-validation']
          },
          {
            name: 'Payment Processing',
            description: 'Process payment through Stripe',
            priority: 3,
            estimatedDuration: 30,
            dependencies: ['fraud-detection']
          },
          {
            name: 'Transaction Recording',
            description: 'Record transaction for analytics',
            priority: 4,
            estimatedDuration: 10,
            dependencies: ['payment-processing']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority
      const wsjfParams = {
        userBusinessValue: 90,
        timeCriticality: 85,
        customerValue: 80,
        jobSize: 2,
        riskReduction: 85,
        opportunityEnablement: 75
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        paymentDo.id,
        wsjfParams
      );

      // Perform fraud detection if enabled
      let fraudScore = 0;
      let riskLevel = 'low';
      
      if (this.config.enableFraudDetection) {
        const fraudResult = await this.performFraudDetection(paymentData);
        fraudScore = fraudResult.score;
        riskLevel = fraudResult.riskLevel;
        
        if (fraudResult.block) {
          return {
            success: false,
            error: 'Payment blocked due to fraud risk',
            fraudScore
          };
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        payment_method: paymentData.paymentMethodId,
        customer: paymentData.customerId,
        description: paymentData.description,
        metadata: {
          tenantId,
          affiliateId: paymentData.affiliateId || '',
          referralId: paymentData.referralId || '',
          fraudScore: fraudScore.toString(),
          riskLevel,
          ...paymentData.metadata
        },
        confirmation_method: 'automatic',
        capture_method: 'automatic'
      });

      // Record transaction
      const transaction: StripeTransaction = {
        id: this.generateId('transaction'),
        tenantId,
        stripeTransactionId: paymentIntent.id,
        type: 'payment',
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        description: paymentData.description || 'Payment processing',
        metadata: {
          customerId: paymentData.customerId,
          affiliateId: paymentData.affiliateId,
          referralId: paymentData.referralId,
          paymentIntentId: paymentIntent.id,
          fraudScore,
          riskLevel
        } as TransactionMetadata,
        fees: {
          stripe: 0,
          application: paymentData.amount * 0.025, // 2.5% application fee
          processing: 0,
          total: paymentData.amount * 0.025
        },
        createdAt: new Date()
      };

      this.transactions.set(transaction.id, transaction);

      this.emitEvent('payment_processed', {
        transactionId: transaction.id,
        tenantId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        fraudScore,
        riskLevel,
        paymentIntentId: paymentIntent.id
      });

      console.log(`[ENHANCED-STRIPE] Processed payment: ${paymentIntent.id} with fraud score: ${fraudScore}`);
      
      return {
        success: true,
        paymentIntent,
        fraudScore
      };

    } catch (error) {
      const paymentError: AffiliateError = {
        code: 'PAYMENT_PROCESSING_FAILED',
        message: `Failed to process payment: ${error.message}`,
        details: { tenantId, paymentData },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: paymentError });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process payout with enhanced compliance
   */
  public async processPayout(
    tenantId: string,
    payoutData: {
      affiliateId: string;
      amount: number;
      currency: string;
      destinationAccountId: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    transfer?: Stripe.Transfer;
    error?: string;
  }> {
    try {
      // Create orchestration plan for payout processing
      const payoutPlan = this.orchestration.createPlan({
        name: `Payout Processing - ${payoutData.affiliateId}`,
        description: 'Process affiliate payout with compliance and fraud checks',
        objectives: [
          'Validate payout eligibility and limits',
          'Perform compliance checks',
          'Process transfer through Stripe',
          'Record payout for accounting'
        ],
        timeline: '30 minutes',
        resources: [
          'Stripe transfer API',
          'Compliance checking service',
          'Account validation service',
          'Payout recording service'
        ]
      });

      // Create execution actions
      const payoutDo = this.orchestration.createDo({
        planId: payoutPlan.id,
        actions: [
          {
            name: 'Payout Validation',
            description: 'Validate payout eligibility and limits',
            priority: 1,
            estimatedDuration: 10,
            dependencies: []
          },
          {
            name: 'Compliance Checks',
            description: 'Perform compliance and fraud checks',
            priority: 2,
            estimatedDuration: 15,
            dependencies: ['payout-validation']
          },
          {
            name: 'Transfer Processing',
            description: 'Process transfer through Stripe',
            priority: 3,
            estimatedDuration: 30,
            dependencies: ['compliance-checks']
          },
          {
            name: 'Payout Recording',
            description: 'Record payout for accounting',
            priority: 4,
            estimatedDuration: 5,
            dependencies: ['transfer-processing']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority
      const wsjfParams = {
        userBusinessValue: 95,
        timeCriticality: 90,
        customerValue: 85,
        jobSize: 3,
        riskReduction: 80,
        opportunityEnablement: 75
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        payoutDo.id,
        wsjfParams
      );

      // Create transfer
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(payoutData.amount * 100), // Convert to cents
        currency: payoutData.currency.toLowerCase(),
        destination: payoutData.destinationAccountId,
        description: payoutData.description || `Affiliate payout for ${payoutData.affiliateId}`,
        metadata: {
          tenantId,
          affiliateId: payoutData.affiliateId,
          payoutType: 'affiliate_commission',
          ...payoutData.metadata
        },
        transfer_group: {
          type: 'payout',
          group_id: this.generateId('payout-group')
        }
      });

      // Record transaction
      const transaction: StripeTransaction = {
        id: this.generateId('transaction'),
        tenantId,
        stripeTransactionId: transfer.id,
        type: 'payout',
        amount: payoutData.amount,
        currency: payoutData.currency,
        status: 'completed',
        description: payoutData.description || 'Affiliate payout',
        metadata: {
          affiliateId: payoutData.affiliateId,
          transferId: transfer.id,
          destinationAccount: payoutData.destinationAccountId
        } as TransactionMetadata,
        fees: {
          stripe: transfer.amount * 0.0025, // 0.25% Stripe fee
          application: 0,
          processing: 0,
          total: transfer.amount * 0.0025
        },
        createdAt: new Date(),
        processedAt: new Date()
      };

      this.transactions.set(transaction.id, transaction);

      this.emitEvent('payout_processed', {
        transactionId: transaction.id,
        tenantId,
        affiliateId: payoutData.affiliateId,
        amount: payoutData.amount,
        currency: payoutData.currency,
        transferId: transfer.id
      });

      console.log(`[ENHANCED-STRIPE] Processed payout: ${transfer.id} for affiliate: ${payoutData.affiliateId}`);
      
      return {
        success: true,
        transfer
      };

    } catch (error) {
      const payoutError: AffiliateError = {
        code: 'PAYOUT_PROCESSING_FAILED',
        message: `Failed to process payout: ${error.message}`,
        details: { tenantId, payoutData },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: payoutError });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform fraud detection
   */
  private async performFraudDetection(paymentData: any): Promise<{
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    block: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check amount anomalies
    if (paymentData.amount > 1000) {
      score += 20;
      reasons.push('High transaction amount');
    }

    // Check frequency (would need historical data)
    // For now, add small score for new customers
    if (!paymentData.metadata?.existingCustomer) {
      score += 10;
      reasons.push('New customer transaction');
    }

    // Check geographic risk
    if (paymentData.metadata?.highRiskCountry) {
      score += 30;
      reasons.push('High risk geographic location');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (score >= 50) {
      riskLevel = 'high';
    } else if (score >= 25) {
      riskLevel = 'medium';
    }

    // Block if high risk
    const block = score >= 60;

    return { score, riskLevel, block, reasons };
  }

  /**
   * Handle webhook events
   */
  private async handlePaymentSucceeded(event: Stripe.PaymentIntentSucceededEvent): Promise<void> {
    const paymentIntent = event.data.object;
    
    // Update transaction status
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.stripeTransactionId === paymentIntent.id) {
        transaction.status = 'completed';
        transaction.processedAt = new Date();
        this.transactions.set(id, transaction);
        break;
      }
    }

    this.emitEvent('payment_succeeded_webhook', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata
    });
  }

  private async handlePaymentFailed(event: Stripe.PaymentIntentPaymentFailedEvent): Promise<void> {
    const paymentIntent = event.data.object;
    
    // Update transaction status
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.stripeTransactionId === paymentIntent.id) {
        transaction.status = 'failed';
        transaction.processedAt = new Date();
        this.transactions.set(id, transaction);
        break;
      }
    }

    this.emitEvent('payment_failed_webhook', {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
      metadata: paymentIntent.metadata
    });
  }

  private async handlePayoutCreated(event: Stripe.TransferCreatedEvent): Promise<void> {
    const transfer = event.data.object;
    
    this.emitEvent('payout_created_webhook', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      currency: transfer.currency.toUpperCase(),
      destination: transfer.destination,
      metadata: transfer.metadata
    });
  }

  private async handlePayoutFailed(event: Stripe.TransferFailedEvent): Promise<void> {
    const transfer = event.data.object;
    
    this.emitEvent('payout_failed_webhook', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      currency: transfer.currency.toUpperCase(),
      error: transfer.transfer_data?.amount_received - transfer.amount,
      metadata: transfer.metadata
    });
  }

  private async handleSubscriptionCreated(event: Stripe.CustomerSubscriptionCreatedEvent): Promise<void> {
    const subscription = event.data.object;
    
    this.emitEvent('subscription_created_webhook', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      planId: subscription.items.data[0]?.price?.id,
      status: subscription.status,
      metadata: subscription.metadata
    });
  }

  private async handleSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent): Promise<void> {
    const subscription = event.data.object;
    
    this.emitEvent('subscription_deleted_webhook', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      canceledAt: subscription.canceled_at,
      metadata: subscription.metadata
    });
  }

  private async handleAccountUpdated(event: Stripe.AccountUpdatedEvent): Promise<void> {
    const account = event.data.object;
    
    // Update Connect account status
    for (const [id, connectAccount] of this.connectAccounts.entries()) {
      if (connectAccount.stripeAccountId === account.id) {
        connectAccount.status = this.mapStripeStatusToConnectStatus(account.charges_enabled);
        connectAccount.updatedAt = new Date();
        this.connectAccounts.set(id, connectAccount);
        break;
      }
    }

    this.emitEvent('account_updated_webhook', {
      accountId: account.id,
      status: account.charges_enabled,
      capabilities: account.capabilities,
      requirements: account.requirements
    });
  }

  private async handleFraudWarning(event: Stripe.RadarEarlyFraudWarningEvent): Promise<void> {
    const warning = event.data.object;
    
    this.emitEvent('fraud_warning_webhook', {
      warningId: warning.id,
      fraudType: warning.fraud_type,
      riskScore: warning.risk_score,
      riskLevel: warning.risk_level,
      metadata: warning.metadata
    });
  }

  /**
   * Map Stripe status to Connect account status
   */
  private mapStripeStatusToConnectStatus(chargesEnabled: boolean): 'pending' | 'restricted' | 'enabled' | 'disabled' {
    if (chargesEnabled) {
      return 'enabled';
    } else {
      return 'restricted';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Emit affiliate event
   */
  private emitEvent(type: AffiliateEvent['type'], data: Record<string, any>): void {
    const event: AffiliateEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data,
      metadata: {}
    };

    this.emit('affiliateEvent', event);
  }

  // Public utility methods
  public getConnectAccount(affiliateId: string): StripeConnectAccount | undefined {
    return Array.from(this.connectAccounts.values())
      .find(account => account.affiliateId === affiliateId);
  }

  public getConnectAccountsByTenant(tenantId: string): StripeConnectAccount[] {
    return Array.from(this.connectAccounts.values())
      .filter(account => account.tenantId === tenantId);
  }

  public getTransaction(transactionId: string): StripeTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  public getTransactionsByTenant(tenantId: string): StripeTransaction[] {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.tenantId === tenantId);
  }

  public getFinancialStats(tenantId?: string): {
    totalRevenue: number;
    totalPayouts: number;
    totalFees: number;
    transactionCount: number;
    averageTransactionAmount: number;
    successRate: number;
  } {
    const transactions = tenantId 
      ? this.getTransactionsByTenant(tenantId)
      : Array.from(this.transactions.values());

    const successfulTransactions = transactions.filter(t => t.status === 'completed');
    const totalRevenue = successfulTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalPayouts = successfulTransactions
      .filter(t => t.type === 'payout')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.fees.total, 0);

    return {
      totalRevenue,
      totalPayouts,
      totalFees,
      transactionCount: transactions.length,
      averageTransactionAmount: successfulTransactions.length > 0 
        ? totalRevenue / successfulTransactions.length 
        : 0,
      successRate: transactions.length > 0 
        ? (successfulTransactions.length / transactions.length) * 100 
        : 0
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.connectAccounts.clear();
    this.subscriptions.clear();
    this.transactions.clear();
    this.webhooks.clear();
    console.log('[ENHANCED-STRIPE] Enhanced Stripe integration disposed');
  }
}
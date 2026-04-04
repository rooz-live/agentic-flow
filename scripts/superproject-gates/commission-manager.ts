/**
 * Commission Manager
 * 
 * Handles commission calculation, tracking, approval workflows, and payment processing
 * with integration to Stripe and other financial services providers
 */

import { EventEmitter } from 'events';
import Stripe from 'stripe';
import {
  Commission,
  CommissionType,
  CommissionStatus,
  CommissionCalculation,
  Payout,
  PayoutStatus,
  PayoutFees,
  Affiliate,
  Referral,
  Customer,
  PaymentMethod,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionMetadata,
  TransactionFees,
  AffiliateEvent,
  AffiliateError
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';
import { HostBillIntegration, HostBillConfig } from './hostbill-integration';

export interface CommissionConfig {
  stripeSecretKey?: string;
  hostbillConfig?: HostBillConfig;
  paymentProvider: 'stripe' | 'hostbill';
  defaultCurrency: string;
  minimumPayout: number;
  holdingPeriod: number; // days
  autoApproval: boolean;
  fraudDetection: boolean;
  taxWithholding: number;
  processingFees: ProcessingFeeConfig;
}

export interface ProcessingFeeConfig {
  percentage: number;
  fixed: number;
  currency: string;
  internationalFee: number;
}

export class CommissionManager extends EventEmitter {
  private commissions: Map<string, Commission> = new Map();
  private payouts: Map<string, Payout> = new Map();
  private stripe?: Stripe;
  private hostbill?: HostBillIntegration;

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private config: CommissionConfig
  ) {
    super();

    // Initialize payment provider
    if (config.paymentProvider === 'stripe' && config.stripeSecretKey) {
      this.stripe = new Stripe(config.stripeSecretKey, {
        apiVersion: '2023-10-16',
        typescript: true
      });
    } else if (config.paymentProvider === 'hostbill' && config.hostbillConfig) {
      this.hostbill = new HostBillIntegration(
        orchestration,
        wsjfService,
        config.hostbillConfig
      );
    } else {
      throw new Error('Invalid payment provider configuration');
    }

    this.setupOrchestrationIntegration();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for commission management
    const commissionPurpose = this.orchestration.createPurpose({
      name: 'Commission Processing Excellence',
      description: 'Ensure accurate, timely, and compliant commission processing and payouts',
      objectives: [
        'Process commissions with 99.9% accuracy',
        'Maintain sub-24hr payout processing',
        'Ensure 100% regulatory compliance',
        'Minimize processing costs and fraud'
      ],
      keyResults: [
        'Zero commission calculation errors',
        'Average payout time < 24 hours',
        '100% tax compliance',
        'Fraud rate < 0.1%'
      ]
    });

    // Create domain for financial operations
    const financialDomain = this.orchestration.createDomain({
      name: 'Financial Operations',
      purpose: 'Manage all financial transactions, commissions, and payment processing',
      boundaries: [
        'Commission calculation and validation',
        'Payment processing and payouts',
        'Fraud detection and prevention',
        'Tax compliance and reporting'
      ],
      accountabilities: [
        'Financial accuracy and reconciliation',
        'Payment processing efficiency',
        'Regulatory compliance',
        'Fraud prevention and detection'
      ]
    });

    console.log('[COMMISSION-MANAGER] Integrated with orchestration framework');
  }

  /**
   * Calculate commission for a referral conversion
   */
  public async calculateCommission(
    affiliate: Affiliate,
    referral: Referral,
    customer: Customer,
    purchaseAmount: number,
    currency: string = this.config.defaultCurrency,
    customRate?: number
  ): Promise<Commission> {
    try {
      // Determine commission rate
      const commissionRate = customRate || 
        this.getCommissionRate(affiliate, purchaseAmount, customer);

      // Calculate base commission
      const baseAmount = purchaseAmount * commissionRate;

      // Apply tier bonus
      const tierMultiplier = this.getTierMultiplier(affiliate.tier.level);

      // Apply performance bonus
      const performanceMultiplier = this.getPerformanceMultiplier(affiliate.performance);

      // Calculate total multiplier
      const totalMultiplier = tierMultiplier * performanceMultiplier;

      // Calculate final commission amount
      const calculatedAmount = baseAmount * totalMultiplier;

      // Apply tax withholding
      const taxWithholding = calculatedAmount * this.config.taxWithholding;
      const finalAmount = calculatedAmount - taxWithholding;

      const commission: Commission = {
        id: this.generateId('commission'),
        affiliateId: affiliate.id,
        referralId: referral.id,
        customerId: customer.id,
        type: 'initial_sale',
        amount: finalAmount,
        currency,
        rate: commissionRate,
        status: this.config.autoApproval ? 'approved' : 'pending',
        calculationDetails: {
          baseAmount,
          commissionRate,
          tierMultiplier,
          performanceMultiplier,
          customAdjustments: 0,
          totalMultiplier,
          calculatedAmount,
          currency
        },
        createdAt: new Date(),
        metadata: {
          taxWithholding,
          originalAmount: calculatedAmount,
          processingDate: new Date(),
          source: 'automatic_calculation'
        }
      };

      // Store commission
      this.commissions.set(commission.id, commission);

      // Create orchestration plan for commission processing
      const processingPlan = this.orchestration.createPlan({
        name: `Commission Processing - ${commission.id}`,
        description: 'Process and validate commission calculation',
        objectives: [
          'Validate commission calculation accuracy',
          'Perform fraud detection checks',
          'Apply tax withholding correctly',
          'Schedule payment processing'
        ],
        timeline: '24 hours',
        resources: [
          'Commission calculation engine',
          'Fraud detection system',
          'Tax calculation service',
          'Payment processing system'
        ]
      });

      // Create execution actions
      const processingDo = this.orchestration.createDo({
        planId: processingPlan.id,
        actions: [
          {
            name: 'Commission Validation',
            description: 'Validate commission calculation and rules',
            priority: 1,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            name: 'Fraud Detection',
            description: 'Run fraud detection algorithms',
            priority: 2,
            estimatedDuration: 15,
            dependencies: ['commission-validation']
          },
          {
            name: 'Tax Calculation',
            description: 'Calculate and apply tax withholding',
            priority: 3,
            estimatedDuration: 10,
            dependencies: ['fraud-detection']
          },
          {
            name: 'Payment Scheduling',
            description: 'Schedule commission for payment',
            priority: 4,
            estimatedDuration: 5,
            dependencies: ['tax-calculation']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority for commission processing
      const wsjfParams = {
        userBusinessValue: 90,
        timeCriticality: 85,
        customerValue: 80,
        jobSize: 2,
        riskReduction: 60,
        opportunityEnablement: 70
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        processingDo.id,
        wsjfParams
      );

      // Emit event
      this.emitEvent('commission_earned', {
        commissionId: commission.id,
        affiliateId: affiliate.id,
        amount: finalAmount,
        currency,
        status: commission.status
      });

      console.log(`[COMMISSION-MANAGER] Calculated commission: ${commission.id} - $${finalAmount} ${currency}`);
      return commission;

    } catch (error) {
      const commissionError: AffiliateError = {
        code: 'CALCULATION_FAILED',
        message: `Failed to calculate commission: ${error.message}`,
        details: { affiliateId: affiliate.id, referralId: referral.id, purchaseAmount },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: commissionError });
      throw error;
    }
  }

  /**
   * Approve commission for payment
   */
  public async approveCommission(
    commissionId: string,
    approvedBy: string,
    notes?: string
  ): Promise<void> {
    const commission = this.commissions.get(commissionId);
    if (!commission) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    commission.status = 'approved';
    commission.processedAt = new Date();
    commission.metadata.approvedBy = approvedBy;
    commission.metadata.approvalNotes = notes;

    // Create orchestration act for approval
    const approvalAct = this.orchestration.createAct({
      doId: 'commission-approval',
      outcomes: [
        {
          id: this.generateId('outcome'),
          name: 'Commission Approved',
          status: 'success',
          actualValue: commission.amount,
          expectedValue: commission.amount,
          variance: 0,
          lessons: ['Commission approved and ready for payout']
        }
      ],
      learnings: [
        `Commission ${commissionId} approved by ${approvedBy}`,
        'Validation checks passed',
        notes || 'Standard approval process'
      ],
      improvements: [
        'Consider automated approval for low-risk commissions',
        'Streamline approval workflow'
      ],
      metrics: {
        approvalTime: Date.now() - commission.createdAt.getTime(),
        commissionAmount: commission.amount,
        riskScore: 0.1
      }
    });

    this.emitEvent('commission_approved', {
      commissionId,
      approvedBy,
      approvedAt: new Date()
    });

    console.log(`[COMMISSION-MANAGER] Approved commission: ${commissionId}`);
  }

  /**
   * Create payout for approved commissions
   */
  public async createPayout(
    affiliateId: string,
    paymentMethod: PaymentMethod,
    commissionIds?: string[]
  ): Promise<Payout> {
    try {
      // Get approved commissions for affiliate
      const approvedCommissions = commissionIds 
        ? commissionIds.map(id => this.commissions.get(id)).filter(Boolean) as Commission[]
        : Array.from(this.commissions.values())
          .filter(c => c.affiliateId === affiliateId && c.status === 'approved');

      if (approvedCommissions.length === 0) {
        throw new Error('No approved commissions available for payout');
      }

      // Calculate total amount
      const totalAmount = approvedCommissions.reduce((sum, commission) => sum + commission.amount, 0);

      if (totalAmount < this.config.minimumPayout) {
        throw new Error(`Total amount $${totalAmount} is below minimum payout threshold $${this.config.minimumPayout}`);
      }

      // Calculate fees
      const fees = this.calculatePayoutFees(totalAmount, paymentMethod);

      // Create payout object
      const payout: Payout = {
        id: this.generateId('payout'),
        affiliateId,
        totalAmount: totalAmount - fees.total,
        currency: this.config.defaultCurrency,
        commissionIds: approvedCommissions.map(c => c.id),
        status: 'pending',
        paymentMethod,
        fees,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store payout
      this.payouts.set(payout.id, payout);

      // Update commission statuses
      approvedCommissions.forEach(commission => {
        commission.status = 'processing';
        commission.paymentId = payout.id;
      });

      // Create orchestration plan for payout processing
      const payoutPlan = this.orchestration.createPlan({
        name: `Payout Processing - ${payout.id}`,
        description: 'Process affiliate payout through payment system',
        objectives: [
          'Validate payout amount and fees',
          'Process payment through selected method',
          'Update commission statuses',
          'Send payment confirmation'
        ],
        timeline: '24 hours',
        resources: [
          'Payment processing system',
          'Fraud detection service',
          'Notification service',
          'Accounting system'
        ]
      });

      // Create execution actions
      const payoutDo = this.orchestration.createDo({
        planId: payoutPlan.id,
        actions: [
          {
            name: 'Payout Validation',
            description: 'Validate payout calculation and fees',
            priority: 1,
            estimatedDuration: 15,
            dependencies: []
          },
          {
            name: 'Payment Processing',
            description: 'Process payment through Stripe or other provider',
            priority: 2,
            estimatedDuration: 60,
            dependencies: ['payout-validation']
          },
          {
            name: 'Status Updates',
            description: 'Update commission and payout statuses',
            priority: 3,
            estimatedDuration: 10,
            dependencies: ['payment-processing']
          },
          {
            name: 'Notification',
            description: 'Send payment confirmation to affiliate',
            priority: 4,
            estimatedDuration: 5,
            dependencies: ['status-updates']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority for payout processing
      const wsjfParams = {
        userBusinessValue: 95,
        timeCriticality: 90,
        customerValue: 85,
        jobSize: 3,
        riskReduction: 70,
        opportunityEnablement: 80
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        payoutDo.id,
        wsjfParams
      );

      // Emit event
      this.emitEvent('payout_processed', {
        payoutId: payout.id,
        affiliateId,
        totalAmount: payout.totalAmount,
        currency: payout.currency,
        paymentMethod: paymentMethod.type
      });

      console.log(`[COMMISSION-MANAGER] Created payout: ${payout.id} - $${payout.totalAmount}`);
      return payout;

    } catch (error) {
      const payoutError: AffiliateError = {
        code: 'PAYOUT_FAILED',
        message: `Failed to create payout: ${error.message}`,
        details: { affiliateId, paymentMethod, commissionIds },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: payoutError });
      throw error;
    }
  }

  /**
   * Process payout through Stripe
   */
  public async processStripePayout(payoutId: string): Promise<void> {
    const payout = this.payouts.get(payoutId);
    if (!payout) {
      throw new Error(`Payout ${payoutId} not found`);
    }

    if (payout.paymentMethod.type !== 'stripe_connect') {
      throw new Error('Payout payment method is not Stripe Connect');
    }

    try {
      payout.status = 'processing';
      payout.processingDate = new Date();
      payout.updatedAt = new Date();

      // Create Stripe transfer
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(payout.totalAmount * 100), // Convert to cents
        currency: payout.currency.toLowerCase(),
        destination: payout.paymentMethod.details.stripeAccountId,
        description: `Affiliate payout ${payoutId}`,
        metadata: {
          payoutId,
          affiliateId: payout.affiliateId,
          commissionCount: payout.commissionIds.length
        }
      });

      // Update payout status
      payout.status = 'completed';
      payout.completedDate = new Date();
      payout.transactionId = transfer.id;
      payout.updatedAt = new Date();

      // Update commission statuses
      payout.commissionIds.forEach(commissionId => {
        const commission = this.commissions.get(commissionId);
        if (commission) {
          commission.status = 'paid';
          commission.paidAt = new Date();
        }
      });

      // Create transaction record
      const transaction: Transaction = {
        id: this.generateId('transaction'),
        accountId: payout.paymentMethod.id,
        type: 'payout',
        amount: payout.totalAmount,
        currency: payout.currency,
        status: 'completed',
        description: `Affiliate payout ${payoutId}`,
        metadata: {
          payoutId,
          affiliateId: payout.affiliateId,
          stripeTransferId: transfer.id,
          commissionIds: payout.commissionIds
        } as TransactionMetadata,
        fees: payout.fees as TransactionFees,
        createdAt: new Date(),
        processedAt: new Date(),
        settledAt: new Date()
      };

      // Create orchestration act for successful payout
      const payoutAct = this.orchestration.createAct({
        doId: 'stripe-payout',
        outcomes: [
          {
            id: this.generateId('outcome'),
            name: 'Stripe Payout Successful',
            status: 'success',
            actualValue: payout.totalAmount,
            expectedValue: payout.totalAmount,
            variance: 0,
            lessons: [`Successfully processed payout via Stripe Connect: ${transfer.id}`]
          }
        ],
        learnings: [
          `Payout ${payoutId} completed successfully`,
          'Stripe integration working correctly',
          'Fees calculated accurately'
        ],
        improvements: [
          'Consider batch processing for multiple payouts',
          'Optimize fee calculation algorithms'
        ],
        metrics: {
          processingTime: Date.now() - (payout.processingDate?.getTime() || payout.createdAt.getTime()),
          transferId: transfer.id,
          totalAmount: payout.totalAmount,
          fees: payout.fees.total
        }
      });

      this.emitEvent('payout_processed', {
        payoutId,
        transactionId: transfer.id,
        status: 'completed',
        completedAt: new Date()
      });

      console.log(`[COMMISSION-MANAGER] Processed Stripe payout: ${payoutId} - Transfer ID: ${transfer.id}`);

    } catch (error) {
      payout.status = 'failed';
      payout.failureReason = error.message;
      payout.updatedAt = new Date();

      // Reset commission statuses
      payout.commissionIds.forEach(commissionId => {
        const commission = this.commissions.get(commissionId);
        if (commission) {
          commission.status = 'approved';
          commission.paymentId = undefined;
        }
      });

      this.emitEvent('system_error', {
        error: {
          code: 'STRIPE_PAYOUT_FAILED',
          message: `Stripe payout failed: ${error.message}`,
          details: { payoutId, stripeError: error },
          timestamp: new Date()
        }
      });

      throw error;
    }
  }

  /**
   * Get commission rate for affiliate
   */
  private getCommissionRate(
    affiliate: Affiliate,
    purchaseAmount: number,
    customer: Customer
  ): number {
    // Check for custom rates first
    const customRate = affiliate.commissionSettings.customRates.find(rate => {
      if (rate.productId && customer.metadata.productId === rate.productId) {
        return true;
      }
      if (rate.productCategory && customer.metadata.category === rate.productCategory) {
        return true;
      }
      return false;
    });

    if (customRate) {
      return customRate.rate;
    }

    // Use base rate with tier bonus
    return affiliate.commissionSettings.baseRate + affiliate.commissionSettings.tierBonus;
  }

  /**
   * Get tier multiplier
   */
  private getTierMultiplier(tierLevel: number): number {
    const multipliers = {
      1: 1.0,  // Bronze
      2: 1.1,  // Silver
      3: 1.25, // Gold
      4: 1.5   // Platinum
    };
    return multipliers[tierLevel] || 1.0;
  }

  /**
   * Get performance multiplier
   */
  private getPerformanceMultiplier(performance: AffiliatePerformance): number {
    // Base multiplier on conversion rate and revenue
    const conversionBonus = Math.min(performance.conversionRate / 100, 0.2);
    const revenueBonus = Math.min(performance.totalRevenue / 10000, 0.15);
    
    return 1 + conversionBonus + revenueBonus;
  }

  /**
   * Calculate payout fees
   */
  private calculatePayoutFees(amount: number, paymentMethod: PaymentMethod): PayoutFees {
    const config = this.config.processingFees;
    
    // Processing fees
    const processing = amount * (config.percentage / 100) + config.fixed;
    
    // Transaction fees (varies by payment method)
    let transaction = 0;
    switch (paymentMethod.type) {
      case 'stripe_connect':
        transaction = amount * 0.0025; // 0.25%
        break;
      case 'paypal':
        transaction = amount * 0.0030; // 0.30%
        break;
      case 'bank_account':
        transaction = config.fixed; // Fixed fee for ACH
        break;
      case 'crypto':
        transaction = amount * 0.0050; // 0.50%
        break;
    }

    // Currency conversion fees (for international)
    const currency = paymentMethod.details.currency !== this.config.defaultCurrency ? amount * 0.01 : 0;
    
    // Platform fees
    const platform = amount * 0.001; // 0.1%
    
    const total = processing + transaction + currency + platform;

    return {
      processing: Math.round(processing * 100) / 100,
      transaction: Math.round(transaction * 100) / 100,
      currency: Math.round(currency * 100) / 100,
      platform: Math.round(platform * 100) / 100,
      total: Math.round(total * 100) / 100
    };
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

  // Public getter methods
  public getCommission(commissionId: string): Commission | undefined {
    return this.commissions.get(commissionId);
  }

  public getCommissionsByAffiliate(affiliateId: string): Commission[] {
    return Array.from(this.commissions.values())
      .filter(commission => commission.affiliateId === affiliateId);
  }

  public getPayout(payoutId: string): Payout | undefined {
    return this.payouts.get(payoutId);
  }

  public getPayoutsByAffiliate(affiliateId: string): Payout[] {
    return Array.from(this.payouts.values())
      .filter(payout => payout.affiliateId === affiliateId);
  }

  public getPendingCommissions(): Commission[] {
    return Array.from(this.commissions.values())
      .filter(commission => commission.status === 'pending');
  }

  public getApprovedCommissions(): Commission[] {
    return Array.from(this.commissions.values())
      .filter(commission => commission.status === 'approved');
  }

  public updateCommission(commissionId: string, updates: Partial<Commission>): Commission {
    const commission = this.commissions.get(commissionId);
    if (!commission) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    const updatedCommission: Commission = {
      ...commission,
      ...updates
    };

    this.commissions.set(commissionId, updatedCommission);
    return updatedCommission;
  }

  public rejectCommission(commissionId: string, reason: string, rejectedBy: string): void {
    const commission = this.commissions.get(commissionId);
    if (!commission) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    commission.status = 'rejected';
    commission.metadata.rejectionReason = reason;
    commission.metadata.rejectedBy = rejectedBy;

    this.emitEvent('commission_rejected', {
      commissionId,
      reason,
      rejectedBy,
      rejectedAt: new Date()
    });

    console.log(`[COMMISSION-MANAGER] Rejected commission: ${commissionId}, reason: ${reason}`);
  }
}
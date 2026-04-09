/**
 * Affiliate Network Manager
 * 
 * Core component for managing affiliate networks, registration, tier management,
 * and integration with the agentic-flow orchestration framework
 */

import { EventEmitter } from 'events';
import { 
  Affiliate, 
  AffiliateTier, 
  AffiliatePerformance, 
  Referral, 
  Customer, 
  Tenant,
  AffiliateEvent,
  AffiliateError,
  CommissionSettings,
  AffiliateProfile
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface AffiliateNetworkConfig {
  autoApprove: boolean;
  defaultTier: string;
  commissionHoldingPeriod: number;
  referralCookieDuration: number;
  fraudDetectionEnabled: boolean;
  complianceChecks: string[];
}

export class AffiliateNetworkManager extends EventEmitter {
  private affiliates: Map<string, Affiliate> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private customers: Map<string, Customer> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private tiers: Map<string, AffiliateTier> = new Map();

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private config: AffiliateNetworkConfig
  ) {
    super();
    this.initializeDefaultTiers();
    this.setupOrchestrationIntegration();
  }

  /**
   * Initialize default affiliate tiers
   */
  private initializeDefaultTiers(): void {
    const defaultTiers: AffiliateTier[] = [
      {
        id: 'bronze',
        name: 'Bronze Affiliate',
        level: 1,
        minPerformance: 0,
        commissionRate: 0.05,
        benefits: ['Basic dashboard access', 'Standard commission rate'],
        requirements: [
          { type: 'sales_volume', value: 0, period: 'monthly' }
        ],
        isActive: true
      },
      {
        id: 'silver',
        name: 'Silver Affiliate',
        level: 2,
        minPerformance: 1000,
        commissionRate: 0.07,
        benefits: ['Advanced dashboard', 'Increased commission rate', 'Monthly reports'],
        requirements: [
          { type: 'sales_volume', value: 1000, period: 'monthly' }
        ],
        isActive: true
      },
      {
        id: 'gold',
        name: 'Gold Affiliate',
        level: 3,
        minPerformance: 5000,
        commissionRate: 0.10,
        benefits: ['Premium dashboard', 'Highest commission rate', 'Real-time analytics', 'Dedicated support'],
        requirements: [
          { type: 'sales_volume', value: 5000, period: 'monthly' }
        ],
        isActive: true
      },
      {
        id: 'platinum',
        name: 'Platinum Affiliate',
        level: 4,
        minPerformance: 20000,
        commissionRate: 0.15,
        benefits: ['White-label dashboard', 'Maximum commission rate', 'API access', 'Account manager'],
        requirements: [
          { type: 'sales_volume', value: 20000, period: 'monthly' }
        ],
        isActive: true
      }
    ];

    defaultTiers.forEach(tier => this.tiers.set(tier.id, tier));
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for affiliate management
    const affiliatePurpose = this.orchestration.createPurpose({
      name: 'Affiliate Network Optimization',
      description: 'Optimize affiliate network performance, recruitment, and revenue generation',
      objectives: [
        'Maximize affiliate recruitment and retention',
        'Optimize commission structures and payouts',
        'Ensure compliance and fraud prevention',
        'Enhance affiliate experience and tools'
      ],
      keyResults: [
        '95%+ affiliate satisfaction rate',
        '30%+ year-over-year affiliate growth',
        'Zero compliance violations',
        'Sub-24hr payout processing'
      ]
    });

    // Create domain for affiliate operations
    const affiliateDomain = this.orchestration.createDomain({
      name: 'Affiliate Operations',
      purpose: 'Manage all affiliate-related operations, compliance, and performance optimization',
      boundaries: [
        'Affiliate recruitment and onboarding',
        'Commission processing and payouts',
        'Performance monitoring and analytics',
        'Compliance and fraud prevention'
      ],
      accountabilities: [
        'Affiliate network growth',
        'Commission accuracy and timeliness',
        'Regulatory compliance',
        'Fraud detection and prevention'
      ]
    });

    // Create accountability for affiliate management
    const affiliateAccountability = this.orchestration.createAccountability({
      role: 'Affiliate Network Manager',
      responsibilities: [
        'Manage affiliate lifecycle and performance',
        'Optimize commission structures',
        'Ensure compliance with regulations',
        'Monitor and prevent fraud',
        'Enhance affiliate tools and experience'
      ],
      metrics: [
        'Affiliate acquisition rate',
        'Commission processing accuracy',
        'Fraud detection rate',
        'Affiliate retention rate',
        'Average payout processing time'
      ],
      reportingTo: ['head-of-revenue', 'compliance-officer']
    });

    console.log('[AFFILIATE-NETWORK] Integrated with orchestration framework');
  }

  /**
   * Register new affiliate
   */
  public async registerAffiliate(
    userId: string,
    tenantId: string,
    profile: AffiliateProfile,
    customCommissionSettings?: Partial<CommissionSettings>
  ): Promise<Affiliate> {
    try {
      // Generate unique affiliate code
      const affiliateCode = this.generateAffiliateCode(profile.firstName, profile.lastName);

      // Create affiliate object
      const affiliate: Affiliate = {
        id: this.generateId('affiliate'),
        userId,
        tenantId,
        affiliateCode,
        status: this.config.autoApprove ? 'active' : 'pending',
        tier: this.tiers.get(this.config.defaultTier)!,
        profile,
        performance: this.createInitialPerformance(),
        commissionSettings: this.createDefaultCommissionSettings(customCommissionSettings),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Store affiliate
      this.affiliates.set(affiliate.id, affiliate);

      // Create orchestration plan for affiliate onboarding
      const onboardingPlan = this.orchestration.createPlan({
        name: `Affiliate Onboarding - ${profile.firstName} ${profile.lastName}`,
        description: 'Complete onboarding process for new affiliate',
        objectives: [
          'Verify affiliate information and compliance',
          'Set up payment methods and tax information',
          'Provide affiliate training and resources',
          'Activate affiliate account and tools'
        ],
        timeline: '7 days',
        resources: [
          'Compliance team',
          'Payment processing system',
          'Training materials',
          'Affiliate dashboard'
        ]
      });

      // Create execution actions
      const onboardingDo = this.orchestration.createDo({
        planId: onboardingPlan.id,
        actions: [
          {
            name: 'Compliance Verification',
            description: 'Verify affiliate information and tax forms',
            priority: 1,
            estimatedDuration: 24,
            dependencies: []
          },
          {
            name: 'Payment Setup',
            description: 'Configure payment methods and payout settings',
            priority: 2,
            estimatedDuration: 12,
            dependencies: ['compliance-verification']
          },
          {
            name: 'Account Activation',
            description: 'Activate affiliate account and provide access',
            priority: 3,
            estimatedDuration: 6,
            dependencies: ['payment-setup']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority for affiliate onboarding
      const wsjfParams = {
        userBusinessValue: 80,
        timeCriticality: 60,
        customerValue: 75,
        jobSize: 3,
        riskReduction: 40,
        opportunityEnablement: 70
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        onboardingDo.id,
        wsjfParams
      );

      // Emit event
      this.emitEvent('affiliate_registered', {
        affiliateId: affiliate.id,
        userId,
        tenantId,
        affiliateCode,
        status: affiliate.status
      });

      console.log(`[AFFILIATE-NETWORK] Registered affiliate: ${affiliate.id} (${affiliateCode})`);
      return affiliate;

    } catch (error) {
      const affiliateError: AffiliateError = {
        code: 'REGISTRATION_FAILED',
        message: `Failed to register affiliate: ${error.message}`,
        details: { userId, tenantId, profile },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: affiliateError });
      throw error;
    }
  }

  /**
   * Approve affiliate application
   */
  public async approveAffiliate(affiliateId: string, approvedBy: string): Promise<void> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    affiliate.status = 'active';
    affiliate.updatedAt = new Date();

    // Create orchestration act for approval
    const approvalAct = this.orchestration.createAct({
      doId: 'affiliate-approval',
      outcomes: [
        {
          id: this.generateId('outcome'),
          name: 'Affiliate Approved',
          status: 'success',
          actualValue: 1,
          expectedValue: 1,
          variance: 0,
          lessons: ['Standard approval process completed successfully']
        }
      ],
      learnings: [
        `Affiliate ${affiliateId} approved by ${approvedBy}`,
        'Compliance checks passed',
        'Payment methods verified'
      ],
      improvements: [
        'Consider automated approval for low-risk applicants',
        'Streamline tax form verification'
      ],
      metrics: {
        approvalTime: Date.now() - affiliate.createdAt.getTime(),
        riskScore: 0.2,
        complianceScore: 0.95
      }
    });

    this.emitEvent('affiliate_approved', {
      affiliateId,
      approvedBy,
      approvedAt: new Date()
    });

    console.log(`[AFFILIATE-NETWORK] Approved affiliate: ${affiliateId}`);
  }

  /**
   * Create referral
   */
  public async createReferral(
    affiliateId: string,
    customerId: string,
    source: Referral['source']
  ): Promise<Referral> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    const referral: Referral = {
      id: this.generateId('referral'),
      affiliateId,
      customerId,
      referralCode: affiliate.affiliateCode,
      source,
      status: 'pending',
      totalPurchases: 0,
      totalRevenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.referralCookieDuration * 24 * 60 * 60 * 1000),
      metadata: {}
    };

    this.referrals.set(referral.id, referral);

    // Update affiliate performance
    affiliate.performance.totalReferrals++;
    affiliate.performance.lastUpdated = new Date();

    this.emitEvent('referral_created', {
      referralId: referral.id,
      affiliateId,
      customerId,
      source
    });

    console.log(`[AFFILIATE-NETWORK] Created referral: ${referral.id} for affiliate: ${affiliateId}`);
    return referral;
  }

  /**
   * Convert referral to customer
   */
  public async convertReferral(
    referralId: string,
    purchaseAmount: number,
    currency: string
  ): Promise<void> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      throw new Error(`Referral ${referralId} not found`);
    }

    referral.status = 'converted';
    referral.convertedAt = new Date();
    referral.firstPurchaseAt = new Date();
    referral.totalPurchases = 1;
    referral.totalRevenue = purchaseAmount;
    referral.updatedAt = new Date();

    // Update affiliate performance
    const affiliate = this.affiliates.get(referral.affiliateId);
    if (affiliate) {
      affiliate.performance.activeReferrals++;
      affiliate.performance.totalRevenue += purchaseAmount;
      affiliate.performance.currentMonthRevenue += purchaseAmount;
      affiliate.performance.lastUpdated = new Date();

      // Check for tier upgrade
      await this.checkTierUpgrade(affiliate);
    }

    this.emitEvent('referral_converted', {
      referralId,
      affiliateId: referral.affiliateId,
      purchaseAmount,
      currency,
      convertedAt: referral.convertedAt
    });

    console.log(`[AFFILIATE-NETWORK] Converted referral: ${referralId}`);
  }

  /**
   * Check and process tier upgrades
   */
  private async checkTierUpgrade(affiliate: Affiliate): Promise<void> {
    const currentTier = affiliate.tier;
    const nextTier = this.getNextTier(currentTier.level);

    if (nextTier && affiliate.performance.totalRevenue >= nextTier.minPerformance) {
      // Check if all requirements are met
      const requirementsMet = nextTier.requirements.every(req => {
        switch (req.type) {
          case 'sales_volume':
            return affiliate.performance.totalRevenue >= req.value;
          case 'referral_count':
            return affiliate.performance.totalReferrals >= req.value;
          case 'conversion_rate':
            return affiliate.performance.conversionRate >= req.value;
          case 'customer_retention':
            return affiliate.performance.customerRetentionRate >= req.value;
          default:
            return false;
        }
      });

      if (requirementsMet) {
        await this.upgradeTier(affiliate.id, nextTier.id);
      }
    }
  }

  /**
   * Upgrade affiliate to new tier
   */
  private async upgradeTier(affiliateId: string, newTierId: string): Promise<void> {
    const affiliate = this.affiliates.get(affiliateId);
    const newTier = this.tiers.get(newTierId);

    if (!affiliate || !newTier) {
      throw new Error('Invalid affiliate or tier');
    }

    const oldTier = affiliate.tier;
    affiliate.tier = newTier;
    affiliate.updatedAt = new Date();

    // Update commission settings
    affiliate.commissionSettings.baseRate = newTier.commissionRate;

    // Create orchestration act for tier upgrade
    const upgradeAct = this.orchestration.createAct({
      doId: 'tier-upgrade',
      outcomes: [
        {
          id: this.generateId('outcome'),
          name: 'Tier Upgrade Successful',
          status: 'success',
          actualValue: newTier.level,
          expectedValue: newTier.level,
          variance: 0,
          lessons: [`Successfully upgraded from ${oldTier.name} to ${newTier.name}`]
        }
      ],
      learnings: [
        `Affiliate ${affiliateId} performance met ${newTier.name} requirements`,
        'Automatic tier upgrade process working correctly'
      ],
      improvements: [
        'Consider personalized tier upgrade notifications',
        'Analyze upgrade patterns for optimization'
      ],
      metrics: {
        oldTierLevel: oldTier.level,
        newTierLevel: newTier.level,
        upgradeTime: Date.now()
      }
    });

    this.emitEvent('tier_upgraded', {
      affiliateId,
      oldTierId: oldTier.id,
      newTierId: newTier.id,
      upgradedAt: new Date()
    });

    console.log(`[AFFILIATE-NETWORK] Upgraded affiliate ${affiliateId} to ${newTier.name}`);
  }

  /**
   * Get next tier based on level
   */
  private getNextTier(currentLevel: number): AffiliateTier | null {
    const tiers = Array.from(this.tiers.values())
      .filter(tier => tier.isActive)
      .sort((a, b) => a.level - b.level);

    return tiers.find(tier => tier.level > currentLevel) || null;
  }

  /**
   * Generate unique affiliate code
   */
  private generateAffiliateCode(firstName: string, lastName: string): string {
    const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
    const random = Math.random().toString(36).substr(2, 5);
    return `${base}${random}`.substr(0, 12);
  }

  /**
   * Create initial performance object
   */
  private createInitialPerformance(): AffiliatePerformance {
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      totalRevenue: 0,
      totalCommission: 0,
      currentMonthRevenue: 0,
      currentMonthCommission: 0,
      conversionRate: 0,
      averageOrderValue: 0,
      customerRetentionRate: 0,
      lastUpdated: new Date(),
      metrics: []
    };
  }

  /**
   * Create default commission settings
   */
  private createDefaultCommissionSettings(custom?: Partial<CommissionSettings>): CommissionSettings {
    return {
      baseRate: 0.05,
      tierBonus: 0,
      performanceBonus: 0,
      recurringCommission: false,
      recurringRate: 0.02,
      recurringDuration: 12,
      customRates: [],
      ...custom
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
  public getAffiliate(affiliateId: string): Affiliate | undefined {
    return this.affiliates.get(affiliateId);
  }

  public getAffiliateByCode(affiliateCode: string): Affiliate | undefined {
    return Array.from(this.affiliates.values())
      .find(affiliate => affiliate.affiliateCode === affiliateCode);
  }

  public getAffiliateByUserId(userId: string): Affiliate | undefined {
    return Array.from(this.affiliates.values())
      .find(affiliate => affiliate.userId === userId);
  }

  public getAllAffiliates(tenantId?: string): Affiliate[] {
    const affiliates = Array.from(this.affiliates.values());
    return tenantId ? affiliates.filter(a => a.tenantId === tenantId) : affiliates;
  }

  public getReferral(referralId: string): Referral | undefined {
    return this.referrals.get(referralId);
  }

  public getReferralsByAffiliate(affiliateId: string): Referral[] {
    return Array.from(this.referrals.values())
      .filter(referral => referral.affiliateId === affiliateId);
  }

  public getTier(tierId: string): AffiliateTier | undefined {
    return this.tiers.get(tierId);
  }

  public getAllTiers(): AffiliateTier[] {
    return Array.from(this.tiers.values())
      .filter(tier => tier.isActive)
      .sort((a, b) => a.level - b.level);
  }

  public updateAffiliate(affiliateId: string, updates: Partial<Affiliate>): Affiliate {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    const updatedAffiliate: Affiliate = {
      ...affiliate,
      ...updates,
      updatedAt: new Date()
    };

    this.affiliates.set(affiliateId, updatedAffiliate);
    return updatedAffiliate;
  }

  public suspendAffiliate(affiliateId: string, reason: string): void {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    affiliate.status = 'suspended';
    affiliate.updatedAt = new Date();
    affiliate.metadata.suspensionReason = reason;

    this.emitEvent('affiliate_suspended', {
      affiliateId,
      reason,
      suspendedAt: new Date()
    });

    console.log(`[AFFILIATE-NETWORK] Suspended affiliate: ${affiliateId}, reason: ${reason}`);
  }

  public terminateAffiliate(affiliateId: string, reason: string): void {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateId} not found`);
    }

    affiliate.status = 'terminated';
    affiliate.updatedAt = new Date();
    affiliate.metadata.terminationReason = reason;

    this.emitEvent('affiliate_suspended', {
      affiliateId,
      reason,
      terminatedAt: new Date()
    });

    console.log(`[AFFILIATE-NETWORK] Terminated affiliate: ${affiliateId}, reason: ${reason}`);
  }
}
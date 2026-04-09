/**
 * Multi-Tenant Manager
 * 
 * Core component for managing multi-tenant architecture with proper data isolation,
 * tenant-specific configurations, and cross-tenant security controls
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  TenantSettings,
  TenantBranding,
  TenantSubscription,
  SubscriptionLimits,
  Affiliate,
  AffiliateError,
  AffiliateEvent
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface MultiTenantConfig {
  maxTenants: number;
  defaultTenantSettings: Partial<TenantSettings>;
  subscriptionPlans: SubscriptionPlan[];
  isolationLevel: 'strict' | 'moderate' | 'shared';
  enableCrossTenantAnalytics: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: SubscriptionLimits;
  isActive: boolean;
}

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  isolationKey: string;
  permissions: string[];
  rateLimits: Record<string, number>;
  features: string[];
}

export class MultiTenantManager extends EventEmitter {
  private tenants: Map<string, Tenant> = new Map();
  private tenantContexts: Map<string, TenantContext> = new Map();
  private subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  private isolationKeys: Map<string, string> = new Map();

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private config: MultiTenantConfig
  ) {
    super();
    this.initializeSubscriptionPlans();
    this.setupOrchestrationIntegration();
  }

  /**
   * Initialize subscription plans
   */
  private initializeSubscriptionPlans(): void {
    const defaultPlans: SubscriptionPlan[] = [
      {
        id: 'starter',
        name: 'Starter',
        price: 49,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Basic affiliate management',
          'Standard commission tracking',
          'Email support',
          'Basic analytics',
          'Up to 50 affiliates'
        ],
        limits: {
          maxAffiliates: 50,
          maxCommissionPerMonth: 5000,
          maxPayoutPerMonth: 10000,
          apiCallsPerMonth: 10000,
          storageGB: 5
        },
        isActive: true
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 149,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Advanced affiliate management',
          'Multi-tier commission structures',
          'Priority support',
          'Advanced analytics & reporting',
          'Custom branding',
          'API access',
          'Up to 500 affiliates'
        ],
        limits: {
          maxAffiliates: 500,
          maxCommissionPerMonth: 25000,
          maxPayoutPerMonth: 50000,
          apiCallsPerMonth: 100000,
          storageGB: 25
        },
        isActive: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
          'Unlimited affiliate management',
          'Custom commission structures',
          'Dedicated account manager',
          'White-label solution',
          'Advanced API access',
          'Custom integrations',
          'Unlimited affiliates'
        ],
        limits: {
          maxAffiliates: -1, // Unlimited
          maxCommissionPerMonth: -1,
          maxPayoutPerMonth: -1,
          apiCallsPerMonth: -1,
          storageGB: 100
        },
        isActive: true
      }
    ];

    defaultPlans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for multi-tenant management
    const tenantPurpose = this.orchestration.createPurpose({
      name: 'Multi-Tenant Platform Excellence',
      description: 'Ensure secure, scalable, and efficient multi-tenant operations',
      objectives: [
        'Maintain strict data isolation between tenants',
        'Optimize resource allocation and performance',
        'Ensure compliance with multi-tenant regulations',
        'Provide seamless tenant onboarding experience'
      ],
      keyResults: [
        'Zero data leakage between tenants',
        '99.9% tenant uptime',
        'Sub-5 minute tenant provisioning',
        '100% compliance with data protection laws'
      ]
    });

    // Create domain for tenant operations
    const tenantDomain = this.orchestration.createDomain({
      name: 'Tenant Operations',
      purpose: 'Manage all tenant-related operations, provisioning, and lifecycle',
      boundaries: [
        'Tenant provisioning and configuration',
        'Data isolation and security',
        'Resource allocation and monitoring',
        'Tenant support and management'
      ],
      accountabilities: [
        'Tenant data security',
        'Resource optimization',
        'Compliance monitoring',
        'Tenant satisfaction'
      ]
    });

    console.log('[MULTI-TENANT] Integrated with orchestration framework');
  }

  /**
   * Create new tenant
   */
  public async createTenant(
    name: string,
    domain: string,
    planId: string,
    customSettings?: Partial<TenantSettings>,
    customBranding?: Partial<TenantBranding>
  ): Promise<Tenant> {
    try {
      // Check if tenant limit reached
      if (this.tenants.size >= this.config.maxTenants) {
        throw new Error('Maximum tenant limit reached');
      }

      // Get subscription plan
      const plan = this.subscriptionPlans.get(planId);
      if (!plan || !plan.isActive) {
        throw new Error(`Invalid subscription plan: ${planId}`);
      }

      // Generate tenant ID and isolation key
      const tenantId = this.generateId('tenant');
      const isolationKey = this.generateIsolationKey(tenantId);

      // Create tenant object
      const tenant: Tenant = {
        id: tenantId,
        name,
        domain,
        status: 'active',
        settings: this.createDefaultTenantSettings(plan, customSettings),
        branding: this.createDefaultTenantBranding(customBranding),
        subscription: {
          plan: planId,
          status: 'active',
          features: plan.features,
          limits: plan.limits,
          billingCycle: plan.billingCycle,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store tenant
      this.tenants.set(tenantId, tenant);
      this.isolationKeys.set(tenantId, isolationKey);

      // Create tenant context
      const context = this.createTenantContext(tenant, isolationKey);
      this.tenantContexts.set(tenantId, context);

      // Create orchestration plan for tenant provisioning
      const provisioningPlan = this.orchestration.createPlan({
        name: `Tenant Provisioning - ${name}`,
        description: 'Complete tenant setup and configuration',
        objectives: [
          'Configure tenant isolation and security',
          'Set up tenant-specific databases',
          'Configure tenant branding and settings',
          'Provision tenant resources and limits'
        ],
        timeline: '2 hours',
        resources: [
          'Tenant provisioning service',
          'Database provisioning system',
          'Security configuration service',
          'Resource allocation engine'
        ]
      });

      // Create execution actions
      const provisioningDo = this.orchestration.createDo({
        planId: provisioningPlan.id,
        actions: [
          {
            name: 'Database Provisioning',
            description: 'Create isolated database for tenant',
            priority: 1,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            name: 'Security Configuration',
            description: 'Configure tenant security and isolation',
            priority: 2,
            estimatedDuration: 15,
            dependencies: ['database-provisioning']
          },
          {
            name: 'Resource Allocation',
            description: 'Allocate resources and apply limits',
            priority: 3,
            estimatedDuration: 10,
            dependencies: ['security-configuration']
          },
          {
            name: 'Tenant Activation',
            description: 'Activate tenant and provide access',
            priority: 4,
            estimatedDuration: 5,
            dependencies: ['resource-allocation']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority for tenant provisioning
      const wsjfParams = {
        userBusinessValue: 85,
        timeCriticality: 75,
        customerValue: 80,
        jobSize: 4,
        riskReduction: 70,
        opportunityEnablement: 75
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        provisioningDo.id,
        wsjfParams
      );

      // Emit event
      this.emitEvent('tenant_created', {
        tenantId,
        name,
        domain,
        planId,
        status: tenant.status
      });

      console.log(`[MULTI-TENANT] Created tenant: ${tenantId} (${name})`);
      return tenant;

    } catch (error) {
      const tenantError: AffiliateError = {
        code: 'TENANT_CREATION_FAILED',
        message: `Failed to create tenant: ${error.message}`,
        details: { name, domain, planId },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: tenantError });
      throw error;
    }
  }

  /**
   * Get tenant context for operations
   */
  public getTenantContext(tenantId: string): TenantContext | null {
    return this.tenantContexts.get(tenantId) || null;
  }

  /**
   * Validate tenant access and permissions
   */
  public validateTenantAccess(
    tenantId: string,
    requiredPermission: string,
    userId?: string
  ): boolean {
    const context = this.tenantContexts.get(tenantId);
    if (!context) {
      return false;
    }

    // Check if tenant is active
    if (context.tenant.status !== 'active') {
      return false;
    }

    // Check subscription limits
    if (!this.checkSubscriptionLimits(context.tenant)) {
      return false;
    }

    // Check permissions
    if (requiredPermission && !context.permissions.includes(requiredPermission)) {
      return false;
    }

    return true;
  }

  /**
   * Check subscription limits
   */
  private checkSubscriptionLimits(tenant: Tenant): boolean {
    const limits = tenant.subscription.limits;
    
    // This would check actual usage against limits
    // For now, we'll assume limits are not exceeded
    return true;
  }

  /**
   * Create tenant context
   */
  private createTenantContext(tenant: Tenant, isolationKey: string): TenantContext {
    return {
      tenantId: tenant.id,
      tenant,
      isolationKey,
      permissions: this.getTenantPermissions(tenant),
      rateLimits: this.getTenantRateLimits(tenant),
      features: tenant.subscription.features
    };
  }

  /**
   * Get tenant permissions based on subscription plan
   */
  private getTenantPermissions(tenant: Tenant): string[] {
    const basePermissions = [
      'read_own_affiliates',
      'write_own_affiliates',
      'read_own_commissions',
      'read_own_analytics'
    ];

    const planPermissions: Record<string, string[]> = {
      'starter': [
        ...basePermissions,
        'basic_dashboard'
      ],
      'professional': [
        ...basePermissions,
        'advanced_dashboard',
        'custom_commissions',
        'api_access',
        'custom_branding'
      ],
      'enterprise': [
        ...basePermissions,
        'advanced_dashboard',
        'custom_commissions',
        'api_access',
        'custom_branding',
        'white_label',
        'custom_integrations',
        'manage_sub_tenants'
      ]
    };

    return planPermissions[tenant.subscription.plan] || basePermissions;
  }

  /**
   * Get tenant rate limits
   */
  private getTenantRateLimits(tenant: Tenant): Record<string, number> {
    const limits = tenant.subscription.limits;
    
    return {
      api_calls_per_hour: Math.floor(limits.apiCallsPerMonth / 720), // 30 days
      affiliate_creations_per_day: Math.min(limits.maxAffiliates / 30, 10),
      commission_calculations_per_hour: 1000,
      payout_requests_per_day: 50
    };
  }

  /**
   * Create default tenant settings
   */
  private createDefaultTenantSettings(
    plan: SubscriptionPlan,
    custom?: Partial<TenantSettings>
  ): TenantSettings {
    return {
      commissionStructure: {
        defaultRates: {
          'bronze': 0.05,
          'silver': 0.07,
          'gold': 0.10,
          'platinum': 0.15
        },
        tierStructure: [],
        bonusStructures: [],
        recurringEnabled: plan.id !== 'starter',
        minimumPayout: plan.id === 'starter' ? 25 : 10,
        payoutFrequency: 'monthly',
        holdingPeriod: 7
      },
      approvalWorkflows: [
        {
          id: 'affiliate-registration',
          name: 'Affiliate Registration Approval',
          type: 'affiliate_registration',
          steps: [
            {
              id: 'review',
              name: 'Manual Review',
              type: 'manual_review',
              conditions: {},
              timeoutHours: 48
            }
          ],
          isActive: plan.id !== 'enterprise'
        }
      ],
      paymentSettings: {
        supportedMethods: ['stripe_connect', 'paypal'],
        defaultCurrency: 'USD',
        autoProcessing: plan.id !== 'starter',
        processingSchedule: {
          frequency: 'weekly',
          cutoffTime: '17:00',
          processingDays: [1, 2, 3, 4, 5], // Monday-Friday
          holidays: []
        },
        fraudDetection: true
      },
      complianceSettings: {
        taxReporting: true,
        kycRequired: plan.id !== 'starter',
        amlMonitoring: plan.id === 'enterprise',
        dataRetention: 36,
        gdprCompliant: true,
        requiredDocuments: plan.id === 'enterprise' ? ['tax_form', 'id_verification'] : ['tax_form']
      },
      notificationSettings: {
        email: {
          enabled: true,
          templates: {},
          frequency: 'immediate'
        },
        sms: {
          enabled: plan.id !== 'starter',
          templates: {},
          rateLimit: 10
        },
        push: {
          enabled: plan.id !== 'starter',
          platforms: ['web', 'mobile'],
          templates: {}
        },
        webhook: {
          enabled: plan.id !== 'starter',
          endpoints: [],
          retryPolicy: {
            maxAttempts: 3,
            backoffMultiplier: 2,
            maxDelay: 300
          }
        }
      },
      featureFlags: {
        custom_commissions: plan.id !== 'starter',
        advanced_analytics: plan.id !== 'starter',
        api_access: plan.id !== 'starter',
        white_label: plan.id === 'enterprise',
        multi_currency: plan.id !== 'starter',
        recurring_commissions: plan.id !== 'starter'
      },
      ...custom
    };
  }

  /**
   * Create default tenant branding
   */
  private createDefaultTenantBranding(custom?: Partial<TenantBranding>): TenantBranding {
    return {
      logo: '',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      customCSS: '',
      customDomain: '',
      emailTemplates: {},
      ...custom
    };
  }

  /**
   * Generate isolation key for tenant
   */
  private generateIsolationKey(tenantId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    return `tenant_${tenantId}_${timestamp}_${random}`;
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
  public getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  public getTenantByDomain(domain: string): Tenant | undefined {
    return Array.from(this.tenants.values())
      .find(tenant => tenant.domain === domain);
  }

  public getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  public getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return this.subscriptionPlans.get(planId);
  }

  public getAllSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.isActive);
  }

  public updateTenant(tenantId: string, updates: Partial<Tenant>): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date()
    };

    this.tenants.set(tenantId, updatedTenant);

    // Update tenant context
    const context = this.tenantContexts.get(tenantId);
    if (context) {
      const updatedContext = this.createTenantContext(updatedTenant, context.isolationKey);
      this.tenantContexts.set(tenantId, updatedContext);
    }

    return updatedTenant;
  }

  public suspendTenant(tenantId: string, reason: string): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'suspended';
    tenant.updatedAt = new Date();
    tenant.metadata.suspensionReason = reason;

    this.emitEvent('tenant_suspended', {
      tenantId,
      reason,
      suspendedAt: new Date()
    });

    console.log(`[MULTI-TENANT] Suspended tenant: ${tenantId}, reason: ${reason}`);
  }

  public terminateTenant(tenantId: string, reason: string): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'suspended'; // Soft delete
    tenant.updatedAt = new Date();
    tenant.metadata.terminationReason = reason;

    // Remove from active contexts
    this.tenantContexts.delete(tenantId);

    this.emitEvent('tenant_terminated', {
      tenantId,
      reason,
      terminatedAt: new Date()
    });

    console.log(`[MULTI-TENANT] Terminated tenant: ${tenantId}, reason: ${reason}`);
  }
}
/**
 * Multi-Tenant Affiliate Platform - Example Setup
 * 
 * This example demonstrates how to set up and configure a complete
 * multi-tenant affiliate platform with all integrations
 */

import {
  MultiTenantManager,
  TenantIsolation,
  TenantMiddleware,
  MultiTenantDashboard,
  EnhancedStripeIntegration,
  WordPressFlarumIntegration,
  ValidationEngine,
  SymfonyOroIntegration
} from '../src/affiliate-affinity';
import { OrchestrationFramework } from '../src/core/orchestration-framework';
import { WSJFScoringService } from '../src/wsjf/scoring-service';

async function setupMultiTenantPlatform() {
  console.log('🚀 Setting up Multi-Tenant Affiliate Platform...');

  // 1. Initialize Core Framework
  console.log('📋 Initializing core framework...');
  const orchestration = new OrchestrationFramework();
  const wsjfService = new WSJFScoringService();
  await orchestration.initializeFramework();

  // 2. Configure Multi-Tenant Manager
  console.log('🏢 Configuring multi-tenant manager...');
  const multiTenantManager = new MultiTenantManager(
    orchestration,
    wsjfService,
    {
      maxTenants: 50,
      defaultTenantSettings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        commissionStructure: 'tiered',
        payoutFrequency: 'monthly',
        minimumPayout: 50
      },
      subscriptionPlans: [
        {
          id: 'starter',
          name: 'Starter',
          price: 29,
          features: [
            'basic_analytics',
            'email_support',
            'standard_commission_rates',
            'monthly_payouts'
          ],
          limits: {
            maxAffiliates: 50,
            maxUsers: 5,
            maxCustomTiers: 2,
            apiRateLimit: 1000
          }
        },
        {
          id: 'professional',
          name: 'Professional',
          price: 99,
          features: [
            'advanced_analytics',
            'api_access',
            'priority_support',
            'custom_commission_rates',
            'bi_weekly_payouts',
            'affiliate_tiers',
            'content_syndication'
          ],
          limits: {
            maxAffiliates: 500,
            maxUsers: 25,
            maxCustomTiers: 10,
            apiRateLimit: 10000
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 299,
          features: [
            'custom_branding',
            'dedicated_support',
            'white_label',
            'real_time_analytics',
            'weekly_payouts',
            'unlimited_tiers',
            'advanced_fraud_detection',
            'custom_integrations'
          ],
          limits: {
            maxAffiliates: 5000,
            maxUsers: 100,
            maxCustomTiers: -1, // Unlimited
            apiRateLimit: 100000
          }
        }
      ],
      isolationLevel: 'strict',
      enableCrossTenantAnalytics: false
    }
  );

  // 3. Configure Tenant Isolation
  console.log('🔒 Configuring tenant isolation...');
  const tenantIsolation = new TenantIsolation(
    orchestration,
    wsjfService,
    {
      isolationLevel: 'strict',
      enableDataEncryption: true,
      enableAuditLogging: true,
      enableCrossTenantAnalytics: false,
      dataRetentionPolicy: {
        inactiveTenantDays: 365,
        auditLogDays: 90,
        backupRetentionDays: 30
      }
    }
  );

  // 4. Configure Tenant Middleware
  console.log('🛡️ Configuring tenant middleware...');
  const tenantMiddleware = new TenantMiddleware(
    orchestration,
    wsjfService,
    multiTenantManager,
    tenantIsolation,
    {
      enableRateLimiting: true,
      enableCaching: true,
      enableCompression: true,
      enableCORS: true,
      enableSecurity: true,
      defaultCacheTTL: 300,
      maxRequestSize: 10 * 1024 * 1024,
      timeoutMs: 30000
    }
  );

  // 5. Configure Dashboard
  console.log('📊 Configuring admin dashboard...');
  const dashboard = new MultiTenantDashboard(
    orchestration,
    wsjfService,
    multiTenantManager,
    tenantIsolation,
    tenantMiddleware,
    {
      enableRealTimeUpdates: true,
      refreshInterval: 30,
      maxDataPoints: 100,
      enableExport: true,
      enableNotifications: true,
      defaultTheme: 'light',
      defaultLanguage: 'en',
      timezone: 'UTC'
    }
  );

  // 6. Configure Stripe Integration
  console.log('💳 Configuring Stripe integration...');
  const stripeIntegration = new EnhancedStripeIntegration(
    orchestration,
    wsjfService,
    {
      secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_...',
      defaultCurrency: 'USD',
      enableConnect: true,
      enableSubscriptions: true,
      enableRadar: true,
      enableFraudDetection: true,
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        maxDelay: 5000
      },
      rateLimiting: {
        enabled: true,
        requestsPerSecond: 100,
        burstLimit: 200
      }
    }
  );

  // 7. Configure WordPress/Flarum Integration
  console.log('📝 Configuring content management integration...');
  const wordpressIntegration = new WordPressFlarumIntegration(
    orchestration,
    wsjfService,
    {
      siteUrl: process.env.WORDPRESS_SITE_URL || 'https://blog.example.com',
      apiKey: process.env.WORDPRESS_API_KEY || 'test_key',
      username: process.env.WORDPRESS_USERNAME || 'test_user',
      password: process.env.WORDPRESS_PASSWORD || 'test_pass',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    {
      siteUrl: process.env.FLARUM_SITE_URL || 'https://forum.example.com',
      apiKey: process.env.FLARUM_API_KEY || 'test_key',
      username: process.env.FLARUM_USERNAME || 'test_user',
      password: process.env.FLARUM_PASSWORD || 'test_pass',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    {
      autoSync: true,
      syncInterval: 60,
      enableBiDirectional: true,
      contentTypes: ['post', 'page', 'affiliate_review'],
      syncAffiliateContent: true,
      syncForumPosts: true
    }
  );

  // 8. Configure Symfony/Oro Integration
  console.log('🔧 Configuring Symfony/Oro integration...');
  const symfonyOroIntegration = new SymfonyOroIntegration(
    orchestration,
    wsjfService,
    {
      baseUrl: process.env.ORO_BASE_URL || 'https://oro.example.com',
      apiKey: process.env.ORO_API_KEY || 'test_key',
      username: process.env.ORO_USERNAME || 'test_user',
      password: process.env.ORO_PASSWORD || 'test_pass',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    {
      enableAffiliateSync: true,
      enableCommissionSync: true,
      enableCustomerSync: true,
      syncInterval: 300,
      enableRealTimeUpdates: true
    }
  );

  // 9. Configure Validation Engine
  console.log('✅ Configuring validation engine...');
  const validationEngine = new ValidationEngine(
    orchestration,
    wsjfService,
    {
      enableStrictValidation: true,
      enableDataIntegrityChecks: true,
      enableComplianceValidation: true,
      enableFraudDetection: true,
      maxValidationErrors: 10,
      validationTimeout: 5000,
      customValidators: {
        customEmailValidator: (value: string) => {
          // Custom email validation logic
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        customPhoneValidator: (value: string) => {
          // Custom phone validation logic
          return /^\+?[\d\s\-\(\)]+$/.test(value);
        }
      }
    }
  );

  console.log('✅ Multi-Tenant Affiliate Platform setup complete!');
  
  return {
    orchestration,
    wsjfService,
    multiTenantManager,
    tenantIsolation,
    tenantMiddleware,
    dashboard,
    stripeIntegration,
    wordpressIntegration,
    symfonyOroIntegration,
    validationEngine
  };
}

async function createExampleTenant(platform: any) {
  console.log('🏢 Creating example tenant...');

  const { multiTenantManager, tenantIsolation, stripeIntegration } = platform;

  // Create a sample tenant
  const tenant = await multiTenantManager.createTenant(
    'TechGadgets Affiliate Program',
    'affiliates.techgadgets.com',
    'professional',
    {
      timezone: 'America/New_York',
      currency: 'USD',
      language: 'en',
      customSettings: {
        welcomeMessage: 'Welcome to TechGadgets Affiliate Program!',
        commissionStructure: 'tiered',
        enableRecurringCommissions: true,
        defaultCommissionRate: 0.08,
        payoutThreshold: 50,
        payoutFrequency: 'bi_weekly'
      }
    }
  );

  console.log(`✅ Created tenant: ${tenant.id} (${tenant.name})`);

  // Initialize tenant store
  await tenantIsolation.initializeTenantStore(tenant);
  console.log(`✅ Initialized tenant store for ${tenant.id}`);

  // Create custom affiliate tiers
  const bronzeTier = await multiTenantManager.createTier(tenant.id, {
    id: 'bronze',
    name: 'Bronze Affiliate',
    level: 1,
    minPerformance: 0,
    commissionRate: 0.05,
    benefits: [
      'standard_commission_rates',
      'monthly_payouts',
      'basic_analytics'
    ],
    requirements: [
      'complete_onboarding',
      'make_first_sale'
    ],
    isActive: true
  });

  const silverTier = await multiTenantManager.createTier(tenant.id, {
    id: 'silver',
    name: 'Silver Affiliate',
    level: 2,
    minPerformance: 1000,
    commissionRate: 0.08,
    benefits: [
      'increased_commission_rates',
      'bi_weekly_payouts',
      'advanced_analytics',
      'promotional_materials'
    ],
    requirements: [
      'min_monthly_revenue:1000',
      'min_conversion_rate:0.02',
      'active_for_months:3'
    ],
    isActive: true
  });

  const goldTier = await multiTenantManager.createTier(tenant.id, {
    id: 'gold',
    name: 'Gold Affiliate',
    level: 3,
    minPerformance: 5000,
    commissionRate: 0.12,
    benefits: [
      'premium_commission_rates',
      'weekly_payouts',
      'real_time_analytics',
      'dedicated_support',
      'custom_landing_pages'
    ],
    requirements: [
      'min_monthly_revenue:5000',
      'min_conversion_rate:0.05',
      'active_for_months:6'
    ],
    isActive: true
  });

  console.log(`✅ Created ${3} custom tiers for tenant ${tenant.id}`);

  // Create sample affiliates
  const sampleAffiliates = [
    {
      userId: 'user_001',
      affiliateCode: 'TECH001',
      profile: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
        company: 'Tech Marketing Inc',
        website: 'https://techmarketing.example.com',
        bio: 'Experienced tech affiliate marketer specializing in consumer electronics',
        address: {
          street: '123 Tech Street',
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          postalCode: '94105'
        },
        taxInfo: {
          taxId: '123-45-6789',
          taxIdType: 'ssn',
          taxForm: 'W9',
          formStatus: 'submitted'
        }
      },
      commissionSettings: {
        baseRate: 0.05,
        recurringCommission: true,
        recurringRate: 0.02,
        recurringDuration: 12
      }
    },
    {
      userId: 'user_002',
      affiliateCode: 'TECH002',
      profile: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+1-555-0102',
        company: 'Digital Media Group',
        website: 'https://digitalmedia.example.com',
        bio: 'Content creator and tech reviewer with 100k+ YouTube subscribers',
        address: {
          street: '456 Media Ave',
          city: 'Los Angeles',
          state: 'CA',
          country: 'US',
          postalCode: '90028'
        },
        taxInfo: {
          taxId: '987-65-4321',
          taxIdType: 'ssn',
          taxForm: 'W9',
          formStatus: 'submitted'
        }
      },
      commissionSettings: {
        baseRate: 0.08,
        recurringCommission: true,
        recurringRate: 0.03,
        recurringDuration: 12
      }
    }
  ];

  for (const affiliateData of sampleAffiliates) {
    const affiliate = await tenantIsolation.addAffiliate(tenant.id, affiliateData);
    
    // Create Stripe Connect account for affiliate
    const connectAccount = await stripeIntegration.createConnectAccount(
      tenant.id,
      affiliate.id,
      {
        businessType: 'individual',
        country: 'US',
        email: affiliateData.profile.email,
        displayName: `${affiliateData.profile.firstName} ${affiliateData.profile.lastName}`,
        metadata: {
          tenantId: tenant.id,
          affiliateCode: affiliateData.affiliateCode
        }
      }
    );

    // Add payment method to affiliate
    await tenantIsolation.updateAffiliate(tenant.id, affiliate.id, {
      paymentMethods: [{
        id: `pm_${affiliate.id}`,
        type: 'stripe_connect',
        isDefault: true,
        details: { stripeAccountId: connectAccount.stripeAccountId },
        status: 'active',
        createdAt: new Date()
      }]
    });

    console.log(`✅ Created affiliate: ${affiliate.id} (${affiliateData.profile.email})`);
  }

  return tenant;
}

async function demonstrateWorkflows(platform: any, tenant: any) {
  console.log('🔄 Demonstrating platform workflows...');

  const { 
    tenantIsolation, 
    stripeIntegration, 
    wordpressIntegration, 
    validationEngine,
    dashboard 
  } = platform;

  // 1. Process a customer referral and commission
  console.log('💰 Processing customer referral...');
  
  const affiliates = await tenantIsolation.getAffiliates(tenant.id);
  const affiliate = affiliates[0];

  const commissionData = {
    affiliateId: affiliate.id,
    referralId: `ref_${Date.now()}`,
    customerId: `cust_${Date.now()}`,
    type: 'initial_sale' as const,
    amount: 299.99,
    currency: 'USD',
    rate: 0.08,
    status: 'pending' as const
  };

  // Validate commission data
  const commissionValidation = await validationEngine.validateCommission(commissionData);
  if (commissionValidation.isValid) {
    const commission = await tenantIsolation.addCommission(tenant.id, commissionData);
    console.log(`✅ Created commission: ${commission.id} for $${commission.amount}`);
  } else {
    console.error('❌ Commission validation failed:', commissionValidation.errors);
  }

  // 2. Process payment with fraud detection
  console.log('💳 Processing payment with fraud detection...');
  
  const paymentData = {
    amount: 299.99,
    currency: 'USD',
    paymentMethodId: 'pm_test_payment',
    customerId: commissionData.customerId,
    description: 'TechGadget Pro Purchase',
    affiliateId: affiliate.id
  };

  const paymentValidation = await validationEngine.validatePayment(paymentData);
  if (paymentValidation.isValid) {
    const paymentResult = await stripeIntegration.processPayment(tenant.id, paymentData);
    if (paymentResult.success) {
      console.log(`✅ Payment processed: ${paymentResult.paymentIntent.id}`);
      console.log(`🛡️ Fraud score: ${paymentResult.fraudScore}`);
    } else {
      console.error(`❌ Payment failed: ${paymentResult.error}`);
    }
  } else {
    console.error('❌ Payment validation failed:', paymentValidation.errors);
  }

  // 3. Create affiliate content
  console.log('📝 Creating affiliate content...');
  
  const content = await wordpressIntegration.createAffiliateContent(affiliate, {
    title: 'TechGadget Pro Review - My Honest Opinion',
    content: `
      <p>I've been using the TechGadget Pro for the past month and I'm thoroughly impressed!</p>
      <p>Key features I love:</p>
      <ul>
        <li>Amazing battery life</li>
        <li>Premium build quality</li>
        <li>Excellent performance</li>
      </ul>
      <p>Use my affiliate code ${affiliate.affiliateCode} for 10% off!</p>
    `,
    excerpt: 'Honest review of the TechGadget Pro with special discount',
    tags: ['review', 'techgadget', 'discount'],
    category: 'affiliate_review'
  });

  console.log(`✅ Created content: ${content.id}`);

  // 4. Update dashboard data
  console.log('📊 Updating dashboard data...');
  
  await dashboard.refreshTenantData(tenant.id);
  const tenantStats = dashboard.getTenantDashboardData(tenant.id);
  
  console.log(`📈 Tenant Statistics:`);
  console.log(`  - Total Affiliates: ${tenantStats?.stats.totalAffiliates}`);
  console.log(`  - Active Affiliates: ${tenantStats?.stats.activeAffiliates}`);
  console.log(`  - Monthly Revenue: $${tenantStats?.stats.monthlyRevenue}`);
  console.log(`  - Monthly Commissions: $${tenantStats?.stats.monthlyCommissions}`);

  // 5. Generate performance report
  console.log('📋 Generating performance report...');
  
  const report = await dashboard.generateCustomReport('tenant', tenant.id, {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
    metrics: ['revenue', 'commissions', 'conversion_rate', 'top_performers'],
    filters: {
      status: ['active']
    },
    groupBy: 'day'
  });

  console.log(`✅ Generated report: ${report.id}`);
  console.log(`📊 Report summary: ${report.summary}`);

  console.log('✅ Workflow demonstrations complete!');
}

async function main() {
  try {
    // Setup the platform
    const platform = await setupMultiTenantPlatform();
    
    // Create example tenant
    const tenant = await createExampleTenant(platform);
    
    // Demonstrate workflows
    await demonstrateWorkflows(platform, tenant);
    
    console.log('🎉 Multi-Tenant Affiliate Platform example completed successfully!');
    
    // Cleanup
    console.log('🧹 Cleaning up...');
    platform.tenantIsolation.dispose();
    platform.tenantMiddleware.dispose();
    platform.dashboard.dispose();
    platform.stripeIntegration.dispose();
    platform.wordpressIntegration.dispose();
    platform.validationEngine.dispose();
    
  } catch (error) {
    console.error('❌ Error running example:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

export {
  setupMultiTenantPlatform,
  createExampleTenant,
  demonstrateWorkflows
};
/**
 * Affiliate Affinity System Types
 *
 * Defines all TypeScript interfaces and types for the affiliate affinity system
 * including affiliate network management, commission processing, and financial services integration
 */
export interface Affiliate {
    id: string;
    userId: string;
    tenantId: string;
    affiliateCode: string;
    status: 'pending' | 'active' | 'suspended' | 'terminated';
    tier: AffiliateTier;
    profile: AffiliateProfile;
    performance: AffiliatePerformance;
    commissionSettings: CommissionSettings;
    createdAt: Date;
    updatedAt: Date;
    lastActiveAt?: Date;
    metadata: Record<string, any>;
}
export interface AffiliateProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    website?: string;
    bio?: string;
    avatar?: string;
    socialLinks: SocialLinks;
    address: Address;
    taxInfo: TaxInfo;
    paymentMethods: PaymentMethod[];
}
export interface SocialLinks {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
}
export interface Address {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}
export interface TaxInfo {
    taxId: string;
    taxIdType: 'ssn' | 'ein' | 'vat' | 'other';
    taxForm: 'W9' | 'W8BEN' | 'W8ECI' | 'other';
    formStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
    submissionDate?: Date;
    verificationDate?: Date;
}
export interface PaymentMethod {
    id: string;
    type: 'bank_account' | 'stripe_connect' | 'paypal' | 'crypto';
    isDefault: boolean;
    details: Record<string, any>;
    status: 'pending' | 'active' | 'inactive';
    createdAt: Date;
}
export interface AffiliateTier {
    id: string;
    name: string;
    level: number;
    minPerformance: number;
    commissionRate: number;
    benefits: string[];
    requirements: TierRequirement[];
    isActive: boolean;
}
export interface TierRequirement {
    type: 'sales_volume' | 'referral_count' | 'conversion_rate' | 'customer_retention';
    value: number;
    period: 'monthly' | 'quarterly' | 'yearly';
}
export interface AffiliatePerformance {
    totalReferrals: number;
    activeReferrals: number;
    totalRevenue: number;
    totalCommission: number;
    currentMonthRevenue: number;
    currentMonthCommission: number;
    conversionRate: number;
    averageOrderValue: number;
    customerRetentionRate: number;
    lastUpdated: Date;
    metrics: PerformanceMetrics[];
}
export interface PerformanceMetrics {
    period: 'daily' | 'weekly' | 'monthly';
    date: Date;
    referrals: number;
    revenue: number;
    commission: number;
    conversionRate: number;
    averageOrderValue: number;
}
export interface CommissionSettings {
    baseRate: number;
    tierBonus: number;
    performanceBonus: number;
    recurringCommission: boolean;
    recurringRate: number;
    recurringDuration: number;
    customRates: CustomCommissionRate[];
}
export interface CustomCommissionRate {
    productId?: string;
    productCategory?: string;
    rate: number;
    conditions: Record<string, any>;
}
export interface Referral {
    id: string;
    affiliateId: string;
    customerId: string;
    referralCode: string;
    source: ReferralSource;
    status: 'pending' | 'converted' | 'expired' | 'fraudulent';
    convertedAt?: Date;
    expiresAt?: Date;
    firstPurchaseAt?: Date;
    totalPurchases: number;
    totalRevenue: number;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, any>;
}
export interface ReferralSource {
    type: 'link' | 'coupon' | 'email' | 'social' | 'api' | 'qr_code';
    source: string;
    campaign?: string;
    medium?: string;
    content?: string;
    utmParameters?: Record<string, string>;
}
export interface Customer {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    referredBy?: string;
    status: 'active' | 'inactive' | 'suspended';
    registrationDate: Date;
    firstPurchaseDate?: Date;
    lastPurchaseDate?: Date;
    totalPurchases: number;
    totalRevenue: number;
    lifetimeValue: number;
    subscriptionStatus?: 'active' | 'cancelled' | 'expired' | 'trial';
    metadata: Record<string, any>;
}
export interface Commission {
    id: string;
    affiliateId: string;
    referralId?: string;
    customerId: string;
    type: CommissionType;
    amount: number;
    currency: string;
    rate: number;
    status: CommissionStatus;
    calculationDetails: CommissionCalculation;
    paymentId?: string;
    createdAt: Date;
    processedAt?: Date;
    paidAt?: Date;
    metadata: Record<string, any>;
}
export type CommissionType = 'initial_sale' | 'recurring_sale' | 'tier_bonus' | 'performance_bonus' | 'custom_rate' | 'referral_bonus' | 'adjustment';
export type CommissionStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'disputed' | 'refunded';
export interface CommissionCalculation {
    baseAmount: number;
    commissionRate: number;
    tierMultiplier: number;
    performanceMultiplier: number;
    customAdjustments: number;
    totalMultiplier: number;
    calculatedAmount: number;
    currency: string;
}
export interface Payout {
    id: string;
    affiliateId: string;
    totalAmount: number;
    currency: string;
    commissionIds: string[];
    status: PayoutStatus;
    paymentMethod: PaymentMethod;
    processingDate?: Date;
    completedDate?: Date;
    failureReason?: string;
    transactionId?: string;
    fees: PayoutFees;
    createdAt: Date;
    updatedAt: Date;
}
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'disputed';
export interface PayoutFees {
    processing: number;
    transaction: number;
    currency: number;
    platform: number;
    total: number;
}
export interface Tenant {
    id: string;
    name: string;
    domain: string;
    status: 'active' | 'inactive' | 'suspended';
    settings: TenantSettings;
    branding: TenantBranding;
    subscription: TenantSubscription;
    createdAt: Date;
    updatedAt: Date;
}
export interface TenantSettings {
    commissionStructure: CommissionStructure;
    approvalWorkflows: ApprovalWorkflow[];
    paymentSettings: PaymentSettings;
    complianceSettings: ComplianceSettings;
    notificationSettings: NotificationSettings;
    featureFlags: Record<string, boolean>;
}
export interface CommissionStructure {
    defaultRates: Record<string, number>;
    tierStructure: AffiliateTier[];
    bonusStructures: BonusStructure[];
    recurringEnabled: boolean;
    minimumPayout: number;
    payoutFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    holdingPeriod: number;
}
export interface BonusStructure {
    id: string;
    name: string;
    type: 'volume' | 'recruitment' | 'performance' | 'retention';
    conditions: BonusCondition[];
    reward: BonusReward;
    isActive: boolean;
    period: 'monthly' | 'quarterly' | 'yearly';
}
export interface BonusCondition {
    metric: string;
    operator: 'gt' | 'gte' | 'eq' | 'lt' | 'lte';
    value: number;
    period: string;
}
export interface BonusReward {
    type: 'fixed' | 'percentage' | 'tier_upgrade';
    value: number;
    description: string;
}
export interface ApprovalWorkflow {
    id: string;
    name: string;
    type: 'affiliate_registration' | 'commission_approval' | 'payout_approval';
    steps: WorkflowStep[];
    isActive: boolean;
}
export interface WorkflowStep {
    id: string;
    name: string;
    type: 'manual_review' | 'automated_check' | 'notification' | 'escalation';
    conditions: Record<string, any>;
    assignee?: string;
    timeoutHours?: number;
}
export interface PaymentSettings {
    supportedMethods: PaymentMethod['type'][];
    defaultCurrency: string;
    autoProcessing: boolean;
    processingSchedule: ProcessingSchedule;
    fraudDetection: FraudDetectionSettings;
}
export interface ProcessingSchedule {
    frequency: 'daily' | 'weekly' | 'monthly';
    cutoffTime: string;
    processingDays: number[];
    holidays: string[];
}
export interface FraudDetectionSettings {
    enabled: boolean;
    rules: FraudRule[];
    riskThresholds: RiskThreshold;
    manualReviewRequired: boolean;
}
export interface FraudRule {
    id: string;
    name: string;
    condition: string;
    action: 'flag' | 'block' | 'manual_review';
    isActive: boolean;
}
export interface RiskThreshold {
    low: number;
    medium: number;
    high: number;
}
export interface ComplianceSettings {
    taxReporting: boolean;
    kycRequired: boolean;
    amlMonitoring: boolean;
    dataRetention: number;
    gdprCompliant: boolean;
    requiredDocuments: string[];
}
export interface NotificationSettings {
    email: EmailNotificationSettings;
    sms: SmsNotificationSettings;
    push: PushNotificationSettings;
    webhook: WebhookSettings;
}
export interface EmailNotificationSettings {
    enabled: boolean;
    templates: Record<string, string>;
    frequency: 'immediate' | 'batch' | 'digest';
}
export interface SmsNotificationSettings {
    enabled: boolean;
    templates: Record<string, string>;
    rateLimit: number;
}
export interface PushNotificationSettings {
    enabled: boolean;
    platforms: string[];
    templates: Record<string, any>;
}
export interface WebhookSettings {
    enabled: boolean;
    endpoints: WebhookEndpoint[];
    retryPolicy: RetryPolicy;
}
export interface WebhookEndpoint {
    id: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
}
export interface RetryPolicy {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
}
export interface TenantBranding {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    customCSS?: string;
    customDomain?: string;
    emailTemplates: Record<string, string>;
}
export interface TenantSubscription {
    plan: string;
    status: 'active' | 'trial' | 'expired' | 'cancelled';
    features: string[];
    limits: SubscriptionLimits;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate?: Date;
}
export interface SubscriptionLimits {
    maxAffiliates: number;
    maxCommissionPerMonth: number;
    maxPayoutPerMonth: number;
    apiCallsPerMonth: number;
    storageGB: number;
}
export interface UserAffinity {
    id: string;
    userId: string;
    tenantId: string;
    scores: AffinityScore[];
    preferences: UserPreferences;
    behavior: UserBehavior;
    recommendations: Recommendation[];
    lastCalculated: Date;
    version: number;
}
export interface AffinityScore {
    category: string;
    score: number;
    confidence: number;
    factors: ScoreFactor[];
    weight: number;
    calculatedAt: Date;
}
export interface ScoreFactor {
    name: string;
    value: number;
    source: string;
    weight: number;
}
export interface UserPreferences {
    categories: string[];
    priceRange: PriceRange;
    brands: string[];
    features: string[];
    communicationChannel: string;
    frequency: 'high' | 'medium' | 'low';
}
export interface PriceRange {
    min: number;
    max: number;
    currency: string;
}
export interface UserBehavior {
    browsingHistory: BrowsingEvent[];
    purchaseHistory: PurchaseEvent[];
    clickEvents: ClickEvent[];
    searchEvents: SearchEvent[];
    timePatterns: TimePattern[];
    deviceUsage: DeviceUsage[];
}
export interface BrowsingEvent {
    productId?: string;
    category?: string;
    duration: number;
    timestamp: Date;
    source: string;
}
export interface PurchaseEvent {
    productId: string;
    amount: number;
    currency: string;
    timestamp: Date;
    channel: string;
}
export interface ClickEvent {
    target: string;
    position: string;
    timestamp: Date;
    context: Record<string, any>;
}
export interface SearchEvent {
    query: string;
    results: number;
    clickedResult?: string;
    timestamp: Date;
}
export interface TimePattern {
    hour: number;
    dayOfWeek: number;
    activity: number;
    period: 'morning' | 'afternoon' | 'evening' | 'night';
}
export interface DeviceUsage {
    device: string;
    platform: string;
    usagePercentage: number;
    lastUsed: Date;
}
export interface Recommendation {
    id: string;
    userId: string;
    type: RecommendationType;
    content: RecommendationContent;
    score: number;
    confidence: number;
    reason: string;
    status: 'pending' | 'delivered' | 'clicked' | 'converted' | 'dismissed';
    deliveredAt?: Date;
    clickedAt?: Date;
    convertedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
}
export type RecommendationType = 'product' | 'affiliate' | 'content' | 'promotion' | 'tutorial' | 'upgrade';
export interface RecommendationContent {
    id?: string;
    title: string;
    description: string;
    imageUrl?: string;
    targetUrl?: string;
    metadata: Record<string, any>;
}
export interface FinancialAccount {
    id: string;
    userId: string;
    tenantId: string;
    type: 'stripe' | 'paypal' | 'bank' | 'crypto';
    provider: string;
    accountId: string;
    status: 'active' | 'inactive' | 'suspended' | 'restricted';
    capabilities: string[];
    restrictions: AccountRestriction[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AccountRestriction {
    type: 'daily_limit' | 'monthly_limit' | 'country' | 'currency' | 'category';
    value: any;
    reason: string;
    expiresAt?: Date;
}
export interface Transaction {
    id: string;
    accountId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    status: TransactionStatus;
    description: string;
    metadata: TransactionMetadata;
    fees: TransactionFees;
    createdAt: Date;
    processedAt?: Date;
    settledAt?: Date;
}
export type TransactionType = 'payment' | 'payout' | 'refund' | 'chargeback' | 'fee' | 'transfer' | 'conversion';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'disputed' | 'refunded';
export interface TransactionMetadata {
    orderId?: string;
    customerId?: string;
    affiliateId?: string;
    commissionId?: string;
    referralId?: string;
    paymentMethod?: string;
    ipAddress?: string;
    device?: string;
    location?: string;
    riskScore?: number;
}
export interface TransactionFees {
    processing: number;
    platform: number;
    payment: number;
    currency: number;
    total: number;
}
export interface TradingAccount {
    id: string;
    userId: string;
    tenantId: string;
    broker: string;
    accountId: string;
    status: 'active' | 'inactive' | 'suspended';
    permissions: TradingPermission[];
    balances: TradingBalance[];
    createdAt: Date;
    updatedAt: Date;
}
export interface TradingPermission {
    action: 'read' | 'trade' | 'withdraw' | 'deposit';
    markets: string[];
    instruments: string[];
    limits: TradingLimit[];
}
export interface TradingLimit {
    type: 'daily' | 'weekly' | 'monthly' | 'per_trade';
    amount: number;
    currency: string;
}
export interface TradingBalance {
    asset: string;
    available: number;
    locked: number;
    total: number;
    lastUpdated: Date;
}
export interface AffiliateAnalytics {
    period: AnalyticsPeriod;
    metrics: AnalyticsMetrics;
    breakdown: AnalyticsBreakdown;
    trends: AnalyticsTrend[];
    forecasts: AnalyticsForecast[];
    generatedAt: Date;
}
export interface AnalyticsPeriod {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}
export interface AnalyticsMetrics {
    totalAffiliates: number;
    activeAffiliates: number;
    totalReferrals: number;
    conversionRate: number;
    completionRate: number;
    totalRevenue: number;
    totalCommission: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    retentionRate: number;
    churnRate: number;
    count: number;
    avgWSJF: number;
    avgDuration: number;
}
export interface AnalyticsBreakdown {
    byTier: Record<string, AnalyticsMetrics>;
    bySource: Record<string, AnalyticsMetrics>;
    byCategory: Record<string, AnalyticsMetrics>;
    byRegion: Record<string, AnalyticsMetrics>;
    byTimeframe: Record<string, AnalyticsMetrics>;
}
export interface AnalyticsTrend {
    date: Date;
    metric: string;
    value: number;
    change: number;
    changePercent: number;
}
export interface AnalyticsForecast {
    date: Date;
    metric: string;
    predicted: number;
    confidence: number;
    range: {
        lower: number;
        upper: number;
    };
}
export interface DashboardConfig {
    tenantId: string;
    layout: string;
    widgets: WidgetConfig[];
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    permissions: Record<UserRole, DashboardPermission[]>;
    customCSS?: string;
    createdAt: Date;
}
export interface WidgetConfig {
    id: string;
    name: string;
    type: 'metric_cards' | 'chart' | 'table' | 'gauge' | 'heatmap' | 'funnel' | 'financial_cards';
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    config: Record<string, any>;
    permissions: DashboardPermission[];
    isActive: boolean;
}
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';
export type DashboardPermission = 'read_affiliates' | 'write_affiliates' | 'read_commissions' | 'write_commissions' | 'read_payouts' | 'write_payouts' | 'read_analytics' | 'write_analytics' | 'read_recommendations' | 'write_recommendations' | 'read_affinity' | 'write_affinity' | 'read_financials' | 'write_financials' | 'manage_tenant' | 'manage_users';
export declare const ALL_DASHBOARD_PERMISSIONS: DashboardPermission[];
export interface TenantContext {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    permissions: DashboardPermission[];
    metadata: Record<string, any>;
    timestamp: Date;
}
export interface ValidationRule {
    id: string;
    name: string;
    field: string;
    type: 'required' | 'format' | 'range' | 'custom';
    condition?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    isActive: boolean;
}
export interface ValidationError {
    field: string;
    rule: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    value?: any;
    context?: Record<string, any>;
}
export interface ReportConfig {
    id: string;
    name: string;
    type: 'affiliate_performance' | 'commission_summary' | 'payout_report' | 'analytics_export';
    parameters: Record<string, any>;
    schedule: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
        time: string;
        recipients: string[];
    };
    format: 'pdf' | 'excel' | 'csv';
    isActive: boolean;
}
export interface NotificationConfig {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'push' | 'webhook';
    triggers: string[];
    template: string;
    recipients: string[];
    isActive: boolean;
}
export interface AffiliateError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: Date;
    userId?: string;
    tenantId?: string;
    requestId?: string;
}
export interface AffiliateEvent {
    id: string;
    type: AffiliateEventType;
    timestamp: Date;
    userId?: string;
    tenantId?: string;
    affiliateId?: string;
    data: Record<string, any>;
    metadata: Record<string, any>;
}
export type AffiliateEventType = 'affiliate_registered' | 'affiliate_approved' | 'affiliate_suspended' | 'referral_created' | 'referral_converted' | 'commission_earned' | 'commission_paid' | 'payout_processed' | 'tier_upgraded' | 'fraud_detected' | 'compliance_violation' | 'system_error';
//# sourceMappingURL=index.d.ts.map
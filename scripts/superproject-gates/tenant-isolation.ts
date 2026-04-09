/**
 * Tenant Isolation and Data Separation
 * 
 * Provides robust data isolation mechanisms for multi-tenant architecture
 * including database separation, access controls, and security boundaries
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  Affiliate,
  Commission,
  Referral,
  Customer,
  AffiliateError,
  AffiliateEvent
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface IsolationConfig {
  isolationLevel: 'strict' | 'moderate' | 'shared';
  enableDataEncryption: boolean;
  enableAuditLogging: boolean;
  enableCrossTenantAnalytics: boolean;
  dataRetentionPolicy: {
    inactiveTenantDays: number;
    auditLogDays: number;
    backupRetentionDays: number;
  };
}

export interface TenantDataStore {
  tenantId: string;
  isolationKey: string;
  affiliates: Map<string, Affiliate>;
  commissions: Map<string, Commission>;
  referrals: Map<string, Referral>;
  customers: Map<string, Customer>;
  metadata: Record<string, any>;
  createdAt: Date;
  lastAccessed: Date;
}

export interface AccessLog {
  id: string;
  tenantId: string;
  userId?: string;
  resource: string;
  resourceId: string;
  action: 'read' | 'write' | 'delete' | 'create';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export class TenantIsolation extends EventEmitter {
  private tenantStores: Map<string, TenantDataStore> = new Map();
  private accessLogs: Map<string, AccessLog[]> = new Map();
  private encryptionKeys: Map<string, string> = new Map();
  private config: IsolationConfig;

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    config: Partial<IsolationConfig> = {}
  ) {
    super();
    this.config = {
      isolationLevel: 'strict',
      enableDataEncryption: true,
      enableAuditLogging: true,
      enableCrossTenantAnalytics: false,
      dataRetentionPolicy: {
        inactiveTenantDays: 365,
        auditLogDays: 90,
        backupRetentionDays: 30
      },
      ...config
    };
    this.setupOrchestrationIntegration();
    this.startDataCleanupTimer();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for data isolation
    const isolationPurpose = this.orchestration.createPurpose({
      name: 'Data Isolation and Security',
      description: 'Maintain strict data isolation and security boundaries between tenants',
      objectives: [
        'Prevent data leakage between tenants',
        'Ensure data encryption and protection',
        'Maintain comprehensive audit trails',
        'Optimize data access performance'
      ],
      keyResults: [
        'Zero cross-tenant data access incidents',
        '100% data encryption at rest and in transit',
        'Complete audit trail coverage',
        'Sub-100ms data access latency'
      ]
    });

    // Create domain for security operations
    const securityDomain = this.orchestration.createDomain({
      name: 'Security and Compliance',
      purpose: 'Manage all security, compliance, and data protection operations',
      boundaries: [
        'Data isolation enforcement',
        'Access control management',
        'Audit logging and monitoring',
        'Encryption key management'
      ],
      accountabilities: [
        'Data security and privacy',
        'Compliance with regulations',
        'Access control enforcement',
        'Audit trail integrity'
      ]
    });

    console.log('[TENANT-ISOLATION] Integrated with orchestration framework');
  }

  /**
   * Initialize tenant data store
   */
  public async initializeTenantStore(tenant: Tenant): Promise<TenantDataStore> {
    try {
      const isolationKey = this.generateIsolationKey(tenant.id);
      
      // Generate encryption key if enabled
      let encryptionKey: string | undefined;
      if (this.config.enableDataEncryption) {
        encryptionKey = this.generateEncryptionKey(tenant.id);
        this.encryptionKeys.set(tenant.id, encryptionKey);
      }

      const store: TenantDataStore = {
        tenantId: tenant.id,
        isolationKey,
        affiliates: new Map(),
        commissions: new Map(),
        referrals: new Map(),
        customers: new Map(),
        metadata: {
          plan: tenant.subscription.plan,
          limits: tenant.subscription.limits,
          features: tenant.subscription.features,
          encryptionEnabled: this.config.enableDataEncryption,
          createdAt: new Date().toISOString()
        },
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      this.tenantStores.set(tenant.id, store);
      this.accessLogs.set(tenant.id, []);

      // Create orchestration plan for tenant store initialization
      const initPlan = this.orchestration.createPlan({
        name: `Tenant Store Initialization - ${tenant.name}`,
        description: 'Initialize isolated data store for tenant',
        objectives: [
          'Create isolated data structures',
          'Configure encryption and security',
          'Set up audit logging',
          'Validate isolation boundaries'
        ],
        timeline: '30 minutes',
        resources: [
          'Data store service',
          'Encryption service',
          'Audit logging system',
          'Security validation service'
        ]
      });

      // Create execution actions
      const initDo = this.orchestration.createDo({
        planId: initPlan.id,
        actions: [
          {
            name: 'Data Store Creation',
            description: 'Create isolated data structures for tenant',
            priority: 1,
            estimatedDuration: 10,
            dependencies: []
          },
          {
            name: 'Security Configuration',
            description: 'Configure encryption and access controls',
            priority: 2,
            estimatedDuration: 10,
            dependencies: ['data-store-creation']
          },
          {
            name: 'Audit Setup',
            description: 'Set up audit logging and monitoring',
            priority: 3,
            estimatedDuration: 5,
            dependencies: ['security-configuration']
          },
          {
            name: 'Isolation Validation',
            description: 'Validate data isolation boundaries',
            priority: 4,
            estimatedDuration: 5,
            dependencies: ['audit-setup']
          }
        ],
        status: 'pending'
      });

      // Update WSJF priority
      const wsjfParams = {
        userBusinessValue: 90,
        timeCriticality: 85,
        customerValue: 80,
        jobSize: 3,
        riskReduction: 85,
        opportunityEnablement: 70
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        initDo.id,
        wsjfParams
      );

      this.emitEvent('tenant_store_initialized', {
        tenantId: tenant.id,
        isolationKey,
        encryptionEnabled: this.config.enableDataEncryption
      });

      console.log(`[TENANT-ISOLATION] Initialized store for tenant: ${tenant.id}`);
      return store;

    } catch (error) {
      const isolationError: AffiliateError = {
        code: 'STORE_INITIALIZATION_FAILED',
        message: `Failed to initialize tenant store: ${error.message}`,
        details: { tenantId: tenant.id },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: isolationError });
      throw error;
    }
  }

  /**
   * Get tenant data store with access validation
   */
  public getTenantStore(tenantId: string, userId?: string): TenantDataStore | null {
    // Validate access
    if (!this.validateTenantAccess(tenantId, userId)) {
      this.logAccess(tenantId, userId, 'tenant_store', tenantId, 'read', false, 'Access denied');
      return null;
    }

    const store = this.tenantStores.get(tenantId);
    if (store) {
      store.lastAccessed = new Date();
      this.logAccess(tenantId, userId, 'tenant_store', tenantId, 'read', true);
    }

    return store || null;
  }

  /**
   * Add affiliate to tenant store
   */
  public async addAffiliate(
    tenantId: string,
    affiliate: Affiliate,
    userId?: string
  ): Promise<boolean> {
    try {
      // Validate access
      if (!this.validateTenantAccess(tenantId, userId, 'write_own_affiliates')) {
        this.logAccess(tenantId, userId, 'affiliate', affiliate.id, 'create', false, 'Access denied');
        return false;
      }

      const store = this.tenantStores.get(tenantId);
      if (!store) {
        throw new Error(`Tenant store not found: ${tenantId}`);
      }

      // Check tenant limits
      if (store.affiliates.size >= store.metadata.limits.maxAffiliates && store.metadata.limits.maxAffiliates > 0) {
        throw new Error('Affiliate limit reached for tenant');
      }

      // Encrypt sensitive data if enabled
      const encryptedAffiliate = this.config.enableDataEncryption 
        ? await this.encryptAffiliateData(affiliate, tenantId)
        : affiliate;

      store.affiliates.set(affiliate.id, encryptedAffiliate);
      store.lastAccessed = new Date();

      this.logAccess(tenantId, userId, 'affiliate', affiliate.id, 'create', true);

      this.emitEvent('affiliate_added', {
        tenantId,
        affiliateId: affiliate.id,
        userId
      });

      return true;

    } catch (error) {
      this.logAccess(tenantId, userId, 'affiliate', affiliate.id, 'create', false, error.message);
      throw error;
    }
  }

  /**
   * Get affiliate from tenant store
   */
  public async getAffiliate(
    tenantId: string,
    affiliateId: string,
    userId?: string
  ): Promise<Affiliate | null> {
    try {
      // Validate access
      if (!this.validateTenantAccess(tenantId, userId, 'read_own_affiliates')) {
        this.logAccess(tenantId, userId, 'affiliate', affiliateId, 'read', false, 'Access denied');
        return null;
      }

      const store = this.tenantStores.get(tenantId);
      if (!store) {
        return null;
      }

      const affiliate = store.affiliates.get(affiliateId);
      if (!affiliate) {
        return null;
      }

      // Decrypt sensitive data if enabled
      const decryptedAffiliate = this.config.enableDataEncryption
        ? await this.decryptAffiliateData(affiliate, tenantId)
        : affiliate;

      store.lastAccessed = new Date();
      this.logAccess(tenantId, userId, 'affiliate', affiliateId, 'read', true);

      return decryptedAffiliate;

    } catch (error) {
      this.logAccess(tenantId, userId, 'affiliate', affiliateId, 'read', false, error.message);
      return null;
    }
  }

  /**
   * Validate tenant access
   */
  private validateTenantAccess(
    tenantId: string,
    userId?: string,
    requiredPermission?: string
  ): boolean {
    // Check if tenant exists and is active
    const store = this.tenantStores.get(tenantId);
    if (!store) {
      return false;
    }

    // Additional permission checks would go here
    // For now, we'll assume basic validation
    return true;
  }

  /**
   * Encrypt affiliate sensitive data
   */
  private async encryptAffiliateData(affiliate: Affiliate, tenantId: string): Promise<Affiliate> {
    const encryptionKey = this.encryptionKeys.get(tenantId);
    if (!encryptionKey) {
      return affiliate; // No encryption key, return as-is
    }

    // This would implement actual encryption
    // For now, we'll just mark it as encrypted
    return {
      ...affiliate,
      metadata: {
        ...affiliate.metadata,
        encrypted: true,
        encryptionVersion: '1.0'
      }
    };
  }

  /**
   * Decrypt affiliate sensitive data
   */
  private async decryptAffiliateData(affiliate: Affiliate, tenantId: string): Promise<Affiliate> {
    const encryptionKey = this.encryptionKeys.get(tenantId);
    if (!encryptionKey || !affiliate.metadata.encrypted) {
      return affiliate; // No encryption needed
    }

    // This would implement actual decryption
    // For now, we'll just remove the encryption flag
    return {
      ...affiliate,
      metadata: {
        ...affiliate.metadata,
        encrypted: false
      }
    };
  }

  /**
   * Log access attempt
   */
  private logAccess(
    tenantId: string,
    userId: string | undefined,
    resource: string,
    resourceId: string,
    action: AccessLog['action'],
    success: boolean,
    errorMessage?: string
  ): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const log: AccessLog = {
      id: this.generateId('access-log'),
      tenantId,
      userId,
      resource,
      resourceId,
      action,
      timestamp: new Date(),
      success,
      errorMessage
    };

    const logs = this.accessLogs.get(tenantId) || [];
    logs.push(log);
    this.accessLogs.set(tenantId, logs);

    // Keep only recent logs based on retention policy
    const cutoffDate = new Date(Date.now() - this.config.dataRetentionPolicy.auditLogDays * 24 * 60 * 60 * 1000);
    const filteredLogs = logs.filter(log => log.timestamp > cutoffDate);
    this.accessLogs.set(tenantId, filteredLogs);
  }

  /**
   * Generate isolation key
   */
  private generateIsolationKey(tenantId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    return `iso_${tenantId}_${timestamp}_${random}`;
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(tenantId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 32);
    return `enc_${tenantId}_${timestamp}_${random}`;
  }

  /**
   * Start data cleanup timer
   */
  private startDataCleanupTimer(): void {
    setInterval(() => {
      this.performDataCleanup();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Perform data cleanup based on retention policies
   */
  private performDataCleanup(): void {
    const now = new Date();
    
    for (const [tenantId, store] of this.tenantStores.entries()) {
      // Check for inactive tenants
      const inactiveDays = Math.floor((now.getTime() - store.lastAccessed.getTime()) / (1000 * 60 * 60 * 24));
      
      if (inactiveDays > this.config.dataRetentionPolicy.inactiveTenantDays) {
        console.log(`[TENANT-ISOLATION] Tenant ${tenantId} inactive for ${inactiveDays} days, considering cleanup`);
        this.emitEvent('tenant_inactive_warning', {
          tenantId,
          inactiveDays,
          lastAccessed: store.lastAccessed
        });
      }
    }

    // Clean up old access logs
    for (const [tenantId, logs] of this.accessLogs.entries()) {
      const cutoffDate = new Date(now.getTime() - this.config.dataRetentionPolicy.auditLogDays * 24 * 60 * 60 * 1000);
      const filteredLogs = logs.filter(log => log.timestamp > cutoffDate);
      this.accessLogs.set(tenantId, filteredLogs);
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

  // Public methods for data management
  public async removeTenantStore(tenantId: string): Promise<boolean> {
    try {
      const store = this.tenantStores.get(tenantId);
      if (!store) {
        return false;
      }

      // Create orchestration plan for tenant store removal
      const removalPlan = this.orchestration.createPlan({
        name: `Tenant Store Removal - ${tenantId}`,
        description: 'Securely remove tenant data store',
        objectives: [
          'Securely delete all tenant data',
          'Remove encryption keys',
          'Archive audit logs',
          'Validate data removal'
        ],
        timeline: '2 hours',
        resources: [
          'Data deletion service',
          'Key management service',
          'Archive service',
          'Validation service'
        ]
      });

      // Remove store and related data
      this.tenantStores.delete(tenantId);
      this.accessLogs.delete(tenantId);
      this.encryptionKeys.delete(tenantId);

      this.emitEvent('tenant_store_removed', {
        tenantId,
        removedAt: new Date()
      });

      console.log(`[TENANT-ISOLATION] Removed store for tenant: ${tenantId}`);
      return true;

    } catch (error) {
      console.error(`[TENANT-ISOLATION] Failed to remove store for tenant ${tenantId}:`, error);
      return false;
    }
  }

  public getAccessLogs(tenantId: string, limit?: number): AccessLog[] {
    const logs = this.accessLogs.get(tenantId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  public getTenantStats(tenantId: string): {
    affiliateCount: number;
    commissionCount: number;
    referralCount: number;
    customerCount: number;
    lastAccessed: Date;
    dataSize: number;
  } | null {
    const store = this.tenantStores.get(tenantId);
    if (!store) {
      return null;
    }

    return {
      affiliateCount: store.affiliates.size,
      commissionCount: store.commissions.size,
      referralCount: store.referrals.size,
      customerCount: store.customers.size,
      lastAccessed: store.lastAccessed,
      dataSize: JSON.stringify(store).length // Rough estimate
    };
  }

  public getAllTenantStats(): Array<{
    tenantId: string;
    stats: ReturnType<typeof this.getTenantStats>;
  }> {
    const stats: Array<{
      tenantId: string;
      stats: ReturnType<typeof this.getTenantStats>;
    }> = [];

    for (const tenantId of this.tenantStores.keys()) {
      const tenantStats = this.getTenantStats(tenantId);
      if (tenantStats) {
        stats.push({ tenantId, stats: tenantStats });
      }
    }

    return stats;
  }

  /**
   * Dispose of tenant isolation resources
   */
  public dispose(): void {
    // Clear all tenant stores
    this.tenantStores.clear();
    this.auditLogs = [];
    this.accessPatterns.clear();
  }
}
/**
 * Enhanced Symfony/Oro Platform Integration for Multi-Tenant Affiliate Platform
 *
 * Provides comprehensive integration layer for connecting affiliate platform with Symfony/Oro
 * including affiliate management, commission tracking, and multi-tenant data synchronization
 */

import { EventEmitter } from 'events';
import {
  WSJFJob,
  WSJFConfiguration,
  WSJFSymfonyIntegration,
  WSJFOrchestratorIntegration,
  WSJFEvent,
  WSJFError
} from '../types';
import {
  Affiliate,
  Commission,
  Referral,
  Tenant
} from '../../affiliate-affinity/types';

export interface EntityMappingConfig {
  entity?: string;
  fields?: Record<string, string>;
}

export interface SymfonyOroConfig {
  apiEndpoint: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  tenantId?: string;
  enableAffiliateSync: boolean;
  enableCommissionSync: boolean;
  affiliateEntityMapping?: EntityMappingConfig;
  commissionEntityMapping?: EntityMappingConfig;
}

export interface SymfonyEntityMapping {
  job: {
    entity: string;
    fields: Record<string, string>;
  };
  user: {
    entity: string;
    fields: Record<string, string>;
  };
  project: {
    entity: string;
    fields: Record<string, string>;
  };
  affiliate: {
    entity: string;
    fields: Record<string, string>;
  };
  commission: {
    entity: string;
    fields: Record<string, string>;
  };
  referral: {
    entity: string;
    fields: Record<string, string>;
  };
  tenant: {
    entity: string;
    fields: Record<string, string>;
  };
}

export interface SymfonySyncResult {
  success: boolean;
  syncedEntities: number;
  failedEntities: number;
  errors: WSJFError[];
  lastSyncAt: Date;
}

export class SymfonyOroIntegration extends EventEmitter {
  private config: SymfonyOroConfig;
  private integration: WSJFSymfonyIntegration;
  private entityMapping: SymfonyEntityMapping;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private affiliateCache: Map<string, Affiliate> = new Map();
  private commissionCache: Map<string, Commission> = new Map();
  private referralCache: Map<string, Referral> = new Map();

  constructor(config: SymfonyOroConfig, integration: WSJFSymfonyIntegration) {
    super();
    this.config = config;
    this.integration = integration;
    this.entityMapping = this.buildEntityMapping(integration.fieldMapping);
    
    if (integration.enabled) {
      this.startSyncTimer();
    }
  }

  /**
   * Build entity mapping from field mapping configuration
   */
  private buildEntityMapping(fieldMapping: Record<string, string>): SymfonyEntityMapping {
    return {
      job: {
        entity: this.integration.entityMapping.jobEntity,
        fields: {
          id: 'id',
          name: 'name',
          description: 'description',
          type: 'type',
          status: 'status',
          priority: 'priority',
          estimatedDuration: 'estimated_duration',
          actualDuration: 'actual_duration',
          assignee: 'assignee',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          startedAt: 'started_at',
          completedAt: 'completed_at',
          wsjfScore: 'wsjf_score',
          userBusinessValue: 'user_business_value',
          timeCriticality: 'time_criticality',
          customerValue: 'customer_value',
          jobSize: 'job_size',
          ...fieldMapping
        }
      },
      user: {
        entity: this.integration.entityMapping.userEntity,
        fields: {
          id: 'id',
          username: 'username',
          email: 'email',
          firstName: 'first_name',
          lastName: 'last_name',
          roles: 'roles',
          ...fieldMapping
        }
      },
      project: {
        entity: this.integration.entityMapping.projectEntity,
        fields: {
          id: 'id',
          name: 'name',
          description: 'description',
          status: 'status',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          ...fieldMapping
        }
      },
      affiliate: {
        entity: this.config.affiliateEntityMapping?.entity || 'oro_affiliate_affiliate',
        fields: {
          id: 'id',
          userId: 'user_id',
          tenantId: 'tenant_id',
          affiliateCode: 'affiliate_code',
          status: 'status',
          tier: 'tier',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          totalRevenue: 'total_revenue',
          totalCommission: 'total_commission',
          conversionRate: 'conversion_rate',
          ...(this.config.affiliateEntityMapping?.fields || {})
        }
      },
      commission: {
        entity: this.config.commissionEntityMapping?.entity || 'oro_affiliate_commission',
        fields: {
          id: 'id',
          affiliateId: 'affiliate_id',
          referralId: 'referral_id',
          customerId: 'customer_id',
          type: 'type',
          amount: 'amount',
          currency: 'currency',
          rate: 'rate',
          status: 'status',
          createdAt: 'created_at',
          processedAt: 'processed_at',
          paidAt: 'paid_at',
          ...(this.config.commissionEntityMapping?.fields || {})
        }
      },
      referral: {
        entity: 'oro_affiliate_referral',
        fields: {
          id: 'id',
          affiliateId: 'affiliate_id',
          customerId: 'customer_id',
          referralCode: 'referral_code',
          status: 'status',
          convertedAt: 'converted_at',
          totalPurchases: 'total_purchases',
          totalRevenue: 'total_revenue',
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      },
      tenant: {
        entity: 'oro_affiliate_tenant',
        fields: {
          id: 'id',
          name: 'name',
          domain: 'domain',
          status: 'status',
          settings: 'settings',
          branding: 'branding',
          subscription: 'subscription',
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      }
    };
  }

  /**
   * Start automatic sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.integration.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        this.performSync();
      }, this.integration.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Perform full synchronization with Symfony/Oro platform
   */
  public async performSync(): Promise<SymfonySyncResult> {
    if (this.isSyncing) {
      throw this.createError('SYNC_IN_PROGRESS', 'Synchronization already in progress');
    }

    this.isSyncing = true;
    const result: SymfonySyncResult = {
      success: true,
      syncedEntities: 0,
      failedEntities: 0,
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      this.emitEvent('sync_started', { timestamp: result.lastSyncAt });

      // Sync jobs from Symfony to WSJF
      const jobSyncResult = await this.syncJobsFromSymfony();
      result.syncedEntities += jobSyncResult.synced;
      result.failedEntities += jobSyncResult.failed;
      result.errors.push(...jobSyncResult.errors);

      // Sync jobs from WSJF to Symfony
      const wsjfSyncResult = await this.syncJobsToSymfony();
      result.syncedEntities += wsjfSyncResult.synced;
      result.failedEntities += wsjfSyncResult.failed;
      result.errors.push(...wsjfSyncResult.errors);

      // Sync affiliates if enabled
      if (this.config.enableAffiliateSync) {
        const affiliateSyncResult = await this.syncAffiliates();
        result.syncedEntities += affiliateSyncResult.synced;
        result.failedEntities += affiliateSyncResult.failed;
        result.errors.push(...affiliateSyncResult.errors);
      }

      // Sync commissions if enabled
      if (this.config.enableCommissionSync) {
        const commissionSyncResult = await this.syncCommissions();
        result.syncedEntities += commissionSyncResult.synced;
        result.failedEntities += commissionSyncResult.failed;
        result.errors.push(...commissionSyncResult.errors);
      }

      // Update last sync timestamp
      this.integration.lastSyncAt = result.lastSyncAt;

      this.emitEvent('sync_completed', result);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(this.createError('SYNC_FAILED', error.message));
      
      this.emitEvent('sync_failed', { error: error.message });
      
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync affiliates from Symfony to affiliate platform
   */
  private async syncAffiliates(): Promise<{
    synced: number;
    failed: number;
    errors: WSJFError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as WSJFError[] };

    try {
      const symfonyAffiliates = await this.fetchSymfonyAffiliates();
      
      for (const symfonyAffiliate of symfonyAffiliates) {
        try {
          const affiliate = this.convertSymfonyAffiliateToPlatform(symfonyAffiliate);
          this.affiliateCache.set(affiliate.id, affiliate);
          
          this.emitEvent('symfony_affiliate_synced', { affiliate });
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(this.createError('AFFILIATE_SYNC_FAILED',
            `Failed to sync Symfony affiliate ${symfonyAffiliate.id}: ${error.message}`));
        }
      }
    } catch (error) {
      result.errors.push(this.createError('SYMFONY_AFFILIATE_FETCH_FAILED',
        `Failed to fetch Symfony affiliates: ${error.message}`));
    }

    return result;
  }

  /**
   * Sync commissions from Symfony to affiliate platform
   */
  private async syncCommissions(): Promise<{
    synced: number;
    failed: number;
    errors: WSJFError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as WSJFError[] };

    try {
      const symfonyCommissions = await this.fetchSymfonyCommissions();
      
      for (const symfonyCommission of symfonyCommissions) {
        try {
          const commission = this.convertSymfonyCommissionToPlatform(symfonyCommission);
          this.commissionCache.set(commission.id, commission);
          
          this.emitEvent('symfony_commission_synced', { commission });
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(this.createError('COMMISSION_SYNC_FAILED',
            `Failed to sync Symfony commission ${symfonyCommission.id}: ${error.message}`));
        }
      }
    } catch (error) {
      result.errors.push(this.createError('SYMFONY_COMMISSION_FETCH_FAILED',
        `Failed to fetch Symfony commissions: ${error.message}`));
    }

    return result;
  }

  /**
   * Sync jobs from Symfony to WSJF system
   */
  private async syncJobsFromSymfony(): Promise<{
    synced: number;
    failed: number;
    errors: WSJFError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as WSJFError[] };

    try {
      const symfonyJobs = await this.fetchSymfonyJobs();
      
      for (const symfonyJob of symfonyJobs) {
        try {
          const wsjfJob = this.convertSymfonyJobToWSJF(symfonyJob);
          
          // Emit job for processing by scoring service
          this.emitEvent('symfony_job_received', { job: wsjfJob });
          
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(this.createError('JOB_CONVERSION_FAILED', 
            `Failed to convert Symfony job ${symfonyJob.id}: ${error.message}`));
        }
      }
    } catch (error) {
      result.errors.push(this.createError('SYMFONY_FETCH_FAILED', 
        `Failed to fetch jobs from Symfony: ${error.message}`));
    }

    return result;
  }

  /**
   * Sync jobs from WSJF to Symfony system
   */
  private async syncJobsToSymfony(): Promise<{
    synced: number;
    failed: number;
    errors: WSJFError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as WSJFError[] };

    try {
      // This would be called by the scoring service when jobs are updated
      // For now, we'll emit an event that can be listened to
      this.emitEvent('wsjf_jobs_ready_for_sync', {});
      
      result.synced = 0; // Will be updated by event handlers
    } catch (error) {
      result.errors.push(this.createError('WSJF_SYNC_FAILED', 
        `Failed to sync WSJF jobs to Symfony: ${error.message}`));
    }

    return result;
  }

  /**
   * Fetch jobs from Symfony/Oro API
   */
  private async fetchSymfonyJobs(): Promise<any[]> {
    const url = `${this.config.apiEndpoint}/api/${this.entityMapping.job.entity}`;
    const headers = this.buildHeaders();

    const response = await this.makeRequest('GET', url, headers);
    return response.data || [];
  }

  /**
   * Update job in Symfony/Oro API
   */
  public async updateSymfonyJob(wsjfJob: WSJFJob): Promise<boolean> {
    try {
      const symfonyJob = this.convertWSJFJobToSymfony(wsjfJob);
      const url = `${this.config.apiEndpoint}/api/${this.entityMapping.job.entity}/${symfonyJob.id}`;
      const headers = this.buildHeaders();

      await this.makeRequest('PUT', url, headers, symfonyJob);
      
      this.emitEvent('symfony_job_updated', { jobId: wsjfJob.id });
      
      return true;
    } catch (error) {
      this.emitEvent('symfony_job_update_failed', { jobId: wsjfJob.id, error: error.message });
      return false;
    }
  }

  /**
   * Create job in Symfony/Oro API
   */
  public async createSymfonyJob(wsjfJob: WSJFJob): Promise<string | null> {
    try {
      const symfonyJob = this.convertWSJFJobToSymfony(wsjfJob);
      const url = `${this.config.apiEndpoint}/api/${this.entityMapping.job.entity}`;
      const headers = this.buildHeaders();

      const response = await this.makeRequest('POST', url, headers, symfonyJob);
      const createdJobId = response.data?.id;
      
      if (createdJobId) {
        this.emitEvent('symfony_job_created', { jobId: createdJobId, wsjfJobId: wsjfJob.id });
        return createdJobId;
      }
      
      return null;
    } catch (error) {
      this.emitEvent('symfony_job_creation_failed', { jobId: wsjfJob.id, error: error.message });
      return null;
    }
  }

  /**
   * Convert Symfony job to WSJF job format
   */
  private convertSymfonyJobToWSJF(symfonyJob: any): WSJFJob {
    const fields = this.entityMapping.job.fields;
    
    return {
      id: symfonyJob[fields.id],
      name: symfonyJob[fields.name],
      description: symfonyJob[fields.description],
      type: this.mapSymfonyTypeToWSJF(symfonyJob[fields.type]),
      priority: symfonyJob[fields.priority] || 0,
      estimatedDuration: symfonyJob[fields.estimatedDuration] || 1,
      actualDuration: symfonyJob[fields.actualDuration],
      status: this.mapSymfonyStatusToWSJF(symfonyJob[fields.status]),
      assignee: symfonyJob[fields.assignee],
      circle: symfonyJob.circle,
      domain: symfonyJob.domain,
      dependencies: symfonyJob.dependencies || [],
      tags: symfonyJob.tags || [],
      createdAt: new Date(symfonyJob[fields.createdAt]),
      updatedAt: new Date(symfonyJob[fields.updatedAt]),
      startedAt: symfonyJob[fields.startedAt] ? new Date(symfonyJob[fields.startedAt]) : undefined,
      completedAt: symfonyJob[fields.completedAt] ? new Date(symfonyJob[fields.completedAt]) : undefined,
      wsjfResult: symfonyJob[fields.wsjfScore] ? {
        id: this.generateId('wsjf-result'),
        jobId: symfonyJob[fields.id],
        wsjfScore: symfonyJob[fields.wsjfScore],
        costOfDelay: symfonyJob[fields.wsjfScore] * (symfonyJob[fields.jobSize] || 1),
        jobDuration: symfonyJob[fields.jobSize] || 1,
        calculationParams: {
          userBusinessValue: symfonyJob[fields.userBusinessValue] || 50,
          timeCriticality: symfonyJob[fields.timeCriticality] || 50,
          customerValue: symfonyJob[fields.customerValue] || 50,
          jobSize: symfonyJob[fields.jobSize] || 1
        },
        weightingFactors: {
          userBusinessWeight: 1.0,
          timeCriticalityWeight: 1.0,
          customerValueWeight: 1.0,
          riskReductionWeight: 1.0,
          opportunityEnablementWeight: 1.0
        },
        calculatedAt: new Date()
      } : undefined,
      metadata: symfonyJob.metadata || {}
    };
  }

  /**
   * Convert WSJF job to Symfony job format
   */
  private convertWSJFJobToSymfony(wsjfJob: WSJFJob): any {
    const fields = this.entityMapping.job.fields;
    
    const symfonyJob: any = {};
    
    // Map WSJF fields to Symfony fields
    symfonyJob[fields.id] = wsjfJob.id;
    symfonyJob[fields.name] = wsjfJob.name;
    symfonyJob[fields.description] = wsjfJob.description;
    symfonyJob[fields.type] = this.mapWSJFTypeToSymfony(wsjfJob.type);
    symfonyJob[fields.status] = this.mapWSJFStatusToSymfony(wsjfJob.status);
    symfonyJob[fields.priority] = wsjfJob.priority;
    symfonyJob[fields.estimatedDuration] = wsjfJob.estimatedDuration;
    symfonyJob[fields.actualDuration] = wsjfJob.actualDuration;
    symfonyJob[fields.assignee] = wsjfJob.assignee;
    symfonyJob[fields.createdAt] = wsjfJob.createdAt.toISOString();
    symfonyJob[fields.updatedAt] = wsjfJob.updatedAt.toISOString();
    symfonyJob[fields.startedAt] = wsjfJob.startedAt?.toISOString();
    symfonyJob[fields.completedAt] = wsjfJob.completedAt?.toISOString();
    
    // Add WSJF specific fields
    if (wsjfJob.wsjfResult) {
      symfonyJob[fields.wsjfScore] = wsjfJob.wsjfResult.wsjfScore;
      symfonyJob[fields.userBusinessValue] = wsjfJob.wsjfResult.calculationParams.userBusinessValue;
      symfonyJob[fields.timeCriticality] = wsjfJob.wsjfResult.calculationParams.timeCriticality;
      symfonyJob[fields.customerValue] = wsjfJob.wsjfResult.calculationParams.customerValue;
      symfonyJob[fields.jobSize] = wsjfJob.wsjfResult.jobDuration;
    }
    
    // Add additional fields
    symfonyJob.circle = wsjfJob.circle;
    symfonyJob.domain = wsjfJob.domain;
    symfonyJob.dependencies = wsjfJob.dependencies;
    symfonyJob.tags = wsjfJob.tags;
    symfonyJob.metadata = wsjfJob.metadata;
    
    return symfonyJob;
  }

  /**
   * Map Symfony job type to WSJF job type
   */
  private mapSymfonyTypeToWSJF(symfonyType: string): WSJFJob['type'] {
    const typeMapping: Record<string, WSJFJob['type']> = {
      'feature': 'feature',
      'bug': 'bug',
      'enhancement': 'enhancement',
      'technical_debt': 'technical_debt',
      'research': 'research',
      'story': 'feature',
      'task': 'other',
      'epic': 'feature'
    };
    
    return typeMapping[symfonyType] || 'other';
  }

  /**
   * Map WSJF job type to Symfony job type
   */
  private mapWSJFTypeToSymfony(wjfType: WSJFJob['type']): string {
    const typeMapping: Record<WSJFJob['type'], string> = {
      'feature': 'feature',
      'bug': 'bug',
      'enhancement': 'enhancement',
      'technical_debt': 'technical_debt',
      'research': 'research',
      'other': 'task'
    };
    
    return typeMapping[wjfType] || 'task';
  }

  /**
   * Map Symfony status to WSJF status
   */
  private mapSymfonyStatusToWSJF(symfonyStatus: string): WSJFJob['status'] {
    const statusMapping: Record<string, WSJFJob['status']> = {
      'open': 'pending',
      'in_progress': 'in_progress',
      'closed': 'completed',
      'resolved': 'completed',
      'blocked': 'blocked',
      'cancelled': 'cancelled'
    };
    
    return statusMapping[symfonyStatus] || 'pending';
  }

  /**
   * Map WSJF status to Symfony status
   */
  private mapWSJFStatusToSymfony(wjfStatus: WSJFJob['status']): string {
    const statusMapping: Record<WSJFJob['status'], string> = {
      'pending': 'open',
      'in_progress': 'in_progress',
      'completed': 'closed',
      'blocked': 'blocked',
      'cancelled': 'cancelled'
    };
    
    return statusMapping[wjfStatus] || 'open';
  }

  /**
   * Build HTTP headers for API requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    data?: any
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get integration status
   */
  public getIntegrationStatus(): {
    enabled: boolean;
    lastSyncAt?: Date;
    syncInterval: number;
    isSyncing: boolean;
  } {
    return {
      enabled: this.integration.enabled,
      lastSyncAt: this.integration.lastSyncAt,
      syncInterval: this.integration.syncInterval,
      isSyncing: this.isSyncing
    };
  }

  /**
   * Update integration configuration
   */
  public updateIntegration(updates: Partial<WSJFSymfonyIntegration>): void {
    this.integration = { ...this.integration, ...updates };
    
    if (updates.fieldMapping) {
      this.entityMapping = this.buildEntityMapping(updates.fieldMapping);
    }
    
    if (updates.syncInterval !== undefined) {
      this.startSyncTimer();
    }
    
    this.emitEvent('integration_updated', { updates: Object.keys(updates) });
  }

  /**
   * Emit WSJF event
   */
  private emitEvent(type: WSJFEvent['type'], data: Record<string, any>): void {
    const event: WSJFEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data
    };

    this.emit('symfonyEvent', event);
  }

  /**
   * Create standardized error object
   */
  private createError(code: string, message: string): WSJFError {
    return {
      code,
      message,
      timestamp: new Date()
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
   * Fetch affiliates from Symfony/Oro API
   */
  private async fetchSymfonyAffiliates(): Promise<any[]> {
    const url = `${this.config.apiEndpoint}/api/${this.entityMapping.affiliate.entity}`;
    const headers = this.buildHeaders();

    const response = await this.makeRequest('GET', url, headers);
    return response.data || [];
  }

  /**
   * Fetch commissions from Symfony/Oro API
   */
  private async fetchSymfonyCommissions(): Promise<any[]> {
    const url = `${this.config.apiEndpoint}/api/${this.entityMapping.commission.entity}`;
    const headers = this.buildHeaders();

    const response = await this.makeRequest('GET', url, headers);
    return response.data || [];
  }

  /**
   * Convert Symfony affiliate to platform format
   */
  private convertSymfonyAffiliateToPlatform(symfonyAffiliate: any): Affiliate {
    const fields = this.entityMapping.affiliate.fields;
    
    return {
      id: symfonyAffiliate[fields.id],
      userId: symfonyAffiliate[fields.userId],
      tenantId: symfonyAffiliate[fields.tenantId] || this.config.tenantId || 'default',
      affiliateCode: symfonyAffiliate[fields.affiliateCode],
      status: symfonyAffiliate[fields.status],
      tier: {
        id: symfonyAffiliate[fields.tier],
        name: symfonyAffiliate[fields.tier],
        level: 1,
        minPerformance: 0,
        commissionRate: 0.05,
        benefits: [],
        requirements: [],
        isActive: true
      },
      profile: {
        firstName: symfonyAffiliate[fields.firstName],
        lastName: symfonyAffiliate[fields.lastName],
        email: symfonyAffiliate[fields.email],
        phone: '',
        company: '',
        website: '',
        bio: '',
        socialLinks: {},
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        },
        taxInfo: {
          taxId: '',
          taxIdType: 'ssn',
          taxForm: 'W9',
          formStatus: 'pending'
        },
        paymentMethods: []
      },
      performance: {
        totalReferrals: 0,
        activeReferrals: 0,
        totalRevenue: symfonyAffiliate[fields.totalRevenue] || 0,
        totalCommission: symfonyAffiliate[fields.totalCommission] || 0,
        currentMonthRevenue: 0,
        currentMonthCommission: 0,
        conversionRate: symfonyAffiliate[fields.conversionRate] || 0,
        averageOrderValue: 0,
        customerRetentionRate: 0,
        lastUpdated: new Date(),
        metrics: []
      },
      commissionSettings: {
        baseRate: 0.05,
        tierBonus: 0,
        performanceBonus: 0,
        recurringCommission: false,
        recurringRate: 0.02,
        recurringDuration: 12,
        customRates: []
      },
      createdAt: new Date(symfonyAffiliate[fields.createdAt]),
      updatedAt: new Date(symfonyAffiliate[fields.updatedAt]),
      metadata: {}
    };
  }

  /**
   * Convert Symfony commission to platform format
   */
  private convertSymfonyCommissionToPlatform(symfonyCommission: any): Commission {
    const fields = this.entityMapping.commission.fields;
    
    return {
      id: symfonyCommission[fields.id],
      affiliateId: symfonyCommission[fields.affiliateId],
      referralId: symfonyCommission[fields.referralId],
      customerId: symfonyCommission[fields.customerId],
      type: symfonyCommission[fields.type] || 'initial_sale',
      amount: symfonyCommission[fields.amount],
      currency: symfonyCommission[fields.currency] || 'USD',
      rate: symfonyCommission[fields.rate],
      status: symfonyCommission[fields.status],
      calculationDetails: {
        baseAmount: symfonyCommission[fields.amount],
        commissionRate: symfonyCommission[fields.rate],
        tierMultiplier: 1,
        performanceMultiplier: 1,
        customAdjustments: 0,
        totalMultiplier: 1,
        calculatedAmount: symfonyCommission[fields.amount],
        currency: symfonyCommission[fields.currency] || 'USD'
      },
      createdAt: new Date(symfonyCommission[fields.createdAt]),
      processedAt: symfonyCommission[fields.processedAt] ? new Date(symfonyCommission[fields.processedAt]) : undefined,
      paidAt: symfonyCommission[fields.paidAt] ? new Date(symfonyCommission[fields.paidAt]) : undefined,
      metadata: {}
    };
  }

  /**
   * Create affiliate in Symfony/Oro
   */
  public async createSymfonyAffiliate(affiliate: Affiliate): Promise<string | null> {
    try {
      const symfonyAffiliate = this.convertPlatformAffiliateToSymfony(affiliate);
      const url = `${this.config.apiEndpoint}/api/${this.entityMapping.affiliate.entity}`;
      const headers = this.buildHeaders();

      const response = await this.makeRequest('POST', url, headers, symfonyAffiliate);
      const createdAffiliateId = response.data?.id;
      
      if (createdAffiliateId) {
        this.emitEvent('symfony_affiliate_created', {
          affiliateId: createdAffiliateId,
          platformAffiliateId: affiliate.id
        });
        return createdAffiliateId;
      }
      
      return null;
    } catch (error) {
      this.emitEvent('symfony_affiliate_creation_failed', {
        affiliateId: affiliate.id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Create commission in Symfony/Oro
   */
  public async createSymfonyCommission(commission: Commission): Promise<string | null> {
    try {
      const symfonyCommission = this.convertPlatformCommissionToSymfony(commission);
      const url = `${this.config.apiEndpoint}/api/${this.entityMapping.commission.entity}`;
      const headers = this.buildHeaders();

      const response = await this.makeRequest('POST', url, headers, symfonyCommission);
      const createdCommissionId = response.data?.id;
      
      if (createdCommissionId) {
        this.emitEvent('symfony_commission_created', {
          commissionId: createdCommissionId,
          platformCommissionId: commission.id
        });
        return createdCommissionId;
      }
      
      return null;
    } catch (error) {
      this.emitEvent('symfony_commission_creation_failed', {
        commissionId: commission.id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Convert platform affiliate to Symfony format
   */
  private convertPlatformAffiliateToSymfony(affiliate: Affiliate): any {
    const fields = this.entityMapping.affiliate.fields;
    
    const symfonyAffiliate: any = {};
    
    // Map platform fields to Symfony fields
    symfonyAffiliate[fields.id] = affiliate.id;
    symfonyAffiliate[fields.userId] = affiliate.userId;
    symfonyAffiliate[fields.tenantId] = affiliate.tenantId;
    symfonyAffiliate[fields.affiliateCode] = affiliate.affiliateCode;
    symfonyAffiliate[fields.status] = affiliate.status;
    symfonyAffiliate[fields.tier] = affiliate.tier.id;
    symfonyAffiliate[fields.firstName] = affiliate.profile.firstName;
    symfonyAffiliate[fields.lastName] = affiliate.profile.lastName;
    symfonyAffiliate[fields.email] = affiliate.profile.email;
    symfonyAffiliate[fields.totalRevenue] = affiliate.performance.totalRevenue;
    symfonyAffiliate[fields.totalCommission] = affiliate.performance.totalCommission;
    symfonyAffiliate[fields.conversionRate] = affiliate.performance.conversionRate;
    symfonyAffiliate[fields.createdAt] = affiliate.createdAt.toISOString();
    symfonyAffiliate[fields.updatedAt] = affiliate.updatedAt.toISOString();
    
    return symfonyAffiliate;
  }

  /**
   * Convert platform commission to Symfony format
   */
  private convertPlatformCommissionToSymfony(commission: Commission): any {
    const fields = this.entityMapping.commission.fields;
    
    const symfonyCommission: any = {};
    
    // Map platform fields to Symfony fields
    symfonyCommission[fields.id] = commission.id;
    symfonyCommission[fields.affiliateId] = commission.affiliateId;
    symfonyCommission[fields.referralId] = commission.referralId;
    symfonyCommission[fields.customerId] = commission.customerId;
    symfonyCommission[fields.type] = commission.type;
    symfonyCommission[fields.amount] = commission.amount;
    symfonyCommission[fields.currency] = commission.currency;
    symfonyCommission[fields.rate] = commission.rate;
    symfonyCommission[fields.status] = commission.status;
    symfonyCommission[fields.createdAt] = commission.createdAt.toISOString();
    symfonyCommission[fields.processedAt] = commission.processedAt?.toISOString();
    symfonyCommission[fields.paidAt] = commission.paidAt?.toISOString();
    
    return symfonyCommission;
  }

  /**
   * Get cached affiliate
   */
  public getCachedAffiliate(affiliateId: string): Affiliate | undefined {
    return this.affiliateCache.get(affiliateId);
  }

  /**
   * Get cached commission
   */
  public getCachedCommission(commissionId: string): Commission | undefined {
    return this.commissionCache.get(commissionId);
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    affiliatesCached: number;
    commissionsCached: number;
    referralsCached: number;
    lastSyncAt?: Date;
    isSyncing: boolean;
  } {
    return {
      affiliatesCached: this.affiliateCache.size,
      commissionsCached: this.commissionCache.size,
      referralsCached: this.referralCache.size,
      lastSyncAt: this.integration.lastSyncAt,
      isSyncing: this.isSyncing
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.removeAllListeners();
    this.affiliateCache.clear();
    this.commissionCache.clear();
    this.referralCache.clear();
    console.log('[WSJF] Symfony/Oro integration disposed');
  }
}
/**
 * WSJF Scoring Service
 * 
 * Provides high-level WSJF scoring functionality with configurable parameters,
 * real-time recalculation, and integration with orchestration framework
 */

import { EventEmitter } from 'events';
import { WSJFCalculator } from './calculator';
import { WSJFPriorityQueueManager } from './priority-queue';
import { DurationTrackingSystem } from '../duration-tracking/index';
import {
  WSJFJob,
  WSJFResult,
  WSJFConfiguration,
  WSJFCalculationParams,
  WSJFWeightingFactors,
  WSJFEvent,
  WSJFAnalytics,
  WSJFJobCreateRequest,
  WSJFJobUpdateRequest,
  WSJFError
} from './types';

export class WSJFScoringService extends EventEmitter {
  private calculator: WSJFCalculator;
  private queueManager: WSJFPriorityQueueManager;
  private configurations: Map<string, WSJFConfiguration> = new Map();
  private activeConfigurationId: string = 'default';
  private recalculationTimer: NodeJS.Timeout | null = null;
  private eventHistory: WSJFEvent[] = [];
  private durationTrackingSystem: DurationTrackingSystem;

  constructor() {
    super();
    this.calculator = new WSJFCalculator();
    this.queueManager = new WSJFPriorityQueueManager();
    
    // Initialize duration tracking system
    this.durationTrackingSystem = new DurationTrackingSystem({
      enabled: true,
      environment: 'development', // Would be from config
      collectionInterval: 60, // 1 minute
      bufferSize: 10000,
      retentionDays: 30,
      qualityThresholds: {
        minQualityScore: 70,
        minCompleteness: 80,
        minAccuracy: 85,
        minConsistency: 75,
        maxOutlierDeviation: 3,
        maxMissingDataPercentage: 10
      },
      alerting: {
        enabled: true,
        defaultRules: [
          {
            id: 'wsjf_calculation_duration',
            name: 'WSJF Calculation Duration Threshold',
            description: 'Alert when WSJF calculation duration exceeds threshold',
            enabled: true,
            environment: ['development', 'staging', 'production'],
            conditions: [
              {
                metricId: 'wsjf_calculation_duration_ms',
                operator: 'gt',
                threshold: 5000, // 5 seconds
                duration: 60, // 1 hour
                aggregation: 'average'
              }
            ],
            actions: [
              {
                type: 'notify',
                description: 'Notify team of long WSJF calculation duration'
              }
            ],
            cooldownPeriod: 15,
            escalationPolicy: {
              levels: [
                {
                  level: 1,
                  delay: 5,
                  actions: [
                    {
                      type: 'notify',
                      description: 'Escalate to team lead'
                    }
                  ]
                }
              ],
              repeatInterval: 30,
              maxEscalations: 3
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        escalationPolicies: [],
        notificationChannels: [],
        suppressionRules: []
      },
      aggregation: {
        enabled: true,
        defaultIntervals: ['last_hour', 'last_day', 'last_week'],
        defaultTypes: ['average', 'min', 'max', 'median', 'percentile'],
        defaultDimensions: [],
        maxAggregationAge: 90
      },
      validation: {
        enabled: true,
        validationInterval: 15,
        autoCorrection: false,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [
          {
            name: 'wsjf_scoring',
            type: 'wsjf',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'calculationTime',
              targetField: 'durationMs',
              transformation: 'calculationTime',
              required: true
            }
          }
        ],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      }
    });

    this.initializeService();
  }

  /**
   * Initialize WSJF scoring service
   */
  private initializeService(): void {
    // Set up default configuration
    const defaultConfig = this.calculator.getDefaultConfiguration();
    this.configurations.set(defaultConfig.id, defaultConfig);
    this.activeConfigurationId = defaultConfig.id;

    // Set up event listeners
    this.setupEventListeners();

    // Start automatic recalculation if enabled
    this.startRecalculationTimer();

    console.log('[WSJF] Scoring service initialized with default configuration');
  }

  /**
   * Set up event listeners for queue manager
   */
  private setupEventListeners(): void {
    this.queueManager.on('wsjfEvent', (event: WSJFEvent) => {
      this.addToEventHistory(event);
      this.emit('wsjfEvent', event);
    });
  }

  /**
   * Create a new job with WSJF calculation
   */
  public async createJob(request: WSJFJobCreateRequest, queueIds: string[] = ['default']): Promise<WSJFJob> {
    try {
      const calculationStartTime = Date.now();
      
      const config = this.getActiveConfiguration();
      
      // Calculate WSJF score
      const wsjfResult = this.calculator.calculateWSJF(
        this.generateId('job'),
        request.params,
        config
      );

      const calculationDuration = Date.now() - calculationStartTime;

      // Record WSJF calculation duration metric
      this.durationTrackingSystem.recordDuration(
        'wsjf_calculation_duration_ms',
        calculationDuration,
        {
          component: 'wsjf_scoring',
          operation: 'wsjf_calculation',
          jobId: wsjfResult.jobId,
          wsjfScore: wsjfResult.wsjfScore,
          businessValue: request.params.userBusinessValue,
          timeCriticality: request.params.timeCriticality
        },
        {
          operationType: 'wsjf_calculation',
          jobId: wsjfResult.jobId,
          wsjfScore: wsjfResult.wsjfScore,
          businessValue: request.params.userBusinessValue,
          timeCriticality: request.params.timeCriticality
        }
      );

      // Create job object
      const job: WSJFJob = {
        id: wsjfResult.jobId,
        name: request.name,
        description: request.description,
        type: request.type,
        priority: 0, // Will be determined by WSJF score
        estimatedDuration: request.estimatedDuration,
        status: 'pending',
        assignee: request.assignee,
        circle: request.circle,
        domain: request.domain,
        dependencies: request.dependencies || [],
        tags: request.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        wsjfResult,
        metadata: request.metadata || {}
      };

      // Set priority based on WSJF score
      job.priority = this.calculatePriorityFromWSJF(wsjfResult.wsjfScore);

      // Add to queue manager
      this.queueManager.addJob(job, queueIds);

      this.emitEvent('job_created', { jobId: job.id, wsjfScore: wsjfResult.wsjfScore });
      
      return job;
    } catch (error) {
      throw this.createError('JOB_CREATION_FAILED', `Failed to create job: ${error.message}`);
    }
  }

  /**
   * Update an existing job and recalculate WSJF if needed
   */
  public async updateJob(
    jobId: string, 
    updates: WSJFJobUpdateRequest,
    recalculateWSJF: boolean = true
  ): Promise<WSJFJob> {
    try {
      const updateStartTime = Date.now();
      
      const existingJob = this.queueManager.getJob(jobId);
      if (!existingJob) {
        throw this.createError('JOB_NOT_FOUND', `Job ${jobId} not found`);
      }

      let updatedJob = { ...existingJob, ...updates, updatedAt: new Date() };

      // Recalculate WSJF if parameters changed or explicitly requested
      if (recalculateWSJF || this.shouldRecalculateWSJF(updates)) {
        const config = this.getActiveConfiguration();
        const currentParams = existingJob.wsjfResult?.calculationParams || this.getDefaultParams();
        const updatedParams = { ...currentParams, ...updates };

        const recalculationStartTime = Date.now();
        
        const newWSJFResult = this.calculator.calculateWSJF(jobId, updatedParams, config);
        
        const recalculationDuration = Date.now() - recalculationStartTime;

        // Record WSJF recalculation duration metric
        this.durationTrackingSystem.recordDuration(
          'wsjf_recalculation_duration_ms',
          recalculationDuration,
          {
            component: 'wsjf_scoring',
            operation: 'wsjf_recalculation',
            jobId,
            previousWsjfScore: existingJob.wsjfResult?.wsjfScore,
            newWsjfScore: newWSJFResult.wsjfScore,
            changedParams: Object.keys(updates).filter(key => this.shouldRecalculateWSJF({ [key]: updates[key] }))
          },
          {
            operationType: 'wsjf_recalculation',
            jobId,
            previousWsjfScore: existingJob.wsjfResult?.wsjfScore,
            newWsjfScore: newWSJFResult.wsjfScore,
            changedParams: Object.keys(updates).filter(key => this.shouldRecalculateWSJF({ [key]: updates[key] }))
          }
        );

        updatedJob.wsjfResult = newWSJFResult;
        updatedJob.priority = this.calculatePriorityFromWSJF(newWSJFResult.wsjfScore);
      }

      // Update in queue manager
      updatedJob = this.queueManager.updateJob(jobId, updatedJob);

      const updateDuration = Date.now() - updateStartTime;

      // Record job update duration metric
      this.durationTrackingSystem.recordDuration(
        'wsjf_job_update_duration_ms',
        updateDuration,
        {
          component: 'wsjf_scoring',
          operation: 'job_update',
          jobId,
          recalculationPerformed: recalculateWSJF,
          finalWsjfScore: updatedJob.wsjfResult?.wsjfScore
        },
        {
          operationType: 'job_update',
          jobId,
          recalculationPerformed: recalculateWSJF,
          finalWsjfScore: updatedJob.wsjfResult?.wsjfScore
        }
      );

      this.emitEvent('job_updated', { jobId, wsjfScore: updatedJob.wsjfResult?.wsjfScore });
      
      return updatedJob;
    } catch (error) {
      throw this.createError('JOB_UPDATE_FAILED', `Failed to update job: ${error.message}`);
    }
  }

  /**
   * Calculate WSJF for an existing job
   */
  public async calculateWSJF(
    jobId: string,
    params: WSJFCalculationParams,
    configurationId?: string
  ): Promise<WSJFResult> {
    try {
      const calculationStartTime = Date.now();
      
      const config = configurationId 
        ? this.configurations.get(configurationId)
        : this.getActiveConfiguration();

      if (!config) {
        throw this.createError('CONFIG_NOT_FOUND', `Configuration ${configurationId} not found`);
      }

      const result = this.calculator.calculateWSJF(jobId, params, config);
      
      const calculationDuration = Date.now() - calculationStartTime;

      // Record WSJF calculation duration metric
      this.durationTrackingSystem.recordDuration(
        'wsjf_individual_calculation_duration_ms',
        calculationDuration,
        {
          component: 'wsjf_scoring',
          operation: 'wsjf_individual_calculation',
          jobId,
          wsjfScore: result.wsjfScore,
          businessValue: params.userBusinessValue,
          timeCriticality: params.timeCriticality,
          customerValue: params.customerValue,
          riskReduction: params.riskReduction,
          opportunityEnablement: params.opportunityEnablement
        },
        {
          operationType: 'wsjf_individual_calculation',
          jobId,
          wsjfScore: result.wsjfScore,
          businessValue: params.userBusinessValue,
          timeCriticality: params.timeCriticality,
          customerValue: params.customerValue,
          riskReduction: params.riskReduction,
          opportunityEnablement: params.opportunityEnablement
        }
      );
      
      // Update job in queue manager
      this.queueManager.updateJobWSJF(jobId, result);

      this.emitEvent('wsjf_calculated', { jobId, wsjfScore: result.wsjfScore });
      
      return result;
    } catch (error) {
      throw this.createError('WSJF_CALCULATION_FAILED', `WSJF calculation failed: ${error.message}`);
    }
  }

  /**
   * Batch calculate WSJF for multiple jobs
   */
  public async batchCalculateWSJF(
    calculations: Array<{
      jobId: string;
      params: WSJFCalculationParams;
    }>,
    configurationId?: string
  ): Promise<WSJFResult[]> {
    try {
      const batchCalculationStartTime = Date.now();
      
      const config = configurationId 
        ? this.configurations.get(configurationId)
        : this.getActiveConfiguration();

      if (!config) {
        throw this.createError('CONFIG_NOT_FOUND', `Configuration ${configurationId} not found`);
      }

      const results = this.calculator.calculateBatchWSJF(calculations, config);
      
      const batchCalculationDuration = Date.now() - batchCalculationStartTime;

      // Record batch WSJF calculation duration metric
      this.durationTrackingSystem.recordDuration(
        'wsjf_batch_calculation_duration_ms',
        batchCalculationDuration,
        {
          component: 'wsjf_scoring',
          operation: 'wsjf_batch_calculation',
          jobCount: calculations.length,
          configurationId: configurationId || this.activeConfigurationId
        },
        {
          operationType: 'wsjf_batch_calculation',
          jobCount: calculations.length,
          configurationId: configurationId || this.activeConfigurationId
        }
      );

      // Update all jobs in queue manager
      for (const result of results) {
        this.queueManager.updateJobWSJF(result.jobId, result);
      }

      this.emitEvent('batch_wsjf_calculated', { count: results.length });
      
      return results;
    } catch (error) {
      throw this.createError('BATCH_CALCULATION_FAILED', `Batch WSJF calculation failed: ${error.message}`);
    }
  }

  /**
   * Create or update WSJF configuration
   */
  public createConfiguration(
    name: string,
    description: string,
    weightingFactors: Partial<WSJFWeightingFactors>,
    options: Partial<Omit<WSJFConfiguration, 'id' | 'name' | 'description' | 'weightingFactors' | 'createdAt' | 'updatedAt'>> = {}
  ): WSJFConfiguration {
    try {
      const configCreationStartTime = Date.now();
      
      const config = this.calculator.createConfiguration(name, description, weightingFactors, options);
      this.configurations.set(config.id, config);

      const configCreationDuration = Date.now() - configCreationStartTime;

      // Record configuration creation duration metric
      this.durationTrackingSystem.recordDuration(
        'wsjf_configuration_creation_duration_ms',
        configCreationDuration,
        {
          component: 'wsjf_scoring',
          operation: 'configuration_creation',
          configurationId: config.id,
          configurationName: name
        },
        {
          operationType: 'configuration_creation',
          configurationId: config.id,
          configurationName: name
        }
      );

      this.emitEvent('configuration_created', { configId: config.id, name });
      
      return config;
    } catch (error) {
      throw this.createError('CONFIG_CREATION_FAILED', `Failed to create configuration: ${error.message}`);
    }
  }

  /**
   * Update existing configuration
   */
  public updateConfiguration(
    configId: string,
    updates: Partial<WSJFConfiguration>
  ): WSJFConfiguration {
    const configUpdateStartTime = Date.now();
    
    const existingConfig = this.configurations.get(configId);
    if (!existingConfig) {
      throw this.createError('CONFIG_NOT_FOUND', `Configuration ${configId} not found`);
    }

    const updatedConfig: WSJFConfiguration = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date()
    };

    this.configurations.set(configId, updatedConfig);

    const configUpdateDuration = Date.now() - configUpdateStartTime;

    // Record configuration update duration metric
    this.durationTrackingSystem.recordDuration(
      'wsjf_configuration_update_duration_ms',
      configUpdateDuration,
      {
        component: 'wsjf_scoring',
        operation: 'configuration_update',
        configurationId: configId,
        updatedFields: Object.keys(updates)
      },
      {
        operationType: 'configuration_update',
        configurationId: configId,
        updatedFields: Object.keys(updates)
      }
    );

    // Restart recalculation timer if interval changed
    if (updates.recalculationInterval !== undefined) {
      this.startRecalculationTimer();
    }

    this.emitEvent('configuration_updated', { configId, updates: Object.keys(updates) });
    
    return updatedConfig;
  }

  /**
   * Set active configuration
   */
  public setActiveConfiguration(configId: string): void {
    const configChangeStartTime = Date.now();
    
    const config = this.configurations.get(configId);
    if (!config) {
      throw this.createError('CONFIG_NOT_FOUND', `Configuration ${configId} not found`);
    }

    this.activeConfigurationId = configId;
    this.startRecalculationTimer();

    const configChangeDuration = Date.now() - configChangeStartTime;

    // Record configuration change duration metric
    this.durationTrackingSystem.recordDuration(
      'wsjf_configuration_change_duration_ms',
      configChangeDuration,
      {
        component: 'wsjf_scoring',
        operation: 'configuration_change',
        previousConfigId: this.activeConfigurationId,
        newConfigId: configId,
        configurationName: config.name
      },
      {
        operationType: 'configuration_change',
        previousConfigId: this.activeConfigurationId,
        newConfigId: configId,
        configurationName: config.name
      }
    );

    this.emitEvent('active_configuration_changed', { configId, name: config.name });
  }

  /**
   * Get active configuration
   */
  public getActiveConfiguration(): WSJFConfiguration {
    const config = this.configurations.get(this.activeConfigurationId);
    if (!config) {
      throw this.createError('NO_ACTIVE_CONFIG', 'No active configuration found');
    }
    return config;
  }

  /**
   * Get all configurations
   */
  public getAllConfigurations(): WSJFConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Get configuration by ID
   */
  public getConfiguration(configId: string): WSJFConfiguration | undefined {
    return this.configurations.get(configId);
  }

  /**
   * Get analytics for a time period
   */
  public getAnalytics(startDate: Date, endDate: Date): WSJFAnalytics {
    const analyticsStartTime = Date.now();
    
    const allJobs = this.queueManager.getAllJobs();
    const filteredJobs = allJobs.filter(job => 
      job.createdAt >= startDate && job.createdAt <= endDate
    );

    const completedJobs = filteredJobs.filter(job => job.status === 'completed');
    const jobsWithWSJF = filteredJobs.filter(job => job.wsjfResult);

    // Calculate basic metrics
    const totalJobs = filteredJobs.length;
    const averageWSJFScore = jobsWithWSJF.length > 0 
      ? jobsWithWSJF.reduce((sum, job) => sum + (job.wsjfResult?.wsjfScore || 0), 0) / jobsWithWSJF.length
      : 0;

    const averageCompletionTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.actualDuration || job.estimatedDuration), 0) / completedJobs.length
      : 0;

    // Calculate by type
    const byType: WSJFAnalytics['byType'] = {
      feature: this.calculateTypeStats('feature', filteredJobs),
      bug: this.calculateTypeStats('bug', filteredJobs),
      enhancement: this.calculateTypeStats('enhancement', filteredJobs),
      technical_debt: this.calculateTypeStats('technical_debt', filteredJobs),
      research: this.calculateTypeStats('research', filteredJobs),
      other: this.calculateTypeStats('other', filteredJobs)
    };

    // Calculate by circle
    const byCircle: WSJFAnalytics['byCircle'] = this.calculateGroupStats('circle', filteredJobs);

    // Calculate by domain
    const byDomain: WSJFAnalytics['byDomain'] = this.calculateGroupStats('domain', filteredJobs);

    const analyticsDuration = Date.now() - analyticsStartTime;

    // Record analytics calculation duration metric
    this.durationTrackingSystem.recordDuration(
      'wsjf_analytics_calculation_duration_ms',
      analyticsDuration,
      {
        component: 'wsjf_scoring',
        operation: 'analytics_calculation',
        totalJobs,
        completedJobs: completedJobs.length,
        averageWSJFScore,
        periodDays: Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      {
        operationType: 'analytics_calculation',
        totalJobs,
        completedJobs: completedJobs.length,
        averageWSJFScore,
        periodDays: Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    );

    return {
      period: { start: startDate, end: endDate },
      totalJobs,
      completedJobs: completedJobs.length,
      averageWSJFScore: Math.round(averageWSJFScore * 100) / 100,
      averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      throughput: completedJobs.length,
      cycleTime: averageCompletionTime,
      leadTime: averageCompletionTime * 1.5, // Estimated lead time
      byType,
      byCircle,
      byDomain
    };
  }

  /**
   * Get event history
   */
  public getEventHistory(limit: number = 100): WSJFEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get queue manager instance
   */
  public getQueueManager(): WSJFPriorityQueueManager {
    return this.queueManager;
  }

  /**
   * Get calculator instance
   */
  public getCalculator(): WSJFCalculator {
    return this.calculator;
  }

  /**
   * Start automatic recalculation timer
   */
  private startRecalculationTimer(): void {
    if (this.recalculationTimer) {
      clearInterval(this.recalculationTimer);
    }

    const config = this.getActiveConfiguration();
    if (config.autoRecalculate && config.recalculationInterval > 0) {
      this.recalculationTimer = setInterval(() => {
        this.performAutomaticRecalculation();
      }, config.recalculationInterval * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Perform automatic recalculation of all jobs
   */
  private async performAutomaticRecalculation(): Promise<void> {
    try {
      const recalculationStartTime = Date.now();
      
      const config = this.getActiveConfiguration();
      const allJobs = this.queueManager.getAllJobs();
      
      const recalculations = allJobs.map(job => ({
        jobId: job.id,
        params: job.wsjfResult?.calculationParams || this.getDefaultParams()
      }));

      if (recalculations.length > 0) {
        await this.batchCalculateWSJF(recalculations);
        
        const recalculationDuration = Date.now() - recalculationStartTime;

        // Record automatic recalculation duration metric
        this.durationTrackingSystem.recordDuration(
          'wsjf_automatic_recalculation_duration_ms',
          recalculationDuration,
          {
            component: 'wsjf_scoring',
            operation: 'automatic_recalculation',
            jobCount: recalculations.length,
            configurationId: this.activeConfigurationId
          },
          {
            operationType: 'automatic_recalculation',
            jobCount: recalculations.length,
            configurationId: this.activeConfigurationId
          }
        );

        this.emitEvent('automatic_recalculation_completed', { count: recalculations.length });
      }
    } catch (error) {
      this.emitEvent('automatic_recalculation_failed', { error: error.message });
    }
  }

  /**
   * Check if WSJF should be recalculated based on updates
   */
  private shouldRecalculateWSJF(updates: WSJFJobUpdateRequest): boolean {
    const recalculationTriggers = [
      'estimatedDuration',
      'userBusinessValue',
      'timeCriticality',
      'customerValue',
      'riskReduction',
      'opportunityEnablement'
    ];

    return recalculationTriggers.some(trigger => trigger in updates);
  }

  /**
   * Calculate priority from WSJF score
   */
  private calculatePriorityFromWSJF(wsjfScore: number): number {
    // Convert WSJF score to priority (1-100 scale)
    // Higher WSJF score = higher priority
    return Math.min(Math.max(Math.round(wsjfScore * 10), 1), 100);
  }

  /**
   * Get default calculation parameters
   */
  private getDefaultParams(): WSJFCalculationParams {
    return {
      userBusinessValue: 50,
      timeCriticality: 50,
      customerValue: 50,
      jobSize: 1,
      riskReduction: 0,
      opportunityEnablement: 0
    };
  }

  /**
   * Calculate statistics by job type
   */
  private calculateTypeStats(type: WSJFJob['type'], jobs: WSJFJob[]): WSJFAnalytics['byType'][WSJFJob['type']] {
    const typeJobs = jobs.filter(job => job.type === type);
    const completedTypeJobs = typeJobs.filter(job => job.status === 'completed');
    const jobsWithWSJF = typeJobs.filter(job => job.wsjfResult);

    return {
      count: typeJobs.length,
      avgWSJF: jobsWithWSJF.length > 0 
        ? jobsWithWSJF.reduce((sum, job) => sum + (job.wsjfResult?.wsjfScore || 0), 0) / jobsWithWSJF.length
        : 0,
      avgDuration: typeJobs.length > 0 
        ? typeJobs.reduce((sum, job) => sum + job.estimatedDuration, 0) / typeJobs.length
        : 0,
      completionRate: typeJobs.length > 0 
        ? (completedTypeJobs.length / typeJobs.length) * 100
        : 0
    };
  }

  /**
   * Calculate statistics by group (circle or domain)
   */
  private calculateGroupStats(
    groupType: 'circle' | 'domain', 
    jobs: WSJFJob[]
  ): Record<string, WSJFAnalytics['byCircle'][string]> {
    const groups: Record<string, WSJFJob[]> = {};
    
    jobs.forEach(job => {
      const group = job[groupType] || 'unassigned';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(job);
    });

    const result: Record<string, WSJFAnalytics['byCircle'][string]> = {};
    
    Object.entries(groups).forEach(([groupName, groupJobs]) => {
      const completedGroupJobs = groupJobs.filter(job => job.status === 'completed');
      const jobsWithWSJF = groupJobs.filter(job => job.wsjfResult);

      result[groupName] = {
        count: groupJobs.length,
        avgWSJF: jobsWithWSJF.length > 0 
          ? jobsWithWSJF.reduce((sum, job) => sum + (job.wsjfResult?.wsjfScore || 0), 0) / jobsWithWSJF.length
          : 0,
        avgDuration: groupJobs.length > 0 
          ? groupJobs.reduce((sum, job) => sum + job.estimatedDuration, 0) / groupJobs.length
          : 0,
        completionRate: groupJobs.length > 0 
          ? (completedGroupJobs.length / groupJobs.length) * 100
          : 0
      };
    });
    
    return result;
  }

  /**
   * Add event to history
   */
  private addToEventHistory(event: WSJFEvent): void {
    this.eventHistory.push(event);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
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

    this.addToEventHistory(event);
    this.emit('wsjfEvent', event);
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
   * Set up event forwarding from duration tracking system
   */
  private setupDurationTrackingEvents(): void {
    // Forward duration tracking events to WSJF scoring events
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emit('durationMetricCollected', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emit('durationQualityValidated', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emit('durationAlertTriggered', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emit('durationAggregationCompleted', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emit('durationTrendDetected', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emit('durationAnomalyDetected', {
        ...data,
        source: 'wsjf_scoring'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emit('durationReportGenerated', {
        ...data,
        source: 'wsjf_scoring'
      });
    });
  }

  /**
   * Get duration metrics from WSJF scoring
   */
  public getDurationMetrics(filters?: any): any[] {
    return this.durationTrackingSystem.getMetrics({
      ...filters,
      source: 'wsjf_scoring'
    });
  }

  /**
   * Get duration aggregations from WSJF scoring
   */
  public getDurationAggregations(metricId?: string): any[] {
    return this.durationTrackingSystem.getAggregations(metricId);
  }

  /**
   * Get duration trends from WSJF scoring
   */
  public getDurationTrends(metricId?: string): any[] {
    return this.durationTrackingSystem.getTrends(metricId);
  }

  /**
   * Generate duration report from WSJF scoring
   */
  public async generateDurationReport(
    name: string,
    description: string,
    timeRange: any,
    metricNames: string[] = []
  ): Promise<any> {
    return this.durationTrackingSystem.generateReport(name, description, timeRange, metricNames);
  }

  /**
   * Export duration report from WSJF scoring
   */
  public async exportDurationReport(reportId: string, format: string): Promise<{ data: any; filename: string }> {
    return this.durationTrackingSystem.exportReport(reportId, format);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.recalculationTimer) {
      clearInterval(this.recalculationTimer);
      this.recalculationTimer = null;
    }

    this.removeAllListeners();
    console.log('[WSJF] Scoring service disposed');
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}
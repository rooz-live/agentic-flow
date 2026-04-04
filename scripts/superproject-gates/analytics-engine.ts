/**
 * Analytics Engine
 * 
 * Handles data processing, query execution, and analytics
 * with support for complex queries, funnel analysis, and reporting
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  AnalyticsQuery,
  QueryParameter,
  AnalyticsReport,
  ReportSchedule,
  FunnelAnalysis,
  FunnelStep,
  UserBehaviorAnalytics,
  MonitoringError,
  MetricValue,
  TimeRange,
  Environment
} from '../types';

export interface AnalyticsEngineConfig {
  queryTimeout: number; // in seconds
  maxConcurrentQueries: number;
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds
  batchSize: number;
  enablePredictive: boolean;
}

export interface QueryContext {
  queryId: string;
  parameters: Record<string, any>;
  timeRange?: TimeRange;
  environment?: Environment;
  userId?: string;
  startTime: Date;
}

export interface QueryResult {
  queryId: string;
  data: any[];
  metadata: {
    executionTime: number;
    rowCount: number;
    cached: boolean;
    timestamp: Date;
  };
  error?: string;
}

export interface FunnelResult {
  funnelId: string;
  steps: Array<{
    step: FunnelStep;
    count: number;
    conversionRate: number;
    dropoffRate: number;
    averageTime: number;
  }>;
  overallConversionRate: number;
  totalUsers: number;
  timeRange: TimeRange;
  timestamp: Date;
}

export class AnalyticsEngine extends EventEmitter {
  private queries: Map<string, AnalyticsQuery> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private funnels: Map<string, FunnelAnalysis> = new Map();
  private userBehavior: UserBehaviorAnalytics[] = [];
  private queryCache: Map<string, { result: QueryResult; expires: Date }> = new Map();
  private activeQueries: Map<string, Promise<QueryResult>> = new Map();
  private reportSchedule?: NodeJS.Timeout;

  constructor(
    private config: AnalyticsEngineConfig,
    private dataProvider: DataProvider
  ) {
    super();
  }

  /**
   * Start analytics engine
   */
  public async start(): Promise<void> {
    console.log('[ANALYTICS_ENGINE] Starting analytics engine');

    // Initialize default queries
    await this.initializeDefaultQueries();

    // Initialize default funnels
    await this.initializeDefaultFunnels();

    // Start report scheduling
    this.startReportScheduling();

    console.log('[ANALYTICS_ENGINE] Started successfully');
    this.emit('started');
  }

  /**
   * Stop analytics engine
   */
  public async stop(): Promise<void> {
    console.log('[ANALYTICS_ENGINE] Stopping analytics engine');

    // Stop report scheduling
    if (this.reportSchedule) {
      clearInterval(this.reportSchedule);
      this.reportSchedule = undefined;
    }

    // Wait for active queries to complete
    const activeQueryPromises = Array.from(this.activeQueries.values());
    if (activeQueryPromises.length > 0) {
      console.log(`[ANALYTICS_ENGINE] Waiting for ${activeQueryPromises.length} active queries to complete`);
      await Promise.allSettled(activeQueryPromises);
    }

    console.log('[ANALYTICS_ENGINE] Stopped');
    this.emit('stopped');
  }

  /**
   * Create a new analytics query
   */
  public async createQuery(
    name: string,
    description: string,
    query: string,
    type: 'sql' | 'promql' | 'custom' = 'sql',
    parameters?: QueryParameter[]
  ): Promise<AnalyticsQuery> {
    const newQuery: AnalyticsQuery = {
      id: this.generateId('query'),
      name,
      description,
      query,
      type,
      parameters: parameters || [],
      cacheTTL: this.config.cacheTTL,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queries.set(newQuery.id, newQuery);

    console.log(`[ANALYTICS_ENGINE] Created query: ${newQuery.name} (${newQuery.id})`);
    this.emit('queryCreated', { query: newQuery });

    return newQuery;
  }

  /**
   * Execute an analytics query
   */
  public async executeQuery(
    queryId: string,
    parameters: Record<string, any> = {},
    timeRange?: TimeRange,
    environment?: Environment
  ): Promise<QueryResult> {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new MonitoringError(
        `Query not found: ${queryId}`,
        'QUERY_NOT_FOUND',
        { queryId }
      );
    }

    // Check cache
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(queryId, parameters, timeRange, environment);
      const cached = this.queryCache.get(cacheKey);
      if (cached && cached.expires > new Date()) {
        console.log(`[ANALYTICS_ENGINE] Cache hit for query: ${query.name}`);
        return {
          ...cached.result,
          metadata: {
            ...cached.result.metadata,
            cached: true
          }
        };
      }
    }

    // Check concurrent query limit
    if (this.activeQueries.size >= this.config.maxConcurrentQueries) {
      throw new MonitoringError(
        'Maximum concurrent queries reached',
        'MAX_CONCURRENT_QUERIES'
      );
    }

    const context: QueryContext = {
      queryId,
      parameters,
      timeRange,
      environment,
      startTime: new Date()
    };

    console.log(`[ANALYTICS_ENGINE] Executing query: ${query.name}`);

    const queryPromise = this.executeQueryInternal(query, context);
    this.activeQueries.set(queryId, queryPromise);

    try {
      const result = await Promise.race([
        queryPromise,
        new Promise<QueryResult>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), this.config.queryTimeout * 1000)
        )
      ]);

      this.activeQueries.delete(queryId);

      // Cache result
      if (this.config.cacheEnabled && !result.error) {
        const cacheKey = this.generateCacheKey(queryId, parameters, timeRange, environment);
        const expires = new Date(Date.now() + (query.cacheTTL || this.config.cacheTTL) * 1000);
        this.queryCache.set(cacheKey, { result, expires });
      }

      console.log(`[ANALYTICS_ENGINE] Query completed: ${query.name} (${result.metadata.rowCount} rows in ${result.metadata.executionTime}ms)`);
      this.emit('queryExecuted', { query, result, context });

      return result;

    } catch (error) {
      this.activeQueries.delete(queryId);
      
      const errorResult: QueryResult = {
        queryId,
        data: [],
        metadata: {
          executionTime: this.config.queryTimeout * 1000,
          rowCount: 0,
          cached: false,
          timestamp: new Date()
        },
        error: error instanceof Error ? error.message : String(error)
      };

      console.error(`[ANALYTICS_ENGINE] Query failed: ${query.name}:`, error);
      this.emit('queryFailed', { query, error, context });

      return errorResult;
    }
  }

  /**
   * Create a funnel analysis
   */
  public async createFunnel(
    name: string,
    description: string,
    steps: FunnelStep[],
    timeRange?: TimeRange
  ): Promise<FunnelAnalysis> {
    const funnel: FunnelAnalysis = {
      id: this.generateId('funnel'),
      name,
      description,
      steps,
      timeRange: timeRange || { preset: 'last_day' },
      createdAt: new Date()
    };

    this.funnels.set(funnel.id, funnel);

    console.log(`[ANALYTICS_ENGINE] Created funnel: ${funnel.name} (${funnel.id})`);
    this.emit('funnelCreated', { funnel });

    return funnel;
  }

  /**
   * Analyze a funnel
   */
  public async analyzeFunnel(
    funnelId: string,
    timeRange?: TimeRange,
    filters?: Record<string, any>
  ): Promise<FunnelResult> {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new MonitoringError(
        `Funnel not found: ${funnelId}`,
        'FUNNEL_NOT_FOUND',
        { funnelId }
      );
    }

    console.log(`[ANALYTICS_ENGINE] Analyzing funnel: ${funnel.name}`);

    const analysisTimeRange = timeRange || funnel.timeRange;
    const results: FunnelResult['steps'] = [];
    let totalUsers = 0;

    // Analyze each step
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const stepResult = await this.analyzeFunnelStep(funnel, step, i, analysisTimeRange, filters);
      results.push(stepResult);
      
      if (i === 0) {
        totalUsers = stepResult.count;
      }
    }

    // Calculate overall conversion rate
    const finalStep = results[results.length - 1];
    const overallConversionRate = totalUsers > 0 ? (finalStep.count / totalUsers) * 100 : 0;

    const funnelResult: FunnelResult = {
      funnelId,
      steps: results,
      overallConversionRate,
      totalUsers,
      timeRange: analysisTimeRange,
      timestamp: new Date()
    };

    console.log(`[ANALYTICS_ENGINE] Funnel analysis completed: ${funnel.name} (${overallConversionRate.toFixed(1)}% overall conversion)`);
    this.emit('funnelAnalyzed', { funnel, result: funnelResult });

    return funnelResult;
  }

  /**
   * Create a scheduled report
   */
  public async createReport(
    name: string,
    description: string,
    type: 'scheduled' | 'on_demand' = 'on_demand',
    queries: Array<{
      queryId: string;
      name: string;
      visualization?: {
        type: string;
        configuration: Record<string, any>;
      };
    }>,
    recipients: string[] = [],
    format: 'html' | 'pdf' | 'csv' | 'json' = 'html',
    schedule?: ReportSchedule
  ): Promise<AnalyticsReport> {
    const report: AnalyticsReport = {
      id: this.generateId('report'),
      name,
      description,
      type,
      schedule,
      queries,
      recipients,
      format,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reports.set(report.id, report);

    console.log(`[ANALYTICS_ENGINE] Created report: ${report.name} (${report.id})`);
    this.emit('reportCreated', { report });

    return report;
  }

  /**
   * Generate a report
   */
  public async generateReport(
    reportId: string,
    parameters: Record<string, any> = {},
    timeRange?: TimeRange
  ): Promise<{
    reportId: string;
    data: Array<{
      queryName: string;
      data: any[];
      visualization?: any;
    }>;
    metadata: {
      generatedAt: Date;
      format: string;
      totalRows: number;
      executionTime: number;
    };
  }> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new MonitoringError(
        `Report not found: ${reportId}`,
        'REPORT_NOT_FOUND',
        { reportId }
      );
    }

    console.log(`[ANALYTICS_ENGINE] Generating report: ${report.name}`);

    const startTime = Date.now();
    const reportData = [];
    let totalRows = 0;

    // Execute all queries in the report
    for (const queryConfig of report.queries) {
      try {
        const result = await this.executeQuery(
          queryConfig.queryId,
          parameters,
          timeRange
        );

        reportData.push({
          queryName: queryConfig.name,
          data: result.data,
          visualization: queryConfig.visualization
        });

        totalRows += result.metadata.rowCount;

      } catch (error) {
        console.error(`[ANALYTICS_ENGINE] Error executing query ${queryConfig.name} for report ${report.name}:`, error);
        reportData.push({
          queryName: queryConfig.name,
          data: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const executionTime = Date.now() - startTime;

    const reportResult = {
      reportId,
      data: reportData,
      metadata: {
        generatedAt: new Date(),
        format: report.format,
        totalRows,
        executionTime
      }
    };

    console.log(`[ANALYTICS_ENGINE] Report generated: ${report.name} (${totalRows} rows in ${executionTime}ms)`);
    this.emit('reportGenerated', { report, result: reportResult });

    return reportResult;
  }

  /**
   * Track user behavior event
   */
  public trackUserBehavior(
    event: UserBehaviorAnalytics
  ): void {
    this.userBehavior.push(event);

    // Keep only recent events (last 10000)
    if (this.userBehavior.length > 10000) {
      this.userBehavior.splice(0, this.userBehavior.length - 10000);
    }

    this.emit('userBehaviorTracked', { event });
  }

  /**
   * Get user behavior analytics
   */
  public getUserBehaviorAnalytics(
    filters?: {
      userId?: string;
      sessionId?: string;
      event?: string;
      timeRange?: TimeRange;
      environment?: Environment;
    }
  ): UserBehaviorAnalytics[] {
    let events = [...this.userBehavior];

    // Apply filters
    if (filters) {
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.sessionId) {
        events = events.filter(e => e.sessionId === filters.sessionId);
      }
      if (filters.event) {
        events = events.filter(e => e.event === filters.event);
      }
      if (filters.timeRange) {
        const { start, end } = filters.timeRange;
        events = events.filter(e => e.timestamp >= start && e.timestamp <= end);
      }
      if (filters.environment) {
        events = events.filter(e => e.environment === filters.environment);
      }
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }

  /**
   * Get all queries
   */
  public getQueries(): AnalyticsQuery[] {
    return Array.from(this.queries.values());
  }

  /**
   * Get query by ID
   */
  public getQuery(id: string): AnalyticsQuery | undefined {
    return this.queries.get(id);
  }

  /**
   * Get all reports
   */
  public getReports(): AnalyticsReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get report by ID
   */
  public getReport(id: string): AnalyticsReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Get all funnels
   */
  public getFunnels(): FunnelAnalysis[] {
    return Array.from(this.funnels.values());
  }

  /**
   * Get funnel by ID
   */
  public getFunnel(id: string): FunnelAnalysis | undefined {
    return this.funnels.get(id);
  }

  /**
   * Execute query internally
   */
  private async executeQueryInternal(
    query: AnalyticsQuery,
    context: QueryContext
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      let data: any[] = [];

      switch (query.type) {
        case 'sql':
          data = await this.dataProvider.executeSQL(query.query, context);
          break;
        case 'promql':
          data = await this.dataProvider.executePromQL(query.query, context);
          break;
        case 'custom':
          data = await this.dataProvider.executeCustom(query.query, context);
          break;
        default:
          throw new MonitoringError(
            `Unsupported query type: ${query.type}`,
            'UNSUPPORTED_QUERY_TYPE',
            { queryType: query.type }
          );
      }

      const executionTime = Date.now() - startTime;

      return {
        queryId: query.id,
        data,
        metadata: {
          executionTime,
          rowCount: data.length,
          cached: false,
          timestamp: new Date()
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        queryId: query.id,
        data: [],
        metadata: {
          executionTime,
          rowCount: 0,
          cached: false,
          timestamp: new Date()
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Analyze a single funnel step
   */
  private async analyzeFunnelStep(
    funnel: FunnelAnalysis,
    step: FunnelStep,
    stepIndex: number,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<FunnelResult['steps'][0]> {
    // Get users who completed this step
    const stepUsers = await this.dataProvider.getFunnelStepUsers(
      funnel,
      step,
      timeRange,
      filters
    );

    // Get users who completed previous step (for conversion calculation)
    let previousStepUsers = 0;
    if (stepIndex > 0) {
      const previousStep = funnel.steps[stepIndex - 1];
      previousStepUsers = await this.dataProvider.getFunnelStepUsers(
        funnel,
        previousStep,
        timeRange,
        filters
      );
    }

    // Calculate metrics
    const count = stepUsers.length;
    const conversionRate = previousStepUsers > 0 ? (count / previousStepUsers) * 100 : 100;
    const dropoffRate = 100 - conversionRate;
    const averageTime = await this.dataProvider.getFunnelStepAverageTime(
      funnel,
      step,
      timeRange,
      filters
    );

    return {
      step,
      count,
      conversionRate,
      dropoffRate,
      averageTime
    };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    queryId: string,
    parameters: Record<string, any>,
    timeRange?: TimeRange,
    environment?: Environment
  ): string {
    const key = {
      queryId,
      parameters,
      timeRange,
      environment
    };
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Start report scheduling
   */
  private startReportScheduling(): void {
    this.reportSchedule = setInterval(async () => {
      await this.processScheduledReports();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Process scheduled reports
   */
  private async processScheduledReports(): Promise<void> {
    const now = new Date();
    const scheduledReports = Array.from(this.reports.values())
      .filter(report => report.type === 'scheduled' && report.schedule);

    for (const report of scheduledReports) {
      if (this.shouldRunReport(report, now)) {
        try {
          await this.generateReport(report.id);
          console.log(`[ANALYTICS_ENGINE] Scheduled report executed: ${report.name}`);
          this.emit('scheduledReportExecuted', { report, timestamp: now });
        } catch (error) {
          console.error(`[ANALYTICS_ENGINE] Error executing scheduled report ${report.name}:`, error);
          this.emit('scheduledReportFailed', { report, error, timestamp: now });
        }
      }
    }
  }

  /**
   * Check if a report should run
   */
  private shouldRunReport(report: AnalyticsReport, now: Date): boolean {
    if (!report.schedule) {
      return false;
    }

    const { frequency, timezone, time, dayOfWeek, dayOfMonth } = report.schedule;

    // Convert to report timezone
    const reportTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    switch (frequency) {
      case 'hourly':
        return reportTime.getMinutes() === now.getMinutes();
      
      case 'daily':
        return reportTime.getHours() === parseInt(time.split(':')[0]) &&
               reportTime.getMinutes() === parseInt(time.split(':')[1]);
      
      case 'weekly':
        return reportTime.getDay() === (dayOfWeek || 1) &&
               reportTime.getHours() === parseInt(time.split(':')[0]) &&
               reportTime.getMinutes() === parseInt(time.split(':')[1]);
      
      case 'monthly':
        return reportTime.getDate() === (dayOfMonth || 1) &&
               reportTime.getHours() === parseInt(time.split(':')[0]) &&
               reportTime.getMinutes() === parseInt(time.split(':')[1]);
      
      default:
        return false;
    }
  }

  /**
   * Initialize default queries
   */
  private async initializeDefaultQueries(): Promise<void> {
    console.log('[ANALYTICS_ENGINE] Initializing default queries');

    // System performance query
    await this.createQuery(
      'System Performance Overview',
      'Overview of system performance metrics',
      'SELECT timestamp, cpu_usage, memory_usage, disk_usage FROM system_metrics WHERE timestamp >= $start_time AND timestamp <= $end_time ORDER BY timestamp DESC',
      'sql',
      [
        { name: 'start_time', type: 'date', required: true },
        { name: 'end_time', type: 'date', required: true }
      ]
    );

    // User activity query
    await this.createQuery(
      'User Activity Summary',
      'Summary of user activity by time period',
      'SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as active_users, COUNT(*) as total_events FROM user_behavior WHERE timestamp >= $start_date AND timestamp <= $end_date GROUP BY DATE(timestamp) ORDER BY date DESC',
      'sql',
      [
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true }
      ]
    );

    // Error analysis query
    await this.createQuery(
      'Error Analysis',
      'Analysis of system errors by type and frequency',
      'SELECT error_type, COUNT(*) as error_count, AVG(error_duration) as avg_duration FROM error_logs WHERE timestamp >= $start_time AND timestamp <= $end_time GROUP BY error_type ORDER BY error_count DESC',
      'sql',
      [
        { name: 'start_time', type: 'date', required: true },
        { name: 'end_time', type: 'date', required: true }
      ]
    );
  }

  /**
   * Initialize default funnels
   */
  private async initializeDefaultFunnels(): Promise<void> {
    console.log('[ANALYTICS_ENGINE] Initializing default funnels');

    // User registration funnel
    await this.createFunnel(
      'User Registration Funnel',
      'Tracks user conversion through registration process',
      [
        {
          name: 'Visit Landing Page',
          event: 'page_view',
          conditions: { page: '/landing' },
          order: 1
        },
        {
          name: 'Start Registration',
          event: 'registration_start',
          order: 2
        },
        {
          name: 'Complete Registration',
          event: 'registration_complete',
          order: 3
        },
        {
          name: 'Verify Email',
          event: 'email_verified',
          order: 4
        }
      ],
      { preset: 'last_week' }
    );

    // Purchase funnel
    await this.createFunnel(
      'Purchase Funnel',
      'Tracks user conversion through purchase process',
      [
        {
          name: 'View Product',
          event: 'product_view',
          order: 1
        },
        {
          name: 'Add to Cart',
          event: 'add_to_cart',
          order: 2
        },
        {
          name: 'Start Checkout',
          event: 'checkout_start',
          order: 3
        },
        {
          name: 'Complete Purchase',
          event: 'purchase_complete',
          order: 4
        }
      ],
      { preset: 'last_month' }
    );
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
   * Get engine status
   */
  public getStatus(): {
    queriesCount: number;
    reportsCount: number;
    funnelsCount: number;
    activeQueriesCount: number;
    userBehaviorEventsCount: number;
    cacheSize: number;
  } {
    return {
      queriesCount: this.queries.size,
      reportsCount: this.reports.size,
      funnelsCount: this.funnels.size,
      activeQueriesCount: this.activeQueries.size,
      userBehaviorEventsCount: this.userBehavior.length,
      cacheSize: this.queryCache.size
    };
  }
}

/**
 * Data Provider Interface
 */
export interface DataProvider {
  executeSQL(query: string, context: QueryContext): Promise<any[]>;
  executePromQL(query: string, context: QueryContext): Promise<any[]>;
  executeCustom(query: string, context: QueryContext): Promise<any[]>;
  getFunnelStepUsers(funnel: FunnelAnalysis, step: FunnelStep, timeRange: TimeRange, filters?: Record<string, any>): Promise<string[]>;
  getFunnelStepAverageTime(funnel: FunnelAnalysis, step: FunnelStep, timeRange: TimeRange, filters?: Record<string, any>): Promise<number>;
}
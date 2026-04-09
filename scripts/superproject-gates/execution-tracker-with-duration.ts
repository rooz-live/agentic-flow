/**
 * Enhanced Execution Tracker with Duration_ms Integration
 * 
 * This file extends the original execution tracker with standardized
 * duration_ms metric emission capabilities
 */

import { EventEmitter } from 'events';
import { 
  ExecutionTrackerSystem as BaseExecutionTrackerSystem,
  ExecutionTrackerConfig,
  ExecutionMetrics,
  ExecutionState,
  ExecutionContext,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionTrackingError
} from './execution-tracker';
import { DurationTrackingSystem } from '../duration-tracking';
import { DurationMetric } from '../duration-tracking/types';

export class ExecutionTrackerSystemWithDuration extends BaseExecutionTrackerSystem {
  private durationTrackingSystem: DurationTrackingSystem;

  constructor(
    orchestrationFramework: any,
    wsjfService?: any
  ) {
    // Initialize base system
    super(orchestrationFramework, wsjfService);
    
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
            id: 'execution_duration_threshold',
            name: 'Execution Duration Threshold',
            description: 'Alert when execution duration exceeds threshold',
            enabled: true,
            environment: ['development', 'staging', 'production'],
            conditions: [
              {
                metricId: 'execution_duration',
                operator: 'gt',
                threshold: 300000, // 5 minutes
                duration: 5, // 5 minutes
                aggregation: 'average'
              }
            ],
            actions: [
              {
                type: 'notify',
                description: 'Notify team of long execution duration'
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
            }
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
            name: 'execution_tracker',
            type: 'execution_tracker',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'duration',
              targetField: 'durationMs',
              transformation: 'duration * 1000',
              required: true
            }
          }
        ],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      }
    });

    // Set up event forwarding
    this.setupDurationTrackingEvents();
  }

  /**
   * Start the enhanced execution tracking system
   */
  public async start(): Promise<void> {
    console.log('[EXECUTION_TRACKER_WITH_DURATION] Starting enhanced execution tracking system');

    // Start base system
    await super.start();

    // Start duration tracking system
    await this.durationTrackingSystem.start();

    console.log('[EXECUTION_TRACKER_WITH_DURATION] Enhanced execution tracking system started');
  }

  /**
   * Stop the enhanced execution tracking system
   */
  public async stop(): Promise<void> {
    console.log('[EXECUTION_TRACKER_WITH_DURATION] Stopping enhanced execution tracking system');

    // Stop duration tracking system
    await this.durationTrackingSystem.stop();

    // Stop base system
    await super.stop();

    console.log('[EXECUTION_TRACKER_WITH_DURATION] Enhanced execution tracking system stopped');
  }

  /**
   * Enhanced track execution with duration_ms emission
   */
  public async trackExecution(doId: string, context: Partial<ExecutionContext> = {}): Promise<ExecutionState> {
    // Track execution using base system
    const executionState = await super.trackExecution(doId, context);

    // Record duration metric for execution start
    this.durationTrackingSystem.recordDuration(
      'execution_start',
      0, // Start event has 0 duration
      {
        component: 'execution_tracker',
        operation: 'track_execution',
        doId,
        planId: context.planId
      },
      {
        operationType: 'execution_start',
        doId,
        planId: context.planId
      }
    );

    return executionState;
  }

  /**
   * Enhanced update execution state with duration_ms emission
   */
  public async updateExecutionState(
    executionId: string, 
    updates: Partial<ExecutionState>
  ): Promise<ExecutionState> {
    // Get previous state for comparison
    const previousState = this.getExecutionState(executionId);
    const previousStatus = previousState?.status;

    // Update state using base system
    const executionState = await super.updateExecutionState(executionId, updates);

    // Calculate duration if status changed to completed
    if (updates.status === 'completed' && previousStatus !== 'completed' && executionState.endTime) {
      const duration = executionState.endTime.getTime() - executionState.startTime.getTime();
      
      // Record duration metric for execution completion
      this.durationTrackingSystem.recordDuration(
        'execution_complete',
        duration,
        {
          component: 'execution_tracker',
          operation: 'complete_execution',
          doId: executionState.context.doId,
          planId: executionState.context.planId,
          executionId: executionState.id
        },
        {
          operationType: 'execution_complete',
          doId: executionState.context.doId,
          planId: executionState.context.planId,
          executionId: executionState.id,
          expectedDurationMs: executionState.context.estimatedDuration,
          actualDurationMs: duration
        }
      );
    }

    return executionState;
  }

  /**
   * Enhanced complete execution with duration_ms emission
   */
  public async completeExecution(
    executionId: string, 
    outcomes: any[] = [], 
    learnings: string[] = []
  ): Promise<any> {
    // Complete execution using base system
    const act = await super.completeExecution(executionId, outcomes, learnings);

    // Record duration metric for act creation
    this.durationTrackingSystem.recordDuration(
      'act_creation',
      5, // Small duration for act creation
      {
        component: 'execution_tracker',
        operation: 'create_act',
        doId: this.getExecutionState(executionId)?.context.doId,
        planId: this.getExecutionState(executionId)?.context.planId,
        executionId,
        actId: act.id
      },
      {
        operationType: 'act_creation',
        doId: this.getExecutionState(executionId)?.context.doId,
        planId: this.getExecutionState(executionId)?.context.planId,
        executionId,
        actId: act.id
      }
    );

    return act;
  }

  /**
   * Get duration metrics from execution tracking
   */
  public getDurationMetrics(filters?: any): DurationMetric[] {
    return this.durationTrackingSystem.getMetrics({
      ...filters,
      source: 'execution_tracker'
    });
  }

  /**
   * Get duration aggregations from execution tracking
   */
  public getDurationAggregations(metricId?: string): any[] {
    return this.durationTrackingSystem.getAggregations(metricId);
  }

  /**
   * Get duration trends from execution tracking
   */
  public getDurationTrends(metricId?: string): any[] {
    return this.durationTrackingSystem.getTrends(metricId);
  }

  /**
   * Get duration quality history from execution tracking
   */
  public getDurationQualityHistory(metricId?: string): any[] {
    return this.durationTrackingSystem.getQualityHistory(metricId);
  }

  /**
   * Generate duration report from execution tracking
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
   * Export duration report from execution tracking
   */
  public async exportDurationReport(reportId: string, format: string): Promise<{ data: any; filename: string }> {
    return this.durationTrackingSystem.exportReport(reportId, format);
  }

  /**
   * Get system status including duration tracking
   */
  public getSystemStatus(): any {
    const baseStatus = super.getSystemStatus();
    const durationStatus = this.durationTrackingSystem.getSystemStatus();

    return {
      ...baseStatus,
      durationTracking: {
        isRunning: durationStatus.isRunning,
        components: durationStatus.components,
        metrics: durationStatus.metrics
      }
    };
  }

  /**
   * Set up event forwarding from duration tracking system
   */
  private setupDurationTrackingEvents(): void {
    // Forward duration tracking events to execution tracker events
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emit('durationMetricCollected', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emit('durationQualityValidated', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emit('durationAlertTriggered', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emit('durationAggregationCompleted', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emit('durationTrendDetected', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emit('durationAnomalyDetected', {
        ...data,
        source: 'execution_tracker'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emit('durationReportGenerated', {
        ...data,
        source: 'execution_tracker'
      });
    });
  }
}

// Export the enhanced class as default
export default ExecutionTrackerSystemWithDuration;
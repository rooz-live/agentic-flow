/**
 * WSJF Scoring Service
 *
 * Provides high-level WSJF scoring functionality with configurable parameters,
 * real-time recalculation, and integration with orchestration framework
 */
import { EventEmitter } from 'events';
import { WSJFCalculator } from './calculator';
import { WSJFPriorityQueueManager } from './priority-queue';
import { WSJFJob, WSJFResult, WSJFConfiguration, WSJFCalculationParams, WSJFWeightingFactors, WSJFEvent, WSJFAnalytics, WSJFJobCreateRequest, WSJFJobUpdateRequest } from './types';
export declare class WSJFScoringService extends EventEmitter {
    private calculator;
    private queueManager;
    private configurations;
    private activeConfigurationId;
    private recalculationTimer;
    private eventHistory;
    private durationTrackingSystem;
    constructor();
    /**
     * Initialize WSJF scoring service
     */
    private initializeService;
    /**
     * Set up event listeners for queue manager
     */
    private setupEventListeners;
    /**
     * Create a new job with WSJF calculation
     */
    createJob(request: WSJFJobCreateRequest, queueIds?: string[]): Promise<WSJFJob>;
    /**
     * Update an existing job and recalculate WSJF if needed
     */
    updateJob(jobId: string, updates: WSJFJobUpdateRequest, recalculateWSJF?: boolean): Promise<WSJFJob>;
    /**
     * Calculate WSJF for an existing job
     */
    calculateWSJF(jobId: string, params: WSJFCalculationParams, configurationId?: string): Promise<WSJFResult>;
    /**
     * Batch calculate WSJF for multiple jobs
     */
    batchCalculateWSJF(calculations: Array<{
        jobId: string;
        params: WSJFCalculationParams;
    }>, configurationId?: string): Promise<WSJFResult[]>;
    /**
     * Create or update WSJF configuration
     */
    createConfiguration(name: string, description: string, weightingFactors: Partial<WSJFWeightingFactors>, options?: Partial<Omit<WSJFConfiguration, 'id' | 'name' | 'description' | 'weightingFactors' | 'createdAt' | 'updatedAt'>>): WSJFConfiguration;
    /**
     * Update existing configuration
     */
    updateConfiguration(configId: string, updates: Partial<WSJFConfiguration>): WSJFConfiguration;
    /**
     * Set active configuration
     */
    setActiveConfiguration(configId: string): void;
    /**
     * Get active configuration
     */
    getActiveConfiguration(): WSJFConfiguration;
    /**
     * Get all configurations
     */
    getAllConfigurations(): WSJFConfiguration[];
    /**
     * Get configuration by ID
     */
    getConfiguration(configId: string): WSJFConfiguration | undefined;
    /**
     * Get analytics for a time period
     */
    getAnalytics(startDate: Date, endDate: Date): WSJFAnalytics;
    /**
     * Get event history
     */
    getEventHistory(limit?: number): WSJFEvent[];
    /**
     * Get queue manager instance
     */
    getQueueManager(): WSJFPriorityQueueManager;
    /**
     * Get calculator instance
     */
    getCalculator(): WSJFCalculator;
    /**
     * Start automatic recalculation timer
     */
    private startRecalculationTimer;
    /**
     * Perform automatic recalculation of all jobs
     */
    private performAutomaticRecalculation;
    /**
     * Check if WSJF should be recalculated based on updates
     */
    private shouldRecalculateWSJF;
    /**
     * Calculate priority from WSJF score
     */
    private calculatePriorityFromWSJF;
    /**
     * Get default calculation parameters
     */
    private getDefaultParams;
    /**
     * Calculate statistics by job type
     */
    private calculateTypeStats;
    /**
     * Calculate statistics by group (circle or domain)
     */
    private calculateGroupStats;
    /**
     * Add event to history
     */
    private addToEventHistory;
    /**
     * Emit WSJF event
     */
    private emitEvent;
    /**
     * Create standardized error object
     */
    private createError;
    /**
     * Set up event forwarding from duration tracking system
     */
    private setupDurationTrackingEvents;
    /**
     * Get duration metrics from WSJF scoring
     */
    getDurationMetrics(filters?: any): any[];
    /**
     * Get duration aggregations from WSJF scoring
     */
    getDurationAggregations(metricId?: string): any[];
    /**
     * Get duration trends from WSJF scoring
     */
    getDurationTrends(metricId?: string): any[];
    /**
     * Generate duration report from WSJF scoring
     */
    generateDurationReport(name: string, description: string, timeRange: any, metricNames?: string[]): Promise<any>;
    /**
     * Export duration report from WSJF scoring
     */
    exportDurationReport(reportId: string, format: string): Promise<{
        data: any;
        filename: string;
    }>;
    /**
     * Cleanup resources
     */
    dispose(): void;
    /**
     * Generate unique ID
     */
    private generateId;
}
//# sourceMappingURL=scoring-service.d.ts.map
/**
 * WSJF Priority Queue Management System
 *
 * Implements priority queue management for WSJF-scored jobs with real-time updates,
 * filtering, sorting, and capacity management capabilities
 */
import { EventEmitter } from 'events';
import { WSJFJob, WSJFResult, WSJFPriorityQueue, WSJFFilter } from './types';
export declare class WSJFPriorityQueueManager extends EventEmitter {
    private queues;
    private jobs;
    constructor();
    /**
     * Initialize default priority queue
     */
    private initializeDefaultQueue;
    /**
     * Create a new priority queue
     */
    createQueue(name: string, description: string, options?: Partial<Omit<WSJFPriorityQueue, 'id' | 'name' | 'description' | 'jobs' | 'currentCapacity' | 'createdAt' | 'updatedAt'>>): WSJFPriorityQueue;
    /**
     * Add a job to the system and optionally to specific queues
     */
    addJob(job: WSJFJob, queueIds?: string[]): void;
    /**
     * Update a job and recalculate queue positions
     */
    updateJob(jobId: string, updates: Partial<WSJFJob>): WSJFJob;
    /**
     * Update WSJF result for a job and recalculate queue positions
     */
    updateJobWSJF(jobId: string, wsjfResult: WSJFResult): void;
    /**
     * Remove a job from the system
     */
    removeJob(jobId: string): void;
    /**
     * Get next job from queue based on WSJF priority
     */
    getNextJob(queueId?: string): WSJFJob | null;
    /**
     * Get jobs from queue with pagination
     */
    getJobs(queueId?: string, page?: number, pageSize?: number, filters?: WSJFFilter[]): {
        jobs: WSJFJob[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
    /**
     * Update queue configuration
     */
    updateQueue(queueId: string, updates: Partial<WSJFPriorityQueue>): WSJFPriorityQueue;
    /**
     * Get queue information
     */
    getQueue(queueId: string): WSJFPriorityQueue | undefined;
    /**
     * Get all queues
     */
    getAllQueues(): WSJFPriorityQueue[];
    /**
     * Get job by ID
     */
    getJob(jobId: string): WSJFJob | undefined;
    /**
     * Get all jobs
     */
    getAllJobs(): WSJFJob[];
    /**
     * Sort queue based on sorting criteria
     */
    private sortQueue;
    /**
     * Check if job passes filters
     */
    private passesFilters;
    /**
     * Apply filters to existing queue
     */
    private applyFiltersToQueue;
    /**
     * Validate job object
     */
    private validateJob;
    /**
     * Create standardized error object
     */
    private createError;
    /**
     * Emit WSJF event
     */
    private emitEvent;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Get queue statistics
     */
    getQueueStatistics(queueId: string): {
        totalJobs: number;
        jobsByStatus: Record<WSJFJob['status'], number>;
        jobsByType: Record<WSJFJob['type'], number>;
        averageWSJFScore: number;
        averageEstimatedDuration: number;
        capacityUtilization: number;
    } | null;
}
//# sourceMappingURL=priority-queue.d.ts.map
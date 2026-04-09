/**
 * WSJF Priority Queue Management System
 * 
 * Implements priority queue management for WSJF-scored jobs with real-time updates,
 * filtering, sorting, and capacity management capabilities
 */

import { EventEmitter } from 'events';
import {
  WSJFJob,
  WSJFResult,
  WSJFPriorityQueue,
  WSJFFilter,
  WSJFSortingCriteria,
  WSJFEvent,
  WSJFError
} from './types';

export class WSJFPriorityQueueManager extends EventEmitter {
  private queues: Map<string, WSJFPriorityQueue> = new Map();
  private jobs: Map<string, WSJFJob> = new Map();

  constructor() {
    super();
    this.initializeDefaultQueue();
  }

  /**
   * Initialize default priority queue
   */
  private initializeDefaultQueue(): void {
    const defaultQueue: WSJFPriorityQueue = {
      id: 'default',
      name: 'Default Priority Queue',
      description: 'Default queue for all WSJF-managed jobs',
      jobs: [],
      maxCapacity: 100,
      currentCapacity: 0,
      status: 'active',
      filters: [],
      sortingCriteria: {
        field: 'wsjfScore',
        direction: 'desc'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queues.set(defaultQueue.id, defaultQueue);
    this.emitEvent('queue_created', { queueId: defaultQueue.id });
  }

  /**
   * Create a new priority queue
   */
  public createQueue(
    name: string,
    description: string,
    options: Partial<Omit<WSJFPriorityQueue, 'id' | 'name' | 'description' | 'jobs' | 'currentCapacity' | 'createdAt' | 'updatedAt'>> = {}
  ): WSJFPriorityQueue {
    const queue: WSJFPriorityQueue = {
      id: this.generateId('queue'),
      name,
      description,
      jobs: [],
      maxCapacity: options.maxCapacity || 100,
      currentCapacity: 0,
      status: options.status || 'active',
      filters: options.filters || [],
      sortingCriteria: options.sortingCriteria || {
        field: 'wsjfScore',
        direction: 'desc'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queues.set(queue.id, queue);
    this.emitEvent('queue_created', { queueId: queue.id, name, description });
    
    return queue;
  }

  /**
   * Add a job to the system and optionally to specific queues
   */
  public addJob(job: WSJFJob, queueIds: string[] = ['default']): void {
    // Validate job
    this.validateJob(job);

    // Store job
    this.jobs.set(job.id, job);

    // Add to specified queues
    for (const queueId of queueIds) {
      const queue = this.queues.get(queueId);
      if (!queue) {
        throw this.createError('QUEUE_NOT_FOUND', `Queue ${queueId} not found`);
      }

      if (queue.currentCapacity >= queue.maxCapacity) {
        throw this.createError('QUEUE_FULL', `Queue ${queueId} is at maximum capacity`);
      }

      // Apply filters
      if (this.passesFilters(job, queue.filters)) {
        queue.jobs.push(job);
        queue.currentCapacity = queue.jobs.length;
        queue.updatedAt = new Date();
        
        // Sort queue
        this.sortQueue(queue);
        
        this.emitEvent('job_added_to_queue', { 
          queueId, 
          jobId: job.id, 
          wsjfScore: job.wsjfResult?.wsjfScore 
        });
      }
    }

    this.emitEvent('job_created', { jobId: job.id, name: job.name });
  }

  /**
   * Update a job and recalculate queue positions
   */
  public updateJob(jobId: string, updates: Partial<WSJFJob>): WSJFJob {
    const existingJob = this.jobs.get(jobId);
    if (!existingJob) {
      throw this.createError('JOB_NOT_FOUND', `Job ${jobId} not found`);
    }

    // Apply updates
    const updatedJob: WSJFJob = {
      ...existingJob,
      ...updates,
      updatedAt: new Date()
    };

    // Store updated job
    this.jobs.set(jobId, updatedJob);

    // Update job in all queues
    for (const queue of this.queues.values()) {
      const jobIndex = queue.jobs.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        // Check if job still passes filters
        if (this.passesFilters(updatedJob, queue.filters)) {
          queue.jobs[jobIndex] = updatedJob;
          this.sortQueue(queue);
          queue.updatedAt = new Date();
          
          this.emitEvent('job_updated_in_queue', { 
            queueId: queue.id, 
            jobId, 
            wsjfScore: updatedJob.wsjfResult?.wsjfScore 
          });
        } else {
          // Remove job from queue if it no longer passes filters
          queue.jobs.splice(jobIndex, 1);
          queue.currentCapacity = queue.jobs.length;
          queue.updatedAt = new Date();
          
          this.emitEvent('job_removed_from_queue', { 
            queueId: queue.id, 
            jobId, 
            reason: 'filter_mismatch' 
          });
        }
      }
    }

    this.emitEvent('job_updated', { jobId, updates: Object.keys(updates) });
    return updatedJob;
  }

  /**
   * Update WSJF result for a job and recalculate queue positions
   */
  public updateJobWSJF(jobId: string, wsjfResult: WSJFResult): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw this.createError('JOB_NOT_FOUND', `Job ${jobId} not found`);
    }

    job.wsjfResult = wsjfResult;
    job.updatedAt = new Date();

    // Update job in all queues and resort
    for (const queue of this.queues.values()) {
      const jobIndex = queue.jobs.findIndex(j => j.id === jobId);
      if (jobIndex !== -1) {
        queue.jobs[jobIndex] = job;
        this.sortQueue(queue);
        queue.updatedAt = new Date();
        
        this.emitEvent('wsjf_updated_in_queue', { 
          queueId: queue.id, 
          jobId, 
          newScore: wsjfResult.wsjfScore 
        });
      }
    }

    this.emitEvent('wsjf_calculated', { jobId, wsjfScore: wsjfResult.wsjfScore });
  }

  /**
   * Remove a job from the system
   */
  public removeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw this.createError('JOB_NOT_FOUND', `Job ${jobId} not found`);
    }

    // Remove from all queues
    for (const queue of this.queues.values()) {
      const jobIndex = queue.jobs.findIndex(j => j.id === jobId);
      if (jobIndex !== -1) {
        queue.jobs.splice(jobIndex, 1);
        queue.currentCapacity = queue.jobs.length;
        queue.updatedAt = new Date();
        
        this.emitEvent('job_removed_from_queue', { 
          queueId: queue.id, 
          jobId, 
          reason: 'manual_removal' 
        });
      }
    }

    // Remove from jobs storage
    this.jobs.delete(jobId);
    
    this.emitEvent('job_deleted', { jobId, name: job.name });
  }

  /**
   * Get next job from queue based on WSJF priority
   */
  public getNextJob(queueId: string = 'default'): WSJFJob | null {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw this.createError('QUEUE_NOT_FOUND', `Queue ${queueId} not found`);
    }

    if (queue.jobs.length === 0) {
      return null;
    }

    // Return the first job (highest priority after sorting)
    return queue.jobs[0];
  }

  /**
   * Get jobs from queue with pagination
   */
  public getJobs(
    queueId: string = 'default',
    page: number = 1,
    pageSize: number = 20,
    filters?: WSJFFilter[]
  ): {
    jobs: WSJFJob[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  } {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw this.createError('QUEUE_NOT_FOUND', `Queue ${queueId} not found`);
    }

    let filteredJobs = queue.jobs;

    // Apply additional filters if provided
    if (filters && filters.length > 0) {
      filteredJobs = queue.jobs.filter(job => this.passesFilters(job, filters));
    }

    const totalCount = filteredJobs.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    return {
      jobs: paginatedJobs,
      totalCount,
      currentPage: page,
      totalPages
    };
  }

  /**
   * Update queue configuration
   */
  public updateQueue(queueId: string, updates: Partial<WSJFPriorityQueue>): WSJFPriorityQueue {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw this.createError('QUEUE_NOT_FOUND', `Queue ${queueId} not found`);
    }

    const updatedQueue: WSJFPriorityQueue = {
      ...queue,
      ...updates,
      updatedAt: new Date()
    };

    // Validate capacity
    if (updates.maxCapacity !== undefined && updates.maxCapacity < queue.jobs.length) {
      throw this.createError('INVALID_CAPACITY', 'New capacity is less than current job count');
    }

    this.queues.set(queueId, updatedQueue);

    // Re-sort queue if sorting criteria changed
    if (updates.sortingCriteria) {
      this.sortQueue(updatedQueue);
    }

    // Re-apply filters if filters changed
    if (updates.filters) {
      this.applyFiltersToQueue(updatedQueue);
    }

    this.emitEvent('queue_updated', { queueId, updates: Object.keys(updates) });
    return updatedQueue;
  }

  /**
   * Get queue information
   */
  public getQueue(queueId: string): WSJFPriorityQueue | undefined {
    return this.queues.get(queueId);
  }

  /**
   * Get all queues
   */
  public getAllQueues(): WSJFPriorityQueue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Get job by ID
   */
  public getJob(jobId: string): WSJFJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): WSJFJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Sort queue based on sorting criteria
   */
  private sortQueue(queue: WSJFPriorityQueue): void {
    const { field, direction, secondaryField, secondaryDirection } = queue.sortingCriteria;

    queue.jobs.sort((a, b) => {
      let comparison = 0;

      // Primary sorting
      if (field === 'wsjfScore') {
        const aScore = a.wsjfResult?.wsjfScore || 0;
        const bScore = b.wsjfResult?.wsjfScore || 0;
        comparison = aScore - bScore;
      } else {
        const aValue = (a as any)[field];
        const bValue = (b as any)[field];
        
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
      }

      // Apply direction
      if (direction === 'desc') {
        comparison = -comparison;
      }

      // Secondary sorting if primary values are equal
      if (comparison === 0 && secondaryField) {
        let secondaryComparison = 0;
        const aSecValue = (a as any)[secondaryField];
        const bSecValue = (b as any)[secondaryField];
        
        if (aSecValue < bSecValue) secondaryComparison = -1;
        else if (aSecValue > bSecValue) secondaryComparison = 1;

        if (secondaryDirection === 'desc') {
          secondaryComparison = -secondaryComparison;
        }

        comparison = secondaryComparison;
      }

      return comparison;
    });
  }

  /**
   * Check if job passes filters
   */
  private passesFilters(job: WSJFJob, filters: WSJFFilter[]): boolean {
    if (filters.length === 0) {
      return true;
    }

    return filters.every(filter => {
      const jobValue = (job as any)[filter.field];
      
      switch (filter.operator) {
        case 'eq':
          return jobValue === filter.value;
        case 'ne':
          return jobValue !== filter.value;
        case 'gt':
          return jobValue > filter.value;
        case 'gte':
          return jobValue >= filter.value;
        case 'lt':
          return jobValue < filter.value;
        case 'lte':
          return jobValue <= filter.value;
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(jobValue);
        case 'contains':
          return typeof jobValue === 'string' && jobValue.includes(filter.value);
        default:
          return true;
      }
    });
  }

  /**
   * Apply filters to existing queue
   */
  private applyFiltersToQueue(queue: WSJFPriorityQueue): void {
    const filteredJobs = queue.jobs.filter(job => this.passesFilters(job, queue.filters));
    queue.jobs = filteredJobs;
    queue.currentCapacity = filteredJobs.length;
    queue.updatedAt = new Date();
  }

  /**
   * Validate job object
   */
  private validateJob(job: WSJFJob): void {
    if (!job.id || !job.name) {
      throw this.createError('INVALID_JOB', 'Job must have id and name');
    }

    if (!job.wsjfResult) {
      throw this.createError('INVALID_JOB', 'Job must have WSJF result');
    }

    if (job.estimatedDuration <= 0) {
      throw this.createError('INVALID_JOB', 'Job estimated duration must be greater than 0');
    }
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
   * Emit WSJF event
   */
  private emitEvent(type: WSJFEvent['type'], data: Record<string, any>): void {
    const event: WSJFEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data
    };

    this.emit('wsjfEvent', event);
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
   * Get queue statistics
   */
  public getQueueStatistics(queueId: string): {
    totalJobs: number;
    jobsByStatus: Record<WSJFJob['status'], number>;
    jobsByType: Record<WSJFJob['type'], number>;
    averageWSJFScore: number;
    averageEstimatedDuration: number;
    capacityUtilization: number;
  } | null {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return null;
    }

    const jobsByStatus: Record<WSJFJob['status'], number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0
    };

    const jobsByType: Record<WSJFJob['type'], number> = {
      feature: 0,
      bug: 0,
      enhancement: 0,
      technical_debt: 0,
      research: 0,
      other: 0
    };

    let totalWSJFScore = 0;
    let totalDuration = 0;
    let wsjfCount = 0;

    queue.jobs.forEach(job => {
      jobsByStatus[job.status]++;
      jobsByType[job.type]++;
      
      if (job.wsjfResult) {
        totalWSJFScore += job.wsjfResult.wsjfScore;
        wsjfCount++;
      }
      
      totalDuration += job.estimatedDuration;
    });

    return {
      totalJobs: queue.jobs.length,
      jobsByStatus,
      jobsByType,
      averageWSJFScore: wsjfCount > 0 ? totalWSJFScore / wsjfCount : 0,
      averageEstimatedDuration: queue.jobs.length > 0 ? totalDuration / queue.jobs.length : 0,
      capacityUtilization: (queue.jobs.length / queue.maxCapacity) * 100
    };
  }
}
/**
 * Patient Query Queue Management
 * Handles queuing, prioritization, and assignment of patient queries
 */
import { PatientQuery, QueryStatus, QueryPriority, QueueConfig } from './types';
export declare class PatientQueue {
    private queue;
    private priorityQueue;
    private providerAssignments;
    private config;
    constructor(config: QueueConfig);
    /**
     * Add query to queue
     */
    enqueue(query: PatientQuery): Promise<void>;
    /**
     * Remove query from queue
     */
    dequeue(queryId: string): PatientQuery | undefined;
    /**
     * Get next query based on priority
     */
    getNext(): PatientQuery | undefined;
    /**
     * Assign query to provider
     */
    assignToProvider(queryId: string, providerId: string): Promise<boolean>;
    /**
     * Auto-assign query to available provider
     */
    private autoAssignQuery;
    /**
     * Get queries for provider
     */
    getQueriesForProvider(providerId: string): PatientQuery[];
    /**
     * Get queries by status
     */
    getQueriesByStatus(status: QueryStatus): PatientQuery[];
    /**
     * Get queries by priority
     */
    getQueriesByPriority(priority: QueryPriority): PatientQuery[];
    /**
     * Update query status
     */
    updateQueryStatus(queryId: string, status: QueryStatus): boolean;
    /**
     * Get queue statistics
     */
    getStats(): {
        totalQueries: number;
        byStatus: Map<QueryStatus, number>;
        byPriority: Map<QueryPriority, number>;
        averageWaitTime: number;
    };
    /**
     * Check for stale queries and escalate
     */
    checkStaleQueries(): Promise<string[]>;
}
//# sourceMappingURL=patient-queue.d.ts.map
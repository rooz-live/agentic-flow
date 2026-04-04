/**
 * Ceremony Scheduler Service
 *
 * Monitors ceremony_schedules table and executes ceremonies at scheduled times using cron expressions.
 * Updates last_execution and next_execution timestamps after each execution.
 */
declare class CeremonyScheduler {
    private schedules;
    private dbPath;
    private checkInterval;
    constructor();
    /**
     * Start the scheduler service
     * Loads all enabled schedules from database and starts monitoring
     */
    start(): void;
    /**
     * Stop the scheduler service
     * Stops all running cron jobs
     */
    stop(): void;
    /**
     * Load all enabled schedules from database
     * Creates or updates cron jobs for each schedule
     */
    private loadSchedules;
    /**
     * Add or update a ceremony schedule
     */
    private addOrUpdateSchedule;
    /**
     * Execute a ceremony based on schedule
     */
    private executeCeremony;
    /**
     * Calculate and store the next execution time for a schedule
     */
    private updateNextExecution;
    /**
     * Record ceremony execution in ceremony_history table
     */
    private recordExecution;
    /**
     * Get all active schedules
     */
    getActiveSchedules(): string[];
    /**
     * Get schedule status
     */
    getStatus(): {
        active: number;
        schedules: string[];
    };
}
/**
 * Initialize the ceremony scheduler
 */
export declare function initializeScheduler(): CeremonyScheduler;
/**
 * Get the scheduler instance
 */
export declare function getSchedulerInstance(): CeremonyScheduler | null;
/**
 * Stop the scheduler
 */
export declare function stopScheduler(): void;
declare const _default: {
    initializeScheduler: typeof initializeScheduler;
    getSchedulerInstance: typeof getSchedulerInstance;
    stopScheduler: typeof stopScheduler;
};
export default _default;
//# sourceMappingURL=ceremony-scheduler.d.ts.map
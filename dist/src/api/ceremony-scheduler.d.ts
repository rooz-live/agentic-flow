/**
 * Ceremony Scheduler Service
 *
 * Manages scheduled ceremony execution with cron expressions.
 * Stores schedules in JSON and executes via ay-prod-cycle.sh
 */
export interface CeremonySchedule {
    id?: number;
    circle: string;
    ceremony: string;
    cron_expression: string;
    enabled: boolean;
    last_execution?: number;
    next_execution?: number;
    execution_count?: number;
    created_at?: number;
    metadata?: any;
}
/**
 * Initialize scheduler
 */
export declare function initializeScheduler(): void;
/**
 * Create a new ceremony schedule
 */
export declare function createSchedule(schedule: CeremonySchedule): number;
/**
 * Get schedule by ID
 */
export declare function getScheduleById(id: number): CeremonySchedule | null;
/**
 * Get all schedules (optionally filtered by circle)
 */
export declare function getAllSchedules(circle?: string): CeremonySchedule[];
/**
 * Update schedule
 */
export declare function updateSchedule(id: number, updates: Partial<CeremonySchedule>): boolean;
/**
 * Delete schedule
 */
export declare function deleteSchedule(id: number): boolean;
/**
 * Manually execute a ceremony (not scheduled)
 */
export declare function executeManualCeremony(circle: string, ceremony: string, adr?: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
}>;
/**
 * Get next execution time for a schedule
 */
export declare function getNextExecution(cronExpression: string): Date | null;
/**
 * Stop all schedules
 */
export declare function stopAllSchedules(): void;
/**
 * Restart all enabled schedules
 */
export declare function restartAllSchedules(): void;
export declare const scheduler: {
    executeManualCeremony: typeof executeManualCeremony;
    createSchedule: typeof createSchedule;
    getScheduleById: typeof getScheduleById;
    getAllSchedules: typeof getAllSchedules;
    updateSchedule: typeof updateSchedule;
    deleteSchedule: typeof deleteSchedule;
    stopAllSchedules: typeof stopAllSchedules;
    restartAllSchedules: typeof restartAllSchedules;
};
//# sourceMappingURL=ceremony-scheduler.d.ts.map
/**
 * Incremental Execution Engine for Relentless Execution Patterns
 *
 * Implements incremental task execution with retry backoff, relentless looping,
 * incremental commits, and progress tracking for reliable execution.
 */
import { EventEmitter } from 'events';
export interface IncrementalTask {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    attempt: number;
    error?: string;
    startTime?: Date;
    endTime?: Date;
}
export interface ExecutionOptions {
    maxRetries?: number;
    backoffMs?: number;
    timeoutMs?: number;
}
export declare class IncrementalExecutionEngine extends EventEmitter {
    /**
     * Execute tasks incrementally with automatic retry and backoff
     */
    executeIncrementally(tasks: string[], options?: ExecutionOptions): AsyncGenerator<IncrementalTask>;
    /**
     * Relentless loop that continues execution until condition is met
     */
    relentlessLoop(conditionFn: () => boolean, actionFn: () => Promise<void>, options?: {
        intervalMs?: number;
        maxIterations?: number;
    }): () => void;
    /**
     * Incremental commit pattern with failure recovery
     */
    incrementalCommit<T>(chunks: T[], commitFn: (chunk: T, index: number) => Promise<void>, options?: {
        batchSize?: number;
        onCommit?: (index: number) => void;
    }): Promise<void>;
    /**
     * Progress tracking with relentless recovery
     */
    trackProgress(tasks: IncrementalTask[], callback: (progress: {
        completed: number;
        total: number;
        successRate: number;
    }) => void): void;
}
//# sourceMappingURL=incremental-execution-engine.d.ts.map
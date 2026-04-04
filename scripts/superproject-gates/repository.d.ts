/**
 * Progress Repository: In-Memory Implementation
 *
 * Stores active pipeline progress in memory for fast access
 */
import { ProcessingProgress, ProgressRepository } from './index';
export declare class InMemoryProgressRepository implements ProgressRepository {
    private store;
    save(progress: ProcessingProgress): Promise<void>;
    findById(pipelineId: string): Promise<ProcessingProgress | null>;
    findActive(): Promise<ProcessingProgress[]>;
    delete(pipelineId: string): Promise<void>;
    /**
     * Clear all stored progress (useful for testing)
     */
    clear(): Promise<void>;
}
//# sourceMappingURL=repository.d.ts.map
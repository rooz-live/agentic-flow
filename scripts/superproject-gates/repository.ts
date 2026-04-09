/**
 * Progress Repository: In-Memory Implementation
 * 
 * Stores active pipeline progress in memory for fast access
 */

import { ProcessingProgress, ProgressRepository } from './index';

export class InMemoryProgressRepository implements ProgressRepository {
  private store: Map<string, ProcessingProgress> = new Map();

  async save(progress: ProcessingProgress): Promise<void> {
    this.store.set(progress.pipelineId, progress);
  }

  async findById(pipelineId: string): Promise<ProcessingProgress | null> {
    return this.store.get(pipelineId) || null;
  }

  async findActive(): Promise<ProcessingProgress[]> {
    return Array.from(this.store.values()).filter(
      progress => !progress.isComplete()
    );
  }

  async delete(pipelineId: string): Promise<void> {
    this.store.delete(pipelineId);
  }

  /**
   * Clear all stored progress (useful for testing)
   */
  async clear(): Promise<void> {
    this.store.clear();
  }
}

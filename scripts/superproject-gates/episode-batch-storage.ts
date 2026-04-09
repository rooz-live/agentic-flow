/**
 * @fileoverview Episode batch storage optimizer
 * Reduces I/O overhead during high-throughput production runs
 */

import { EventEmitter } from 'events';

export interface Episode {
  episode_id: string;
  primary_circle: string;
  ceremony: string;
  mode: string;
  timestamp: string;
  outcome?: string;
  skills_context?: any;
  mcp_health?: any;
}

export interface BatchStorageConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: BatchStorageConfig = {
  batchSize: 50,
  flushIntervalMs: 5000,
  maxRetries: 3,
};

/**
 * Batch episode storage for high-throughput scenarios
 */
export class EpisodeBatchStorage extends EventEmitter {
  private buffer: Episode[];
  private config: BatchStorageConfig;
  private flushTimer: NodeJS.Timeout | null;
  private isShuttingDown: boolean;

  constructor(config: Partial<BatchStorageConfig> = {}) {
    super();
    this.buffer = [];
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.flushTimer = null;
    this.isShuttingDown = false;

    this.startFlushTimer();
  }

  /**
   * Add episode to buffer with automatic batching
   */
  async store(episode: Episode): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Storage is shutting down');
    }

    this.buffer.push(episode);
    this.emit('episode:buffered', { episode, bufferSize: this.buffer.length });

    // Flush if buffer is full
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Force flush buffer to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.writeBatch(batch);
      this.emit('batch:flushed', { count: batch.length });
    } catch (error) {
      // Return episodes to buffer on failure
      this.buffer.unshift(...batch);
      this.emit('batch:error', { error, count: batch.length });
      throw error;
    }
  }

  private async writeBatch(episodes: Episode[]): Promise<void> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.maxRetries) {
      try {
        // Implementation stub - wire to actual storage backend
        // This would integrate with agentdb or file system
        await this.performWrite(episodes);
        return;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(
      `Failed to write batch after ${this.config.maxRetries} attempts: ${lastError?.message}`
    );
  }

  private async performWrite(episodes: Episode[]): Promise<void> {
    // Stub - integrate with agentdb CLI or database
    // For now, write to temp file
    const data = episodes.map((e) => JSON.stringify(e)).join('\n');
    
    // In production, this would be:
    // execSync(`npx agentdb episode store --batch`, { input: data });
    
    // For now, simulate write
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch((error) => {
          this.emit('timer:flush-error', error);
        });
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Graceful shutdown with buffer flush
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining episodes
    if (this.buffer.length > 0) {
      await this.flush();
    }

    this.emit('storage:shutdown');
  }

  /**
   * Get current buffer statistics
   */
  getStats(): {
    bufferSize: number;
    config: BatchStorageConfig;
  } {
    return {
      bufferSize: this.buffer.length,
      config: this.config,
    };
  }
}

export default EpisodeBatchStorage;

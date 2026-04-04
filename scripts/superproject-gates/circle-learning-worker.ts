/**
 * @fileoverview Circle-specific learning loop background worker
 * Asynchronous skill extraction and pattern analysis per circle
 */

import { EventEmitter } from 'events';
import { calculateSuccessThreshold, calculateMinEpisodes } from './dynamic-thresholds';

export interface CircleLearningConfig {
  circle: string;
  analysisIntervalMs: number;
  minEpisodesForLearning: number;
  successThreshold: number;
}

export interface LearnedPattern {
  pattern: string;
  confidence: number;
  occurrences: number;
  successRate: number;
  circle: string;
  timestamp: string;
}

const DEFAULT_CONFIG: Omit<CircleLearningConfig, 'circle'> = {
  analysisIntervalMs: 60000, // 1 minute
  minEpisodesForLearning: 5,  // Will be overridden dynamically
  successThreshold: 0.7,       // Will be overridden dynamically
};

/**
 * Background worker for circle-specific learning
 */
export class CircleLearningWorker extends EventEmitter {
  private config: CircleLearningConfig;
  private learningTimer: NodeJS.Timeout | null;
  private isRunning: boolean;
  private learnedPatterns: Map<string, LearnedPattern>;

  constructor(circle: string, config: Partial<Omit<CircleLearningConfig, 'circle'>> = {}) {
    super();
    this.config = { circle, ...DEFAULT_CONFIG, ...config };
    this.learningTimer = null;
    this.isRunning = false;
    this.learnedPatterns = new Map();
  }

  /**
   * Start background learning loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Calculate dynamic thresholds based on actual data distribution
    await this.calibrateThresholds();

    this.isRunning = true;
    this.emit('worker:started', { circle: this.config.circle });

    this.learningTimer = setInterval(async () => {
      try {
        await this.runLearningCycle();
      } catch (error) {
        this.emit('worker:error', { circle: this.config.circle, error });
      }
    }, this.config.analysisIntervalMs);

    // Run initial cycle
    await this.runLearningCycle();
  }

  /**
   * Stop background learning loop
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.learningTimer) {
      clearInterval(this.learningTimer);
      this.learningTimer = null;
    }

    this.emit('worker:stopped', { circle: this.config.circle });
  }

  /**
   * Calibrate thresholds based on actual data distribution
   * Called on startup and periodically to adapt to regime changes
   */
  private async calibrateThresholds(): Promise<void> {
    try {
      // Calculate dynamic success threshold
      const dynamicThreshold = await calculateSuccessThreshold();
      
      // Calculate dynamic minimum episodes
      const dynamicMinEpisodes = await calculateMinEpisodes();
      
      // Update config
      this.config.successThreshold = dynamicThreshold;
      this.config.minEpisodesForLearning = dynamicMinEpisodes;
      
      this.emit('thresholds:calibrated', {
        circle: this.config.circle,
        successThreshold: dynamicThreshold,
        minEpisodes: dynamicMinEpisodes
      });
    } catch (error) {
      this.emit('thresholds:calibration-failed', {
        circle: this.config.circle,
        error,
        fallback: {
          successThreshold: DEFAULT_CONFIG.successThreshold,
          minEpisodes: DEFAULT_CONFIG.minEpisodesForLearning
        }
      });
    }
  }

  private async runLearningCycle(): Promise<void> {
    this.emit('cycle:start', { circle: this.config.circle });

    try {
      // Periodically recalibrate thresholds (every 10 cycles)
      // This adapts to regime changes in the reward distribution
      if (Math.random() < 0.1) {
        await this.calibrateThresholds();
      }

      // Fetch recent episodes for this circle
      const episodes = await this.fetchRecentEpisodes();

      if (episodes.length < this.config.minEpisodesForLearning) {
        this.emit('cycle:skipped', {
          circle: this.config.circle,
          reason: 'insufficient_episodes',
          count: episodes.length,
        });
        return;
      }

      // Extract patterns
      const patterns = await this.extractPatterns(episodes);

      // Filter by success threshold
      const successfulPatterns = patterns.filter(
        (p) => p.successRate >= this.config.successThreshold
      );

      // Update learned patterns
      for (const pattern of successfulPatterns) {
        this.learnedPatterns.set(pattern.pattern, pattern);
      }

      this.emit('cycle:complete', {
        circle: this.config.circle,
        patternsLearned: successfulPatterns.length,
        totalPatterns: this.learnedPatterns.size,
      });

      // Persist learned patterns
      await this.persistPatterns(successfulPatterns);
    } catch (error) {
      this.emit('cycle:error', { circle: this.config.circle, error });
    }
  }

  private async fetchRecentEpisodes(): Promise<any[]> {
    // Filter episodes by circle for circle-specific learning
    try {
      const { execSync } = require('child_process');
      const result = execSync(
        `npx agentdb episode search --circle ${this.config.circle} --recent 100 --json 2>/dev/null || echo '[]'`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      
      const parsed = JSON.parse(result.trim() || '[]');
      
      // Filter by circle metadata if agentdb doesn't support --circle flag yet
      if (Array.isArray(parsed)) {
        return parsed.filter((ep: any) => 
          ep.metadata?.circle === this.config.circle ||
          ep.metadata?.primary_circle === this.config.circle ||
          ep.task?.includes(this.config.circle)
        );
      }
      
      return [];
    } catch (error) {
      this.emit('worker:error', { 
        circle: this.config.circle, 
        error: 'Failed to fetch episodes',
        details: error
      });
      return [];
    }
  }

  private async extractPatterns(episodes: any[]): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];
    const patternMap = new Map<string, { success: number; total: number }>();

    // Analyze episode outcomes
    for (const episode of episodes) {
      const pattern = this.identifyPattern(episode);
      if (!pattern) continue;

      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, { success: 0, total: 0 });
      }

      const stats = patternMap.get(pattern)!;
      stats.total++;
      if (episode.outcome === 'success') {
        stats.success++;
      }
    }

    // Convert to learned patterns
    patternMap.forEach((stats, pattern) => {
      patterns.push({
        pattern,
        confidence: stats.success / stats.total,
        occurrences: stats.total,
        successRate: stats.success / stats.total,
        circle: this.config.circle,
        timestamp: new Date().toISOString(),
      });
    });

    return patterns;
  }

  private identifyPattern(episode: any): string | null {
    // Stub - implement pattern recognition
    // Could analyze ceremony types, skill combinations, outcomes
    if (episode.ceremony && episode.mode) {
      return `${episode.ceremony}_${episode.mode}`;
    }
    return null;
  }

  private async persistPatterns(patterns: LearnedPattern[]): Promise<void> {
    // Stub - integrate with skill storage
    // In production: execSync(`npx agentdb skill store`, { input: JSON.stringify(patterns) })
  }

  /**
   * Get current learned patterns for this circle
   */
  getLearnedPatterns(): LearnedPattern[] {
    return Array.from(this.learnedPatterns.values());
  }

  /**
   * Query specific pattern
   */
  getPattern(pattern: string): LearnedPattern | undefined {
    return this.learnedPatterns.get(pattern);
  }
}

export default CircleLearningWorker;

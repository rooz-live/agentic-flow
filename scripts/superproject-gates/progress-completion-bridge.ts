/**
 * Progress-Completion Bridge
 * 
 * Integrates two tracking systems:
 * 1. Real-time Progress (src/domain/progress/index.ts) - Live execution tracking
 * 2. Completion Tracker (src/core/completion-tracker.ts) - Historical metrics
 * 
 * Purpose: Convert real-time progress events into completion episodes
 */

import { 
  ProcessingProgress, 
  PhaseProgress, 
  DomainEvent,
  ProgressMetrics 
} from '../domain/progress/index.js';
import { 
  CompletionTracker, 
  Episode, 
  Circle, 
  Outcome 
} from './completion-tracker.js';

// ============================================================================
// Bridge Configuration
// ============================================================================

interface BridgeConfig {
  /** Enable automatic episode creation from progress events */
  autoCreateEpisodes: boolean;
  /** Minimum completion percentage to consider phase "successful" */
  successThreshold: number;
  /** Map phase names to circles */
  phaseToCircleMap: Record<string, Circle>;
}

const DEFAULT_CONFIG: BridgeConfig = {
  autoCreateEpisodes: true,
  successThreshold: 90,
  phaseToCircleMap: {
    'orchestrator:standup': 'orchestrator',
    'assessor:wsjf': 'assessor',
    'analyst:refine': 'analyst',
    'innovator:retro': 'innovator',
    'seeker:replenish': 'seeker',
    'intuitive:synthesis': 'intuitive',
  }
};

// ============================================================================
// Progress-to-Episode Converter
// ============================================================================

export class ProgressCompletionBridge {
  private progressTracker: ProcessingProgress;
  private completionTracker: CompletionTracker;
  private config: BridgeConfig;
  private episodeBuffer: Map<string, Partial<Episode>> = new Map();

  constructor(
    progressTracker: ProcessingProgress,
    completionTracker: CompletionTracker,
    config: Partial<BridgeConfig> = {}
  ) {
    this.progressTracker = progressTracker;
    this.completionTracker = completionTracker;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring progress events and converting to episodes
   */
  async startMonitoring(): Promise<void> {
    // Process events every second
    setInterval(() => {
      this.processProgressEvents();
    }, 1000);
  }

  /**
   * Process progress events and create episodes
   */
  private async processProgressEvents(): Promise<void> {
    const events = this.progressTracker.getEvents();
    
    for (const event of events) {
      await this.handleProgressEvent(event);
    }

    // Clear processed events
    this.progressTracker.clearEvents();
  }

  /**
   * Handle individual progress event
   */
  private async handleProgressEvent(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'PhaseCompleted':
        await this.onPhaseCompleted(event);
        break;
      case 'PhaseProgressUpdated':
        this.onPhaseProgressUpdated(event);
        break;
      case 'PipelineCompleted':
        await this.onPipelineCompleted(event);
        break;
    }
  }

  /**
   * Handle phase completion - create episode
   */
  private async onPhaseCompleted(event: DomainEvent): Promise<void> {
    if (event.type !== 'PhaseCompleted') return;

    const snapshot = this.progressTracker.getSnapshot(event.phaseId);
    if (!snapshot) return;

    // Parse phase name to extract circle and ceremony
    const [circleKey, ceremony] = event.phaseId.split(':');
    const circle = this.config.phaseToCircleMap[event.phaseId] || circleKey as Circle;

    // Calculate outcome based on completion percentage
    const outcome: Outcome = this.inferOutcome(snapshot.percentage);

    // Create episode
    const episode: Episode = {
      episode_id: `ep_${event.timestamp.getTime()}_${circle}_${ceremony}`,
      circle,
      ceremony: ceremony || 'unknown',
      outcome,
      completion_pct: Math.round(snapshot.percentage),
      confidence: this.calculateConfidence(snapshot.percentage, event.duration),
      timestamp: event.timestamp.getTime(),
      reward: outcome === 'success' ? 1.0 : 0.0
    };

    if (this.config.autoCreateEpisodes) {
      await this.completionTracker.storeEpisode(episode);
    }

    // Remove from buffer
    this.episodeBuffer.delete(event.phaseId);
  }

  /**
   * Handle progress update - buffer partial episode data
   */
  private onPhaseProgressUpdated(event: DomainEvent): void {
    if (event.type !== 'PhaseProgressUpdated') return;

    const partial = this.episodeBuffer.get(event.phaseId) || {};
    partial.completion_pct = Math.round((event.completed / event.total) * 100);
    partial.timestamp = event.timestamp.getTime();

    this.episodeBuffer.set(event.phaseId, partial);
  }

  /**
   * Handle pipeline completion - aggregate metrics
   */
  private async onPipelineCompleted(event: DomainEvent): Promise<void> {
    if (event.type !== 'PipelineCompleted') return;

    // Get final metrics
    const metrics = this.progressTracker.calculateMetrics();

    // Log pipeline summary
    console.log('\n📊 Pipeline Completion Summary:');
    console.log(`   Overall: ${metrics.overallPercentage.toFixed(1)}%`);
    console.log(`   Duration: ${(event.duration / 1000).toFixed(1)}s`);
    console.log(`   Success: ${event.success ? '✅' : '❌'}`);

    // Optionally: Update system-wide metrics
    const systemMetrics = await this.completionTracker.getSystemOverview();
    console.log(`\n📈 System Overview:`);
    console.log(`   Total Episodes: ${systemMetrics.totalEpisodes}`);
    console.log(`   Overall Completion: ${systemMetrics.overallCompletionPct.toFixed(1)}%`);
  }

  /**
   * Get real-time progress combined with historical completion
   */
  async getCombinedMetrics(): Promise<{
    realtime: ProgressMetrics;
    historical: {
      circle: string;
      avgCompletion: number;
      episodeCount: number;
    }[];
  }> {
    const realtimeMetrics = this.progressTracker.calculateMetrics();
    const circles = await this.completionTracker.getAllCircleMetrics();

    return {
      realtime: realtimeMetrics,
      historical: circles.map(c => ({
        circle: c.circle,
        avgCompletion: c.avgCompletionPct,
        episodeCount: c.episodeCount
      }))
    };
  }

  /**
   * Export current progress as episodes (for manual testing)
   */
  async exportProgressAsEpisodes(): Promise<Episode[]> {
    const phases = this.progressTracker.getPhases();
    const episodes: Episode[] = [];

    for (const phase of phases) {
      const [circleKey, ceremony] = phase.name.split(':');
      const circle = this.config.phaseToCircleMap[phase.name] || circleKey as Circle;

      const percentage = phase.total > 0 
        ? (phase.completed / phase.total) * 100 
        : 0;

      episodes.push({
        episode_id: `ep_${Date.now()}_${circle}_${ceremony || 'unknown'}`,
        circle,
        ceremony: ceremony || 'unknown',
        outcome: this.inferOutcome(percentage),
        completion_pct: Math.round(percentage),
        confidence: 0.8,
        timestamp: Date.now()
      });
    }

    return episodes;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private inferOutcome(percentage: number): Outcome {
    if (percentage >= this.config.successThreshold) return 'success';
    if (percentage >= 50) return 'partial';
    return 'failure';
  }

  private calculateConfidence(percentage: number, duration: number): number {
    // Higher confidence for complete tasks with reasonable duration
    let confidence = percentage / 100;

    // Penalize very short durations (likely mocked/skipped)
    if (duration < 1000) confidence *= 0.5;

    // Penalize very long durations (likely stuck/degraded)
    if (duration > 60000) confidence *= 0.8;

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

// ============================================================================
// Factory: Create integrated tracker
// ============================================================================

export async function createIntegratedTracker(
  pipelineId: string,
  phases: PhaseProgress[]
): Promise<{
  progress: ProcessingProgress;
  completion: CompletionTracker;
  bridge: ProgressCompletionBridge;
}> {
  const progress = new ProcessingProgress(pipelineId, phases);
  const completion = new CompletionTracker();
  
  // Initialize completion schema
  await completion.initSchema();

  const bridge = new ProgressCompletionBridge(progress, completion);

  return { progress, completion, bridge };
}

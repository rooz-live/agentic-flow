/**
 * @fileoverview Unified Progress & Completion Tracker
 * Integrates real-time execution progress with historical completion metrics
 * 
 * Integration Architecture:
 * 1. Real-time: ProcessingProgress tracks ceremony execution (domain/progress)
 * 2. Historical: CompletionTracker stores episode outcomes (core/completion-tracker)
 * 3. Unified: Bridges both systems + traces progress issues
 */

import { 
  ProcessingProgress, 
  PhaseProgress, 
  ProgressMetrics,
  DomainEvent 
} from '../domain/progress/index.js';
import { 
  CompletionTracker, 
  Episode, 
  Circle, 
  CircleMetrics 
} from './completion-tracker.js';

// ═══════════════════════════════════════════════════════════════════════════
// Integration Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UnifiedProgressSnapshot {
  // Real-time execution
  executionProgress: ProgressMetrics;
  currentPhases: PhaseProgress[];
  
  // Historical completion
  circleCompletion: CircleMetrics | null;
  historicalAvgPct: number;
  
  // Unified metrics
  combinedScore: number;  // Weighted: 60% execution + 40% historical
  timestamp: number;
}

export interface ProgressIssue {
  severity: 'warning' | 'error' | 'critical';
  category: 'execution' | 'completion' | 'integration';
  message: string;
  phase?: string;
  circle?: Circle;
  timestamp: number;
  suggestedAction?: string;
}

export interface ProdCycleImprovement {
  id: string;
  priority: 'low' | 'medium' | 'high';
  category: 'performance' | 'reliability' | 'observability';
  title: string;
  description: string;
  estimatedImpact: string;
  implementationNotes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Unified Tracker
// ═══════════════════════════════════════════════════════════════════════════

export class UnifiedProgressTracker {
  private executionProgress?: ProcessingProgress;
  private completionTracker: CompletionTracker;
  private issues: ProgressIssue[] = [];
  private improvements: ProdCycleImprovement[] = [];
  private checkpointId?: string;
  
  constructor() {
    this.completionTracker = new CompletionTracker();
    this.initializeImprovements();
  }

  /**
   * Initialize completion tracker schema
   */
  async init(): Promise<void> {
    await this.completionTracker.initSchema();
  }

  /**
   * Start tracking a new execution run
   */
  startExecution(pipelineId: string, phases: PhaseProgress[]): void {
    this.checkpointId = `checkpoint_${pipelineId}_${Date.now()}`;
    this.executionProgress = new ProcessingProgress(pipelineId, phases);
    this.executionProgress.start();
    this.issues = [];  // Clear previous issues
    
    // Save initial checkpoint
    this.saveCheckpoint().catch(err => 
      console.warn(`Failed to save checkpoint: ${err.message}`)
    );
  }

  /**
   * Update phase progress during execution
   */
  updatePhase(phaseName: string, completed: number, total: number): void {
    if (!this.executionProgress) {
      this.addIssue({
        severity: 'error',
        category: 'execution',
        message: 'Cannot update phase: execution not started',
        phase: phaseName,
        timestamp: Date.now(),
        suggestedAction: 'Call startExecution() before updatePhase()'
      });
      return;
    }

    try {
      this.executionProgress.updatePhase(phaseName, completed, total);
      this.traceProgressIssues(phaseName, completed, total);
      
      // Save checkpoint after significant progress (every 10% increment)
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      if (Math.floor(percentage / 10) > Math.floor(((completed - 1) / total) * 10)) {
        this.saveCheckpoint().catch(err => 
          console.warn(`Failed to save checkpoint: ${err.message}`)
        );
      }
    } catch (error) {
      this.addIssue({
        severity: 'error',
        category: 'execution',
        message: `Phase update failed: ${(error as Error).message}`,
        phase: phaseName,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Complete execution and store episode with completion tracking
   */
  async completeExecution(
    episodeId: string,
    circle: Circle,
    ceremony: string,
    outcome: 'success' | 'failure' | 'partial',
    confidence: number,
    executionTime: number = 0,
    qualityScore: number = 1.0
  ): Promise<void> {
    // Import reward calculator
    const { calculateReward } = await import('./reward-calculator');
    
    // Calculate detailed reward based on outcome, confidence, time, and quality
    const success = outcome === 'success';
    const expectedTime = 10000; // Default 10s for ceremonies
    const difficulty = circle === 'orchestrator'
      ? 0.8
      : circle === 'assessor'
        ? 0.7
        : circle === 'innovator'
          ? 0.6
          : circle === 'analyst'
            ? 0.5
            : 0.4;
    const complexityScore = ceremony.includes('protocol') ? 0.7 : 0.5;
    
    const reward = await calculateReward({
      success,
      duration_ms: executionTime || Date.now(),
      expected_duration_ms: expectedTime,
      quality_score: success ? (qualityScore * confidence) : (qualityScore * 0.5),
      test_coverage: confidence,
      difficulty,
      complexity_score: complexityScore
    });
    
    // Store episode in completion tracker
    const episode: Episode = {
      episode_id: episodeId,
      circle,
      ceremony,
      outcome,
      completion_pct: 0,  // Will be auto-inferred
      confidence,
      timestamp: Date.now(),
      reward
    };

    try {
      await this.completionTracker.storeEpisode(episode);
      
      // Auto-trigger learning loop if circle performance drops below threshold
      await this.checkAndTriggerLearningLoop(circle);
    } catch (error) {
      this.addIssue({
        severity: 'critical',
        category: 'integration',
        message: `Failed to store episode: ${(error as Error).message}`,
        circle,
        timestamp: Date.now(),
        suggestedAction: 'Check database connectivity and schema'
      });
    }
  }

  /**
   * Get unified progress snapshot (real-time + historical)
   */
  async getUnifiedSnapshot(circle?: Circle): Promise<UnifiedProgressSnapshot> {
    // Real-time metrics
    const executionProgress = this.executionProgress?.calculateMetrics() || {
      overallPercentage: 0,
      estimatedTimeRemaining: 0,
      throughputRate: 0,
      elapsedTime: 0
    };

    const currentPhases = this.executionProgress?.getPhases() || [];

    // Historical completion
    let circleCompletion: CircleMetrics | null = null;
    let historicalAvgPct = 0;

    if (circle) {
      circleCompletion = await this.completionTracker.getCircleMetrics(circle);
      historicalAvgPct = circleCompletion?.avgCompletionPct || 0;
    }

    // Combined score: 60% execution + 40% historical
    const combinedScore = 
      (executionProgress.overallPercentage * 0.6) + 
      (historicalAvgPct * 0.4);

    return {
      executionProgress,
      currentPhases,
      circleCompletion,
      historicalAvgPct,
      combinedScore,
      timestamp: Date.now()
    };
  }

  /**
   * Get all traced issues
   */
  getIssues(): ProgressIssue[] {
    return [...this.issues];
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: 'warning' | 'error' | 'critical'): ProgressIssue[] {
    return this.issues.filter(i => i.severity === severity);
  }

  /**
   * Get recommended prod-cycle improvements
   */
  getImprovements(category?: string): ProdCycleImprovement[] {
    if (category) {
      return this.improvements.filter(i => i.category === category);
    }
    return [...this.improvements];
  }

  /**
   * Get high-priority improvements
   */
  getHighPriorityImprovements(): ProdCycleImprovement[] {
    return this.improvements.filter(i => i.priority === 'high');
  }

  /**
   * Close trackers and cleanup checkpoints
   */
  close(): void {
    // Clean up checkpoint on successful completion
    if (this.checkpointId) {
      this.deleteCheckpoint(this.checkpointId).catch(err =>
        console.warn(`Failed to delete checkpoint: ${err.message}`)
      );
    }
    this.completionTracker.close();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Trace progress issues during execution
   */
  private traceProgressIssues(
    phaseName: string,
    completed: number,
    total: number
  ): void {
    // Issue: Progress stalled
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const snapshot = this.executionProgress?.getSnapshot(phaseName);
    
    if (snapshot && percentage < 10 && snapshot.timestamp.getTime() > Date.now() - 30000) {
      this.addIssue({
        severity: 'warning',
        category: 'execution',
        message: `Phase ${phaseName} stuck at ${percentage.toFixed(1)}%`,
        phase: phaseName,
        timestamp: Date.now(),
        suggestedAction: 'Check for blocking operations or deadlocks'
      });
    }

    // Issue: Progress regression
    if (completed < 0) {
      this.addIssue({
        severity: 'error',
        category: 'execution',
        message: `Negative progress detected in ${phaseName}`,
        phase: phaseName,
        timestamp: Date.now(),
        suggestedAction: 'Fix progress calculation logic'
      });
    }

    // Issue: Overshoot
    if (completed > total && total > 0) {
      this.addIssue({
        severity: 'warning',
        category: 'execution',
        message: `Progress overshoot in ${phaseName}: ${completed}/${total}`,
        phase: phaseName,
        timestamp: Date.now(),
        suggestedAction: 'Cap progress at 100% or adjust total'
      });
    }
  }

  /**
   * Add issue to tracker
   */
  private addIssue(issue: ProgressIssue): void {
    this.issues.push(issue);

    // Log critical issues immediately
    if (issue.severity === 'critical') {
      console.error(`[CRITICAL] ${issue.message}`);
    }
  }

  /**
   * Check circle performance and trigger learning loop if needed
   */
  private async checkAndTriggerLearningLoop(circle: Circle): Promise<void> {
    const COMPLETION_THRESHOLD = 60; // Below 60% triggers learning
    const MIN_EPISODES = 3; // Need at least 3 episodes to determine trend
    
    try {
      const metrics = await this.completionTracker.getCircleMetrics(circle);
      
      if (!metrics) {
        return; // No historical data yet
      }
      
      // Check if circle is underperforming
      if (metrics.episodeCount >= MIN_EPISODES && 
          metrics.avgCompletionPct < COMPLETION_THRESHOLD) {
        
        this.addIssue({
          severity: 'warning',
          category: 'completion',
          message: `Circle ${circle} performance below threshold: ${metrics.avgCompletionPct.toFixed(1)}%`,
          circle,
          timestamp: Date.now(),
          suggestedAction: `Auto-triggering learning loop for ${circle}`
        });
        
        // Trigger learning loop (spawn as background process)
        await this.triggerLearningLoop(circle);
      }
    } catch (error) {
      // Don't fail episode completion if learning trigger fails
      console.warn(`Failed to check/trigger learning loop: ${(error as Error).message}`);
    }
  }
  
  /**
   * Trigger learning loop for a circle
   */
  private async triggerLearningLoop(circle: Circle): Promise<void> {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = path.join(__dirname, '../../scripts/ay-prod-learn-loop.sh');
    
    console.log(`🔄 Auto-triggering learning loop for ${circle} circle...`);
    
    // Spawn learning loop as detached background process
    const child = spawn(scriptPath, [circle, '3'], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref(); // Allow parent to exit independently
    
    console.log(`✅ Learning loop started (PID: ${child.pid})`);
  }

  /**
   * Calculate reward from outcome and confidence
   */
  private calculateReward(
    outcome: 'success' | 'failure' | 'partial',
    confidence: number
  ): number {
    const baseReward = {
      success: 1.0,
      partial: 0.5,
      failure: 0.0
    }[outcome];

    return baseReward * confidence;
  }

  /**
   * Save progress checkpoint for crash recovery
   */
  private async saveCheckpoint(): Promise<void> {
    if (!this.checkpointId || !this.executionProgress) {
      return;
    }
    
    const checkpoint = {
      id: this.checkpointId,
      phases: this.executionProgress.getPhases(),
      metrics: this.executionProgress.calculateMetrics(),
      issues: this.issues,
      timestamp: Date.now()
    };
    
    // Store checkpoint in database
    try {
      const checkpointJson = JSON.stringify(checkpoint);
      await this.completionTracker.agentdb.query(
        `INSERT OR REPLACE INTO completion_episodes 
         (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward, wsjf_context) 
         VALUES (?, 'system', 'checkpoint', 'partial', ?, 0.8, ?, 0.0, ?)`,
        [
          this.checkpointId,
          checkpoint.metrics.overallPercentage,
          checkpoint.timestamp,
          checkpointJson
        ]
      );
    } catch (error) {
      console.warn(`Checkpoint save failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Recover from checkpoint after crash
   */
  async recoverFromCheckpoint(checkpointId: string): Promise<PhaseProgress[] | null> {
    try {
      const rows = await this.completionTracker.agentdb.query(
        'SELECT wsjf_context FROM completion_episodes WHERE episode_id = ?',
        [checkpointId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const checkpoint = JSON.parse(rows[0].wsjf_context);
      console.log(`🔄 Recovered checkpoint from ${new Date(checkpoint.timestamp).toISOString()}`);
      console.log(`   Overall progress: ${checkpoint.metrics.overallPercentage.toFixed(1)}%`);
      
      return checkpoint.phases;
    } catch (error) {
      console.error(`Checkpoint recovery failed: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Delete checkpoint after successful completion
   */
  private async deleteCheckpoint(checkpointId: string): Promise<void> {
    try {
      await this.completionTracker.agentdb.query(
        'DELETE FROM completion_episodes WHERE episode_id = ?',
        [checkpointId]
      );
    } catch (error) {
      // Ignore deletion errors
    }
  }
  
  /**
   * Cleanup stale checkpoints (>24 hours old)
   */
  async cleanupStaleCheckpoints(): Promise<number> {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    
    try {
      const result = await this.completionTracker.agentdb.query(
        'DELETE FROM completion_episodes WHERE ceremony = "checkpoint" AND timestamp < ?',
        [cutoffTime]
      );
      
      const deleted = result[0]?.changes || 0;
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} stale checkpoint(s)`);
      }
      return deleted;
    } catch (error) {
      console.warn(`Checkpoint cleanup failed: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Initialize prod-cycle improvements
   */
  private initializeImprovements(): void {
    this.improvements = [
      {
        id: 'improve-001',
        priority: 'high',
        category: 'observability',
        title: 'Add real-time progress streaming',
        description: 'Stream progress updates via WebSocket for live dashboard monitoring',
        estimatedImpact: 'Better visibility during long-running ceremonies',
        implementationNotes: [
          'Add WebSocket server to ay-prod-cycle.sh',
          'Stream ProcessingProgress events as JSON',
          'Update web dashboard to consume WebSocket stream'
        ]
      },
      {
        id: 'improve-002',
        priority: 'high',
        category: 'reliability',
        title: 'Checkpoint-based progress recovery',
        description: 'Save progress checkpoints to resume after interruption',
        estimatedImpact: 'Prevent full re-runs after failures',
        implementationNotes: [
          'Persist ProcessingProgress state to SQLite',
          'Add resume logic to ay-prod-cycle.sh',
          'Implement cleanup for stale checkpoints (>24h)'
        ]
      },
      {
        id: 'improve-003',
        priority: 'medium',
        category: 'performance',
        title: 'Parallel ceremony execution',
        description: 'Run independent ceremonies in parallel instead of sequential',
        estimatedImpact: '40-60% reduction in total execution time',
        implementationNotes: [
          'Identify ceremony dependencies (orchestrator → assessor → etc.)',
          'Use Promise.all() for independent ceremonies',
          'Add dependency graph to PipelinePhaseFactory'
        ]
      },
      {
        id: 'improve-004',
        priority: 'high',
        category: 'observability',
        title: 'Progress anomaly detection',
        description: 'Detect and alert on abnormal progress patterns',
        estimatedImpact: 'Early detection of blocking issues',
        implementationNotes: [
          'Track progress velocity (∆% per minute)',
          'Alert when velocity drops below 5%/min',
          'Integrate with issue tracer (already implemented)'
        ]
      },
      {
        id: 'improve-005',
        priority: 'medium',
        category: 'reliability',
        title: 'Automatic retry on transient failures',
        description: 'Retry failed phases with exponential backoff',
        estimatedImpact: 'Reduce manual intervention by 30-50%',
        implementationNotes: [
          'Add retry configuration to PhaseProgress',
          'Implement exponential backoff in ay-prod-cycle.sh',
          'Log retry attempts to completion tracker'
        ]
      },
      {
        id: 'improve-006',
        priority: 'medium',
        category: 'performance',
        title: 'Smart completion prediction',
        description: 'Use ML to predict ceremony completion time based on historical data',
        estimatedImpact: 'More accurate ETA predictions',
        implementationNotes: [
          'Train simple linear regression on historical episodes',
          'Input features: circle, ceremony, time-of-day',
          'Update ProgressCalculator.estimateTimeRemaining()'
        ]
      },
      {
        id: 'improve-007',
        priority: 'low',
        category: 'observability',
        title: 'Progress heatmap visualization',
        description: 'Show completion % heatmap by circle × ceremony over time',
        estimatedImpact: 'Identify low-performing circle/ceremony pairs',
        implementationNotes: [
          'Query circle_metrics view grouped by ceremony',
          'Render heatmap in completion-dashboard.sh',
          'Add export to PNG for reports'
        ]
      },
      {
        id: 'improve-008',
        priority: 'high',
        category: 'reliability',
        title: 'Integrate MCP health checks with progress',
        description: 'Automatically pause/resume progress on MCP degradation',
        estimatedImpact: 'Prevent cascading failures during MCP outages',
        implementationNotes: [
          'Add MCP health check to ProcessingProgress',
          'Pause progress updates when MCP degraded',
          'Resume automatically when MCP recovers'
        ]
      }
    ];
  }
}

export default UnifiedProgressTracker;

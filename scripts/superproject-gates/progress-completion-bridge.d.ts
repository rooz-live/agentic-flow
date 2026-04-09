/**
 * Progress-Completion Bridge
 *
 * Integrates two tracking systems:
 * 1. Real-time Progress (src/domain/progress/index.ts) - Live execution tracking
 * 2. Completion Tracker (src/core/completion-tracker.ts) - Historical metrics
 *
 * Purpose: Convert real-time progress events into completion episodes
 */
import { ProcessingProgress, PhaseProgress, ProgressMetrics } from '../domain/progress/index.js';
import { CompletionTracker, Episode, Circle } from './completion-tracker.js';
interface BridgeConfig {
    /** Enable automatic episode creation from progress events */
    autoCreateEpisodes: boolean;
    /** Minimum completion percentage to consider phase "successful" */
    successThreshold: number;
    /** Map phase names to circles */
    phaseToCircleMap: Record<string, Circle>;
}
export declare class ProgressCompletionBridge {
    private progressTracker;
    private completionTracker;
    private config;
    private episodeBuffer;
    constructor(progressTracker: ProcessingProgress, completionTracker: CompletionTracker, config?: Partial<BridgeConfig>);
    /**
     * Start monitoring progress events and converting to episodes
     */
    startMonitoring(): Promise<void>;
    /**
     * Process progress events and create episodes
     */
    private processProgressEvents;
    /**
     * Handle individual progress event
     */
    private handleProgressEvent;
    /**
     * Handle phase completion - create episode
     */
    private onPhaseCompleted;
    /**
     * Handle progress update - buffer partial episode data
     */
    private onPhaseProgressUpdated;
    /**
     * Handle pipeline completion - aggregate metrics
     */
    private onPipelineCompleted;
    /**
     * Get real-time progress combined with historical completion
     */
    getCombinedMetrics(): Promise<{
        realtime: ProgressMetrics;
        historical: {
            circle: string;
            avgCompletion: number;
            episodeCount: number;
        }[];
    }>;
    /**
     * Export current progress as episodes (for manual testing)
     */
    exportProgressAsEpisodes(): Promise<Episode[]>;
    private inferOutcome;
    private calculateConfidence;
}
export declare function createIntegratedTracker(pipelineId: string, phases: PhaseProgress[]): Promise<{
    progress: ProcessingProgress;
    completion: CompletionTracker;
    bridge: ProgressCompletionBridge;
}>;
export {};
//# sourceMappingURL=progress-completion-bridge.d.ts.map
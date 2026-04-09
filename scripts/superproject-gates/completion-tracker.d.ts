/**
 * @fileoverview Completion Tracking with Rolling Aggregation
 * Implements hierarchical completion tracking: Episode → Circle → Phase
 *
 * Domain-Driven Design Structure:
 * - Episode Context: Atomic completion units
 * - Circle Context: Team/role aggregations
 * - Phase Context: Project stage rollups
 *
 * @see docs/architecture/ADR-002-completion-tracking.md
 */
import { AgentDB } from './agentdb-client.js';
export type Circle = 'orchestrator' | 'assessor' | 'innovator' | 'analyst' | 'seeker' | 'intuitive';
export type Phase = 'A' | 'B' | 'C' | 'D';
export type Outcome = 'success' | 'failure' | 'partial';
/**
 * Episode aggregate (atomic unit)
 */
export interface Episode {
    episode_id: string;
    circle: Circle;
    ceremony: string;
    outcome: Outcome;
    completion_pct: number;
    confidence: number;
    timestamp: number;
    reward?: number;
}
/**
 * Circle metrics value object
 */
export interface CircleMetrics {
    circle: Circle;
    avgCompletionPct: number;
    episodeCount: number;
    successRate: number;
    avgConfidence: number;
    lastUpdated: number;
}
/**
 * Phase metrics aggregate
 */
export interface PhaseMetrics {
    phase: Phase;
    overallCompletionPct: number;
    criticalPathPct: number;
    activeCircles: number;
    circleBreakdown: Record<string, number>;
}
/**
 * System-wide overview
 */
export interface SystemMetrics {
    totalEpisodes: number;
    overallCompletionPct: number;
    phases: PhaseMetrics[];
    lastUpdated: number;
}
export declare class CompletionTracker {
    agentdb: AgentDB;
    private circleCache;
    private phaseCache;
    private readonly CIRCLE_CACHE_TTL;
    private readonly PHASE_CACHE_TTL;
    constructor();
    /**
     * Initialize database schema for completion tracking
     */
    initSchema(): Promise<void>;
    /**
     * Store episode with completion tracking
     */
    storeEpisode(episode: Episode): Promise<void>;
    /**
     * Update episode completion percentage
     */
    updateEpisodeCompletion(episodeId: string, completionPct: number): Promise<void>;
    /**
     * Get episode completion percentage
     */
    getEpisodeCompletion(episodeId: string): Promise<number | null>;
    /**
     * Get circle metrics with caching
     */
    getCircleMetrics(circle: Circle): Promise<CircleMetrics | null>;
    /**
     * Get metrics for all circles
     */
    getAllCircleMetrics(): Promise<CircleMetrics[]>;
    /**
     * Get phase metrics with caching
     */
    getPhaseMetrics(phase: Phase): Promise<PhaseMetrics | null>;
    /**
     * Get metrics for all phases
     */
    getAllPhaseMetrics(): Promise<PhaseMetrics[]>;
    /**
     * Get complete system metrics
     */
    getSystemOverview(): Promise<SystemMetrics>;
    /**
     * Invalidate caches
     */
    invalidateCache(level: 'circle' | 'phase' | 'all'): void;
    /**
     * Infer completion percentage from outcome
     */
    private inferCompletionPct;
    /**
     * Close database connection
     */
    close(): void;
}
export default CompletionTracker;
//# sourceMappingURL=completion-tracker.d.ts.map
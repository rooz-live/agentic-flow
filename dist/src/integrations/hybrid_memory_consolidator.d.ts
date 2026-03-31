/**
 * Hybrid Memory Consolidator: MIRAS + AgentDB Integration
 * @module integrations/hybrid_memory_consolidator
 *
 * Implements the hybrid memory architecture based on PoC results:
 * - MIRAS: Long-term strategic memory (1.71x compression, 48.8% retention, 100% retrieval)
 * - AgentDB: Operational memory (100% retention, recent context)
 *
 * Consolidation Pipeline:
 * 1. AgentDB captures all operational events (ReflexionMemory)
 * 2. Nightly consolidation filters high-surprise events → MIRAS
 * 3. MIRAS maintains compressed long-term strategic memory
 *
 * Based on: Google Titans+MIRAS (arXiv:2501.00663) test-time memorization
 */
import { EventEmitter } from 'events';
export interface MemoryEvent {
    id: string;
    timestamp: string;
    eventType: string;
    reward?: {
        value: number;
        components?: {
            success?: number;
        };
        status?: string;
    };
    state?: Record<string, unknown>;
    action?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    _miras_surprise?: number;
    _consolidation_tier?: 'operational' | 'strategic';
}
export interface ConsolidationConfig {
    surpriseThreshold: number;
    maxStrategicMemories: number;
    maxOperationalDays: number;
    consolidationSchedule: string;
    trajectoriesPath: string;
    strategicMemoryPath: string;
    metricsPath: string;
}
export interface ConsolidationMetrics {
    lastRun: string;
    operationalEvents: number;
    strategicMemories: number;
    eventsConsolidated: number;
    compressionRatio: number;
    avgSurpriseScore: number;
    retentionRate: number;
}
export declare class HybridMemoryConsolidator extends EventEmitter {
    private config;
    private operationalMemory;
    private strategicMemory;
    constructor(config?: Partial<ConsolidationConfig>);
    /**
     * Compute surprise score for an event (Enhanced MIRAS algorithm v2)
     * Higher surprise = more information value = higher retention priority
     *
     * Enhancement factors for 1.71x compression target:
     * 1. Temporal decay: Recent events slightly less surprising (already in context)
     * 2. Event type weighting: Rare event types are more surprising
     * 3. Semantic novelty: Events with unique state keys are more valuable
     * 4. Outcome deviation: Large deviations from expected values
     */
    private eventTypeFrequency;
    private seenStateKeys;
    computeSurprise(event: MemoryEvent): number;
    /**
     * Reset frequency tracking (call before new consolidation cycle)
     */
    resetFrequencyTracking(): void;
    /**
     * Load operational events from AgentDB trajectories
     */
    loadOperationalMemory(): MemoryEvent[];
    /**
     * Load existing strategic memory (MIRAS long-term)
     */
    loadStrategicMemory(): MemoryEvent[];
    /**
     * Compute semantic similarity between two events (Jaccard coefficient)
     * Used for deduplication to improve compression ratio
     */
    private computeSemanticSimilarity;
    /**
     * Execute nightly consolidation: AgentDB → MIRAS
     * Enhanced with semantic deduplication for 1.71x compression target
     */
    consolidate(): Promise<ConsolidationMetrics>;
    /**
     * Retrieve memories using hybrid strategy:
     * 1. Recent operational memory for context
     * 2. High-surprise strategic memory for patterns
     */
    retrieve(query: Partial<MemoryEvent>, options?: {
        k?: number;
        tier?: 'all' | 'operational' | 'strategic';
    }): MemoryEvent[];
    getMetrics(): {
        operational: number;
        strategic: number;
        compressionRatio: number;
    };
}
//# sourceMappingURL=hybrid_memory_consolidator.d.ts.map
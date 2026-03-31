/**
 * MYM Alignment Scorer
 *
 * Implements Manthra/Yasna/Mithra alignment scoring for ROAM validation.
 * Based on Zoroastrian philosophical framework applied to governance.
 *
 * Three Dimensions:
 * - Manthra (🧠): Intention alignment - TRUTH dimension
 * - Yasna (🙏): Documentation accuracy - TIME dimension
 * - Mithra (⚖️): Implementation coherence - LIVE dimension
 *
 * Co-Authored-By: Warp <agent@warp.dev>
 */
export type TemporalRank = 'century' | 'decade' | 'year' | 'season' | 'month' | 'week' | 'day' | 'hour' | 'now' | 'next' | 'later';
/**
 * MYM dimension types
 */
export type MYMDimension = 'manthra' | 'yasna' | 'mithra';
/**
 * Alignment score (0-1)
 */
export interface AlignmentScore {
    dimension: MYMDimension;
    score: number;
    confidence: number;
    evidence: Evidence[];
    timestamp: number;
}
/**
 * Evidence supporting alignment score
 */
export interface Evidence {
    type: 'metric' | 'decision' | 'pattern' | 'observation';
    description: string;
    value: number;
    weight: number;
}
/**
 * Complete MYM alignment assessment
 */
export interface MYMAlignment {
    manthra: AlignmentScore;
    yasna: AlignmentScore;
    mithra: AlignmentScore;
    overall: number;
    balanced: boolean;
    timestamp: number;
}
/**
 * ROAM entry with MYM scoring
 */
export interface ROAMWithMYM {
    id: string;
    title: string;
    roam_status: 'OWNED' | 'ACCEPTED' | 'RESOLVED' | 'MITIGATED';
    mym_scores?: MYMAlignment;
    last_scored?: number;
}
export declare class MYMAlignmentScorer {
    /**
     * Score Manthra (Directed Thought-Power) - TRUTH dimension
     *
     * Measures:
     * - Pattern metrics coverage (direct measurement vs proxy)
     * - Data freshness and accuracy
     * - Honest description without distortion
     */
    scoreManthra(context: {
        patternMetrics?: {
            total: number;
            enriched: number;
        };
        dataAge?: number;
        measurementType?: 'direct' | 'proxy';
    }): Promise<AlignmentScore>;
    /**
     * Score Yasna (Documentation accuracy) - TIME dimension
     *
     * Measures:
     * - Decision audit coverage and quality
     * - Action-outcome alignment
     * - Temporal consistency and Freshness Ranking
     */
    scoreYasna(context: {
        decisionAudit?: {
            total: number;
            withContext: number;
        };
        actionOutcomeAlignment?: number;
        temporalConsistency?: number;
        temporalRank?: TemporalRank;
    }): Promise<AlignmentScore>;
    /**
     * Score Mithra (Implementation coherence) - LIVE dimension
     *
     * Measures:
     * - Thought↔Word↔Deed consistency
     * - Adaptive calibration effectiveness
     * - Learning, threshold adjustment, and Sprawl clean-up
     */
    scoreMithra(context: {
        circuitBreaker?: {
            learned: boolean;
            samplesAnalyzed: number;
        };
        adaptiveCalibration?: number;
        thoughtWordDeedAlignment?: number;
        sprawlCleanupRisk?: number;
        utilizationMetrics?: {
            mostCapable: boolean;
            cycleExecutions: number;
        };
    }): Promise<AlignmentScore>;
    /**
     * Calculate complete MYM alignment
     */
    calculateAlignment(context: {
        manthra?: Parameters<typeof this.scoreManthra>[0];
        yasna?: Parameters<typeof this.scoreYasna>[0];
        mithra?: Parameters<typeof this.scoreMithra>[0];
    }): Promise<MYMAlignment>;
    /**
     * Get default score for dimension
     */
    private getDefaultScore;
    /**
     * Format MYM alignment for display
     */
    formatAlignment(alignment: MYMAlignment): string;
    /**
     * Get status emoji for score
     */
    private getStatusEmoji;
}
export declare const mymScorer: MYMAlignmentScorer;
//# sourceMappingURL=mym_alignment_scorer.d.ts.map
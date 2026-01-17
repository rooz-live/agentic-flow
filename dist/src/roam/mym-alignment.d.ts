/**
 * ROAM Falsifiability & MYM Alignment Scoring
 * MYM: Manthra (Intention) / Yasna (Documentation) / Mithra (Implementation)
 *
 * Validates truth in marketing vs. advertising claims
 * Prevents "hallucinated capabilities" in documentation
 */
import { CoherenceCheckResult, PRContext } from '../verification/mithra_coherence';
export interface MYMScore {
    manthra: number;
    yasna: number;
    mithra: number;
    overall: number;
    falsifiable: boolean;
    timestamp: string;
}
export interface ROAMEntry {
    id: string;
    pattern: string;
    rationale?: string;
    claimed: string[];
    actual: string[];
    evidence: Evidence[];
    staleness: number;
    mymScore?: MYMScore;
}
export interface Evidence {
    type: 'TEST' | 'CODE' | 'METRICS' | 'USER_FEEDBACK';
    source: string;
    data: Record<string, unknown>;
    timestamp: string;
    verifiable: boolean;
}
export interface FalsifiabilityCriteria {
    testable: boolean;
    measurable: boolean;
    observable: boolean;
    reproducible: boolean;
    reason?: string;
}
export declare class MYMAlignmentScorer {
    /**
     * Calculate MYM alignment scores for a ROAM entry
     */
    calculateAlignment(entry: ROAMEntry): MYMScore;
    /**
     * Manthra: Intention Alignment
     * Measures if stated intentions match actual implementation goals
     */
    private scoreManthra;
    /**
     * Yasna: Documentation Accuracy
     * Measures if documentation reflects actual capabilities
     */
    private scoreYasna;
    /**
     * Mithra: Implementation Coherence
     * Measures if actual implementation matches documentation and intention
     */
    private scoreMithra;
    /**
     * Check if claims are falsifiable (testable)
     */
    checkFalsifiability(entry: ROAMEntry): FalsifiabilityCriteria;
    /**
     * Generate MYM alignment report
     */
    generateReport(entries: ROAMEntry[]): MYMAlignmentReport;
    private generateRecommendations;
    /**
     * Integrate with Mithra Coherence validation
     */
    validateWithMithra(entry: ROAMEntry, prContext: PRContext): {
        mymScore: MYMScore;
        coherence: CoherenceCheckResult;
        aligned: boolean;
    };
}
export interface MYMAlignmentReport {
    summary: {
        totalEntries: number;
        avgManthra: number;
        avgYasna: number;
        avgMithra: number;
        avgOverall: number;
        falsifiablePercent: number;
        staleCount: number;
        missingRationaleCount: number;
    };
    scores: Array<{
        entry: ROAMEntry;
        score: MYMScore;
    }>;
    criticalIssues: string[];
    recommendations: string[];
    timestamp: string;
}
export declare class ROAMStalenessMonitor {
    checkStaleness(entries: ROAMEntry[], targetDays?: number): {
        stale: ROAMEntry[];
        fresh: ROAMEntry[];
        summary: string;
    };
    generateStalenessReport(entries: ROAMEntry[]): string;
}
export declare const ROAM: {
    Scorer: typeof MYMAlignmentScorer;
    StalenessMonitor: typeof ROAMStalenessMonitor;
};
//# sourceMappingURL=mym-alignment.d.ts.map
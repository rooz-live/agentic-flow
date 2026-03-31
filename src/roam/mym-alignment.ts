/**
 * ROAM Falsifiability & MYM Alignment Scoring
 * MYM: Manthra: Intention alignment (TRUTH dimension) / Yasna: Documentation accuracy (TIME dimension) / Mithra: Implementation coherence (LIVE dimension)
 * 
 * Validates truth in marketing vs. advertising claims
 * Prevents "hallucinated capabilities" in documentation
 */

import { CoherenceCheckResult, measureCoherence, PRContext } from '../verification/mithra_coherence';

// ========================================
// MYM Alignment Framework
// ========================================

export interface MYMScore {
  manthra: number; // Intention alignment (TRUTH dimension) (0-100)
  yasna: number; // Documentation accuracy (TIME dimension) (0-100)
  mithra: number; // Implementation coherence (LIVE dimension) (0-100)
  overall: number; // Weighted average
  falsifiable: boolean; // Can claims be tested?
  timestamp: string;
}

export type TemporalRank = 
  | 'century' | 'decade' | 'year' | 'season' | 'month' | 'week' | 'day' | 'hour'
  | 'now' | 'next' | 'later';

export interface UtilizationMetrics {
  executionCount: number;
  lastCycleCount: number;
  mostCapableScript: boolean;
  sprawlCleanupRisk: number; // 0-1 (higher means greater risk to WSJF)
}

export interface ROAMEntry {
  id: string;
  pattern: string;
  rationale?: string;
  claimed: string[]; // What we say we do
  actual: string[]; // What we actually do
  evidence: Evidence[];
  staleness: number; // Days since last update
  temporalRank?: TemporalRank;
  utilization?: UtilizationMetrics;
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

// ========================================
// MYM Alignment Scorer
// ========================================

export class MYMAlignmentScorer {
  /**
   * Calculate MYM alignment scores for a ROAM entry
   */
  calculateAlignment(entry: ROAMEntry): MYMScore {
    const manthra = this.scoreManthra(entry);
    const yasna = this.scoreYasna(entry);
    const mithra = this.scoreMithra(entry);
    
    // Weighted: Mithra (implementation) is most important (50%)
    // Yasna (docs) 30%, Manthra (intention) 20%
    const overall = mithra * 0.5 + yasna * 0.3 + manthra * 0.2;
    
    const falsifiable = this.checkFalsifiability(entry).testable;
    
    return {
      manthra,
      yasna,
      mithra,
      overall,
      falsifiable,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manthra: Intention alignment (TRUTH dimension)
   * Measures if stated intentions match actual implementation goals
   */
  private scoreManthra(entry: ROAMEntry): number {
    let score = 100;
    
    // Check if rationale exists
    if (!entry.rationale) {
      score -= 30;
    }
    
    // Check if claimed capabilities have corresponding actual implementations
    const claimedSet = new Set(entry.claimed);
    const actualSet = new Set(entry.actual);
    
    const overlapCount = entry.claimed.filter(c => actualSet.has(c)).length;
    const alignmentRatio = entry.claimed.length > 0 ? overlapCount / entry.claimed.length : 0;
    
    score *= alignmentRatio;
    
    // Penalty for abandoned features (claimed but never implemented)
    const abandoned = entry.claimed.filter(c => !actualSet.has(c));
    score -= abandoned.length * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Yasna: Documentation accuracy (TIME dimension)
   * Measures if documentation reflects actual capabilities
   */
  private scoreYasna(entry: ROAMEntry): number {
    let score = 100;
    
    // Evidence quality check
    const hasEvidence = entry.evidence.length > 0;
    if (!hasEvidence) {
      score -= 40;
    }
    
    // Verifiable evidence ratio
    const verifiable = entry.evidence.filter(e => e.verifiable).length;
    const evidenceQuality = entry.evidence.length > 0 ? verifiable / entry.evidence.length : 0;
    score *= evidenceQuality;
    
    // Calculate Temporal Freshness based on Rank / Staleness
    if (entry.temporalRank) {
      const temporalWeights: Record<TemporalRank, number> = {
        'hour': 0, 'day': 2, 'week': 5, 'month': 15, 'season': 25, 
        'year': 40, 'decade': 60, 'century': 80,
        'now': 0, 'next': 10, 'later': 20
      };
      score -= temporalWeights[entry.temporalRank];
    } else {
      // Fallback Staleness penalty (target: <3 days)
      if (entry.staleness > 3) {
        const stalenessPenalty = Math.min(30, (entry.staleness - 3) * 5);
        score -= stalenessPenalty;
      }
    }
    
    // Check for "hallucinated capabilities" (claimed without evidence)
    const unverifiedClaims = entry.claimed.filter(claim => {
      return !entry.evidence.some(e => 
        JSON.stringify(e.data).toLowerCase().includes(claim.toLowerCase())
      );
    });
    
    score -= unverifiedClaims.length * 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Mithra: Implementation coherence (LIVE dimension)
   * Measures if actual implementation matches documentation and intention
   */
  private scoreMithra(entry: ROAMEntry): number {
    let score = 100;
    
    // Check implementation-to-claim ratio
    const implementationRatio = entry.claimed.length > 0 
      ? entry.actual.length / entry.claimed.length 
      : 0;
    
    // Ideal: actual === claimed (ratio = 1.0)
    if (implementationRatio < 1.0) {
      // Under-implementation penalty
      score *= implementationRatio;
    } else if (implementationRatio > 1.5) {
      // Over-implementation (scope creep) penalty
      score -= 15;
    }
    
    // Utilization and Clean-up risk
    if (entry.utilization) {
      if (entry.utilization.sprawlCleanupRisk > 0.7) {
        score -= 20; // High sprawl risk
      }
      if (entry.utilization.mostCapableScript) {
        score += 15; // Bonus for high utilization capability
      }
    }
    
    // Test evidence weight (strongest proof)
    const testEvidence = entry.evidence.filter(e => e.type === 'TEST');
    if (testEvidence.length === 0) {
      score -= 25;
    }
    
    // Code evidence (actual implementation)
    const codeEvidence = entry.evidence.filter(e => e.type === 'CODE');
    if (codeEvidence.length === 0) {
      score -= 20;
    }
    
    // Metrics evidence (production validation)
    const metricsEvidence = entry.evidence.filter(e => e.type === 'METRICS');
    if (metricsEvidence.length > 0) {
      score += 10; // Bonus for production metrics
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if claims are falsifiable (testable)
   */
  checkFalsifiability(entry: ROAMEntry): FalsifiabilityCriteria {
    let testable = true;
    let measurable = true;
    let observable = true;
    let reproducible = true;
    let reason = '';

    // Claims must have corresponding tests
    const hasTests = entry.evidence.some(e => e.type === 'TEST');
    if (!hasTests) {
      testable = false;
      reason += 'No test evidence. ';
    }

    // Claims must have measurable outcomes
    const hasMetrics = entry.evidence.some(e => e.type === 'METRICS');
    if (!hasMetrics) {
      measurable = false;
      reason += 'No quantifiable metrics. ';
    }

    // Implementation must be observable
    const hasCode = entry.evidence.some(e => e.type === 'CODE');
    if (!hasCode) {
      observable = false;
      reason += 'No code evidence. ';
    }

    // Results must be reproducible
    const verifiableCount = entry.evidence.filter(e => e.verifiable).length;
    if (verifiableCount < entry.evidence.length * 0.7) {
      reproducible = false;
      reason += 'Less than 70% verifiable evidence. ';
    }

    return {
      testable: testable && hasTests,
      measurable: measurable && hasMetrics,
      observable: observable && hasCode,
      reproducible: reproducible && (verifiableCount >= 1),
      reason: reason || undefined,
    };
  }

  /**
   * Generate MYM alignment report
   */
  generateReport(entries: ROAMEntry[]): MYMAlignmentReport {
    const scores = entries.map(e => {
      const score = this.calculateAlignment(e);
      return { entry: e, score };
    });

    const avgManthra = scores.reduce((s, x) => s + x.score.manthra, 0) / scores.length;
    const avgYasna = scores.reduce((s, x) => s + x.score.yasna, 0) / scores.length;
    const avgMithra = scores.reduce((s, x) => s + x.score.mithra, 0) / scores.length;
    const avgOverall = scores.reduce((s, x) => s + x.score.overall, 0) / scores.length;

    const falsifiableCount = scores.filter(s => s.score.falsifiable).length;
    const falsifiablePercent = (falsifiableCount / scores.length) * 100;

    const staleEntries = entries.filter(e => e.staleness > 3);
    const entriesWithoutRationale = entries.filter(e => !e.rationale);

    const criticalIssues: string[] = [];
    if (avgOverall < 70) criticalIssues.push('Overall MYM score below 70%');
    if (falsifiablePercent < 80) criticalIssues.push('Less than 80% falsifiable claims');
    if (staleEntries.length > entries.length * 0.2) criticalIssues.push('More than 20% stale entries (>3 days)');
    if (entriesWithoutRationale.length > entries.length * 0.3) criticalIssues.push('More than 30% entries missing rationale');

    return {
      summary: {
        totalEntries: entries.length,
        avgManthra,
        avgYasna,
        avgMithra,
        avgOverall,
        falsifiablePercent,
        staleCount: staleEntries.length,
        missingRationaleCount: entriesWithoutRationale.length,
      },
      scores,
      criticalIssues,
      recommendations: this.generateRecommendations(scores),
      timestamp: new Date().toISOString(),
    };
  }

  private generateRecommendations(scores: Array<{ entry: ROAMEntry; score: MYMScore }>): string[] {
    const recommendations: string[] = [];

    // Find low-scoring entries
    const lowManthra = scores.filter(s => s.score.manthra < 60);
    if (lowManthra.length > 0) {
      recommendations.push(`${lowManthra.length} entries have low Manthra (intention/TRUTH) scores. Add rationale and align claims with implementation.`);
    }

    const lowYasna = scores.filter(s => s.score.yasna < 60);
    if (lowYasna.length > 0) {
      recommendations.push(`${lowYasna.length} entries have low Yasna (documentation/TIME) scores. Add verifiable evidence and update stale entries.`);
    }

    const lowMithra = scores.filter(s => s.score.mithra < 60);
    if (lowMithra.length > 0) {
      recommendations.push(`${lowMithra.length} entries have low Mithra (implementation/LIVE) scores. Add tests and ensure actual implementation matches claims.`);
    }

    const unfalsifiable = scores.filter(s => !s.score.falsifiable);
    if (unfalsifiable.length > 0) {
      recommendations.push(`${unfalsifiable.length} entries have unfalsifiable claims. Add test evidence to make claims verifiable.`);
    }

    return recommendations;
  }

  /**
   * Integrate with Mithra Coherence validation
   */
  validateWithMithra(entry: ROAMEntry, prContext: PRContext): {
    mymScore: MYMScore;
    coherence: CoherenceCheckResult;
    aligned: boolean;
  } {
    const mymScore = this.calculateAlignment(entry);
    const coherence = measureCoherence(prContext);

    // Check if MYM and Mithra coherence align
    const mymThreshold = 70;
    const coherenceThreshold = 0.7;
    const aligned = mymScore.overall >= mymThreshold && coherence.score >= coherenceThreshold;

    return {
      mymScore,
      coherence,
      aligned,
    };
  }
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
  scores: Array<{ entry: ROAMEntry; score: MYMScore }>;
  criticalIssues: string[];
  recommendations: string[];
  timestamp: string;
}

// ========================================
// ROAM Staleness Monitor
// ========================================

export class ROAMStalenessMonitor {
  checkStaleness(entries: ROAMEntry[], targetDays: number = 3): {
    stale: ROAMEntry[];
    fresh: ROAMEntry[];
    summary: string;
  } {
    const stale = entries.filter(e => e.staleness > targetDays);
    const fresh = entries.filter(e => e.staleness <= targetDays);

    const summary = `${stale.length}/${entries.length} entries are stale (>${targetDays} days old). Target: <${targetDays} days.`;

    return { stale, fresh, summary };
  }

  determineTemporalRank(daysOld: number): TemporalRank {
    if (daysOld < 1/24) return 'hour';
    if (daysOld < 1) return 'day';
    if (daysOld < 7) return 'week';
    if (daysOld < 30) return 'month';
    if (daysOld < 90) return 'season';
    if (daysOld < 365) return 'year';
    if (daysOld < 3650) return 'decade';
    return 'century';
  }

  generateStalenessReport(entries: ROAMEntry[]): string {
    const staleness = this.checkStaleness(entries);
    const avgStaleness = entries.reduce((s, e) => s + e.staleness, 0) / entries.length;

    // Enhance ROAM entries with temporal rank on the fly
    const enhancedEntries = entries.map(e => ({
      ...e,
      temporalRank: e.temporalRank || this.determineTemporalRank(e.staleness)
    }));

    return `
# ROAM Staleness Report
Generated: ${new Date().toISOString()}

## Summary
- Total Entries: ${entries.length}
- Fresh (<3 days): ${staleness.fresh.length}
- Stale (>3 days): ${staleness.stale.length}
- Average Age: ${avgStaleness.toFixed(1)} days

## Stale Entries (>${3} days old)
${staleness.stale.map(e => {
  const rank = e.temporalRank || this.determineTemporalRank(e.staleness);
  return `- ${e.pattern} (${e.staleness} days old) [Rank: ${rank}]`;
}).join('\n')}

## Recommendation
${staleness.stale.length > 0 ? 'Update stale entries to maintain ROAM accuracy.' : '✅ All entries are fresh.'}
    `.trim();
  }
}

// ========================================
// Export Unified API
// ========================================

export const ROAM = {
  Scorer: MYMAlignmentScorer,
  StalenessMonitor: ROAMStalenessMonitor,
};

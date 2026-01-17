/**
 * ROAM Falsifiability & MYM Alignment Scoring
 * MYM: Manthra (Intention) / Yasna (Documentation) / Mithra (Implementation)
 *
 * Validates truth in marketing vs. advertising claims
 * Prevents "hallucinated capabilities" in documentation
 */
import { measureCoherence } from '../verification/mithra_coherence';
// ========================================
// MYM Alignment Scorer
// ========================================
export class MYMAlignmentScorer {
    /**
     * Calculate MYM alignment scores for a ROAM entry
     */
    calculateAlignment(entry) {
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
     * Manthra: Intention Alignment
     * Measures if stated intentions match actual implementation goals
     */
    scoreManthra(entry) {
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
     * Yasna: Documentation Accuracy
     * Measures if documentation reflects actual capabilities
     */
    scoreYasna(entry) {
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
        // Staleness penalty (target: <3 days)
        if (entry.staleness > 3) {
            const stalenessPenalty = Math.min(30, (entry.staleness - 3) * 5);
            score -= stalenessPenalty;
        }
        // Check for "hallucinated capabilities" (claimed without evidence)
        const unverifiedClaims = entry.claimed.filter(claim => {
            return !entry.evidence.some(e => JSON.stringify(e.data).toLowerCase().includes(claim.toLowerCase()));
        });
        score -= unverifiedClaims.length * 15;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Mithra: Implementation Coherence
     * Measures if actual implementation matches documentation and intention
     */
    scoreMithra(entry) {
        let score = 100;
        // Check implementation-to-claim ratio
        const implementationRatio = entry.claimed.length > 0
            ? entry.actual.length / entry.claimed.length
            : 0;
        // Ideal: actual === claimed (ratio = 1.0)
        if (implementationRatio < 1.0) {
            // Under-implementation penalty
            score *= implementationRatio;
        }
        else if (implementationRatio > 1.5) {
            // Over-implementation (scope creep) penalty
            score -= 15;
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
    checkFalsifiability(entry) {
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
    generateReport(entries) {
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
        const criticalIssues = [];
        if (avgOverall < 70)
            criticalIssues.push('Overall MYM score below 70%');
        if (falsifiablePercent < 80)
            criticalIssues.push('Less than 80% falsifiable claims');
        if (staleEntries.length > entries.length * 0.2)
            criticalIssues.push('More than 20% stale entries (>3 days)');
        if (entriesWithoutRationale.length > entries.length * 0.3)
            criticalIssues.push('More than 30% entries missing rationale');
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
    generateRecommendations(scores) {
        const recommendations = [];
        // Find low-scoring entries
        const lowManthra = scores.filter(s => s.score.manthra < 60);
        if (lowManthra.length > 0) {
            recommendations.push(`${lowManthra.length} entries have low Manthra (intention) scores. Add rationale and align claims with implementation.`);
        }
        const lowYasna = scores.filter(s => s.score.yasna < 60);
        if (lowYasna.length > 0) {
            recommendations.push(`${lowYasna.length} entries have low Yasna (documentation) scores. Add verifiable evidence and update stale entries.`);
        }
        const lowMithra = scores.filter(s => s.score.mithra < 60);
        if (lowMithra.length > 0) {
            recommendations.push(`${lowMithra.length} entries have low Mithra (implementation) scores. Add tests and ensure actual implementation matches claims.`);
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
    validateWithMithra(entry, prContext) {
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
// ========================================
// ROAM Staleness Monitor
// ========================================
export class ROAMStalenessMonitor {
    checkStaleness(entries, targetDays = 3) {
        const stale = entries.filter(e => e.staleness > targetDays);
        const fresh = entries.filter(e => e.staleness <= targetDays);
        const summary = `${stale.length}/${entries.length} entries are stale (>${targetDays} days old). Target: <${targetDays} days.`;
        return { stale, fresh, summary };
    }
    generateStalenessReport(entries) {
        const staleness = this.checkStaleness(entries);
        const avgStaleness = entries.reduce((s, e) => s + e.staleness, 0) / entries.length;
        return `
# ROAM Staleness Report
Generated: ${new Date().toISOString()}

## Summary
- Total Entries: ${entries.length}
- Fresh (<3 days): ${staleness.fresh.length}
- Stale (>3 days): ${staleness.stale.length}
- Average Age: ${avgStaleness.toFixed(1)} days

## Stale Entries (>${3} days old)
${staleness.stale.map(e => `- ${e.pattern} (${e.staleness} days old)`).join('\n')}

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
//# sourceMappingURL=mym-alignment.js.map
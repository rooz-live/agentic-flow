/**
 * MYM Alignment Scorer
 * 
 * Implements Manthra/Yasna/Mithra alignment scoring for ROAM validation.
 * Based on Zoroastrian philosophical framework applied to governance.
 * 
 * Three Dimensions:
 * - Manthra (🧠): Directed thought-power - TRUTH dimension
 * - Yasna (🙏): Aligned action - TIME dimension
 * - Mithra (⚖️): Binding force (Thought↔Word↔Deed) - LIVE dimension
 * 
 * Co-Authored-By: Warp <agent@warp.dev>
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * MYM dimension types
 */
export type MYMDimension = 'manthra' | 'yasna' | 'mithra';

/**
 * Alignment score (0-1)
 */
export interface AlignmentScore {
  dimension: MYMDimension;
  score: number; // 0-1
  confidence: number; // 0-1
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
  weight: number; // 0-1
}

/**
 * Complete MYM alignment assessment
 */
export interface MYMAlignment {
  manthra: AlignmentScore;
  yasna: AlignmentScore;
  mithra: AlignmentScore;
  overall: number; // Weighted average
  balanced: boolean; // True if all dimensions within 20% of each other
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

// ============================================================================
// MYM ALIGNMENT SCORER
// ============================================================================

export class MYMAlignmentScorer {
  /**
   * Score Manthra (Directed Thought-Power) - TRUTH dimension
   * 
   * Measures:
   * - Pattern metrics coverage (direct measurement vs proxy)
   * - Data freshness and accuracy
   * - Honest description without distortion
   */
  async scoreManthra(context: {
    patternMetrics?: { total: number; enriched: number };
    dataAge?: number; // hours
    measurementType?: 'direct' | 'proxy';
  }): Promise<AlignmentScore> {
    const evidence: Evidence[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Pattern metrics coverage
    if (context.patternMetrics) {
      const coverage = context.patternMetrics.enriched / context.patternMetrics.total;
      const score = coverage;
      const weight = 0.4;
      
      evidence.push({
        type: 'metric',
        description: `Pattern metrics coverage: ${(coverage * 100).toFixed(1)}%`,
        value: score,
        weight
      });
      
      weightedScore += score * weight;
      totalWeight += weight;
    }

    // Data freshness
    if (context.dataAge !== undefined) {
      const maxAge = 72; // 3 days in hours
      const freshness = Math.max(0, 1 - (context.dataAge / maxAge));
      const weight = 0.3;
      
      evidence.push({
        type: 'metric',
        description: `Data freshness: ${context.dataAge.toFixed(1)} hours old`,
        value: freshness,
        weight
      });
      
      weightedScore += freshness * weight;
      totalWeight += weight;
    }

    // Measurement directness
    if (context.measurementType) {
      const score = context.measurementType === 'direct' ? 1.0 : 0.6;
      const weight = 0.3;
      
      evidence.push({
        type: 'observation',
        description: `Measurement type: ${context.measurementType}`,
        value: score,
        weight
      });
      
      weightedScore += score * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    const confidence = totalWeight / 1.0; // Max possible weight

    return {
      dimension: 'manthra',
      score: finalScore,
      confidence,
      evidence,
      timestamp: Date.now()
    };
  }

  /**
   * Score Yasna (Aligned Action) - TIME dimension
   * 
   * Measures:
   * - Decision audit coverage and quality
   * - Action-outcome alignment
   * - Temporal consistency
   */
  async scoreYasna(context: {
    decisionAudit?: { total: number; withContext: number };
    actionOutcomeAlignment?: number; // 0-1
    temporalConsistency?: number; // 0-1
  }): Promise<AlignmentScore> {
    const evidence: Evidence[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Decision audit coverage
    if (context.decisionAudit) {
      const coverage = context.decisionAudit.withContext / context.decisionAudit.total;
      const weight = 0.4;
      
      evidence.push({
        type: 'metric',
        description: `Decision audit coverage: ${(coverage * 100).toFixed(1)}%`,
        value: coverage,
        weight
      });
      
      weightedScore += coverage * weight;
      totalWeight += weight;
    }

    // Action-outcome alignment
    if (context.actionOutcomeAlignment !== undefined) {
      const weight = 0.35;
      
      evidence.push({
        type: 'metric',
        description: `Action-outcome alignment: ${(context.actionOutcomeAlignment * 100).toFixed(1)}%`,
        value: context.actionOutcomeAlignment,
        weight
      });
      
      weightedScore += context.actionOutcomeAlignment * weight;
      totalWeight += weight;
    }

    // Temporal consistency
    if (context.temporalConsistency !== undefined) {
      const weight = 0.25;
      
      evidence.push({
        type: 'metric',
        description: `Temporal consistency: ${(context.temporalConsistency * 100).toFixed(1)}%`,
        value: context.temporalConsistency,
        weight
      });
      
      weightedScore += context.temporalConsistency * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    const confidence = totalWeight / 1.0;

    return {
      dimension: 'yasna',
      score: finalScore,
      confidence,
      evidence,
      timestamp: Date.now()
    };
  }

  /**
   * Score Mithra (Binding Force) - LIVE dimension
   * 
   * Measures:
   * - Thought↔Word↔Deed consistency
   * - Adaptive calibration effectiveness
   * - Learning and threshold adjustment
   */
  async scoreMithra(context: {
    circuitBreaker?: { learned: boolean; samplesAnalyzed: number };
    adaptiveCalibration?: number; // 0-1
    thoughtWordDeedAlignment?: number; // 0-1
  }): Promise<AlignmentScore> {
    const evidence: Evidence[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Circuit breaker learning
    if (context.circuitBreaker) {
      const learningScore = context.circuitBreaker.learned ? 1.0 : 0.3;
      const sampleScore = Math.min(1.0, context.circuitBreaker.samplesAnalyzed / 100);
      const score = (learningScore + sampleScore) / 2;
      const weight = 0.4;
      
      evidence.push({
        type: 'metric',
        description: `Circuit breaker learning: ${context.circuitBreaker.learned ? 'active' : 'inactive'}, ${context.circuitBreaker.samplesAnalyzed} samples`,
        value: score,
        weight
      });
      
      weightedScore += score * weight;
      totalWeight += weight;
    }

    // Adaptive calibration
    if (context.adaptiveCalibration !== undefined) {
      const weight = 0.35;
      
      evidence.push({
        type: 'metric',
        description: `Adaptive calibration effectiveness: ${(context.adaptiveCalibration * 100).toFixed(1)}%`,
        value: context.adaptiveCalibration,
        weight
      });
      
      weightedScore += context.adaptiveCalibration * weight;
      totalWeight += weight;
    }

    // Thought-Word-Deed alignment
    if (context.thoughtWordDeedAlignment !== undefined) {
      const weight = 0.25;
      
      evidence.push({
        type: 'observation',
        description: `Thought↔Word↔Deed alignment: ${(context.thoughtWordDeedAlignment * 100).toFixed(1)}%`,
        value: context.thoughtWordDeedAlignment,
        weight
      });
      
      weightedScore += context.thoughtWordDeedAlignment * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    const confidence = totalWeight / 1.0;

    return {
      dimension: 'mithra',
      score: finalScore,
      confidence,
      evidence,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate complete MYM alignment
   */
  async calculateAlignment(context: {
    manthra?: Parameters<typeof this.scoreManthra>[0];
    yasna?: Parameters<typeof this.scoreYasna>[0];
    mithra?: Parameters<typeof this.scoreMithra>[0];
  }): Promise<MYMAlignment> {
    const manthra = context.manthra 
      ? await this.scoreManthra(context.manthra)
      : this.getDefaultScore('manthra');
    
    const yasna = context.yasna
      ? await this.scoreYasna(context.yasna)
      : this.getDefaultScore('yasna');
    
    const mithra = context.mithra
      ? await this.scoreMithra(context.mithra)
      : this.getDefaultScore('mithra');

    // Calculate weighted overall score
    const overall = (
      manthra.score * manthra.confidence +
      yasna.score * yasna.confidence +
      mithra.score * mithra.confidence
    ) / (manthra.confidence + yasna.confidence + mithra.confidence);

    // Check if balanced (all within 20% of each other)
    const scores = [manthra.score, yasna.score, mithra.score];
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const balanced = (maxScore - minScore) <= 0.2;

    return {
      manthra,
      yasna,
      mithra,
      overall,
      balanced,
      timestamp: Date.now()
    };
  }

  /**
   * Get default score for dimension
   */
  private getDefaultScore(dimension: MYMDimension): AlignmentScore {
    return {
      dimension,
      score: 0.5,
      confidence: 0.0,
      evidence: [],
      timestamp: Date.now()
    };
  }

  /**
   * Format MYM alignment for display
   */
  formatAlignment(alignment: MYMAlignment): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('   MYM ALIGNMENT SCORES');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('');
    
    // Manthra
    lines.push(`🧠 Manthra (Directed Thought-Power):`);
    lines.push(`   Score:      ${(alignment.manthra.score * 100).toFixed(1)}%`);
    lines.push(`   Confidence: ${(alignment.manthra.confidence * 100).toFixed(1)}%`);
    lines.push(`   Status:     ${this.getStatusEmoji(alignment.manthra.score)}`);
    lines.push('');
    
    // Yasna
    lines.push(`🙏 Yasna (Aligned Action):`);
    lines.push(`   Score:      ${(alignment.yasna.score * 100).toFixed(1)}%`);
    lines.push(`   Confidence: ${(alignment.yasna.confidence * 100).toFixed(1)}%`);
    lines.push(`   Status:     ${this.getStatusEmoji(alignment.yasna.score)}`);
    lines.push('');
    
    // Mithra
    lines.push(`⚖️  Mithra (Binding Force):`);
    lines.push(`   Score:      ${(alignment.mithra.score * 100).toFixed(1)}%`);
    lines.push(`   Confidence: ${(alignment.mithra.confidence * 100).toFixed(1)}%`);
    lines.push(`   Status:     ${this.getStatusEmoji(alignment.mithra.score)}`);
    lines.push('');
    
    // Overall
    lines.push(`📊 Overall Alignment:`);
    lines.push(`   Score:    ${(alignment.overall * 100).toFixed(1)}%`);
    lines.push(`   Balanced: ${alignment.balanced ? '✅ Yes' : '⚠️  No'}`);
    lines.push('');
    
    lines.push('═══════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }

  /**
   * Get status emoji for score
   */
  private getStatusEmoji(score: number): string {
    if (score >= 0.9) return '✅ Excellent';
    if (score >= 0.8) return '🟢 Good';
    if (score >= 0.7) return '🟡 Adequate';
    if (score >= 0.6) return '🟠 Needs Improvement';
    return '🔴 Critical';
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

export const mymScorer = new MYMAlignmentScorer();

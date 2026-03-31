/**
 * Brutal Honesty Protocol
 *
 * Implements recommendation lifecycle tracking with dilution detection.
 *
 * Addresses Phase 1 gap: No brutal honesty protocols exist in codebase.
 *
 * Key Functions:
 * - Track recommendations from generation through disposition
 * - Detect hedging language, confidence downgrading, and dilution
 * - Calculate implementation rate per production cycle
 * - Maintain calibrated judgment under authority collapse
 */

export interface Recommendation {
  id: string;
  generatedAt: Date;
  source: string;
  originalText: string;
  currentText: string;
  confidence: number;
  status: RecommendationStatus;
  disposition?: RecommendationDisposition;
  auditTrail: AuditEntry[];
}

export type RecommendationStatus =
  | 'generated'
  | 'queued'
  | 'in_progress'
  | 'implemented'
  | 'deferred'
  | 'blocked'
  | 'skipped';

export type RecommendationDisposition =
  | 'accepted'
  | 'rejected'
  | 'diluted'
  | 'soft_pedaled'
  | 'expired';

export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
  confidenceDelta?: number;
}

export interface DilutionAnalysis {
  originalConfidence: number;
  currentConfidence: number;
  confidenceDrop: number;
  hedgingPatterns: string[];
  dilutionScore: number;
  isDiluted: boolean;
}

// Hedging language patterns that indicate dilution
const HEDGING_PATTERNS = [
  /\b(maybe|perhaps|possibly|potentially|might|could|may)\b/gi,
  /\b(somewhat|slightly|partially|to some extent)\b/gi,
  /\b(consider|suggest|recommend considering)\b/gi,
  /\b(if possible|when convenient|as appropriate)\b/gi,
  /\b(one option is|another approach might be)\b/gi,
];

// Confidence-reducing qualifiers
const CONFIDENCE_REDUCERS = [
  /\b(not entirely sure|uncertain|unclear)\b/gi,
  /\b(difficult to determine|hard to say)\b/gi,
  /\b(more investigation needed|requires further analysis)\b/gi,
];

export class BrutalHonestyProtocol {
  private recommendations: Map<string, Recommendation> = new Map();

  generateRecommendation(
    source: string,
    text: string,
    confidence: number
  ): Recommendation {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const recommendation: Recommendation = {
      id,
      generatedAt: new Date(),
      source,
      originalText: text,
      currentText: text,
      confidence,
      status: 'generated',
      auditTrail: [{
        timestamp: new Date(),
        action: 'generated',
        actor: source,
        details: `Initial generation with confidence ${confidence}`,
      }],
    };

    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  updateRecommendation(
    id: string,
    newText: string,
    actor: string
  ): Recommendation | null {
    const rec = this.recommendations.get(id);
    if (!rec) return null;

    const dilution = this.analyzeDilution(rec.originalText, newText);
    const newConfidence = rec.confidence * (1 - dilution.dilutionScore);

    rec.currentText = newText;
    rec.confidence = newConfidence;
    rec.auditTrail.push({
      timestamp: new Date(),
      action: 'updated',
      actor,
      details: dilution.isDiluted
        ? `Dilution detected: ${dilution.hedgingPatterns.join(', ')}`
        : 'Updated without significant dilution',
      confidenceDelta: newConfidence - rec.confidence,
    });

    if (dilution.isDiluted) {
      rec.disposition = 'diluted';
    }

    return rec;
  }

  analyzeDilution(original: string, current: string): DilutionAnalysis {
    const originalHedges = this.countHedgingPatterns(original);
    const currentHedges = this.countHedgingPatterns(current);

    const hedgingIncrease = currentHedges.count - originalHedges.count;
    const lengthRatio = current.length / original.length;

    // Dilution score: Higher = more diluted
    // Increases with hedging and length bloat
    const dilutionScore = Math.min(1,
      (hedgingIncrease * 0.1) +
      (lengthRatio > 1.5 ? (lengthRatio - 1) * 0.2 : 0)
    );

    return {
      originalConfidence: 1 - (originalHedges.count * 0.05),
      currentConfidence: 1 - (currentHedges.count * 0.05),
      confidenceDrop: hedgingIncrease * 0.05,
      hedgingPatterns: currentHedges.patterns,
      dilutionScore,
      isDiluted: dilutionScore > 0.2,
    };
  }

  private countHedgingPatterns(text: string): { count: number; patterns: string[] } {
    const patterns: string[] = [];
    let count = 0;

    for (const pattern of HEDGING_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
        patterns.push(...matches);
      }
    }

    for (const pattern of CONFIDENCE_REDUCERS) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length * 2; // Weight these higher
        patterns.push(...matches);
      }
    }

    return { count, patterns };
  }

  setStatus(id: string, status: RecommendationStatus, actor: string): void {
    const rec = this.recommendations.get(id);
    if (!rec) return;

    rec.status = status;
    rec.auditTrail.push({
      timestamp: new Date(),
      action: `status_change:${status}`,
      actor,
      details: `Status changed to ${status}`,
    });
  }

  getImplementationRate(): { total: number; implemented: number; rate: number } {
    const all = Array.from(this.recommendations.values());
    const implemented = all.filter(r => r.status === 'implemented');

    return {
      total: all.length,
      implemented: implemented.length,
      rate: all.length > 0 ? implemented.length / all.length : 0,
    };
  }

  getSkippedRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.status === 'skipped' || r.disposition === 'soft_pedaled');
  }

  getDilutedRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.disposition === 'diluted');
  }

  getAuditReport(): {
    total: number;
    byStatus: Record<RecommendationStatus, number>;
    byDisposition: Record<string, number>;
    implementationRate: number;
    dilutionRate: number;
  } {
    const all = Array.from(this.recommendations.values());

    const byStatus = all.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<RecommendationStatus, number>);

    const byDisposition = all.reduce((acc, r) => {
      if (r.disposition) {
        acc[r.disposition] = (acc[r.disposition] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const implemented = all.filter(r => r.status === 'implemented').length;
    const diluted = all.filter(r => r.disposition === 'diluted').length;

    return {
      total: all.length,
      byStatus,
      byDisposition,
      implementationRate: all.length > 0 ? implemented / all.length : 0,
      dilutionRate: all.length > 0 ? diluted / all.length : 0,
    };
  }
}

export const globalHonestyProtocol = new BrutalHonestyProtocol();

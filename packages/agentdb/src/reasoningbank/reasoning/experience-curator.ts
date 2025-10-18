/**
 * Experience Curator - Reasoning Agent
 *
 * Curates high-quality experiences and ensures only valuable
 * learnings are preserved in the memory bank.
 */

import type { SQLiteVectorDB } from '../../core/vector-db';

export interface CurationCriteria {
  minConfidence?: number;
  minUsageCount?: number;
  requireSuccess?: boolean;
  domainWhitelist?: string[];
}

export class ExperienceCurator {
  private db: SQLiteVectorDB;

  constructor(db: SQLiteVectorDB) {
    this.db = db;
  }

  /**
   * Curate experiences based on quality criteria
   */
  async curate(criteria: CurationCriteria = {}): Promise<{
    approved: number;
    rejected: number;
    reasons: Record<string, number>;
  }> {
    const allPatterns = await this.db.query().execute();

    let approved = 0;
    let rejected = 0;
    const reasons: Record<string, number> = {};

    for (const pattern of allPatterns) {
      const result = this.evaluateQuality(pattern, criteria);

      if (result.approved) {
        approved++;
      } else {
        rejected++;
        reasons[result.reason!] = (reasons[result.reason!] || 0) + 1;

        // Mark for review or deletion
        await this.db.update(pattern.id, {
          ...pattern.metadata,
          curation_status: 'rejected',
          curation_reason: result.reason,
        });
      }
    }

    return { approved, rejected, reasons };
  }

  /**
   * Evaluate quality of a pattern
   */
  private evaluateQuality(
    pattern: any,
    criteria: CurationCriteria
  ): { approved: boolean; reason?: string } {
    const metadata = pattern.metadata || {};

    // Check confidence threshold
    if (criteria.minConfidence !== undefined) {
      if ((metadata.confidence || 0) < criteria.minConfidence) {
        return { approved: false, reason: 'low_confidence' };
      }
    }

    // Check usage count
    if (criteria.minUsageCount !== undefined) {
      if ((metadata.usage_count || 0) < criteria.minUsageCount) {
        return { approved: false, reason: 'insufficient_usage' };
      }
    }

    // Check success requirement
    if (criteria.requireSuccess) {
      if ((metadata.success_count || 0) === 0) {
        return { approved: false, reason: 'no_success' };
      }
    }

    // Check domain whitelist
    if (criteria.domainWhitelist && criteria.domainWhitelist.length > 0) {
      if (!criteria.domainWhitelist.includes(metadata.domain)) {
        return { approved: false, reason: 'domain_not_whitelisted' };
      }
    }

    return { approved: true };
  }

  /**
   * Get curation statistics
   */
  async getStats(): Promise<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  }> {
    const allPatterns = await this.db.query().execute();

    const stats = {
      total: allPatterns.length,
      approved: 0,
      rejected: 0,
      pending: 0,
    };

    for (const pattern of allPatterns) {
      const status = pattern.metadata?.curation_status;

      if (status === 'approved') {
        stats.approved++;
      } else if (status === 'rejected') {
        stats.rejected++;
      } else {
        stats.pending++;
      }
    }

    return stats;
  }
}

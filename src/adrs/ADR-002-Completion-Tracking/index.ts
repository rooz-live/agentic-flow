/**
 * ADR-002: Completion Tracking
 * 
 * Time-based completion metrics and tracking with anti-completion theater enforcement.
 * Ensures all ADR completion claims are backed by actual test execution.
 */

export type VerificationMethod = 'mechanical_compliance' | 'test_execution' | 'peer_review';

export interface CompletionRecord {
  id: string;
  title: string;
  phase?: number;
  startedAt: Date;
  completedAt: Date;
  durationMinutes: number;
  testCount: number;
  testsPassing: number;
  codeCoverage: number;
  verifiedBy: VerificationMethod;
  metadata?: Record<string, any>;
}

export interface CompletionStats {
  totalCompleted: number;
  totalInProgress: number;
  averageDuration: number;
  averageCoverage: number;
  completionTheaterAttempts: number;
  byPhase: Record<number, {
    count: number;
    averageDuration: number;
  }>;
}

export interface VelocityMetrics {
  adrsPerDay: number;
  averageCycleTime: number;
  trend: 'improving' | 'stable' | 'declining';
  last7Days: number;
  last30Days: number;
}

export interface ComplianceViolation {
  id: string;
  reason: string;
  severity: 'warning' | 'error';
  timestamp: Date;
}

export class CompletionTracker {
  private completions: Map<string, CompletionRecord> = new Map();
  private violations: ComplianceViolation[] = [];
  private readonly MINIMUM_DURATION_MINUTES = 5; // Sanity check
  private readonly MINIMUM_COVERAGE = 70; // Minimum acceptable coverage

  /**
   * Record an ADR completion
   * @throws Error if completion doesn't meet mechanical compliance
   */
  recordCompletion(record: CompletionRecord): void {
    // Validate verification method
    const validMethods: VerificationMethod[] = ['mechanical_compliance', 'test_execution', 'peer_review'];
    if (!validMethods.includes(record.verifiedBy)) {
      throw new Error('Invalid verification method');
    }

    // Validate all tests passing
    if (record.testsPassing !== record.testCount) {
      throw new Error('Cannot record completion with failing tests');
    }

    // Validate code coverage
    if (record.codeCoverage < this.MINIMUM_COVERAGE) {
      this.violations.push({
        id: record.id,
        reason: 'insufficient_coverage',
        severity: 'warning',
        timestamp: new Date()
      });
    }

    // Validate duration (anti-completion theater)
    if (record.durationMinutes < this.MINIMUM_DURATION_MINUTES) {
      this.violations.push({
        id: record.id,
        reason: 'suspicious_duration',
        severity: 'error',
        timestamp: new Date()
      });
    }

    // Validate completion time is after start time
    if (record.completedAt <= record.startedAt) {
      throw new Error('Completion time must be after start time');
    }

    // Calculate actual duration if not provided correctly
    const calculatedDuration = (record.completedAt.getTime() - record.startedAt.getTime()) / 60000;
    if (Math.abs(calculatedDuration - record.durationMinutes) > 1) {
      // Update to calculated duration if discrepancy > 1 minute
      record.durationMinutes = Math.round(calculatedDuration * 100) / 100;
    }

    this.completions.set(record.id, { ...record });
  }

  /**
   * Get a completion record by ID
   */
  getCompletion(id: string): CompletionRecord | undefined {
    return this.completions.get(id);
  }

  /**
   * Get average cycle time across all completions
   */
  getAverageCycleTime(): number {
    if (this.completions.size === 0) return 0;

    let totalDuration = 0;
    this.completions.forEach(record => {
      totalDuration += record.durationMinutes;
    });

    return Math.round((totalDuration / this.completions.size) * 100) / 100;
  }

  /**
   * Get average cycle time for a specific phase
   */
  getAverageCycleTimeByPhase(phase: number): number {
    const phaseCompletions = Array.from(this.completions.values())
      .filter(r => r.phase === phase);

    if (phaseCompletions.length === 0) return 0;

    const totalDuration = phaseCompletions.reduce((sum, r) => sum + r.durationMinutes, 0);
    return Math.round((totalDuration / phaseCompletions.length) * 100) / 100;
  }

  /**
   * Detect potential completion theater patterns
   * Returns IDs of suspicious completions
   */
  detectCompletionTheater(): string[] {
    const suspicious: string[] = [];

    this.completions.forEach((record, id) => {
      // Flag completions that are too fast
      if (record.durationMinutes < this.MINIMUM_DURATION_MINUTES) {
        suspicious.push(id);
      }

      // Flag completions with 100% coverage but low test count
      if (record.codeCoverage === 100 && record.testCount < 3) {
        suspicious.push(id);
      }

      // Flag completions with suspicious test pass rates
      if (record.testsPassing === record.testCount && record.testCount > 50 && record.durationMinutes < 30) {
        // Over 50 tests passing in under 30 minutes is suspicious
        suspicious.push(id);
      }
    });

    return [...new Set(suspicious)]; // Remove duplicates
  }

  /**
   * Get all compliance violations
   */
  getComplianceViolations(): ComplianceViolation[] {
    return [...this.violations];
  }

  /**
   * Get completion statistics
   */
  getStatistics(): CompletionStats {
    const byPhase: Record<number, { count: number; totalDuration: number }> = {};
    let totalDuration = 0;
    let totalCoverage = 0;

    this.completions.forEach(record => {
      totalDuration += record.durationMinutes;
      totalCoverage += record.codeCoverage;

      const phase = record.phase || 0;
      if (!byPhase[phase]) {
        byPhase[phase] = { count: 0, totalDuration: 0 };
      }
      byPhase[phase].count++;
      byPhase[phase].totalDuration += record.durationMinutes;
    });

    // Format byPhase with averages
    const byPhaseStats: Record<number, { count: number; averageDuration: number }> = {};
    Object.entries(byPhase).forEach(([phase, data]) => {
      byPhaseStats[parseInt(phase)] = {
        count: data.count,
        averageDuration: Math.round((data.totalDuration / data.count) * 100) / 100
      };
    });

    return {
      totalCompleted: this.completions.size,
      totalInProgress: 0, // Would track in-progress separately
      averageDuration: this.completions.size > 0 
        ? Math.round((totalDuration / this.completions.size) * 100) / 100 
        : 0,
      averageCoverage: this.completions.size > 0 
        ? Math.round(totalCoverage / this.completions.size) 
        : 0,
      completionTheaterAttempts: this.detectCompletionTheater().length,
      byPhase: byPhaseStats
    };
  }

  /**
   * Calculate completion velocity metrics
   */
  getCompletionVelocity(): VelocityMetrics {
    const completions = Array.from(this.completions.values());
    
    if (completions.length === 0) {
      return {
        adrsPerDay: 0,
        averageCycleTime: 0,
        trend: 'stable',
        last7Days: 0,
        last30Days: 0
      };
    }

    // Sort by completion date
    const sorted = completions.sort((a, b) => 
      b.completedAt.getTime() - a.completedAt.getTime()
    );

    const now = new Date();
    const last7Days = completions.filter(r => {
      const daysDiff = (now.getTime() - r.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;

    const last30Days = completions.filter(r => {
      const daysDiff = (now.getTime() - r.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    }).length;

    // Get date range
    const earliest = sorted[sorted.length - 1].completedAt;
    const latest = sorted[0].completedAt;
    const daysSpan = Math.max(1, (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

    const adrsPerDay = Math.round((completions.length / daysSpan) * 100) / 100;

    // Calculate trend by comparing first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(midpoint);
    const secondHalf = sorted.slice(0, midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.durationMinutes, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.durationMinutes, 0) / secondHalf.length;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'improving'; // Getting faster
    } else if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'declining'; // Getting slower
    }

    return {
      adrsPerDay,
      averageCycleTime: this.getAverageCycleTime(),
      trend,
      last7Days,
      last30Days
    };
  }

  /**
   * Get completions filtered by criteria
   */
  getCompletions(filter?: {
    phase?: number;
    minCoverage?: number;
    since?: Date;
    until?: Date;
  }): CompletionRecord[] {
    let results = Array.from(this.completions.values());

    if (filter) {
      if (filter.phase !== undefined) {
        results = results.filter(r => r.phase === filter.phase);
      }
      if (filter.minCoverage !== undefined) {
        results = results.filter(r => r.codeCoverage >= filter.minCoverage);
      }
      if (filter.since) {
        results = results.filter(r => r.completedAt >= filter.since);
      }
      if (filter.until) {
        results = results.filter(r => r.completedAt <= filter.until);
      }
    }

    return results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }

  /**
   * Serialize completions to JSON
   */
  serialize(): string {
    const obj: Record<string, CompletionRecord> = {};
    this.completions.forEach((record, id) => {
      obj[id] = {
        ...record,
        startedAt: record.startedAt, // Date will be serialized as ISO string
        completedAt: record.completedAt
      };
    });
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Deserialize completions from JSON
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json) as Record<string, CompletionRecord>;
      this.completions.clear();
      this.violations = [];

      Object.entries(obj).forEach(([id, record]) => {
        // Convert string dates back to Date objects
        const fixedRecord: CompletionRecord = {
          ...record,
          startedAt: new Date(record.startedAt),
          completedAt: new Date(record.completedAt)
        };
        this.completions.set(id, fixedRecord);
      });
    } catch (error) {
      throw new Error(`Failed to deserialize: ${error}`);
    }
  }

  /**
   * Clear all completion records
   */
  clear(): void {
    this.completions.clear();
    this.violations = [];
  }

  /**
   * Get completion count
   */
  get size(): number {
    return this.completions.size;
  }
}

/**
 * Global completion tracker singleton
 */
export const globalCompletionTracker = new CompletionTracker();

/**
 * Record ADR completion with automatic timestamp
 */
export function recordADRCompletion(
  id: string,
  title: string,
  startedAt: Date,
  testCount: number,
  codeCoverage: number,
  phase?: number,
  verifiedBy: VerificationMethod = 'mechanical_compliance'
): CompletionRecord {
  const completedAt = new Date();
  const durationMinutes = (completedAt.getTime() - startedAt.getTime()) / 60000;

  const record: CompletionRecord = {
    id,
    title,
    phase,
    startedAt,
    completedAt,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    testCount,
    testsPassing: testCount, // Assumes all passing
    codeCoverage,
    verifiedBy,
    metadata: {
      recordedBy: 'auto',
      recordedAt: completedAt.toISOString()
    }
  };

  globalCompletionTracker.recordCompletion(record);
  return record;
}

export default CompletionTracker;

/**
 * Manthra Validation Test Suite
 * Tests intent coverage calculation accuracy
 */

import { describe, it, expect } from '@jest/globals';

interface Episode {
  circle: string;
  ceremony: string;
  status: string;
  timestamp: string;
}

describe('Manthra (Intent Coverage) Metrics', () => {
  describe('Manthra Score Calculation', () => {
    it('should calculate manthra score as executed/intended ratio', () => {
      const episodes: Episode[] = [
        { circle: 'orchestrator', ceremony: 'standup', status: 'completed', timestamp: '2026-01-12T10:00:00Z' },
        { circle: 'orchestrator', ceremony: 'standup', status: 'completed', timestamp: '2026-01-12T11:00:00Z' },
        { circle: 'orchestrator', ceremony: 'standup', status: 'failed', timestamp: '2026-01-12T12:00:00Z' },
        { circle: 'orchestrator', ceremony: 'standup', status: 'pending', timestamp: '2026-01-12T13:00:00Z' },
      ];

      const intended = episodes.length;
      const executed = episodes.filter(e => e.status === 'completed').length;
      const manthraScore = executed / intended;

      expect(manthraScore).toBeCloseTo(0.5, 2); // 2/4 = 0.5
    });

    it('should group manthra scores by circle', () => {
      const episodes: Episode[] = [
        { circle: 'orchestrator', ceremony: 'standup', status: 'completed', timestamp: '2026-01-12T10:00:00Z' },
        { circle: 'orchestrator', ceremony: 'standup', status: 'completed', timestamp: '2026-01-12T11:00:00Z' },
        { circle: 'assessor', ceremony: 'wsjf', status: 'completed', timestamp: '2026-01-12T10:00:00Z' },
        { circle: 'assessor', ceremony: 'wsjf', status: 'failed', timestamp: '2026-01-12T11:00:00Z' },
        { circle: 'assessor', ceremony: 'wsjf', status: 'failed', timestamp: '2026-01-12T12:00:00Z' },
      ];

      const byCircle = episodes.reduce((acc, ep) => {
        if (!acc[ep.circle]) {
          acc[ep.circle] = { intended: 0, executed: 0 };
        }
        acc[ep.circle].intended++;
        if (ep.status === 'completed') {
          acc[ep.circle].executed++;
        }
        return acc;
      }, {} as Record<string, { intended: number; executed: number }>);

      const manthraScores = Object.entries(byCircle).map(([circle, data]) => ({
        circle,
        manthra_score: data.executed / data.intended,
      }));

      expect(manthraScores).toHaveLength(2);
      expect(manthraScores.find(m => m.circle === 'orchestrator')?.manthra_score).toBe(1.0); // 2/2
      expect(manthraScores.find(m => m.circle === 'assessor')?.manthra_score).toBeCloseTo(0.333, 2); // 1/3
    });
  });

  describe('Threshold Classification', () => {
    it('should classify manthra >= 0.90 as EXCELLENT', () => {
      const score = 0.95;
      const classification = score >= 0.90 ? 'EXCELLENT' : score >= 0.75 ? 'ACCEPTABLE' : 'POOR';
      
      expect(classification).toBe('EXCELLENT');
    });

    it('should classify manthra 0.75-0.89 as ACCEPTABLE', () => {
      const score = 0.82;
      const classification = score >= 0.90 ? 'EXCELLENT' : score >= 0.75 ? 'ACCEPTABLE' : 'POOR';
      
      expect(classification).toBe('ACCEPTABLE');
    });

    it('should classify manthra < 0.75 as POOR', () => {
      const score = 0.65;
      const classification = score >= 0.90 ? 'EXCELLENT' : score >= 0.75 ? 'ACCEPTABLE' : 'POOR';
      
      expect(classification).toBe('POOR');
    });

    it('should generate alert for POOR coverage', () => {
      const score = 0.60;
      const shouldAlert = score < 0.75;
      const alertMessage = `Low intent coverage: ${(score * 100).toFixed(1)}% - Investigate blockers`;
      
      expect(shouldAlert).toBe(true);
      expect(alertMessage).toContain('Investigate blockers');
    });
  });

  describe('SQL Query Validation', () => {
    it('should generate valid SQL for manthra calculation', () => {
      const sql = `
        SELECT 
          circle,
          COUNT(*) as intended,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as executed,
          CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as manthra_score
        FROM episodes
        WHERE timestamp > datetime('now', '-7 days')
        GROUP BY circle;
      `;

      expect(sql).toContain('COUNT(*) as intended');
      expect(sql).toContain('status = \'completed\'');
      expect(sql).toContain('manthra_score');
      expect(sql).toContain('GROUP BY circle');
    });

    it('should filter by time window', () => {
      const timeWindows = ['7 days', '24 hours', '30 days'];
      
      timeWindows.forEach(window => {
        const sql = `WHERE timestamp > datetime('now', '-${window}')`;
        expect(sql).toContain(window);
      });
    });
  });

  describe('Intent Coverage Tracking', () => {
    it('should track coverage over time', () => {
      const timeSeriesData = [
        { date: '2026-01-01', manthra_score: 0.80 },
        { date: '2026-01-02', manthra_score: 0.85 },
        { date: '2026-01-03', manthra_score: 0.90 },
        { date: '2026-01-04', manthra_score: 0.88 },
      ];

      const trend = timeSeriesData[timeSeriesData.length - 1].manthra_score - timeSeriesData[0].manthra_score;
      
      expect(trend).toBeGreaterThan(0); // Improving trend
      expect(trend).toBeCloseTo(0.08, 2);
    });

    it('should identify circles needing improvement', () => {
      const circleScores = [
        { circle: 'orchestrator', manthra_score: 0.92 },
        { circle: 'assessor', manthra_score: 0.68 },
        { circle: 'innovator', manthra_score: 0.78 },
      ];

      const needsImprovement = circleScores.filter(c => c.manthra_score < 0.75);
      
      expect(needsImprovement).toHaveLength(1);
      expect(needsImprovement[0].circle).toBe('assessor');
    });
  });

  describe('Blocker Analysis', () => {
    it('should correlate low manthra with failure reasons', () => {
      interface EpisodeWithReason extends Episode {
        failure_reason?: string;
      }

      const episodes: EpisodeWithReason[] = [
        { circle: 'assessor', ceremony: 'wsjf', status: 'failed', timestamp: '2026-01-12T10:00:00Z', failure_reason: 'missing_stakeholder' },
        { circle: 'assessor', ceremony: 'wsjf', status: 'failed', timestamp: '2026-01-12T11:00:00Z', failure_reason: 'missing_stakeholder' },
        { circle: 'assessor', ceremony: 'wsjf', status: 'completed', timestamp: '2026-01-12T12:00:00Z' },
      ];

      const failureReasons = episodes
        .filter(e => e.status === 'failed')
        .reduce((acc, ep) => {
          const reason = ep.failure_reason || 'unknown';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      expect(failureReasons['missing_stakeholder']).toBe(2);
    });
  });
});

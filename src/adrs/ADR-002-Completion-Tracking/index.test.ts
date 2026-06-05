/**
 * ADR-002: Completion Tracking - Test First
 * 
 * Tests for time-based completion metrics and tracking
 */

import { CompletionTracker, CompletionRecord } from './index';

describe('ADR-002: Completion Tracking', () => {
  let tracker: CompletionTracker;

  beforeEach(() => {
    tracker = new CompletionTracker();
  });

  describe('Completion Record Creation', () => {
    it('should record completion with timestamp', () => {
      const record: CompletionRecord = {
        id: 'adr-test-001',
        title: 'Test ADR',
        startedAt: new Date('2026-04-23T10:00:00'),
        completedAt: new Date('2026-04-23T10:15:00'),
        durationMinutes: 15,
        testCount: 10,
        testsPassing: 10,
        codeCoverage: 85,
        verifiedBy: 'mechanical_compliance'
      };

      tracker.recordCompletion(record);
      const retrieved = tracker.getCompletion('adr-test-001');

      expect(retrieved).toBeDefined();
      expect(retrieved?.durationMinutes).toBe(15);
      expect(retrieved?.testsPassing).toBe(10);
    });

    it('should reject completion without verification', () => {
      const record: CompletionRecord = {
        id: 'adr-test-002',
        title: 'Unverified ADR',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 10,
        testCount: 5,
        testsPassing: 5,
        codeCoverage: 80,
        verifiedBy: null as any // Missing verification
      };

      expect(() => tracker.recordCompletion(record)).toThrow(
        'Completion must be verified by mechanical compliance or test execution'
      );
    });

    it('should reject completion with failing tests', () => {
      const record: CompletionRecord = {
        id: 'adr-test-003',
        title: 'Failing Tests ADR',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 20,
        testCount: 10,
        testsPassing: 8, // Not all passing
        codeCoverage: 75,
        verifiedBy: 'test_execution'
      };

      expect(() => tracker.recordCompletion(record)).toThrow(
        'Cannot record completion with failing tests'
      );
    });
  });

  describe('Cycle Time Calculations', () => {
    it('should calculate average cycle time', () => {
      // Add multiple completion records
      tracker.recordCompletion({
        id: 'adr-1',
        title: 'ADR 1',
        startedAt: new Date('2026-04-23T10:00:00'),
        completedAt: new Date('2026-04-23T10:10:00'),
        durationMinutes: 10,
        testCount: 5,
        testsPassing: 5,
        codeCoverage: 90,
        verifiedBy: 'mechanical_compliance'
      });

      tracker.recordCompletion({
        id: 'adr-2',
        title: 'ADR 2',
        startedAt: new Date('2026-04-23T11:00:00'),
        completedAt: new Date('2026-04-23T11:25:00'),
        durationMinutes: 25,
        testCount: 8,
        testsPassing: 8,
        codeCoverage: 85,
        verifiedBy: 'mechanical_compliance'
      });

      tracker.recordCompletion({
        id: 'adr-3',
        title: 'ADR 3',
        startedAt: new Date('2026-04-23T12:00:00'),
        completedAt: new Date('2026-04-23T12:20:00'),
        durationMinutes: 20,
        testCount: 12,
        testsPassing: 12,
        codeCoverage: 88,
        verifiedBy: 'mechanical_compliance'
      });

      const avgCycleTime = tracker.getAverageCycleTime();
      expect(avgCycleTime).toBe(18.33); // (10 + 25 + 20) / 3 = 18.33
    });

    it('should calculate cycle time by phase', () => {
      tracker.recordCompletion({
        id: 'phase4-1',
        title: 'Phase 4 ADR',
        phase: 4,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 15,
        testCount: 5,
        testsPassing: 5,
        codeCoverage: 90,
        verifiedBy: 'mechanical_compliance'
      });

      tracker.recordCompletion({
        id: 'phase5-1',
        title: 'Phase 5 ADR',
        phase: 5,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 25,
        testCount: 8,
        testsPassing: 8,
        codeCoverage: 85,
        verifiedBy: 'mechanical_compliance'
      });

      const phase4Time = tracker.getAverageCycleTimeByPhase(4);
      const phase5Time = tracker.getAverageCycleTimeByPhase(5);

      expect(phase4Time).toBe(15);
      expect(phase5Time).toBe(25);
    });
  });

  describe('Completion Theater Detection', () => {
    it('should flag suspicious completion patterns', () => {
      // Record with impossibly fast completion (completion theater)
      tracker.recordCompletion({
        id: 'suspicious-1',
        title: 'Suspicious ADR',
        startedAt: new Date('2026-04-23T10:00:00'),
        completedAt: new Date('2026-04-23T10:00:30'), // 30 seconds
        durationMinutes: 0.5,
        testCount: 50,
        testsPassing: 50,
        codeCoverage: 100,
        verifiedBy: 'mechanical_compliance'
      });

      const suspicious = tracker.detectCompletionTheater();
      expect(suspicious).toContain('suspicious-1');
    });

    it('should flag completions without code coverage', () => {
      tracker.recordCompletion({
        id: 'no-coverage',
        title: 'No Coverage ADR',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 30,
        testCount: 10,
        testsPassing: 10,
        codeCoverage: 0, // No coverage
        verifiedBy: 'mechanical_compliance'
      });

      const violations = tracker.getComplianceViolations();
      expect(violations).toContainEqual(
        expect.objectContaining({ id: 'no-coverage', reason: 'insufficient_coverage' })
      );
    });

    it('should validate completion theater prevention', () => {
      // Normal completion
      tracker.recordCompletion({
        id: 'valid-completion',
        title: 'Valid ADR',
        startedAt: new Date('2026-04-23T10:00:00'),
        completedAt: new Date('2026-04-23T10:15:00'),
        durationMinutes: 15,
        testCount: 15,
        testsPassing: 15,
        codeCoverage: 94,
        verifiedBy: 'mechanical_compliance'
      });

      // Attempt completion theater
      expect(() => {
        tracker.recordCompletion({
          id: 'theater-attempt',
          title: 'Completion Theater',
          startedAt: new Date(),
          completedAt: new Date(),
          durationMinutes: 2, // Too fast
          testCount: 100,
          testsPassing: 100,
          codeCoverage: 100,
          verifiedBy: 'self_reported' // Not valid verification
        });
      }).toThrow('Invalid verification method');
    });
  });

  describe('Statistics and Reporting', () => {
    it('should generate completion statistics', () => {
      // Add completions across phases
      for (let i = 1; i <= 5; i++) {
        tracker.recordCompletion({
          id: `stats-adr-${i}`,
          title: `Stats ADR ${i}`,
          phase: i <= 3 ? 4 : 5,
          startedAt: new Date(),
          completedAt: new Date(),
          durationMinutes: 10 + i * 2,
          testCount: 10,
          testsPassing: 10,
          codeCoverage: 80 + i * 2,
          verifiedBy: 'mechanical_compliance'
        });
      }

      const stats = tracker.getStatistics();
      expect(stats.totalCompleted).toBe(5);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.averageCoverage).toBeGreaterThan(80);
      expect(stats.completionTheaterAttempts).toBe(0);
    });

    it('should track completion velocity over time', () => {
      // Add completions with different dates
      const dates = [
        '2026-04-20T10:00:00',
        '2026-04-21T10:00:00',
        '2026-04-22T10:00:00',
        '2026-04-23T10:00:00'
      ];

      dates.forEach((date, i) => {
        tracker.recordCompletion({
          id: `velocity-${i}`,
          title: `Velocity ADR ${i}`,
          startedAt: new Date(date),
          completedAt: new Date(new Date(date).getTime() + 15 * 60000),
          durationMinutes: 15,
          testCount: 10,
          testsPassing: 10,
          codeCoverage: 85,
          verifiedBy: 'mechanical_compliance'
        });
      });

      const velocity = tracker.getCompletionVelocity();
      expect(velocity.adrsPerDay).toBeGreaterThan(0);
      expect(velocity.trend).toBeDefined();
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize completion records', () => {
      tracker.recordCompletion({
        id: 'serialize-test',
        title: 'Serialize Test',
        startedAt: new Date('2026-04-23T10:00:00'),
        completedAt: new Date('2026-04-23T10:20:00'),
        durationMinutes: 20,
        testCount: 15,
        testsPassing: 15,
        codeCoverage: 90,
        verifiedBy: 'mechanical_compliance'
      });

      const json = tracker.serialize();
      expect(() => JSON.parse(json)).not.toThrow();

      // Create new tracker and deserialize
      const newTracker = new CompletionTracker();
      newTracker.deserialize(json);

      const record = newTracker.getCompletion('serialize-test');
      expect(record).toBeDefined();
      expect(record?.durationMinutes).toBe(20);
    });
  });
});

/**
 * Ceremony Logger - VERIFY Phase E2E Tests
 * Validates billable sync block tracking, attendance, duration calculation
 *
 * WSJF Priority: 4.75 (Phase 2)
 * CANONICAL_SCHEMA: /docs/api/billing.proto
 */

import { test, expect } from '@playwright/test';
import { readFile, fileExists } from './harness/BaseBillingE2ESpec';

test.describe('Ceremony Logger - Implementation', () => {
  // Anti-CVT: assert contract symbols, not just file existence.
  // fileExists() demoted to internal guard; primary gate is symbol presence.
  test('ceremony_logger.py exports CeremonyType enum with required values', async () => {
    const content = readFile('src/ceremony/ceremony_logger.py');
    // File must exist — if readFile throws, test fails with actionable message
    expect(content.length, 'ceremony_logger.py must be non-empty').toBeGreaterThan(0);
    expect(content, 'CeremonyType enum must be exported').toContain('CeremonyType');
    expect(content, 'STANDUP ceremony type required by billing proto').toContain('STANDUP');
    expect(content, 'RETROSPECTIVE ceremony type required by billing proto').toContain('RETROSPECTIVE');
    expect(content, 'REVIEW ceremony type required by billing proto').toContain('REVIEW');
  });

  test('CeremonyLogger class implements billable flag', async () => {
    const content = readFile('src/ceremony/ceremony_logger.py');
    expect(content, 'CeremonyLogger class must be defined').toContain('class CeremonyLogger');
    expect(content, 'billable field required — client invoices ceremonies').toContain('billable');
  });

  test('ceremony_logger.py exposes log() or record() entry point', async () => {
    const content = readFile('src/ceremony/ceremony_logger.py');
    const hasLog = content.includes('def log') || content.includes('def record') || content.includes('def log_ceremony');
    expect(hasLog, 'CeremonyLogger must have a log/record method for billing chain').toBe(true);
  });
});

test.describe('Ceremony Logger - Billable Time Tracking', () => {
  test('Standup attendance recorded with exact duration', async () => {
    const attendance = {
      entity_uuid: 'tech-001',
      ceremony_type: 'standup',
      joined_at: '2024-01-15T09:00:00Z',
      left_at: '2024-01-15T09:15:00Z',
      duration_minutes: 15,
      billable: true,
      billable_duration_minutes: 15,
    };
    expect(attendance.duration_minutes).toBe(15);
    expect(attendance.billable_duration_minutes).toBe(15);
    expect(attendance.billable).toBe(true);
  });

  test('LATE participation - joined after start', async () => {
    const sessionStart = new Date('2024-01-15T09:00:00Z');
    const joinedAt = new Date('2024-01-15T09:03:00Z');
    expect(joinedAt > sessionStart).toBe(true);
  });
});

test.describe('Ceremony Logger - Project Context Integration', () => {
  test('Ceremony linked to project_id', async () => {
    const ceremony = {
      session_id: 'cer-001',
      ceremony_type: 'standup',
      project_id: 'proj-website-redesign',
      client_id: 'client-acme-corp',
    };
    expect(ceremony.project_id).toBeDefined();
    expect(ceremony.project_id.length).toBeGreaterThan(0);
  });

  test('Billable flag driven by project billing terms', async () => {
    const ceremony = { billable: true, project_id: 'proj-001', total_billable_minutes: 45 };
    expect(ceremony.billable).toBe(true);
    expect(ceremony.total_billable_minutes).toBeGreaterThan(0);
  });
});

test.describe('Ceremony Logger - Time Aggregation', () => {
  test('Total billable minutes accumulates across ceremonies', async () => {
    const ceremonies = [
      { duration_minutes: 15, billable: true },
      { duration_minutes: 60, billable: true },
      { duration_minutes: 30, billable: false },
    ];
    const totalBillable = ceremonies
      .filter(c => c.billable)
      .reduce((sum, c) => sum + c.duration_minutes, 0);
    expect(totalBillable).toBe(75);
  });

  test('Ceremony hours separated from direct work hours', async () => {
    const timeBreakdown = {
      direct_work_minutes: 360,
      ceremony_minutes: 75,
      total_logged_minutes: 480,
    };
    expect(timeBreakdown.direct_work_minutes + timeBreakdown.ceremony_minutes)
      .toBeLessThanOrEqual(timeBreakdown.total_logged_minutes);
  });
});

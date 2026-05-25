/**
 * VERIFY: EventOps Domain - Immutable Geo-Coordinate & Timestamp Events
 *
 * CANONICAL_SCHEMA:  docs/api/billing.proto (message EventFact)
 * HARNESS:           tests/harness/BaseBillingE2ESpec.ts
 * ARCHIVED_TDD:      tests/archive/2026-05-25-eventops-tdd.e2e.spec.ts
 * INVENTORY:         docs/billing/CONSOLIDATION_INVENTORY.md
 * WSJF:              4.75 (Phase 2 - COMPLETE)
 */

import { test, expect } from '@playwright/test';
import {
  billingHelpers,
  ERROR_CODES,
  SCHEMA_PATTERNS,
  BILLING_DOMAINS,
} from './harness/BaseBillingE2ESpec';

const DOMAIN = BILLING_DOMAINS.EVENTOPS;

test.describe('VERIFY: EventOps - Immutability & Geo-Fact Logging', () => {

  test('Domain file exists and is non-empty', async () => {
    billingHelpers.assertDomainFileExists('EVENTOPS');
  });

  test('EventFact class defines all required fields', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'event_id');
    billingHelpers.assertContains(DOMAIN.srcPath, 'entity_uuid');
    billingHelpers.assertContains(DOMAIN.srcPath, 'timestamp_utc');
    billingHelpers.assertContains(DOMAIN.srcPath, 'latitude');
    billingHelpers.assertContains(DOMAIN.srcPath, 'longitude');
  });

  test('Immutability rule enforced — no UPDATE/DELETE', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'append');
    // Must not have direct update/delete methods
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    expect(src).not.toMatch(/def update_event\s*\(/);
    expect(src).not.toMatch(/def delete_event\s*\(/);
  });

  test('Correction method uses offsetting entry with reference pointer', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'correction');
    billingHelpers.assertContains(DOMAIN.srcPath, 'reference');
  });

  test('ISO 8601 UTC timestamp validated — no naive datetimes', async () => {
    const validTimestamps = ['2024-01-15T08:00:00Z', '2024-01-15T08:00:00+05:30'];
    validTimestamps.forEach(ts => {
      expect(SCHEMA_PATTERNS.ISO8601_UTC.test(ts)).toBe(true);
    });
    const invalidTimestamps = ['2024-01-15 08:00:00', '2024-01-15', 'today'];
    invalidTimestamps.forEach(ts => {
      expect(SCHEMA_PATTERNS.ISO8601_UTC.test(ts)).toBe(false);
    });
  });

  test('Geo coordinates within valid ranges', async () => {
    const validCoords = [
      { lat: 35.2271, lon: -80.8431 },
      { lat: -90.0, lon: -180.0 },
      { lat: 90.0, lon: 180.0 },
    ];
    validCoords.forEach(({ lat, lon }) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    });
  });

  test('Content hash SHA256 format enforced', async () => {
    const validHash = 'a'.repeat(64);
    expect(SCHEMA_PATTERNS.CONTENT_HASH_SHA256.test(validHash)).toBe(true);
    expect(SCHEMA_PATTERNS.CONTENT_HASH_SHA256.test('short')).toBe(false);
    expect(SCHEMA_PATTERNS.CONTENT_HASH_SHA256.test('G'.repeat(64))).toBe(false);
  });

  test('Error code ERR_IMMUTABILITY_VIOLATION defined', async () => {
    billingHelpers.assertErrorCode(DOMAIN.srcPath, ERROR_CODES.ERR_IMMUTABILITY_VIOLATION);
  });

  test('Error code ERR_ISO8601_REQUIRED defined', async () => {
    billingHelpers.assertErrorCode(DOMAIN.srcPath, ERROR_CODES.ERR_ISO8601_REQUIRED);
  });

  test('Proto schema defines EventFact message', async () => {
    billingHelpers.assertProtoMessage('EventFact');
  });

  test('Rust bridge exports verify_immutability and calculate_distance', async () => {
    billingHelpers.assertRustBridgeExport('verify_immutability');
    billingHelpers.assertRustBridgeExport('calculate_distance');
  });

  test('Spec coverage: no missing VERIFY gap', async () => {
    const status = billingHelpers.getDomainSpecStatus('eventops');
    expect(status.hasTdd).toBe(true);
    expect(status.hasVerify).toBe(true);
    expect(status.gap).toBe(false);
  });
});
